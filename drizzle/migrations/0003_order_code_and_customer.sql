-- Código legível do pedido (ex.: KC-3F9A1B2C) e vínculo com a conta de quem comprou.
ALTER TABLE public.product_orders
  ADD COLUMN order_code text NOT NULL
    DEFAULT ('KC-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)))
    CHECK (order_code ~ '^KC-[0-9A-F]{8}$'),
  ADD COLUMN user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.product_orders
  ADD CONSTRAINT product_orders_order_code_key UNIQUE (order_code);
CREATE INDEX product_orders_user_id_idx ON public.product_orders (user_id, created_at DESC);

-- Quem cria o pedido direto pela API só pode vinculá-lo à própria conta.
DROP POLICY "Anyone can place order" ON public.product_orders;
CREATE POLICY "Anyone can place order" ON public.product_orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    sheet_synced = false
    AND payment_status = 'pending'
    AND mp_preference_id IS NULL
    AND mp_payment_id IS NULL
    AND paid_at IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- O cliente logado pode ler os próprios pedidos.
CREATE POLICY "Customers read own orders" ON public.product_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());
