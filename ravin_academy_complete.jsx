import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ═══════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════
const SB_URL = "https://pjrrfghzoejdaeqcggwm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcnJmZ2h6b2VqZGFlcWNnZ3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTUyMTUsImV4cCI6MjA5NDAzMTIxNX0.l8qaGu5RugONzN--mqzFwJqWAUgrmCWVghHgycVK_ws";

const sb = (() => {
  let _tk = localStorage.getItem("sb_token");
  const hd = (x = {}) => ({ apikey: SB_KEY, "Content-Type": "application/json", ...(_tk ? { Authorization: `Bearer ${_tk}` } : {}), ...x });

  const q = async (table, opts = {}) => {
    const { method = "GET", body, qs = "", single, headers: xh } = opts;
    const h = { ...hd(xh) };
    if (single) h.Accept = "application/vnd.pgrst.object+json";
    if (method === "POST" || method === "PATCH") h.Prefer = "return=representation";
    const r = await fetch(`${SB_URL}/rest/v1/${table}${qs ? "?" + qs : ""}`, { method, headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || e.details || r.statusText); }
    if (r.status === 204) return null;
    return r.json();
  };

  const rpc = async (fn, params = {}) => {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: hd(), body: JSON.stringify(params) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText); }
    return r.json();
  };

  return {
    q, rpc,
    setToken: t => { _tk = t; if (t) localStorage.setItem("sb_token", t); else localStorage.removeItem("sb_token"); },
    signIn: async (email, pw) => {
      const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error_description || e.msg || "Invalid credentials"); }
      const d = await r.json(); _tk = d.access_token;
      localStorage.setItem("sb_token", d.access_token); localStorage.setItem("sb_refresh", d.refresh_token);
      return d;
    },
    signOut: async () => {
      if (_tk) await fetch(`${SB_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${_tk}` } }).catch(() => {});
      _tk = null; localStorage.removeItem("sb_token"); localStorage.removeItem("sb_refresh");
    },
    getUser: async () => {
      if (!_tk) return null;
      const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${_tk}` } });
      if (!r.ok) { _tk = null; localStorage.removeItem("sb_token"); return null; }
      return r.json();
    },
    upload: async (bucket, path, file) => {
      const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
        method: "POST", headers: { apikey: SB_KEY, ...(_tk ? { Authorization: `Bearer ${_tk}` } : {}), "Content-Type": file.type }, body: file,
      });
      if (!r.ok) throw new Error("Upload failed");
      return `${SB_URL}/storage/v1/object/public/${bucket}/${path}`;
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const C = { bg:"#09090B",card:"#18181D",text:"#ECEBE6",sub:"#8B8A85",muted:"#55544F",dim:"#333330",
  gold:"#C89B4A",goldSoft:"rgba(200,155,74,0.12)",goldBdr:"rgba(200,155,74,0.25)",
  green:"#34A06C",greenS:"rgba(52,160,108,0.12)",red:"#D04545",redS:"rgba(208,69,69,0.12)",
  amber:"#C47F1A",amberS:"rgba(196,127,26,0.12)",blue:"#3A7DD6",blueS:"rgba(58,125,214,0.12)",
  purple:"#7B5CC4",bdr:"rgba(255,255,255,0.06)",bdrH:"rgba(255,255,255,0.12)" };

const SEC = [
  {code:"opening",title:"Opening Operations",icon:"🏪",items:["Store opened on time","Lights & displays checked","Music & screens operational","AC & climate correct","Cleanliness completed","Window display verified","VM standards reviewed","Feature areas organized","Price tags audited"]},
  {code:"team",title:"Team Management",icon:"👥",items:["Attendance taken","Grooming checked","Uniform compliance","Morning briefing done","Daily target shared","KPIs explained","Focus categories assigned","Team motivation done"]},
  {code:"cashier",title:"Cashier & Finance",icon:"💳",items:["Cash float verified","POS operational","Payment devices tested","Deposit done","Safe checked","Cash drawers organized"]},
  {code:"stock",title:"Stock & Operations",icon:"📦",items:["Deliveries processed","Replenishment done","Stockroom organized","Out-of-stock reviewed","Damaged items tagged","Returns processed"]},
  {code:"sales",title:"Sales & CX",icon:"📊",items:["Conversion monitored","UPT tracked","ATV monitored","Traffic counted","Complaints handled","Cross-selling active","Service quality OK"]},
  {code:"admin",title:"Administrative",icon:"📋",items:["Report submitted","Dashboard updated","SOP compliance reviewed","Area Manager updated","Team meeting done","Action plan active"]},
  {code:"closing",title:"Closing Operations",icon:"🔒",items:["Final cash counted","Sales reconciled","POS closed","Store cleaned","Alarm set","Closing report done"]},
];
const ALL_ITEMS = SEC.flatMap(s => s.items.map(item => ({ sec: s.code, item })));
const TOTAL_ITEMS = ALL_ITEMS.length;

// ═══════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════
const fmt = n => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(Math.round(n));
const cCol = c => c >= 90 ? C.green : c >= 80 ? C.blue : c >= 70 ? C.amber : C.red;
const cLbl = c => c >= 90 ? "Excellent" : c >= 80 ? "Good" : c >= 70 ? "Attention" : "Critical";
const cBg = c => c >= 90 ? C.greenS : c >= 80 ? C.blueS : c >= 70 ? C.amberS : C.redS;
const hI = s => ({ healthy: "☀️", attention: "⛅", risk: "🌧️", crisis: "⛈️" }[s] || "—");
const hC = s => ({ healthy: C.green, attention: C.amber, risk: C.red, crisis: "#8B1A1A" }[s] || C.sub);
const pC = p => ({ critical: C.red, high: C.amber, medium: C.blue, low: C.sub }[p] || C.sub);

function Ring({ pct, size = 48, sw = 4, color = C.gold }) {
  const r = (size - sw) / 2, ci = 2 * Math.PI * r, d = (Math.min(pct || 0, 100) / 100) * ci;
  return (<svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
      strokeDasharray={`${d} ${ci}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
  </svg>);
}
function Bar({ val, max = 100, color = C.gold, h = 3 }) {
  return (<div style={{ width: "100%", height: h, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
    <div style={{ width: `${Math.min((val || 0) / max * 100, 100)}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s" }} />
  </div>);
}
function Chip({ text, color, bg }) { return <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color, background: bg, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{text}</span>; }
function GCard({ children, style: s = {}, onClick, glow }) {
  const [h, setH] = useState(false);
  return (<div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}
    style={{ background: C.card, border: `1px solid ${h && onClick ? C.bdrH : C.bdr}`, borderRadius: 14,
      transition: "all 0.2s", cursor: onClick ? "pointer" : "default",
      boxShadow: glow ? `0 0 20px ${glow}` : "none", transform: h && onClick ? "translateY(-1px)" : "none", ...s }}>
    {children}</div>);
}
function Btn({ children, onClick, v = "default", sz = "md", style: s = {}, disabled }) {
  const S = { sm: { fontSize: 10, padding: "5px 11px" }, md: { fontSize: 11, padding: "7px 15px" }, lg: { fontSize: 12, padding: "9px 20px" } };
  const V = { default: { background: "rgba(255,255,255,0.07)", color: C.text, border: `1px solid ${C.bdr}` },
    gold: { background: C.gold, color: "#0A0A0A", border: "none" }, ghost: { background: "transparent", color: C.sub, border: "none" },
    danger: { background: C.redS, color: C.red, border: `1px solid ${C.red}30` } };
  return (<button onClick={onClick} disabled={disabled} style={{ ...S[sz], ...V[v], cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", fontWeight: 700, borderRadius: 8, transition: "all 0.15s", opacity: disabled ? .5 : 1, ...s }}>{children}</button>);
}
function SBadge({ status }) {
  const m = { approved: { c: C.green, bg: C.greenS, l: "Approved" }, submitted: { c: C.blue, bg: C.blueS, l: "Submitted" },
    pending_review: { c: C.amber, bg: C.amberS, l: "Pending" }, rejected: { c: C.red, bg: C.redS, l: "Rejected" }, draft: { c: C.muted, bg: "rgba(255,255,255,0.05)", l: "Draft" },
    pending: { c: C.sub, bg: "rgba(255,255,255,0.05)", l: "Pending" }, in_progress: { c: C.blue, bg: C.blueS, l: "In Progress" },
    waiting_approval: { c: C.amber, bg: C.amberS, l: "Awaiting" }, completed: { c: C.green, bg: C.greenS, l: "Done" },
    escalated: { c: C.red, bg: C.redS, l: "Escalated" }, open: { c: C.red, bg: C.redS, l: "Open" }, resolved: { c: C.green, bg: C.greenS, l: "Resolved" } };
  const cfg = m[status] || { c: C.sub, bg: "rgba(255,255,255,0.05)", l: status || "—" };
  return <Chip text={cfg.l} color={cfg.c} bg={cfg.bg} />;
}
const iS = { width: "100%", padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.bdr}`, background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
function Loading({ t = "Loading..." }) { return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 14 }}><div style={{ width: 28, height: 28, border: `3px solid ${C.bdr}`, borderTop: `3px solid ${C.gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} /><div style={{ fontSize: 11, color: C.sub }}>{t}</div></div>); }
function Empty({ icon = "📭", title, msg, action, onAction }) { return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 12 }}><div style={{ fontSize: 36 }}>{icon}</div><div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div><div style={{ fontSize: 11, color: C.sub, textAlign: "center", maxWidth: 300 }}>{msg}</div>{action && <Btn onClick={onAction} v="gold" sz="md">{action}</Btn>}</div>); }

// ═══════════════════════════════════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════════
const TC = createContext();
function TP({ children }) {
  const [t, sT] = useState([]);
  const add = (msg, type = "info") => { const id = Date.now(); sT(p => [...p, { id, msg, type }]); setTimeout(() => sT(p => p.filter(x => x.id !== id)), 4000); };
  return (<TC.Provider value={{ toast: add }}>{children}
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {t.map(x => (<div key={x.id} style={{ padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
        background: x.type === "error" ? "#3A1515" : x.type === "success" ? "#153A1F" : "#1A1A22",
        color: x.type === "error" ? C.red : x.type === "success" ? C.green : C.text,
        border: `1px solid ${x.type === "error" ? C.red + "40" : x.type === "success" ? C.green + "40" : C.bdr}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 240 }}>
        {x.type === "error" ? "⚠ " : x.type === "success" ? "✓ " : "ℹ "}{x.msg}</div>))}
    </div></TC.Provider>);
}
const useToast = () => useContext(TC);

// ═══════════════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════════
const AC = createContext();
function AP({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [ready, setReady] = useState(false);
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

  const loadProfile = async uid => {
    try { const [p] = await sb.q("profiles", { qs: `id=eq.${uid}` }); setProfile(p); } catch { setProfile(null); }
  };
  const loadBranches = async () => {
    try { setBranches(await sb.q("branches", { qs: "is_active=eq.true&order=name" }) || []); } catch { setBranches([]); }
  };

  useEffect(() => { (async () => {
    const u = await sb.getUser();
    if (u) { setUser(u); await loadProfile(u.id); await loadBranches(); }
    setReady(true);
  })(); }, []);

  const login = async (email, pw) => {
    const d = await sb.signIn(email, pw); setUser(d.user); await loadProfile(d.user.id); await loadBranches(); return d.user;
  };
  const logout = async () => { await sb.signOut(); setUser(null); setProfile(null); };

  return <AC.Provider value={{ user, profile, branches, branchMap, ready, login, logout }}>{children}</AC.Provider>;
}
const useAuth = () => useContext(AC);

// ═══════════════════════════════════════════════════════════════════════
// DATA HOOK
// ═══════════════════════════════════════════════════════════════════════
function useQ(table, qs = "", deps = []) {
  const [data, setData] = useState([]);
  const [loading, setL] = useState(true);
  const reload = useCallback(async () => {
    setL(true);
    try { setData(await sb.q(table, { qs }) || []); } catch { setData([]); }
    setL(false);
  }, [table, qs]);
  useEffect(() => { reload(); }, [reload, ...deps]);
  return { data, loading, reload };
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════
function LoginPage() {
  const { login } = useAuth(); const { toast } = useToast();
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => { if (!em || !pw) { toast("Enter email and password", "error"); return; } setBusy(true);
    try { await login(em, pw); toast("Welcome to RAVIN Academy!", "success"); } catch (e) { toast(e.message, "error"); } setBusy(false); };
  return (
    <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ position: "absolute", top: "20%", left: "30%", width: 500, height: 500, background: "radial-gradient(circle,rgba(200,155,74,0.08) 0%,transparent 60%)", pointerEvents: "none" }} />
      <div style={{ width: 400, padding: "40px 36px", background: "rgba(24,24,29,0.8)", backdropFilter: "blur(20px)", borderRadius: 20, border: `1px solid ${C.bdr}`, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg,${C.gold},${C.gold}88)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#0A0A0A", marginBottom: 12 }}>R</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.1em", color: C.text }}>RAVIN <span style={{ color: C.gold }}>ACADEMY</span></div>
          <div style={{ fontSize: 9, color: C.sub, letterSpacing: "0.22em", marginTop: 5 }}>MAKE UR WORLD TO BE PROUD</div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>EMAIL</label>
          <input value={em} onChange={e => setEm(e.target.value)} placeholder="you@ravin.academy" onKeyDown={e => e.key === "Enter" && go()} style={iS} /></div>
        <div style={{ marginBottom: 20 }}><label style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>PASSWORD</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} style={iS} /></div>
        <Btn onClick={go} v="gold" sz="lg" disabled={busy} style={{ width: "100%", fontSize: 13 }}>{busy ? "Signing in..." : "Sign In →"}</Btn>
        <div style={{ marginTop: 16, padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${C.bdr}` }}>
          <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.7 }}>
            <strong style={{ color: C.sub }}>Setup:</strong> Run both SQL migrations in Supabase SQL Editor → Create user in Auth → Update profile role → Sign in
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function Sidebar({ pg, setPg, profile, nC }) {
  const { logout } = useAuth();
  const nav = [
    { id: "dash", label: "Dashboard", icon: "◈", g: "CORE" }, { id: "reports", label: "Reports", icon: "◉", g: "OPS" },
    { id: "new_report", label: "New Report", icon: "✚", g: "OPS", hl: true }, { id: "tasks", label: "Tasks", icon: "☰", g: "OPS" },
    { id: "new_task", label: "New Task", icon: "+", g: "OPS", hl: true }, { id: "incidents", label: "Incidents", icon: "⚠", g: "OPS" },
    { id: "branches", label: "Stores", icon: "⊡", g: "STORES" }, { id: "employees", label: "Employees", icon: "◑", g: "PEOPLE" },
    { id: "learning", label: "Learning", icon: "⊞", g: "PEOPLE" }, { id: "ai", label: "AI Insights", icon: "✦", g: "INTEL" },
    { id: "notifs", label: "Notifications", icon: "◎", badge: nC, g: "INTEL" }, { id: "activity", label: "Activity Log", icon: "≡", g: "INTEL" },
    ...(profile?.role === "admin" ? [{ id: "users", label: "Users", icon: "⊕", g: "ADMIN" }] : []),
  ];
  const gs = [...new Set(nav.map(n => n.g))];
  return (
    <aside style={{ width: 216, minHeight: "100vh", background: "rgba(9,9,11,0.98)", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 200, borderRight: `1px solid ${C.bdr}` }}>
      <div style={{ padding: "20px 18px 12px", borderBottom: `1px solid ${C.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${C.gold},${C.gold}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#0A0A0A" }}>R</div>
          <div><div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", color: C.text, lineHeight: 1 }}>RAVIN <span style={{ color: C.gold }}>ACADEMY</span></div>
            <div style={{ fontSize: 7, color: C.muted, letterSpacing: "0.18em", marginTop: 2 }}>MAKE UR WORLD TO BE PROUD</div></div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {gs.map(g => (<div key={g}><div style={{ fontSize: 8, fontWeight: 700, color: C.dim, letterSpacing: "0.14em", padding: "10px 10px 4px" }}>{g}</div>
          {nav.filter(n => n.g === g).map(n => (
            <button key={n.id} onClick={() => setPg(n.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: pg === n.id ? C.goldSoft : n.hl ? "rgba(200,155,74,0.05)" : "transparent", color: pg === n.id ? C.gold : n.hl ? `${C.gold}88` : C.sub, fontSize: 10.5, fontWeight: pg === n.id ? 700 : 400, transition: "all 0.15s", marginBottom: 1, textAlign: "left", fontFamily: "inherit", borderLeft: pg === n.id ? `2px solid ${C.gold}` : "2px solid transparent" }}>
              <span style={{ fontSize: 12, width: 16, textAlign: "center", flexShrink: 0 }}>{n.icon}</span><span style={{ flex: 1 }}>{n.label}</span>
              {n.badge > 0 && <span style={{ background: C.red, color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 10, padding: "1px 5px" }}>{n.badge}</span>}
            </button>))}</div>))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},${C.gold}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#0A0A0A", flexShrink: 0 }}>{(profile?.full_name || "U").split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
          <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name}</div>
            <div style={{ fontSize: 8, color: C.muted }}>{profile?.role?.replace("_", " ")}</div></div>
          <button onClick={logout} title="Sign Out" style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: 11, padding: 3 }}>⏻</button>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function Dash({ setPg }) {
  const { branches, branchMap } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const { data: reports, loading: rl } = useQ("reports", `report_date=eq.${today}&is_deleted=eq.false&status=neq.draft&order=created_at.desc`);
  const { data: tasks } = useQ("tasks", "is_deleted=eq.false&status=neq.completed&order=created_at.desc&limit=10");
  const { data: incidents } = useQ("incidents", "status=eq.open&is_deleted=eq.false");
  const { data: health } = useQ("branch_health", "order=health_score.desc");
  const { data: insights } = useQ("ai_insights", "is_active=eq.true&order=generated_at.desc&limit=6");

  const avgComp = reports.length ? Math.round(reports.filter(r => r.compliance_score > 0).reduce((s, r) => s + +r.compliance_score, 0) / Math.max(reports.filter(r => r.compliance_score > 0).length, 1)) : 0;
  const missing = branches.length - new Set(reports.map(r => r.branch_id)).size;

  if (rl) return <Loading t="Loading dashboard..." />;

  return (<div>
    {/* AI Brief */}
    {insights.length > 0 && (
      <div style={{ background: "rgba(9,9,11,0.95)", borderRadius: 14, padding: "18px 22px", marginBottom: 20, border: `1px solid ${C.goldBdr}`, boxShadow: `0 0 28px ${C.goldSoft}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.12em" }}>RAVIN ACADEMY · AI BRIEF</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 5 }}>
          {insights.map(ins => (<div key={ins.id} style={{ padding: "6px 10px", borderRadius: 7, background: ins.severity === "critical" ? C.redS : ins.severity === "warning" ? C.amberS : "rgba(255,255,255,0.02)", border: `1px solid ${ins.severity === "critical" ? C.red + "20" : C.bdr}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{ins.title}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{ins.content}</div></div>))}
        </div>
      </div>
    )}
    {/* KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8, marginBottom: 20 }}>
      {[{ l: "Reports Today", v: reports.length, c: C.gold, click: () => setPg("reports") }, { l: "Compliance", v: avgComp ? `${avgComp}%` : "—", c: cCol(avgComp), ring: avgComp > 0, rp: avgComp },
      { l: "Missing", v: Math.max(missing, 0), c: missing > 0 ? C.red : C.green, click: () => setPg("reports") }, { l: "Tasks", v: tasks.length, c: C.blue, click: () => setPg("tasks") },
      { l: "Incidents", v: incidents.length, c: incidents.length ? C.red : C.green, click: () => setPg("incidents") }, { l: "Stores", v: branches.length, c: C.gold, click: () => setPg("branches") },
      ].map((k, i) => (<GCard key={i} onClick={k.click} style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{k.l}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: k.c }}>{k.v}</div>
          {k.ring && <Ring pct={k.rp} size={34} sw={3} color={k.c} />}</div>
      </GCard>))}
    </div>
    {/* Branch Health */}
    {health.length > 0 && (<div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: "0.06em", marginBottom: 10 }}>STORE HEALTH</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
        {health.map(b => (<GCard key={b.branch_id} onClick={() => setPg("branches")} style={{ padding: "14px 18px" }} glow={b.health_status === "crisis" ? C.redS : null}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 2 }}>{b.branch_name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11 }}>{hI(b.health_status)}</span>
                <span style={{ fontSize: 9, color: hC(b.health_status), fontWeight: 600, textTransform: "capitalize" }}>{b.health_status}</span></div></div>
            <Ring pct={b.health_score} size={34} sw={3} color={hC(b.health_status)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[{ l: "Health", v: `${b.health_score}%`, c: hC(b.health_status) }, { l: "Comp", v: b.avg_compliance ? `${Math.round(b.avg_compliance)}%` : "—", c: C.gold }, { l: "Tasks", v: `${b.completed_tasks}/${b.total_tasks}`, c: C.blue }].map(x => (
              <div key={x.l} style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 5, padding: "4px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 7, color: C.muted, textTransform: "uppercase" }}>{x.l}</div></div>))}
          </div>
        </GCard>))}
      </div>
    </div>)}
    {/* Recent */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <GCard style={{ padding: "16px 20px" }}><div style={{ fontSize: 10, fontWeight: 700, color: C.sub, marginBottom: 10 }}>RECENT REPORTS</div>
        {reports.length === 0 ? <div style={{ fontSize: 10, color: C.muted, padding: 16, textAlign: "center" }}>No reports today</div> :
          reports.slice(0, 5).map(r => (<div key={r.id} onClick={() => setPg("reports")} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.bdr}`, cursor: "pointer" }}>
            <div><div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{branchMap[r.branch_id] || "—"}</div>
              <div style={{ fontSize: 9, color: C.muted }}>{r.shift} · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {r.compliance_score > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: cCol(r.compliance_score) }}>{Math.round(r.compliance_score)}%</span>}
              <SBadge status={r.status} /></div></div>))}</GCard>
      <GCard style={{ padding: "16px 20px" }}><div style={{ fontSize: 10, fontWeight: 700, color: C.sub, marginBottom: 10 }}>ACTIVE TASKS</div>
        {tasks.length === 0 ? <div style={{ fontSize: 10, color: C.muted, padding: 16, textAlign: "center" }}>No tasks</div> :
          tasks.slice(0, 5).map(t => (<div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
            <div><div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{t.title}</div>
              <div style={{ fontSize: 9, color: C.muted }}>{branchMap[t.branch_id] || "—"}</div></div>
            <SBadge status={t.status} /></div>))}</GCard>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS LIST
// ═══════════════════════════════════════════════════════════════════════
function ReportsPage({ setPg, setCtx }) {
  const { data, loading, reload } = useQ("reports", "is_deleted=eq.false&order=created_at.desc&limit=100");
  const { branchMap } = useAuth();
  if (loading) return <Loading />;
  if (!data.length) return <Empty icon="📋" title="No reports" msg="Submit your first report." action="+ New Report" onAction={() => setPg("new_report")} />;
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.sub }}>{data.length} reports</div>
      <Btn onClick={() => setPg("new_report")} v="gold" sz="md">+ New Report</Btn></div>
    <GCard style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
          {["Branch", "Shift", "Compliance", "Status", "Date"].map(h => (<th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 8, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
        <tbody>{data.map(r => (<tr key={r.id} onClick={() => { setCtx(r); setPg("rpt_detail"); }} style={{ borderBottom: `1px solid ${C.bdr}`, cursor: "pointer" }}>
          <td style={{ padding: "10px 14px", fontWeight: 700, color: C.text }}>{branchMap[r.branch_id] || "—"}</td>
          <td style={{ padding: "10px 14px", color: C.sub, textTransform: "capitalize" }}>{r.shift?.replace("_", " ")}</td>
          <td style={{ padding: "10px 14px" }}>{r.compliance_score > 0 ? <><span style={{ fontWeight: 700, color: cCol(r.compliance_score) }}>{Math.round(r.compliance_score)}%</span> <Chip text={cLbl(r.compliance_score)} color={cCol(r.compliance_score)} bg={cBg(r.compliance_score)} /></> : <span style={{ color: C.muted }}>—</span>}</td>
          <td style={{ padding: "10px 14px" }}><SBadge status={r.status} /></td>
          <td style={{ padding: "10px 14px", color: C.muted, fontSize: 9 }}>{new Date(r.created_at).toLocaleDateString()}</td>
        </tr>))}</tbody>
      </table></GCard>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// REPORT DETAIL — FULL DRILL-DOWN WITH APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════════════
function ReportDetail({ rpt, setPg }) {
  const { profile, branchMap } = useAuth(); const { toast } = useToast();
  const { data: answers, loading } = useQ("report_answers_summary", `report_id=eq.${rpt?.id}&order=sort_order,item_text`);
  const { data: approvals } = useQ("approvals", `report_id=eq.${rpt?.id}&order=created_at.desc`);
  const { data: comments, reload: reloadComments } = useQ("comments", `report_id=eq.${rpt?.id}&order=created_at.desc`);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (!rpt) { setPg("reports"); return null; }

  const approve = async (action) => {
    setBusy(true);
    try {
      await sb.rpc("approve_report", { p_report_id: rpt.id, p_reviewer_id: profile.id, p_action: action, p_comment: comment || null });
      toast(`Report ${action}!`, action === "approved" ? "success" : "error");
      setPg("reports");
    } catch (e) { toast(e.message, "error"); }
    setBusy(false);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await sb.q("comments", { method: "POST", body: { report_id: rpt.id, user_id: profile.id, content: comment } });
      setComment(""); reloadComments(); toast("Comment added", "success");
    } catch (e) { toast(e.message, "error"); }
  };

  const grouped = {};
  answers.forEach(a => { if (!grouped[a.section_code]) grouped[a.section_code] = { title: a.section_title, icon: a.section_icon, items: [] }; grouped[a.section_code].items.push(a); });

  const comp = rpt.compliance_score || 0;
  const canReview = profile?.role === "admin" || profile?.role === "area_manager";

  return (<div>
    <Btn onClick={() => setPg("reports")} sz="sm" style={{ marginBottom: 14 }}>← Back</Btn>
    {/* Header */}
    <GCard style={{ padding: "22px 26px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 6 }}>{branchMap[rpt.branch_id] || "Branch"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <SBadge status={rpt.status} />
            <Chip text={(rpt.shift || "").replace("_", " ")} color={C.sub} bg="rgba(255,255,255,0.05)" />
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>
            {new Date(rpt.created_at).toLocaleString()} · {rpt.shift?.replace("_", " ")} shift
          </div>
        </div>
        {comp > 0 && <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Ring pct={comp} size={56} sw={5} color={cCol(comp)} />
          <div><div style={{ fontSize: 26, fontWeight: 900, color: cCol(comp) }}>{Math.round(comp)}%</div>
            <Chip text={cLbl(comp)} color={cCol(comp)} bg={cBg(comp)} /></div></div>}
      </div>
      {/* KPIs if present */}
      {(rpt.sales_amount || rpt.upt || rpt.conversion) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.bdr}` }}>
          {[{ l: "Sales", v: rpt.sales_amount ? `EGP ${fmt(rpt.sales_amount)}` : "—" }, { l: "Target", v: rpt.target_amount ? `EGP ${fmt(rpt.target_amount)}` : "—" },
          { l: "UPT", v: rpt.upt || "—" }, { l: "ATV", v: rpt.atv ? `EGP ${rpt.atv}` : "—" },
          { l: "Conv", v: rpt.conversion ? `${rpt.conversion}%` : "—" }, { l: "Traffic", v: rpt.traffic || "—" }].map(k => (
            <div key={k.l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{k.v}</div></div>))}
        </div>)}
      {/* Approval Actions */}
      {canReview && rpt.status === "submitted" && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.bdr}`, flexWrap: "wrap" }}>
          <Btn onClick={() => approve("approved")} v="gold" sz="md" disabled={busy}>✓ Approve</Btn>
          <Btn onClick={() => approve("rejected")} v="danger" sz="md" disabled={busy}>✕ Reject</Btn>
          <div style={{ flex: 1 }} />
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Review comment (optional)" style={{ ...iS, maxWidth: 300 }} />
        </div>
      )}
    </GCard>
    {/* Checklist Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
      {[{ l: "Total", v: rpt.total_items || 0, c: C.text }, { l: "Done", v: rpt.completed_items || 0, c: C.green },
      { l: "Follow-up", v: rpt.follow_up_items || 0, c: C.amber }, { l: "Not Done", v: rpt.not_completed_items || 0, c: C.red }].map(s => (
        <GCard key={s.l} style={{ padding: "12px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
          <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", marginTop: 3 }}>{s.l}</div></GCard>))}
    </div>
    {/* Checklist Answers by Section */}
    {loading ? <Loading t="Loading answers..." /> : Object.keys(grouped).length === 0 ? <GCard style={{ padding: 20, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>No checklist answers recorded</div></GCard> :
      Object.entries(grouped).map(([code, sec]) => (
        <GCard key={code} style={{ marginBottom: 8, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{sec.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{sec.title}</span>
            <span style={{ fontSize: 9, color: C.muted, marginLeft: "auto" }}>
              {sec.items.filter(a => a.status === "completed").length}/{sec.items.length} done
            </span>
          </div>
          {sec.items.map((a, i) => {
            const col = a.status === "completed" ? C.green : a.status === "follow_up" ? C.amber : C.red;
            return (<div key={a.answer_id} style={{ padding: "10px 20px", borderBottom: i < sec.items.length - 1 ? `1px solid ${C.bdr}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", flex: 1 }}>{a.item_text}</div>
              {a.note && <div style={{ fontSize: 10, color: C.sub, fontStyle: "italic", flex: 1 }}>{a.note}</div>}
              <Chip text={a.status?.replace("_", " ")} color={col} bg={col + "15"} />
            </div>);
          })}
        </GCard>))}
    {/* Manager Notes */}
    {rpt.manager_notes && (<GCard style={{ padding: "16px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>MANAGER NOTES</div>
      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{rpt.manager_notes}</div></GCard>)}
    {/* Comments */}
    <GCard style={{ padding: "16px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>COMMENTS ({comments.length})</div>
      {comments.map(c => (<div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}>
        <div style={{ fontSize: 10, color: C.text }}>{c.content}</div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{new Date(c.created_at).toLocaleString()}</div></div>))}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment..." style={{ ...iS, flex: 1 }} onKeyDown={e => e.key === "Enter" && addComment()} />
        <Btn onClick={addComment} v="gold" sz="sm">Send</Btn></div>
    </GCard>
    {/* Approval History */}
    {approvals.length > 0 && (<GCard style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>APPROVAL HISTORY</div>
      {approvals.map(a => (<div key={a.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between" }}>
        <div><Chip text={a.action} color={a.action === "approved" ? C.green : C.red} bg={a.action === "approved" ? C.greenS : C.redS} />
          {a.comment && <span style={{ fontSize: 10, color: C.sub, marginLeft: 8 }}>{a.comment}</span>}</div>
        <div style={{ fontSize: 9, color: C.muted }}>{new Date(a.created_at).toLocaleString()}</div></div>))}</GCard>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE REPORT (same as before, keeping compact)
// ═══════════════════════════════════════════════════════════════════════
function NewReport({ setPg }) {
  const { profile, branches } = useAuth(); const { toast } = useToast();
  const [br, setBr] = useState(profile?.branch_id || ""); const [shift, setSh] = useState("opening"); const [notes, setNotes] = useState("");
  const [ans, setAns] = useState({}); const [openS, setOpenS] = useState({ opening: true }); const [kpis, setKpis] = useState({});
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  useEffect(() => { if (!br && branches.length) setBr(branches[0].id); }, [branches]);
  const setA = (sec, item, f, v) => setAns(p => ({ ...p, [`${sec}::${item}`]: { ...p[`${sec}::${item}`], [f]: v } }));
  const comp = ALL_ITEMS.filter(({ sec, item }) => ans[`${sec}::${item}`]?.status === "completed").length;
  const foll = ALL_ITEMS.filter(({ sec, item }) => ans[`${sec}::${item}`]?.status === "follow_up").length;
  const notd = ALL_ITEMS.filter(({ sec, item }) => ans[`${sec}::${item}`]?.status === "not_completed").length;
  const answered = comp + foll + notd; const compliance = answered > 0 ? Math.round(((comp + foll * .5) / TOTAL_ITEMS) * 100) : 0;

  const submit = async () => {
    if (!br) { toast("Select branch", "error"); return; } setBusy(true);
    try {
      const [report] = await sb.q("reports", { method: "POST", body: { branch_id: br, submitted_by: profile.id, shift, status: "submitted", manager_notes: notes || null, compliance_score: compliance, total_items: TOTAL_ITEMS, completed_items: comp, follow_up_items: foll, not_completed_items: notd, sales_amount: kpis.Sales ? +kpis.Sales : null, target_amount: kpis.Target ? +kpis.Target : null, upt: kpis.UPT ? +kpis.UPT : null, atv: kpis.ATV ? +kpis.ATV : null, conversion: kpis.Conv ? +kpis.Conv : null, traffic: kpis.Traffic ? +kpis.Traffic : null } });
      const sections = await sb.q("report_sections", { qs: "order=sort_order" });
      const sMap = Object.fromEntries(sections.map(s => [s.code, s.id]));
      const rows = ALL_ITEMS.filter(({ sec, item }) => ans[`${sec}::${item}`]?.status).map(({ sec, item }) => ({ report_id: report.id, section_id: sMap[sec], item_text: item, status: ans[`${sec}::${item}`].status, note: ans[`${sec}::${item}`].note || null, answered_by: profile.id }));
      if (rows.length) await sb.q("report_answers", { method: "POST", body: rows });
      await sb.q("activity_logs", { method: "POST", body: { user_id: profile.id, branch_id: br, action: "Submitted report", entity_type: "report", entity_id: report.id } });
      toast("Report submitted!", "success"); setDone(true);
    } catch (e) { toast(e.message, "error"); } setBusy(false);
  };

  if (done) return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
    <div style={{ fontSize: 48 }}>✅</div><div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>Report Submitted</div>
    <div style={{ fontSize: 12, color: C.sub }}>Compliance: <strong style={{ color: cCol(compliance) }}>{compliance}%</strong></div>
    <GCard style={{ padding: "18px 32px", textAlign: "center" }}><div style={{ fontSize: 36, fontWeight: 900, color: cCol(compliance) }}>{compliance}%</div></GCard>
    <div style={{ display: "flex", gap: 10 }}><Btn onClick={() => setPg("reports")} v="gold" sz="lg">View Reports</Btn><Btn onClick={() => { setDone(false); setAns({}); }} sz="lg">New Report</Btn></div></div>);

  return (<div style={{ maxWidth: 820, margin: "0 auto" }}>
    <div style={{ position: "sticky", top: 52, zIndex: 80, background: "rgba(9,9,11,0.97)", backdropFilter: "blur(16px)", padding: "10px 0", marginBottom: 16, borderBottom: `1px solid ${C.bdr}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ring pct={compliance} size={42} sw={4} color={cCol(compliance)} /><div><div style={{ fontSize: 16, fontWeight: 900, color: cCol(compliance) }}>{compliance}%</div><div style={{ fontSize: 8, color: C.muted }}>Compliance</div></div></div>
        <div style={{ display: "flex", gap: 12, flex: 1 }}>{[{ l: "Done", v: comp, c: C.green }, { l: "Follow", v: foll, c: C.amber }, { l: "Not", v: notd, c: C.red }, { l: "Left", v: TOTAL_ITEMS - answered, c: C.muted }].map(x => (<div key={x.l} style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 7, color: C.muted, textTransform: "uppercase" }}>{x.l}</div></div>))}</div>
        <Btn onClick={submit} v="gold" sz="lg" disabled={busy}>{busy ? "..." : "Submit →"}</Btn>
      </div>
    </div>
    <GCard style={{ padding: "18px 22px", marginBottom: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <div><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>BRANCH</label><select value={br} onChange={e => setBr(e.target.value)} style={iS}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>SHIFT</label><select value={shift} onChange={e => setSh(e.target.value)} style={iS}>{["opening", "mid", "closing", "full_day"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></div>
        <div><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>NOTES</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." style={iS} /></div>
      </div>
    </GCard>
    <GCard style={{ padding: "18px 22px", marginBottom: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8 }}>
        {["Sales", "Target", "UPT", "ATV", "Conv", "Traffic"].map(k => (<div key={k}><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>{k}</label><input type="number" placeholder="0" value={kpis[k] || ""} onChange={e => setKpis(p => ({ ...p, [k]: e.target.value }))} style={{ ...iS, fontSize: 13, fontWeight: 700 }} /></div>))}
      </div>
    </GCard>
    {SEC.map(sec => { const secDone = sec.items.filter(item => ans[`${sec.code}::${item}`]?.status === "completed").length; const open = openS[sec.code]; return (
      <GCard key={sec.code} style={{ marginBottom: 6, overflow: "hidden" }}>
        <button onClick={() => setOpenS(p => ({ ...p, [sec.code]: !p[sec.code] }))} style={{ width: "100%", padding: "12px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14 }}>{sec.icon}</span><div style={{ textAlign: "left" }}><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{sec.title}</div><div style={{ fontSize: 8, color: C.muted }}>{secDone}/{sec.items.length}</div></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 50 }}><Bar val={secDone} max={sec.items.length} color={secDone === sec.items.length ? C.green : C.gold} h={3} /></div><span style={{ color: C.muted, fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span></div>
        </button>
        {open && <div style={{ borderTop: `1px solid ${C.bdr}` }}>{sec.items.map((item, idx) => { const key = `${sec.code}::${item}`; const a = ans[key] || {}; const sc = { completed: { c: C.green, bg: C.greenS }, not_completed: { c: C.red, bg: C.redS }, follow_up: { c: C.amber, bg: C.amberS } }; return (
          <div key={item} style={{ padding: "10px 18px", borderBottom: idx < sec.items.length - 1 ? `1px solid ${C.bdr}` : "none", background: a.status ? (sc[a.status]?.bg || "").replace("0.12", "0.04") : "transparent" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>{item}</div>
                <div style={{ display: "flex", gap: 4 }}>{[["completed", "✓ Done"], ["follow_up", "⚡ Follow"], ["not_completed", "✕ Not Done"]].map(([s, l]) => (<button key={s} onClick={() => setA(sec.code, item, "status", s)} style={{ fontSize: 8, padding: "3px 7px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, border: `1px solid ${a.status === s ? sc[s]?.c : C.bdr}`, background: a.status === s ? sc[s]?.bg : "transparent", color: a.status === s ? "rgba(255,255,255,0.85)" : C.muted, transition: "all 0.15s" }}>{l}</button>))}</div></div>
              <div style={{ flex: 1, minWidth: 140 }}><textarea placeholder="Note..." value={a.note || ""} onChange={e => setA(sec.code, item, "note", e.target.value)} style={{ ...iS, resize: "none", height: 36, fontSize: 10 }} /></div>
            </div></div>); })}</div>}
      </GCard>); })}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE TASK — NEW
// ═══════════════════════════════════════════════════════════════════════
function NewTask({ setPg }) {
  const { profile, branches } = useAuth(); const { toast } = useToast();
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [br, setBr] = useState("");
  const [pri, setPri] = useState("medium"); const [type, setType] = useState("daily"); const [due, setDue] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast("Enter task title", "error"); return; }
    setBusy(true);
    try {
      await sb.q("tasks", { method: "POST", body: { title, description: desc || null, branch_id: br || null, created_by: profile.id, priority: pri, task_type: type, due_date: due || null, status: "pending" } });
      await sb.q("activity_logs", { method: "POST", body: { user_id: profile.id, branch_id: br || null, action: `Created task: ${title}`, entity_type: "task" } });
      toast("Task created!", "success"); setPg("tasks");
    } catch (e) { toast(e.message, "error"); } setBusy(false);
  };

  return (<div style={{ maxWidth: 600, margin: "0 auto" }}>
    <Btn onClick={() => setPg("tasks")} sz="sm" style={{ marginBottom: 14 }}>← Back</Btn>
    <GCard style={{ padding: "24px 28px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 20 }}>Create New Task</div>
      {[{ l: "TITLE", el: <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." style={iS} /> },
      { l: "DESCRIPTION", el: <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Details..." style={{ ...iS, resize: "vertical", minHeight: 70 }} /> },
      ].map(f => (<div key={f.l} style={{ marginBottom: 14 }}><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>{f.l}</label>{f.el}</div>))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5 }}>BRANCH</label>
          <select value={br} onChange={e => setBr(e.target.value)} style={iS}><option value="">All</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5 }}>PRIORITY</label>
          <select value={pri} onChange={e => setPri(e.target.value)} style={iS}>{["low", "medium", "high", "critical"].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5 }}>TYPE</label>
          <select value={type} onChange={e => setType(e.target.value)} style={iS}>{["daily", "weekly", "monthly", "campaign", "emergency"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      <div style={{ marginBottom: 20 }}><label style={{ fontSize: 8, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5 }}>DUE DATE</label>
        <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} style={iS} /></div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={submit} v="gold" sz="lg" disabled={busy}>{busy ? "Creating..." : "Create Task →"}</Btn>
        <Btn onClick={() => setPg("tasks")} sz="lg">Cancel</Btn>
      </div>
    </GCard>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// TASKS LIST
// ═══════════════════════════════════════════════════════════════════════
function TasksPage({ setPg }) {
  const { data, loading } = useQ("tasks", "is_deleted=eq.false&order=created_at.desc"); const { branchMap } = useAuth();
  if (loading) return <Loading />;
  if (!data.length) return <Empty icon="☰" title="No tasks" msg="Create your first task." action="+ New Task" onAction={() => setPg("new_task")} />;
  return (<div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
      {[{ l: "Total", v: data.length, c: C.text }, { l: "Active", v: data.filter(t => !["completed", "rejected"].includes(t.status)).length, c: C.blue },
      { l: "Overdue", v: data.filter(t => t.is_overdue).length, c: C.red }, { l: "Done", v: data.filter(t => t.status === "completed").length, c: C.green }].map(s => (
        <GCard key={s.l} style={{ padding: "12px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div><div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", marginTop: 3 }}>{s.l}</div></GCard>))}
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><Btn onClick={() => setPg("new_task")} v="gold" sz="md">+ New Task</Btn></div>
    {data.map(t => (<GCard key={t.id} style={{ padding: "14px 20px", marginBottom: 6, borderLeft: `2px solid ${pC(t.priority)}` }} glow={t.is_overdue && t.priority === "critical" ? C.redS : null}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{t.title}</div>
          {t.is_overdue && <Chip text="OVERDUE" color={C.red} bg={C.redS} />}
          <Chip text={t.priority} color={pC(t.priority)} bg={pC(t.priority) + "18"} /></div>
          <div style={{ display: "flex", gap: 10 }}><span style={{ fontSize: 9, color: C.sub }}>📍 {branchMap[t.branch_id] || "All"}</span>
            {t.due_date && <span style={{ fontSize: 9, color: t.is_overdue ? C.red : C.sub }}>🕐 {new Date(t.due_date).toLocaleDateString()}</span>}
            <span style={{ fontSize: 9, color: C.sub }}>{t.task_type}</span></div></div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}><SBadge status={t.status} />
          <div style={{ width: 60 }}><Bar val={t.progress || 0} max={100} color={t.progress >= 100 ? C.green : C.gold} h={2} /></div></div>
      </div></GCard>))}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// REMAINING PAGES (Incidents, Branches, Employees, Learning, Notifs, Activity, Users, AI)
// ═══════════════════════════════════════════════════════════════════════
function IncidentsPage() {
  const { data, loading } = useQ("incidents", "is_deleted=eq.false&order=created_at.desc"); const { branchMap } = useAuth();
  if (loading) return <Loading />; if (!data.length) return <Empty icon="⚠" title="No incidents" msg="All clear!" />;
  return (<div>{data.map(i => (<GCard key={i.id} style={{ padding: "14px 20px", marginBottom: 6 }} glow={i.severity === "critical" && i.status === "open" ? C.redS : null}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{i.title}</div>
        <Chip text={i.severity} color={pC(i.severity)} bg={pC(i.severity) + "18"} /></div>
        <div style={{ fontSize: 9, color: C.sub }}>{branchMap[i.branch_id] || "—"} · {i.incident_type}</div>
        {i.description && <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{i.description}</div>}</div>
      <SBadge status={i.status} /></div></GCard>))}</div>);
}

function BranchesPage() { const { branches } = useAuth(); if (!branches.length) return <Empty icon="🏪" title="No stores" msg="Run SQL migration to seed." />;
  return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>{branches.map(b => (<GCard key={b.id} style={{ padding: "16px 20px" }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 5 }}>{b.name}</div><Chip text={b.area} color={C.gold} bg={C.goldSoft} />
    <div style={{ fontSize: 9, color: C.sub, marginTop: 8 }}>{b.opening_hour?.slice(0, 5)} — {b.closing_hour?.slice(0, 5)}</div></GCard>))}</div>); }

function EmployeesPage() { const { data, loading } = useQ("profiles", "is_active=eq.true&order=full_name"); const { branchMap } = useAuth();
  if (loading) return <Loading />; if (!data.length) return <Empty icon="👥" title="No users" msg="Create users in Supabase Auth." />;
  return (<GCard style={{ overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
    <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Name", "Role", "Branch"].map(h => (<th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 8, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
    <tbody>{data.map(p => (<tr key={p.id} style={{ borderBottom: `1px solid ${C.bdr}` }}>
      <td style={{ padding: "10px 12px", fontWeight: 700, color: C.text }}>{p.full_name}</td>
      <td style={{ padding: "10px 12px", color: C.sub, textTransform: "capitalize" }}>{p.role?.replace("_", " ")}</td>
      <td style={{ padding: "10px 12px", color: C.sub }}>{branchMap[p.branch_id] || "All"}</td></tr>))}</tbody></table></GCard>); }

function LearningPage() { const { data, loading } = useQ("training_materials", "is_published=eq.true&order=created_at.desc");
  if (loading) return <Loading />; if (!data.length) return <Empty icon="📚" title="No materials" msg="Upload training content." />;
  return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }}>{data.map(t => (<GCard key={t.id} style={{ padding: "16px 20px" }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 5 }}>{t.title}</div>
    <div style={{ display: "flex", gap: 4 }}><Chip text={t.category} color={C.gold} bg={C.goldSoft} /><Chip text={t.file_type} color={C.sub} bg="rgba(255,255,255,0.05)" /></div>
    <div style={{ fontSize: 9, color: C.muted, marginTop: 8 }}>Views: {t.view_count}{t.pages ? ` · ${t.pages} pages` : ""}</div></GCard>))}</div>); }

function NotifsPage() { const { data, loading, reload } = useQ("notifications", "order=created_at.desc&limit=50"); const { toast } = useToast();
  const markRead = async id => { try { await sb.q("notifications", { method: "PATCH", body: { is_read: true }, qs: `id=eq.${id}` }); reload(); } catch (e) { toast(e.message, "error"); } };
  const markAll = async () => { try { await sb.q("notifications", { method: "PATCH", body: { is_read: true }, qs: "is_read=eq.false" }); reload(); toast("Done", "success"); } catch (e) { toast(e.message, "error"); } };
  if (loading) return <Loading />; if (!data.length) return <Empty icon="🔔" title="All clear" msg="No notifications." />;
  const nc = { info: C.blue, warning: C.amber, danger: C.red, success: C.green };
  return (<div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 11, color: C.sub }}>{data.filter(n => !n.is_read).length} unread</div><Btn onClick={markAll} v="ghost" sz="sm">Mark all read</Btn></div>
    {data.map(n => (<GCard key={n.id} onClick={() => !n.is_read && markRead(n.id)} style={{ padding: "12px 16px", marginBottom: 5, borderLeft: `2px solid ${nc[n.type] || C.blue}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: (nc[n.type] || C.blue) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: nc[n.type] || C.blue, fontWeight: 700, flexShrink: 0 }}>{n.type === "danger" ? "⚠" : n.type === "success" ? "✓" : "i"}</div>
        <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 11, fontWeight: n.is_read ? 500 : 700, color: n.is_read ? C.sub : C.text }}>{n.title}</div><div style={{ fontSize: 9, color: C.muted }}>{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{n.message}</div></div>
        {!n.is_read && <div style={{ width: 5, height: 5, borderRadius: "50%", background: nc[n.type], flexShrink: 0, marginTop: 4 }} />}</div></GCard>))}</div>); }

function ActivityPage() { const { data, loading } = useQ("activity_logs", "order=created_at.desc&limit=50");
  if (loading) return <Loading />; if (!data.length) return <Empty icon="📜" title="No activity" msg="Actions will appear here." />;
  return (<GCard style={{ overflow: "hidden" }}><div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.bdr}`, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>ACTIVITY LOG</div>
    {data.map(l => (<div key={l.id} style={{ padding: "10px 20px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: C.gold, fontWeight: 700, flexShrink: 0 }}>{new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{l.action}</div>
        {l.entity_type && <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{l.entity_type}</div>}</div></div>))}</GCard>); }

function UsersPage() { const { data, loading } = useQ("profiles", "order=created_at.desc"); const { branchMap } = useAuth();
  if (loading) return <Loading />;
  const rC = { admin: C.red, area_manager: C.blue, branch_manager: C.gold, assistant: C.green, vm: C.purple };
  return (<div>
    <div style={{ marginBottom: 12, padding: "10px 14px", background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, fontSize: 10, color: C.sub }}>
      To add users: Supabase Dashboard → Auth → Users → Add User. The profile auto-creates via the database trigger. Then update the role in the profiles table.</div>
    <GCard style={{ overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
      <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Name", "Username", "Role", "Branch", "Active"].map(h => (<th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 8, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
      <tbody>{data.map(u => (<tr key={u.id} style={{ borderBottom: `1px solid ${C.bdr}` }}>
        <td style={{ padding: "10px 12px", fontWeight: 700, color: C.text }}>{u.full_name}</td>
        <td style={{ padding: "10px 12px", color: C.sub, fontFamily: "monospace", fontSize: 9 }}>{u.username}</td>
        <td style={{ padding: "10px 12px" }}><Chip text={u.role?.replace("_", " ")} color={rC[u.role] || C.sub} bg={(rC[u.role] || C.sub) + "18"} /></td>
        <td style={{ padding: "10px 12px", color: C.sub, fontSize: 9 }}>{branchMap[u.branch_id] || "All"}</td>
        <td style={{ padding: "10px 12px" }}><Chip text={u.is_active ? "Active" : "Disabled"} color={u.is_active ? C.green : C.red} bg={u.is_active ? C.greenS : C.redS} /></td></tr>))}</tbody></table></GCard></div>); }

function AIPage() {
  const { data: insights, loading } = useQ("ai_insights", "is_active=eq.true&order=generated_at.desc&limit=10");
  const { branches } = useAuth(); const [busy, setBusy] = useState(false); const [resp, setResp] = useState(""); const [q, setQ] = useState("");
  const ask = async (question) => { if (!question) return; setBusy(true); setResp("");
    try { const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: `You are RAVIN Academy AI — a retail ops assistant. Branches: ${branches.map(b => b.name).join(", ")}. Be actionable.`, messages: [{ role: "user", content: question }] }) });
      const d = await r.json(); setResp(d.content?.[0]?.text || "Unable to generate."); } catch { setResp("Connection error."); } setBusy(false); };
  return (<div>
    <div style={{ background: C.bg, borderRadius: 14, padding: "20px 24px", marginBottom: 16, border: `1px solid ${C.goldBdr}`, boxShadow: `0 0 28px ${C.goldSoft}` }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: C.gold, letterSpacing: "0.1em", marginBottom: 10 }}>✦ RAVIN ACADEMY · AI</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}><input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask AI..." onKeyDown={e => e.key === "Enter" && ask(q)} style={{ ...iS, flex: 1, border: `1px solid ${C.goldBdr}` }} /><Btn onClick={() => ask(q)} v="gold" sz="lg" disabled={busy}>{busy ? "..." : "Ask →"}</Btn></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{["Top risks today?", "Which stores need help?", "Recommend improvements"].map(p => (<button key={p} onClick={() => { setQ(p); ask(p); }} style={{ fontSize: 9, padding: "4px 10px", borderRadius: 14, border: `1px solid ${C.goldBdr}`, background: C.goldSoft, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>{p}</button>))}</div>
    </div>
    {resp && !busy && <GCard style={{ padding: "20px 24px", marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gold, marginBottom: 10 }}>✦ ANALYSIS</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{resp}</div></GCard>}
    {loading ? <Loading /> : insights.length === 0 ? <Empty icon="✦" title="No insights" msg="Data will generate as you use the system." /> :
      <GCard style={{ padding: "16px 20px" }}><div style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginBottom: 10 }}>SYSTEM INSIGHTS</div>
        {insights.map(i => (<div key={i.id} style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 5, background: i.severity === "critical" ? C.redS : i.severity === "warning" ? C.amberS : "rgba(255,255,255,0.02)", borderLeft: `3px solid ${i.severity === "critical" ? C.red : i.severity === "warning" ? C.amber : C.green}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{i.title}</div><div style={{ fontSize: 9, color: C.sub, marginTop: 2 }}>{i.content}</div></div>))}</GCard>}</div>);
}

// ═══════════════════════════════════════════════════════════════════════
// PAGES MAP
// ═══════════════════════════════════════════════════════════════════════
const PAGES = { dash: { t: "Dashboard", s: "RAVIN Academy · Operations Intelligence" }, reports: { t: "Reports", s: "Operational reports" }, new_report: { t: "New Report", s: "Submit checklist" }, rpt_detail: { t: "Report Detail", s: "Full breakdown" }, tasks: { t: "Tasks", s: "Workflow engine" }, new_task: { t: "New Task", s: "Create task" }, incidents: { t: "Incidents", s: "Issue tracking" }, branches: { t: "Stores", s: "All branches" }, employees: { t: "Employees", s: "Team overview" }, learning: { t: "Learning", s: "Training hub" }, ai: { t: "AI Insights", s: "Intelligence" }, notifs: { t: "Notifications", s: "Alerts" }, activity: { t: "Activity Log", s: "Audit trail" }, users: { t: "Users", s: "Accounts" } };

// ═══════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════
function App() {
  const { user, profile, ready } = useAuth(); const [pg, setPg] = useState("dash"); const [rptCtx, setRptCtx] = useState(null);
  const { data: unreadNotifs, reload: rlN } = useQ("notifications", "is_read=eq.false");
  // Periodic refresh for realtime feel
  useEffect(() => { const t = setInterval(rlN, 15000); return () => clearInterval(t); }, [rlN]);
  if (!ready) return <Loading t="Connecting to RAVIN Academy..." />;
  if (!user) return <LoginPage />;
  const nC = unreadNotifs.length; const meta = PAGES[pg] || { t: "RAVIN Academy", s: "" };
  return (<div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Inter',system-ui,sans-serif" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    <Sidebar pg={pg} setPg={setPg} profile={profile} nC={nC} />
    <main style={{ marginLeft: 216, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(9,9,11,0.96)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.bdr}`, padding: "12px 26px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{meta.t}</div>{meta.s && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{meta.s}</div>}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pg === "dash" && <Btn onClick={() => setPg("new_report")} v="gold" sz="sm">+ Report</Btn>}
          <button onClick={() => setPg("notifs")} style={{ position: "relative", background: "none", border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, color: C.sub }}>◎{nC > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: C.red, color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 10, padding: "1px 5px" }}>{nC}</span>}</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "18px 24px" }}>
        {pg === "dash" && <Dash setPg={setPg} />}
        {pg === "reports" && <ReportsPage setPg={setPg} setCtx={setRptCtx} />}
        {pg === "new_report" && <NewReport setPg={setPg} />}
        {pg === "rpt_detail" && <ReportDetail rpt={rptCtx} setPg={setPg} />}
        {pg === "tasks" && <TasksPage setPg={setPg} />}
        {pg === "new_task" && <NewTask setPg={setPg} />}
        {pg === "incidents" && <IncidentsPage />}
        {pg === "branches" && <BranchesPage />}
        {pg === "employees" && <EmployeesPage />}
        {pg === "learning" && <LearningPage />}
        {pg === "ai" && <AIPage />}
        {pg === "notifs" && <NotifsPage />}
        {pg === "activity" && <ActivityPage />}
        {pg === "users" && <UsersPage />}
      </div>
    </main>
  </div>);
}

export default function RavinAcademy() { return <TP><AP><App /></AP></TP>; }
