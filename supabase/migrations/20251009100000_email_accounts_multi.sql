-- Support multiple email accounts per organization with explicit save/delete by id

-- Create or update a specific email account; insert when p_id is null
-- Ensure idempotency: drop any previous versions to avoid overloads
drop function if exists public.save_email_account(uuid, text, text, text, text, int, text, text);
drop function if exists public.save_email_account(text, text, text, text, int, text, text, uuid);

create or replace function public.save_email_account(
  p_provider text,
  p_from_name text,
  p_from_email text,
  p_smtp_host text,
  p_smtp_port int,
  p_smtp_username text,
  p_smtp_password text default null,
  p_id uuid default null
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

  v_key := current_setting('app.settings.encryption_key', true);
  if p_smtp_password is not null and p_smtp_password <> '' and coalesce(v_key, '') <> '' then
    v_pwd_enc := pgp_sym_encrypt(p_smtp_password, v_key);
  else
    v_pwd_enc := null;
  end if;

  if p_id is not null then
    update public.email_accounts
    set provider = coalesce(p_provider, provider),
        from_name = p_from_name,
        from_email = p_from_email,
        smtp_host = p_smtp_host,
        smtp_port = p_smtp_port,
        smtp_username = p_smtp_username,
        smtp_password_enc = coalesce(v_pwd_enc, smtp_password_enc)
    where id = p_id and org_id = v_org_id
    returning * into v_row;

    if not found then
      raise exception 'Email account not found or not owned by your org';
    end if;
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

grant execute on function public.save_email_account(text, text, text, text, int, text, text, uuid) to authenticated;

-- Delete a specific email account by id (must belong to current org or admin)
create or replace function public.delete_email_account_by_id(
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
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null and not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select org_id into v_acc_org from public.email_accounts where id = p_id;
  if v_acc_org is null then
    raise exception 'Email account not found';
  end if;

  if not public.is_admin(auth.uid()) and v_org_id <> v_acc_org then
    raise exception 'Not authorized to delete this account';
  end if;

  delete from public.email_accounts where id = p_id;
end;
$$;

grant execute on function public.delete_email_account_by_id(uuid) to authenticated;
