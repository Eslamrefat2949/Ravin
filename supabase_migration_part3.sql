-- ══════════════════════════════════════════════════════════════════════
-- RAVIN ACADEMY — MIGRATION PART 3
-- Sales Targets, Employee Performance, Commercial Intelligence
-- Run AFTER migrations 1 and 2
-- ══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. SALES TARGETS TABLE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  target_month DATE NOT NULL, -- first day of month
  monthly_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  weekly_targets JSONB, -- {"week1": 100000, "week2": 120000, ...}
  daily_target NUMERIC(12,2) GENERATED ALWAYS AS (monthly_target / 30) STORED,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, target_month)
);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Targets read access" ON sales_targets FOR SELECT USING (true);
CREATE POLICY "Admin/AM manage targets" ON sales_targets FOR ALL
  USING (auth_role() IN ('admin', 'area_manager'));

GRANT SELECT ON sales_targets TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 2. DAILY SALES RECORDS (from POS uploads or manual entry)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  traffic INTEGER DEFAULT 0,
  upt NUMERIC(4,2) GENERATED ALWAYS AS (
    CASE WHEN total_invoices > 0 THEN total_quantity::NUMERIC / total_invoices ELSE 0 END
  ) STORED,
  atv NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN total_invoices > 0 THEN total_sales / total_invoices ELSE 0 END
  ) STORED,
  conversion NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN traffic > 0 THEN (total_invoices::NUMERIC / traffic) * 100 ELSE 0 END
  ) STORED,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, sale_date)
);

ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales read" ON daily_sales FOR SELECT USING (
  branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
);
CREATE POLICY "Sales insert" ON daily_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Sales update" ON daily_sales FOR UPDATE USING (true);

GRANT SELECT ON daily_sales TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_sales_branch_date ON daily_sales(branch_id, sale_date DESC);

-- ────────────────────────────────────────────────────────────────────
-- 3. COMMERCIAL OVERVIEW VIEW (War Room)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW commercial_overview AS
SELECT
  b.id AS branch_id,
  b.name AS branch_name,
  b.area,
  -- Today's sales
  COALESCE(ds.total_sales, 0) AS today_sales,
  COALESCE(ds.total_invoices, 0) AS today_invoices,
  COALESCE(ds.traffic, 0) AS today_traffic,
  COALESCE(ds.upt, 0) AS today_upt,
  COALESCE(ds.atv, 0) AS today_atv,
  COALESCE(ds.conversion, 0) AS today_conversion,
  -- Target
  COALESCE(st.daily_target, 0) AS daily_target,
  COALESCE(st.monthly_target, 0) AS monthly_target,
  -- Achievement
  CASE
    WHEN COALESCE(st.daily_target, 0) > 0
    THEN ROUND((COALESCE(ds.total_sales, 0) / st.daily_target) * 100, 1)
    ELSE 0
  END AS achievement_pct,
  -- MTD sales
  COALESCE(mtd.mtd_sales, 0) AS mtd_sales,
  COALESCE(mtd.mtd_invoices, 0) AS mtd_invoices,
  -- MTD achievement
  CASE
    WHEN COALESCE(st.monthly_target, 0) > 0
    THEN ROUND((COALESCE(mtd.mtd_sales, 0) / st.monthly_target) * 100, 1)
    ELSE 0
  END AS mtd_achievement_pct
FROM branches b
LEFT JOIN daily_sales ds ON ds.branch_id = b.id AND ds.sale_date = CURRENT_DATE
LEFT JOIN sales_targets st ON st.branch_id = b.id
  AND st.target_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
LEFT JOIN LATERAL (
  SELECT
    SUM(total_sales) AS mtd_sales,
    SUM(total_invoices) AS mtd_invoices
  FROM daily_sales
  WHERE branch_id = b.id
    AND sale_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND sale_date <= CURRENT_DATE
) mtd ON true
WHERE b.is_active = true
ORDER BY COALESCE(ds.total_sales, 0) DESC;

GRANT SELECT ON commercial_overview TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 4. EMPLOYEE PERFORMANCE VIEW
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW employee_performance AS
SELECT
  p.id AS employee_id,
  p.full_name,
  p.role,
  p.branch_id,
  b.name AS branch_name,
  p.performance_score,
  -- MTD sales aggregates
  COALESCE(es.total_sales, 0) AS mtd_sales,
  COALESCE(es.total_invoices, 0) AS mtd_invoices,
  COALESCE(es.avg_upt, 0) AS avg_upt,
  COALESCE(es.avg_atv, 0) AS avg_atv,
  COALESCE(es.avg_conversion, 0) AS avg_conversion,
  -- Attendance
  COALESCE(att.present_days, 0) AS present_days,
  COALESCE(att.total_days, 0) AS total_days,
  CASE
    WHEN COALESCE(att.total_days, 0) > 0
    THEN ROUND((att.present_days::NUMERIC / att.total_days) * 100, 1)
    ELSE 100
  END AS attendance_pct,
  -- Tasks
  COALESCE(tsk.completed_tasks, 0) AS completed_tasks,
  COALESCE(tsk.total_tasks, 0) AS total_tasks,
  -- Training
  COALESCE(trn.completed_training, 0) AS completed_training,
  -- Composite score
  LEAST(100, GREATEST(0,
    COALESCE(p.performance_score, 50) * 0.3 +
    CASE WHEN att.total_days > 0 THEN (att.present_days::NUMERIC / att.total_days * 100) ELSE 80 END * 0.2 +
    CASE WHEN tsk.total_tasks > 0 THEN (tsk.completed_tasks::NUMERIC / tsk.total_tasks * 100) ELSE 70 END * 0.2 +
    CASE WHEN es.avg_conversion > 0 THEN LEAST(100, es.avg_conversion * 3) ELSE 50 END * 0.3
  ))::INTEGER AS composite_score
FROM profiles p
LEFT JOIN branches b ON b.id = p.branch_id
LEFT JOIN LATERAL (
  SELECT
    SUM(sales_amount) AS total_sales,
    SUM(invoices) AS total_invoices,
    ROUND(AVG(upt), 1) AS avg_upt,
    ROUND(AVG(atv), 0) AS avg_atv,
    ROUND(AVG(conversion), 1) AS avg_conversion
  FROM employee_sales
  WHERE employee_id = p.id
    AND sale_date >= DATE_TRUNC('month', CURRENT_DATE)
) es ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status = 'present') AS present_days,
    COUNT(*) AS total_days
  FROM attendance_logs
  WHERE user_id = p.id
    AND log_date >= DATE_TRUNC('month', CURRENT_DATE)
) att ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
    COUNT(*) AS total_tasks
  FROM tasks
  WHERE assigned_to = p.id AND is_deleted = false
) tsk ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS completed_training
  FROM training_completions
  WHERE user_id = p.id
) trn ON true
WHERE p.is_active = true
ORDER BY composite_score DESC;

GRANT SELECT ON employee_performance TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 5. CUSTOMER READINESS TABLE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  lighting_ok BOOLEAN DEFAULT false,
  music_ok BOOLEAN DEFAULT false,
  cleanliness_ok BOOLEAN DEFAULT false,
  queue_ready BOOLEAN DEFAULT false,
  fitting_rooms_ok BOOLEAN DEFAULT false,
  steaming_ok BOOLEAN DEFAULT false,
  scent_ok BOOLEAN DEFAULT false,
  flow_ok BOOLEAN DEFAULT false,
  readiness_score NUMERIC(5,2) GENERATED ALWAYS AS (
    ((lighting_ok::INT + music_ok::INT + cleanliness_ok::INT + queue_ready::INT +
      fitting_rooms_ok::INT + steaming_ok::INT + scent_ok::INT + flow_ok::INT)::NUMERIC / 8) * 100
  ) STORED,
  assessed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CX readiness access" ON customer_readiness FOR ALL USING (
  branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
);

GRANT SELECT ON customer_readiness TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 6. VM REPORTS TABLE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vm_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  campaign_name TEXT,
  window_score INTEGER DEFAULT 0,  -- 0-100
  mannequin_score INTEGER DEFAULT 0,
  folding_score INTEGER DEFAULT 0,
  promotion_score INTEGER DEFAULT 0,
  overall_score NUMERIC(5,2) GENERATED ALWAYS AS (
    (window_score + mannequin_score + folding_score + promotion_score)::NUMERIC / 4
  ) STORED,
  before_image_url TEXT,
  after_image_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'submitted', -- submitted, approved, rejected
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vm_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VM reports access" ON vm_reports FOR ALL USING (
  branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager', 'vm')
);

GRANT SELECT ON vm_reports TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 7. AUTO-GENERATE AI INSIGHT ON LOW COMPLIANCE
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_ai_insight_on_report()
RETURNS TRIGGER AS $$
DECLARE
  br_name TEXT;
BEGIN
  -- Generate insight for low compliance
  IF NEW.compliance_score IS NOT NULL AND NEW.compliance_score < 70 AND NEW.status = 'submitted' THEN
    SELECT name INTO br_name FROM branches WHERE id = NEW.branch_id;
    INSERT INTO ai_insights (branch_id, insight_type, severity, title, content)
    VALUES (
      NEW.branch_id,
      'alert',
      'critical',
      'Low Compliance Alert — ' || br_name,
      br_name || ' submitted a report with ' || ROUND(NEW.compliance_score, 0) || '% compliance (below 70% threshold). Immediate operational review recommended.'
    );
  END IF;

  -- Generate insight for excellent compliance
  IF NEW.compliance_score IS NOT NULL AND NEW.compliance_score >= 95 AND NEW.status = 'submitted' THEN
    SELECT name INTO br_name FROM branches WHERE id = NEW.branch_id;
    INSERT INTO ai_insights (branch_id, insight_type, severity, title, content)
    VALUES (
      NEW.branch_id,
      'recommendation',
      'info',
      'Top Performance — ' || br_name,
      br_name || ' achieved ' || ROUND(NEW.compliance_score, 0) || '% compliance. Share operational practices as best case for other branches.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_insight_report ON reports;
CREATE TRIGGER trg_ai_insight_report
  AFTER INSERT OR UPDATE OF compliance_score ON reports
  FOR EACH ROW EXECUTE FUNCTION auto_ai_insight_on_report();

-- ────────────────────────────────────────────────────────────────────
-- 8. MISSING REPORT DETECTION FUNCTION
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION detect_missing_reports()
RETURNS INTEGER AS $$
DECLARE
  missing_count INTEGER;
  br RECORD;
BEGIN
  missing_count := 0;
  FOR br IN
    SELECT b.id, b.name
    FROM branches b
    WHERE b.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM reports r
      WHERE r.branch_id = b.id
      AND r.report_date = CURRENT_DATE
      AND r.status != 'draft'
      AND r.is_deleted = false
    )
  LOOP
    missing_count := missing_count + 1;

    -- Create AI insight
    INSERT INTO ai_insights (branch_id, insight_type, severity, title, content)
    VALUES (
      br.id, 'alert', 'warning',
      'Missing Report — ' || br.name,
      br.name || ' has not submitted an operational report today. Follow up required.'
    )
    ON CONFLICT DO NOTHING;

    -- Notify admins and area managers
    INSERT INTO notifications (user_id, title, message, type, link_type, link_id)
    SELECT id, 'Missing Report', br.name || ' has not submitted today''s report', 'warning'::notification_type, 'branch', br.id
    FROM profiles
    WHERE role IN ('admin', 'area_manager') AND is_active = true;
  END LOOP;

  RETURN missing_count;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────
-- 9. SHIFT SCHEDULES TABLE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  schedule_date DATE NOT NULL,
  shift shift_type NOT NULL,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, schedule_date)
);

ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shift access" ON shift_schedules FOR ALL USING (
  user_id = auth.uid() OR branch_id = auth_branch_id() OR auth_role() IN ('admin', 'area_manager')
);

-- ────────────────────────────────────────────────────────────────────
-- 10. ADD REALTIME FOR NEW TABLES
-- ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE daily_sales;
  ALTER PUBLICATION supabase_realtime ADD TABLE customer_readiness;
  ALTER PUBLICATION supabase_realtime ADD TABLE vm_reports;
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────
-- 11. SEED SAMPLE TARGETS (for demo)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO sales_targets (branch_id, target_month, monthly_target)
SELECT id, DATE_TRUNC('month', CURRENT_DATE)::DATE, 350000 + (ROW_NUMBER() OVER()) * 15000
FROM branches
WHERE is_active = true
ON CONFLICT (branch_id, target_month) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- MIGRATION PART 3 COMPLETE
-- ══════════════════════════════════════════════════════════════════════
