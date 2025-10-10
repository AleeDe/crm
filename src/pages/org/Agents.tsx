import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, X, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function Agents() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [aliasesByAccount, setAliasesByAccount] = useState<Record<string, any[]>>({});
  const [assigning, setAssigning] = useState<string>('');
  const [empAccountMap, setEmpAccountMap] = useState<Record<string, string>>({});
  const [empAliasMap, setEmpAliasMap] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    designation: '',
  });
  const [orgId, setOrgId] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ designation: '', status: 'active' });

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

      const { data } = await supabase
        .from('employees')
        .select('*, users(name, email)')
        .eq('org_id', orgData.org_id);

      setEmployees(data || []);
      // load email accounts for this org (support multiple accounts later)
      const { data: accs } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('org_id', orgData.org_id);
      setEmailAccounts(accs || []);
      // preload aliases for these accounts
      if (accs && accs.length > 0) {
        const accountIds = accs.map((a:any) => a.id);
        const { data: als } = await supabase
          .from('email_account_aliases')
          .select('*')
          .in('account_id', accountIds);
        const byAcc: Record<string, any[]> = {};
        (als || []).forEach((al:any) => {
          byAcc[al.account_id] = byAcc[al.account_id] || [];
          byAcc[al.account_id].push(al);
        });
        setAliasesByAccount(byAcc);
      }

      // Load current assignments
      const { data: links } = await supabase
        .from('employee_email_accounts')
        .select('emp_id, email_account_id, alias_id')
        .in('emp_id', (data || []).map((e:any) => e.emp_id));
      const map: Record<string, string> = {};
      const aliasMap: Record<string, string> = {};
      (links || []).forEach((l:any) => { map[l.emp_id] = l.email_account_id; if (l.alias_id) aliasMap[l.emp_id] = l.alias_id; });
      setEmpAccountMap(map);
      setEmpAliasMap(aliasMap);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Preserve current org session tokens (signUp may switch session)
      const { data: prev } = await supabase.auth.getSession();
      const prevAccess = prev.session?.access_token;
      const prevRefresh = prev.session?.refresh_token;

      // Create auth user for the agent; DB trigger will create users row
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name, role: 'EMPLOYEE' } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Restore previous org session if it changed
      if (prevAccess && prevRefresh) {
        await supabase.auth.setSession({ access_token: prevAccess, refresh_token: prevRefresh });
      }

      // Link the new user to this organization as an employee
      const { error: empError } = await supabase.from('employees').insert({
        user_id: authData.user.id,
        org_id: orgId,
        designation: formData.designation,
        status: 'active',
      });
      if (empError) throw empError;

      fetchData();
      closeModal();
      toast.success('Agent created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create employee');
      toast.error(err.message || 'Failed to create employee');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', email: '', password: '', designation: '' });
    setError('');
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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agents</h1>
            <p className="text-gray-600 mt-1">Assign sending identities to your team</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 transition"
          >
            <Plus className="w-5 h-5" />
            Add Agent
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {employees.map((emp) => {
            const accountId = empAccountMap[emp.emp_id];
            const aliasList = accountId ? (aliasesByAccount[accountId] || []) : [];
            return (
            <div
              key={emp.emp_id}
              className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6 transition-shadow hover:shadow-xl overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 ring-4 ring-blue-50 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                  {emp.users?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-tight truncate">{emp.users?.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{emp.users?.email}</p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full border ${
                        emp.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {emp.status === 'active' ? (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      ) : (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      )}
                      {emp.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    title="Edit"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    onClick={() => {
                      setEditingEmp(emp);
                      setEditForm({ designation: emp.designation || '', status: emp.status || 'active' });
                      setShowEditModal(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    onClick={async () => {
                      if (!confirm('Delete this agent?')) return;
                      try {
                        const { error } = await supabase.from('employees').delete().eq('emp_id', emp.emp_id);
                        if (error) throw error;
                        toast.success('Agent deleted');
                        fetchData();
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to delete agent');
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 tracking-wide mb-2 uppercase">Email Account</label>
                  {emailAccounts.length > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                      <select
                        className="px-3 py-2.5 border rounded-xl bg-white text-gray-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 flex-1 min-w-[220px] w-full"
                        disabled={assigning === emp.emp_id}
                        value={empAccountMap[emp.emp_id] || ''}
                        onChange={(e) => {
                          const accountId = e.target.value;
                          if (!accountId) return;
                          // Require alias selection: if no aliases for this account, block and ask to create alias first
                          const aliases = aliasesByAccount[accountId] || [];
                          if (aliases.length === 0) {
                            toast.info('Create an alias for this account first on Connect Email page');
                            return;
                          }
                          // Set selection locally; actual save happens when alias is picked
                          setEmpAccountMap((m) => ({ ...m, [emp.emp_id]: accountId }));
                          setEmpAliasMap((m) => { const { [emp.emp_id]: _, ...rest } = m; return rest; });
                        }}
                      >
                        <option value="">Select account</option>
                        {emailAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.from_email || acc.smtp_username}
                          </option>
                        ))}
                      </select>
                      {/* Alias selector for selected account */}
                      {accountId && aliasList.length > 0 ? (
                          <select
                            className="px-3 py-2.5 border rounded-xl bg-white text-gray-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 flex-1 min-w-[220px] w-full"
                            value={empAliasMap[emp.emp_id] || ''}
                            onChange={async (e) => {
                              const aliasId = e.target.value || null;
                              setAssigning(emp.emp_id);
                              try {
                                const { error } = await supabase.rpc('set_employee_email_account', {
                                  p_emp_id: emp.emp_id,
                                  p_email_account_id: accountId,
                                  p_alias_id: aliasId,
                                });
                                if (error) throw error;
                                setEmpAliasMap((m) => ({ ...m, [emp.emp_id]: aliasId || '' }));
                                toast.success(aliasId ? 'Alias selected' : 'Alias cleared');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to set alias');
                              } finally {
                                setAssigning('');
                              }
                            }}
                          >
                            <option value="">Select alias</option>
                            {aliasList.map((al:any) => (
                              <option key={al.id} value={al.id}>
                                {al.from_name ? `${al.from_name} <${al.from_email}>` : al.from_email}
                              </option>
                            ))}
                          </select>
                      ) : null}
                      <button
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/60 sm:ml-auto"
                        onClick={async () => {
                          try {
                            const { error } = await supabase.rpc('remove_employee_email_account', {
                              p_emp_id: emp.emp_id,
                            });
                            if (error) throw error;
                            setEmpAccountMap((m) => { const { [emp.emp_id]: _, ...rest } = m; return rest; });
                            setEmpAliasMap((m) => { const { [emp.emp_id]: _, ...rest } = m; return rest; });
                            toast.success('Unassigned email account');
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to unassign');
                          }
                        }}
                      >
                        Clear
                      </button>
                      <div className="w-full text-xs text-gray-500">Alias is required for agents</div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No email account connected. Use Connect Email to add one.</p>
                  )}
                </div>
              </div>
            );
          })}

          {employees.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No agents yet. Add your first team member to get started.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Add New Agent</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sales Agent, Marketing Specialist, etc."
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Create Agent
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

      {showEditModal && editingEmp && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Edit Agent</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { error } = await supabase
                    .from('employees')
                    .update({ designation: editForm.designation, status: editForm.status })
                    .eq('emp_id', editingEmp.emp_id);
                  if (error) throw error;
                  toast.success('Agent updated');
                  setShowEditModal(false);
                  setEditingEmp(null);
                  fetchData();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to update agent');
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input type="text" value={editingEmp.users?.name || ''} disabled className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors">Save</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
