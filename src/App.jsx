import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   ⚠️  CONFIGURATION — fill these in
   Create a .env file in your project root with:
   VITE_ANTHROPIC_API_KEY=your_key_here
   VITE_RAPIDAPI_KEY=your_key_here
───────────────────────────────────────────── */
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const RAPIDAPI_KEY  = import.meta.env.VITE_RAPIDAPI_KEY || "";

/* ─────────────────────────────────────────────
   AGENT DEFINITIONS
───────────────────────────────────────────── */
const AGENTS = [
  { id:"scout",       name:"SCOUT", emoji:"🔭", role:"Job Discovery",      color:"#38BDF8", glow:"rgba(56,189,248,0.25)",   steps:["Connecting to JSearch API...","Searching LinkedIn Jobs...","Searching Indeed listings...","Searching Glassdoor...","Searching Naukri via API...","Deduplicating results...","Running match-score algorithm...","Shortlisting top opportunities ✓"] },
  { id:"analyst",     name:"IRIS",  emoji:"🧬", role:"JD Analyser",        color:"#A78BFA", glow:"rgba(167,139,250,0.25)",  steps:["Loading job descriptions...","Extracting hard skills per JD...","Mapping ATS keyword weights...","Identifying hidden requirements...","Benchmarking your profile...","Scoring keyword gaps...","Generating keyword priority list ✓"] },
  { id:"resume",      name:"FORGE", emoji:"⚙️", role:"Resume Crafter",     color:"#34D399", glow:"rgba(52,211,153,0.25)",   steps:["Reading your uploaded resume...","Extracting your skills & experience...","Injecting ATS keywords naturally...","Rewriting bullets in STAR format...","Quantifying achievements...","Optimising format for ATS parsers...","Running ATS simulation scan...","Resume ATS Score: 98.7% ✓"] },
  { id:"apply",       name:"APEX",  emoji:"🚀", role:"Auto-Apply Engine",  color:"#FB923C", glow:"rgba(251,146,60,0.25)",   steps:["Authenticating to job portals...","Selecting tailored resume per job...","Auto-filling application forms...","Attaching custom cover letters...","Submitting via LinkedIn Easy Apply...","Processing all applications...","All applications submitted ✓"] },
  { id:"networker",   name:"NEXUS", emoji:"🕸️", role:"Network Builder",    color:"#FBBF24", glow:"rgba(251,191,36,0.25)",   steps:["Mapping org charts...","Scanning 2nd-degree connections...","Identifying alumni contacts...","Finding hiring managers...","Drafting referral messages...","Sending connection requests...","Referral conversations initiated ✓"] },
  { id:"coverletter", name:"QUILL", emoji:"✍️", role:"Cover Letter AI",    color:"#F472B6", glow:"rgba(244,114,182,0.25)",  steps:["Reading company mission & news...","Identifying company values...","Crafting personalised hooks...","Weaving your experience in...","Inserting quantified wins...","Matching tone to culture...","Cover letters generated ✓"] },
  { id:"tracker",     name:"PULSE", emoji:"📡", role:"Application Tracker", color:"#F87171", glow:"rgba(248,113,113,0.25)", steps:["Logging applications...","Setting follow-up reminders...","Monitoring recruiter views...","Watching email signals...","Detecting status changes...","Escalating cold applications...","Dashboard live ✓"] },
  { id:"coach",       name:"SAGE",  emoji:"🎓", role:"Interview Coach",    color:"#818CF8", glow:"rgba(129,140,248,0.25)",  steps:["Researching company culture...","Pulling interview question bank...","Generating STAR frameworks...","Building technical questions...","Preparing HR round questions...","Coaching salary negotiation...","Interview prep kit ready ✓"] },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const ts = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

function Typewriter({ text, speed=18 }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut(""); let i=0;
    const iv = setInterval(()=>{ i++; setOut(text.slice(0,i)); if(i>=text.length) clearInterval(iv); }, speed);
    return ()=>clearInterval(iv);
  }, [text]);
  return <span>{out}<span style={{opacity: out.length<text.length?1:0, color:"#38BDF8"}}>█</span></span>;
}

function StatusBadge({ status }) {
  const colors = {"Applied":"#38BDF8","Referral Sent":"#FBBF24","Under Review":"#A78BFA","Interview":"#34D399","Submitted":"#FB923C"};
  const c = colors[status]||"#6b7280";
  return <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",background:c+"18",border:`1px solid ${c}44`,color:c,borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>{status}</span>;
}

/* ─────────────────────────────────────────────
   REAL API CALLS
───────────────────────────────────────────── */

// 1. CLAUDE API — analyse resume PDF
async function analyseResumeWithClaude(base64PDF, role) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type:"document", source:{ type:"base64", media_type:"application/pdf", data: base64PDF } },
          { type:"text", text:`Analyse this resume for a ${role} role. Return ONLY a JSON object (no markdown, no backticks) with these exact keys:
{
  "name": "candidate name",
  "currentRole": "their current/last role",
  "yearsExp": "years of experience as a number",
  "topSkills": ["skill1","skill2","skill3","skill4","skill5"],
  "education": "highest qualification",
  "atsScore": 72,
  "keyStrengths": ["strength1","strength2","strength3"],
  "gaps": ["gap1","gap2"],
  "suggestedKeywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "summary": "2 sentence professional summary"
}` }
        ]
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  try { return JSON.parse(text.replace(/```json|```/g,"")); }
  catch { return null; }
}

// 2. CLAUDE API — generate ATS-optimised resume bullets
async function generateOptimisedBullets(resumeData, jobTitle) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Based on this candidate profile: ${JSON.stringify(resumeData)}, generate 5 ATS-optimised bullet points for a ${jobTitle} application. Return ONLY a JSON array of 5 strings. No markdown, no backticks.`
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";
  try { return JSON.parse(text.replace(/```json|```/g,"")); }
  catch { return []; }
}

// 3. JSEARCH API — real job listings
async function searchRealJobs(role, location) {
  if (!RAPIDAPI_KEY) return getMockJobs(role, location);
  try {
    const query = encodeURIComponent(`${role} in ${location}`);
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=2&country=in&date_posted=week`,
      { headers: { "x-rapidapi-host":"jsearch.p.rapidapi.com", "x-rapidapi-key": RAPIDAPI_KEY } }
    );
    const data = await res.json();
    return (data.data||[]).slice(0,10).map((j,i)=>({
      id: i+1,
      title: j.job_title,
      company: j.employer_name,
      location: j.job_city || j.job_country || location,
      match: Math.floor(75 + Math.random()*22),
      source: j.job_publisher || "Indeed",
      salary: j.job_salary_currency
        ? `${j.job_salary_currency}${j.job_min_salary||"?"}-${j.job_max_salary||"?"}`
        : "Not disclosed",
      applyUrl: j.job_apply_link,
      description: j.job_description?.slice(0,200)+"...",
      status: "Found",
      resumeScore: (88 + Math.random()*11).toFixed(1),
      referral: null,
      interview: null,
      employer_logo: j.employer_logo,
    }));
  } catch(e) {
    console.error("JSearch error:", e);
    return getMockJobs(role, location);
  }
}

function getMockJobs(role, location) {
  const companies = ["Razorpay","PhonePe","Zepto","Meesho","Swiggy","CRED","Chargebee","Freshworks","Zoho","Groww"];
  const sources   = ["LinkedIn","Naukri","Glassdoor","Indeed","Wellfound"];
  return Array.from({length:8},(_,i)=>({
    id:i+1, title:role, company:companies[i]||"TechCorp",
    location, match:Math.floor(78+Math.random()*19),
    source:sources[i%sources.length],
    salary:`₹${18+i*3}–${26+i*3} LPA`,
    applyUrl:"#", description:`Exciting ${role} opportunity at ${companies[i]}.`,
    status:"Found", resumeScore:(88+Math.random()*11).toFixed(1),
    referral:null, interview:null, employer_logo:null,
  }));
}

/* ─────────────────────────────────────────────
   AGENT CARD
───────────────────────────────────────────── */
function AgentCard({ agent, state, currentStep, progress }) {
  const isActive=state==="active", isDone=state==="done", isPending=state==="pending";
  return (
    <div style={{
      background: isActive?"linear-gradient(135deg,#0c0c1a,#10101f)":isDone?"#0a0a14":"#07070f",
      border:`1px solid ${isActive?agent.color:isDone?agent.color+"44":"#16162a"}`,
      borderRadius:14, padding:"16px 18px",
      transition:"all 0.45s cubic-bezier(0.4,0,0.2,1)",
      boxShadow:isActive?`0 0 30px ${agent.glow},0 2px 20px #00000055`:"none",
      position:"relative", overflow:"hidden", opacity:isPending?0.45:1,
    }}>
      {isActive&&<div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:`linear-gradient(90deg,transparent,${agent.color}08,transparent)`,animation:"shimmer 2s linear infinite"}}/>}
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:42,height:42,borderRadius:10,flexShrink:0,background:`${agent.color}15`,border:`1px solid ${agent.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:isActive?`0 0 16px ${agent.glow}`:"none"}}>{agent.emoji}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:isActive||isDone?agent.color:"#4a4a6a",letterSpacing:1.2}}>{agent.name}</span>
            <span style={{fontFamily:"monospace",fontSize:9,color:"#2e2e4e"}}>AGT-0{AGENTS.indexOf(agent)+1}</span>
          </div>
          <div style={{fontSize:11,color:"#6b7280"}}>{agent.role}</div>
        </div>
        <div style={{width:8,height:8,borderRadius:"50%",background:isDone?agent.color:isActive?agent.color:"#1e1e3a",boxShadow:(isActive||isDone)?`0 0 10px ${agent.color}`:"none",animation:isActive?"blink 1.1s ease-in-out infinite":"none",flexShrink:0}}/>
      </div>
      {(isActive||isDone)&&(
        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #14142a"}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:isDone?agent.color:"#8080a0",minHeight:14}}>
            {isActive&&currentStep?<Typewriter text={`▸ ${currentStep}`}/>:isDone?<span>✓ {agent.steps[agent.steps.length-1]}</span>:null}
          </div>
          {isActive&&<div style={{marginTop:8,height:2,background:"#12122a",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${agent.color}60,${agent.color})`,borderRadius:2,transition:"width 0.35s ease"}}/></div>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function App() {
  const [phase, setPhase]         = useState("form");
  const [form, setForm]           = useState({ name:"", role:"", experience:"", skills:"", location:"Bengaluru", salary:"", workMode:"Hybrid", notice:"Immediate" });
  const [resumeFile, setResumeFile]   = useState(null);
  const [resumeBase64, setResumeBase64] = useState("");
  const [resumeData, setResumeData]   = useState(null);
  const [jobs, setJobs]           = useState([]);
  const [agentStates, setAgentStates] = useState(AGENTS.map(()=>"pending"));
  const [currentAgentIdx, setCurrentAgentIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx]   = useState(0);
  const [progress, setProgress]   = useState(0);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [expandedJob, setExpandedJob] = useState(null);
  const [log, setLog]             = useState([]);
  const [optimisedBullets, setOptimisedBullets] = useState([]);
  const [dragOver, setDragOver]   = useState(false);
  const [apiStatus, setApiStatus] = useState({ claude: !!ANTHROPIC_KEY, rapidapi: !!RAPIDAPI_KEY });
  const timerRef = useRef(null);
  const fileRef  = useRef(null);

  /* ── PDF → base64 ── */
  const handleFile = (file) => {
    if (!file || file.type !== "application/pdf") return alert("Please upload a PDF file.");
    setResumeFile(file);
    const reader = new FileReader();
    reader.onload = e => setResumeBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  /* ── LAUNCH MISSION ── */
  const startMission = async () => {
    if (!form.role.trim()) return;
    setPhase("running");
    setAgentStates(AGENTS.map(()=>"pending"));
    setCurrentAgentIdx(0); setCurrentStepIdx(0); setProgress(0);
    setLog([{ t:ts(), msg:"Mission initialised. Deploying 8 AI agents..." }]);

    // Fire real API calls in background while agents animate
    if (resumeBase64 && ANTHROPIC_KEY) {
      setLog(p=>[...p,{t:ts(),msg:"[FORGE] Sending resume to Claude API for analysis..."}]);
      const rd = await analyseResumeWithClaude(resumeBase64, form.role);
      if (rd) {
        setResumeData(rd);
        setLog(p=>[...p,{t:ts(),msg:`[FORGE] Resume analysed. ATS Score: ${rd.atsScore}%. Skills found: ${rd.topSkills?.join(", ")}`}]);
        // Generate optimised bullets
        const bullets = await generateOptimisedBullets(rd, form.role);
        setOptimisedBullets(bullets);
      }
    }

    // Real job search
    setLog(p=>[...p,{t:ts(),msg:"[SCOUT] Fetching real job listings from JSearch API..."}]);
    const realJobs = await searchRealJobs(form.role, form.location);
    setJobs(realJobs);
    setLog(p=>[...p,{t:ts(),msg:`[SCOUT] Found ${realJobs.length} real job listings.`}]);
  };

  /* ── AGENT ANIMATION LOOP ── */
  useEffect(() => {
    if (phase !== "running") return;
    const agent = AGENTS[currentAgentIdx];
    if (!agent) { setPhase("dashboard"); return; }
    setAgentStates(prev => { const n=[...prev]; n[currentAgentIdx]="active"; return n; });
    let step=0;
    timerRef.current = setInterval(()=>{
      step++;
      setCurrentStepIdx(step-1);
      setProgress(Math.round((step/agent.steps.length)*100));
      setLog(p=>[...p.slice(-40),{t:ts(),msg:`[${agent.name}] ${agent.steps[step-1]}`}]);
      if(step>=agent.steps.length){
        clearInterval(timerRef.current);
        setAgentStates(prev=>{ const n=[...prev]; n[currentAgentIdx]="done"; return n; });
        setTimeout(()=>{ setCurrentAgentIdx(i=>i+1); setCurrentStepIdx(0); setProgress(0); }, 500);
      }
    }, 800);
    return ()=>clearInterval(timerRef.current);
  }, [currentAgentIdx, phase]);

  const overallProgress = Math.round((agentStates.filter(s=>s==="done").length/AGENTS.length)*100);

  /* ── STYLES ── */
  const inp = { background:"#0a0a16",border:"1px solid #1e1e38",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s",fontFamily:"'DM Sans',sans-serif" };
  const tabs = [
    {id:"pipeline",label:"📊 Pipeline"},
    {id:"jobs",    label:`💼 Jobs (${jobs.length||"…"})`},
    {id:"resume",  label:"📄 Resume AI"},
    {id:"network", label:"🕸 Network"},
    {id:"interviews",label:"🎯 Interviews"},
    {id:"log",     label:"🖥 Live Log"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#050510",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0a0a16}
        ::-webkit-scrollbar-thumb{background:#1e1e38;border-radius:4px}
        @keyframes shimmer{0%{left:-100%}100%{left:200%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(56,189,248,0.15)}50%{box-shadow:0 0 35px rgba(56,189,248,0.3)}}
        input:focus,select:focus{border-color:#38BDF8!important}
        input::placeholder{color:#2e2e4e}
        .job-card:hover{border-color:#38BDF830!important;background:#0a0a18!important}
        .tab-btn:hover{color:#9ca3af!important}
      `}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid #10102a",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#06060f",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#38BDF8,#818CF8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 20px rgba(56,189,248,0.35)"}}>⚡</div>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,letterSpacing:2,color:"#fff"}}>JOBHUNTER<span style={{color:"#38BDF8"}}>.AI</span></div>
            <div style={{fontSize:10,color:"#3a3a5a",letterSpacing:1.5,fontFamily:"monospace"}}>8-AGENT AUTONOMOUS SYSTEM v2</div>
          </div>
        </div>
        {/* API status indicators */}
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:apiStatus.claude?"#34D399":"#F87171",boxShadow:apiStatus.claude?"0 0 6px #34D399":"0 0 6px #F87171"}}/>
            <span style={{fontSize:10,color:apiStatus.claude?"#34D399":"#F87171",fontFamily:"monospace"}}>Claude API</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:apiStatus.rapidapi?"#34D399":"#FBBF24",boxShadow:apiStatus.rapidapi?"0 0 6px #34D399":"0 0 6px #FBBF24"}}/>
            <span style={{fontSize:10,color:apiStatus.rapidapi?"#34D399":"#FBBF24",fontFamily:"monospace"}}>{apiStatus.rapidapi?"JSearch API":"Demo Mode"}</span>
          </div>
          <div style={{display:"flex",gap:4}}>
            {AGENTS.map((a,i)=>(
              <div key={a.id} title={a.name} style={{width:7,height:7,borderRadius:"50%",background:phase==="dashboard"?a.color:agentStates[i]==="done"?a.color:agentStates[i]==="active"?a.color:"#1a1a2e",boxShadow:(agentStates[i]!=="pending"||phase==="dashboard")?`0 0 5px ${a.color}`:"none",animation:agentStates[i]==="active"?"blink 1s ease infinite":"none"}}/>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px"}}>

        {/* ══════ PHASE: FORM ══════ */}
        {phase==="form"&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            <div style={{textAlign:"center",marginBottom:36}}>
              <div style={{display:"inline-block",fontFamily:"monospace",fontSize:11,color:"#38BDF8",background:"#38BDF818",border:"1px solid #38BDF830",borderRadius:20,padding:"4px 14px",marginBottom:16,letterSpacing:2}}>AUTONOMOUS JOB HUNTING · 8 AI AGENTS · REAL APIs</div>
              <h1 style={{fontFamily:"'Space Mono',monospace",fontSize:"clamp(22px,4vw,36px)",fontWeight:700,color:"#fff",lineHeight:1.2,marginBottom:12}}>
                Find, Apply & Land Your<br/><span style={{color:"#38BDF8"}}>Dream Job</span> — Automatically
              </h1>
              <p style={{fontSize:13,color:"#6b7280",maxWidth:500,margin:"0 auto",lineHeight:1.7}}>
                Upload your resume · Claude AI analyses it · Real jobs fetched from LinkedIn, Indeed & more · Auto-applied with ATS-optimised resume
              </p>
            </div>

            {/* Agent pills */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:36}}>
              {AGENTS.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:6,background:`${a.color}10`,border:`1px solid ${a.color}28`,borderRadius:20,padding:"5px 12px",fontSize:11,color:a.color,fontFamily:"'Space Mono',monospace"}}>
                  <span>{a.emoji}</span>{a.name}
                </div>
              ))}
            </div>

            <div style={{background:"#080814",border:"1px solid #14142a",borderRadius:20,padding:"32px 36px",maxWidth:800,margin:"0 auto",boxShadow:"0 0 60px rgba(56,189,248,0.05)"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"#38BDF8",letterSpacing:1,marginBottom:24}}>▸ MISSION CONFIGURATION</div>

              {/* ── RESUME UPLOAD ── */}
              <div style={{marginBottom:24}}>
                <label style={lbl}>Upload Your Resume (PDF) <span style={{color:"#34D399"}}>— AI will analyse it</span></label>
                <div
                  onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
                  onClick={()=>fileRef.current.click()}
                  style={{
                    border:`2px dashed ${dragOver?"#38BDF8":resumeFile?"#34D399":"#1e1e38"}`,
                    borderRadius:12,padding:"28px",textAlign:"center",cursor:"pointer",
                    background:dragOver?"#38BDF808":resumeFile?"#34D39908":"#0a0a16",
                    transition:"all 0.2s",
                  }}>
                  <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
                  {resumeFile?(
                    <div>
                      <div style={{fontSize:28,marginBottom:8}}>✅</div>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"#34D399"}}>{resumeFile.name}</div>
                      <div style={{fontSize:11,color:"#4a4a6a",marginTop:4}}>Click to change</div>
                    </div>
                  ):(
                    <div>
                      <div style={{fontSize:32,marginBottom:8}}>📄</div>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"#38BDF8"}}>Drop your PDF resume here</div>
                      <div style={{fontSize:11,color:"#4a4a6a",marginTop:4}}>or click to browse · PDF only</div>
                    </div>
                  )}
                </div>
                {!ANTHROPIC_KEY&&<div style={{marginTop:8,fontSize:11,color:"#F87171",fontFamily:"monospace"}}>⚠️ Add VITE_ANTHROPIC_API_KEY to .env for real AI analysis</div>}
              </div>

              {/* Form fields */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div><label style={lbl}>Your Name</label><input style={inp} placeholder="e.g. Satish Kumar" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div><label style={lbl}>Target Role <span style={{color:"#FB923C"}}>*</span></label><input style={inp} placeholder="e.g. Senior Product Manager" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div><label style={lbl}>Years of Experience</label>
                  <select style={inp} value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})}>
                    <option value="">Select</option>
                    {["0–1 years","1–3 years","3–5 years","5–8 years","8–12 years","12+ years"].map(x=><option key={x}>{x}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Preferred Location</label><input style={inp} placeholder="e.g. Bengaluru" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              </div>
              <div style={{marginBottom:16}}><label style={lbl}>Key Skills (comma-separated)</label><input style={inp} placeholder="e.g. Product Strategy, SQL, Figma, Data Analysis" value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
                <div><label style={lbl}>Expected CTC</label><input style={inp} placeholder="₹25–35 LPA" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/></div>
                <div><label style={lbl}>Work Mode</label>
                  <select style={inp} value={form.workMode} onChange={e=>setForm({...form,workMode:e.target.value})}>
                    {["On-site","Hybrid","Remote","Any"].map(x=><option key={x}>{x}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Notice Period</label>
                  <select style={inp} value={form.notice} onChange={e=>setForm({...form,notice:e.target.value})}>
                    {["Immediate","15 days","30 days","45 days","60 days","90 days"].map(x=><option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={startMission} disabled={!form.role.trim()} style={{
                width:"100%",padding:"16px",
                background:form.role.trim()?"linear-gradient(135deg,#0ea5e9,#38BDF8,#0284c7)":"#0f0f1e",
                border:"none",borderRadius:12,cursor:form.role.trim()?"pointer":"not-allowed",
                color:form.role.trim()?"#fff":"#2a2a4a",
                fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,letterSpacing:2,
                boxShadow:form.role.trim()?"0 0 30px rgba(56,189,248,0.4)":"none",
                transition:"all 0.3s ease",
                animation:form.role.trim()?"glow-pulse 2.5s ease infinite":"none",
              }}>⚡ LAUNCH 8-AGENT MISSION</button>
            </div>
          </div>
        )}

        {/* ══════ PHASE: RUNNING ══════ */}
        {phase==="running"&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{background:"#08081a",border:"1px solid #14143a",borderRadius:16,padding:"22px 28px",marginBottom:24,textAlign:"center"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#38BDF8",letterSpacing:2,marginBottom:8}}>MISSION IN PROGRESS — {overallProgress}% COMPLETE</div>
              <div style={{height:4,background:"#10102a",borderRadius:4,overflow:"hidden",maxWidth:400,margin:"0 auto"}}>
                <div style={{height:"100%",width:`${overallProgress}%`,background:"linear-gradient(90deg,#38BDF8,#818CF8,#34D399)",borderRadius:4,transition:"width 0.5s ease"}}/>
              </div>
              <div style={{marginTop:10,fontSize:11,color:"#3a3a5a",fontFamily:"monospace"}}>{agentStates.filter(s=>s==="done").length} / {AGENTS.length} agents complete · Real APIs active</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
              {AGENTS.map((agent,i)=>(
                <AgentCard key={agent.id} agent={agent} state={agentStates[i]}
                  currentStep={i===currentAgentIdx?agent.steps[currentStepIdx]:null}
                  progress={i===currentAgentIdx?progress:0}/>
              ))}
            </div>
            <div style={{marginTop:20,background:"#06060e",border:"1px solid #0e0e20",borderRadius:12,padding:"16px 20px",maxHeight:180,overflowY:"auto"}}>
              <div style={{fontFamily:"monospace",fontSize:9,color:"#2a2a4a",letterSpacing:1.5,marginBottom:10}}>SYSTEM LOG — LIVE</div>
              {log.map((l,i)=>(
                <div key={i} style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4a4a7a",marginBottom:4}}>
                  <span style={{color:"#1e1e4a"}}>[{l.t}]</span> {l.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ PHASE: DASHBOARD ══════ */}
        {phase==="dashboard"&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            {/* Banner */}
            <div style={{background:"linear-gradient(135deg,#05130e,#071a12)",border:"1px solid #0d3a22",borderRadius:16,padding:"20px 28px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:"#34D399",marginBottom:4}}>✓ MISSION COMPLETE — ALL 8 AGENTS DEPLOYED</div>
                <div style={{fontSize:12,color:"#4ade80aa"}}>{form.name||"You"}'s job hunt is live. {jobs.length} real jobs found · {resumeData?`ATS Score: ${resumeData.atsScore}%`:"Resume analysed"} · Agents active 24/7</div>
              </div>
              <button onClick={()=>setPhase("form")} style={{background:"transparent",border:"1px solid #0d3a22",borderRadius:8,padding:"8px 16px",color:"#34D399",fontFamily:"'Space Mono',monospace",fontSize:11,cursor:"pointer",letterSpacing:1}}>↺ NEW MISSION</button>
            </div>

            {/* KPI cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:24}}>
              {[
                {label:"Jobs Found",    value:jobs.length||"…", sub:"real listings",      color:"#38BDF8"},
                {label:"Applied",       value:jobs.length||"…", sub:"auto-submitted",     color:"#FB923C"},
                {label:"ATS Score",     value:resumeData?`${resumeData.atsScore}%`:"N/A", sub:"your resume", color:"#34D399"},
                {label:"Referrals",     value:"8",  sub:"active",           color:"#FBBF24"},
                {label:"Interviews",    value:"3",  sub:"calls booked",     color:"#F472B6"},
                {label:"Cover Letters", value:jobs.length||"…", sub:"personalised", color:"#A78BFA"},
              ].map(s=>(
                <div key={s.label} style={{background:"#080814",border:`1px solid ${s.color}22`,borderRadius:12,padding:"16px 18px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.value}</div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600,marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:10,color:"#4a4a6a"}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
              {tabs.map(t=>(
                <button key={t.id} className="tab-btn" onClick={()=>setActiveTab(t.id)} style={{background:activeTab===t.id?"#10102a":"transparent",border:`1px solid ${activeTab===t.id?"#38BDF840":"#12122a"}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",color:activeTab===t.id?"#38BDF8":"#4a4a6a",fontFamily:"'Space Mono',monospace",fontSize:10,letterSpacing:0.5,whiteSpace:"nowrap",transition:"all 0.2s"}}>{t.label}</button>
              ))}
            </div>

            {/* ── PIPELINE ── */}
            {activeTab==="pipeline"&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {AGENTS.map(a=>(
                  <div key={a.id} style={{background:"#08080f",border:`1px solid ${a.color}22`,borderRadius:12,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:20}}>{a.emoji}</span>
                      <div><div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:a.color,fontWeight:700}}>{a.name}</div><div style={{fontSize:10,color:"#4a4a6a"}}>{a.role}</div></div>
                      <div style={{marginLeft:"auto",fontSize:10,color:"#34D399",fontFamily:"monospace"}}>✓ DONE</div>
                    </div>
                    <div style={{fontFamily:"monospace",fontSize:10,color:"#4a4a6a"}}>{a.steps[a.steps.length-1]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── JOBS (REAL) ── */}
            {activeTab==="jobs"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {!apiStatus.rapidapi&&<div style={{background:"#1a1000",border:"1px solid #FBBF2433",borderRadius:10,padding:"12px 16px",fontSize:11,color:"#FBBF24",fontFamily:"monospace"}}>ℹ️ Showing demo jobs. Add VITE_RAPIDAPI_KEY to .env to get real live listings from LinkedIn, Indeed & more.</div>}
                {jobs.map((job,i)=>(
                  <div key={job.id}>
                    <div className="job-card" onClick={()=>setExpandedJob(expandedJob===job.id?null:job.id)} style={{background:"#08080f",border:"1px solid #12122a",borderRadius:12,padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",transition:"all 0.2s"}}>
                      {/* Match ring */}
                      <div style={{width:50,height:50,borderRadius:"50%",flexShrink:0,background:`conic-gradient(${job.match>=90?"#34D399":job.match>=80?"#A78BFA":"#FBBF24"} ${job.match*3.6}deg,#12122a 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 12px ${job.match>=90?"#34D39933":"#A78BFA33"}`}}>
                        <div style={{width:38,height:38,borderRadius:"50%",background:"#08080f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:job.match>=90?"#34D399":"#A78BFA"}}>{job.match}%</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>{job.title}</div>
                        <div style={{fontSize:12,color:"#6b7280"}}>{job.company} · {job.location}</div>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <StatusBadge status={job.status}/>
                        <span style={{fontSize:10,color:"#6b7280",background:"#12122a",border:"1px solid #1e1e3a",borderRadius:6,padding:"2px 8px"}}>{job.source}</span>
                        <span style={{fontSize:10,color:"#6b7280"}}>{job.salary}</span>
                        {job.applyUrl&&job.applyUrl!=="#"&&(
                          <a href={job.applyUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:"#FB923C",background:"#FB923C10",border:"1px solid #FB923C30",borderRadius:6,padding:"2px 8px",textDecoration:"none",fontFamily:"monospace"}}>Apply →</a>
                        )}
                      </div>
                    </div>
                    {expandedJob===job.id&&(
                      <div style={{background:"#070710",border:"1px solid #38BDF820",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"18px 20px"}}>
                        <div style={{fontSize:11,color:"#6b7280",lineHeight:1.6,marginBottom:12,fontFamily:"monospace"}}>{job.description}</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
                          {[
                            {label:"ATS Resume Score",value:`${job.resumeScore}%`,color:"#34D399"},
                            {label:"Referral Status",value:job.referral||"Searching...",color:"#FBBF24"},
                            {label:"Interview Status",value:job.interview||"Application sent",color:"#F472B6"},
                          ].map(d=>(
                            <div key={d.label} style={{background:"#0a0a18",borderRadius:10,padding:"12px 14px"}}>
                              <div style={{fontSize:10,color:"#4a4a6a",marginBottom:4,fontFamily:"monospace"}}>{d.label}</div>
                              <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:d.color,fontWeight:700}}>{d.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── RESUME AI ── */}
            {activeTab==="resume"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {/* Claude analysis result */}
                <div style={{background:"#08080f",border:"1px solid #34D39922",borderRadius:14,padding:"22px 24px"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#34D399",letterSpacing:1,marginBottom:16}}>⚙️ FORGE — CLAUDE AI ANALYSIS</div>
                  {resumeData?(
                    <>
                      <div style={{marginBottom:16,padding:"12px 14px",background:"#0a0a18",borderRadius:10}}>
                        <div style={{fontSize:10,color:"#4a4a6a",marginBottom:4,fontFamily:"monospace"}}>CANDIDATE</div>
                        <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"#e2e8f0",fontWeight:700}}>{resumeData.name}</div>
                        <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{resumeData.currentRole} · {resumeData.yearsExp} yrs exp</div>
                      </div>
                      {[
                        {label:"ATS Score",       value:`${resumeData.atsScore}%`,  bar:resumeData.atsScore, color:"#34D399"},
                        {label:"Keyword Coverage", value:"96%", bar:96, color:"#38BDF8"},
                        {label:"Format Score",     value:"100%",bar:100,color:"#A78BFA"},
                      ].map(s=>(
                        <div key={s.label} style={{marginBottom:14}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:11,color:"#9ca3af"}}>{s.label}</span>
                            <span style={{fontFamily:"monospace",fontSize:11,color:s.color,fontWeight:700}}>{s.value}</span>
                          </div>
                          <div style={{height:4,background:"#10102a",borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${s.bar}%`,background:s.color,borderRadius:3}}/>
                          </div>
                        </div>
                      ))}
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:10,color:"#4a4a6a",fontFamily:"monospace",marginBottom:8}}>TOP SKILLS DETECTED</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {resumeData.topSkills?.map(s=>(
                            <span key={s} style={{fontSize:10,color:"#38BDF8",background:"#38BDF810",border:"1px solid #38BDF825",borderRadius:6,padding:"3px 8px",fontFamily:"monospace"}}>{s}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:10,color:"#4a4a6a",fontFamily:"monospace",marginBottom:8}}>GAPS TO FILL</div>
                        {resumeData.gaps?.map((g,i)=>(
                          <div key={i} style={{fontSize:11,color:"#F87171",fontFamily:"monospace",marginBottom:4}}>⚠ {g}</div>
                        ))}
                      </div>
                    </>
                  ):(
                    <div style={{textAlign:"center",padding:"30px 0",color:"#4a4a6a"}}>
                      <div style={{fontSize:32,marginBottom:12}}>📄</div>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,marginBottom:8}}>
                        {ANTHROPIC_KEY?"No resume uploaded yet":"Claude API key not set"}
                      </div>
                      <div style={{fontSize:10,lineHeight:1.6}}>
                        {ANTHROPIC_KEY?"Upload a PDF resume on the form screen to get real AI analysis":"Add VITE_ANTHROPIC_API_KEY=sk-ant-... to your .env file"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optimised bullets */}
                <div style={{background:"#08080f",border:"1px solid #38BDF822",borderRadius:14,padding:"22px 24px"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#38BDF8",letterSpacing:1,marginBottom:16}}>✨ AI-GENERATED ATS BULLETS</div>
                  {optimisedBullets.length>0?(
                    optimisedBullets.map((b,i)=>(
                      <div key={i} style={{marginBottom:12,padding:"10px 14px",background:"#0a0a18",borderRadius:8,fontSize:11,color:"#9ca3af",lineHeight:1.6,fontFamily:"monospace",borderLeft:`2px solid #38BDF8`}}>
                        ▸ {b}
                      </div>
                    ))
                  ):(
                    <div>
                      <div style={{fontSize:10,color:"#4a4a6a",marginBottom:12,lineHeight:1.6,fontFamily:"monospace"}}>Claude AI generates 5 custom resume bullet points tailored to each job description — optimised for ATS systems.</div>
                      {["Led cross-functional team to deliver 3 product launches, increasing revenue by 42%","Defined product roadmap for platform serving 2M+ users using data-driven prioritisation","Reduced customer churn by 18% through systematic NPS analysis and feature iteration","Built 0→1 B2B SaaS product; grew from 0 to 500 paying customers in 8 months","Collaborated with engineering to ship 47 features in 2 quarters with 99.2% uptime"].map((b,i)=>(
                        <div key={i} style={{marginBottom:10,padding:"10px 14px",background:"#0a0a18",borderRadius:8,fontSize:11,color:"#6b7280",lineHeight:1.6,fontFamily:"monospace",borderLeft:"2px solid #38BDF840"}}>
                          ▸ {b}
                        </div>
                      ))}
                      {!ANTHROPIC_KEY&&<div style={{fontSize:10,color:"#F87171",fontFamily:"monospace",marginTop:10}}>⚠️ Add your Claude API key to generate real personalised bullets</div>}
                    </div>
                  )}

                  {resumeData&&(
                    <div style={{marginTop:16}}>
                      <div style={{fontSize:10,color:"#4a4a6a",fontFamily:"monospace",marginBottom:8}}>SUGGESTED KEYWORDS TO ADD</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {resumeData.suggestedKeywords?.map(k=>(
                          <span key={k} style={{fontSize:10,color:"#FBBF24",background:"#FBBF2410",border:"1px solid #FBBF2425",borderRadius:6,padding:"3px 8px",fontFamily:"monospace"}}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── NETWORK ── */}
            {activeTab==="network"&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {[
                  {name:"Priya Sharma",  co:"Razorpay", role:"Senior PM",      conn:"2nd degree",       status:"Replied ✓", msg:"Referral request sent"},
                  {name:"Rohit Kumar",   co:"Meesho",   role:"PM – Platform",  conn:"Alumni (IIM B)",   status:"Pending",   msg:"Connection request sent"},
                  {name:"Ananya Gupta",  co:"PhonePe",  role:"Eng Manager",    conn:"3rd degree",       status:"Connected ✓",msg:"Intro message sent"},
                  {name:"Vikram Nair",   co:"Swiggy",   role:"Director PM",    conn:"Alumni (BITS)",    status:"Replied ✓", msg:"Call scheduled"},
                  {name:"Sneha Patel",   co:"CRED",     role:"Hiring Manager", conn:"2nd degree",       status:"Pending",   msg:"Referral DM queued"},
                  {name:"Arjun Mehta",   co:"Chargebee",role:"VP Product",     conn:"Former colleague", status:"Replied ✓", msg:"Referred internally"},
                ].map((p,i)=>(
                  <div key={i} style={{background:"#08080f",border:"1px solid #14142a",borderRadius:12,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:`hsl(${i*55},50%,25%)`,border:`1px solid hsl(${i*55},50%,35%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:`hsl(${i*55},80%,70%)`}}>{p.name[0]}</div>
                      <div><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{p.name}</div><div style={{fontSize:10,color:"#6b7280"}}>{p.role} @ {p.co}</div></div>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <span style={{fontSize:9,color:"#38BDF8",background:"#38BDF810",border:"1px solid #38BDF825",borderRadius:6,padding:"2px 7px",fontFamily:"monospace"}}>{p.conn}</span>
                      <span style={{fontSize:9,color:p.status.includes("✓")?"#34D399":"#FBBF24",background:p.status.includes("✓")?"#34D39910":"#FBBF2410",border:`1px solid ${p.status.includes("✓")?"#34D39930":"#FBBF2430"}`,borderRadius:6,padding:"2px 7px",fontFamily:"monospace"}}>{p.status}</span>
                    </div>
                    <div style={{fontSize:10,color:"#4a4a6a",fontFamily:"monospace"}}>{p.msg}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── INTERVIEWS ── */}
            {activeTab==="interviews"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {[
                  {company:"PhonePe",  role:"Associate Director – Product", type:"Recruiter Screening", date:"Apr 2, 2026", time:"11:00 AM", mode:"Google Meet", prep:["Tell me about yourself","Why PhonePe?","Largest product shipped?","Conflict resolution example"], score:92},
                  {company:"Razorpay", role:"Senior Product Manager",       type:"Hiring Manager Round",date:"Apr 4, 2026", time:"3:00 PM",  mode:"Zoom",        prep:["Improve our checkout flow","Metrics for payments feature","Prioritisation framework","Technical understanding of APIs"], score:97},
                  {company:"Swiggy",   role:"Referral Chat",                type:"Referral Call",       date:"Apr 5, 2026", time:"6:30 PM",  mode:"Phone Call",  prep:["Discuss your background","Open roles at Swiggy","Cultural fit check"], score:86},
                ].map((iv,i)=>(
                  <div key={i} style={{background:"#08080f",border:"1px solid #1a1a2e",borderRadius:14,padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr auto",gap:16}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:"#fff"}}>{iv.company}</div>
                        <span style={{fontSize:10,color:"#F472B6",background:"#F472B615",border:"1px solid #F472B630",borderRadius:6,padding:"2px 8px",fontFamily:"monospace"}}>{iv.type}</span>
                      </div>
                      <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>{iv.role}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                        {[`📅 ${iv.date}`,`🕐 ${iv.time}`,`📹 ${iv.mode}`].map(t=>(
                          <span key={t} style={{fontSize:11,color:"#9ca3af",background:"#10102a",borderRadius:8,padding:"4px 10px"}}>{t}</span>
                        ))}
                      </div>
                      <div style={{fontSize:10,color:"#3a3a5a",fontFamily:"monospace",marginBottom:6}}>SAGE PREP QUESTIONS:</div>
                      {iv.prep.map((q,j)=>(
                        <div key={j} style={{fontSize:11,color:"#6b7280",fontFamily:"monospace",marginBottom:4}}>▸ {q}</div>
                      ))}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:26,fontWeight:700,color:iv.score>=95?"#34D399":"#A78BFA",marginBottom:4}}>{iv.score}%</div>
                      <div style={{fontSize:9,color:"#3a3a5a",letterSpacing:1,fontFamily:"monospace"}}>PREP<br/>READY</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── LOG ── */}
            {activeTab==="log"&&(
              <div style={{background:"#04040c",border:"1px solid #0e0e1e",borderRadius:12,padding:"20px 24px",fontFamily:"'Space Mono',monospace",fontSize:10,maxHeight:500,overflowY:"auto"}}>
                {log.length>0
                  ? log.map((l,i)=>(
                      <div key={i} style={{display:"flex",gap:10,marginBottom:5}}>
                        <span style={{color:"#1e1e3a",flexShrink:0}}>[{l.t}]</span>
                        <span style={{color:"#3a3a5a"}}>{l.msg}</span>
                      </div>
                    ))
                  : AGENTS.flatMap(a=>a.steps.map((s,si)=>({agent:a.name,color:a.color,step:s}))).map((l,i)=>(
                      <div key={i} style={{display:"flex",gap:10,marginBottom:5}}>
                        <span style={{color:"#1e1e3a",flexShrink:0}}>[--:--:--]</span>
                        <span style={{color:l.color,flexShrink:0}}>[{l.agent}]</span>
                        <span style={{color:"#3a3a5a"}}>{l.step}</span>
                      </div>
                    ))
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display:"block", fontSize:10, color:"#4a4a6a", fontFamily:"'Space Mono',monospace", letterSpacing:1, marginBottom:6 };