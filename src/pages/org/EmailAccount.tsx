import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Trash2, TestTube, Eye, EyeOff } from 'lucide-react';

export function EmailAccount() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [aliases, setAliases] = useState<any[]>([]);
  const [selectedAliasId, setSelectedAliasId] = useState<string>('');
  const [aliasForm, setAliasForm] = useState<{ id: string | null; from_name: string; from_email: string }>({ id: null, from_name: '', from_email: '' });
  const [emailForm, setEmailForm] = useState({
    provider: 'smtp',
    from_name: '',
    from_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
  });

  const applyProviderDefaults = (provider: string) => {
    setEmailForm((prev) => {
      const next = { ...prev, provider } as typeof prev;
      if (provider === 'gmail') {
        next.smtp_host = 'smtp.gmail.com';
        next.smtp_port = 587;
      } else if (provider === 'outlook') {
        next.smtp_host = 'smtp.office365.com';
        next.smtp_port = 587;
      } else if (provider === 'hostinger') {
        next.smtp_host = 'smtp.hostinger.com';
        next.smtp_port = 587;
      } else if (provider === 'smtp' || provider === 'other') {
        // keep user's custom host if already set; ensure a sensible default port
        next.smtp_port = prev.smtp_port || 587;
      }
      return next;
    });
  };

  useEffect(() => {
    load();
  }, [user]);

  // Load aliases whenever we start editing a specific account
  useEffect(() => {
    const loadAliases = async () => {
      if (!editingId) {
        setAliases([]);
        setSelectedAliasId('');
        setAliasForm({ id: null, from_name: '', from_email: '' });
        return;
      }
      const { data: al } = await supabase
        .from('email_account_aliases')
        .select('*')
        .eq('account_id', editingId)
        .order('created_at', { ascending: false });
      setAliases(al || []);
    };
    loadAliases();
  }, [editingId]);

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
      // Map UI-only preset 'hostinger' to 'smtp' to satisfy DB check constraint
      const providerForSave = emailForm.provider === 'hostinger' ? 'smtp' : emailForm.provider;
      const { error } = await supabase.rpc('save_email_account', {
        p_id: editingId,
        p_provider: providerForSave,
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
    setTestingEmail(true);
    try {
      const selectedAlias = aliases.find((a) => a.id === selectedAliasId);
      const aliasFields = selectedAlias
        ? { from_name: selectedAlias.from_name || emailForm.from_name, from_email: selectedAlias.from_email || emailForm.from_email }
        : { from_name: emailForm.from_name, from_email: emailForm.from_email };

      const to = testTo.trim();
      // If we're editing an existing account but the form has a password filled,
      // prefer testing with the raw credentials from the form (avoids missing encryption key issues).
      const useRaw = !editingId || !!emailForm.smtp_password;
      const payload = useRaw
        ? {
            provider: emailForm.provider,
            ...aliasFields,
            smtp_host: emailForm.smtp_host,
            smtp_port: emailForm.smtp_port,
            smtp_username: emailForm.smtp_username,
            smtp_password: emailForm.smtp_password,
            ...(to ? { to } : {}),
          }
        : { email_account_id: editingId, ...aliasFields, ...(to ? { to } : {}) };

      // Basic validation when not saved yet
      if (!('email_account_id' in payload)) {
        if (!emailForm.smtp_host || !emailForm.smtp_username || !emailForm.smtp_password) {
          throw new Error('Enter SMTP host, username, and password to run a test');
        }
      }

      const { data: fnData, error: fnError } = await (supabase as any).functions.invoke('send-test-email', {
        body: payload,
      });
      if (fnError) {
        // Surface the actual error body from the Edge Function when available
        try {
          const resp = (fnError as any).context?.response;
          if (resp) {
            const text = await resp.text();
            try {
              const j = JSON.parse(text);
              throw new Error(j.error || j.message || text);
            } catch {
              throw new Error(text || fnError.message || 'Failed to send');
            }
          }
        } catch {}
        throw new Error(fnError.message || 'Failed to send');
      }
      if (fnData?.error) throw new Error(fnData.error);
      toast.success('Test email sent');
    } catch (e: any) {
      // Friendly guidance for a common case
      if (typeof e.message === 'string' && e.message.toLowerCase().includes('no decrypted smtp password')) {
        toast.error('No saved SMTP password found. Enter the SMTP password and click Update, or type it and click Send Test again.');
        setTestingEmail(false);
        return;
      }
      toast.error(e.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const pingFunction = async () => {
    setPinging(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('send-test-email', {
        body: { ping: true },
      });
      if (error) throw new Error(error.message || 'Ping failed');
      if (data?.ok) {
        const env = data.env || {};
        toast.success(
          `Ping OK. userId: ${data.userId || 'n/a'} | env: url:${env.hasUrl ? '✓' : '×'}, service:${env.hasServiceRole ? '✓' : '×'}, anon:${env.hasAnon ? '✓' : '×'}`
        );
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        toast.message('Ping returned unexpected response');
      }
    } catch (e: any) {
      toast.error(e.message || 'Ping failed');
    } finally {
      setPinging(false);
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
                  onChange={(e) => applyProviderDefaults(e.target.value)}
                >
                  <option value="smtp">SMTP</option>
                  <option value="gmail">Gmail (SMTP)</option>
                  <option value="outlook">Outlook (SMTP)</option>
                  <option value="hostinger">Hostinger (SMTP)</option>
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
                {emailForm.provider === 'hostinger' && (
                  <p className="text-xs text-gray-500 mt-1">Hostinger: use the full email address as the username. SMTP host is smtp.hostinger.com, port 587 (STARTTLS) or 465 (SSL).</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2 border rounded-lg pr-10"
                    value={emailForm.smtp_password}
                    onChange={(e) => setEmailForm({ ...emailForm, smtp_password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {editingId && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing password.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                type="submit"
                disabled={savingEmail}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {savingEmail ? 'Saving...' : editingId ? 'Update' : 'Connect'}
              </button>
              <input
                type="email"
                className="px-4 py-2 border rounded-lg"
                placeholder="Send test to (optional)"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <button
                type="button"
                onClick={testSend}
                disabled={testingEmail}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" /> {testingEmail ? 'Testing...' : 'Send Test'}
              </button>
              <button
                type="button"
                onClick={pingFunction}
                disabled={pinging}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                title="Quickly verify Edge Function auth and environment without sending email"
              >
                {pinging ? 'Pinging...' : 'Ping Function'}
              </button>
            </div>
          </form>

          {editingId && (
            <div className="mt-8 border-t pt-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Sender Aliases</h4>
              <div className="flex items-center gap-2 mb-3">
                <select
                  className="px-3 py-2 border rounded-lg"
                  value={selectedAliasId}
                  onChange={(e) => setSelectedAliasId(e.target.value)}
                >
                  <option value="">Use main address ({emailForm.from_email || emailForm.smtp_username})</option>
                  {aliases.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.from_name ? `${a.from_name} <${a.from_email}>` : a.from_email}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">Selected alias affects the From header in test emails.</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alias Name</label>
                    <input
                      className="w-full px-4 py-2 border rounded-lg"
                      value={aliasForm.from_name}
                      onChange={(e) => setAliasForm({ ...aliasForm, from_name: e.target.value })}
                      placeholder="Support"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alias Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border rounded-lg"
                      value={aliasForm.from_email}
                      onChange={(e) => setAliasForm({ ...aliasForm, from_email: e.target.value })}
                      placeholder="support@yourdomain.com"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!aliasForm.from_email) return;
                        try {
                          const { error } = await supabase.rpc('save_email_alias', {
                            p_id: aliasForm.id,
                            p_account_id: editingId,
                            p_from_name: aliasForm.from_name || null,
                            p_from_email: aliasForm.from_email,
                          });
                          if (error) throw error;
                          const { data: al } = await supabase
                            .from('email_account_aliases')
                            .select('*')
                            .eq('account_id', editingId)
                            .order('created_at', { ascending: false });
                          setAliases(al || []);
                          setAliasForm({ id: null, from_name: '', from_email: '' });
                          toast.success('Alias saved');
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to save alias');
                        }
                      }}
                    >
                      {aliasForm.id ? 'Update Alias' : 'Add Alias'}
                    </button>
                    {aliasForm.id && (
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setAliasForm({ id: null, from_name: '', from_email: '' });
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {aliases.length > 0 && (
                <div className="mt-4 space-y-2">
                  {aliases.map((a) => (
                    <div key={a.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium text-gray-900">{a.from_name || '(No name)'} <span className="text-gray-500">&lt;{a.from_email}&gt;</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
                          onClick={() => setAliasForm({ id: a.id, from_name: a.from_name || '', from_email: a.from_email })}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                          onClick={async () => {
                            if (!confirm('Delete this alias?')) return;
                            try {
                              const { error } = await supabase.rpc('delete_email_alias_by_id', { p_id: a.id });
                              if (error) throw error;
                              const { data: al } = await supabase
                                .from('email_account_aliases')
                                .select('*')
                                .eq('account_id', editingId)
                                .order('created_at', { ascending: false });
                              setAliases(al || []);
                              if (selectedAliasId === a.id) setSelectedAliasId('');
                              toast.success('Alias deleted');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to delete alias');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
