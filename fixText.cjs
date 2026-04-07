const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

const textReplacements = {
  "LIVE · 8 AI AGENTS · INDIA'S SMARTEST job hunt.ING AI": "Live · 8 AI Agents · India's smartest job hunting AI",
  "job hunt.": "job hunt",
  "HOW IT <span": "How it <span",
  "WHAT JOB SEEKERS <span": "What job seekers <span",
  "CHROME Extension · CLOSER PLAN ONLY": "Chrome Extension · Closer Plan only",
  "⚡ SAFETY BUILT IN — YOUR ACCOUNT IS PROTECTED": "⚡ Safety built in — your account is protected",
  "▸ MISSION PARAMETERS": "▸ Mission parameters",
  "DROP YOUR PDF RESUME HERE": "Drop your PDF resume here",
  "MISSION IN PROGRESS — {overallProg}% COMPLETE": "Mission in progress — {overallProg}% complete",
  "SYSTEM LOG": "System log",
  "✓ MISSION COMPLETE — ALL 8 AGENTS DEPLOYED": "✓ Mission complete — all 8 agents deployed",
  "⬇ DOWNLOAD RESUME": "⬇ Download resume",
  "↺ NEW MISSION": "↺ New mission",
  "FORGE — AI ANALYSIS": "Forge — AI Analysis",
  "CANDIDATE": "Candidate",
  "TOP SKILLS DETECTED": "Top skills detected",
  "GAPS TO ADDRESS": "Gaps to address",
  "⬇ DOWNLOAD OPTIMISED RESUME": "⬇ Download optimised resume",
  "NO RESUME UPLOADED": "No resume uploaded",
  "AI-GENERATED BULLETS": "AI-generated bullets",
  "KEYWORDS TO ADD TO YOUR RESUME": "Keywords to add to your resume",
  "SAGE PREP QUESTIONS": "Sage prep questions",
  "PREP<br/>READY": "Prep<br/>ready",
  "APPLY →": "Apply →",
  "Launch App": "Launch app",
  "Get Closer Plan": "Get Closer plan",
  'textTransform:"uppercase"': '',
  "WORKS": "works",
  "SAY": "say",
  "8 AGENTS.": "8 agents.",
  "ONE MISSION.": "One mission.",
  "YOUR CAREER.": "Your career.",
  "THE TEAM": "The team"
};

for (const [key, value] of Object.entries(textReplacements)) {
  c = c.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
}

// Clean up some previous mistakes like `job hunt.` -> `job hunt`
c = c.replace(/job hunt\./g, 'job hunt');

// Write back
fs.writeFileSync('src/App.jsx.fixed', c);
console.log('Text conversions deployed.');
