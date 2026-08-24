/**
 * storageUriUtils.ts
 *
 * Insertion の <uri> 要素をストレージ種別に応じた正規 URI 形式で組み立てるユーティリティ。
 *
 * 環境変数:
 *   NEXT_PUBLIC_INSERTION_URI_SCHEME  - URI スキーム（'s3' または 'swift'）。デフォルト: 's3'
 *   NEXT_PUBLIC_INSERTION_URI_BUCKET  - バケット/コンテナ名。未設定時は後方互換フォールバック（キーをそのまま返す）
 *
 * 組み立て例:
 *   buildStorageUri('projects/sample/attachments/file.tif')
 *   → "s3://mmdpf-files-production/projects/sample/attachments/file.tif"   （S3環境）
 *   → "swift://mmdpf-files/projects/sample/attachments/file.tif"           （Swift環境）
 *   → "projects/sample/attachments/file.tif"                               （BUCKET未設定・後方互換）
 */

/** URI スキーム（環境変数 or デフォルト 's3'） */
const STORAGE_SCHEME =
  process.env.NEXT_PUBLIC_INSERTION_URI_SCHEME ?? 's3';

/** バケット/コンテナ名（環境変数。未設定時は空文字） */
const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_INSERTION_URI_BUCKET ?? '';

/**
 * ストレージキー（S3/Swift の相対パス）を正規 URI 形式に変換する。
 *
 * - `NEXT_PUBLIC_INSERTION_URI_BUCKET` が設定されている場合:
 *   `{SCHEME}://{BUCKET}/{key}` 形式で返す
 * - 未設定の場合:
 *   `key` をそのまま返す（後方互換フォールバック）
 *
 * @param key - ストレージキー（例: 'projects/sample/attachments/file.tif'）
 * @returns 正規 URI 文字列
 *
 * @example
 * // SCHEME=s3, BUCKET=mmdpf-files-production
 * buildStorageUri('projects/sample/attachments/file.tif')
 * // → "s3://mmdpf-files-production/projects/sample/attachments/file.tif"
 *
 * @example
 * // BUCKET 未設定（後方互換）
 * buildStorageUri('projects/sample/attachments/file.tif')
 * // → "projects/sample/attachments/file.tif"
 */
export function buildStorageUri(key: string): string {
  if (!STORAGE_BUCKET) {
    // BUCKET 未設定: 後方互換フォールバック（キーをそのまま返す）
    return key;
  }
  // 先頭のスラッシュを除去してから組み立てる
  const normalizedKey = key.replace(/^\/+/, '');
  return `${STORAGE_SCHEME}://${STORAGE_BUCKET}/${normalizedKey}`;
}

/**
 * URI がローカルファイル参照（`file:///` 始まり）かどうかを判定する。
 *
 * ブラウザのセキュリティ制約によりローカルファイルのフルパスは取得不可能なため、
 * `file:///ファイル名` 形式で記録されたURIはローカル参照とみなし、
 * 他の環境からは参照できない旨のガイダンス表示トリガーとして使用する。
 *
 * @param uri - 検査するURI文字列
 * @returns ローカルファイルURIであれば true
 *
 * @example
 * isLocalFileUri('file:///AB192026_C_2.tif') // → true
 * isLocalFileUri('s3://mmdpf-files/projects/sample/file.tif') // → false
 * isLocalFileUri('') // → false
 */
export function isLocalFileUri(uri: string): boolean {
  return uri.startsWith('file:///');
}
