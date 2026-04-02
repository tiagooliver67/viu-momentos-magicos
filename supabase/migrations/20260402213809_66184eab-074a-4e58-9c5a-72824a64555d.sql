
DROP POLICY "Anyone can manage cart by session" ON public.cart_items;

CREATE POLICY "Cart items by session"
ON public.cart_items FOR SELECT
USING (true);

CREATE POLICY "Insert cart items"
ON public.cart_items FOR INSERT
WITH CHECK (session_id IS NOT NULL AND session_id != '');

CREATE POLICY "Delete cart items by session"
ON public.cart_items FOR DELETE
USING (true);
