
-- Create enum types
CREATE TYPE public.event_status AS ENUM ('ativo', 'em_breve', 'inativo');
CREATE TYPE public.order_status AS ENUM ('aguardando_pagamento', 'pago', 'enviado', 'cancelado');
CREATE TYPE public.payment_method AS ENUM ('pix', 'cartao');
CREATE TYPE public.discount_type AS ENUM ('percentual', 'valor_fixo');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ TABLES FIRST ============

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date date NOT NULL,
  event_time time,
  location text NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  status public.event_status NOT NULL DEFAULT 'em_breve',
  visibility boolean NOT NULL DEFAULT true,
  cover_url text,
  password text,
  search_type text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_photographers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_pct numeric(5,2) NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, photographer_id)
);

CREATE TABLE public.event_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text,
  identified boolean NOT NULL DEFAULT false,
  album text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_cpf text,
  status public.order_status NOT NULL DEFAULT 'aguardando_pagamento',
  payment_method public.payment_method,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  tracking_origin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES public.event_photos(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.event_videos(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type public.discount_type NOT NULL DEFAULT 'percentual',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, code)
);

CREATE TABLE public.price_grids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Padrão',
  photo_high_price numeric(10,2) NOT NULL DEFAULT 12.00,
  photo_low_price numeric(10,2) NOT NULL DEFAULT 8.00,
  video_price numeric(10,2) NOT NULL DEFAULT 10.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.discount_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  min_photos integer NOT NULL DEFAULT 5,
  discount_pct numeric(5,2) NOT NULL DEFAULT 10,
  all_photos_price numeric(10,2),
  min_photo_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ HELPER FUNCTIONS (after tables exist) ============

CREATE OR REPLACE FUNCTION public.is_event_organizer(_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND organizer_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_event_photographer(_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_photographers WHERE event_id = _event_id AND photographer_id = auth.uid())
$$;

-- ============ ENABLE RLS ============

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_packages ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Events
CREATE POLICY "Public events readable by all" ON public.events FOR SELECT USING (visibility = true OR organizer_id = auth.uid() OR public.is_event_photographer(id));
CREATE POLICY "Organizer can insert events" ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizer can update own events" ON public.events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizer can delete own events" ON public.events FOR DELETE USING (auth.uid() = organizer_id);

-- Event Photographers
CREATE POLICY "Organizer manages photographers" ON public.event_photographers FOR ALL USING (public.is_event_organizer(event_id));
CREATE POLICY "Photographer sees own entry" ON public.event_photographers FOR SELECT USING (photographer_id = auth.uid());

-- Event Photos
CREATE POLICY "Photos readable" ON public.event_photos FOR SELECT USING (public.is_event_organizer(event_id) OR public.is_event_photographer(event_id) OR EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND visibility = true));
CREATE POLICY "Upload photos" ON public.event_photos FOR INSERT WITH CHECK (public.is_event_organizer(event_id) OR (public.is_event_photographer(event_id) AND photographer_id = auth.uid()));
CREATE POLICY "Delete photos" ON public.event_photos FOR DELETE USING (public.is_event_organizer(event_id));

-- Event Videos
CREATE POLICY "Videos readable" ON public.event_videos FOR SELECT USING (public.is_event_organizer(event_id) OR public.is_event_photographer(event_id) OR EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND visibility = true));
CREATE POLICY "Upload videos" ON public.event_videos FOR INSERT WITH CHECK (public.is_event_organizer(event_id) OR (public.is_event_photographer(event_id) AND photographer_id = auth.uid()));
CREATE POLICY "Delete videos" ON public.event_videos FOR DELETE USING (public.is_event_organizer(event_id));

-- Orders
CREATE POLICY "Organizer manages orders" ON public.orders FOR ALL USING (public.is_event_organizer(event_id));

-- Order Items
CREATE POLICY "Organizer manages order items" ON public.order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_event_organizer(o.event_id)));

-- Coupons
CREATE POLICY "Organizer manages coupons" ON public.event_coupons FOR ALL USING (public.is_event_organizer(event_id));

-- Price Grids
CREATE POLICY "Organizer manages price grids" ON public.price_grids FOR ALL USING (public.is_event_organizer(event_id));

-- Discount Packages
CREATE POLICY "Organizer manages discounts" ON public.discount_packages FOR ALL USING (public.is_event_organizer(event_id));

-- ============ TRIGGERS ============

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKETS ============

INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('event-videos', 'event-videos', true);

CREATE POLICY "Anyone can view covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
CREATE POLICY "Auth users upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update covers" ON storage.objects FOR UPDATE USING (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'event-photos');
CREATE POLICY "Auth users upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete photos" ON storage.objects FOR DELETE USING (bucket_id = 'event-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view videos" ON storage.objects FOR SELECT USING (bucket_id = 'event-videos');
CREATE POLICY "Auth users upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-videos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete videos" ON storage.objects FOR DELETE USING (bucket_id = 'event-videos' AND auth.uid() IS NOT NULL);
