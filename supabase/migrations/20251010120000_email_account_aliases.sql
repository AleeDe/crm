-- Email account aliases support

-- Table to store sender aliases per email account
create table if not exists public.email_account_aliases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.email_accounts(id) on delete cascade,
  from_name text,
  from_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists email_account_aliases_set_updated_at on public.email_account_aliases;
create trigger email_account_aliases_set_updated_at
before update on public.email_account_aliases
for each row execute function public.set_updated_at();

alter table public.email_account_aliases enable row level security;

-- RLS: allow select to admin or org owner of the parent account
-- Disallow direct inserts/updates/deletes; use RPCs

drop policy if exists email_account_aliases_select on public.email_account_aliases;
create policy email_account_aliases_select
on public.email_account_aliases for select
using (
  public.is_admin(auth.uid()) or
  public.is_org_owner(
    auth.uid(),
    (select org_id from public.email_accounts ea where ea.id = email_account_aliases.account_id)
  )
);

-- Ensure old signature is removed (defaulted param first violates Postgres rules)
drop function if exists public.save_email_alias(uuid, uuid, text, text);

-- RPC to create/update an alias
-- p_id is optional and must be last due to Postgres default-arg rule
create or replace function public.save_email_alias(
  p_account_id uuid,
  p_from_name text,
  p_from_email text,
  p_id uuid default null
)
returns public.email_account_aliases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_acc_org uuid;
  v_row public.email_account_aliases;
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null and not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select org_id into v_acc_org from public.email_accounts where id = p_account_id;
  if v_acc_org is null then
    raise exception 'Email account not found';
  end if;

  if not public.is_admin(auth.uid()) and v_acc_org <> v_org_id then
    raise exception 'Not authorized to modify alias for this account';
  end if;

  if p_id is not null then
    update public.email_account_aliases
    set from_name = p_from_name,
        from_email = p_from_email
    where id = p_id and account_id = p_account_id
    returning * into v_row;
    if not found then
      raise exception 'Alias not found or does not belong to this account';
    end if;
  else
    insert into public.email_account_aliases(account_id, from_name, from_email)
    values (p_account_id, p_from_name, p_from_email)
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- Update GRANT to match new signature order
grant execute on function public.save_email_alias(uuid, text, text, uuid) to authenticated;

-- RPC to delete alias by id
create or replace function public.delete_email_alias_by_id(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_acc_org uuid;
  v_account_id uuid;
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null and not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select account_id into v_account_id from public.email_account_aliases where id = p_id;
  if v_account_id is null then
    raise exception 'Alias not found';
  end if;

  select org_id into v_acc_org from public.email_accounts where id = v_account_id;

  if not public.is_admin(auth.uid()) and (v_acc_org is null or v_acc_org <> v_org_id) then
    raise exception 'Not authorized to delete this alias';
  end if;

  delete from public.email_account_aliases where id = p_id;
end;
$$;

grant execute on function public.delete_email_alias_by_id(uuid) to authenticated;
