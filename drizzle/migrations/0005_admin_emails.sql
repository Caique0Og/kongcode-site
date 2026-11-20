-- Lista de e-mails com acesso de admin (já aplicada no Supabase novo pelo setup-banco.sql).
-- Inserir/remover um e-mail aqui dá/tira o papel de admin automaticamente.
create table if not exists public.admin_emails (
  email text primary key check (email = lower(btrim(email)) and email like '%@%'),
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
grant select, insert, delete on public.admin_emails to authenticated;
grant all on public.admin_emails to service_role;
create policy "admins manage admin emails" on public.admin_emails for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.admin_emails (email) values ('atletica@impacta.edu.br') on conflict do nothing;
create or replace function public.grant_atletica_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.admin_emails where email = lower(new.email)) then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create or replace function public.sync_admin_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_roles(user_id, role)
      select id, 'admin' from auth.users where lower(email) = new.email
      on conflict do nothing;
    return new;
  else
    delete from public.user_roles r using auth.users u
      where r.user_id = u.id and r.role = 'admin' and lower(u.email) = old.email;
    return old;
  end if;
end $$;
drop trigger if exists on_admin_email_change on public.admin_emails;
create trigger on_admin_email_change after insert or delete on public.admin_emails
  for each row execute function public.sync_admin_email();
