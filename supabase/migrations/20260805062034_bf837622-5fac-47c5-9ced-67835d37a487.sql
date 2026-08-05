ALTER TABLE public.event_videos ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'hidden'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_videos TO authenticated;
GRANT ALL ON public.event_videos TO service_role;
GRANT SELECT ON public.event_videos TO anon;
