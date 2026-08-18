#!/usr/bin/env node
/**
 * ロケールJSON(ja.json / en.json)内のトップレベルキー重複チェックスクリプト
 *
 * 【目的】
 *   JSON.parse は同一キーが複数存在する場合、後方のキーで上書きしてしまうため、
 *   ソース上は重複キーとして存在していても JSON.parse 後のオブジェクトには
 *   1つの値しか残らない。これが型不整合(TS2739等)やi18nキー欠落の原因になる。
 *
 * 【チェック内容】
 *   ja.json / en.json それぞれについて、トップレベルの "key": { という
 *   パターンをすべて検出し、同一キーが複数回出現していないかを確認する。
 *
 * 【出力】
 *   コンソールに重複キーとその出現行番号を表示する。
 */

const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '../frontend/src/locales/ja.json'),
  path.join(__dirname, '../frontend/src/locales/en.json'),
];

const topKeyRegex = /^  "([a-zA-Z0-9_]+)":\s*\{/;

let hasDuplicate = false;

for (const filePath of targets) {
  const relPath = path.relative(path.join(__dirname, '..'), filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  /** @type {Map<string, number[]>} */
  const keyLineMap = new Map();

  lines.forEach((line, idx) => {
    const m = topKeyRegex.exec(line);
    if (m) {
      const key = m[1];
      if (!keyLineMap.has(key)) {
        keyLineMap.set(key, []);
      }
      keyLineMap.get(key).push(idx + 1);
    }
  });

  console.log('='.repeat(60));
  console.log(`対象ファイル: ${relPath}`);
  console.log('='.repeat(60));

  const duplicates = [...keyLineMap.entries()].filter(([, lineNos]) => lineNos.length > 1);

  if (duplicates.length === 0) {
    console.log('  重複キーなし');
  } else {
    hasDuplicate = true;
    duplicates.forEach(([key, lineNos]) => {
      console.log(`  重複キー: "${key}" -> 行 ${lineNos.join(', ')}`);
    });
  }
  console.log('');
}

if (hasDuplicate) {
  console.log('⚠️  重複キーが検出されました。後方の定義で上書きされるため、意図しないキー欠落の原因になります。');
  process.exitCode = 1;
} else {
  console.log('✅ 重複キーは検出されませんでした。');
}
