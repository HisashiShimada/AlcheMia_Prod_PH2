/**
 * 日時フォーマットユーティリティ
 */

/**
 * YYYYMMDDhhmmss 形式の日時文字列を yyyy/MM/dd hh:mm 形式に変換
 * @param dateTimeStr 変換対象の日時文字列（YYYYMMDDhhmmss形式）
 * @returns フォーマット済み日時文字列（yyyy/MM/dd hh:mm形式）
 * @example
 * formatDateTime('20240126143000') // => '2024/01/26 14:30'
 * formatDateTime('-') // => '-'
 * formatDateTime('') // => '-'
 */
export const formatDateTime = (dateTimeStr: string): string => {
  if (!dateTimeStr || dateTimeStr === '-') return '-';
  
  if (dateTimeStr.length >= 12) {
    const year = dateTimeStr.substring(0, 4);
    const month = dateTimeStr.substring(4, 6);
    const day = dateTimeStr.substring(6, 8);
    const hour = dateTimeStr.substring(8, 10);
    const minute = dateTimeStr.substring(10, 12);
    return `${year}/${month}/${day} ${hour}:${minute}`;
  }
  
  return dateTimeStr;
};