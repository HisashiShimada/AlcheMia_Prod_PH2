/**
 * MAIMLコンテンツの <parent> タグ関連ユーティリティ（フロントエンド用）
 *
 * バックエンドの backend/src/utils/maimlParentInjector.ts と同等の処理のうち、
 * フロントエンドで必要な関数のみを実装する。
 * （injectParentTag / computeSha256Base64 はバックエンド専用のため含まない）
 */

/**
 * `<document>` 直下の `<parent>...</parent>` ブロック全体を抽出する
 * ネスト構造に対応するため深さカウントを使用する
 */
function extractFirstParentBlock(content: string): {
  block: string;
  indent: string;
  lineStart: number;
  lineEnd: number;
} | null {
  const endTag = '</parent>';

  // <parent> または <parent ...> の最初の出現を検索
  const idx1 = content.indexOf('<parent>');
  const idx2 = content.indexOf('<parent ');

  let tagStart = -1;
  if (idx1 === -1 && idx2 === -1) return null;
  if (idx1 === -1) tagStart = idx2;
  else if (idx2 === -1) tagStart = idx1;
  else tagStart = Math.min(idx1, idx2);

  // <parent> 直前の行頭まで遡ってインデント（空白）を取得
  let lineStart = tagStart;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }
  const indent = content.substring(lineStart, tagStart);

  // ネスト深さカウントで対応する </parent> を探す
  let depth = 0;
  let i = tagStart;

  while (i < content.length) {
    if (content.startsWith('<parent>', i) || content.startsWith('<parent ', i)) {
      depth++;
      const gtIndex = content.indexOf('>', i);
      if (gtIndex === -1) break;
      i = gtIndex + 1;
    } else if (content.startsWith(endTag, i)) {
      depth--;
      if (depth === 0) {
        const tagEndPos = i + endTag.length;
        // 行末の改行も含める
        const lineEnd = content[tagEndPos] === '\n' ? tagEndPos + 1 : tagEndPos;
        const block = content.substring(tagStart, tagEndPos);
        return { block, indent, lineStart, lineEnd };
      }
      i += endTag.length;
    } else {
      i++;
    }
  }

  return null;
}

/**
 * MAIMLコンテンツの `<parent>` タグチェーンを再帰的にたどり、UUID一覧を配列で返す
 *
 * 例:
 *   `<parent><uuid>A</uuid><parent><uuid>B</uuid></parent></parent>` → `["A", "B"]`
 *
 * @param maimlContent - MAIML XML文字列
 * @returns Parentチェーン内のUUID配列（先頭が最新）
 */
export function extractParentUuids(maimlContent: string): string[] {
  const uuids: string[] = [];

  // <document> 内側の文字列を取得
  const documentTagMatch = maimlContent.match(/<document(\s[^>]*)?>/);
  if (!documentTagMatch || documentTagMatch.index === undefined) {
    return uuids;
  }
  const documentTagEndIndex = documentTagMatch.index + documentTagMatch[0].length;
  const documentCloseIndex = maimlContent.indexOf('</document>', documentTagEndIndex);
  if (documentCloseIndex === -1) {
    return uuids;
  }
  const documentInner = maimlContent.substring(documentTagEndIndex, documentCloseIndex);

  // <parent> ブロックを再帰的にたどって <uuid> を収集
  function collectUuids(content: string): void {
    // 最初の <parent> ブロックを抽出
    const parentBlock = extractFirstParentBlock(content);
    if (!parentBlock) return;

    // <parent> ブロック内の最初の <uuid> を取得（直接子のみ）
    const uuidMatch = parentBlock.block.match(/<uuid>([^<]*)<\/uuid>/);
    if (uuidMatch) {
      const uuid = uuidMatch[1].trim();
      if (uuid) {
        uuids.push(uuid);
      }
    }

    // ネストされた <parent> を再帰的に処理
    const innerContent = parentBlock.block;
    const firstUuidEnd = innerContent.indexOf('</uuid>');
    const firstHashEnd = innerContent.indexOf('</hash>');
    const innerStart = Math.max(
      firstUuidEnd !== -1 ? firstUuidEnd + '</uuid>'.length : 0,
      firstHashEnd !== -1 ? firstHashEnd + '</hash>'.length : 0
    );
    if (innerStart > 0 && innerStart < innerContent.length) {
      collectUuids(innerContent.substring(innerStart));
    }
  }

  collectUuids(documentInner);
  return uuids;
}
