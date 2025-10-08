/*
  Ensure organization owners can UPDATE and DELETE their agents (employees)
  and keep this logic simple via helper public.is_org_owner().
  We also keep INSERT policy intact from previous migrations.
*/

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
