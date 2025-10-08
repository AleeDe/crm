/*
  Allow org owners to view the users of their employees so names render in the UI.
  Adds a SECURITY DEFINER helper and a users SELECT policy.
*/

CREATE OR REPLACE FUNCTION public.is_user_in_org(p_user uuid, p_owner uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.organizations o ON o.org_id = e.org_id
    WHERE e.user_id = p_user
      AND o.user_id = p_owner
  );
$$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Org can view users in own org" ON public.users;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Org can view users in own org"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    public.is_user_in_org(users.user_id, auth.uid())
    OR public.is_admin(auth.uid())
  );
