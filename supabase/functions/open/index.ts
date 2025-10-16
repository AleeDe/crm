// Supabase Edge Function: open
// Serves a 1x1 transparent PNG and marks the email as opened
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PNG_1x1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4//8/AwAI/AL+N2n8GQAAAABJRU5ErkJggg==';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const tid = url.searchParams.get('tid');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!tid || !supabaseUrl || !serviceRoleKey) {
      return new Response('', { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);
    await admin.from('email_logs').update({ opened_at: new Date().toISOString(), status: 'opened' }).eq('tracking_id', tid);
  } catch {}
  return new Response(Uint8Array.from(atob(PNG_1x1_BASE64), c => c.charCodeAt(0)), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
});
