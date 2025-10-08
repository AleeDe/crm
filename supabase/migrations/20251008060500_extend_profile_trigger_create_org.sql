/*
  Extend profile trigger to also create an organization for ORG users at sign-up.
  This removes the need to rely on a session or client-side insert.
*/

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
  org_name text;
  company_email text;
  phone text;
  industry text;
BEGIN
  -- Read desired role and user name from metadata
  desired_role := COALESCE(NEW.raw_user_meta_data->>'role', 'ORG');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');

  IF desired_role IN ('ADMIN','ORG','EMPLOYEE') THEN
    role_cast := desired_role::user_role;
  ELSE
    role_cast := 'ORG'::user_role;
  END IF;

  -- Ensure profile row exists
  INSERT INTO public.users (user_id, name, email, role)
  VALUES (NEW.id, user_name, COALESCE(NEW.email, ''), role_cast)
  ON CONFLICT (user_id) DO NOTHING;

  -- If this is an organization user, create an organization row as well
  IF role_cast = 'ORG' THEN
    org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', NULL);
    company_email := COALESCE(NEW.raw_user_meta_data->>'company_email', NEW.email);
    phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);
    industry := COALESCE(NEW.raw_user_meta_data->>'industry', NULL);

    IF org_name IS NULL OR btrim(org_name) = '' THEN
      org_name := CASE WHEN user_name IS NULL OR btrim(user_name) = ''
                       THEN 'My Organization'
                       ELSE user_name || ' Organization' END;
    END IF;

    INSERT INTO public.organizations (user_id, org_name, company_email, phone, industry, verified)
    VALUES (NEW.id, org_name, company_email, phone, industry, false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
