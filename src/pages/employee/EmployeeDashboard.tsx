import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Send, Users, TrendingUp } from 'lucide-react';

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assignedCampaigns: 0,
    emailsSent: 0,
    totalLeads: 0,
    openRate: 0,
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('emp_id, org_id')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (!empData) return;

      const [campaignsRes, emailsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*, leads(count)')
          .eq('assigned_to', empData.emp_id),
        supabase.from('email_logs').select('*').eq('sent_by', empData.emp_id),
      ]);

      const campaigns = campaignsRes.data || [];
      const emails = emailsRes.data || [];

      const openedEmails = emails.filter((e) => e.status === 'opened').length;
      const openRate = emails.length > 0 ? (openedEmails / emails.length) * 100 : 0;

      const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads?.[0]?.count || 0), 0);

      setStats({
        assignedCampaigns: campaigns.length,
        emailsSent: emails.length,
        totalLeads,
        openRate: Math.round(openRate),
      });

      setCampaigns(campaigns);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout userRole="EMPLOYEE">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="EMPLOYEE">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.assignedCampaigns}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.emailsSent}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLeads}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
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
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My Campaigns</h2>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                No campaigns assigned yet. Contact your organization admin for assignments.
              </p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.campaign_id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{campaign.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          campaign.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : campaign.status === 'completed'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
