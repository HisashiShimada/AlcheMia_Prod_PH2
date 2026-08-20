const fs = require('fs');
const content = fs.readFileSync('frontend/src/locales/ja.json', 'utf8');

// 1. JSONパースチェック
try {
  JSON.parse(content);
  console.log('JSON parse: OK');
} catch(e) {
  console.log('JSON parse ERROR:', e.message);
}

// 2. 重複キーをJSON.parse前に検出（深いネストも含む）
// カスタムパーサーで重複キーを検出
function findDuplicateKeys(jsonStr) {
  const results = [];
  const stack = [];
  let i = 0;
  
  // 簡易的に行ベースで重複キーを検出
  const lines = jsonStr.split('\n');
  
  // ネスト深さごとのキー管理
  const keyStacks = [{}]; // depth -> {key -> firstLine}
  let depth = 0;
  
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    
    // 深さを計算
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    
    // 文字列内の括弧は無視できないが、簡易チェックとして
    // キー抽出
    const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      if (!keyStacks[depth]) keyStacks[depth] = {};
      if (keyStacks[depth][key] !== undefined) {
        results.push({
          key,
          firstLine: keyStacks[depth][key],
          duplicateLine: lineNo,
          depth
        });
      } else {
        keyStacks[depth][key] = lineNo;
      }
    }
    
    if (opens > closes) {
      depth += (opens - closes);
      if (!keyStacks[depth]) keyStacks[depth] = {};
    } else if (closes > opens) {
      for (let d = depth; d > depth - (closes - opens); d--) {
        keyStacks[d] = {};
      }
      depth -= (closes - opens);
      if (depth < 0) depth = 0;
    }
  });
  
  return results;
}

const dupes = findDuplicateKeys(content);
if (dupes.length > 0) {
  console.log('\n重複キー検出 (' + dupes.length + '件):');
  dupes.forEach(d => {
    console.log('  キー: "' + d.key + '" (depth=' + d.depth + ') 初出行:' + d.firstLine + ' 重複行:' + d.duplicateLine);
  });
} else {
  console.log('重複キー: なし');
}

// 3. 末尾カンマ検出
const lines2 = content.split('\n');
const trailingCommas = [];
lines2.forEach((line, idx) => {
  if (/,\s*$/.test(line) && lines2[idx+1] && /^\s*[}\]]/.test(lines2[idx+1])) {
    trailingCommas.push({ line: idx+1, content: line.trim().substring(0, 80) });
  }
});
if (trailingCommas.length > 0) {
  console.log('\n末尾カンマ問題 (' + trailingCommas.length + '件):');
  trailingCommas.forEach(t => console.log('  line ' + t.line + ': ' + t.content));
} else {
  console.log('末尾カンマ: なし');
}

// 4. 値なし（空エントリ）検出
const emptyValues = [];
lines2.forEach((line, idx) => {
  if (/:\s*,/.test(line) || /:\s*$/.test(line)) {
    emptyValues.push({ line: idx+1, content: line.trim().substring(0, 80) });
  }
});
if (emptyValues.length > 0) {
  console.log('\n値なしエントリ (' + emptyValues.length + '件):');
  emptyValues.forEach(t => console.log('  line ' + t.line + ': ' + t.content));
}
