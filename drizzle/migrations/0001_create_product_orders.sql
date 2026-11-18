CREATE TABLE public.product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name text NOT NULL CHECK (char_length(product_name) <= 200),
  size text NOT NULL CHECK (char_length(size) <= 30),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 120),
  ra text CHECK (ra IS NULL OR ra ~ '^[0-9]{1,20}$'),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 25),
  email text NOT NULL CHECK (char_length(email) <= 255),
  sheet_synced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_orders TO anon, authenticated;
GRANT SELECT, DELETE ON public.product_orders TO authenticated;
GRANT ALL ON public.product_orders TO service_role;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place order" ON public.product_orders FOR INSERT TO anon, authenticated WITH CHECK (sheet_synced = false);
CREATE POLICY "Admins read orders" ON public.product_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.product_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));