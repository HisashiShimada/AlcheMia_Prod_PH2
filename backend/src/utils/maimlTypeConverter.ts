/**
 * MAIML Type Converter
 * xml2js出力をMAIML型定義に変換するユーティリティ
 * 
 * @description
 * xml2jsはXMLを以下の構造で出力します：
 * { uuid: { _text: "value" }, name: { _text: "value" } }
 * 
 * これを型定義に合わせて変換します：
 * { uuid: "value", name: "value" }
 */

/**
 * xml2jsの_text構造を抽出
 */
function extractTextValue(value: any): any {
  if (value === null || value === undefined) {
    return undefined;
  }
  
  // _textプロパティがある場合は抽出
  if (typeof value === 'object' && '_text' in value) {
    return value._text;
  }
  
  // 配列の場合は各要素を再帰的に処理
  if (Array.isArray(value)) {
    return value.map(extractTextValue);
  }
  
  // オブジェクトの場合は各プロパティを再帰的に処理
  if (typeof value === 'object') {
    const result: any = {};
    for (const key in value) {
      result[key] = extractTextValue(value[key]);
    }
    return result;
  }
  
  // プリミティブ値はそのまま返す
  return value;
}

/**
 * xml2js出力をMAIML型定義に変換
 * 
 * @example
 * const parsed = xmljs.xml2js(xmlString, { compact: true });
 * const document: DocumentType = convertToMaimlType(parsed.maiml.document);
 */
export function convertToMaimlType<T>(xmljsObject: any): T {
  return extractTextValue(xmljsObject) as T;
}

/**
 * 配列を正規化（単一要素の場合は配列に変換）
 */
export function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
