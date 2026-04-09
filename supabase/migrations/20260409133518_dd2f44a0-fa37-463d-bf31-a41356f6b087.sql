-- Add plan_type column to events
ALTER TABLE public.events
ADD COLUMN plan_type text NOT NULL DEFAULT 'inicio';

-- Add constraint to ensure valid values
ALTER TABLE public.events
ADD CONSTRAINT events_plan_type_check CHECK (plan_type IN ('inicio', 'profissional'));