const p = require('@babel/parser');
const fs = require('fs');
const path = require('path');
function walk(dir, out) {
  fs.readdirSync(dir).forEach((f) => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(f)) out.push(fp);
  });
  return out;
}
const all = ['App.js', 'index.js', ...walk('src', [])];
let fail = 0;
all.forEach((f) => {
  try {
    const c = fs.readFileSync(f, 'utf8');
    p.parse(c, { sourceType: 'module', plugins: /\.tsx?$/.test(f) ? ['jsx', 'typescript'] : ['jsx'] });
  } catch (e) {
    console.log('FAIL: ' + f + ' -> ' + e.message.split('\n')[0]);
    fail++;
  }
});
console.log('Sweep: ' + all.length + ' files, failures=' + fail);

// Feature checks
const w = fs.readFileSync('src/screens/WelcomeScreen.js', 'utf8');
console.log('WS haptics import:', w.includes("from 'expo-haptics'"));
console.log('WS 5-tap logic:', w.includes('next >= 5') && w.includes('ImpactFeedbackStyle.Medium'));
console.log('WS 2.5s reset:', w.includes('2500'));
console.log('WS logo tappable:', /TouchableOpacity[\s\S]{0,80}handleLogoTap/.test(w));
const adm = fs.readFileSync('src/screens/AdminSettingsScreen.js', 'utf8');
console.log('AS security section:', adm.includes('Security & Access Control') || adm.includes('Security &amp; Access Control'));
console.log('AS passcode hashed:', adm.includes('hashPasscode'));
console.log('AS biometric verify:', adm.includes('authenticateAsync') && adm.includes('hasHardwareAsync'));
console.log('AS startup toggle:', adm.includes('toggleRequireStartup'));
console.log(fail === 0 ? 'ALL CLEAN' : 'ISSUES FOUND');