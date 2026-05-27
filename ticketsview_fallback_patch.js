const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/TicketsView.jsx', 'utf-8');

if (code.includes("/logos/default.png")) {
  code = code.replace(/\/logos\/default\.png/g, "/logos/default.webp");
  fs.writeFileSync('src/components/dashboard/TicketsView.jsx', code);
  console.log("Patched TicketsView");
}
