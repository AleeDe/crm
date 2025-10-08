/*
  Ensure admins can edit (UPDATE) and delete (DELETE) any organization, and
  keep org owners able to edit their own organization. Uses helper is_admin().
  Also removes the old admin SELECT/UPDATE policies that referenced users to
  avoid recursive checks.
*/

-- Admins can UPDATE all organizations (use helper to avoid recursion)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can update all organizations" ON public.organizations;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Admins can update all organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING ( public.is_admin(auth.uid()) )
  WITH CHECK ( public.is_admin(auth.uid()) );

-- Admins can DELETE any organization
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  TO authenticated
  USING ( public.is_admin(auth.uid()) );

-- The organizations SELECT policy created in 20251008054500_rls_functions_break_cycles.sql
-- already includes admin visibility; remove the earlier redundant admin SELECT policy
-- that referenced public.users.
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
