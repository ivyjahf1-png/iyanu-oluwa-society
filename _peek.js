const fs = require('fs');
const s = fs.readFileSync('src/screens/AdminSettingsScreen.js', 'utf8').split('\n');
for (let i = 1105; i < 1280; i++) process.stdout.write((i+1) + ': ' + s[i] + '\n');



