-- ══════════════════════════════════════════════════════════════════════
-- RAVIN ACADEMY — SUPPLEMENTARY MIGRATION
-- Run AFTER the main migration (supabase_migration.sql)
-- ══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. BRANCH HEALTH MATERIALIZED VIEW
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW branch_health AS
SELECT
  b.id AS branch_id,
  b.name AS branch_name,
  b.area,
  -- Reports today
  COALESCE(rpt.report_count, 0) AS reports_today,
  COALESCE(rpt.avg_compliance, 0) AS avg_compliance,
  -- Tasks
  COALESCE(tsk.total_tasks, 0) AS total_tasks,
  COALESCE(tsk.completed_tasks, 0) AS completed_tasks,
  COALESCE(tsk.overdue_tasks, 0) AS overdue_tasks,
  -- Incidents
  COALESCE(inc.open_incidents, 0) AS open_incidents,
  -- Health score calculation
  CASE
    WHEN COALESCE(rpt.avg_compliance, 0) = 0 THEN 50
    ELSE LEAST(100, GREATEST(0,
      COALESCE(rpt.avg_compliance, 0) * 0.4 +
      CASE WHEN COALESCE(tsk.total_tasks, 0) = 0 THEN 80
           ELSE (COALESCE(tsk.completed_tasks, 0)::NUMERIC / NULLIF(tsk.total_tasks, 0) * 100) END * 0.3 +
      CASE WHEN COALESCE(inc.open_incidents, 0) = 0 THEN 100
           WHEN inc.open_incidents <= 1 THEN 70
           ELSE 40 END * 0.15 +
      CASE WHEN COALESCE(rpt.report_count, 0) > 0 THEN 100 ELSE 0 END * 0.15
    ))
  END::INTEGER AS health_score,
  -- Health status
  CASE
    WHEN COALESCE(rpt.avg_compliance, 0) >= 85 AND COALESCE(inc.open_incidents, 0) = 0 THEN 'healthy'
    WHEN COALESCE(rpt.avg_compliance, 0) >= 70 THEN 'attention'
    WHEN COALESCE(rpt.avg_compliance, 0) >= 55 THEN 'risk'
    ELSE 'crisis'
  END AS health_status
FROM branches b
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS report_count,
    ROUND(AVG(compliance_score), 1) AS avg_compliance
  FROM reports r
  WHERE r.branch_id = b.id
    AND r.report_date = CURRENT_DATE
    AND r.is_deleted = false
    AND r.status != 'draft'
) rpt ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE is_overdue = true AND status NOT IN ('completed','rejected')) AS overdue_tasks
  FROM tasks t
  WHERE t.branch_id = b.id AND t.is_deleted = false
) tsk ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS open_incidents
  FROM incidents i
  WHERE i.branch_id = b.id AND i.status IN ('open', 'in_progress') AND i.is_deleted = false
) inc ON true
WHERE b.is_active = true;

-- Grant access to the view
GRANT SELECT ON branch_health TO authenticated;
GRANT SELECT ON branch_health TO anon;

-- ────────────────────────────────────────────────────────────────────
-- 2. DAILY STATS VIEW (for dashboard KPIs)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW daily_stats AS
SELECT
  CURRENT_DATE AS stat_date,
  (SELECT COUNT(*) FROM reports WHERE report_date = CURRENT_DATE AND is_deleted = false AND status != 'draft') AS reports_submitted,
  (SELECT COUNT(*) FROM branches WHERE is_active = true) AS total_branches,
  (SELECT COUNT(*) FROM branches WHERE is_active = true) -
    (SELECT COUNT(DISTINCT branch_id) FROM reports WHERE report_date = CURRENT_DATE AND is_deleted = false AND status != 'draft') AS missing_reports,
  (SELECT ROUND(AVG(compliance_score), 1) FROM reports WHERE report_date = CURRENT_DATE AND is_deleted = false AND compliance_score > 0) AS avg_compliance,
  (SELECT COUNT(*) FROM tasks WHERE is_deleted = false AND status NOT IN ('completed','rejected')) AS active_tasks,
  (SELECT COUNT(*) FROM tasks WHERE is_deleted = false AND is_overdue = true AND status NOT IN ('completed','rejected')) AS overdue_tasks,
  (SELECT COUNT(*) FROM incidents WHERE status IN ('open','in_progress') AND is_deleted = false) AS open_incidents,
  (SELECT COUNT(*) FROM notifications WHERE is_read = false) AS unread_notifications;

GRANT SELECT ON daily_stats TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 3. AUTO TASK GENERATION FROM INCIDENTS
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_create_task_from_incident()
RETURNS TRIGGER AS $$
DECLARE
  task_title TEXT;
  task_priority task_priority;
BEGIN
  -- Only on new critical/high severity incidents
  IF NEW.severity IN ('critical', 'high') THEN
    task_title := 'FIX: ' || NEW.title || ' (' || NEW.incident_type || ')';
    task_priority := CASE WHEN NEW.severity = 'critical' THEN 'critical'::task_priority ELSE 'high'::task_priority END;

    INSERT INTO tasks (
      title, description, branch_id, created_by, priority, status,
      task_type, sla_hours, due_date
    ) VALUES (
      task_title,
      'Auto-generated from incident: ' || COALESCE(NEW.description, NEW.title),
      NEW.branch_id,
      NEW.reported_by,
      task_priority,
      'pending',
      'emergency',
      CASE WHEN NEW.severity = 'critical' THEN 2 ELSE 4 END,
      now() + INTERVAL '1 hour' * CASE WHEN NEW.severity = 'critical' THEN 2 ELSE 4 END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_task_incident ON incidents;
CREATE TRIGGER trg_auto_task_incident
  AFTER INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION auto_create_task_from_incident();

-- ────────────────────────────────────────────────────────────────────
-- 4. REPORT APPROVAL FUNCTION
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION approve_report(
  p_report_id UUID,
  p_reviewer_id UUID,
  p_action TEXT,  -- 'approved' or 'rejected'
  p_comment TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Update report status
  UPDATE reports SET
    status = p_action::report_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_comment = p_comment
  WHERE id = p_report_id;

  -- Create approval record
  INSERT INTO approvals (report_id, action, comment, acted_by)
  VALUES (p_report_id, p_action, p_comment, p_reviewer_id);

  -- Log activity
  PERFORM log_activity(
    p_reviewer_id,
    (SELECT branch_id FROM reports WHERE id = p_report_id),
    p_action || ' report',
    'report',
    p_report_id,
    jsonb_build_object('comment', COALESCE(p_comment, ''))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────
-- 5. UPDATE TASK STATUS FUNCTION
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id UUID,
  p_user_id UUID,
  p_status task_status,
  p_comment TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE tasks SET
    status = p_status,
    progress = CASE
      WHEN p_status = 'completed' THEN 100
      WHEN p_status = 'in_progress' THEN GREATEST(progress, 25)
      ELSE progress
    END,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  WHERE id = p_task_id;

  -- Add comment if provided
  IF p_comment IS NOT NULL THEN
    INSERT INTO task_comments (task_id, user_id, content)
    VALUES (p_task_id, p_user_id, p_comment);
  END IF;

  -- Notify task creator
  INSERT INTO notifications (user_id, title, message, type, link_type, link_id)
  SELECT created_by,
    'Task ' || p_status::TEXT,
    'Task "' || title || '" updated to ' || p_status::TEXT,
    CASE WHEN p_status = 'completed' THEN 'success' ELSE 'info' END::notification_type,
    'task', p_task_id
  FROM tasks WHERE id = p_task_id AND created_by != p_user_id;

  -- Log
  PERFORM log_activity(p_user_id, (SELECT branch_id FROM tasks WHERE id = p_task_id),
    'Updated task to ' || p_status::TEXT, 'task', p_task_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────
-- 6. STORAGE POLICIES (supplement)
-- ────────────────────────────────────────────────────────────────────

-- Allow authenticated users to upload to any bucket
DO $$ BEGIN
  CREATE POLICY "Authenticated upload to report-images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'report-images' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated upload to vm-images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'vm-images' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated upload to sales-uploads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'sales-uploads' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated upload to training-materials"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'training-materials' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to read from all buckets
DO $$ BEGIN
  CREATE POLICY "Authenticated read all buckets"
    ON storage.objects FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow delete only for admins/owners
DO $$ BEGIN
  CREATE POLICY "Owner can delete uploads"
    ON storage.objects FOR DELETE
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────
-- 7. OVERDUE TASK CHECKER (run via pg_cron or edge function)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_all_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE tasks SET is_overdue = true
  WHERE due_date < now()
    AND status NOT IN ('completed', 'rejected')
    AND is_overdue = false
    AND is_deleted = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Create notifications for newly overdue tasks
  INSERT INTO notifications (user_id, title, message, type, link_type, link_id)
  SELECT COALESCE(assigned_to, created_by),
    'Task Overdue',
    'Task "' || title || '" has passed its deadline',
    'danger'::notification_type,
    'task', id
  FROM tasks
  WHERE is_overdue = true
    AND status NOT IN ('completed', 'rejected')
    AND is_deleted = false
    AND due_date > now() - INTERVAL '1 hour'
    AND due_date < now();

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────
-- 8. REPORT ANSWERS SUMMARY VIEW
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW report_answers_summary AS
SELECT
  ra.report_id,
  rs.code AS section_code,
  rs.title AS section_title,
  rs.icon AS section_icon,
  rs.sort_order,
  ra.id AS answer_id,
  ra.item_text,
  ra.status,
  ra.note,
  ra.image_url,
  ra.answered_at
FROM report_answers ra
JOIN report_sections rs ON rs.id = ra.section_id
ORDER BY rs.sort_order, ra.item_text;

GRANT SELECT ON report_answers_summary TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 9. INDEXES FOR PERFORMANCE
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_reports_composite ON reports(branch_id, report_date, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(is_overdue, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_activity_logs_recent ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_open ON incidents(branch_id, status) WHERE is_deleted = false;

-- ────────────────────────────────────────────────────────────────────
-- 10. SEED CHECKLIST ITEMS REFERENCE TABLE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_critical BOOLEAN DEFAULT false
);

-- Seed all checklist items
INSERT INTO checklist_items (section_id, item_text, sort_order, is_critical)
SELECT rs.id, item.text, item.ord, item.crit
FROM report_sections rs
CROSS JOIN LATERAL (VALUES
  -- Opening
  ('opening', 'Store opened on time', 1, true),
  ('opening', 'Lights & displays checked', 2, false),
  ('opening', 'Music & screens operational', 3, false),
  ('opening', 'AC & climate correct', 4, false),
  ('opening', 'Cleanliness completed', 5, true),
  ('opening', 'Window display verified', 6, false),
  ('opening', 'VM standards reviewed', 7, false),
  ('opening', 'Feature areas organized', 8, false),
  ('opening', 'Price tags audited', 9, true),
  -- Team
  ('team', 'Attendance taken', 1, true),
  ('team', 'Grooming checked', 2, false),
  ('team', 'Uniform compliance', 3, false),
  ('team', 'Morning briefing done', 4, true),
  ('team', 'Daily target shared', 5, true),
  ('team', 'KPIs explained', 6, false),
  ('team', 'Focus categories assigned', 7, false),
  ('team', 'Team motivation done', 8, false),
  -- Cashier
  ('cashier', 'Cash float verified', 1, true),
  ('cashier', 'POS operational', 2, true),
  ('cashier', 'Payment devices tested', 3, true),
  ('cashier', 'Deposit done', 4, true),
  ('cashier', 'Safe checked', 5, true),
  ('cashier', 'Cash drawers organized', 6, false),
  -- Stock
  ('stock', 'Deliveries processed', 1, false),
  ('stock', 'Replenishment done', 2, true),
  ('stock', 'Stockroom organized', 3, false),
  ('stock', 'Out-of-stock reviewed', 4, true),
  ('stock', 'Damaged items tagged', 5, false),
  ('stock', 'Returns processed', 6, false),
  -- Sales
  ('sales', 'Conversion monitored', 1, true),
  ('sales', 'UPT tracked', 2, true),
  ('sales', 'ATV monitored', 3, true),
  ('sales', 'Traffic counted', 4, false),
  ('sales', 'Complaints handled', 5, true),
  ('sales', 'Cross-selling active', 6, false),
  ('sales', 'Service quality OK', 7, false),
  -- Admin
  ('admin', 'Report submitted', 1, true),
  ('admin', 'Dashboard updated', 2, false),
  ('admin', 'SOP compliance reviewed', 3, false),
  ('admin', 'Area Manager updated', 4, false),
  ('admin', 'Team meeting done', 5, false),
  ('admin', 'Action plan active', 6, false),
  -- Closing
  ('closing', 'Final cash counted', 1, true),
  ('closing', 'Sales reconciled', 2, true),
  ('closing', 'POS closed', 3, true),
  ('closing', 'Store cleaned', 4, false),
  ('closing', 'Alarm set', 5, true),
  ('closing', 'Closing report done', 6, true)
) AS item(sec_code, text, ord, crit)
WHERE rs.code = item.sec_code
ON CONFLICT DO NOTHING;

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads checklist items" ON checklist_items FOR SELECT USING (true);

GRANT SELECT ON checklist_items TO authenticated;
GRANT SELECT ON checklist_items TO anon;

-- ══════════════════════════════════════════════════════════════════════
-- SUPPLEMENTARY MIGRATION COMPLETE
-- ══════════════════════════════════════════════════════════════════════
