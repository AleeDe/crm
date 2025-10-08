/*
  RPC to create an organization for the current user.
  Ensures row is created server-side to avoid client RLS gotchas.
*/

CREATE OR REPLACE FUNCTION public.create_org_for_current_user(
  p_org_name text,
  p_company_email text,
  p_phone text,
  p_industry text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If org already exists for user, return it
  SELECT org_id INTO v_org_id FROM public.organizations WHERE user_id = v_user_id;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  INSERT INTO public.organizations (user_id, org_name, company_email, phone, industry, verified)
  VALUES (v_user_id, p_org_name, p_company_email, p_phone, p_industry, false)
  RETURNING org_id INTO v_org_id;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_org_for_current_user(text, text, text, text) TO authenticated;
