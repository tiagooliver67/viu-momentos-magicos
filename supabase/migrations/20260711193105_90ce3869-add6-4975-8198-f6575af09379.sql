ALTER TABLE public.bib_detection_errors
  ADD COLUMN IF NOT EXISTS pipeline text NOT NULL DEFAULT 'bib';

CREATE INDEX IF NOT EXISTS idx_bib_detection_errors_pipeline
  ON public.bib_detection_errors(pipeline, created_at DESC);