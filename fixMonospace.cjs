const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(/fontFamily:"monospace"/g, 'fontFamily:"\\\'Wix Madefor Text\\\',sans-serif",fontWeight:500,textTransform:"uppercase"');
c = c.replace(/font-family:Georgia,serif/g, "font-family:'Wix Madefor Text',sans-serif");
c = c.replace(/font-family:monospace/g, "font-family:'Wix Madefor Text',sans-serif;font-weight:500;text-transform:uppercase");

fs.writeFileSync('src/App.jsx.mono', c);
console.log('Monospace and serif replaced.');
