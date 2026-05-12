// ═══════════════════════════════════════════════════════════════════════
// RAVIN ACADEMY — Supabase Edge Function
// daily-insights: Auto-generates AI operational insights every morning
//
// Deploy: supabase functions deploy daily-insights
// Schedule: Set up a pg_cron job or Supabase webhook to call this daily at 8 AM
//
// Invoke manually:
// curl -X POST https://pjrrfghzoejdaeqcggwm.supabase.co/functions/v1/daily-insights \
//   -H "Authorization: Bearer YOUR_ANON_KEY"
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://pjrrfghzoejdaeqcggwm.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get branch health data
    const { data: health, error: healthErr } = await supabase
      .from("branch_health")
      .select("*")
      .order("health_score", { ascending: true });

    if (healthErr) throw healthErr;

    // 2. Get today's reports
    const today = new Date().toISOString().split("T")[0];
    const { data: reports } = await supabase
      .from("reports")
      .select("branch_id, compliance_score, status")
      .eq("report_date", today)
      .eq("is_deleted", false)
      .neq("status", "draft");

    // 3. Get overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, branch_id")
      .eq("is_overdue", true)
      .eq("is_deleted", false)
      .not("status", "in", '("completed","rejected")');

    // 4. Get open incidents
    const { data: incidents } = await supabase
      .from("incidents")
      .select("id, title, branch_id, severity")
      .eq("status", "open")
      .eq("is_deleted", false);

    // 5. Get all branches
    const { data: branches } = await supabase
      .from("branches")
      .select("id, name")
      .eq("is_active", true);

    const branchMap = Object.fromEntries((branches || []).map(b => [b.id, b.name]));
    const reportedBranches = new Set((reports || []).map(r => r.branch_id));
    const insights = [];

    // ─── Generate Insights ───

    // Crisis branches
    (health || []).filter(b => b.health_status === "crisis").forEach(b => {
      insights.push({
        branch_id: b.branch_id,
        insight_type: "alert",
        severity: "critical",
        title: `🔴 Crisis — ${b.branch_name}`,
        content: `${b.branch_name} health score is ${b.health_score}%. Compliance: ${Math.round(b.avg_compliance || 0)}%. ${b.open_incidents} open incidents. Immediate intervention required.`,
      });
    });

    // Risk branches
    (health || []).filter(b => b.health_status === "risk").forEach(b => {
      insights.push({
        branch_id: b.branch_id,
        insight_type: "alert",
        severity: "warning",
        title: `🟡 At Risk — ${b.branch_name}`,
        content: `${b.branch_name} health at ${b.health_score}%. ${b.overdue_tasks} overdue tasks. Monitor closely and review operational standards.`,
      });
    });

    // Missing reports
    (branches || []).filter(b => !reportedBranches.has(b.id)).forEach(b => {
      insights.push({
        branch_id: b.id,
        insight_type: "alert",
        severity: "warning",
        title: `📋 Missing Report — ${b.name}`,
        content: `${b.name} has not submitted today's operational report. Follow up required.`,
      });
    });

    // Overdue tasks summary
    if ((overdueTasks || []).length > 0) {
      const byBranch = {};
      overdueTasks.forEach(t => {
        const bn = branchMap[t.branch_id] || "Unassigned";
        byBranch[bn] = (byBranch[bn] || 0) + 1;
      });
      const summary = Object.entries(byBranch).map(([b, c]) => `${b}: ${c}`).join(", ");
      insights.push({
        insight_type: "alert",
        severity: "warning",
        title: `⏰ ${overdueTasks.length} Overdue Tasks`,
        content: `Tasks past deadline: ${summary}. Review and escalate as needed.`,
      });
    }

    // Critical incidents
    (incidents || []).filter(i => i.severity === "critical").forEach(i => {
      insights.push({
        branch_id: i.branch_id,
        insight_type: "alert",
        severity: "critical",
        title: `⚠ Critical Incident — ${branchMap[i.branch_id] || "Unknown"}`,
        content: `"${i.title}" is open and unresolved. SLA may be breached. Escalate immediately.`,
      });
    });

    // Top performers
    (health || []).filter(b => b.health_status === "healthy" && b.avg_compliance >= 90).forEach(b => {
      insights.push({
        branch_id: b.branch_id,
        insight_type: "recommendation",
        severity: "info",
        title: `✅ Top Performer — ${b.branch_name}`,
        content: `${b.branch_name} health score ${b.health_score}%, compliance ${Math.round(b.avg_compliance)}%. Share best practices with other branches.`,
      });
    });

    // Daily summary
    const avgHealth = health?.length
      ? Math.round(health.reduce((s, b) => s + b.health_score, 0) / health.length)
      : 0;
    insights.push({
      insight_type: "recommendation",
      severity: "info",
      title: `📊 Daily Summary — ${today}`,
      content: `${reports?.length || 0}/${branches?.length || 0} reports submitted. Avg health: ${avgHealth}%. ${(overdueTasks || []).length} overdue tasks. ${(incidents || []).filter(i => i.severity === "critical").length} critical incidents.`,
    });

    // 6. Deactivate old insights (older than 24h)
    await supabase
      .from("ai_insights")
      .update({ is_active: false })
      .lt("generated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // 7. Insert new insights
    if (insights.length > 0) {
      const { error: insertErr } = await supabase
        .from("ai_insights")
        .insert(insights);
      if (insertErr) throw insertErr;
    }

    // 8. Run overdue task checker
    await supabase.rpc("check_all_overdue_tasks");

    // 9. Run missing report detector
    await supabase.rpc("detect_missing_reports");

    return new Response(
      JSON.stringify({
        success: true,
        insights_generated: insights.length,
        date: today,
        summary: {
          total_branches: branches?.length || 0,
          reports_submitted: reports?.length || 0,
          overdue_tasks: (overdueTasks || []).length,
          open_incidents: (incidents || []).length,
          avg_health: avgHealth,
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
