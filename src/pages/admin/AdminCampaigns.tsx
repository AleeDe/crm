import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export function AdminCampaigns() {
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [orgsRes, campRes, leadsRes] = await Promise.all([
          supabase.from('organizations').select('org_id, org_name'),
          supabase.from('campaigns').select('campaign_id, org_id, status'),
          supabase.from('leads').select('lead_id, campaign_id'),
        ]);
        setOrgs(orgsRes.data || []);
        setCampaigns(campRes.data || []);
        setLeads(leadsRes.data || []);
      } catch (e) {
        console.error('Error loading admin campaigns', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredCampaigns = useMemo(() => (orgFilter ? campaigns.filter(c => c.org_id === orgFilter) : campaigns), [orgFilter, campaigns]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, active: 0, completed: 0 };
    filteredCampaigns.forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCampaigns]);

  const leadsByOrg = useMemo(() => {
    const campById = new Map(filteredCampaigns.map(c => [c.campaign_id, c]));
    const byOrg: Record<string, number> = {};
    leads.forEach(l => {
      const c = campById.get(l.campaign_id);
      if (!c) return;
      byOrg[c.org_id] = (byOrg[c.org_id] || 0) + 1;
    });
    return Object.entries(byOrg).map(([org_id, value]) => ({ org: orgs.find(o => o.org_id === org_id)?.org_name || 'Unknown', value }));
  }, [leads, filteredCampaigns, orgs]);

  return (
    <Layout userRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns Overview</h1>
            <p className="text-gray-600 mt-2">Filter by organization and view system-wide campaign stats</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="">All Organizations</option>
              {orgs.map(o => <option key={o.org_id} value={o.org_id}>{o.org_name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={100} label>
                        {statusCounts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Leads by Organization</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsByOrg}>
                      <XAxis dataKey="org" hide={false} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
