const fs = require('fs');
const p = 'D:/workspace/git/mmdpf/docs/design/infrastructure/staging-architecture-simple.drawio';
let c = fs.readFileSync(p, 'utf8');

// alb-pv の fillColor を #333333 から #0066CC に戻す
const before = 'id="alb-pv" value="prod-verification-alb';
const idx = c.indexOf(before);
if (idx !== -1) {
  const end = c.indexOf('</mxCell>', idx) + '</mxCell>'.length;
  let cell = c.substring(idx, end);
  console.log('before:', cell.substring(0, 200));
  cell = cell.replace('fillColor=#333333', 'fillColor=#0066CC');
  console.log('after:', cell.substring(0, 200));
  c = c.substring(0, idx) + cell + c.substring(end);
  fs.writeFileSync(p, c, 'utf8');
  console.log('fillColor restored to #0066CC, done');
} else {
  console.log('alb-pv not found');
}
