/*
  Allow creating agents without creating a Supabase auth user immediately.
  - Make employees.user_id nullable (no longer UNIQUE).
  - Add employees.full_name and employees.email to store contact details.
  - Optional: add an index for (org_id, email) to avoid duplicates per org.
*/

-- Drop UNIQUE constraint on employees.user_id if exists
DO $$ BEGIN
  ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_user_id_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Make user_id nullable to support agents without auth accounts
ALTER TABLE public.employees ALTER COLUMN user_id DROP NOT NULL;

-- Add contact fields if not present
DO $$ BEGIN
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS full_name text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Create an index to help lookups and reduce duplicates per org (not enforced unique)
CREATE INDEX IF NOT EXISTS idx_employees_org_email ON public.employees(org_id, email);
