# RAVIN ACADEMY — Complete Deployment Guide

## MAKE UR WORLD TO BE PROUD

---

## Complete File Inventory

### SQL Migrations (run in Supabase SQL Editor, in order)

| # | File | What it creates |
|---|------|-----------------|
| 1 | `supabase_migration.sql` | 20+ tables, RLS, triggers, storage buckets, seed data |
| 2 | `supabase_migration_supplement.sql` | Views, functions, auto-task gen, indexes |
| 3 | `supabase_migration_part3.sql` | Sales targets, commercial views, employee scoring, CX readiness, VM reports, auto-AI insights |
| 4 | `supabase_cron_jobs.sql` | Scheduled jobs: overdue checks, missing reports, daily brief, cleanup |

### React App

| File | Description |
|------|-------------|
| `ravin_academy_final.jsx` | Complete production app — 18 pages, real Supabase |

### Edge Functions

| File | Description |
|------|-------------|
| `edge_functions/daily-insights/index.ts` | Automated AI insight generation |

### Deployment Config

| File | Description |
|------|-------------|
| `nextjs_project/package.json` | Dependencies |
| `nextjs_project/.env.example` | Environment variables template |
| `nextjs_project/next.config.js` | Next.js config |
| `nextjs_project/netlify.toml` | Netlify deployment config |

---

## Step-by-Step Setup

### Phase 1: Database Setup

1. **Open Supabase Dashboard**
   → https://supabase.com/dashboard/project/pjrrfghzoejdaeqcggwm

2. **SQL Editor** → New Query → paste and run each file:

   ```
   Step 1: supabase_migration.sql          ← Core tables + RLS
   Step 2: supabase_migration_supplement.sql ← Views + functions
   Step 3: supabase_migration_part3.sql      ← Commercial + employee
   Step 4: supabase_cron_jobs.sql            ← Scheduled automation
   ```

   **Run them one at a time. Wait for each to complete.**

3. **Verify in Table Editor:**
   - `branches` → should have 10 rows
   - `report_sections` → should have 7 rows
   - `sales_targets` → should have 10 rows (seeded)
   - `checklist_items` → should have ~48 rows

### Phase 2: Enable Realtime

1. **Database** → **Replication** → ensure these tables are in `supabase_realtime`:
   - reports, tasks, notifications, incidents, activity_logs, ai_insights, daily_sales, comments

### Phase 3: Verify Storage

1. **Storage** → verify 6 buckets exist:
   - report-images, vm-images, employee-files, training-materials, sales-uploads, voice-notes

### Phase 4: Create Users

1. **Authentication** → **Users** → **Add User**

2. **Create Admin:**
   - Email: `admin@ravin.academy`
   - Password: strong password
   - Auto Confirm: ON
   - Metadata:
     ```json
     {"username": "admin", "full_name": "System Admin", "role": "admin"}
     ```

3. **Create Branch Managers** (one per branch):
   - Metadata example:
     ```json
     {"username": "arabia_mgr", "full_name": "Nadia Saleh", "role": "branch_manager"}
     ```
   - After creation, go to **Table Editor → profiles** and set `branch_id`

4. **Create Area Manager:**
   ```json
   {"username": "area_cairo", "full_name": "Ahmed Mostafa", "role": "area_manager"}
   ```
   - Set `area` field to "Cairo" in profiles table

### Phase 5: Test the App

1. Open `ravin_academy_final.jsx` (use as React artifact or in Next.js)
2. Sign in with admin credentials
3. Test workflow:
   ```
   New Report → Select branch → Fill checklist → Submit
       ↓
   Dashboard updates → Compliance calculated → Notification sent
       ↓
   Reports list shows new report → Click to view detail
       ↓
   Approve/Reject → Notification to submitter → Activity logged
   ```

### Phase 6: Deploy Edge Functions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link project:
   ```bash
   supabase link --project-ref pjrrfghzoejdaeqcggwm
   ```

3. Deploy:
   ```bash
   supabase functions deploy daily-insights
   ```

4. Set secrets:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Phase 7: Deploy to Netlify

1. Create Next.js project with the provided config files
2. Place `ravin_academy_final.jsx` as the main page component
3. Set environment variables in Netlify dashboard
4. Deploy

---

## Database Architecture

```
┌─────────────────────────────────────────────────┐
│                  RAVIN ACADEMY                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ branches │───→│ profiles │───→│  reports  │  │
│  └──────────┘    └──────────┘    └──────────┘  │
│       │               │              │          │
│       │               │              ├─→ report_answers
│       │               │              ├─→ report_images
│       │               │              ├─→ approvals
│       │               │              └─→ comments
│       │               │                         │
│       ├───→ tasks ←───┤                         │
│       │    ├─→ task_comments                    │
│       │                                         │
│       ├───→ incidents                           │
│       ├───→ daily_sales ←── sales_targets       │
│       ├───→ inventory                           │
│       ├───→ customer_readiness                  │
│       ├───→ vm_reports                          │
│       │                                         │
│       │    ┌──────────────┐                     │
│       └───→│ employee_sales│                    │
│            └──────────────┘                     │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ notifications │  │ activity_logs│             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │  ai_insights  │  │training_mats │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  VIEWS:                                          │
│  • branch_health (real-time health scoring)      │
│  • commercial_overview (sales war room)          │
│  • employee_performance (composite scoring)      │
│  • daily_stats (dashboard KPIs)                  │
│  • report_answers_summary (drill-down)           │
└─────────────────────────────────────────────────┘
```

## Automation Flow

```
USER ACTION                    DATABASE TRIGGER              RESULT
─────────────                  ─────────────────             ──────
Submit report          →  calc_report_compliance()     →  Score calculated
                       →  notify_on_report_status()    →  Managers notified
                       →  auto_ai_insight_on_report()  →  AI alert if <70%

Report approved        →  notify_on_report_status()    →  Submitter notified
                       →  log_activity() via RPC       →  Audit trail

Create incident        →  auto_create_task_from_incident() → Emergency task
(critical severity)    →  Notifications inserted       →  All managers alerted

Task past due_date     →  check_task_overdue()         →  is_overdue = true
                       →  Notification created         →  Assignee alerted

CRON (every 30 min)    →  check_all_overdue_tasks()    →  Bulk overdue scan
CRON (daily 11 AM)     →  detect_missing_reports()     →  Missing report alerts
CRON (daily 8 AM)      →  Daily AI brief               →  Morning summary
CRON (weekly Sunday)   →  Cleanup old notifications    →  Database hygiene
```

## RLS Security Matrix

| Table | Admin | Area Mgr | Branch Mgr | Assistant | VM |
|-------|-------|----------|------------|-----------|-----|
| All branches | ✅ Read | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| Reports | ✅ All | ✅ Assigned area | ✅ Own branch | ✅ Own branch | ❌ |
| Tasks | ✅ All | ✅ Assigned | ✅ Own+assigned | ✅ Assigned | ✅ VM tasks |
| Incidents | ✅ All | ✅ Assigned | ✅ Own branch | ✅ Own branch | ❌ |
| Notifications | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| Employee Sales | ✅ All | ✅ Area | ✅ Own branch | ❌ | ❌ |
| Profiles | ✅ All | ✅ Area | ✅ Own branch | ✅ Own | ✅ Own |

## Production Checklist

- [ ] Run all 4 SQL migrations in order
- [ ] Verify 10 branches seeded
- [ ] Verify 7 report sections seeded
- [ ] Create admin user in Auth
- [ ] Set admin profile role to 'admin'
- [ ] Create at least 2 branch managers
- [ ] Assign branch_id to each manager
- [ ] Enable Realtime for key tables
- [ ] Verify 6 storage buckets exist
- [ ] Test login flow
- [ ] Test report submission + compliance scoring
- [ ] Test notification generation
- [ ] Test report approval/rejection
- [ ] Test task creation
- [ ] Test incident creation (critical → auto task)
- [ ] Deploy Edge Function
- [ ] Set up cron jobs (if pg_cron available)
- [ ] Deploy to Netlify/Vercel
- [ ] Set environment variables in deployment platform
- [ ] Test mobile responsiveness

---

**RAVIN ACADEMY · MAKE UR WORLD TO BE PROUD**

Production-ready. Not a demo.
