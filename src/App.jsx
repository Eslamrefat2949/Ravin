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
  bg:"#09090B",card:"#18181D",text:"#ECEBE6",sub:"#8B8A85",muted:"#55544F",dim:"#333330",
  gold:"#C89B4A",goldS:"rgba(200,155,74,0.12)",goldB:"rgba(200,155,74,0.25)",
  green:"#34A06C",greenS:"rgba(52,160,108,0.12)",
  red:"#D04545",redS:"rgba(208,69,69,0.12)",
  amber:"#C47F1A",amberS:"rgba(196,127,26,0.12)",
  blue:"#3A7DD6",blueS:"rgba(58,125,214,0.12)",
  purple:"#7B5CC4",purpleS:"rgba(123,92,196,0.12)",
  bd:"rgba(255,255,255,0.06)",bh:"rgba(255,255,255,0.12)",
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
function Ring({pct,sz=48,sw=4,color=C.gold}){const r=(sz-sw)/2,ci=2*Math.PI*r,d=(Math.min(pct||0,100)/100)*ci;return(<svg width={sz} height={sz} style={{transform:"rotate(-90deg)",flexShrink:0}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${d} ${ci}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease"}}/></svg>);}
function Bar({v,max=100,color=C.gold,h=3}){return(<div style={{width:"100%",height:h,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${Math.min((v||0)/max*100,100)}%`,height:"100%",background:color,borderRadius:2,transition:"width 0.8s"}}/></div>);}
function Chip({text,color,bg}){return <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color,background:bg,padding:"2px 7px",borderRadius:4,whiteSpace:"nowrap"}}>{text}</span>;}
function GC({children,style:s={},onClick,glow}){const[h,sH]=useState(false);return(<div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={onClick} style={{background:C.card,border:`1px solid ${h&&onClick?C.bh:C.bd}`,borderRadius:14,transition:"all 0.2s",cursor:onClick?"pointer":"default",boxShadow:glow?`0 0 20px ${glow}`:"none",transform:h&&onClick?"translateY(-1px)":"none",...s}}>{children}</div>);}
function Bt({children,onClick,v="default",sz="md",style:s={},disabled}){const S={sm:{fontSize:10,padding:"5px 11px"},md:{fontSize:11,padding:"7px 15px"},lg:{fontSize:12,padding:"9px 20px"}};const V={default:{background:"rgba(255,255,255,0.07)",color:C.text,border:`1px solid ${C.bd}`},gold:{background:C.gold,color:"#0A0A0A",border:"none"},ghost:{background:"transparent",color:C.sub,border:"none"},danger:{background:C.redS,color:C.red,border:`1px solid ${C.red}30`}};return(<button onClick={onClick} disabled={disabled} style={{...S[sz],...V[v],cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:700,borderRadius:8,transition:"all 0.15s",opacity:disabled?.5:1,...s}}>{children}</button>);}
function SB({status}){const m={approved:{c:C.green,bg:C.greenS,l:"Approved"},submitted:{c:C.blue,bg:C.blueS,l:"Submitted"},pending_review:{c:C.amber,bg:C.amberS,l:"Pending"},rejected:{c:C.red,bg:C.redS,l:"Rejected"},draft:{c:C.muted,bg:"rgba(255,255,255,0.05)",l:"Draft"},pending:{c:C.sub,bg:"rgba(255,255,255,0.05)",l:"Pending"},in_progress:{c:C.blue,bg:C.blueS,l:"In Progress"},waiting_approval:{c:C.amber,bg:C.amberS,l:"Awaiting"},completed:{c:C.green,bg:C.greenS,l:"Done"},escalated:{c:C.red,bg:C.redS,l:"Escalated"},open:{c:C.red,bg:C.redS,l:"Open"},resolved:{c:C.green,bg:C.greenS,l:"Resolved"}};const cfg=m[status]||{c:C.sub,bg:"rgba(255,255,255,0.05)",l:status||"—"};return <Chip text={cfg.l} color={cfg.c} bg={cfg.bg}/>;}
const iS={width:"100%",padding:"8px 11px",borderRadius:8,border:`1px solid ${C.bd}`,background:"rgba(255,255,255,0.04)",color:C.text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
function Ld({t="Loading..."}){return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,gap:14}}><div style={{width:28,height:28,border:`3px solid ${C.bd}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><div style={{fontSize:11,color:C.sub}}>{t}</div></div>;}
function Em({icon="📭",title,msg,action,onAction}){return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,gap:12}}><div style={{fontSize:36}}>{icon}</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>{title||"No data yet"}</div><div style={{fontSize:11,color:C.sub,textAlign:"center",maxWidth:300}}>{msg}</div>{action&&<Bt onClick={onAction} v="gold" sz="md">{action}</Bt>}</div>;}

// ═══════════════════════════════════════════════════════════════════════
// CONTEXTS
// ═══════════════════════════════════════════════════════════════════════
const TC=createContext();
function TP({children}){const[t,sT]=useState([]);const add=(msg,type="info")=>{const id=Date.now();sT(p=>[...p,{id,msg,type}]);setTimeout(()=>sT(p=>p.filter(x=>x.id!==id)),4000);};return(<TC.Provider value={{toast:add}}>{children}<div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>{t.map(x=>(<div key={x.id} style={{padding:"10px 16px",borderRadius:10,fontSize:12,fontWeight:600,background:x.type==="error"?"#3A1515":x.type==="success"?"#153A1F":"#1A1A22",color:x.type==="error"?C.red:x.type==="success"?C.green:C.text,border:`1px solid ${x.type==="error"?C.red+"40":x.type==="success"?C.green+"40":C.bd}`,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",minWidth:240,pointerEvents:"auto"}}>{x.type==="error"?"⚠ ":x.type==="success"?"✓ ":"ℹ "}{x.msg}</div>))}</div></TC.Provider>);}
const useToast=()=>useContext(TC);

const AC=createContext();
function AP({children}){const[u,sU]=useState(null);const[p,sP]=useState(null);const[br,sBr]=useState([]);const[rdy,sR]=useState(false);
const bm=Object.fromEntries(br.map(b=>[b.id,b.name]));
useEffect(()=>{(async()=>{const user=await sb.getUser();if(user){sU(user);try{const[pr]=await sb.q("profiles",{qs:`id=eq.${user.id}`});sP(pr);}catch{}try{sBr(await sb.q("branches",{qs:"is_active=eq.true&order=name"})||[]);}catch{}}sR(true);})();},[]);
const login=async(em,pw)=>{const d=await sb.signIn(em,pw);sU(d.user);try{const[pr]=await sb.q("profiles",{qs:`id=eq.${d.user.id}`});sP(pr);}catch{}try{sBr(await sb.q("branches",{qs:"is_active=eq.true&order=name"})||[]);}catch{};return d.user;};
const logout=async()=>{await sb.signOut();sU(null);sP(null);};
return <AC.Provider value={{user:u,profile:p,branches:br,bm,rdy,login,logout}}>{children}</AC.Provider>;}
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
    {preview&&<div style={{width:"100%",height:120,borderRadius:10,overflow:"hidden",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.bd}`}}><img src={preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
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
return(<div style={{minHeight:"100vh",background:"#050507",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}><div style={{position:"absolute",top:"20%",left:"30%",width:500,height:500,background:"radial-gradient(circle,rgba(200,155,74,0.08),transparent 60%)",pointerEvents:"none"}}/><div style={{width:400,padding:"40px 36px",background:"rgba(24,24,29,0.8)",backdropFilter:"blur(20px)",borderRadius:20,border:`1px solid ${C.bd}`,position:"relative",zIndex:1}}><div style={{textAlign:"center",marginBottom:28}}><div style={{width:44,height:44,borderRadius:11,background:`linear-gradient(135deg,${C.gold},${C.gold}88)`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#0A0A0A",marginBottom:12}}>R</div><div style={{fontSize:22,fontWeight:900,letterSpacing:"0.1em",color:C.text}}>RAVIN <span style={{color:C.gold}}>ACADEMY</span></div><div style={{fontSize:9,color:C.sub,letterSpacing:"0.22em",marginTop:5}}>MAKE UR WORLD TO BE PROUD</div></div>
<div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.1em",display:"block",marginBottom:5}}>EMAIL</label><input value={em} onChange={e=>sE(e.target.value)} placeholder="you@ravin.academy" onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/></div>
<div style={{marginBottom:20}}><label style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.1em",display:"block",marginBottom:5}}>PASSWORD</label><input type="password" value={pw} onChange={e=>sP(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/></div>
<Bt onClick={go} v="gold" sz="lg" disabled={busy} style={{width:"100%",fontSize:13}}>{busy?"Signing in...":"Sign In →"}</Bt>
<div style={{marginTop:16,padding:"12px",background:"rgba(255,255,255,0.02)",borderRadius:10,border:`1px solid ${C.bd}`,fontSize:9,color:C.muted,lineHeight:1.7}}>Run all SQL migrations → Create user in Supabase Auth → Sign in</div>
</div></div>);}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function Side({pg,setPg,profile:p,nC}){const{logout}=useAuth();
const nav=[
  {id:"dash",l:"Dashboard",i:"◈",g:"CORE"},{id:"war",l:"War Room",i:"⬡",g:"CORE"},
  {id:"reports",l:"Reports",i:"◉",g:"OPS"},{id:"new_report",l:"New Report",i:"✚",g:"OPS",hl:1},
  {id:"tasks",l:"Tasks",i:"☰",g:"OPS"},{id:"new_task",l:"New Task",i:"+",g:"OPS",hl:1},
  {id:"incidents",l:"Incidents",i:"⚠",g:"OPS"},{id:"new_incident",l:"Report Issue",i:"!",g:"OPS",hl:1},
  {id:"sales",l:"Sales & Targets",i:"◆",g:"COMMERCIAL"},{id:"vm",l:"VM Academy",i:"◇",g:"COMMERCIAL"},
  {id:"branches",l:"Stores",i:"⊡",g:"STORES"},
  {id:"employees",l:"Employees",i:"◑",g:"PEOPLE"},{id:"learning",l:"Learning",i:"⊞",g:"PEOPLE"},
  {id:"cx",l:"CX Readiness",i:"★",g:"PEOPLE"},
  {id:"ai",l:"AI Insights",i:"✦",g:"INTEL"},{id:"notifs",l:"Notifications",i:"◎",badge:nC,g:"INTEL"},
  {id:"activity",l:"Activity",i:"≡",g:"INTEL"},
  ...(p?.role==="admin"?[{id:"users",l:"Users",i:"⊕",g:"ADMIN"}]:[]),
];
const gs=[...new Set(nav.map(n=>n.g))];
return(<aside style={{width:216,minHeight:"100vh",background:"rgba(9,9,11,0.98)",display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,bottom:0,zIndex:200,borderRight:`1px solid ${C.bd}`}}>
  <div style={{padding:"20px 18px 12px",borderBottom:`1px solid ${C.bd}`}}>
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${C.gold},${C.gold}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#0A0A0A"}}>R</div>
      <div><div style={{fontSize:14,fontWeight:900,letterSpacing:"0.1em",color:C.text,lineHeight:1}}>RAVIN <span style={{color:C.gold}}>ACADEMY</span></div>
        <div style={{fontSize:7,color:C.muted,letterSpacing:"0.18em",marginTop:2}}>MAKE UR WORLD TO BE PROUD</div></div></div></div>
  <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>{gs.map(g=>(<div key={g}><div style={{fontSize:8,fontWeight:700,color:C.dim,letterSpacing:"0.14em",padding:"10px 10px 4px"}}>{g}</div>
    {nav.filter(n=>n.g===g).map(n=>(<button key={n.id} onClick={()=>setPg(n.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",borderRadius:7,border:"none",cursor:"pointer",background:pg===n.id?C.goldS:n.hl?"rgba(200,155,74,0.05)":"transparent",color:pg===n.id?C.gold:n.hl?`${C.gold}88`:C.sub,fontSize:10.5,fontWeight:pg===n.id?700:400,transition:"all 0.15s",marginBottom:1,textAlign:"left",fontFamily:"inherit",borderLeft:pg===n.id?`2px solid ${C.gold}`:"2px solid transparent"}}><span style={{fontSize:12,width:16,textAlign:"center",flexShrink:0}}>{n.i}</span><span style={{flex:1}}>{n.l}</span>{n.badge>0&&<span style={{background:C.red,color:"#fff",fontSize:8,fontWeight:700,borderRadius:10,padding:"1px 5px"}}>{n.badge}</span>}</button>))}</div>))}</div>
  <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bd}`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.gold}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#0A0A0A",flexShrink:0}}>{(p?.full_name||"U").split(" ").map(w=>w[0]).join("").slice(0,2)}</div><div style={{minWidth:0,flex:1}}><div style={{fontSize:10,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.full_name}</div><div style={{fontSize:8,color:C.muted}}>{p?.role?.replace("_"," ")}</div></div><button onClick={logout} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:11,padding:3}}>⏻</button></div></div>
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
  {ins.length>0&&<div style={{background:"rgba(9,9,11,0.95)",borderRadius:14,padding:"18px 22px",marginBottom:20,border:`1px solid ${C.goldB}`,boxShadow:`0 0 28px ${C.goldS}`}}><div style={{fontSize:10,fontWeight:800,color:C.gold,letterSpacing:"0.12em",marginBottom:10}}>✦ RAVIN ACADEMY · AI BRIEF</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:5}}>{ins.map(i=>(<div key={i.id} style={{padding:"6px 10px",borderRadius:7,background:i.severity==="critical"?C.redS:i.severity==="warning"?C.amberS:"rgba(255,255,255,0.02)",border:`1px solid ${i.severity==="critical"?C.red+"20":C.bd}`}}><div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{i.title}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:2}}>{i.content}</div></div>))}</div></div>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8,marginBottom:20}}>
    {[{l:"Reports",v:rpts.length,c:C.gold,ck:()=>setPg("reports")},{l:"Compliance",v:avgC?`${avgC}%`:"—",c:cC(avgC),ring:avgC>0,rp:avgC},{l:"Missing",v:Math.max(brs.length-new Set(rpts.map(r=>r.branch_id)).size,0),c:C.red},{l:"Stores",v:brs.length,c:C.gold,ck:()=>setPg("branches")}].map((k,i)=>(<GC key={i} onClick={k.ck} style={{padding:"14px 16px"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:20,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={k.rp} sz={34} sw={3} color={k.c}/>}</div></GC>))}
  </div>
  {health.length>0&&<div style={{marginBottom:20}}><div style={{fontSize:10,fontWeight:700,color:C.sub,marginBottom:10}}>STORE HEALTH</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>{health.map(b=>(<GC key={b.branch_id} onClick={()=>setPg({id:"branch_twin",data:b})} style={{padding:"14px 18px"}} glow={b.health_status==="crisis"?C.redS:null}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2}}>{b.branch_name}</div><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11}}>{hI(b.health_status)}</span><span style={{fontSize:9,color:hC(b.health_status),fontWeight:600,textTransform:"capitalize"}}>{b.health_status}</span></div></div><Ring pct={b.health_score} sz={34} sw={3} color={hC(b.health_status)}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>{[{l:"Health",v:`${b.health_score}%`,c:hC(b.health_status)},{l:"Comp",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—",c:C.gold},{l:"Tasks",v:`${b.completed_tasks}/${b.total_tasks}`,c:C.blue}].map(x=>(<div key={x.l} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",borderRadius:5,padding:"4px"}}><div style={{fontSize:11,fontWeight:700,color:x.c}}>{x.v}</div><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div></div>))}</div></GC>))}</div></div>}
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
        {[{l:"Compliance",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—"},{l:"Reports",v:b.reports_today},{l:"Tasks",v:`${b.completed_tasks}/${b.total_tasks}`},{l:"Overdue",v:b.overdue_tasks},{l:"Incidents",v:b.open_incidents},{l:"Staff",v:staff.length}].map(k=>(<div key={k.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:7,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{k.l}</div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{k.v}</div></div>))}
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

    {tab==="timeline"&&(activity.length===0?<Em icon="📜" title="No activity"/>:<GC style={{padding:"18px 22px"}}>{activity.map((a,i)=>(<div key={a.id} style={{display:"flex",gap:10,paddingBottom:10,paddingTop:i?10:0,borderBottom:`1px solid ${C.bd}`}}><div style={{width:26,height:26,borderRadius:6,background:C.goldS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:C.gold,fontWeight:700,flexShrink:0}}>{new Date(a.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div><div><div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.65)"}}>{a.action}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{a.entity_type||""}</div></div></div>))}</GC>)}

    {tab==="ai"&&(insights.length===0?<Em icon="✦" title="No AI insights" msg="Insights generate automatically from reports and operations data."/>:<GC style={{padding:"18px 22px"}}><div style={{fontSize:9,fontWeight:700,color:C.gold,letterSpacing:"0.08em",marginBottom:14}}>✦ AI INSIGHTS — {b.branch_name?.toUpperCase()}</div>{insights.map(i=>(<div key={i.id} style={{padding:"10px 14px",borderRadius:7,marginBottom:6,background:i.severity==="critical"?C.redS:i.severity==="warning"?C.amberS:"rgba(255,255,255,0.02)",borderLeft:`3px solid ${i.severity==="critical"?C.red:i.severity==="warning"?C.amber:C.green}`}}><div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{i.title}</div><div style={{fontSize:9,color:C.sub,marginTop:3}}>{i.content}</div></div>))}</GC>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL + AI COACHING — NEW ✅
// ═══════════════════════════════════════════════════════════════════════
function EmpDetail({emp,setPg}){
  const{bm}=useAuth();const{toast}=useToast();
  const{data:sales}=useQ("employee_sales",`employee_id=eq.${emp.id}&order=sale_date.desc&limit=30`);
  const{data:tasks}=useQ("tasks",`assigned_to=eq.${emp.id}&is_deleted=eq.false&order=created_at.desc&limit=10`);
  const{data:attendance}=useQ("attendance_logs",`user_id=eq.${emp.id}&order=log_date.desc&limit=30`);
  const{data:training}=useQ("training_completions",`user_id=eq.${emp.id}`);
  const[coaching,setCoaching]=useState("");const[loadingAI,setLAI]=useState(false);

  const generateCoaching=async()=>{
    setLAI(true);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
          system:`You are RAVIN Academy's employee coaching AI. Give specific, actionable coaching advice for retail employees. Be encouraging but direct.`,
          messages:[{role:"user",content:`Generate coaching plan for ${emp.full_name}, role: ${emp.role}, branch: ${bm[emp.branch_id]||"Unknown"}. Performance score: ${emp.performance_score}%. MTD sales records: ${sales.length}. Tasks assigned: ${tasks.length} (completed: ${tasks.filter(t=>t.status==="completed").length}). Training completed: ${training.length}. Attendance records: ${attendance.length}. Give 3-4 specific coaching recommendations.`}]})});
      const d=await r.json();setCoaching(d.content?.[0]?.text||"Unable to generate.");
    }catch{setCoaching("Connection error.");}
    setLAI(false);
  };

  const totalSales=sales.reduce((s,x)=>s+(+x.sales_amount||0),0);
  const avgUPT=sales.length?sales.reduce((s,x)=>s+(+x.upt||0),0)/sales.length:0;
  const tasksDone=tasks.filter(t=>t.status==="completed").length;
  const presentDays=attendance.filter(a=>a.status==="present").length;

  return(<div>
    <Bt onClick={()=>setPg("employees")} sz="sm" style={{marginBottom:14}}>← All Employees</Bt>
    <GC style={{padding:"22px 26px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.gold}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#0A0A0A"}}>{emp.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>{emp.full_name}</div>
          <div style={{fontSize:10,color:C.sub}}>{bm[emp.branch_id]||"All"} · {emp.role?.replace("_"," ")}</div>
          <Chip text={`Score: ${emp.performance_score||0}%`} color={C.gold} bg={C.goldS}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>
        {[{l:"MTD Sales",v:fE(totalSales)},{l:"Avg UPT",v:avgUPT.toFixed(1)},{l:"Tasks Done",v:`${tasksDone}/${tasks.length}`},{l:"Present Days",v:presentDays},{l:"Training",v:training.length},{l:"Score",v:`${emp.performance_score||0}%`}].map(k=>(<div key={k.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:7,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{k.l}</div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{k.v}</div></div>))}
      </div>
    </GC>

    {/* AI Coaching */}
    <GC style={{padding:"18px 22px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,color:C.gold,letterSpacing:"0.08em"}}>✦ AI COACHING</div>
        <Bt onClick={generateCoaching} v="gold" sz="sm" disabled={loadingAI}>{loadingAI?"Generating...":"Generate Coaching Plan"}</Bt>
      </div>
      {coaching?<div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{coaching}</div>
        :<div style={{fontSize:11,color:C.muted,textAlign:"center",padding:20}}>Click "Generate Coaching Plan" to get AI-powered recommendations for this employee</div>}
    </GC>

    {/* Recent tasks */}
    {tasks.length>0&&<GC style={{padding:"16px 20px",marginBottom:14}}>
      <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:"0.08em",marginBottom:10}}>RECENT TASKS</div>
      {tasks.slice(0,5).map(t=>(<div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:10,fontWeight:600,color:C.text}}>{t.title}</div><SB status={t.status}/></div>))}
    </GC>}
  </div>);
}

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
        {[{l:"Window",v:r.window_score},{l:"Mannequin",v:r.mannequin_score},{l:"Folding",v:r.folding_score},{l:"Promo",v:r.promotion_score}].map(x=>(<div key={x.l} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",borderRadius:5,padding:"4px"}}><div style={{fontSize:11,fontWeight:700,color:+x.v>=80?C.green:C.amber}}>{x.v}</div><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div></div>))}
      </div>
      {(r.before_image_url||r.after_image_url)&&<div style={{display:"flex",gap:6}}>{r.before_image_url&&<div style={{flex:1,height:80,borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,0.03)"}}><img src={r.before_image_url} alt="Before" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}{r.after_image_url&&<div style={{flex:1,height:80,borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,0.03)"}}><img src={r.after_image_url} alt="After" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}</div>}
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
          <div key={item.k} onClick={()=>setChecks(p=>({...p,[item.k]:!p[item.k]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,cursor:"pointer",background:checks[item.k]?C.greenS:"rgba(255,255,255,0.03)",border:`1px solid ${checks[item.k]?C.green+"30":C.bd}`,transition:"all 0.15s"}}>
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
<GC style={{padding:"22px 26px",marginBottom:14}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14}}><div><div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:6}}>{bm[rpt.branch_id]||"Branch"}</div><div style={{display:"flex",gap:8,marginBottom:8}}><SB status={rpt.status}/><Chip text={(rpt.shift||"").replace("_"," ")} color={C.sub} bg="rgba(255,255,255,0.05)"/></div></div>
{comp>0&&<div style={{display:"flex",alignItems:"center",gap:12}}><Ring pct={comp} sz={56} sw={5} color={cC(comp)}/><div><div style={{fontSize:26,fontWeight:900,color:cC(comp)}}>{Math.round(comp)}%</div><Chip text={cL(comp)} color={cC(comp)} bg={cB(comp)}/></div></div>}</div>
{canR&&rpt.status==="submitted"&&<div style={{display:"flex",gap:8,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.bd}`,flexWrap:"wrap"}}><Bt onClick={()=>approve("approved")} v="gold" sz="md" disabled={busy}>✓ Approve</Bt><Bt onClick={()=>approve("rejected")} v="danger" sz="md" disabled={busy}>✕ Reject</Bt><div style={{flex:1}}/><input value={cm} onChange={e=>sCm(e.target.value)} placeholder="Comment..." style={{...iS,maxWidth:300}}/></div>}</GC>
{loading?<Ld t="Loading answers..."/>:Object.keys(grouped).length===0?<GC style={{padding:20,textAlign:"center"}}><div style={{fontSize:11,color:C.muted}}>No checklist answers recorded</div></GC>:Object.entries(grouped).map(([code,sec])=>(<GC key={code} style={{marginBottom:8,overflow:"hidden"}}><div style={{padding:"12px 20px",background:"rgba(255,255,255,0.02)",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{sec.icon}</span><span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.65)"}}>{sec.title}</span></div>{sec.items.map((a,i)=>{const col=a.status==="completed"?C.green:a.status==="follow_up"?C.amber:C.red;return(<div key={a.answer_id} style={{padding:"10px 20px",borderBottom:i<sec.items.length-1?`1px solid ${C.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div style={{fontSize:11,color:"rgba(255,255,255,0.6)",flex:1}}>{a.item_text}</div>{a.note&&<div style={{fontSize:10,color:C.sub,fontStyle:"italic",flex:1}}>{a.note}</div>}<Chip text={a.status?.replace("_"," ")} color={col} bg={col+"15"}/></div>);})}</GC>))}
<GC style={{padding:"16px 20px"}}><div style={{fontSize:9,fontWeight:700,color:C.muted,marginBottom:10}}>COMMENTS</div>{comments.map(c=>(<div key={c.id} style={{padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:10,color:C.text}}>{c.content}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{new Date(c.created_at).toLocaleString()}</div></div>))}<div style={{display:"flex",gap:8,marginTop:10}}><input value={cm} onChange={e=>sCm(e.target.value)} placeholder="Add comment..." style={{...iS,flex:1}} onKeyDown={e=>e.key==="Enter"&&addCm()}/><Bt onClick={addCm} v="gold" sz="sm">Send</Bt></div></GC></div>);}

function NewReport({setPg}){const{profile:p,branches:brs}=useAuth();const{toast}=useToast();const[br,sBr]=useState(p?.branch_id||"");const[shift,sSh]=useState("opening");const[notes,sN]=useState("");const[ans,sAns]=useState({});const[openS,sOS]=useState({opening:true});const[kpis,sK]=useState({});const[busy,sB]=useState(false);const[done,sD]=useState(false);const[imgUrl,setImgUrl]=useState(null);
useEffect(()=>{if(!br&&brs.length)sBr(brs[0].id);},[brs]);const sA=(sec,item,f,v)=>sAns(p=>({...p,[`${sec}::${item}`]:{...p[`${sec}::${item}`],[f]:v}}));
const comp=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status==="completed").length;const foll=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status==="follow_up").length;const notd=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status==="not_completed").length;const answered=comp+foll+notd;const compliance=answered>0?Math.round(((comp+foll*.5)/TOT)*100):0;
const submit=async()=>{if(!br){toast("Select branch","error");return;}sB(true);try{const[report]=await sb.q("reports",{method:"POST",body:{branch_id:br,submitted_by:p.id,shift,status:"submitted",manager_notes:notes||null,compliance_score:compliance,total_items:TOT,completed_items:comp,follow_up_items:foll,not_completed_items:notd,sales_amount:kpis.Sales?+kpis.Sales:null,target_amount:kpis.Target?+kpis.Target:null,upt:kpis.UPT?+kpis.UPT:null,atv:kpis.ATV?+kpis.ATV:null,conversion:kpis.Conv?+kpis.Conv:null,traffic:kpis.Traffic?+kpis.Traffic:null}});const secs=await sb.q("report_sections",{qs:"order=sort_order"});const sm=Object.fromEntries(secs.map(s=>[s.code,s.id]));const rows=ALL_IT.filter(({sec,item})=>ans[`${sec}::${item}`]?.status).map(({sec,item})=>({report_id:report.id,section_id:sm[sec],item_text:item,status:ans[`${sec}::${item}`].status,note:ans[`${sec}::${item}`].note||null,answered_by:p.id}));if(rows.length)await sb.q("report_answers",{method:"POST",body:rows});if(imgUrl)await sb.q("report_images",{method:"POST",body:{report_id:report.id,image_url:imgUrl,uploaded_by:p.id,section:"general"}});await sb.q("activity_logs",{method:"POST",body:{user_id:p.id,branch_id:br,action:"Submitted report",entity_type:"report",entity_id:report.id}});toast("Report submitted!","success");sD(true);}catch(e){toast(e.message,"error");}sB(false);};
if(done)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:16}}><div style={{fontSize:48}}>✅</div><div style={{fontSize:18,fontWeight:900,color:C.text}}>Report Submitted</div><GC style={{padding:"18px 32px",textAlign:"center"}}><div style={{fontSize:36,fontWeight:900,color:cC(compliance)}}>{compliance}%</div></GC><div style={{display:"flex",gap:10}}><Bt onClick={()=>setPg("reports")} v="gold" sz="lg">View Reports</Bt><Bt onClick={()=>{sD(false);sAns({});}} sz="lg">New Report</Bt></div></div>);
return(<div style={{maxWidth:820,margin:"0 auto"}}><div style={{position:"sticky",top:52,zIndex:80,background:"rgba(9,9,11,0.97)",backdropFilter:"blur(16px)",padding:"10px 0",marginBottom:16,borderBottom:`1px solid ${C.bd}`}}><div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Ring pct={compliance} sz={42} sw={4} color={cC(compliance)}/><div><div style={{fontSize:16,fontWeight:900,color:cC(compliance)}}>{compliance}%</div><div style={{fontSize:8,color:C.muted}}>Compliance</div></div></div><div style={{display:"flex",gap:12,flex:1}}>{[{l:"Done",v:comp,c:C.green},{l:"Follow",v:foll,c:C.amber},{l:"Not",v:notd,c:C.red},{l:"Left",v:TOT-answered,c:C.muted}].map(x=>(<div key={x.l} style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:x.c}}>{x.v}</div><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div></div>))}</div><Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"...":"Submit →"}</Bt></div></div>
<GC style={{padding:"18px 22px",marginBottom:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>BRANCH</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}>{brs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>SHIFT</label><select value={shift} onChange={e=>sSh(e.target.value)} style={iS}>{["opening","mid","closing","full_day"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>NOTES</label><input value={notes} onChange={e=>sN(e.target.value)} placeholder="Notes..." style={iS}/></div></div></GC>
<GC style={{padding:"18px 22px",marginBottom:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>{["Sales","Target","UPT","ATV","Conv","Traffic"].map(k=>(<div key={k}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>{k}</label><input type="number" placeholder="0" value={kpis[k]||""} onChange={e=>sK(p=>({...p,[k]:e.target.value}))} style={{...iS,fontSize:13,fontWeight:700}}/></div>))}</div></GC>
<GC style={{padding:"18px 22px",marginBottom:10}}><div style={{fontSize:9,fontWeight:700,color:C.muted,marginBottom:8}}>ATTACH PHOTO</div><FileUpload bucket="report-images" onUploaded={setImgUrl}/></GC>
{SEC.map(sec=>{const sd=sec.items.filter(item=>ans[`${sec.code}::${item}`]?.status==="completed").length;const op=openS[sec.code];return(<GC key={sec.code} style={{marginBottom:6,overflow:"hidden"}}><button onClick={()=>sOS(p=>({...p,[sec.code]:!p[sec.code]}))} style={{width:"100%",padding:"12px 18px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"inherit"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{sec.icon}</span><div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.75)"}}>{sec.title}</div><div style={{fontSize:8,color:C.muted}}>{sd}/{sec.items.length}</div></div></div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:50}}><Bar v={sd} max={sec.items.length} color={sd===sec.items.length?C.green:C.gold} h={3}/></div><span style={{color:C.muted,fontSize:12,transform:op?"rotate(180deg)":"none",transition:"transform 0.2s"}}>⌄</span></div></button>{op&&<div style={{borderTop:`1px solid ${C.bd}`}}>{sec.items.map((item,idx)=>{const key=`${sec.code}::${item}`;const a=ans[key]||{};const sc={completed:{c:C.green,bg:C.greenS},not_completed:{c:C.red,bg:C.redS},follow_up:{c:C.amber,bg:C.amberS}};return(<div key={item} style={{padding:"10px 18px",borderBottom:idx<sec.items.length-1?`1px solid ${C.bd}`:"none",background:a.status?(sc[a.status]?.bg||"").replace("0.12","0.04"):"transparent"}}><div style={{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:160}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.7)",marginBottom:6}}>{item}</div><div style={{display:"flex",gap:4}}>{[["completed","✓ Done"],["follow_up","⚡ Follow"],["not_completed","✕ Not Done"]].map(([s,l])=>(<button key={s} onClick={()=>sA(sec.code,item,"status",s)} style={{fontSize:8,padding:"3px 7px",borderRadius:5,cursor:"pointer",fontFamily:"inherit",fontWeight:700,border:`1px solid ${a.status===s?sc[s]?.c:C.bd}`,background:a.status===s?sc[s]?.bg:"transparent",color:a.status===s?"rgba(255,255,255,0.85)":C.muted}}>{l}</button>))}</div></div><div style={{flex:1,minWidth:140}}><textarea placeholder="Note..." value={a.note||""} onChange={e=>sA(sec.code,item,"note",e.target.value)} style={{...iS,resize:"none",height:36,fontSize:10}}/></div></div></div>);})}</div>}</GC>);})}
</div>);}

// Compact remaining pages
function TasksPage({setPg}){const{data,loading}=useQ("tasks","is_deleted=eq.false&order=created_at.desc");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="☰" title="No tasks" action="+ New Task" onAction={()=>setPg("new_task")}/>;return(<div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Bt onClick={()=>setPg("new_task")} v="gold" sz="md">+ New Task</Bt></div>{data.map(t=>(<GC key={t.id} style={{padding:"14px 20px",marginBottom:6,borderLeft:`2px solid ${pC(t.priority)}`}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div style={{flex:1}}><div style={{display:"flex",gap:6,marginBottom:5}}><div style={{fontSize:11,fontWeight:700,color:C.text}}>{t.title}</div>{t.is_overdue&&<Chip text="OVERDUE" color={C.red} bg={C.redS}/>}</div><div style={{fontSize:9,color:C.sub}}>📍 {bm[t.branch_id]||"All"}{t.due_date&&` · 🕐 ${new Date(t.due_date).toLocaleDateString()}`}</div></div><SB status={t.status}/></div></GC>))}</div>);}
function NewTask({setPg}){const{profile:p,branches:brs}=useAuth();const{toast}=useToast();const[title,sT]=useState("");const[br,sBr]=useState("");const[pri,sP]=useState("medium");const[due,sD]=useState("");const[busy,sB]=useState(false);const submit=async()=>{if(!title.trim()){toast("Enter title","error");return;}sB(true);try{await sb.q("tasks",{method:"POST",body:{title,branch_id:br||null,created_by:p.id,priority:pri,due_date:due||null,status:"pending"}});toast("Task created!","success");setPg("tasks");}catch(e){toast(e.message,"error");}sB(false);};return(<div style={{maxWidth:600,margin:"0 auto"}}><Bt onClick={()=>setPg("tasks")} sz="sm" style={{marginBottom:14}}>← Back</Bt><GC style={{padding:"24px 28px"}}><div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:20}}>Create Task</div><div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>TITLE</label><input value={title} onChange={e=>sT(e.target.value)} placeholder="Task title..." style={iS}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BRANCH</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}><option value="">All</option>{brs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>PRIORITY</label><select value={pri} onChange={e=>sP(e.target.value)} style={iS}>{["low","medium","high","critical"].map(p=><option key={p}>{p}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>DUE</label><input type="datetime-local" value={due} onChange={e=>sD(e.target.value)} style={iS}/></div></div><Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"...":"Create →"}</Bt></GC></div>);}
function IncidentsPage({setPg}){const{data,loading}=useQ("incidents","is_deleted=eq.false&order=created_at.desc");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="⚠" title="No incidents" action="+ Report Issue" onAction={()=>setPg("new_incident")}/>;return(<div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Bt onClick={()=>setPg("new_incident")} v="gold" sz="md">+ Report Issue</Bt></div>{data.map(i=>(<GC key={i.id} style={{padding:"14px 20px",marginBottom:6}} glow={i.severity==="critical"&&i.status==="open"?C.redS:null}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{display:"flex",gap:6,marginBottom:4}}><div style={{fontSize:11,fontWeight:700,color:C.text}}>{i.title}</div><Chip text={i.severity} color={pC(i.severity)} bg={pC(i.severity)+"18"}/></div><div style={{fontSize:9,color:C.sub}}>{bm[i.branch_id]||"—"} · {i.incident_type}</div></div><SB status={i.status}/></div></GC>))}</div>);}
function NewIncident({setPg}){const{profile:p,branches:brs}=useAuth();const{toast}=useToast();const[title,sT]=useState("");const[desc,sD]=useState("");const[br,sBr]=useState("");const[type,sTy]=useState("POS Issue");const[sev,sSev]=useState("medium");const[busy,sB]=useState(false);const submit=async()=>{if(!title.trim()||!br){toast("Enter title and branch","error");return;}sB(true);try{await sb.q("incidents",{method:"POST",body:{branch_id:br,reported_by:p.id,title,description:desc||null,incident_type:type,severity:sev}});toast("Incident reported!","success");setPg("incidents");}catch(e){toast(e.message,"error");}sB(false);};return(<div style={{maxWidth:600,margin:"0 auto"}}><Bt onClick={()=>setPg("incidents")} sz="sm" style={{marginBottom:14}}>← Back</Bt><GC style={{padding:"24px 28px"}}><div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:20}}>Report Incident</div><div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>TITLE</label><input value={title} onChange={e=>sT(e.target.value)} placeholder="What happened?" style={iS}/></div><div style={{marginBottom:14}}><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>DESCRIPTION</label><textarea value={desc} onChange={e=>sD(e.target.value)} placeholder="Details..." style={{...iS,resize:"vertical",minHeight:60}}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>BRANCH</label><select value={br} onChange={e=>sBr(e.target.value)} style={iS}><option value="">Select...</option>{brs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>TYPE</label><select value={type} onChange={e=>sTy(e.target.value)} style={iS}>{["POS Issue","AC Issue","Customer Complaint","Staff Shortage","Maintenance","VM Issue"].map(t=><option key={t}>{t}</option>)}</select></div><div><label style={{fontSize:8,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>SEVERITY</label><select value={sev} onChange={e=>sSev(e.target.value)} style={iS}>{["low","medium","high","critical"].map(s=><option key={s}>{s}</option>)}</select></div></div>{sev==="critical"&&<div style={{padding:"8px 12px",borderRadius:8,background:C.redS,border:`1px solid ${C.red}30`,marginBottom:14,fontSize:9,color:C.red,fontWeight:600}}>⚠ Critical incidents auto-generate emergency tasks</div>}<Bt onClick={submit} v="gold" sz="lg" disabled={busy}>{busy?"...":"Report →"}</Bt></GC></div>);}
function SalesPage(){const{data:comm,loading}=useQ("commercial_overview","order=mtd_sales.desc");if(loading)return <Ld/>;if(!comm.length)return <Em icon="📊" title="No sales data" msg="Set monthly targets and upload daily sales."/>;const tM=comm.reduce((s,c)=>s+(+c.mtd_sales||0),0);const tT=comm.reduce((s,c)=>s+(+c.monthly_target||0),0);const aA=tT?Math.round(tM/tT*100):0;return(<div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>{[{l:"MTD Sales",v:fE(tM),c:C.gold},{l:"Target",v:fE(tT),c:C.text},{l:"Achievement",v:`${aA}%`,c:aA>=90?C.green:C.amber,ring:1,rp:aA}].map((k,i)=>(<GC key={i} style={{padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginBottom:6}}>{k.l}</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>{k.ring&&<Ring pct={k.rp} sz={34} sw={3} color={k.c}/>}</div></GC>))}</div><GC style={{padding:"18px 22px"}}><div style={{fontSize:10,fontWeight:700,color:C.sub,marginBottom:14}}>BRANCH SALES RANKING</div>{comm.map((c,i)=>(<div key={c.branch_id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:20,fontSize:10,fontWeight:700,color:i<3?C.gold:C.muted,textAlign:"right"}}>#{i+1}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,fontWeight:600,color:C.text}}>{c.branch_name}</span><div style={{display:"flex",gap:12}}><span style={{fontSize:10,color:C.gold,fontWeight:700}}>{fE(c.mtd_sales)}</span><span style={{fontSize:10,fontWeight:700,color:c.mtd_achievement_pct>=90?C.green:C.amber}}>{c.mtd_achievement_pct}%</span></div></div><Bar v={c.mtd_achievement_pct} max={100} color={c.mtd_achievement_pct>=90?C.green:C.gold} h={3}/></div></div>))}</GC></div>);}
function WarRoom(){const{data:health,loading}=useQ("branch_health","order=health_score.desc");if(loading)return <Ld t="Loading War Room..."/>;return(<div style={{background:"rgba(9,9,11,0.98)",borderRadius:14,padding:"22px",border:`1px solid ${C.bd}`,minHeight:500}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.red,boxShadow:`0 0 10px ${C.red}`}}/><div style={{fontSize:14,fontWeight:900,color:C.text}}>OPERATIONS WAR ROOM</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:5,height:5,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/><span style={{fontSize:9,color:C.green,fontWeight:700}}>LIVE</span></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>{health.map(b=>(<div key={b.branch_id} style={{padding:"12px 14px",borderRadius:10,background:b.health_status==="crisis"?C.redS:b.health_status==="risk"?C.amberS:"rgba(255,255,255,0.02)",border:`1px solid ${b.health_status==="crisis"?C.red+"30":C.bd}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:C.text}}>{b.branch_name?.split(" ").slice(0,2).join(" ")}</div><span style={{fontSize:10}}>{hI(b.health_status)}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>{[{l:"Health",v:`${b.health_score}%`,c:hC(b.health_status)},{l:"Comp",v:b.avg_compliance?`${Math.round(b.avg_compliance)}%`:"—",c:C.gold},{l:"Reports",v:b.reports_today,c:C.blue},{l:"Issues",v:b.open_incidents,c:b.open_incidents>0?C.red:C.green}].map(x=>(<div key={x.l}><div style={{fontSize:7,color:C.muted,textTransform:"uppercase"}}>{x.l}</div><div style={{fontSize:11,fontWeight:700,color:x.c}}>{x.v}</div></div>))}</div>{b.health_status==="crisis"&&<div style={{marginTop:6,padding:"3px 6px",borderRadius:4,background:C.red+"18",fontSize:8,color:C.red,fontWeight:700,textAlign:"center"}}>⚡ ACTION REQUIRED</div>}</div>))}</div></div>);}
function BranchesPage({setPg}){const{branches:brs}=useAuth();const{data:health}=useQ("branch_health","order=health_score.desc");if(!brs.length)return <Em icon="🏪" title="No stores" msg="Run SQL migration."/>;const hMap=Object.fromEntries(health.map(h=>[h.branch_id,h]));return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>{brs.map(b=>{const h=hMap[b.id];return(<GC key={b.id} onClick={()=>h&&setPg({id:"branch_twin",data:h})} style={{padding:"16px 20px"}} glow={h?.health_status==="crisis"?C.redS:null}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{b.name}</div><Chip text={b.area} color={C.gold} bg={C.goldS}/></div>{h&&<Ring pct={h.health_score} sz={34} sw={3} color={hC(h.health_status)}/>}</div>{h&&<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}><span style={{fontSize:10}}>{hI(h.health_status)}</span><span style={{fontSize:9,color:hC(h.health_status),fontWeight:600,textTransform:"capitalize"}}>{h.health_status}</span></div>}<div style={{fontSize:9,color:C.sub}}>{b.opening_hour?.slice(0,5)} — {b.closing_hour?.slice(0,5)}</div></GC>);})}</div>);}
function EmployeesPage({setPg}){const{data,loading}=useQ("profiles","is_active=eq.true&order=full_name");const{bm}=useAuth();if(loading)return <Ld/>;if(!data.length)return <Em icon="👥" title="No users"/>;return(<GC style={{overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Name","Role","Branch","Score",""].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{data.map(p=>(<tr key={p.id} style={{borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}} onClick={()=>setPg({id:"emp_detail",data:p})}><td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{p.full_name}</td><td style={{padding:"10px 12px",color:C.sub,textTransform:"capitalize"}}>{p.role?.replace("_"," ")}</td><td style={{padding:"10px 12px",color:C.sub}}>{bm[p.branch_id]||"All"}</td><td style={{padding:"10px 12px",fontWeight:700,color:p.performance_score>=80?C.green:C.amber}}>{p.performance_score||0}%</td><td style={{padding:"10px 12px"}}><Bt sz="sm">Profile →</Bt></td></tr>))}</tbody></table></GC>);}
function LearningPage(){const{data,loading}=useQ("training_materials","is_published=eq.true&order=created_at.desc");if(loading)return <Ld/>;if(!data.length)return <Em icon="📚" title="No materials"/>;return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:8}}>{data.map(t=>(<GC key={t.id} style={{padding:"16px 20px"}}><div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:5}}>{t.title}</div><div style={{display:"flex",gap:4}}><Chip text={t.category} color={C.gold} bg={C.goldS}/><Chip text={t.file_type} color={C.sub} bg="rgba(255,255,255,0.05)"/></div><div style={{fontSize:9,color:C.muted,marginTop:8}}>Views: {t.view_count}</div></GC>))}</div>);}
function NotifsPage(){const{data,loading,reload}=useQ("notifications","order=created_at.desc&limit=50");const{toast}=useToast();const mR=async id=>{try{await sb.q("notifications",{method:"PATCH",body:{is_read:true},qs:`id=eq.${id}`});reload();}catch(e){toast(e.message,"error");}};const mA=async()=>{try{await sb.q("notifications",{method:"PATCH",body:{is_read:true},qs:"is_read=eq.false"});reload();}catch(e){toast(e.message,"error");}};if(loading)return <Ld/>;if(!data.length)return <Em icon="🔔" title="All clear"/>;const nc={info:C.blue,warning:C.amber,danger:C.red,success:C.green};return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:11,color:C.sub}}>{data.filter(n=>!n.is_read).length} unread</div><Bt onClick={mA} v="ghost" sz="sm">Mark all read</Bt></div>{data.map(n=>(<GC key={n.id} onClick={()=>!n.is_read&&mR(n.id)} style={{padding:"12px 16px",marginBottom:5,borderLeft:`2px solid ${nc[n.type]||C.blue}`}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:11,fontWeight:n.is_read?500:700,color:n.is_read?C.sub:C.text}}>{n.title}</div><div style={{fontSize:9,color:C.muted}}>{new Date(n.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div><div style={{fontSize:10,color:C.sub,marginTop:2}}>{n.message}</div></GC>))}</div>);}
function ActivityPage(){const{data,loading}=useQ("activity_logs","order=created_at.desc&limit=50");if(loading)return <Ld/>;if(!data.length)return <Em icon="📜" title="No activity"/>;return(<GC style={{overflow:"hidden"}}>{data.map(l=>(<div key={l.id} style={{padding:"10px 20px",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"flex-start",gap:10}}><div style={{width:26,height:26,borderRadius:6,background:C.goldS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:C.gold,fontWeight:700,flexShrink:0}}>{new Date(l.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div><div><div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.65)"}}>{l.action}</div></div></div>))}</GC>);}
function UsersPage(){const{data,loading}=useQ("profiles","order=created_at.desc");const{bm}=useAuth();if(loading)return <Ld/>;return(<GC style={{overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Name","Role","Branch","Active"].map(h=>(<th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{data.map(u=>(<tr key={u.id} style={{borderBottom:`1px solid ${C.bd}`}}><td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{u.full_name}</td><td style={{padding:"10px 12px",color:C.sub,textTransform:"capitalize"}}>{u.role?.replace("_"," ")}</td><td style={{padding:"10px 12px",color:C.sub}}>{bm[u.branch_id]||"All"}</td><td style={{padding:"10px 12px"}}><Chip text={u.is_active?"Active":"Off"} color={u.is_active?C.green:C.red} bg={u.is_active?C.greenS:C.redS}/></td></tr>))}</tbody></table></GC>);}
function AIPage(){const{data:ins,loading}=useQ("ai_insights","is_active=eq.true&order=generated_at.desc&limit=10");const{branches:brs}=useAuth();const[busy,sB]=useState(false);const[resp,sR]=useState("");const[q,sQ]=useState("");const ask=async question=>{if(!question)return;sB(true);sR("");try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`You are RAVIN Academy AI — retail ops assistant. Branches: ${brs.map(b=>b.name).join(", ")}.`,messages:[{role:"user",content:question}]})});const d=await r.json();sR(d.content?.[0]?.text||"Unable.");}catch{sR("Connection error.");}sB(false);};return(<div><div style={{background:C.bg,borderRadius:14,padding:"20px 24px",marginBottom:16,border:`1px solid ${C.goldB}`,boxShadow:`0 0 28px ${C.goldS}`}}><div style={{fontSize:12,fontWeight:900,color:C.gold,letterSpacing:"0.1em",marginBottom:10}}>✦ RAVIN ACADEMY · AI</div><div style={{display:"flex",gap:8,marginBottom:10}}><input value={q} onChange={e=>sQ(e.target.value)} placeholder="Ask AI..." onKeyDown={e=>e.key==="Enter"&&ask(q)} style={{...iS,flex:1,border:`1px solid ${C.goldB}`}}/><Bt onClick={()=>ask(q)} v="gold" sz="lg" disabled={busy}>{busy?"...":"Ask →"}</Bt></div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{["Top risks?","Store recommendations?","Performance insights?"].map(p=>(<button key={p} onClick={()=>{sQ(p);ask(p);}} style={{fontSize:9,padding:"4px 10px",borderRadius:14,border:`1px solid ${C.goldB}`,background:C.goldS,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>))}</div></div>{resp&&!busy&&<GC style={{padding:"20px 24px",marginBottom:14}}><div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{resp}</div></GC>}{loading?<Ld/>:!ins.length?<Em icon="✦" title="No insights"/>:<GC style={{padding:"16px 20px"}}>{ins.map(i=>(<div key={i.id} style={{padding:"8px 12px",borderRadius:6,marginBottom:5,background:i.severity==="critical"?C.redS:i.severity==="warning"?C.amberS:"rgba(255,255,255,0.02)",borderLeft:`3px solid ${i.severity==="critical"?C.red:i.severity==="warning"?C.amber:C.green}`}}><div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{i.title}</div><div style={{fontSize:9,color:C.sub,marginTop:2}}>{i.content}</div></div>))}</GC>}</div>);}

// ═══════════════════════════════════════════════════════════════════════
// ROOT — 22 PAGES TOTAL
// ═══════════════════════════════════════════════════════════════════════
const PM={dash:"Dashboard",war:"War Room",reports:"Reports",new_report:"New Report",rpt_detail:"Report Detail",tasks:"Tasks",new_task:"New Task",incidents:"Incidents",new_incident:"Report Issue",sales:"Sales & Targets",vm:"VM Academy",branches:"Stores",branch_twin:"Store Detail",employees:"Employees",emp_detail:"Employee Profile",learning:"Learning",cx:"CX Readiness",ai:"AI Insights",notifs:"Notifications",activity:"Activity",users:"Users"};

function App(){const{user,profile,rdy}=useAuth();const[pg,rawSetPg]=useState("dash");const[rC,sRC]=useState(null);const[brC,sBrC]=useState(null);const[empC,sEmpC]=useState(null);
const setPg=(target)=>{if(typeof target==="object"&&target.id){if(target.id==="branch_twin"){sBrC(target.data);rawSetPg("branch_twin");}else if(target.id==="emp_detail"){sEmpC(target.data);rawSetPg("emp_detail");}else rawSetPg(target.id);}else rawSetPg(target);};
const{data:un,reload:rlN}=useQ("notifications","is_read=eq.false");
useEffect(()=>{const t=setInterval(rlN,15000);return()=>clearInterval(t);},[rlN]);
if(!rdy)return <Ld t="Connecting to RAVIN Academy..."/>;if(!user)return <Login/>;
const nC=un.length;const title=PM[pg]||"RAVIN Academy";
return(<div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Inter',system-ui,sans-serif"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
<Side pg={pg} setPg={setPg} profile={profile} nC={nC}/>
<main style={{marginLeft:216,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
<div style={{position:"sticky",top:0,zIndex:100,background:"rgba(9,9,11,0.96)",backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.bd}`,padding:"12px 26px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:14,fontWeight:800,color:C.text}}>{title}</div><div style={{display:"flex",gap:8,alignItems:"center"}}>{pg==="dash"&&<Bt onClick={()=>setPg("new_report")} v="gold" sz="sm">+ Report</Bt>}<button onClick={()=>setPg("notifs")} style={{position:"relative",background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>◎{nC>0&&<span style={{position:"absolute",top:-4,right:-4,background:C.red,color:"#fff",fontSize:8,fontWeight:700,borderRadius:10,padding:"1px 5px"}}>{nC}</span>}</button></div></div>
<div style={{flex:1,padding:"18px 24px"}}>
{pg==="dash"&&<Dash setPg={setPg}/>}
{pg==="war"&&<WarRoom/>}
{pg==="reports"&&<ReportsPage setPg={setPg} setCtx={sRC}/>}
{pg==="new_report"&&<NewReport setPg={setPg}/>}
{pg==="rpt_detail"&&<RptDetail rpt={rC} setPg={setPg}/>}
{pg==="tasks"&&<TasksPage setPg={setPg}/>}
{pg==="new_task"&&<NewTask setPg={setPg}/>}
{pg==="incidents"&&<IncidentsPage setPg={setPg}/>}
{pg==="new_incident"&&<NewIncident setPg={setPg}/>}
{pg==="sales"&&<SalesPage/>}
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
</div></main></div>);}

export default function RavinAcademy(){return <TP><AP><App/></AP></TP>;}
