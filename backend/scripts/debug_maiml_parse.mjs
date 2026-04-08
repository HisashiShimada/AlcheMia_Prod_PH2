/**
 * test0327.maiml の MaimlParseTyped 変換デバッグスクリプト
 * 
 * 現状のロジックで変換した結果をテキストファイルに出力する
 */

import xmljs from 'xml-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ======================================================
// stripNamespacePrefixes (maimlTypeConverter.tsから移植)
// ======================================================
function stripNamespacePrefixes(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripNamespacePrefixes);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_attributes') {
      result[key] = value;
      continue;
    }
    if (key.startsWith('_')) {
      result[key] = stripNamespacePrefixes(value);
      continue;
    }
    const strippedKey = key.includes(':') ? key.split(':').pop() : key;
    if (result[strippedKey] !== undefined) {
      result[strippedKey] = [
        ...(Array.isArray(result[strippedKey]) ? result[strippedKey] : [result[strippedKey]]),
        stripNamespacePrefixes(value)
      ];
    } else {
      result[strippedKey] = stripNamespacePrefixes(value);
    }
  }
  return result;
}

// ======================================================
// メイン処理
// ======================================================
const maimlPath = path.join(__dirname, 'test0327.maiml');
const outputPath = path.join(__dirname, 'debug_parse_result.txt');

const lines = [];
const log = (msg) => {
  console.log(msg);
  lines.push(msg);
};

log('='.repeat(80));
log('test0327.maiml MaimlParseTyped 変換デバッグレポート');
log(`生成日時: ${new Date().toLocaleString('ja-JP')}`);
log('='.repeat(80));

// 1. ファイル読み込み
const maimlContent = fs.readFileSync(maimlPath, 'utf8');
log('\n## ステップ1: ファイル読み込み');
log(`ファイルサイズ: ${maimlContent.length} 文字`);

// 2. XMLの先頭数行を確認
log('\n## ステップ2: XML先頭5行の確認');
const firstLines = maimlContent.split('\n').slice(0, 5);
firstLines.forEach((line, i) => {
  log(`  行${i + 1}: ${line}`);
});

// 3. 問題箇所の検出
log('\n## ステップ3: 既知の問題箇所チェック');

const checks = [
  {
    name: 'XML宣言のtypo (<?xmll vs <?xml)',
    regex: /^<\?xmll/,
    found: (match) => `⚠️ 発見: "${match}" - "xmll" は正しくは "xml" のはず`,
    notFound: '✅ 問題なし'
  },
  {
    name: 'xmlns属性のtypo (xmllns vs xmlns)',
    regex: /xmllns=/,
    found: (match) => `⚠️ 発見: "xmllns=" は正しくは "xmlns=" のはず`,
    notFound: '✅ 問題なし'
  },
  {
    name: '<protcol> タグのtypo (protcol vs protocol)',
    regex: /<protcol\b/,
    found: (match) => `❌ 重大: "<protcol" は正しくは "<protocol" のはず → これが空ReactFlowの原因!`,
    notFound: '✅ 問題なし'
  },
  {
    name: '</protcol> 閉じタグのtypo',
    regex: /<\/protcol>/,
    found: (match) => `❌ 重大: "</protcol>" は正しくは "</protocol>" のはず`,
    notFound: '✅ 問題なし'
  },
  {
    name: '<protocol> タグが正しく存在するか',
    regex: /<protocol\b/,
    found: (match) => '✅ <protocol> タグが存在する',
    notFound: '❌ <protocol> タグが存在しない → protocolが空になる'
  },
  {
    name: '<pnml> タグの存在確認',
    regex: /<pnml\b/,
    found: (match) => '✅ <pnml> タグが存在する',
    notFound: '❌ <pnml> タグが存在しない'
  },
  {
    name: '<method> タグの存在確認',
    regex: /<method\b/,
    found: (match) => '✅ <method> タグが存在する',
    notFound: '❌ <method> タグが存在しない'
  },
];

for (const check of checks) {
  const match = maimlContent.match(check.regex);
  log(`\n  チェック: ${check.name}`);
  if (match) {
    log(`    ${check.found(match[0])}`);
  } else {
    log(`    ${check.notFound}`);
  }
}

// 4. xml-jsによるパース
log('\n## ステップ4: xml-js によるパース');
let xmlData;
try {
  xmlData = xmljs.xml2js(maimlContent, {
    compact: true,
    ignoreComment: true,
    alwaysChildren: false
  });
  log('✅ xml-js パース成功');
} catch (error) {
  log(`❌ xml-js パースエラー: ${error.message}`);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
  process.exit(1);
}

// 5. パース結果のトップレベルキーを確認
log('\n## ステップ5: パース結果のトップレベルキー');
log(`  キー一覧: ${Object.keys(xmlData).join(', ')}`);

// maiml要素の確認
const rawMaimlElement = xmlData.maiml || xmlData;
log(`\n  maiml要素のキー: ${Object.keys(rawMaimlElement).join(', ')}`);

// 6. stripNamespacePrefixes適用後
log('\n## ステップ6: stripNamespacePrefixes 適用後');
const maimlElement = stripNamespacePrefixes(rawMaimlElement);
log(`  キー一覧: ${Object.keys(maimlElement).join(', ')}`);

// 7. 重要要素の存在確認
log('\n## ステップ7: 重要要素の存在確認（stripNamespacePrefixes適用後）');

const checkKey = (obj, path, label) => {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) {
      log(`  ❌ ${label} (${path}): 存在しない`);
      return false;
    }
    current = current[part];
  }
  if (current !== undefined && current !== null) {
    const type = Array.isArray(current) ? `Array[${current.length}]` : typeof current;
    log(`  ✅ ${label} (${path}): 存在する [${type}]`);
    return true;
  } else {
    log(`  ❌ ${label} (${path}): 存在しない (undefined/null)`);
    return false;
  }
};

checkKey(maimlElement, 'document', 'document要素');
checkKey(maimlElement, 'protocol', 'protocol要素');
checkKey(maimlElement, 'protcol', 'protcol要素 (typo)');
checkKey(maimlElement, 'data', 'data要素');
checkKey(maimlElement, 'eventLog', 'eventLog要素');
checkKey(maimlElement, 'eventlog', 'eventlog要素 (小文字)');

// 8. protocol要素の詳細
log('\n## ステップ8: protocol要素の詳細分析');
const protocolElement = maimlElement.protocol;
const protcolElement = maimlElement.protcol;

if (!protocolElement && !protcolElement) {
  log('  ❌ protocol要素もprotcol要素も存在しない');
  log('  → convertProtocol()に渡せないため createEmptyProtocol() が使用される');
  log('  → methods = [] となりReactFlowが空になる');
} else if (protcolElement && !protocolElement) {
  log('  ⚠️ protcol (typo) は存在するが protocol は存在しない');
  log('  → stripNamespacePrefixes後、"protcol"キーのまま残る');
  log('  → convertXmlJsToMaimlRoot では maimlElement.protocol を参照するため undefined になる');
  log('  → createEmptyProtocol() が使用され methods = [] となりReactFlowが空になる');

  log('\n  protcol要素のキー:');
  log(`    ${Object.keys(protcolElement).join(', ')}`);
  
  if (protcolElement.method) {
    const methods = Array.isArray(protcolElement.method) ? protcolElement.method : [protcolElement.method];
    log(`  protcol.method の数: ${methods.length}`);
    methods.forEach((m, i) => {
      const id = m._attributes?.id || '(不明)';
      log(`    method[${i}]: id="${id}"`);
      if (m.pnml) {
        const pnml = Array.isArray(m.pnml) ? m.pnml[0] : m.pnml;
        const places = Array.isArray(pnml.place) ? pnml.place : (pnml.place ? [pnml.place] : []);
        const transitions = Array.isArray(pnml.transition) ? pnml.transition : (pnml.transition ? [pnml.transition] : []);
        const arcs = Array.isArray(pnml.arc) ? pnml.arc : (pnml.arc ? [pnml.arc] : []);
        log(`      pnml: place=${places.length}個, transition=${transitions.length}個, arc=${arcs.length}個`);
      } else {
        log(`      ⚠️ pnmlが存在しない`);
      }
    });
  } else {
    log('  ⚠️ protcol.method が存在しない');
  }
} else if (protocolElement) {
  log('  ✅ protocol要素は存在する');
  log(`  protocolキー: ${Object.keys(protocolElement).join(', ')}`);
}

// 9. 変換後のMaimlRootをシミュレート
log('\n## ステップ9: 変換後のMaimlRoot（シミュレーション）');

// convertProtocol相当のシミュレーション
function simulateConvertProtocol(xmlProtocol) {
  if (!xmlProtocol) {
    return { type: 'EMPTY', reason: 'createEmptyProtocol() が使用される (protocol要素がnull/undefined)' };
  }
  
  const id = xmlProtocol._attributes?.id || '';
  const methodsRaw = Array.isArray(xmlProtocol.method) ? xmlProtocol.method : (xmlProtocol.method ? [xmlProtocol.method] : []);
  
  return {
    type: 'CONVERTED',
    id,
    methodCount: methodsRaw.length,
    methods: methodsRaw.map((m, i) => {
      const methodId = m._attributes?.id || `method_${i}`;
      const hasPnml = !!m.pnml;
      const pnml = hasPnml ? (Array.isArray(m.pnml) ? m.pnml[0] : m.pnml) : null;
      const places = pnml ? (Array.isArray(pnml.place) ? pnml.place : (pnml.place ? [pnml.place] : [])) : [];
      const transitions = pnml ? (Array.isArray(pnml.transition) ? pnml.transition : (pnml.transition ? [pnml.transition] : [])) : [];
      const arcs = pnml ? (Array.isArray(pnml.arc) ? pnml.arc : (pnml.arc ? [pnml.arc] : [])) : [];
      
      return {
        id: methodId,
        hasPnml,
        places: places.length,
        transitions: transitions.length,
        arcs: arcs.length,
        placeIds: places.map(p => p._attributes?.id || '').filter(Boolean),
        transitionIds: transitions.map(t => t._attributes?.id || '').filter(Boolean),
      };
    })
  };
}

// maimlElement.protocol (正しいキー) を使用した場合
const resultWithProtocol = simulateConvertProtocol(maimlElement.protocol);
log('\n  [convertXmlJsToMaimlRoot の実際の動作 - maimlElement.protocol を参照]:');
if (resultWithProtocol.type === 'EMPTY') {
  log(`  ❌ ${resultWithProtocol.reason}`);
  log('  → getMethods() = [] → PetriNetEditorに渡るデータが空 → ReactFlowが空`');
} else {
  log(`  ✅ protocol.id: "${resultWithProtocol.id}"`);
  log(`  ✅ methodCount: ${resultWithProtocol.methodCount}`);
  resultWithProtocol.methods.forEach((m, i) => {
    log(`  method[${i}]: id="${m.id}", pnml=${m.hasPnml}, places=${m.places}, transitions=${m.transitions}, arcs=${m.arcs}`);
  });
}

// protcol (typo) を使った場合の結果（もし修正されたら）
if (protcolElement) {
  const resultWithProtcol = simulateConvertProtocol(protcolElement);
  log('\n  [もし protcol(typo) を参照した場合の変換結果]:');
  if (resultWithProtcol.type === 'EMPTY') {
    log(`  ❌ ${resultWithProtcol.reason}`);
  } else {
    log(`  protocol.id: "${resultWithProtcol.id}"`);
    log(`  methodCount: ${resultWithProtcol.methodCount}`);
    resultWithProtcol.methods.forEach((m, i) => {
      log(`  method[${i}]: id="${m.id}", pnml=${m.hasPnml}, places=${m.places}, transitions=${m.transitions}, arcs=${m.arcs}`);
      if (m.placeIds.length > 0) log(`    placeIds: ${m.placeIds.join(', ')}`);
      if (m.transitionIds.length > 0) log(`    transitionIds: ${m.transitionIds.join(', ')}`);
    });
  }
}

// 10. 根本原因の整理
log('\n' + '='.repeat(80));
log('## 根本原因まとめ');
log('='.repeat(80));
log('');
log('【問題1】 <protcol> タグのタイポ (最重要・空ReactFlowの直接原因)');
log('  場所: test0327.maiml の <protcol id="マテリアルシートProtocol">');
log('  原因: "protocol" と書くべきところを "protcol" と誤記');
log('  影響: xml-jsパース後のオブジェクトのキーが "protcol" になる');
log('        stripNamespacePrefixes でもキー名は変わらない');
log('        convertXmlJsToMaimlRoot は maimlElement.protocol を参照するため undefined');
log('        → createEmptyProtocol() が使用される → methods = []');
log('        → getMethods() で空配列 → PetriNetEditorへのデータが空');
log('        → ReactFlowが空のまま表示される');
log('');
log('【問題2】 XML宣言のタイポ (軽微)');
log('  場所: test0327.maiml 1行目 "<?xmll version="1.0""');
log('  原因: "<?xml" と書くべきところを "<?xmll" と誤記');
log('  影響: xml-jsは比較的寛容なのでパース自体は通る可能性あり');
log('        (実際にパースが成功しているため、軽微な問題)');
log('');
log('【問題3】 xmlns属性のタイポ (軽微)');
log('  場所: test0327.maiml の "xmllns="http://www.maiml.org/schemmas""');
log('  原因: "xmlns=" と書くべきところを "xmllns=" と誤記');
log('  影響: 名前空間が正しく認識されないが、');
log('        stripNamespacePrefixesが名前空間プレフィックスを除去するため');
log('        データアクセス自体への影響は限定的');
log('');
log('【修正方法】');
log('  test0327.maiml の以下を修正:');
log('  1. "<?xmll" → "<?xml"');
log('  2. "xmllns=" → "xmlns="');
log('  3. "<protcol" → "<protocol"');
log('  4. "</protcol>" → "</protocol>"');

// 11. 詳細なxmlDataダンプ（プロトコル周辺）
log('\n## ステップ10: maimlElement のトップレベルキー詳細ダンプ');
for (const [key, value] of Object.entries(maimlElement)) {
  if (key === '_attributes') {
    log(`  _attributes: ${JSON.stringify(value)}`);
  } else if (typeof value === 'object' && value !== null) {
    const type = Array.isArray(value) ? `Array[${value.length}]` : 'Object';
    const subKeys = Array.isArray(value) ? 
      (value.length > 0 ? Object.keys(value[0]).join(', ') : '') : 
      Object.keys(value).join(', ');
    log(`  ${key}: ${type} { ${subKeys} }`);
  } else {
    log(`  ${key}: ${value}`);
  }
}

// ファイルに書き出し
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
log(`\n✅ 結果を ${outputPath} に出力しました`);
