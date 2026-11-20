-- Histórico de alterações feitas pelos admins, visível só para o dono do site
-- (presidente fundador). Gravado por triggers, então nenhum admin consegue
-- apagar ou editar o próprio rastro.

create table if not exists public.site_owners (
  email text primary key check (email = lower(btrim(email)) and email like '%@%'),
  created_at timestamptz not null default now()
);
alter table public.site_owners enable row level security;
revoke all on public.site_owners from anon, authenticated;
grant all on public.site_owners to service_role;
insert into public.site_owners (email) values ('jhonata.almeida@aluno.impacta.edu.br')
  on conflict do nothing;

create or replace function public.is_site_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.site_owners o join auth.users u on lower(u.email) = o.email
    where u.id = auth.uid()
  )
$$;
grant execute on function public.is_site_owner() to authenticated;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
drop policy if exists "owner reads audit log" on public.admin_audit_log;
create policy "owner reads audit log" on public.admin_audit_log for select to authenticated
  using (public.is_site_owner());

create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  -- Edição que não mudou nada não entra no histórico.
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;
  insert into public.admin_audit_log (actor_id, actor_email, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    tg_op,
    tg_table_name,
    coalesce(v_new, v_old) ->> (case when tg_table_name = 'admin_emails' then 'email' else 'id' end),
    v_old,
    v_new
  );
  return coalesce(new, old);
end $$;

drop trigger if exists audit_clubs on public.clubs;
create trigger audit_clubs after insert or update or delete on public.clubs
  for each row execute function public.log_admin_change();
drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.log_admin_change();
drop trigger if exists audit_events on public.events;
create trigger audit_events after insert or update or delete on public.events
  for each row execute function public.log_admin_change();
drop trigger if exists audit_admin_emails on public.admin_emails;
create trigger audit_admin_emails after insert or delete on public.admin_emails
  for each row execute function public.log_admin_change();

-- Nenhum admin pode tirar o acesso do dono do site.
create or replace function public.protect_site_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.site_owners where email = old.email) then
    raise exception 'O dono do site não pode ser removido da lista de admins.';
  end if;
  return old;
end $$;
drop trigger if exists protect_site_owner on public.admin_emails;
create trigger protect_site_owner before delete on public.admin_emails
  for each row execute function public.protect_site_owner();
insert into public.admin_emails (email) values ('jhonata.almeida@aluno.impacta.edu.br')
  on conflict do nothing;
