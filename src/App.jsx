import { useState, useEffect, useCallback, createContext, useContext, useRef, Component } from "react";

// ═══════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  render(){if(this.state.err)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F4F8",fontFamily:"'DM Sans',sans-serif"}}><div style={{textAlign:"center",padding:40,background:"#fff",borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",maxWidth:400}}><div style={{fontSize:48,marginBottom:16}}>⚠️</div><div style={{fontSize:18,fontWeight:800,color:"#1A1F2E",marginBottom:8}}>حصل خطأ</div><div style={{fontSize:12,color:"#5F6B7A",marginBottom:20}}>{this.state.err?.message}</div><button onClick={()=>{this.setState({err:null});window.location.reload();}} style={{padding:"10px 24px",background:"#0D47A1",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>إعادة تحميل</button></div></div>);return this.props.children;}
}

// ═══════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════
const SU="https://efswwichqsireilbasvf.supabase.co";
const SK="sb_publishable_wOs1Djp4TRJ8aLrqKlyEzw_C2GQjVI0";
const sb=(()=>{let _t=null;try{_t=localStorage.getItem("sb_token")}catch{}
const hd=(x={})=>({apikey:SK,"Content-Type":"application/json",...(_t?{Authorization:`Bearer ${_t}`}:{}),...x});
return{
  q:async(tbl,o={})=>{const{method="GET",body,qs="",single}=o;const h={...hd()};if(single)h.Accept="application/vnd.pgrst.object+json";if(method==="POST"||method==="PATCH")h.Prefer="return=representation";const r=await fetch(`${SU}/rest/v1/${tbl}${qs?"?"+qs:""}`,{method,headers:h,...(body?{body:JSON.stringify(body)}:{})});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||e.details||r.statusText);}if(r.status===204)return null;return r.json();},
  rpc:async(fn,p={})=>{const r=await fetch(`${SU}/rest/v1/rpc/${fn}`,{method:"POST",headers:hd(),body:JSON.stringify(p)});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||r.statusText);}return r.json();},
  signIn:async(email,pw)=>{const r=await fetch(`${SU}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SK,"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error_description||e.msg||"بيانات غلط");}const d=await r.json();_t=d.access_token;try{localStorage.setItem("sb_token",d.access_token);localStorage.setItem("sb_refresh",d.refresh_token);}catch{}return d;},
  signOut:async()=>{if(_t)await fetch(`${SU}/auth/v1/logout`,{method:"POST",headers:{apikey:SK,Authorization:`Bearer ${_t}`}}).catch(()=>{});_t=null;try{localStorage.removeItem("sb_token");localStorage.removeItem("sb_refresh");}catch{}},
  getUser:async()=>{if(!_t)return null;const r=await fetch(`${SU}/auth/v1/user`,{headers:{apikey:SK,Authorization:`Bearer ${_t}`}});if(!r.ok){_t=null;try{localStorage.removeItem("sb_token");}catch{}return null;}return r.json();},
};})();

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const C={
  bg:"#F0F4F8",card:"#FFFFFF",text:"#1A1F2E",sub:"#5F6B7A",muted:"#9EA8B5",
  gold:"#C89B4A",goldS:"rgba(200,155,74,0.1)",
  green:"#1B5E20",greenS:"#E8F5E9",
  red:"#B71C1C",redS:"#FFEBEE",
  amber:"#7B4B00",amberS:"#FFF3E0",
  blue:"#0D47A1",blueS:"#E8F0FE",
  bd:"rgba(0,0,0,0.09)",
};

// ═══════════════════════════════════════════════════════════════════════
// SIMPLIFIED CHECKLIST (12 items)
// ═══════════════════════════════════════════════════════════════════════
const CHECKLIST=[
  {id:"open_time",text:"اوبن في الميعاد المحدد",icon:"🏪"},
  {id:"shortages",text:"هل تم خروج النواقص اليومية وموعد خروجها",icon:"📦"},
  {id:"warehouse",text:"حالة المخزن تمام ولا يحتاج للهاندلة",icon:"🏭"},
  {id:"deposit",text:"هل تم عمل الإيداع وإرسال الميل",icon:"💰"},
  {id:"display_report",text:"هل تم إرسال تقرير العرض",icon:"📊"},
  {id:"cameras",text:"هل أجهزة الكاميرات تعمل",icon:"📹"},
  {id:"pos",text:"هل الكاشير يعمل",icon:"💳"},
  {id:"attendance",text:"هل يوجد أي غياب أو إذن لفريق العمل",icon:"👥"},
  {id:"kpi_review",text:"هل تم مراجعة الأوفرات ومتوسط الفاتورة والقطع للفريق أثناء الاجتماع اليومي",icon:"🎯"},
  {id:"achievements",text:"هل تم إرسال المحققات على الجروب ومناقشة الفريق",icon:"📱"},
  {id:"cleaning",text:"هل تم مراجعة كل بنود النظافة",icon:"✨"},
  {id:"vm_display",text:"هل تم مراجعة تعويض العرض وشد المقاس",icon:"◇"},
  {id:"prev_closing",text:"هل تم التقفيل أمس بالشكل المطلوب",icon:"🔒"},
  {id:"ac_temp",text:"هل أجهزة التكييف تعمل على درجة 24",icon:"❄️"},
  {id:"uniform",text:"هل يوجد يونيفورم مخالف",icon:"👔"},
  {id:"sound",text:"هل الساوند يعمل",icon:"🔊"},
  {id:"alarm",text:"هل جهاز الألرم عند المدخل يعمل",icon:"🚨"},
];

// ═══════════════════════════════════════════════════════════════════════
// UTILS & PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════
const fmt=n=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(0)}K`:String(Math.round(n||0));
const fE=n=>`EGP ${fmt(n)}`;
const cC=v=>v>=90?C.green:v>=70?C.amber:C.red;
const iS={width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.bd}`,background:"#FFF",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

function Ring({pct,sz=48,sw=4,color=C.gold}){const r=(sz-sw)/2,ci=2*Math.PI*r,d=(Math.min(pct||0,100)/100)*ci;return(<svg width={sz} height={sz} style={{transform:"rotate(-90deg)",flexShrink:0}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${d} ${ci}`} strokeLinecap="round"/></svg>);}
function Bar({v,max=100,color=C.gold,h=4}){return(<div style={{width:"100%",height:h,background:"rgba(0,0,0,0.06)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${Math.min((v||0)/max*100,100)}%`,height:"100%",background:color,borderRadius:2,transition:"width 0.6s"}}/></div>);}
function Card({children,style:s={},onClick}){return(<div onClick={onClick} style={{background:C.card,border:`1px solid ${C.bd}`,borderRadius:14,cursor:onClick?"pointer":"default",...s}}>{children}</div>);}
function Btn({children,onClick,color=C.gold,outline,disabled,style:s={}}){return(<button onClick={onClick} disabled={disabled} style={{padding:"8px 18px",borderRadius:8,border:outline?`1px solid ${color}`:"none",background:outline?"transparent":color,color:outline?color:"#0A0A0A",fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,fontFamily:"inherit",...s}}>{children}</button>);}
function Badge({text,color,bg}){return <span style={{fontSize:9,fontWeight:700,color,background:bg,padding:"2px 8px",borderRadius:4}}>{text}</span>;}
function Loading(){return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}><div style={{width:24,height:24,border:`3px solid rgba(0,0,0,0.08)`,borderTop:`3px solid ${C.blue}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:12,color:C.sub}}>جاري التحميل...</span></div>;}
function Empty({icon="📭",title,msg,action,onAction}){return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}><div style={{fontSize:40}}>{icon}</div><div style={{fontSize:16,fontWeight:700,color:C.text}}>{title}</div>{msg&&<div style={{fontSize:12,color:C.sub,textAlign:"center"}}>{msg}</div>}{action&&<Btn onClick={onAction}>{action}</Btn>}</div>;}

// ═══════════════════════════════════════════════════════════════════════
// CONTEXTS
// ═══════════════════════════════════════════════════════════════════════
const TC=createContext();
function ToastProvider({children}){const[t,sT]=useState([]);const add=(msg,type="info")=>{const id=Date.now();sT(p=>[...p,{id,msg,type}]);setTimeout(()=>sT(p=>p.filter(x=>x.id!==id)),4000);};return(<TC.Provider value={{toast:add}}>{children}<div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>{t.map(x=>(<div key={x.id} style={{padding:"12px 18px",borderRadius:10,fontSize:12,fontWeight:600,background:x.type==="error"?"#FDE8E8":x.type==="success"?"#E8F5E9":"#E8F0FE",color:x.type==="error"?C.red:x.type==="success"?C.green:C.blue,border:`1px solid ${x.type==="error"?C.red+"30":x.type==="success"?C.green+"30":C.blue+"30"}`,minWidth:260,pointerEvents:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>{x.type==="error"?"⚠ ":x.type==="success"?"✓ ":"ℹ "}{x.msg}</div>))}</div></TC.Provider>);}
const useToast=()=>useContext(TC);

const AC=createContext();
function AuthProvider({children}){
const[u,sU]=useState(null);const[p,sP]=useState(null);const[br,sBr]=useState([]);const[rdy,sR]=useState(false);
const bm=Object.fromEntries(br.map(b=>[b.id,b.name]));
useEffect(()=>{(async()=>{
try{
let user=await sb.getUser();
if(!user){try{let ref=localStorage.getItem("sb_refresh");if(ref){const r=await fetch(`${SU}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SK,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:ref})});if(r.ok){const d=await r.json();localStorage.setItem("sb_token",d.access_token);localStorage.setItem("sb_refresh",d.refresh_token);user=await sb.getUser();}}}catch{}}
if(user){sU(user);try{const[pr]=await sb.q("profiles",{qs:`id=eq.${user.id}`});sP(pr);}catch{}try{sBr(await sb.q("branches",{qs:"is_active=eq.true&order=name"})||[]);}catch{}}
}catch{}finally{sR(true);}
})();},[]);
const login=async(em,pw)=>{const d=await sb.signIn(em,pw);sU(d.user);try{const[pr]=await sb.q("profiles",{qs:`id=eq.${d.user.id}`});sP(pr);}catch{}try{sBr(await sb.q("branches",{qs:"is_active=eq.true&order=name"})||[]);}catch{};return d.user;};
const logout=async()=>{await sb.signOut();sU(null);sP(null);};
const isAdmin=["admin","area_manager"].includes(p?.role);
return <AC.Provider value={{user:u,profile:p,branches:br,bm,rdy,login,logout,isAdmin}}>{children}</AC.Provider>;}
const useAuth=()=>useContext(AC);
function useQ(tbl,qs=""){const[d,sD]=useState([]);const[l,sL]=useState(true);const r=useCallback(async()=>{sL(true);try{sD(await sb.q(tbl,{qs})||[]);}catch(e){console.error(e);sD([]);}sL(false);},[tbl,qs]);useEffect(()=>{r();},[r]);return{data:d,loading:l,reload:r};}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════
function Login(){const{login}=useAuth();const{toast}=useToast();const[em,sE]=useState("");const[pw,sP]=useState("");const[busy,sB]=useState(false);
const go=async()=>{if(!em||!pw){toast("ادخل البيانات","error");return;}sB(true);try{await login(em,pw);toast("أهلاً في RAVIN Academy!","success");}catch(e){toast(e.message,"error");}sB(false);};
return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
<div style={{width:380,padding:"40px 36px",background:"#FFF",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",borderRadius:20,border:`1px solid ${C.bd}`}}>
<div style={{textAlign:"center",marginBottom:28}}>
<div style={{width:48,height:48,borderRadius:12,background:C.blue,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#FFF",marginBottom:12}}>R</div>
<div style={{fontSize:24,fontWeight:900,letterSpacing:"0.08em",color:C.text}}>RAVIN <span style={{color:C.gold}}>ACADEMY</span></div>
<div style={{fontSize:10,color:C.sub,letterSpacing:"0.2em",marginTop:4}}>Make your world be proud</div>
</div>
<div style={{marginBottom:14}}><label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>EMAIL</label><input value={em} onChange={e=>sE(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/></div>
<div style={{marginBottom:20}}><label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>PASSWORD</label><input type="password" value={pw} onChange={e=>sP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/></div>
<Btn onClick={go} disabled={busy} style={{width:"100%",padding:"12px",fontSize:14}}>{busy?"جاري الدخول...":"Sign In →"}</Btn>
</div></div>);}

// ═══════════════════════════════════════════════════════════════════════
// ROLE SELECTOR — for branch shared logins
// ═══════════════════════════════════════════════════════════════════════
function RoleSelector({onSelect}){
const{profile,bm}=useAuth();
const branchName=bm[profile?.branch_id]||profile?.full_name||"الفرع";
return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
<div style={{width:400,padding:"40px",background:"#FFF",borderRadius:20,boxShadow:"0 8px 32px rgba(0,0,0,0.1)",textAlign:"center"}}>
<div style={{fontSize:12,color:C.sub,marginBottom:4}}>أهلاً في</div>
<div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:6}}>{branchName}</div>
<div style={{fontSize:14,color:C.sub,marginBottom:28}}>أنت مين النهاردة؟</div>
{[{id:"branch_manager",label:"المدير",icon:"🏪",desc:"تقارير · مهام · مبيعات",color:C.gold},
  {id:"vm",label:"الـ VM",icon:"◇",desc:"متابعة الـ Visual Merchandising",color:"#4527A0"},
  {id:"assistant",label:"المساعد",icon:"🤝",desc:"تعبئة التقارير",color:C.green}
].map(r=>(<button key={r.id} onClick={()=>onSelect(r.id)} style={{width:"100%",padding:"16px 20px",borderRadius:12,border:`1px solid ${C.bd}`,background:"#FFF",cursor:"pointer",fontFamily:"inherit",textAlign:"right",display:"flex",alignItems:"center",gap:12,marginBottom:10,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=r.color;e.currentTarget.style.background=r.color+"10";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.bd;e.currentTarget.style.background="#FFF";}}>
<span style={{fontSize:28}}>{r.icon}</span>
<div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:r.color}}>{r.label}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{r.desc}</div></div>
</button>))}
</div></div>);}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function Sidebar({pg,setPg,sideOpen,setSideOpen}){
const{profile:p,logout,isAdmin}=useAuth();
const nav=[
  {id:"dash",label:"Dashboard",icon:"◈"},
  {id:"sales",label:"المبيعات",icon:"◆"},
  {id:"tasks",label:"المهام",icon:"☰"},
  {id:"reports",label:"التقارير",icon:"◉"},
  {id:"new_report",label:"+ تقرير جديد",icon:"✚",highlight:true},
  ...(isAdmin?[{id:"users",label:"المستخدمين",icon:"⊕"}]:[]),
];
return(<aside className="sidebar" style={{width:220,minHeight:"100vh",background:"#FFF",display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,bottom:0,zIndex:200,borderRight:`1px solid ${C.bd}`,boxShadow:"2px 0 8px rgba(0,0,0,0.04)"}}>
<div style={{padding:"20px 18px 14px",borderBottom:`1px solid ${C.bd}`}}>
<div style={{display:"flex",alignItems:"center",gap:9}}>
<div style={{width:30,height:30,borderRadius:8,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#FFF"}}>R</div>
<div><div style={{fontSize:14,fontWeight:900,letterSpacing:"0.06em",color:C.blue}}>RAVIN <span style={{color:C.gold}}>ACADEMY</span></div>
<div style={{fontSize:7,color:C.muted,letterSpacing:"0.15em"}}>Make your world be proud</div></div></div></div>
<div style={{flex:1,padding:"8px",overflowY:"auto"}}>
{nav.map(n=>(<button key={n.id} onClick={()=>{setPg(n.id);setSideOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:8,border:"none",cursor:"pointer",background:pg===n.id?C.blueS:n.highlight?C.blueS+"66":"transparent",color:pg===n.id?C.blue:n.highlight?C.blue:C.sub,fontSize:12,fontWeight:pg===n.id?700:500,textAlign:"left",fontFamily:"inherit",marginBottom:2,borderLeft:pg===n.id?`3px solid ${C.blue}`:"3px solid transparent",transition:"all 0.15s"}}>
<span style={{fontSize:14,width:18,textAlign:"center"}}>{n.icon}</span>{n.label}
</button>))}
</div>
<div style={{padding:"12px 14px",borderTop:`1px solid ${C.bd}`}}>
<div style={{display:"flex",alignItems:"center",gap:8}}>
<div style={{width:28,height:28,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#FFF"}}>{(p?.full_name||"U")[0]}</div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.full_name}</div><div style={{fontSize:9,color:C.muted}}>{isAdmin?"Admin":"Branch"}</div></div>
<button onClick={logout} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>⏻</button>
</div></div>
</aside>);}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function Dashboard({setPg}){
const{isAdmin,bm}=useAuth();
const{data:comm,loading}=useQ("commercial_overview","order=mtd_achievement_pct.desc");
const{data:health}=useQ("branch_health","order=health_score.desc");
const{data:tasks}=useQ("tasks","is_deleted=eq.false&status=neq.completed&order=created_at.desc&limit=5");

const tS=comm.reduce((s,c)=>s+(+c.mtd_sales||0),0);
const tT=comm.reduce((s,c)=>s+(+c.monthly_target||0),0);
const aA=tT?Math.round(tS/tT*100):0;

if(loading)return <Loading/>;

return(<div>
{/* KPIs */}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
{[{l:"MTD Sales",v:fE(tS),c:C.gold},{l:"Target",v:fE(tT),c:C.text},{l:"Remaining",v:fE(Math.max(tT-tS,0)),c:tT>tS?C.amber:C.green},{l:"Achievement",v:`${aA}%`,c:cC(aA),ring:true}].map((k,i)=>(<Card key={i} style={{padding:"16px",textAlign:"center"}}><div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={{fontSize:20,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={aA} sz={32} sw={3} color={k.c}/>}</div></Card>))}
</div>

{/* Sales Table */}
<Card style={{overflow:"hidden",marginBottom:20}}>
<div style={{padding:"14px 18px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<span style={{fontSize:12,fontWeight:700,color:C.text}}>أداء الفروع</span>
<Btn onClick={()=>setPg("sales")} outline color={C.blue} style={{fontSize:10,padding:"4px 12px"}}>عرض الكل →</Btn>
</div>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["#","الفرع","المبيعات","التارجت","المتبقي","الإنجاز"].map(h=>(<th key={h} style={{padding:"10px 14px",textAlign:"right",fontSize:9,color:C.muted,fontWeight:700}}>{h}</th>))}</tr></thead>
<tbody>{comm.map((c,i)=>{const ach=+c.mtd_achievement_pct||0;return(<tr key={c.branch_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"10px 14px",color:i<3?C.gold:C.muted,fontWeight:700}}>{i+1}</td>
<td style={{padding:"10px 14px",fontWeight:700,color:C.text}}>{c.branch_name}</td>
<td style={{padding:"10px 14px",fontWeight:700,color:C.gold}}>{fE(c.mtd_sales)}</td>
<td style={{padding:"10px 14px",color:C.sub}}>{fE(c.monthly_target)}</td>
<td style={{padding:"10px 14px",color:+c.remaining>0?C.amber:C.green,fontWeight:600}}>{fE(c.remaining)}</td>
<td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,color:cC(ach)}}>{ach}%</span><div style={{width:40}}><Bar v={ach} color={cC(ach)}/></div></div></td>
</tr>);})}</tbody>
</table>
</Card>

{/* Recent Tasks */}
{tasks.length>0&&<Card style={{padding:"14px 18px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
<span style={{fontSize:12,fontWeight:700,color:C.text}}>آخر المهام</span>
<Btn onClick={()=>setPg("tasks")} outline color={C.blue} style={{fontSize:10,padding:"4px 12px"}}>عرض الكل →</Btn>
</div>
{tasks.map(t=>(<div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
<div><div style={{fontSize:11,fontWeight:600,color:C.text}}>{t.title}</div><div style={{fontSize:9,color:C.muted}}>📍 {bm[t.branch_id]||"الكل"}</div></div>
<Badge text={t.status==="completed"?"تم":"قيد التنفيذ"} color={t.status==="completed"?C.green:C.amber} bg={t.status==="completed"?C.greenS:C.amberS}/>
</div>))}
</Card>}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// SALES PAGE — Overview + Excel Upload + Set Target
// ═══════════════════════════════════════════════════════════════════════
function SalesPage(){
const{data:comm,loading,reload}=useQ("commercial_overview","order=mtd_achievement_pct.desc");
const{profile,branches,isAdmin}=useAuth();const{toast}=useToast();
const[tab,setTab]=useState("overview");
const[importing,setImporting]=useState(false);
const[preview,setPreview]=useState(null);
const fileRef=useRef();
const targetFileRef=useRef();
const[targetPreview,setTargetPreview]=useState(null);
const[bForm,setBForm]=useState({branch_id:"",month:new Date().toISOString().slice(0,7),target:"",gross:""});

const loadXLSX=async()=>await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");

// Branch sales upload
const handleFile=async(e)=>{const file=e.target.files?.[0];if(!file)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await file.arrayBuffer());const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
setPreview(rows.slice(0,5));toast(`${rows.length} صف جاهز للرفع`,"success");}catch(e){toast("خطأ: "+e.message,"error");}setImporting(false);};

const confirmImport=async()=>{if(!preview)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await fileRef.current.files[0].arrayBuffer());
const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const res=await sb.rpc("bulk_upsert_daily_sales",{p_rows:rows});
toast(`تم رفع ${res} سجل!`,"success");setPreview(null);reload();}catch(e){toast(e.message,"error");}setImporting(false);};

// Target upload
const handleTargetFile=async(e)=>{const file=e.target.files?.[0];if(!file)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await file.arrayBuffer());const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
setTargetPreview(rows.slice(0,5));toast(`${rows.length} تارجت جاهز`,"success");}catch(e){toast("خطأ: "+e.message,"error");}setImporting(false);};

const confirmTargetImport=async()=>{if(!targetPreview)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await targetFileRef.current.files[0].arrayBuffer());
const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
let saved=0;
for(const row of rows){try{
const bn=row.branch_name||row["Branch Name"]||row.Branch||row.branch||Object.values(row)[0]||"";
const bid=branches.find(b=>b.name.toLowerCase().includes(bn.toString().toLowerCase().trim()))?.id;
if(!bid)continue;
const tm=row.target_month||row["Target Month"]||row.month||new Date().toISOString().slice(0,7)+"-01";
await sb.rpc("upsert_branch_monthly_sales",{p_branch_id:bid,p_month:String(tm).slice(0,7)+"-01",p_monthly_target:+(row.monthly_target||row.Target||row.target||0),p_actual_sales:+(row.actual_sales||0),p_gross_percentage:+(row.gross_percentage||row.Gross||0),p_user_id:profile.id});
saved++;}catch{}}
toast(`تم رفع ${saved} تارجت!`,"success");setTargetPreview(null);reload();}catch(e){toast(e.message,"error");}setImporting(false);};

// Manual target
const saveTarget=async()=>{if(!bForm.branch_id){toast("اختار الفرع","error");return;}
try{await sb.rpc("upsert_branch_monthly_sales",{p_branch_id:bForm.branch_id,p_month:bForm.month+"-01",p_monthly_target:+bForm.target||0,p_actual_sales:0,p_gross_percentage:+bForm.gross||0,p_user_id:profile.id});
toast("تم الحفظ!","success");reload();}catch(e){toast(e.message,"error");}};

// Export
const exportExcel=async()=>{try{const{utils,writeFile}=await loadXLSX();
const rows=comm.map(c=>({Branch:c.branch_name,MTD_Sales:+c.mtd_sales||0,Target:+c.monthly_target||0,Remaining:+c.remaining||0,Achievement:+c.mtd_achievement_pct||0,Gross:+c.gross_percentage||0}));
const ws=utils.json_to_sheet(rows);const wb=utils.book_new();utils.book_append_sheet(wb,ws,"Sales");
writeFile(wb,`RAVIN_Sales_${new Date().toISOString().slice(0,10)}.xlsx`);toast("تم التصدير!","success");}catch(e){toast(e.message,"error");}};

const tS=comm.reduce((s,c)=>s+(+c.mtd_sales||0),0);
const tT=comm.reduce((s,c)=>s+(+c.monthly_target||0),0);
const aA=tT?Math.round(tS/tT*100):0;

if(loading)return <Loading/>;

const Preview=({data})=>(!data?null:<div style={{marginTop:14,overflowX:"auto"}}><div style={{fontSize:10,fontWeight:700,color:C.text,marginBottom:6}}>معاينة (أول 5 صفوف):</div><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr>{Object.keys(data[0]||{}).map(h=>(<th key={h} style={{padding:"6px 10px",textAlign:"left",fontSize:9,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.bd}`}}>{h}</th>))}</tr></thead><tbody>{data.map((r,i)=>(<tr key={i}>{Object.values(r).map((v,j)=>(<td key={j} style={{padding:"6px 10px",borderBottom:`1px solid ${C.bd}`,color:C.sub}}>{String(v)}</td>))}</tr>))}</tbody></table></div>);

return(<div>
{/* KPIs */}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:16}}>
{[{l:"MTD Sales",v:fE(tS),c:C.gold},{l:"Target",v:fE(tT),c:C.text},{l:"Remaining",v:fE(Math.max(tT-tS,0)),c:tT>tS?C.amber:C.green},{l:"Achievement",v:`${aA}%`,c:cC(aA)}].map((k,i)=>(<Card key={i} style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{k.l}</div><div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div></Card>))}
</div>

{/* Tabs */}
<div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
{[{id:"overview",l:"📊 Overview"},...(isAdmin?[{id:"upload_sales",l:"⬆ رفع مبيعات"},{id:"upload_targets",l:"⬆ رفع تارجت"},{id:"set_target",l:"🎯 تارجت يدوي"}]:[])].map(t=>(
<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",background:tab===t.id?C.blueS:"transparent",color:tab===t.id?C.blue:C.sub,fontSize:11,fontWeight:tab===t.id?700:500,fontFamily:"inherit"}}>{t.l}</button>))}
<div style={{flex:1}}/>
{isAdmin&&<Btn onClick={exportExcel} outline color={C.blue} style={{fontSize:10,padding:"4px 12px"}}>⬇ Excel</Btn>}
</div>

{/* Overview */}
{tab==="overview"&&<Card style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["#","الفرع","المبيعات","التارجت","المتبقي","الإنجاز","Gross %"].map(h=>(<th key={h} style={{padding:"10px 12px",textAlign:"right",fontSize:9,color:C.muted,fontWeight:700}}>{h}</th>))}</tr></thead>
<tbody>{comm.map((c,i)=>{const ach=+c.mtd_achievement_pct||0;return(<tr key={c.branch_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"10px 12px",color:i<3?C.gold:C.muted,fontWeight:700}}>{i+1}</td>
<td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{c.branch_name}</td>
<td style={{padding:"10px 12px",fontWeight:700,color:C.gold}}>{fE(c.mtd_sales)}</td>
<td style={{padding:"10px 12px",color:C.sub}}>{fE(c.monthly_target)}</td>
<td style={{padding:"10px 12px",color:+c.remaining>0?C.amber:C.green,fontWeight:600}}>{fE(c.remaining)}</td>
<td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,color:cC(ach)}}>{ach}%</span><div style={{width:40}}><Bar v={ach} color={cC(ach)}/></div></div></td>
<td style={{padding:"10px 12px",color:+c.gross_percentage>0?C.green:C.muted}}>{+c.gross_percentage>0?`${c.gross_percentage}%`:"—"}</td>
</tr>);})}</tbody>
</table>
</Card>}

{/* Upload Sales */}
{tab==="upload_sales"&&<Card style={{padding:"20px 24px"}}>
<div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:6}}>رفع مبيعات الفروع اليومية</div>
<div style={{fontSize:11,color:C.sub,marginBottom:16}}>الأعمدة: <code style={{background:"rgba(0,0,0,0.04)",padding:"2px 8px",borderRadius:4}}>branch_name, sale_date, total_sales, total_invoices, total_quantity, traffic</code></div>
<input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:"none"}}/>
<div style={{display:"flex",gap:10}}>
<Btn onClick={()=>fileRef.current?.click()} disabled={importing}>{importing?"...":"📎 اختر ملف"}</Btn>
{preview&&<Btn onClick={confirmImport} disabled={importing}>{importing?"جاري الرفع...":"✓ تأكيد الرفع"}</Btn>}
</div>
<Preview data={preview}/>
</Card>}

{/* Upload Targets */}
{tab==="upload_targets"&&<Card style={{padding:"20px 24px"}}>
<div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:6}}>رفع التارجت الشهري</div>
<div style={{fontSize:11,color:C.sub,marginBottom:16}}>الأعمدة: <code style={{background:"rgba(0,0,0,0.04)",padding:"2px 8px",borderRadius:4}}>branch_name, target_month, monthly_target, gross_percentage</code></div>
<input ref={targetFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleTargetFile} style={{display:"none"}}/>
<div style={{display:"flex",gap:10}}>
<Btn onClick={()=>targetFileRef.current?.click()} disabled={importing}>{importing?"...":"📎 اختر ملف"}</Btn>
{targetPreview&&<Btn onClick={confirmTargetImport} disabled={importing}>{importing?"جاري الرفع...":"✓ تأكيد الرفع"}</Btn>}
</div>
<Preview data={targetPreview}/>
</Card>}

{/* Manual Target */}
{tab==="set_target"&&<Card style={{padding:"20px 24px"}}>
<div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>تحديد تارجت فرع</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الفرع</label><select value={bForm.branch_id} onChange={e=>setBForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">اختار...</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الشهر</label><input type="month" value={bForm.month} onChange={e=>setBForm(p=>({...p,month:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>التارجت</label><input type="number" value={bForm.target} onChange={e=>setBForm(p=>({...p,target:e.target.value}))} placeholder="1400000" style={iS}/></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>Gross %</label><input type="number" step="0.1" value={bForm.gross} onChange={e=>setBForm(p=>({...p,gross:e.target.value}))} placeholder="42.5" style={iS}/></div>
<Btn onClick={saveTarget}>حفظ →</Btn>
</div>
</Card>}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// TASKS PAGE — Create + View + Complete
// ═══════════════════════════════════════════════════════════════════════
function TasksPage({setPg}){
const{data,loading,reload}=useQ("tasks","is_deleted=eq.false&order=created_at.desc");
const{bm,branches,profile,isAdmin}=useAuth();const{toast}=useToast();
const[showNew,setShowNew]=useState(false);
const[form,setForm]=useState({title:"",desc:"",branch_id:"",priority:"medium",due:""});
const[busy,setBusy]=useState(false);

const create=async()=>{
if(!form.title.trim()){toast("اكتب عنوان المهمة","error");return;}
if(!profile?.id){toast("أعد تحميل الصفحة","error");return;}
const branchId=form.branch_id||(profile.branch_id)||null;
setBusy(true);
try{await sb.q("tasks",{method:"POST",body:{title:form.title,description:form.desc||null,branch_id:branchId,created_by:profile.id,priority:form.priority,due_date:form.due||null,status:"pending",task_type:"operational",is_deleted:false,is_overdue:false}});
toast("تم إنشاء المهمة!","success");setShowNew(false);setForm({title:"",desc:"",branch_id:"",priority:"medium",due:""});reload();}catch(e){toast(e.message,"error");}setBusy(false);};

const markDone=async(id)=>{try{await sb.q("tasks",{method:"PATCH",body:{status:"completed"},qs:`id=eq.${id}`});toast("تم!","success");reload();}catch(e){toast(e.message,"error");}};

if(loading)return <Loading/>;

return(<div>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
<div style={{fontSize:12,color:C.sub}}>{data.filter(t=>t.status!=="completed").length} مهمة نشطة</div>
<Btn onClick={()=>setShowNew(!showNew)} color={showNew?C.red:C.gold}>{showNew?"✕ إلغاء":"+ مهمة جديدة"}</Btn>
</div>

{showNew&&<Card style={{padding:"20px 24px",marginBottom:16,border:`1px solid ${C.gold}40`}}>
<div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>مهمة جديدة</div>
<div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>العنوان *</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="مثال: تنظيف واجهة العرض" style={iS}/></div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الفرع</label><select value={form.branch_id} onChange={e=>setForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">كل الفروع</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الأولوية</label><select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={iS}><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="critical">طارئة</option></select></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الموعد</label><input type="datetime-local" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))} style={iS}/></div>
</div>
<div style={{marginBottom:14}}><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الوصف</label><textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="تفاصيل إضافية..." style={{...iS,resize:"vertical",minHeight:50}}/></div>
<Btn onClick={create} disabled={busy}>{busy?"جاري الإنشاء...":"إنشاء المهمة →"}</Btn>
</Card>}

{data.length===0?<Empty icon="☰" title="لا توجد مهام" action="+ مهمة جديدة" onAction={()=>setShowNew(true)}/>:
data.map(t=>{const pColors={critical:C.red,high:C.amber,medium:C.blue,low:C.muted};
return(<Card key={t.id} style={{padding:"14px 18px",marginBottom:8,borderRight:`3px solid ${pColors[t.priority]||C.blue}`}}>
<div style={{display:"flex",justifyContent:"space-between",gap:10}}>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4}}>{t.title}</div>
<div style={{fontSize:10,color:C.sub}}>📍 {bm[t.branch_id]||"كل الفروع"}{t.due_date&&` · 🕐 ${new Date(t.due_date).toLocaleDateString("ar")}`}</div>
{t.description&&<div style={{fontSize:10,color:C.muted,marginTop:4}}>{t.description}</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
<Badge text={t.status==="completed"?"✓ تم":t.is_overdue?"⚠ متأخر":"قيد التنفيذ"} color={t.status==="completed"?C.green:t.is_overdue?C.red:C.amber} bg={t.status==="completed"?C.greenS:t.is_overdue?C.redS:C.amberS}/>
{t.status!=="completed"&&<Btn onClick={()=>markDone(t.id)} style={{fontSize:10,padding:"4px 10px"}}>✓ تم</Btn>}
</div>
</div>
</Card>);})}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS PAGE — View reports + New simplified report
// ═══════════════════════════════════════════════════════════════════════
function ReportsPage({setPg}){
const{data,loading}=useQ("reports","is_deleted=eq.false&status=neq.draft&order=created_at.desc&limit=50");
const{bm,isAdmin}=useAuth();
if(loading)return <Loading/>;
if(!data.length)return <Empty icon="📋" title="لا توجد تقارير" msg="الفروع لسه مرفعتش تقارير" action="+ تقرير جديد" onAction={()=>setPg("new_report")}/>;
return(<div>
<div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>setPg("new_report")}>+ تقرير جديد</Btn></div>
<Card style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["الفرع","الشيفت","النسبة","الحالة","التاريخ"].map(h=>(<th key={h} style={{padding:"10px 14px",textAlign:"right",fontSize:9,color:C.muted,fontWeight:700}}>{h}</th>))}</tr></thead>
<tbody>{data.map(r=>(<tr key={r.id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"10px 14px",fontWeight:700,color:C.text}}>{bm[r.branch_id]||"—"}</td>
<td style={{padding:"10px 14px",color:C.sub,textTransform:"capitalize"}}>{r.shift}</td>
<td style={{padding:"10px 14px"}}>{r.compliance_score>0?<span style={{fontWeight:700,color:cC(r.compliance_score)}}>{Math.round(r.compliance_score)}%</span>:<span style={{color:C.muted}}>—</span>}</td>
<td style={{padding:"10px 14px"}}><Badge text={r.status==="approved"?"✓ معتمد":r.status==="submitted"?"مرفوع":"مسودة"} color={r.status==="approved"?C.green:r.status==="submitted"?C.blue:C.muted} bg={r.status==="approved"?C.greenS:r.status==="submitted"?C.blueS:"rgba(0,0,0,0.05)"}/></td>
<td style={{padding:"10px 14px",color:C.muted,fontSize:10}}>{new Date(r.created_at).toLocaleDateString("ar")}</td>
</tr>))}</tbody>
</table>
</Card>
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// NEW REPORT — Simplified 12-item checklist
// ═══════════════════════════════════════════════════════════════════════
function NewReport({setPg}){
const{profile,branches}=useAuth();const{toast}=useToast();
const[br,sBr]=useState(profile?.branch_id||"");
const[shift,sSh]=useState("opening");
const[notes,sN]=useState("");
const[checks,sChecks]=useState({});
const[busy,sBusy]=useState(false);
const[done,sDone]=useState(false);

useEffect(()=>{if(!br&&branches.length)sBr(branches[0].id);},[branches]);

const completed=Object.values(checks).filter(v=>v==="done").length;
const total=CHECKLIST.length;
const compliance=total>0?Math.round((completed/total)*100):0;

const submit=async()=>{
if(!br){toast("اختار الفرع","error");return;}
const answered=Object.keys(checks).length;
if(answered<10){toast("عبّي على الأقل 10 بنود","error");return;}
sBusy(true);
try{
const[report]=await sb.q("reports",{method:"POST",body:{branch_id:br,submitted_by:profile?.id,shift,status:"submitted",manager_notes:notes||null,compliance_score:compliance,total_items:total,completed_items:completed,follow_up_items:Object.values(checks).filter(v=>v==="follow").length,not_completed_items:Object.values(checks).filter(v=>v==="not_done").length}});
// Save answers
try{
const secs=await sb.q("report_sections",{qs:"order=sort_order"});
const secId=secs[0]?.id;
if(secId&&report){
const rows=CHECKLIST.filter(item=>checks[item.id]).map(item=>({report_id:report.id,section_id:secId,item_text:`${item.icon} ${item.text}`,status:checks[item.id]==="done"?"completed":checks[item.id]==="follow"?"follow_up":"not_completed",answered_by:profile?.id}));
if(rows.length)await sb.q("report_answers",{method:"POST",body:rows});
}}catch{}
toast("تم رفع التقرير!","success");sDone(true);
}catch(e){toast(e.message,"error");}sBusy(false);};

if(done)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:16}}>
<div style={{fontSize:56}}>✅</div>
<div style={{fontSize:20,fontWeight:900,color:C.text}}>تم رفع التقرير</div>
<Card style={{padding:"20px 40px",textAlign:"center"}}><div style={{fontSize:40,fontWeight:900,color:cC(compliance)}}>{compliance}%</div><div style={{fontSize:11,color:C.muted}}>نسبة الامتثال</div></Card>
<div style={{display:"flex",gap:10}}><Btn onClick={()=>setPg("reports")}>عرض التقارير</Btn><Btn onClick={()=>{sDone(false);sChecks({});}} outline color={C.blue}>تقرير جديد</Btn></div>
</div>);

return(<div style={{maxWidth:700,margin:"0 auto"}}>
{/* Progress */}
<Card style={{padding:"16px 20px",marginBottom:16}}>
<div style={{display:"flex",alignItems:"center",gap:16}}>
<Ring pct={compliance} sz={50} sw={4} color={cC(compliance)}/>
<div style={{flex:1}}>
<div style={{fontSize:20,fontWeight:900,color:cC(compliance)}}>{compliance}%</div>
<div style={{fontSize:10,color:C.muted}}>{completed} من {total} بند مكتمل · <span style={{color:C.gold}}>الموعد: 4:00 م يومياً</span></div>
<Bar v={completed} max={total} color={cC(compliance)}/>
</div>
<Btn onClick={submit} disabled={busy}>{busy?"...":"رفع التقرير →"}</Btn>
</div>
</Card>

{/* Branch + Shift */}
<Card style={{padding:"16px 20px",marginBottom:12}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الفرع</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الشيفت</label><select value={shift} onChange={e=>sSh(e.target.value)} style={iS}><option value="opening">فتح</option><option value="closing">قفل</option><option value="full_day">يوم كامل</option></select></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>ملاحظات</label><input value={notes} onChange={e=>sN(e.target.value)} placeholder="ملاحظات..." style={iS}/></div>
</div>
</Card>

{/* Checklist */}
<Card style={{overflow:"hidden"}}>
{CHECKLIST.map((item,idx)=>{
const status=checks[item.id];
const colors={done:{bg:C.greenS,border:C.green},follow:{bg:C.amberS,border:C.amber},not_done:{bg:C.redS,border:C.red}};
const sc=colors[status]||{bg:"transparent",border:C.bd};
return(<div key={item.id} style={{padding:"14px 20px",borderBottom:idx<CHECKLIST.length-1?`1px solid ${C.bd}`:"none",background:sc.bg,transition:"background 0.2s"}}>
<div style={{display:"flex",alignItems:"center",gap:12}}>
<span style={{fontSize:20}}>{item.icon}</span>
<div style={{flex:1,fontSize:13,fontWeight:600,color:C.text}}>{item.text}</div>
<div style={{display:"flex",gap:4}}>
{[["done","✓ تم",C.green],["follow","⚡ متابعة",C.amber],["not_done","✕ لأ",C.red]].map(([s,l,col])=>(
<button key={s} onClick={()=>sChecks(p=>({...p,[item.id]:p[item.id]===s?undefined:s}))} style={{fontSize:10,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:700,border:`1px solid ${status===s?col:C.bd}`,background:status===s?col+"20":"transparent",color:status===s?col:C.muted}}>{l}</button>))}
</div>
</div>
</div>);})}
</Card>
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// USERS PAGE — Admin only, view + edit
// ═══════════════════════════════════════════════════════════════════════
function UsersPage(){
const{data,loading,reload}=useQ("profiles","order=created_at.desc");
const{bm,branches}=useAuth();const{toast}=useToast();
const[sel,setSel]=useState(null);
const[form,setForm]=useState({});
const[busy,setBusy]=useState(false);
const roles=["admin","area_manager","branch_manager","vm","assistant"];
const roleLabels={admin:"أدمن",area_manager:"مدير منطقة",branch_manager:"مدير فرع",vm:"VM",assistant:"مساعد"};

const startEdit=(u)=>{setSel(u.id);setForm({full_name:u.full_name||"",role:u.role||"assistant",branch_id:u.branch_id||"",is_active:u.is_active!==false,can_select_role:u.can_select_role||false});};
const save=async()=>{if(!sel)return;setBusy(true);
try{await sb.q("profiles",{method:"PATCH",body:{full_name:form.full_name,role:form.role,branch_id:form.branch_id||null,is_active:form.is_active,can_select_role:form.can_select_role},qs:`id=eq.${sel}`});
toast("تم الحفظ!","success");setSel(null);reload();}catch(e){toast(e.message,"error");}setBusy(false);};

if(loading)return <Loading/>;
return(<div>
{sel&&<Card style={{padding:"18px 22px",marginBottom:14,border:`1px solid ${C.gold}40`}}>
<div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:12}}>تعديل المستخدم</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الاسم</label><input value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الدور</label><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={iS}>{roles.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></div>
<div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>الفرع</label><select value={form.branch_id} onChange={e=>setForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">بدون (الكل)</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
</div>
<div style={{display:"flex",gap:16,alignItems:"center"}}>
<label style={{fontSize:11,color:C.sub,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))}/>نشط</label>
<label style={{fontSize:11,color:C.sub,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="checkbox" checked={form.can_select_role} onChange={e=>setForm(p=>({...p,can_select_role:e.target.checked}))}/>اختيار الدور</label>
<div style={{flex:1}}/>
<Btn onClick={save} disabled={busy}>{busy?"...":"حفظ"}</Btn>
<Btn onClick={()=>setSel(null)} outline color={C.muted}>إلغاء</Btn>
</div>
</Card>}

<Card style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["الاسم","الدور","الفرع","الحالة",""].map(h=>(<th key={h} style={{padding:"10px 14px",textAlign:"right",fontSize:9,color:C.muted,fontWeight:700}}>{h}</th>))}</tr></thead>
<tbody>{data.map(u=>(<tr key={u.id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"10px 14px",fontWeight:700,color:C.text}}>{u.full_name}</td>
<td style={{padding:"10px 14px",color:C.sub}}>{roleLabels[u.role]||u.role}</td>
<td style={{padding:"10px 14px",color:C.sub}}>{bm[u.branch_id]||"الكل"}</td>
<td style={{padding:"10px 14px"}}><Badge text={u.is_active!==false?"نشط":"موقوف"} color={u.is_active!==false?C.green:C.red} bg={u.is_active!==false?C.greenS:C.redS}/></td>
<td style={{padding:"10px 14px"}}><Btn onClick={()=>startEdit(u)} outline color={C.blue} style={{fontSize:10,padding:"4px 10px"}}>تعديل</Btn></td>
</tr>))}</tbody>
</table>
</Card>
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
const TITLES={dash:"Dashboard",sales:"المبيعات والتارجت",tasks:"المهام",reports:"التقارير",new_report:"تقرير جديد",users:"إدارة المستخدمين"};

function App(){
const{user,profile,rdy,isAdmin}=useAuth();
const[pg,setPg]=useState("dash");
const[sideOpen,setSideOpen]=useState(false);
const[sessionRole,setSessionRole]=useState(()=>{try{return sessionStorage.getItem("sb_role")||null;}catch{return null;}});

const selectRole=(r)=>{setSessionRole(r);try{sessionStorage.setItem("sb_role",r);}catch{}};
const mob=typeof window!=="undefined"&&window.innerWidth<768;

if(!rdy)return <Loading/>;
if(!user)return <Login/>;
if(profile?.can_select_role&&!sessionRole)return <RoleSelector onSelect={selectRole}/>;

return(<div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Inter',system-ui,sans-serif"}}>
<style>{`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:767px){.sidebar{transform:${sideOpen?"translateX(0)":"translateX(-100%)"} !important;}}`}</style>
{sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:199}}/>}
<Sidebar pg={pg} setPg={setPg} sideOpen={sideOpen} setSideOpen={setSideOpen}/>
<main style={{marginLeft:mob?0:220,minHeight:"100vh"}}>
{/* Top bar */}
<div style={{position:"sticky",top:0,zIndex:100,background:"#FFF",borderBottom:`1px solid ${C.bd}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
{mob&&<button onClick={()=>setSideOpen(!sideOpen)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,color:C.blue}}>☰</button>}
<div style={{fontSize:16,fontWeight:800,color:C.text}}>{TITLES[pg]||"RAVIN Academy"}</div>
</div>
{pg!=="new_report"&&<Btn onClick={()=>setPg("new_report")} style={{fontSize:10,padding:"6px 14px"}}>+ تقرير</Btn>}
</div>
{/* Pages */}
<div style={{padding:"20px 24px"}}>
{pg==="dash"&&<Dashboard setPg={setPg}/>}
{pg==="sales"&&<SalesPage/>}
{pg==="tasks"&&<TasksPage setPg={setPg}/>}
{pg==="reports"&&<ReportsPage setPg={setPg}/>}
{pg==="new_report"&&<NewReport setPg={setPg}/>}
{pg==="users"&&<UsersPage/>}
</div>
</main>
</div>);}

export default function RavinAcademy(){return <ErrorBoundary><ToastProvider><AuthProvider><App/></AuthProvider></ToastProvider></ErrorBoundary>;}
