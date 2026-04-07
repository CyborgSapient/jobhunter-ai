const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

const strReplaces = {
  '#0077B3': '#0071E3',
  '#1E293B': '#1D1D1F',
  '#0F172A': '#1D1D1F',
  '#334155': '#424245',
  '#475569': '#86868B',
  '#64748B': '#86868B',
  '#F8FAFC': '#F5F5F7',
  '#E2E8F0': '#D2D2D7',
  '0,119,179': '0,113,227', 
  'letterSpacing:3': 'letterSpacing:"-0.5px"',
  'letterSpacing:2': 'letterSpacing:"-0.3px"',
  'letterSpacing:1': 'letterSpacing:"-0.1px"',
  'fontWeight:800': 'fontWeight:600',
  'borderRadius:14,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)"': 'borderRadius:18,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"',
  'borderRadius:16,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)"': 'borderRadius:20,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"',
  'borderRadius:12,boxShadow:"0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)"': 'borderRadius:16,boxShadow:"0 2px 12px rgba(0,0,0,0.03)"',
  'borderRadius:12,padding:"16px 40px"': 'borderRadius:980,padding:"14px 28px"',
  'borderRadius:12,padding:"16px 44px"': 'borderRadius:980,padding:"14px 28px"',
  'borderRadius:12,padding:"16px 48px"': 'borderRadius:980,padding:"14px 28px"',
  'borderRadius:8,padding:"8px 20px"':  'borderRadius:980,padding:"8px 20px"',
  'borderRadius:10,padding:"14px"': 'borderRadius:980,padding:"14px"',
  'borderRadius:12,padding:"18px"': 'borderRadius:980,padding:"18px"',
  'borderRadius:14,padding:"22px 28px"': 'borderRadius:18,padding:"22px 28px"',
  'borderRadius:12,padding:"16px"': 'borderRadius:16,padding:"16px"'
};

for(let [k,v] of Object.entries(strReplaces)){
  c = c.split(k).join(v);
}

// Clean up specific borders and shadows
c = c.replace(/border:"1px solid rgba\(0,113,227,0.15\)"/g, 'border:"none"');
c = c.replace(/border:"1px solid rgba\(0,113,227,0.12\)"/g, 'border:"none"');
c = c.replace(/border:"1px solid rgba\(0,113,227,0.2\)"/g, 'border:"none"');
c = c.replace(/border:"1px solid #D2D2D7"/g, 'border:"1px solid #E5E5EA"'); // softer border
c = c.replace(/boxShadow:\w+\?\`0 0 \d+px rgba\([^)]+\)\`[:]"none"/g, 'boxShadow:isPopular?"0 12px 36px rgba(0,0,0,0.08)":"none"');
c = c.replace(/boxShadow:"0 0 \d+px rgba\([^)]+\)"/g, 'boxShadow:"none"');

// Case transformations
const stringsToFix = {
  "LAND YOUR": "Land your",
  "DREAM JOB": "dream job",
  "IN 30 DAYS": "in 30 days.",
  "JOBHUNTER": "JobHunter",
  "STOP APPLYING MANUALLY.": "Stop applying manually.",
  "LET AI DO IT.": "Let AI do the work.",
  "WHAT JOB SEEKERS SAY": "What job seekers say.",
  "HOW IT WORKS": "How it works.",
  "8 AGENTS. ONE MISSION.": "8 agents. One mission.",
  "YOUR CAREER.": "Your career.",
  "THE TEAM": "The team",
  "INVEST IN YOUR": "Invest in your",
  "CAREER": "career.",
  "TRANSPARENT PRICING · NO HIDDEN FEES": "Transparent pricing. No hidden fees.",
  "LINKEDIN": "LinkedIn",
  "AUTOPILOT": "Autopilot.",
  "MISSION CONTROL": "Mission control",
  "CONFIGURE YOUR": "Configure your",
  "JOB HUNT": "job hunt.",
  "⚡ LAUNCH FREE TRIAL": "Launch free trial",
  "VIEW PRICING →": "View pricing",
  "START FREE →": "Start free",
  "SEE PLANS": "See plans",
  "LAUNCH APP": "Launch App",
  "PRICING": "Pricing",
  "EXTENSION": "Extension",
  "HOME": "Home",
  "MOST POPULAR": "Most Popular",
  "BEST VALUE": "Best Value",
  "HOW WE COMPARE": "How we compare.",
  "HOW TO INSTALL — 5 STEPS": "How to install — 5 steps.",
  "FREQUENTLY ASKED": "Frequently asked questions",
  "GET CLOSER PLAN → ₹7,999/MO": "Get Closer Plan",
  "GET STARTED →": "Get started",
  "GET STARTED": "Get started"
};

for(let [k,v] of Object.entries(stringsToFix)){
  c = c.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v);
}

// Animations cleanup
c = c.replace(/animation:"pulse-blue[^"]*"/g, 'animation:"none"');
c = c.replace(/animation:"blink[^"]*"/g, 'animation:"none"');
c = c.replace(/animation:"shimmer[^"]*"/g, 'animation:"none"');
c = c.replace(/animation:form\.role\.trim\(\)\?"pulse-blue 2.5s infinite":"none"/g, 'animation:"none"');

// Nav cleanup
c = c.replace(/\.nav-btn\{[^\}]+\}/g, `.nav-btn{background:none;border:none;color:#86868B;font-family:'Wix Madefor Display',sans-serif;font-weight:500;font-size:14px;cursor:pointer;transition:color 0.2s;padding:4px 0}`);

fs.writeFileSync('src/App.jsx.apple', c);
console.log('Done.');
