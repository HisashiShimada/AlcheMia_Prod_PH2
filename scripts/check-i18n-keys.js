#!/usr/bin/env node
/**
 * i18nキー整合性 & ハードコードメッセージ チェックスクリプト
 *
 * 【チェック内容】
 *   1. コンポーネントで使用されている t('xxx') のキーが ja.json / en.json に存在するか
 *   2. message.xxx() に文字列リテラルが直接渡されていないか（i18n化推奨）
 *
 * 【出力先】
 *   - コンソール出力（サマリ）
 *   - scripts/i18n-check-report.txt（詳細レポート）
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

/** 現在日時を "YYYY-MM-DD HH:MM:SS" 形式で返す */
function now() {
  return new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
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

// ========== message ハードコード検出 ==========

/**
 * frontend/src 配下の全 .tsx / .ts ファイルを走査し、
 * message.xxx(文字列リテラル) のハードコードを検出する
 *
 * 除外パターン（正しい形式）:
 *   - t( を含む行（i18nキー使用）
 *   - extractErrorMessage を含む行
 *   - mapErrorToMessage を含む行
 *   - extractErrorCode を含む行
 */

/** frontend/src 配下のファイル一覧を再帰取得 */
function collectSourceFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ハードコード検出結果: { filePath, lineNo, lineContent }[]
const hardcodeFindings = [];

// 検出パターン1:
//   message.(error|success|warning|info|loading)(  で始まり、
//   その後に シングルクォート / ダブルクォート / テンプレートリテラル が続く
const messageHardcodeRe = /message\s*\.\s*(error|success|warning|info|loading)\s*\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)/;

// 検出パターン2:
//   message.(error|success|warning|info|loading)( に続く第1引数が t() でない変数で、
//   かつ || を含む（例: response.message || t('...')）
const messageVarFallbackRe = /message\s*\.\s*(error|success|warning|info|loading)\s*\(\s*(?!t\()[a-zA-Z_$][a-zA-Z0-9_$.]*\s*\|\|/;

// 除外キーワード（これを含む行は正しい形式とみなして除外）
const excludeKeywords = [
  "t('",
  't("',
  'extractErrorMessage',
  'mapErrorToMessage',
  'extractErrorCode',
];

const sourceFiles = collectSourceFiles(srcDir);

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // コメント行はスキップ
    if (/^\s*(\/\/|\/\*)/.test(line)) continue;

    // パターン1: message.xxx('固定文字列') の直接ハードコード
    if (messageHardcodeRe.test(line)) {
      // 除外キーワードが含まれていればスキップ
      if (!excludeKeywords.some(kw => line.includes(kw))) {
        hardcodeFindings.push({
          filePath: path.relative(path.join(__dirname, '..'), filePath),
          lineNo: i + 1,
          lineContent: line.trim(),
          reason: 'HARDCODE_LITERAL',
        });
        continue;
      }
    }

    // パターン2: message.xxx(variable || ...) — 変数フォールバック（非i18nの可能性）
    if (messageVarFallbackRe.test(line)) {
      // extractErrorMessage / mapErrorToMessage / extractErrorCode を含む行は除外
      const varFallbackExclude = ['extractErrorMessage', 'mapErrorToMessage', 'extractErrorCode'];
      if (!varFallbackExclude.some(kw => line.includes(kw))) {
        hardcodeFindings.push({
          filePath: path.relative(path.join(__dirname, '..'), filePath),
          lineNo: i + 1,
          lineContent: line.trim(),
          reason: 'VAR_FALLBACK',
        });
      }
    }
  }
}

// ファイルパス → 検出一覧 のマップに整理
const hardcodeByFile = new Map();
for (const finding of hardcodeFindings) {
  if (!hardcodeByFile.has(finding.filePath)) {
    hardcodeByFile.set(finding.filePath, []);
  }
  hardcodeByFile.get(finding.filePath).push(finding);
}

// ========== レポート生成 ==========

const SEP = '='.repeat(60);
const lines = [];

const push = (str = '') => lines.push(str);

push(SEP);
push('i18n キー整合性 & ハードコードメッセージ チェック結果');
push(SEP);
push(`実行日時: ${now()}`);
push(`対象: frontend/src/`);
push('');
push(`収集済みコンポーネントキー数: ${usedKeys.size}`);
push(`ja.json 定義キー数: ${jaKeys.size}`);
push(`en.json 定義キー数: ${enKeys.size}`);
push('');

// 【1】
push(SEP);
push(`【1】コンポーネントで使用 & ja.json にも en.json にも未定義: ${missingInBoth.length} 件`);
push(SEP);
if (missingInBoth.length === 0) {
  push('  （なし）');
} else {
  missingInBoth.forEach(k => push('  MISSING_BOTH: ' + k));
}
push('');

// 【2】
push(SEP);
push(`【2】コンポーネントで使用 & ja.json のみ未定義: ${missingInJa.length} 件`);
push(SEP);
if (missingInJa.length === 0) {
  push('  （なし）');
} else {
  missingInJa.forEach(k => push('  MISSING_JA: ' + k));
}
push('');

// 【3】
push(SEP);
push(`【3】コンポーネントで使用 & en.json のみ未定義: ${missingInEn.length} 件`);
push(SEP);
if (missingInEn.length === 0) {
  push('  （なし）');
} else {
  missingInEn.forEach(k => push('  MISSING_EN: ' + k));
}
push('');

// 【4】
push(SEP);
push(`【4】ja.json にあって en.json に未定義: ${inJaNotEn.length} 件`);
push(SEP);
if (inJaNotEn.length === 0) {
  push('  （なし）');
} else {
  inJaNotEn.forEach(k => push('  JA_ONLY: ' + k));
}
push('');

// 【5】
push(SEP);
push(`【5】en.json にあって ja.json に未定義: ${inEnNotJa.length} 件`);
push(SEP);
if (inEnNotJa.length === 0) {
  push('  （なし）');
} else {
  inEnNotJa.forEach(k => push('  EN_ONLY: ' + k));
}
push('');

// 【6】
push(SEP);
push(`【6】message部品のハードコード（i18n化推奨）: ${hardcodeFindings.length} 件`);
push(SEP);
push('');
push('  ※ message.error/success/warning/info/loading に文字列リテラルが直接渡されている箇所です。');
push('  ※ t("key") や extractErrorMessage() などを使って i18n化することを推奨します。');
push('');
if (hardcodeFindings.length === 0) {
  push('  （なし）');
} else {
  for (const [filePath, findings] of hardcodeByFile) {
    push(`📁 ${filePath}`);
    for (const f of findings) {
      push(`    行 ${f.lineNo}: ${f.lineContent}`);
    }
    push('');
  }
}

push(SEP);
push('チェック完了');
push(SEP);

const report = lines.join('\n');

// ========== コンソール出力（サマリ） ==========

console.log(SEP);
console.log('i18n キー整合性 & ハードコードメッセージ チェック結果');
console.log(SEP);
console.log(`実行日時: ${now()}`);
console.log(`対象: frontend/src/`);
console.log('');
console.log(`収集済みコンポーネントキー数: ${usedKeys.size}`);
console.log(`ja.json 定義キー数: ${jaKeys.size}`);
console.log(`en.json 定義キー数: ${enKeys.size}`);
console.log('');
console.log(`【1】MISSING_BOTH (ja & en 未定義):   ${missingInBoth.length} 件`);
console.log(`【2】MISSING_JA   (ja のみ未定義):    ${missingInJa.length} 件`);
console.log(`【3】MISSING_EN   (en のみ未定義):    ${missingInEn.length} 件`);
console.log(`【4】JA_ONLY      (ja にあって en 無): ${inJaNotEn.length} 件`);
console.log(`【5】EN_ONLY      (en にあって ja 無): ${inEnNotJa.length} 件`);
console.log(`【6】ハードコード  (message 直書き):   ${hardcodeFindings.length} 件`);
console.log('');

// ========== ファイル出力 ==========

const reportPath = path.join(__dirname, 'i18n-check-report.txt');
fs.writeFileSync(reportPath, report, 'utf-8');

console.log(`詳細レポートを出力しました: ${reportPath}`);
console.log(SEP);
console.log('チェック完了');
console.log(SEP);
