/**
 * MAIMLメタデータの型定義
 * 
 * @description
 * MAIMLファイル（XML）から抽出されるメタデータの型定義
 */

/**
 * MAIMLメタデータの型定義
 * 
 * @remarks
 * file_metadataテーブルのMAIML関連カラムに対応
 */
export interface MetaData {
  /** ドキュメントUUID */
  document_uuid: string;
  
  /** ドキュメント名 */
  document_name: string;
  
  /** ドキュメント説明 */
  document_description: string;
  
  /** 測定値の配列 */
  measurement_values: string[];
  
  /** 単位の配列 */
  units: string[];
  
  /** セクション種別の配列 */
  section_types: string[];
  
  /** ID属性の配列 */
  ids: string[];
  
  /** REF属性の配列 */
  refs: string[];
  
  /** KEY属性の配列 */
  keys: string[];
  
  /** 要素名の配列 */
  elements: string[];
  
  /** 値の配列 */
  values: string[];
}

/**
 * メタデータ抽出結果の型定義
 * 
 * @deprecated この型は使用されていません（将来の拡張用）
 */
export interface ExtractResult {
  success: boolean;
  fileKey: string;
  metadata?: MetaData;
  error?: string;
  stack?: string;
}
