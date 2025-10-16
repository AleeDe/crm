import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Send() {
  const { user } = useAuth();
  // orgId not used directly in this view
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({ campaign_id: '', template_id: '', email_account_id: '', batch: 10, lead_ids: '' as string, offset: '' as string });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: org } = await supabase.from('organizations').select('org_id').eq('user_id', user.user_id).maybeSingle();
  if (!org) return;
      const [cRes, tRes, aRes] = await Promise.all([
        supabase.from('campaigns').select('campaign_id, title').eq('org_id', org.org_id),
        supabase.from('email_templates').select('template_id, name, subject').eq('org_id', org.org_id),
        supabase.from('email_accounts').select('id, from_name, from_email, smtp_username').eq('org_id', org.org_id),
      ]);
      setCampaigns(cRes.data || []);
      setTemplates(tRes.data || []);
      setAccounts(aRes.data || []);
    };
    load();
  }, [user]);

  return (
    <Layout userRole="ORG">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Bulk Emails</h1>
          <p className="text-gray-600 mt-2">Pick a campaign, template, and account. We personalize, track opens and clicks automatically.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {result && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
            Sent: {result.ok} / {result.total}, failed: {result.failed}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
            <select className="w-full px-4 py-2 border rounded-lg" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
              <option value="">Select a campaign</option>
              {campaigns.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <select className="w-full px-4 py-2 border rounded-lg" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}>
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.template_id} value={t.template_id}>{t.name} — {t.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Account</label>
            <select className="w-full px-4 py-2 border rounded-lg" value={form.email_account_id} onChange={(e) => setForm({ ...form, email_account_id: e.target.value })}>
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.from_email || a.smtp_username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">How many leads?</label>
            <input type="number" className="w-full px-4 py-2 border rounded-lg" value={form.batch} onChange={(e) => setForm({ ...form, batch: Math.max(1, parseInt(e.target.value || '1', 10)) })} min={1} max={500} />
            <p className="text-xs text-gray-500 mt-1">Start with small batches to validate deliverability.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Optional: Specific lead IDs (comma-separated)</label>
            <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="lead-id-1,lead-id-2" value={form.lead_ids} onChange={(e) => setForm({ ...form, lead_ids: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">If provided, we send only to these leads (they must belong to the selected campaign).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Optional: Offset (start index)</label>
            <input type="number" className="w-full px-4 py-2 border rounded-lg" placeholder="0" value={form.offset} onChange={(e) => setForm({ ...form, offset: e.target.value })} min={0} />
            <p className="text-xs text-gray-500 mt-1">We’ll send batch size starting from this offset within the campaign’s leads.</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setForm({ campaign_id: '', template_id: '', email_account_id: '', batch: 10, lead_ids: '', offset: '' })}>Reset</button>
            <button
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              disabled={sending || !form.campaign_id || !form.template_id || !form.email_account_id}
              onClick={async () => {
                setSending(true); setError(''); setResult(null);
                try {
                  const ids = form.lead_ids.split(',').map(s => s.trim()).filter(Boolean);
                  const payload: any = {
                    campaign_id: form.campaign_id,
                    template_id: form.template_id,
                    email_account_id: form.email_account_id,
                    batch: form.batch,
                  };
                  if (ids.length > 0) payload.lead_ids = ids;
                  if (form.offset !== '' && !isNaN(Number(form.offset))) payload.offset = Number(form.offset);
                  const { data, error } = await (supabase as any).functions.invoke('send-bulk-emails', { body: payload });
                  if (error) {
                    try {
                      const resp = (error as any).context?.response;
                      if (resp) {
                        const text = await resp.text();
                        try { const j = JSON.parse(text); throw new Error(j.error || text); } catch { throw new Error(text || error.message || 'Failed'); }
                      }
                    } catch {}
                    throw new Error(error.message || 'Failed');
                  }
                  setResult(data);
                } catch (e: any) {
                  setError(e.message || 'Failed to send');
                } finally { setSending(false); }
              }}
            >
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Personalization: {'{{first_name}} {{full_name}} {{email}} {{company}} {{phone}}'}. Tracking pixel and link redirects are added automatically.
        </div>
      </div>
    </Layout>
  );
}
