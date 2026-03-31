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
 * <data><results><material|condition|result ref="templateId"> の情報を取得する
 *
 * @param maimlData MAIML XML 文字列
 * @param templateId 対象テンプレートID（data.results.*.ref 属性でマッチ）
 * @param templateType 'material' | 'condition' | 'result'
 * @returns DataInfo または null（見つからない場合）
 */
export function fetchDataInfoFromMaiml(
  maimlData: string,
  templateId: string,
  templateType: 'material' | 'condition' | 'result'
): DataInfo | null {
  if (!maimlData || !templateId) return null;

  let parser: MaimlParserTyped;
  try {
    parser = new MaimlParserTyped(maimlData);
  } catch (e) {
    console.error('[maimlDataExtractor] MaimlParserTyped 初期化エラー:', e);
    return null;
  }

  const root = parser.getTypedMaiml();
  if (!root.data) {
    console.log(`[maimlDataExtractor] <data>セクションが存在しません: templateId=${templateId}`);
    return null;
  }

  const dataSection = root.data;
  const resultsList = dataSection.results ?? [];

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

    const dataInfo: DataInfo = {};

    // Results 基本情報
    if (results.id) dataInfo.results_id = results.id;
    if (results.uuid) dataInfo.results_uuid = results.uuid;
    if (results.name) dataInfo.results_name = results.name;
    if (results.description) dataInfo.results_description = results.description;

    // 要素自体の基本情報
    if (found.uuid) dataInfo.uuid = found.uuid;
    if (found.description) dataInfo.description = found.description;

    // property 要素を DataPropertyObject に変換
    const props = found.properties ?? [];
    props.forEach((prop) => {
      if (!prop.key) return;
      dataInfo[`property_${prop.key}`] = propertyToDataPropertyObject(prop);
    });

    console.log(`✅ [maimlDataExtractor] DataInfo構築完了: ${Object.keys(dataInfo).length}件`);
    return dataInfo;
  }

  console.log(`⚠️ [maimlDataExtractor] 該当Data要素なし: templateId=${templateId}, type=${templateType}`);
  return null;
}
