const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// The most obvious issue: text is white or very light on light backgrounds.
// Let's replace the root color.
code = code.replace('color:"#FFFFFF",fontFamily:"\'DM Sans\',sans-serif"', 'color:"#1E293B",fontFamily:"\'DM Sans\',sans-serif"');

// Darken all the light grays to ensure readability on white backgrounds.
code = code.replace(/#999/g, '#64748B');
code = code.replace(/#888/g, '#475569');
code = code.replace(/#777/g, '#334155');
code = code.replace(/#666/g, '#1E293B');
code = code.replace(/#555/g, '#0F172A');
code = code.replace(/#182b3a/g, '#0F172A'); // deep navy for primary texts

// Change overly bright background accents to neutral slate variants to make the Ocean Blue "#0077B3" pop.
// This is typical in "enterprise" UI: Neutral gray/white background, strong singular brand color.
code = code.replace(/background:"#E0F7FA"/g, 'background:"#F8FAFC"'); // Nav, agent card hover, app backgrounds
code = code.replace(/background:"#A3D1E0"/g, 'background:"#F1F5F9"'); // Borders and muted elements
code = code.replace(/background:"#F0F8FF"/g, 'background:"#F8FAFC"'); // Root background

// Adjust borders for softer enterprise feel
code = code.replace(/#A3D1E0/g, '#E2E8F0'); 

// Restore #A3D1E0 for specific specific intentional blueish properties (like the gradient or highlight)
// but generally #E2E8F0 slate border is much better for enterprise layout.

// Fix footer text (which got turned into borderline invisible color before)
code = code.replace('color:"#E2E8F0">JOBHUNTER', 'color:"#0F172A">JOBHUNTER');
code = code.replace('color:"#E2E8F0",fontFamily:"monospace"', 'color:"#64748B",fontFamily:"monospace"');
code = code.replace('color:"#E2E8F0",cursor:"pointer"', 'color:"#475569",cursor:"pointer"');

// Fix buttons that need to use white text (which I turned to deep navy unfortunately by replacing variables)
// All primary #0077B3 buttons should have #FFFFFF text.
code = code.replace(/color:"#0F172A",fontFamily:"'Bebas Neue',cursive"/g, 'color:"#FFFFFF",fontFamily:"\'Bebas Neue\',cursive"');

// Fix the glowing text in Hero which looks cheap for enterprise
code = code.replace(/textShadow:"0 0 60px rgba\(0,119,179,0.4\)"/g, 'textShadow:"0 8px 24px rgba(0,119,179,0.15)"');
// Subtext in hero
code = code.replace('color:"#475569",maxWidth:540', 'color:"#334155",maxWidth:540');

// Add subtle drop shadows to boxes for depth
code = code.replace('background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:14', 'background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:14,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)"');
code = code.replace('background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:16', 'background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:16,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)"');
code = code.replace('background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:20', 'background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:20,boxShadow:"0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)"');
code = code.replace('background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:12', 'background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:12,boxShadow:"0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)"');

// Fix the "tab" system inside dashboard: Active tab text needs to be white, inactive needs to be slate
code = code.replace(/color:tab===t.id\?"#0F172A":"#1E293B"/g, 'color:tab===t.id?"#FFFFFF":"#475569"');
code = code.replace(/color:tab===t.id\?"#0077B3":"transparent"/g, 'color:tab===t.id?"#FFFFFF":"transparent"');
// Wait, looking at the code: tab styling:
// `background:tab===t.id?"#0077B3":"transparent",... color:tab===t.id?"#182b3a":"#666"`
// The replace above turned `#182b3a` into `#0F172A` and `#666` into `#1E293B`.
code = code.replace(/color:tab===t.id\?"#0F172A":"#1E293B"/g, 'color:tab===t.id?"#FFFFFF":"#475569"');

// Fix nav transparency and blur for a professional feel
code = code.replace(/background:"#F8FAFC",position:"sticky",top:0/g, 'background:"rgba(255,255,255,0.9)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",position:"sticky",top:0');

// Fix pulse box shadows to be elegant, not overblown
code = code.replace(/@keyframes pulse-blue{0%,100%{box-shadow:0 0 20px rgba\(0,119,179,0.3\)}50%{box-shadow:0 0 50px rgba\(0,119,179,0.6\)}}/g, '@keyframes pulse-blue{0%,100%{box-shadow:0 4px 14px rgba(0,119,179,0.25)}50%{box-shadow:0 10px 25px rgba(0,119,179,0.4)}}');

fs.writeFileSync('src/App.jsx.fixed', code);
console.log("Rewrite completed.");
