
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  featured_image TEXT,
  category TEXT DEFAULT 'Geral',
  read_minutes INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'draft',
  views_count INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published posts" ON public.blog_posts;
CREATE POLICY "Public reads published posts" ON public.blog_posts
  FOR SELECT USING (status = 'published' OR public.is_super_admin());

DROP POLICY IF EXISTS "Super admin manages posts" ON public.blog_posts;
CREATE POLICY "Super admin manages posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_blog_views(_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts SET views_count = views_count + 1 WHERE slug = _slug AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_views(TEXT) TO anon, authenticated;
