#!/usr/bin/env node
/**
 * i18nキー整合性チェックスクリプト
 * 
 * コンポーネントで使用されている t('xxx') のキーが
 * ja.json / en.json に存在するかチェックする
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ========== ユーティリティ ==========

/** JSONオブジェクトをドット区切りのフラットキー一覧に変換 */
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

// ========== 言語ファイル読み込み ==========

const jaPath = path.join(__dirname, '../frontend/src/locales/ja.json');
const enPath = path.join(__dirname, '../frontend/src/locales/en.json');

const jaJson = JSON.parse(fs.readFileSync(jaPath, 'utf-8'));
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

const jaKeys = new Set(flattenKeys(jaJson));
const enKeys = new Set(flattenKeys(enJson));

// ========== コンポーネントからキー収集 ==========

const srcDir = path.join(__dirname, '../frontend/src');

// grep でソースから t('key') パターンを全収集
const rawOutput = execSync(
  `grep -r --include="*.tsx" --include="*.ts" -h "t('" "${srcDir}" 2>/dev/null`,
  { maxBuffer: 20 * 1024 * 1024 }
).toString();

const usedKeys = new Set();

// t('some.key') および t("some.key") の両方を抽出
const singleQuoteRegex = /\bt\('([a-zA-Z][a-zA-Z0-9_.]+)'\)/g;
const doubleQuoteRegex = /\bt\("([a-zA-Z][a-zA-Z0-9_.]+)"\)/g;

let m;
while ((m = singleQuoteRegex.exec(rawOutput)) !== null) {
  usedKeys.add(m[1]);
}
while ((m = doubleQuoteRegex.exec(rawOutput)) !== null) {
  usedKeys.add(m[1]);
}

// ========== 差分分析 ==========

const missingInJa = [];
const missingInEn = [];
const missingInBoth = [];

for (const key of [...usedKeys].sort()) {
  const inJa = jaKeys.has(key);
  const inEn = enKeys.has(key);
  if (!inJa && !inEn) {
    missingInBoth.push(key);
  } else if (!inJa) {
    missingInJa.push(key);
  } else if (!inEn) {
    missingInEn.push(key);
  }
}

// ja.json にあって en.json にないキー（逆方向チェック）
const inJaNotEn = [...jaKeys].filter(k => !enKeys.has(k)).sort();
const inEnNotJa = [...enKeys].filter(k => !jaKeys.has(k)).sort();

// ========== 結果出力 ==========

console.log('='.repeat(60));
console.log('i18n キー整合性チェック結果');
console.log('='.repeat(60));
console.log(`\n収集済みコンポーネントキー数: ${usedKeys.size}`);
console.log(`ja.json 定義キー数: ${jaKeys.size}`);
console.log(`en.json 定義キー数: ${enKeys.size}`);

console.log('\n' + '='.repeat(60));
console.log(`【1】コンポーネントで使用 & ja.json にも en.json にも未定義: ${missingInBoth.length} 件`);
console.log('='.repeat(60));
missingInBoth.forEach(k => console.log('  MISSING_BOTH: ' + k));

console.log('\n' + '='.repeat(60));
console.log(`【2】コンポーネントで使用 & ja.json のみ未定義: ${missingInJa.length} 件`);
console.log('='.repeat(60));
missingInJa.forEach(k => console.log('  MISSING_JA: ' + k));

console.log('\n' + '='.repeat(60));
console.log(`【3】コンポーネントで使用 & en.json のみ未定義: ${missingInEn.length} 件`);
console.log('='.repeat(60));
missingInEn.forEach(k => console.log('  MISSING_EN: ' + k));

console.log('\n' + '='.repeat(60));
console.log(`【4】ja.json にあって en.json に未定義: ${inJaNotEn.length} 件`);
console.log('='.repeat(60));
inJaNotEn.forEach(k => console.log('  JA_ONLY: ' + k));

console.log('\n' + '='.repeat(60));
console.log(`【5】en.json にあって ja.json に未定義: ${inEnNotJa.length} 件`);
console.log('='.repeat(60));
inEnNotJa.forEach(k => console.log('  EN_ONLY: ' + k));

console.log('\n' + '='.repeat(60));
console.log('チェック完了');
console.log('='.repeat(60));
