import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

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
  signIn:async(email,pw)=>{const r=await fetch(`${SU}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SK,"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error_description||e.msg||"Invalid credentials");}const d=await r.json();_t=d.access_token;try{localStorage.setItem("sb_token",d.access_token);localStorage.setItem("sb_refresh",d.refresh_token);}catch{}return d;},
  signOut:async()=>{if(_t)await fetch(`${SU}/auth/v1/logout`,{method:"POST",headers:{apikey:SK,Authorization:`Bearer ${_t}`}}).catch(()=>{});_t=null;try{localStorage.removeItem("sb_token");localStorage.removeItem("sb_refresh");}catch{}},
  getUser:async()=>{if(!_t)return null;const r=await fetch(`${SU}/auth/v1/user`,{headers:{apikey:SK,Authorization:`Bearer ${_t}`}});if(!r.ok){_t=null;try{localStorage.removeItem("sb_token");}catch{}return null;}return r.json();},
  upload:async(bucket,path,file)=>{const fd=new FormData();fd.append("",file);const r=await fetch(`${SU}/storage/v1/object/${bucket}/${path}`,{method:"POST",headers:{apikey:SK,...(_t?{Authorization:`Bearer ${_t}`}:{})},body:file});if(!r.ok)throw new Error("Upload failed");return`${SU}/storage/v1/object/public/${bucket}/${path}`;},
};})();

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS (FIXED — no more undefined refs)
// ═══════════════════════════════════════════════════════════════════════
const C={
  bg:"#F0F4F8",card:"#FFFFFF",text:"#1A1F2E",sub:"#5F6B7A",muted:"#9EA8B5",dim:"#DDE3EF",
  gold:"#C89B4A",goldS:"rgba(200,155,74,0.1)",goldB:"rgba(200,155,74,0.22)",
  green:"#1B5E20",greenS:"#E8F5E9",
  red:"#B71C1C",redS:"#FFEBEE",
  amber:"#7B4B00",amberS:"#FFF3E0",
  blue:"#0D47A1",blueS:"#E8F0FE",
  purple:"#4527A0",purpleS:"#EDE7F6",
  bd:"rgba(0,0,0,0.09)",bh:"rgba(0,0,0,0.18)",
};

const SEC=[
  {code:"opening",title:"Opening Operations",icon:"🏪",items:["Store opened on time","Lights & displays checked","Music & screens operational","AC & climate correct","Cleanliness completed","Window display verified","VM standards reviewed","Feature areas organized","Price tags audited"]},
  {code:"team",title:"Team Management",icon:"👥",items:["Attendance taken","Grooming checked","Uniform compliance","Morning briefing done","Daily target shared","KPIs explained","Focus categories assigned","Team motivation done"]},
  {code:"cashier",title:"Cashier & Finance",icon:"💳",items:["Cash float verified","POS operational","Payment devices tested","Deposit done","Safe checked","Cash drawers organized"]},
  {code:"stock",title:"Stock & Operations",icon:"📦",items:["Deliveries processed","Replenishment done","Stockroom organized","Out-of-stock reviewed","Damaged items tagged","Returns processed"]},
  {code:"sales",title:"Sales & CX",icon:"📊",items:["Conversion monitored","UPT tracked","ATV monitored","Traffic counted","Complaints handled","Cross-selling active","Service quality OK"]},
  {code:"admin",title:"Administrative",icon:"📋",items:["Report submitted","Dashboard updated","SOP compliance reviewed","Area Manager updated","Team meeting done","Action plan active"]},
  {code:"closing",title:"Closing Operations",icon:"🔒",items:["Final cash counted","Sales reconciled","POS closed","Store cleaned","Alarm set","Closing report done"]},
];
const ALL_IT=SEC.flatMap(s=>s.items.map(i=>({sec:s.code,item:i})));
const TOT=ALL_IT.length;

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════
const fmt=n=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(0)}K`:String(Math.round(n||0));
const fE=n=>`EGP ${fmt(n)}`;
const cC=c=>c>=90?C.green:c>=80?C.blue:c>=70?C.amber:C.red;
const cL=c=>c>=90?"Excellent":c>=80?"Good":c>=70?"Attention":"Critical";
const cB=c=>c>=90?C.greenS:c>=80?C.blueS:c>=70?C.amberS:C.redS;
const hI=s=>({healthy:"☀️",attention:"⛅",risk:"🌧️",crisis:"⛈️"}[s]||"—");
const hC=s=>({healthy:C.green,attention:C.amber,risk:C.red,crisis:"#8B1A1A"}[s]||C.sub);
const pC=p=>({critical:C.red,high:C.amber,medium:C.blue,low:C.sub}[p]||C.sub);

// ═══════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════
function Ring({pct,sz=48,sw=4,color=C.gold}){const r=(sz-sw)/2,ci=2*Math.PI*r,d=(Math.min(pct||0,100)/100)*ci;return(<svg width={sz} height={sz} style={{transform:"rotate(-90deg)",flexShrink:0}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${d} ${ci}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease"}}/></svg>);}
function Bar({v,max=100,color=C.gold,h=3}){return(<div style={{width:"100%",height:h,background:"rgba(0,0,0,0.08)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${Math.min((v||0)/max*100,100)}%`,height:"100%",background:color,borderRadius:2,transition:"width 0.8s"}}/></div>);}
function Chip({text,color,bg}){return <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color,background:bg,padding:"2px 7px",borderRadius:4,whiteSpace:"nowrap"}}>{text}</span>;}
function GC({children,style:s={},onClick,glow}){const[h,sH]=useState(false);return(<div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={onClick} style={{background:C.card,border:`1px solid ${h&&onClick?C.bh:C.bd}`,borderRadius:14,transition:"all 0.2s",cursor:onClick?"pointer":"default",boxShadow:glow?`0 0 20px ${glow}`:"none",transform:h&&onClick?"translateY(-1px)":"none",...s}}>{children}</div>);}
function Bt({children,onClick,v="default",sz="md",style:s={},disabled}){const S={sm:{fontSize:10,padding:"5px 11px"},md:{fontSize:11,padding:"7px 15px"},lg:{fontSize:12,padding:"9px 20px"}};const V={default:{background:"rgba(0,0,0,0.05)",color:C.text,border:`1px solid ${C.bd}`},gold:{background:C.gold,color:"#0A0A0A",border:"none"},ghost:{background:"transparent",color:C.sub,border:"none"},danger:{background:C.redS,color:C.red,border:`1px solid ${C.red}30`}};return(<button onClick={onClick} disabled={disabled} style={{...S[sz],...V[v],cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:700,borderRadius:8,transition:"all 0.15s",opacity:disabled?.5:1,...s}}>{children}</button>);}
function SB({status}){const m={approved:{c:C.green,bg:C.greenS,l:"Approved"},submitted:{c:C.blue,bg:C.blueS,l:"Submitted"},pending_review:{c:C.amber,bg:C.amberS,l:"Pending"},rejected:{c:C.red,bg:C.redS,l:"Rejected"},draft:{c:C.muted,bg:"rgba(0,0,0,0.05)",l:"Draft"},pending:{c:C.sub,bg:"rgba(0,0,0,0.05)",l:"Pending"},in_progress:{c:C.blue,bg:C.blueS,l:"In Progress"},waiting_approval:{c:C.amber,bg:C.amberS,l:"Awaiting"},completed:{c:C.green,bg:C.greenS,l:"Done"},escalated:{c:C.red,bg:C.redS,l:"Escalated"},open:{c:C.red,bg:C.redS,l:"Open"},resolved:{c:C.green,bg:C.greenS,l:"Resolved"}};const cfg=m[status]||{c:C.sub,bg:"rgba(0,0,0,0.05)",l:status||"—"};return <Chip text={cfg.l} color={cfg.c} bg={cfg.bg}/>;}
const iS={width:"100%",padding:"8px 11px",borderRadius:8,border:`1px solid ${C.bd}`,background:"#FFFFFF",color:C.text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
function Ld({t="Loading..."}){return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,gap:14}}><div style={{width:28,height:28,border:`3px solid rgba(0,0,0,0.08)`,borderTop:`3px solid ${C.blue}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><div style={{fontSize:11,color:C.sub}}>{t}</div></div>;}
function Em({icon="📭",title,msg,action,onAction}){return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,gap:12}}><div style={{fontSize:36}}>{icon}</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>{title||"No data yet"}</div><div style={{fontSize:11,color:C.sub,textAlign:"center",maxWidth:300}}>{msg}</div>{action&&<Bt onClick={onAction} v="gold" sz="md">{action}</Bt>}</div>;}

// ═══════════════════════════════════════════════════════════════════════
// CONTEXTS
// ═══════════════════════════════════════════════════════════════════════
const TC=createContext();
function TP({children}){const[t,sT]=useState([]);const add=(msg,type="info")=>{const id=Date.now();sT(p=>[...p,{id,msg,type}]);setTimeout(()=>sT(p=>p.filter(x=>x.id!==id)),4000);};return(<TC.Provider value={{toast:add}}>{children}<div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>{t.map(x=>(<div key={x.id} style={{padding:"10px 16px",borderRadius:10,fontSize:12,fontWeight:600,background:x.type==="error"?"#3A1515":x.type==="success"?"#153A1F":"#1A1A22",color:x.type==="error"?C.red:x.type==="success"?C.green:C.text,border:`0.5px solid ${x.type==="error"?C.red+"40":x.type==="success"?C.green+"40":C.bd}`,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",minWidth:240,pointerEvents:"auto"}}>{x.type==="error"?"⚠ ":x.type==="success"?"✓ ":"ℹ "}{x.msg}</div>))}</div></TC.Provider>);}
const useToast=()=>useContext(TC);

const AC=createContext();
function AP({children}){
const[u,sU]=useState(null);const[p,sP]=useState(null);const[br,sBr]=useState([]);const[rdy,sR]=useState(false);
const[sRole,setSRS]=useState(()=>{try{return sessionStorage.getItem("sb_role")||null;}catch{return null;}});
const bm=Object.fromEntries(br.map(b=>[b.id,b.name]));
useEffect(()=>{(async()=>{
try{
let user=await sb.getUser();
if(!user){
  try{
    let ref=null;try{ref=localStorage.getItem("sb_refresh");}catch{}
    if(ref){const r=await fetch(`${SU}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SK,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:ref})});
    if(r.ok){const d=await r.json();try{localStorage.setItem("sb_token",d.access_token);localStorage.setItem("sb_refresh",d.refresh_token);}catch{}
    user=await sb.getUser();}}
  }catch{}
}
if(user){sU(user);
try{const[pr]=await sb.q("profiles",{qs:`id=eq.${user.id}`});sP(pr);}catch{}
try{sBr(await sb.q("branches",{qs:"is_active=eq.true&order=name"})||[]);}catch{}}
}catch{}finally{sR(true);}
})();},[]);
const login=async(em,pw)=>{const d=await sb.signIn(em,pw);sU(d.user);try{const[pr]=await sb.q("profiles",{qs:`id=eq.${d.user.id}`});sP(pr);}catch{}try{sBr(await sb.q("branches",{qs:"is_active=eq.true&order=name"})||[]);}catch{};
// start auto-refresh every 50min
if(typeof window!=="undefined"){clearInterval(window._ravRefresh);window._ravRefresh=setInterval(async()=>{try{let ref=null;try{ref=localStorage.getItem("sb_refresh");}catch{}if(ref){const r=await fetch(`${SU}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SK,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:ref})});if(r.ok){const d=await r.json();try{localStorage.setItem("sb_token",d.access_token);localStorage.setItem("sb_refresh",d.refresh_token);}catch{}}}}catch{}},50*60*1000);}
return d.user;};
const logout=async()=>{await sb.signOut();sU(null);sP(null);try{sessionStorage.removeItem("sb_role");}catch{}setSRS(null);if(typeof window!=="undefined")clearInterval(window._ravRefresh);};
const setSessionRole=(r)=>{setSRS(r);try{if(r)sessionStorage.setItem("sb_role",r);else sessionStorage.removeItem("sb_role");}catch{}};
const effectiveRole=sRole||p?.role;
return <AC.Provider value={{user:u,profile:p,branches:br,bm,rdy,login,logout,sessionRole:sRole,setSessionRole,effectiveRole}}>{children}</AC.Provider>;}
const useAuth=()=>useContext(AC);
function useQ(tbl,qs="",deps=[]){const[d,sD]=useState([]);const[l,sL]=useState(true);const r=useCallback(async()=>{sL(true);try{sD(await sb.q(tbl,{qs})||[]);}catch(e){console.error(e);sD([]);}sL(false);},[tbl,qs]);useEffect(()=>{r();},[r,...deps]);return{data:d,loading:l,reload:r};}

// ═══════════════════════════════════════════════════════════════════════
// FILE UPLOAD COMPONENT — NEW ✅
// ═══════════════════════════════════════════════════════════════════════
function FileUpload({bucket="report-images",onUploaded,label="Upload Image",accept="image/*"}){
  const{toast}=useToast();const[uploading,setU]=useState(false);const[preview,setPrev]=useState(null);const ref=useRef();
  const handle=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>5*1024*1024){toast("File too large (max 5MB)","error");return;}
    setPrev(URL.createObjectURL(file));setU(true);
    try{
      const ext=file.name.split(".").pop();
      const path=`${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
      const url=await sb.upload(bucket,path,file);
      onUploaded?.(url);toast("Uploaded!","success");
    }catch(err){toast("Upload failed: "+err.message,"error");}
    setU(false);
  };
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    {preview&&<div style={{width:"100%",height:120,borderRadius:10,overflow:"hidden",background:"rgba(0,0,0,0.03)",border:`1px solid ${C.bd}`}}><img src={preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
    <input ref={ref} type="file" accept={accept} onChange={handle} style={{display:"none"}}/>
    <Bt onClick={()=>ref.current?.click()} sz="sm" disabled={uploading} style={{alignSelf:"flex-start"}}>
      {uploading?"Uploading...":preview?"📷 Replace":"📷 "+label}
    </Bt>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════
function Login(){const{login}=useAuth();const{toast}=useToast();const[em,sE]=useState("");const[pw,sP]=useState("");const[busy,sB]=useState(false);
const go=async()=>{if(!em||!pw){toast("Enter credentials","error");return;}sB(true);try{await login(em,pw);toast("Welcome to RAVIN Academy!","success");}catch(e){toast(e.message,"error");}sB(false);};
return(<div style={{minHeight:"100vh",background:"#F0F4F8",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}><div style={{position:"absolute",top:"20%",left:"30%",width:500,height:500,background:"radial-gradient(circle,rgba(13,71,161,0.06),transparent 60%)",pointerEvents:"none"}}/><div style={{width:400,padding:"40px 36px",background:"#FFFFFF",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",borderRadius:20,border:`1px solid ${C.bd}`,position:"relative",zIndex:1}}><div style={{textAlign:"center",marginBottom:28}}><div style={{width:44,height:44,borderRadius:11,background:C.blue,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#0A0A0A",marginBottom:12}}>R</div><div style={{fontSize:22,fontWeight:900,letterSpacing:"0.1em",color:C.text}}>RAVIN <span style={{color:C.gold}}>ACADEMY</span></div><div style={{fontSize:9,color:C.sub,letterSpacing:"0.22em",marginTop:5}}>Make your world be proud</div></div>
<div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.1em",display:"block",marginBottom:5}}>EMAIL</label><input value={em} onChange={e=>sE(e.target.value)} placeholder="you@ravin.academy" onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/></div>
<div style={{marginBottom:20}}><label style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.1em",display:"block",marginBottom:5}}>PASSWORD</label><input type="password" value={pw} onChange={e=>sP(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/></div>
<Bt onClick={go} v="gold" sz="lg" disabled={busy} style={{width:"100%",fontSize:13}}>{busy?"Signing in...":"Sign In →"}</Bt>
<div style={{marginTop:16,padding:"12px",background:"rgba(0,0,0,0.02)",borderRadius:10,border:`1px solid ${C.bd}`,fontSize:9,color:C.muted,lineHeight:1.7}}>Run all SQL migrations → Create user in Supabase Auth → Sign in</div>
</div></div>);}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function Side({pg,setPg,profile:p,nC,effectiveRole:er,sideOpen,setSideOpen}){const{logout}=useAuth();
  const nav=[
  {id:"dash",l:"Dashboard",i:"◈",g:"CORE"},
  {id:"reports",l:"Reports",i:"◉",g:"OPS"},{id:"new_report",l:"New Report",i:"✚",g:"OPS",hl:1},
  {id:"tasks",l:"Tasks",i:"☰",g:"OPS"},{id:"new_task",l:"New Task",i:"+",g:"OPS",hl:1},
  {id:"sales",l:"Sales & Targets",i:"◆",g:"COMMERCIAL"},
  {id:"team",l:"My Team",i:"◑",g:"PEOPLE"},
  {id:"ai",l:"AI Insights",i:"✦",g:"INTEL"},{id:"notifs",l:"Notifications",i:"◎",badge:nC,g:"INTEL"},
  ...((er==="admin"||er==="area_manager")?[{id:"users",l:"Users",i:"⊕",g:"ADMIN"},{id:"settings",l:"Settings",i:"⚙",g:"ADMIN"}]:[]),
];
const gs=[...new Set(nav.map(n=>n.g))];
return(<aside className="sidebar" style={{width:216,minHeight:"100vh",background:"#FFFFFF",display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,bottom:0,zIndex:200,borderRight:`1px solid ${C.bd}`,boxShadow:"2px 0 8px rgba(0,0,0,0.04)"}}>
  <div style={{padding:"20px 18px 12px",borderBottom:`1px solid ${C.bd}`}}>
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <div style={{width:28,height:28,borderRadius:7,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#0A0A0A"}}>R</div>
      <div><div style={{fontSize:13,fontWeight:900,letterSpacing:"0.08em",color:C.blue,lineHeight:1}}>RAVIN <span style={{color:C.gold}}>ACADEMY</span></div>
        <div style={{fontSize:7,color:C.muted,letterSpacing:"0.18em",marginTop:2}}>Make your world be proud</div></div></div></div>
  <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>{gs.map(g=>(<div key={g}><div style={{fontSize:8,fontWeight:700,color:C.muted,letterSpacing:"0.14em",padding:"10px 10px 4px",textTransform:"uppercase"}}>{g}</div>
    {nav.filter(n=>n.g===g).map(n=>(<button key={n.id} onClick={()=>setPg(n.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",borderRadius:7,border:"none",cursor:"pointer",background:pg===n.id?C.blueS:n.hl?C.blueS+"44":"transparent",color:pg===n.id?C.blue:n.hl?C.blue+"aa":C.sub,fontSize:10.5,fontWeight:pg===n.id?700:400,transition:"all 0.15s",marginBottom:1,textAlign:"left",fontFamily:"inherit",borderLeft:pg===n.id?`2px solid ${C.blue}`:"2px solid transparent"}}><span style={{fontSize:12,width:16,textAlign:"center",flexShrink:0}}>{n.i}</span><span style={{flex:1}}>{n.l}</span>{n.badge>0&&<span style={{background:C.red,color:"#fff",fontSize:8,fontWeight:700,borderRadius:10,padding:"1px 5px"}}>{n.badge}</span>}</button>))}</div>))}</div>
  <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bd}`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#0A0A0A",flexShrink:0}}>{(p?.full_name||"U").split(" ").map(w=>w[0]).join("").slice(0,2)}</div><div style={{minWidth:0,flex:1}}><div style={{fontSize:10,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.full_name}</div><div style={{fontSize:8,color:C.muted}}>{p?.role?.replace("_"," ")}</div></div><button onClick={logout} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11,padding:3}}>⏻</button></div></div>
</aside>);}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function Dash({setPg}){const{branches:brs}=useAuth();const today=new Date().toISOString().split("T")[0];
const{data:rpts,loading}=useQ("reports",`report_date=eq.${today}&is_deleted=eq.false&status=neq.draft&order=created_at.desc`);
const{data:health}=useQ("branch_health","order=health_score.desc");
const{data:ins}=useQ("ai_insights","is_active=eq.true&order=generated_at.desc&limit=6");
const avgC=rpts.length?Math.round(rpts.filter(r=>r.compliance_score>0).reduce((s,r)=>s+ +r.compliance_score,0)/Math.max(rpts.filter(r=>r.compliance_score>0).length,1)):0;
if(loading)return <Ld t="Loading dashboard..."/>;
return(<div>
  {ins.length>0&&<div style={{background:"#FFFDF5",borderRadius:14,padding:"18px 22px",marginBottom:20,border:`1px solid ${C.goldB}`,boxShadow:`0 0 28px ${C.goldS}`}}><div style={{fontSize:10,fontWeight:800,color:C.gold,letterSpacing:"0.12em",marginBottom:10}}>✦ RAVIN ACADEMY · AI BRIEF</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:5}}>{ins.map(i=>(<div key={i.id} style={{padding:"6px 10px",borderRadius:7,background:i.severity==="critical"?C.redS:i.severity==="warning"?C.amberS:"rgba(0,0,0,0.02)",border:`1px solid ${i.severity==="critical"?C.red+"20":C.bd}`}}><div style={{fontSize:10,fontWeight:600,color:C.text}}>{i.title}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{i.content}</div></div>))}</div></div>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8,marginBottom:20}}>
    {[{l:"Reports",v:rpts.length,c:C.gold,ck:()=>setPg("reports")},{l:"Compliance",v:avgC?`${avgC}%`:"—",c:cC(avgC),ring:avgC>0,rp:avgC},{l:"Missing",v:Math.max(brs.length-new Set(rpts.map(r=>r.branch_id)).size,0),c:C.red},{l:"Stores",v:brs.length,c:C.gold,ck:()=>setPg("branches")}].map((k,i)=>(<GC key={i} onClick={k.ck} style={{padding:"14px 16px"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:20,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={k.rp} sz={34} sw={3} color={k.c}/>}</div></GC>))}
  </div>
  {health.length>0&&<div style={{marginBottom:20}}><div style={{fontSize:10,fontWeight:700,color:C.sub,marginBottom:10}}>STORE HEALTH</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>{health.map(b=>(<GC key={b.branch_id} onClick={()=>setPg({id:"branch_twin",data:b})} style={{padding:"14px 18px"}} glow={b.health_status==="crisis"?C.redS:null}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2}}>{b.branch_name}</div><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11}}>{hI(b.health_status)}</span><span style={{fontSize:9,color:hC(b.health_status),fontWeight:600,textTransform:"capitalize"}}>{b.health_status}</span></div></div><Ring pct={b.health_score} sz={34} sw={3} color={hC(b.health_status)}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>{[{l:"Health",v:`${b.health_score}%`,c:hC(b.health_status)},{l:"Comp",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—",c:C.gold},{l:"Tasks",v:`${b.completed_tasks}/${b.total_tasks}`,c:C.blue}].map(x=>(<div key={x.l} style={{textAlign:"center",background:"rgba(0,0,0,0.03)",borderRadius:5,padding:"4px"}}><div style={{fontSize:11,fontWeight:700,color:x.c}}>{x.v}</div><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div></div>))}</div></GC>))}</div></div>}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// BRANCH TWIN — NEW ✅ FULL DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════
function BranchTwin({branch,setPg}){
  const{bm}=useAuth();const[tab,setTab]=useState("overview");
  const{data:reports}=useQ("reports",`branch_id=eq.${branch.branch_id}&is_deleted=eq.false&order=created_at.desc&limit=10`);
  const{data:tasks}=useQ("tasks",`branch_id=eq.${branch.branch_id}&is_deleted=eq.false&order=created_at.desc&limit=10`);
  const{data:incidents}=useQ("incidents",`branch_id=eq.${branch.branch_id}&is_deleted=eq.false&order=created_at.desc&limit=5`);
  const{data:staff}=useQ("profiles",`branch_id=eq.${branch.branch_id}&is_active=eq.true`);
  const{data:insights}=useQ("ai_insights",`branch_id=eq.${branch.branch_id}&is_active=eq.true&order=generated_at.desc&limit=5`);
  const{data:activity}=useQ("activity_logs",`branch_id=eq.${branch.branch_id}&order=created_at.desc&limit=10`);
  const b=branch;

  return(<div>
    <Bt onClick={()=>setPg("branches")} sz="sm" style={{marginBottom:14}}>← All Stores</Bt>
    {/* Header */}
    <GC style={{padding:"22px 26px",marginBottom:14}} glow={b.health_status==="crisis"?C.redS:null}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:18}}>
        <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{fontSize:22}}>{hI(b.health_status)}</span><div style={{fontSize:20,fontWeight:900,color:C.text}}>{b.branch_name}</div></div>
          <div style={{display:"flex",gap:6}}><Chip text={b.health_status?.toUpperCase()} color={hC(b.health_status)} bg={hC(b.health_status)+"18"}/><Chip text={b.area} color={C.gold} bg={C.goldS}/></div></div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}><Ring pct={b.health_score} sz={56} sw={5} color={hC(b.health_status)}/><div><div style={{fontSize:26,fontWeight:900,color:hC(b.health_status)}}>{b.health_score}%</div><div style={{fontSize:9,color:C.muted}}>Health Score</div></div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:8}}>
        {[{l:"Compliance",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—"},{l:"Reports",v:b.reports_today},{l:"Tasks",v:`${b.completed_tasks}/${b.total_tasks}`},{l:"Overdue",v:b.overdue_tasks},{l:"Incidents",v:b.open_incidents},{l:"Staff",v:staff.length}].map(k=>(<div key={k.l} style={{background:"rgba(0,0,0,0.03)",borderRadius:7,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{k.l}</div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{k.v}</div></div>))}
      </div>
    </GC>

    {/* Tabs */}
    <div style={{display:"flex",gap:4,marginBottom:14}}>{["overview","reports","tasks","staff","timeline","ai"].map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",background:tab===t?C.goldS:"transparent",color:tab===t?C.gold:C.sub,fontSize:10,fontWeight:tab===t?700:400,fontFamily:"inherit",textTransform:"capitalize",borderBottom:tab===t?`2px solid ${C.gold}`:"2px solid transparent"}}>{t==="ai"?"AI Insights":t}</button>))}</div>

    {/* Tab content */}
    {tab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <GC style={{padding:"16px 20px"}}><div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.08em",marginBottom:12}}>PERFORMANCE DNA</div>
        {[{l:"Health Score",v:`${b.health_score}%`},{l:"Avg Compliance",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—"},{l:"Task Completion",v:b.total_tasks>0?`${Math.round(b.completed_tasks/b.total_tasks*100)}%`:"—"},{l:"Open Incidents",v:b.open_incidents}].map(x=>(<div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:10,color:C.sub}}>{x.l}</span><span style={{fontSize:10,fontWeight:600,color:C.text}}>{x.v}</span></div>))}</GC>
      <GC style={{padding:"16px 20px"}}><div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.08em",marginBottom:12}}>QUICK STATS</div>
        {[{l:"Reports Today",v:b.reports_today},{l:"Overdue Tasks",v:b.overdue_tasks},{l:"Total Staff",v:staff.length},{l:"Incidents Open",v:b.open_incidents}].map(x=>(<div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:10,color:C.sub}}>{x.l}</span><span style={{fontSize:10,fontWeight:600,color:C.text}}>{x.v}</span></div>))}</GC>
    </div>}

    {tab==="reports"&&(reports.length===0?<Em icon="📋" title="No reports"/>:<div>{reports.map(r=>(<GC key={r.id} style={{padding:"12px 18px",marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:11,fontWeight:600,color:C.text}}>{r.shift} shift</div><div style={{fontSize:9,color:C.muted}}>{new Date(r.created_at).toLocaleString()}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}>{r.compliance_score>0&&<span style={{fontSize:12,fontWeight:700,color:cC(r.compliance_score)}}>{Math.round(r.compliance_score)}%</span>}<SB status={r.status}/></div></div></GC>))}</div>)}

    {tab==="tasks"&&(tasks.length===0?<Em icon="☰" title="No tasks"/>:<div>{tasks.map(t=>(<GC key={t.id} style={{padding:"12px 18px",marginBottom:6,borderLeft:`2px solid ${pC(t.priority)}`}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:11,fontWeight:600,color:C.text}}>{t.title}</div>{t.is_overdue&&<Chip text="OVERDUE" color={C.red} bg={C.redS}/>}</div><SB status={t.status}/></div></GC>))}</div>)}

    {tab==="staff"&&(staff.length===0?<Em icon="👥" title="No staff"/>:<GC style={{overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Name","Role"].map(h=>(<th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{staff.map(s=>(<tr key={s.id} onClick={()=>setPg({id:"emp_detail",data:s})} style={{borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}}><td style={{padding:"10px 14px",fontWeight:700,color:C.text}}>{s.full_name}</td><td style={{padding:"10px 14px",color:C.sub,textTransform:"capitalize"}}>{s.role?.replace("_"," ")}</td></tr>))}</tbody></table></GC>)}

    {tab==="timeline"&&(activity.length===0?<Em icon="📜" title="No activity"/>:<GC style={{padding:"18px 22px"}}>{activity.map((a,i)=>(<div key={a.id} style={{display:"flex",gap:10,paddingBottom:10,paddingTop:i?10:0,borderBottom:`1px solid ${C.bd}`}}><div style={{width:26,height:26,borderRadius:6,background:C.goldS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:C.gold,fontWeight:700,flexShrink:0}}>{new Date(a.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div><div><div style={{fontSize:10,fontWeight:600,color:C.text}}>{a.action}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{a.entity_type||""}</div></div></div>))}</GC>)}

    {tab==="ai"&&(insights.length===0?<Em icon="✦" title="No AI insights" msg="Insights generate automatically from reports and operations data."/>:<GC style={{padding:"18px 22px"}}><div style={{fontSize:9,fontWeight:700,color:C.gold,letterSpacing:"0.08em",marginBottom:14}}>✦ AI INSIGHTS — {b.branch_name?.toUpperCase()}</div>{insights.map(i=>(<div key={i.id} style={{padding:"10px 14px",borderRadius:7,marginBottom:6,background:i.severity==="critical"?C.redS:i.severity==="warning"?C.amberS:"rgba(0,0,0,0.02)",borderLeft:`3px solid ${i.severity==="critical"?C.red:i.severity==="warning"?C.amber:C.green}`}}><div style={{fontSize:10,fontWeight:600,color:C.text}}>{i.title}</div><div style={{fontSize:9,color:C.sub,marginTop:3}}>{i.content}</div></div>))}</GC>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL + AI COACHING — NEW ✅
// ═══════════════════════════════════════════════════════════════════════
function EmpDetail({emp,setPg}){
const{bm,profile:me}=useAuth();const{toast}=useToast();
const{data:perf,reload:rldP}=useQ("employee_targets",`employee_id=eq.${emp.id}`);
const{data:tasks}=useQ("tasks",`assigned_to=eq.${emp.id}&is_deleted=eq.false&order=created_at.desc&limit=10`);
const{data:training}=useQ("training_completions",`user_id=eq.${emp.id}`);
const{data:attendance}=useQ("attendance_logs",`user_id=eq.${emp.id}&order=log_date.desc&limit=30`);
const[coaching,setCoaching]=useState("");const[loadingAI,setLAI]=useState(false);
const[showTarget,setShowTarget]=useState(false);const[targetAmt,setTargetAmt]=useState("");const[savingT,setSavingT]=useState(false);
const[showSales,setShowSales]=useState(false);const[salesForm,setSalesForm]=useState({date:new Date().toISOString().slice(0,10),sales:"",invoices:"",qty:""});const[savingS,setSavingS]=useState(false);

const pr=perf[0]||{};
const tasksDone=tasks.filter(t=>t.status==="completed").length;
const presentDays=attendance.filter(a=>a.status==="present").length;
const canEdit=me?.role==="admin"||me?.role==="area_manager";

const saveTarget=async()=>{
if(!targetAmt){toast("Enter target amount","error");return;}
setSavingT(true);
try{
await sb.rpc("upsert_employee_target",{p_employee_id:emp.id,p_month:new Date().toISOString().slice(0,7)+"-01",p_target:+targetAmt,p_user_id:me.id});
toast("Target saved!","success");setShowTarget(false);rldP();
}catch(e){toast(e.message,"error");}
setSavingT(false);};

const saveSales=async()=>{
if(!salesForm.sales){toast("Enter sales amount","error");return;}
setSavingS(true);
try{
await sb.rpc("upsert_employee_daily_sales",{p_employee_id:emp.id,p_branch_id:emp.branch_id,p_date:salesForm.date,p_sales:+salesForm.sales,p_invoices:+salesForm.invoices||0,p_quantity:+salesForm.qty||0});
toast("Sales saved!","success");setShowSales(false);rldP();
}catch(e){toast(e.message,"error");}
setSavingS(false);};

const generateCoaching=async()=>{setLAI(true);try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"You are RAVIN Academy employee coaching AI. Give specific actionable retail coaching. Be encouraging but direct.",messages:[{role:"user",content:`Coach ${emp.full_name}, role: ${emp.role}, branch: ${bm[emp.branch_id]||"Unknown"}. Score: ${emp.performance_score||0}%. MTD sales: ${fE(pr.mtd_sales||0)}, target: ${fE(pr.monthly_target||0)}, achievement: ${pr.achievement_pct||0}%, UPT: ${pr.upt||0}, ATV: ${fE(pr.atv||0)}. Tasks done: ${tasksDone}/${tasks.length}. Training: ${training.length}. Present days: ${presentDays}. Give 3-4 specific coaching points.`}]})});const d=await r.json();setCoaching(d.content?.[0]?.text||"Unable to generate.");}catch{setCoaching("Connection error.");}setLAI(false);};

return(<div>
<Bt onClick={()=>setPg("employees")} sz="sm" style={{marginBottom:14}}>← All Employees</Bt>
<GC style={{padding:"22px 26px",marginBottom:14}}>
<div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
<div style={{width:48,height:48,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#0A0A0A"}}>{emp.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
<div><div style={{fontSize:18,fontWeight:800,color:C.text}}>{emp.full_name}</div>
<div style={{fontSize:10,color:C.sub}}>{bm[emp.branch_id]||"All"} · {emp.role?.replace("_"," ")}</div>
<div style={{display:"flex",gap:6,marginTop:4}}><Chip text={`Score: ${emp.performance_score||0}%`} color={C.gold} bg={C.goldS}/>
{pr.achievement_pct>0&&<Chip text={`Achievement: ${pr.achievement_pct}%`} color={cC(+pr.achievement_pct)} bg={cB(+pr.achievement_pct)}/>}
</div></div></div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:6}}>
{[{l:"MTD Sales",v:fE(pr.mtd_sales||0),c:C.gold},{l:"Target",v:fE(pr.monthly_target||0),c:C.text},{l:"Remaining",v:fE(pr.remaining||0),c:pr.remaining>0?C.amber:C.green},{l:"Achievement",v:`${pr.achievement_pct||0}%`,c:cC(+pr.achievement_pct||0)},{l:"UPT",v:(pr.upt||0).toFixed(1),c:C.blue},{l:"Tasks",v:`${tasksDone}/${tasks.length}`},{l:"Training",v:training.length},{l:"Present",v:presentDays}].map(k=>(<div key={k.l} style={{background:"rgba(0,0,0,0.03)",borderRadius:7,padding:"7px 8px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:3}}>{k.l}</div><div style={{fontSize:13,fontWeight:700,color:k.c||C.text}}>{k.v}</div></div>))}
</div>
{canEdit&&<div style={{display:"flex",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.bd}`}}>
<Bt onClick={()=>setShowTarget(!showTarget)} sz="sm" v={showTarget?"danger":"default"}>🎯 Set Target</Bt>
<Bt onClick={()=>setShowSales(!showSales)} sz="sm" v={showSales?"danger":"default"}>💰 Add Sales</Bt>
</div>}
{showTarget&&<div style={{marginTop:12,padding:"12px 14px",background:"rgba(0,0,0,0.03)",borderRadius:8,display:"flex",gap:8,alignItems:"center"}}>
<div style={{flex:1}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>MONTHLY TARGET (EGP)</label>
<input type="number" value={targetAmt} onChange={e=>setTargetAmt(e.target.value)} placeholder={pr.monthly_target||"0"} style={iS}/></div>
<Bt onClick={saveTarget} v="gold" sz="sm" disabled={savingT} style={{alignSelf:"flex-end"}}>{savingT?"...":"Save"}</Bt>
</div>}
{showSales&&<div style={{marginTop:12,padding:"12px 14px",background:"rgba(0,0,0,0.03)",borderRadius:8}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>DATE</label><input type="date" value={salesForm.date} onChange={e=>setSalesForm(p=>({...p,date:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>SALES (EGP)</label><input type="number" value={salesForm.sales} onChange={e=>setSalesForm(p=>({...p,sales:e.target.value}))} placeholder="0" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>INVOICES</label><input type="number" value={salesForm.invoices} onChange={e=>setSalesForm(p=>({...p,invoices:e.target.value}))} placeholder="0" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>QTY</label><input type="number" value={salesForm.qty} onChange={e=>setSalesForm(p=>({...p,qty:e.target.value}))} placeholder="0" style={iS}/></div>
<Bt onClick={saveSales} v="gold" sz="sm" disabled={savingS}>{savingS?"...":"Save"}</Bt>
</div></div>}
</GC>
<GC style={{padding:"18px 22px",marginBottom:14}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
<div style={{fontSize:10,fontWeight:700,color:C.gold,letterSpacing:"0.08em"}}>✦ AI COACHING</div>
<Bt onClick={generateCoaching} v="gold" sz="sm" disabled={loadingAI}>{loadingAI?"Generating...":"Generate Coaching Plan"}</Bt>
</div>
{coaching?<div style={{fontSize:12,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{coaching}</div>
:<div style={{fontSize:11,color:C.muted,textAlign:"center",padding:20}}>Click "Generate Coaching Plan" for AI-powered recommendations</div>}
</GC>
{tasks.length>0&&<GC style={{padding:"16px 20px"}}><div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.08em",marginBottom:10}}>RECENT TASKS</div>
{tasks.slice(0,5).map(t=>(<div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:10,fontWeight:600,color:C.text}}>{t.title}</div><SB status={t.status}/></div>))}
</GC>}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// VM ACADEMY — NEW ✅
// ═══════════════════════════════════════════════════════════════════════
function VMAcademy(){
  const{data:vmReports,loading}=useQ("vm_reports","order=created_at.desc&limit=20");
  const{bm,profile}=useAuth();const{toast}=useToast();
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({campaign:"",window:80,mannequin:80,folding:80,promo:80,notes:"",beforeUrl:"",afterUrl:""});
  const[br,setBr]=useState("");const[busy,setBusy]=useState(false);
  const{branches}=useAuth();

  const submit=async()=>{
    if(!br){toast("Select branch","error");return;}
    setBusy(true);
    try{
      await sb.q("vm_reports",{method:"POST",body:{branch_id:br,submitted_by:profile.id,campaign_name:form.campaign||null,window_score:+form.window,mannequin_score:+form.mannequin,folding_score:+form.folding,promotion_score:+form.promo,notes:form.notes||null,before_image_url:form.beforeUrl||null,after_image_url:form.afterUrl||null}});
      await sb.q("activity_logs",{method:"POST",body:{user_id:profile.id,branch_id:br,action:"Submitted VM report",entity_type:"vm_report"}});
      toast("VM Report submitted!","success");setShowForm(false);setForm({campaign:"",window:80,mannequin:80,folding:80,promo:80,notes:"",beforeUrl:"",afterUrl:""});
    }catch(e){toast(e.message,"error");}
    setBusy(false);
  };

  if(loading)return <Ld/>;

  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
      {[{l:"VM Reports",v:vmReports.length,c:C.blue},{l:"Avg Score",v:vmReports.length?`${Math.round(vmReports.reduce((s,r)=>s+(+r.overall_score||0),0)/vmReports.length)}`:"-",c:C.green},{l:"This Week",v:vmReports.filter(r=>new Date(r.created_at)>new Date(Date.now()-7*86400000)).length,c:C.gold},{l:"Pending",v:vmReports.filter(r=>r.status==="submitted").length,c:C.amber}].map(s=>(<GC key={s.l} style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginTop:3}}>{s.l}</div></GC>))}
    </div>

    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Bt onClick={()=>setShowForm(!showForm)} v="gold" sz="md">{showForm?"Cancel":"+ VM Report"}</Bt></div>

    {showForm&&<GC style={{padding:"22px 26px",marginBottom:16}}>
      <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:16}}>Submit VM Report</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BRANCH</label><select value={br} onChange={e=>setBr(e.target.value)} style={iS}><option value="">Select...</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>CAMPAIGN</label><input value={form.campaign} onChange={e=>setForm(p=>({...p,campaign:e.target.value}))} placeholder="e.g. Fall Collection" style={iS}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {[{l:"Window",k:"window"},{l:"Mannequin",k:"mannequin"},{l:"Folding",k:"folding"},{l:"Promotion",k:"promo"}].map(f=>(<div key={f.k}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>{f.l} SCORE</label><input type="number" min="0" max="100" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...iS,fontSize:14,fontWeight:700,textAlign:"center"}}/></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BEFORE PHOTO</label><FileUpload bucket="vm-images" label="Upload Before" onUploaded={url=>setForm(p=>({...p,beforeUrl:url}))}/></div>
        <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>AFTER PHOTO</label><FileUpload bucket="vm-images" label="Upload After" onUploaded={url=>setForm(p=>({...p,afterUrl:url}))}/></div>
      </div>
      <div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>NOTES</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="VM execution notes..." style={{...iS,resize:"vertical",minHeight:60}}/></div>
      <Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"Submitting...":"Submit VM Report →"}</Bt>
    </GC>}

    {vmReports.length===0?<Em icon="◇" title="No VM reports" msg="Submit your first VM execution report."/>:
    vmReports.map(r=>(<GC key={r.id} style={{padding:"16px 20px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div><div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4}}>{r.campaign_name||"VM Report"}</div>
          <div style={{fontSize:9,color:C.sub}}>{bm[r.branch_id]||"—"} · {new Date(r.created_at).toLocaleDateString()}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:+r.overall_score>=80?C.green:+r.overall_score>=60?C.amber:C.red}}>{Math.round(r.overall_score||0)}</div><div style={{fontSize:8,color:C.muted}}>SCORE</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:8}}>
        {[{l:"Window",v:r.window_score},{l:"Mannequin",v:r.mannequin_score},{l:"Folding",v:r.folding_score},{l:"Promo",v:r.promotion_score}].map(x=>(<div key={x.l} style={{textAlign:"center",background:"rgba(0,0,0,0.03)",borderRadius:5,padding:"4px"}}><div style={{fontSize:11,fontWeight:700,color:+x.v>=80?C.green:C.amber}}>{x.v}</div><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div></div>))}
      </div>
      {(r.before_image_url||r.after_image_url)&&<div style={{display:"flex",gap:6}}>{r.before_image_url&&<div style={{flex:1,height:80,borderRadius:8,overflow:"hidden",background:"rgba(0,0,0,0.03)"}}><img src={r.before_image_url} alt="Before" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}{r.after_image_url&&<div style={{flex:1,height:80,borderRadius:8,overflow:"hidden",background:"rgba(0,0,0,0.03)"}}><img src={r.after_image_url} alt="After" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}</div>}
    </GC>))}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOMER READINESS — NEW ✅
// ═══════════════════════════════════════════════════════════════════════
function CXReadiness(){
  const{profile,branches}=useAuth();const{toast}=useToast();
  const{data:records,loading,reload}=useQ("customer_readiness","order=created_at.desc&limit=20");
  const[br,setBr]=useState("");const[busy,setBusy]=useState(false);
  const[checks,setChecks]=useState({lighting:false,music:false,clean:false,queue:false,fitting:false,steam:false,scent:false,flow:false});
  const{bm}=useAuth();
  const score=Math.round(Object.values(checks).filter(Boolean).length/8*100);

  const submit=async()=>{
    if(!br){toast("Select branch","error");return;}setBusy(true);
    try{
      await sb.q("customer_readiness",{method:"POST",body:{branch_id:br,assessed_by:profile.id,lighting_ok:checks.lighting,music_ok:checks.music,cleanliness_ok:checks.clean,queue_ready:checks.queue,fitting_rooms_ok:checks.fitting,steaming_ok:checks.steam,scent_ok:checks.scent,flow_ok:checks.flow}});
      toast(`CX Assessment submitted: ${score}%`,"success");reload();setChecks({lighting:false,music:false,clean:false,queue:false,fitting:false,steam:false,scent:false,flow:false});
    }catch(e){toast(e.message,"error");}setBusy(false);
  };

  if(loading)return <Ld/>;

  return(<div>
    <GC style={{padding:"22px 26px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div><div style={{fontSize:14,fontWeight:800,color:C.text}}>Customer Readiness Assessment</div><div style={{fontSize:10,color:C.sub}}>Evaluate store experience readiness</div></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}><Ring pct={score} sz={44} sw={4} color={score>=75?C.green:score>=50?C.amber:C.red}/><div style={{fontSize:20,fontWeight:900,color:score>=75?C.green:score>=50?C.amber:C.red}}>{score}%</div></div>
      </div>
      <div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BRANCH</label><select value={br} onChange={e=>setBr(e.target.value)} style={iS}><option value="">Select branch...</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {[{k:"lighting",l:"💡 Lighting OK",i:"Proper lighting levels"},{k:"music",l:"🎵 Music OK",i:"Background music playing"},{k:"clean",l:"✨ Cleanliness",i:"Store clean and tidy"},{k:"queue",l:"🚶 Queue Ready",i:"Checkout area prepared"},{k:"fitting",l:"👗 Fitting Rooms",i:"Clean and available"},{k:"steam",l:"♨️ Steaming Done",i:"Products steamed"},{k:"scent",l:"🌸 Store Scent",i:"Pleasant fragrance"},{k:"flow",l:"↗️ Customer Flow",i:"Clear navigation"}].map(item=>(
          <div key={item.k} onClick={()=>setChecks(p=>({...p,[item.k]:!p[item.k]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,cursor:"pointer",background:checks[item.k]?C.greenS:"rgba(0,0,0,0.03)",border:`1px solid ${checks[item.k]?C.green+"30":C.bd}`,transition:"all 0.15s"}}>
            <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checks[item.k]?C.green:C.bd}`,background:checks[item.k]?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{checks[item.k]&&<span style={{fontSize:10,color:"#fff",fontWeight:700}}>✓</span>}</div>
            <div><div style={{fontSize:11,fontWeight:600,color:checks[item.k]?C.text:C.sub}}>{item.l}</div><div style={{fontSize:9,color:C.muted}}>{item.i}</div></div>
          </div>))}
      </div>
      <Bt onClick={submit} v="gold" sz="lg" disabled={busy||!br}>{busy?"Submitting...":"Submit Assessment →"}</Bt>
    </GC>

    {records.length>0&&<GC style={{padding:"16px 20px"}}><div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.08em",marginBottom:10}}>RECENT ASSESSMENTS</div>
      {records.map(r=>(<div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
        <div><div style={{fontSize:10,fontWeight:600,color:C.text}}>{bm[r.branch_id]||"—"}</div><div style={{fontSize:9,color:C.muted}}>{new Date(r.created_at).toLocaleDateString()}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:700,color:+r.readiness_score>=75?C.green:+r.readiness_score>=50?C.amber:C.red}}>{Math.round(r.readiness_score||0)}%</span><Chip text={+r.readiness_score>=75?"Ready":+r.readiness_score>=50?"Partial":"Not Ready"} color={+r.readiness_score>=75?C.green:+r.readiness_score>=50?C.amber:C.red} bg={+r.readiness_score>=75?C.greenS:+r.readiness_score>=50?C.amberS:C.redS}/></div>
      </div>))}
    </GC>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// REMAINING PAGES (Reports, New Report, Report Detail, Tasks, New Task,
// Incidents, New Incident, Sales, War Room, Branches, Employees,
// Learning, AI, Notifs, Activity, Users) — compact but complete
// ═══════════════════════════════════════════════════════════════════════
function ReportsPage({setPg,setCtx}){const{data,loading}=useQ("reports","is_deleted=eq.false&order=created_at.desc&limit=100");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="📋" title="No reports" action="+ New Report" onAction={()=>setPg("new_report")}/>;return(<div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Bt onClick={()=>setPg("new_report")} v="gold" sz="md">+ New Report</Bt></div><GC style={{overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Branch","Shift","Compliance","Status","Date"].map(h=>(<th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{data.map(r=>(<tr key={r.id} onClick={()=>{setCtx(r);setPg("rpt_detail");}} style={{borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}}><td style={{padding:"10px 14px",fontWeight:700,color:C.text}}>{bm[r.branch_id]||"—"}</td><td style={{padding:"10px 14px",color:C.sub,textTransform:"capitalize"}}>{r.shift?.replace("_"," ")}</td><td style={{padding:"10px 14px"}}>{r.compliance_score>0?<><span style={{fontWeight:700,color:cC(r.compliance_score)}}>{Math.round(r.compliance_score)}%</span> <Chip text={cL(r.compliance_score)} color={cC(r.compliance_score)} bg={cB(r.compliance_score)}/></>:<span style={{color:C.muted}}>—</span>}</td><td style={{padding:"10px 14px"}}><SB status={r.status}/></td><td style={{padding:"10px 14px",color:C.muted,fontSize:9}}>{new Date(r.created_at).toLocaleDateString()}</td></tr>))}</tbody></table></GC></div>);}

function RptDetail({rpt,setPg}){const{profile:p,bm}=useAuth();const{toast}=useToast();const{data:ans,loading}=useQ("report_answers_summary",`report_id=eq.${rpt?.id}&order=sort_order,item_text`);const{data:comments,reload:rlC}=useQ("comments",`report_id=eq.${rpt?.id}&order=created_at.desc`);const[cm,sCm]=useState("");const[busy,sB]=useState(false);if(!rpt){setPg("reports");return null;}
const approve=async a=>{sB(true);try{await sb.rpc("approve_report",{p_report_id:rpt.id,p_reviewer_id:p.id,p_action:a,p_comment:cm||null});toast(`Report ${a}!`,a==="approved"?"success":"error");setPg("reports");}catch(e){toast(e.message,"error");}sB(false);};
const addCm=async()=>{if(!cm.trim())return;try{await sb.q("comments",{method:"POST",body:{report_id:rpt.id,user_id:p.id,content:cm}});sCm("");rlC();}catch(e){toast(e.message,"error");}};
const grouped={};ans.forEach(a=>{if(!grouped[a.section_code])grouped[a.section_code]={title:a.section_title,icon:a.section_icon,items:[]};grouped[a.section_code].items.push(a);});
const comp=rpt.compliance_score||0;const canR=p?.role==="admin"||p?.role==="area_manager";
return(<div><Bt onClick={()=>setPg("reports")} sz="sm" style={{marginBottom:14}}>← Back</Bt>
<GC style={{padding:"22px 26px",marginBottom:14}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14}}><div><div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:6}}>{bm[rpt.branch_id]||"Branch"}</div><div style={{display:"flex",gap:8,marginBottom:8}}><SB status={rpt.status}/><Chip text={(rpt.shift||"").replace("_"," ")} color={C.sub} bg="rgba(0,0,0,0.05)"/></div></div>
{comp>0&&<div style={{display:"flex",alignItems:"center",gap:12}}><Ring pct={comp} sz={56} sw={5} color={cC(comp)}/><div><div style={{fontSize:26,fontWeight:900,color:cC(comp)}}>{Math.round(comp)}%</div><Chip text={cL(comp)} color={cC(comp)} bg={cB(comp)}/></div></div>}</div>
{canR&&rpt.status==="submitted"&&<div style={{display:"flex",gap:8,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.bd}`,flexWrap:"wrap"}}><Bt onClick={()=>approve("approved")} v="gold" sz="md" disabled={busy}>✓ Approve</Bt><Bt onClick={()=>approve("rejected")} v="danger" sz="md" disabled={busy}>✕ Reject</Bt><div style={{flex:1}}/><input value={cm} onChange={e=>sCm(e.target.value)} placeholder="Comment..." style={{...iS,maxWidth:300}}/></div>}</GC>
{loading?<Ld t="Loading answers..."/>:Object.keys(grouped).length===0?<GC style={{padding:20,textAlign:"center"}}><div style={{fontSize:11,color:C.muted}}>No checklist answers recorded</div></GC>:Object.entries(grouped).map(([code,sec])=>(<GC key={code} style={{marginBottom:8,overflow:"hidden"}}><div style={{padding:"12px 20px",background:"rgba(0,0,0,0.02)",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{sec.icon}</span><span style={{fontSize:11,fontWeight:700,color:C.text}}>{sec.title}</span></div>{sec.items.map((a,i)=>{const col=a.status==="completed"?C.green:a.status==="follow_up"?C.amber:C.red;return(<div key={a.answer_id} style={{padding:"10px 20px",borderBottom:i<sec.items.length-1?`1px solid ${C.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div style={{fontSize:11,color:C.sub,flex:1}}>{a.item_text}</div>{a.note&&<div style={{fontSize:10,color:C.sub,fontStyle:"italic",flex:1}}>{a.note}</div>}<Chip text={a.status?.replace("_"," ")} color={col} bg={col+"15"}/></div>);})}</GC>))}
<GC style={{padding:"16px 20px"}}><div style={{fontSize:9,fontWeight:700,color:C.muted,marginBottom:10}}>COMMENTS</div>{comments.map(c=>(<div key={c.id} style={{padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:10,color:C.text}}>{c.content}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{new Date(c.created_at).toLocaleString()}</div></div>))}<div style={{display:"flex",gap:8,marginTop:10}}><input value={cm} onChange={e=>sCm(e.target.value)} placeholder="Add comment..." style={{...iS,flex:1}} onKeyDown={e=>e.key==="Enter"&&addCm()}/><Bt onClick={addCm} v="gold" sz="sm">Send</Bt></div></GC></div>);}

function NewReport({setPg}){const{profile:p,branches:brs}=useAuth();const{toast}=useToast();const[br,sBr]=useState(p?.branch_id||"");const[shift,sSh]=useState("opening");const[notes,sN]=useState("");const[ans,sAns]=useState({});const[openS,sOS]=useState({opening:true});const[kpis,sK]=useState({});const[busy,sB]=useState(false);const[done,sD]=useState(false);const[imgUrl,setImgUrl]=useState(null);
useEffect(()=>{if(!br&&brs.length)sBr(brs[0].id);},[brs]);const sA=(sec,item,f,v)=>sAns(p=>({...p,[`${sec}::${item}`]:{...p[`${sec}::${item}`],[f]:v}}));
const comp=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status==="completed").length;const foll=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status==="follow_up").length;const notd=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status==="not_completed").length;const answered=comp+foll+notd;const compliance=answered>0?Math.round(((comp+foll*.5)/TOT)*100):0;
const submit=async()=>{if(!br){toast("Select branch","error");return;}sB(true);try{const[report]=await sb.q("reports",{method:"POST",body:{branch_id:br,submitted_by:p.id,shift,status:"submitted",manager_notes:notes||null,compliance_score:compliance,total_items:TOT,completed_items:comp,follow_up_items:foll,not_completed_items:notd,sales_amount:kpis.Sales?+kpis.Sales:null,target_amount:kpis.Target?+kpis.Target:null,upt:kpis.UPT?+kpis.UPT:null,atv:kpis.ATV?+kpis.ATV:null,conversion:kpis.Conv?+kpis.Conv:null,traffic:kpis.Traffic?+kpis.Traffic:null}});const secs=await sb.q("report_sections",{qs:"order=sort_order"});const sm=Object.fromEntries(secs.map(s=>[s.code,s.id]));const rows=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status).map(({sec,item})=>({report_id:report.id,section_id:sm[sec],item_text:item,status:ans[`${sec}::${item}`].status,note:ans[`${sec}::${item}`].note||null,answered_by:p.id}));if(rows.length)await sb.q("report_answers",{method:"POST",body:rows});if(imgUrl)await sb.q("report_images",{method:"POST",body:{report_id:report.id,image_url:imgUrl,uploaded_by:p.id,section:"general"}});await sb.q("activity_logs",{method:"POST",body:{user_id:p.id,branch_id:br,action:"Submitted report",entity_type:"report",entity_id:report.id}});toast("Report submitted!","success");sD(true);}catch(e){toast(e.message,"error");}sB(false);};
if(done)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:16}}><div style={{fontSize:48}}>✅</div><div style={{fontSize:18,fontWeight:900,color:C.text}}>Report Submitted</div><GC style={{padding:"18px 32px",textAlign:"center"}}><div style={{fontSize:36,fontWeight:900,color:cC(compliance)}}>{compliance}%</div></GC><div style={{display:"flex",gap:10}}><Bt onClick={()=>setPg("reports")} v="gold" sz="lg">View Reports</Bt><Bt onClick={()=>{sD(false);sAns({});}} sz="lg">New Report</Bt></div></div>);
return(<div style={{maxWidth:820,margin:"0 auto"}}><div style={{position:"sticky",top:52,zIndex:80,background:"#FFFFFF",backdropFilter:"blur(16px)",padding:"10px 0",marginBottom:16,borderBottom:`1px solid ${C.bd}`}}><div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Ring pct={compliance} sz={42} sw={4} color={cC(compliance)}/><div><div style={{fontSize:16,fontWeight:900,color:cC(compliance)}}>{compliance}%</div><div style={{fontSize:8,color:C.muted}}>Compliance</div></div></div><div style={{display:"flex",gap:12,flex:1}}>{[{l:"Done",v:comp,c:C.green},{l:"Follow",v:foll,c:C.amber},{l:"Not",v:notd,c:C.red},{l:"Left",v:TOT-answered,c:C.muted}].map(x=>(<div key={x.l} style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:x.c}}>{x.v}</div><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div></div>))}</div><Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"...":"Submit →"}</Bt></div></div>
<GC style={{padding:"18px 22px",marginBottom:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BRANCH</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}>{brs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>SHIFT</label><select value={shift} onChange={e=>sSh(e.target.value)} style={iS}>{["opening","mid","closing","full_day"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>NOTES</label><input value={notes} onChange={e=>sN(e.target.value)} placeholder="Notes..." style={iS}/></div></div></GC>
<GC style={{padding:"18px 22px",marginBottom:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>{["Sales","Target","UPT","ATV","Conv","Traffic"].map(k=>(<div key={k}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>{k}</label><input type="number" placeholder="0" value={kpis[k]||""} onChange={e=>sK(p=>({...p,[k]:e.target.value}))} style={{...iS,fontSize:13,fontWeight:700}}/></div>))}</div></GC>
<GC style={{padding:"18px 22px",marginBottom:10}}><div style={{fontSize:9,fontWeight:700,color:C.muted,marginBottom:8}}>ATTACH PHOTO</div><FileUpload bucket="report-images" onUploaded={setImgUrl}/></GC>
{SEC.map(sec=>{const sd=sec.items.filter(item=>ans[`${sec.code}::${item}`]?.status==="completed").length;const op=openS[sec.code];return(<GC key={sec.code} style={{marginBottom:6,overflow:"hidden"}}><button onClick={()=>sOS(p=>({...p,[sec.code]:!p[sec.code]}))} style={{width:"100%",padding:"12px 18px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"inherit"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{sec.icon}</span><div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:C.text}}>{sec.title}</div><div style={{fontSize:8,color:C.muted}}>{sd}/{sec.items.length}</div></div></div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:50}}><Bar v={sd} max={sec.items.length} color={sd===sec.items.length?C.green:C.gold} h={3}/></div><span style={{color:C.muted,fontSize:12,transform:op?"rotate(180deg)":"none",transition:"transform 0.2s"}}>⌄</span></div></button>{op&&<div style={{borderTop:`1px solid ${C.bd}`}}>{sec.items.map((item,idx)=>{const key=`${sec.code}::${item}`;const a=ans[key]||{};const sc={completed:{c:C.green,bg:C.greenS},not_completed:{c:C.red,bg:C.redS},follow_up:{c:C.amber,bg:C.amberS}};return(<div key={item} style={{padding:"10px 18px",borderBottom:idx<sec.items.length-1?`1px solid ${C.bd}`:"none",background:a.status?(sc[a.status]?.bg||"").replace("0.12","0.04"):"transparent"}}><div style={{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:160}}><div style={{fontSize:11,fontWeight:600,color:C.text,marginBottom:6}}>{item}</div><div style={{display:"flex",gap:4}}>{[["completed","✓ Done"],["follow_up","⚡ Follow"],["not_completed","✕ Not Done"]].map(([s,l])=>(<button key={s} onClick={()=>sA(sec.code,item,"status",s)} style={{fontSize:8,padding:"3px 7px",borderRadius:5,cursor:"pointer",fontFamily:"inherit",fontWeight:700,border:`1px solid ${a.status===s?sc[s]?.c:C.bd}`,background:a.status===s?sc[s]?.bg:"transparent",color:a.status===s?"rgba(255,255,255,0.85)":C.muted}}>{l}</button>))}</div></div><div style={{flex:1,minWidth:140}}><textarea placeholder="Note..." value={a.note||""} onChange={e=>sA(sec.code,item,"note",e.target.value)} style={{...iS,resize:"none",height:36,fontSize:10}}/></div></div></div>);})}</div>}</GC>);})}
</div>);}

// Compact remaining pages
function TasksPage({setPg}){const{data,loading}=useQ("tasks","is_deleted=eq.false&order=created_at.desc");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="☰" title="No tasks" action="+ New Task" onAction={()=>setPg("new_task")}/>;return(<div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Bt onClick={()=>setPg("new_task")} v="gold" sz="md">+ New Task</Bt></div>{data.map(t=>(<GC key={t.id} style={{padding:"14px 20px",marginBottom:6,borderLeft:`2px solid ${pC(t.priority)}`}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div style={{flex:1}}><div style={{display:"flex",gap:6,marginBottom:5}}><div style={{fontSize:11,fontWeight:700,color:C.text}}>{t.title}</div>{t.is_overdue&&<Chip text="OVERDUE" color={C.red} bg={C.redS}/>}</div><div style={{fontSize:9,color:C.sub}}>📍 {bm[t.branch_id]||"All"}{t.due_date&&` · 🕐 ${new Date(t.due_date).toLocaleDateString()}`}</div></div><SB status={t.status}/></div></GC>))}</div>);}
function NewTask({setPg}){const{profile:p,branches:brs}=useAuth();const{toast}=useToast();const[title,sT]=useState("");const[br,sBr]=useState("");const[pri,sP]=useState("medium");const[due,sD]=useState("");const[busy,sB]=useState(false);const submit=async()=>{if(!title.trim()){toast("Enter title","error");return;}sB(true);try{await sb.q("tasks",{method:"POST",body:{title,branch_id:br||null,created_by:p.id,priority:pri,due_date:due||null,status:"pending"}});toast("Task created!","success");setPg("tasks");}catch(e){toast(e.message,"error");}sB(false);};return(<div style={{maxWidth:600,margin:"0 auto"}}><Bt onClick={()=>setPg("tasks")} sz="sm" style={{marginBottom:14}}>← Back</Bt><GC style={{padding:"24px 28px"}}><div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:20}}>Create Task</div><div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>TITLE</label><input value={title} onChange={e=>sT(e.target.value)} placeholder="Task title..." style={iS}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BRANCH</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}><option value="">All</option>{brs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>PRIORITY</label><select value={pri} onChange={e=>sP(e.target.value)} style={iS}>{["low","medium","high","critical"].map(p=><option key={p}>{p}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>DUE</label><input type="datetime-local" value={due} onChange={e=>sD(e.target.value)} style={iS}/></div></div><Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"...":"Create →"}</Bt></GC></div>);}
function IncidentsPage({setPg}){const{data,loading}=useQ("incidents","is_deleted=eq.false&order=created_at.desc");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="⚠" title="No incidents" action="+ Report Issue" onAction={()=>setPg("new_incident")}/>;return(<div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Bt onClick={()=>setPg("new_incident")} v="gold" sz="md">+ Report Issue</Bt></div>{data.map(i=>(<GC key={i.id} style={{padding:"14px 20px",marginBottom:6}} glow={i.severity==="critical"&&i.status==="open"?C.redS:null}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{display:"flex",gap:6,marginBottom:4}}><div style={{fontSize:11,fontWeight:700,color:C.text}}>{i.title}</div><Chip text={i.severity} color={pC(i.severity)} bg={pC(i.severity)+"18"}/></div><div style={{fontSize:9,color:C.sub}}>{bm[i.branch_id]||"—"} · {i.incident_type}</div></div><SB status={i.status}/></div></GC>))}</div>);}
function NewIncident({setPg}){const{profile:p,branches:brs}=useAuth();const{toast}=useToast();const[title,sT]=useState("");const[desc,sD]=useState("");const[br,sBr]=useState("");const[type,sTy]=useState("POS Issue");const[sev,sSev]=useState("medium");const[busy,sB]=useState(false);const submit=async()=>{if(!title.trim()||!br){toast("Enter title and branch","error");return;}sB(true);try{await sb.q("incidents",{method:"POST",body:{branch_id:br,reported_by:p.id,title,description:desc||null,incident_type:type,severity:sev}});toast("Incident reported!","success");setPg("incidents");}catch(e){toast(e.message,"error");}sB(false);};return(<div style={{maxWidth:600,margin:"0 auto"}}><Bt onClick={()=>setPg("incidents")} sz="sm" style={{marginBottom:14}}>← Back</Bt><GC style={{padding:"24px 28px"}}><div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:20}}>Report Incident</div><div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>TITLE</label><input value={title} onChange={e=>sT(e.target.value)} placeholder="What happened?" style={iS}/></div><div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>DESCRIPTION</label><textarea value={desc} onChange={e=>sD(e.target.value)} placeholder="Details..." style={{...iS,resize:"vertical",minHeight:60}}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BRANCH</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}><option value="">Select...</option>{brs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>TYPE</label><select value={type} onChange={e=>sTy(e.target.value)} style={iS}>{["POS Issue","AC Issue","Customer Complaint","Staff Shortage","Maintenance","VM Issue"].map(t=><option key={t}>{t}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>SEVERITY</label><select value={sev} onChange={e=>sSev(e.target.value)} style={iS}>{["low","medium","high","critical"].map(s=><option key={s}>{s}</option>)}</select></div></div>{sev==="critical"&&<div style={{padding:"8px 12px",borderRadius:8,background:C.redS,border:`1px solid ${C.red}30`,marginBottom:14,fontSize:9,color:C.red,fontWeight:600}}>⚠ Critical incidents auto-generate emergency tasks</div>}<Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"...":"Report →"}</Bt></GC></div>);}
function SalesPage({setPg}){
const{data:comm,loading}=useQ("commercial_overview","order=mtd_achievement_pct.desc");
const{profile}=useAuth();
const isAdmin=(profile?.effectiveRole||profile?.role)==="admin"||(profile?.effectiveRole||profile?.role)==="area_manager";
if(loading)return <Ld/>;
if(!comm.length)return <Em icon="📊" title="No sales data" msg="Add monthly targets to see the sales dashboard." action={isAdmin?"Upload Sales →":null} onAction={()=>setPg("sales_upload")}/>;
const tS=comm.reduce((s,c)=>s+(+c.mtd_sales||0),0);
const tT=comm.reduce((s,c)=>s+(+c.monthly_target||0),0);
const tR=comm.reduce((s,c)=>s+(+c.remaining||0),0);
const aA=tT?Math.round(tS/tT*100):0;
return(<div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:18}}>
{[{l:"MTD Sales",v:fE(tS),c:C.gold},{l:"Total Target",v:fE(tT),c:C.text},{l:"Remaining",v:fE(tR),c:tR>0?C.amber:C.green},{l:"Achievement",v:`${aA}%`,c:cC(aA),ring:1,rp:aA}].map((k,i)=>(<GC key={i} style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={k.rp} sz={30} sw={3} color={k.c}/>}</div></GC>))}
</div>
{isAdmin&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Bt onClick={()=>setPg("sales_upload")} v="gold" sz="sm">⬆ Upload Sales Data</Bt></div>}
<GC style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["#","Branch","MTD Sales","Target","Remaining","Achievement","Gross %"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{comm.map((c,i)=>(<tr key={c.branch_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"10px 12px",color:C.muted,fontWeight:700}}>#{i+1}</td>
<td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{c.branch_name}</td>
<td style={{padding:"10px 12px",color:C.gold,fontWeight:700}}>{fE(c.mtd_sales)}</td>
<td style={{padding:"10px 12px",color:C.sub}}>{fE(c.monthly_target)}</td>
<td style={{padding:"10px 12px",color:+c.remaining>0?C.amber:C.green,fontWeight:600}}>{fE(c.remaining)}</td>
<td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,color:cC(+c.mtd_achievement_pct)}}>{c.mtd_achievement_pct}%</span><div style={{width:50}}><Bar v={+c.mtd_achievement_pct} max={100} color={cC(+c.mtd_achievement_pct)} h={3}/></div></div></td>
<td style={{padding:"10px 12px",color:+c.gross_percentage>0?C.green:C.muted,fontWeight:600}}>{+c.gross_percentage>0?`${c.gross_percentage}%`:"—"}</td>
</tr>))}</tbody>
</table>
</GC>
</div>);}

function WarRoom(){const{data:health,loading}=useQ("branch_health","order=health_score.desc");if(loading)return <Ld t="Loading War Room..."/>;return(<div style={{background:"#FFFFFF",borderRadius:14,padding:"22px",border:`1px solid ${C.bd}`,minHeight:500}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.red,boxShadow:`0 0 10px ${C.red}`}}/><div style={{fontSize:14,fontWeight:900,color:C.text}}>OPERATIONS WAR ROOM</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:5,height:5,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/><span style={{fontSize:9,color:C.green,fontWeight:700}}>LIVE</span></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>{health.map(b=>(<div key={b.branch_id} style={{padding:"12px 14px",borderRadius:10,background:b.health_status==="crisis"?C.redS:b.health_status==="risk"?C.amberS:"rgba(0,0,0,0.02)",border:`1px solid ${b.health_status==="crisis"?C.red+"30":C.bd}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:C.text}}>{b.branch_name?.split(" ").slice(0,2).join(" ")}</div><span style={{fontSize:10}}>{hI(b.health_status)}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>{[{l:"Health",v:`${b.health_score}%`,c:hC(b.health_status)},{l:"Comp",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—",c:C.gold},{l:"Reports",v:b.reports_today,c:C.blue},{l:"Issues",v:b.open_incidents,c:b.open_incidents>0?C.red:C.green}].map(x=>(<div key={x.l}><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div><div style={{fontSize:11,fontWeight:700,color:x.c}}>{x.v}</div></div>))}</div>{b.health_status==="crisis"&&<div style={{marginTop:6,padding:"3px 6px",borderRadius:4,background:C.red+"18",fontSize:8,color:C.red,fontWeight:700,textAlign:"center"}}>⚡ ACTION REQUIRED</div>}</div>))}</div></div>);}
function BranchesPage({setPg}){const{branches:brs}=useAuth();const{data:health}=useQ("branch_health","order=health_score.desc");if(!brs.length)return <Em icon="🏪" title="No stores" msg="Run SQL migration."/>;const hMap=Object.fromEntries(health.map(h=>[h.branch_id,h]));return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>{brs.map(b=>{const h=hMap[b.id];return(<GC key={b.id} onClick={()=>h&&setPg({id:"branch_twin",data:h})} style={{padding:"16px 20px"}} glow={h?.health_status==="crisis"?C.redS:null}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{b.name}</div><Chip text={b.area} color={C.gold} bg={C.goldS}/></div>{h&&<Ring pct={h.health_score} sz={34} sw={3} color={hC(h.health_status)}/>}</div>{h&&<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}><span style={{fontSize:10}}>{hI(h.health_status)}</span><span style={{fontSize:9,color:hC(h.health_status),fontWeight:600,textTransform:"capitalize"}}>{h.health_status}</span></div>}<div style={{fontSize:9,color:C.sub}}>{b.opening_hour?.slice(0,5)} — {b.closing_hour?.slice(0,5)}</div></GC>);})}</div>);}
function EmployeesPage({setPg}){const{data,loading}=useQ("profiles","is_active=eq.true&order=full_name");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="👥" title="No users"/>;return(<GC style={{overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Name","Role","Branch","Score",""].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{data.map(p=>(<tr key={p.id} style={{borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}} onClick={()=>setPg({id:"emp_detail",data:p})}><td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{p.full_name}</td><td style={{padding:"10px 12px",color:C.sub,textTransform:"capitalize"}}>{p.role?.replace("_"," ")}</td><td style={{padding:"10px 12px",color:C.sub}}>{bm[p.branch_id]||"All"}</td><td style={{padding:"10px 12px",fontWeight:700,color:p.performance_score>=80?C.green:C.amber}}>{p.performance_score||0}%</td><td style={{padding:"10px 12px"}}><Bt sz="sm">Profile →</Bt></td></tr>))}</tbody></table></GC>);}
function LearningPage(){const{data,loading}=useQ("training_materials","is_published=eq.true&order=created_at.desc");if(loading)return <Ld/>;if(!data.length)return <Em icon="📚" title="No materials"/>;return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:8}}>{data.map(t=>(<GC key={t.id} style={{padding:"16px 20px"}}><div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:5}}>{t.title}</div><div style={{display:"flex",gap:4}}><Chip text={t.category} color={C.gold} bg={C.goldS}/><Chip text={t.file_type} color={C.sub} bg="rgba(0,0,0,0.05)"/></div><div style={{fontSize:9,color:C.muted,marginTop:8}}>Views: {t.view_count}</div></GC>))}</div>);}
function NotifsPage(){const{data,loading,reload}=useQ("notifications","order=created_at.desc&limit=50");const{toast}=useToast();const mR=async id=>{try{await sb.q("notifications",{method:"PATCH",body:{is_read:true},qs:`id=eq.${id}`});reload();}catch(e){toast(e.message,"error");}};const mA=async()=>{try{await sb.q("notifications",{method:"PATCH",body:{is_read:true},qs:"is_read=eq.false"});reload();}catch(e){toast(e.message,"error");}};if(loading)return <Ld/>;if(!data.length)return <Em icon="🔔" title="All clear"/>;const nc={info:C.blue,warning:C.amber,danger:C.red,success:C.green};return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:11,color:C.sub}}>{data.filter(n=>!n.is_read).length} unread</div><Bt onClick={mA} v="ghost" sz="sm">Mark all read</Bt></div>{data.map(n=>(<GC key={n.id} onClick={()=>!n.is_read&&mR(n.id)} style={{padding:"12px 16px",marginBottom:5,borderLeft:`2px solid ${nc[n.type]||C.blue}`}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:11,fontWeight:n.is_read?500:700,color:n.is_read?C.sub:C.text}}>{n.title}</div><div style={{fontSize:9,color:C.muted}}>{new Date(n.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div><div style={{fontSize:10,color:C.sub,marginTop:2}}>{n.message}</div></GC>))}</div>);}
function ActivityPage(){const{data,loading}=useQ("activity_logs","order=created_at.desc&limit=50");if(loading)return <Ld/>;if(!data.length)return <Em icon="📜" title="No activity"/>;return(<GC style={{overflow:"hidden"}}>{data.map(l=>(<div key={l.id} style={{padding:"10px 20px",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"flex-start",gap:10}}><div style={{width:26,height:26,borderRadius:6,background:C.goldS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:C.gold,fontWeight:700,flexShrink:0}}>{new Date(l.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div><div><div style={{fontSize:10,fontWeight:600,color:C.text}}>{l.action}</div></div></div>))}</GC>);}
function UsersPage(){const{data,loading}=useQ("profiles","order=created_at.desc");const{bm}=useAuth();if(loading)return <Ld/>;return(<GC style={{overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Name","Role","Branch","Active"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{data.map(u=>(<tr key={u.id} style={{borderBottom:`1px solid ${C.bd}`}}><td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{u.full_name}</td><td style={{padding:"10px 12px",color:C.sub,textTransform:"capitalize"}}>{u.role?.replace("_"," ")}</td><td style={{padding:"10px 12px",color:C.sub}}>{bm[u.branch_id]||"All"}</td><td style={{padding:"10px 12px"}}><Chip text={u.is_active?"Active":"Off"} color={u.is_active?C.green:C.red} bg={u.is_active?C.greenS:C.redS}/></td></tr>))}</tbody></table></GC>);}
function AIPage(){const{data:ins,loading}=useQ("ai_insights","is_active=eq.true&order=generated_at.desc&limit=10");const{branches:brs}=useAuth();const[busy,sB]=useState(false);const[resp,sR]=useState("");const[q,sQ]=useState("");const ask=async question=>{if(!question)return;sB(true);sR("");try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`You are RAVIN Academy AI — retail ops assistant. Branches: ${brs.map(b=>b.name).join(", ")}.`,messages:[{role:"user",content:question}]})});const d=await r.json();sR(d.content?.[0]?.text||"Unable.");}catch{sR("Connection error.");}sB(false);};return(<div><div style={{background:"#FFFDF5",borderRadius:14,padding:"20px 24px",marginBottom:16,border:`1px solid ${C.goldB}`,boxShadow:`0 0 28px ${C.goldS}`}}><div style={{fontSize:12,fontWeight:900,color:C.gold,letterSpacing:"0.1em",marginBottom:10}}>✦ RAVIN ACADEMY · AI</div><div style={{display:"flex",gap:8,marginBottom:10}}><input value={q} onChange={e=>sQ(e.target.value)} placeholder="Ask AI..." onKeyDown={e=>e.key==="Enter"&&ask(q)} style={{...iS,flex:1,border:`1px solid ${C.goldB}`}}/><Bt onClick={()=>ask(q)} v="gold" sz="lg" disabled={busy}>{busy?"...":"Ask →"}</Bt></div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{["Top risks?","Store recommendations?","Performance insights?"].map(p=>(<button key={p} onClick={()=>{sQ(p);ask(p);}} style={{fontSize:9,padding:"4px 10px",borderRadius:14,border:`1px solid ${C.goldB}`,background:C.goldS,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>))}</div></div>{resp&&!busy&&<GC style={{padding:"20px 24px",marginBottom:14}}><div style={{fontSize:12,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{resp}</div></GC>}{loading?<Ld/>:!ins.length?<Em icon="✦" title="No insights"/>:<GC style={{padding:"16px 20px"}}>{ins.map(i=>(<div key={i.id} style={{padding:"8px 12px",borderRadius:6,marginBottom:5,background:i.severity==="critical"?C.redS:i.severity==="warning"?C.amberS:"rgba(0,0,0,0.02)",borderLeft:`3px solid ${i.severity==="critical"?C.red:i.severity==="warning"?C.amber:C.green}`}}><div style={{fontSize:10,fontWeight:600,color:C.text}}>{i.title}</div><div style={{fontSize:9,color:C.sub,marginTop:2}}>{i.content}</div></div>))}</GC>}</div>);}

// ═══════════════════════════════════════════════════════════════════════
// ROOT — 22 PAGES TOTAL
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// ROLE SELECTOR — shown after login for branch users
// ═══════════════════════════════════════════════════════════════════════
function RoleSelector({branchName,onSelect}){
const roles=[
  {id:"branch_manager",label:"مدير الفرع",icon:"🏪",color:C.gold,desc:"تقارير · مهام · KPIs · CX"},
  {id:"vm",label:"الـ VM",icon:"◇",color:C.purple,desc:"VM Reports · Before/After"},
  {id:"assistant",label:"المساعد",icon:"🤝",color:C.green,desc:"تعبئة التقارير · متابعة"},
];
return(<div style={{minHeight:"100vh",background:"#F0F4F8",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
<div style={{position:"absolute",top:"20%",left:"30%",width:500,height:500,background:"radial-gradient(circle,rgba(200,155,74,0.07),transparent 60%)",pointerEvents:"none"}}/>
<div style={{width:420,padding:"40px 36px",background:"#FFFFFF",boxShadow:"0 8px 32px rgba(0,0,0,0.1)",borderRadius:20,border:`1px solid ${C.bd}`,position:"relative",zIndex:1,textAlign:"center"}}>
<div style={{width:44,height:44,borderRadius:11,background:C.blue,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#0A0A0A",marginBottom:14}}>R</div>
<div style={{fontSize:10,color:C.sub,letterSpacing:"0.08em",marginBottom:4}}>أهلاً في</div>
<div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:6}}>{branchName}</div>
<div style={{fontSize:13,color:C.sub,marginBottom:28}}>أنت مين النهاردة؟</div>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{roles.map(r=>(<button key={r.id} onClick={()=>onSelect(r.id)} style={{padding:"16px 20px",borderRadius:12,border:`1px solid ${C.bd}`,background:C.card,cursor:"pointer",fontFamily:"inherit",textAlign:"right",display:"flex",alignItems:"center",gap:12,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=r.color;e.currentTarget.style.background=`${r.color}12`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.bd;e.currentTarget.style.background=C.card;}}>
<span style={{fontSize:24}}>{r.icon}</span>
<div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:r.color}}>{r.label}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{r.desc}</div></div>
<span style={{color:C.muted,fontSize:16}}>←</span>
</button>))}
</div>
</div>
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// SALES UPLOAD PAGE — Admin/Area Manager only
// ═══════════════════════════════════════════════════════════════════════
function SalesUploadPage(){
const{profile,branches,bm}=useAuth();const{toast}=useToast();
const[tab,setTab]=useState("branch");
const[bForm,setBForm]=useState({branch_id:"",month:new Date().toISOString().slice(0,7),target:"",actual:"",gross:""});
const[eForm,setEForm]=useState({emp_id:"",target:""});
const[sDForm,setSDForm]=useState({emp_id:"",branch_id:"",date:new Date().toISOString().slice(0,10),sales:"",invoices:"",qty:""});
const[busy,setBusy]=useState(false);
const{data:comm,reload:rldC}=useQ("commercial_overview","order=branch_name");
const{data:empPerf,reload:rldE}=useQ("employee_monthly_performance","order=full_name");
const{data:emps}=useQ("profiles","is_active=eq.true&role=neq.admin&order=full_name");

const saveBranch=async()=>{
if(!bForm.branch_id){toast("Select branch","error");return;}
setBusy(true);
try{
await sb.rpc("upsert_branch_monthly_sales",{p_branch_id:bForm.branch_id,p_month:bForm.month+"-01",p_monthly_target:+bForm.target||0,p_actual_sales:+bForm.actual||0,p_gross_percentage:+bForm.gross||0,p_user_id:profile.id});
toast("Saved!","success");setBForm(p=>({...p,target:"",actual:"",gross:""}));rldC();
}catch(e){toast(e.message,"error");}
setBusy(false);};

const saveEmpTarget=async()=>{
if(!eForm.emp_id||!eForm.target){toast("Fill all fields","error");return;}
setBusy(true);
try{
await sb.rpc("upsert_employee_target",{p_employee_id:eForm.emp_id,p_month:new Date().toISOString().slice(0,7)+"-01",p_target:+eForm.target,p_user_id:profile.id});
toast("Target saved!","success");setEForm(p=>({...p,target:""}));rldE();
}catch(e){toast(e.message,"error");}
setBusy(false);};

const saveEmpSales=async()=>{
if(!sDForm.emp_id||!sDForm.sales){toast("Fill employee and sales","error");return;}
const emp=emps.find(e=>e.id===sDForm.emp_id);
setBusy(true);
try{
await sb.rpc("upsert_employee_daily_sales",{p_employee_id:sDForm.emp_id,p_branch_id:sDForm.branch_id||emp?.branch_id,p_date:sDForm.date,p_sales:+sDForm.sales,p_invoices:+sDForm.invoices||0,p_quantity:+sDForm.qty||0});
toast("Sales saved!","success");setSDForm(p=>({...p,sales:"",invoices:"",qty:""}));rldE();
}catch(e){toast(e.message,"error");}
setBusy(false);};

return(<div>
<div style={{display:"flex",gap:4,marginBottom:18}}>{["branch","emp_target","emp_sales"].map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"7px 16px",borderRadius:7,border:"none",cursor:"pointer",background:tab===t?C.goldS:"transparent",color:tab===t?C.gold:C.sub,fontSize:10,fontWeight:tab===t?700:400,fontFamily:"inherit",borderBottom:tab===t?`2px solid ${C.gold}`:"2px solid transparent"}}>{t==="branch"?"🏪 Branch Sales/Targets":t==="emp_target"?"🎯 Employee Targets":"💰 Employee Sales"}</button>))}</div>

{tab==="branch"&&<div>
<GC style={{padding:"20px 24px",marginBottom:14}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>Branch Monthly Sales & Target</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BRANCH</label><select value={bForm.branch_id} onChange={e=>setBForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">Select...</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>MONTH</label><input type="month" value={bForm.month} onChange={e=>setBForm(p=>({...p,month:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>MONTHLY TARGET</label><input type="number" value={bForm.target} onChange={e=>setBForm(p=>({...p,target:e.target.value}))} placeholder="1400000" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>ACTUAL SALES</label><input type="number" value={bForm.actual} onChange={e=>setBForm(p=>({...p,actual:e.target.value}))} placeholder="850000" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>GROSS %</label><input type="number" step="0.1" value={bForm.gross} onChange={e=>setBForm(p=>({...p,gross:e.target.value}))} placeholder="42.5" style={iS}/></div>
<Bt onClick={saveBranch} v="gold" sz="lg" disabled={busy}>{busy?"...":"Save →"}</Bt>
</div>
</GC>
<GC style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Branch","Target","Actual Sales","Remaining","Achievement","Gross %"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{comm.map(c=>(<tr key={c.branch_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"9px 12px",fontWeight:700,color:C.text}}>{c.branch_name}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{fE(c.monthly_target)}</td>
<td style={{padding:"9px 12px",color:C.gold,fontWeight:700}}>{fE(c.mtd_sales)}</td>
<td style={{padding:"9px 12px",color:+c.remaining>0?C.amber:C.green}}>{fE(c.remaining)}</td>
<td style={{padding:"9px 12px"}}><span style={{fontWeight:700,color:cC(+c.mtd_achievement_pct)}}>{c.mtd_achievement_pct}%</span></td>
<td style={{padding:"9px 12px",color:+c.gross_percentage>0?C.green:C.muted}}>{+c.gross_percentage>0?`${c.gross_percentage}%`:"—"}</td>
</tr>))}</tbody>
</table>
</GC>
</div>}

{tab==="emp_target"&&<div>
<GC style={{padding:"20px 24px",marginBottom:14}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>Employee Monthly Targets</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>EMPLOYEE</label><select value={eForm.emp_id} onChange={e=>setEForm(p=>({...p,emp_id:e.target.value}))} style={iS}><option value="">Select...</option>{emps.map(e=><option key={e.id} value={e.id}>{e.full_name} — {bm[e.branch_id]||"All"}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>MONTHLY TARGET (EGP)</label><input type="number" value={eForm.target} onChange={e=>setEForm(p=>({...p,target:e.target.value}))} placeholder="50000" style={iS}/></div>
<Bt onClick={saveEmpTarget} v="gold" sz="lg" disabled={busy}>{busy?"...":"Save →"}</Bt>
</div>
</GC>
<GC style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Employee","Branch","Target","MTD Sales","Remaining","Achievement %","UPT"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{empPerf.map(e=>(<tr key={e.id||e.employee_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"9px 12px",fontWeight:700,color:C.text}}>{e.full_name}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{e.branch_name||"—"}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{fE(e.monthly_target)}</td>
<td style={{padding:"9px 12px",color:C.gold,fontWeight:700}}>{fE(e.mtd_sales)}</td>
<td style={{padding:"9px 12px",color:+e.remaining>0?C.amber:C.green}}>{fE(e.remaining)}</td>
<td style={{padding:"9px 12px"}}><span style={{fontWeight:700,color:cC(+e.achievement_pct)}}>{e.achievement_pct}%</span></td>
<td style={{padding:"9px 12px",color:C.blue,fontWeight:600}}>{(+e.upt||0).toFixed(1)}</td>
</tr>))}</tbody>
</table>
</GC>
</div>}

{tab==="emp_sales"&&<div>
<GC style={{padding:"20px 24px",marginBottom:14}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>Add Employee Daily Sales</div>
<div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>EMPLOYEE</label><select value={sDForm.emp_id} onChange={e=>{const emp=emps.find(x=>x.id===e.target.value);setSDForm(p=>({...p,emp_id:e.target.value,branch_id:emp?.branch_id||""}));}} style={iS}><option value="">Select...</option>{emps.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>DATE</label><input type="date" value={sDForm.date} onChange={e=>setSDForm(p=>({...p,date:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>SALES (EGP)</label><input type="number" value={sDForm.sales} onChange={e=>setSDForm(p=>({...p,sales:e.target.value}))} placeholder="0" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>INVOICES</label><input type="number" value={sDForm.invoices} onChange={e=>setSDForm(p=>({...p,invoices:e.target.value}))} placeholder="0" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>QTY</label><input type="number" value={sDForm.qty} onChange={e=>setSDForm(p=>({...p,qty:e.target.value}))} placeholder="0" style={iS}/></div>
<Bt onClick={saveEmpSales} v="gold" sz="lg" disabled={busy}>{busy?"...":"Save →"}</Bt>
</div>
</GC>
<GC style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Employee","Target","MTD Sales","Remaining","Achievement","UPT","ATV"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{empPerf.map(e=>(<tr key={e.id||e.employee_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"9px 12px",fontWeight:700,color:C.text}}>{e.full_name}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{fE(e.monthly_target)}</td>
<td style={{padding:"9px 12px",color:C.gold,fontWeight:700}}>{fE(e.mtd_sales)}</td>
<td style={{padding:"9px 12px",color:+e.remaining>0?C.amber:C.green}}>{fE(e.remaining)}</td>
<td style={{padding:"9px 12px"}}><span style={{fontWeight:700,color:cC(+e.achievement_pct)}}>{e.achievement_pct}%</span></td>
<td style={{padding:"9px 12px",color:C.blue}}>{(+e.upt||0).toFixed(1)}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{fE(e.atv)}</td>
</tr>))}</tbody>
</table>
</GC>
</div>}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// PROFILE SETTINGS — Admin only, edit any profile
// ═══════════════════════════════════════════════════════════════════════
function ProfileSettings(){
const{branches,bm}=useAuth();const{toast}=useToast();
const{data:profs,loading,reload}=useQ("profiles","order=full_name");
const[sel,setSel]=useState(null);const[form,setForm]=useState({});const[busy,setBusy]=useState(false);

const startEdit=(p)=>{setSel(p.id);setForm({full_name:p.full_name||"",role:p.role||"assistant",branch_id:p.branch_id||"",is_active:p.is_active!==false});};
const save=async()=>{if(!sel)return;setBusy(true);
try{await sb.q("profiles",{method:"PATCH",body:{full_name:form.full_name,role:form.role,branch_id:form.branch_id||null,is_active:form.is_active},qs:`id=eq.${sel}`});
toast("Saved!","success");setSel(null);reload();}catch(e){toast(e.message,"error");}setBusy(false);};

if(loading)return <Ld/>;
const roles=["admin","area_manager","branch_manager","assistant","vm"];
return(<div>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>Profile Settings</div>
{sel&&<GC style={{padding:"18px 22px",marginBottom:14,border:`1px solid ${C.goldB}`}}>
<div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:12}}>Editing Profile</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>FULL NAME</label><input value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>ROLE</label><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={iS}>{roles.map(r=><option key={r}>{r}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BRANCH</label><select value={form.branch_id} onChange={e=>setForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">None</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<Bt onClick={save} v="gold" disabled={busy}>{busy?"...":"Save"}</Bt>
</div>
<div style={{marginTop:10,display:"flex",gap:10,alignItems:"center"}}>
<label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.sub,cursor:"pointer"}}>
<input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))}/>
Active
</label>
<Bt onClick={()=>setSel(null)} v="ghost" sz="sm">Cancel</Bt>
</div>
</GC>}
<GC style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Name","Role","Branch","Active",""].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{profs.map(p=>(<tr key={p.id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"9px 12px",fontWeight:700,color:C.text}}>{p.full_name}</td>
<td style={{padding:"9px 12px",color:C.sub,textTransform:"capitalize"}}>{p.role?.replace("_"," ")}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{bm[p.branch_id]||"All"}</td>
<td style={{padding:"9px 12px"}}><Chip text={p.is_active!==false?"Active":"Off"} color={p.is_active!==false?C.green:C.red} bg={p.is_active!==false?C.greenS:C.redS}/></td>
<td style={{padding:"9px 12px"}}><Bt onClick={()=>startEdit(p)} sz="sm">Edit</Bt></td>
</tr>))}</tbody>
</table>
</GC>
</div>);}



// ═══════════════════════════════════════════════════════════════════════
// MY TEAM — Branch adds employees + enters sales + views performance
// ═══════════════════════════════════════════════════════════════════════
function MyTeam(){
const{profile,bm}=useAuth();const{toast}=useToast();
const branchId=profile?.branch_id;
const branchName=bm[branchId]||"Your Branch";
const isManager=["admin","area_manager","branch_manager"].includes(profile?.effectiveRole||profile?.role);
const canAdd=isManager;

// Load team + performance
const{data:team,loading,reload}=useQ("sales_staff",
  branchId?`branch_id=eq.${branchId}&order=mtd_sales.desc`:
  "order=branch_name,mtd_sales.desc"
);

// Add employee form
const[showAdd,setShowAdd]=useState(false);
const[addForm,setAddForm]=useState({name:"",phone:"",position:"Sales Associate"});
const[savingAdd,setSavingAdd]=useState(false);

// Daily sales entry
const[salesDate,setSalesDate]=useState(new Date().toISOString().slice(0,10));
const[salesRows,setSalesRows]=useState({});
const[savingSales,setSavingSales]=useState(false);
const[showSales,setShowSales]=useState(false);

// Target setting
const[showTargets,setShowTargets]=useState(false);
const[targetRows,setTargetRows]=useState({});
const[savingTargets,setSavingTargets]=useState(false);

// Init sales rows when team loads
useState(()=>{
  if(team.length){
    const r={};
    team.forEach(m=>{if(!salesRows[m.person_id])r[m.person_id]={sales:"",invoices:"",qty:""};});
    if(Object.keys(r).length)setSalesRows(p=>({...p,...r}));
  }
},[team]);

const addEmployee=async()=>{
  if(!addForm.name.trim()){toast("Enter employee name","error");return;}
  setSavingAdd(true);
  try{
    await sb.rpc("add_staff_member",{
      p_branch_id:branchId,
      p_full_name:addForm.name.trim(),
      p_phone:addForm.phone||null,
      p_position:addForm.position||"Sales Associate",
      p_created_by:profile.id
    });
    toast(`${addForm.name} added to team!`,"success");
    setAddForm({name:"",phone:"",position:"Sales Associate"});
    setShowAdd(false);reload();
  }catch(e){toast(e.message,"error");}
  setSavingAdd(false);
};

const saveDailySales=async()=>{
  const rows=Object.entries(salesRows).filter(([,v])=>v.sales&&+v.sales>0);
  if(!rows.length){toast("Enter at least one sales figure","error");return;}
  setSavingSales(true);
  let saved=0;
  for(const[personId,vals] of rows){
    const member=team.find(m=>m.person_id===personId);
    if(!member)continue;
    try{
      if(member.member_type==="staff"){
        await sb.rpc("add_staff_daily_sales",{p_staff_id:personId,p_branch_id:branchId,p_date:salesDate,p_sales:+vals.sales,p_invoices:+vals.invoices||0,p_quantity:+vals.qty||0});
      } else {
        await sb.rpc("upsert_employee_daily_sales",{p_employee_id:personId,p_branch_id:branchId,p_date:salesDate,p_sales:+vals.sales,p_invoices:+vals.invoices||0,p_quantity:+vals.qty||0});
      }
      saved++;
    }catch(e){toast(`Error for ${member.full_name}: ${e.message}`,"error");}
  }
  toast(`${saved} records saved!`,"success");
  setSalesRows(p=>{const n={...p};rows.forEach(([id])=>{n[id]={sales:"",invoices:"",qty:""};});return n;});
  setSavingSales(false);reload();
};

const saveTargets=async()=>{
  const rows=Object.entries(targetRows).filter(([,v])=>v&&+v>0);
  if(!rows.length){toast("Enter at least one target","error");return;}
  setSavingTargets(true);
  let saved=0;
  for(const[personId,tgt] of rows){
    const member=team.find(m=>m.person_id===personId);
    if(!member)continue;
    try{
      if(member.member_type==="staff"){
        await sb.rpc("set_staff_target",{p_staff_id:personId,p_month:new Date().toISOString().slice(0,7)+"-01",p_target:+tgt,p_created_by:profile.id});
      } else {
        await sb.rpc("upsert_employee_target",{p_employee_id:personId,p_month:new Date().toISOString().slice(0,7)+"-01",p_target:+tgt,p_user_id:profile.id});
      }
      saved++;
    }catch(e){toast(`Error for ${member.full_name}: ${e.message}`,"error");}
  }
  toast(`${saved} targets saved!`,"success");
  setShowTargets(false);setSavingTargets(false);reload();
};

const totalSales=team.reduce((s,m)=>s+(+m.mtd_sales||0),0);
const totalTarget=team.reduce((s,m)=>s+(+m.monthly_target||0),0);
const teamAchiev=totalTarget>0?Math.round(totalSales/totalTarget*100):0;

if(loading)return <Ld t="Loading team..."/>;

return(<div>
{/* Header KPIs */}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:16}}>
  {[{l:"Team Members",v:team.length,c:C.blue},{l:"MTD Sales",v:fE(totalSales),c:C.gold},{l:"Team Target",v:fE(totalTarget),c:C.text},{l:"Achievement",v:`${teamAchiev}%`,c:cC(teamAchiev),ring:1,rp:teamAchiev}].map((k,i)=>(<GC key={i} style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:5}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={k.rp} sz={28} sw={3} color={k.c}/>}</div></GC>))}
</div>

{/* Action buttons */}
{canAdd&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
  <Bt onClick={()=>{setShowAdd(!showAdd);setShowSales(false);setShowTargets(false);}} v={showAdd?"danger":"gold"} sz="md">👤 {showAdd?"Cancel":"Add Employee"}</Bt>
  <Bt onClick={()=>{setShowSales(!showSales);setShowAdd(false);setShowTargets(false);}} v={showSales?"danger":"default"} sz="md">💰 {showSales?"Cancel":"Enter Today's Sales"}</Bt>
  <Bt onClick={()=>{setShowTargets(!showTargets);setShowAdd(false);setShowSales(false);}} v={showTargets?"danger":"default"} sz="md">🎯 {showTargets?"Cancel":"Set Monthly Targets"}</Bt>
</div>}

{/* Add Employee Form */}
{showAdd&&<GC style={{padding:"18px 22px",marginBottom:14,border:`1px solid ${C.goldB}`}}>
  <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:12}}>Add Team Member</div>
  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
    <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>FULL NAME *</label><input value={addForm.name} onChange={e=>setAddForm(p=>({...p,name:e.target.value}))} placeholder="Employee name..." style={iS}/></div>
    <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>PHONE</label><input value={addForm.phone} onChange={e=>setAddForm(p=>({...p,phone:e.target.value}))} placeholder="010..." style={iS}/></div>
    <div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>POSITION</label><select value={addForm.position} onChange={e=>setAddForm(p=>({...p,position:e.target.value}))} style={iS}><option>Sales Associate</option><option>Senior Sales</option><option>Cashier</option><option>VM Coordinator</option><option>Stock Controller</option></select></div>
    <Bt onClick={addEmployee} v="gold" sz="lg" disabled={savingAdd}>{savingAdd?"...":"Add →"}</Bt>
  </div>
</GC>}

{/* Daily Sales Entry */}
{showSales&&team.length>0&&<GC style={{padding:"18px 22px",marginBottom:14}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:800,color:C.text}}>Enter Daily Sales</div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <input type="date" value={salesDate} onChange={e=>setSalesDate(e.target.value)} style={{...iS,width:140}}/>
      <Bt onClick={saveDailySales} v="gold" sz="md" disabled={savingSales}>{savingSales?"Saving...":"Save All →"}</Bt>
    </div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr",gap:4}}>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8,padding:"6px 0"}}>
      {["Employee","Sales (EGP)","Invoices","Qty"].map(h=>(<div key={h} style={{fontSize:8,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</div>))}
    </div>
    {team.map(m=>(<div key={m.person_id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8,padding:"4px 0",borderTop:`1px solid ${C.bd}`,alignItems:"center"}}>
      <div style={{fontSize:11,fontWeight:600,color:C.text}}>{m.full_name}</div>
      <input type="number" placeholder="0" value={(salesRows[m.person_id]||{}).sales||""} onChange={e=>setSalesRows(p=>({...p,[m.person_id]:{...(p[m.person_id]||{}),sales:e.target.value}}))} style={{...iS,fontSize:12,fontWeight:700,textAlign:"center"}}/>
      <input type="number" placeholder="0" value={(salesRows[m.person_id]||{}).invoices||""} onChange={e=>setSalesRows(p=>({...p,[m.person_id]:{...(p[m.person_id]||{}),invoices:e.target.value}}))} style={{...iS,textAlign:"center"}}/>
      <input type="number" placeholder="0" value={(salesRows[m.person_id]||{}).qty||""} onChange={e=>setSalesRows(p=>({...p,[m.person_id]:{...(p[m.person_id]||{}),qty:e.target.value}}))} style={{...iS,textAlign:"center"}}/>
    </div>))}
  </div>
</GC>}

{/* Set Targets */}
{showTargets&&team.length>0&&<GC style={{padding:"18px 22px",marginBottom:14}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
    <div><div style={{fontSize:12,fontWeight:800,color:C.text}}>Monthly Targets</div><div style={{fontSize:10,color:C.sub}}>{new Date().toLocaleString("default",{month:"long",year:"numeric"})}</div></div>
    <Bt onClick={saveTargets} v="gold" sz="md" disabled={savingTargets}>{savingTargets?"Saving...":"Save Targets →"}</Bt>
  </div>
  {team.map(m=>(<div key={m.person_id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
    <div style={{flex:1,fontSize:11,fontWeight:600,color:C.text}}>{m.full_name}</div>
    <div style={{fontSize:10,color:C.muted}}>Current: {fE(m.monthly_target)}</div>
    <input type="number" placeholder="Target EGP" value={targetRows[m.person_id]||""} onChange={e=>setTargetRows(p=>({...p,[m.person_id]:e.target.value}))} style={{...iS,width:140,textAlign:"center"}}/>
  </div>))}
</GC>}

{/* Performance Table */}
{team.length===0?<Em icon="👥" title="No team members yet" msg="Add your first team member to start tracking performance." action={canAdd?"Add Employee":null} onAction={()=>setShowAdd(true)}/>:
<GC style={{overflow:"hidden"}}>
  <div style={{padding:"12px 18px",background:C.blueS,borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div style={{fontSize:10,fontWeight:700,color:C.blue}}>TEAM PERFORMANCE — {new Date().toLocaleString("default",{month:"long",year:"numeric"}).toUpperCase()}</div>
    <div style={{fontSize:9,color:C.muted}}>{team.length} members</div>
  </div>
  <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
    <thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["#","Name","Target","MTD Sales","Remaining","Achievement","UPT","ATV",""].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
    <tbody>{team.map((m,i)=>{
      const ach=+m.achievement_pct||0;
      return(<tr key={m.person_id} style={{borderBottom:`1px solid ${C.bd}`}}>
        <td style={{padding:"9px 12px",color:i<3?C.gold:C.muted,fontWeight:700}}>#{i+1}</td>
        <td style={{padding:"9px 12px"}}><div style={{fontWeight:700,color:C.text}}>{m.full_name}</div><div style={{fontSize:8,color:C.muted,textTransform:"capitalize"}}>{m.position}</div></td>
        <td style={{padding:"9px 12px",color:C.sub}}>{fE(m.monthly_target)}</td>
        <td style={{padding:"9px 12px",fontWeight:700,color:C.gold}}>{fE(m.mtd_sales)}</td>
        <td style={{padding:"9px 12px",color:+m.remaining>0?C.amber:C.green,fontWeight:600}}>{fE(m.remaining)}</td>
        <td style={{padding:"9px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontWeight:700,color:cC(ach)}}>{ach}%</span>
            <div style={{width:40}}><Bar v={ach} max={100} color={cC(ach)} h={3}/></div>
          </div>
        </td>
        <td style={{padding:"9px 12px",color:C.blue,fontWeight:600}}>{(+m.upt||0).toFixed(1)}</td>
        <td style={{padding:"9px 12px",color:C.sub}}>{fE(m.atv)}</td>
        <td style={{padding:"9px 12px"}}>{canAdd&&<Bt onClick={async()=>{if(!confirm(`Remove ${m.full_name}?`))return;if(m.member_type==="staff"){await sb.q("sales_staff",{method:"PATCH",body:{is_active:false},qs:`id=eq.${m.person_id}`});reload();}}} sz="sm" v="ghost">✕</Bt>}</td>
      </tr>);
    })}</tbody>
  </table>
</GC>}
</div>);}


// ═══════════════════════════════════════════════════════════════════════
// TASKS V2 — with type: operational, vm, cx, incident, merch
// ═══════════════════════════════════════════════════════════════════════
const TASK_TYPES=[
  {id:"operational",label:"Operational",icon:"📋",color:C.blue},
  {id:"vm",label:"VM Execution",icon:"◇",color:C.purple},
  {id:"cx",label:"CX Check",icon:"★",color:C.green},
  {id:"incident",label:"Incident",icon:"⚠",color:C.red},
  {id:"merch",label:"Merch / Stock",icon:"📦",color:C.amber},
];

function TasksV2({setPg}){
const{data,loading,reload}=useQ("tasks","is_deleted=eq.false&order=created_at.desc");
const{bm,profile}=useAuth();const{toast}=useToast();
const[filter,setFilter]=useState("all");
const[showNew,setShowNew]=useState(false);
const[form,setForm]=useState({title:"",desc:"",branch_id:"",priority:"medium",due:"",task_type:"operational",incident_type:"",severity:"medium",campaign_name:""});
const[vmScores,setVmScores]=useState({window:80,mannequin:80,folding:80,promo:80});
const[cx,setCx]=useState({lighting:false,music:false,clean:false,queue:false,fitting:false,steam:false,scent:false,flow:false});
const[beforeUrl,setBeforeUrl]=useState(null);const[afterUrl,setAfterUrl]=useState(null);
const[busy,setBusy]=useState(false);
const{branches}=useAuth();
const filtered=filter==="all"?data:data.filter(t=>t.task_type===filter);
const overdue=data.filter(t=>t.is_overdue&&t.status!=="completed").length;

const submit=async()=>{
if(!form.title.trim()){toast("Enter task title","error");return;}
if(!profile?.id){toast("Profile not loaded. Please refresh.","error");return;}
// Auto-fill branch for branch users
let branchId=form.branch_id||null;
if(profile.role==='branch_manager'&&profile.branch_id){branchId=profile.branch_id;}
setBusy(true);
try{
  const vmScore=["window","mannequin","folding","promo"].reduce((s,k)=>s+(+vmScores[k]||0),0)/4;
  const cxScore=Object.values(cx).filter(Boolean).length/8*100;
  const body={title:form.title,description:form.desc||null,branch_id:branchId,created_by:profile.id,
    priority:form.priority,due_date:form.due||null,status:"pending",
    task_type:form.task_type,campaign_name:form.campaign_name||null,
    incident_type:form.task_type==="incident"?form.incident_type:null,
    severity:form.task_type==="incident"?form.severity:"medium",
    vm_window_score:form.task_type==="vm"?+vmScores.window:null,
    vm_mannequin_score:form.task_type==="vm"?+vmScores.mannequin:null,
    vm_folding_score:form.task_type==="vm"?+vmScores.folding:null,
    vm_promo_score:form.task_type==="vm"?+vmScores.promo:null,
    vm_overall_score:form.task_type==="vm"?Math.round(vmScore):null,
    before_image_url:beforeUrl,after_image_url:afterUrl,
    ...Object.fromEntries(Object.entries(cx).map(([k,v])=>[`cx_${k==="clean"?"cleanliness":k==="steam"?"steaming":k}`,v])),
    cx_score:form.task_type==="cx"?Math.round(cxScore):null,
  };
  await sb.q("tasks",{method:"POST",body});
  toast("Task created!","success");
  setShowNew(false);setForm({title:"",desc:"",branch_id:"",priority:"medium",due:"",task_type:"operational",incident_type:"",severity:"medium",campaign_name:""});
  setVmScores({window:80,mannequin:80,folding:80,promo:80});setCx({lighting:false,music:false,clean:false,queue:false,fitting:false,steam:false,scent:false,flow:false});
  setBeforeUrl(null);setAfterUrl(null);reload();
}catch(e){toast(e.message,"error");}
setBusy(false);};

const markDone=async(id)=>{try{await sb.q("tasks",{method:"PATCH",body:{status:"completed"},qs:`id=eq.${id}`});reload();}catch(e){toast(e.message,"error");}};

if(loading)return <Ld/>;
const tt=TASK_TYPES.find(t=>t.id===form.task_type);

return(<div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
  {[{id:"all",label:"All",count:data.length},{id:"operational",label:"Ops"},{id:"vm",label:"VM"},{id:"cx",label:"CX"},{id:"incident",label:"Incidents"},{id:"merch",label:"Merch"}].map(f=>(<button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:filter===f.id?C.blueS:"transparent",color:filter===f.id?C.blue:C.sub,fontSize:10,fontWeight:filter===f.id?700:400,fontFamily:"inherit"}}>{f.label}{f.count?` (${f.count})`:""}</button>))}
  {overdue>0&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:C.redS,padding:"3px 8px",borderRadius:5}}>⚠ {overdue} OVERDUE</span>}
</div>
<Bt onClick={()=>setShowNew(!showNew)} v={showNew?"danger":"gold"} sz="md">{showNew?"✕ Cancel":"+ New Task"}</Bt>
</div>

{showNew&&<GC style={{padding:"20px 24px",marginBottom:14,border:`1px solid ${C.bd}`}}>
{/* Task type selector */}
<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
{TASK_TYPES.map(t=>(<button key={t.id} onClick={()=>setForm(p=>({...p,task_type:t.id}))} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${form.task_type===t.id?t.color:C.bd}`,background:form.task_type===t.id?t.color+"18":"transparent",color:form.task_type===t.id?t.color:C.sub,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t.icon} {t.label}</button>))}
</div>

{/* Base fields */}
<div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>TITLE</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder={`${tt?.icon} ${tt?.label} task...`} style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BRANCH</label><select value={form.branch_id} onChange={e=>setForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">All</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>PRIORITY</label><select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={iS}>{["low","medium","high","critical"].map(p=><option key={p}>{p}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>DUE DATE</label><input type="datetime-local" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))} style={iS}/></div>
</div>

{/* VM fields */}
{form.task_type==="vm"&&<div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>CAMPAIGN NAME</label><input value={form.campaign_name} onChange={e=>setForm(p=>({...p,campaign_name:e.target.value}))} placeholder="Fall Collection..." style={iS}/></div>
<div style={{gridColumn:"span 1"}}></div>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
{[{k:"window",l:"Window"},{k:"mannequin",l:"Mannequin"},{k:"folding",l:"Folding"},{k:"promo",l:"Promo"}].map(f=>(<div key={f.k}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>{f.l} SCORE</label><input type="number" min="0" max="100" value={vmScores[f.k]} onChange={e=>setVmScores(p=>({...p,[f.k]:e.target.value}))} style={{...iS,textAlign:"center",fontWeight:700}}/></div>))}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BEFORE PHOTO</label><FileUpload bucket="task-images" label="Upload Before" onUploaded={setBeforeUrl}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>AFTER PHOTO</label><FileUpload bucket="task-images" label="Upload After" onUploaded={setAfterUrl}/></div>
</div>
</div>}

{/* CX fields */}
{form.task_type==="cx"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
{[{k:"lighting",l:"💡 Lighting"},{k:"music",l:"🎵 Music"},{k:"clean",l:"✨ Cleanliness"},{k:"queue",l:"🚶 Queue Ready"},{k:"fitting",l:"👗 Fitting Rooms"},{k:"steam",l:"♨️ Steaming"},{k:"scent",l:"🌸 Scent"},{k:"flow",l:"↗️ Customer Flow"}].map(item=>(<div key={item.k} onClick={()=>setCx(p=>({...p,[item.k]:!p[item.k]}))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:7,cursor:"pointer",background:cx[item.k]?C.greenS:"rgba(0,0,0,0.02)",border:`1px solid ${cx[item.k]?C.green+"30":C.bd}`}}>
<div style={{width:16,height:16,borderRadius:4,border:`2px solid ${cx[item.k]?C.green:C.bd}`,background:cx[item.k]?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:900}}>{cx[item.k]&&"✓"}</div>
<span style={{fontSize:11,color:cx[item.k]?C.text:C.sub}}>{item.l}</span>
</div>))}
</div>}

{/* Incident fields */}
{form.task_type==="incident"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>INCIDENT TYPE</label><select value={form.incident_type} onChange={e=>setForm(p=>({...p,incident_type:e.target.value}))} style={iS}><option value="">Select...</option>{["POS Issue","AC Issue","Maintenance","Customer Complaint","Staff Shortage","VM Issue","Stock Issue"].map(t=><option key={t}>{t}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>SEVERITY</label><select value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))} style={iS}>{["low","medium","high","critical"].map(s=><option key={s}>{s}</option>)}</select></div>
{form.severity==="critical"&&<div style={{gridColumn:"span 2",padding:"8px 12px",background:C.redS,borderRadius:7,fontSize:9,color:C.red,fontWeight:700}}>⚡ Critical = Emergency task auto-created + all managers notified</div>}
</div>}

<div style={{marginBottom:10}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>DESCRIPTION</label><textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="Details..." style={{...iS,resize:"vertical",minHeight:52}}/></div>
<Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"Creating...":"Create Task →"}</Bt>
</GC>}

{filtered.length===0?<Em icon="☰" title="No tasks" msg="Create your first task above."/>:
filtered.map(t=>{const typ=TASK_TYPES.find(x=>x.id===(t.task_type||"operational"))||TASK_TYPES[0];
return(<GC key={t.id} style={{padding:"12px 16px",marginBottom:6,borderRight:`3px solid ${t.is_overdue&&t.status!=="completed"?C.red:pC(t.priority)}`}}>
<div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
<div style={{flex:1}}>
<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
<span style={{fontSize:12}}>{typ.icon}</span>
<span style={{fontSize:11,fontWeight:700,color:C.text}}>{t.title}</span>
{t.is_overdue&&t.status!=="completed"&&<Chip text="OVERDUE" color={C.red} bg={C.redS}/>}
<span style={{fontSize:9,color:typ.color,fontWeight:600,background:typ.color+"15",padding:"1px 6px",borderRadius:4}}>{typ.label}</span>
</div>
<div style={{fontSize:9,color:C.muted}}>📍 {bm[t.branch_id]||"All"}{t.due_date&&` · 🕐 ${new Date(t.due_date).toLocaleDateString()}`}</div>
{/* VM scores */}
{t.task_type==="vm"&&t.vm_overall_score&&<div style={{display:"flex",gap:8,marginTop:4}}>
{[{l:"Window",v:t.vm_window_score},{l:"Mannequin",v:t.vm_mannequin_score},{l:"Folding",v:t.vm_folding_score},{l:"Promo",v:t.vm_promo_score}].map(x=>(<span key={x.l} style={{fontSize:8,color:C.sub}}>{x.l}: <b style={{color:+x.v>=80?C.green:C.amber}}>{x.v}</b></span>))}
<span style={{fontSize:8,fontWeight:700,color:C.purple}}>Overall: {t.vm_overall_score}</span>
</div>}
{/* CX score */}
{t.task_type==="cx"&&t.cx_score!=null&&<div style={{fontSize:9,color:C.green,fontWeight:700,marginTop:3}}>CX Score: {t.cx_score}%</div>}
{/* Before/After */}
{(t.before_image_url||t.after_image_url)&&<div style={{display:"flex",gap:4,marginTop:6}}>
{t.before_image_url&&<img src={t.before_image_url} alt="B" style={{width:48,height:36,borderRadius:4,objectFit:"cover"}}/>}
{t.after_image_url&&<img src={t.after_image_url} alt="A" style={{width:48,height:36,borderRadius:4,objectFit:"cover"}}/>}
</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
<SB status={t.status}/>
{t.status!=="completed"&&<Bt onClick={()=>markDone(t.id)} sz="sm" v="gold">✓ Done</Bt>}
</div>
</div>
</GC>);})}
</div>);}

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// SALES V2 — 6 tabs: Overview, Weekly, Upload Branch Sales, Upload Employee Sales, Upload Targets, Set Targets + Export
// ═══════════════════════════════════════════════════════════════════════
function SalesV2(){
const{data:comm,loading,reload}=useQ("commercial_overview","order=mtd_achievement_pct.desc");
const{data:weekly}=useQ("daily_sales","order=sale_date.desc&limit=100");
const{data:empPerf}=useQ("sales_staff","order=full_name");
const{profile,branches}=useAuth();const{toast}=useToast();
const isAdmin=["admin","area_manager"].includes(profile?.effectiveRole||profile?.role);
const[tab,setTab]=useState("overview");
const[importing,setImporting]=useState(false);
const[preview,setPreview]=useState(null);
const[bForm,setBForm]=useState({branch_id:"",month:new Date().toISOString().slice(0,7),target:"",actual:"",gross:""});
const fileRef=useRef();
const empFileRef=useRef();
const targetFileRef=useRef();
const[empPreview,setEmpPreview]=useState(null);
const[targetPreview,setTargetPreview]=useState(null);

const loadXLSX=async()=>await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");

// ── Branch Sales Upload ──
const handleBranchFile=async(e)=>{
const file=e.target.files?.[0];if(!file)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await file.arrayBuffer());const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
setPreview(rows.slice(0,5));toast(`${rows.length} rows ready`,"success");}catch(e){toast("Error: "+e.message,"error");}setImporting(false);};

const confirmBranchImport=async()=>{
if(!preview)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await fileRef.current.files[0].arrayBuffer());
const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const res=await sb.rpc("bulk_upsert_daily_sales",{p_rows:JSON.stringify(rows)});
toast(`Imported ${res} branch sales records!`,"success");setPreview(null);reload();}catch(e){toast(e.message,"error");}setImporting(false);};

// ── Employee Sales Upload ──
const handleEmpFile=async(e)=>{
const file=e.target.files?.[0];if(!file)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await file.arrayBuffer());const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
setEmpPreview(rows.slice(0,5));toast(`${rows.length} employee rows ready`,"success");}catch(e){toast("Error: "+e.message,"error");}setImporting(false);};

const confirmEmpImport=async()=>{
if(!empPreview)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await empFileRef.current.files[0].arrayBuffer());
const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const res=await sb.rpc("bulk_upsert_employee_sales",{p_rows:JSON.stringify(rows)});
toast(`Imported ${res} employee sales records!`,"success");setEmpPreview(null);reload();}catch(e){toast(e.message,"error");}setImporting(false);};

// ── Targets Upload (branches) ──
const handleTargetFile=async(e)=>{
const file=e.target.files?.[0];if(!file)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await file.arrayBuffer());const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
setTargetPreview(rows.slice(0,5));toast(`${rows.length} target rows ready`,"success");}catch(e){toast("Error: "+e.message,"error");}setImporting(false);};

const confirmTargetImport=async()=>{
if(!targetPreview)return;setImporting(true);
try{const{read,utils}=await loadXLSX();const wb=read(await targetFileRef.current.files[0].arrayBuffer());
const rows=utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
let saved=0;
for(const row of rows){
  try{
    const bid=branches.find(b=>b.name.toLowerCase().includes((row.branch_name||"").toLowerCase()))?.id;
    if(!bid)continue;
    await sb.rpc("upsert_branch_monthly_sales",{p_branch_id:bid,p_month:(row.target_month||new Date().toISOString().slice(0,7)+"-01"),p_monthly_target:+(row.monthly_target||0),p_actual_sales:+(row.actual_sales||0),p_gross_percentage:+(row.gross_percentage||0),p_user_id:profile.id});
    saved++;
  }catch{}
}
toast(`Imported ${saved} targets!`,"success");setTargetPreview(null);reload();}catch(e){toast(e.message,"error");}setImporting(false);};

// ── Export Functions ──
const exportBranchExcel=async()=>{
try{const{utils,writeFile}=await loadXLSX();
const rows=comm.map(c=>({Branch:c.branch_name,MTD_Sales:+c.mtd_sales||0,Target:+c.monthly_target||0,Remaining:+c.remaining||0,"Achievement_%":+c.mtd_achievement_pct||0,"Gross_%":+c.gross_percentage||0,Today_Sales:+c.today_sales||0,UPT:+c.today_upt||0,ATV:+c.today_atv||0}));
const ws=utils.json_to_sheet(rows);const wb=utils.book_new();utils.book_append_sheet(wb,ws,"Branch_Sales");
writeFile(wb,`RAVIN_Branch_Sales_${new Date().toISOString().slice(0,10)}.xlsx`);
toast("Branch sales exported!","success");}catch(e){toast("Export error: "+e.message,"error");}};

const exportEmpExcel=async()=>{
try{const{utils,writeFile}=await loadXLSX();
const rows=empPerf.map(e=>({Employee:e.full_name||"",Branch:e.branch_name||"",Position:e.position||"",Phone:e.phone||""}));
const ws=utils.json_to_sheet(rows);const wb=utils.book_new();utils.book_append_sheet(wb,ws,"Employee_Performance");
writeFile(wb,`RAVIN_Employee_Performance_${new Date().toISOString().slice(0,10)}.xlsx`);
toast("Employee data exported!","success");}catch(e){toast("Export error: "+e.message,"error");}};

const exportPDF=()=>{window.print();};

const saveBranchTarget=async()=>{
if(!bForm.branch_id){toast("Select branch","error");return;}
try{await sb.rpc("upsert_branch_monthly_sales",{p_branch_id:bForm.branch_id,p_month:bForm.month+"-01",p_monthly_target:+bForm.target||0,p_actual_sales:+bForm.actual||0,p_gross_percentage:+bForm.gross||0,p_user_id:profile.id});
toast("Saved!","success");reload();}catch(e){toast(e.message,"error");}};

const tS=comm.reduce((s,c)=>s+(+c.mtd_sales||0),0);
const tT=comm.reduce((s,c)=>s+(+c.monthly_target||0),0);
const aA=tT?Math.round(tS/tT*100):0;
// Group daily_sales into weeks
const getWeekStart=(d)=>{const dt=new Date(d);dt.setDate(dt.getDate()-dt.getDay());return dt.toISOString().slice(0,10);};
const weeks=[...new Set(weekly.map(w=>getWeekStart(w.sale_date)))].slice(0,4);
const weeklyByBranch={};weekly.forEach(w=>{const wk=getWeekStart(w.sale_date);if(!weeklyByBranch[wk])weeklyByBranch[wk]={};if(!weeklyByBranch[wk][w.branch_id])weeklyByBranch[wk][w.branch_id]={sales:0,atv:0,upt:0,count:0};weeklyByBranch[wk][w.branch_id].sales+=(+w.total_sales||0);weeklyByBranch[wk][w.branch_id].atv+=(+w.atv||0);weeklyByBranch[wk][w.branch_id].upt+=(+w.upt||0);weeklyByBranch[wk][w.branch_id].count++;});

if(loading)return <Ld/>;

const PreviewTable=({data})=>(!data?null:<div style={{marginTop:14}}><div style={{fontSize:10,fontWeight:700,color:C.text,marginBottom:8}}>Preview (first 5 rows):</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{Object.keys(data[0]||{}).map(h=>(<th key={h} style={{padding:"6px 10px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700}}>{h}</th>))}</tr></thead><tbody>{data.map((r,i)=>(<tr key={i} style={{borderBottom:`1px solid ${C.bd}`}}>{Object.values(r).map((v,j)=>(<td key={j} style={{padding:"6px 10px",color:C.sub}}>{String(v)}</td>))}</tr>))}</tbody></table></div></div>);

return(<div>
{/* KPIs */}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:14}}>
{[{l:"MTD Sales",v:fE(tS),c:C.gold},{l:"Target",v:fE(tT),c:C.text},{l:"Remaining",v:fE(Math.max(tT-tS,0)),c:tT>tS?C.amber:C.green},{l:"Achievement",v:`${aA}%`,c:cC(aA),ring:1,rp:aA}].map((k,i)=>(<GC key={i} style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={k.rp} sz={28} sw={3} color={k.c}/>}</div></GC>))}
</div>

{/* Tabs */}
<div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
{[{id:"overview",l:"📊 Overview"},{id:"weekly",l:"📅 Weekly"},{id:"upload_branch",l:"⬆ Branch Sales",admin:true},{id:"upload_emp",l:"⬆ Employee Sales",admin:true},{id:"upload_targets",l:"⬆ Targets",admin:true},{id:"set_targets",l:"🎯 Set Target",admin:true}].filter(t=>!t.admin||isAdmin).map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:tab===t.id?C.blueS:"transparent",color:tab===t.id?C.blue:C.sub,fontSize:10,fontWeight:tab===t.id?700:400,fontFamily:"inherit"}}>{t.l}</button>))}
<div style={{flex:1}}/>
{isAdmin&&<div style={{display:"flex",gap:4}}>
<Bt onClick={exportBranchExcel} v="ghost" sz="sm">⬇ Branch Excel</Bt>
<Bt onClick={exportEmpExcel} v="ghost" sz="sm">⬇ Employee Excel</Bt>
<Bt onClick={exportPDF} v="ghost" sz="sm">🖨 Print</Bt>
</div>}
</div>

{/* ── Overview Tab ── */}
{tab==="overview"&&<GC style={{overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["#","Branch","MTD Sales","Target","Remaining","Achievement","Gross %"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{comm.map((c,i)=>{const ach=+c.mtd_achievement_pct||0;return(<tr key={c.branch_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"9px 12px",color:i<3?C.gold:C.muted,fontWeight:700}}>#{i+1}</td>
<td style={{padding:"9px 12px",fontWeight:700,color:C.text}}>{c.branch_name}</td>
<td style={{padding:"9px 12px",fontWeight:700,color:C.gold}}>{fE(c.mtd_sales)}</td>
<td style={{padding:"9px 12px",color:C.sub}}>{fE(c.monthly_target)}</td>
<td style={{padding:"9px 12px",color:+c.remaining>0?C.amber:C.green,fontWeight:600}}>{fE(c.remaining)}</td>
<td style={{padding:"9px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,color:cC(ach)}}>{ach}%</span><div style={{width:40}}><Bar v={ach} max={100} color={cC(ach)} h={3}/></div></div></td>
<td style={{padding:"9px 12px",color:+c.gross_percentage>0?C.green:C.muted,fontWeight:600}}>{+c.gross_percentage>0?`${c.gross_percentage}%`:"—"}</td>
</tr>);})}</tbody>
</table>
</GC>}

{/* ── Weekly Tab ── */}
{tab==="weekly"&&<div>
{weeks.length===0?<Em icon="📅" title="No weekly data" msg="Upload daily sales to see weekly breakdown."/>:
weeks.map(wk=>{const wData=weeklyByBranch[wk]||{};return(<GC key={wk} style={{marginBottom:10,overflow:"hidden"}}>
<div style={{padding:"10px 16px",background:C.blueS,borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:10,fontWeight:700,color:C.blue}}>Week of {new Date(wk).toLocaleDateString()}</span></div>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Branch","Weekly Sales","ATV","UPT"].map(h=>(<th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
<tbody>{comm.map(b=>{const wd=wData[b.branch_id]||{};return(<tr key={b.branch_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"8px 12px",fontWeight:700,color:C.text}}>{b.branch_name}</td>
<td style={{padding:"8px 12px",color:C.gold,fontWeight:700}}>{fE(wd.sales||0)}</td>
<td style={{padding:"8px 12px",color:C.sub}}>{fE(wd.atv||0)}</td>
<td style={{padding:"8px 12px",color:C.blue}}>{(wd.upt||0).toFixed?.(1)||"0"}</td>
</tr>);})}</tbody>
</table></GC>);})}
</div>}

{/* ── Upload Branch Sales ── */}
{tab==="upload_branch"&&<GC style={{padding:"20px 24px"}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4}}>Upload Branch Daily Sales</div>
<p style={{fontSize:11,color:C.sub,marginBottom:14}}>Columns: <code style={{background:"rgba(0,0,0,0.04)",padding:"1px 6px",borderRadius:4,fontSize:10}}>branch_name, sale_date, total_sales, total_invoices, total_quantity, traffic</code></p>
<input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleBranchFile} style={{display:"none"}}/>
<div style={{display:"flex",gap:10}}>
<Bt onClick={()=>fileRef.current?.click()} v="gold" sz="lg" disabled={importing}>{importing?"...":"📎 Choose File"}</Bt>
{preview&&<Bt onClick={confirmBranchImport} v="gold" sz="lg" disabled={importing}>{importing?"Importing...":"✓ Confirm Import"}</Bt>}
</div>
<PreviewTable data={preview}/>
</GC>}

{/* ── Upload Employee Sales ── */}
{tab==="upload_emp"&&<GC style={{padding:"20px 24px"}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4}}>Upload Employee Daily Sales</div>
<p style={{fontSize:11,color:C.sub,marginBottom:14}}>Columns: <code style={{background:"rgba(0,0,0,0.04)",padding:"1px 6px",borderRadius:4,fontSize:10}}>employee_name, branch_name, sale_date, sales_amount, invoices, quantity</code></p>
<input ref={empFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleEmpFile} style={{display:"none"}}/>
<div style={{display:"flex",gap:10}}>
<Bt onClick={()=>empFileRef.current?.click()} v="gold" sz="lg" disabled={importing}>{importing?"...":"📎 Choose File"}</Bt>
{empPreview&&<Bt onClick={confirmEmpImport} v="gold" sz="lg" disabled={importing}>{importing?"Importing...":"✓ Confirm Import"}</Bt>}
</div>
<PreviewTable data={empPreview}/>
{empPerf.length>0&&<div style={{marginTop:16}}>
<div style={{fontSize:10,fontWeight:700,color:C.text,marginBottom:8}}>Current Employee Performance:</div>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
<thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Employee","Branch","Target","MTD Sales","Remaining","Achievement","UPT"].map(h=>(<th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700}}>{h}</th>))}</tr></thead>
<tbody>{empPerf.map(e=>(<tr key={e.id||e.employee_id} style={{borderBottom:`1px solid ${C.bd}`}}>
<td style={{padding:"7px 10px",fontWeight:700,color:C.text}}>{e.full_name}</td>
<td style={{padding:"7px 10px",color:C.sub}}>{e.branch_name||"—"}</td>
<td style={{padding:"7px 10px",color:C.sub}}>{fE(e.monthly_target)}</td>
<td style={{padding:"7px 10px",color:C.gold,fontWeight:700}}>{fE(e.mtd_sales)}</td>
<td style={{padding:"7px 10px",color:+e.remaining>0?C.amber:C.green}}>{fE(e.remaining)}</td>
<td style={{padding:"7px 10px"}}><span style={{fontWeight:700,color:cC(+e.achievement_pct)}}>{e.achievement_pct}%</span></td>
<td style={{padding:"7px 10px",color:C.blue}}>{(+e.upt||0).toFixed(1)}</td>
</tr>))}</tbody></table></div>}
</GC>}

{/* ── Upload Targets ── */}
{tab==="upload_targets"&&<GC style={{padding:"20px 24px"}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4}}>Upload Monthly Targets (All Branches)</div>
<p style={{fontSize:11,color:C.sub,marginBottom:14}}>Columns: <code style={{background:"rgba(0,0,0,0.04)",padding:"1px 6px",borderRadius:4,fontSize:10}}>branch_name, target_month (YYYY-MM-01), monthly_target, gross_percentage, actual_sales</code></p>
<input ref={targetFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleTargetFile} style={{display:"none"}}/>
<div style={{display:"flex",gap:10}}>
<Bt onClick={()=>targetFileRef.current?.click()} v="gold" sz="lg" disabled={importing}>{importing?"...":"📎 Choose File"}</Bt>
{targetPreview&&<Bt onClick={confirmTargetImport} v="gold" sz="lg" disabled={importing}>{importing?"Importing...":"✓ Confirm Import"}</Bt>}
</div>
<PreviewTable data={targetPreview}/>
</GC>}

{/* ── Set Target (manual) ── */}
{tab==="set_targets"&&<GC style={{padding:"20px 24px"}}>
<div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>Set Monthly Target (One Branch)</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BRANCH</label><select value={bForm.branch_id} onChange={e=>setBForm(p=>({...p,branch_id:e.target.value}))} style={iS}><option value="">Select...</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>MONTH</label><input type="month" value={bForm.month} onChange={e=>setBForm(p=>({...p,month:e.target.value}))} style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>TARGET</label><input type="number" value={bForm.target} onChange={e=>setBForm(p=>({...p,target:e.target.value}))} placeholder="1400000" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>ACTUAL</label><input type="number" value={bForm.actual} onChange={e=>setBForm(p=>({...p,actual:e.target.value}))} placeholder="850000" style={iS}/></div>
<div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>GROSS %</label><input type="number" step="0.1" value={bForm.gross} onChange={e=>setBForm(p=>({...p,gross:e.target.value}))} placeholder="42.5" style={iS}/></div>
<Bt onClick={saveBranchTarget} v="gold" sz="lg">Save →</Bt>
</div>
</GC>}
</div>);}


const PM={dash:"Dashboard",reports:"Reports",new_report:"New Report",rpt_detail:"Report Detail",tasks:"Tasks",new_task:"New Task",sales:"Sales & Targets",team:"My Team",ai:"AI Insights",notifs:"Notifications",users:"Users",settings:"Settings",emp_detail:"Employee Profile",branch_twin:"Store Detail",incidents:"Incidents",new_incident:"Report Issue",vm:"VM Academy",branches:"Stores",employees:"Employees",cx:"CX Readiness",learning:"Learning",activity:"Activity",sales_upload:"Sales Upload"};

function App(){const{user,profile,rdy,sessionRole,setSessionRole,effectiveRole}=useAuth();const[pg,rawSetPg]=useState("dash");const[rC,sRC]=useState(null);const[brC,sBrC]=useState(null);const[empC,sEmpC]=useState(null);
const[sideOpen,setSideOpen]=useState(false);
const isMobile=()=>typeof window!=="undefined"&&window.innerWidth<768;
const setPg=(target)=>{if(isMobile())setSideOpen(false);if(typeof target==="object"&&target.id){if(target.id==="branch_twin"){sBrC(target.data);rawSetPg("branch_twin");}else if(target.id==="emp_detail"){sEmpC(target.data);rawSetPg("emp_detail");}else rawSetPg(target.id);}else rawSetPg(target);};
const{data:un,reload:rlN}=useQ("notifications","is_read=eq.false");
useEffect(()=>{const t=setInterval(rlN,15000);return()=>clearInterval(t);},[rlN]);
if(!rdy)return <Ld t="Connecting to RAVIN Academy..."/>;
if(!user)return <Login/>;
if(profile?.can_select_role&&!sessionRole)return <RoleSelector branchName={profile.full_name||"Branch"} onSelect={setSessionRole}/>;
const nC=un.length;const title=PM[pg]||"RAVIN Academy";
const mob=isMobile();
return(<div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Inter',system-ui,sans-serif"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@media(max-width:767px){.sidebar{transform:${sideOpen?"translateX(0)":"translateX(-100%)"} !important;}}`}</style>
{/* Mobile overlay */}
{sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:199,display:"block"}}/>}
<Side pg={pg} setPg={setPg} profile={profile} nC={nC} effectiveRole={effectiveRole} sideOpen={sideOpen} setSideOpen={setSideOpen}/>
<main style={{marginLeft:mob?0:216,minHeight:"100vh",display:"flex",flexDirection:"column",transition:"margin 0.3s"}}>
<div style={{position:"sticky",top:0,zIndex:100,background:"#FFFFFF",borderBottom:`1px solid ${C.bd}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
{/* Hamburger — mobile only */}
<button onClick={()=>setSideOpen(!sideOpen)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,color:C.blue,display:mob?"flex":"none",alignItems:"center",justifyContent:"center",lineHeight:1}}>
<span style={{display:"flex",flexDirection:"column",gap:"4px",width:16}}><span style={{height:2,background:C.blue,borderRadius:1,display:"block",width:sideOpen?"100%":"100%"}}/><span style={{height:2,background:C.blue,borderRadius:1,display:"block"}}/><span style={{height:2,background:C.blue,borderRadius:1,display:"block",width:sideOpen?"60%":"100%"}}/></span>
</button>
<div style={{fontSize:14,fontWeight:800,color:C.text}}>{title}</div></div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>{(pg==="dash"||pg==="tasks")&&<Bt onClick={()=>setPg("new_report")} v="gold" sz="sm">+ Report</Bt>}<button onClick={()=>setPg("notifs")} style={{position:"relative",background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>◎{nC>0&&<span style={{position:"absolute",top:-4,right:-4,background:C.red,color:"#fff",fontSize:8,fontWeight:700,borderRadius:10,padding:"1px 5px"}}>{nC}</span>}</button></div></div>
<div style={{flex:1,padding:"18px 24px"}}>
{pg==="dash"&&<Dash setPg={setPg}/>}
{pg==="reports"&&<ReportsPage setPg={setPg} setCtx={sRC}/>}
{pg==="new_report"&&<NewReport setPg={setPg}/>}
{pg==="rpt_detail"&&<RptDetail rpt={rC} setPg={setPg}/>}
{pg==="tasks"&&<TasksV2 setPg={setPg}/>}
{pg==="new_task"&&<TasksV2 setPg={setPg}/>}
{pg==="incidents"&&<IncidentsPage setPg={setPg}/>}
{pg==="new_incident"&&<NewIncident setPg={setPg}/>}
{pg==="sales"&&<SalesV2/>}
{pg==="vm"&&<VMAcademy/>}
{pg==="branches"&&<BranchesPage setPg={setPg}/>}
{pg==="branch_twin"&&brC&&<BranchTwin branch={brC} setPg={setPg}/>}
{pg==="employees"&&<EmployeesPage setPg={setPg}/>}
{pg==="emp_detail"&&empC&&<EmpDetail emp={empC} setPg={setPg}/>}
{pg==="learning"&&<LearningPage/>}
{pg==="cx"&&<CXReadiness/>}
{pg==="ai"&&<AIPage/>}
{pg==="notifs"&&<NotifsPage/>}
{pg==="activity"&&<ActivityPage/>}
{pg==="users"&&<UsersPage/>}
{pg==="sales_upload"&&<SalesUploadPage/>}
{pg==="settings"&&<ProfileSettings/>}
{pg==="team"&&<MyTeam/>}
</div></main></div>);}

export default function RavinAcademy(){return <TP><AP><App/></AP></TP>;}
