/**
 * 文字列バリデーション・サニタイゼーションユーティリティ
 * 
 * Phase3-4: VARCHAR長制限対応（2026-02-18）
 * 
 * 目的:
 * - DBのVARCHAR制約を超える文字列を自動的に切り詰める
 * - DBエラーを防止し、ユーザー体験を向上
 * - 切り詰め時は警告ログを出力
 */

/**
 * フィールド値をVARCHAR長制限に合わせて切り詰める
 * 
 * @description
 * DBのVARCHAR制約を超える文字列を自動的に切り詰める。
 * 切り詰め時は末尾3文字を'...'に置き換え、警告ログを出力する。
 * 
 * Reference版uploadRoutes.jsのtruncateField()を移植。
 * 
 * @param value 対象の値
 * @param maxLength 最大長
 * @param fieldName フィールド名（ログ用）
 * @returns 切り詰められた文字列（または元の値）
 * 
 * @example
 * ```typescript
 * const fileName = 'very_long_filename_that_exceeds_limit.maiml';
 * const truncated = truncateField(fileName, 50, 'fileName');
 * // 結果: 'very_long_filename_that_exceeds_limi...'
 * ```
 */
export function truncateField(
  value: string | null | undefined,
  maxLength: number,
  fieldName = 'field'
): string | null {
  // nullまたはundefinedの場合はそのまま返す
  if (value === null || value === undefined) {
    return value as null;
  }

  // 文字列に変換
  const stringValue = String(value);

  // 最大長以下の場合はそのまま返す
  if (stringValue.length <= maxLength) {
    return stringValue;
  }

  // 切り詰め（末尾3文字を'...'に置き換え）
  const truncated = stringValue.substring(0, maxLength - 3) + '...';

  // 警告ログ出力
  console.warn(
    `⚠️ [Validator] ${fieldName}が${maxLength}文字を超過:`,
    {
      original:
        stringValue.substring(0, 50) +
        (stringValue.length > 50 ? '...' : ''),
      originalLength: stringValue.length,
      truncated: truncated,
      truncatedLength: truncated.length,
    }
  );

  return truncated;
}

/**
 * 配列の各要素を切り詰める
 * 
 * @param values 対象の配列
 * @param maxLength 各要素の最大長
 * @param fieldName フィールド名（ログ用）
 * @returns 切り詰められた配列
 * 
 * @example
 * ```typescript
 * const keywords = ['keyword1', 'very_long_keyword_that_exceeds_limit'];
 * const truncated = truncateArrayFields(keywords, 50, 'search_keywords');
 * // 結果: ['keyword1', 'very_long_keyword_that_exceeds_limi...']
 * ```
 */
export function truncateArrayFields(
  values: (string | null | undefined)[] | null | undefined,
  maxLength: number,
  fieldName = 'field'
): (string | null)[] | null {
  if (!values) return values as null;

  return values.map((value, index) =>
    truncateField(value, maxLength, `${fieldName}[${index}]`)
  );
}

/**
 * file_metadataテーブルの各フィールドの最大長定義
 * 
 * これらの値はDBスキーマのVARCHAR長と一致させる必要があります。
 */
export const FILE_METADATA_MAX_LENGTHS = {
  /** ファイル名の最大長 */
  original_filename: 255,
  /** ファイルキー（S3パス）の最大長 */
  file_key: 500,
  /** ファイル拡張子の最大長 */
  file_extension: 10,
  /** ファイルカテゴリの最大長 */
  file_category: 50,
  /** 親フォルダパスの最大長 */
  parent_folder_path: 255,
  /** 検索キーワード（配列の各要素）の最大長 */
  search_keyword: 50,
} as const;
