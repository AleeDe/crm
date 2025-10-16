-- Add tracking fields and relax constraints for bulk email and analytics
BEGIN;

-- Add opened/clicked timestamps and error column for diagnostics
ALTER TABLE IF EXISTS public.email_logs
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS error text;

-- Ensure tracking_id is indexed (it's already UNIQUE but index explicitly helps lookups)
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_id ON public.email_logs(tracking_id);

-- Sometimes bulk sending is done by org (no specific employee); allow null sent_by if not already
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_logs'
      AND column_name = 'sent_by'
  ) THEN
    BEGIN
      ALTER TABLE public.email_logs ALTER COLUMN sent_by DROP NOT NULL;
    EXCEPTION WHEN others THEN
      -- ignore if constraint already allows nulls or FK needs to remain; keep as is
      NULL;
    END;
  END IF;
END $$;

COMMIT;
