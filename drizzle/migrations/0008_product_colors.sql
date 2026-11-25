-- Cores/modelos por produto (ex.: Preta, Azul) e a escolha do cliente no pedido.
alter table public.products
  add column if not exists colors text[] not null default '{}';
alter table public.product_orders
  add column if not exists color text;
