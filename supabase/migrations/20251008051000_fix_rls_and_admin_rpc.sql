/*
  Fix recursive RLS on users and expose has_admin() RPC for anon checks
*/

-- Avoid recursion: replace users policy that referenced users
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all users" ON users;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
    )
  );

-- Simplify admins policy to avoid referencing users and causing cycles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view own data" ON admins;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Admins can view own data"
  ON admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure the RPC can be called by unauthenticated clients during first-run
-- (Login screen uses anon key to check if an admin exists.)
GRANT EXECUTE ON FUNCTION has_admin() TO anon, authenticated;
