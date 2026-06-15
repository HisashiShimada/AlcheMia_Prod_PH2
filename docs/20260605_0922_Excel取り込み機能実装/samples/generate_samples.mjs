/**
 * サンプルExcelファイル生成スクリプト（v3: 属性行分離フォーマット）
 *
 * フォーマット方針:
 *   シート _info       : projectId / methodId などの識別情報（非表示）
 *   シート {templateId}: テンプレートごとのデータシート（シート名 = templateId）
 *
 *   行構成（A列ラベルは XSD maiml-property.xsd の属性・要素名に準拠）:
 *     行1 key          @key属性       プロパティキー（XSD: uncertaintyBaseType/@key, required）
 *     行2 xsi:type     xsi:type属性   プロパティの型（XSD: 各 complexType 名）
 *     行3 units        @units属性     単位（XSD: decimalType等/@units, xs:string）
 *     行4 formatString @formatString  フォーマット文字列（XSD: decimalType等/@formatString）
 *     行5 description  <description>  説明名（XSD: 各 complexType/<description>, xs:string）
 *     行6以降          データ行       タスク番号 + 各プロパティ値
 *
 *   ユーザーが列を追加する場合:
 *     右端に列を追加し、key 行にキー、xsi:type 行に型を記入するだけでよい
 *
 * 実行方法:
 *   node generate_samples.mjs
 */

import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// 出力先: プロジェクトルートの scripts/result/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../../scripts/result');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================
// 共通: 識別情報シート（_info）を生成する
// ============================================================
function buildInfoSheet(info) {
  const rows = [
    ['項目',          '値'],
    ['projectId',     info.projectId],
    ['projectName',   info.projectName],
    ['methodId',      info.methodId],
    ['methodName',    info.methodName],
    ['generatedAt',   info.generatedAt],
    ['formatVersion', '3'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 16 }, { wch: 36 }];
  return ws;
}

// ============================================================
// 共通: テンプレート1枚分のシートを生成する（v3: 属性行分離）
// ============================================================
/**
 * @param {object} template
 * @param {string} template.templateId
 * @param {string} template.templateType
 * @param {Array}  template.properties  - {key, xsiType, units?, formatString?, desc?}
 * @param {Array}  dataRows             - データ行（省略時は taskCount 分の空行）
 * @param {number} taskCount
 */
function buildSheet(template, dataRows, taskCount = 5) {
  const { properties } = template;

  // 行1: key         プロパティキー（XSD: uncertaintyBaseType/@key, xs:QName, required）
  const keyRow = ['key', ...properties.map(p => p.key)];

  // 行2: xsi:type    型（XSD: 各 complexType の xsi:type 属性）
  const xsiTypeRow = ['xsi:type', ...properties.map(p => p.xsiType || 'string')];

  // 行3: units       単位（XSD: decimalType/doubleType/floatType等/@units, xs:string）
  const unitsRow = ['units', ...properties.map(p => p.units || '')];

  // 行4: formatString フォーマット文字列（XSD: decimalType/intType等/@formatString）
  const formatStrRow = ['formatString', ...properties.map(p => p.formatString || '')];

  // 行5: description 説明名（XSD: 各 complexType の子要素 <description>, xs:string）
  // ユーザーに表示。type・単位情報も付加して入力の手がかりにする
  const descRow = [
    'description',
    ...properties.map(p => {
      let label = p.desc || p.key;
      if (p.units)        label += `（${p.units}）`;
      label += `[${p.xsiType || 'string'}]`;
      if (p.formatString) label += ` [${p.formatString}]`;
      return label;
    }),
  ];

  // 行6以降: データ行
  const rows = dataRows ?? Array.from({ length: taskCount }, (_, i) => [
    i + 1,
    ...Array(properties.length).fill(''),
  ]);

  const worksheetData = [keyRow, xsiTypeRow, unitsRow, formatStrRow, descRow, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // 列幅
  ws['!cols'] = [
    { wch: 14 }, // A列（行ラベル）
    ...properties.map(() => ({ wch: 28 })),
  ];

  return ws;
}

function saveWorkbook(workbook, filename) {
  const fullPath = path.join(OUTPUT_DIR, filename);
  XLSX.writeFile(workbook, fullPath);
  console.log(`✅ 生成: ${fullPath}`);
}

// _info シートを非表示にするヘルパー
function hideInfoSheet(wb) {
  wb.Workbook = wb.Workbook || { Sheets: [] };
  wb.Workbook.Sheets = wb.Workbook.Sheets || [];
  wb.Workbook.Sheets[0] = { Hidden: 1 };
}

const NOW = new Date().toISOString();
const INFO_COMMON = {
  projectId:   'proj-001',
  projectName: 'サンプルプロジェクト',
  methodId:    'method-001',
  methodName:  'Method-A',
  generatedAt: NOW,
};

// ============================================================
// パターン1: シンプル（単一テンプレート・少プロパティ）
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet(INFO_COMMON), '_info');

  const material = {
    templateId: 'MAT001', templateType: 'material',
    properties: [
      { key: 'temperature', xsiType: 'decimal', units: '°C', desc: '温度' },
      { key: 'material',    xsiType: 'string',               desc: '材料名' },
    ],
  };
  // シート名 = templateId
  XLSX.utils.book_append_sheet(wb, buildSheet(material), material.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern1_simple.xlsx');
}

// ============================================================
// パターン2: 複数プロパティ（多プロパティ + formatString）
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet(INFO_COMMON), '_info');

  const material = {
    templateId: 'MAT001', templateType: 'material',
    properties: [
      { key: 'temperature', xsiType: 'decimal',  units: '°C', desc: '温度' },
      { key: 'material',    xsiType: 'string',                desc: '材料名' },
      { key: 'pressure',    xsiType: 'decimal',  units: 'Pa', desc: '圧力' },
      { key: 'humidity',    xsiType: 'decimal',  units: '%',  desc: '湿度' },
      { key: 'coating',     xsiType: 'boolean',              desc: 'コーティング' },
      { key: 'batch_no',    xsiType: 'integer',  formatString: '000-999', desc: 'バッチ番号' },
    ],
  };
  XLSX.utils.book_append_sheet(wb, buildSheet(material), material.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern2_multiple_props.xlsx');
}

// ============================================================
// パターン3: 階層プロパティ（フラット展開案）
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet({
    ...INFO_COMMON, methodId: 'method-002', methodName: 'Method-B',
  }), '_info');

  const material = {
    templateId: 'MAT002', templateType: 'material',
    properties: [
      { key: 'temperature',         xsiType: 'decimal', units: '°C', desc: '温度' },
      { key: 'composition.element', xsiType: 'string',               desc: '組成元素' },
      { key: 'composition.ratio',   xsiType: 'decimal', units: '%',  desc: '組成比率' },
      { key: 'composition.purity',  xsiType: 'decimal', units: '%',  desc: '純度' },
    ],
  };
  XLSX.utils.book_append_sheet(wb, buildSheet(material), material.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern3_nested_props.xlsx');
}

// ============================================================
// パターン4: 複数テンプレート（Material + Condition）→ 2シート
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet(INFO_COMMON), '_info');

  const material = {
    templateId: 'MAT001', templateType: 'material',
    properties: [
      { key: 'temperature', xsiType: 'decimal', units: '°C', desc: '温度' },
      { key: 'material',    xsiType: 'string',               desc: '材料名' },
    ],
  };
  const condition = {
    templateId: 'COND001', templateType: 'condition',
    properties: [
      { key: 'pH',       xsiType: 'decimal',             desc: 'pH' },
      { key: 'humidity', xsiType: 'decimal', units: '%', desc: '湿度' },
    ],
  };

  XLSX.utils.book_append_sheet(wb, buildSheet(material),  material.templateId);
  XLSX.utils.book_append_sheet(wb, buildSheet(condition), condition.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern4_multi_template.xlsx');
}

// ============================================================
// パターン5: 記入済みサンプル（アップロード動作確認用）
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet(INFO_COMMON), '_info');

  const material = {
    templateId: 'MAT001', templateType: 'material',
    properties: [
      { key: 'temperature', xsiType: 'decimal',  units: '°C', desc: '温度' },
      { key: 'material',    xsiType: 'string',                desc: '材料名' },
      { key: 'pressure',    xsiType: 'decimal',  units: 'Pa', desc: '圧力' },
      { key: 'humidity',    xsiType: 'decimal',  units: '%',  desc: '湿度' },
      { key: 'coating',     xsiType: 'boolean',              desc: 'コーティング' },
      { key: 'batch_no',    xsiType: 'integer',  formatString: '000-999', desc: 'バッチ番号' },
    ],
  };

  const filledRows = [
    [1, 25.5, '炭素鋼',    500, 60, 'true',  '001'],
    [2, 30.0, 'ステンレス', 600, 55, 'false', '002'],
    [3, 28.2, 'アルミ',    550, 62, 'true',  '003'],
    [4, 22.1, '銅',        480, 58, 'false', '004'],
    [5, 35.0, 'チタン',    700, 50, 'true',  '005'],
  ];

  XLSX.utils.book_append_sheet(wb, buildSheet(material, filledRows), material.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern5_filled_sample.xlsx');
}

// ============================================================
// パターン6: 3テンプレート（Material + Condition + Result）→ 3シート
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet(INFO_COMMON), '_info');

  const material = {
    templateId: 'MAT001', templateType: 'material',
    properties: [
      { key: 'temperature', xsiType: 'decimal', units: '°C', desc: '温度' },
      { key: 'material',    xsiType: 'string',               desc: '材料名' },
    ],
  };
  const condition = {
    templateId: 'COND001', templateType: 'condition',
    properties: [
      { key: 'pH',             xsiType: 'decimal',               desc: 'pH' },
      { key: 'stirring_speed', xsiType: 'decimal', units: 'rpm', desc: '攪拌速度' },
    ],
  };
  const result = {
    templateId: 'RES001', templateType: 'result',
    properties: [
      { key: 'yield',  xsiType: 'decimal', units: '%', desc: '収率' },
      { key: 'purity', xsiType: 'decimal', units: '%', desc: '純度' },
    ],
  };

  XLSX.utils.book_append_sheet(wb, buildSheet(material),  material.templateId);
  XLSX.utils.book_append_sheet(wb, buildSheet(condition), condition.templateId);
  XLSX.utils.book_append_sheet(wb, buildSheet(result),    result.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern6_all_templates.xlsx');
}

// ============================================================
// パターン7: ユーザー追加列あり（テンプレート外プロパティ）
// ============================================================
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildInfoSheet(INFO_COMMON), '_info');

  // テンプレートから生成した列 + ユーザーが追加した列（desc なし）
  const material = {
    templateId: 'MAT001', templateType: 'material',
    properties: [
      { key: 'temperature',   xsiType: 'decimal', units: '°C', desc: '温度' },
      { key: 'material',      xsiType: 'string',               desc: '材料名' },
      // ↓ ユーザーが後から追加した列（desc なし → key がそのまま _desc_ に表示される）
      { key: 'my_custom_key', xsiType: 'string' },
      { key: 'extra_note',    xsiType: 'string' },
    ],
  };
  XLSX.utils.book_append_sheet(wb, buildSheet(material), material.templateId);
  hideInfoSheet(wb);
  saveWorkbook(wb, 'pattern7_user_added_columns.xlsx');
}

console.log('\n✨ 全サンプルファイルの生成が完了しました。');
console.log('');
console.log('【フォーマット仕様 v3 - XSD maiml-property.xsd 準拠】');
console.log('  シート _info  : projectId / methodId などの識別情報（非表示）');
console.log('  シート名      : {templateId}（例: MAT001, COND001, RES001）');
console.log('  行1 key         : @key属性       プロパティキー（required）');
console.log('  行2 xsi:type    : xsi:type属性   プロパティの型');
console.log('  行3 units       : @units属性     単位');
console.log('  行4 formatString: @formatString  フォーマット文字列');
console.log('  行5 description : <description>  説明名（型・単位付き）ユーザーに表示');
console.log('  行6以降         : タスク番号 + 各プロパティ値');
console.log('');
console.log('【ユーザーが列を追加する場合】');
console.log('  右端に列を追加し、key 行にキー、xsi:type 行に型を記入するだけ');
console.log('  units / formatString / description は空欄でも取り込み可能');
