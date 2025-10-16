import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
  });
  const insertAtCursor = (value: string) => setFormData((f) => ({ ...f, body_html: f.body_html + value }));
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);

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
        .from('email_templates')
        .select('*')
        .eq('org_id', orgData.org_id);

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('email_templates').insert({
        org_id: orgId,
        name: formData.name,
        subject: formData.subject,
        body_html: formData.body_html,
      });

      if (error) throw error;

      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('template_id', templateId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', subject: '', body_html: '' });
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
            <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-gray-600 mt-2">Create reusable email templates</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.template_id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                </div>
                <button
                  onClick={() => handleDelete(template.template_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div
                className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg max-h-32 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: template.body_html.substring(0, 200) + '...' }}
              />
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No templates yet. Create your first template to get started.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">New Template</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body (HTML)
                </label>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-600">Merge tags:</span>
                  {['{{first_name}}','{{full_name}}','{{email}}','{{company}}','{{phone}}'].map(tag => (
                    <button type="button" key={tag} onClick={() => insertAtCursor(tag)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">{tag}</button>
                  ))}
                  <span className="ml-2 text-gray-400">Tracking pixel and link redirects are added automatically on send.</span>
                </div>
                <textarea
                  value={formData.body_html}
                  onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  required
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Create Template
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
