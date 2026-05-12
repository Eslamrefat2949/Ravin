-- ══════════════════════════════════════════════════════════════════════
-- RAVIN ACADEMY — SCHEDULED JOBS (pg_cron)
-- Run this AFTER all 3 migrations
--
-- NOTE: pg_cron must be enabled in your Supabase project
-- Go to: Database → Extensions → Enable pg_cron
-- ══════════════════════════════════════════════════════════════════════

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- ────────────────────────────────────────────────────────────────────
-- 1. CHECK OVERDUE TASKS — Every 30 minutes
-- ────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'check-overdue-tasks',
  '*/30 * * * *',  -- every 30 minutes
  $$SELECT check_all_overdue_tasks()$$
);

-- ────────────────────────────────────────────────────────────────────
-- 2. DETECT MISSING REPORTS — Daily at 11:00 AM Cairo time (09:00 UTC)
-- ────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'detect-missing-reports',
  '0 9 * * *',  -- 09:00 UTC = 11:00 AM Cairo
  $$SELECT detect_missing_reports()$$
);

-- ────────────────────────────────────────────────────────────────────
-- 3. DEACTIVATE OLD AI INSIGHTS — Daily at midnight
-- ────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-old-insights',
  '0 0 * * *',  -- midnight UTC
  $$UPDATE ai_insights SET is_active = false WHERE generated_at < now() - interval '48 hours' AND is_active = true$$
);

-- ────────────────────────────────────────────────────────────────────
-- 4. AUTO-GENERATE DAILY AI BRIEF — Daily at 8:00 AM Cairo (06:00 UTC)
-- ────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'daily-ai-brief',
  '0 6 * * *',  -- 06:00 UTC = 08:00 AM Cairo
  $$
  -- Insert daily summary insight
  INSERT INTO ai_insights (insight_type, severity, title, content)
  SELECT
    'recommendation',
    'info',
    '📊 AI Morning Brief — ' || CURRENT_DATE::TEXT,
    'Reports: ' || (SELECT COUNT(*) FROM reports WHERE report_date = CURRENT_DATE - 1 AND is_deleted = false AND status != 'draft') || ' submitted yesterday. ' ||
    'Avg compliance: ' || COALESCE((SELECT ROUND(AVG(compliance_score), 0)::TEXT FROM reports WHERE report_date = CURRENT_DATE - 1 AND compliance_score > 0), 'N/A') || '%. ' ||
    'Open tasks: ' || (SELECT COUNT(*) FROM tasks WHERE is_deleted = false AND status NOT IN ('completed', 'rejected')) || '. ' ||
    'Open incidents: ' || (SELECT COUNT(*) FROM incidents WHERE status IN ('open', 'in_progress') AND is_deleted = false) || '. ' ||
    'Focus areas: ' || COALESCE(
      (SELECT string_agg(name, ', ' ORDER BY name) FROM branches b
       WHERE NOT EXISTS (
         SELECT 1 FROM reports r WHERE r.branch_id = b.id AND r.report_date = CURRENT_DATE - 1 AND r.status != 'draft' AND r.is_deleted = false
       ) AND b.is_active = true),
      'All branches reported'
    ) || ' did not report yesterday.';
  $$
);

-- ────────────────────────────────────────────────────────────────────
-- 5. CLEAN UP READ NOTIFICATIONS — Weekly on Sunday
-- ────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * 0',  -- 02:00 UTC every Sunday
  $$DELETE FROM notifications WHERE is_read = true AND created_at < now() - interval '30 days'$$
);

-- ────────────────────────────────────────────────────────────────────
-- 6. CLEAN UP OLD ACTIVITY LOGS — Monthly on 1st
-- ────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-old-activity',
  '0 3 1 * *',  -- 03:00 UTC on 1st of month
  $$DELETE FROM activity_logs WHERE created_at < now() - interval '90 days'$$
);

-- ────────────────────────────────────────────────────────────────────
-- VIEW SCHEDULED JOBS
-- ────────────────────────────────────────────────────────────────────
-- SELECT * FROM cron.job;

-- TO REMOVE A JOB:
-- SELECT cron.unschedule('job-name');

-- ══════════════════════════════════════════════════════════════════════
-- CRON SETUP COMPLETE
-- ══════════════════════════════════════════════════════════════════════
