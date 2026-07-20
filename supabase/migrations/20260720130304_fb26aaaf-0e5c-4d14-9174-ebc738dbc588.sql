
CREATE OR REPLACE FUNCTION public.infra_metrics_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_max_conn int;
  v_conn_total int;
  v_conn_active int;
  v_conn_idle int;
  v_conn_idle_tx int;
  v_db_size bigint;
  v_wal_size bigint := 0;
  v_cache_hit numeric;
  v_deadlocks bigint;
  v_rollbacks bigint;
  v_commits bigint;
  v_tup_returned bigint;
  v_tup_fetched bigint;
  v_top_tables jsonb;
  v_longest_query_secs numeric;
BEGIN
  SELECT setting::int INTO v_max_conn FROM pg_settings WHERE name = 'max_connections';

  SELECT
    count(*)::int,
    sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END)::int,
    sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END)::int,
    sum(CASE WHEN state = 'idle in transaction' THEN 1 ELSE 0 END)::int,
    COALESCE(EXTRACT(EPOCH FROM max(CASE WHEN state = 'active' THEN now() - query_start END)), 0)
  INTO v_conn_total, v_conn_active, v_conn_idle, v_conn_idle_tx, v_longest_query_secs
  FROM pg_stat_activity
  WHERE datname = current_database() AND state IS NOT NULL;

  SELECT pg_database_size(current_database()) INTO v_db_size;

  BEGIN
    SELECT COALESCE(sum(size), 0) INTO v_wal_size FROM pg_ls_waldir();
  EXCEPTION WHEN OTHERS THEN
    v_wal_size := 0;
  END;

  SELECT
    ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2),
    sum(deadlocks),
    sum(xact_rollback),
    sum(xact_commit),
    sum(tup_returned),
    sum(tup_fetched)
  INTO v_cache_hit, v_deadlocks, v_rollbacks, v_commits, v_tup_returned, v_tup_fetched
  FROM pg_stat_database
  WHERE datname = current_database();

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'total_bytes')::bigint DESC), '[]'::jsonb)
  INTO v_top_tables
  FROM (
    SELECT jsonb_build_object(
      'schema', schemaname,
      'name', relname,
      'total_bytes', pg_total_relation_size((schemaname || '.' || relname)::regclass),
      'total_pretty', pg_size_pretty(pg_total_relation_size((schemaname || '.' || relname)::regclass)),
      'rows_estimate', n_live_tup
    ) AS t
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size((schemaname || '.' || relname)::regclass) DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'connections', jsonb_build_object(
      'max', v_max_conn,
      'total', v_conn_total,
      'active', v_conn_active,
      'idle', v_conn_idle,
      'idle_in_transaction', v_conn_idle_tx,
      'saturation_pct', ROUND(100.0 * v_conn_total / NULLIF(v_max_conn, 0), 2),
      'longest_active_query_secs', ROUND(v_longest_query_secs::numeric, 2)
    ),
    'storage', jsonb_build_object(
      'db_bytes', v_db_size,
      'db_pretty', pg_size_pretty(v_db_size),
      'wal_bytes', v_wal_size,
      'wal_pretty', pg_size_pretty(v_wal_size)
    ),
    'activity', jsonb_build_object(
      'cache_hit_pct', v_cache_hit,
      'deadlocks', v_deadlocks,
      'rollbacks', v_rollbacks,
      'commits', v_commits,
      'tuples_returned', v_tup_returned,
      'tuples_fetched', v_tup_fetched
    ),
    'top_tables', v_top_tables
  );
END;
$$;

REVOKE ALL ON FUNCTION public.infra_metrics_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.infra_metrics_snapshot() TO service_role;
