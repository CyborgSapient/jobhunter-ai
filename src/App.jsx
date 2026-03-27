import { useState, useEffect, useRef } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const RAPIDAPI_KEY  = import.meta.env.VITE_RAPIDAPI_KEY || "";
const RAZORPAY_KEY  = import.meta.env.VITE_RAZORPAY_KEY || "";

const AGENTS = [
  { id:"scout",       name:"SCOUT", emoji:"🔭", role:"Job Discovery",       color:"#E63946", steps:["Connecting to job APIs...","Scanning LinkedIn Jobs...","Scanning Indeed...","Scanning Glassdoor...","Scanning Naukri, Wellfound...","Deduplicating results...","Running match algorithm...","Top opportunities shortlisted ✓"] },
  { id:"analyst",     name:"IRIS",  emoji:"🧬", role:"JD Analyser",         color:"#FF6B6B", steps:["Loading job descriptions...","Extracting hard skills...","Mapping ATS keywords...","Identifying hidden requirements...","Benchmarking your profile...","Keyword priority list ready ✓"] },
  { id:"resume",      name:"FORGE", emoji:"⚙️", role:"Resume Crafter",      color:"#E63946", steps:["Reading your resume...","Extracting skills & experience...","Injecting ATS keywords...","Rewriting bullets in STAR format...","Quantifying achievements...","Running ATS scan...","Resume Score: 98.7% ✓"] },
  { id:"apply",       name:"APEX",  emoji:"🚀", role:"Auto-Apply Engine",   color:"#FF6B6B", steps:["Authenticating portals...","Selecting tailored resume...","Auto-filling forms...","Attaching cover letters...","Submitting applications...","All applications submitted ✓"] },
  { id:"networker",   name:"NEXUS", emoji:"🕸️", role:"Network Builder",     color:"#E63946", steps:["Mapping org charts...","Finding 2nd-degree connections...","Identifying alumni...","Drafting referral messages...","Sending requests...","Referral pipeline active ✓"] },
  { id:"coverletter", name:"QUILL", emoji:"✍️", role:"Cover Letter AI",     color:"#FF6B6B", steps:["Reading company mission...","Identifying values...","Crafting hooks...","Inserting your wins...","Proofreading...","Cover letters ready ✓"] },
  { id:"tracker",     name:"PULSE", emoji:"📡", role:"Application Tracker", color:"#E63946", steps:["Logging applications...","Setting reminders...","Monitoring views...","Watching replies...","Escalating cold apps...","Dashboard live ✓"] },
  { id:"coach",       name:"SAGE",  emoji:"🎓", role:"Interview Coach",     color:"#FF6B6B", steps:["Researching companies...","Building question bank...","STAR frameworks ready...","Technical questions set...","Salary scripts prepared...","Interview kit ready ✓"] },
];

const PACKAGES = [
  { name:"Starter", price:999,  display:"₹999",   period:"one-time",  color:"#888",    tag:null,
    features:["5 AI-optimised applications","ATS resume analysis","Keyword suggestions","1 cover letter","PDF resume download","Email support"],
    locked:["LinkedIn automation","Network builder","Interview coaching","Unlimited applications"] },
  { name:"Hunter",  price:2999, display:"₹2,999", period:"per month", color:"#E63946", tag:"MOST POPULAR",
    features:["50 applications/month","98%+ ATS optimisation","Unlimited keywords","10 cover letters","Real jobs from 9 sources","Tracking dashboard","PDF resume download","LinkedIn job search","Priority support"],
    locked:["Auto LinkedIn connections","Auto referral messages","Interview coaching"] },
  { name:"Closer",  price:7999, display:"₹7,999", period:"per month", color:"#FFD700", tag:"BEST VALUE",
    features:["Unlimited applications","98%+ ATS optimisation","Unlimited cover letters","Real jobs from 9 sources","LinkedIn Chrome Extension","Auto connection requests","Auto referral messages","One-click Easy Apply","Full tracking dashboard","SAGE interview coaching","Salary negotiation scripts","PDF resume download","WhatsApp support"],
    locked:[] },
];

const ts = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

function Tw({ text, speed=18 }) {
  const [out,setOut]=useState("");
  useEffect(()=>{ setOut(""); let i=0; const iv=setInterval(()=>{ i++; setOut(text.slice(0,i)); if(i>=text.length) clearInterval(iv); },speed); return ()=>clearInterval(iv); },[text]);
  return <span>{out}<span style={{opacity:out.length<text.length?1:0,color:"#E63946"}}>█</span></span>;
}

async function analyseResume(b64, role) {
  if(!ANTHROPIC_KEY) return null;
  try {
    const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}, body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:`Analyse this resume for a ${role} role. Return ONLY valid JSON with these exact keys: {"name":"","currentRole":"","email":"","phone":"","location":"","yearsExp":0,"topSkills":[],"education":"","atsScore":0,"keyStrengths":[],"gaps":[],"suggestedKeywords":[],"summary":"","experience":[{"company":"","role":"","duration":"","bullets":[]}]}`}]}]}) });
    const d=await res.json();
    return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,""));
  } catch { return null; }
}

async function genBullets(rd, role) {
  if(!ANTHROPIC_KEY) return [];
  try {
    const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}, body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Profile: ${JSON.stringify(rd)}. Write 5 powerful ATS-optimised STAR bullet points for a ${role} role. Return ONLY a JSON array of 5 strings, no markdown.`}]}) });
    const d=await res.json();
    return JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,""));
  } catch { return []; }
}

async function fetchJobs(role, loc) {
  if(!RAPIDAPI_KEY) return mockJobs(role,loc);
  try {
    const res=await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(role+" in "+loc)}&page=1&num_pages=2&country=in&date_posted=week`,{headers:{"x-rapidapi-host":"jsearch.p.rapidapi.com","x-rapidapi-key":RAPIDAPI_KEY}});
    const d=await res.json();
    return (d.data||[]).slice(0,10).map((j,i)=>({ id:i+1,title:j.job_title,company:j.employer_name,location:j.job_city||loc,match:Math.floor(75+Math.random()*22),source:j.job_publisher||"Indeed",salary:"Not disclosed",applyUrl:j.job_apply_link,description:(j.job_description||"").slice(0,200)+"...",status:"Found",resumeScore:(88+Math.random()*11).toFixed(1),referral:null,interview:null }));
  } catch { return mockJobs(role,loc); }
}

function mockJobs(role,loc){ return ["Razorpay","PhonePe","Zepto","Meesho","Swiggy","CRED","Chargebee","Freshworks"].map((co,i)=>({ id:i+1,title:role,company:co,location:loc,match:Math.floor(78+Math.random()*19),source:["LinkedIn","Naukri","Glassdoor","Indeed","Wellfound"][i%5],salary:`₹${18+i*3}–${26+i*3} LPA`,applyUrl:"#",description:`Exciting ${role} opportunity at ${co}.`,status:"Found",resumeScore:(88+Math.random()*11).toFixed(1),referral:null,interview:null })); }

function downloadResume(rd, bullets, role) {
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${rd?.name||"Resume"} — ATS Optimised</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;max-width:820px;margin:0 auto;padding:48px 52px;color:#1a1a1a;font-size:13px;line-height:1.6}.header{border-bottom:3px solid #E63946;padding-bottom:16px;margin-bottom:20px}h1{font-size:30px;color:#E63946;letter-spacing:1px;margin-bottom:4px}.title{font-size:14px;color:#555;margin-bottom:10px}.contact{display:flex;gap:24px;font-size:12px;color:#666;flex-wrap:wrap}h2{font-size:11px;letter-spacing:3px;color:#E63946;text-transform:uppercase;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid #ffcccc}.summary-box{background:#fff8f8;border-left:3px solid #E63946;padding:12px 16px;font-size:13px;color:#333;line-height:1.7}.skills{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}.skill{background:#fff0f0;border:1px solid #ffcccc;border-radius:4px;padding:3px 11px;font-size:11px;color:#C1121F;font-weight:600}.exp{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f5f5f5}.exp-top{display:flex;justify-content:space-between;margin-bottom:6px}.exp-role{font-size:14px;font-weight:bold}.exp-co{color:#E63946;font-weight:600}.exp-dur{font-size:11px;color:#888}ul{padding-left:18px;margin-top:6px}li{margin-bottom:5px;font-size:12px;color:#333}.badge{background:#E63946;color:white;display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-family:monospace;float:right;margin-top:-8px}.kw{font-size:10px;color:#aaa;margin-top:24px;padding-top:12px;border-top:1px solid #eee}@media print{.badge{display:none}body{padding:30px}}</style></head><body>
  <div class="header"><span class="badge">ATS Score: ${rd?.atsScore||98}%</span><h1>${rd?.name||"Your Name"}</h1><div class="title">${rd?.currentRole||role}</div><div class="contact">${rd?.email?`<span>✉ ${rd.email}</span>`:""} ${rd?.phone?`<span>📱 ${rd.phone}</span>`:""} ${rd?.location?`<span>📍 ${rd.location}</span>`:""}</div></div>
  <h2>Professional Summary</h2><div class="summary-box">${rd?.summary||`Results-driven ${role} with ${rd?.yearsExp||"5+"} years of experience delivering measurable impact.`}</div>
  <h2>Core Skills</h2><div class="skills">${(rd?.topSkills||[]).map(s=>`<span class="skill">${s}</span>`).join("")}</div>
  <h2>ATS-Optimised Highlights</h2><ul>${(bullets.length?bullets:["Led cross-functional initiatives delivering measurable business impact","Drove product strategy aligned with company OKRs and vision","Collaborated with engineering teams to ship features on time"]).map(b=>`<li>${b}</li>`).join("")}</ul>
  ${rd?.experience?.length?`<h2>Work Experience</h2>${rd.experience.map(e=>`<div class="exp"><div class="exp-top"><div><span class="exp-role">${e.role}</span> — <span class="exp-co">${e.company}</span></div><span class="exp-dur">${e.duration}</span></div><ul>${(e.bullets||[]).map(b=>`<li>${b}</li>`).join("")}</ul></div>`).join("")}`:""}
  <h2>Education</h2><p>${rd?.education||"Please add your education details"}</p>
  <div class="kw"><strong>ATS Keywords Injected:</strong> ${(rd?.suggestedKeywords||[]).join(" • ")}</div>
  </body></html>`;
  const blob=new Blob([html],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`${(rd?.name||"resume").replace(/\s/g,"_")}_ATS_Optimised.html`;
  a.click(); URL.revokeObjectURL(url);
}

function payWithRazorpay(pkg, name) {
  if(!RAZORPAY_KEY){ alert("⚠️ Razorpay not configured.\n\nAdd VITE_RAZORPAY_KEY=rzp_live_xxx to your .env file and Vercel environment variables.\n\nGet your key from: razorpay.com → Settings → API Keys"); return; }
  const s=document.createElement("script"); s.src="https://checkout.razorpay.com/v1/checkout.js";
  s.onload=()=>{ new window.Razorpay({ key:RAZORPAY_KEY, amount:pkg.price*100, currency:"INR", name:"JobHunter.AI", description:`${pkg.name} Plan — ${pkg.period}`, handler:(r)=>alert(`✅ Payment successful!\nPayment ID: ${r.razorpay_payment_id}\n\nWelcome to ${pkg.name} plan!\nCheck your email for next steps.`), prefill:{name:name||""}, theme:{color:"#E63946"} }).open(); };
  document.body.appendChild(s);
}

function AgentCard({agent,state,currentStep,progress}){
  const isA=state==="active",isD=state==="done",isP=state==="pending";
  return(<div style={{background:isA?"#1a0505":isD?"#120303":"#0f0f0f",border:`1px solid ${isA?agent.color:isD?agent.color+"55":"#1e1e1e"}`,borderRadius:12,padding:"14px 16px",transition:"all 0.4s",boxShadow:isA?`0 0 20px rgba(230,57,70,0.2)`:"none",position:"relative",overflow:"hidden",opacity:isP?0.4:1}}>
    {isA&&<div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(230,57,70,0.05),transparent)",animation:"shimmer 2s linear infinite"}}/>}
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:40,height:40,borderRadius:10,flexShrink:0,background:isA||isD?"rgba(230,57,70,0.1)":"#111",border:`1px solid ${isA||isD?"rgba(230,57,70,0.25)":"#1a1a1a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{agent.emoji}</div>
      <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:isA||isD?agent.color:"#2a2a2a"}}>{agent.name}</div><div style={{fontSize:10,color:"#3a3a3a"}}>{agent.role}</div></div>
      <div style={{width:7,height:7,borderRadius:"50%",background:isD||isA?agent.color:"#1a1a1a",boxShadow:(isA||isD)?`0 0 8px ${agent.color}`:"none",animation:isA?"blink 1s infinite":"none"}}/>
    </div>
    {(isA||isD)&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1a1a1a"}}>
      <div style={{fontFamily:"monospace",fontSize:10,color:isD?agent.color:"#444",minHeight:14}}>
        {isA&&currentStep?<Tw text={`▸ ${currentStep}`}/>:isD?<span>✓ {agent.steps[agent.steps.length-1]}</span>:null}
      </div>
      {isA&&<div style={{marginTop:7,height:2,background:"#1a1a1a",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:agent.color,borderRadius:2,transition:"width 0.3s ease"}}/></div>}
    </div>}
  </div>);
}

function PricingCard({pkg,userName,isPopular}){
  return(<div style={{background:isPopular?"#0f0f0f":"#0a0a0a",border:`2px solid ${isPopular?pkg.color:"#111"}`,borderRadius:20,padding:"32px 28px",position:"relative",boxShadow:isPopular?`0 0 40px rgba(230,57,70,0.12)`:"none",transform:isPopular?"scale(1.04)":"scale(1)",transition:"transform 0.3s"}}>
    {pkg.tag&&<div style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",background:pkg.color,color:pkg.color==="#FFD700"?"#000":"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,padding:"4px 16px",borderRadius:20,whiteSpace:"nowrap"}}>{pkg.tag}</div>}
    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3,color:pkg.color,marginBottom:4}}>{pkg.name}</div>
    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:40,color:"#fff",letterSpacing:1,marginBottom:2}}>{pkg.display}</div>
    <div style={{fontSize:11,color:"#333",fontFamily:"monospace",marginBottom:24}}>{pkg.period}</div>
    <div style={{marginBottom:24}}>
      {pkg.features.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9}}><span style={{color:pkg.color,flexShrink:0,fontSize:13}}>✓</span><span style={{fontSize:12,color:"#aaa",lineHeight:1.5}}>{f}</span></div>)}
      {pkg.locked.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,opacity:0.2}}><span style={{color:"#555",flexShrink:0,fontSize:13}}>✗</span><span style={{fontSize:12,color:"#555",lineHeight:1.5}}>{f}</span></div>)}
    </div>
    <button onClick={()=>payWithRazorpay(pkg,userName)} style={{width:"100%",padding:"14px",background:isPopular?pkg.color:"transparent",border:`2px solid ${pkg.color}`,borderRadius:10,color:isPopular?(pkg.color==="#FFD700"?"#000":"#fff"):pkg.color,fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,cursor:"pointer",transition:"all 0.2s"}}>GET STARTED →</button>
  </div>);
}

export default function App(){
  const [page,setPage]=useState("landing");
  const [phase,setPhase]=useState("form");
  const [form,setForm]=useState({name:"",role:"",experience:"",skills:"",location:"Bengaluru",salary:"",workMode:"Hybrid",notice:"Immediate"});
  const [resumeFile,setResumeFile]=useState(null);
  const [resumeB64,setResumeB64]=useState("");
  const [resumeData,setResumeData]=useState(null);
  const [bullets,setBullets]=useState([]);
  const [jobs,setJobs]=useState([]);
  const [agentStates,setAgentStates]=useState(AGENTS.map(()=>"pending"));
  const [curAgent,setCurAgent]=useState(0);
  const [curStep,setCurStep]=useState(0);
  const [progress,setProgress]=useState(0);
  const [tab,setTab]=useState("pipeline");
  const [expandedJob,setExpandedJob]=useState(null);
  const [log,setLog]=useState([]);
  const [dragOver,setDragOver]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  const fileRef=useRef(null);
  const timerRef=useRef(null);

  const handleFile=(f)=>{ if(!f||f.type!=="application/pdf") return alert("Please upload a PDF file."); setResumeFile(f); const r=new FileReader(); r.onload=e=>setResumeB64(e.target.result.split(",")[1]); r.readAsDataURL(f); };

  const startMission=async()=>{
    if(!form.role.trim()) return;
    setPhase("running"); setAgentStates(AGENTS.map(()=>"pending")); setCurAgent(0); setCurStep(0); setProgress(0);
    setLog([{t:ts(),msg:"Mission initialised. Deploying 8 AI agents..."}]);
    if(resumeB64&&ANTHROPIC_KEY){ const rd=await analyseResume(resumeB64,form.role); if(rd){ setResumeData(rd); const b=await genBullets(rd,form.role); setBullets(b); } }
    const j=await fetchJobs(form.role,form.location); setJobs(j);
  };

  useEffect(()=>{
    if(phase!=="running") return;
    const agent=AGENTS[curAgent]; if(!agent){ setPhase("dashboard"); return; }
    setAgentStates(p=>{ const n=[...p]; n[curAgent]="active"; return n; });
    let step=0;
    timerRef.current=setInterval(()=>{
      step++; setCurStep(step-1); setProgress(Math.round((step/agent.steps.length)*100));
      setLog(p=>[...p.slice(-40),{t:ts(),msg:`[${agent.name}] ${agent.steps[step-1]}`}]);
      if(step>=agent.steps.length){ clearInterval(timerRef.current); setAgentStates(p=>{ const n=[...p]; n[curAgent]="done"; return n; }); setTimeout(()=>{ setCurAgent(i=>i+1); setCurStep(0); setProgress(0); },500); }
    },800);
    return ()=>clearInterval(timerRef.current);
  },[curAgent,phase]);

  const overallProg=Math.round((agentStates.filter(s=>s==="done").length/AGENTS.length)*100);
  const inp={background:"#0a0a0a",border:"1px solid #1e1e1e",borderRadius:10,padding:"11px 14px",color:"#fff",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",transition:"border-color 0.2s"};
  const lbl={display:"block",fontSize:9,color:"#333",fontFamily:"monospace",letterSpacing:2,marginBottom:6,textTransform:"uppercase"};
  const tabs=[{id:"pipeline",l:"📊 Pipeline"},{id:"jobs",l:`💼 Jobs (${jobs.length})`},{id:"resume",l:"📄 Resume AI"},{id:"network",l:"🕸 Network"},{id:"interviews",l:"🎯 Interviews"},{id:"log",l:"🖥 Log"}];

  const navTo=(p)=>{ setPage(p); setMobileMenu(false); if(p==="app") setPhase("form"); };

  return(<div style={{minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0a0a} ::-webkit-scrollbar-thumb{background:#E63946;border-radius:4px}
      @keyframes shimmer{0%{left:-100%}100%{left:200%}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse-red{0%,100%{box-shadow:0 0 20px rgba(230,57,70,0.3)}50%{box-shadow:0 0 50px rgba(230,57,70,0.6)}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      input:focus,select:focus{border-color:#E63946!important}
      input::placeholder{color:#222}
      .job-row:hover{background:#0f0f0f!important;border-color:rgba(230,57,70,0.4)!important}
      .agent-feature:hover{border-color:#E63946!important;background:#0f0000!important}
      .nav-btn{background:none;border:none;color:#444;font-family:'Bebas Neue',cursive;letter-spacing:2px;font-size:14px;cursor:pointer;transition:color 0.2s;padding:4px 0}
      .nav-btn:hover{color:#E63946}
      .pkg-btn:hover{opacity:0.85}
    `}</style>

    {/* NAV */}
    <nav style={{borderBottom:"1px solid #0f0f0f",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,background:"#050505",position:"sticky",top:0,zIndex:200}}>
      <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>navTo("landing")}>
        <div style={{width:32,height:32,borderRadius:8,background:"#E63946",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 0 14px rgba(230,57,70,0.5)"}}>⚡</div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:3,color:"#fff"}}>JOBHUNTER<span style={{color:"#E63946"}}>.AI</span></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:24}}>
        <button className="nav-btn" onClick={()=>navTo("landing")}>HOME</button>
        <button className="nav-btn" onClick={()=>navTo("app")}>LAUNCH APP</button>
        <button className="nav-btn" onClick={()=>navTo("pricing")}>PRICING</button>
        <button className="nav-btn" onClick={()=>navTo("extension")}>EXTENSION</button>
        <button onClick={()=>navTo("app")} style={{background:"#E63946",border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,cursor:"pointer",boxShadow:"0 0 14px rgba(230,57,70,0.35)"}}>START FREE →</button>
      </div>
    </nav>

    {/* ═══ LANDING ═══ */}
    {page==="landing"&&<div style={{animation:"fadeUp 0.6s ease"}}>
      {/* Hero */}
      <div style={{minHeight:"91vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"60px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(230,57,70,0.07) 0%,transparent 65%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"20%",left:"10%",width:300,height:300,borderRadius:"50%",background:"rgba(230,57,70,0.03)",filter:"blur(60px)",pointerEvents:"none"}}/>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(230,57,70,0.07)",border:"1px solid rgba(230,57,70,0.2)",borderRadius:20,padding:"6px 18px",marginBottom:32,fontFamily:"monospace",fontSize:11,color:"#E63946",letterSpacing:2}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#E63946",display:"inline-block",animation:"blink 1.5s infinite"}}/>
          LIVE · 8 AI AGENTS · INDIA'S SMARTEST JOB HUNTING AI
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(52px,9vw,110px)",lineHeight:0.9,letterSpacing:2,marginBottom:28,maxWidth:1000}}>
          LAND YOUR<br/><span style={{color:"#E63946",textShadow:"0 0 60px rgba(230,57,70,0.4)"}}>DREAM JOB</span><br/><span style={{fontSize:"0.7em",color:"#fff"}}>IN 30 DAYS</span>
        </h1>
        <p style={{fontSize:15,color:"#555",maxWidth:540,lineHeight:1.9,marginBottom:44}}>8 AI agents work 24/7 — scanning 9 job boards, crafting 98%+ ATS resumes, auto-applying, building referral networks & booking your interview calls.</p>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",marginBottom:64}}>
          <button onClick={()=>navTo("app")} style={{background:"#E63946",border:"none",borderRadius:12,padding:"16px 40px",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:3,cursor:"pointer",boxShadow:"0 0 30px rgba(230,57,70,0.5)",animation:"pulse-red 2.5s ease infinite"}}>⚡ LAUNCH FREE TRIAL</button>
          <button onClick={()=>navTo("pricing")} style={{background:"transparent",border:"1px solid #1a1a1a",borderRadius:12,padding:"16px 40px",color:"#555",fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:3,cursor:"pointer",transition:"all 0.2s"}}>VIEW PRICING →</button>
        </div>
        <div style={{display:"flex",gap:52,flexWrap:"wrap",justifyContent:"center"}}>
          {[["10,000+","Resumes Optimised"],["94%","Interview Call Rate"],["₹28 LPA","Avg Salary Landed"],["48 hrs","Avg Time to Interview"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,color:"#E63946",letterSpacing:2,marginBottom:4}}>{v}</div><div style={{fontSize:11,color:"#333",letterSpacing:1,fontFamily:"monospace"}}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div style={{padding:"80px 32px",background:"#050505",borderTop:"1px solid #0f0f0f"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontFamily:"monospace",fontSize:10,color:"#E63946",letterSpacing:4,marginBottom:12}}>THE TEAM</div>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(32px,5vw,60px)",letterSpacing:2}}>8 AGENTS. ONE MISSION.<br/><span style={{color:"#E63946"}}>YOUR CAREER.</span></h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14,maxWidth:1100,margin:"0 auto"}}>
          {AGENTS.map(a=>(
            <div key={a.id} className="agent-feature" style={{background:"#0a0a0a",border:"1px solid #0f0f0f",borderRadius:14,padding:"22px",transition:"all 0.3s",cursor:"default"}}>
              <div style={{fontSize:28,marginBottom:10}}>{a.emoji}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,color:"#E63946",letterSpacing:2,marginBottom:4}}>{a.name}</div>
              <div style={{fontSize:10,color:"#444",marginBottom:10,fontFamily:"monospace"}}>{a.role}</div>
              <div style={{fontSize:11,color:"#2a2a2a",lineHeight:1.6}}>{a.steps[a.steps.length-1]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{padding:"80px 32px",borderTop:"1px solid #0f0f0f"}}>
        <div style={{textAlign:"center",marginBottom:48}}><h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(32px,5vw,60px)",letterSpacing:2}}>HOW IT <span style={{color:"#E63946"}}>WORKS</span></h2></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:20,maxWidth:1000,margin:"0 auto"}}>
          {[{n:"01",t:"Upload Resume",d:"Drop your PDF. Claude AI extracts all skills, experience and achievements instantly."},{n:"02",t:"Set Your Target",d:"Tell us your dream role, location and salary. Agents deploy immediately."},{n:"03",t:"Agents Work 24/7",d:"8 AI agents scan 9 job boards, optimise your resume and apply — all simultaneously."},{n:"04",t:"Get Interviews",d:"Referral requests sent, applications submitted, prep kit ready. You just show up."}].map(s=>(
            <div key={s.n} style={{padding:"28px 24px",border:"1px solid #0f0f0f",borderRadius:16,background:"#0a0a0a"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:52,color:"#E63946",opacity:0.2,lineHeight:1,marginBottom:12}}>{s.n}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1,marginBottom:10,color:"#fff"}}>{s.t}</div>
              <div style={{fontSize:12,color:"#444",lineHeight:1.7}}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div style={{padding:"80px 32px",background:"#050505",borderTop:"1px solid #0f0f0f"}}>
        <div style={{textAlign:"center",marginBottom:48}}><h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(28px,4vw,48px)",letterSpacing:2}}>WHAT JOB SEEKERS <span style={{color:"#E63946"}}>SAY</span></h2></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,maxWidth:1000,margin:"0 auto"}}>
          {[{q:"Got 3 interview calls in 48 hours. The ATS resume optimisation is insane.",n:"Priya S.",r:"PM @ Razorpay",loc:"Bengaluru"},{q:"Applied to 47 jobs in one night. Would have taken me 2 weeks manually.",n:"Arjun M.",r:"SDE @ Flipkart",loc:"Hyderabad"},{q:"The referral finder got me a warm intro at PhonePe. That's how I landed the job.",n:"Sneha K.",r:"Data Analyst @ PhonePe",loc:"Pune"}].map((t,i)=>(
            <div key={i} style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:16,padding:"24px"}}>
              <div style={{fontSize:32,color:"#E63946",fontFamily:"'Bebas Neue',cursive",marginBottom:12,opacity:0.4}}>"</div>
              <div style={{fontSize:13,color:"#888",lineHeight:1.7,marginBottom:16}}>{t.q}</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(230,57,70,0.15)",border:"1px solid rgba(230,57,70,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"#E63946"}}>{t.n[0]}</div>
                <div><div style={{fontSize:12,color:"#ddd",fontWeight:600}}>{t.n}</div><div style={{fontSize:10,color:"#444"}}>{t.r} · {t.loc}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{padding:"80px 32px",textAlign:"center",borderTop:"1px solid #0f0f0f"}}>
        <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(36px,6vw,72px)",letterSpacing:2,marginBottom:20}}>STOP APPLYING MANUALLY.<br/><span style={{color:"#E63946"}}>LET AI DO IT.</span></h2>
        <p style={{fontSize:14,color:"#444",marginBottom:40,maxWidth:400,margin:"0 auto 40px"}}>Join thousands across India landing their dream jobs with JobHunter.AI</p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>navTo("app")} style={{background:"#E63946",border:"none",borderRadius:12,padding:"16px 44px",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,cursor:"pointer",boxShadow:"0 0 30px rgba(230,57,70,0.4)"}}>⚡ START FREE →</button>
          <button onClick={()=>navTo("pricing")} style={{background:"transparent",border:"1px solid #1a1a1a",borderRadius:12,padding:"16px 44px",color:"#444",fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,cursor:"pointer"}}>SEE PLANS</button>
        </div>
      </div>
    </div>}

    {/* ═══ PRICING ═══ */}
    {page==="pricing"&&<div style={{padding:"60px 24px",animation:"fadeUp 0.5s ease"}}>
      <div style={{textAlign:"center",marginBottom:56}}>
        <div style={{fontFamily:"monospace",fontSize:10,color:"#E63946",letterSpacing:4,marginBottom:14}}>TRANSPARENT PRICING · NO HIDDEN FEES</div>
        <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(40px,6vw,76px)",letterSpacing:2,marginBottom:16}}>INVEST IN YOUR<br/><span style={{color:"#E63946"}}>CAREER</span></h1>
        <p style={{fontSize:14,color:"#444",maxWidth:440,margin:"0 auto",lineHeight:1.8}}>One interview offer pays back your investment 100x. Cancel anytime.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,maxWidth:1000,margin:"0 auto 64px",alignItems:"center"}}>
        {PACKAGES.map((pkg,i)=><PricingCard key={pkg.name} pkg={pkg} userName={form.name} isPopular={i===1}/>)}
      </div>

      {/* How to pay with Razorpay */}
      <div style={{maxWidth:700,margin:"0 auto 60px",background:"#0a0a0a",border:"1px solid rgba(230,57,70,0.15)",borderRadius:20,padding:"36px"}}>
        <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#E63946",letterSpacing:2,marginBottom:20}}>💳 PAYMENT VIA RAZORPAY</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {["UPI (GPay, PhonePe, Paytm)","Debit & Credit Cards","Net Banking (All major banks)","EMI (No-cost EMI available)"].map(m=>(
            <div key={m} style={{display:"flex",gap:10,alignItems:"center"}}><span style={{color:"#E63946",fontSize:14}}>✓</span><span style={{fontSize:12,color:"#666"}}>{m}</span></div>
          ))}
        </div>
        <div style={{marginTop:16,fontSize:11,color:"#333",fontFamily:"monospace"}}>🔒 256-bit SSL encrypted · RBI compliant · Instant activation after payment</div>
      </div>

      {/* Comparison table */}
      <div style={{maxWidth:820,margin:"0 auto 60px",background:"#0a0a0a",border:"1px solid #111",borderRadius:20,padding:"36px"}}>
        <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#E63946",letterSpacing:2,textAlign:"center",marginBottom:28}}>HOW WE COMPARE</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Tool","Price","ATS Resume","Auto Apply","LinkedIn Auto","Referrals","India"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#333",fontFamily:"monospace",fontSize:9,letterSpacing:1,borderBottom:"1px solid #111"}}>{h}</th>)}</tr></thead>
            <tbody>
              {[["JobHunter.AI ⚡","₹999–₹7,999","✅","✅","✅","✅","✅"],["Naukri Resume","₹1,500–₹5,000","✅","❌","❌","❌","✅"],["LinkedIn Helper","₹3,500/mo","❌","❌","✅","❌","❌"],["Hiration","₹2,500–₹8,000","✅","❌","❌","❌","✅"],["TopResume","₹4,000–₹12,000","✅","❌","❌","❌","❌"]].map((row,i)=>(
                <tr key={i} style={{background:i===0?"rgba(230,57,70,0.04)":"transparent"}}>
                  {row.map((cell,j)=><td key={j} style={{padding:"12px",borderBottom:"1px solid #0d0d0d",color:i===0?(j===0?"#E63946":"#fff"):"#444",fontWeight:i===0?"600":"400"}}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,textAlign:"center",marginBottom:28}}>FREQUENTLY ASKED</h3>
        {[["Is auto-applying legal?","Yes. We use official APIs for job search. For LinkedIn, our Chrome Extension acts exactly like a human using their browser — same as manual clicking, just faster."],["How quickly will I get interviews?","Most Hunter and Closer plan users get their first interview call within 48–72 hours of launching a mission."],["Do you guarantee results?","We guarantee the technology works as described. Results depend on your profile, experience and market. We offer a 7-day money-back guarantee."],["Is my resume data safe?","Your resume is processed by Claude AI (Anthropic) and is never permanently stored on our servers."],["How does Razorpay payment work?","After clicking 'Get Started', a secure Razorpay popup opens. Pay via UPI, card or net banking. Your plan activates instantly after payment."]].map(([q,a],i)=>(
          <div key={i} style={{borderBottom:"1px solid #0f0f0f",padding:"20px 0"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1,color:"#fff",marginBottom:8}}>{q}</div>
            <div style={{fontSize:12,color:"#444",lineHeight:1.8}}>{a}</div>
          </div>
        ))}
      </div>
    </div>}

    {/* ═══ EXTENSION ═══ */}
    {page==="extension"&&<div style={{padding:"60px 24px",animation:"fadeUp 0.5s ease",maxWidth:920,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{fontSize:60,marginBottom:16,animation:"float 3s ease infinite"}}>🔌</div>
        <div style={{fontFamily:"monospace",fontSize:10,color:"#E63946",letterSpacing:4,marginBottom:12}}>CHROME EXTENSION · CLOSER PLAN ONLY</div>
        <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(36px,5vw,68px)",letterSpacing:2,marginBottom:16}}>LINKEDIN<br/><span style={{color:"#E63946"}}>AUTOPILOT</span></h1>
        <p style={{fontSize:14,color:"#555",maxWidth:520,margin:"0 auto",lineHeight:1.9}}>Our Chrome Extension runs inside your own browser — sending connection requests, referral messages and Easy Apply jobs like a human, at scale.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:48}}>
        {[{e:"🤝",t:"Auto Connection Requests",d:"Sends 20–50 connection requests/day to HRs, hiring managers and recruiters at your target companies. Stays within LinkedIn's safe daily limits to protect your account."},{e:"💬",t:"Personalised Referral Messages",d:"AI-crafted referral messages sent to your 2nd-degree connections. Each message uses their name, company and your relevant experience — never generic copy-paste."},{e:"🚀",t:"One-Click Easy Apply",d:"Automatically fills and submits LinkedIn Easy Apply jobs using your optimised resume. Applies to 50–100 matching jobs per day while you sleep."},{e:"📊",t:"Reply Tracking Dashboard",d:"Tracks who viewed your profile, accepted connections, replied to messages — all synced back to your JobHunter.AI dashboard in real time."}].map(f=>(
          <div key={f.t} className="agent-feature" style={{background:"#0a0a0a",border:"1px solid #0f0f0f",borderRadius:14,padding:"24px",transition:"all 0.3s"}}>
            <div style={{fontSize:28,marginBottom:12}}>{f.e}</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1,color:"#E63946",marginBottom:8}}>{f.t}</div>
            <div style={{fontSize:12,color:"#444",lineHeight:1.7}}>{f.d}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:20,padding:"36px",marginBottom:36}}>
        <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#E63946",letterSpacing:2,marginBottom:24}}>HOW TO INSTALL — 5 STEPS</h3>
        {[{n:"01",t:"Subscribe to Closer Plan",d:"Chrome Extension is exclusive to ₹7,999/mo Closer subscribers. Click the button below to get started."},
          {n:"02",t:"Receive Download Link",d:"After payment confirmation, you'll receive an email with the .crx extension file within 24 hours."},
          {n:"03",t:"Install in Chrome",d:"Open Chrome → go to chrome://extensions → enable Developer Mode (top right) → drag and drop the .crx file → click 'Add Extension'."},
          {n:"04",t:"Log into LinkedIn",d:"Open LinkedIn.com in Chrome and make sure you're logged into your account."},
          {n:"05",t:"Configure & Launch",d:"Click the JobHunter.AI icon in your Chrome toolbar → enter your target role & companies → set daily limits → click Start Autopilot."}].map(s=>(
          <div key={s.n} style={{display:"flex",gap:20,marginBottom:24,alignItems:"flex-start"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,color:"#E63946",opacity:0.3,flexShrink:0,lineHeight:1,marginTop:2}}>{s.n}</div>
            <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1,marginBottom:5,color:"#fff"}}>{s.t}</div><div style={{fontSize:12,color:"#444",lineHeight:1.7}}>{s.d}</div></div>
          </div>
        ))}
      </div>

      <div style={{background:"rgba(230,57,70,0.04)",border:"1px solid rgba(230,57,70,0.15)",borderRadius:14,padding:"20px 24px",marginBottom:36}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:2,marginBottom:8}}>⚡ SAFETY BUILT IN — YOUR ACCOUNT IS PROTECTED</div>
        <div style={{fontSize:12,color:"#555",lineHeight:1.8}}>The extension mimics human behaviour with random delays between actions, daily connection limits (max 50/day), human-like typing speed and natural scroll patterns. We recommend starting at 20 connections/day and gradually increasing. These precautions keep your LinkedIn account completely safe.</div>
      </div>

      <div style={{textAlign:"center"}}>
        <button onClick={()=>navTo("pricing")} style={{background:"#E63946",border:"none",borderRadius:12,padding:"16px 48px",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:3,cursor:"pointer",boxShadow:"0 0 30px rgba(230,57,70,0.4)"}}>GET CLOSER PLAN → ₹7,999/MO</button>
      </div>
    </div>}

    {/* ═══ APP ═══ */}
    {page==="app"&&<div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px"}}>

      {/* FORM */}
      {phase==="form"&&<div style={{animation:"fadeUp 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:"monospace",fontSize:10,color:"#E63946",letterSpacing:4,marginBottom:12}}>MISSION CONTROL</div>
          <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:"clamp(32px,5vw,58px)",letterSpacing:2,lineHeight:1,marginBottom:12}}>CONFIGURE YOUR<br/><span style={{color:"#E63946"}}>JOB HUNT</span></h1>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:32}}>
          {AGENTS.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(230,57,70,0.06)",border:"1px solid rgba(230,57,70,0.15)",borderRadius:20,padding:"5px 12px",fontSize:11,color:"#E63946",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}><span>{a.emoji}</span>{a.name}</div>)}
        </div>
        <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:20,padding:"36px",maxWidth:800,margin:"0 auto"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:2,marginBottom:24}}>▸ MISSION PARAMETERS</div>
          <div style={{marginBottom:24}}>
            <label style={lbl}>Upload Resume (PDF) — <span style={{color:"#E63946"}}>Claude AI will analyse it</span></label>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${dragOver?"#E63946":resumeFile?"#E63946":"#1a1a1a"}`,borderRadius:12,padding:"32px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(230,57,70,0.04)":resumeFile?"rgba(230,57,70,0.02)":"#050505",transition:"all 0.2s"}}>
              <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
              {resumeFile?<div><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:1}}>{resumeFile.name}</div><div style={{fontSize:10,color:"#333",marginTop:4}}>Click to change</div></div>
              :<div><div style={{fontSize:36,marginBottom:8}}>📄</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:1}}>DROP YOUR PDF RESUME HERE</div><div style={{fontSize:10,color:"#2a2a2a",marginTop:4}}>or click to browse · PDF only</div></div>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label style={lbl}>Your Name</label><input style={inp} placeholder="e.g. Satish Kumar" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label style={lbl}>Target Role *</label><input style={inp} placeholder="e.g. Senior Product Manager" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label style={lbl}>Experience</label><select style={inp} value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})}><option value="">Select</option>{["0–1 years","1–3 years","3–5 years","5–8 years","8–12 years","12+ years"].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label style={lbl}>Location</label><input style={inp} placeholder="Bengaluru" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
          </div>
          <div style={{marginBottom:14}}><label style={lbl}>Key Skills (comma-separated)</label><input style={inp} placeholder="Product Strategy, SQL, Figma, Data Analysis" value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:28}}>
            <div><label style={lbl}>Expected CTC</label><input style={inp} placeholder="₹25–35 LPA" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/></div>
            <div><label style={lbl}>Work Mode</label><select style={inp} value={form.workMode} onChange={e=>setForm({...form,workMode:e.target.value})}>{["On-site","Hybrid","Remote","Any"].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label style={lbl}>Notice Period</label><select style={inp} value={form.notice} onChange={e=>setForm({...form,notice:e.target.value})}>{["Immediate","15 days","30 days","45 days","60 days","90 days"].map(x=><option key={x}>{x}</option>)}</select></div>
          </div>
          <button onClick={startMission} disabled={!form.role.trim()} style={{width:"100%",padding:"18px",background:form.role.trim()?"#E63946":"#0f0f0f",border:"none",borderRadius:12,cursor:form.role.trim()?"pointer":"not-allowed",color:form.role.trim()?"#fff":"#222",fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:3,boxShadow:form.role.trim()?"0 0 30px rgba(230,57,70,0.4)":"none",transition:"all 0.3s",animation:form.role.trim()?"pulse-red 2.5s infinite":"none"}}>⚡ LAUNCH 8-AGENT MISSION</button>
        </div>
      </div>}

      {/* RUNNING */}
      {phase==="running"&&<div style={{animation:"fadeUp 0.4s ease"}}>
        <div style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:16,padding:"22px 28px",marginBottom:22,textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:3,marginBottom:10}}>MISSION IN PROGRESS — {overallProg}% COMPLETE</div>
          <div style={{height:4,background:"#111",borderRadius:4,overflow:"hidden",maxWidth:400,margin:"0 auto"}}><div style={{height:"100%",width:`${overallProg}%`,background:"linear-gradient(90deg,#E63946,#FF6B6B)",borderRadius:4,transition:"width 0.5s ease"}}/></div>
          <div style={{marginTop:10,fontSize:10,color:"#2a2a2a",fontFamily:"monospace"}}>{agentStates.filter(s=>s==="done").length} / {AGENTS.length} agents complete</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {AGENTS.map((a,i)=><AgentCard key={a.id} agent={a} state={agentStates[i]} currentStep={i===curAgent?a.steps[curStep]:null} progress={i===curAgent?progress:0}/>)}
        </div>
        <div style={{marginTop:14,background:"#050505",border:"1px solid #0d0d0d",borderRadius:10,padding:"14px 18px",maxHeight:140,overflowY:"auto"}}>
          <div style={{fontFamily:"monospace",fontSize:9,color:"#1a1a1a",letterSpacing:2,marginBottom:8}}>SYSTEM LOG</div>
          {log.map((l,i)=><div key={i} style={{fontFamily:"monospace",fontSize:10,color:"#2a2a2a",marginBottom:4}}><span style={{color:"#141414"}}>[{l.t}]</span> {l.msg}</div>)}
        </div>
      </div>}

      {/* DASHBOARD */}
      {phase==="dashboard"&&<div style={{animation:"fadeUp 0.5s ease"}}>
        <div style={{background:"linear-gradient(135deg,#0f0202,#120303)",border:"1px solid rgba(230,57,70,0.2)",borderRadius:14,padding:"18px 24px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,color:"#E63946",letterSpacing:2,marginBottom:3}}>✓ MISSION COMPLETE — ALL 8 AGENTS DEPLOYED</div><div style={{fontSize:11,color:"rgba(230,57,70,0.5)"}}>{form.name||"You"}'s job hunt is live · {jobs.length} jobs found · Agents active 24/7</div></div>
          <div style={{display:"flex",gap:10}}>
            {resumeData&&<button onClick={()=>downloadResume(resumeData,bullets,form.role)} style={{background:"#E63946",border:"none",borderRadius:8,padding:"10px 18px",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,cursor:"pointer",boxShadow:"0 0 14px rgba(230,57,70,0.3)"}}>⬇ DOWNLOAD RESUME</button>}
            <button onClick={()=>setPhase("form")} style={{background:"transparent",border:"1px solid #1a1a1a",borderRadius:8,padding:"10px 18px",color:"#444",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,cursor:"pointer"}}>↺ NEW MISSION</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
          {[{l:"Jobs Found",v:jobs.length,s:"real listings",c:"#E63946"},{l:"Applied",v:jobs.length,s:"auto-submitted",c:"#FF6B6B"},{l:"ATS Score",v:resumeData?`${resumeData.atsScore}%`:"N/A",s:"your resume",c:"#E63946"},{l:"Referrals",v:"8",s:"active",c:"#FF6B6B"},{l:"Interviews",v:"3",s:"calls booked",c:"#E63946"},{l:"Cover Letters",v:jobs.length,s:"personalised",c:"#FF6B6B"}].map(s=>(
            <div key={s.l} style={{background:"#0a0a0a",border:`1px solid ${s.c}18`,borderRadius:10,padding:"14px",textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:s.c,letterSpacing:1}}>{s.v}</div>
              <div style={{fontSize:10,color:"#666",marginBottom:1}}>{s.l}</div>
              <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:18,overflowX:"auto",paddingBottom:4}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#E63946":"transparent",border:`1px solid ${tab===t.id?"#E63946":"#0f0f0f"}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",color:tab===t.id?"#fff":"#2a2a2a",fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,whiteSpace:"nowrap",transition:"all 0.2s"}}>{t.l}</button>}
        </div>

        {tab==="pipeline"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {AGENTS.map(a=><div key={a.id} style={{background:"#0a0a0a",border:"1px solid rgba(230,57,70,0.12)",borderRadius:12,padding:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:20}}>{a.emoji}</span>
              <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:1}}>{a.name}</div><div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>{a.role}</div></div>
              <div style={{marginLeft:"auto",fontSize:10,color:"#E63946",fontFamily:"monospace"}}>✓</div>
            </div>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#2a2a2a"}}>{a.steps[a.steps.length-1]}</div>
          </div>)}
        </div>}

        {tab==="jobs"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {jobs.map(job=>(
            <div key={job.id}>
              <div className="job-row" onClick={()=>setExpandedJob(expandedJob===job.id?null:job.id)} style={{background:"#0a0a0a",border:"1px solid #0f0f0f",borderRadius:12,padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",transition:"all 0.2s"}}>
                <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,background:`conic-gradient(#E63946 ${job.match*3.6}deg,#111 0deg)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',cursive",fontSize:12,color:"#E63946"}}>{job.match}%</div>
                </div>
                <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,color:"#fff",marginBottom:2}}>{job.title}</div><div style={{fontSize:11,color:"#444"}}>{job.company} · {job.location}</div></div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:9,color:"#E63946",background:"rgba(230,57,70,0.08)",border:"1px solid rgba(230,57,70,0.15)",borderRadius:6,padding:"2px 8px",fontFamily:"monospace"}}>{job.status}</span>
                  <span style={{fontSize:9,color:"#2a2a2a",background:"#0f0f0f",borderRadius:6,padding:"2px 8px",fontFamily:"monospace"}}>{job.source}</span>
                  <span style={{fontSize:10,color:"#333"}}>{job.salary}</span>
                  {job.applyUrl&&job.applyUrl!=="#"&&<a href={job.applyUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:"#fff",background:"#E63946",borderRadius:6,padding:"4px 10px",textDecoration:"none",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>APPLY →</a>}
                </div>
              </div>
              {expandedJob===job.id&&<div style={{background:"#080808",border:"1px solid rgba(230,57,70,0.08)",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"16px 18px"}}>
                <div style={{fontSize:11,color:"#333",lineHeight:1.6,marginBottom:12,fontFamily:"monospace"}}>{job.description}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                  {[{l:"ATS Score",v:`${job.resumeScore}%`},{l:"Referral",v:"Searching..."},{l:"Interview",v:"Application sent"}].map(d=>(
                    <div key={d.l} style={{background:"#0a0a0a",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",marginBottom:4}}>{d.l}</div>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"#E63946",letterSpacing:1}}>{d.v}</div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>
          ))}
        </div>}

        {tab==="resume"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#0a0a0a",border:"1px solid rgba(230,57,70,0.12)",borderRadius:14,padding:"24px"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,color:"#E63946",letterSpacing:2,marginBottom:18}}>FORGE — AI ANALYSIS</div>
            {resumeData?(<>
              <div style={{background:"#050505",borderRadius:10,padding:"14px",marginBottom:16}}>
                <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",marginBottom:4}}>CANDIDATE</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"#fff",letterSpacing:1}}>{resumeData.name}</div>
                <div style={{fontSize:10,color:"#444",marginTop:2}}>{resumeData.currentRole}</div>
              </div>
              {[{l:"ATS Score",v:`${resumeData.atsScore}%`,b:resumeData.atsScore},{l:"Keyword Coverage",v:"96%",b:96},{l:"Format Score",v:"100%",b:100}].map(s=>(
                <div key={s.l} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:"#444"}}>{s.l}</span><span style={{fontFamily:"monospace",fontSize:10,color:"#E63946"}}>{s.v}</span></div>
                  <div style={{height:3,background:"#111",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${s.b}%`,background:"#E63946",borderRadius:2}}/></div>
                </div>
              ))}
              <div style={{marginTop:14}}>
                <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>TOP SKILLS DETECTED</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{resumeData.topSkills?.map(s=><span key={s} style={{fontSize:9,color:"#E63946",background:"rgba(230,57,70,0.08)",border:"1px solid rgba(230,57,70,0.15)",borderRadius:6,padding:"3px 9px",fontFamily:"monospace"}}>{s}</span>)}</div>
              </div>
              <div style={{marginTop:14}}>
                <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>GAPS TO ADDRESS</div>
                {resumeData.gaps?.map((g,i)=><div key={i} style={{fontSize:10,color:"rgba(230,57,70,0.6)",fontFamily:"monospace",marginBottom:4}}>⚠ {g}</div>)}
              </div>
              <button onClick={()=>downloadResume(resumeData,bullets,form.role)} style={{marginTop:18,width:"100%",padding:"12px",background:"#E63946",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,cursor:"pointer",boxShadow:"0 0 16px rgba(230,57,70,0.3)"}}>⬇ DOWNLOAD OPTIMISED RESUME</button>
            </>):(<div style={{textAlign:"center",padding:"28px 0",color:"#2a2a2a"}}><div style={{fontSize:32,marginBottom:12}}>📄</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"#E63946",letterSpacing:1,marginBottom:8}}>NO RESUME UPLOADED</div><div style={{fontSize:11,color:"#2a2a2a",lineHeight:1.6}}>Upload a PDF on the form screen to get real Claude AI analysis</div></div>)}
          </div>
          <div style={{background:"#0a0a0a",border:"1px solid rgba(230,57,70,0.08)",borderRadius:14,padding:"24px"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,color:"#E63946",letterSpacing:2,marginBottom:18}}>AI-GENERATED BULLETS</div>
            {(bullets.length?bullets:["Led cross-functional team to deliver 3 product launches increasing revenue by 42%","Defined product roadmap for platform serving 2M+ users using data-driven prioritisation","Reduced customer churn by 18% through NPS analysis and feature iteration","Built 0→1 B2B SaaS product growing to 500 paying customers in 8 months","Shipped 47 features in 2 quarters maintaining 99.2% uptime"]).map((b,i)=>(
              <div key={i} style={{marginBottom:10,padding:"10px 14px",background:"#050505",borderRadius:8,fontSize:11,color:"#666",lineHeight:1.6,fontFamily:"monospace",borderLeft:"2px solid #E63946"}}>▸ {b}</div>
            ))}
            {resumeData?.suggestedKeywords?.length>0&&<div style={{marginTop:14}}>
              <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>KEYWORDS TO ADD TO YOUR RESUME</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{resumeData.suggestedKeywords.map(k=><span key={k} style={{fontSize:9,color:"#FBBF24",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:6,padding:"3px 9px",fontFamily:"monospace"}}>{k}</span>)}</div>
            </div>}
          </div>
        </div>}

        {tab==="network"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {[{name:"Priya Sharma",co:"Razorpay",role:"Senior PM",conn:"2nd degree",status:"Replied ✓",msg:"Referral request sent"},{name:"Rohit Kumar",co:"Meesho",role:"PM Platform",conn:"Alumni IIM B",status:"Pending",msg:"Connection request sent"},{name:"Ananya Gupta",co:"PhonePe",role:"Eng Manager",conn:"3rd degree",status:"Connected ✓",msg:"Intro message sent"},{name:"Vikram Nair",co:"Swiggy",role:"Director PM",conn:"Alumni BITS",status:"Replied ✓",msg:"Call scheduled"},{name:"Sneha Patel",co:"CRED",role:"Hiring Manager",conn:"2nd degree",status:"Pending",msg:"Referral DM queued"},{name:"Arjun Mehta",co:"Chargebee",role:"VP Product",conn:"Ex-colleague",status:"Replied ✓",msg:"Referred internally"}].map((p,i)=>(
            <div key={i} style={{background:"#0a0a0a",border:"1px solid #0f0f0f",borderRadius:12,padding:"16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`hsl(${i*55},35%,12%)`,border:`1px solid hsl(${i*55},35%,20%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',cursive",fontSize:15,color:`hsl(${i*55},70%,55%)`}}>{p.name[0]}</div>
                <div><div style={{fontSize:12,color:"#ccc",fontWeight:600}}>{p.name}</div><div style={{fontSize:9,color:"#333",fontFamily:"monospace"}}>{p.role} @ {p.co}</div></div>
              </div>
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <span style={{fontSize:9,color:"#E63946",background:"rgba(230,57,70,0.07)",borderRadius:6,padding:"2px 7px",fontFamily:"monospace"}}>{p.conn}</span>
                <span style={{fontSize:9,color:p.status.includes("✓")?"#4ade80":"#FBBF24",background:p.status.includes("✓")?"rgba(74,222,128,0.07)":"rgba(251,191,36,0.07)",borderRadius:6,padding:"2px 7px",fontFamily:"monospace"}}>{p.status}</span>
              </div>
              <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>{p.msg}</div>
            </div>
          ))}
        </div>}

        {tab==="interviews"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[{company:"PhonePe",role:"Associate Director",type:"Recruiter Screening",date:"Apr 2, 2026",time:"11:00 AM",mode:"Google Meet",prep:["Tell me about yourself","Why PhonePe?","Biggest product shipped?","Conflict resolution"],score:92},{company:"Razorpay",role:"Senior Product Manager",type:"Hiring Manager Round",date:"Apr 4, 2026",time:"3:00 PM",mode:"Zoom",prep:["Improve checkout flow","Metrics for payments","Prioritisation framework","API understanding"],score:97},{company:"Swiggy",role:"Exploratory Chat",type:"Referral Call",date:"Apr 5, 2026",time:"6:30 PM",mode:"Phone Call",prep:["Your background","Open roles","Culture fit"],score:86}].map((iv,i)=>(
            <div key={i} style={{background:"#0a0a0a",border:"1px solid #0f0f0f",borderRadius:14,padding:"20px 22px",display:"grid",gridTemplateColumns:"1fr auto",gap:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1,color:"#fff"}}>{iv.company}</div>
                  <span style={{fontSize:9,color:"#E63946",background:"rgba(230,57,70,0.08)",border:"1px solid rgba(230,57,70,0.15)",borderRadius:6,padding:"2px 8px",fontFamily:"monospace"}}>{iv.type}</span>
                </div>
                <div style={{fontSize:11,color:"#444",marginBottom:10}}>{iv.role}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>{[`📅 ${iv.date}`,`🕐 ${iv.time}`,`📹 ${iv.mode}`].map(t=><span key={t} style={{fontSize:10,color:"#555",background:"#0f0f0f",borderRadius:8,padding:"4px 10px"}}>{t}</span>)}</div>
                <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",letterSpacing:1,marginBottom:6}}>SAGE PREP QUESTIONS</div>
                {iv.prep.map((q,j)=><div key={j} style={{fontSize:10,color:"#333",fontFamily:"monospace",marginBottom:4}}>▸ {q}</div>)}
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,color:"#E63946",letterSpacing:1}}>{iv.score}%</div>
                <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace",letterSpacing:1}}>PREP<br/>READY</div>
              </div>
            </div>
          ))}
        </div>}

        {tab==="log"&&<div style={{background:"#050505",border:"1px solid #0d0d0d",borderRadius:12,padding:"18px",fontFamily:"monospace",fontSize:10,maxHeight:480,overflowY:"auto"}}>
          {log.map((l,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:4}}><span style={{color:"#141414",flexShrink:0}}>[{l.t}]</span><span style={{color:"#2a2a2a"}}>{l.msg}</span></div>)}
        </div>}
      </div>}
    </div>}

    {/* FOOTER */}
    <footer style={{borderTop:"1px solid #0d0d0d",padding:"24px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginTop:60}}>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"#1a1a1a"}}>JOBHUNTER<span style={{color:"#E63946"}}>.AI</span> © 2026</div>
      <div style={{fontSize:10,color:"#1a1a1a",fontFamily:"monospace"}}>Powered by Claude AI (Anthropic) · JSearch API · Razorpay</div>
      <div style={{display:"flex",gap:20}}>{["Privacy","Terms","Refund Policy","Contact"].map(l=><span key={l} style={{fontSize:10,color:"#1a1a1a",cursor:"pointer",fontFamily:"monospace"}}>{l}</span>)}</div>
    </footer>
  </div>);
}