# Email CRM - Role-Based Campaign Management System

A complete SaaS-style Email CRM built with React, TypeScript, Supabase, and TailwindCSS. Features role-based access control, campaign management, lead tracking, and analytics.

## Features

### Core Functionality
- **Role-Based Access Control** - Admin, Organization, and Employee roles
- **Organization Verification System** - Admin approval workflow
- **Campaign Management** - Create, assign, and track email campaigns
- **Lead Management** - Add and manage contact leads
- **Email Templates** - Reusable HTML email templates
- **Team Management** - Create and manage employee/agent accounts
- **Analytics Dashboard** - Charts and statistics for performance tracking
- **Row Level Security** - Database-level data isolation

### User Roles

#### Admin
- Verify/revoke organizations
- System-wide monitoring
- View all users and campaigns
- Full access to all data

#### Organization (Verified)
- Create and manage campaigns
- Add leads to campaigns
- Create email templates
- Add employee accounts
- View organization analytics
- Assign campaigns to employees

#### Employee/Agent
- View assigned campaigns
- Access campaign leads
- View personal statistics
- Send emails to leads

## Quick Start

### 1. First Launch - Create Admin

When you first open the app:
1. You'll be redirected to `/admin-setup`
2. Create your admin account
3. Save the credentials

### 2. Organization Registration

1. Click "Sign up as Organization"
2. Fill in organization details
3. Wait for admin verification

### 3. Admin Verifies Organization

1. Admin logs in to `/admin`
2. Views pending organizations
3. Clicks "Verify" button

### 4. Organization Gets Access

After verification, organizations can:
- Create campaigns
- Add leads
- Create templates
- Add team members

## Documentation

- **`QUICK_START.md`** - Step-by-step setup guide
- **`ADMIN_SETUP_GUIDE.md`** - Detailed admin and user flow
- **`SETUP.md`** - Technical setup and configuration

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Charts:** Recharts
- **Icons:** Lucide React
- **Build Tool:** Vite

## Project Structure

```
src/
├── components/          # Shared components
│   ├── Layout.tsx      # Main layout with sidebar
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/               # Utilities
│   └── supabase.ts    # Supabase client
├── pages/             # Page components
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── AdminSetup.tsx
│   ├── admin/         # Admin pages
│   │   └── AdminDashboard.tsx
│   ├── org/           # Organization pages
│   │   ├── OrgDashboard.tsx
│   │   ├── Campaigns.tsx
│   │   ├── Leads.tsx
│   │   ├── Templates.tsx
│   │   └── Agents.tsx
│   └── employee/      # Employee pages
│       └── EmployeeDashboard.tsx
└── App.tsx            # Main app with routing

supabase/
└── migrations/        # Database migrations
    ├── 20251007155422_create_crm_schema.sql
    └── add_admin_helper_functions.sql
```

## Database Schema

### Tables
- `users` - Central user table with role
- `admins` - Admin-specific data
- `organizations` - Company accounts
- `employees` - Agents within organizations
- `campaigns` - Email campaigns
- `leads` - Contact leads
- `email_templates` - Reusable templates
- `email_logs` - Sent email tracking
- `follow_ups` - Follow-up emails

### Security
All tables have Row Level Security (RLS) enabled:
- Organizations can only access their own data
- Employees can only access their organization's data
- Admins have full access
- Strict ownership verification on all operations

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## User Flow Diagram

```
┌─────────────┐
│ First Visit │ → No Admin Exists → Create Admin (/admin-setup)
└─────────────┘

┌──────────────┐
│ Organization │ → Sign Up → Pending → Admin Verifies → Full Access
└──────────────┘

┌──────────┐
│ Employee │ → Created by Org → Login → View Assigned Campaigns
└──────────┘
```

## Key Features Explained

### Admin Verification Workflow
1. Organization registers through `/signup`
2. Account created with `verified: false`
3. Organization sees "Pending Verification" message
4. Admin verifies from admin dashboard
5. Organization gets full feature access

### Role-Based Navigation
- Automatic route protection
- Role detection on login
- Redirect to appropriate dashboard
- Sidebar navigation based on role

### Data Isolation
- PostgreSQL Row Level Security
- Organization-level data separation
- Employee access limited to their org
- No cross-organization data access

## Design System

- **Primary Color:** Blue (#2563EB)
- **Secondary Color:** Green (#10B981)
- **Accent Color:** Amber (#FACC15)
- **Layout:** Sidebar navigation
- **Components:** Rounded corners, subtle shadows
- **Responsive:** Mobile-first design

## Roadmap / Future Enhancements

- [ ] Email sending integration (SendGrid, AWS SES)
- [ ] CSV lead import
- [ ] Email open/click tracking
- [ ] Follow-up automation
- [ ] Advanced analytics
- [ ] Real-time notifications
- [ ] Search and filters
- [ ] Export functionality (CSV, PDF)

## Support

For issues or questions:
- Check documentation files in project root
- Review Supabase Dashboard for data/auth issues
- Verify RLS policies are active
- Check browser console for errors

## License

This project is available for use under standard terms.

## Credits

Built with modern web technologies:
- [React](https://react.dev)
- [Supabase](https://supabase.com)
- [TailwindCSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Lucide Icons](https://lucide.dev)

---

**Ready to manage your email campaigns efficiently!** 🚀
