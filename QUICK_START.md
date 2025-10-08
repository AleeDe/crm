# Quick Start Guide - Email CRM

## Step-by-Step Setup

### Step 1: First Time - Create Admin Account

1. Open the application in your browser
2. You'll be automatically redirected to the **Admin Setup** page
3. Fill in admin details:
   - Name: Your admin name
   - Email: admin@yourcompany.com
   - Password: Choose a secure password (min 6 chars)
4. Click "Create Admin"
5. Save your admin credentials!
6. Click "Go to Login"

**Result:** Admin account created ✅

---

### Step 2: Admin Login

1. On the login page, enter your admin credentials
2. Click "Sign In"
3. You'll be redirected to the **Admin Dashboard** (`/admin`)

**You can now:**
- View system statistics
- Monitor all organizations
- Verify organization accounts

---

### Step 3: Organization Registration

**For New Organizations:**

1. On the login page, click **"Sign up as Organization"**
2. Fill in the registration form:
   - **Your Details:** Name, Email, Password
   - **Organization Details:**
     - Organization Name
     - Company Email
     - Phone (optional)
     - Industry (optional)
3. Click "Create Account"
4. You'll see: "Account Pending Verification" message

**Status:** Organization created but NOT verified ⏳

---

### Step 4: Admin Verifies Organization

**Admin Must Do This:**

1. Login as admin
2. Go to Admin Dashboard
3. Scroll to "Organizations" table
4. Find the pending organization (orange "Pending" badge)
5. Click the **"Verify"** button

**Result:** Organization is now verified ✅

---

### Step 5: Organization Gets Full Access

**Organization User:**

1. Refresh your dashboard
2. You now see:
   - Full analytics with charts
   - Statistics cards
   - All menu items active
3. You can now:
   - Create campaigns (`/org/campaigns`)
   - Add leads (`/org/leads`)
   - Create email templates (`/org/templates`)
   - Add team members/agents (`/org/agents`)

---

### Step 6: Add Employees/Agents

**Organization Admin:**

1. Navigate to **Agents** page (`/org/agents`)
2. Click **"Add Agent"**
3. Fill in agent details:
   - Name
   - Email
   - Password
   - Designation (e.g., "Sales Agent")
4. Click "Create Agent"
5. Give the credentials to your team member

**Result:** Employee account created ✅

---

### Step 7: Employee Login

**Employee/Agent:**

1. Go to login page
2. Enter credentials provided by organization
3. Click "Sign In"
4. Redirected to **Employee Dashboard** (`/employee`)

**You can:**
- View assigned campaigns
- See your statistics
- Access campaign leads
- Send emails (when assigned)

---

## Visual Flow

```
┌─────────────────────────────────────────────────────┐
│  FIRST TIME: No Admin Exists                        │
└─────────────────────────────────────────────────────┘
                        ↓
         ┌──────────────────────────┐
         │   /admin-setup page      │
         │   Create Admin Account   │
         └──────────────────────────┘
                        ↓
         ┌──────────────────────────┐
         │   Admin Created ✅       │
         └──────────────────────────┘


┌─────────────────────────────────────────────────────┐
│  ORGANIZATION FLOW                                   │
└─────────────────────────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  1. Sign Up (/signup)             │
    │     - Fill organization details   │
    └───────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  2. Account Created               │
    │     - Status: UNVERIFIED ⏳       │
    │     - Limited Access              │
    └───────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  3. Admin Verifies                │
    │     - Admin clicks "Verify"       │
    └───────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  4. Full Access ✅                │
    │     - Create campaigns            │
    │     - Add leads                   │
    │     - Create templates            │
    │     - Add agents                  │
    └───────────────────────────────────┘


┌─────────────────────────────────────────────────────┐
│  EMPLOYEE/AGENT FLOW                                 │
└─────────────────────────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  1. Org creates employee account  │
    │     - Via /org/agents             │
    └───────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  2. Employee logs in              │
    │     - Uses provided credentials   │
    └───────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────┐
    │  3. Employee Dashboard            │
    │     - View assigned campaigns     │
    │     - Access leads                │
    │     - Send emails                 │
    └───────────────────────────────────┘
```

---

## Important Notes

### Admin Account
- **Only ONE admin needed** for the entire system
- Admin can verify unlimited organizations
- Admin sees all data across all organizations
- Keep admin credentials secure!

### Organization Verification
- **Required before full access**
- Organization can login but sees "Pending" message
- Admin must manually verify each organization
- Once verified, organization gets full features

### Employee Creation
- **Only verified organizations** can create employees
- Employees are linked to one organization
- Employees can only see their organization's data
- Organizations can create unlimited employees

---

## Default Credentials (For Testing)

After setup, you might want to test with these roles:

### Admin
```
Email: admin@crm.local
Password: admin123456
Access: /admin
```

### Organization (Example)
```
Email: org@company.com
Password: org123456
Access: /org (after verification)
```

### Employee (Example)
```
Email: agent@company.com
Password: agent123456
Access: /employee
```

**Note:** You must create these accounts manually through the UI.

---

## Common Questions

**Q: Can I have multiple admins?**
A: Yes, create additional users and manually set their role to 'ADMIN' in the database.

**Q: What if I forget admin password?**
A: Reset through Supabase Dashboard → Authentication → Find user → Reset password

**Q: Can organization create multiple agents?**
A: Yes, unlimited agents can be created by verified organizations.

**Q: Can employee access other organization's data?**
A: No, Row Level Security prevents cross-organization data access.

**Q: What happens if admin doesn't verify organization?**
A: Organization can login but sees "Pending Verification" and cannot use features.

---

## Next Steps

After setup:

1. **Create Campaigns** - Define your email outreach campaigns
2. **Add Leads** - Import or manually add contact leads
3. **Create Templates** - Design reusable email templates
4. **Assign Campaigns** - Assign campaigns to your agents
5. **Send Emails** - Agents send emails to leads
6. **Track Performance** - Monitor open rates and engagement

---

## Support Files

- `ADMIN_SETUP_GUIDE.md` - Detailed admin and flow explanation
- `SETUP.md` - Technical setup and configuration
- Supabase Dashboard - View database and auth users

---

**You're all set! Start managing your email campaigns efficiently.** 🚀
