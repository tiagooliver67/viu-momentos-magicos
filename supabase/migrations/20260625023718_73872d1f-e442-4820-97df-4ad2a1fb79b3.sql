DROP VIEW IF EXISTS public.photographer_sites_public;
CREATE VIEW public.photographer_sites_public AS
SELECT id, user_id, slug, display_name, bio, avatar_url, banner_url,
  watermark_url, watermark_position, watermark_opacity, watermark_size,
  template, primary_color, secondary_color,
  whatsapp, instagram, facebook, tiktok, youtube, linkedin, twitter,
  seo_title, seo_keywords, allow_custom_links,
  ai_bio, ai_bio_generated_at,
  created_at, updated_at
FROM public.photographer_sites;
GRANT SELECT ON public.photographer_sites_public TO anon, authenticated;