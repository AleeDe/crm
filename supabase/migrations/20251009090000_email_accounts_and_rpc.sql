-- Email accounts for organizations to send bulk emails
-- Requires pgcrypto for symmetric encryption of secrets
create extension if not exists pgcrypto;

create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(org_id) on delete cascade,
  provider text not null default 'smtp' check (provider in ('smtp','gmail','outlook','other')),
  from_name text,
  from_email text,
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_password_enc bytea,
  oauth_provider text,
  oauth_access_token_enc bytea,
  oauth_refresh_token_enc bytea,
  oauth_expiry timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_accounts_org on public.email_accounts(org_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger email_accounts_set_updated_at
before update on public.email_accounts
for each row execute function public.set_updated_at();

-- RLS
alter table public.email_accounts enable row level security;

-- Only allow select to org owners and admins
drop policy if exists email_accounts_select on public.email_accounts;
create policy email_accounts_select
on public.email_accounts for select
using (
  public.is_org_owner(auth.uid(), org_id) or public.is_admin(auth.uid())
);

-- Do not allow direct insert/update/delete (use RPCs)
-- (Intentionally no permissive policies for insert/update/delete)

-- Helper to get current org id for the logged-in user
create or replace function public.get_current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.organizations where user_id = auth.uid();
$$;

-- Upsert email account for current org with optional encryption of password
create or replace function public.upsert_email_account(
  p_provider text,
  p_from_name text,
  p_from_email text,
  p_smtp_host text,
  p_smtp_port int,
  p_smtp_username text,
  p_smtp_password text default null
)
returns public.email_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_key text;
  v_pwd_enc bytea;
  v_row public.email_accounts;
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null then
    raise exception 'No organization found for current user';
  end if;

  -- Try to read encryption key from Postgres setting (configure in Supabase project settings)
  v_key := current_setting('app.settings.encryption_key', true);
  if p_smtp_password is not null and p_smtp_password <> '' and coalesce(v_key, '') <> '' then
    v_pwd_enc := pgp_sym_encrypt(p_smtp_password, v_key);
  else
    v_pwd_enc := null;
  end if;

  if exists (select 1 from public.email_accounts where org_id = v_org_id) then
    update public.email_accounts
    set provider = coalesce(p_provider, provider),
        from_name = p_from_name,
        from_email = p_from_email,
        smtp_host = p_smtp_host,
        smtp_port = p_smtp_port,
        smtp_username = p_smtp_username,
        smtp_password_enc = coalesce(v_pwd_enc, smtp_password_enc)
    where org_id = v_org_id
    returning * into v_row;
  else
    insert into public.email_accounts(
      org_id, provider, from_name, from_email, smtp_host, smtp_port, smtp_username, smtp_password_enc
    ) values (
      v_org_id, coalesce(p_provider, 'smtp'), p_from_name, p_from_email, p_smtp_host, p_smtp_port, p_smtp_username, v_pwd_enc
    ) returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.upsert_email_account(text, text, text, text, int, text, text) to anon, authenticated;

-- Delete email account for current org
create or replace function public.delete_email_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null then
    raise exception 'No organization found for current user';
  end if;
  delete from public.email_accounts where org_id = v_org_id;
end;
$$;

grant execute on function public.delete_email_account() to anon, authenticated;
