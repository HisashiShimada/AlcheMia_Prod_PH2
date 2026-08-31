/**
 * 日時ユーティリティ
 *
 * TZ 環境変数（UTC / Asia/Tokyo 等）に依存せず、
 * 常に日本時間（JST = UTC+9）で日時を文字列化する共通関数を提供する。
 *
 * 【背景】
 * - DB の create_at / update_at は `TIMESTAMP WITHOUT TIME ZONE` 型で NOW()（UTC）が保存される
 * - サーバー環境は TZ=UTC のため、Date#getHours() 等のローカルメソッドは UTC 値を返す
 * - UTC オフセット (+9h) を明示的に加算してから getUTC* メソッドで取得することで
 *   TZ 環境変数に左右されない JST 変換を実現する
 */

/** JST オフセット（ミリ秒）: UTC+9 = 9 * 60 * 60 * 1000 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Date オブジェクトを日本時間（JST）の YYYYMMDDhhmmss 形式の文字列に変換する
 *
 * @param date - 変換対象の Date オブジェクト（null / undefined の場合は '-' を返す）
 * @returns YYYYMMDDhhmmss 形式の JST 文字列（例: "20260826120000"）、null の場合は "-"
 *
 * @example
 * // UTC 15:00 → JST 翌日 00:00
 * formatDateTimeJST(new Date('2026-08-26T15:00:00Z')) // => '20260827000000'
 *
 * // UTC 00:00 → JST 09:00
 * formatDateTimeJST(new Date('2026-08-26T00:00:00Z')) // => '20260826090000'
 */
export function formatDateTimeJST(date: Date | null | undefined): string {
  if (!date) return '-';

  try {
    // UTC タイムスタンプに JST オフセットを加算し、
    // getUTC* メソッドで "JST として解釈した" 各フィールドを取得する
    // ※ getUTCHours() を使うことで TZ 環境変数の影響を受けない
    const jstDate = new Date(date.getTime() + JST_OFFSET_MS);

    const year   = jstDate.getUTCFullYear();
    const month  = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day    = String(jstDate.getUTCDate()).padStart(2, '0');
    const hour   = String(jstDate.getUTCHours()).padStart(2, '0');
    const minute = String(jstDate.getUTCMinutes()).padStart(2, '0');
    const second = String(jstDate.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}${second}`;
  } catch (error) {
    console.error('dateUtils.formatDateTimeJST: Date format error:', error);
    return '-';
  }
}

/**
 * Date オブジェクトを日本時間（JST）の ISO8601 形式文字列に変換する
 *
 * `new Date().toISOString()` は常に UTC（末尾 `Z`）を返すため、
 * JST オフセット（+09:00）を明示したい箇所ではこの関数を使用する。
 *
 * @param date - 変換対象の Date オブジェクト
 * @returns ISO8601 形式の JST 文字列（例: "2026-08-31T12:00:00.000+09:00"）
 *
 * @example
 * // UTC 03:00 → JST 12:00
 * toJSTIsoString(new Date('2026-08-31T03:00:00.000Z')) // => '2026-08-31T12:00:00.000+09:00'
 */
export function toJSTIsoString(date: Date): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET_MS);
  return jstDate.toISOString().replace('Z', '+09:00');
}

/**
 * 現在の日本時間（JST）を YYYYMMDDhhmmss 形式の文字列として返す
 *
 * CSV ダウンロード時のファイル名タイムスタンプ等に使用する。
 *
 * @returns YYYYMMDDhhmmss 形式の JST 文字列（例: "20260826120000"）
 *
 * @example
 * getNowJST() // => '20260826120000'（JST 12:00 の場合）
 */
export function getNowJST(): string {
  return formatDateTimeJST(new Date());
}
