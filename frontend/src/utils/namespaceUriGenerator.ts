/**
 * 名前空間URI 自動生成ユーティリティ
 *
 * URI生成ルール:
 *   組織CD + 部署CD + チームスラッグ → https://{orgCd}/{deptCd}/{unitSlug}/
 *   組織CD + 部署CD のみ            → https://{orgCd}/{deptCd}/
 *   組織CD のみ                     → https://{orgCd}/
 *
 * 日本語ユニット名は wanakana を用いてローマ字スラッグ化する。
 */
import { toRomaji } from 'wanakana';

/**
 * 文字列をURI用スラッグに変換する。
 *
 * 変換ルール（優先順位順）:
 *  1. ひらがな・カタカナ → toRomaji() でローマ字化
 *  2. 全角英数字 → 半角に変換
 *  3. スペース（全角含む） → ハイフン `-` に変換
 *  4. アンダースコア `_` はそのまま保持
 *  5. 英数字・ハイフン・アンダースコア以外の文字を除去
 *  6. 小文字に統一
 *  7. 連続するハイフンを1つに圧縮
 *  8. 先頭・末尾のハイフンを除去
 */
export function toUriSlug(text: string): string {
  if (!text) return '';

  // ひらがな・カタカナをローマ字に変換
  let result = toRomaji(text);

  // 全角英数字 → 半角
  result = result.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );

  // 全角スペース → 半角スペース
  result = result.replace(/　/g, ' ');

  // スペース → ハイフン
  result = result.replace(/\s+/g, '-');

  // 英数字・ハイフン・アンダースコア以外の文字を除去
  result = result.replace(/[^a-zA-Z0-9\-_]/g, '');

  // 小文字に統一
  result = result.toLowerCase();

  // 連続ハイフンを1つに圧縮
  result = result.replace(/-{2,}/g, '-');

  // 先頭・末尾のハイフンを除去
  result = result.replace(/^-+|-+$/g, '');

  return result;
}

/**
 * 名前空間URIを自動生成する。
 *
 * @param organizationCd  組織CD（必須）
 * @param departmentCd    部署CD（省略可）
 * @param unitName        チーム/ユニット名（省略可、日本語可）
 * @returns 生成されたURI文字列
 *
 * @example
 * generateNamespaceUri('ORG001', 'RD', '分析チーム')
 * // → "https://ORG001/RD/bunsekichimu/"
 *
 * generateNamespaceUri('ORG001', 'RD')
 * // → "https://ORG001/RD/"
 *
 * generateNamespaceUri('ORG001')
 * // → "https://ORG001/"
 */
export function generateNamespaceUri(
  organizationCd: string,
  departmentCd?: string | null,
  unitName?: string | null,
): string {
  const base = `https://${organizationCd}`;

  const deptPart = departmentCd ? departmentCd.trim() : '';
  const unitSlug = unitName ? toUriSlug(unitName.trim()) : '';

  if (deptPart && unitSlug) {
    return `${base}/${deptPart}/${unitSlug}/`;
  }
  if (deptPart) {
    return `${base}/${deptPart}/`;
  }
  return `${base}/`;
}
