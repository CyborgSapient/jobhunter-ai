import { useState, useEffect, useRef } from "react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
  useAuth,
  useClerk,
} from "@clerk/react";
import { motion } from "framer-motion";
import {
  fetchProfile, updateProfile,
  fetchResumes, saveResume,
  fetchSubscriptions, createOrder, verifyPayment,
  fetchMissions, saveMission,
  analyseResumeAPI, generateBulletsAPI,
  adminLogin, fetchAdminStats, fetchAdminUsers
} from "./api.js";

const RAPIDAPI_KEY  = import.meta.env.VITE_RAPIDAPI_KEY || "";
const RAZORPAY_KEY  = import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.RAZORPAY_KEY_ID || "";

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
  { name:"Closer",  price:7999, display:"₹7,999", period:"per month", color:"#1D1D1F", tag:"Best Value",
    features:["Unlimited applications","98%+ ATS optimisation","Unlimited cover letters","Real jobs from 9 sources","LinkedIn Chrome Extension","Auto connection requests","Auto referral messages","One-click Easy Apply","Full tracking dashboard","SAGE interview coaching","Salary negotiation scripts","PDF resume download","WhatsApp support"],
    locked:[] },
];

const ts = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

function Tw({ text, speed=18 }) {
  const [out,setOut]=useState("");
  useEffect(()=>{ setOut(""); let i=0; const iv=setInterval(()=>{ i++; setOut(text.slice(0,i)); if(i>=text.length) clearInterval(iv); },speed); return ()=>clearInterval(iv); },[text]);
  return <span>{out}<span style={{opacity:out.length<text.length?1:0,color:"#0071E3"}}>█</span></span>;
}

// analyseResume and genBullets now call the backend (API key is server-side only)
async function analyseResume(b64, role, getTokenFn) {
  if(!getTokenFn) return mockResume(role);
  try {
    const res = await analyseResumeAPI(getTokenFn, b64, role);
    return res.resume_data;
  } catch { return mockResume(role); }
}

async function genBullets(rd, role, getTokenFn) {
  if(!getTokenFn) return ["Spearheaded major company initiatives delivering 35% YoY growth","Drove product strategy aligned with enterprise OKRs and vision","Collaborated with engineering teams to ship features on time","Optimised internal processes saving $500k annually","Led cross-functional teams of 20+ members across 3 timezones"];
  try {
    const res = await generateBulletsAPI(getTokenFn, rd, role);
    return res.bullets;
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
    linkedin: "linkedin.com/in/alex-professional", github: "github.com/alex-pro", portfolio: "alexpro.dev",
    yearsExp: 5,
    topSkills: ["Leadership", "Data Analysis", "Agile", "Cross-functional Collaboration", "Strategy", "Stakeholder Management", "Roadmapping", "OKRs", "A/B Testing", "SQL", "Python", "Figma"],
    certifications: ["PMP — Project Management Institute", "Google Data Analytics Certificate", "Scrum Master (CSM)"],
    education: "B.Tech in Computer Science, XYZ University (2018)", atsScore: 100,
    keyStrengths: ["Fast learner", "Communication", "Problem solving"], gaps: [], suggestedKeywords: ["Strategy", "KPIs", "Growth"],
    summary: "Dynamic and results-oriented " + role + " with 5+ years of experience leading complex projects and driving continuous improvement. Proven ability to elevate team performance and exceed corporate goals.",
    experience: [
      { company: "TechNova Solutions", role: role, duration: "2021 - Present", bullets: ["Spearheaded cross-functional initiatives resulting in a 30% increase in operational efficiency.", "Mentored a team of 15, increasing overall team productivity by 25%.", "Developed and deployed enterprise solutions that scaled to 1M+ users."] },
      { company: "Alpha Systems", role: "Associate " + role, duration: "2018 - 2021", bullets: ["Collaborated with stakeholders to define project roadmaps and KPIs.", "Optimised legacy processes reducing costs by 18% annually."] }
    ],
    projects: [
      { name: "Customer Insights Dashboard", description: "Built an internal analytics dashboard consolidating data from 6 sources used by 200+ employees daily.", impact: "Reduced reporting time by 70% and surfaced $1.2M in cost-saving opportunities." },
      { name: "AI-Powered Onboarding Flow", description: "Designed and shipped a personalised onboarding journey using ML-driven user segmentation.", impact: "Increased week-1 activation by 38% and reduced support tickets by 24%." }
    ],
    achievements: ["Speaker at ProductCon India 2024", "Filed 2 patents in workflow automation", "Led team to win Internal Hackathon 2023"]
  };
}

function mockJobs(role,loc){ return ["Razorpay","PhonePe","Zepto","Meesho","Swiggy","CRED","Chargebee","Freshworks"].map((co,i)=>({ id:i+1,title:role,company:co,location:loc,match:Math.floor(78+Math.random()*19),source:["LinkedIn","Naukri","Glassdoor","Indeed","Wellfound"][i%5],salary:`₹${18+i*3}–${26+i*3} LPA`,applyUrl:"#",description:`Exciting ${role} opportunity at ${co}.`,status:"Found",resumeScore:(88+Math.random()*11).toFixed(1),referral:null,interview:null })); }

const RESUME_TEMPLATES = [
  { id:"executive", name:"Executive", desc:"Bold dark header, black accents",   accent:"#1a1a1a", preview:"exec" },
  { id:"modern",    name:"Modern",    desc:"Dark teal header, green accents",   accent:"#0D9488", preview:"mod"  },
  { id:"minimal",   name:"Minimal",   desc:"Clean serif, charcoal accents",     accent:"#374151", preview:"min"  },
  { id:"creative",  name:"Creative",  desc:"Deep purple header, bold presence", accent:"#7C3AED", preview:"cre"  },
];

const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const cleanList = (items) => (Array.isArray(items) ? items : [])
  .map((item) => esc(item))
  .filter(Boolean);

function buildResumeHTML(templateId, rd, bullets, role) {
  const n     = esc(rd?.name || "Your Name");
  const jt    = esc(rd?.currentRole || role || "Professional");
  const em    = esc(rd?.email);
  const ph    = esc(rd?.phone);
  const loc   = esc(rd?.location);
  const li    = esc(rd?.linkedin);
  const gh    = esc(rd?.github);
  const pf    = esc(rd?.portfolio);
  const sum   = esc(rd?.summary);
  const sk    = rd?.topSkills?.length ? cleanList(rd.topSkills) : ["Leadership","Strategic Planning","Cross-functional Collaboration","Data Analysis","Process Optimization","Stakeholder Management"];
  const edu   = esc(rd?.education);
  const certs = cleanList(rd?.certifications);
  const projs = Array.isArray(rd?.projects) ? rd.projects.map(p=>({ name:esc(p?.name), description:esc(p?.description), impact:esc(p?.impact) })) : [];
  const achs  = cleanList(rd?.achievements);

  const contact = [em, ph, loc, li, gh, pf].filter(Boolean);

  const expItems = rd?.experience?.length
    ? rd.experience.map(e => ({ role:esc(e.role), company:esc(e.company), duration:esc(e.duration), bul:cleanList(e.bullets?.length?e.bullets:bullets) }))
    : [{ role:jt, company:"", duration:"", bul:bullets.length?cleanList(bullets):["Delivered measurable results aligned with organizational goals","Collaborated with cross-functional teams to drive key initiatives","Optimized processes that improved efficiency and business outcomes"] }];

  /* helper: experience block builder — each entry stays together on one page */
  const mkExp = (items, accent, headColor, compColor, bulColor) => items.map(e=>`<div class="keep-together" style="margin-bottom:9px;page-break-inside:avoid;break-inside:avoid;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;gap:8px;">
      <div><span style="font-weight:700;font-size:10pt;color:${headColor};">${e.role}</span>${e.company?`<span style="color:${accent};margin:0 6px;">|</span><span style="font-size:9.5pt;color:${compColor};">${e.company}</span>`:""}</div>
      ${e.duration?`<span style="font-size:8pt;color:${accent};font-weight:600;white-space:nowrap;">${e.duration}</span>`:""}
    </div>
    <ul style="padding-left:14px;margin:2px 0 0;">${e.bul.map(b=>`<li style="font-size:9pt;color:${bulColor};margin-bottom:2px;line-height:1.42;">${b}</li>`).join("")}</ul>
  </div>`).join("");

  /* helper: render projects section — each project stays together */
  const mkProjects = (items, accent, headColor, descColor) => items.map(p=>`<div class="keep-together" style="margin-bottom:7px;page-break-inside:avoid;break-inside:avoid;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
      <span style="font-weight:700;font-size:9.5pt;color:${headColor};">${p.name||""}</span>
    </div>
    ${p.description?`<div style="font-size:9pt;color:${descColor};line-height:1.42;">${p.description}</div>`:""}
    ${p.impact?`<div style="font-size:8.5pt;color:${accent};font-weight:600;margin-top:2px;">Impact: ${p.impact}</div>`:""}
  </div>`).join("");

  /* helper: render simple list (certifications, achievements) as bullet list */
  const mkList = (items, color) => `<ul style="padding-left:14px;margin:2px 0 0;">${items.map(x=>`<li style="font-size:9pt;color:${color};margin-bottom:2px;line-height:1.42;">${x}</li>`).join("")}</ul>`;

  /* helper: wrap a whole section (heading + content) to prevent orphaned headers.
     For short sections (certs, achievements, education): keepAll=true keeps everything on one page.
     For longer sections (experience, projects): just keeps heading glued to content start. */
  const wrapSection = (heading, content, keepAll=false) => {
    if (keepAll) {
      return `<div class="keep-together" style="page-break-inside:avoid;break-inside:avoid;margin-bottom:8px;">${heading}${content}</div>`;
    }
    return `<div style="margin-bottom:8px;"><div class="section-head" style="page-break-after:avoid;break-after:avoid;">${heading}</div>${content}</div>`;
  };

  if (templateId === "executive") {
    const secH = (t) => `<div style="font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:2.5px;color:#1a1a1a;border-bottom:2.5px solid #1a1a1a;padding-bottom:3px;margin-bottom:6px;">${t}</div>`;
    const skillCols = (() => { const c=[[],[],[]]; sk.forEach((s,i)=>c[i%3].push(s)); return `<div style="display:flex;gap:12px;border:1.5px solid #d1d5db;padding:8px 12px;">${c.map(col=>`<div style="flex:1;font-size:8.5pt;color:#374151;line-height:1.7;">${col.map(s=>`<div>• ${s}</div>`).join("")}</div>`).join("")}</div>`; })();
    const expB = expItems.map(e=>`<div class="keep-together" style="margin-bottom:10px;page-break-inside:avoid;break-inside:avoid;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;"><div><span style="font-weight:700;font-size:10.5pt;color:#1a1a1a;">${e.role}</span>${e.company?` <span style="color:#555;font-size:10pt;"> - ${e.company}</span>`:""}</div>${e.duration?`<span style="font-size:8.5pt;font-weight:700;color:#1a1a1a;white-space:nowrap;">${e.duration}</span>`:""}</div><ul style="padding-left:16px;margin:2px 0 0;">${e.bul.map(b=>`<li style="font-size:9.5pt;color:#333;margin-bottom:3px;line-height:1.45;">${b}</li>`).join("")}</ul></div>`).join("");
    const hasBot = edu||certs.length||projs.length||achs.length;
    const leftC = `${edu?`<div style="margin-bottom:8px;"><div style="font-weight:700;font-size:9.5pt;color:#1a1a1a;margin-bottom:3px;">Education</div><div style="font-size:9pt;color:#444;line-height:1.45;">${edu}</div></div>`:""}${certs.length?`<div><div style="font-weight:700;font-size:9.5pt;color:#1a1a1a;margin-bottom:3px;">Certifications</div><div style="font-size:9pt;color:#444;line-height:1.55;">${certs.join(", ")}</div></div>`:""}`;
    const rightC = `${achs.length?`<ul style="padding-left:14px;margin:0;">${achs.map(a=>`<li style="font-size:9pt;color:#333;margin-bottom:3px;line-height:1.45;">${a}</li>`).join("")}</ul>`:""}`;
    return { wrapperStyle:"width:178mm;font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:10pt;line-height:1.4;background:#fff;padding:0;box-sizing:border-box;",
      html:`
      <div style="background:#1a1a1a;padding:10mm 8mm 7mm;">
        <div style="font-size:20pt;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:3px;margin-bottom:2px;">${jt}</div>
        <div style="font-size:9pt;color:#d4d4d4;line-height:1.6;">${sum||""}</div>
      </div>
      <div style="background:#f3f4f6;padding:4px 8mm;font-size:8pt;color:#555;display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #d1d5db;">${contact.map(c=>`<span>${c}</span>`).join('<span style="color:#bbb;"> | </span>')}</div>
      <div style="padding:6mm 0 0;">
        ${wrapSection(secH("Skills & Expertise"),skillCols,true)}
        ${wrapSection(secH("Professional Experience"),expB)}
        ${projs.length?wrapSection(secH("Projects"),mkProjects(projs,"#1a1a1a","#1a1a1a","#444")):""}
        ${hasBot?`<div style="margin-top:4px;">${secH("Education & Certifications"+(achs.length?" / Key Achievements":""))}<div style="display:flex;gap:20px;"><div style="flex:1;">${leftC}</div>${achs.length?`<div style="flex:1;">${rightC}</div>`:""}</div></div>`:""}
      </div>`
    };
  }

  if (templateId === "modern") {
    const secH = (t) => `<div style="font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:2.5px;color:#134e4a;border-bottom:2.5px solid #0d9488;padding-bottom:3px;margin-bottom:6px;">${t}</div>`;
    const skC = (() => { const c=[[],[],[]]; sk.forEach((s,i)=>c[i%3].push(s)); return `<div style="display:flex;gap:12px;border:1.5px solid #99f6e4;padding:8px 12px;background:#f0fdfa;">${c.map(col=>`<div style="flex:1;font-size:8.5pt;color:#134e4a;line-height:1.7;">${col.map(s=>`<div>• ${s}</div>`).join("")}</div>`).join("")}</div>`; })();
    const exB = expItems.map(e=>`<div class="keep-together" style="margin-bottom:10px;page-break-inside:avoid;break-inside:avoid;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;"><div><span style="font-weight:700;font-size:10.5pt;color:#134e4a;">${e.role}</span>${e.company?` <span style="color:#555;font-size:10pt;"> - ${e.company}</span>`:""}</div>${e.duration?`<span style="font-size:8.5pt;font-weight:700;color:#0d9488;white-space:nowrap;">${e.duration}</span>`:""}</div><ul style="padding-left:16px;margin:2px 0 0;">${e.bul.map(b=>`<li style="font-size:9.5pt;color:#333;margin-bottom:3px;line-height:1.45;">${b}</li>`).join("")}</ul></div>`).join("");
    const hB = edu||certs.length||projs.length||achs.length;
    const lC = `${edu?`<div style="margin-bottom:8px;"><div style="font-weight:700;font-size:9.5pt;color:#134e4a;margin-bottom:3px;">Education</div><div style="font-size:9pt;color:#444;line-height:1.45;">${edu}</div></div>`:""}${certs.length?`<div><div style="font-weight:700;font-size:9.5pt;color:#134e4a;margin-bottom:3px;">Certifications</div><div style="font-size:9pt;color:#444;line-height:1.55;">${certs.join(", ")}</div></div>`:""}`;
    const rC = `${projs.length?`<ul style="padding-left:14px;margin:0 0 6px;">${projs.map(p=>`<li style="font-size:9pt;color:#333;margin-bottom:3px;line-height:1.45;"><strong>${p.name||""}</strong>${p.impact?` — ${p.impact}`:""}</li>`).join("")}</ul>`:""}${achs.length?`<ul style="padding-left:14px;margin:0;">${achs.map(a=>`<li style="font-size:9pt;color:#333;margin-bottom:3px;line-height:1.45;">${a}</li>`).join("")}</ul>`:""}`;
    return { wrapperStyle:"width:178mm;font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:10pt;line-height:1.4;background:#fff;padding:0;box-sizing:border-box;",
      html:`<div style="background:linear-gradient(135deg,#0f172a 0%,#134e4a 100%);padding:10mm 8mm 7mm;"><div style="font-size:20pt;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:3px;margin-bottom:2px;">${jt}</div><div style="font-size:9pt;color:#94dbce;line-height:1.6;">${sum||""}</div></div><div style="background:#f0fdfa;padding:4px 8mm;font-size:8pt;color:#555;display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #99f6e4;">${contact.map(c=>`<span>${c}</span>`).join('<span style="color:#bbb;"> | </span>')}</div><div style="padding:6mm 0 0;">${wrapSection(secH("Skills & Expertise"),skC,true)}${wrapSection(secH("Professional Experience"),exB)}${hB?`<div style="margin-top:4px;">${secH("Education & Certifications"+((projs.length||achs.length)?" / Projects & Achievements":""))}<div style="display:flex;gap:20px;"><div style="flex:1;">${lC}</div>${(projs.length||achs.length)?`<div style="flex:1;">${rC}</div>`:""}</div></div>`:""}</div>`
    };
  }

  if (templateId === "minimal") {
    const secH = (t) => `<div style="font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#374151;border-bottom:1.5px solid #9ca3af;padding-bottom:3px;margin-bottom:6px;">${t}</div>`;
    const skC = (() => { const c=[[],[],[]]; sk.forEach((s,i)=>c[i%3].push(s)); return `<div style="display:flex;gap:12px;padding:6px 0;">${c.map(col=>`<div style="flex:1;font-size:8.5pt;color:#4b5563;line-height:1.7;">${col.map(s=>`<div>• ${s}</div>`).join("")}</div>`).join("")}</div>`; })();
    const exB = expItems.map(e=>`<div class="keep-together" style="margin-bottom:10px;page-break-inside:avoid;break-inside:avoid;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;"><div><span style="font-weight:700;font-size:10.5pt;color:#111827;">${e.role}</span>${e.company?` <span style="color:#6b7280;font-size:10pt;"> - ${e.company}</span>`:""}</div>${e.duration?`<span style="font-size:8.5pt;font-weight:600;color:#374151;white-space:nowrap;">${e.duration}</span>`:""}</div><ul style="padding-left:16px;margin:2px 0 0;">${e.bul.map(b=>`<li style="font-size:9.5pt;color:#4b5563;margin-bottom:3px;line-height:1.45;">${b}</li>`).join("")}</ul></div>`).join("");
    const hB = edu||certs.length||projs.length||achs.length;
    const lC = `${edu?`<div style="margin-bottom:8px;"><div style="font-weight:700;font-size:9.5pt;color:#111827;margin-bottom:3px;">Education</div><div style="font-size:9pt;color:#4b5563;line-height:1.45;">${edu}</div></div>`:""}${certs.length?`<div><div style="font-weight:700;font-size:9.5pt;color:#111827;margin-bottom:3px;">Certifications</div><div style="font-size:9pt;color:#4b5563;line-height:1.55;">${certs.join(", ")}</div></div>`:""}`;
    const rC = `${projs.length?`<ul style="padding-left:14px;margin:0 0 6px;">${projs.map(p=>`<li style="font-size:9pt;color:#4b5563;margin-bottom:3px;line-height:1.45;"><strong>${p.name||""}</strong>${p.impact?` — ${p.impact}`:""}</li>`).join("")}</ul>`:""}${achs.length?`<ul style="padding-left:14px;margin:0;">${achs.map(a=>`<li style="font-size:9pt;color:#4b5563;margin-bottom:3px;line-height:1.45;">${a}</li>`).join("")}</ul>`:""}`;
    return { wrapperStyle:"width:178mm;font-family:'Georgia','Times New Roman',Calibri,serif;color:#111827;font-size:10pt;line-height:1.4;background:#fff;padding:0;box-sizing:border-box;",
      html:`<div style="border-bottom:2px solid #374151;padding-bottom:8px;margin-bottom:0;"><div style="font-size:22pt;font-weight:700;color:#111827;letter-spacing:0.5px;text-transform:uppercase;">${n}</div><div style="font-size:10pt;color:#6b7280;margin-top:2px;margin-bottom:6px;">${jt}</div><div style="font-size:8pt;color:#9ca3af;line-height:1.5;">${contact.join(" | ")}</div></div><div style="padding:6mm 0 0;">${sum?wrapSection(secH("Professional Summary"),`<div style="font-size:9.5pt;color:#4b5563;line-height:1.55;font-style:italic;">${sum}</div>`,true):""}${wrapSection(secH("Skills & Expertise"),skC,true)}${wrapSection(secH("Professional Experience"),exB)}${hB?`<div style="margin-top:4px;">${secH("Education & Certifications"+((projs.length||achs.length)?" / Projects & Achievements":""))}<div style="display:flex;gap:20px;"><div style="flex:1;">${lC}</div>${(projs.length||achs.length)?`<div style="flex:1;">${rC}</div>`:""}</div></div>`:""}</div>`
    };
  }

  /* creative — purple accents with dark header */
  const secH = (t) => `<div style="font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:2.5px;color:#1e1b4b;border-bottom:2.5px solid #7c3aed;padding-bottom:3px;margin-bottom:6px;">${t}</div>`;
  const skC = (() => { const c=[[],[],[]]; sk.forEach((s,i)=>c[i%3].push(s)); return `<div style="display:flex;gap:12px;border:1.5px solid #c4b5fd;padding:8px 12px;background:#faf5ff;">${c.map(col=>`<div style="flex:1;font-size:8.5pt;color:#3b0764;line-height:1.7;">${col.map(s=>`<div>• ${s}</div>`).join("")}</div>`).join("")}</div>`; })();
  const exB = expItems.map(e=>`<div class="keep-together" style="margin-bottom:10px;page-break-inside:avoid;break-inside:avoid;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;"><div><span style="font-weight:700;font-size:10.5pt;color:#1e1b4b;">${e.role}</span>${e.company?` <span style="color:#555;font-size:10pt;"> - ${e.company}</span>`:""}</div>${e.duration?`<span style="font-size:8.5pt;font-weight:700;color:#7c3aed;white-space:nowrap;">${e.duration}</span>`:""}</div><ul style="padding-left:16px;margin:2px 0 0;">${e.bul.map(b=>`<li style="font-size:9.5pt;color:#333;margin-bottom:3px;line-height:1.45;">${b}</li>`).join("")}</ul></div>`).join("");
  const hB = edu||certs.length||projs.length||achs.length;
  const lC = `${edu?`<div style="margin-bottom:8px;"><div style="font-weight:700;font-size:9.5pt;color:#1e1b4b;margin-bottom:3px;">Education</div><div style="font-size:9pt;color:#444;line-height:1.45;">${edu}</div></div>`:""}${certs.length?`<div><div style="font-weight:700;font-size:9.5pt;color:#1e1b4b;margin-bottom:3px;">Certifications</div><div style="font-size:9pt;color:#444;line-height:1.55;">${certs.join(", ")}</div></div>`:""}`;
  const rC = `${projs.length?`<ul style="padding-left:14px;margin:0 0 6px;">${projs.map(p=>`<li style="font-size:9pt;color:#333;margin-bottom:3px;line-height:1.45;"><strong>${p.name||""}</strong>${p.impact?` — ${p.impact}`:""}</li>`).join("")}</ul>`:""}${achs.length?`<ul style="padding-left:14px;margin:0;">${achs.map(a=>`<li style="font-size:9pt;color:#333;margin-bottom:3px;line-height:1.45;">${a}</li>`).join("")}</ul>`:""}`;
  return { wrapperStyle:"width:178mm;font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#1e1b4b;font-size:10pt;line-height:1.4;background:#fff;padding:0;box-sizing:border-box;",
    html:`<div style="background:#1e1b4b;padding:10mm 8mm 7mm;"><div style="font-size:20pt;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:3px;margin-bottom:2px;">${jt}</div><div style="font-size:9pt;color:#c4b5fd;line-height:1.6;">${sum||""}</div></div><div style="background:#faf5ff;padding:4px 8mm;font-size:8pt;color:#555;display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #c4b5fd;">${contact.map(c=>`<span>${c}</span>`).join('<span style="color:#bbb;"> | </span>')}</div><div style="padding:6mm 0 0;">${wrapSection(secH("Skills & Expertise"),skC,true)}${wrapSection(secH("Professional Experience"),exB)}${hB?`<div style="margin-top:4px;">${secH("Education & Certifications"+((projs.length||achs.length)?" / Projects & Achievements":""))}<div style="display:flex;gap:20px;"><div style="flex:1;">${lC}</div>${(projs.length||achs.length)?`<div style="flex:1;">${rC}</div>`:""}</div></div>`:""}</div>`
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
  resumeDiv.className = "resume-pdf-root";
  resumeDiv.style.cssText = `${tpl.wrapperStyle};width:178mm;min-height:auto;padding:0;box-sizing:border-box;`;
  resumeDiv.innerHTML = `
    <style>
      .resume-pdf-root {
        background: #fff;
        overflow: visible;
      }
      .resume-pdf-root * {
        box-sizing: border-box;
      }
      /* Keep section headers glued to the content below them */
      .resume-pdf-root .section-head {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      /* Keep-together blocks never split across pages */
      .resume-pdf-root .keep-together {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      /* Prevent orphaned headings at bottom of page */
      .resume-pdf-root h1,
      .resume-pdf-root h2,
      .resume-pdf-root h3 {
        page-break-after: avoid;
        break-after: avoid;
        orphans: 3;
        widows: 3;
      }
      .resume-pdf-root p,
      .resume-pdf-root ul {
        orphans: 3;
        widows: 3;
      }
      .resume-pdf-root li {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    </style>
    ${tpl.html}
  `;

  document.body.appendChild(resumeDiv);
  await window.html2pdf().set({
    margin: [14, 16, 14, 16],
    filename: `${(rd?.name||"Resume").replace(/\s+/g,"_")}_ATS_Resume.pdf`,
    image: { type:"jpeg", quality:0.99 },
    html2canvas: { scale:3, useCORS:true, logging:false, letterRendering:true, scrollY:0 },
    jsPDF: { unit:"mm", format:"a4", orientation:"portrait" },
    pagebreak: { mode:["css","legacy"], avoid:[".keep-together",".section-head","li"] }
  }).from(resumeDiv).save();
  document.body.removeChild(resumeDiv);
}

function buildResumeDocxHTML(rd, bullets, role, accent) {
  const n     = esc(rd?.name || "Your Name");
  const jt    = esc(rd?.currentRole || role || "Professional");
  const em    = esc(rd?.email);
  const ph    = esc(rd?.phone);
  const loc   = esc(rd?.location);
  const li    = esc(rd?.linkedin);
  const gh    = esc(rd?.github);
  const pf    = esc(rd?.portfolio);
  const sum   = esc(rd?.summary);
  const sk    = rd?.topSkills?.length ? cleanList(rd.topSkills) : ["Leadership","Strategic Planning","Cross-functional Collaboration","Data Analysis","Process Optimization","Stakeholder Management"];
  const edu   = esc(rd?.education);
  const certs = cleanList(rd?.certifications);
  const projs = Array.isArray(rd?.projects) ? rd.projects.map(p=>({ name:esc(p?.name), description:esc(p?.description), impact:esc(p?.impact) })) : [];
  const achs  = cleanList(rd?.achievements);
  const contact = [em, ph, loc, li, gh, pf].filter(Boolean).join("  |  ");
  const expItems = rd?.experience?.length
    ? rd.experience.map(e => ({ role:esc(e.role), company:esc(e.company), duration:esc(e.duration), bul:cleanList(e.bullets?.length?e.bullets:bullets) }))
    : [{ role:jt, company:"", duration:"", bul:bullets.length?cleanList(bullets):["Delivered measurable results aligned with organizational goals","Collaborated with cross-functional teams to drive key initiatives","Optimized processes that improved efficiency and business outcomes"] }];

  const sec = (title) => `<p style="font-family:Calibri,Arial;font-size:11pt;font-weight:bold;color:${accent};text-transform:uppercase;letter-spacing:1px;margin:12pt 0 4pt;border-bottom:1.25pt solid ${accent};padding-bottom:2pt;page-break-after:avoid;">${title}</p>`;
  const expH = expItems.map(e=>`
    <p style="font-family:Calibri,Arial;font-size:11pt;margin:7pt 0 2pt;page-break-after:avoid;"><strong style="color:#1a1a1a;">${e.role}</strong>${e.company?` &nbsp;|&nbsp; <span style="color:#555;">${e.company}</span>`:""}${e.duration?` &nbsp;<span style="color:${accent};font-weight:bold;float:right;">${e.duration}</span>`:""}</p>
    <ul style="font-family:Calibri,Arial;font-size:10.5pt;color:#333;margin:2pt 0 0;padding-left:18pt;">${e.bul.map(b=>`<li style="margin-bottom:2pt;line-height:1.35;">${b}</li>`).join("")}</ul>
  `).join("");
  const projH = projs.map(p=>`
    <p style="font-family:Calibri,Arial;font-size:11pt;margin:7pt 0 2pt;page-break-after:avoid;"><strong style="color:#1a1a1a;">${p.name||""}</strong></p>
    ${p.description?`<p style="font-family:Calibri,Arial;font-size:10.5pt;color:#333;margin:0;line-height:1.35;">${p.description}</p>`:""}
    ${p.impact?`<p style="font-family:Calibri,Arial;font-size:10pt;color:${accent};margin:2pt 0 0;font-weight:bold;">Impact: ${p.impact}</p>`:""}
  `).join("");
  const listH = (items) => `<ul style="font-family:Calibri,Arial;font-size:10.5pt;color:#333;margin:2pt 0 0;padding-left:18pt;">${items.map(x=>`<li style="margin-bottom:2pt;line-height:1.35;">${x}</li>`).join("")}</ul>`;

  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Resume</title><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><style>@page{size:A4;margin:1.5cm 1.8cm;}body{font-family:Calibri,Arial,sans-serif;color:#222;font-size:11pt;line-height:1.35;}p,li{orphans:2;widows:2;}</style></head><body>
    <p style="font-family:Calibri,Arial;font-size:22pt;font-weight:bold;color:#1a1a1a;text-transform:uppercase;letter-spacing:2pt;margin:0;text-align:center;">${n}</p>
    <p style="font-family:Calibri,Arial;font-size:12pt;color:${accent};margin:2pt 0 6pt;text-align:center;font-weight:500;">${jt}</p>
    <p style="font-family:Calibri,Arial;font-size:10pt;color:#555;margin:0 0 4pt;text-align:center;">${contact}</p>
    <hr style="border:none;border-top:1pt solid #ccc;margin:8pt 0;"/>
    ${sum?sec("Professional Summary")+`<p style="font-family:Calibri,Arial;font-size:10.5pt;color:#333;margin:0;line-height:1.4;">${sum}</p>`:""}
    ${sec("Core Competencies")}<p style="font-family:Calibri,Arial;font-size:10.5pt;color:#333;margin:0;line-height:1.55;">${sk.join("  &bull;  ")}</p>
    ${sec("Professional Experience")}${expH}
    ${projs.length?sec("Projects & Achievements")+projH:""}
    ${certs.length?sec("Certifications")+listH(certs):""}
    ${achs.length?sec("Key Achievements")+listH(achs):""}
    ${edu?sec("Education & Credentials")+`<p style="font-family:Calibri,Arial;font-size:10.5pt;color:#333;margin:0;">${edu}</p>`:""}
  </body></html>`;
}

async function downloadResumeDocx(rd, bullets, role, templateId) {
  if (!window.htmlDocx) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/html-docx-js/dist/html-docx.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const tpl = RESUME_TEMPLATES.find(t=>t.id===templateId) || RESUME_TEMPLATES[0];
  const html = buildResumeDocxHTML(rd, bullets, role, tpl.accent);
  const blob = window.htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(rd?.name||"Resume").replace(/\s+/g,"_")}_ATS_Resume.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function payWithRazorpay(pkg, name, getTokenFn) {
  if(!RAZORPAY_KEY){ alert("⚠️ Razorpay not configured.\n\nAdd VITE_RAZORPAY_KEY=rzp_live_xxx to your .env file."); return; }
  if(!getTokenFn){ alert("Please sign in before purchasing a plan."); return; }

  // Step 1: Create order on server
  let orderData;
  try {
    orderData = await createOrder(getTokenFn, { plan_name: pkg.name, price: pkg.price });
  } catch(err) {
    alert("⚠️ Failed to create payment order. Please try again.\n\n" + err.message);
    return;
  }

  // Step 2: Load Razorpay checkout
  const loadScript = () => new Promise((resolve) => {
    if(window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    document.body.appendChild(s);
  });
  await loadScript();

  // Step 3: Open checkout with server-created order
  new window.Razorpay({
    key: orderData.key_id || RAZORPAY_KEY,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "JobHunter.AI",
    description: `${pkg.name} Plan — ${pkg.period}`,
    order_id: orderData.order_id,
    handler: async (r) => {
      // Step 4: Verify payment on server
      try {
        const result = await verifyPayment(getTokenFn, {
          plan_name: pkg.name,
          price: pkg.price,
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_order_id: r.razorpay_order_id,
          razorpay_signature: r.razorpay_signature,
        });
        alert(`✅ Payment successful!\n\n${result.message}\nPlan: ${pkg.name}\n\nYour account has been upgraded.`);
      } catch(err) {
        alert("⚠️ Payment received but verification failed.\nPlease contact support with your payment ID: " + r.razorpay_payment_id);
      }
    },
    prefill: { name: name || "" },
    theme: { color: "#0071E3" },
    modal: {
      ondismiss: () => { /* user closed checkout without paying */ },
    },
  }).open();
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

function PricingCard({pkg,userName,isPopular,getTokenFn}){
  return(<div style={{background:"#FFFFFF",border:`1px solid ${isPopular?"#0071E3":"#E5E5EA"}`,borderRadius:8,padding:"32px 28px",position:"relative",boxShadow:isPopular?"0 24px 58px rgba(0,113,227,0.12)":"0 18px 44px rgba(0,0,0,0.045)",transform:isPopular?"translateY(-8px)":"none",transition:"transform 0.3s, box-shadow 0.3s"}}>
    {pkg.tag&&<div style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",background:pkg.color,color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,letterSpacing:"-0.3px",padding:"5px 16px",borderRadius:8,whiteSpace:"nowrap"}}>{pkg.tag}</div>}
    <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:24,letterSpacing:"-0.5px",color:pkg.color,marginBottom:4}}>{pkg.name}</div>
    <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:40,color:"#1D1D1F",letterSpacing:"-0.1px",marginBottom:2}}>{pkg.display}</div>
    <div style={{fontSize:11,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:24}}>{pkg.period}</div>
    <div style={{marginBottom:24}}>
      {pkg.features.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9}}><span style={{color:pkg.color,flexShrink:0,fontSize:13}}>✓</span><span style={{fontSize:12,color:"#86868B",lineHeight:1.5}}>{f}</span></div>)}
      {pkg.locked.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,opacity:0.45}}><span style={{color:"#86868B",flexShrink:0,fontSize:13}}>✗</span><span style={{fontSize:12,color:"#86868B",lineHeight:1.5}}>{f}</span></div>)}
    </div>
    <button onClick={()=>payWithRazorpay(pkg,userName,getTokenFn)} style={{width:"100%",padding:"14px",background:isPopular?"#0071E3":"#FFFFFF",border:`1px solid ${isPopular?"#0071E3":"#D2D2D7"}`,borderRadius:8,color:isPopular?"#FFFFFF":"#1D1D1F",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.3px",cursor:"pointer",transition:"all 0.2s"}}>Get started</button>
  </div>);
}

export default function App(){
  const [page,setPage]=useState(() => window.location.pathname.replace('/', '') || "landing");
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
  const [showUpgradeModal,setShowUpgradeModal]=useState(false);
  const [navScrolled,setNavScrolled]=useState(false);
  const [profileData,setProfileData]=useState(null);
  const [profileResumes,setProfileResumes]=useState([]);
  const [profileMissions,setProfileMissions]=useState([]);
  const [profileSubs,setProfileSubs]=useState([]);
  const [profileLoading,setProfileLoading]=useState(false);
  const [adminToken,setAdminToken]=useState(localStorage.getItem('adminToken')||"");
  const [adminStats,setAdminStats]=useState(null);
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminUName,setAdminUName]=useState("");
  const [adminPass,setAdminPass]=useState("");
  const fileRef=useRef(null);
  const timerRef=useRef(null);
  const canvasRef=useRef(null);

  const { user: clerkUser, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const mouseRef=useRef({x:0.5,y:0.5});

  const handleFile=(f)=>{ if(!f||f.type!=="application/pdf") return alert("Please upload a PDF file."); setResumeFile(f); const r=new FileReader(); r.onload=e=>setResumeB64(e.target.result.split(",")[1]); r.readAsDataURL(f); };

  const startMission=async()=>{
    if(!form.role.trim()) return;
    if(!isSignedIn) {
      alert("Please sign in to launch your job hunt mission.");
      return;
    }
    
    // Enforce limits before running
    try {
      const prof = await fetchProfile(getToken);
      const { max_applications, used_applications } = prof.limits;
      if (used_applications >= max_applications && max_applications !== 0) {
        alert(`⚠️ Plan Limit Reached!\n\nYou have used all ${max_applications} of your allowed AI applications.\nPlease upgrade your plan to launch more missions.`);
        navTo("pricing");
        return;
      } else if (max_applications === 0) {
        alert(`⚠️ Upgrade Required\n\nYou are on the Free plan which does not include autonomous job hunting missions.\nPlease upgrade to a Starter or Hunter plan.`);
        navTo("pricing");
        return;
      }
    } catch(err) { console.error("Error verifying limits:", err); }

    setPhase("running"); setAgentStates(AGENTS.map(()=>"pending")); setCurAgent(0); setCurStep(0); setProgress(0);
    setLog([{t:ts(),msg:"Mission initialised. Deploying 8 AI agents..."}]);
    if(resumeB64&&isSignedIn){ const rd=await analyseResume(resumeB64,form.role,getToken); if(rd){ setResumeData(rd); const b=await genBullets(rd,form.role,getToken); setBullets(b); } }
    const j=await fetchJobs(form.role,form.location); setJobs(j);
  };

  // Gate resume download behind active subscription
  const checkPlanForDownload = async (onAllowed) => {
    if (!isSignedIn) {
      setShowUpgradeModal(true);
      return;
    }
    try {
      const prof = await fetchProfile(getToken);
      const plan = prof.limits?.plan || "Free";
      if (plan === "Free") {
        setShowUpgradeModal(true);
        return;
      }
      onAllowed();
    } catch (err) {
      console.error("Error checking plan for download:", err);
      setShowUpgradeModal(true);
    }
  };

  // 🔄 Auto-Sync User Data to Backend DB
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      updateProfile(getToken, {
        name: clerkUser.fullName,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        image_url: clerkUser.imageUrl
      }).catch(err => console.log("Background sync:", err));
    }
  }, [isSignedIn, clerkUser]);

  useEffect(()=>{
    if(phase!=="running") return;
    const agent=AGENTS[curAgent]; if(!agent){
      setPhase("dashboard");
      // Save mission to backend when complete
      if(isSignedIn && form.role){
        saveMission(getToken, {
          target_role: form.role, location: form.location,
          experience: form.experience, skills: form.skills,
          salary: form.salary, work_mode: form.workMode,
          notice_period: form.notice, jobs_found: jobs.length,
          jobs: jobs.map(j=>({title:j.title,company:j.company,location:j.location,match:j.match,source:j.source,salary:j.salary,applyUrl:j.applyUrl,status:j.status}))
        }).catch(()=>{});
      }
      return;
    }
    setAgentStates(p=>{ const n=[...p]; n[curAgent]="active"; return n; });
    let step=0;
    timerRef.current=setInterval(()=>{
      step++; setCurStep(step-1); setProgress(Math.round((step/agent.steps.length)*100));
      setLog(p=>[...p.slice(-40),{t:ts(),msg:`[${agent.name}] ${agent.steps[step-1]}`}]);
      if(step>=agent.steps.length){ clearInterval(timerRef.current); setAgentStates(p=>{ const n=[...p]; n[curAgent]="done"; return n; }); setTimeout(()=>{ setCurAgent(i=>i+1); setCurStep(0); setProgress(0); },500); }
    },800);
    return ()=>clearInterval(timerRef.current);
  },[curAgent,phase]);

  // Load profile data when user navigates to profile page
  useEffect(()=>{
    if(page!=="profile" || !isSignedIn) return;
    setProfileLoading(true);
    Promise.all([
      fetchProfile(getToken).catch(()=>null),
      fetchResumes(getToken).catch(()=>({resumes:[]})),
      fetchMissions(getToken).catch(()=>({missions:[]})),
      fetchSubscriptions(getToken).catch(()=>({subscriptions:[]}))
    ]).then(([prof,res,mis,subs])=>{
      if(prof) setProfileData(prof);
      setProfileResumes(res?.resumes||[]);
      setProfileMissions(mis?.missions||[]);
      setProfileSubs(subs?.subscriptions||[]);
    }).finally(()=>setProfileLoading(false));
  },[page,isSignedIn]);

  // Admin data fetch
  useEffect(()=>{
    if(page!=="admin"||!adminToken) return;
    Promise.all([
      fetchAdminStats(adminToken).catch(()=>null),
      fetchAdminUsers(adminToken).catch(()=>null)
    ]).then(([st, usRS])=>{
      if(st) setAdminStats(st);
      if(usRS) setAdminUsers(usRS.users||[]);
    });
  },[page,adminToken]);

  const handleAdminLogin = async(e) => {
    e.preventDefault();
    try {
      const res = await adminLogin(adminUName, adminPass);
      if (res.token) {
        setAdminToken(res.token);
        localStorage.setItem('adminToken', res.token);
      }
    } catch(err) {
      alert("Invalid admin credentials");
    }
  };

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

  // Mouse parallax tracking
  useEffect(() => {
    const handleMouse = (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Realistic night sky canvas — 3 depth layers + shooting stars + nebula
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let layers = []; // 3 depth layers
    let shootingStars = [];
    let nebulaPatches = [];

    // Realistic star color palette
    const starColors = () => {
      const r = Math.random();
      if (r < 0.55) return '#ffffff';                                      // white
      if (r < 0.70) return `hsl(${38 + Math.random()*12}, ${60+Math.random()*30}%, ${85+Math.random()*12}%)`;  // warm yellow
      if (r < 0.82) return `hsl(${15 + Math.random()*15}, ${50+Math.random()*30}%, ${82+Math.random()*15}%)`;  // warm orange/red
      if (r < 0.92) return `hsl(${210 + Math.random()*30}, ${60+Math.random()*30}%, ${78+Math.random()*18}%)`; // cool blue
      return `hsl(${190 + Math.random()*40}, ${70+Math.random()*25}%, ${85+Math.random()*12}%)`;               // blue-white
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initSky();
    };

    const initSky = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      layers = [];

      // Layer 0: far stars — tiny, many, slow twinkle, minimal parallax
      const farStars = [];
      for (let i = 0; i < 400; i++) {
        farStars.push({
          x: Math.random() * w * 1.2 - w * 0.1,
          y: Math.random() * h * 1.2 - h * 0.1,
          r: Math.random() * 0.7 + 0.2,
          baseAlpha: Math.random() * 0.25 + 0.03,
          twinkleSpeed: Math.random() * 0.003 + 0.001,
          phase: Math.random() * Math.PI * 2,
          color: starColors(),
          depth: 0.15,
        });
      }
      layers.push(farStars);

      // Layer 1: mid stars — moderate size, moderate twinkle
      const midStars = [];
      for (let i = 0; i < 180; i++) {
        midStars.push({
          x: Math.random() * w * 1.3 - w * 0.15,
          y: Math.random() * h * 1.3 - h * 0.15,
          r: Math.random() * 1.2 + 0.4,
          baseAlpha: Math.random() * 0.45 + 0.1,
          twinkleSpeed: Math.random() * 0.006 + 0.002,
          phase: Math.random() * Math.PI * 2,
          color: starColors(),
          depth: 0.4,
        });
      }
      layers.push(midStars);

      // Layer 2: near stars — bright, large, fast twinkle, strong parallax
      const nearStars = [];
      for (let i = 0; i < 60; i++) {
        nearStars.push({
          x: Math.random() * w * 1.4 - w * 0.2,
          y: Math.random() * h * 1.4 - h * 0.2,
          r: Math.random() * 2.0 + 0.8,
          baseAlpha: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 0.01 + 0.003,
          phase: Math.random() * Math.PI * 2,
          color: starColors(),
          depth: 0.8,
          // some near stars get diffraction spikes
          spikes: Math.random() > 0.6,
        });
      }
      layers.push(nearStars);

      // Nebula patches — very faint colored clouds
      nebulaPatches = [];
      const nebulaColors = [
        'rgba(30,10,60,0.04)',   // deep purple
        'rgba(10,20,50,0.035)',  // dark blue
        'rgba(40,15,15,0.025)',  // dark red
        'rgba(10,30,30,0.03)',   // teal
        'rgba(20,10,40,0.03)',   // indigo
      ];
      for (let i = 0; i < 6; i++) {
        nebulaPatches.push({
          x: Math.random() * w,
          y: Math.random() * h,
          rx: 150 + Math.random() * 300,
          ry: 100 + Math.random() * 200,
          color: nebulaColors[i % nebulaColors.length],
          rotation: Math.random() * Math.PI,
          depth: 0.1 + Math.random() * 0.2,
        });
      }
    };

    // Spawn a shooting star
    const spawnShoot = (w, h) => {
      const startX = Math.random() * w * 0.8;
      const startY = Math.random() * h * 0.4;
      const angle = (Math.PI / 6) + Math.random() * (Math.PI / 4);
      const speed = 6 + Math.random() * 8;
      const length = 60 + Math.random() * 120;
      return {
        x: startX, y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length, life: 1.0, decay: 0.008 + Math.random() * 0.012,
        width: 1.0 + Math.random() * 1.2,
      };
    };

    const draw = (time) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const mx = mouseRef.current.x - 0.5; // -0.5 to 0.5
      const my = mouseRef.current.y - 0.5;

      ctx.clearRect(0, 0, w, h);

      // Draw nebula patches first (behind everything)
      for (const nb of nebulaPatches) {
        ctx.save();
        const px = nb.x + mx * nb.depth * 20;
        const py = nb.y + my * nb.depth * 20;
        ctx.translate(px, py);
        ctx.rotate(nb.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, nb.rx, nb.ry, 0, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(nb.rx, nb.ry));
        grad.addColorStop(0, nb.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.restore();
      }

      // Draw star layers with parallax
      for (const layer of layers) {
        for (const s of layer) {
          const parallaxX = mx * s.depth * 30;
          const parallaxY = my * s.depth * 30;
          const sx = s.x + parallaxX;
          const sy = s.y + parallaxY;

          // Skip if outside viewport
          if (sx < -5 || sx > w + 5 || sy < -5 || sy > h + 5) continue;

          const alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.phase) * s.baseAlpha * 0.7;
          const a = Math.max(0, Math.min(1, alpha));

          // Star core
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = a;
          ctx.fill();

          // Glow halo for medium+ stars
          if (s.r > 0.8) {
            const glowR = s.r * (s.r > 1.5 ? 5 : 3);
            const grd = ctx.createRadialGradient(sx, sy, s.r * 0.3, sx, sy, glowR);
            grd.addColorStop(0, s.color);
            grd.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.globalAlpha = a * (s.r > 1.5 ? 0.2 : 0.1);
            ctx.fill();
          }

          // Diffraction spikes for select bright stars
          if (s.spikes && s.r > 1.0) {
            ctx.globalAlpha = a * 0.35;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 0.5;
            const spikeLen = s.r * 6;
            for (let angle = 0; angle < Math.PI; angle += Math.PI / 2) {
              ctx.beginPath();
              ctx.moveTo(sx - Math.cos(angle) * spikeLen, sy - Math.sin(angle) * spikeLen);
              ctx.lineTo(sx + Math.cos(angle) * spikeLen, sy + Math.sin(angle) * spikeLen);
              ctx.stroke();
            }
          }
        }
      }

      // Shooting stars
      if (Math.random() < 0.006 && shootingStars.length < 3) {
        shootingStars.push(spawnShoot(w, h));
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= ss.decay;
        if (ss.life <= 0 || ss.x > w + 50 || ss.y > h + 50) {
          shootingStars.splice(i, 1);
          continue;
        }
        const tailX = ss.x - (ss.vx / Math.hypot(ss.vx, ss.vy)) * ss.length * ss.life;
        const tailY = ss.y - (ss.vy / Math.hypot(ss.vx, ss.vy)) * ss.length * ss.life;
        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.7, `rgba(255,255,255,${ss.life * 0.3})`);
        grad.addColorStop(1, `rgba(255,255,255,${ss.life * 0.9})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = ss.width * ss.life;
        ctx.globalAlpha = 1;
        ctx.stroke();
        // bright head
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.width * ss.life * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = ss.life * 0.8;
        ctx.fill();
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

  const navTo=(p)=>{ window.history.pushState({}, '', p === 'landing' ? '/' : '/' + p); setPage(p); setMobileMenu(false); window.scrollTo({top:0,left:0,behavior:"auto"}); if(p==="app") setPhase("form"); };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.replace('/', '') || 'landing';
      setPage(p);
      window.scrollTo({top:0,left:0,behavior:"auto"});
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (page === "admin") {
    const adminMetricCards=[
      {title:"Total Users",val:adminStats?.totalUsers||0,sub:"registered accounts"},
      {title:"Net Revenue",val:"Rs "+(adminStats?.totalRevenue||0).toLocaleString(),sub:"Razorpay tracked"},
      {title:"Active Subs",val:adminStats?.activeSubs||0,sub:"paid workspaces"},
      {title:"Missions",val:adminStats?.totalMissions||0,sub:"agent runs"},
      {title:"Documents",val:adminStats?.totalResumes||0,sub:"resumes generated"}
    ];
    return (
      <div className="admin-premium-shell">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400..800&family=Wix+Madefor+Text:wght@400..800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          .admin-premium-shell{min-height:100vh;background:#F5F5F7;color:#1D1D1F;font-family:'Wix Madefor Text',sans-serif;display:grid;grid-template-columns:280px 1fr}
          .admin-premium-shell:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 70% 8%,rgba(0,113,227,.12),transparent 28%),radial-gradient(circle at 18% 78%,rgba(184,192,204,.18),transparent 30%);pointer-events:none}
          .admin-side{position:relative;z-index:1;background:rgba(255,255,255,.82);border-right:1px solid #E5E5EA;backdrop-filter:blur(20px);padding:24px;display:flex;flex-direction:column;gap:20px}
          .admin-brand{display:flex;align-items:center;gap:12px;padding-bottom:22px;border-bottom:1px solid #E5E5EA}
          .admin-brand-mark{width:38px;height:38px;border-radius:8px;background:linear-gradient(180deg,#1D1D1F,#3A3A3C);color:#FFFFFF;display:grid;place-items:center;font-family:'Wix Madefor Display',sans-serif;font-weight:900}
          .admin-brand-title{font-family:'Wix Madefor Display',sans-serif;font-weight:900;font-size:18px;color:#1D1D1F;letter-spacing:0}
          .admin-brand-title span{color:#0071E3}
          .admin-brand-sub{font-size:11px;color:#6E6E73;margin-top:2px}
          .admin-nav{display:grid;gap:8px}
          .admin-nav button{border:1px solid transparent;background:transparent;border-radius:8px;padding:12px 13px;text-align:left;color:#6E6E73;font-family:'Wix Madefor Display',sans-serif;font-weight:800;font-size:13px;cursor:pointer}
          .admin-nav button.active{background:#FFFFFF;border-color:#E5E5EA;color:#1D1D1F;box-shadow:0 12px 28px rgba(0,0,0,.045)}
          .admin-nav button:hover{background:#FFFFFF;color:#1D1D1F}
          .admin-side-footer{margin-top:auto;display:grid;gap:10px}
          .admin-main{position:relative;z-index:1;height:100vh;overflow:auto;padding:34px}
          .admin-wrap{max-width:1180px;margin:0 auto}
          .admin-hero{position:relative;overflow:hidden;background:linear-gradient(180deg,#171719 0%,#080809 100%);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:40px;margin-bottom:22px;color:#F5F5F7;box-shadow:0 24px 70px rgba(0,0,0,.16)}
          .admin-hero:before{content:"";position:absolute;inset:-35%;background:radial-gradient(circle at 50% 25%,rgba(0,113,227,.25),transparent 25%),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:auto,62px 62px,62px 62px;transform:perspective(900px) rotateX(62deg);opacity:.55}
          .admin-hero > *{position:relative;z-index:1}
          .admin-kicker{font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#B8C0CC;margin-bottom:14px}
          .admin-title{font-family:'Wix Madefor Display',sans-serif;font-size:clamp(36px,5vw,72px);line-height:.98;font-weight:900;color:#FFFFFF;margin-bottom:14px}
          .admin-copy{font-size:14px;line-height:1.8;color:rgba(245,245,247,.7);max-width:620px}
          .admin-login-card{max-width:480px;margin:40px auto 0;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:28px;box-shadow:0 20px 54px rgba(0,0,0,.07)}
          .admin-login-card label{display:block;font-size:11px;color:#6E6E73;font-weight:800;margin-bottom:7px}
          .admin-login-card input{width:100%;padding:14px;border:1px solid #D2D2D7;border-radius:8px;background:#FFFFFF;color:#1D1D1F;font-size:14px;margin-bottom:14px;outline:none}
          .admin-login-card input:focus{border-color:#0071E3;box-shadow:0 0 0 4px rgba(0,113,227,.1)}
          .admin-primary{background:#0071E3;border:1px solid #0071E3;border-radius:8px;color:#FFFFFF;font-family:'Wix Madefor Display',sans-serif;font-weight:900;font-size:14px;padding:13px 16px;cursor:pointer;box-shadow:0 16px 34px rgba(0,113,227,.18)}
          .admin-secondary{background:#FFFFFF;border:1px solid #D2D2D7;border-radius:8px;color:#1D1D1F;font-family:'Wix Madefor Display',sans-serif;font-weight:900;font-size:13px;padding:12px 14px;cursor:pointer}
          .admin-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:22px}
          .admin-metric{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:20px;box-shadow:0 16px 40px rgba(0,0,0,.04)}
          .admin-metric-label{font-size:11px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#6E6E73;margin-bottom:20px}
          .admin-metric-value{font-family:'Wix Madefor Display',sans-serif;font-size:32px;font-weight:900;color:#1D1D1F;letter-spacing:0}
          .admin-metric-sub{font-size:12px;color:#6E6E73;margin-top:4px}
          .admin-panel{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:24px;box-shadow:0 18px 44px rgba(0,0,0,.045)}
          .admin-panel-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:18px}
          .admin-panel-title{font-family:'Wix Madefor Display',sans-serif;font-size:24px;font-weight:900;color:#1D1D1F}
          .admin-panel-copy{font-size:13px;color:#6E6E73;margin-top:4px}
          .admin-table-wrap{overflow:auto;border:1px solid #E5E5EA;border-radius:8px}
          .admin-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:13px}
          .admin-table th{padding:13px 16px;background:#F5F5F7;color:#6E6E73;font-size:10px;letter-spacing:1px;text-transform:uppercase}
          .admin-table td{padding:15px 16px;border-top:1px solid #E5E5EA;color:#424245}
          .admin-user{display:flex;align-items:center;gap:10px}
          .admin-avatar{width:34px;height:34px;border-radius:8px;background:#F5F5F7;border:1px solid #E5E5EA;display:grid;place-items:center;overflow:hidden;color:#6E6E73;font-weight:900}
          .admin-avatar img{width:100%;height:100%;object-fit:cover}
          .admin-user-name{font-family:'Wix Madefor Display',sans-serif;font-weight:900;color:#1D1D1F}
          .admin-user-email{font-size:12px;color:#6E6E73;margin-top:2px}
          .admin-pill{display:inline-flex;border-radius:8px;background:#F5F5F7;border:1px solid #E5E5EA;padding:5px 9px;color:#6E6E73;font-weight:900;font-size:11px;text-transform:uppercase}
          .admin-pill.paid{background:rgba(0,113,227,.08);border-color:rgba(0,113,227,.16);color:#0066CC}
          .admin-premium-shell,.admin-premium-shell *{font-weight:400!important}
          .admin-title,.admin-panel-title,.admin-brand-title,.admin-metric-value,.admin-user-name{font-weight:500!important;letter-spacing:0!important}
          .admin-kicker,.admin-metric-label,.admin-pill,.admin-nav button,.admin-primary,.admin-secondary{font-weight:500!important}
          .admin-premium-shell input{font-weight:400!important}
          @media (max-width:900px){.admin-premium-shell{grid-template-columns:1fr}.admin-side{position:relative}.admin-main{height:auto;padding:18px}.admin-metrics{grid-template-columns:1fr 1fr}.admin-hero{padding:28px}}
          @media (max-width:620px){.admin-metrics{grid-template-columns:1fr}.admin-panel{padding:14px}}
        `}</style>

        <aside className="admin-side">
          <div className="admin-brand">
            <div className="admin-brand-mark">J</div>
            <div>
              <div className="admin-brand-title">JobHunter<span>.Admin</span></div>
              <div className="admin-brand-sub">Platform command center</div>
            </div>
          </div>
          <div className="admin-nav">
            <button className="active">Platform Overview</button>
            <button onClick={()=>navTo("landing")}>Back to website</button>
          </div>
          <div className="admin-side-footer">
            {adminToken&&<button className="admin-secondary" onClick={()=>{setAdminToken("");localStorage.removeItem('adminToken');}}>Sign out</button>}
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-wrap">
            {!adminToken?<>
              <section className="admin-hero">
                <div className="admin-kicker">Admin perimeter</div>
                <h1 className="admin-title">Secure access for the operator console.</h1>
                <p className="admin-copy">Authenticate to view platform health, revenue, subscriptions, missions and the user directory.</p>
              </section>
              <form className="admin-login-card" onSubmit={handleAdminLogin}>
                <div className="admin-kicker" style={{color:"#0066CC",letterSpacing:2}}>Credentials</div>
                <div className="admin-panel-title" style={{marginBottom:8}}>Admin login</div>
                <p className="admin-panel-copy" style={{marginBottom:22}}>Use your designated admin identity and passphrase.</p>
                <label>Admin Identity</label>
                <input type="text" placeholder="Enter admin identity" value={adminUName} onChange={e=>setAdminUName(e.target.value)} required/>
                <label>Passphrase</label>
                <input type="password" placeholder="Enter passphrase" value={adminPass} onChange={e=>setAdminPass(e.target.value)} required/>
                <button className="admin-primary" type="submit" style={{width:"100%",marginTop:4}}>Authorize console</button>
              </form>
            </>:<>
              <section className="admin-hero">
                <div className="admin-kicker">Live platform telemetry</div>
                <h1 className="admin-title">Platform overview.</h1>
                <p className="admin-copy">Real-time aggregate analytics, revenue signals, active subscriptions and user activity for JobHunter.AI.</p>
              </section>
              <div className="admin-metrics">
                {adminMetricCards.map(card=><div className="admin-metric" key={card.title}>
                  <div className="admin-metric-label">{card.title}</div>
                  <div className="admin-metric-value">{card.val}</div>
                  <div className="admin-metric-sub">{card.sub}</div>
                </div>)}
              </div>
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <div className="admin-panel-title">User directory</div>
                    <div className="admin-panel-copy">Accounts, plan state, missions and generated resumes.</div>
                  </div>
                  <div className="admin-pill">{adminUsers.length} users</div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr>{["User","Registered","Plan","Missions","Resumes"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {adminUsers.map((u,i)=><tr key={i}>
                        <td>
                          <div className="admin-user">
                            <div className="admin-avatar">{u.image_url?<img src={u.image_url} alt=""/>:(u.name?.[0]||"?")}</div>
                            <div><div className="admin-user-name">{u.name||"Anonymous"}</div><div className="admin-user-email">{u.email||"No email"}</div></div>
                          </div>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td><span className={`admin-pill ${u.plan_name?"paid":""}`}>{u.plan_name||"Free"}</span></td>
                        <td>{u.total_missions}</td>
                        <td>{u.total_resumes}</td>
                      </tr>)}
                      {adminUsers.length===0&&<tr><td colSpan={5} style={{padding:36,textAlign:"center",color:"#6E6E73"}}>No users found. Ensure CLERK_SECRET_KEY is set in backend .env.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>}
          </div>
        </main>
      </div>
    );
  }

  if (page === "admin") {
    return (
      <div style={{minHeight:"100vh", background:"#F5F5F7", color:"#1D1D1F", fontFamily:"'Wix Madefor Text',sans-serif", display:"flex"}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400..800&family=Wix+Madefor+Text:wght@400..800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#D2D2D7;border-radius:4px}
          .admin-sidebar-item { padding:12px 20px; color:#86868B; cursor:pointer; font-weight:500; font-family:'Wix Madefor Display',sans-serif; transition:all 0.2s; border-left: 3px solid transparent; }
          .admin-sidebar-item:hover { color:#1D1D1F; background:#F5F5F7; }
          .admin-sidebar-item.active { color:#0071E3; background:rgba(0,113,227,0.05); border-left-color:#0071E3; font-weight:600; }
        `}</style>

        {/* Enterprise Sidebar */}
        <div style={{width:260, background:"#FFFFFF", borderRight:"1px solid #E5E5EA", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"32px 24px", borderBottom:"1px solid #E5E5EA", marginBottom:16}}>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:20,letterSpacing:"-0.3px",color:"#1D1D1F"}}>JobHunter<span style={{color:"#EF4444"}}>.ADMIN</span></div>
            <div style={{fontSize:11,color:"#86868B",marginTop:4}}>Enterprise Management</div>
          </div>
          
          <div className="admin-sidebar-item active">📊 Platform Overview</div>
          <div className="admin-sidebar-item" onClick={()=>navTo("landing")}>← Back to Consumer App</div>
          
          <div style={{marginTop:"auto", padding:24}}>
            {adminToken && <button onClick={()=>{setAdminToken("");localStorage.removeItem('adminToken');}} style={{width:"100%", background:"transparent",border:"1px solid #E5E5EA",borderRadius:10,padding:"10px",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer",color:"#1D1D1F"}}>Sign Out</button>}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{flex:1, height:"100vh", overflow:"auto"}}>
          <div style={{maxWidth:1000, margin:"0 auto", padding:"40px 32px"}}>
            {!adminToken ? (
              <div style={{maxWidth:400,margin:"80px auto",background:"#fff",padding:32,borderRadius:24,border:"1px solid #E5E5EA",textAlign:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:40,marginBottom:16}}>🔐</div>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:22,marginBottom:8}}>Secure Auth Required</div>
                <div style={{fontSize:13,color:"#86868B",marginBottom:24,lineHeight:1.5}}>Please authenticate using your designated admin perimeter credentials.</div>
                <form onSubmit={handleAdminLogin}>
                  <input type="text" placeholder="Admin Identity" value={adminUName} onChange={e=>setAdminUName(e.target.value)} style={{width:"100%",padding:14,borderRadius:12,border:"1px solid #D2D2D7",marginBottom:12,fontFamily:"'Wix Madefor Text',sans-serif",fontSize:14,outline:"none"}} required/>
                  <input type="password" placeholder="Passphrase" value={adminPass} onChange={e=>setAdminPass(e.target.value)} style={{width:"100%",padding:14,borderRadius:12,border:"1px solid #D2D2D7",marginBottom:24,fontFamily:"'Wix Madefor Text',sans-serif",fontSize:14,outline:"none"}} required/>
                  <button type="submit" style={{width:"100%",background:"#1D1D1F",color:"#fff",padding:14,borderRadius:12,border:"none",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,cursor:"pointer"}}>Authorize</button>
                </form>
              </div>
            ) : (
              <div>
                <div style={{marginBottom:32}}>
                  <h1 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:32,letterSpacing:"-0.5px",color:"#1D1D1F"}}>Platform Overview</h1>
                  <p style={{fontSize:14, color:"#86868B", marginTop:4}}>Real-time aggregate analytics and user telemetry</p>
                </div>
                
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:40}}>
                  {[{title:"Total Users",val:adminStats?.totalUsers||0,icon:"👥"},{title:"Net Revenue",val:"₹"+(adminStats?.totalRevenue||0).toLocaleString(),icon:"💳"},{title:"Active Subscriptions",val:adminStats?.activeSubs||0,icon:"⭐"},{title:"Missions Executed",val:adminStats?.totalMissions||0,icon:"🚀"},{title:"Documents Gen",val:adminStats?.totalResumes||0,icon:"📄"}].map((s,i)=>(
                    <div key={i} style={{background:"#fff",border:"1px solid #E5E5EA",borderRadius:16,padding:20,boxShadow:"0 2px 10px rgba(0,0,0,0.02)"}}>
                      <div style={{fontSize:24,marginBottom:12}}>{s.icon}</div>
                      <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:32,color:"#1D1D1F",letterSpacing:"-1px"}}>{s.val}</div>
                      <div style={{fontSize:12,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,marginTop:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.title}</div>
                    </div>
                  ))}
                </div>

                <h2 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:20,marginBottom:16}}>User Directory</h2>
                <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.02)"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}>
                    <thead>
                      <tr style={{background:"#F5F5F7",borderBottom:"1px solid #E5E5EA"}}>
                        {["User Identity","Registered Date","Active Tier","Missions","Resumes"].map(h=><th key={h} style={{padding:"14px 20px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,fontSize:11,color:"#86868B",letterSpacing:"0.5px",textTransform:"uppercase"}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid #F0F0F0"}}>
                          <td style={{padding:"16px 20px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:"#E5E5EA",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"#86868B"}}>
                                {u.image_url?<img src={u.image_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(u.name?.[0]||"?")}
                              </div>
                              <div>
                                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:14,color:"#1D1D1F"}}>{u.name||"Anonymous"}</div>
                                <div style={{fontSize:12,color:"#86868B"}}>{u.email||"No email"}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{padding:"16px 20px",fontSize:13,color:"#424245"}}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td style={{padding:"16px 20px"}}>
                            <span style={{background:u.plan_name?"rgba(0,113,227,0.1)":"#F5F5F7",color:u.plan_name?"#0071E3":"#86868B",padding:"4px 10px",borderRadius:20,fontSize:11,fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,textTransform:"uppercase"}}>{u.plan_name||"Free"}</span>
                          </td>
                          <td style={{padding:"16px 20px",fontSize:13,color:"#424245"}}>{u.total_missions}</td>
                          <td style={{padding:"16px 20px",fontSize:13,color:"#424245"}}>{u.total_resumes}</td>
                        </tr>
                      ))}
                      {adminUsers.length===0&&<tr><td colSpan={5} style={{padding:40,textAlign:"center",color:"#86868B",fontSize:13}}>No users found. Ensure CLERK_SECRET_KEY is set in backend .env</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
      .site-nav{height:72px!important;padding:0 32px!important;background:rgba(245,245,247,.72)!important;border-bottom:1px solid rgba(210,210,215,.68)!important;backdrop-filter:blur(24px) saturate(180%)!important;-webkit-backdrop-filter:blur(24px) saturate(180%)!important}
      .site-nav.nav-transparent{background:rgba(3,3,4,.22)!important;border-bottom:1px solid rgba(255,255,255,.08)!important}
      .brand-lockup{display:flex;align-items:center;gap:12px;cursor:pointer}
      .brand-mark{width:34px;height:34px;border-radius:8px;background:linear-gradient(180deg,#0071E3,#0066CC);display:grid;place-items:center;color:#FFFFFF;font-family:'Wix Madefor Display',sans-serif;font-weight:900;font-size:15px;box-shadow:0 14px 30px rgba(0,113,227,.22)}
      .brand-name{font-family:'Wix Madefor Display',sans-serif;font-size:17px;font-weight:800;letter-spacing:0;color:#1D1D1F;transition:color .25s ease}
      .nav-transparent .brand-name{color:#FFFFFF}
      .brand-name span{color:#0071E3}
      .brand-lockup > div:first-child{width:34px!important;height:34px!important;border-radius:8px!important;background:linear-gradient(180deg,#0071E3,#0066CC)!important;box-shadow:0 14px 30px rgba(0,113,227,.22)!important;color:transparent!important;position:relative}
      .brand-lockup > div:first-child:after{content:"J";position:absolute;inset:0;display:grid;place-items:center;color:#FFFFFF;font-family:'Wix Madefor Display',sans-serif;font-weight:900;font-size:15px}
      .brand-lockup > div:nth-child(2){font-weight:800!important;letter-spacing:0!important}
      .nav-links{gap:6px!important;align-items:center;background:rgba(255,255,255,.62);border:1px solid rgba(229,229,234,.8);border-radius:8px;padding:5px;box-shadow:0 14px 34px rgba(0,0,0,.045)}
      .nav-transparent .nav-links{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12);box-shadow:none}
      .nav-btn{border-radius:8px!important;padding:9px 13px!important;font-size:13px!important;font-weight:800!important;color:#6E6E73!important}
      .nav-btn:hover,.nav-btn.active{background:#FFFFFF!important;color:#1D1D1F!important;box-shadow:0 8px 18px rgba(0,0,0,.05)}
      .nav-transparent .nav-btn{color:rgba(245,245,247,.72)!important}
      .nav-transparent .nav-btn:hover,.nav-transparent .nav-btn.active{background:rgba(255,255,255,.12)!important;color:#FFFFFF!important;box-shadow:none}
      .nav-auth-btn{border:1px solid #D2D2D7!important;border-radius:8px!important;padding:9px 15px!important;background:#FFFFFF!important;color:#1D1D1F!important;font-family:'Wix Madefor Display',sans-serif!important;font-weight:800!important;font-size:13px!important;cursor:pointer!important}
      .nav-auth-primary{border-color:#0071E3!important;background:#0071E3!important;color:#FFFFFF!important;box-shadow:0 12px 26px rgba(0,113,227,.18)!important}
      body,button,input,select,textarea{font-weight:400!important}
      h1,h2,h3,h4,.hero-title,.section-title,.page-title,.route-title,.profile-name,.admin-title,.profile-plan-name,.profile-stat-value,.admin-metric-value{font-weight:600!important;letter-spacing:0!important}
      .section-kicker,.route-eyebrow,.page-kicker,.admin-kicker,.profile-plan-label,.profile-stat-label,.admin-metric-label{font-weight:500!important;letter-spacing:2px!important}
      .agent-name,.feature-title,.timeline-title,.form-title,.profile-panel-title,.admin-panel-title,.faq-q,.step-title,.result-person{font-weight:600!important}
      .landing-btn,.premium-button,.secondary-button,.page-chip,.feature-tag,.profile-pill,.admin-pill{font-weight:500!important}
      .site-nav{height:66px!important;padding:0 30px!important;background:rgba(250,250,252,.72)!important;border-bottom:1px solid rgba(229,229,234,.72)!important;box-shadow:none!important}
      .site-nav.nav-transparent{background:rgba(3,3,4,.38)!important;border-bottom:1px solid rgba(255,255,255,.08)!important}
      .brand-lockup{gap:11px!important}
      .brand-lockup > div:first-child{width:32px!important;height:32px!important;box-shadow:none!important}
      .brand-lockup > div:first-child:after{font-size:13px;font-weight:500}
      .brand-lockup > div:nth-child(2){font-weight:500!important;font-size:16px!important;letter-spacing:0!important}
      .brand-logo-img{width:32px;height:32px;border-radius:8px;display:block;box-shadow:0 12px 28px rgba(0,113,227,.18)}
      .brand-lockup > img + div{display:none!important}
      .brand-lockup > img + div + div{font-weight:500!important;font-size:16px!important;letter-spacing:0!important}
      .brand-lockup .brand-logo-img{display:none!important}
      .brand-lockup > div:first-of-type{display:none!important}
      .brand-lockup > div:last-child{display:block!important;font-family:'Wix Madefor Display',sans-serif!important;font-size:18px!important;font-weight:400!important;letter-spacing:0!important;color:#1D1D1F!important;transition:color .25s ease}
      .brand-lockup > div:last-child span{font-weight:500!important;color:#0071E3!important}
      .nav-transparent .brand-lockup > div:last-child{color:#FFFFFF!important}
      .nav-links{gap:22px!important;background:transparent!important;border:none!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
      .nav-transparent .nav-links{background:transparent!important;border:none!important}
      .nav-btn{position:relative;border-radius:0!important;padding:6px 0!important;background:transparent!important;box-shadow:none!important;font-size:13px!important;font-weight:400!important;color:#6E6E73!important}
      .nav-btn:hover,.nav-btn.active{background:transparent!important;box-shadow:none!important;color:#1D1D1F!important}
      .nav-btn.active:after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:1px;background:#0071E3;border-radius:1px}
      .nav-transparent .nav-btn{color:rgba(245,245,247,.7)!important}
      .nav-transparent .nav-btn:hover,.nav-transparent .nav-btn.active{background:transparent!important;color:#FFFFFF!important}
      .nav-transparent .nav-btn.active:after{background:rgba(255,255,255,.72)}
      .nav-auth-btn{border-radius:8px!important;padding:8px 16px!important;font-weight:500!important;font-size:13px!important;box-shadow:none!important;background:rgba(255,255,255,.9)!important}
      .nav-auth-primary{background:#0071E3!important;color:#FFFFFF!important;border-color:#0071E3!important;box-shadow:none!important}
      .page-shell,.landing-page,.page-shell *,.landing-page *{font-weight:400!important}
      .page-shell h1,.page-shell h2,.page-shell h3,.landing-page h1,.landing-page h2,.landing-page h3,
      .page-title,.hero-title,.section-title,.route-title,.profile-name,.profile-plan-name{font-weight:500!important;letter-spacing:0!important}
      .page-kicker,.section-kicker,.route-eyebrow,.profile-plan-label,.profile-stat-label,
      .agent-role,.feature-tag,.step-num{font-weight:500!important;letter-spacing:1.8px!important}
      .page-shell button,.landing-page button,.page-chip,.profile-pill,.premium-button,.secondary-button{font-weight:500!important}
      .agent-name,.feature-title,.timeline-title,.form-title,.profile-panel-title,.faq-q,.step-title,
      .profile-row-title,.pricing-card-title,.result-person{font-weight:500!important}
      .profile-stat-value,.metric-value,.admin-metric-value{font-weight:500!important}
      .page-shell input,.page-shell select,.page-shell textarea{font-weight:400!important}
      .page-shell strong,.landing-page strong{font-weight:500!important}
      .page-shell .profile-name,.page-shell .profile-identity .page-kicker,.page-shell .profile-identity .profile-email{color:#FFFFFF!important}
      .page-shell .profile-identity .profile-email{color:rgba(245,245,247,.72)!important}
      .pkg-btn:hover{opacity:0.85}
      .landing-page{
        --lp-ink:#1D1D1F;
        --lp-muted:#6E6E73;
        --lp-soft:#F5F5F7;
        --lp-card:#FFFFFF;
        --lp-line:#E5E5EA;
        --lp-blue:#0071E3;
        --lp-blue-deep:#0066CC;
        --lp-graphite:#030304;
        --lp-titanium:#B8C0CC;
        background:var(--lp-soft);color:var(--lp-ink);overflow:hidden
      }
      .landing-hero{min-height:100svh;position:relative;display:grid;align-items:center;overflow:hidden;background:#030304}
      .landing-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.09;filter:saturate(.28) contrast(1.12)}
      .landing-hero-shade{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.08),transparent 20%),radial-gradient(circle at 72% 32%,rgba(0,113,227,.2),transparent 24%),radial-gradient(circle at 22% 72%,rgba(184,192,204,.08),transparent 24%),linear-gradient(180deg,rgba(3,3,4,.7) 0%,rgba(3,3,4,.92) 72%,var(--lp-graphite) 100%)}
      .agent-field{position:absolute;inset:-12%;z-index:2;opacity:.2;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:78px 78px;transform:perspective(900px) rotateX(62deg) translateY(-16%);transform-origin:center top;mask-image:linear-gradient(180deg,transparent 0%,#000 24%,#000 58%,transparent 100%);animation:agentGrid 22s linear infinite}
      @keyframes agentGrid{from{background-position:0 0,0 0}to{background-position:64px 64px,64px 64px}}
      .landing-wrap{width:min(1180px,calc(100% - 48px));margin:0 auto;position:relative;z-index:4}
      .hero-grid{display:block;padding:138px 0 74px}
      .hero-content{position:relative;z-index:5;max-width:920px;margin:0 auto;text-align:center}
      .eyebrow{display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:8px;color:#F5F5F7;background:rgba(255,255,255,.065);font-size:12px;font-weight:700;backdrop-filter:blur(16px)}
      .status-dot{width:8px;height:8px;border-radius:50%;background:#34C759;box-shadow:0 0 0 4px rgba(52,199,89,.18)}
      .hero-title{font-family:'Wix Madefor Display',sans-serif;font-size:clamp(52px,8vw,112px);line-height:.92;font-weight:800;color:#FFFFFF;margin:24px auto 24px;letter-spacing:0;text-wrap:balance;text-shadow:0 24px 90px rgba(0,0,0,.72)}
      .hero-title span{background:linear-gradient(180deg,#FFFFFF 0%,#EEF1F6 46%,var(--lp-titanium) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .hero-copy{max-width:710px;color:rgba(245,245,247,.72);font-size:20px;line-height:1.65;margin:0 auto 32px;text-wrap:balance}
      .hero-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:34px}
      .landing-btn{border-radius:8px;border:1px solid transparent;padding:15px 22px;font-family:'Wix Madefor Display',sans-serif;font-weight:800;font-size:15px;cursor:pointer;transition:transform .2s ease,background .2s ease,border-color .2s ease,color .2s ease}
      .landing-btn:hover{transform:translateY(-2px)}
      .landing-btn.primary{background:var(--lp-blue);color:#FFFFFF;border-color:var(--lp-blue);box-shadow:0 18px 36px rgba(0,113,227,.28)}
      .landing-btn.secondary{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.24);color:#F5F5F7}
      .proof-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
      .proof-pill{border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:9px 11px;color:rgba(245,245,247,.72);font-size:12px;font-weight:700;background:rgba(255,255,255,.045);backdrop-filter:blur(14px)}
      .hero-agent-bg{position:absolute;inset:0;z-index:2;pointer-events:none;perspective:1200px;opacity:.68}
      .hero-agent-orb{position:absolute;left:68%;top:50%;width:min(50vw,620px);aspect-ratio:1;transform:translate(-50%,-48%);border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.16) 0%,rgba(0,113,227,.16) 28%,transparent 66%);filter:blur(4px)}
      .agent-3d-core{position:absolute;left:69%;top:50%;width:196px;height:196px;margin:-98px 0 0 -98px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(0,113,227,.15));transform-style:preserve-3d;animation:agentCore 10s ease-in-out infinite;box-shadow:0 36px 128px rgba(0,113,227,.3)}
      .agent-3d-core:before,.agent-3d-core:after{content:"";position:absolute;inset:24px;border:1px solid rgba(255,255,255,.18);border-radius:8px;transform:translateZ(48px)}
      .agent-3d-core:after{inset:52px;background:linear-gradient(135deg,var(--lp-soft),#AEB6C2);border-color:rgba(255,255,255,.7);box-shadow:0 0 34px rgba(255,255,255,.16);transform:translateZ(92px)}
      .agent-orbit{position:absolute;left:69%;top:50%;width:min(56vw,760px);height:min(20vw,250px);margin:calc(min(20vw,250px) / -2) 0 0 calc(min(56vw,760px) / -2);border:1px solid rgba(255,255,255,.16);border-radius:50%;transform:rotateX(64deg);animation:agentOrbit 18s linear infinite}
      .agent-orbit.two{width:min(66vw,900px);height:min(25vw,320px);margin:calc(min(25vw,320px) / -2) 0 0 calc(min(66vw,900px) / -2);transform:rotateX(68deg) rotateZ(54deg);animation-duration:18s}
      .agent-orbit.three{width:min(46vw,590px);height:min(30vw,380px);margin:calc(min(30vw,380px) / -2) 0 0 calc(min(46vw,590px) / -2);transform:rotateX(72deg) rotateZ(-32deg);animation-duration:22s}
      .agent-chip{position:absolute;border:1px solid rgba(255,255,255,.13);background:rgba(17,17,19,.52);color:rgba(245,245,247,.82);border-radius:8px;padding:9px 12px;font-size:12px;font-weight:900;backdrop-filter:blur(12px);box-shadow:0 18px 44px rgba(0,0,0,.18)}
      .agent-chip.one{left:14%;top:29%;animation:agentFloat 4.8s ease-in-out infinite}
      .agent-chip.two{right:14%;top:25%;animation:agentFloat 5.4s ease-in-out infinite .4s}
      .agent-chip.three{left:18%;bottom:25%;animation:agentFloat 5.8s ease-in-out infinite .8s}
      .agent-chip.four{right:19%;bottom:28%;animation:agentFloat 4.6s ease-in-out infinite 1.1s}
      .agent-chip.five{left:50%;bottom:14%;animation:agentFloat 5.2s ease-in-out infinite .6s}
      @keyframes agentCore{0%,100%{transform:rotateX(58deg) rotateZ(-28deg) translateY(0) scale(1)}50%{transform:rotateX(64deg) rotateZ(-18deg) translateY(-14px) scale(1.04)}}
      @keyframes agentOrbit{from{transform:rotateX(64deg) rotateZ(0deg)}to{transform:rotateX(64deg) rotateZ(360deg)}}
      @keyframes agentFloat{0%,100%{transform:translateY(0) translateZ(20px)}50%{transform:translateY(-10px) translateZ(42px)}}
      .panel-top{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:14px;margin-bottom:14px;color:#F5F5F7}
      .panel-label{font-size:12px;color:rgba(245,245,247,.55);font-weight:700}
      .panel-score{font-family:'Wix Madefor Display',sans-serif;font-size:44px;font-weight:800;color:var(--lp-titanium);line-height:1}
      .metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
      .metric-card{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:14px}
      .metric-card strong{display:block;color:#F5F5F7;font-size:22px;font-family:'Wix Madefor Display',sans-serif;margin-bottom:4px}
      .metric-card span{color:rgba(245,245,247,.55);font-size:12px;font-weight:700}
      .pipeline-list{display:grid;gap:8px}
      .pipeline-item{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:10px 12px;color:#F5F5F7}
      .pipeline-icon{width:26px;height:26px;border-radius:8px;background:var(--lp-blue);color:#FFFFFF;display:grid;place-items:center;font-weight:900;font-size:12px}
      .pipeline-text{font-size:13px;font-weight:800}
      .pipeline-sub{font-size:11px;color:rgba(245,245,247,.5);margin-top:2px}
      .pipeline-chip{font-size:11px;color:#34C759;font-weight:900}
      .landing-section{padding:96px 0;background:var(--lp-soft)}
      .section-head{display:flex;justify-content:space-between;gap:32px;align-items:end;margin-bottom:34px}
      .section-kicker{color:var(--lp-blue-deep);font-size:12px;font-weight:900;text-transform:uppercase;margin-bottom:10px}
      .section-title{font-family:'Wix Madefor Display',sans-serif;font-size:clamp(34px,5vw,62px);line-height:1.02;font-weight:800;color:var(--lp-ink);margin:0;letter-spacing:0}
      .section-copy{max-width:420px;color:var(--lp-muted);font-size:16px;line-height:1.7}
      .agent-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
      .agent-feature{background:rgba(255,255,255,.9);border:1px solid var(--lp-line);border-radius:8px;padding:22px;min-height:188px;box-shadow:0 18px 44px rgba(0,0,0,.045);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;backdrop-filter:blur(16px)}
      .agent-feature:hover{transform:translateY(-4px);border-color:#C7CED8!important;background:var(--lp-card)!important;box-shadow:0 24px 54px rgba(0,0,0,.09)!important}
      .agent-code{width:38px;height:38px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,var(--lp-ink),#3A3A3C);color:var(--lp-soft);font-weight:900;margin-bottom:18px}
      .agent-name{font-family:'Wix Madefor Display',sans-serif;font-weight:800;font-size:20px;color:var(--lp-ink);margin-bottom:6px}
      .agent-role{font-size:12px;color:var(--lp-blue-deep);font-weight:900;margin-bottom:14px}
      .agent-desc{font-size:14px;line-height:1.6;color:var(--lp-muted)}
      .steps-band{background:linear-gradient(180deg,#171719 0%,#080809 100%);color:var(--lp-soft)}
      .steps-band .section-title{color:var(--lp-soft)}
      .steps-band .section-copy{color:rgba(245,245,247,.68)}
      .step-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.16);border-radius:8px;overflow:hidden}
      .step-card{background:#252527;padding:28px;min-height:230px}
      .step-num{color:var(--lp-titanium);font-weight:900;font-size:13px;margin-bottom:34px}
      .step-title{font-family:'Wix Madefor Display',sans-serif;font-size:22px;font-weight:800;margin-bottom:12px}
      .step-copy{color:rgba(245,245,247,.66);line-height:1.65;font-size:14px}
      .results-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
      .result-card{background:var(--lp-card);border:1px solid var(--lp-line);border-radius:8px;padding:26px;box-shadow:0 18px 44px rgba(0,0,0,.05)}
      .result-quote{font-size:17px;line-height:1.6;color:var(--lp-ink);margin-bottom:26px}
      .result-person{font-weight:900;color:var(--lp-ink)}
      .result-role{font-size:13px;color:var(--lp-muted);margin-top:4px}
      .cta-panel{background:linear-gradient(180deg,#171719 0%,#080809 100%);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:58px;display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;color:var(--lp-soft);box-shadow:0 22px 60px rgba(0,0,0,.12)}
      .cta-panel h2{font-family:'Wix Madefor Display',sans-serif;font-size:clamp(34px,5vw,64px);line-height:1;font-weight:900;margin:0 0 16px;color:var(--lp-soft)}
      .cta-panel p{max-width:560px;color:rgba(245,245,247,.68);font-size:17px;line-height:1.65}
      .page-shell{min-height:calc(100vh - 78px);padding:40px 24px 72px;background:#F5F5F7;color:#1D1D1F;animation:fadeUp .5s ease}
      .page-shell.narrow{max-width:960px;margin:0 auto}
      .page-hero{text-align:center;margin:0 auto 56px;max-width:760px}
      .page-kicker{font-family:'Wix Madefor Text',sans-serif;font-weight:800;font-size:11px;color:#0066CC;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
      .page-title{font-family:'Wix Madefor Display',sans-serif;font-weight:800;font-size:clamp(36px,7vw,76px);line-height:.98;letter-spacing:0;color:#1D1D1F;margin:0 0 16px;text-wrap:balance}
      .page-title span{background:linear-gradient(180deg,#1D1D1F 0%,#6E6E73 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .page-subtitle{font-size:15px;color:#6E6E73;line-height:1.8;max-width:560px;margin:0 auto}
      .premium-card{background:#FFFFFF!important;border:1px solid #E5E5EA!important;border-radius:8px!important;box-shadow:0 18px 44px rgba(0,0,0,.045)!important}
      .premium-soft{background:#F5F5F7!important;border:1px solid #E5E5EA!important;border-radius:8px!important}
      .premium-dark{background:linear-gradient(180deg,#171719 0%,#080809 100%)!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:8px!important;color:#F5F5F7!important}
      .accent-text{color:#0066CC!important}
      .premium-button{background:#0071E3!important;border:1px solid #0071E3!important;border-radius:8px!important;color:#FFFFFF!important;box-shadow:0 18px 36px rgba(0,113,227,.18)!important}
      .secondary-button{background:#FFFFFF!important;border:1px solid #D2D2D7!important;border-radius:8px!important;color:#1D1D1F!important}
      .page-chip{display:inline-flex;align-items:center;gap:6px;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:7px 11px;color:#1D1D1F;font-family:'Wix Madefor Display',sans-serif;font-weight:700;font-size:11px}
      .extension-icon{width:72px;height:72px;border-radius:8px;margin:0 auto 18px;display:grid;place-items:center;background:linear-gradient(135deg,#1D1D1F,#3A3A3C);color:#FFFFFF;font-size:30px;box-shadow:0 18px 44px rgba(0,0,0,.14)}
      .page-shell h1{font-family:'Wix Madefor Display',sans-serif!important;font-weight:800!important;letter-spacing:0!important;color:#1D1D1F!important}
      .page-shell h1 span{color:inherit!important;background:linear-gradient(180deg,#1D1D1F 0%,#6E6E73 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}
      .page-shell h3{color:#1D1D1F!important}
      .page-shell .agent-feature{border-radius:8px!important;border:1px solid #E5E5EA!important;background:#FFFFFF!important;box-shadow:0 18px 44px rgba(0,0,0,.045)!important}
      .page-shell button:not(.landing-btn):not(.menu-toggle):not(.nav-btn){border-radius:8px!important}
      .page-shell table th{color:#1D1D1F!important;border-bottom:1px solid #E5E5EA!important}
      .page-shell table td{border-bottom:1px solid #E5E5EA!important}
      .page-shell input,.page-shell select{border-radius:8px!important;border:1px solid #D2D2D7!important;background:#FFFFFF!important}
      .page-shell [style*="background:#FFFFFF"],
      .page-shell [style*="background: \"#FFFFFF\""],
      .page-shell [style*="background:#fff"],
      .page-shell [style*="background: #fff"]{background:#FFFFFF!important;border-color:#E5E5EA!important;border-radius:8px!important;box-shadow:0 18px 44px rgba(0,0,0,.045)!important}
      .page-shell [style*="background:#F5F5F7"],
      .page-shell [style*="background: #F5F5F7"],
      .page-shell [style*="background:#F1F5F9"],
      .page-shell [style*="background:#E0F7FA"],
      .page-shell [style*="background:rgba(0,113,227,0.04)"],
      .page-shell [style*="background:rgba(0,113,227,0.06)"],
      .page-shell [style*="background:rgba(0,113,227,0.08)"]{background:#F5F5F7!important;border-color:#E5E5EA!important;border-radius:8px!important}
      .page-shell [style*="borderRadius:20"],
      .page-shell [style*="borderRadius:16"],
      .page-shell [style*="borderRadius:14"],
      .page-shell [style*="borderRadius:12"],
      .page-shell [style*="borderRadius:980"]{border-radius:8px!important}
      .page-shell [style*="color:#0071E3"],
      .page-shell [style*="color: #0071E3"]{color:#0066CC!important}
      .page-shell [style*="color:#86868B"],
      .page-shell [style*="color: #86868B"],
      .page-shell [style*="color:#6B7280"],
      .page-shell [style*="color: #6B7280"],
      .page-shell [style*="color:#424245"],
      .page-shell [style*="color: #424245"]{color:#6E6E73!important}
      .page-shell [style*="background:#0071E3"],
      .page-shell [style*="background: #0071E3"]{background:#0071E3!important;color:#FFFFFF!important;border-color:#0071E3!important}
      .app-hero-panel{position:relative;overflow:hidden;background:linear-gradient(180deg,#171719 0%,#080809 100%);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:38px 28px;margin-bottom:34px;text-align:center;color:#F5F5F7;box-shadow:0 24px 70px rgba(0,0,0,.18)}
      .app-hero-panel:before{content:"";position:absolute;inset:-30%;background:radial-gradient(circle at 50% 20%,rgba(0,113,227,.22),transparent 28%),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:auto,64px 64px,64px 64px;opacity:.55;transform:perspective(800px) rotateX(62deg);pointer-events:none}
      .app-hero-panel > *{position:relative;z-index:1}
      .app-hero-panel .page-kicker{color:#B8C0CC}
      .app-hero-panel .page-title{color:#FFFFFF!important}
      .app-hero-panel .page-title span{background:linear-gradient(180deg,#FFFFFF 0%,#B8C0CC 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}
      .app-hero-panel .page-subtitle{color:rgba(245,245,247,.7)!important}
      .app-hero-panel h1{color:#FFFFFF!important;font-weight:800!important;letter-spacing:0!important}
      .app-hero-panel h1 span{background:linear-gradient(180deg,#FFFFFF 0%,#B8C0CC 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}
      .app-hero-panel p{color:rgba(245,245,247,.7)!important}
      .app-hero-panel .extension-icon{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);box-shadow:none}
      .route-hero{max-width:1100px;margin:0 auto 48px;padding:72px 32px}
      .route-hero .page-title{font-size:clamp(42px,7vw,86px)!important}
      .route-hero .page-kicker{margin-bottom:18px}
      .route-content{max-width:1100px;margin:0 auto}
      .page-shell > .mobile-col,.page-shell > .card-pad,.page-shell > .premium-soft{max-width:1100px;margin-left:auto;margin-right:auto}
      .mission-agent-strip{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:32px}
      .mission-agent-strip > div{background:#FFFFFF!important;border:1px solid #E5E5EA!important;border-radius:8px!important;color:#1D1D1F!important;box-shadow:0 10px 24px rgba(0,0,0,.04)!important}
      .route-section{max-width:1100px;margin:0 auto 56px}
      .route-section-head{display:flex;align-items:end;justify-content:space-between;gap:28px;margin-bottom:20px}
      .route-eyebrow{font-family:'Wix Madefor Text',sans-serif;font-size:11px;font-weight:900;letter-spacing:2.8px;text-transform:uppercase;color:#0066CC;margin-bottom:10px}
      .route-title{font-family:'Wix Madefor Display',sans-serif;font-size:clamp(28px,4vw,48px);line-height:1.05;font-weight:800;letter-spacing:0;color:#1D1D1F;margin:0}
      .route-copy{max-width:440px;color:#6E6E73;font-size:14px;line-height:1.7;margin:0}
      .route-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
      .feature-tile{position:relative;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:24px;min-height:190px;box-shadow:0 18px 44px rgba(0,0,0,.045);overflow:hidden}
      .feature-tile:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 78% 0%,rgba(0,113,227,.11),transparent 34%);pointer-events:none}
      .feature-tile > *{position:relative;z-index:1}
      .feature-tag{display:inline-flex;align-items:center;justify-content:center;height:32px;min-width:32px;border-radius:8px;background:#F5F5F7;border:1px solid #E5E5EA;color:#0066CC;font-family:'Wix Madefor Display',sans-serif;font-size:12px;font-weight:900;margin-bottom:28px}
      .feature-title{font-family:'Wix Madefor Display',sans-serif;font-size:18px;font-weight:800;letter-spacing:0;color:#1D1D1F;margin-bottom:8px}
      .feature-copy{font-size:13px;line-height:1.7;color:#6E6E73}
      .payment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
      .payment-tile{background:#F5F5F7;border:1px solid #E5E5EA;border-radius:8px;padding:18px}
      .payment-tile strong{display:block;color:#1D1D1F;font-family:'Wix Madefor Display',sans-serif;font-size:15px;margin-bottom:6px}
      .payment-tile span{color:#6E6E73;font-size:12px;line-height:1.55}
      .comparison-card{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:28px;box-shadow:0 18px 44px rgba(0,0,0,.045);overflow:hidden}
      .compare-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px}
      .compare-table th{padding:13px 14px;text-align:left;color:#6E6E73!important;font-size:10px;text-transform:uppercase;letter-spacing:1px;background:#F5F5F7}
      .compare-table th:first-child{border-radius:8px 0 0 8px}
      .compare-table th:last-child{border-radius:0 8px 8px 0}
      .compare-table td{padding:16px 14px;border-bottom:1px solid #E5E5EA;color:#6E6E73}
      .compare-table tr:first-child td{color:#1D1D1F;font-weight:800;background:rgba(0,113,227,.04)}
      .compare-check{color:#0A7F3F;font-weight:900}
      .compare-miss{color:#D23F57;font-weight:900}
      .faq-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
      .faq-item{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:20px;box-shadow:0 14px 34px rgba(0,0,0,.035)}
      .faq-q{font-family:'Wix Madefor Display',sans-serif;font-weight:800;font-size:15px;color:#1D1D1F;margin-bottom:8px}
      .faq-a{font-size:12px;color:#6E6E73;line-height:1.7}
      .timeline-card{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:10px 26px;box-shadow:0 18px 44px rgba(0,0,0,.045)}
      .timeline-row{display:grid;grid-template-columns:76px 1fr;gap:22px;padding:22px 0;border-bottom:1px solid #E5E5EA}
      .timeline-row:last-child{border-bottom:none}
      .timeline-number{font-family:'Wix Madefor Display',sans-serif;font-size:34px;font-weight:900;color:#B8C0CC;line-height:1}
      .timeline-title{font-family:'Wix Madefor Display',sans-serif;font-size:17px;font-weight:800;color:#1D1D1F;margin-bottom:6px}
      .timeline-copy{font-size:13px;color:#6E6E73;line-height:1.7}
      .form-shell{display:grid;grid-template-columns:.9fr 1.1fr;gap:18px;max-width:1100px;margin:0 auto;padding:18px}
      .form-panel{background:#F5F5F7;border:1px solid #E5E5EA;border-radius:8px;padding:22px}
      .form-panel.white{background:#FFFFFF}
      .form-title{font-family:'Wix Madefor Display',sans-serif;font-size:22px;font-weight:800;color:#1D1D1F;margin-bottom:8px}
      .form-copy{font-size:13px;color:#6E6E73;line-height:1.7;margin-bottom:18px}
      .upload-panel{min-height:286px;display:grid;place-items:center;text-align:center;border:1.5px dashed #C7CED8;background:#FFFFFF;border-radius:8px;cursor:pointer;padding:28px;transition:border-color .2s ease,background .2s ease,transform .2s ease}
      .upload-panel:hover{transform:translateY(-2px);border-color:#0071E3}
      .upload-panel.active{border-color:#0071E3;background:rgba(0,113,227,.045)}
      .upload-icon{width:58px;height:58px;border-radius:8px;background:linear-gradient(180deg,#1D1D1F,#3A3A3C);color:#FFFFFF;display:grid;place-items:center;font-family:'Wix Madefor Display',sans-serif;font-weight:900;margin:0 auto 16px}
      .upload-main{font-family:'Wix Madefor Display',sans-serif;font-size:17px;font-weight:800;color:#1D1D1F;margin-bottom:6px}
      .upload-sub{font-size:12px;color:#6E6E73}
      .agent-ready-list{display:grid;gap:8px;margin-top:18px}
      .agent-ready{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:11px 12px;font-size:12px;color:#1D1D1F}
      .agent-ready span:last-child{color:#0066CC;font-weight:900}
      .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .field-grid.three{grid-template-columns:repeat(3,1fr)}
      .field-block{margin-bottom:14px}
      .field-block label{display:block;font-size:11px;color:#6E6E73;font-weight:700;margin-bottom:7px}
      .field-block input,.field-block select{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #D2D2D7;border-radius:8px;background:#FFFFFF;color:#1D1D1F;font-size:14px;outline:none}
      .field-block input:focus,.field-block select:focus{border-color:#0071E3;box-shadow:0 0 0 4px rgba(0,113,227,.1)}
      .route-cta-card{display:flex;align-items:center;justify-content:space-between;gap:20px;background:linear-gradient(180deg,#171719 0%,#080809 100%);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#F5F5F7;padding:28px;box-shadow:0 20px 58px rgba(0,0,0,.16)}
      .route-cta-card h3{font-family:'Wix Madefor Display',sans-serif;font-size:28px;font-weight:900;color:#FFFFFF!important;margin:0 0 8px}
      .route-cta-card p{font-size:13px;color:rgba(245,245,247,.7);line-height:1.7;margin:0}
      .profile-wrap{max-width:1100px;margin:0 auto}
      .profile-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;margin-bottom:22px}
      .profile-identity{position:relative;overflow:hidden;background:linear-gradient(180deg,#171719 0%,#080809 100%);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:34px;color:#F5F5F7;box-shadow:0 24px 70px rgba(0,0,0,.16)}
      .profile-identity:before{content:"";position:absolute;inset:-35%;background:radial-gradient(circle at 52% 20%,rgba(0,113,227,.28),transparent 24%),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:auto,64px 64px,64px 64px;transform:perspective(900px) rotateX(62deg);opacity:.55}
      .profile-identity > *{position:relative;z-index:1}
      .profile-avatar{width:82px;height:82px;border-radius:8px;background:linear-gradient(180deg,#FFFFFF,#B8C0CC);display:grid;place-items:center;overflow:hidden;color:#1D1D1F;font-family:'Wix Madefor Display',sans-serif;font-size:34px;font-weight:900;margin-bottom:24px}
      .profile-avatar img{width:100%;height:100%;object-fit:cover}
      .profile-name{font-family:'Wix Madefor Display',sans-serif;font-size:clamp(34px,5vw,58px);line-height:1;font-weight:900;letter-spacing:0;color:#FFFFFF;margin-bottom:12px}
      .profile-email{font-size:14px;color:rgba(245,245,247,.72);margin-bottom:18px}
      .profile-meta{display:flex;gap:8px;flex-wrap:wrap}
      .profile-pill{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:8px;padding:8px 11px;color:#F5F5F7;font-size:11px;font-weight:800}
      .profile-plan-card{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:24px;box-shadow:0 18px 44px rgba(0,0,0,.045);display:flex;flex-direction:column;justify-content:space-between;gap:18px}
      .profile-plan-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0066CC;font-weight:900}
      .profile-plan-name{font-family:'Wix Madefor Display',sans-serif;font-size:34px;font-weight:900;color:#1D1D1F;line-height:1;margin-top:12px}
      .profile-plan-copy{font-size:13px;color:#6E6E73;line-height:1.7}
      .profile-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
      .profile-stat{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:20px;box-shadow:0 16px 40px rgba(0,0,0,.04)}
      .profile-stat-label{font-size:11px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:#6E6E73;margin-bottom:18px}
      .profile-stat-value{font-family:'Wix Madefor Display',sans-serif;font-size:32px;font-weight:900;color:#1D1D1F;letter-spacing:0}
      .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
      .profile-panel{background:#FFFFFF;border:1px solid #E5E5EA;border-radius:8px;padding:24px;box-shadow:0 18px 44px rgba(0,0,0,.045)}
      .profile-panel-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:18px}
      .profile-panel-title{font-family:'Wix Madefor Display',sans-serif;font-size:22px;font-weight:900;color:#1D1D1F}
      .profile-panel-sub{font-size:12px;color:#6E6E73;margin-top:4px}
      .profile-list{display:grid;gap:10px}
      .profile-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;background:#F5F5F7;border:1px solid #E5E5EA;border-radius:8px;padding:14px}
      .profile-row-title{font-family:'Wix Madefor Display',sans-serif;font-weight:900;font-size:14px;color:#1D1D1F;margin-bottom:4px}
      .profile-row-meta{font-size:12px;color:#6E6E73;line-height:1.5}
      .profile-row-date{font-size:11px;color:#6E6E73;white-space:nowrap}
      .profile-empty{border:1px dashed #C7CED8;border-radius:8px;padding:28px;text-align:center;color:#6E6E73;font-size:13px;background:#F5F5F7}
      .profile-danger{background:#FFFFFF;border:1px solid rgba(210,63,87,.24);border-radius:8px;padding:24px;box-shadow:0 18px 44px rgba(0,0,0,.035)}
      .profile-danger h3{font-family:'Wix Madefor Display',sans-serif;font-size:20px;font-weight:900;color:#D23F57!important;margin-bottom:8px}
      .profile-danger p{font-size:13px;color:#6E6E73;line-height:1.7;margin-bottom:16px}
      .profile-danger button{background:#FFFFFF;border:1px solid #D23F57;border-radius:8px;color:#D23F57;padding:11px 16px;font-family:'Wix Madefor Display',sans-serif;font-weight:900;cursor:pointer}

      .nav-links { display: flex; align-items: center; gap: 24px; }
      .menu-toggle { display: none; font-size: 24px; background: none; border: none; cursor: pointer; color: #1D1D1F; }
      @media (max-width: 768px) {
        .main-nav { padding: 0 16px !important; }
        .nav-links {
          display: none;
          flex-direction: column;
          position: absolute;
          top: 66px;
          left: 0;
          width: 100%;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(12px);
          padding: 20px 0;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          border-bottom: 1px solid #D2D2D7;
        }
        .nav-links.open { display: flex; gap: 12px!important; background:rgba(255,255,255,.96)!important; border-bottom:1px solid #E5E5EA!important; padding:18px!important; box-shadow:0 18px 40px rgba(0,0,0,.08)!important; }
        .nav-links.open .nav-btn{color:#1D1D1F!important;width:100%;text-align:left;padding:10px 0!important}
        .nav-links.open .nav-btn.active:after{bottom:4px;right:auto;width:24px}
        .nav-links.open .nav-auth-btn{width:100%}
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
        .landing-wrap{width:min(100% - 32px,1180px)}
        .landing-hero{min-height:auto;align-items:start}
        .landing-hero-shade{background:radial-gradient(circle at 50% 24%,rgba(0,113,227,.22),transparent 28%),linear-gradient(180deg,rgba(3,3,4,.7) 0%,rgba(3,3,4,.94) 72%,#030304 100%)}
        .hero-grid{padding:118px 0 54px}
        .hero-content{max-width:360px}
        .eyebrow{font-size:11px;padding:7px 10px;margin-bottom:6px}
        .hero-title{font-size:clamp(38px,12vw,48px)!important;line-height:1.05!important;margin:16px auto 18px;text-shadow:0 18px 54px rgba(0,0,0,.78)}
        .hero-copy{font-size:16px;line-height:1.72;margin-bottom:26px;max-width:330px}
        .hero-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
        .landing-btn{padding:14px 12px;font-size:14px;width:100%}
        .proof-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .proof-pill{font-size:11px;padding:8px 9px;text-align:center}
        .hero-agent-bg{opacity:.34;z-index:1}
        .hero-agent-orb{left:50%;top:42%;width:360px}
        .agent-3d-core{left:50%;top:43%;width:132px;height:132px;margin:-66px 0 0 -66px;opacity:.62}
        .agent-orbit{left:50%;top:43%;width:330px;height:112px;margin:-56px 0 0 -165px}
        .agent-orbit.two{left:50%;top:43%;width:370px;height:136px;margin:-68px 0 0 -185px}
        .agent-orbit.three{display:none}
        .agent-chip{display:none}
        .metric-grid,.agent-grid,.step-grid,.results-grid{grid-template-columns:1fr}
        .section-head,.cta-panel{grid-template-columns:1fr;display:grid}
        .landing-section{padding:58px 0}
        .cta-panel{padding:32px}
        .route-section-head,.route-cta-card{display:grid;grid-template-columns:1fr}
        .payment-grid,.faq-grid,.form-shell,.field-grid,.field-grid.three{grid-template-columns:1fr}
        .route-hero{padding:54px 22px}
        .comparison-card{padding:14px;overflow-x:auto}
        .timeline-row{grid-template-columns:54px 1fr;gap:14px}
        .profile-hero,.profile-grid,.profile-stats{grid-template-columns:1fr}
        footer { padding: 24px 16px !important; justify-content: center !important; text-align: center; flex-direction: column; }
      }
      @media (max-width: 1024px) and (min-width: 769px) {
        .hero-pad > div:last-child { padding: 100px 24px 0 !important; }
      }

    `}</style>

    {/* NAV */}
    <nav className={`main-nav site-nav ${page==="landing"&&!navScrolled?"nav-transparent":"nav-scrolled"}`} style={{borderBottom:page==="landing"&&!navScrolled?"none":"1px solid #D2D2D7",padding:"0 48px",display:"flex",alignItems:"center",justifyContent:"space-between",height:78,background:page==="landing"&&!navScrolled?"transparent":"rgba(255,255,255,0.95)",backdropFilter:navScrolled||page!=="landing"?"blur(12px)":"none",WebkitBackdropFilter:navScrolled||page!=="landing"?"blur(12px)":"none",position:"fixed",top:0,left:0,right:0,zIndex:200,transition:"background 0.35s ease, border-bottom 0.35s ease, backdrop-filter 0.35s ease"}}>

      <div className="brand-lockup" style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>navTo("landing")}>
        <img className="brand-logo-img" src="/logo.png" alt="JobHunter.AI logo" />
        <div style={{width:32,height:32,borderRadius:8,background:"#0071E3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:page==="landing"&&!navScrolled?"0 0 12px rgba(0,113,227,0.4)":"none"}}>⚡</div>
        <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",color:page==="landing"&&!navScrolled?"#FFFFFF":"#1D1D1F",transition:"color 0.35s ease"}}>JobHunter<span style={{color:"#0071E3"}}>.AI</span></div>
      </div>
      <button className="menu-toggle" onClick={()=>setMobileMenu(!mobileMenu)} style={{color:page==="landing"&&!navScrolled?"#fff":"#1D1D1F"}}>☰</button>
      <div className={`nav-links ${mobileMenu?"open":""}`}>
        <button className={`nav-btn ${page==="landing"?"active":""}`} onClick={()=>navTo("landing")}>Home</button>
        <button className={`nav-btn ${page==="app"?"active":""}`} onClick={()=>navTo("app")}>Launch app</button>
        <button className={`nav-btn ${page==="pricing"?"active":""}`} onClick={()=>navTo("pricing")}>Pricing</button>
        <button className={`nav-btn ${page==="extension"?"active":""}`} onClick={()=>navTo("extension")}>Extension</button>
        {isSignedIn&&<>
          <button className={`nav-btn ${page==="profile"?"active":""}`} onClick={()=>navTo("profile")}>Profile</button>
        </>}
        {!isSignedIn&&<>
          <SignInButton mode="modal">
            <button className="nav-auth-btn">Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="nav-auth-btn nav-auth-primary">Sign up</button>
          </SignUpButton>
        </>}
        {isSignedIn&&<>
          <UserButton afterSignOutUrl="/" appearance={{elements:{avatarBox:{width:36,height:36}}}} />
        </>}
      </div>
    </nav>

    {/* ═══ LANDING ═══ */}
    {page==="landing"&&<motion.div className="landing-page" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.45,ease:"easeOut"}}>
      <motion.section className="landing-hero" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.7,ease:"easeOut"}}>
        <img className="landing-hero-img" src="/hero-bg.png" alt="" />
        <div className="landing-hero-shade"/>
        <motion.div className="agent-field" animate={{opacity:[.28,.48,.28]}} transition={{duration:7,repeat:Infinity,ease:"easeInOut"}}/>
        <motion.div className="hero-agent-bg" initial={{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} transition={{duration:1.1,ease:[.16,1,.3,1]}}>
          <div className="hero-agent-orb"/>
          <div className="agent-orbit"/>
          <div className="agent-orbit two"/>
          <div className="agent-orbit three"/>
          <div className="agent-3d-core"/>
          <div className="agent-chip one">Resume AI</div>
          <div className="agent-chip two">Job Scout</div>
          <div className="agent-chip three">Referral Map</div>
          <div className="agent-chip four">Interview Coach</div>
          <div className="agent-chip five">Auto Apply</div>
        </motion.div>
        <div className="landing-wrap hero-grid">
          <motion.div className="hero-content" initial={{opacity:0,y:34}} animate={{opacity:1,y:0}} transition={{duration:.72,ease:[.16,1,.3,1]}}>
            <motion.div className="eyebrow" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.1,duration:.5}}><span className="status-dot"/>Live AI job-hunt workspace</motion.div>
            <motion.h1 className="hero-title" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.18,duration:.72,ease:[.16,1,.3,1]}}>Turn your resume into an <span>interview engine.</span></motion.h1>
            <motion.p className="hero-copy" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.3,duration:.58}}>JobHunter.AI researches roles, rewrites your resume, tracks applications, drafts outreach, and prepares you for interviews from one focused command center.</motion.p>
            <motion.div className="hero-actions" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.4,duration:.52}}>
              <motion.button className="landing-btn primary" whileHover={{y:-3,scale:1.02}} whileTap={{scale:.98}} onClick={()=>navTo("app")}>Launch your mission</motion.button>
              <motion.button className="landing-btn secondary" whileHover={{y:-3,scale:1.02}} whileTap={{scale:.98}} onClick={()=>navTo("pricing")}>See plans</motion.button>
            </motion.div>
            <motion.div className="proof-row" initial="hidden" animate="show" variants={{hidden:{},show:{transition:{staggerChildren:.08,delayChildren:.5}}}}>
              {["ATS-first resume rewrites","Real job matching","Referral-ready outreach","Razorpay secured"].map(t=><motion.span className="proof-pill" key={t} variants={{hidden:{opacity:0,y:10},show:{opacity:1,y:0}}}>{t}</motion.span>)}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section className="landing-section" initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.62,ease:[.16,1,.3,1]}}>
        <div className="landing-wrap">
          <div className="section-head">
            <div>
              <div className="section-kicker">Agent team</div>
              <h2 className="section-title">Eight specialists working the hunt from every angle.</h2>
            </div>
            <p className="section-copy">Each agent owns one part of the job search, so your applications stop feeling random and start moving like a coordinated campaign.</p>
          </div>
          <motion.div className="agent-grid" initial="hidden" whileInView="show" viewport={{once:true,amount:.18}} variants={{hidden:{},show:{transition:{staggerChildren:.05}}}}>
            {AGENTS.map((a,i)=>(
              <motion.div key={a.id} className="agent-feature" variants={{hidden:{opacity:0,y:24},show:{opacity:1,y:0}}} whileHover={{y:-6,rotateX:2}}>
                <div className="agent-code">{String(i+1).padStart(2,"0")}</div>
                <div className="agent-name">{a.name}</div>
                <div className="agent-role">{a.role}</div>
                <div className="agent-desc">{["Finds high-fit roles before they get crowded.","Extracts must-have keywords from every job post.","Turns your resume into a sharper match.","Keeps applications moving without chaos.","Maps referrals and warm introductions.","Writes tailored cover letters with proof.","Tracks every reply, follow-up, and signal.","Builds interview answers you can actually use."][i]}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.section className="landing-section steps-band" initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.62,ease:[.16,1,.3,1]}}>
        <div className="landing-wrap">
          <div className="section-head">
            <div>
              <div className="section-kicker" style={{color:"var(--lp-titanium)"}}>Workflow</div>
              <h2 className="section-title">From upload to interview prep in one guided run.</h2>
            </div>
            <p className="section-copy">No scattered spreadsheets, no blank documents, no guessing which jobs deserve your time.</p>
          </div>
          <div className="step-grid">
            {[["01","Upload the resume","Drop in your PDF and let the system read your experience, skills, projects, and gaps."],["02","Pick the target","Choose the role, location, work mode, salary range, and notice period that matter."],["03","Deploy agents","The platform matches jobs, writes materials, maps outreach, and tracks the pipeline."],["04","Walk in prepared","Use the generated interview kit, talking points, and follow-up plan for each company."]].map(([n,t,d])=>(
              <motion.div className="step-card" key={n} whileHover={{y:-5,backgroundColor:"#2D2D30"}} transition={{duration:.2}}>
                <div className="step-num">{n}</div>
                <div className="step-title">{t}</div>
                <div className="step-copy">{d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="landing-section" initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.62,ease:[.16,1,.3,1]}}>
        <div className="landing-wrap">
          <div className="section-head">
            <div>
              <div className="section-kicker">Proof</div>
              <h2 className="section-title">Built for applicants who want momentum, not busywork.</h2>
            </div>
            <p className="section-copy">Designed for India's competitive hiring market, with resumes, referrals, payments, and job sources tuned for local workflows.</p>
          </div>
          <div className="results-grid">
            {[["Got three interview calls in two days. The resume rewrite finally matched the jobs I wanted.","Priya S.","Product Manager, Bengaluru"],["I stopped spending nights copy-pasting into portals. The pipeline view made everything calm and clear.","Arjun M.","SDE II, Hyderabad"],["The referral messages were specific enough to send without rewriting from scratch. That changed the game.","Sneha K.","Data Analyst, Pune"]].map(([q,n,r])=>(
              <motion.div className="result-card" key={n} whileHover={{y:-6}} transition={{duration:.2}}>
                <div className="result-quote">"{q}"</div>
                <div className="result-person">{n}</div>
                <div className="result-role">{r}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="landing-section" style={{paddingTop:0}} initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.25}} transition={{duration:.62,ease:[.16,1,.3,1]}}>
        <div className="landing-wrap">
          <div className="cta-panel">
            <div>
              <h2>Stop applying in the dark.</h2>
              <p>Start a focused job-hunt mission and see your resume, target roles, outreach, and interview prep come together in one place.</p>
            </div>
            <div className="hero-actions" style={{margin:0}}>
              <button className="landing-btn primary" onClick={()=>navTo("app")}>Start now</button>
              <button className="landing-btn secondary" onClick={()=>navTo("pricing")}>Compare pricing</button>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>}
    {false&&page==="landing"&&<div style={{animation:"fadeUp 0.6s ease"}}>
      {/* Hero */}
      <div className="hero-pad" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"0"}}>
        {/* Deep black night sky background */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 120% 80% at 50% 40%, #050510 0%, #020208 35%, #010104 60%, #000000 100%)",zIndex:0}}/>
        {/* Very subtle atmospheric haze — almost invisible warm/cool patches */}
        <div style={{position:"absolute",top:"10%",right:"15%",width:600,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,8,40,0.12) 0%,transparent 70%)",filter:"blur(100px)",pointerEvents:"none",zIndex:1}}/>
        <div style={{position:"absolute",bottom:"20%",left:"10%",width:500,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(8,15,35,0.10) 0%,transparent 70%)",filter:"blur(90px)",pointerEvents:"none",zIndex:1}}/>
        <div style={{position:"absolute",top:"50%",left:"55%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(15,5,20,0.08) 0%,transparent 65%)",filter:"blur(120px)",pointerEvents:"none",zIndex:1}}/>
        {/* Milky Way band — ultra-subtle diagonal glow */}
        <div style={{position:"absolute",top:"-20%",left:"-10%",width:"140%",height:"140%",background:"linear-gradient(135deg, transparent 30%, rgba(10,10,25,0.15) 45%, rgba(15,12,30,0.08) 55%, transparent 70%)",pointerEvents:"none",zIndex:1,transform:"rotate(-15deg)"}}/>
        {/* Star twinkling canvas — 3 depth layers */}
        <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:2,pointerEvents:"none"}}/>
        {/* Horizon glow — very faint warm light at bottom edge */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"25%",background:"linear-gradient(to top, rgba(10,5,15,0.3) 0%, transparent 100%)",pointerEvents:"none",zIndex:3}}/>

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
    {page==="pricing"&&<div className="page-shell">
      <div className="page-hero app-hero-panel route-hero">
        <div className="page-kicker">Transparent pricing. No hidden fees.</div>
        <h1 className="page-title">Invest in your<br/><span>career.</span></h1>
        <p className="page-subtitle">One interview offer pays back your investment 100x. Cancel anytime.</p>
      </div>
      <div className="route-content" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,margin:"0 auto 64px",alignItems:"center"}}>
        {PACKAGES.map((pkg,i)=><PricingCard key={pkg.name} pkg={pkg} userName={form.name} isPopular={i===1} getTokenFn={isSignedIn?getToken:null}/>)}
      </div>

      <section className="route-section">
        <div className="route-section-head">
          <div>
            <div className="route-eyebrow">Secure checkout</div>
            <h2 className="route-title">Payment stays fast, familiar and protected.</h2>
          </div>
          <p className="route-copy">Razorpay handles every transaction with bank-grade security, instant confirmation and the payment methods Indian candidates already use every day.</p>
        </div>
        <div className="payment-grid">
          {[
            ["UPI", "GPay, PhonePe, Paytm and all major UPI apps."],
            ["Cards", "Debit and credit cards with secure OTP verification."],
            ["Net Banking", "All major Indian banks supported at checkout."],
            ["EMI", "No-cost EMI availability where eligible."]
          ].map(([title,copy])=><div className="payment-tile" key={title}><strong>{title}</strong><span>{copy}</span></div>)}
        </div>
      </section>

      <section className="route-section">
        <div className="route-section-head">
          <div>
            <div className="route-eyebrow">Market comparison</div>
            <h2 className="route-title">One workspace replaces scattered job tools.</h2>
          </div>
          <p className="route-copy">Resume optimization, job discovery, automated applications, LinkedIn outreach and referral tracking work together instead of living in separate tabs.</p>
        </div>
        <div className="comparison-card">
          <table className="compare-table">
            <thead><tr>{["Tool","Price","ATS Resume","Auto Apply","LinkedIn Auto","Referrals","India"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {[
                ["JobHunter.AI","Rs 999-Rs 7,999",true,true,true,true,true],
                ["Naukri Resume","Rs 1,500-Rs 5,000",true,false,false,false,true],
                ["LinkedIn Helper","Rs 3,500/mo",false,false,true,false,false],
                ["Hiration","Rs 2,500-Rs 8,000",true,false,false,false,true],
                ["TopResume","Rs 4,000-Rs 12,000",true,false,false,false,false]
              ].map(row=><tr key={row[0]}>
                {row.map((cell,j)=><td key={j}>{typeof cell==="boolean"?<span className={cell?"compare-check":"compare-miss"}>{cell?"Yes":"No"}</span>:cell}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="route-section">
        <div className="route-section-head">
          <div>
            <div className="route-eyebrow">Questions</div>
            <h2 className="route-title">Clear before you commit.</h2>
          </div>
        </div>
        <div className="faq-grid">
          {[
            ["Is auto-applying legal?","Yes. Job search uses supported listings and the LinkedIn extension works inside your own browser like manual actions, with safer pacing."],
            ["How quickly will I get interviews?","Most active Hunter and Closer users see their first interview activity within 48-72 hours after launching a focused mission."],
            ["Do you guarantee results?","The system is built to execute the workflow reliably. Outcomes still depend on profile strength, market demand and role fit."],
            ["Is my resume data safe?","Your resume is processed for analysis and optimization. It is not designed to become a public profile or shared document."],
            ["How does Razorpay payment work?","Choose a plan, complete Razorpay checkout through UPI, card or net banking, and your plan unlocks after confirmation."]
          ].map(([q,a])=><div className="faq-item" key={q}><div className="faq-q">{q}</div><div className="faq-a">{a}</div></div>)}
        </div>
      </section>

      {/* How to pay with Razorpay */}
      <div className="card-pad premium-card route-content" style={{display:"none",maxWidth:760,margin:"0 auto 60px",padding:"36px"}}>
        <h3 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:22,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:20}}>💳 PAYMENT VIA RAZORPAY</h3>
        <div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {["UPI (GPay, PhonePe, Paytm)","Debit & Credit Cards","Net Banking (All major banks)","EMI (No-cost EMI available)"].map(m=>(
            <div key={m} style={{display:"flex",gap:10,alignItems:"center"}}><span style={{color:"#0071E3",fontSize:14}}>✓</span><span style={{fontSize:12,color:"#424245"}}>{m}</span></div>
          ))}
        </div>
        <div style={{marginTop:16,fontSize:11,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>🔒 256-bit SSL encrypted · RBI compliant · Instant activation after payment</div>
      </div>

      {/* Comparison table */}
      <div className="card-pad premium-card route-content" style={{display:"none",maxWidth:920,margin:"0 auto 60px",padding:"36px"}}>
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
      <div style={{display:"none",maxWidth:680,margin:"0 auto"}}>
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
    {page==="extension"&&<div className="page-shell">
      <div className="page-hero app-hero-panel route-hero">
        <div style={{fontSize:60,marginBottom:16,animation:"float 3s ease infinite"}}>🔌</div>
        <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:10,color:"#0071E3",letterSpacing:4,marginBottom:12}}>Chrome Extension · Closer Plan only</div>
        <h1 style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:"clamp(36px,5vw,68px)",letterSpacing:"-0.3px",marginBottom:16}}>LinkedIn<br/><span style={{color:"#0071E3"}}>Autopilot.</span></h1>
        <p style={{fontSize:14,color:"#86868B",maxWidth:520,margin:"0 auto",lineHeight:1.9}}>Our Chrome Extension runs inside your own browser — sending connection requests, referral messages and Easy Apply jobs like a human, at scale.</p>
      </div>

      <section className="route-section">
        <div className="route-section-head">
          <div>
            <div className="route-eyebrow">LinkedIn autopilot</div>
            <h2 className="route-title">Runs like a careful assistant inside your browser.</h2>
          </div>
          <p className="route-copy">The extension keeps outreach, applications and reply tracking paced and visible so your account feels human while the work compounds in the background.</p>
        </div>
        <div className="route-card-grid">
          {[
            ["01","Auto Connection Requests","Sends 20-50 targeted requests per day to recruiters, hiring managers and priority contacts while staying within safer daily limits."],
            ["02","Personalized Referral Messages","Drafts context-aware referral messages using the contact, company and your relevant experience instead of generic templates."],
            ["03","One-Click Easy Apply","Fills LinkedIn Easy Apply forms from your optimized profile and queues high-fit jobs while you focus on interviews."],
            ["04","Reply Tracking Dashboard","Tracks views, accepted connections and replies, then syncs the activity back into JobHunter.AI."]
          ].map(([tag,title,copy])=><div className="feature-tile" key={title}><div className="feature-tag">{tag}</div><div className="feature-title">{title}</div><div className="feature-copy">{copy}</div></div>)}
        </div>
      </section>

      <section className="route-section">
        <div className="route-section-head">
          <div>
            <div className="route-eyebrow">Setup flow</div>
            <h2 className="route-title">Five steps from purchase to autopilot.</h2>
          </div>
        </div>
        <div className="timeline-card">
          {[
            ["01","Subscribe to Closer","Unlock the Chrome extension through the Closer plan and complete secure checkout."],
            ["02","Receive the download link","A private extension download link is sent after payment confirmation."],
            ["03","Install in Chrome","Open Chrome extensions, enable Developer Mode and add the JobHunter.AI package."],
            ["04","Connect LinkedIn","Open LinkedIn in the same browser and keep your account signed in."],
            ["05","Launch autopilot","Set daily limits, choose target companies and let the extension start carefully paced outreach."]
          ].map(([n,t,d])=><div className="timeline-row" key={n}><div className="timeline-number">{n}</div><div><div className="timeline-title">{t}</div><div className="timeline-copy">{d}</div></div></div>)}
        </div>
      </section>

      <section className="route-section">
        <div className="route-cta-card">
          <div>
            <h3>Safety is built into the workflow.</h3>
            <p>Randomized delays, daily limits, human-like pacing and gradual ramp-up keep automation controlled. Start conservative, review replies, then scale when the signal is clean.</p>
          </div>
          <button className="premium-button" onClick={()=>navTo("pricing")} style={{padding:"14px 24px",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:800,fontSize:15,cursor:"pointer",whiteSpace:"nowrap"}}>Get Closer plan</button>
        </div>
      </section>

      <div className="mobile-col" style={{display:"none",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:48}}>
        {[{e:"🤝",t:"Auto Connection Requests",d:"Sends 20–50 connection requests/day to HRs, hiring managers and recruiters at your target companies. Stays within LinkedIn's safe daily limits to protect your account."},{e:"💬",t:"Personalised Referral Messages",d:"AI-crafted referral messages sent to your 2nd-degree connections. Each message uses their name, company and your relevant experience — never generic copy-paste."},{e:"🚀",t:"One-Click Easy Apply",d:"Automatically fills and submits LinkedIn Easy Apply jobs using your optimised resume. Applies to 50–100 matching jobs per day while you sleep."},{e:"📊",t:"Reply Tracking Dashboard",d:"Tracks who viewed your profile, accepted connections, replied to messages — all synced back to your JobHunter.AI dashboard in real time."}].map(f=>(
          <div key={f.t} className="agent-feature premium-card" style={{padding:"24px",transition:"all 0.3s"}}>
            <div style={{fontSize:28,marginBottom:12}}>{f.e}</div>
            <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.1px",color:"#0071E3",marginBottom:8}}>{f.t}</div>
            <div style={{fontSize:12,color:"#86868B",lineHeight:1.7}}>{f.d}</div>
          </div>
        ))}
      </div>

      <div className="card-pad premium-card" style={{display:"none",padding:"36px",marginBottom:36}}>
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

      <div className="premium-soft" style={{display:"none",padding:"20px 24px",marginBottom:36}}>
        <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:8}}>⚡ Safety built in — your account is protected</div>
        <div style={{fontSize:12,color:"#86868B",lineHeight:1.8}}>The extension mimics human behaviour with random delays between actions, daily connection limits (max 50/day), human-like typing speed and natural scroll patterns. We recommend starting at 20 connections/day and gradually increasing. These precautions keep your LinkedIn account completely safe.</div>
      </div>

      <div style={{display:"none",textAlign:"center"}}>
        <button className="premium-button" onClick={()=>navTo("pricing")} style={{padding:"14px 28px",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",cursor:"pointer"}}>Get Closer plan</button>
      </div>
    </div>}

    {/* ═══ APP ═══ */}
    {page==="app"&&<div className="page-shell">

      {/* FORM */}
      {phase==="form"&&<div style={{animation:"fadeUp 0.5s ease"}}>
        <div className="app-hero-panel">
          <div className="page-kicker">Mission control</div>
          <h1 className="page-title" style={{fontSize:"clamp(32px,5vw,58px)"}}>Configure your<br/><span>job hunt</span></h1>
        </div>
        <div className="mission-agent-strip">
          {AGENTS.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,113,227,0.06)",border:"none",borderRadius:20,padding:"5px 12px",fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,letterSpacing:"-0.1px"}}><span>{a.emoji}</span>{a.name}</div>)}
        </div>
        <div className="form-shell premium-card">
          <div className="form-panel">
            <div className="route-eyebrow">Resume intake</div>
            <div className="form-title">Upload the signal.</div>
            <div className="form-copy">Drop your resume once and the mission uses it for ATS tuning, role matching, outreach and interview preparation.</div>
            <div
              className={`upload-panel ${dragOver||resumeFile?"active":""}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
              <div>
                <div className="upload-icon">{resumeFile?"OK":"PDF"}</div>
                <div className="upload-main">{resumeFile?resumeFile.name:"Drop your PDF resume here"}</div>
                <div className="upload-sub">{resumeFile?"Click to replace the file":"or click to browse. PDF only."}</div>
              </div>
            </div>
            <div className="agent-ready-list">
              {["ATS analysis","Role matching","Outreach context","Interview prep"].map((item,i)=><div className="agent-ready" key={item}><span>{item}</span><span>{i===0&&resumeFile?"Ready":"Armed"}</span></div>)}
            </div>
          </div>
          <div className="form-panel white">
            <div className="route-eyebrow">Mission parameters</div>
            <div className="form-title">Tell the agents where to aim.</div>
            <div className="form-copy">Keep it focused. A sharp role, city and compensation band gives the system a better search radius.</div>
            <div className="field-grid">
              <div className="field-block"><label>Your Name</label><input placeholder="e.g. Satish Kumar" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div className="field-block"><label>Target Role *</label><input placeholder="e.g. Senior Product Manager" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></div>
            </div>
            <div className="field-grid">
              <div className="field-block"><label>Experience</label><select value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})}><option value="">Select</option>{["0-1 years","1-3 years","3-5 years","5-8 years","8-12 years","12+ years"].map(x=><option key={x}>{x}</option>)}</select></div>
              <div className="field-block"><label>Location</label><input placeholder="Bengaluru" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
            </div>
            <div className="field-block"><label>Key Skills</label><input placeholder="Product Strategy, SQL, Figma, Data Analysis" value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})}/></div>
            <div className="field-grid three">
              <div className="field-block"><label>Expected CTC</label><input placeholder="Rs 25-35 LPA" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/></div>
              <div className="field-block"><label>Work Mode</label><select value={form.workMode} onChange={e=>setForm({...form,workMode:e.target.value})}>{["On-site","Hybrid","Remote","Any"].map(x=><option key={x}>{x}</option>)}</select></div>
              <div className="field-block"><label>Notice Period</label><select value={form.notice} onChange={e=>setForm({...form,notice:e.target.value})}>{["Immediate","15 days","30 days","45 days","60 days","90 days"].map(x=><option key={x}>{x}</option>)}</select></div>
            </div>
            <button className={form.role.trim()?"premium-button":"secondary-button"} onClick={startMission} disabled={!form.role.trim()} style={{width:"100%",padding:"17px",cursor:form.role.trim()?"pointer":"not-allowed",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:800,fontSize:16,letterSpacing:0,transition:"all 0.3s"}}>Launch 8-agent mission</button>
          </div>
        </div>
        <div className="card-pad premium-card" style={{display:"none",padding:"36px",maxWidth:800,margin:"0 auto"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:24}}>▸ Mission parameters</div>
          <div style={{marginBottom:24}}>
            <label style={lbl}>Upload Resume (PDF) — <span style={{color:"#0071E3"}}>Claude AI will analyse it</span></label>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${dragOver?"#0071E3":resumeFile?"#0071E3":"#D2D2D7"}`,borderRadius:8,padding:"32px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(0,113,227,0.04)":resumeFile?"rgba(0,113,227,0.02)":"#F5F5F7",transition:"all 0.2s"}}>
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
          <button className={form.role.trim()?"premium-button":"secondary-button"} onClick={startMission} disabled={!form.role.trim()} style={{width:"100%",padding:"18px",cursor:form.role.trim()?"pointer":"not-allowed",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,letterSpacing:"-0.5px",transition:"all 0.3s",animation:"none"}}>Launch 8-agent mission</button>
        </div>
      </div>}

      {/* RUNNING */}
      {phase==="running"&&<div style={{animation:"fadeUp 0.4s ease"}}>
        <div className="app-hero-panel" style={{padding:"28px",marginBottom:22}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#0071E3",letterSpacing:"-0.5px",marginBottom:10}}>Mission in progress — {overallProg}% complete</div>
          <div style={{height:4,background:"#F1F5F9",borderRadius:4,overflow:"hidden",maxWidth:400,margin:"0 auto"}}><div style={{height:"100%",width:`${overallProg}%`,background:"linear-gradient(90deg,#0071E3,#D2D2D7)",borderRadius:4,transition:"width 0.5s ease"}}/></div>
          <div style={{marginTop:10,fontSize:10,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{agentStates.filter(s=>s==="done").length} / {AGENTS.length} agents complete</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {AGENTS.map((a,i)=><AgentCard key={a.id} agent={a} state={agentStates[i]} currentStep={i===curAgent?a.steps[curStep]:null} progress={i===curAgent?progress:0}/>)}
        </div>
        <div className="premium-soft" style={{marginTop:14,padding:"14px 18px",maxHeight:140,overflowY:"auto"}}>
          <div style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,fontSize:11,color:"#86868B",letterSpacing:"-0.1px",marginBottom:8}}>System log</div>
          {log.map((l,i)=><div key={i} style={{fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,fontSize:11,color:"#4B5563",marginBottom:4}}><span style={{color:"#0071E3"}}>[{l.t}]</span> {l.msg}</div>)}
        </div>
      </div>}

      {/* DASHBOARD */}
      {phase==="dashboard"&&<div style={{animation:"fadeUp 0.5s ease"}}>
        <div className="app-hero-panel" style={{padding:"24px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,textAlign:"left"}}>
          <div><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,color:"#0071E3",letterSpacing:"-0.3px",marginBottom:3}}>✓ Mission complete — all 8 agents deployed</div><div style={{fontSize:11,color:"rgba(0,113,227,0.5)"}}>{form.name||"You"}'s job hunt is live · {jobs.length} jobs found · Agents active 24/7</div></div>
          <div style={{display:"flex",gap:10}}>
            {resumeData&&<button onClick={()=>checkPlanForDownload(()=>setShowTemplatePicker(true))} style={{background:"#0071E3",border:"none",borderRadius:8,padding:"10px 18px",color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:12,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"none"}}>⬇ Download resume</button>}
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
              {(resumeData.linkedin||resumeData.github||resumeData.portfolio)&&<div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Profile links detected</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {resumeData.linkedin&&<div style={{fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>🔗 {resumeData.linkedin}</div>}
                  {resumeData.github&&<div style={{fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>🔗 {resumeData.github}</div>}
                  {resumeData.portfolio&&<div style={{fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>🔗 {resumeData.portfolio}</div>}
                </div>
              </div>}
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>All skills detected ({resumeData.topSkills?.length||0})</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{resumeData.topSkills?.map(s=><span key={s} style={{fontSize:11,color:"#0071E3",background:"rgba(0,113,227,0.08)",border:"none",borderRadius:6,padding:"4px 10px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{s}</span>)}</div>
              </div>
              {resumeData.certifications?.length>0&&<div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Certifications ({resumeData.certifications.length})</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{resumeData.certifications.map((c,i)=><span key={i} style={{fontSize:11,color:"#7C3AED",background:"rgba(124,58,237,0.08)",border:"none",borderRadius:6,padding:"4px 10px",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>🎓 {c}</span>)}</div>
              </div>}
              {resumeData.projects?.length>0&&<div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Projects & Achievements ({resumeData.projects.length})</div>
                {resumeData.projects.map((p,i)=><div key={i} style={{marginBottom:8,padding:"8px 12px",background:"#F5F5F7",borderRadius:8,borderLeft:"2px solid #0D9488"}}>
                  <div style={{fontSize:11,color:"#1D1D1F",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,marginBottom:2}}>{p.name}</div>
                  {p.description&&<div style={{fontSize:10,color:"#6B7280",lineHeight:1.5}}>{p.description}</div>}
                  {p.impact&&<div style={{fontSize:10,color:"#0D9488",fontWeight:600,marginTop:2}}>Impact: {p.impact}</div>}
                </div>)}
              </div>}
              {resumeData.gaps?.length>0&&<div style={{marginTop:14}}>
                <div style={{fontSize:12,color:"#1D1D1F",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:600,letterSpacing:"-0.1px",marginBottom:8}}>Gaps to address</div>
                {resumeData.gaps?.map((g,i)=><div key={i} style={{fontSize:11,color:"rgba(0,113,227,0.6)",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,marginBottom:4}}>⚠ {g}</div>)}
              </div>}
              <button onClick={()=>checkPlanForDownload(()=>setShowTemplatePicker(true))} style={{marginTop:18,width:"100%",padding:"12px",background:"#0071E3",border:"none",borderRadius:10,color:"#FFFFFF",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"none"}}>⬇ Download optimised resume</button>
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

    {/* UPGRADE PLAN MODAL */}
    {showUpgradeModal&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(12px)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp 0.3s ease"}} onClick={()=>setShowUpgradeModal(false)}>
      <div style={{background:"#fff",borderRadius:24,maxWidth:480,width:"100%",overflow:"hidden",boxShadow:"0 30px 80px rgba(0,0,0,0.35)"}} onClick={e=>e.stopPropagation()}>
        {/* Gradient header */}
        <div style={{background:"linear-gradient(135deg,#0071E3,#5CB8FF)",padding:"36px 32px 28px",textAlign:"center",position:"relative"}}>
          <div style={{width:72,height:72,borderRadius:20,background:"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:32}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:24,color:"#fff",letterSpacing:"-0.5px",marginBottom:6}}>Upgrade Your Plan</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500,lineHeight:1.5}}>
            {!isSignedIn?"Sign in to access premium features":"Resume downloads are available on paid plans"}
          </div>
          <button onClick={()=>setShowUpgradeModal(false)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.2)",border:"none",borderRadius:10,width:32,height:32,fontSize:16,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button>
        </div>
        {/* Body */}
        <div style={{padding:"28px 32px 32px"}}>
          {/* Features list */}
          <div style={{marginBottom:24}}>
            {[
              {icon:"⚡",text:"ATS-optimised resume download (PDF & DOCX)"},
              {icon:"🎯",text:"AI-powered job matching from 9+ sources"},
              {icon:"✍️",text:"Personalised cover letters"},
              {icon:"📊",text:"Full tracking dashboard"},
            ].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<3?"1px solid #F0F0F0":"none"}}>
                <span style={{fontSize:18,width:28,textAlign:"center"}}>{f.icon}</span>
                <span style={{fontSize:13,color:"#424245",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{f.text}</span>
              </div>
            ))}
          </div>
          {/* Plan options */}
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {[
              {name:"Starter",price:"999",period:"one-time",color:"#424245"},
              {name:"Hunter",price:"2,999",period:"/month",color:"#0071E3",popular:true},
            ].map(p=>(
              <div key={p.name} style={{flex:1,border:`2px solid ${p.popular?"#0071E3":"#E5E5EA"}`,borderRadius:14,padding:"16px 14px",textAlign:"center",position:"relative",background:p.popular?"rgba(0,113,227,0.03)":"#fff",cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color;e.currentTarget.style.transform="translateY(-1px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=p.popular?"#0071E3":"#E5E5EA";e.currentTarget.style.transform="none";}}>
                {p.popular&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"#0071E3",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:10,fontFamily:"'Wix Madefor Display',sans-serif",letterSpacing:"0.5px",whiteSpace:"nowrap"}}>POPULAR</div>}
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:p.color,marginBottom:4}}>{p.name}</div>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:24,color:"#1D1D1F",letterSpacing:"-0.5px"}}>
                  <span style={{fontSize:14,fontWeight:500}}>&#8377;</span>{p.price}
                </div>
                <div style={{fontSize:10,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{p.period}</div>
              </div>
            ))}
          </div>
          {/* CTA */}
          {isSignedIn?(
            <button onClick={()=>{setShowUpgradeModal(false);navTo("pricing");}} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#0071E3,#5CB8FF)",border:"none",borderRadius:12,color:"#fff",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,113,227,0.3)",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 24px rgba(0,113,227,0.4)";e.currentTarget.style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,113,227,0.3)";e.currentTarget.style.transform="none";}}>
              View Plans & Upgrade
            </button>
          ):(
            <div style={{display:"flex",gap:10}}>
              <SignInButton mode="modal"><button style={{flex:1,padding:"14px",background:"linear-gradient(135deg,#0071E3,#5CB8FF)",border:"none",borderRadius:12,color:"#fff",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:14,letterSpacing:"-0.3px",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,113,227,0.3)"}} onClick={()=>setShowUpgradeModal(false)}>Sign In</button></SignInButton>
              <SignUpButton mode="modal"><button style={{flex:1,padding:"14px",background:"#fff",border:"2px solid #0071E3",borderRadius:12,color:"#0071E3",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:14,letterSpacing:"-0.3px",cursor:"pointer"}} onClick={()=>setShowUpgradeModal(false)}>Sign Up</button></SignUpButton>
            </div>
          )}
          <div style={{textAlign:"center",marginTop:14,fontSize:11,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>Secure payment via Razorpay. Cancel anytime.</div>
        </div>
      </div>
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
            <div key={t.id} style={{border:"2px solid #E5E5EA",borderRadius:14,overflow:"hidden",transition:"all 0.2s",position:"relative"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${t.accent}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5EA";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
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
                <div style={{fontSize:10,color:"#86868B",marginBottom:8}}>{t.desc}</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{
                    checkPlanForDownload(()=>{
                      setShowTemplatePicker(false);
                      downloadResume(resumeData,bullets,form.role,t.id);
                      if(isSignedIn) saveResume(getToken,{target_role:form.role,template_id:t.id,file_format:'pdf',resume_data:resumeData,ats_score:100}).catch(()=>{});
                    });
                  }} style={{flex:1,padding:"7px 0",background:t.accent,border:"none",borderRadius:8,color:"#fff",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,letterSpacing:"-0.2px",cursor:"pointer"}}>↓ PDF</button>
                  <button onClick={()=>{
                    checkPlanForDownload(()=>{
                      setShowTemplatePicker(false);
                      downloadResumeDocx(resumeData,bullets,form.role,t.id);
                      if(isSignedIn) saveResume(getToken,{target_role:form.role,template_id:t.id,file_format:'docx',resume_data:resumeData,ats_score:100}).catch(()=>{});
                    });
                  }} style={{flex:1,padding:"7px 0",background:"#fff",border:`1.5px solid ${t.accent}`,borderRadius:8,color:t.accent,fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:11,letterSpacing:"-0.2px",cursor:"pointer"}}>↓ DOCX</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>}

    {/* ═══ PROFILE ═══ */}
    {page==="profile"&&<div className="page-shell"><div className="profile-wrap">
      {!isSignedIn?(
        <div className="profile-hero">
          <section className="profile-identity"><div className="page-kicker">Private workspace</div><h1 className="profile-name">Sign in to view your profile.</h1><p className="profile-email">Your missions, resumes, subscriptions and saved activity live behind your secure account.</p><SignInButton mode="modal"><button className="premium-button" style={{padding:"13px 22px",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:900,cursor:"pointer"}}>Sign in</button></SignInButton></section>
          <section className="profile-plan-card"><div><div className="profile-plan-label">What unlocks</div><div className="profile-plan-name">Mission history</div></div><p className="profile-plan-copy">Track generated resumes, active plan status, job missions and saved account activity in one clean dashboard.</p></section>
        </div>
      ):profileLoading?(
        <section className="profile-identity" style={{textAlign:"center"}}><div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontSize:44,fontWeight:900,marginBottom:14,animation:"spin 1s linear infinite"}}>J</div><h1 className="profile-name">Loading your profile.</h1><p className="profile-email">Pulling your latest missions, resumes and plan data.</p></section>
      ):(<>
        <div className="profile-hero">
          <section className="profile-identity">
            <div className="profile-avatar">{clerkUser?.imageUrl?<img src={clerkUser.imageUrl} alt=""/>:clerkUser?.firstName?.[0]||"U"}</div>
            <div className="page-kicker">Candidate command center</div><h1 className="profile-name">{clerkUser?.fullName||"User"}</h1><div className="profile-email">{clerkUser?.primaryEmailAddress?.emailAddress||"No email connected"}</div>
            <div className="profile-meta"><span className="profile-pill">Member since {clerkUser?.createdAt?new Date(clerkUser.createdAt).toLocaleDateString("en-IN",{month:"long",year:"numeric"}):"unknown"}</span><span className="profile-pill">{profileSubs.find(s=>s.status==="active")?.plan_name||"Free"} plan</span></div>
          </section>
          <section className="profile-plan-card"><div><div className="profile-plan-label">Current access</div><div className="profile-plan-name">{profileSubs.find(s=>s.status==="active")?.plan_name||"Free"}</div></div><p className="profile-plan-copy">Your account keeps every generated resume, mission and subscription event ready for review.</p><button className="premium-button" onClick={()=>navTo("pricing")} style={{padding:"13px 18px",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:900,cursor:"pointer",alignSelf:"flex-start"}}>Manage plan</button></section>
        </div>
        <div className="profile-stats">{[["Resumes",profileData?.stats?.total_resumes||profileResumes.length],["Missions",profileData?.stats?.total_missions||profileMissions.length],["Applications",profileData?.stats?.total_applications||0],["Subscriptions",profileSubs.length]].map(([label,value])=><div className="profile-stat" key={label}><div className="profile-stat-label">{label}</div><div className="profile-stat-value">{value}</div></div>)}</div>
        {profileSubs.length>0&&<section className="profile-panel" style={{marginBottom:22}}><div className="profile-panel-head"><div><div className="profile-panel-title">Subscriptions</div><div className="profile-panel-sub">Plan purchases and current account access.</div></div></div><div className="profile-list">{profileSubs.map((sub,i)=><div className="profile-row" key={sub.id||i}><div><div className="profile-row-title">{sub.plan_name} Plan</div><div className="profile-row-meta">Rs {(sub.price/100).toLocaleString()} · Purchased {new Date(sub.purchased_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div></div><span className="page-chip">{sub.status}</span></div>)}</div></section>}
        <div className="profile-grid">
          <section className="profile-panel"><div className="profile-panel-head"><div><div className="profile-panel-title">Resume history</div><div className="profile-panel-sub">Generated documents and ATS scores.</div></div></div><div className="profile-list">{profileResumes.length===0?<div className="profile-empty">No resumes generated yet. Launch a mission to create your first optimized resume.</div>:profileResumes.map((r,i)=><div className="profile-row" key={r.id||i}><div><div className="profile-row-title">{r.target_role||"Resume"}</div><div className="profile-row-meta">{r.template_id} · {r.file_format?.toUpperCase()} · ATS {r.ats_score||"-"}%</div></div><div className="profile-row-date">{new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div></div>)}</div></section>
          <section className="profile-panel"><div className="profile-panel-head"><div><div className="profile-panel-title">Mission history</div><div className="profile-panel-sub">Recent job-agent runs and targeting.</div></div></div><div className="profile-list">{profileMissions.length===0?<div className="profile-empty">No missions run yet. Launch your first 8-agent job hunt from the app.</div>:profileMissions.map((m,i)=><div className="profile-row" key={m.id||i}><div><div className="profile-row-title">{m.target_role}</div><div className="profile-row-meta">{m.location||"Remote"} · {m.jobs_found} jobs found · {m.work_mode||"Any"}</div></div><div className="profile-row-date">{new Date(m.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div></div>)}</div></section>
        </div>
        <section className="profile-danger"><h3>Session controls</h3><p>Signing out ends the current session. Your saved resumes, missions and subscription data remain available when you return.</p><button onClick={()=>{signOut();navTo("landing");}}>Sign out of all devices</button></section>
      </>)}
    </div></div>}
    {false&&page==="profile"&&<div className="page-shell" style={{maxWidth:900,margin:"0 auto"}}>
      {!isSignedIn?(
        <div style={{textAlign:"center",padding:"80px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔒</div>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:22,color:"#1D1D1F",letterSpacing:"-0.3px",marginBottom:12}}>Sign in to view your profile</div>
          <SignInButton mode="modal"><button style={{background:"#0071E3",border:"none",borderRadius:980,padding:"14px 28px",color:"#fff",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,cursor:"pointer"}}>Sign in</button></SignInButton>
        </div>
      ):profileLoading?(
        <div style={{textAlign:"center",padding:"80px 20px"}}>
          <div style={{fontSize:36,animation:"spin 1s linear infinite",display:"inline-block"}}>⚡</div>
          <div style={{fontSize:14,color:"#86868B",marginTop:12}}>Loading your profile...</div>
        </div>
      ):(<>
        {/* User card */}
        <div style={{background:"#FFFFFF",borderRadius:24,padding:"32px",marginBottom:24,border:"1px solid #E5E5EA"}}>
          <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24,flexWrap:"wrap"}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#0071E3,#5CB8FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#fff",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,flexShrink:0,overflow:"hidden"}}>
              {clerkUser?.imageUrl?<img src={clerkUser.imageUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:clerkUser?.firstName?.[0]||"U"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:24,color:"#1D1D1F",letterSpacing:"-0.5px",marginBottom:4}}>{clerkUser?.fullName||"User"}</div>
              <div style={{fontSize:13,color:"#86868B",marginBottom:2}}>{clerkUser?.primaryEmailAddress?.emailAddress||""}</div>
              <div style={{fontSize:11,color:"#0071E3",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>Member since {clerkUser?.createdAt?new Date(clerkUser.createdAt).toLocaleDateString("en-IN",{month:"long",year:"numeric"}):"—"}</div>
            </div>
            <button onClick={()=>{signOut();navTo("landing");}} style={{background:"transparent",border:"1px solid #E5E5EA",borderRadius:10,padding:"10px 20px",color:"#86868B",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#EF4444";e.currentTarget.style.color="#EF4444";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5EA";e.currentTarget.style.color="#86868B";}}>Sign out</button>
          </div>

          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
            {[{l:"Resumes",v:profileData?.stats?.total_resumes||profileResumes.length,icon:"📄",c:"#0071E3"},{l:"Missions",v:profileData?.stats?.total_missions||profileMissions.length,icon:"🚀",c:"#7C3AED"},{l:"Applications",v:profileData?.stats?.total_applications||0,icon:"💼",c:"#0D9488"},{l:"Plan",v:profileSubs.find(s=>s.status==="active")?.plan_name||"Free",icon:"⭐",c:"#F59E0B"}].map(s=>(
              <div key={s.l} style={{background:"#F5F5F7",borderRadius:16,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:6}}>{s.icon}</div>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:700,fontSize:22,color:s.c,letterSpacing:"-0.3px"}}>{s.v}</div>
                <div style={{fontSize:11,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Subscription */}
        {profileSubs.length>0&&<div style={{background:"#FFFFFF",borderRadius:20,padding:"28px",marginBottom:24,border:"1px solid #E5E5EA"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,color:"#1D1D1F",letterSpacing:"-0.3px",marginBottom:16}}>💳 Subscriptions</div>
          {profileSubs.map((sub,i)=>(
            <div key={sub.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:sub.status==="active"?"rgba(0,113,227,0.04)":"#F5F5F7",borderRadius:12,marginBottom:8,border:sub.status==="active"?"1px solid rgba(0,113,227,0.15)":"1px solid transparent"}}>
              <div>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:14,color:sub.status==="active"?"#0071E3":"#86868B"}}>{sub.plan_name} Plan</div>
                <div style={{fontSize:11,color:"#86868B",marginTop:2}}>₹{(sub.price/100).toLocaleString()} · {new Date(sub.purchased_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
              </div>
              <span style={{fontSize:11,color:sub.status==="active"?"#4ADE80":"#86868B",background:sub.status==="active"?"rgba(74,222,128,0.1)":"#E5E5EA",padding:"4px 12px",borderRadius:20,fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,textTransform:"capitalize"}}>{sub.status}</span>
            </div>
          ))}
        </div>}

        {/* Resume History */}
        <div style={{background:"#FFFFFF",borderRadius:20,padding:"28px",marginBottom:24,border:"1px solid #E5E5EA"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,color:"#1D1D1F",letterSpacing:"-0.3px",marginBottom:16}}>📄 Resume History</div>
          {profileResumes.length===0?(
            <div style={{textAlign:"center",padding:"24px",color:"#86868B",fontSize:13}}>No resumes generated yet. Launch a mission to get started!</div>
          ):profileResumes.map((r,i)=>(
            <div key={r.id||i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"#F5F5F7",borderRadius:12,marginBottom:8}}>
              <div style={{width:40,height:40,borderRadius:10,background:"rgba(0,113,227,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📄</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#1D1D1F",letterSpacing:"-0.1px"}}>{r.target_role||"Resume"}</div>
                <div style={{fontSize:11,color:"#86868B"}}>{r.template_id} · {r.file_format?.toUpperCase()} · ATS: {r.ats_score||"—"}%</div>
              </div>
              <div style={{fontSize:10,color:"#86868B",whiteSpace:"nowrap"}}>{new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
            </div>
          ))}
        </div>

        {/* Mission History */}
        <div style={{background:"#FFFFFF",borderRadius:20,padding:"28px",marginBottom:24,border:"1px solid #E5E5EA"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:17,color:"#1D1D1F",letterSpacing:"-0.3px",marginBottom:16}}>🚀 Mission History</div>
          {profileMissions.length===0?(
            <div style={{textAlign:"center",padding:"24px",color:"#86868B",fontSize:13}}>No missions run yet. Go to the app and launch your first 8-agent mission!</div>
          ):profileMissions.map((m,i)=>(
            <div key={m.id||i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"#F5F5F7",borderRadius:12,marginBottom:8}}>
              <div style={{width:40,height:40,borderRadius:10,background:"rgba(124,58,237,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎯</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,color:"#1D1D1F",letterSpacing:"-0.1px"}}>{m.target_role}</div>
                <div style={{fontSize:11,color:"#86868B"}}>{m.location||"Remote"} · {m.jobs_found} jobs found · {m.work_mode||"Any"}</div>
              </div>
              <div style={{fontSize:10,color:"#86868B",whiteSpace:"nowrap"}}>{new Date(m.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div style={{background:"#FFFFFF",borderRadius:20,padding:"28px",border:"1px solid #E5E5EA"}}>
          <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:15,color:"#EF4444",letterSpacing:"-0.3px",marginBottom:12}}>⚠️ Danger zone</div>
          <div style={{fontSize:12,color:"#86868B",lineHeight:1.6,marginBottom:16}}>Signing out will end your current session. Your data is safely stored and will be available when you sign back in.</div>
          <button onClick={()=>{signOut();navTo("landing");}} style={{background:"transparent",border:"1px solid #EF4444",borderRadius:10,padding:"10px 20px",color:"#EF4444",fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Sign out of all devices</button>
        </div>
      </>)}
    </div>}



    {/* FOOTER */}
    <footer style={{borderTop:"1px solid #D2D2D7",padding:"24px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginTop:60}}>
      <div style={{fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:600,fontSize:13,letterSpacing:"-0.3px",color:"#D2D2D7"}}>JobHunter<span style={{color:"#0071E3"}}>.AI</span> © 2026</div>
      <div style={{fontSize:10,color:"#86868B",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>Powered by Claude AI (Anthropic) · JSearch API · Razorpay</div>
      <div style={{display:"flex",gap:20}}>
        {["Privacy","Terms","Refund Policy","Contact"].map(l=><span key={l} style={{fontSize:10,color:"#86868B",cursor:"pointer",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>{l}</span>)}
        <span onClick={()=>navTo("admin")} style={{fontSize:10,color:"#0071E3",cursor:"pointer",fontFamily:"'Wix Madefor Text',sans-serif",fontWeight:500}}>Admin</span>
      </div>
    </footer>
  </div>);
}
