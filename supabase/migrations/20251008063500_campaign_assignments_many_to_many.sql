/*
  Many-to-many agent assignments for campaigns
  - Create campaign_assignments (campaign_id, emp_id)
  - Helper functions to validate org ownership
  - RLS policies for select/insert/delete
*/

-- Table
CREATE TABLE IF NOT EXISTS public.campaign_assignments (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  emp_id uuid NOT NULL REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (campaign_id, emp_id)
);

ALTER TABLE public.campaign_assignments ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_campaign_org(p_campaign uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.org_id FROM public.campaigns c WHERE c.campaign_id = p_campaign;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_org(p_emp uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.org_id FROM public.employees e WHERE e.emp_id = p_emp;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_assignment(p_uid uuid, p_campaign uuid, p_emp uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_owner(p_uid, public.get_campaign_org(p_campaign))
         AND public.get_campaign_org(p_campaign) = public.get_employee_org(p_emp);
$$;

-- Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Org can view campaign assignments" ON public.campaign_assignments;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Org can view campaign assignments"
  ON public.campaign_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_org_owner(auth.uid(), public.get_campaign_org(campaign_id))
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Org can manage campaign assignments" ON public.campaign_assignments;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Org can manage campaign assignments"
  ON public.campaign_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_assignment(auth.uid(), campaign_id, emp_id)
  );

CREATE POLICY "Org can delete campaign assignments"
  ON public.campaign_assignments FOR DELETE
  TO authenticated
  USING (
    public.can_manage_assignment(auth.uid(), campaign_id, emp_id)
  );

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_campaign ON public.campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_emp ON public.campaign_assignments(emp_id);
