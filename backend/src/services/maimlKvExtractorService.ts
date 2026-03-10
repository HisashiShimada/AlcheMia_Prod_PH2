/**
 * MaiML KV 抽出サービス
 *
 * @description MaimlParserTyped を使用して condition / material の KV属性を抽出する
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 4
 *
 * path 表現ルール（BasicDesign v1.3 § 7.1）:
 *   - 直下の要素: key そのまま
 *   - ネスト: 親/子
 *   - 同名要素が複数: idx=0,1,2...
 */

import { MaimlParserTyped } from '../utils/maimlParserTyped';
import type { Property, Template } from '../types/maiml-unified';
import type {
  MaimlConditionKv,
  MaimlMaterialKv,
  ParsedSeries,
  SeriesType,
} from '../types/maimlOpenData';

// ============================================================
// 定数
// ============================================================

const NUMERIC_XSITYPES = new Set([
  'doubleType', 'floatType', 'decimalType',
  'intType', 'longType', 'shortType',
  'byteType', 'unsignedIntType', 'unsignedLongType',
  'unsignedShortType', 'unsignedByteType',
  'doubleListType', 'floatListType', 'decimalListType',
]);

// ============================================================
// 公開インターフェース
// ============================================================

export interface KvExtractResult {
  conditionKvRows: MaimlConditionKv[];
  materialKvRows: MaimlMaterialKv[];
  seriesList: ParsedSeries[];
  docName: string | null;
}

// ============================================================
// メイン関数
// ============================================================

/**
 * MaiML XML 文字列を MaimlParserTyped で解析し、KV・series・doc_name を抽出する
 *
 * @param assetId - 取り込み先 asset_id
 * @param xmlContent - MaiML ファイルの XML 文字列
 * @returns KV行・series 一覧・doc_name
 */
export function extractFromMaiml(
  assetId: number,
  xmlContent: string,
): KvExtractResult {
  const parser = new MaimlParserTyped(xmlContent);

  // doc_name 抽出（/maiml/document/name）
  let docName: string | null = null;
  try {
    const doc = parser.getDocument();
    docName = doc.name ?? null;
  } catch {
    // document が存在しない場合は null のまま
  }

  const conditionKvRows: MaimlConditionKv[] = [];
  const materialKvRows: MaimlMaterialKv[]  = [];

  // テンプレートから KV 抽出（conditionTemplate / materialTemplate）
  const templates = parser.getTemplates();

  for (const tpl of templates.condition) {
    const rows = extractKvFromTemplate(assetId, tpl, 'conditionTemplate');
    conditionKvRows.push(...rows);
  }
  for (const tpl of templates.material) {
    const rows = extractKvFromTemplate(assetId, tpl, 'materialTemplate');
    materialKvRows.push(...rows);
  }

  // data セクションから condition / material インスタンスの KV も抽出
  const maimlRoot = parser.getTypedMaiml();
  if (maimlRoot.data) {
    for (const resultSet of maimlRoot.data.results) {
      for (const cond of resultSet.conditions) {
        // instruction_id は eventLog / data の ref から特定するが未確定のため null
        const rows = extractKvFromProperties(
          assetId,
          cond.properties,
          'condition',
          null,
          cond.ref ?? null,  // ref がテンプレート ID に相当
          '',
        );
        conditionKvRows.push(...rows);
      }
      for (const mat of resultSet.materials) {
        const rows = extractKvFromProperties(
          assetId,
          mat.properties,
          'material',
          null,
          mat.ref ?? null,
          '',
        );
        materialKvRows.push(...rows);
      }
    }
  }

  // series 抽出
  const seriesList = extractSeriesFromMaiml(parser);

  return { conditionKvRows, materialKvRows, seriesList, docName };
}

// ============================================================
// KV 抽出ヘルパー
// ============================================================

/**
 * Template から KV 行を抽出する
 */
function extractKvFromTemplate(
  assetId: number,
  template: Template,
  sourceSection: string,
): MaimlConditionKv[] | MaimlMaterialKv[] {
  // instruction_id: Template は Protocol 直下または Program 直下にあるため
  //   instruction_id は Program の instruction.id から辿るが、Template 自体には持たない
  //   TODO: instruction_id の紐付けロジックを確定させる（現時点では null）
  return extractKvFromProperties(
    assetId,
    template.properties,
    sourceSection,
    null,          // instruction_id（TODO）
    template.id,   // template_id
    '',
  );
}

/**
 * Property 配列を再帰的に走査して KV 行を生成する
 *
 * @param assetId
 * @param properties - 対象 Property 配列
 * @param sourceSection - 'conditionTemplate' / 'condition' 等
 * @param instructionId - instruction_id（null 可）
 * @param templateId - template_id（null 可）
 * @param parentPath - 親のパス（'' = ルート）
 */
function extractKvFromProperties(
  assetId: number,
  properties: Property[],
  sourceSection: string,
  instructionId: string | null,
  templateId: string | null,
  parentPath: string,
): MaimlConditionKv[] {
  const rows: MaimlConditionKv[] = [];
  const keyCount: Record<string, number> = {};

  for (const prop of properties) {
    const key = prop.key ?? '';
    if (!key) continue;

    const path = parentPath ? `${parentPath}/${key}` : key;
    const idx  = keyCount[key] ?? 0;
    keyCount[key] = idx + 1;

    const { valueText, valueNum, valueType, unit, formatString, scaleFactor } =
      extractPropertyValue(prop);

    rows.push({
      asset_id:       assetId,
      template_id:    templateId,
      instruction_id: instructionId,
      source_section: sourceSection,
      path,
      key,
      idx,
      value_text:     valueText,
      value_num:      valueNum,
      unit,
      value_type:     valueType,
      format_string:  formatString,
      scale_factor:   scaleFactor,
    });

    // ネストした property を再帰処理
    if (prop.properties && prop.properties.length > 0) {
      const nested = extractKvFromProperties(
        assetId,
        prop.properties,
        sourceSection,
        instructionId,
        templateId,
        path,
      );
      rows.push(...nested);
    }
  }

  return rows;
}

/**
 * Property ノードから値・型・単位を抽出する
 */
function extractPropertyValue(prop: Property): {
  valueText:    string | null;
  valueNum:     number | null;
  valueType:    string | null;
  unit:         string | null;
  formatString: string | null;
  scaleFactor:  number | null;
} {
  const valueType    = prop.xsiType ? normalizeValueType(prop.xsiType) : null;
  const unit         = prop.units        ?? null;
  const formatString = prop.formatString ?? null;
  const scaleFactor  = prop.scaleFactor  ?? null;

  let valueText: string | null = null;
  let valueNum:  number | null = null;

  if (prop.value !== undefined && prop.value !== null) {
    if (prop.xsiType && NUMERIC_XSITYPES.has(prop.xsiType)) {
      const num = typeof prop.value === 'number'
        ? prop.value
        : parseFloat(String(prop.value));
      valueNum = isNaN(num) ? null : num;
    } else {
      valueText = String(prop.value) || null;
    }
  }

  return { valueText, valueNum, valueType, unit, formatString, scaleFactor };
}

/**
 * xsi:type 文字列 → DB 保存用 value_type 文字列
 * 例: 'doubleType' → 'double'
 */
function normalizeValueType(xsiType: string): string {
  return xsiType.replace(/Type$/, '');
}

// ============================================================
// series 抽出
// ============================================================

/**
 * MaimlParserTyped から series データを抽出する
 *
 * TODO: inline series（Content の数値配列）を含む MaiML サンプル入手後に実装する
 *       XRF.maiml は <insertion> で外部バイナリ参照のため inline series なし
 */
function extractSeriesFromMaiml(_parser: MaimlParserTyped): ParsedSeries[] {
  // TODO: data > results > result > content の数値配列を解析して ParsedSeries[] を返す
  //       現時点では空配列（外部ファイル参照形式は対象外）
  return [];
}

// ============================================================
// series_type 判定
// ============================================================

/**
 * content の key 属性から series_type を判定する
 *
 * TODO: key 属性の実値を含む MaiML サンプル（クロマトグラフィー系）入手後に
 *       TIC / SPECTRUM_TOTAL の具体的なマッチングルールを確定させる
 *
 * @param contentKey - content タグの key 属性値
 */
export function determineSeriesType(contentKey: string): SeriesType {
  // TODO: 判定ロジック未確定。サンプルデータ確認後に実装する
  void contentKey;
  return 'OTHER';
}
