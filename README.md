# RAVIN ACADEMY — Production Setup Guide

## MAKE UR WORLD TO BE PROUD

---

## Overview

This guide walks you through setting up the complete RAVIN ACADEMY platform with real Supabase backend.

### Files Created

| File | Purpose |
|------|---------|
| `supabase_migration.sql` | Main database schema — tables, RLS, triggers, seed data |
| `supabase_migration_supplement.sql` | Views, functions, auto-task generation, indexes |
| `ravin_academy_complete.jsx` | Production React app with real Supabase connection |

---

## Step 1: Run Database Migrations

1. Go to your Supabase Dashboard:
   **https://supabase.com/dashboard/project/pjrrfghzoejdaeqcggwm**

2. Navigate to **SQL Editor** (left sidebar)

3. Click **New Query**

4. **Paste and run** `supabase_migration.sql` first
   - This creates all 20+ tables, RLS policies, triggers, storage buckets, and seeds your 10 branches

5. **Paste and run** `supabase_migration_supplement.sql` second
   - This adds the `branch_health` view, `daily_stats` view, auto-task generation, approval functions, performance indexes, and checklist items reference

### What gets created:

**Tables (20+):**
- `branches` — 10 Egyptian retail stores (seeded)
- `profiles` — User profiles (auto-created on signup)
- `reports` — Operational reports with compliance scoring
- `report_sections` — 7 checklist sections (seeded)
- `report_answers` — Individual checklist item responses
- `report_images` — Photo attachments
- `tasks` — Task management with SLA tracking
- `task_comments` — Task discussion thread
- `incidents` — Issue tracking with severity
- `notifications` — Real-time notification system
- `employee_sales` — Sales performance data
- `attendance_logs` — Check-in/out tracking
- `training_materials` — Learning content
- `training_completions` — Progress tracking
- `inventory` — Stock management
- `transfers` — Inter-branch transfers
- `defects` — Damaged goods tracking
- `ai_insights` — AI-generated alerts
- `activity_logs` — Full audit trail
- `comments` — Universal comment system
- `approvals` — Approval workflow records
- `checklist_items` — Reference checklist items

**Views:**
- `branch_health` — Real-time health score per branch
- `daily_stats` — Dashboard KPI aggregates
- `report_answers_summary` — Joined answers with section info

**Database Functions:**
- `approve_report()` — Approve/reject with notifications
- `update_task_status()` — Status change with auto-notify
- `check_all_overdue_tasks()` — Bulk overdue detection
- `log_activity()` — Activity logging helper

**Triggers:**
- Auto-calculate compliance on answer insert/update
- Auto-notify on report status change
- Auto-mark overdue tasks
- Auto-create tasks from critical incidents
- Auto-create profile on user signup
- Auto-update `updated_at` timestamps

**Storage Buckets:**
- `report-images` (public)
- `vm-images` (public)
- `employee-files` (private)
- `training-materials` (public)
- `sales-uploads` (private)
- `voice-notes` (private)

---

## Step 2: Create Your First Admin User

1. In Supabase Dashboard, go to **Authentication** → **Users**

2. Click **Add User** → **Create New User**

3. Enter:
   - Email: `admin@ravin.academy` (or your email)
   - Password: Choose a strong password
   - Auto Confirm: **ON**
   - User Metadata (JSON):
     ```json
     {
       "username": "admin",
       "full_name": "System Admin",
       "role": "admin"
     }
     ```

4. Click **Create User**

5. The profile is auto-created by the database trigger with the role from metadata.

6. **Verify the profile**: Go to **Table Editor** → `profiles` → confirm the admin user exists with role = `admin`

---

## Step 3: Create Branch Users

For each branch, create users with appropriate metadata:

### Example: Mall of Arabia Branch Manager

In **Auth → Users → Add User**:
- Email: `nadia@ravin.academy`
- Password: `SecurePass123`
- Auto Confirm: ON
- Metadata:
  ```json
  {
    "username": "arabia_mgr",
    "full_name": "Nadia Saleh",
    "role": "branch_manager"
  }
  ```

After creating the user, go to **Table Editor → profiles** and set `branch_id` to the Mall of Arabia branch UUID.

### Roles available:
- `admin` — Full system access
- `area_manager` — Multi-branch oversight
- `branch_manager` — Single branch management
- `assistant` — Branch operations support
- `vm` — Visual merchandising only

---

## Step 4: Enable Realtime

1. Go to **Database** → **Replication**

2. Under **supabase_realtime**, ensure these tables are enabled:
   - `reports`
   - `tasks`
   - `notifications`
   - `incidents`
   - `activity_logs`
   - `ai_insights`

(The migration SQL adds these automatically, but verify they're active)

---

## Step 5: Verify Storage

1. Go to **Storage** in the sidebar

2. You should see 6 buckets created:
   - `report-images`
   - `vm-images`
   - `employee-files`
   - `training-materials`
   - `sales-uploads`
   - `voice-notes`

3. If missing, run the storage section of the migration again

---

## Step 6: Test the Application

1. Open `ravin_academy_complete.jsx` in your React environment (or use the Claude artifact preview)

2. Sign in with the admin credentials you created

3. Test these workflows:
   - **Submit a report**: New Report → Select branch → Fill checklist → Submit
   - **View compliance**: Dashboard should show the report with compliance score
   - **Create a task**: Tasks → + New Task → Fill details → Create
   - **Check notifications**: Notifications page should show auto-generated alerts
   - **View branch health**: Dashboard shows health scores from the `branch_health` view
   - **Approve a report**: As admin/area_manager, open a submitted report → Approve/Reject

---

## Step 7: Row Level Security Verification

Test RLS by:

1. Sign in as a branch manager
2. Verify they can only see their branch's reports
3. Verify they cannot access other branches' data
4. Verify admins can see everything

---

## Architecture Summary

```
User Action (Submit Report)
    ↓
Supabase REST API (INSERT into reports)
    ↓
Database Trigger: calc_report_compliance()
    ↓ Auto-calculate compliance score
Database Trigger: notify_on_report_status()
    ↓ Create notifications for managers
branch_health VIEW updates automatically
    ↓
Dashboard refreshes → shows new data
    ↓
Area Manager sees notification → clicks → views report
    ↓
Approves/Rejects via approve_report() function
    ↓
Report status updates → notification to submitter
    ↓
Activity log recorded automatically
```

---

## Security Notes

- The anon key is safe to use in the frontend (it's the public key)
- All data access is controlled by RLS policies
- Never expose the `service_role` key in frontend code
- Admin operations use RLS policies that check the user's role
- All sensitive operations use `SECURITY DEFINER` functions

---

## Production Deployment

For deploying to Netlify/Vercel with Next.js:

1. Move `ravin_academy_complete.jsx` into your Next.js project
2. Set environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://pjrrfghzoejdaeqcggwm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Replace hardcoded values with `process.env.NEXT_PUBLIC_SUPABASE_URL`
4. Deploy

---

## RAVIN ACADEMY
### MAKE UR WORLD TO BE PROUD
