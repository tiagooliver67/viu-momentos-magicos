
-- Photographer site/profile
CREATE TABLE public.photographer_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  watermark_url TEXT,
  primary_color TEXT DEFAULT '#FF4D00',
  secondary_color TEXT DEFAULT '#00F0FF',
  template TEXT DEFAULT 'padrao',
  whatsapp TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  youtube TEXT,
  linkedin TEXT,
  twitter TEXT,
  cnpj TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  seo_title TEXT,
  seo_keywords TEXT,
  allow_custom_links BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.photographer_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own site"
ON public.photographer_sites FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view sites"
ON public.photographer_sites FOR SELECT
USING (true);

CREATE TRIGGER update_photographer_sites_updated_at
BEFORE UPDATE ON public.photographer_sites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Custom links
CREATE TABLE public.custom_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own links"
ON public.custom_links FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view links"
ON public.custom_links FOR SELECT
USING (true);

-- Cart items (session-based for anonymous users)
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  photo_id UUID REFERENCES public.event_photos(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.event_videos(id) ON DELETE CASCADE,
  resolution TEXT DEFAULT 'high',
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage cart by session"
ON public.cart_items FOR ALL
USING (true)
WITH CHECK (true);

-- Storage bucket for photographer assets
INSERT INTO storage.buckets (id, name, public) VALUES ('photographer-assets', 'photographer-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photographer-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'photographer-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read photographer assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'photographer-assets');
