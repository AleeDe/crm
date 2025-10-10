-- Add default alias selection per employee-email account link

-- 1) Schema change: add alias_id to employee_email_accounts
alter table if exists public.employee_email_accounts
  add column if not exists alias_id uuid references public.email_account_aliases(id) on delete set null;

-- 2) Extend RPC to set alias along with account
drop function if exists public.set_employee_email_account(uuid, uuid);
create or replace function public.set_employee_email_account(
  p_emp_id uuid,
  p_email_account_id uuid,
  p_alias_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_emp_org uuid;
  v_acc_org uuid;
  v_alias_account uuid;
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null and not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select org_id into v_emp_org from public.employees where emp_id = p_emp_id;
  if v_emp_org is null then
    raise exception 'Employee not found';
  end if;

  select org_id into v_acc_org from public.email_accounts a where a.id = p_email_account_id;
  if v_acc_org is null then
    raise exception 'Email account not found';
  end if;

  if p_alias_id is not null then
    select ea.org_id into v_alias_account
    from public.email_accounts ea
    join public.email_account_aliases al on al.account_id = ea.id
    where al.id = p_alias_id;
    if v_alias_account is null then
      raise exception 'Alias not found';
    end if;
    if v_alias_account <> v_acc_org then
      raise exception 'Alias does not belong to the selected account';
    end if;
  end if;

  if not public.is_admin(auth.uid()) and (v_org_id <> v_emp_org or v_org_id <> v_acc_org) then
    raise exception 'Not authorized to assign this account';
  end if;

  insert into public.employee_email_accounts(emp_id, email_account_id, alias_id)
  values (p_emp_id, p_email_account_id, p_alias_id)
  on conflict (emp_id) do update set email_account_id = excluded.email_account_id, alias_id = excluded.alias_id, updated_at = now();
end;
$$;

grant execute on function public.set_employee_email_account(uuid, uuid, uuid) to authenticated;
