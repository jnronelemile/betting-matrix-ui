const fs = require('fs');
const files = fs.readdirSync('public/logos');
console.log(files.length + " logos exist.");
