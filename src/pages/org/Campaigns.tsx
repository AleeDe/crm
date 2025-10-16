import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface Campaign {
  campaign_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
}

export function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    assigned_to: [] as string[],
  });
  const [assignedMap, setAssignedMap] = useState<Record<string, any[]>>({});
  const [orgId, setOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sendModal, setSendModal] = useState<{open: boolean; campaign?: Campaign | null}>({ open: false, campaign: null });
  const [templates, setTemplates] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sendForm, setSendForm] = useState<{ template_id: string; email_account_id: string; batch: number }>({ template_id: '', email_account_id: '', batch: 10 });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('org_id')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (!orgData) return;
      setOrgId(orgData.org_id);

      const [campaignsRes, employeesRes, assignmentsRes, templatesRes, accountsRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('org_id', orgData.org_id),
        // Include users.email as a fallback display when name is missing
        supabase.from('employees').select('emp_id, user_id, users(name, email)').eq('org_id', orgData.org_id),
        supabase
          .from('campaign_assignments')
          .select('campaign_id, emp_id, employees!inner(emp_id, user_id, users(name, email))')
        ,
        supabase.from('email_templates').select('template_id, name, subject').eq('org_id', orgData.org_id),
        supabase.from('email_accounts').select('id, from_name, from_email, smtp_username').eq('org_id', orgData.org_id)
      ]);

      setCampaigns(campaignsRes.data || []);
      setEmployees(employeesRes.data || []);
  setTemplates(templatesRes.data || []);
  setAccounts(accountsRes.data || []);
      const map: Record<string, any[]> = {};
      (assignmentsRes.data || []).forEach((a: any) => {
        map[a.campaign_id] = map[a.campaign_id] || [];
        map[a.campaign_id].push(a);
      });
      setAssignedMap(map);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCampaign) {
        const { error } = await supabase
          .from('campaigns')
          .update({
            title: formData.title,
            description: formData.description,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            status: formData.status,
          })
          .eq('campaign_id', editingCampaign.campaign_id);
        if (error) throw error;

        // Sync assignments
        const existing = (assignedMap[editingCampaign.campaign_id] || []).map((a) => a.emp_id);
        const toAdd = formData.assigned_to.filter((id) => !existing.includes(id));
        const toRemove = existing.filter((id: string) => !formData.assigned_to.includes(id));

        if (toAdd.length) {
          const rows = toAdd.map((emp_id) => ({ campaign_id: editingCampaign.campaign_id, emp_id }));
          const { error: addErr } = await supabase.from('campaign_assignments').insert(rows);
          if (addErr) throw addErr;
        }
        if (toRemove.length) {
          const { error: delErr } = await supabase
            .from('campaign_assignments')
            .delete()
            .in('emp_id', toRemove)
            .eq('campaign_id', editingCampaign.campaign_id);
          if (delErr) throw delErr;
        }
      } else {
        const { data, error } = await supabase.from('campaigns').insert({
          org_id: orgId,
          title: formData.title,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: formData.status,
        }).select('campaign_id').single();
        if (error) throw error;

        if (formData.assigned_to.length) {
          const rows = formData.assigned_to.map((emp_id) => ({ campaign_id: data.campaign_id, emp_id }));
          const { error: addErr } = await supabase.from('campaign_assignments').insert(rows);
          if (addErr) throw addErr;
        }
      }

      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase.from('campaigns').delete().eq('campaign_id', campaignId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const openModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        title: campaign.title,
        description: campaign.description || '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        status: campaign.status,
        assigned_to: (assignedMap[campaign.campaign_id] || []).map((a) => a.emp_id),
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'draft',
        assigned_to: [],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCampaign(null);
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

  return (
    <Layout userRole="ORG">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-2">Manage your email campaigns</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No campaigns yet. Create your first campaign to get started.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={campaign.campaign_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{campaign.title}</div>
                          {campaign.description && (
                            <div className="text-sm text-gray-500">{campaign.description}</div>
                          )}
                          <div className="mt-1 flex flex-wrap gap-2">
                            {(assignedMap[campaign.campaign_id] || []).map((a: any) => (
                              <span key={`${campaign.campaign_id}-${a.emp_id}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                {a.employees?.users?.name || a.employees?.users?.email?.split('@')[0] || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {campaign.start_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {campaign.end_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            campaign.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : campaign.status === 'completed'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(campaign)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.campaign_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSendForm({ template_id: '', email_account_id: '', batch: 10 });
                              setSendModal({ open: true, campaign });
                            }}
                            className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            title="Send bulk emails"
                          >
                            Send
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sendModal.open && sendModal.campaign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Send Emails - {sendModal.campaign.title}</h2>
              <button onClick={() => setSendModal({ open: false, campaign: null })} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {sendError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {sendError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg"
                  value={sendForm.template_id}
                  onChange={(e) => setSendForm({ ...sendForm, template_id: e.target.value })}
                >
                  <option value="">Select template</option>
                  {templates.map((t) => (
                    <option key={t.template_id} value={t.template_id}>{t.name} — {t.subject}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Account</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg"
                  value={sendForm.email_account_id}
                  onChange={(e) => setSendForm({ ...sendForm, email_account_id: e.target.value })}
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.from_email || a.smtp_username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How many leads?</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={sendForm.batch}
                  onChange={(e) => setSendForm({ ...sendForm, batch: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                  min={1}
                  max={500}
                />
                <p className="text-xs text-gray-500 mt-1">Send in small batches first (e.g., 5-10) to protect deliverability.</p>
              </div>
            </div>
            <div className="p-6 flex items-center justify-end gap-3 border-t">
              <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setSendModal({ open: false, campaign: null })}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                disabled={sending || !sendForm.template_id || !sendForm.email_account_id}
                onClick={async () => {
                  if (!sendModal.campaign) return;
                  setSending(true);
                  setSendError('');
                  try {
                    const { data, error } = await (supabase as any).functions.invoke('send-bulk-emails', {
                      body: {
                        campaign_id: sendModal.campaign.campaign_id,
                        template_id: sendForm.template_id,
                        email_account_id: sendForm.email_account_id,
                        batch: sendForm.batch,
                      },
                    });
                    if (error) {
                      try {
                        const resp = (error as any).context?.response;
                        if (resp) {
                          const text = await resp.text();
                          try {
                            const j = JSON.parse(text);
                            throw new Error(j.error || text);
                          } catch {
                            throw new Error(text || error.message || 'Failed');
                          }
                        }
                      } catch {}
                      throw new Error(error.message || 'Failed');
                    }
                    alert(`Sent: ${data.ok} / ${data.total}, failed: ${data.failed}`);
                    setSendModal({ open: false, campaign: null });
                  } catch (e: any) {
                    setSendError(e.message || 'Failed to send');
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign Agents</label>
                  {/* Custom multi-select with checkboxes for better UX (no Ctrl/Shift needed) */}
                  <div className="w-full border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                    <div className="max-h-48 overflow-y-auto p-2">
                      {employees.map((emp: any) => {
                        const checked = formData.assigned_to.includes(emp.emp_id);
                        const label = emp.users?.name || emp.users?.email?.split('@')[0] || 'Unknown';
                        return (
                          <label
                            key={emp.emp_id}
                            className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              checked={checked}
                              onChange={(e) => {
                                const selected = new Set(formData.assigned_to);
                                if (e.target.checked) selected.add(emp.emp_id);
                                else selected.delete(emp.emp_id);
                                setFormData({
                                  ...formData,
                                  assigned_to: Array.from(selected),
                                });
                              }}
                            />
                            <span className="text-sm text-gray-800">{label}</span>
                          </label>
                        );
                      })}
                      {employees.length === 0 && (
                        <div className="text-sm text-gray-500 py-2 px-1">No agents available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
