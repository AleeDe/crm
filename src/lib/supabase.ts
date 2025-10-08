import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'ADMIN' | 'ORG' | 'EMPLOYEE';

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  org_id: string;
  user_id: string;
  org_name: string;
  company_email: string;
  phone?: string;
  industry?: string;
  subscription_plan: string;
  verified: boolean;
  created_at: string;
}

export interface Employee {
  emp_id: string;
  user_id: string;
  org_id: string;
  designation?: string;
  status: string;
  created_at: string;
}

export interface Campaign {
  campaign_id: string;
  org_id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  assigned_to?: string;
  status: string;
  created_at: string;
}

export interface Lead {
  lead_id: string;
  campaign_id: string;
  full_name: string;
  email: string;
  company?: string;
  phone?: string;
  status: string;
  created_at: string;
}

export interface EmailTemplate {
  template_id: string;
  org_id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
}

export interface EmailLog {
  email_id: string;
  campaign_id: string;
  lead_id: string;
  template_id?: string;
  sent_by: string;
  sent_at: string;
  status: string;
  tracking_id?: string;
  open_tracking_pixel: boolean;
}

export interface FollowUp {
  followup_id: string;
  email_id: string;
  template_id?: string;
  sent_by: string;
  sent_at: string;
  notes?: string;
}
