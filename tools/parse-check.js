const { parse } = require('@babel/parser');
const fs = require('fs');
const path = require('path');
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
    if (!/\.(js|tsx|ts)$/.test(e.name)) continue;
    const src = fs.readFileSync(p, 'utf8');
    try {
      parse(src, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'] });
    } catch (err) {
      console.log('PARSE FAIL: ' + p + ' :: ' + err.message);
      process.exitCode = 1;
    }
  }
}
walk('src');
console.log('PARSE CHECK DONE');