const fs = require('fs');
// Read as Buffer to handle CR+LF on Windows, then normalize to LF
const raw = fs.readFileSync(__dirname + '/gen_drawio.py', 'utf8').replace(/\r\n/g, '\n');
// Extract XML between triple-quotes
const start = raw.indexOf('XML = """') + 9;
const end = raw.indexOf('"""\n\nwith');
if (end === -1) { console.error('End marker not found'); process.exit(1); }
const xml = raw.slice(start, end);
const out = 'd:/workspace/git/mmdpf/docs/design/infrastructure/onprem-architecture.drawio';
fs.writeFileSync(out, xml, 'utf8');
console.log('Written:', out);
console.log('Size:', fs.statSync(out).size, 'bytes');
