// Supabase Edge Function: redirect
// Logs a click and redirects to the target URL
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url);
  const tid = url.searchParams.get('tid');
  const target = url.searchParams.get('target');
  if (!target) return new Response('Missing target', { status: 400 });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (tid && supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      await admin.from('email_logs').update({ clicked_at: new Date().toISOString(), status: 'clicked' }).eq('tracking_id', tid);
    }
  } catch {}

  return Response.redirect(target, 302);
});
