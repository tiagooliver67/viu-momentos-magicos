
CREATE TABLE public.portfolio_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_categories TO authenticated;
GRANT ALL ON public.portfolio_categories TO service_role;
ALTER TABLE public.portfolio_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.portfolio_categories FOR SELECT USING (true);
CREATE POLICY "Owner manage categories" ON public.portfolio_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.portfolio_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.portfolio_categories(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_photos TO authenticated;
GRANT ALL ON public.portfolio_photos TO service_role;
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read photos" ON public.portfolio_photos FOR SELECT USING (true);
CREATE POLICY "Owner manage photos" ON public.portfolio_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_portfolio_categories_user ON public.portfolio_categories(user_id, sort_order);
CREATE INDEX idx_portfolio_photos_user_cat ON public.portfolio_photos(user_id, category_id, sort_order);
