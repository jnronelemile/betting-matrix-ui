const fs = require('fs');
let code = fs.readFileSync('src/components/MatchDashboard.jsx', 'utf-8');

// I need to make sure that the image fallback uses a generic icon or doesn't break
// when it fails to load the default image.
// Currently it does: src={homeInfo.logoPath} onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }}

if (code.includes("/logos/default.png")) {
  code = code.replace(/\/logos\/default\.png/g, "/logos/default.webp");
  fs.writeFileSync('src/components/MatchDashboard.jsx', code);
  console.log("Patched MatchDashboard");
}
