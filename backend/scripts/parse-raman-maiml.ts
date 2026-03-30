/**
 * Raman.maimlをMaimlParserTypedで解析し結果を出力するスクリプト
 * 
 * 使用方法:
 *   npx ts-node backend/scripts/parse-raman-maiml.ts
 * 
 * 出力ファイル:
 *   test_data/raman_parse_result.txt   - ParseTyped変換結果
 *   test_data/raman_syntax_issues.md   - 構文的問題の分析レポート
 */

import * as fs from 'fs';
import * as path from 'path';
import { MaimlParserTyped } from '../src/utils/maimlParserTyped';

const MAIML_FILE = path.resolve(__dirname, '../../test_data/Raman.maiml');
const OUTPUT_TEXT = path.resolve(__dirname, '../../test_data/raman_parse_result.txt');
const OUTPUT_MD   = path.resolve(__dirname, '../../test_data/raman_syntax_issues.md');

// ============================================================
// メイン処理
// ============================================================
async function main() {
  console.log('=== Raman.maiml ParseTyped 解析開始 ===');
  console.log('入力ファイル:', MAIML_FILE);

  // --- 1. ファイル読込 ---
  const xmlContent = fs.readFileSync(MAIML_FILE, 'utf-8');
  console.log(`ファイルサイズ: ${xmlContent.length} 文字`);

  const issues: string[] = [];
  let parser: MaimlParserTyped | null = null;

  // --- 2. ParseTyped変換（エラー収集付き） ---
  try {
    parser = new MaimlParserTyped(xmlContent);
    console.log('✅ MaimlParserTyped 初期化成功');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    issues.push(`[FATAL] MaimlParserTyped 初期化失敗: ${msg}`);
    console.error('❌ MaimlParserTyped 初期化失敗:', msg);
  }

  // --- 3. テキスト出力（ParseTyped変換結果） ---
  const textLines: string[] = [];

  textLines.push('='.repeat(80));
  textLines.push('MAIML ParseTyped 変換結果');
  textLines.push(`対象ファイル : ${MAIML_FILE}`);
  textLines.push(`変換日時     : ${new Date().toISOString()}`);
  textLines.push('='.repeat(80));
  textLines.push('');

  if (parser) {
    // 3-1. getTypedMaiml()
    try {
      const typed = parser.getTypedMaiml();
      textLines.push('[getTypedMaiml()]');
      textLines.push(JSON.stringify(typed, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getTypedMaiml()] ERROR: ${msg}`);
      issues.push(`[ERROR] getTypedMaiml() 失敗: ${msg}`);
    }

    // 3-2. getFileBasicInfo()
    try {
      const info = parser.getFileBasicInfo();
      textLines.push('[getFileBasicInfo()]');
      textLines.push(JSON.stringify(info, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getFileBasicInfo()] ERROR: ${msg}`);
      issues.push(`[ERROR] getFileBasicInfo() 失敗: ${msg}`);
    }

    // 3-3. getDocument()
    try {
      const doc = parser.getDocument();
      textLines.push('[getDocument()]');
      textLines.push(JSON.stringify(doc, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getDocument()] ERROR: ${msg}`);
      issues.push(`[ERROR] getDocument() 失敗: ${msg}`);
    }

    // 3-4. getProtocol()
    try {
      const protocol = parser.getProtocol();
      textLines.push('[getProtocol()]');
      textLines.push(JSON.stringify(protocol, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getProtocol()] ERROR: ${msg}`);
      issues.push(`[ERROR] getProtocol() 失敗: ${msg}`);
    }

    // 3-5. getMethods()
    try {
      const methods = parser.getMethods();
      textLines.push('[getMethods()]');
      textLines.push(JSON.stringify(methods, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getMethods()] ERROR: ${msg}`);
      issues.push(`[ERROR] getMethods() 失敗: ${msg}`);
    }

    // 3-6. getMethodList()
    try {
      const list = parser.getMethodList();
      textLines.push('[getMethodList()]');
      textLines.push(JSON.stringify(list, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getMethodList()] ERROR: ${msg}`);
      issues.push(`[ERROR] getMethodList() 失敗: ${msg}`);
    }

    // 3-7. getTransitions()
    try {
      const transitions = parser.getTransitions();
      textLines.push('[getTransitions()]');
      textLines.push(JSON.stringify(transitions, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getTransitions()] ERROR: ${msg}`);
      issues.push(`[ERROR] getTransitions() 失敗: ${msg}`);
    }

    // 3-8. getPlaces()
    try {
      const places = parser.getPlaces();
      textLines.push('[getPlaces()]');
      textLines.push(JSON.stringify(places, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getPlaces()] ERROR: ${msg}`);
      issues.push(`[ERROR] getPlaces() 失敗: ${msg}`);
    }

    // 3-9. getArcs()
    try {
      const arcs = parser.getArcs();
      textLines.push('[getArcs()]');
      textLines.push(JSON.stringify(arcs, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getArcs()] ERROR: ${msg}`);
      issues.push(`[ERROR] getArcs() 失敗: ${msg}`);
    }

    // 3-10. getTemplates()
    try {
      const templates = parser.getTemplates();
      textLines.push('[getTemplates()]');
      textLines.push(JSON.stringify(templates, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getTemplates()] ERROR: ${msg}`);
      issues.push(`[ERROR] getTemplates() 失敗: ${msg}`);
    }

    // 3-11. getEventLogs()
    try {
      const events = parser.getEventLogs();
      textLines.push('[getEventLogs()]');
      textLines.push(JSON.stringify(events, null, 2));
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[getEventLogs()] ERROR: ${msg}`);
      issues.push(`[ERROR] getEventLogs() 失敗: ${msg}`);
    }

    // 3-12. validateForExperimentManager()
    try {
      const validation = parser.validateForExperimentManager();
      textLines.push('[validateForExperimentManager()]');
      textLines.push(JSON.stringify(validation, null, 2));
      if (!validation.isValid) {
        validation.errors.forEach(e => issues.push(`[VALIDATION_ERROR] ${e}`));
        validation.warnings.forEach(w => issues.push(`[VALIDATION_WARNING] ${w}`));
      }
      textLines.push('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      textLines.push(`[validateForExperimentManager()] ERROR: ${msg}`);
      issues.push(`[ERROR] validateForExperimentManager() 失敗: ${msg}`);
    }
  } else {
    textLines.push('[ERROR] パーサー初期化に失敗したため、変換結果を取得できませんでした。');
  }

  // テキストファイル書き出し
  fs.writeFileSync(OUTPUT_TEXT, textLines.join('\n'), 'utf-8');
  console.log(`✅ テキスト出力完了: ${OUTPUT_TEXT}`);

  // ============================================================
  // 4. XML構文的問題の独立解析
  // ============================================================
  const xmlIssues = analyzeXmlSyntax(xmlContent);
  issues.push(...xmlIssues);

  // ============================================================
  // 5. Markdownレポート出力
  // ============================================================
  const mdLines: string[] = [];
  mdLines.push('# Raman.maiml 構文解析レポート');
  mdLines.push('');
  mdLines.push(`- **対象ファイル**: \`${MAIML_FILE}\``);
  mdLines.push(`- **解析日時**: ${new Date().toISOString()}`);
  mdLines.push(`- **ファイルサイズ**: ${xmlContent.length.toLocaleString()} 文字`);
  mdLines.push('');

  if (issues.length === 0) {
    mdLines.push('## 結果サマリー');
    mdLines.push('');
    mdLines.push('✅ **構文的問題は検出されませんでした。**');
  } else {
    const fatal    = issues.filter(i => i.startsWith('[FATAL]'));
    const errors   = issues.filter(i => i.startsWith('[ERROR]'));
    const valErrs  = issues.filter(i => i.startsWith('[VALIDATION_ERROR]'));
    const valWarns = issues.filter(i => i.startsWith('[VALIDATION_WARNING]'));
    const xmlErrs  = issues.filter(i => i.startsWith('[XML_'));
    const others   = issues.filter(i =>
      !i.startsWith('[FATAL]') &&
      !i.startsWith('[ERROR]') &&
      !i.startsWith('[VALIDATION_') &&
      !i.startsWith('[XML_')
    );

    mdLines.push('## 結果サマリー');
    mdLines.push('');
    mdLines.push(`| カテゴリ | 件数 |`);
    mdLines.push(`|----------|------|`);
    mdLines.push(`| FATAL（致命的エラー） | ${fatal.length} |`);
    mdLines.push(`| ERROR（パーサーエラー） | ${errors.length} |`);
    mdLines.push(`| VALIDATION_ERROR | ${valErrs.length} |`);
    mdLines.push(`| VALIDATION_WARNING | ${valWarns.length} |`);
    mdLines.push(`| XML構文問題 | ${xmlErrs.length} |`);
    mdLines.push(`| その他 | ${others.length} |`);
    mdLines.push(`| **合計** | **${issues.length}** |`);
    mdLines.push('');

    if (fatal.length > 0) {
      mdLines.push('## 致命的エラー（FATAL）');
      mdLines.push('');
      fatal.forEach(i => {
        mdLines.push(`- ${i.replace('[FATAL] ', '')}`);
      });
      mdLines.push('');
    }

    if (errors.length > 0) {
      mdLines.push('## パーサーエラー（ERROR）');
      mdLines.push('');
      errors.forEach(i => {
        mdLines.push(`- ${i.replace('[ERROR] ', '')}`);
      });
      mdLines.push('');
    }

    if (valErrs.length > 0) {
      mdLines.push('## バリデーションエラー');
      mdLines.push('');
      valErrs.forEach(i => {
        mdLines.push(`- ${i.replace('[VALIDATION_ERROR] ', '')}`);
      });
      mdLines.push('');
    }

    if (valWarns.length > 0) {
      mdLines.push('## バリデーション警告');
      mdLines.push('');
      valWarns.forEach(i => {
        mdLines.push(`- ${i.replace('[VALIDATION_WARNING] ', '')}`);
      });
      mdLines.push('');
    }

    if (xmlErrs.length > 0) {
      mdLines.push('## XML構文的問題');
      mdLines.push('');
      xmlErrs.forEach(i => {
        mdLines.push(`- ${i}`);
      });
      mdLines.push('');
    }

    if (others.length > 0) {
      mdLines.push('## その他の問題');
      mdLines.push('');
      others.forEach(i => {
        mdLines.push(`- ${i}`);
      });
      mdLines.push('');
    }
  }

  // 詳細分析セクション
  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## 詳細構文解析');
  mdLines.push('');
  const details = buildDetailedAnalysis(xmlContent);
  mdLines.push(...details);

  fs.writeFileSync(OUTPUT_MD, mdLines.join('\n'), 'utf-8');
  console.log(`✅ Markdown出力完了: ${OUTPUT_MD}`);

  console.log('');
  console.log(`検出された問題数: ${issues.length}`);
  console.log('=== 完了 ===');
}

// ============================================================
// XML構文的問題の解析
// ============================================================
function analyzeXmlSyntax(xml: string): string[] {
  const issues: string[] = [];

  // --- A. XML宣言 ---
  if (!xml.trimStart().startsWith('<?xml')) {
    issues.push('[XML_WARN] XML宣言 (<?xml ...?>) がありません');
  }

  // --- B. 名前空間宣言の確認 ---
  const requiredNs = [
    { prefix: 'xsi',       uri: 'XMLSchema-instance' },
    { prefix: 'maiml',     uri: 'maiml.org' },
  ];
  for (const ns of requiredNs) {
    if (!xml.includes(ns.uri)) {
      issues.push(`[XML_WARN] 名前空間 "${ns.uri}" の宣言が見当たりません`);
    }
  }

  // --- C. 開始・終了タグの不一致チェック（簡易） ---
  const openTagPattern  = /<([a-zA-Z][a-zA-Z0-9_:.-]*)(\s[^>]*)?((?!\/)>)/g;
  const closeTagPattern = /<\/([a-zA-Z][a-zA-Z0-9_:.-]*)\s*>/g;
  const selfClosePat    = /<([a-zA-Z][a-zA-Z0-9_:.-]*)(\s[^>]*)?\/>/g;

  const openCounts:  Record<string, number> = {};
  const closeCounts: Record<string, number> = {};
  const selfClose:   Set<string> = new Set();

  let m: RegExpExecArray | null;
  const xmlNoComments = xml.replace(/<!--[\s\S]*?-->/g, '');

  while ((m = openTagPattern.exec(xmlNoComments)) !== null) {
    const tag = m[1].split(':').pop()!; // プレフィックス除去
    openCounts[tag] = (openCounts[tag] || 0) + 1;
  }
  while ((m = closeTagPattern.exec(xmlNoComments)) !== null) {
    const tag = m[1].split(':').pop()!;
    closeCounts[tag] = (closeCounts[tag] || 0) + 1;
  }
  while ((m = selfClosePat.exec(xmlNoComments)) !== null) {
    selfClose.add(m[1].split(':').pop()!);
  }

  // selfCloseタグはopen/closeの比較から除外
  for (const tag of selfClose) {
    delete openCounts[tag];
    delete closeCounts[tag];
  }

  // 不一致タグを検出
  const allTags = new Set([...Object.keys(openCounts), ...Object.keys(closeCounts)]);
  for (const tag of allTags) {
    const o = openCounts[tag]  || 0;
    const c = closeCounts[tag] || 0;
    if (o !== c) {
      issues.push(`[XML_ERROR] タグ <${tag}> の開始(${o})と終了(${c})の数が不一致`);
    }
  }

  // --- D. 重複UUID検出 ---
  const uuidPattern = /<uuid>([^<]+)<\/uuid>/g;
  const uuids: string[] = [];
  while ((m = uuidPattern.exec(xml)) !== null) {
    uuids.push(m[1].trim());
  }
  const uuidSet = new Set<string>();
  const dupUuids = new Set<string>();
  for (const u of uuids) {
    if (uuidSet.has(u)) dupUuids.add(u);
    uuidSet.add(u);
  }
  for (const u of dupUuids) {
    const count = uuids.filter(x => x === u).length;
    issues.push(`[XML_ERROR] UUID重複: "${u}" が ${count} 回使用されています`);
  }

  // --- E. 重複id属性検出 ---
  const idAttrPattern = /\bid="([^"]+)"/g;
  const ids: string[] = [];
  while ((m = idAttrPattern.exec(xml)) !== null) {
    ids.push(m[1]);
  }
  const idSet = new Set<string>();
  const dupIds = new Set<string>();
  for (const id of ids) {
    if (idSet.has(id)) dupIds.add(id);
    idSet.add(id);
  }
  for (const id of dupIds) {
    const count = ids.filter(x => x === id).length;
    issues.push(`[XML_ERROR] id属性重複: id="${id}" が ${count} 回使用されています`);
  }

  // --- F. 参照整合性チェック（ref属性 → id属性） ---
  const refPattern = /\bref="([^"]+)"/g;
  const allIds = new Set(ids);
  while ((m = refPattern.exec(xml)) !== null) {
    const refId = m[1];
    if (!allIds.has(refId)) {
      issues.push(`[XML_WARN] ref="${refId}" が参照しているidが見つかりません`);
    }
  }

  // --- G. 空のvalue要素（テンプレート内は除外、dataセクション内のみ） ---
  // dataセクション内の空<value/>または<value></value>を検出
  const dataSection = (() => {
    const start = xml.indexOf('<data ');
    const end   = xml.lastIndexOf('</data>');
    return start !== -1 && end !== -1 ? xml.slice(start, end + 7) : '';
  })();

  if (dataSection) {
    const emptyValuePat = /<value\s*\/>/g;
    const emptyValue2Pat = /<value>\s*<\/value>/g;
    let emptyValueCount = 0;
    while (emptyValuePat.exec(dataSection) !== null) emptyValueCount++;
    while (emptyValue2Pat.exec(dataSection) !== null) emptyValueCount++;
    if (emptyValueCount > 0) {
      issues.push(`[XML_WARN] dataセクション内に空の <value> 要素が ${emptyValueCount} 件あります`);
    }
  }

  // --- H. xsi:type の既知タイプ一覧確認 ---
  const knownTypes = new Set([
    'stringType', 'intType', 'floatType', 'doubleType', 'booleanType',
    'dateTimeType', 'propertyListType', 'contentDoubleListType',
    'contentStringListType', 'idRefType', 'uuidType',
    'unsignedLongType', 'unsignedShortType', 'unsignedIntType',
    'hexBinaryType', 'doubleListType', 'maimlRootType',
  ]);
  const xsiTypePattern = /xsi:type="([^"]+)"/g;
  const unknownTypes = new Set<string>();
  while ((m = xsiTypePattern.exec(xml)) !== null) {
    if (!knownTypes.has(m[1])) {
      unknownTypes.add(m[1]);
    }
  }
  for (const t of unknownTypes) {
    issues.push(`[XML_WARN] 未知のxsi:type: "${t}"`);
  }

  // --- I. insertion要素のuri/hash整合性 ---
  const insertionPattern = /<insertion>([\s\S]*?)<\/insertion>/g;
  let insertionIndex = 0;
  while ((m = insertionPattern.exec(xml)) !== null) {
    insertionIndex++;
    const insertionContent = m[1];
    const hasUri  = /<uri>[^<]*<\/uri>/.test(insertionContent) || /<uri\s*\/>/.test(insertionContent);
    const hasHash = /<hash>[^<]*<\/hash>/.test(insertionContent) || /<hash\s*\/>/.test(insertionContent);
    const uriVal  = insertionContent.match(/<uri>([^<]*)<\/uri>/)?.[1]?.trim() ?? null;
    const hashVal = insertionContent.match(/<hash>([^<]*)<\/hash>/)?.[1]?.trim() ?? null;

    if (!hasUri) {
      issues.push(`[XML_WARN] insertion[${insertionIndex}]: <uri> 要素がありません`);
    } else if (uriVal === '') {
      // 空uriはテンプレートでは許容（プロトコルセクション内）
    }
    if (!hasHash) {
      issues.push(`[XML_WARN] insertion[${insertionIndex}]: <hash> 要素がありません`);
    }
    // uriが有るのにhashが空の場合（dataセクション内の実データとみなす）
    if (uriVal && uriVal !== '' && (hashVal === '' || hashVal === null)) {
      issues.push(`[XML_WARN] insertion[${insertionIndex}]: uri="${uriVal}" にhashが設定されていません`);
    }
  }

  return issues;
}

// ============================================================
// 詳細解析セクション構築
// ============================================================
function buildDetailedAnalysis(xml: string): string[] {
  const lines: string[] = [];

  // 基本統計
  lines.push('### 基本統計');
  lines.push('');

  const count = (pattern: RegExp) => {
    const arr = xml.match(pattern);
    return arr ? arr.length : 0;
  };

  lines.push(`| 要素 | 件数 |`);
  lines.push(`|------|------|`);
  lines.push(`| \`<uuid>\` | ${count(/<uuid>/g)} |`);
  lines.push(`| \`id=\` 属性 | ${count(/\bid="/g)} |`);
  lines.push(`| \`ref=\` 属性 | ${count(/\bref="/g)} |`);
  lines.push(`| \`<place\` | ${count(/<place\b/g)} |`);
  lines.push(`| \`<transition\` | ${count(/<transition\b/g)} |`);
  lines.push(`| \`<arc\` | ${count(/<arc\b/g)} |`);
  lines.push(`| \`<property\` | ${count(/<property\b/g)} |`);
  lines.push(`| \`<content\` | ${count(/<content\b/g)} |`);
  lines.push(`| \`<insertion\` | ${count(/<insertion\b/g)} |`);
  lines.push(`| \`<materialTemplate\` | ${count(/<materialTemplate\b/g)} |`);
  lines.push(`| \`<conditionTemplate\` | ${count(/<conditionTemplate\b/g)} |`);
  lines.push(`| \`<resultTemplate\` | ${count(/<resultTemplate\b/g)} |`);
  lines.push(`| \`<material\` | ${count(/<material\b/g)} |`);
  lines.push(`| \`<condition\` | ${count(/<condition\b/g)} |`);
  lines.push(`| \`<result\` | ${count(/<result\b/g)} |`);
  lines.push(`| \`<event\` | ${count(/<event\b/g)} |`);
  lines.push(`| XMLコメント | ${count(/<!--/g)} |`);
  lines.push('');

  // xsi:type 一覧
  lines.push('### 使用されているxsi:type一覧');
  lines.push('');
  const xsiTypePattern = /xsi:type="([^"]+)"/g;
  const typeCounts: Record<string, number> = {};
  let m: RegExpExecArray | null;
  while ((m = xsiTypePattern.exec(xml)) !== null) {
    typeCounts[m[1]] = (typeCounts[m[1]] || 0) + 1;
  }
  lines.push(`| xsi:type | 使用回数 |`);
  lines.push(`|----------|---------|`);
  for (const [t, c] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${t}\` | ${c} |`);
  }
  lines.push('');

  // UUID一覧
  lines.push('### UUID一覧');
  lines.push('');
  const uuidPattern = /<uuid>([^<]+)<\/uuid>/g;
  const uuids: string[] = [];
  while ((m = uuidPattern.exec(xml)) !== null) {
    uuids.push(m[1].trim());
  }
  const uuidSet = new Set<string>();
  lines.push(`| # | UUID | 重複 |`);
  lines.push(`|---|------|------|`);
  uuids.forEach((u, i) => {
    const isDup = uuidSet.has(u);
    uuidSet.add(u);
    lines.push(`| ${i + 1} | \`${u}\` | ${isDup ? '⚠️ 重複' : '−'} |`);
  });
  lines.push('');

  // id一覧（重複フラグ付き）
  lines.push('### id属性一覧');
  lines.push('');
  const idPattern = /\bid="([^"]+)"/g;
  const ids: string[] = [];
  while ((m = idPattern.exec(xml)) !== null) {
    ids.push(m[1]);
  }
  const idCountMap: Record<string, number> = {};
  for (const id of ids) {
    idCountMap[id] = (idCountMap[id] || 0) + 1;
  }
  const uniqueIds = [...new Set(ids)];
  lines.push(`| id値 | 出現回数 | 状態 |`);
  lines.push(`|------|---------|------|`);
  for (const id of uniqueIds) {
    const cnt = idCountMap[id];
    lines.push(`| \`${id}\` | ${cnt} | ${cnt > 1 ? '⚠️ 重複' : '✅'} |`);
  }
  lines.push('');

  // insertion一覧
  lines.push('### insertion要素一覧');
  lines.push('');
  const insertionPat = /<insertion>([\s\S]*?)<\/insertion>/g;
  let idx = 0;
  lines.push(`| # | uri | hash（先頭20文字） | format | 状態 |`);
  lines.push(`|---|-----|-------------------|--------|------|`);
  while ((m = insertionPat.exec(xml)) !== null) {
    idx++;
    const content = m[1];
    const uri    = content.match(/<uri>([^<]*)<\/uri>/)?.[1]?.trim() || '（空）';
    const hash   = content.match(/<hash>([^<]*)<\/hash>/)?.[1]?.trim() || '（空）';
    const format = content.match(/<format>([^<]*)<\/format>/)?.[1]?.trim() || '−';
    const hashShort = hash === '（空）' ? '（空）' : hash.substring(0, 20) + '...';
    const status = (uri === '（空）' || hash === '（空）') ? '⚠️ 不完全' : '✅';
    lines.push(`| ${idx} | \`${uri}\` | \`${hashShort}\` | \`${format}\` | ${status} |`);
  }
  lines.push('');

  // コメント一覧
  lines.push('### XMLコメント一覧');
  lines.push('');
  const commentPat = /<!--([\s\S]*?)-->/g;
  let ci = 0;
  while ((m = commentPat.exec(xml)) !== null) {
    ci++;
    lines.push(`- コメント ${ci}: \`${m[1].trim().substring(0, 100)}\``);
  }
  if (ci === 0) lines.push('なし');
  lines.push('');

  return lines;
}

// ============================================================
// エントリーポイント
// ============================================================
main().catch(err => {
  console.error('スクリプト実行エラー:', err);
  process.exit(1);
});
