
REVOKE ALL ON public.photo_search_index FROM anon, authenticated;
GRANT SELECT ON public.photo_search_index TO service_role;
