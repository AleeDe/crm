# Email CRM Setup Guide

## Quick Start

This is a complete role-based Email CRM built with React, Supabase, and TailwindCSS.

### 1. Database Setup

The database schema has been automatically created with all necessary tables and Row Level Security (RLS) policies.

### 2. Create Admin Account (Manual Setup Required)

Since this is the first setup, you'll need to manually create an admin account through SQL:

1. Go to your Supabase Dashboard > SQL Editor
2. Run this query (replace with your admin credentials):

```sql
-- Create admin auth user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- First, sign up through Supabase Auth UI or use supabase.auth.signUp()
  -- Then get the user_id and run:

  -- Replace 'YOUR_USER_ID_HERE' with the actual user_id from auth.users
  admin_user_id := 'YOUR_USER_ID_HERE';

  -- Insert into users table
  INSERT INTO users (user_id, name, email, role)
  VALUES (admin_user_id, 'Admin User', 'admin@example.com', 'ADMIN')
  ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';

  -- Insert into admins table
  INSERT INTO admins (user_id, permissions)
  VALUES (admin_user_id, '{"full_access": true, "org_approval": true}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
END $$;
```

### 3. User Flow

#### Organization Signup
1. Navigate to `/signup`
2. Fill in organization details
3. Wait for admin verification
4. Once verified, access full CRM features

#### Admin Login
1. Navigate to `/login`
2. Sign in with admin credentials
3. Access admin dashboard at `/admin`
4. Verify pending organizations

#### Employee/Agent Access
- Employees are created by organizations
- They receive login credentials
- Access their dashboard at `/employee`

## Features Implemented

### Admin Dashboard (`/admin`)
- View all organizations
- Verify/revoke organization accounts
- System-wide statistics
- User management

### Organization Dashboard (`/org`)
- Analytics with charts (lead distribution, email trends)
- Campaign overview
- Email statistics
- Organization verification status check

### Campaign Management (`/org/campaigns`)
- Create, edit, delete campaigns
- Assign campaigns to agents
- Set campaign dates and status
- View campaign list

### Lead Management (`/org/leads`)
- Add leads manually
- Assign leads to campaigns
- Track lead status (new, contacted, interested, not_interested)
- View leads by campaign

### Email Templates (`/org/templates`)
- Create reusable HTML email templates
- Manage template library
- Use templates for campaigns

### Agent Management (`/org/agents`)
- Create employee/agent accounts
- Assign designations
- Manage agent status

### Employee Dashboard (`/employee`)
- View assigned campaigns
- See email statistics
- Track personal performance
- Access campaign leads

## Database Schema

### Tables Created:
- `users` - Central user table with role-based access
- `admins` - Admin-specific data
- `organizations` - Company accounts
- `employees` - Agents within organizations
- `campaigns` - Email campaigns
- `leads` - Contact leads
- `email_templates` - Reusable templates
- `email_logs` - Sent email tracking
- `follow_ups` - Follow-up emails

### Security (RLS Policies)
- All tables have Row Level Security enabled
- Admins can access all data
- Organizations can only access their own data
- Employees can only access their organization's data
- Strict ownership verification on all operations

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Icons**: Lucide React

## Design System

- **Primary Color**: Blue (#2563EB)
- **Secondary Color**: Green (#10B981)
- **Accent Color**: Amber (#FACC15)
- **Font**: System fonts (clean and modern)
- **Layout**: Sidebar navigation with responsive design
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Filled with hover states

## Environment Variables Required

Your `.env` file should contain:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Next Steps for Enhancement

1. **Email Sending**: Integrate with email service (SendGrid, AWS SES)
2. **CSV Import**: Add bulk lead import functionality
3. **Email Tracking**: Implement open/click tracking pixels
4. **Follow-ups**: Build follow-up email workflow
5. **Analytics**: Add more detailed reporting
6. **Notifications**: Real-time updates for agents
7. **Search & Filters**: Advanced filtering for leads and campaigns
8. **Export**: Export data as CSV/PDF

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Support

For issues or questions, refer to:
- Supabase Documentation: https://supabase.com/docs
- React Documentation: https://react.dev
- TailwindCSS: https://tailwindcss.com
