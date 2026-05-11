-- ══════════════════════════════════════════════════════════════════════
-- RAVIN ACADEMY — COMPLETE SUPABASE MIGRATION
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Project: pjrrfghzoejdaeqcggwm
-- ══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','area_manager','branch_manager','assistant','vm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('draft','submitted','pending_review','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending','in_progress','waiting_approval','completed','rejected','escalated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE checklist_status AS ENUM ('completed','not_completed','follow_up');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('opening','mid','closing','full_day');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info','warning','danger','success');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────
-- 2. CORE TABLES
-- ────────────────────────────────────────────────────────────────────

-- BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  area TEXT NOT NULL DEFAULT 'Cairo',
  address TEXT,
  phone TEXT,
  opening_hour TIME DEFAULT '10:00',
  closing_hour TIME DEFAULT '22:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'assistant',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  area TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  performance_score INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_branch ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ────────────────────────────────────────────────────────────────────
-- 3. REPORTS SYSTEM
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift shift_type NOT NULL DEFAULT 'opening',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status report_status NOT NULL DEFAULT 'draft',
  compliance_score NUMERIC(5,2) DEFAULT 0,
  customer_readiness_score NUMERIC(5,2) DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  follow_up_items INTEGER DEFAULT 0,
  not_completed_items INTEGER DEFAULT 0,
  manager_notes TEXT,
  sales_amount NUMERIC(12,2),
  target_amount NUMERIC(12,2),
  upt NUMERIC(4,2),
  atv NUMERIC(10,2),
  conversion NUMERIC(5,2),
  traffic INTEGER,
  invoices INTEGER,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_branch ON reports(branch_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_submitted_by ON reports(submitted_by);

-- REPORT SECTIONS (7 standard sections)
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- REPORT ANSWERS (individual checklist items)
CREATE TABLE IF NOT EXISTS report_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  status checklist_status NOT NULL DEFAULT 'not_completed',
  note TEXT,
  image_url TEXT,
  answered_at TIMESTAMPTZ DEFAULT now(),
  answered_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_report_answers_report ON report_answers(report_id);

-- REPORT IMAGES
CREATE TABLE IF NOT EXISTS report_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  section TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 4. APPROVALS & COMMENTS
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  task_id UUID,  -- will reference tasks after creation
  action TEXT NOT NULL, -- 'approved','rejected','escalated','revision_requested'
  comment TEXT,
  acted_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  task_id UUID,
  incident_id UUID,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 5. TASKS SYSTEM
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  task_type TEXT DEFAULT 'daily', -- daily, weekly, monthly, campaign, emergency
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sla_hours INTEGER DEFAULT 24,
  is_overdue BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Add FK for approvals.task_id
ALTER TABLE approvals ADD CONSTRAINT fk_approvals_task
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT fk_comments_task
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 6. INCIDENTS
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  incident_type TEXT NOT NULL, -- POS, AC, Customer, Staff, Maintenance, VM
  severity incident_severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT,
  sla_hours INTEGER DEFAULT 4,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comments ADD CONSTRAINT fk_comments_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_incidents_branch ON incidents(branch_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- ────────────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link_type TEXT,   -- 'report','task','incident','branch'
  link_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

-- ────────────────────────────────────────────────────────────────────
-- 8. EMPLOYEE SALES
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sales_amount NUMERIC(12,2) DEFAULT 0,
  invoices INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  upt NUMERIC(4,2) DEFAULT 0,
  atv NUMERIC(10,2) DEFAULT 0,
  conversion NUMERIC(5,2) DEFAULT 0,
  traffic INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empsales_employee ON employee_sales(employee_id);
CREATE INDEX IF NOT EXISTS idx_empsales_date ON employee_sales(sale_date);

-- ────────────────────────────────────────────────────────────────────
-- 9. ATTENDANCE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  shift shift_type,
  status TEXT DEFAULT 'present', -- present, absent, late, leave
  note TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 10. TRAINING & LEARNING
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- Sales, VM, Operations, CX, Leadership, KPI
  file_type TEXT NOT NULL DEFAULT 'pdf', -- pdf, video, doc
  file_url TEXT,
  thumbnail_url TEXT,
  pages INTEGER,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES profiles(id),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES training_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  score INTEGER,
  UNIQUE(material_id, user_id)
);

-- ────────────────────────────────────────────────────────────────────
-- 11. INVENTORY
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  is_defective BOOLEAN DEFAULT false,
  is_dead_stock BOOLEAN DEFAULT false,
  last_replenished TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_branch UUID REFERENCES branches(id),
  to_branch UUID REFERENCES branches(id),
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_transit, received
  requested_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sku TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  reason TEXT,
  image_url TEXT,
  reported_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 12. AI INSIGHTS
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  insight_type TEXT NOT NULL, -- risk, opportunity, recommendation, alert
  severity TEXT DEFAULT 'info', -- info, warning, critical
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 13. ACTIVITY LOG
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  branch_id UUID REFERENCES branches(id),
  action TEXT NOT NULL,
  entity_type TEXT, -- report, task, incident, user, branch
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 14. UPLOADED FILES
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  bucket TEXT NOT NULL,
  entity_type TEXT, -- report, task, incident, training, vm
  entity_id UUID,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────
-- 15. AUTO-UPDATE TIMESTAMPS TRIGGER
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_update_%I ON %I; CREATE TRIGGER trg_update_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 16. COMPLIANCE SCORE CALCULATION TRIGGER
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calc_report_compliance()
RETURNS TRIGGER AS $$
DECLARE
  total INT;
  completed INT;
  followup INT;
  score NUMERIC;
BEGIN
  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*) FILTER (WHERE status = 'follow_up')
  INTO total, completed, followup
  FROM report_answers WHERE report_id = NEW.report_id;
  
  IF total > 0 THEN
    score := ((completed + followup * 0.5) / total) * 100;
  ELSE
    score := 0;
  END IF;

  UPDATE reports SET
    compliance_score = ROUND(score, 1),
    total_items = total,
    completed_items = completed,
    follow_up_items = followup,
    not_completed_items = total - completed - followup,
    updated_at = now()
  WHERE id = NEW.report_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_compliance ON report_answers;
CREATE TRIGGER trg_calc_compliance
  AFTER INSERT OR UPDATE ON report_answers
  FOR EACH ROW EXECUTE FUNCTION calc_report_compliance();

-- ────────────────────────────────────────────────────────────────────
-- 17. AUTO-NOTIFICATION ON REPORT SUBMIT
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_report_status()
RETURNS TRIGGER AS $$
DECLARE
  branch_name TEXT;
  submitter_name TEXT;
  manager_ids UUID[];
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    SELECT name INTO branch_name FROM branches WHERE id = NEW.branch_id;
    SELECT full_name INTO submitter_name FROM profiles WHERE id = NEW.submitted_by;
    
    -- Notify area managers and admins
    SELECT ARRAY_AGG(id) INTO manager_ids
    FROM profiles
    WHERE role IN ('admin', 'area_manager') AND is_active = true;
    
    IF manager_ids IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link_type, link_id)
      SELECT unnest(manager_ids), 
             'Report Submitted',
             submitter_name || ' submitted a report for ' || branch_name,
             'info',
             'report',
             NEW.id;
    END IF;
  END IF;

  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO notifications (user_id, title, message, type, link_type, link_id)
    VALUES (NEW.submitted_by, 'Report Approved', 'Your report has been approved', 'success', 'report', NEW.id);
  END IF;

  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO notifications (user_id, title, message, type, link_type, link_id)
    VALUES (NEW.submitted_by, 'Report Rejected', 'Your report was rejected: ' || COALESCE(NEW.review_comment, 'No comment'), 'danger', 'report', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_notify ON reports;
CREATE TRIGGER trg_report_notify
  AFTER INSERT OR UPDATE OF status ON reports
  FOR EACH ROW EXECUTE FUNCTION notify_on_report_status();

-- ────────────────────────────────────────────────────────────────────
-- 18. AUTO-NOTIFICATION ON TASK OVERDUE
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_task_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.due_date < now() AND NEW.status NOT IN ('completed', 'rejected') THEN
    NEW.is_overdue := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_overdue ON tasks;
CREATE TRIGGER trg_task_overdue
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION check_task_overdue();

-- ────────────────────────────────────────────────────────────────────
-- 19. ACTIVITY LOG HELPER FUNCTION
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_branch_id UUID,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, branch_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_branch_id, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────
-- 20. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's branch_id
CREATE OR REPLACE FUNCTION auth_branch_id() RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ──
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Area managers see branch profiles" ON profiles FOR SELECT
  USING (auth_role() = 'area_manager');
CREATE POLICY "Branch users see own branch" ON profiles FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admin manages all profiles" ON profiles FOR ALL USING (auth_role() = 'admin');

-- ── BRANCHES ──
CREATE POLICY "Everyone reads branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Admin manages branches" ON branches FOR ALL USING (auth_role() = 'admin');

-- ── REPORTS ──
CREATE POLICY "Admin sees all reports" ON reports FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Area manager sees reports" ON reports FOR SELECT USING (auth_role() = 'area_manager');
CREATE POLICY "Branch users see own branch reports" ON reports FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "Users create reports for own branch" ON reports FOR INSERT
  WITH CHECK (branch_id = auth_branch_id() OR auth_role() = 'admin');
CREATE POLICY "Users update own reports" ON reports FOR UPDATE
  USING (submitted_by = auth.uid() OR auth_role() IN ('admin', 'area_manager'));

-- ── REPORT ANSWERS ──
CREATE POLICY "Answers follow report access" ON report_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM reports r WHERE r.id = report_id AND (
    r.branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
  )));
CREATE POLICY "Users insert answers" ON report_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update answers" ON report_answers FOR UPDATE USING (true);

-- ── REPORT IMAGES ──
CREATE POLICY "Images follow report access" ON report_images FOR ALL
  USING (EXISTS (SELECT 1 FROM reports r WHERE r.id = report_id AND (
    r.branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
  )));

-- ── TASKS ──
CREATE POLICY "Admin sees all tasks" ON tasks FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Area managers see tasks" ON tasks FOR SELECT USING (auth_role() = 'area_manager');
CREATE POLICY "Branch sees own tasks" ON tasks FOR SELECT
  USING (branch_id = auth_branch_id() OR assigned_to = auth.uid());
CREATE POLICY "Create tasks" ON tasks FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'area_manager', 'branch_manager'));
CREATE POLICY "Update tasks" ON tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR auth_role() IN ('admin', 'area_manager'));

-- ── TASK COMMENTS ──
CREATE POLICY "Task comment access" ON task_comments FOR ALL USING (true);

-- ── INCIDENTS ──
CREATE POLICY "Admin sees all incidents" ON incidents FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Area manager sees incidents" ON incidents FOR SELECT USING (auth_role() = 'area_manager');
CREATE POLICY "Branch sees own incidents" ON incidents FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "Users create incidents" ON incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update incidents" ON incidents FOR UPDATE USING (true);

-- ── NOTIFICATIONS ──
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "System inserts notifications" ON notifications FOR INSERT WITH CHECK (true);

-- ── EMPLOYEE SALES ──
CREATE POLICY "Admin sees all sales" ON employee_sales FOR SELECT USING (auth_role() IN ('admin', 'area_manager'));
CREATE POLICY "Branch sees own sales" ON employee_sales FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "Insert sales" ON employee_sales FOR INSERT WITH CHECK (true);

-- ── ATTENDANCE ──
CREATE POLICY "Attendance access" ON attendance_logs FOR ALL USING (
  user_id = auth.uid() OR branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
);

-- ── TRAINING ──
CREATE POLICY "Everyone reads training" ON training_materials FOR SELECT USING (true);
CREATE POLICY "Admin manages training" ON training_materials FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Completions access" ON training_completions FOR ALL USING (true);

-- ── ACTIVITY LOGS ──
CREATE POLICY "Admin sees all logs" ON activity_logs FOR SELECT USING (auth_role() IN ('admin', 'area_manager'));
CREATE POLICY "Branch sees own logs" ON activity_logs FOR SELECT
  USING (branch_id = auth_branch_id() OR user_id = auth.uid());
CREATE POLICY "Insert logs" ON activity_logs FOR INSERT WITH CHECK (true);

-- ── COMMENTS ──
CREATE POLICY "Comments access" ON comments FOR ALL USING (true);

-- ── APPROVALS ──
CREATE POLICY "Approvals access" ON approvals FOR ALL USING (true);

-- ── AI INSIGHTS ──
CREATE POLICY "Everyone reads insights" ON ai_insights FOR SELECT USING (true);
CREATE POLICY "System inserts insights" ON ai_insights FOR INSERT WITH CHECK (true);

-- ── INVENTORY ──
CREATE POLICY "Inventory access" ON inventory FOR ALL USING (
  branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
);

-- ── FILES ──
CREATE POLICY "Files access" ON uploaded_files FOR ALL USING (true);

-- ────────────────────────────────────────────────────────────────────
-- 21. STORAGE BUCKETS
-- ────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('report-images', 'report-images', true),
  ('vm-images', 'vm-images', true),
  ('employee-files', 'employee-files', false),
  ('training-materials', 'training-materials', true),
  ('sales-uploads', 'sales-uploads', false),
  ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, public read for public buckets
CREATE POLICY "Auth users upload" ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Public read for public buckets" ON storage.objects FOR SELECT
  USING (bucket_id IN ('report-images', 'vm-images', 'training-materials'));
CREATE POLICY "Auth read all" ON storage.objects FOR SELECT
  USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────────
-- 22. SEED DATA — BRANCHES
-- ────────────────────────────────────────────────────────────────────

INSERT INTO branches (name, area) VALUES
  ('Hadaik El Ahram', 'Cairo'),
  ('Haram Street', 'Cairo'),
  ('Maadi Branch', 'Cairo'),
  ('Mall of Arabia', 'Cairo'),
  ('Lebanon St Mohandeseen', 'Cairo'),
  ('Shoubra', 'Cairo'),
  ('Alex City Center', 'Alexandria'),
  ('Sharm Genena Mall', 'Sharm El Sheikh'),
  ('Al Mahalla', 'Delta'),
  ('Zaqaziq', 'Delta')
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 23. SEED DATA — REPORT SECTIONS
-- ────────────────────────────────────────────────────────────────────

INSERT INTO report_sections (code, title, icon, sort_order) VALUES
  ('opening', 'Opening Operations', '🏪', 1),
  ('team', 'Team Management', '👥', 2),
  ('cashier', 'Cashier & Finance', '💳', 3),
  ('stock', 'Stock & Operations', '📦', 4),
  ('sales', 'Sales & CX', '📊', 5),
  ('admin', 'Administrative', '📋', 6),
  ('closing', 'Closing Operations', '🔒', 7)
ON CONFLICT (code) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 24. SEED DATA — INITIAL AI INSIGHTS
-- ────────────────────────────────────────────────────────────────────

INSERT INTO ai_insights (insight_type, severity, title, content) VALUES
  ('alert', 'critical', 'System Initialized', 'RAVIN Academy backend is now live. Start submitting reports to generate real insights.'),
  ('recommendation', 'info', 'Getting Started', 'Create branch manager accounts and begin daily report submissions to unlock AI analytics.')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 25. HANDLE NEW USER SIGNUP → CREATE PROFILE
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'assistant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────────────
-- 26. REALTIME PUBLICATIONS
-- ────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;

-- ══════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ══════════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create your first admin user via Supabase Auth
-- 3. Update the admin profile's role to 'admin'
-- 4. The React app will connect automatically
-- ══════════════════════════════════════════════════════════════════════
