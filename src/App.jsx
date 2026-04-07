import { useState, useEffect, useRef } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const RAPIDAPI_KEY  = import.meta.env.VITE_RAPIDAPI_KEY || "";
const RAZORPAY_KEY  = import.meta.env.VITE_RAZORPAY_KEY || "";

const AGENTS = [
  { id:"scout",       name:"SCOUT", emoji:"🔭", role:"Job Discovery",       color:"#0071E3", steps:["Connecting to job APIs...","Scanning LinkedIn Jobs...","Scanning Indeed...","Scanning Glassdoor...","Scanning Naukri, Wellfound...","Deduplicating results...","Running match algorithm...","Top opportunities shortlisted ✓"] },
  { id:"analyst",     name:"IRIS",  emoji:"🧬", role:"JD Analyser",         color:"#D2D2D7", steps:["Loading job descriptions...","Extracting hard skills...","Mapping ATS keywords...","Identifying hidden requirements...","Benchmarking your profile...","Keyword priority list ready ✓"] },
  { id:"resume",      name:"FORGE", emoji:"⚙️", role:"Resume Crafter",      color:"#0071E3", steps:["Reading your resume...","Extracting skills & experience...","Injecting ATS keywords...","Rewriting bullets in STAR format...","Quantifying achievements...","Running ATS scan...","Resume Score: 98.7% ✓"] },
  { id:"apply",       name:"APEX",  emoji:"🚀", role:"Auto-Apply Engine",   color:"#D2D2D7", steps:["Authenticating portals...","Selecting tailored resume...","Auto-filling forms...","Attaching cover letters...","Submitting applications...","All applications submitted ✓"] },
  { id:"networker",   name:"NEXUS", emoji:"🕸️", role:"Network Builder",     color:"#0071E3", steps:["Mapping org charts...","Finding 2nd-degree connections...","Identifying alumni...","Drafting referral messages...","Sending requests...","Referral pipeline active ✓"] },
  { id:"coverletter", name:"QUILL", emoji:"✍️", role:"Cover Letter AI",     color:"#D2D2D7", steps:["Reading company mission...","Identifying values...","Crafting hooks...","Inserting your wins...","Proofreading...","Cover letters ready ✓"] },
  { id:"tracker",     name:"PULSE", emoji:"📡", role:"Application Tracker", color:"#0071E3", steps:["Logging applications...","Setting reminders...","Monitoring views...","Watching replies...","Escalating cold apps...","Dashboard live ✓"] },
  { id:"coach",       name:"SAGE",  emoji:"🎓", role:"Interview Coach",     color:"#D2D2D7", steps:["Researching companies...","Building question bank...","STAR frameworks ready...","Technical questions set...","Salary scripts prepared...","Interview kit ready ✓"] },
];

const PACKAGES = [
  { name:"Starter", price:999,  display:"₹999",   period:"one-time",  color:"#424245",    tag:null,
    features:["5 AI-optimised applications","ATS resume analysis","Keyword suggestions","1 cover letter","PDF resume download","Email support"],
    locked:["LinkedIn automation","Network builder","Interview coaching","Unlimited applications"] },
  { name:"Hunter",  price:2999, display:"₹2,999", period:"per month", color:"#0071E3", tag:"Most Popular",
    features:["50 applications/month","98%+ ATS optimisation","Unlimited keywords","10 cover letters","Real jobs from 9 sources","Tracking dashboard","PDF resume download","LinkedIn job search","Priority support"],
    locked:["Auto LinkedIn connections","Auto referral messages","Interview coaching"] },
  { name:"Closer",  price:7999, display:"₹7,999", period:"per month", color:"#FFD700", tag:"Best Value",
    features:["Unlimited applications","98%+ ATS optimisation","Unlimited cover letters","Real jobs from 9 sources","LinkedIn Chrome Extension","Auto connection requests","Auto referral messages","One-click Easy Apply","Full tracking dashboard","SAGE interview coaching","Salary negotiation scripts","PDF resume download","WhatsApp support"],
    locked:[] },
];

const ts = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

function Tw({ text, speed=18 }) {
  const [out,setOut]=useState("");
  useEffect(()=>{ setOut(""); let i=0; const iv=setInterval(()=>{ i++; setOut(text.slice(0,i)); if(i>=text.length) clearInterval(iv); },speed); return ()=>clearInterval(iv); },[text]);
  return <span>{out}<span style={{opacity:out.length<text.length?1:0,color:"#0071E3"}}>█</span></span>;
}

async function analyseResume(b64, role) {
  if(!ANTHROPIC_KEY) return mockResume(role);
  try {
    const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}, body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:`Analyze this resume for a ${role} role and completely rewrite its content, summary, and experience bullet points to achieve a perfect 100 ATS score for this role. Always set atsScore to 100. Return ONLY valid JSON with these exact keys: {"name":"","currentRole":"","email":"","phone":"","location":"","yearsExp":0,"topSkills":[],"education":"","atsScore":0,"keyStrengths":[],"gaps":[],"suggestedKeywords":[],"summary":"","experience":[{"company":"","role":"","duration":"","bullets":[]}]}`}]}]}) });
    const d=await res.json();
    return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,""));
  } catch { return mockResume(role); }
}

async function genBullets(rd, role) {
  if(!ANTHROPIC_KEY) return ["Spearheaded major company initiatives delivering 35% YoY growth","Drove product strategy aligned with enterprise OKRs and vision","Collaborated with engineering teams to ship features on time","Optimised internal processes saving $500k annually","Led cross-functional teams of 20+ members across 3 timezones"];
  try {
    const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}, body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Profile: ${JSON.stringify(rd)}. Write 5 powerful ATS-optimised STAR bullet points for a ${role} role. Return ONLY a JSON array of 5 strings, no markdown.`}]}) });
    const d=await res.json();
    return JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,""));
  } catch { return ["Spearheaded major company initiatives delivering 35% YoY growth","Drove product strategy aligned with enterprise OKRs and vision","Collaborated with engineering teams to ship features on time","Optimised internal processes saving $500k annually","Led cross-functional teams of 20+ members across 3 timezones"]; }
}

async function fetchJobs(role, loc) {
  if(!RAPIDAPI_KEY) return mockJobs(role,loc);
  try {
    const res=await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(role+" in "+loc)}&page=1&num_pages=2&country=in&date_posted=week`,{headers:{"x-rapidapi-host":"jsearch.p.rapidapi.com","x-rapidapi-key":RAPIDAPI_KEY}});
    const d=await res.json();
    return (d.data||[]).slice(0,10).map((j,i)=>({ id:i+1,title:j.job_title,company:j.employer_name,location:j.job_city||loc,match:Math.floor(75+Math.random()*22),source:j.job_publisher||"Indeed",salary:"Not disclosed",applyUrl:j.job_apply_link,description:(j.job_description||"").slice(0,200)+"...",status:"Found",resumeScore:(88+Math.random()*11).toFixed(1),referral:null,interview:null }));
  } catch { return mockJobs(role,loc); }
}


function mockResume(role) {
  return {
    name: "Alex Professional", currentRole: role, email: "alex@example.com", phone: "+91 9876543210", location: "Remote",
    yearsExp: 5, topSkills: ["Leadership", "Data Analysis", "Agile", "Cross-functional collaboration", "Strategy"],
    education: "B.Tech in Computer Science, XYZ University", atsScore: 100,
    keyStrengths: ["Fast learner", "Communication", "Problem solving"], gaps: [], suggestedKeywords: ["Strategy", "KPIs", "Growth"],
    summary: "Dynamic and results-oriented " + role + " with 5+ years of experience leading complex projects and driving continuous improvement. Proven ability to elevate team performance and exceed corporate goals.",
    experience: [
      { company: "TechNova Solutions", role: role, duration: "2021 - Present", bullets: ["Spearheaded cross-functional initiatives resulting in a 30% increase in operational efficiency.", "Mentored a team of 15, increasing overall team productivity by 25%.", "Developed and deployed enterprise solutions that scaled to 1M+ users."] },
      { company: "Alpha Systems", role: "Associate " + role, duration: "2018 - 2021", bullets: ["Collaborated with stakeholders to define project roadmaps and KPIs.", "Optimised legacy processes reducing costs by 18% annually."] }
    ]
  };
}

function mockJobs(role,loc){ return ["Razorpay","PhonePe","Zepto","Meesho","Swiggy","CRED","Chargebee","Freshworks"].map((co,i)=>({ id:i+1,title:role,company:co,location:loc,match:Math.floor(78+Math.random()*19),source:["LinkedIn","Naukri","Glassdoor","Indeed","Wellfound"][i%5],salary:`₹${18+i*3}–${26+i*3} LPA`,applyUrl:"#",description:`Exciting ${role} opportunity at ${co}.`,status:"Found",resumeScore:(88+Math.random()*11).toFixed(1),referral:null,interview:null })); }

const RESUME_TEMPLATES = [
  { id:"executive", name:"Executive", desc:"Professional with blue accents", accent:"#2563EB", preview:"exec" },
  { id:"modern",    name:"Modern",    desc:"Dark header, teal accents",     accent:"#0D9488", preview:"mod"  },
  { id:"minimal",   name:"Minimal",   desc:"Elegant simplicity, refined",   accent:"#374151", preview:"min"  },
  { id:"creative",  name:"Creative",  desc:"Bold purple, strong presence",  accent:"#7C3AED", preview:"cre"  },
];

function buildResumeHTML(templateId, rd, bullets, role) {
  const n     = rd?.name       || "Your Name";
  const jt    = rd?.currentRole|| role || "Professional";
  const em    = rd?.email      || "";
  const ph    = rd?.phone      || "";
  const loc   = rd?.location   || "";
  const sum   = rd?.summary    || "";
  const sk    = rd?.topSkills?.length ? rd.topSkills : ["Leadership","Strategic Planning","Cross-functional Collaboration","Data Analysis","Process Optimization","Stakeholder Management"];
  const edu   = rd?.education  || "";

  const contact = [em&&`${em}`, ph&&`${ph}`, loc&&`${loc}`].filter(Boolean);

  const expItems = rd?.experience?.length
    ? rd.experience.map(e => ({ role:e.role, company:e.company, duration:e.duration, bul:e.bullets?.length?e.bullets:bullets }))
    : [{ role:jt, company:"", duration:"", bul:bullets.length?bullets:["Delivered measurable results aligned with organizational goals","Collaborated with cross-functional teams to drive key initiatives","Optimized processes that improved efficiency and business outcomes"] }];

  /* helper: experience block builder — avoids page-break-inside on the header row only,
     lets bullet lists flow naturally across pages so no huge blank gaps appear */
  const mkExp = (items, accent, headColor, compColor, bulColor) => items.map(e=>`<div style="margin-bottom:10px;">
    <div style="page-break-inside:avoid;display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
      <div><span style="font-weight:700;font-size:10pt;color:${headColor};">${e.role}</span>${e.company?`<span style="color:${accent};margin:0 6px;">|</span><span style="font-size:9.5pt;color:${compColor};">${e.company}</span>`:""}</div>
      ${e.duration?`<span style="font-size:8pt;color:${accent};font-weight:600;white-space:nowrap;">${e.duration}</span>`:""}
    </div>
    <ul style="padding-left:15px;margin:2px 0 0;">${e.bul.map(b=>`<li style="font-size:9pt;color:${bulColor};margin-bottom:2px;line-height:1.45;">${b}</li>`).join("")}</ul>
  </div>`).join("");

  if (templateId === "executive") {
    return { wrapperStyle:"width:210mm;font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#1e293b;font-size:10pt;line-height:1.4;background:#fff;padding:14mm 16mm 12mm;box-sizing:border-box;",
      html:`
      <div style="text-align:center;margin-bottom:4px;">
        <div style="font-size:24pt;font-weight:800;letter-spacing:2px;color:#1e293b;text-transform:uppercase;">${n}</div>
        <div style="font-size:10pt;color:#2563EB;font-weight:500;margin:3px 0 6px;letter-spacing:0.5px;">${jt}</div>
        <div style="width:50px;height:2.5px;background:#2563EB;margin:0 auto 6px;border-radius:2px;"></div>
        <div style="font-size:8.5pt;color:#64748b;display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">${contact.map(c=>`<span>${c}</span>`).join('<span style="color:#cbd5e1;">|</span>')}</div>
      </div>
      <div style="height:1px;background:#e2e8f0;margin:8px 0;"></div>
      ${sum?`<div style="margin-bottom:8px;"><div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#1e293b;border-left:3px solid #2563EB;padding-left:8px;margin-bottom:4px;">Professional Summary</div><div style="font-size:9pt;color:#475569;line-height:1.5;">${sum}</div></div>`:""}
      <div style="margin-bottom:8px;">
        <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#1e293b;border-left:3px solid #2563EB;padding-left:8px;margin-bottom:5px;">Core Competencies</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${sk.map(s=>`<span style="border:1px solid #2563EB;border-radius:4px;padding:2px 8px;font-size:8pt;color:#2563EB;font-weight:500;">${s}</span>`).join("")}</div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="page-break-inside:avoid;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#1e293b;border-left:3px solid #2563EB;padding-left:8px;margin-bottom:6px;">Professional Experience</div>
        ${mkExp(expItems,"#2563EB","#1e293b","#64748b","#475569")}
      </div>
      ${edu?`<div style="page-break-inside:avoid;"><div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#1e293b;border-left:3px solid #2563EB;padding-left:8px;margin-bottom:4px;">Education &amp; Credentials</div><div style="font-size:9pt;color:#475569;">${edu}</div></div>`:""}`
    };
  }

  if (templateId === "modern") {
    return { wrapperStyle:"width:210mm;font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#1e293b;font-size:10pt;line-height:1.4;background:#fff;padding:0;box-sizing:border-box;",
      html:`
      <div style="background:linear-gradient(135deg,#0f172a 0%,#134e4a 100%);padding:14mm 16mm 10mm;">
        <div style="font-size:24pt;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">${n}</div>
        <div style="font-size:10pt;color:#5eead4;font-weight:500;letter-spacing:0.5px;margin-bottom:8px;">${jt}</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:8pt;color:#94a3b8;">${contact.map(c=>`<span>${c}</span>`).join("")}</div>
      </div>
      <div style="padding:10mm 16mm 12mm;">
      ${sum?`<div style="margin-bottom:8px;"><div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#134e4a;padding-bottom:3px;margin-bottom:4px;border-bottom:2px solid #0d9488;">Professional Summary</div><div style="font-size:9pt;color:#475569;line-height:1.5;">${sum}</div></div>`:""}
      <div style="margin-bottom:8px;">
        <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#134e4a;padding-bottom:3px;margin-bottom:5px;border-bottom:2px solid #0d9488;">Core Competencies</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${sk.map(s=>`<span style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:2px 8px;font-size:8pt;color:#134e4a;font-weight:500;">${s}</span>`).join("")}</div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="page-break-inside:avoid;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#134e4a;padding-bottom:3px;margin-bottom:6px;border-bottom:2px solid #0d9488;">Professional Experience</div>
        ${mkExp(expItems,"#0d9488","#134e4a","#64748b","#475569")}
      </div>
      ${edu?`<div style="page-break-inside:avoid;"><div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#134e4a;padding-bottom:3px;margin-bottom:4px;border-bottom:2px solid #0d9488;">Education &amp; Credentials</div><div style="font-size:9pt;color:#475569;">${edu}</div></div>`:""}
      </div>`
    };
  }

  if (templateId === "minimal") {
    return { wrapperStyle:"width:210mm;font-family:'Georgia','Times New Roman',serif;color:#111827;font-size:10pt;line-height:1.45;background:#fff;padding:14mm 16mm 12mm;box-sizing:border-box;",
      html:`
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:4px;">
        <div>
          <div style="font-size:22pt;font-weight:700;color:#111827;letter-spacing:0.5px;">${n}</div>
          <div style="font-size:10pt;color:#6b7280;margin-top:2px;">${jt}</div>
        </div>
        <div style="text-align:right;font-size:8pt;color:#9ca3af;line-height:1.5;">${contact.join("<br/>")}</div>
      </div>
      <div style="height:1px;background:#e5e7eb;margin:6px 0 10px;"></div>
      ${sum?`<div style="margin-bottom:10px;"><div style="font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:4px;">Summary</div><div style="font-size:9pt;color:#4b5563;line-height:1.5;font-style:italic;">${sum}</div></div>`:""}
      <div style="margin-bottom:10px;">
        <div style="font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:5px;">Expertise</div>
        <div style="font-size:8.5pt;color:#374151;line-height:1.6;">${sk.join("  ·  ")}</div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="page-break-inside:avoid;font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:6px;">Experience</div>
        ${mkExp(expItems,"#9ca3af","#111827","#6b7280","#4b5563")}
      </div>
      ${edu?`<div style="page-break-inside:avoid;"><div style="font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:4px;">Education</div><div style="font-size:9pt;color:#4b5563;">${edu}</div></div>`:""}`
    };
  }

  /* creative */
  return { wrapperStyle:"width:210mm;font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#1e1b4b;font-size:10pt;line-height:1.4;background:#fff;padding:0;box-sizing:border-box;",
    html:`
    <div style="border-left:6px solid #7c3aed;padding:14mm 16mm 12mm 16mm;">
      <div style="margin-bottom:6px;">
        <div style="font-size:26pt;font-weight:900;color:#1e1b4b;letter-spacing:1px;line-height:1.1;">${n}</div>
        <div style="font-size:10pt;color:#7c3aed;font-weight:600;margin-top:3px;letter-spacing:0.3px;">${jt}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:8pt;color:#6b7280;margin-top:6px;">${contact.map(c=>`<span>${c}</span>`).join('<span style="color:#c4b5fd;">•</span>')}</div>
      </div>
      <div style="height:2px;background:linear-gradient(90deg,#7c3aed,#c4b5fd,transparent);margin:8px 0 10px;"></div>
      ${sum?`<div style="margin-bottom:8px;"><div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#7c3aed;margin-bottom:4px;">Professional Summary</div><div style="font-size:9pt;color:#475569;line-height:1.5;">${sum}</div></div>`:""}
      <div style="margin-bottom:8px;">
        <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#7c3aed;margin-bottom:5px;">Core Competencies</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${sk.map(s=>`<span style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:5px;padding:2px 8px;font-size:8pt;color:#5b21b6;font-weight:500;">${s}</span>`).join("")}</div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="page-break-inside:avoid;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#7c3aed;margin-bottom:6px;">Professional Experience</div>
        ${mkExp(expItems,"#7c3aed","#1e1b4b","#6b7280","#475569")}
      </div>
      ${edu?`<div style="page-break-inside:avoid;"><div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#7c3aed;margin-bottom:4px;">Education &amp; Credentials</div><div style="font-size:9pt;color:#475569;">${edu}</div></div>`:""}
    </div>`
  };
}

async function downloadResume(rd, bullets, role, templateId) {
  if (!window.html2pdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const tpl = buildResumeHTML(templateId || "executive", rd, bullets, role);
  const resumeDiv = document.createElement("div");
  resumeDiv.style.cssText = tpl.wrapperStyle;
  resumeDiv.innerHTML = tpl.html;

  document.body.appendChild(resumeDiv);
  await window.html2pdf().set({
    margin: 0,
    filename: `${(rd?.name||"Resume").replace(/\s+/g,"_")}_ATS_Resume.pdf`,
    image: { type:"jpeg", quality:0.99 },
    html2canvas: { scale:3, useCORS:true, logging:false, letterRendering:true },
    jsPDF: { unit:"mm", format:"a4", orientation:"portrait" },
    pagebreak: { mode:["css","legacy"] }
  }).from(resumeDiv).save();
  document.body.removeChild(resumeDiv);
}

function payWithRazorpay(pkg, name) {
  if(!RAZORPAY_KEY){ alert("⚠️ Razorpay not configured.\n\nAdd VITE_RAZORPAY_KEY=rzp_live_xxx to your .env file and Vercel environment variables.\n\nGet your key from: razorpay.com → Settings → API Keys"); return; }
  const s=document.createElement("script"); s.src="https://checkout.razorpay.com/v1/checkout.js";
  s.onload=()=>{ new window.Razorpay({ key:RAZORPAY_KEY, amount:pkg.price*100, currency:"INR", name:"JobHunter.AI", description:`${pkg.name} Plan — ${pkg.period}`, handler:(r)=>alert(`✅ Payment successful!\nPayment ID: ${r.razorpay_payment_id}\n\nWelcome to ${pkg.name} plan!\nCheck your email for next steps.`), prefill:{name:name||""}, theme:{color:"#0071E3"} }).open(); };
  document.body.appendChild(s);
}

function AgentCard({agent,state,currentStep,progress}){
  const isA=state==="active",isD=state==="done",isP=state==="pending";
  return(<div style={{background:isA?"#E0F7FA":isD?"#E0F7FA":"#D2D2D7",border:`1px solid ${isA?agent.color:isD?agent.color+"55":"#D2D2D7"}`,borderRadius:12,padding:"14px 16px",transition:"all 0.4s",boxShadow:"none",position:"relative",overflow:"hidden",opacity:isP?0.4:1}}>
    {isA&&<div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(0,113,227,0.05),transparent)",animation:"none"}}/>}
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:40,height:40,borderRadius:10,flexShrink:0,background:isA||isD?"rgba(0,113,227,0.1)":"#D2D2D7",border:`1px solid ${isA||isD?"rgba(0,113,227,0.25)":"#D2D2D7"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{agent.emoji}</div>
      <div style={{flex:1}}><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:14,letterSpacing:"-0.3px",color:isA||isD?agent.color:"#1D1D1F"}}>{agent.name}</div><div style={{fontSize:10,color:"#3a3a3a"}}>{agent.role}</div></div>
      <div style={{width:7,height:7,borderRadius:"50%",background:isD||isA?agent.color:"#D2D2D7",boxShadow:(isA||isD)?`0 0 8px ${agent.color}`:"none",animation:isA?"blink 1s infinite":"none"}}/>
    </div>
    {(isA||isD)&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #D2D2D7"}}>
      <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:10,color:isD?agent.color:"#86868B",minHeight:14}}>
        {isA&&currentStep?<Tw text={`▸ ${currentStep}`}/>:isD?<span>✓ {agent.steps[agent.steps.length-1]}</span>:null}
      </div>
      {isA&&<div style={{marginTop:7,height:2,background:"#F1F5F9",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:agent.color,borderRadius:2,transition:"width 0.3s ease"}}/></div>}
    </div>}
  </div>);
}

function PricingCard({pkg,userName,isPopular}){
  return(<div style={{background:isPopular?"#D2D2D7":"#FFFFFF",border:`2px solid ${isPopular?pkg.color:"#D2D2D7"}`,borderRadius:20,padding:"32px 28px",position:"relative",boxShadow:isPopular?"0 12px 36px rgba(0,0,0,0.08)":"none",transform:isPopular?"scale(1.04)":"scale(1)",transition:"transform 0.3s"}}>
    {pkg.tag&&<div style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",background:pkg.color,color:pkg.color==="#FFD700"?"#000":"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,letterSpacing:"-0.3px",padding:"4px 16px",borderRadius:20,whiteSpace:"nowrap"}}>{pkg.tag}</div>}
    <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:24,letterSpacing:"-0.5px",color:pkg.color,marginBottom:4}}>{pkg.name}</div>
    <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:40,color:"#1D1D1F",letterSpacing:"-0.1px",marginBottom:2}}>{pkg.display}</div>
    <div style={{fontSize:11,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:24}}>{pkg.period}</div>
    <div style={{marginBottom:24}}>
      {pkg.features.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9}}><span style={{color:pkg.color,flexShrink:0,fontSize:13}}>✓</span><span style={{fontSize:12,color:"#86868B",lineHeight:1.5}}>{f}</span></div>)}
      {pkg.locked.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,opacity:0.45}}><span style={{color:"#86868B",flexShrink:0,fontSize:13}}>✗</span><span style={{fontSize:12,color:"#86868B",lineHeight:1.5}}>{f}</span></div>)}
    </div>
    <button onClick={()=>payWithRazorpay(pkg,userName)} style={{width:"100%",padding:"14px",background:isPopular?pkg.color:"transparent",border:`2px solid ${pkg.color}`,borderRadius:10,color:isPopular?(pkg.color==="#FFD700"?"#1D1D1F":"#FFFFFF"):pkg.color,fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.3px",cursor:"pointer",transition:"all 0.2s"}}>Get started</button>
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
  const [showTemplatePicker,setShowTemplatePicker]=useState(false);
  const [navScrolled,setNavScrolled]=useState(false);
  const fileRef=useRef(null);
  const timerRef=useRef(null);
  const canvasRef=useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenu && !e.target.closest('.main-nav')) {
        setMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenu]);

  // Scroll-aware navbar
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Star twinkling canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let stars = [];
    const STAR_COUNT = 220;

    const resize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      initStars();
    };

    const initStars = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.3,
          baseAlpha: Math.random() * 0.4 + 0.05,
          alpha: 0,
          twinkleSpeed: Math.random() * 0.008 + 0.002,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.85 ? `hsl(${210 + Math.random() * 30}, 80%, 75%)` : '#fff',
        });
      }
    };

    const draw = (time) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.phase) * s.baseAlpha * 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        ctx.fill();
        // glow for larger stars
        if (s.r > 1.2) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.alpha * 0.15);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [page]);

  const overallProg=Math.round((agentStates.filter(s=>s==="done").length/AGENTS.length)*100);
  const inp={background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:"11px 14px",color:"#1D1D1F",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"'Wix Madefor Text',sans-serif",transition:"border-color 0.2s"};
  const lbl={display:"block",fontSize:11,color:"#6B7280",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,letterSpacing:"-0.1px",marginBottom:6,};
  const tabs=[{id:"pipeline",l:"📊 Pipeline"},{id:"jobs",l:`💼 Jobs (${jobs.length})`},{id:"resume",l:"📄 Resume AI"},{id:"network",l:"🕸 Network"},{id:"interviews",l:"🎯 Interviews"},{id:"log",l:"🖥 Log"}];

  const navTo=(p)=>{ setPage(p); setMobileMenu(false); if(p==="app") setPhase("form"); };

  return(<div style={{minHeight:"100vh",background:"#F5F5F7",color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",paddingTop:page==="landing"?0:"78px"}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400..800&family=Wix+Madefor+Text:wght@400..800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      h1, h2 { color: inherit; }
      ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#FFFFFF} ::-webkit-scrollbar-thumb{background:#0071E3;border-radius:4px}
      @keyframes shimmer{0%{left:-100%}100%{left:200%}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse-blue{0%,100%{box-shadow:0 4px 14px rgba(0,113,227,0.25)}50%{box-shadow:0 10px 25px rgba(0,113,227,0.4)}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      input:focus,select:focus{border-color:#0071E3!important}
      input::placeholder{color:#1D1D1F}
      .job-row:hover{background:#D2D2D7!important;border-color:rgba(0,113,227,0.4)!important}
      .agent-feature:hover{border-color:#0071E3!important;background:#E0F7FA!important}
      .nav-btn{background:none;border:none;font-family:'Wix Madefor Display',sans-serif;font-weight:500;font-size:14px;cursor:pointer;transition:color 0.2s;padding:4px 0}
      .nav-btn:hover{color:#0071E3}
      .nav-transparent .nav-btn{color:rgba(255,255,255,0.75)}
      .nav-transparent .nav-btn:hover{color:#5CB8FF}
      .nav-scrolled .nav-btn{color:#86868B}
      .nav-scrolled .nav-btn:hover{color:#0071E3}
      .pkg-btn:hover{opacity:0.85}

      .nav-links { display: flex; align-items: center; gap: 24px; }
      .menu-toggle { display: none; font-size: 24px; background: none; border: none; cursor: pointer; color: #1D1D1F; }
      @media (max-width: 768px) {
        .main-nav { padding: 0 16px !important; }
        .nav-links {
          display: none;
          flex-direction: column;
          position: absolute;
          top: 78px;
          left: 0;
          width: 100%;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(12px);
          padding: 20px 0;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          border-bottom: 1px solid #D2D2D7;
        }
        .nav-links.open { display: flex; }
        .menu-toggle { display: block; }
        h1 { font-size: clamp(36px, 10vw, 110px) !important; }
        h2 { font-size: clamp(28px, 8vw, 60px) !important; }
        .section-pad { padding: 40px 16px !important; }
        .hero-pad { min-height: auto !important; padding: 0 !important; }
        .hero-pad > div:last-child { padding: 100px 16px 0 !important; }
        .card-pad { padding: 20px !important; }
        .mobile-col { grid-template-columns: 1fr !important; }
        .mobile-stack { flex-direction: column !important; align-items: flex-start !important; }
        .mobile-full-btn { width: 100% !important; margin-bottom: 12px; }
        footer { padding: 24px 16px !important; justify-content: center !important; text-align: center; flex-direction: column; }
      }
      @media (max-width: 1024px) and (min-width: 769px) {
        .hero-pad > div:last-child { padding: 100px 24px 0 !important; }
      }

    `}</style>

    {/* NAV */}
    <nav className={`main-nav ${page==="landing"&&!navScrolled?"nav-transparent":"nav-scrolled"}`} style={{borderBottom:page==="landing"&&!navScrolled?"none":"1px solid #D2D2D7",padding:"0 48px",display:"flex",alignItems:"center",justifyContent:"space-between",height:78,background:page==="landing"&&!navScrolled?"transparent":"rgba(255,255,255,0.95)",backdropFilter:navScrolled||page!=="landing"?"blur(12px)":"none",WebkitBackdropFilter:navScrolled||page!=="landing"?"blur(12px)":"none",position:"fixed",top:0,left:0,right:0,zIndex:200,transition:"background 0.35s ease, border-bottom 0.35s ease, backdrop-filter 0.35s ease"}}>

      <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>navTo("landing")}>
        <div style={{width:32,height:32,borderRadius:8,background:"#0071E3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:page==="landing"&&!navScrolled?"0 0 12px rgba(0,113,227,0.4)":"none"}}>⚡</div>
        <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",color:page==="landing"&&!navScrolled?"#FFFFFF":"#1D1D1F",transition:"color 0.35s ease"}}>JobHunter<span style={{color:"#0071E3"}}>.AI</span></div>
      </div>
      <button className="menu-toggle" onClick={()=>setMobileMenu(!mobileMenu)} style={{color:page==="landing"&&!navScrolled?"#fff":"#1D1D1F"}}>☰</button>
      <div className={`nav-links ${mobileMenu?"open":""}`}>
        <button className="nav-btn" onClick={()=>navTo("landing")}>Home</button>
        <button className="nav-btn" onClick={()=>navTo("app")}>Launch app</button>
        <button className="nav-btn" onClick={()=>navTo("pricing")}>Pricing</button>
        <button className="nav-btn" onClick={()=>navTo("extension")}>Extension</button>
        <button onClick={()=>navTo("app")} style={{background:"#0071E3",border:"none",borderRadius:980,padding:"8px 20px",color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"none"}}>Start free</button>
      </div>
    </nav>

    {/* ═══ LANDING ═══ */}
    {page==="landing"&&<div style={{animation:"fadeUp 0.6s ease"}}>
      {/* Hero */}
      <div className="hero-pad" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"0"}}>
        {/* Dark gradient background */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg, #020617 0%, #0A1628 30%, #0C1E3A 55%, #0A1628 80%, #020617 100%)",zIndex:0}}/>
        {/* Star twinkling canvas */}
        <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:1,pointerEvents:"none"}}/>
        {/* Animated gradient orbs */}
        <div style={{position:"absolute",top:"-10%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,113,227,0.15) 0%,transparent 70%)",filter:"blur(80px)",pointerEvents:"none",zIndex:2,animation:"float 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"-15%",left:"-8%",width:450,height:450,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,113,227,0.10) 0%,transparent 70%)",filter:"blur(60px)",pointerEvents:"none",zIndex:2,animation:"float 10s ease-in-out infinite reverse"}}/>
        <div style={{position:"absolute",top:"40%",left:"50%",transform:"translateX(-50%)",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,113,227,0.06) 0%,transparent 60%)",filter:"blur(100px)",pointerEvents:"none",zIndex:2}}/>

        {/* Hero Content */}
        <div style={{position:"relative",zIndex:10,width:"100%",maxWidth:1200,margin:"0 auto",padding:"120px 32px 0",display:"flex",flexDirection:"column",alignItems:"center"}}>
          {/* Top badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,113,227,0.15)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid rgba(0,113,227,0.25)",borderRadius:980,padding:"7px 20px",marginBottom:36,fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:11,color:"#5CB8FF",letterSpacing:"0.5px"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#4ADE80",display:"inline-block",boxShadow:"0 0 8px rgba(74,222,128,0.6)",animation:"blink 2s infinite"}}/>
            Live · 8 AI Agents · India's smartest job-hunting AI
          </div>

          {/* Headline */}
          <h1 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:"clamp(40px,9vw,96px)",lineHeight:1,letterSpacing:"-2px",marginBottom:28,maxWidth:900,textAlign:"center",color:"#FFFFFF"}}>
            Land your<br/><span style={{background:"linear-gradient(135deg,#3B9AFF 0%,#0071E3 50%,#5CB8FF 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>dream job</span><br/><span style={{fontSize:"0.68em",color:"rgba(255,255,255,0.85)",letterSpacing:"-1px"}}>in 30 days.</span>
          </h1>

          {/* Subtitle */}
          <p style={{fontSize:16,color:"rgba(255,255,255,0.6)",maxWidth:580,lineHeight:1.8,marginBottom:44,textAlign:"center",fontFamily:"'Wix Madefor Text',sans-serif"}}>8 AI agents work 24/7 — scanning 9 job boards, crafting 98%+ ATS resumes, auto-applying, building referral networks & booking your interview calls.</p>

          {/* CTA Buttons */}
          <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",marginBottom:56}}>
            <button onClick={()=>navTo("app")} style={{background:"#0071E3",border:"none",borderRadius:980,padding:"16px 36px",color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",cursor:"pointer",boxShadow:"0 0 30px rgba(0,113,227,0.4), 0 4px 14px rgba(0,113,227,0.3)",transition:"all 0.3s ease"}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 50px rgba(0,113,227,0.6), 0 8px 24px rgba(0,113,227,0.4)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 0 30px rgba(0,113,227,0.4), 0 4px 14px rgba(0,113,227,0.3)";e.currentTarget.style.transform="translateY(0)";}}>Launch free trial</button>
            <button onClick={()=>navTo("pricing")} style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:980,padding:"16px 36px",color:"rgba(255,255,255,0.8)",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",cursor:"pointer",transition:"all 0.3s ease"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.14)";e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";e.currentTarget.style.color="rgba(255,255,255,0.8)";}}>View pricing</button>
          </div>

          {/* Floating Dashboard Mockup */}
          <div style={{width:"100%",maxWidth:860,margin:"0 auto 48px",background:"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"20px 24px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            {/* Mock terminal bar */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <div style={{display:"flex",gap:6}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:"#FF5F57"}}/>
                <div style={{width:10,height:10,borderRadius:"50%",background:"#FEBC2E"}}/>
                <div style={{width:10,height:10,borderRadius:"50%",background:"#28C840"}}/>
              </div>
              <div style={{flex:1,textAlign:"center",fontFamily:"'Wix Madefor Text',sans-serif",fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:500}}>JobHunter.AI — Agent Dashboard</div>
            </div>
            {/* Agent status mini-bars */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {AGENTS.slice(0,4).map((a,i)=>(
                <div key={a.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:16}}>{a.emoji}</span>
                    <span style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,color:"rgba(255,255,255,0.8)",letterSpacing:"-0.2px"}}>{a.name}</span>
                    <div style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:"#4ADE80",boxShadow:"0 0 6px rgba(74,222,128,0.5)",animation:"blink 1.5s infinite"}}/>
                  </div>
                  <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${70+i*10}%`,background:"linear-gradient(90deg,#0071E3,#5CB8FF)",borderRadius:2,transition:"width 1s ease"}}/>
                  </div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:6,fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,textTransform:"uppercase"}}>{a.steps[a.steps.length-1]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Row - Glassmorphism cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,width:"100%",maxWidth:860,marginBottom:60}} className="mobile-col">
            {[["10,000+","Resumes Optimised","📄"],["94%","Interview Call Rate","📞"],["₹28 LPA","Avg Salary Landed","💰"],["48 hrs","Avg Time to Interview","⚡"]].map(([v,l,icon])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"20px 16px",textAlign:"center",transition:"all 0.3s ease"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.borderColor="rgba(0,113,227,0.3)";e.currentTarget.style.transform="translateY(-4px)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.transform="translateY(0)";}}>
                <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:28,background:"linear-gradient(135deg,#FFFFFF,#5CB8FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",letterSpacing:"-0.5px",marginBottom:4}}>{v}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",letterSpacing:"0.5px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,textTransform:"uppercase"}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap",justifyContent:"center",paddingBottom:48}}>
            {["🔒 256-bit encrypted","⚡ Instant activation","🇮🇳 Built for India","💳 Razorpay secured"].map(t=>(
              <span key={t} style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.5px"}}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="section-pad" style={{padding:"120px 32px",background:"#FFFFFF"}}>
        <div style={{textAlign:"center",marginBottom:64}}>
          <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,fontSize:12,color:"#0071E3",textTransform:"uppercase",letterSpacing:"2px",marginBottom:16}}>Intelligence at scale</div>
          <h2 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:"clamp(40px,8vw,80px)",letterSpacing:"-2px",lineHeight:1.05}}>8 agents. One mission.<br/><span style={{background:"linear-gradient(90deg,#0071E3,#5CB8FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Automating your career.</span></h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24,maxWidth:1200,margin:"0 auto"}}>
          {AGENTS.map((a,i)=>(
            <div key={a.id} className="agent-feature" style={{background:"#F5F5F7",borderRadius:32,padding:"36px 32px",transition:"all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",cursor:"pointer",position:"relative",overflow:"hidden",boxShadow:"0 0 0 rgba(0,0,0,0)"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.02)";e.currentTarget.style.boxShadow="0 20px 40px rgba(0,0,0,0.08)";e.currentTarget.style.background="#FFFFFF";} } onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 0 0 rgba(0,0,0,0)";e.currentTarget.style.background="#F5F5F7";}}>
              <div style={{fontSize:42,marginBottom:20}}>{a.emoji}</div>
              <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:22,color:"#1D1D1F",letterSpacing:"-0.5px",marginBottom:6}}>{a.name}</div>
              <div style={{fontSize:13,color:"#0071E3",marginBottom:16,fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,background:"rgba(0,113,227,0.1)",display:"inline-block",padding:"4px 10px",borderRadius:6}}>{a.role}</div>
              <div style={{fontSize:15,color:"#86868B",lineHeight:1.6,fontWeight:500}}>{a.steps[a.steps.length-1]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="section-pad" style={{padding:"120px 32px",background:"#F5F5F7"}}>
        <div style={{textAlign:"center",marginBottom:64}}><h2 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:"clamp(36px,8vw,70px)",letterSpacing:"-1.5px",color:"#1D1D1F"}}>Simplicity is the <br/>ultimate sophistication.</h2></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:32,maxWidth:1100,margin:"0 auto"}}>
          {[{n:"01",t:"Upload Resume",d:"Drop your PDF. Claude AI extracts your skills, experience, and achievements instantly with zero configuration."},{n:"02",t:"Set Your Target",d:"Define your dream role, ideal location, and salary expectations. Our intelligence configures the hunt."},{n:"03",t:"Agents Deploy",d:"Our swarm of 8 AI agents goes to work 24/7. They scan, optimize, network, and apply simultaneously."},{n:"04",t:"Get Interviews",d:"Wake up to automated referral requests sent, optimal applications submitted, and your prep kit ready."}].map(s=>(
            <div key={s.n} style={{position:"relative",padding:"40px 30px",background:"#FFFFFF",borderRadius:32,boxShadow:"0 10px 30px rgba(0,0,0,0.03)"}}>
              <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:80,background:"linear-gradient(135deg,#D2D2D7, #F5F5F7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",lineHeight:1,marginBottom:20,letterSpacing:"-4px"}}>{s.n}</div>
              <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:20,letterSpacing:"-0.3px",marginBottom:12,color:"#1D1D1F"}}>{s.t}</div>
              <div style={{fontSize:15,color:"#86868B",lineHeight:1.6,fontWeight:500}}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="section-pad" style={{padding:"120px 32px",background:"#FFFFFF"}}>
        <div style={{textAlign:"center",marginBottom:64}}><h2 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:"clamp(36px,7vw,60px)",letterSpacing:"-1px"}}>Don't just take our <span style={{color:"#0071E3"}}>word for it.</span></h2></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24,maxWidth:1100,margin:"0 auto"}}>
          {[{q:"Got 3 interview calls in 48 hours. The intelligent resume parsing and structural optimisation is absolutely insane.",n:"Priya S.",r:"Product Manager",loc:"Bengaluru",color:"#5E5CE6"},{q:"Applied to 47 targeted jobs in one night. Would have taken me 2 tedious weeks manually. Magical experience.",n:"Arjun M.",r:"SDE II",loc:"Hyderabad",color:"#FF9F0A"},{q:"The referral finder algorithm got me a warm intro at my dream company. That's exactly how I landed the job.",n:"Sneha K.",r:"Data Analyst",loc:"Pune",color:"#32ADE6"}].map((t,i)=>(
            <div key={i} style={{background:"#F5F5F7",borderRadius:32,padding:"40px",display:"flex",flexDirection:"column"}}>
              <div style={{fontSize:40,color:t.color,fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,marginBottom:16,lineHeight:0.5,opacity:0.8}}>“</div>
              <div style={{fontSize:17,color:"#1D1D1F",lineHeight:1.5,fontWeight:500,marginBottom:32,flex:1}}>{t.q}</div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:`rgba(${parseInt(t.color.slice(1,3),16)},${parseInt(t.color.slice(3,5),16)},${parseInt(t.color.slice(5,7),16)},0.15)`,color:t.color,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:20}}>{t.n[0]}</div>
                <div><div style={{fontSize:15,color:"#1D1D1F",fontWeight:700,letterSpacing:"-0.2px"}}>{t.n}</div><div style={{fontSize:13,color:"#86868B",fontWeight:500}}>{t.r} · {t.loc}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="section-pad" style={{padding:"0 16px 80px",background:"#FFFFFF"}}>
        <div style={{background:"linear-gradient(160deg, #020617 0%, #0A1628 50%, #020617 100%)",borderRadius:"40px",maxWidth:1200,margin:"0 auto",padding:"100px 32px",textAlign:"center",position:"relative",overflow:"hidden"}}>
          {/* subtle decorative blur behind */}
          <div style={{position:"absolute",top:"-30%",left:"50%",transform:"translateX(-50%)",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,113,227,0.15) 0%,transparent 60%)",filter:"blur(80px)",pointerEvents:"none"}}/>
          
          <h2 style={{position:"relative",zIndex:2,fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:"clamp(40px,7vw,80px)",letterSpacing:"-2px",marginBottom:24,color:"#FFFFFF",lineHeight:1.05}}>Stop applying manually.<br/><span style={{background:"linear-gradient(90deg,#5CB8FF,#0071E3)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Let intelligence do the work.</span></h2>
          <p style={{position:"relative",zIndex:2,fontSize:18,color:"rgba(255,255,255,0.6)",marginBottom:48,maxWidth:500,margin:"0 auto 48px",fontWeight:500}}>Join thousands of professionals across India landing their absolute dream jobs with JobHunter.AI today.</p>
          <div style={{position:"relative",zIndex:2,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>navTo("app")} style={{background:"#FFFFFF",border:"none",borderRadius:980,padding:"18px 40px",color:"#1D1D1F",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:18,letterSpacing:"-0.3px",cursor:"pointer",transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>Start hunting instantly</button>
            <button onClick={()=>navTo("pricing")} style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:980,padding:"18px 40px",color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:18,letterSpacing:"-0.3px",cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>Compare plans</button>
          </div>
        </div>
      </div>
    </div>}

    {/* ═══ Pricing ═══ */}
    {page==="pricing"&&<div style={{padding:"60px 24px",animation:"fadeUp 0.5s ease"}}>
      <div style={{textAlign:"center",marginBottom:56}}>
        <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:10,color:"#0071E3",letterSpacing:4,marginBottom:14}}>Transparent pricing. No hidden fees.</div>
        <h1 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:"clamp(32px,9vw,76px)",letterSpacing:"-0.3px",marginBottom:16}}>Invest in your<br/><span style={{color:"#0071E3"}}>career.</span></h1>
        <p style={{fontSize:14,color:"#86868B",maxWidth:440,margin:"0 auto",lineHeight:1.8}}>One interview offer pays back your investment 100x. Cancel anytime.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,maxWidth:1000,margin:"0 auto 64px",alignItems:"center"}}>
        {PACKAGES.map((pkg,i)=><PricingCard key={pkg.name} pkg={pkg} userName={form.name} isPopular={i===1}/>)}
      </div>

      {/* How to pay with Razorpay */}
      <div className="card-pad" style={{maxWidth:700,margin:"0 auto 60px",background:"#FFFFFF",border:"none",borderRadius:20,padding:"36px"}}>
        <h3 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:22,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:20}}>💳 PAYMENT VIA RAZORPAY</h3>
        <div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {["UPI (GPay, PhonePe, Paytm)","Debit & Credit Cards","Net Banking (All major banks)","EMI (No-cost EMI available)"].map(m=>(
            <div key={m} style={{display:"flex",gap:10,alignItems:"center"}}><span style={{color:"#0071E3",fontSize:14}}>✓</span><span style={{fontSize:12,color:"#424245"}}>{m}</span></div>
          ))}
        </div>
        <div style={{marginTop:16,fontSize:11,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>🔒 256-bit SSL encrypted · RBI compliant · Instant activation after payment</div>
      </div>

      {/* Comparison table */}
      <div className="card-pad" style={{maxWidth:820,margin:"0 auto 60px",background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:20,boxShadow:"0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)",padding:"36px"}}>
        <h3 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:22,color:"#0071E3",letterSpacing:"-0.3px",textAlign:"center",marginBottom:28}}>How we compare.</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Tool","Price","ATS Resume","Auto Apply","LinkedIn Auto","Referrals","India"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:9,letterSpacing:"-0.1px",borderBottom:"1px solid #D2D2D7"}}>{h}</th>)}</tr></thead>
            <tbody>
              {[["JobHunter.AI ⚡","₹999–₹7,999","✅","✅","✅","✅","✅"],["Naukri Resume","₹1,500–₹5,000","✅","❌","❌","❌","✅"],["LinkedIn Helper","₹3,500/mo","❌","❌","✅","❌","❌"],["Hiration","₹2,500–₹8,000","✅","❌","❌","❌","✅"],["TopResume","₹4,000–₹12,000","✅","❌","❌","❌","❌"]].map((row,i)=>(
                <tr key={i} style={{background:i===0?"rgba(0,113,227,0.04)":"transparent"}}>
                  {row.map((cell,j)=><td key={j} style={{padding:"12px",borderBottom:"1px solid #D2D2D7",color:i===0?(j===0?"#0071E3":"#1D1D1F"):"#86868B",fontWeight:i===0?"600":"400"}}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <h3 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:26,letterSpacing:"-0.3px",textAlign:"center",marginBottom:28}}>Frequently asked questions</h3>
        {[["Is auto-applying legal?","Yes. We use official APIs for job search. For LinkedIn, our Chrome Extension acts exactly like a human using their browser — same as manual clicking, just faster."],["How quickly will I get interviews?","Most Hunter and Closer plan users get their first interview call within 48–72 hours of launching a mission."],["Do you guarantee results?","We guarantee the technology works as described. Results depend on your profile, experience and market. We offer a 7-day money-back guarantee."],["Is my resume data safe?","Your resume is processed by Claude AI (Anthropic) and is never permanently stored on our servers."],["How does Razorpay payment work?","After clicking 'Get Started', a secure Razorpay popup opens. Pay via UPI, card or net banking. Your plan activates instantly after payment."]].map(([q,a],i)=>(
          <div key={i} style={{borderBottom:"1px solid #D2D2D7",padding:"20px 0"}}>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.1px",color:"#1D1D1F",marginBottom:8}}>{q}</div>
            <div style={{fontSize:12,color:"#86868B",lineHeight:1.8}}>{a}</div>
          </div>
        ))}
      </div>
    </div>}

    {/* ═══ Extension ═══ */}
    {page==="extension"&&<div style={{padding:"60px 24px",animation:"fadeUp 0.5s ease",maxWidth:920,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{fontSize:60,marginBottom:16,animation:"float 3s ease infinite"}}>🔌</div>
        <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:10,color:"#0071E3",letterSpacing:4,marginBottom:12}}>Chrome Extension · Closer Plan only</div>
        <h1 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:"clamp(36px,5vw,68px)",letterSpacing:"-0.3px",marginBottom:16}}>LinkedIn<br/><span style={{color:"#0071E3"}}>Autopilot.</span></h1>
        <p style={{fontSize:14,color:"#86868B",maxWidth:520,margin:"0 auto",lineHeight:1.9}}>Our Chrome Extension runs inside your own browser — sending connection requests, referral messages and Easy Apply jobs like a human, at scale.</p>
      </div>

      <div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:48}}>
        {[{e:"🤝",t:"Auto Connection Requests",d:"Sends 20–50 connection requests/day to HRs, hiring managers and recruiters at your target companies. Stays within LinkedIn's safe daily limits to protect your account."},{e:"💬",t:"Personalised Referral Messages",d:"AI-crafted referral messages sent to your 2nd-degree connections. Each message uses their name, company and your relevant experience — never generic copy-paste."},{e:"🚀",t:"One-Click Easy Apply",d:"Automatically fills and submits LinkedIn Easy Apply jobs using your optimised resume. Applies to 50–100 matching jobs per day while you sleep."},{e:"📊",t:"Reply Tracking Dashboard",d:"Tracks who viewed your profile, accepted connections, replied to messages — all synced back to your JobHunter.AI dashboard in real time."}].map(f=>(
          <div key={f.t} className="agent-feature" style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:14,padding:"24px",transition:"all 0.3s"}}>
            <div style={{fontSize:28,marginBottom:12}}>{f.e}</div>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.1px",color:"#0071E3",marginBottom:8}}>{f.t}</div>
            <div style={{fontSize:12,color:"#86868B",lineHeight:1.7}}>{f.d}</div>
          </div>
        ))}
      </div>

      <div className="card-pad" style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:20,padding:"36px",marginBottom:36}}>
        <h3 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:22,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:24}}>How to install — 5 steps.</h3>
        {[{n:"01",t:"Subscribe to Closer Plan",d:"Chrome Extension is exclusive to ₹7,999/mo Closer subscribers. Click the button below to get started."},
          {n:"02",t:"Receive Download Link",d:"After payment confirmation, you'll receive an email with the .crx extension file within 24 hours."},
          {n:"03",t:"Install in Chrome",d:"Open Chrome → go to chrome://extensions → enable Developer Mode (top right) → drag and drop the .crx file → click 'Add Extension'."},
          {n:"04",t:"Log into LinkedIn",d:"Open LinkedIn.com in Chrome and make sure you're logged into your account."},
          {n:"05",t:"Configure & Launch",d:"Click the JobHunter.AI icon in your Chrome toolbar → enter your target role & companies → set daily limits → click Start Autopilot."}].map(s=>(
          <div key={s.n} style={{display:"flex",gap:20,marginBottom:24,alignItems:"flex-start"}}>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:36,color:"#0071E3",opacity:0.3,flexShrink:0,lineHeight:1,marginTop:2}}>{s.n}</div>
            <div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.1px",marginBottom:5,color:"#1D1D1F"}}>{s.t}</div><div style={{fontSize:12,color:"#86868B",lineHeight:1.7}}>{s.d}</div></div>
          </div>
        ))}
      </div>

      <div style={{background:"rgba(0,113,227,0.04)",border:"none",borderRadius:14,padding:"20px 24px",marginBottom:36}}>
        <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:8}}>⚡ Safety built in — your account is protected</div>
        <div style={{fontSize:12,color:"#86868B",lineHeight:1.8}}>The extension mimics human behaviour with random delays between actions, daily connection limits (max 50/day), human-like typing speed and natural scroll patterns. We recommend starting at 20 connections/day and gradually increasing. These precautions keep your LinkedIn account completely safe.</div>
      </div>

      <div style={{textAlign:"center"}}>
        <button onClick={()=>navTo("pricing")} style={{background:"#0071E3",border:"none",borderRadius:980,padding:"14px 28px",color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",cursor:"pointer",boxShadow:"none"}}>Get Closer plan</button>
      </div>
    </div>}

    {/* ═══ APP ═══ */}
    {page==="app"&&<div style={{maxWidth:1100,margin:"0 auto",padding:"104px 20px 24px"}}>

      {/* FORM */}
      {phase==="form"&&<div style={{animation:"fadeUp 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:10,color:"#0071E3",letterSpacing:4,marginBottom:12}}>Mission control</div>
          <h1 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:"clamp(32px,5vw,58px)",letterSpacing:"-0.3px",lineHeight:1,marginBottom:12}}>Configure your<br/><span style={{color:"#0071E3"}}>job hunt</span></h1>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:32}}>
          {AGENTS.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,113,227,0.06)",border:"none",borderRadius:20,padding:"5px 12px",fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,letterSpacing:"-0.1px"}}><span>{a.emoji}</span>{a.name}</div>)}
        </div>
        <div className="card-pad" style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:20,padding:"36px",maxWidth:800,margin:"0 auto"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:24}}>▸ Mission parameters</div>
          <div style={{marginBottom:24}}>
            <label style={lbl}>Upload Resume (PDF) — <span style={{color:"#0071E3"}}>Claude AI will analyse it</span></label>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${dragOver?"#0071E3":resumeFile?"#0071E3":"#D2D2D7"}`,borderRadius:12,padding:"32px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(0,113,227,0.04)":resumeFile?"rgba(0,113,227,0.02)":"#E0F7FA",transition:"all 0.2s"}}>
              <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
              {resumeFile?<div><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.1px"}}>{resumeFile.name}</div><div style={{fontSize:10,color:"#1D1D1F",marginTop:4}}>Click to change</div></div>
              :<div><div style={{fontSize:36,marginBottom:8}}>📄</div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.1px"}}>Drop your PDF resume here</div><div style={{fontSize:10,color:"#1D1D1F",marginTop:4}}>or click to browse · PDF only</div></div>}
            </div>
          </div>
          <div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label style={lbl}>Your Name</label><input style={inp} placeholder="e.g. Satish Kumar" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label style={lbl}>Target Role *</label><input style={inp} placeholder="e.g. Senior Product Manager" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></div>
          </div>
          <div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label style={lbl}>Experience</label><select style={inp} value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})}><option value="">Select</option>{["0–1 years","1–3 years","3–5 years","5–8 years","8–12 years","12+ years"].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label style={lbl}>Location</label><input style={inp} placeholder="Bengaluru" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
          </div>
          <div style={{marginBottom:14}}><label style={lbl}>Key Skills (comma-separated)</label><input style={inp} placeholder="Product Strategy, SQL, Figma, Data Analysis" value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})}/></div>
          <div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:28}}>
            <div><label style={lbl}>Expected CTC</label><input style={inp} placeholder="₹25–35 LPA" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/></div>
            <div><label style={lbl}>Work Mode</label><select style={inp} value={form.workMode} onChange={e=>setForm({...form,workMode:e.target.value})}>{["On-site","Hybrid","Remote","Any"].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label style={lbl}>Notice Period</label><select style={inp} value={form.notice} onChange={e=>setForm({...form,notice:e.target.value})}>{["Immediate","15 days","30 days","45 days","60 days","90 days"].map(x=><option key={x}>{x}</option>)}</select></div>
          </div>
          <button onClick={startMission} disabled={!form.role.trim()} style={{width:"100%",padding:"18px",background:form.role.trim()?"#0071E3":"#D2D2D7",border:"none",borderRadius:12,cursor:form.role.trim()?"pointer":"not-allowed",color:form.role.trim()?"#FFFFFF":"#1D1D1F",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",boxShadow:form.role.trim()?"0 0 30px rgba(0,113,227,0.4)":"none",transition:"all 0.3s",animation:"none"}}>⚡ LAUNCH 8-AGENT MISSION</button>
        </div>
      </div>}

      {/* RUNNING */}
      {phase==="running"&&<div style={{animation:"fadeUp 0.4s ease"}}>
        <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:16,padding:"22px 28px",marginBottom:22,textAlign:"center"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.5px",marginBottom:10}}>Mission in progress — {overallProg}% complete</div>
          <div style={{height:4,background:"#F1F5F9",borderRadius:4,overflow:"hidden",maxWidth:400,margin:"0 auto"}}><div style={{height:"100%",width:`${overallProg}%`,background:"linear-gradient(90deg,#0071E3,#D2D2D7)",borderRadius:4,transition:"width 0.5s ease"}}/></div>
          <div style={{marginTop:10,fontSize:10,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{agentStates.filter(s=>s==="done").length} / {AGENTS.length} agents complete</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {AGENTS.map((a,i)=><AgentCard key={a.id} agent={a} state={agentStates[i]} currentStep={i===curAgent?a.steps[curStep]:null} progress={i===curAgent?progress:0}/>)}
        </div>
        <div style={{marginTop:14,background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:10,padding:"14px 18px",maxHeight:140,overflowY:"auto"}}>
          <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,fontSize:11,color:"#86868B",letterSpacing:"-0.1px",marginBottom:8}}>System log</div>
          {log.map((l,i)=><div key={i} style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:11,color:"#4B5563",marginBottom:4}}><span style={{color:"#0071E3"}}>[{l.t}]</span> {l.msg}</div>)}
        </div>
      </div>}

      {/* DASHBOARD */}
      {phase==="dashboard"&&<div style={{animation:"fadeUp 0.5s ease"}}>
        <div style={{background:"linear-gradient(135deg,#F0F8FF,#E0F7FA)",border:"none",borderRadius:14,padding:"18px 24px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:3}}>✓ Mission complete — all 8 agents deployed</div><div style={{fontSize:11,color:"rgba(0,113,227,0.5)"}}>{form.name||"You"}'s job hunt is live · {jobs.length} jobs found · Agents active 24/7</div></div>
          <div style={{display:"flex",gap:10}}>
            {resumeData&&<button onClick={()=>setShowTemplatePicker(true)} style={{background:"#0071E3",border:"none",borderRadius:8,padding:"10px 18px",color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:12,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"none"}}>⬇ Download resume</button>}
            <button onClick={()=>setPhase("form")} style={{background:"transparent",border:"1px solid #E5E5EA",borderRadius:8,padding:"10px 18px",color:"#86868B",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:12,letterSpacing:"-0.3px",cursor:"pointer"}}>↺ New mission</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
          {[{l:"Jobs Found",v:jobs.length,s:"real listings",c:"#0071E3"},{l:"Applied",v:jobs.length,s:"auto-submitted",c:"#D2D2D7"},{l:"ATS Score",v:resumeData?`${resumeData.atsScore}%`:"N/A",s:"your resume",c:"#0071E3"},{l:"Referrals",v:"8",s:"active",c:"#D2D2D7"},{l:"Interviews",v:"3",s:"calls booked",c:"#0071E3"},{l:"Cover Letters",v:jobs.length,s:"personalised",c:"#D2D2D7"}].map(s=>(
            <div key={s.l} style={{background:"#FFFFFF",border:`1px solid ${s.c}18`,borderRadius:980,padding:"14px",textAlign:"center"}}>
              <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:26,color:s.c,letterSpacing:"-0.1px"}}>{s.v}</div>
              <div style={{fontSize:11,color:"#424245",marginBottom:1}}>{s.l}</div>
              <div style={{fontSize:10,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:18,overflowX:"auto",paddingBottom:4}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#0071E3":"transparent",border:`1px solid ${tab===t.id?"#0071E3":"#D2D2D7"}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",color:tab===t.id?"#FFFFFF":"#86868B",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,letterSpacing:"-0.1px",whiteSpace:"nowrap",transition:"all 0.2s"}}>{t.l}</button>)}
        </div>

        {tab==="pipeline"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {AGENTS.map(a=><div key={a.id} style={{background:"#FFFFFF",border:"none",borderRadius:16,padding:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:20}}>{a.emoji}</span>
              <div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.1px"}}>{a.name}</div><div style={{fontSize:11,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{a.role}</div></div>
              <div style={{marginLeft:"auto",fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>✓</div>
            </div>
            <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:11,color:"#6B7280"}}>{a.steps[a.steps.length-1]}</div>
          </div>)}
        </div>}

        {tab==="jobs"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {jobs.map(job=>(
            <div key={job.id}>
              <div className="job-row" onClick={()=>setExpandedJob(expandedJob===job.id?null:job.id)} style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:16,boxShadow:"0 2px 12px rgba(0,0,0,0.03)",padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",transition:"all 0.2s"}}>
                <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,background:`conic-gradient(#0071E3 ${job.match*3.6}deg,#D2D2D7 0deg)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:12,color:"#0071E3"}}>{job.match}%</div>
                </div>
                <div style={{flex:1}}><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,letterSpacing:"-0.1px",color:"#1D1D1F",marginBottom:2}}>{job.title}</div><div style={{fontSize:11,color:"#86868B"}}>{job.company} · {job.location}</div></div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#0071E3",background:"rgba(0,113,227,0.08)",border:"none",borderRadius:6,padding:"3px 9px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{job.status}</span>
                  <span style={{fontSize:10,color:"#6B7280",background:"#F1F5F9",borderRadius:6,padding:"3px 9px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{job.source}</span>
                  <span style={{fontSize:10,color:"#1D1D1F"}}>{job.salary}</span>
                  {job.applyUrl&&job.applyUrl!=="#"&&<a href={job.applyUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:"#1D1D1F",background:"#0071E3",borderRadius:6,padding:"4px 10px",textDecoration:"none",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,letterSpacing:"-0.1px"}}>Apply →</a>}
                </div>
              </div>
              {expandedJob===job.id&&<div style={{background:"#F5F5F7",border:"1px solid rgba(0,113,227,0.08)",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"16px 18px"}}>
                <div style={{fontSize:11,color:"#1D1D1F",lineHeight:1.6,marginBottom:12,fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{job.description}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                  {[{l:"ATS Score",v:`${job.resumeScore}%`},{l:"Referral",v:"Searching..."},{l:"Interview",v:"Application sent"}].map(d=>(
                    <div key={d.l} style={{background:"#FFFFFF",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:11,color:"#6B7280",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:4}}>{d.l}</div>
                      <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:14,color:"#0071E3",letterSpacing:"-0.1px"}}>{d.v}</div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>
          ))}
        </div>}

        {tab==="resume"&&<div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#FFFFFF",border:"none",borderRadius:14,padding:"24px"}}>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:18}}>Forge — AI Analysis</div>
            {resumeData?(<>
              <div style={{background:"#F5F5F7",borderRadius:980,padding:"14px",marginBottom:16}}>
                <div style={{fontSize:11,color:"#6B7280",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:4}}>Candidate</div>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:18,color:"#1D1D1F",letterSpacing:"-0.1px"}}>{resumeData.name}</div>
                <div style={{fontSize:10,color:"#86868B",marginTop:2}}>{resumeData.currentRole}</div>
              </div>
              {[{l:"ATS Score",v:`${resumeData.atsScore}%`,b:resumeData.atsScore},{l:"Keyword Coverage",v:"96%",b:96},{l:"Format Score",v:"100%",b:100}].map(s=>(
                <div key={s.l} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#86868B"}}>{s.l}</span><span style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:11,color:"#0071E3"}}>{s.v}</span></div>
                  <div style={{height:3,background:"#F1F5F9",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${s.b}%`,background:"#0071E3",borderRadius:2}}/></div>
                </div>
              ))}
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Top skills detected</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{resumeData.topSkills?.map(s=><span key={s} style={{fontSize:11,color:"#0071E3",background:"rgba(0,113,227,0.08)",border:"none",borderRadius:6,padding:"4px 10px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{s}</span>)}</div>
              </div>
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Gaps to address</div>
                {resumeData.gaps?.map((g,i)=><div key={i} style={{fontSize:11,color:"rgba(0,113,227,0.6)",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:4}}>⚠ {g}</div>)}
              </div>
              <button onClick={()=>setShowTemplatePicker(true)} style={{marginTop:18,width:"100%",padding:"12px",background:"#0071E3",border:"none",borderRadius:10,color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"none"}}>⬇ Download optimised resume</button>
            </>):(<div style={{textAlign:"center",padding:"28px 0",color:"#1D1D1F"}}><div style={{fontSize:32,marginBottom:12}}>📄</div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.1px",marginBottom:8}}>No resume uploaded</div><div style={{fontSize:11,color:"#1D1D1F",lineHeight:1.6}}>Upload a PDF on the form screen to get real Claude AI analysis</div></div>)}
          </div>
          <div style={{background:"#FFFFFF",border:"1px solid rgba(0,113,227,0.08)",borderRadius:14,padding:"24px"}}>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:18}}>AI-generated bullets</div>
            {(bullets.length?bullets:["Led cross-functional team to deliver 3 product launches increasing revenue by 42%","Defined product roadmap for platform serving 2M+ users using data-driven prioritisation","Reduced customer churn by 18% through NPS analysis and feature iteration","Built 0→1 B2B SaaS product growing to 500 paying customers in 8 months","Shipped 47 features in 2 quarters maintaining 99.2% uptime"]).map((b,i)=>(
              <div key={i} style={{marginBottom:10,padding:"10px 14px",background:"#F5F5F7",borderRadius:8,fontSize:11,color:"#424245",lineHeight:1.6,fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,borderLeft:"2px solid #0071E3"}}>▸ {b}</div>
            ))}
            {resumeData?.suggestedKeywords?.length>0&&<div style={{marginTop:14}}>
              <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Keywords to add to your resume</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{resumeData.suggestedKeywords.map(k=><span key={k} style={{fontSize:11,color:"#D97706",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:6,padding:"4px 10px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{k}</span>)}</div>
            </div>}
          </div>
        </div>}

        {tab==="network"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {[{name:"Priya Sharma",co:"Razorpay",role:"Senior PM",conn:"2nd degree",status:"Replied ✓",msg:"Referral request sent"},{name:"Rohit Kumar",co:"Meesho",role:"PM Platform",conn:"Alumni IIM B",status:"Pending",msg:"Connection request sent"},{name:"Ananya Gupta",co:"PhonePe",role:"Eng Manager",conn:"3rd degree",status:"Connected ✓",msg:"Intro message sent"},{name:"Vikram Nair",co:"Swiggy",role:"Director PM",conn:"Alumni BITS",status:"Replied ✓",msg:"Call scheduled"},{name:"Sneha Patel",co:"CRED",role:"Hiring Manager",conn:"2nd degree",status:"Pending",msg:"Referral DM queued"},{name:"Arjun Mehta",co:"Chargebee",role:"VP Product",conn:"Ex-colleague",status:"Replied ✓",msg:"Referred internally"}].map((p,i)=>(
            <div key={i} style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:16,padding:"16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`hsl(${i*55},35%,12%)`,border:`1px solid hsl(${i*55},35%,20%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,color:`hsl(${i*55},70%,55%)`}}>{p.name[0]}</div>
                <div><div style={{fontSize:13,color:"#1D1D1F",fontWeight:600}}>{p.name}</div><div style={{fontSize:11,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{p.role} @ {p.co}</div></div>
              </div>
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <span style={{fontSize:10,color:"#0071E3",background:"rgba(0,113,227,0.07)",borderRadius:6,padding:"3px 9px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{p.conn}</span>
                <span style={{fontSize:10,color:p.status.includes("✓")?"#4ade80":"#FBBF24",background:p.status.includes("✓")?"rgba(74,222,128,0.07)":"rgba(251,191,36,0.07)",borderRadius:6,padding:"3px 9px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{p.status}</span>
              </div>
              <div style={{fontSize:11,color:"#6B7280",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{p.msg}</div>
            </div>
          ))}
        </div>}

        {tab==="interviews"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[{company:"PhonePe",role:"Associate Director",type:"Recruiter Screening",date:"Apr 2, 2026",time:"11:00 AM",mode:"Google Meet",prep:["Tell me about yourself","Why PhonePe?","Biggest product shipped?","Conflict resolution"],score:92},{company:"Razorpay",role:"Senior Product Manager",type:"Hiring Manager Round",date:"Apr 4, 2026",time:"3:00 PM",mode:"Zoom",prep:["Improve checkout flow","Metrics for payments","Prioritisation framework","API understanding"],score:97},{company:"Swiggy",role:"Exploratory Chat",type:"Referral Call",date:"Apr 5, 2026",time:"6:30 PM",mode:"Phone Call",prep:["Your background","Open roles","Culture fit"],score:86}].map((iv,i)=>(
            <div key={i} style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:14,padding:"20px 22px",display:"grid",gridTemplateColumns:"1fr auto",gap:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.1px",color:"#1D1D1F"}}>{iv.company}</div>
                  <span style={{fontSize:10,color:"#0071E3",background:"rgba(0,113,227,0.08)",border:"none",borderRadius:6,padding:"3px 9px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{iv.type}</span>
                </div>
                <div style={{fontSize:12,color:"#86868B",marginBottom:10}}>{iv.role}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>{[`📅 ${iv.date}`,`🕐 ${iv.time}`,`📹 ${iv.mode}`].map(t=><span key={t} style={{fontSize:11,color:"#6B7280",background:"#F1F5F9",borderRadius:8,padding:"5px 12px"}}>{t}</span>)}</div>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:6}}>Sage prep questions</div>
                {iv.prep.map((q,j)=><div key={j} style={{fontSize:11,color:"#4B5563",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:5}}>▸ {q}</div>)}
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:34,color:"#0071E3",letterSpacing:"-0.1px"}}>{iv.score}%</div>
                <div style={{fontSize:11,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,letterSpacing:"-0.1px"}}>Prep<br/>ready</div>
              </div>
            </div>
          ))}
        </div>}

        {tab==="log"&&<div style={{background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:14,padding:"18px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:11,maxHeight:480,overflowY:"auto"}}>
          {log.map((l,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:5}}><span style={{color:"#0071E3",flexShrink:0}}>[{l.t}]</span><span style={{color:"#4B5563"}}>{l.msg}</span></div>)}
        </div>}
      </div>}
    </div>}

    {/* TEMPLATE PICKER MODAL */}
    {showTemplatePicker&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowTemplatePicker(false)}>
      <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",maxWidth:820,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:22,color:"#1D1D1F",letterSpacing:"-0.5px"}}>Choose Your Template</div>
            <div style={{fontSize:12,color:"#86868B",marginTop:4}}>All templates are 100% ATS-optimized with perfect formatting</div>
          </div>
          <button onClick={()=>setShowTemplatePicker(false)} style={{background:"#F5F5F7",border:"none",borderRadius:10,width:36,height:36,fontSize:18,color:"#86868B",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:16}}>
          {RESUME_TEMPLATES.map(t=>(
            <div key={t.id} style={{border:"2px solid #E5E5EA",borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"all 0.2s",position:"relative"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${t.accent}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5EA";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
              onClick={()=>{setShowTemplatePicker(false);downloadResume(resumeData,bullets,form.role,t.id);}}>
              {/* Mini preview */}
              <div style={{height:200,background:t.id==="executive"?"linear-gradient(180deg,#fff 0%,#f8fafc 100%)":t.id==="modern"?"linear-gradient(180deg,#0f172a 0%,#134e4a 40%,#fff 40%)":t.id==="minimal"?"#fff":"#fff",padding:14,position:"relative",overflow:"hidden"}}>
                {t.id==="executive"&&<>
                  <div style={{textAlign:"center",marginBottom:6}}>
                    <div style={{width:30,height:3,background:"#2563EB",margin:"0 auto 6px",borderRadius:2}}></div>
                    <div style={{height:8,background:"#1e293b",borderRadius:2,width:"60%",margin:"0 auto 3px"}}></div>
                    <div style={{height:5,background:"#2563EB",borderRadius:2,width:"40%",margin:"0 auto 4px",opacity:0.7}}></div>
                    <div style={{display:"flex",justifyContent:"center",gap:4}}><div style={{height:3,background:"#cbd5e1",borderRadius:1,width:25}}></div><div style={{height:3,background:"#cbd5e1",borderRadius:1,width:25}}></div><div style={{height:3,background:"#cbd5e1",borderRadius:1,width:25}}></div></div>
                  </div>
                  <div style={{height:1,background:"#e2e8f0",margin:"6px 0"}}></div>
                  {[1,2,3,4].map(i=><div key={i} style={{height:3,background:"#e2e8f0",borderRadius:1,marginBottom:3,width:`${85-i*8}%`}}></div>)}
                  <div style={{borderLeft:"3px solid #2563EB",paddingLeft:6,marginTop:8}}>
                    <div style={{height:5,background:"#1e293b",borderRadius:1,width:"50%",marginBottom:4}}></div>
                    {[1,2,3].map(i=><div key={i} style={{height:2.5,background:"#e2e8f0",borderRadius:1,marginBottom:2,width:`${90-i*10}%`}}></div>)}
                  </div>
                </>}
                {t.id==="modern"&&<>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(135deg,#0f172a,#134e4a)",padding:"10px 12px"}}>
                    <div style={{height:9,background:"#fff",borderRadius:2,width:"55%",marginBottom:3}}></div>
                    <div style={{height:5,background:"#5eead4",borderRadius:2,width:"35%",marginBottom:6,opacity:0.8}}></div>
                    <div style={{display:"flex",gap:3}}><div style={{height:3,background:"#94a3b8",borderRadius:1,width:20}}></div><div style={{height:3,background:"#94a3b8",borderRadius:1,width:20}}></div></div>
                  </div>
                  <div style={{position:"absolute",top:"44%",left:12,right:12}}>
                    <div style={{height:2,background:"#0d9488",marginBottom:6,width:"30%"}}></div>
                    {[1,2,3,4].map(i=><div key={i} style={{height:2.5,background:"#e2e8f0",borderRadius:1,marginBottom:2,width:`${85-i*8}%`}}></div>)}
                    <div style={{height:2,background:"#0d9488",marginTop:8,marginBottom:6,width:"35%"}}></div>
                    {[1,2].map(i=><div key={i} style={{height:2.5,background:"#e2e8f0",borderRadius:1,marginBottom:2,width:`${80-i*10}%`}}></div>)}
                  </div>
                </>}
                {t.id==="minimal"&&<>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div><div style={{height:10,background:"#111827",borderRadius:2,width:70,marginBottom:3}}></div><div style={{height:5,background:"#9ca3af",borderRadius:2,width:45}}></div></div>
                    <div style={{textAlign:"right"}}>{[1,2,3].map(i=><div key={i} style={{height:2.5,background:"#d1d5db",borderRadius:1,marginBottom:2,width:35,marginLeft:"auto"}}></div>)}</div>
                  </div>
                  <div style={{height:1,background:"#e5e7eb",margin:"6px 0 8px"}}></div>
                  <div style={{height:3,background:"#d1d5db",borderRadius:1,marginBottom:4,width:"25%",opacity:0.6}}></div>
                  {[1,2,3].map(i=><div key={i} style={{height:2.5,background:"#e5e7eb",borderRadius:1,marginBottom:2,width:`${80-i*8}%`}}></div>)}
                  <div style={{height:3,background:"#d1d5db",borderRadius:1,marginTop:8,marginBottom:4,width:"20%",opacity:0.6}}></div>
                  {[1,2,3].map(i=><div key={i} style={{height:2.5,background:"#e5e7eb",borderRadius:1,marginBottom:2,width:`${85-i*6}%`}}></div>)}
                </>}
                {t.id==="creative"&&<>
                  <div style={{borderLeft:"4px solid #7c3aed",paddingLeft:10}}>
                    <div style={{height:11,background:"#1e1b4b",borderRadius:2,width:"60%",marginBottom:3}}></div>
                    <div style={{height:5,background:"#7c3aed",borderRadius:2,width:"35%",marginBottom:6}}></div>
                    <div style={{display:"flex",gap:3}}><div style={{height:3,background:"#c4b5fd",borderRadius:1,width:20}}></div><div style={{height:3,background:"#c4b5fd",borderRadius:1,width:20}}></div></div>
                  </div>
                  <div style={{height:2,background:"linear-gradient(90deg,#7c3aed,#c4b5fd,transparent)",margin:"8px 0"}}></div>
                  {[1,2,3,4].map(i=><div key={i} style={{height:2.5,background:"#e5e7eb",borderRadius:1,marginBottom:2,marginLeft:14,width:`${82-i*8}%`}}></div>)}
                  <div style={{marginLeft:14,marginTop:6}}>
                    <div style={{height:4,background:"#7c3aed",borderRadius:1,width:"30%",marginBottom:4,opacity:0.6}}></div>
                    {[1,2].map(i=><div key={i} style={{height:2.5,background:"#e5e7eb",borderRadius:1,marginBottom:2,width:`${75-i*10}%`}}></div>)}
                  </div>
                </>}
              </div>
              {/* Label */}
              <div style={{padding:"12px 14px",background:"#FAFAFA"}}>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#1D1D1F",letterSpacing:"-0.2px",marginBottom:2}}>{t.name}</div>
                <div style={{fontSize:10,color:"#86868B"}}>{t.desc}</div>
                <div style={{marginTop:8,width:"100%",padding:"7px 0",background:t.accent,border:"none",borderRadius:8,color:"#fff",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,textAlign:"center",letterSpacing:"-0.2px"}}>Download PDF</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>}

    {/* FOOTER */}
    <footer style={{borderTop:"1px solid #D2D2D7",padding:"24px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginTop:60}}>
      <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,letterSpacing:"-0.3px",color:"#D2D2D7"}}>JobHunter<span style={{color:"#0071E3"}}>.AI</span> © 2026</div>
      <div style={{fontSize:10,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>Powered by Claude AI (Anthropic) · JSearch API · Razorpay</div>
      <div style={{display:"flex",gap:20}}>{["Privacy","Terms","Refund Policy","Contact"].map(l=><span key={l} style={{fontSize:10,color:"#86868B",cursor:"pointer",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{l}</span>)}</div>
    </footer>
  </div>);
}