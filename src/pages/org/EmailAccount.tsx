import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Trash2, TestTube } from 'lucide-react';

export function EmailAccount() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({
    provider: 'smtp',
    from_name: '',
    from_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
  });

  useEffect(() => {
    load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    try {
      // Load org
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle();
      setOrganization(org);
      if (!org) return;

      // Load email account
      const { data: accs } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('org_id', org.org_id)
        .order('created_at', { ascending: false });
      setEmailAccounts(accs || []);
    } catch (e) {
      console.error('Error loading email account', e);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const { error } = await supabase.rpc('save_email_account', {
        p_id: editingId,
        p_provider: emailForm.provider,
        p_from_name: emailForm.from_name,
        p_from_email: emailForm.from_email,
        p_smtp_host: emailForm.smtp_host,
        p_smtp_port: emailForm.smtp_port,
        p_smtp_username: emailForm.smtp_username,
        p_smtp_password: emailForm.smtp_password || null,
      });
      if (error) throw error;
      // refresh list
      await load();
      if (!emailForm.smtp_password) {
        toast.info('Saved without changing password');
      } else {
        toast.success('Email account saved');
      }
      setEditingId(null);
      setEmailForm((prev) => ({ ...prev, smtp_password: '' }));
    } catch (e: any) {
      toast.error(e.message || 'Failed to save email account');
    } finally {
      setSavingEmail(false);
    }
  };

  const deleteEmailAccount = async (id: string) => {
    if (!confirm('Delete this email account?')) return;
    try {
      const { error } = await supabase.rpc('delete_email_account_by_id', { p_id: id });
      if (error) throw error;
      await load();
      setEditingId(null);
      setEmailForm({ provider: 'smtp', from_name: '', from_email: '', smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '' });
      toast.success('Email account removed');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete email account');
    }
  };

  const testSend = async () => {
    if (!emailForm.from_email) {
      toast.error('Set a from email first');
      return;
    }
    setTestingEmail(true);
    try {
      await new Promise((res) => setTimeout(res, 800));
      toast.success('Test email initiated (mock)');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <Layout userRole="ORG">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!organization) {
    return (
      <Layout userRole="ORG">
        <div className="max-w-xl mx-auto text-center text-gray-600">
          Organization not found for your account.
        </div>
      </Layout>
    );
  }

  if (!organization.verified) {
    return (
      <Layout userRole="ORG">
        <div className="max-w-xl mx-auto text-center bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
          Your organization is pending verification. Email connection will be available once verified.
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="ORG">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connect Email</h1>
          <p className="text-gray-600 mt-2">Connect an SMTP account to send bulk emails</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Email Accounts</h3>
                <p className="text-sm text-gray-600">Manage one or more SMTP accounts for sending</p>
              </div>
            </div>
          </div>

          {/* Existing accounts list */}
          {emailAccounts.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Connected Accounts</h4>
              <div className="space-y-2">
                {emailAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-gray-900">{acc.from_name || '(No name)'} <span className="text-gray-500">&lt;{acc.from_email || acc.smtp_username}&gt;</span></p>
                      <p className="text-xs text-gray-500">{acc.provider?.toUpperCase()} • {acc.smtp_host}:{acc.smtp_port}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
                        onClick={() => {
                          setEditingId(acc.id);
                          setEmailForm({
                            provider: acc.provider || 'smtp',
                            from_name: acc.from_name || '',
                            from_email: acc.from_email || '',
                            smtp_host: acc.smtp_host || '',
                            smtp_port: acc.smtp_port || 587,
                            smtp_username: acc.smtp_username || '',
                            smtp_password: '',
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                        onClick={() => deleteEmailAccount(acc.id)}
                      >
                        <Trash2 className="w-4 h-4 inline-block mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={saveEmailAccount} className="space-y-4">
            {editingId && (
              <div className="text-sm text-gray-600">Editing account: <span className="font-medium">{editingId}</span></div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.provider}
                  onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })}
                >
                  <option value="smtp">SMTP</option>
                  <option value="gmail">Gmail (SMTP)</option>
                  <option value="outlook">Outlook (SMTP)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.from_name}
                  onChange={(e) => setEmailForm({ ...emailForm, from_name: e.target.value })}
                  placeholder="Acme Inc"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.from_email}
                  onChange={(e) => setEmailForm({ ...emailForm, from_email: e.target.value })}
                  placeholder="no-reply@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <input
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.smtp_host}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
                  placeholder="smtp.mailprovider.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.smtp_port}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_port: parseInt(e.target.value || '0', 10) })}
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                <input
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.smtp_username}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_username: e.target.value })}
                  placeholder="user@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={emailForm.smtp_password}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_password: e.target.value })}
                  placeholder="••••••••"
                />
                {editingId && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing password.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingEmail}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {savingEmail ? 'Saving...' : editingId ? 'Update' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={testSend}
                disabled={testingEmail}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" /> {testingEmail ? 'Testing...' : 'Send Test'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
