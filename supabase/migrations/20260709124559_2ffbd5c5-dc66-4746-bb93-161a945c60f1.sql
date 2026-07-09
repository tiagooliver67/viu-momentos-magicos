
-- 1. Coluna de controle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name_updated_at timestamptz;

-- 2. Backfill: registros com nome já preenchido recebem updated_at atual
UPDATE public.profiles
SET full_name_updated_at = updated_at
WHERE full_name IS NOT NULL
  AND length(trim(full_name)) > 0
  AND full_name_updated_at IS NULL;

-- 3. Função de trigger com cooldown de 15 dias
CREATE OR REPLACE FUNCTION public.enforce_full_name_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_remaining int;
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    IF OLD.full_name_updated_at IS NOT NULL
       AND now() - OLD.full_name_updated_at < interval '15 days' THEN
      v_days_remaining := CEIL(
        EXTRACT(EPOCH FROM (OLD.full_name_updated_at + interval '15 days' - now())) / 86400
      )::int;
      RAISE EXCEPTION 'Nome só pode ser alterado novamente em % dia(s).', v_days_remaining
        USING ERRCODE = 'P0001';
    END IF;
    NEW.full_name_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_enforce_full_name_cooldown ON public.profiles;
CREATE TRIGGER trg_enforce_full_name_cooldown
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_full_name_cooldown();
