const fs = require('fs');
const lines = fs.readFileSync('frontend/src/locales/ja.json', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.match(/^\s*"projectManagement"\s*:/)) {
    console.log('JA line ' + (i + 1) + ': ' + l.trim());
  }
});

const lines2 = fs.readFileSync('frontend/src/locales/en.json', 'utf8').split('\n');
lines2.forEach((l, i) => {
  if (l.match(/^\s*"projectManagement"\s*:/)) {
    console.log('EN line ' + (i + 1) + ': ' + l.trim());
  }
});
