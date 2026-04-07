const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400..800&family=Wix+Madefor+Text:wght@400..800&display=swap"
);

// We need to globally replace the font families.
c = c.split(`fontFamily:"'Bebas Neue',cursive"`).join(`fontFamily:"'Wix Madefor Display',sans-serif",fontWeight:800`);
c = c.split(`fontFamily:"'DM Sans',sans-serif"`).join(`fontFamily:"'Wix Madefor Text',sans-serif"`);
c = c.split(`font-family:'Bebas Neue',cursive;`).join(`font-family:'Wix Madefor Display',sans-serif;font-weight:800;`);

fs.writeFileSync('src/App.jsx', c);
console.log('Font updated natively.');
