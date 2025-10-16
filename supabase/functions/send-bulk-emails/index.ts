// Supabase Edge Function: send-bulk-emails
// Sends N emails for a campaign using selected template and SMTP account, with tracking pixel and link redirects
// @ts-nocheck
// deno-lint-ignore-file no-explicit-any

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: 'Missing env' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  const supabaseUser = anonKey ? createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }) : null as any;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json();
  const { campaign_id, template_id, email_account_id, batch = 10, lead_ids, offset } = body as any;
  if (!campaign_id || !template_id || !email_account_id) return jsonResp({ error: 'Missing campaign_id/template_id/email_account_id' }, 400);

  // auth: org user or admin
  let userId: string | null = null;
  if (supabaseUser) {
    const { data: u } = await supabaseUser.auth.getUser();
    userId = u?.user?.id ?? null;
  }
  if (!userId) return jsonResp({ error: 'Unauthorized' }, 401);

  const { data: orgRow } = await admin.from('organizations').select('org_id').eq('user_id', userId).maybeSingle();
  const isAdmin = !orgRow; // if not org owner, consider admin path
  let orgId = orgRow?.org_id || null;
  if (!isAdmin && !orgId) return jsonResp({ error: 'Forbidden' }, 403);

  // fetch creds
  const { data: creds, error: credErr } = await admin.rpc('get_email_account_credentials', { p_id: email_account_id });
  if (credErr) return jsonResp({ error: credErr.message }, 400);
  const acc = creds?.[0];
  if (!acc) return jsonResp({ error: 'Account not found' }, 404);
  if (!isAdmin && acc.org_id !== orgId) return jsonResp({ error: 'Forbidden account' }, 403);
  if (!acc.smtp_password) return jsonResp({ error: 'No decrypted SMTP password available' }, 400);

  // get template
  const { data: tpl, error: tplErr } = await admin.from('email_templates').select('template_id, subject, body_html, org_id').eq('template_id', template_id).maybeSingle();
  if (tplErr || !tpl) return jsonResp({ error: tplErr?.message || 'Template not found' }, 400);
  if (!isAdmin && tpl.org_id !== orgId) return jsonResp({ error: 'Forbidden template' }, 403);

  // leads for campaign limited by batch and not yet sent (simple version)
  let leadsQuery = admin
    .from('leads')
    .select('lead_id, email, full_name, company, phone, campaign_id')
    .eq('campaign_id', campaign_id);

  if (Array.isArray(lead_ids) && lead_ids.length > 0) {
    leadsQuery = leadsQuery.in('lead_id', lead_ids);
  } else {
    const lim = Math.max(1, Math.min(500, Number(batch) || 10));
    if (typeof offset === 'number' && offset >= 0) {
      // range is inclusive
      leadsQuery = (leadsQuery as any).range(offset, offset + lim - 1);
    } else {
      leadsQuery = leadsQuery.limit(lim);
    }
  }

  const { data: leads, error: leadsErr } = await leadsQuery;
  if (leadsErr) return jsonResp({ error: leadsErr.message }, 400);
  if (!leads || leads.length === 0) return jsonResp({ error: 'No leads to send' }, 400);

  // import SMTP
  let SMTPClientClass: any;
  try {
    const mod: any = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');
    SMTPClientClass = mod?.SMTPClient ?? mod?.default?.SMTPClient ?? mod?.default;
    if (typeof SMTPClientClass !== 'function') return jsonResp({ error: 'Failed to load SMTP client' }, 500);
  } catch (e: any) {
    return jsonResp({ error: e?.message || 'SMTP import error' }, 500);
  }

  const client = new SMTPClientClass({
    connection: {
      hostname: acc.smtp_host,
      port: acc.smtp_port,
      tls: acc.smtp_port === 465 || acc.smtp_port === 587,
      auth: { username: acc.smtp_username, password: acc.smtp_password },
    },
  });

  const results: any[] = [];
  const trackingBase = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

  // simple merge tag helper
  const merge = (text: string, lead: any) => {
    const full = lead.full_name || '';
    const first = full.trim().split(/\s+/)[0] || '';
    const map: Record<string,string> = {
      '{{full_name}}': full,
      '{{first_name}}': first,
      '{{email}}': lead.email || '',
      '{{company}}': lead.company || '',
      '{{phone}}': lead.phone || '',
    };
    return Object.entries(map).reduce((acc,[k,v]) => acc.replaceAll(k, v), text);
  };

  for (const lead of leads) {
    const tracking_id = crypto.randomUUID();
    // Personalize subject/body
    const subj = merge(tpl.subject, lead);
    // Rewrite links to go via redirect endpoint after merge
    const linkRe = /href=\"(https?:[^\"]+)\"/gi;
    let body = merge(tpl.body_html, lead).replace(linkRe, (m, url) => `href=\"${trackingBase}/redirect?tid=${encodeURIComponent(tracking_id)}&target=${encodeURIComponent(url)}\"`);
    // Append tracking pixel
    body += `\n<img src="${trackingBase}/open?tid=${encodeURIComponent(tracking_id)}" width="1" height="1" style="display:none;"/>`;

    try {
      await client.send({
        from: `${acc.from_name || 'CRM'} <${acc.from_email || acc.smtp_username}>`,
        to: lead.email,
        subject: subj,
        html: body,
      });
      results.push({ lead_id: lead.lead_id, ok: true, tracking_id });
      await admin.from('email_logs').insert({
        campaign_id,
        lead_id: lead.lead_id,
        template_id: tpl.template_id,
        sent_by: null,
        status: 'sent',
        tracking_id,
      });
    } catch (e: any) {
      results.push({ lead_id: lead.lead_id, ok: false, error: e?.message });
      await admin.from('email_logs').insert({
        campaign_id,
        lead_id: lead.lead_id,
        template_id: tpl.template_id,
        sent_by: null,
        status: 'failed',
        error: e?.message,
        tracking_id,
      });
    }
  }

  try { await client.close(); } catch {}

  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  return jsonResp({ total: results.length, ok, failed: fail, results });
});
