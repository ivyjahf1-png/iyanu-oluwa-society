const { spawnSync } = require('child_process');
const path = require('path');
const root = process.cwd();
const expoBin = path.join(root, 'node_modules', '.bin', 'expo.cmd');
const r = spawnSync(expoBin, ['start', '--web', '--no-dev', '--port', '8082'], {
  stdio: 'pipe',
  cwd: root,
  timeout: 25000,
  shell: true,
});
const out = (r.stdout || '').toString();
const err = (r.stderr || '').toString();
console.log('=== STDOUT (tail) ===');
console.log(out.slice(-4000));
console.log('=== STDERR (tail) ===');
console.log(err.slice(-3000));
console.log('=== exit code:', r.status, 'signal:', r.signal);