/**
 * MAIML Document UUID 操作ユーティリティ
 *
 * saveMaiML() での Document UUID 自動更新処理に使用する。
 *
 * ## 設計方針
 * - MAIML規約「ファイルの内容が変わった場合は <Document>/<uuid> を更新する」に準拠
 * - UUID は XML 属性ではなく子要素 <uuid>...</uuid> として定義されている（小文字タグ）
 * - 正規表現による文字列操作で実装（XMLライブラリの全パース・シリアライズは不要）
 *   - 根拠: maimlParentInjector.ts が同様の正規表現パターンで実績あり
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * <document> 直下の <uuid>...</uuid> にマッチする正規表現
 *
 * - タグ名は小文字 `document`（MAIML XML の実際の形式に合わせる）
 * - `[\s\S]*?` で <document> 開始タグ直後から最初の <uuid> までを最短マッチ
 * - `[^<]*` で UUID 値部分（< を含まない文字列）を取得
 */
const DOCUMENT_UUID_PATTERN = /(<document[^>]*>[\s\S]*?<uuid>)[^<]*(<\/uuid>)/;

/**
 * MAIML XML 文字列の <document> 直下 <uuid> を新しい uuidv4() で置換する
 *
 * @param content - 元の MAIML XML 文字列
 * @returns UUID が置換された MAIML XML 文字列。<document>/<uuid> が存在しない場合は元の文字列を返す
 */
export function updateDocumentUuid(content: string): string {
  return content.replace(DOCUMENT_UUID_PATTERN, `$1${uuidv4()}$2`);
}

/**
 * MAIML XML 文字列を差分比較用に正規化する
 *
 * 以下の処理を行う:
 * 1. <document>/<uuid> の値を固定プレースホルダーに置換（UUID の変化を差分として扱わない）
 * 2. 空白・改行の正規化（フロントエンドの XML 再生成による書式差異を吸収）
 *    - タグ間の空白・改行を単一スペースに統一
 *    - 各行の先頭・末尾の空白を除去
 *    - 連続する空白を単一スペースに圧縮
 *
 * @param content - 元の MAIML XML 文字列
 * @returns 正規化された文字列（UUID プレースホルダー置換済み）
 */
export function normalizeForDiffCheck(content: string): string {
  // Step 1: Document UUID をプレースホルダーに置換
  const uuidNormalized = content.replace(DOCUMENT_UUID_PATTERN, '$1__UUID_PLACEHOLDER__$2');

  // Step 2: 空白・改行の正規化
  return uuidNormalized
    // タグ間の改行・複数空白をシングルスペースに統一
    .replace(/>\s+</g, '><')
    // 行頭・行末の空白を除去
    .replace(/^\s+|\s+$/gm, '')
    // 連続する空白をシングルスペースに圧縮
    .replace(/\s{2,}/g, ' ')
    // 全体の前後の空白を除去
    .trim();
}

