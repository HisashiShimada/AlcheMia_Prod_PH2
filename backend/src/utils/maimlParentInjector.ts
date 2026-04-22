import * as crypto from 'crypto';
import { MaimlParserTyped } from './maimlParserTyped';

/**
 * MAIMLコンテンツに <parent> タグを注入するユーティリティ
 *
 * XSD仕様（maiml-document.xsd / maiml-core.xsd）:
 * - parentType: uuid（必須）、hash（必須）、parent（0以上・再帰）
 * - hashType: xs:base64Binary の simpleContent + method 属性（オプション）
 *
 * 既存 <parent> がある場合はネストして来歴チェーンを保持する。
 * 同一 projectUuid を持つ <parent> が既に先頭にある場合のみスキップ（重複防止）。
 */

/**
 * MAIMLのバッファからSHA-256ハッシュをBase64エンコードして返す
 */
export function computeSha256Base64(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('base64');
}

/**
 * `<document>` 直下の `<parent>...</parent>` ブロック全体を抽出する
 * ネスト構造に対応するため深さカウントを使用する
 *
 * @param content `<document>` 開始タグ直後からの文字列
 * @returns { block: string; lineStart: number; lineEnd: number } または null
 *   lineStart: content 内で <parent> を含む行の開始位置（行頭の空白含む）
 *   lineEnd:   content 内で </parent> を含む行の終了位置（改行文字の直後まで）
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
 * ブロック文字列の各行の先頭に prefix を追加する（空行はそのまま）
 */
function addIndentToBlock(block: string, prefix: string): string {
  return block
    .split('\n')
    .map((line) => (line.trim() === '' ? line : `${prefix}${line}`))
    .join('\n');
}

/**
 * MAIMLコンテンツの `<document>` 直下に `<parent>` タグを挿入する
 *
 * 処理フロー:
 * 1. MaimlParserTyped でMAIMLをパースし document.parents の現状を確認
 * 2. projectUuid が falsy の場合はスキップ
 * 3. 先頭 parent の uuid が projectUuid と同一の場合は重複スキップ
 * 4. 既存 <parent> がある場合はネストして新しい <parent> に置換
 * 5. 既存 <parent> がない場合は <document> 直後に新規挿入
 *
 * @param maimlContent  元のMAIML XML文字列
 * @param projectUuid   プロジェクトのDocument UUID（project.project_uuid）
 * @param fileBuffer    元ファイルのBuffer（SHA-256計算用）
 * @returns             `<parent>` タグが挿入されたMAIML XML文字列
 */
export function injectParentTag(
  maimlContent: string,
  projectUuid: string | null | undefined,
  fileBuffer: Buffer
): string {
  // projectUuid が未設定の場合はスキップ
  if (!projectUuid) {
    console.log('[maimlParentInjector] projectUuid が未設定のため <parent> 挿入をスキップします。');
    return maimlContent;
  }

  // MaimlParserTyped でパースして document.parents の現状を確認
  let existingParentUuid: string | null = null;
  try {
    const parser = new MaimlParserTyped(maimlContent);
    const doc = parser.getDocument();
    if (doc.parents && doc.parents.length > 0) {
      existingParentUuid = doc.parents[0].uuid?.trim() ?? null;
    }
  } catch (parseError) {
    console.warn(
      '[maimlParentInjector] MaimlParserTypedパース失敗。<parent> 挿入をスキップします。',
      parseError instanceof Error ? parseError.message : parseError
    );
    return maimlContent;
  }

  // 同一UUIDの <parent> が既に先頭にある → 重複スキップ
  if (existingParentUuid === projectUuid) {
    console.log(
      `[maimlParentInjector] 同一 projectUuid (${projectUuid}) の <parent> が既に存在します。挿入をスキップします。`
    );
    return maimlContent;
  }

  // <document ...> の開始タグを検索
  const documentTagMatch = maimlContent.match(/<document(\s[^>]*)?>/);
  if (!documentTagMatch || documentTagMatch.index === undefined) {
    console.warn('[maimlParentInjector] <document> タグが見つかりませんでした。<parent> 挿入をスキップします。');
    return maimlContent;
  }

  const documentTagEndIndex = documentTagMatch.index + documentTagMatch[0].length;

  // </document> の位置を確認
  const documentCloseIndex = maimlContent.indexOf('</document>', documentTagEndIndex);
  if (documentCloseIndex === -1) {
    console.warn('[maimlParentInjector] </document> タグが見つかりませんでした。<parent> 挿入をスキップします。');
    return maimlContent;
  }

  // SHA-256ハッシュをBase64エンコードで計算
  const hashBase64 = computeSha256Base64(fileBuffer);

  // <document> 内側の文字列
  const documentInner = maimlContent.substring(documentTagEndIndex, documentCloseIndex);

  // インデントは固定4スペース（MAIMLのXMLフォーマット標準）
  const baseIndent = '    ';
  const childIndent = '      ';

  // 既存 <parent> ブロックを抽出（存在する場合はネスト）
  const existingParent = extractFirstParentBlock(documentInner);

  if (existingParent) {
    // 既存ブロックの絶対インデント（existingParent.indent）を除去して相対化してからネスト
    // block の先頭行（<parent>）はインデントなし、内部行は元の絶対インデントを持つため
    // indent 分を除去して相対インデントに揃えた上で childIndent を付与する
    const relativeBlock = existingParent.block
      .split('\n')
      .map((line) =>
        line.startsWith(existingParent.indent) ? line.substring(existingParent.indent.length) : line
      )
      .join('\n');
    const nestedBlock = addIndentToBlock(relativeBlock, childIndent);

    // 新しい <parent> ブロック（開始・終了タグは existingParent.indent で揃える）
    const newParentBlock = [
      `<parent>`,
      `${childIndent}<uuid>${projectUuid}</uuid>`,
      `${childIndent}<hash method="SHA-256">${hashBase64}</hash>`,
      nestedBlock,
      `${existingParent.indent}</parent>`,
    ].join('\n');

    // documentInner 内の既存 <parent> 行範囲（lineStart〜lineEnd）を置換
    // lineStart はインデント空白の先頭、lineEnd は </parent> 直後（改行含む）
    const before = documentInner.substring(0, existingParent.lineStart);
    const after = documentInner.substring(existingParent.lineEnd);

    // before の末尾に改行がある場合はそのまま、なければ追加
    const newDocumentInner =
      before +
      existingParent.indent +
      newParentBlock +
      '\n' +
      after;

    const result =
      maimlContent.substring(0, documentTagEndIndex) +
      newDocumentInner +
      maimlContent.substring(documentCloseIndex);

    console.log(
      `[maimlParentInjector] 既存 <parent> をネストして新しい <parent> (uuid=${projectUuid}) を挿入しました。`
    );
    return result;
  }

  // 既存 <parent> なし → <document> 開始タグ直後に新規挿入
  const newParentBlock = [
    `${baseIndent}<parent>`,
    `${childIndent}<uuid>${projectUuid}</uuid>`,
    `${childIndent}<hash method="SHA-256">${hashBase64}</hash>`,
    `${baseIndent}</parent>`,
  ].join('\n');

  const before = maimlContent.substring(0, documentTagEndIndex);
  const after = maimlContent.substring(documentTagEndIndex);
  const result = before + '\n' + newParentBlock + after;

  console.log(
    `[maimlParentInjector] 新規 <parent> (uuid=${projectUuid}) を <document> 直下に挿入しました。`
  );
  return result;
}
