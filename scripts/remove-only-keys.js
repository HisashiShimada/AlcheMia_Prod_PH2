#!/usr/bin/env node
/**
 * JA_ONLY / EN_ONLY の未使用キーを言語ファイルから削除するスクリプト
 *
 * 処理内容:
 *   1. analyze-only-keys.js と同じロジックで未使用キー一覧を算出
 *   2. ja.json から JA_ONLY かつ未使用のキーを削除
 *   3. en.json から EN_ONLY かつ未使用のキーを削除
 *   4. 削除件数・JSON構文をレポート
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ========== ユーティリティ ==========

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

/**
 * ドット区切りキーを使ってオブジェクトから値を削除する。
 * 削除後に親オブジェクトが空になれば親も削除する（再帰的に）。
 */
function deleteKey(obj, keyPath) {
  const parts = keyPath.split('.');
  function del(current, parts) {
    if (parts.length === 1) {
      delete current[parts[0]];
      return;
    }
    const head = parts[0];
    if (current[head] && typeof current[head] === 'object') {
      del(current[head], parts.slice(1));
      if (Object.keys(current[head]).length === 0) {
        delete current[head];
      }
    }
  }
  del(obj, parts);
}

// ========== 言語ファイル読み込み ==========

const jaPath = path.join(__dirname, '../frontend/src/locales/ja.json');
const enPath = path.join(__dirname, '../frontend/src/locales/en.json');

const jaJson = JSON.parse(fs.readFileSync(jaPath, 'utf-8'));
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

const jaKeys = new Set(flattenKeys(jaJson));
const enKeys = new Set(flattenKeys(enJson));

const jaOnlyKeys = [...jaKeys].filter(k => !enKeys.has(k)).sort();
const enOnlyKeys = [...enKeys].filter(k => !jaKeys.has(k)).sort();

// ========== コンポーネント使用キー収集 ==========

const srcDir = path.join(__dirname, '../frontend/src');

const rawSrc = execSync(
  `grep -r --include="*.tsx" --include="*.ts" -h "t('" "${srcDir}" 2>/dev/null`,
  { maxBuffer: 20 * 1024 * 1024 }
).toString();

const usedKeys = new Set();
const singleQ = /\bt\('([a-zA-Z][a-zA-Z0-9_.]+)'[,)]/g;
const doubleQ = /\bt\("([a-zA-Z][a-zA-Z0-9_.]+)"[,)]/g;
let m;
while ((m = singleQ.exec(rawSrc)) !== null) usedKeys.add(m[1]);
while ((m = doubleQ.exec(rawSrc)) !== null) usedKeys.add(m[1]);

// ========== 削除対象を特定 ==========

const jaDeleteTargets = jaOnlyKeys.filter(k => !usedKeys.has(k));
const enDeleteTargets = enOnlyKeys.filter(k => !usedKeys.has(k));

console.log('削除対象キー数:');
console.log(`  ja.json: ${jaDeleteTargets.length} 件`);
console.log(`  en.json: ${enDeleteTargets.length} 件`);
console.log('');

// ========== 削除実行 ==========

for (const key of jaDeleteTargets) {
  deleteKey(jaJson, key);
}

for (const key of enDeleteTargets) {
  deleteKey(enJson, key);
}

// ========== 書き戻し ==========

fs.writeFileSync(jaPath, JSON.stringify(jaJson, null, 2) + '\n', 'utf-8');
fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2) + '\n', 'utf-8');

// ========== 構文確認 ==========

try {
  JSON.parse(fs.readFileSync(jaPath, 'utf-8'));
  console.log('ja.json: 構文OK');
} catch (e) {
  console.error('ja.json: 構文エラー', e.message);
  process.exit(1);
}

try {
  JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  console.log('en.json: 構文OK');
} catch (e) {
  console.error('en.json: 構文エラー', e.message);
  process.exit(1);
}

// ========== 削除後キー数を確認 ==========

const jaAfter = flattenKeys(JSON.parse(fs.readFileSync(jaPath, 'utf-8'))).length;
const enAfter = flattenKeys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))).length;

console.log('');
console.log(`ja.json キー数: ${jaKeys.size} → ${jaAfter} (削除: ${jaKeys.size - jaAfter} 件)`);
console.log(`en.json キー数: ${enKeys.size} → ${enAfter} (削除: ${enKeys.size - enAfter} 件)`);
console.log('');
console.log('削除完了。check-i18n-keys.js で確認してください。');
