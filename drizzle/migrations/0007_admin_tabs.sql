-- Aba "Admins" (só o dono do site) e aba "Pedidos" (todos os admins).

-- Só o dono do site pode adicionar ou remover e-mails de admin.
drop policy if exists "admins manage admin emails" on public.admin_emails;
drop policy if exists "admins read admin emails" on public.admin_emails;
drop policy if exists "owner manages admin emails" on public.admin_emails;
create policy "admins read admin emails" on public.admin_emails for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "owner manages admin emails" on public.admin_emails for all to authenticated
  using (public.is_site_owner()) with check (public.is_site_owner());

-- Status de entrega dos pedidos, editável pelos admins (o pagamento continua só pelo servidor).
alter table public.product_orders
  add column if not exists delivery_status text not null default 'pendente'
    check (delivery_status in ('pendente', 'separado', 'entregue', 'cancelado')),
  add column if not exists delivered_at timestamptz;
grant update (delivery_status, delivered_at) on public.product_orders to authenticated;
drop policy if exists "Admins update delivery" on public.product_orders;
create policy "Admins update delivery" on public.product_orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Mudanças de entrega e exclusões de pedidos entram no histórico do presidente.
drop trigger if exists audit_orders_delivery on public.product_orders;
create trigger audit_orders_delivery after update on public.product_orders
  for each row when (old.delivery_status is distinct from new.delivery_status)
  execute function public.log_admin_change();
drop trigger if exists audit_orders_delete on public.product_orders;
create trigger audit_orders_delete after delete on public.product_orders
  for each row execute function public.log_admin_change();
