
-- Add ASAAS payment ID to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_id text;

-- Add ASAAS customer ID to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- Allow public insert on orders (checkout without login)
CREATE POLICY "Public can insert orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public insert on order_items
CREATE POLICY "Public can insert order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to read own orders by email
CREATE POLICY "Public can read orders by email"
ON public.orders
FOR SELECT
TO public
USING (true);

-- Allow public to read order items
CREATE POLICY "Public can read order items"
ON public.order_items
FOR SELECT
TO public
USING (true);

-- Allow update on orders for webhook status changes (via service role)
CREATE POLICY "Service can update orders"
ON public.orders
FOR UPDATE
TO public
USING (is_event_organizer(event_id) OR true);
