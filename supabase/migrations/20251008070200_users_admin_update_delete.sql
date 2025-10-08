/*
  Allow admins to UPDATE and DELETE any user profile row via helper is_admin().
  This enables Admin Dashboard to edit name/role and delete user profiles.
  Note: Deleting from public.users does not remove auth.users.
*/

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  TO authenticated
  USING ( public.is_admin(auth.uid()) )
  WITH CHECK ( public.is_admin(auth.uid()) );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  TO authenticated
  USING ( public.is_admin(auth.uid()) );
