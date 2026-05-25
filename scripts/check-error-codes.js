#!/usr/bin/env node
/**
 * エラーコード相互チェックスクリプト
 *
 * 【チェック内容】
 *   1. バックエンド定義コード vs フロントエンド定義コード（定数）の差分
 *   2. バックエンド定義コード vs フロントエンド ERROR_CODE_TO_KEY マッピングの差分
 *   3. ERROR_CODE_TO_KEY の翻訳キー vs ja.json の差分
 *   4. ERROR_CODE_TO_KEY の翻訳キー vs en.json の差分
 *   5. ja.json の errors.* キー vs en.json の errors.* キーの差分
 *   6. ja.json に定義されているが ERROR_CODE_TO_KEY に未登録のエントリ
 *   7. en.json に定義されているが ERROR_CODE_TO_KEY に未登録のエントリ
 *   8. バックエンドソース内での旧コード（LEGACY_CODE_MAP のキー）使用箇所
 *   9. フロントエンドソース内での旧コード（LEGACY_CODE_MAP のキー）使用箇所
 *  10. バックエンドソースで使われているエラーコード文字列が
 *      定義ファイル（Exxxx 定数 or LEGACY_CODE_MAP）に存在するかチェック
 *
 * 【出力先】
 *   - コンソール出力（サマリ）
 *   - scripts/error-codes-check-report.txt（詳細レポート）
 *
 * 【対象ファイル】
 *   - backend/src/enums/errorCodes.ts
 *   - frontend/src/utils/errorUtils.ts
 *   - frontend/src/locales/ja.json
 *   - frontend/src/locales/en.json
 *   - backend/src/**\/*.ts  （チェック 8・10 対象）
 *   - frontend/src/**\/*.ts, **\/*.tsx （チェック 9 対象）
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ========== 設定 ==========

const ROOT = path.resolve(__dirname, '..');

const BACKEND_ERROR_CODES_PATH  = path.join(ROOT, 'backend/src/enums/errorCodes.ts');
const FRONTEND_ERROR_UTILS_PATH = path.join(ROOT, 'frontend/src/utils/errorUtils.ts');
const JA_JSON_PATH              = path.join(ROOT, 'frontend/src/locales/ja.json');
const EN_JSON_PATH              = path.join(ROOT, 'frontend/src/locales/en.json');
const REPORT_PATH               = path.join(__dirname, 'error-codes-check-report.txt');

/** チェック 8/9 でスキャンするディレクトリ */
const BACKEND_SRC_DIR  = path.join(ROOT, 'backend/src');
const FRONTEND_SRC_DIR = path.join(ROOT, 'frontend/src');

/**
 * チェック 8/9 の対象から除外するファイル
 * (errorCodes.ts 自体は LEGACY_CODE_MAP の定義場所なので除外)
 */
const EXCLUDE_FILES_FOR_LEGACY_CHECK = new Set([
  path.resolve(BACKEND_ERROR_CODES_PATH),
  path.resolve(FRONTEND_ERROR_UTILS_PATH),
]);

// ========== ユーティリティ ==========

/** 現在日時を "YYYY/MM/DD HH:MM:SS" 形式で返す */
function now() {
  return new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

/** JSONオブジェクトをドット区切りのフラットキー一覧に変換 */
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys = keys.concat(flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * TypeScript ソースから `export const Exxxx = 'Exxxx';` 形式のエラーコードを抽出する
 */
function extractExportedErrorCodes(src) {
  const codes = new Set();
  const re = /export\s+const\s+(E[0-9]{4})\s*=\s*'E[0-9]{4}'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    codes.add(m[1]);
  }
  return codes;
}

/**
 * TypeScript ソースから ERROR_CODE_TO_KEY オブジェクトのキー一覧を抽出する
 */
function extractErrorCodeToKeyEntries(src) {
  const entries = new Map(); // code -> translationKey
  const blockMatch = src.match(/export\s+const\s+ERROR_CODE_TO_KEY[^=]*=\s*\{([\s\S]*?)\}\s*as\s+const/);
  if (!blockMatch) {
    console.error('ERROR: ERROR_CODE_TO_KEY ブロックが見つかりません');
    return entries;
  }
  const block = blockMatch[1];
  const lineRe = /^\s*([A-Za-z0-9_]+)\s*:\s*'([^']+)'/gm;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    entries.set(m[1], m[2]);
  }
  return entries;
}

/**
 * バックエンド errorCodes.ts から LEGACY_CODE_MAP のキー（旧コード）を抽出する
 * @returns Set<string>
 */
function extractLegacyCodes(src) {
  const codes = new Set();
  // LEGACY_CODE_MAP: Record<string, ErrorCode> = { ... } の中身を抽出
  const blockMatch = src.match(/LEGACY_CODE_MAP[^=]*=\s*\{([\s\S]*?)\};/);
  if (!blockMatch) return codes;
  const block = blockMatch[1];
  // キー: 値, のパターン（キーはクォートなし or クォートあり）
  const lineRe = /^\s*([A-Za-z0-9_]+)\s*:/gm;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    codes.add(m[1]);
  }
  return codes;
}

/**
 * ディレクトリを再帰的に走査して指定拡張子のファイル一覧を返す
 */
function walkFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // node_modules や .next などは除外
      if (['node_modules', '.next', 'dist', 'build', '__pycache__'].includes(entry.name)) continue;
      results.push(...walkFiles(fullPath, exts));
    } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * ソースファイル群から旧コードの使用箇所を検出する
 *
 * @param files        - スキャン対象ファイルの絶対パス一覧
 * @param legacyCodes  - 検出対象の旧コード Set<string>
 * @param excludeFiles - 除外するファイルの絶対パス Set<string>
 * @returns Array<{ file, line, lineNo, code }>
 */
function findLegacyCodeUsages(files, legacyCodes, excludeFiles) {
  const usages = [];

  // 旧コード名を正規表現にまとめる
  // 前後が識別子文字でない位置にマッチさせる（単語境界）
  const legacyArray = [...legacyCodes].sort((a, b) => b.length - a.length); // 長い順にマッチ
  const pattern = new RegExp(
    `(?<![A-Za-z0-9_])(${legacyArray.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z0-9_])`,
    'g'
  );

  for (const filePath of files) {
    const absPath = path.resolve(filePath);
    if (excludeFiles.has(absPath)) continue;

    let src;
    try {
      src = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // コメント行はスキップ（// または * で始まる行）
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

      pattern.lastIndex = 0;
      let m;
      const found = new Set();
      while ((m = pattern.exec(line)) !== null) {
        found.add(m[1]);
      }
      for (const code of found) {
        usages.push({
          file: path.relative(ROOT, filePath),
          lineNo: i + 1,
          line: line.trim(),
          code,
        });
      }
    }
  }
  return usages;
}

/**
 * バックエンドのソースファイルで、エラーレスポンスとして返しているコード文字列を抽出し、
 * それが定義ファイル（Exxxx 定数 or LEGACY_CODE_MAP のキー/値）に存在するか検証する
 *
 * 検出パターン:
 *   code: 'XXXX'
 *   code: "XXXX"
 *   errorCode: 'XXXX'
 *   errorCode: "XXXX"
 *
 * @returns Array<{ file, lineNo, line, usedCode, isKnown, suggestedNewCode }>
 */
function findUnknownErrorCodes(files, backendCodes, legacyCodes, legacyMap, excludeFiles) {
  const issues = [];

  // code: 'XXX' または errorCode: 'XXX' パターン
  const codePattern = /(?:^|[,{;\s])(?:error\.)?code\s*[=:]\s*['"]([A-Za-z0-9_]+)['"]/g;

  for (const filePath of files) {
    const absPath = path.resolve(filePath);
    if (excludeFiles.has(absPath)) continue;

    let src;
    try {
      src = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();
      // コメント行スキップ
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

      codePattern.lastIndex = 0;
      let m;
      while ((m = codePattern.exec(line)) !== null) {
        const usedCode = m[1];

        // Exxxx 形式 → 定義ファイルに存在するか
        if (/^E[0-9]{4}$/.test(usedCode)) {
          if (!backendCodes.has(usedCode)) {
            issues.push({
              file: path.relative(ROOT, filePath),
              lineNo: i + 1,
              line: line.trim(),
              usedCode,
              isKnown: false,
              kind: 'UNDEFINED_E_CODE',
              suggestedNewCode: null,
            });
          }
          // 既知の Exxxx は問題なし
          continue;
        }

        // 旧コード（LEGACY_CODE_MAP のキー）の場合は「旧コード使用」として記録
        if (legacyCodes.has(usedCode)) {
          const newCode = legacyMap[usedCode];
          issues.push({
            file: path.relative(ROOT, filePath),
            lineNo: i + 1,
            line: line.trim(),
            usedCode,
            isKnown: true, // LEGACY_CODE_MAP には存在する
            kind: 'LEGACY_CODE',
            suggestedNewCode: newCode ?? null,
          });
          continue;
        }

        // 一般的な文字列（アドホックコード）—定義なしのコード
        // ただし HTTP メソッド名・SQL キーワード等の誤検出が多いため、
        // ALL_CAPS_WITH_UNDERSCORE 形式のみ対象とする
        if (/^[A-Z][A-Z0-9_]{2,}$/.test(usedCode)) {
          issues.push({
            file: path.relative(ROOT, filePath),
            lineNo: i + 1,
            line: line.trim(),
            usedCode,
            isKnown: false,
            kind: 'UNLISTED_CODE',
            suggestedNewCode: null,
          });
        }
      }
    }
  }
  return issues;
}

// ========== ファイル読み込み ==========

console.log('ファイルを読み込み中...');

const backendSrc  = fs.readFileSync(BACKEND_ERROR_CODES_PATH,  'utf-8');
const frontendSrc = fs.readFileSync(FRONTEND_ERROR_UTILS_PATH, 'utf-8');
const jaJson      = JSON.parse(fs.readFileSync(JA_JSON_PATH,   'utf-8'));
const enJson      = JSON.parse(fs.readFileSync(EN_JSON_PATH,   'utf-8'));

// ========== データ抽出 ==========

const backendCodes   = extractExportedErrorCodes(backendSrc);
const frontendCodes  = extractExportedErrorCodes(frontendSrc);
const errorCodeToKey = extractErrorCodeToKeyEntries(frontendSrc);
const legacyCodes    = extractLegacyCodes(backendSrc);   // LEGACY_CODE_MAP のキー

/** LEGACY_CODE_MAP のキー → 新コード の辞書 */
const legacyMap = {};
{
  const blockMatch = backendSrc.match(/LEGACY_CODE_MAP[^=]*=\s*\{([\s\S]*?)\};/);
  if (blockMatch) {
    const block = blockMatch[1];
    // KEY: E1003,  のようなパターン
    const lineRe = /^\s*([A-Za-z0-9_]+)\s*:\s*(E[0-9]{4})/gm;
    let m;
    while ((m = lineRe.exec(block)) !== null) {
      legacyMap[m[1]] = m[2];
    }
  }
}

const mappedECodes = new Set(
  [...errorCodeToKey.keys()].filter(k => /^E[0-9]{4}$/.test(k))
);
const mappedTranslationKeys = new Set(errorCodeToKey.values());

const jaKeys = new Set(flattenKeys(jaJson));
const enKeys = new Set(flattenKeys(enJson));

const jaErrorKeys = new Set([...jaKeys].filter(k => k.startsWith('errors.')));
const enErrorKeys = new Set([...enKeys].filter(k => k.startsWith('errors.')));

// ========== ソースファイル走査 ==========

console.log('ソースファイルをスキャン中...');

const backendTsFiles  = walkFiles(BACKEND_SRC_DIR,  ['.ts']);
const frontendTsFiles = walkFiles(FRONTEND_SRC_DIR, ['.ts', '.tsx']);

/** チェック 8: バックエンドでの旧コード使用箇所 */
const backendLegacyUsages = findLegacyCodeUsages(
  backendTsFiles, legacyCodes, EXCLUDE_FILES_FOR_LEGACY_CHECK
);

/** チェック 9: フロントエンドでの旧コード使用箇所 */
const frontendLegacyUsages = findLegacyCodeUsages(
  frontendTsFiles, legacyCodes, EXCLUDE_FILES_FOR_LEGACY_CHECK
);

/**
 * チェック 10: バックエンドソースで使われているエラーコード文字列が
 * 定義ファイルに存在するかチェック
 * LEGACY_CODE 種別は チェック 8 と重複するため別カテゴリとして扱う
 */
const backendCodeUsageIssues = findUnknownErrorCodes(
  backendTsFiles, backendCodes, legacyCodes, legacyMap, EXCLUDE_FILES_FOR_LEGACY_CHECK
);

// チェック 10 の内訳
const check10Legacy    = backendCodeUsageIssues.filter(i => i.kind === 'LEGACY_CODE');
const check10Undefined = backendCodeUsageIssues.filter(i => i.kind === 'UNDEFINED_E_CODE');
const check10Unlisted  = backendCodeUsageIssues.filter(i => i.kind === 'UNLISTED_CODE');

// ========== チェック 1〜7 ==========

const backendOnlyConst  = [...backendCodes ].filter(c => !frontendCodes.has(c)).sort();
const frontendOnlyConst = [...frontendCodes].filter(c => !backendCodes.has(c)).sort();

const backendNotInMapping  = [...backendCodes ].filter(c => !mappedECodes.has(c)).sort();
const mappingNotInBackend  = [...mappedECodes ].filter(c => !backendCodes.has(c)).sort();

const keyMissingInJa = [...mappedTranslationKeys].filter(k => !jaKeys.has(k)).sort();
const keyMissingInEn = [...mappedTranslationKeys].filter(k => !enKeys.has(k)).sort();

const jaErrorOnlyKeys = [...jaErrorKeys].filter(k => !enErrorKeys.has(k)).sort();
const enErrorOnlyKeys = [...enErrorKeys].filter(k => !jaErrorKeys.has(k)).sort();

const jaECodeKeys         = [...jaErrorKeys].filter(k => /^errors\.E[0-9]{4}$/.test(k));
const jaECodeNotInMapping = jaECodeKeys
  .filter(k => !errorCodeToKey.has(k.replace('errors.', ''))).sort();

const enECodeKeys         = [...enErrorKeys].filter(k => /^errors\.E[0-9]{4}$/.test(k));
const enECodeNotInMapping = enECodeKeys
  .filter(k => !errorCodeToKey.has(k.replace('errors.', ''))).sort();

// ========== レポート生成 ==========

const SEP  = '='.repeat(70);
const SEP2 = '-'.repeat(70);
const reportLines = [];
const push = (str = '') => reportLines.push(str);

const totalIssues =
  backendOnlyConst.length +
  frontendOnlyConst.length +
  backendNotInMapping.length +
  mappingNotInBackend.length +
  keyMissingInJa.length +
  keyMissingInEn.length +
  jaErrorOnlyKeys.length +
  enErrorOnlyKeys.length +
  jaECodeNotInMapping.length +
  enECodeNotInMapping.length +
  backendLegacyUsages.length +
  frontendLegacyUsages.length +
  check10Undefined.length +
  check10Unlisted.length;
  // check10Legacy は チェック 8 と重複するためカウントしない

// ヘッダー
push(SEP);
push('エラーコード 相互チェック結果');
push(SEP);
push(`実行日時: ${now()}`);
push('');
push('【対象ファイル】');
push(`  バックエンド定義:   backend/src/enums/errorCodes.ts`);
push(`  フロントエンド定義: frontend/src/utils/errorUtils.ts`);
push(`  日本語翻訳:         frontend/src/locales/ja.json`);
push(`  英語翻訳:           frontend/src/locales/en.json`);
push(`  バックエンドスキャン: backend/src/**/*.ts  (${backendTsFiles.length} ファイル)`);
push(`  フロントエンドスキャン: frontend/src/**/*.ts,tsx  (${frontendTsFiles.length} ファイル)`);
push('');
push('【統計情報】');
push(`  バックエンド定義コード数:        ${backendCodes.size} 件`);
push(`  フロントエンド定義コード数:      ${frontendCodes.size} 件`);
push(`  LEGACY_CODE_MAP キー数:         ${legacyCodes.size} 件`);
push(`  ERROR_CODE_TO_KEY エントリ数:   ${errorCodeToKey.size} 件`);
push(`    うち Exxxx 形式:              ${mappedECodes.size} 件`);
push(`    うちレガシー/内部コード:       ${errorCodeToKey.size - mappedECodes.size} 件`);
push(`  ja.json errors.* キー数:        ${jaErrorKeys.size} 件`);
push(`  en.json errors.* キー数:        ${enErrorKeys.size} 件`);
push('');
push(`  ⚠️  検出された問題の合計: ${totalIssues} 件`);
push('');

// --- 【1】---
push(SEP);
push(`【1】バックエンド定義コード vs フロントエンド定数定義 の差分`);
push(`    （backend/src/enums/errorCodes.ts ↔ frontend/src/utils/errorUtils.ts）`);
push(SEP2);
push(`  バックエンドのみに存在（フロントエンド定数が未定義）: ${backendOnlyConst.length} 件`);
if (backendOnlyConst.length === 0) push('    （なし）');
else backendOnlyConst.forEach(c => push(`    BACKEND_ONLY: ${c}`));
push('');
push(`  フロントエンドのみに存在（バックエンドに未定義）: ${frontendOnlyConst.length} 件`);
if (frontendOnlyConst.length === 0) push('    （なし）');
else frontendOnlyConst.forEach(c => push(`    FRONTEND_ONLY: ${c}`));
push('');

// --- 【2】---
push(SEP);
push(`【2】バックエンド定義コード vs ERROR_CODE_TO_KEY マッピング の差分`);
push(SEP2);
push(`  バックエンドに定義されているが ERROR_CODE_TO_KEY に未登録: ${backendNotInMapping.length} 件`);
if (backendNotInMapping.length === 0) push('    （なし）');
else backendNotInMapping.forEach(c => push(`    MISSING_IN_MAPPING: ${c}`));
push('');
push(`  ERROR_CODE_TO_KEY にあるがバックエンドに未定義の Exxxx コード: ${mappingNotInBackend.length} 件`);
if (mappingNotInBackend.length === 0) push('    （なし）');
else mappingNotInBackend.forEach(c => push(`    EXTRA_IN_MAPPING: ${c}`));
push('');

// --- 【3】---
push(SEP);
push(`【3】ERROR_CODE_TO_KEY の翻訳キー vs ja.json の差分`);
push(SEP2);
push(`  ERROR_CODE_TO_KEY に登録されているが ja.json に未定義の翻訳キー: ${keyMissingInJa.length} 件`);
if (keyMissingInJa.length === 0) push('    （なし）');
else keyMissingInJa.forEach(k => {
  const codes = [...errorCodeToKey.entries()].filter(([, v]) => v === k).map(([c]) => c).join(', ');
  push(`    MISSING_IN_JA: ${k}  (参照元コード: ${codes})`);
});
push('');

// --- 【4】---
push(SEP);
push(`【4】ERROR_CODE_TO_KEY の翻訳キー vs en.json の差分`);
push(SEP2);
push(`  ERROR_CODE_TO_KEY に登録されているが en.json に未定義の翻訳キー: ${keyMissingInEn.length} 件`);
if (keyMissingInEn.length === 0) push('    （なし）');
else keyMissingInEn.forEach(k => {
  const codes = [...errorCodeToKey.entries()].filter(([, v]) => v === k).map(([c]) => c).join(', ');
  push(`    MISSING_IN_EN: ${k}  (参照元コード: ${codes})`);
});
push('');

// --- 【5】---
push(SEP);
push(`【5】ja.json の errors.* キー vs en.json の errors.* キー の差分`);
push(SEP2);
push(`  ja.json にあるが en.json に未定義: ${jaErrorOnlyKeys.length} 件`);
if (jaErrorOnlyKeys.length === 0) push('    （なし）');
else jaErrorOnlyKeys.forEach(k => push(`    JA_ONLY: ${k}`));
push('');
push(`  en.json にあるが ja.json に未定義: ${enErrorOnlyKeys.length} 件`);
if (enErrorOnlyKeys.length === 0) push('    （なし）');
else enErrorOnlyKeys.forEach(k => push(`    EN_ONLY: ${k}`));
push('');

// --- 【6】---
push(SEP);
push(`【6】ja.json の errors.Exxxx キーが ERROR_CODE_TO_KEY に未登録`);
push(SEP2);
push(`  件数: ${jaECodeNotInMapping.length} 件`);
if (jaECodeNotInMapping.length === 0) push('    （なし）');
else jaECodeNotInMapping.forEach(k => push(`    IN_JA_NOT_IN_MAPPING: ${k}`));
push('');

// --- 【7】---
push(SEP);
push(`【7】en.json の errors.Exxxx キーが ERROR_CODE_TO_KEY に未登録`);
push(SEP2);
push(`  件数: ${enECodeNotInMapping.length} 件`);
if (enECodeNotInMapping.length === 0) push('    （なし）');
else enECodeNotInMapping.forEach(k => push(`    IN_EN_NOT_IN_MAPPING: ${k}`));
push('');

// --- 【8】バックエンドでの旧コード使用 ---
push(SEP);
push(`【8】バックエンドソース内での旧コード（LEGACY_CODE_MAP キー）使用箇所`);
push(`    ※ 新コード（Exxxx 形式）に置き換えを推奨`);
push(SEP2);
push(`  検出件数: ${backendLegacyUsages.length} 件`);
push('');
if (backendLegacyUsages.length === 0) {
  push('    （なし）');
} else {
  // ファイル別にグループ化
  const byFile8 = {};
  for (const u of backendLegacyUsages) {
    if (!byFile8[u.file]) byFile8[u.file] = [];
    byFile8[u.file].push(u);
  }
  for (const [file, usages] of Object.entries(byFile8)) {
    push(`  📄 ${file}`);
    for (const u of usages) {
      const newCode = legacyMap[u.code] ?? '(対応する新コードなし)';
      push(`    L${String(u.lineNo).padStart(4)}: [旧] ${u.code} → [新] ${newCode}`);
      push(`           ${u.line.substring(0, 100)}`);
    }
    push('');
  }
}

// --- 【9】フロントエンドでの旧コード使用 ---
push(SEP);
push(`【9】フロントエンドソース内での旧コード（LEGACY_CODE_MAP キー）使用箇所`);
push(`    ※ 新コード（Exxxx 形式）に置き換えを推奨`);
push(SEP2);
push(`  検出件数: ${frontendLegacyUsages.length} 件`);
push('');
if (frontendLegacyUsages.length === 0) {
  push('    （なし）');
} else {
  const byFile9 = {};
  for (const u of frontendLegacyUsages) {
    if (!byFile9[u.file]) byFile9[u.file] = [];
    byFile9[u.file].push(u);
  }
  for (const [file, usages] of Object.entries(byFile9)) {
    push(`  📄 ${file}`);
    for (const u of usages) {
      const newCode = legacyMap[u.code] ?? '(対応する新コードなし)';
      push(`    L${String(u.lineNo).padStart(4)}: [旧] ${u.code} → [新] ${newCode}`);
      push(`           ${u.line.substring(0, 100)}`);
    }
    push('');
  }
}

// --- 【10】バックエンドで使われているコードが定義に存在するか ---
push(SEP);
push(`【10】バックエンドソースで使われているエラーコード文字列の未定義チェック`);
push(`     （code: 'XXXX' / errorCode: 'XXXX' パターンをスキャン）`);
push(SEP2);

push(`  10a) 未定義の Exxxx コード（errorCodes.ts に定義なし）: ${check10Undefined.length} 件`);
if (check10Undefined.length === 0) push('    （なし）');
else {
  for (const i of check10Undefined) {
    push(`    📄 ${i.file}:${i.lineNo}`);
    push(`       [未定義 Eコード] ${i.usedCode}`);
    push(`       ${i.line.substring(0, 100)}`);
  }
}
push('');

push(`  10b) LEGACY_CODE_MAP にも存在しないアドホックコード: ${check10Unlisted.length} 件`);
push(`       ※ LEGACY_CODE_MAP への追加 or 新 Exxxx コードへの置換を検討`);
if (check10Unlisted.length === 0) push('    （なし）');
else {
  // ファイル別にグループ化
  const byFile10b = {};
  for (const i of check10Unlisted) {
    if (!byFile10b[i.file]) byFile10b[i.file] = [];
    byFile10b[i.file].push(i);
  }
  for (const [file, issues] of Object.entries(byFile10b)) {
    push(`    📄 ${file}`);
    for (const i of issues) {
      push(`      L${String(i.lineNo).padStart(4)}: [未列挙コード] ${i.usedCode}`);
      push(`             ${i.line.substring(0, 100)}`);
    }
    push('');
  }
}
push('');

push(`  10c) 旧コード使用（LEGACY_CODE_MAP キーをレスポンスで直接使用）: ${check10Legacy.length} 件`);
push(`       ※ チェック【8】の詳細と重複します`);
if (check10Legacy.length === 0) push('    （なし）');
else {
  for (const i of check10Legacy) {
    push(`    📄 ${i.file}:${i.lineNo}  [旧] ${i.usedCode} → [新] ${i.suggestedNewCode ?? '?'}`);
    push(`       ${i.line.substring(0, 100)}`);
  }
}
push('');

// 全コード対照表
push(SEP);
push('【参考】全エラーコード対照表');
push(SEP2);
push('  コード    | BE定義 | FE定数 | FEマッピング | ja.json | en.json');
push('  ' + '-'.repeat(63));

const allECodes = new Set([
  ...backendCodes, ...frontendCodes, ...mappedECodes,
  ...[...jaErrorKeys].filter(k => /^errors\.E[0-9]{4}$/.test(k)).map(k => k.replace('errors.', '')),
  ...[...enErrorKeys].filter(k => /^errors\.E[0-9]{4}$/.test(k)).map(k => k.replace('errors.', '')),
]);
const sortedAllCodes = [...allECodes].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

for (const code of sortedAllCodes) {
  const inBE  = backendCodes.has(code)          ? '✓' : '✗';
  const inFE  = frontendCodes.has(code)         ? '✓' : '✗';
  const inMap = mappedECodes.has(code)          ? '✓' : '✗';
  const inJa  = jaKeys.has(`errors.${code}`)   ? '✓' : '✗';
  const inEn  = enKeys.has(`errors.${code}`)   ? '✓' : '✗';
  const tranKey = errorCodeToKey.get(code) ?? '(未登録)';
  const allOk = inBE === '✓' && inFE === '✓' && inMap === '✓' && inJa === '✓' && inEn === '✓';
  const mark = allOk ? '  ' : '⚠️';
  push(`${mark}  ${code.padEnd(8)} | ${inBE.padEnd(6)} | ${inFE.padEnd(6)} | ${inMap.padEnd(12)} | ${inJa.padEnd(7)} | ${inEn}  → ${tranKey}`);
}
push('');

// LEGACY_CODE_MAP 一覧
push(SEP);
push('【参考】LEGACY_CODE_MAP（旧コード → 新コード 対応表）');
push(SEP2);
push(`  旧コード                        → 新コード`);
push('  ' + '-'.repeat(50));
for (const [legacy, newCode] of Object.entries(legacyMap)) {
  push(`  ${legacy.padEnd(32)} → ${newCode}`);
}
push('');

// レガシー/内部コードのマッピング一覧
push(SEP);
push('【参考】ERROR_CODE_TO_KEY 中のレガシー・内部コード一覧（Exxxx 以外）');
push(SEP2);
const legacyEntries = [...errorCodeToKey.entries()].filter(([k]) => !/^E[0-9]{4}$/.test(k));
if (legacyEntries.length === 0) push('  （なし）');
else {
  for (const [code, tranKey] of legacyEntries) {
    const inJa = jaKeys.has(tranKey) ? '✓' : '✗';
    const inEn = enKeys.has(tranKey) ? '✓' : '✗';
    push(`  ${code.padEnd(30)} → ${tranKey}  (ja:${inJa} en:${inEn})`);
  }
}
push('');

push(SEP);
push(`チェック完了  問題合計: ${totalIssues} 件`);
push(SEP);

const report = reportLines.join('\n');

// ========== コンソール出力（サマリ） ==========

console.log('');
console.log(SEP);
console.log('エラーコード 相互チェック結果');
console.log(SEP);
console.log(`実行日時: ${now()}`);
console.log('');
console.log('【統計情報】');
console.log(`  バックエンド定義コード数:          ${backendCodes.size} 件`);
console.log(`  フロントエンド定義コード数:        ${frontendCodes.size} 件`);
console.log(`  LEGACY_CODE_MAP キー数:           ${legacyCodes.size} 件`);
console.log(`  ERROR_CODE_TO_KEY エントリ数:     ${errorCodeToKey.size} 件`);
console.log(`  ja.json errors.* キー数:          ${jaErrorKeys.size} 件`);
console.log(`  en.json errors.* キー数:          ${enErrorKeys.size} 件`);
console.log(`  スキャン対象 BE ファイル数:         ${backendTsFiles.length} 件`);
console.log(`  スキャン対象 FE ファイル数:         ${frontendTsFiles.length} 件`);
console.log('');
console.log('【チェック結果サマリ】');
console.log(`  【1】BE定義のみ（FE定数が未定義）:                     ${backendOnlyConst.length} 件`);
console.log(`  【1】FE定数のみ（BE定義が未定義）:                     ${frontendOnlyConst.length} 件`);
console.log(`  【2】BE定義でマッピング未登録:                         ${backendNotInMapping.length} 件`);
console.log(`  【2】マッピング過剰（BEに未定義のExxxx）:              ${mappingNotInBackend.length} 件`);
console.log(`  【3】マッピングの翻訳キーが ja.json に未定義:          ${keyMissingInJa.length} 件`);
console.log(`  【4】マッピングの翻訳キーが en.json に未定義:          ${keyMissingInEn.length} 件`);
console.log(`  【5】ja.json にあって en.json に未定義:                ${jaErrorOnlyKeys.length} 件`);
console.log(`  【5】en.json にあって ja.json に未定義:                ${enErrorOnlyKeys.length} 件`);
console.log(`  【6】ja.json の Exxxx キーがマッピング未登録:          ${jaECodeNotInMapping.length} 件`);
console.log(`  【7】en.json の Exxxx キーがマッピング未登録:          ${enECodeNotInMapping.length} 件`);
console.log(`  【8】BE ソース内 旧コード使用:                         ${backendLegacyUsages.length} 件`);
console.log(`  【9】FE ソース内 旧コード使用:                         ${frontendLegacyUsages.length} 件`);
console.log(`  【10a】BE ソース内 未定義 Exxxx コード:                ${check10Undefined.length} 件`);
console.log(`  【10b】BE ソース内 アドホック未列挙コード:             ${check10Unlisted.length} 件`);
console.log('');

if (totalIssues === 0) {
  console.log('  ✅ 問題なし。すべてのエラーコードが整合しています。');
} else {
  console.log(`  ⚠️  合計 ${totalIssues} 件の問題が検出されました。詳細はレポートを確認してください。`);

  // 問題がある場合は簡易サマリを表示
  if (backendLegacyUsages.length > 0) {
    console.log('');
    console.log(`  【8】旧コード使用箇所 (BE) :`);
    const byFile = {};
    for (const u of backendLegacyUsages) {
      if (!byFile[u.file]) byFile[u.file] = [];
      byFile[u.file].push(u);
    }
    for (const [file, usages] of Object.entries(byFile)) {
      const codes = [...new Set(usages.map(u => u.code))].join(', ');
      console.log(`    ${file}  (${codes})`);
    }
  }

  if (frontendLegacyUsages.length > 0) {
    console.log('');
    console.log(`  【9】旧コード使用箇所 (FE) :`);
    const byFile = {};
    for (const u of frontendLegacyUsages) {
      if (!byFile[u.file]) byFile[u.file] = [];
      byFile[u.file].push(u);
    }
    for (const [file, usages] of Object.entries(byFile)) {
      const codes = [...new Set(usages.map(u => u.code))].join(', ');
      console.log(`    ${file}  (${codes})`);
    }
  }

  if (check10Unlisted.length > 0) {
    console.log('');
    console.log(`  【10b】アドホック未列挙コード (BE) :`);
    const byFile = {};
    for (const i of check10Unlisted) {
      if (!byFile[i.file]) byFile[i.file] = [];
      byFile[i.file].push(i);
    }
    for (const [file, issues] of Object.entries(byFile)) {
      const codes = [...new Set(issues.map(i => i.usedCode))].join(', ');
      console.log(`    ${file}  (${codes})`);
    }
  }
}
console.log('');

// ========== ファイル出力 ==========

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`詳細レポートを出力しました: ${REPORT_PATH}`);
console.log(SEP);
