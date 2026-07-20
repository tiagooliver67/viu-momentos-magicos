import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Cpu, Database, HardDrive, Loader2, RefreshCw,
  Server, Zap, TrendingUp,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Snapshot = {
  generated_at: string;
  connections: {
    max: number; total: number; active: number; idle: number;
    idle_in_transaction: number; saturation_pct: number;
    longest_active_query_secs: number;
  };
  storage: { db_bytes: number; db_pretty: string; wal_bytes: number; wal_pretty: string };
  activity: {
    cache_hit_pct: number; deadlocks: number; rollbacks: number; commits: number;
    tuples_returned: number; tuples_fetched: number;
  };
  top_tables: Array<{ schema: string; name: string; total_bytes: number; total_pretty: string; rows_estimate: number }>;
};

type Series = { t: string; conn: number; active: number; cache: number };

const ring = (pct: number) => {
  if (pct >= 85) return "text-destructive";
  if (pct >= 65) return "text-amber-500";
  return "text-lime";
};

const Gauge = ({ label, value, pct, hint }: { label: string; value: string; pct: number; hint?: string }) => {
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circ;
  const color = ring(clamped);
  return (
    <div className="glass-card p-5 flex flex-col items-center text-center">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r={radius}
            className={color}
            stroke="currentColor" strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold ${color}`}>{value}</span>
          <span className="text-[10px] text-muted-foreground">{clamped.toFixed(0)}%</span>
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-2">{hint}</p>}
    </div>
  );
};

const Stat = ({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) => (
  <div className="bg-background/60 rounded-lg p-3">
    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={`text-xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

// Compute-instance disk allowance (Lovable Cloud default small tier). Used as visual reference only.
const DISK_ALLOWANCE_GB = 8;

const AdminInfraMonitor = () => {
  const [history, setHistory] = useState<Series[]>([]);
  const [interval, setIntervalMs] = useState(10_000);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<Snapshot>({
    queryKey: ["admin-infra-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("infra-metrics");
      if (error) throw error;
      const snap = data as Snapshot;
      setHistory((h) => {
        const next = [...h, {
          t: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          conn: snap.connections.total,
          active: snap.connections.active,
          cache: snap.activity.cache_hit_pct,
        }];
        return next.slice(-30);
      });
      return snap;
    },
    refetchInterval: interval,
  });

  const dbSizeGB = data ? data.storage.db_bytes / 1024 / 1024 / 1024 : 0;
  const diskPct = (dbSizeGB / DISK_ALLOWANCE_GB) * 100;

  const alerts = useMemo(() => {
    if (!data) return [];
    const list: { level: "warn" | "critical"; msg: string }[] = [];
    if (data.connections.saturation_pct >= 80) list.push({ level: "critical", msg: `Conexões em ${data.connections.saturation_pct}% da capacidade.` });
    else if (data.connections.saturation_pct >= 60) list.push({ level: "warn", msg: `Conexões em ${data.connections.saturation_pct}% — monitorar.` });
    if (data.connections.idle_in_transaction > 3) list.push({ level: "warn", msg: `${data.connections.idle_in_transaction} conexões "idle in transaction" — possível leak.` });
    if (data.activity.cache_hit_pct < 95) list.push({ level: "warn", msg: `Cache hit em ${data.activity.cache_hit_pct}% (ideal ≥99%).` });
    if (data.connections.longest_active_query_secs > 30) list.push({ level: "warn", msg: `Query ativa há ${data.connections.longest_active_query_secs}s.` });
    if (diskPct >= 80) list.push({ level: "critical", msg: `Banco em ${diskPct.toFixed(0)}% do disco alocado (${DISK_ALLOWANCE_GB} GB).` });
    return list;
  }, [data, diskPct]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Monitor de Infraestrutura
          </h1>
          <p className="text-sm text-muted-foreground">
            Métricas em tempo real do banco e da instância — atualiza a cada {interval / 1000}s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={interval}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border"
          >
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
          <button
            onClick={() => refetch()}
            className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1.5"
          >
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </button>
        </div>
      </div>

      {isLoading && <div className="glass-card p-6 text-sm text-muted-foreground">Coletando métricas…</div>}
      {error && (
        <div className="glass-card p-6 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Falha ao carregar métricas: {String((error as Error).message)}
        </div>
      )}

      {data && (
        <>
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`glass-card p-3 text-sm flex items-center gap-2 ${
                    a.level === "critical" ? "border-destructive/40 text-destructive" : "border-amber-500/40 text-amber-500"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {a.msg}
                </div>
              ))}
            </div>
          )}

          {/* Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Gauge
              label="Conexões DB"
              value={`${data.connections.total}/${data.connections.max}`}
              pct={data.connections.saturation_pct}
              hint={`${data.connections.active} ativas · ${data.connections.idle} idle`}
            />
            <Gauge
              label="Disco (banco)"
              value={data.storage.db_pretty}
              pct={diskPct}
              hint={`de ${DISK_ALLOWANCE_GB} GB alocados`}
            />
            <Gauge
              label="Cache hit"
              value={`${data.activity.cache_hit_pct ?? 0}%`}
              pct={data.activity.cache_hit_pct ?? 0}
              hint="quanto mais alto, menos I/O"
            />
            <Gauge
              label="RAM (proxy)"
              value={`${Math.min(100, Math.round((data.connections.saturation_pct + (100 - (data.activity.cache_hit_pct ?? 100))) / 2))}%`}
              pct={Math.min(100, (data.connections.saturation_pct + (100 - (data.activity.cache_hit_pct ?? 100))) / 2)}
              hint="conexões + cache miss"
            />
          </div>

          {/* Detailed cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Conexões</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Total" value={data.connections.total} />
                <Stat label="Máximo" value={data.connections.max} />
                <Stat label="Ativas" value={data.connections.active} accent="text-lime" />
                <Stat label="Idle" value={data.connections.idle} />
                <Stat
                  label="Idle in tx"
                  value={data.connections.idle_in_transaction}
                  accent={data.connections.idle_in_transaction > 3 ? "text-amber-500" : undefined}
                />
                <Stat
                  label="Query mais longa"
                  value={`${data.connections.longest_active_query_secs}s`}
                  accent={data.connections.longest_active_query_secs > 30 ? "text-destructive" : undefined}
                />
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><HardDrive className="w-4 h-4 text-primary" /> Armazenamento</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Banco" value={data.storage.db_pretty} accent="text-primary" />
                <Stat label="WAL" value={data.storage.wal_pretty} />
                <Stat label="% do disco" value={`${diskPct.toFixed(1)}%`} accent={ring(diskPct)} sub={`limite ${DISK_ALLOWANCE_GB} GB`} />
                <Stat label="Espaço livre" value={`${Math.max(0, DISK_ALLOWANCE_GB - dbSizeGB).toFixed(2)} GB`} />
              </div>
              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                Egress e imagens ficam no S3/CloudFront (fora deste banco). Este disco cobre apenas o Postgres.
              </p>
            </div>

            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Atividade (desde boot)</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Commits" value={data.activity.commits.toLocaleString("pt-BR")} accent="text-lime" />
                <Stat label="Rollbacks" value={data.activity.rollbacks.toLocaleString("pt-BR")} accent={data.activity.rollbacks > 100 ? "text-amber-500" : undefined} />
                <Stat label="Deadlocks" value={data.activity.deadlocks.toLocaleString("pt-BR")} accent={data.activity.deadlocks > 0 ? "text-destructive" : undefined} />
                <Stat label="Cache hit" value={`${data.activity.cache_hit_pct ?? 0}%`} accent="text-primary" />
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Conexões — últimos {history.length} pontos</h2>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="conn" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="active" stroke="hsl(82 100% 50%)" strokeWidth={2} dot={false} name="Ativas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top tables */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> Top 10 tabelas por tamanho</h3>
            <div className="space-y-1.5">
              {data.top_tables.map((t) => {
                const pct = data.storage.db_bytes > 0 ? (t.total_bytes / data.storage.db_bytes) * 100 : 0;
                return (
                  <div key={t.name} className="flex items-center gap-3 text-sm">
                    <div className="w-56 truncate font-medium">{t.name}</div>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="w-20 text-right text-xs text-muted-foreground">{t.total_pretty}</div>
                    <div className="w-14 text-right text-[10px] text-muted-foreground">{pct.toFixed(1)}%</div>
                    <div className="w-24 text-right text-[10px] text-muted-foreground">{t.rows_estimate?.toLocaleString("pt-BR") ?? 0} linhas</div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-right">
            Última coleta: {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")} · fonte: pg_stat_activity, pg_stat_database, pg_stat_user_tables
          </p>
        </>
      )}
    </div>
  );
};

export default AdminInfraMonitor;