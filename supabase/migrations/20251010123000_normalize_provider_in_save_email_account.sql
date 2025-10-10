-- Normalize provider to allowed values in save_email_account RPC to prevent check constraint violations
-- Allowed: 'smtp','gmail','outlook','other'

-- Ensure we replace the function with a normalized provider handling
DROP FUNCTION IF EXISTS public.save_email_account(text, text, text, text, int, text, text, uuid);

CREATE OR REPLACE FUNCTION public.save_email_account(
  p_provider text,
  p_from_name text,
  p_from_email text,
  p_smtp_host text,
  p_smtp_port int,
  p_smtp_username text,
  p_smtp_password text DEFAULT NULL,
  p_id uuid DEFAULT NULL
)
RETURNS public.email_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_key text;
  v_pwd_enc bytea;
  v_row public.email_accounts;
  v_provider text;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for current user';
  END IF;

  -- Normalize provider to allowed values
  v_provider := CASE
    WHEN lower(coalesce(p_provider,'smtp')) IN ('smtp','gmail','outlook','other') THEN lower(coalesce(p_provider,'smtp'))
    ELSE 'smtp'
  END;

  v_key := current_setting('app.settings.encryption_key', true);
  IF p_smtp_password IS NOT NULL AND p_smtp_password <> '' AND coalesce(v_key, '') <> '' THEN
    v_pwd_enc := pgp_sym_encrypt(p_smtp_password, v_key);
  ELSE
    v_pwd_enc := NULL;
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.email_accounts
    SET provider = v_provider,
        from_name = p_from_name,
        from_email = p_from_email,
        smtp_host = p_smtp_host,
        smtp_port = p_smtp_port,
        smtp_username = p_smtp_username,
        smtp_password_enc = coalesce(v_pwd_enc, smtp_password_enc)
    WHERE id = p_id AND org_id = v_org_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Email account not found or not owned by your org';
    END IF;
  ELSE
    INSERT INTO public.email_accounts(
      org_id, provider, from_name, from_email, smtp_host, smtp_port, smtp_username, smtp_password_enc
    ) VALUES (
      v_org_id, v_provider, p_from_name, p_from_email, p_smtp_host, p_smtp_port, p_smtp_username, v_pwd_enc
    ) RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_email_account(text, text, text, text, int, text, text, uuid) TO authenticated;
