/*
  Break RLS recursion by using SECURITY DEFINER helper functions
  and refactoring policies for organizations and employees.
*/

-- Helper: check admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.admins a WHERE a.user_id = uid);
$$;

-- Helper: check if uid owns org
CREATE OR REPLACE FUNCTION public.is_org_owner(uid uuid, org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.organizations o WHERE o.org_id = org AND o.user_id = uid);
$$;

-- Helper: check if uid is member (employee) of org
CREATE OR REPLACE FUNCTION public.is_member_of_org(uid uuid, org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.employees e WHERE e.org_id = org AND e.user_id = uid);
$$;

-- Refactor organizations SELECT policy to use helpers (no direct table cross-refs)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Organizations can view own data" ON public.organizations;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Organizations can view own data"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    organizations.user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Refactor employees policies to use helpers
DO $$ BEGIN
  DROP POLICY IF EXISTS "Employees can view own data" ON public.employees;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Employees can view own data"
  ON public.employees FOR SELECT
  TO authenticated
  USING (
    employees.user_id = auth.uid()
    OR public.is_org_owner(auth.uid(), employees.org_id)
    OR public.is_admin(auth.uid())
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Organizations can insert employees" ON public.employees;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Organizations can insert employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_org_owner(auth.uid(), employees.org_id) );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Organizations can update employees" ON public.employees;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Organizations can update employees"
  ON public.employees FOR UPDATE
  TO authenticated
  USING ( public.is_org_owner(auth.uid(), employees.org_id) )
  WITH CHECK ( public.is_org_owner(auth.uid(), employees.org_id) );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Organizations can delete employees" ON public.employees;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Organizations can delete employees"
  ON public.employees FOR DELETE
  TO authenticated
  USING ( public.is_org_owner(auth.uid(), employees.org_id) );
