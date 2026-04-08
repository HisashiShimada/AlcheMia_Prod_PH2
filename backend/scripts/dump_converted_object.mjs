/**
 * test0327.maiml の変換後オブジェクトをJSONダンプするスクリプト
 * frontend/node_modules から xml-js を使用するため、frontendディレクトリで実行する
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
// convertPNML シミュレーション
// ======================================================
function convertPlace(xmlPlace) {
  const positionEl = xmlPlace.position;
  let position;
  if (positionEl && positionEl._attributes) {
    const x = parseFloat(positionEl._attributes.x);
    const y = parseFloat(positionEl._attributes.y);
    if (!isNaN(x) && !isNaN(y)) position = { x, y };
  }
  return {
    id: xmlPlace._attributes?.id || '',
    uuid: xmlPlace.uuid?._text,
    name: xmlPlace.name?._text,
    description: xmlPlace.description?._text,
    position
  };
}

function convertTransition(xmlTransition) {
  const positionEl = xmlTransition.position;
  let position;
  if (positionEl && positionEl._attributes) {
    const x = parseFloat(positionEl._attributes.x);
    const y = parseFloat(positionEl._attributes.y);
    if (!isNaN(x) && !isNaN(y)) position = { x, y };
  }
  return {
    id: xmlTransition._attributes?.id || '',
    uuid: xmlTransition.uuid?._text,
    name: xmlTransition.name?._text,
    description: xmlTransition.description?._text,
    position
  };
}

function convertArc(xmlArc) {
  return {
    id: xmlArc._attributes?.id || '',
    uuid: xmlArc.uuid?._text,
    name: xmlArc.name?._text,
    description: xmlArc.description?._text,
    source: xmlArc._attributes?.source || '',
    target: xmlArc._attributes?.target || ''
  };
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function convertArray(value, converter) {
  return normalizeArray(value).map(converter);
}

function convertPNML(xmlPnml) {
  return {
    id: xmlPnml._attributes?.id || '',
    uuid: xmlPnml.uuid?._text || '',
    name: xmlPnml.name?._text,
    places: convertArray(xmlPnml.place, convertPlace),
    transitions: convertArray(xmlPnml.transition, convertTransition),
    arcs: convertArray(xmlPnml.arc, convertArc)
  };
}

function convertMethod(xmlMethod) {
  const pnml = xmlMethod.pnml;
  return {
    id: xmlMethod._attributes?.id || '',
    uuid: xmlMethod.uuid?._text || '',
    name: xmlMethod.name?._text,
    pnml: pnml ? convertPNML(pnml) : null
  };
}

function convertProtocol(xmlProtocol) {
  if (!xmlProtocol) return null;
  const methods = normalizeArray(xmlProtocol.method);
  return {
    id: xmlProtocol._attributes?.id || '',
    uuid: xmlProtocol.uuid?._text || '',
    name: xmlProtocol.name?._text,
    methods: methods.map(convertMethod)
  };
}

// ======================================================
// メイン処理
// ======================================================
const maimlPath = path.join(__dirname, 'test0327.maiml');
const outputJsonPath = path.join(__dirname, 'debug_converted_object.json');
const outputSummaryPath = path.join(__dirname, 'debug_converted_summary.txt');

const maimlContent = fs.readFileSync(maimlPath, 'utf8');

// xml-jsでパース
const xmlData = xmljs.xml2js(maimlContent, {
  compact: true,
  ignoreComment: true,
  alwaysChildren: false
});

// maiml要素を取得
const rawMaimlElement = xmlData.maiml || xmlData;

// ① 現状のロジック: maimlElement.protocol を参照（タイポのため undefined）
const maimlElement = stripNamespacePrefixes(rawMaimlElement);

// ② 変換後オブジェクト（現状ロジック: protocol=undefined → createEmptyProtocol）
const convertedWithBug = {
  version: maimlElement._attributes?.version || '1.0',
  xsiType: 'maimlRootType',
  document: {
    id: maimlElement.document?._attributes?.id || '',
    uuid: maimlElement.document?.uuid?._text || ''
  },
  protocol: convertProtocol(maimlElement.protocol),  // ← undefined（タイポのため）
  _note: 'protocol は undefined → createEmptyProtocol() が使用される → methods=[]'
};

// ③ もし protcol(typo) を参照した場合の変換結果
const convertedIfFixed = {
  version: maimlElement._attributes?.version || '1.0',
  xsiType: 'maimlRootType',
  document: {
    id: maimlElement.document?._attributes?.id || '',
    uuid: maimlElement.document?.uuid?._text || ''
  },
  protocol: convertProtocol(maimlElement.protcol),  // ← タイポキーを直接参照
  _note: 'protcol(typo)キーを参照した場合の変換結果（修正後の期待値）'
};

// ④ maimlElement全体のトップレベルキーダンプ（値は省略して構造のみ）
function summarizeObject(obj, depth = 0) {
  if (depth > 3) return '[...深すぎる...]';
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return `Array[${obj.length}]`;
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_text') {
      result[key] = typeof value === 'string' && value.length > 50 
        ? value.slice(0, 50) + '...' 
        : value;
    } else if (key === '_attributes') {
      result[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = summarizeObject(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// JSON出力（現状ロジックと修正後の両方）
const outputJson = {
  meta: {
    maimlFile: 'test_data/test0327.maiml',
    generatedAt: new Date().toISOString(),
    description: 'MaimlParseTyped変換デバッグ: 現状ロジックと修正後の比較'
  },
  step1_xml2js_topLevelKeys: Object.keys(xmlData),
  step2_maimlElement_topLevelKeys: Object.keys(rawMaimlElement),
  step3_afterStripNamespace_topLevelKeys: Object.keys(maimlElement),
  step4_keyExists: {
    'maimlElement.protocol': maimlElement.protocol !== undefined,
    'maimlElement.protcol': maimlElement.protcol !== undefined,
    'maimlElement.data': maimlElement.data !== undefined,
    'maimlElement.eventlog': maimlElement.eventlog !== undefined,
    'maimlElement.eventLog': maimlElement.eventLog !== undefined,
  },
  step5_convertedResult_currentBug: convertedWithBug,
  step6_convertedResult_ifProtcolFixed: convertedIfFixed,
  step7_maimlElement_structureSummary: summarizeObject(maimlElement, 0)
};

fs.writeFileSync(outputJsonPath, JSON.stringify(outputJson, null, 2), 'utf8');

// サマリーテキスト出力
const summaryLines = [];
const log = (s) => summaryLines.push(s);

log('='.repeat(80));
log('変換後オブジェクト サマリー');
log(`生成日時: ${new Date().toLocaleString('ja-JP')}`);
log('='.repeat(80));

log('\n■ xml-jsパース結果のトップレベルキー');
log('  ' + Object.keys(xmlData).join(', '));

log('\n■ maiml要素のキー（stripNamespacePrefixes適用後）');
log('  ' + Object.keys(maimlElement).join(', '));

log('\n■ 重要キーの存在確認');
log(`  maimlElement.protocol  → ${maimlElement.protocol !== undefined ? '存在する ✅' : '存在しない ❌ (タイポ: protcol)'}`);
log(`  maimlElement.protcol   → ${maimlElement.protcol !== undefined ? '存在する ⚠️(タイポ)' : '存在しない'}`);
log(`  maimlElement.data      → ${maimlElement.data !== undefined ? '存在する ✅' : '存在しない ❌'}`);
log(`  maimlElement.eventlog  → ${maimlElement.eventlog !== undefined ? '存在する ✅' : '存在しない'}`);
log(`  maimlElement.eventLog  → ${maimlElement.eventLog !== undefined ? '存在する ✅' : '存在しない ❌ (小文字: eventlog)'}`);

log('\n■ [現状ロジック] convertXmlJsToMaimlRoot の動作');
log('  → maimlElement.protocol を参照 = undefined');
log('  → createEmptyProtocol() 使用: { id: "error-protocol", uuid: "", methods: [] }');
log('  → getMethods() = []');
log('  → ReactFlowに渡るノード/エッジ = 0件 → 空白表示');

log('\n■ [protcol(typo)要素から変換した場合の期待値]');
const proto = convertedIfFixed.protocol;
if (proto) {
  log(`  protocol.id    = "${proto.id}"`);
  log(`  protocol.uuid  = "${proto.uuid}"`);
  log(`  protocol.name  = "${proto.name}"`);
  log(`  methodCount    = ${proto.methods?.length || 0}`);
  if (proto.methods) {
    proto.methods.forEach((m, i) => {
      log(`\n  method[${i}]:`);
      log(`    id    = "${m.id}"`);
      log(`    uuid  = "${m.uuid}"`);
      log(`    name  = "${m.name}"`);
      if (m.pnml) {
        log(`    pnml.id          = "${m.pnml.id}"`);
        log(`    pnml.places      = ${m.pnml.places?.length || 0}件`);
        if (m.pnml.places?.length > 0) {
          log(`      placeIds: ${m.pnml.places.map(p => p.id).join(', ')}`);
        }
        log(`    pnml.transitions = ${m.pnml.transitions?.length || 0}件`);
        if (m.pnml.transitions?.length > 0) {
          log(`      transitionIds: ${m.pnml.transitions.map(t => t.id).join(', ')}`);
          m.pnml.transitions.forEach(t => {
            log(`      - id="${t.id}" name="${t.name || ''}" pos=${t.position ? `(${t.position.x},${t.position.y})` : 'なし'}`);
          });
        }
        log(`    pnml.arcs        = ${m.pnml.arcs?.length || 0}件`);
        if (m.pnml.arcs?.length > 0) {
          m.pnml.arcs.forEach(a => {
            log(`      - id="${a.id}" ${a.source} → ${a.target}`);
          });
        }
      }
    });
  }
}

log('\n■ reference版における同種のタグ名置換処理の有無');
log('  → MaiMLTransitionExtractor.js: DOMParser を使用（getElementsByTagName）');
log('     ※ タグ名を直接指定して取得するため、protcol タイポには対応していない');
log('  → maimlTypeConverter.ts: stripNamespacePrefixes は名前空間プレフィックス（:）のみ除去');
log('     ※ タイポ（protcol）のような誤字は修正しない');
log('  → 結論: reference版・現行版ともにタグ名のタイポを自動修正する処理は存在しない');

log('\n■ 詳細なJSONダンプ先');
log(`  ${outputJsonPath}`);

fs.writeFileSync(outputSummaryPath, summaryLines.join('\n'), 'utf8');
console.log(summaryLines.join('\n'));
console.log(`\n✅ JSON → ${outputJsonPath}`);
console.log(`✅ サマリー → ${outputSummaryPath}`);
