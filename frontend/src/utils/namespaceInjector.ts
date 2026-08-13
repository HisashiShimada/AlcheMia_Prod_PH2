/**
 * MAIMLファイルへの名前空間宣言注入ユーティリティ
 *
 * バックエンドの `injectNamespaceDeclarations()` (backend/src/utils/maimlDataWriter.ts)
 * と同等のロジックをフロントエンドで実装する。
 *
 * 処理概要:
 *   - <maiml> 開きタグに xmlns:prefix="uri" 宣言を注入する
 *   - 既存のカスタム xmlns:xxx を除去して DB の内容で完全置換する
 *   - 標準プレフィックス（xsi / xenc / xs / xsd / xlink）は除去対象外として保持する
 *   - namespaces が空配列の場合はノーオペレーション（変更なし）
 *   - <maiml> タグが存在しない場合はそのまま返す
 *
 * @module namespaceInjector
 */

/**
 * 名前空間エントリ（prefix + uri のペア）
 */
export interface NamespaceEntry {
  prefix: string;
  uri: string;
  /** スコープキー（namespace.scope_key。organization_group_cd など） */
  scopeKey?: string;
  /** スコープ名（organization_group.organization_group_name） */
  scopeName?: string;
}

/**
 * 保護する標準プレフィックス
 * バックエンドの PROTECTED_PREFIXES と同一セット
 */
const PROTECTED_PREFIXES = new Set(['xsi', 'xenc', 'xs', 'xsd', 'xlink']);

/**
 * XML 特殊文字をエスケープする
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * MAIML XML 文字列の <maiml> 開きタグに xmlns:prefix="uri" 宣言を注入する
 *
 * - 既存の xmlns:xxx="..." 属性をすべて除去した上で、DB から取得した名前空間で上書きする（完全置換方式）
 * - namespaces が空配列の場合は何も変更せずそのまま返す（ノーオペレーション）
 * - xmlns="..." (プレフィックスなし) は除去対象外とし保持する
 * - <maiml> タグが存在しない場合はそのまま返す
 *
 * @param maimlContent - 更新前の MAIML XML 文字列
 * @param namespaces   - DB から取得した名前空間一覧（{prefix, uri}[]）
 * @returns 更新後の MAIML XML 文字列
 */
export function injectNamespacesToMaiml(
  maimlContent: string,
  namespaces: NamespaceEntry[]
): string {
  // 名前空間が空の場合はノーオペレーション
  if (namespaces.length === 0) {
    return maimlContent;
  }

  // <maiml ...> 開きタグ全体をキャプチャ（複数行にまたがる場合も考慮）
  const maimlTagMatch = maimlContent.match(/<maiml[\s\S]*?>/);
  if (!maimlTagMatch) {
    return maimlContent;
  }

  const originalTag = maimlTagMatch[0];

  // xmlns:prefix="uri" 形式の属性を除去（保護プレフィックスは保持）
  // xmlns="..." (プレフィックスなし) も除去して DB の内容で上書きする
  const tagWithoutNs = originalTag
    .replace(
      /\s+xmlns:([a-zA-Z0-9_.-]+)="[^"]*"/g,
      (match: string, prefix: string) => (PROTECTED_PREFIXES.has(prefix) ? match : '')
    )
    .replace(/\s+xmlns="[^"]*"/g, '');

  // DB の名前空間を xmlns 属性に変換
  // prefix が空の場合は xmlns="uri"、ある場合は xmlns:prefix="uri"
  const nsAttrs = namespaces
    .map(({ prefix, uri }) =>
      prefix ? `xmlns:${prefix}="${escapeXml(uri)}"` : `xmlns="${escapeXml(uri)}"`)
    .join('\n  ');

  // <maiml> の閉じ角括弧直前に名前空間属性を追加
  // 末尾が "/>" (自己閉じタグ) か ">" かで分岐
  let newTag: string;
  if (tagWithoutNs.endsWith('/>')) {
    newTag = tagWithoutNs.slice(0, -2).trimEnd() + '\n  ' + nsAttrs + '\n/>';
  } else {
    newTag = tagWithoutNs.slice(0, -1).trimEnd() + '\n  ' + nsAttrs + '\n>';
  }

  return maimlContent.replace(originalTag, newTag);
}
