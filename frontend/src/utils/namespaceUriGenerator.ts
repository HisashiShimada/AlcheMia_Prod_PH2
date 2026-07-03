/**
 * 名前空間URI自動生成ユーティリティ
 *
 * URI生成ルール:
 *   https://{organization_cd}/{department_cd}/{unit_slug}/
 *   - チームなし: https://{org_cd}/{dept_cd}/
 *   - 部署なし:   https://{org_cd}/
 *   - 日本語スラッグは wanakana でローマ字化
 *
 * @module namespaceUriGenerator
 */

import { toRomaji } from 'wanakana';

/**
 * 文字列をURIスラッグに変換する
 * - 日本語（ひらがな・カタカナ・漢字）→ wanakana でローマ字化
 * - 空白・記号をハイフンに変換
 * - 英数字・ハイフン・アンダースコア以外を除去
 * - 小文字に統一
 *
 * @param text - 変換元テキスト
 * @returns URIスラッグ文字列
 */
function toSlug(text: string): string {
  if (!text) return '';

  // wanakana でローマ字化（日本語対応）
  const romanized = toRomaji(text, { upcaseKatakana: false });

  return romanized
    .toLowerCase()
    .replace(/\s+/g, '-')        // 空白→ハイフン
    .replace(/[^\w-]/g, '-')     // 英数字・アンダースコア・ハイフン以外→ハイフン
    .replace(/-+/g, '-')         // 連続ハイフンを1つに
    .replace(/^-|-$/g, '');      // 先頭・末尾のハイフン除去
}

/**
 * 名前空間URIを自動生成する
 *
 * @param organizationCd - 組織CD（必須）
 * @param departmentCd   - 部署CD（任意）
 * @param unitName       - チーム/ユニット名（任意）。日本語可。
 * @returns 生成されたURI文字列（末尾スラッシュ付き）
 *
 * @example
 * generateNamespaceUri('ORG001', 'RD', '材料解析チーム')
 * // => 'https://ORG001/RD/zairyoukaisekichiimu/'
 *
 * generateNamespaceUri('ORG001', 'RD')
 * // => 'https://ORG001/RD/'
 *
 * generateNamespaceUri('ORG001')
 * // => 'https://ORG001/'
 */
export function generateNamespaceUri(
  organizationCd: string,
  departmentCd?: string,
  unitName?: string,
): string {
  const orgPart = organizationCd.trim();
  if (!orgPart) return '';

  const parts: string[] = [orgPart];

  if (departmentCd?.trim()) {
    parts.push(departmentCd.trim());
  }

  if (unitName?.trim()) {
    const slug = toSlug(unitName.trim());
    if (slug) {
      parts.push(slug);
    }
  }

  return `https://${parts.join('/')}/`;
}
