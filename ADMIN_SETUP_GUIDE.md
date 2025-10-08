# Admin Setup & User Flow Guide

## Complete Flow Explanation

### 1. First Time Setup - Creating Admin

When you first launch the Email CRM application, **no users exist**. Here's what happens:

#### Automatic Admin Detection
1. Navigate to `/login`
2. The system automatically checks if any admin exists
3. If **NO admin exists**, you are redirected to `/admin-setup`
4. If an admin exists, you see the normal login page

#### Creating Your First Admin
On the Admin Setup page (`/admin-setup`):

1. Click **"Create Admin Account"**
2. Fill in the admin details:
   - Full Name (e.g., "John Admin")
   - Email Address (e.g., "admin@company.com")
   - Password (minimum 6 characters)
3. Click **"Create Admin"**
4. You'll see a success message with your credentials
5. Click **"Go to Login"**

**Important:** Save these credentials! This is your master admin account.

---

### 2. Admin Login

Once an admin account exists:

1. Go to `/login`
2. Enter admin credentials
3. Upon successful login, you're redirected to `/admin` dashboard

#### What Admins Can Do:
- View all organizations (verified and pending)
- **Verify or revoke organization accounts**
- See system-wide statistics:
  - Total Organizations
  - Verified Organizations
  - Total Users
  - Total Campaigns
- Monitor all activity across the platform

---

### 3. Organization Registration Flow

#### Step 1: Organization Signs Up
1. A new organization visits the app
2. On login page, they click **"Sign up as Organization"**
3. They fill in the registration form:
   - Personal details (Name, Email, Password)
   - Organization details (Org Name, Company Email, Phone, Industry)
4. They see a notice: _"Your account will need to be verified by an administrator"_
5. After signup, they're redirected to their organization dashboard

#### Step 2: Verification Required
When the organization logs in to their dashboard (`/org`), they see:

**"Account Pending Verification"**
> Your organization account is currently under review. An administrator will verify your account shortly. Once verified, you'll have full access to all CRM features.

At this stage, the organization **CANNOT**:
- Create campaigns
- Add leads
- Create templates
- Add agents

#### Step 3: Admin Verifies Organization
1. Admin logs in to `/admin` dashboard
2. Views the "Organizations" table
3. Sees organizations with status:
   - **Verified** (green check) - Active organizations
   - **Pending** (amber circle) - Waiting for verification
4. Admin clicks **"Verify"** button for pending organizations
5. Organization status changes to "Verified"

#### Step 4: Organization Gets Full Access
After verification:
1. Organization refreshes their dashboard
2. They now see:
   - Full analytics dashboard with charts
   - All navigation menu items are accessible
   - Can create campaigns, leads, templates, and agents

---

### 4. Employee/Agent Creation Flow

Once an organization is verified, they can create employees (agents):

#### Organization Creates Employee
1. Navigate to `/org/agents`
2. Click **"Add Agent"**
3. Fill in agent details:
   - Name
   - Email
   - Password
   - Designation (optional)
4. Click **"Create Agent"**

The system automatically:
- Creates an auth account for the employee
- Assigns them the `EMPLOYEE` role
- Links them to the organization

#### Employee Login
1. Employee goes to `/login`
2. Enters credentials provided by organization
3. Upon login, redirected to `/employee` dashboard
4. Can view:
   - Assigned campaigns
   - Email statistics
   - Campaign leads
   - Send emails (when feature is enabled)

---

## User Roles & Permissions Summary

### ADMIN
- **Access:** Full system access
- **Dashboard:** `/admin`
- **Capabilities:**
  - Verify/revoke organizations
  - View all users
  - Monitor system-wide statistics
  - Access all data

### ORG (Organization)
- **Access:** Organization-level access
- **Dashboard:** `/org`
- **Capabilities (after verification):**
  - Create and manage campaigns
  - Add and manage leads
  - Create email templates
  - Create employee/agent accounts
  - View organization analytics
  - Assign campaigns to employees

### EMPLOYEE (Agent)
- **Access:** Limited to assigned data
- **Dashboard:** `/employee`
- **Capabilities:**
  - View assigned campaigns
  - Access campaign leads
  - View personal statistics
  - Send emails (when enabled)
  - Update lead status

---

## Quick Reference: Who Can Do What

| Action | Admin | Organization (Verified) | Organization (Unverified) | Employee |
|--------|-------|------------------------|---------------------------|----------|
| Verify Organizations | ✅ | ❌ | ❌ | ❌ |
| Create Campaigns | ❌ | ✅ | ❌ | ❌ |
| Create Leads | ❌ | ✅ | ❌ | ❌ |
| Create Templates | ❌ | ✅ | ❌ | ❌ |
| Create Employees | ❌ | ✅ | ❌ | ❌ |
| View All Orgs | ✅ | ❌ | ❌ | ❌ |
| Send Emails | ❌ | ✅ | ❌ | ✅ |
| View Own Dashboard | ✅ | ✅ | ✅* | ✅ |

*Unverified organizations see a "Pending Verification" message

---

## Database Security (RLS Policies)

All data is protected by Row Level Security:

1. **Admins** can access all data
2. **Organizations** can ONLY access their own:
   - Campaigns
   - Leads
   - Templates
   - Employees
   - Email logs
3. **Employees** can ONLY access:
   - Their organization's data
   - Campaigns assigned to them
   - Leads in their campaigns
   - Templates from their organization

No user can access another organization's data - this is enforced at the database level.

---

## Testing the Flow

### Recommended Test Sequence:

1. **First Launch:**
   ```
   Navigate to app → Auto-redirected to /admin-setup
   Create admin: admin@test.com / password123
   ```

2. **Admin Login:**
   ```
   Login with admin credentials → Redirected to /admin
   See empty dashboard (no organizations yet)
   ```

3. **Create Organization:**
   ```
   Open new browser/incognito window
   Click "Sign up as Organization"
   Fill form: org@test.com / password123
   Organization Name: "Test Company"
   ```

4. **Check Verification Status:**
   ```
   After signup → See "Account Pending Verification" message
   Cannot access features
   ```

5. **Admin Verifies:**
   ```
   Switch to admin window
   Refresh admin dashboard
   See "Test Company" in pending list
   Click "Verify" button
   ```

6. **Organization Gains Access:**
   ```
   Switch back to organization window
   Refresh page
   Now see full dashboard with charts
   All menu items accessible
   ```

7. **Create Employee:**
   ```
   Navigate to /org/agents
   Click "Add Agent"
   Create: agent@test.com / password123
   ```

8. **Employee Login:**
   ```
   Open new browser/incognito window
   Login with agent credentials
   Redirected to /employee dashboard
   See "No campaigns assigned" message
   ```

9. **Assign Campaign:**
   ```
   Switch back to organization window
   Go to /org/campaigns
   Create campaign
   Assign to employee
   ```

10. **Employee Views Assignment:**
    ```
    Switch to employee window
    Refresh page
    See assigned campaign
    ```

---

## Troubleshooting

### "I can't create an admin"
- Make sure you're on the `/admin-setup` page
- Check browser console for errors
- Verify Supabase connection in `.env` file

### "Organization can't see features after verification"
- Refresh the page after admin verifies
- Clear browser cache
- Check if verification status changed in admin dashboard

### "Employee can't see assigned campaigns"
- Ensure campaign is properly assigned to employee in organization dashboard
- Refresh employee dashboard
- Check that organization is verified

### "Admin dashboard shows wrong data"
- Admins see ALL data across all organizations
- This is correct behavior for system monitoring

---

## Need More Help?

Check these files:
- `SETUP.md` - Technical setup and configuration
- `supabase/migrations/` - Database schema details
- Supabase Dashboard - View actual data and auth users
