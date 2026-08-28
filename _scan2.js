const fs = require('fs');
const lines = fs.readFileSync('src/components/AdminLock.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (/colors/.test(l)) console.log(i + 1 + ': ' + l.trim());
});
