import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Edit2, Trash2, X } from 'lucide-react';

export function AdminOrganizations() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [orgForm, setOrgForm] = useState({
    org_name: '',
    company_email: '',
    phone: '',
    industry: '',
    subscription_plan: 'free',
    verified: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('organizations').select('*');
      if (error) throw error;
      setOrganizations(data || []);
    } catch (e) {
      console.error('Error loading organizations', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ verified: !currentStatus })
        .eq('org_id', orgId);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error('Error updating verification', e);
    }
  };

  const openEditOrg = (org: any) => {
    setEditingOrg(org);
    setOrgForm({
      org_name: org.org_name || '',
      company_email: org.company_email || '',
      phone: org.phone || '',
      industry: org.industry || '',
      subscription_plan: org.subscription_plan || 'free',
      verified: !!org.verified,
    });
    setShowEditModal(true);
  };

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          org_name: orgForm.org_name,
          company_email: orgForm.company_email,
          phone: orgForm.phone,
          industry: orgForm.industry,
          subscription_plan: orgForm.subscription_plan,
          verified: orgForm.verified,
        })
        .eq('org_id', editingOrg.org_id);
      if (error) throw error;
      setShowEditModal(false);
      setEditingOrg(null);
      fetchData();
    } catch (e) {
      console.error('Error updating organization', e);
    }
  };

  const deleteOrg = async (orgId: string) => {
    if (!confirm('Delete this organization? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('organizations').delete().eq('org_id', orgId);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error('Error deleting organization', e);
    }
  };

  return (
    <Layout userRole="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-600 mt-2">Manage all organizations</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizations.map((org) => (
                    <tr key={org.org_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{org.org_name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{org.company_email}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{org.industry || '-'}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{org.subscription_plan}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {org.verified ? (
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /><span className="text-sm font-medium">Verified</span></span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600"><XCircle className="w-4 h-4" /><span className="text-sm font-medium">Pending</span></span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleVerification(org.org_id, org.verified)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${org.verified ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{org.verified ? 'Revoke' : 'Verify'}</button>
                          <button onClick={() => openEditOrg(org)} title="Edit" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteOrg(org.org_id)} title="Delete" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {organizations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No organizations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showEditModal && editingOrg && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-bold text-gray-900">Edit Organization</h3>
                <button onClick={() => { setShowEditModal(false); setEditingOrg(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={saveOrg} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg" value={orgForm.org_name} onChange={(e) => setOrgForm({ ...orgForm, org_name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                  <input type="email" className="w-full px-4 py-2 border rounded-lg" value={orgForm.company_email} onChange={(e) => setOrgForm({ ...orgForm, company_email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg" value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg" value={orgForm.industry} onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                    <select className="w-full px-4 py-2 border rounded-lg" value={orgForm.subscription_plan} onChange={(e) => setOrgForm({ ...orgForm, subscription_plan: e.target.value })}>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input id="verified" type="checkbox" className="h-4 w-4" checked={orgForm.verified} onChange={(e) => setOrgForm({ ...orgForm, verified: e.target.checked })} />
                    <label htmlFor="verified" className="text-sm text-gray-700">Verified</label>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg">Save</button>
                  <button type="button" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg" onClick={() => { setShowEditModal(false); setEditingOrg(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
