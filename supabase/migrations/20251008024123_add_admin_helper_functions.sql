/*
  # Admin Helper Functions and Triggers

  This migration adds:
  1. A function to automatically create admin record when a user with ADMIN role is created
  2. A trigger to handle admin record creation
  3. Helper documentation for creating the first admin

  ## How to Create First Admin

  1. Sign up a user through the Supabase Auth (either through the app or Supabase dashboard)
  2. Run this SQL with the new user's ID:

  ```sql
  -- Get the user ID from auth.users table first
  SELECT id, email FROM auth.users;

  -- Then update that user to admin (replace USER_ID_HERE)
  UPDATE users 
  SET role = 'ADMIN' 
  WHERE user_id = 'USER_ID_HERE';

  -- Admin record will be created automatically by trigger
  ```

  ## Alternative: Create Admin Account Directly

  You can also create an admin account with a known email/password:
  
  1. Go to Supabase Dashboard > Authentication > Users
  2. Click "Add User" and create with email: admin@crm.local, password: admin123456
  3. Copy the User ID from the users list
  4. Run the UPDATE query above with that User ID
*/

-- Function to automatically create admin record when user role is set to ADMIN
CREATE OR REPLACE FUNCTION handle_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being set to ADMIN, ensure admin record exists
  IF NEW.role = 'ADMIN' THEN
    INSERT INTO admins (user_id, permissions)
    VALUES (NEW.user_id, '{"full_access": true, "org_approval": true}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when user is inserted or updated
DROP TRIGGER IF EXISTS on_user_role_change ON users;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_admin_role_change();

-- Function to check if any admin exists
CREATE OR REPLACE FUNCTION has_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helpful view for checking admin status (accessible by authenticated users)
CREATE OR REPLACE VIEW system_info AS
SELECT 
  (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') as admin_count,
  (SELECT COUNT(*) FROM organizations WHERE verified = true) as verified_orgs,
  (SELECT COUNT(*) FROM organizations WHERE verified = false) as pending_orgs,
  (SELECT COUNT(*) FROM users) as total_users;

-- Grant access to the view
GRANT SELECT ON system_info TO authenticated;

-- Add RLS policy for system_info view
ALTER VIEW system_info SET (security_invoker = true);