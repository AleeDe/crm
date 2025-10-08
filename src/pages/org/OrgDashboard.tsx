import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Users, Send, TrendingUp, AlertCircle, Crown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { toast } from 'sonner';

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  emailsSent: number;
  totalLeads: number;
  openRate: number;
}

export function OrgDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    totalLeads: 0,
    openRate: 0,
  });
  const [organization, setOrganization] = useState<any>(null);
  const [leadStatusData, setLeadStatusData] = useState<any[]>([]);
  const [emailTrendData, setEmailTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (!orgData) {
        // Attempt to initialize the organization using RPC; metadata may have been provided at signUp
        const { data: authUserData } = await supabase.auth.getUser();
        const meta: any = authUserData?.user?.user_metadata || {};
        const { error: createOrgErr } = await supabase.rpc('create_org_for_current_user', {
          p_org_name: meta.org_name || 'My Organization',
          p_company_email: meta.company_email || user.email,
          p_phone: meta.phone || null,
          p_industry: meta.industry || null,
        });
        if (createOrgErr) {
          console.error('Error creating organization via RPC:', createOrgErr);
          return;
        }
        const { data: orgData2 } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', user.user_id)
          .maybeSingle();
        if (!orgData2) return;
        setOrganization(orgData2);
      } else {
        setOrganization(orgData);
      }

      const [campaignsRes, leadsRes, emailsRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('org_id', orgData.org_id),
        supabase
          .from('leads')
          .select('*, campaigns!inner(org_id)')
          .eq('campaigns.org_id', orgData.org_id),
        supabase
          .from('email_logs')
          .select('*, campaigns!inner(org_id)')
          .eq('campaigns.org_id', orgData.org_id),
      ]);

      const campaigns = campaignsRes.data || [];
      const leads = leadsRes.data || [];
      const emails = emailsRes.data || [];

      const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
      const openedEmails = emails.filter((e) => e.status === 'opened').length;
      const openRate = emails.length > 0 ? (openedEmails / emails.length) * 100 : 0;

      setStats({
        totalCampaigns: campaigns.length,
        activeCampaigns,
        emailsSent: emails.length,
        totalLeads: leads.length,
        openRate: Math.round(openRate),
      });

      const statusCounts = leads.reduce((acc: any, lead: any) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      setLeadStatusData([
        { name: 'New', value: statusCounts.new || 0, color: '#3B82F6' },
        { name: 'Contacted', value: statusCounts.contacted || 0, color: '#FACC15' },
        { name: 'Interested', value: statusCounts.interested || 0, color: '#10B981' },
        { name: 'Not Interested', value: statusCounts.not_interested || 0, color: '#EF4444' },
      ]);

      const emailsByDay = emails.reduce((acc: any, email: any) => {
        const date = new Date(email.sent_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const trendData = Object.entries(emailsByDay)
        .map(([date, count]) => ({ date, emails: count }))
        .slice(-7);

      setEmailTrendData(trendData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changePlan = async (newPlan: 'free' | 'pro' | 'enterprise') => {
    if (!organization) return;
    if (organization.subscription_plan === newPlan) {
      toast.info('You are already on this plan');
      return;
    }
    setUpdatingPlan(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_plan: newPlan })
        .eq('org_id', organization.org_id);
      if (error) throw error;
      setOrganization({ ...organization, subscription_plan: newPlan });
      toast.success('Plan updated');
    } catch (e: any) {
      console.error('Error updating plan', e);
      toast.error(e.message || 'Failed to update plan');
    } finally {
      setUpdatingPlan(false);
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

  if (!organization?.verified) {
    return (
      <Layout userRole="ORG">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-amber-900 mb-2">
                  Account Pending Verification
                </h2>
                <p className="text-amber-800">
                  Your organization account is currently under review. An administrator will verify
                  your account shortly. Once verified, you'll have full access to all CRM features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="ORG">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {organization.org_name}</p>
        </div>

        {/* Plan selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Current Plan</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{organization.subscription_plan}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">Change plan:</label>
              <select
                className="px-3 py-2 border rounded-lg"
                value={organization.subscription_plan}
                onChange={(e) => changePlan(e.target.value as 'free' | 'pro' | 'enterprise')}
                disabled={updatingPlan}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCampaigns}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeCampaigns}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.emailsSent}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.openRate}%</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Lead Status Distribution</h3>
            {leadStatusData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(d: any) => `${d.name}: ${(d.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No lead data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Emails Sent (Last 7 Days)</h3>
            {emailTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={emailTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="emails" stroke="#2563EB" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No email data available
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
