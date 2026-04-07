const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add responsive CSS to the <style> block
const styleInject = `
      .nav-links { display: flex; align-items: center; gap: 24px; }
      .menu-toggle { display: none; font-size: 24px; background: none; border: none; cursor: pointer; color: #0F172A; }
      @media (max-width: 768px) {
        .main-nav { padding: 0 16px !important; }
        .nav-links {
          display: none;
          flex-direction: column;
          position: absolute;
          top: 58px;
          left: 0;
          width: 100%;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(12px);
          padding: 20px 0;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          border-bottom: 1px solid #E2E8F0;
        }
        .nav-links.open { display: flex; }
        .menu-toggle { display: block; }
        h1 { font-size: clamp(36px, 10vw, 110px) !important; }
        h2 { font-size: clamp(28px, 8vw, 60px) !important; }
        .section-pad { padding: 40px 16px !important; }
        .hero-pad { min-height: auto !important; padding: 80px 16px 40px !important; }
        .card-pad { padding: 20px !important; }
        .mobile-col { grid-template-columns: 1fr !important; }
        .mobile-stack { flex-direction: column !important; align-items: flex-start !important; }
        .mobile-full-btn { width: 100% !important; margin-bottom: 12px; }
        footer { padding: 24px 16px !important; justify-content: center !important; text-align: center; flex-direction: column; }
      }
`;

code = code.replace(`.pkg-btn:hover{opacity:0.85}`, `.pkg-btn:hover{opacity:0.85}\n${styleInject}`);

// 2. Wrap Nav elements for mobile toggle
code = code.replace(
  /<nav style={{borderBottom:"1px solid #E2E8F0",padding:"0 32px"[^>]*>([\s\S]*?)<\/nav>/,
  (match, inner) => {
    let replacedInner = inner.replace(
      /<div style={{display:"flex",alignItems:"center",gap:24}}>/,
      `<button className="menu-toggle" onClick={()=>setMobileMenu(!mobileMenu)}>☰</button>\n      <div className={\`nav-links \${mobileMenu?"open":""}\`}>`
    );
    return `<nav className="main-nav" style={{borderBottom:"1px solid #E2E8F0",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,background:"rgba(255,255,255,0.9)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:200}}>\n${replacedInner}\n</nav>`;
  }
);

// 3. Fix Clamp values for headings
code = code.replace(/clamp\(52px,9vw,110px\)/g, 'clamp(36px,10vw,110px)');
code = code.replace(/clamp\(40px,6vw,76px\)/g, 'clamp(32px,9vw,76px)');
code = code.replace(/clamp\(32px,5vw,60px\)/g, 'clamp(28px,8vw,60px)');
code = code.replace(/clamp\(28px,4vw,48px\)/g, 'clamp(24px,7vw,48px)');

// 4. Inject responsive padded wrapper classes
code = code.replace(/<div style={{padding:"80px 32px"/g, '<div className="section-pad" style={{padding:"80px 32px"');
code = code.replace(/<div style={{minHeight:"91vh"/g, '<div className="hero-pad" style={{minHeight:"91vh"');

// Forms & Extension elements
code = code.replace(/<div style={{display:"grid",gridTemplateColumns:"1fr 1fr"/g, '<div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr"');
code = code.replace(/<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"/g, '<div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"');

// Inner card paddings
code = code.replace(/(<div[^>]*style={{[^}]*)padding:"36px"([^}]*}}>)/g, (match, p1, p2) => {
  return `${p1}padding:"36px"${p2}`.replace(/<div /, '<div className="card-pad" ');
});

// App Dashboard
code = code.replace(/<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>/, '<div className="mobile-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>');

fs.writeFileSync('src/App.jsx.fixed', code);
console.log('Mobile responsiveness applied.');
