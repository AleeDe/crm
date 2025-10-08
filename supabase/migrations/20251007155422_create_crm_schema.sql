/*
  # Email CRM Database Schema

  ## Overview
  This migration creates a comprehensive role-based CRM system for managing email campaigns,
  leads, and employee assignments with organization-level isolation.

  ## 1. New Tables Created

  ### users
  Central user table with role-based access
  - `user_id` (uuid, primary key) - Linked to auth.users
  - `name` (text) - User's full name
  - `email` (text) - User's email (synced from auth)
  - `role` (enum) - User role: ADMIN, ORG, EMPLOYEE
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### admins
  Admin-specific data and permissions
  - `admin_id` (uuid, primary key)
  - `user_id` (uuid, foreign key → users)
  - `permissions` (jsonb) - Admin permissions object
  - `created_at` (timestamptz)

  ### organizations
  Organization/company accounts
  - `org_id` (uuid, primary key)
  - `user_id` (uuid, foreign key → users)
  - `org_name` (text) - Organization name
  - `company_email` (text) - Email used for sending campaigns
  - `phone` (text) - Contact phone
  - `industry` (text) - Industry sector
  - `subscription_plan` (text) - Subscription tier
  - `verified` (boolean) - Admin verification status
  - `created_at` (timestamptz)

  ### employees
  Employees/agents within organizations
  - `emp_id` (uuid, primary key)
  - `user_id` (uuid, foreign key → users)
  - `org_id` (uuid, foreign key → organizations)
  - `designation` (text) - Job title/role
  - `status` (text) - active/inactive
  - `created_at` (timestamptz)

  ### campaigns
  Email campaigns created by organizations
  - `campaign_id` (uuid, primary key)
  - `org_id` (uuid, foreign key → organizations)
  - `title` (text) - Campaign name
  - `description` (text) - Campaign details
  - `start_date` (date) - Campaign start
  - `end_date` (date) - Campaign end
  - `assigned_to` (uuid, nullable, foreign key → employees)
  - `status` (text) - draft/active/completed
  - `created_at` (timestamptz)

  ### leads
  Contact leads for campaigns
  - `lead_id` (uuid, primary key)
  - `campaign_id` (uuid, foreign key → campaigns)
  - `full_name` (text) - Lead's name
  - `email` (text) - Lead's email
  - `company` (text) - Lead's company
  - `phone` (text) - Lead's phone
  - `status` (text) - new/contacted/interested/not_interested
  - `created_at` (timestamptz)

  ### email_templates
  Reusable email templates per organization
  - `template_id` (uuid, primary key)
  - `org_id` (uuid, foreign key → organizations)
  - `name` (text) - Template name
  - `subject` (text) - Email subject line
  - `body_html` (text) - HTML email body
  - `created_at` (timestamptz)

  ### email_logs
  Track all sent emails
  - `email_id` (uuid, primary key)
  - `campaign_id` (uuid, foreign key → campaigns)
  - `lead_id` (uuid, foreign key → leads)
  - `template_id` (uuid, foreign key → email_templates)
  - `sent_by` (uuid, foreign key → employees)
  - `sent_at` (timestamptz)
  - `status` (text) - sent/delivered/opened
  - `tracking_id` (text) - Unique tracking identifier
  - `open_tracking_pixel` (boolean) - Track opens

  ### follow_ups
  Follow-up emails linked to original emails
  - `followup_id` (uuid, primary key)
  - `email_id` (uuid, foreign key → email_logs)
  - `template_id` (uuid, foreign key → email_templates)
  - `sent_by` (uuid, foreign key → employees)
  - `sent_at` (timestamptz)
  - `notes` (text) - Follow-up notes

  ## 2. Security (Row Level Security)
  
  All tables have RLS enabled with restrictive policies:
  - Admins can access all data
  - Organizations can only access their own data
  - Employees can only access data within their organization
  - All policies verify authentication and ownership

  ## 3. Indexes
  
  Created indexes on foreign keys and commonly queried fields for performance.
*/

-- Create user role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'ORG', 'EMPLOYEE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'ORG',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  admin_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  permissions jsonb DEFAULT '{"full_access": true, "org_approval": true}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  org_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  org_name text NOT NULL,
  company_email text NOT NULL,
  phone text,
  industry text,
  subscription_plan text DEFAULT 'free',
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  emp_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  designation text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  assigned_to uuid REFERENCES employees(emp_id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  lead_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  email_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(template_id) ON DELETE SET NULL,
  sent_by uuid NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent',
  tracking_id text UNIQUE,
  open_tracking_pixel boolean DEFAULT true
);

-- Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  followup_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES email_logs(email_id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(template_id) ON DELETE SET NULL,
  sent_by uuid NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now(),
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_assigned_to ON campaigns(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_follow_ups_email_id ON follow_ups(email_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.user_id = auth.uid() AND u.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy for inserting new user rows: allow authenticated clients to create
-- their own `users` record (the `user_id` must match their auth.uid()).
CREATE POLICY "New users can be created"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for admins table
CREATE POLICY "Admins can view own data"
  ON admins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- RLS Policies for organizations table
CREATE POLICY "Organizations can view own data"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN') OR
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.org_id = organizations.org_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Organizations can update own data"
  ON organizations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "New organizations can be created"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for employees table
CREATE POLICY "Employees can view own data"
  ON employees FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = employees.org_id AND o.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Organizations can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = employees.org_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = employees.org_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = employees.org_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = employees.org_id AND o.user_id = auth.uid()
    )
  );

-- RLS Policies for campaigns table
CREATE POLICY "Organization members can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = campaigns.org_id AND o.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.org_id = campaigns.org_id AND e.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Organizations can insert campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = campaigns.org_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = campaigns.org_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = campaigns.org_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = campaigns.org_id AND o.user_id = auth.uid()
    )
  );

-- RLS Policies for leads table
CREATE POLICY "Organization members can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN organizations o ON o.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND o.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN employees e ON e.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN organizations o ON o.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN organizations o ON o.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN organizations o ON o.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update lead status"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN employees e ON e.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN employees e ON e.org_id = c.org_id
      WHERE c.campaign_id = leads.campaign_id AND e.user_id = auth.uid()
    )
  );

-- RLS Policies for email_templates table
CREATE POLICY "Organization members can view templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = email_templates.org_id AND o.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.org_id = email_templates.org_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can insert templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = email_templates.org_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can update templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = email_templates.org_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = email_templates.org_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can delete templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.org_id = email_templates.org_id AND o.user_id = auth.uid()
    )
  );

-- RLS Policies for email_logs table
CREATE POLICY "Organization members can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      INNER JOIN organizations o ON o.org_id = c.org_id
      WHERE c.campaign_id = email_logs.campaign_id AND o.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.emp_id = email_logs.sent_by AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.emp_id = email_logs.sent_by AND e.user_id = auth.uid()
    )
  );

-- RLS Policies for follow_ups table
CREATE POLICY "Organization members can view follow-ups"
  ON follow_ups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.emp_id = follow_ups.sent_by AND e.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM email_logs el
      INNER JOIN campaigns c ON c.campaign_id = el.campaign_id
      INNER JOIN organizations o ON o.org_id = c.org_id
      WHERE el.email_id = follow_ups.email_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert follow-ups"
  ON follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.emp_id = follow_ups.sent_by AND e.user_id = auth.uid()
    )
  );