create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  description text not null,
  whatsapp_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  images text[] not null default '{}',
  description text not null,
  price numeric(10,2),
  sizes text[] not null default '{}',
  order_url text,
  created_at timestamptz not null default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_url text not null,
  description text not null,
  event_date date not null,
  event_time text not null,
  location text not null,
  ticket_url text,
  created_at timestamptz not null default now()
);
grant select on public.clubs, public.products, public.events to anon, authenticated;
grant insert, update, delete on public.clubs, public.products, public.events to authenticated;
grant all on public.clubs, public.products, public.events to service_role;
alter table public.clubs enable row level security;
alter table public.products enable row level security;
alter table public.events enable row level security;
create policy "public read" on public.clubs for select using (true);
create policy "public read" on public.products for select using (true);
create policy "public read" on public.events for select using (true);
create policy "admin write" on public.clubs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.events for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "public media read" on storage.objects for select using (bucket_id = 'media');
create policy "admin media insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
create policy "admin media update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
create policy "admin media delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));

insert into public.clubs (name, image_url, description, whatsapp_url, sort_order) values
('Futebol','/__l5e/assets-v1/6e6bb37d-2243-44a9-9b40-147a8016eede/WhatsApp_Image_2026-10-13_at_22.36.08_2.jpg','Do racha descontraído aos jogos contra outras atléticas, o futebol é onde a torcida Impacta ganha vida. Venha treinar, jogar e vestir a camisa com a gente.','https://chat.whatsapp.com/GRtYiclwlMBI5du3I7EqWi',1),
('Vôlei','/__l5e/assets-v1/8935d646-9f79-4c5f-950f-4a0e3e50dfd6/WhatsApp_Image_2026-10-13_at_22.36.08.jpg','Saque, levantamento e muito trabalho em equipe. O clube de vôlei recebe todos os níveis, de quem está começando a quem já joga há anos.','https://chat.whatsapp.com/DvipeixGFFHIhDPYNDnbwi',2),
('Basquete','/__l5e/assets-v1/8eae771e-8bd4-4ef5-8b0c-4b1a3e748c6f/WhatsApp_Image_2026-10-13_at_22.36.08_3.jpg','Quadra, bola laranja e muita intensidade. No basquete a gente treina fundamentos, joga partidas e representa a Impacta nos campeonatos.','https://chat.whatsapp.com/I8pEQTRpPnq6MEWDK1wbFI',3),
('Xadrez','/__l5e/assets-v1/c92703b5-7e06-477b-ae8e-163ca4abbc9b/WhatsApp_Image_2026-10-13_at_22.36.08_1.jpg','Estratégia, concentração e boas partidas. O clube de xadrez reúne iniciantes e enxadristas experientes para jogar, aprender e disputar torneios.','https://chat.whatsapp.com/EAk89MUeh0cBcktvs5ZSMo',4),
('Board Game','/__l5e/assets-v1/675df51b-7566-4243-8579-858cb3a657d4/WhatsApp_Image_2026-10-13_at_22.36.09.jpg','Jogos de tabuleiro, cartas e RPG de mesa para quem curte uma boa partida com os amigos. Traga seu jogo favorito ou descubra novos com a galera.','https://chat.whatsapp.com/GeZz06rKSXo88N75rzSLSF',5);

insert into public.products (name, images, description, sizes) values
('Corta Vento Tradicional', array['/__l5e/assets-v1/215a7ab3-8517-4e67-afa9-d50e11772364/roupa-corta-vento.jpg'], 'Preta, com capuz e zíper. Estampa do gorila no peito e nas costas.', '{}');

create or replace function public.grant_atletica_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'atletica@impacta.edu.br' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_admin after insert on auth.users for each row execute function public.grant_atletica_admin();

do $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'atletica@impacta.edu.br', extensions.crypt('atletica2026Impacta', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', 'atletica@impacta.edu.br', 'email_verified', true), 'email', now(), now(), now());
end $$;