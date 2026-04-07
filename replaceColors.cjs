const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

const REPLACE = [
  // Primary reds
  [/#E63946/ig, '#0077B3'],
  [/230,57,70/g, '0,119,179'],
  [/#FF6B6B/ig, '#A3D1E0'],
  [/#C1121F/ig, '#005580'],
  [/#ffcccc/ig, '#A3D1E0'],
  [/pulse-red/g, 'pulse-blue'],

  // Deep dark backgrounds
  [/#080808/ig, '#F0F8FF'],
  [/#050505/ig, '#E0F7FA'],
  [/#0a0a0a/ig, '#FFFFFF'],
  
  // Dark borders, subtle lines
  [/#0f0f0f/ig, '#A3D1E0'],
  [/#1e1e1e/ig, '#A3D1E0'],
  [/#111(?![a-zA-Z0-9])/ig, '#A3D1E0'],
  [/#1a1a1a/ig, '#A3D1E0'],
  [/#0d0d0d/ig, '#A3D1E0'],
  
  // Specific dark accents
  [/#120303/ig, '#E0F7FA'],
  [/#1a0505/ig, '#E0F7FA'],
  [/#0f0000/ig, '#E0F7FA'],
  [/#0f0202/ig, '#F0F8FF'],
  [/#fff8f8/ig, '#F0F8FF'],
  [/#fff0f0/ig, '#E0F7FA'],

  // Light text to dark text
  [/"#fff"/ig, '"__WHITE__"'],
  [/#ccc/ig, '#333'],
  [/#ddd/ig, '#222'],
  [/#aaa/ig, '#555'],
  [/#888/ig, '#666'],
  [/#666/ig, '#777'],
  [/#555/ig, '#888'],
  [/#444/ig, '#999'],
  [/#333/ig, '#555'],
  [/#222/ig, '#666'],
  [/#2a2a2a/ig, '#666'],
  [/#141414/ig, '#E0F7FA'],

  // Now selectively revert __WHITE__
  // __WHITE__,fontFamily -> #FFFFFF,fontFamily (often buttons)
  [/"__WHITE__",fontFamily/g, '"#FFFFFF",fontFamily'],
  
  // the remaining __WHITE__ -> #182b3a (dark blueish text for light theme)
  [/__WHITE__/g, '#182b3a'],

  // Also replace any stray #fff that weren't in quotes
  [/#fff(?![a-zA-Z0-9])/ig, '#182b3a']
];

REPLACE.forEach(([re, replacement]) => {
  code = code.replace(re, replacement);
});

// For PricingCard Button
code = code.replace(/color:isPopular\?\("#FFFFFF"\):pkg\.color/g, 'color:isPopular?"#FFFFFF":pkg.color');
// And button in startMission: `color:form.role.trim()?"#182b3a":"#666"`
code = code.replace(/color:form\.role\.trim\(\)\?"#182b3a":"#666"/g, 'color:form.role.trim()?"#FFFFFF":"#666"');

// Fix text on primary buttons
code = code.replace(/color:"#182b3a",fontFamily:"'Bebas Neue',cursive"/g, 'color:"#FFFFFF",fontFamily:"\'Bebas Neue\',cursive"');

// In case that made non-buttons white, that's fine, Bebas Neue is mostly on headings/buttons. 
// Wait, Pricing card title: fontSize:24,color:pkg.color is fine.
// Let's write directly to App.jsx
fs.writeFileSync('src/App.jsx', code);
console.log('App.jsx updated with script successfully.');
