const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// The Ocean Breeze Palette
// #A3D1E0 (Light Blue Accent)
// #F0F8FF (Alice Blue - Background)
// #0077B3 (Primary Deep Blue)
// #E0F7FA (Cyan Light - Card/Secondary Background)
// #FFFFFF (White)

// Primary colors
code = code.replace(/#E63946/gi, '#0077B3');
code = code.replace(/230,57,70/g, '0,119,179');
code = code.replace(/#FF6B6B/gi, '#A3D1E0');
code = code.replace(/#C1121F/gi, '#005580');
code = code.replace(/pulse-red/g, 'pulse-blue');

// Light mode main backgrounds
code = code.replace(/#080808/gi, '#F0F8FF'); // Deepest background
code = code.replace(/#0a0a0a/gi, '#FFFFFF'); // Main card backgrounds
code = code.replace(/#050505/gi, '#E0F7FA'); // Navbar/Secondary

// Borders and subtle dividers
code = code.replace(/#0f0f0f/gi, '#A3D1E0');
code = code.replace(/#111(?![a-zA-Z0-9])/gi, '#A3D1E0');
code = code.replace(/#1a1a1a/gi, '#A3D1E0');
code = code.replace(/#1e1e1e/gi, '#A3D1E0');
code = code.replace(/#0d0d0d/gi, '#A3D1E0');

// Hover colors / dark accent variations
code = code.replace(/#141414/gi, '#E0F7FA'); 
code = code.replace(/#0f0202/gi, '#FFFFFF');
code = code.replace(/#120303/gi, '#E0F7FA');
code = code.replace(/#1a0505/gi, '#E0F7FA');
code = code.replace(/#0f0000/gi, '#E0F7FA');
code = code.replace(/#fff8f8/gi, '#F0F8FF');
code = code.replace(/#fff0f0/gi, '#E0F7FA');

// Convert light text variables to dark text variables
code = code.replace(/"#fff"/gi, '"#__WHITE__"');

code = code.replace(/#ccc/gi, '#333');
code = code.replace(/#ddd/gi, '#222');
code = code.replace(/#aaa/gi, '#555');
code = code.replace(/#888/gi, '#666');
code = code.replace(/#666/gi, '#777');
code = code.replace(/#555/gi, '#888');
code = code.replace(/#444/gi, '#999');
code = code.replace(/#333/gi, '#555'); 
code = code.replace(/#222/gi, '#666');
code = code.replace(/#2a2a2a/gi, '#666');

// Decide text color mapping based on element
// Restore placeholder "#__WHITE__" to standard dark text "#1a1a1a", EXCEPT in instances where we expect button text with #0077B3 background
// Look for "#__WHITE__,fontFamily" -> that's a button.
code = code.replace(/"#__WHITE__",fontFamily/g, '"#FFFFFF",fontFamily');
// Revert specific badges or tags to white text if background is primary
code = code.replace(/badge\{background:#0077B3;color:white/g, 'badge{background:#0077B3;color:#FFFFFF');

// Fallback all other assumed white text to dark
code = code.replace(/#__WHITE__/g, '#182b3a');

// "minHeight:"100vh",background:"#F0F8FF",color:"#182b3a""
code = code.replace(/color:"#fff"/g, 'color:"#182b3a"');
// Any missed white text inline
code = code.replace(/#fff(?![a-zA-Z0-9])/gi, '#182b3a');

// Save modified code
fs.writeFileSync('src/App.jsx', code);
console.log('Successfully updated App.jsx to Ocean Breeze palette.');
