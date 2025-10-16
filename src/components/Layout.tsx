import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Mail,
  Users,
  FileText,
  UserPlus,
  Settings,
  LogOut,
  Menu,
  X,
  Building,
  Send,
  Plug
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  userRole: 'ADMIN' | 'ORG' | 'EMPLOYEE';
}

export function Layout({ children, userRole }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNavItems = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/organizations', icon: Building, label: 'Organizations' },
          { path: '/admin/campaigns', icon: Mail, label: 'Campaigns' },
          { path: '/admin/agents', icon: UserPlus, label: 'All Agents' },
          { path: '/admin/users', icon: Users, label: 'All Users' },
        ];
      case 'ORG':
        return [
          { path: '/org', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/org/campaigns', icon: Mail, label: 'Campaigns' },
          { path: '/org/leads', icon: Users, label: 'Leads' },
          { path: '/org/templates', icon: FileText, label: 'Templates' },
          { path: '/org/agents', icon: UserPlus, label: 'Agents' },
          { path: '/org/send', icon: Send, label: 'Bulk Send' },
          { path: '/org/email', icon: Plug, label: 'Connect Email' },
          { path: '/org/emails', icon: Send, label: 'Email Logs' },
        ];
      case 'EMPLOYEE':
        return [
          { path: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/employee/campaigns', icon: Mail, label: 'My Campaigns' },
          { path: '/employee/emails', icon: Send, label: 'Email Logs' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h1 className="text-2xl font-bold text-blue-600">Email CRM</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-2">
            <Link
              to={`/${userRole.toLowerCase()}/settings`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none"></div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
