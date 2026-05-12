
-- Hero settings (single row config)
CREATE TABLE public.hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Sua superação imortalizada',
  highlight text NOT NULL DEFAULT 'em alta definição.',
  title_color text NOT NULL DEFAULT '#FFFFFF',
  highlight_color text NOT NULL DEFAULT '#FF4D00',
  transition_type text NOT NULL DEFAULT 'fade', -- fade | slide | kenburns
  transition_duration_ms integer NOT NULL DEFAULT 1000,
  interval_seconds integer NOT NULL DEFAULT 6,
  autoplay boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public can read hero settings"
  ON public.hero_settings FOR SELECT USING (true);
CREATE POLICY "Public can read hero slides"
  ON public.hero_slides FOR SELECT USING (true);

-- Super admin manage
CREATE POLICY "Super admin manages hero settings"
  ON public.hero_settings FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Super admin manages hero slides"
  ON public.hero_slides FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER update_hero_settings_updated_at
  BEFORE UPDATE ON public.hero_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row
INSERT INTO public.hero_settings DEFAULT VALUES;
