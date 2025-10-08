import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { Building, CheckCircle, XCircle, Mail, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#22d3ee'];

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [timeGranularity, setTimeGranularity] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    (async () => {
      try {
        const [orgRes, campRes, leadRes] = await Promise.all([
          supabase.from('organizations').select('org_id, org_name, verified, subscription_plan, industry, created_at'),
          supabase.from('campaigns').select('campaign_id, org_id, status, created_at'),
          supabase.from('leads').select('lead_id, campaign_id, created_at'),
        ]);
        setOrgs(orgRes.data || []);
        setCampaigns(campRes.data || []);
        setLeads(leadRes.data || []);
      } catch (e) {
        console.error('Error loading dashboard data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // KPIs
  const totalOrgs = orgs.length;
  const verifiedOrgs = orgs.filter(o => o.verified).length;
  const unverifiedOrgs = totalOrgs - verifiedOrgs;
  const totalCampaigns = campaigns.length;
  const totalLeads = leads.length;

  // Plan distribution pie
  const planData = useMemo(() => {
    const counts: Record<string, number> = {};
    orgs.forEach(o => counts[o.subscription_plan || 'free'] = (counts[o.subscription_plan || 'free'] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orgs]);

  // Campaign status pie
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, active: 0, completed: 0 };
    campaigns.forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [campaigns]);

  // Top industries
  const topIndustries = useMemo(() => {
    const counts: Record<string, number> = {};
    orgs.forEach(o => {
      const key = o.industry || 'Other';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([industry, value]) => ({ industry, value }));
  }, [orgs]);

  // Leads by Organization (bar)
  const leadsByOrg = useMemo(() => {
    const campById = new Map(campaigns.map((c: any) => [c.campaign_id, c]));
    const byOrg: Record<string, number> = {};
    leads.forEach(l => {
      const c = campById.get(l.campaign_id);
      if (!c) return;
      byOrg[c.org_id] = (byOrg[c.org_id] || 0) + 1;
    });
    return Object.entries(byOrg).map(([org_id, value]) => ({
      org: orgs.find(o => o.org_id === org_id)?.org_name || 'Unknown',
      value,
    }));
  }, [leads, campaigns, orgs]);

  // Campaigns by Organization (bar)
  const campaignsByOrg = useMemo(() => {
    const byOrg: Record<string, number> = {};
    campaigns.forEach(c => byOrg[c.org_id] = (byOrg[c.org_id] || 0) + 1);
    return Object.entries(byOrg).map(([org_id, value]) => ({
      org: orgs.find(o => o.org_id === org_id)?.org_name || 'Unknown',
      value,
    }));
  }, [campaigns, orgs]);

  // New org registrations over time (weekly/monthly)
  const registrations = useMemo(() => {
    const now = new Date();
    if (timeGranularity === 'weekly') {
      // Last 12 weeks
      const weeks: { label: string; value: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const start = startOfWeek(addDays(now, -7 * i));
        const end = addDays(start, 7);
        const label = `${start.getMonth() + 1}/${start.getDate()}`;
        const value = orgs.filter(o => {
          const d = new Date(o.created_at);
          return d >= start && d < end;
        }).length;
        weeks.push({ label, value });
      }
      return weeks;
    } else {
      // Last 12 months
      const months: { label: string; value: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const value = orgs.filter(o => {
          const t = new Date(o.created_at);
          return t >= d && t < next;
        }).length;
        months.push({ label, value });
      }
      return months;
    }
  }, [orgs, timeGranularity]);

  function startOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun - 6 Sat
    const diff = (day === 0 ? -6 : 1) - day; // ISO week start Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  // No edit tables on dashboard; analytics only

  if (loading) {
    return (
      <Layout userRole="ADMIN">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="ADMIN">
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-600 mt-2">High-level analytics across your CRM</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Granularity</label>
                  <select value={timeGranularity} onChange={(e) => setTimeGranularity(e.target.value as any)} className="px-3 py-2 border rounded-lg">
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrgs}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Verified Orgs</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{verifiedOrgs}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Unverified Orgs</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{unverifiedOrgs}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{totalCampaigns}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Leads</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{totalLeads}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={planData} dataKey="value" nameKey="name" outerRadius={100} label>
                          {planData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label>
                          {statusData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Top Industries</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topIndustries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="industry" angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Leads by Organization</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsByOrg}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="org" interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Campaigns by Organization</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campaignsByOrg}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="org" interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">New Organizations ({timeGranularity})</h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={registrations}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
      </div>
    </Layout>
  );
}
