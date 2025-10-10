-- Map employees to an email account used for sending

create table if not exists public.employee_email_accounts (
  emp_id uuid primary key references public.employees(emp_id) on delete cascade,
  email_account_id uuid not null references public.email_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Ensure idempotency if this script is re-run manually
drop trigger if exists employee_email_accounts_set_updated_at on public.employee_email_accounts;
create trigger employee_email_accounts_set_updated_at
before update on public.employee_email_accounts
for each row execute function public.set_updated_at();

alter table public.employee_email_accounts enable row level security;

-- RLS policies
-- Allow select to: admin, org owner of the employee, or the employee themselves
create or replace function public.is_employee_self(p_emp_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where e.emp_id = p_emp_id and e.user_id = auth.uid()
  );
$$;

drop policy if exists employee_email_accounts_select on public.employee_email_accounts;
create policy employee_email_accounts_select
on public.employee_email_accounts for select
using (
  public.is_admin(auth.uid()) or
  public.is_employee_self(emp_id) or
  public.is_org_owner(auth.uid(), (select org_id from public.employees e where e.emp_id = employee_email_accounts.emp_id))
);

-- No direct modifications; use RPC below

-- RPC to set an employee's email account, restricted to org owner/admin
create or replace function public.set_employee_email_account(
  p_emp_id uuid,
  p_email_account_id uuid
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

  if not public.is_admin(auth.uid()) and (v_org_id <> v_emp_org or v_org_id <> v_acc_org) then
    raise exception 'Not authorized to assign this account';
  end if;

  insert into public.employee_email_accounts(emp_id, email_account_id)
  values (p_emp_id, p_email_account_id)
  on conflict (emp_id) do update set email_account_id = excluded.email_account_id, updated_at = now();
end;
$$;

grant execute on function public.set_employee_email_account(uuid, uuid) to authenticated;

-- RPC to remove an employee's email account assignment
create or replace function public.remove_employee_email_account(
  p_emp_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_emp_org uuid;
begin
  v_org_id := public.get_current_org_id();
  if v_org_id is null and not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select org_id into v_emp_org from public.employees where emp_id = p_emp_id;
  if v_emp_org is null then
    raise exception 'Employee not found';
  end if;

  if not public.is_admin(auth.uid()) and v_org_id <> v_emp_org then
    raise exception 'Not authorized to unassign this account';
  end if;

  delete from public.employee_email_accounts where emp_id = p_emp_id;
end;
$$;

grant execute on function public.remove_employee_email_account(uuid) to authenticated;
