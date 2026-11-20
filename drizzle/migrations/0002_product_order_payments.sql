-- Pagamento dos pedidos de roupa via Mercado Pago (Checkout Pro).
ALTER TABLE public.product_orders
  ADD COLUMN amount numeric(10, 2) CHECK (amount IS NULL OR amount >= 0),
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded')),
  ADD COLUMN mp_preference_id text,
  ADD COLUMN mp_payment_id text,
  ADD COLUMN paid_at timestamptz;
-- Visitantes só podem criar pedidos "pendentes": o status de pagamento é
-- atualizado apenas pelo servidor (service role) após consultar o Mercado Pago.
DROP POLICY "Anyone can place order" ON public.product_orders;
CREATE POLICY "Anyone can place order" ON public.product_orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    sheet_synced = false
    AND payment_status = 'pending'
    AND mp_preference_id IS NULL
    AND mp_payment_id IS NULL
    AND paid_at IS NULL
  );
