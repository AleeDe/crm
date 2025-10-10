// Supabase Edge Function: send-test-email
// Sends a test email using stored SMTP credentials for an email account id
// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
// Declare Deno for TypeScript tooling in VS Code
declare const Deno: any;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload =
  | {
      email_account_id: string
      to?: string
    }
  | {
      provider?: string
  from_name?: string
  from_email?: string
      smtp_host: string
      smtp_port: number
      smtp_username: string
      smtp_password: string
      to?: string
    }
  | {
      ping: true
    }

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    if (req.method !== 'POST') {
      return jsonResp({ error: 'Method not allowed' }, 405)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResp({ error: 'Missing env SUPABASE_URL or SERVICE_ROLE' }, 500)
    }

    const authHeader = req.headers.get('Authorization') || ''
  const supabaseUser = anonKey ? createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }) : null as any
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const payload = (await req.json()) as Payload

    // Validate caller
    let userId: string | null = null
    if (supabaseUser) {
      const { data: userRes } = await supabaseUser.auth.getUser()
      userId = userRes?.user?.id ?? null
    }
    // Fallback: decode JWT if anon key not set
    if (!userId) {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          userId = payload?.sub || null
        } catch (_) {
          // ignore
        }
      }
    }
    if (!userId) {
      return jsonResp({ error: 'Unauthorized' }, 401)
    }

    // Determine caller role and org
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    const isAdmin = userRow?.role === 'ADMIN'

    let orgId: string | null = null
    if (!isAdmin) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('org_id')
        .eq('user_id', userId)
        .maybeSingle()
      orgId = org?.org_id || null
      if (!orgId) {
        return jsonResp({ error: 'Forbidden' }, 403)
      }
    }

    // Quick ping path to verify auth/CORS/env without SMTP
    if ((payload as any).ping === true) {
      return jsonResp({ ok: true, userId, env: { hasUrl: !!supabaseUrl, hasServiceRole: !!serviceRoleKey, hasAnon: !!anonKey } }, 200)
    }

    // Resolve SMTP settings: either from a saved account id or from raw payload values
    let smtp_host: string,
      smtp_port: number,
      smtp_username: string,
      smtp_password: string,
      from_email: string | null = null,
      from_name: string | null = null

    if ((payload as any).email_account_id) {
      const { data, error } = await supabaseAdmin
        .rpc('get_email_account_credentials', { p_id: (payload as any).email_account_id })

      if (error) {
        return jsonResp({ error: (error as any).message }, 400)
      }

      if (!data || data.length === 0) {
        return jsonResp({ error: 'Account not found' }, 404)
      }

      const acc = data[0] as {
        provider: string
        from_name: string | null
        from_email: string | null
        smtp_host: string
        smtp_port: number
        smtp_username: string
        smtp_password: string | null
        org_id: string
      }

      if (!isAdmin && orgId && acc.org_id !== orgId) {
        return jsonResp({ error: 'Forbidden to use this account' }, 403)
      }
      if (!acc.smtp_password) {
        return jsonResp({ error: 'No decrypted SMTP password available' }, 400)
      }

      smtp_host = acc.smtp_host
      smtp_port = acc.smtp_port
      smtp_username = acc.smtp_username
      smtp_password = acc.smtp_password
      from_email = acc.from_email
      from_name = acc.from_name
    } else {
      const raw = payload as any
      smtp_host = raw.smtp_host
      smtp_port = raw.smtp_port
      smtp_username = raw.smtp_username
      smtp_password = raw.smtp_password
      from_email = raw.from_email || null
      from_name = raw.from_name || null
      if (!smtp_host || !smtp_port || !smtp_username || !smtp_password) {
        return jsonResp({ error: 'Missing SMTP fields: host, port, username, password' }, 400)
      }
    }

  const toAddr = (payload as any).to || from_email || smtp_username

    // Lazy import SMTP client to avoid failing OPTIONS preflight due to module import errors
    let SMTPClientClass: any
    try {
      const mod: any = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
      // Prefer named export, fall back to default exports if library shape changes
      SMTPClientClass = mod?.SMTPClient ?? mod?.default?.SMTPClient ?? mod?.default
      if (typeof SMTPClientClass !== 'function') {
        return jsonResp({ error: 'Failed to load SMTP client: export SMTPClient not found' }, 500)
      }
    } catch (e) {
      const err = e as any
      return jsonResp({ error: `Failed to load SMTP client: ${err?.message || 'import error'}` }, 500)
    }

    const client = new SMTPClientClass({
      connection: {
        hostname: smtp_host,
        port: smtp_port,
        // Enable TLS for 465 (implicit TLS) and 587 (STARTTLS), most providers require one of these
        tls: smtp_port === 465 || smtp_port === 587,
        auth: {
          username: smtp_username,
          password: smtp_password,
        },
      },
    })

    try {
      await client.send({
        from: `${from_name || 'CRM'} <${from_email || smtp_username}>`,
        to: toAddr,
        subject: 'Test email from CRM',
        content: 'This is a test email to confirm your SMTP settings are working.',
      })
      await client.close()
      return jsonResp({ ok: true }, 200)
    } catch (e) {
      try { await client.close() } catch { /* ignore */ }
      const err = e as any
      return jsonResp({ error: err?.message || 'SMTP send failed' }, 400)
    }
  } catch (e) {
    const err = e as any
    return jsonResp({ error: err?.message || 'Internal error' }, 500)
  }
})
