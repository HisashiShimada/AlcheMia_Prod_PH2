/**
 * サニタイゼーションユーティリティ
 * 
 * XSS攻撃を防ぐためのHTML特殊文字エスケープ機能を提供
 */

/**
 * HTML特殊文字をエスケープする
 * 
 * XSS攻撃を防ぐため、以下のHTML特殊文字をHTMLエンティティに変換:
 * - & → &amp;
 * - < → &lt;
 * - > → &gt;
 * - " → &quot;
 * - ' → &#39;
 * 
 * @param text - エスケープ対象のテキスト
 * @returns エスケープされたテキスト、nullまたはundefinedの場合はnull
 * 
 * @example
 * ```typescript
 * escapeHtml('<script>alert("XSS")</script>')
 * // => '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * 
 * escapeHtml(null)
 * // => null
 * ```
 */
export function escapeHtml(text: string | null | undefined): string | null {
  if (text === null || text === undefined) {
    return null;
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML特殊文字をアンエスケープする（将来の拡張用）
 * 
 * @param text - アンエスケープ対象のテキスト
 * @returns アンエスケープされたテキスト
 */
export function unescapeHtml(text: string | null | undefined): string | null {
  if (text === null || text === undefined) {
    return null;
  }

  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}