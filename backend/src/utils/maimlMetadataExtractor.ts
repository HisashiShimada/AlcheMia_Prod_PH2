/**
 * MAIML Metadata Extractor (Utility)
 * 
 * @description
 * MAIMLファイル（XML）からメタデータを抽出する純粋関数
 * 副作用なし、テスト容易
 * 
 * @remarks
 * storageService.tsから移動した処理を再構成
 * - extractMetadata → extractMetadataFromXML
 * - _extractFromNode → extractFromNode
 */

import { parseStringPromise } from 'xml2js';
import { MetaData } from '../types/maimlMetadata';

/**
 * MaiML XMLをパースしてメタデータ抽出
 * 
 * @param xmlContent - XML文字列
 * @returns 抽出されたメタデータ
 * @throws XMLパースエラー、メタデータ抽出エラー
 * 
 * @example
 * ```typescript
 * const xmlContent = '<maiml><document>...</document></maiml>';
 * const metadata = await extractMetadataFromXML(xmlContent);
 * console.log(metadata.document_name);
 * ```
 */
export async function extractMetadataFromXML(xmlContent: string): Promise<MetaData> {
  try {
    // XMLパース（xml2jsを使用）
    const parsedXML = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false
    });

    // メタデータオブジェクトの初期化
    const metadata: MetaData = {
      document_uuid: '',
      document_name: '',
      document_description: '',
      measurement_values: [],
      units: [],
      section_types: [],
      ids: [],
      refs: [],
      keys: [],
      elements: [],
      values: []
    };

    // Document情報抽出
    if (parsedXML.maiml?.document) {
      const doc = parsedXML.maiml.document;
      metadata.document_uuid = doc.uuid || doc['@_uuid'] || '';
      metadata.document_name = doc.name || doc['@_name'] || '';
      metadata.document_description = doc.description || '';
    }

    // 再帰的にXML全体を走査してメタデータ収集
    extractFromNode(parsedXML, metadata);

    // 重複削除（Setを使用）
    metadata.measurement_values = [...new Set(metadata.measurement_values)];
    metadata.units = [...new Set(metadata.units)];
    metadata.section_types = [...new Set(metadata.section_types)];
    metadata.ids = [...new Set(metadata.ids)];
    metadata.refs = [...new Set(metadata.refs)];
    metadata.keys = [...new Set(metadata.keys)];
    metadata.elements = [...new Set(metadata.elements)];
    metadata.values = [...new Set(metadata.values)];

    return metadata;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract metadata from XML: ${errorMessage}`);
  }
}

/**
 * 再帰的にXMLノードを走査してメタデータ収集
 * 
 * @param node - XMLノード
 * @param metadata - メタデータオブジェクト（参照渡しで更新）
 * @param parentKey - 親キー（オプション、再帰呼び出し時に使用）
 * 
 * @remarks
 * この関数は副作用あり（metadataオブジェクトを直接更新）
 * ただし、純粋関数extractMetadataFromXMLから呼ばれる内部関数として扱う
 * 
 * @example
 * ```typescript
 * const metadata: MetaData = { ... };
 * extractFromNode(parsedXML, metadata);
 * // metadataオブジェクトが更新される
 * ```
 */
export function extractFromNode(node: any, metadata: MetaData, parentKey = ''): void {
  // プリミティブ値の場合
  if (!node || typeof node !== 'object') {
    // プリミティブ値の場合、valuesに追加
    if (node && String(node).trim()) {
      metadata.values.push(String(node).trim());
    }
    return;
  }

  // 配列の場合
  if (Array.isArray(node)) {
    node.forEach(item => extractFromNode(item, metadata, parentKey));
    return;
  }

  // オブジェクトの場合、各プロパティを処理
  Object.keys(node).forEach(key => {
    const value = node[key];

    // Element名を収集（@_で始まらないキー）
    if (!key.startsWith('@_') && !key.startsWith('$')) {
      metadata.elements.push(key);
    }

    // 属性情報を収集
    // xml2js の mergeAttrs:true により XML属性は @_ プレフィックスなしで展開される
    // 例: <place id="condition-xxx" /> → { id: "condition-xxx" }（@_id ではない）
    if (key === 'id' && value && typeof value === 'string') {
      metadata.ids.push(value);
    }
    if (key === 'ref' && value && typeof value === 'string') {
      metadata.refs.push(value);
    }
    // アーク（arc）の接続元・接続先も refs に収集
    if (key === 'source' && value && typeof value === 'string') {
      metadata.refs.push(value);
    }
    if (key === 'target' && value && typeof value === 'string') {
      metadata.refs.push(value);
    }
    if (key === 'key' && value && typeof value === 'string') {
      metadata.keys.push(value);
    }

    // 測定値・単位を収集
    if ((key === 'value' || parentKey === 'measurement') && value) {
      const strValue = String(value).trim();
      // 数値に変換可能な場合のみ測定値として記録
      if (strValue && !isNaN(Number(strValue))) {
        metadata.measurement_values.push(strValue);
      }
    }
    if ((key === 'unit' || key === 'units') && value) {
      metadata.units.push(String(value));
    }

    // セクション種別を収集
    if ((key === 'section' || key === 'sectionType' || key === 'type') && value) {
      metadata.section_types.push(String(value));
    }

    // 再帰的に子ノードを処理
    if (typeof value === 'object') {
      extractFromNode(value, metadata, key);
    }
  });
}
