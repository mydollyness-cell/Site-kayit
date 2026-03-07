var cp = require('child_process');
var path = require('path');
var cwd = path.resolve('d:\\d\\d diski\\özel\\Site');

function git(args) {
  try {
    var out = cp.execSync('git ' + args, { cwd: cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    return out.trim();
  } catch(e) {
    return 'ERR: ' + ((e.stderr||'') + (e.stdout||'')).trim();
  }
}

var results = [];
results.push('1-LOG: ' + git('log --oneline -1'));
results.push('2-STATUS: ' + git('status --porcelain'));
results.push('3-ADD: ' + git('add -A'));
results.push('4-STAGED: ' + git('diff --cached --name-only'));
results.push('5-COMMIT: ' + git('commit -m "fix-vercel-routing"'));
results.push('6-PUSH: ' + git('push origin main'));
results.push('7-FINAL: ' + git('log --oneline -1'));
results.push('8-VERIFY: ' + git('show HEAD:vercel.json'));

require('fs').writeFileSync(path.join(cwd, 'PUSH_RESULT.txt'), results.join('\n\n'), 'utf8');
console.log(results.join('\n'));
