/*
  Auto-create public.users row when a new auth.users row is inserted.
  This avoids client-side profile insert and RLS issues.
*/

-- Create function to handle new auth user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_role text;
  role_cast user_role;
  user_name text;
BEGIN
  -- Read desired role from user metadata if provided; default to ORG
  desired_role := COALESCE(NEW.raw_user_meta_data->>'role', 'ORG');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');

  -- Safely cast to enum; fallback to ORG on invalid value
  IF desired_role IN ('ADMIN','ORG','EMPLOYEE') THEN
    role_cast := desired_role::user_role;
  ELSE
    role_cast := 'ORG'::user_role;
  END IF;

  INSERT INTO public.users (user_id, name, email, role)
  VALUES (NEW.id, user_name, COALESCE(NEW.email, ''), role_cast)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to call the handler after insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
