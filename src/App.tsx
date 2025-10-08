import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { AdminSetup } from './pages/AdminSetup';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrganizations } from './pages/admin/AdminOrganizations';
import { AdminUsers } from './pages/admin/AdminUsers';
import UserSettings from './pages/UserSettings';
import { AdminAgents } from './pages/admin/AdminAgents';
import { AdminCampaigns } from './pages/admin/AdminCampaigns';
import { OrgDashboard } from './pages/org/OrgDashboard';
import { Campaigns } from './pages/org/Campaigns';
import { Leads } from './pages/org/Leads';
import { Templates } from './pages/org/Templates';
import { Agents } from './pages/org/Agents';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getRoleHome(user.role)} replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={getRoleHome(user.role)} replace /> : <Signup />} />
      <Route path="/admin-setup" element={<AdminSetup />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/organizations"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminOrganizations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/agents"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminAgents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/campaigns"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminCampaigns />
          </ProtectedRoute>
        }
      />

      <Route
        path="/org"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <OrgDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/org/campaigns"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <Campaigns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/org/leads"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <Leads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/org/templates"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <Templates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/org/agents"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <Agents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/org/emails"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <div className="p-6">Email Logs (Coming Soon)</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/campaigns"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <div className="p-6">My Campaigns (Coming Soon)</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/emails"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <div className="p-6">Email Logs (Coming Soon)</div>
          </ProtectedRoute>
        }
      />

      {/* Settings for all roles */}
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/org/settings"
        element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <UserSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/settings"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <UserSettings />
          </ProtectedRoute>
        }
      />

      <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-3xl font-bold text-gray-900">Unauthorized</h1><p className="text-gray-600 mt-2">You do not have permission to access this page.</p></div></div>} />

      <Route path="/" element={<Navigate to={user ? getRoleHome(user.role) : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function getRoleHome(role: string) {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'ORG':
      return '/org';
    case 'EMPLOYEE':
      return '/employee';
    default:
      return '/login';
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
