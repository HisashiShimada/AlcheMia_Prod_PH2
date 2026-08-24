#!/usr/bin/env node
/**
 * JA_ONLY / EN_ONLY キーについて、コンポーネントで実際に使われているかを確認するスクリプト
 * 使われていない → 削除候補
 * 使われている   → 補完候補（片方の言語ファイルに追加が必要）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jaPath = path.join(__dirname, '../frontend/src/locales/ja.json');
const enPath = path.join(__dirname, '../frontend/src/locales/en.json');
const srcDir = path.join(__dirname, '../frontend/src');

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys = keys.concat(flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const jaKeys = new Set(flattenKeys(JSON.parse(fs.readFileSync(jaPath, 'utf-8'))));
const enKeys = new Set(flattenKeys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))));

const jaOnlyKeys = [...jaKeys].filter(k => !enKeys.has(k)).sort();
const enOnlyKeys = [...enKeys].filter(k => !jaKeys.has(k)).sort();

// ソースコード全文を一度だけ読む
const rawSrc = execSync(
  `grep -r --include="*.tsx" --include="*.ts" -h "t('" "${srcDir}" 2>/dev/null`,
  { maxBuffer: 20 * 1024 * 1024 }
).toString();

// 使用キーを抽出
const usedKeys = new Set();
const singleQ = /\bt\('([a-zA-Z][a-zA-Z0-9_.]+)'[,)]/g;
const doubleQ = /\bt\("([a-zA-Z][a-zA-Z0-9_.]+)"[,)]/g;
let m;
while ((m = singleQ.exec(rawSrc)) !== null) usedKeys.add(m[1]);
while ((m = doubleQ.exec(rawSrc)) !== null) usedKeys.add(m[1]);

const jaOnlyUsed    = jaOnlyKeys.filter(k => usedKeys.has(k));
const jaOnlyUnused  = jaOnlyKeys.filter(k => !usedKeys.has(k));
const enOnlyUsed    = enOnlyKeys.filter(k => usedKeys.has(k));
const enOnlyUnused  = enOnlyKeys.filter(k => !usedKeys.has(k));

const lines = [];
const push = (s = '') => lines.push(s);
const SEP = '='.repeat(60);

push(SEP);
push('JA_ONLY / EN_ONLY キー使用状況分析');
push(SEP);
push('');
push(`JA_ONLY 合計: ${jaOnlyKeys.length} 件`);
push(`  コンポーネントで使用中: ${jaOnlyUsed.length} 件  → en.json への補完が必要`);
push(`  未使用:                 ${jaOnlyUnused.length} 件  → ja.json から削除候補`);
push('');
push(`EN_ONLY 合計: ${enOnlyKeys.length} 件`);
push(`  コンポーネントで使用中: ${enOnlyUsed.length} 件  → ja.json への補完が必要`);
push(`  未使用:                 ${enOnlyUnused.length} 件  → en.json から削除候補`);
push('');

push(SEP);
push(`【JA_ONLY 使用中】→ en.json に追加が必要 (${jaOnlyUsed.length} 件)`);
push(SEP);
jaOnlyUsed.forEach(k => push('  USED_JA: ' + k));
push('');

push(SEP);
push(`【JA_ONLY 未使用】→ ja.json から削除候補 (${jaOnlyUnused.length} 件)`);
push(SEP);
jaOnlyUnused.forEach(k => push('  UNUSED_JA: ' + k));
push('');

push(SEP);
push(`【EN_ONLY 使用中】→ ja.json に追加が必要 (${enOnlyUsed.length} 件)`);
push(SEP);
enOnlyUsed.forEach(k => push('  USED_EN: ' + k));
push('');

push(SEP);
push(`【EN_ONLY 未使用】→ en.json から削除候補 (${enOnlyUnused.length} 件)`);
push(SEP);
enOnlyUnused.forEach(k => push('  UNUSED_EN: ' + k));

const report = lines.join('\n');

const resultDir = path.join(__dirname, 'result');
if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });
const reportPath = path.join(resultDir, 'i18n-only-analysis.txt');
fs.writeFileSync(reportPath, report, 'utf-8');

// コンソールはサマリのみ
console.log(SEP);
console.log('JA_ONLY / EN_ONLY キー使用状況分析');
console.log(SEP);
console.log(`JA_ONLY ${jaOnlyKeys.length} 件 → 使用中: ${jaOnlyUsed.length} 件（en補完要）/ 未使用: ${jaOnlyUnused.length} 件（ja削除候補）`);
console.log(`EN_ONLY ${enOnlyKeys.length} 件 → 使用中: ${enOnlyUsed.length} 件（ja補完要）/ 未使用: ${enOnlyUnused.length} 件（en削除候補）`);
console.log(`詳細レポート: ${reportPath}`);
console.log(SEP);
