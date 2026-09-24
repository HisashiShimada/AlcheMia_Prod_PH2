/**
 * maimlDataExtractor.ts
 * MAIMLの <data><results> 配下の実験結果値を取得するユーティリティ
 * MaimlParserTyped を使って型安全に解析する
 * reference版 PropertyViewer.js の fetchDataInfo() 相当
 */

import { MaimlParserTyped } from './maimlParserTyped';
import type { Property } from '@/types/maiml-unified';

export interface DataPropertyObject {
  key: string;
  value?: string;
  xsiType?: string;
  units?: string;
  description?: string;
}

/** @deprecated DataInfo は1件のみ対応。新規実装では DataResultsGroup[] を使用すること */
export interface DataInfo {
  results_id?: string;
  results_uuid?: string;
  results_name?: string;
  results_description?: string;
  uuid?: string;
  description?: string;
  [key: string]: string | DataPropertyObject | undefined;
}

/**
 * 1件の Results グループ（fetchAllDataInfoFromMaiml の戻り値要素）
 *
 * MAIMLの <data><results> 1件分に対応する、
 * results自体のメタ情報 + マッチした要素のプロパティ配列を保持する。
 */
export interface DataResultsGroup {
  /** results タグの id 属性 */
  resultsId: string;
  /** results タグの uuid 属性 */
  resultsUuid?: string;
  /** results タグの name 要素 */
  resultsName?: string;
  /** results タグの description 要素 */
  resultsDescription?: string;
  /** マッチした要素（material/condition/result）の uuid */
  elementUuid?: string;
  /** マッチした要素の description */
  elementDescription?: string;
  /** プロパティ一覧 */
  properties: DataPropertyObject[];
}

/**
 * Property 型から DataPropertyObject に変換するヘルパー
 */
function propertyToDataPropertyObject(prop: Property): DataPropertyObject {
  const obj: DataPropertyObject = { key: prop.key };

  if (prop.value !== undefined && prop.value !== null) {
    obj.value = String(prop.value);
  }
  if (prop.xsiType) obj.xsiType = prop.xsiType;
  if (prop.units) obj.units = prop.units;
  if (prop.description) obj.description = prop.description;

  return obj;
}

/**
 * MaimlParserTyped を使って、指定の templateId に対応する
 * <data><results> を全件走査し、マッチする Results グループを配列で返す。
 *
 * 1つの templateId に対して複数の Results が存在するケースに対応している。
 * 各 Results の中から templateType に応じた要素（material/condition/result）を探し、
 * ref 属性が templateId に一致するものをグループとして収集する。
 *
 * @param maimlData MAIML XML 文字列
 * @param templateId 対象テンプレートID（data.results.*.ref 属性でマッチ）
 * @param templateType 'material' | 'condition' | 'result'
 * @returns DataResultsGroup の配列（0件の場合は空配列）
 */
export function fetchAllDataInfoFromMaiml(
  maimlData: string,
  templateId: string,
  templateType: string
): DataResultsGroup[] {
  if (!maimlData || !templateId) return [];

  let parser: MaimlParserTyped;
  try {
    parser = new MaimlParserTyped(maimlData);
  } catch (e) {
    console.error('[maimlDataExtractor] MaimlParserTyped 初期化エラー:', e);
    return [];
  }

  const root = parser.getTypedMaiml();
  if (!root.data) {
    console.log(`[maimlDataExtractor] <data>セクションが存在しません: templateId=${templateId}`);
    return [];
  }

  const dataSection = root.data;
  const resultsList = dataSection.results ?? [];
  const groups: DataResultsGroup[] = [];

  for (const results of resultsList) {
    // templateType に応じて対応する配列を選択
    let elements: Array<{ id: string; uuid?: string; name?: string; description?: string; ref: string; properties?: Property[] }>;
    if (templateType === 'material') {
      elements = results.materials ?? [];
    } else if (templateType === 'condition') {
      elements = results.conditions ?? [];
    } else {
      elements = results.results ?? [];
    }

    // data.results.*.ref はテンプレートIDを指している
    const found = elements.find((el) => el.ref === templateId);
    if (!found) continue;

    console.log(`✅ [maimlDataExtractor] 発見: results id=${results.id}, templateId=${templateId}, type=${templateType}`);

    const group: DataResultsGroup = {
      resultsId: results.id,
      properties: [],
    };

    if (results.uuid) group.resultsUuid = results.uuid;
    if (results.name) group.resultsName = results.name;
    if (results.description) group.resultsDescription = results.description;
    if (found.uuid) group.elementUuid = found.uuid;
    if (found.description) group.elementDescription = found.description;

    // property 要素を DataPropertyObject に変換
    const props = found.properties ?? [];
    group.properties = props
      .filter((prop) => !!prop.key)
      .map((prop) => propertyToDataPropertyObject(prop));

    groups.push(group);
  }

  console.log(`✅ [maimlDataExtractor] fetchAllDataInfoFromMaiml 完了: ${groups.length}件の Results グループ (templateId=${templateId})`);
  return groups;
}

/**
 * @deprecated fetchAllDataInfoFromMaiml を使用すること。
 *
 * 後方互換のため残存。内部で fetchAllDataInfoFromMaiml を呼び出し、
 * 最初にマッチした Results グループを DataInfo 形式に変換して返す。
 *
 * @param maimlData MAIML XML 文字列
 * @param templateId 対象テンプレートID
 * @param templateType 'material' | 'condition' | 'result'
 * @returns DataInfo または null（見つからない場合）
 */
export function fetchDataInfoFromMaiml(
  maimlData: string,
  templateId: string,
  templateType: 'material' | 'condition' | 'result'
): DataInfo | null {
  const groups = fetchAllDataInfoFromMaiml(maimlData, templateId, templateType);
  if (groups.length === 0) return null;

  const first = groups[0];
  const dataInfo: DataInfo = {};

  if (first.resultsId) dataInfo.results_id = first.resultsId;
  if (first.resultsUuid) dataInfo.results_uuid = first.resultsUuid;
  if (first.resultsName) dataInfo.results_name = first.resultsName;
  if (first.resultsDescription) dataInfo.results_description = first.resultsDescription;
  if (first.elementUuid) dataInfo.uuid = first.elementUuid;
  if (first.elementDescription) dataInfo.description = first.elementDescription;

  first.properties.forEach((prop) => {
    dataInfo[`property_${prop.key}`] = prop;
  });

  return dataInfo;
}

