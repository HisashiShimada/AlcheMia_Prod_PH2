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
 *
 * injectParentTag() はParentタグ挿入後にDocument直下の <uuid> を再採番する。
 */

/**
 * MAIMLのバッファからSHA-256ハッシュをBase64エンコードして返す
 */
export function computeSha256Base64(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('base64');
}

/**
 * MAIMLコンテンツの `<document>` 直下の `<uuid>` 要素を新しいUUIDで置換する
 *
 * `<document>` 開始タグ直後の最初の `<uuid>...</uuid>` のみを置換する。
 * 子要素（parent等）内の `<uuid>` は置換しない。
 *
 * @param maimlContent - MAIML XML文字列
 * @param newUuid      - 置換後のUUID
 * @returns 置換後のMAIML XML文字列
 */
function replaceDocumentUuid(maimlContent: string, newUuid: string): string {
  // <document ...> の開始タグを検索
  const documentTagMatch = maimlContent.match(/<document(\s[^>]*)?>/);
  if (!documentTagMatch || documentTagMatch.index === undefined) {
    console.warn('[maimlParentInjector] replaceDocumentUuid: <document> タグが見つかりませんでした。');
    return maimlContent;
  }

  const documentTagEndIndex = documentTagMatch.index + documentTagMatch[0].length;

  // <document> 直後から最初の <uuid> を検索する
  // ただし他タグ（<parent>等）が <uuid> より先に来る場合は Document直下ではないため置換しない
  const afterDocument = maimlContent.substring(documentTagEndIndex);

  // <uuid> と他の開始タグのどちらが先に出現するかを確認
  // ※ <parent> や <procedure> などが <uuid> より前に来る場合は Document直下の <uuid> がない
  const uuidIdx = afterDocument.indexOf('<uuid>');
  if (uuidIdx === -1) {
    console.warn('[maimlParentInjector] replaceDocumentUuid: <document> 直下に <uuid> が見つかりませんでした。');
    return maimlContent;
  }

  // <uuid> より前に他の開始タグが存在するかチェック（空白・改行は除く）
  // ※ </xxx> 終了タグや <?xml...?> は無視、<xxx> 開始タグが先にあれば Document直下ではない
  const beforeUuid = afterDocument.substring(0, uuidIdx);
  // 他の開始タグ（<parent>, <procedure> 等）が <uuid> より前にある場合はスキップ
  const otherOpenTagMatch = beforeUuid.match(/<(?!\/)[^!?][^>]*>/);
  if (otherOpenTagMatch) {
    console.warn(
      `[maimlParentInjector] replaceDocumentUuid: <uuid> より前に別タグ "${otherOpenTagMatch[0]}" が検出されました。置換をスキップします。`
    );
    return maimlContent;
  }

  // </uuid> を検索
  const uuidEndTag = '</uuid>';
  const uuidCloseIdx = afterDocument.indexOf(uuidEndTag, uuidIdx);
  if (uuidCloseIdx === -1) {
    console.warn('[maimlParentInjector] replaceDocumentUuid: </uuid> が見つかりませんでした。');
    return maimlContent;
  }

  // 置換: documentTagEndIndex + uuidIdx ～ uuidCloseIdx + uuidEndTag.length の範囲
  const absoluteUuidStart = documentTagEndIndex + uuidIdx;
  const absoluteUuidEnd = documentTagEndIndex + uuidCloseIdx + uuidEndTag.length;

  const replaced =
    maimlContent.substring(0, absoluteUuidStart) +
    `<uuid>${newUuid}</uuid>` +
    maimlContent.substring(absoluteUuidEnd);

  return replaced;
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
    // 外側の <parent><uuid>...</uuid><hash>...</hash> 部分を除いて内側を渡す
    const innerContent = parentBlock.block;
    // 外側タグの uuid と hash を除いた内側の <parent> を探す
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

    const withParent =
      maimlContent.substring(0, documentTagEndIndex) +
      newDocumentInner +
      maimlContent.substring(documentCloseIndex);

    // Parentタグ挿入後、Document直下の <uuid> を再採番
    const newDocumentUuid = crypto.randomUUID();
    const result = replaceDocumentUuid(withParent, newDocumentUuid);

    console.log(
      `[maimlParentInjector] 既存 <parent> をネストして新しい <parent> (uuid=${projectUuid}) を挿入しました。`
    );
    console.log(
      `[maimlParentInjector] Document UUID を再採番しました: ${newDocumentUuid}`
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
  const withParent = before + '\n' + newParentBlock + after;

  // Parentタグ挿入後、Document直下の <uuid> を再採番
  const newDocumentUuid = crypto.randomUUID();
  const result = replaceDocumentUuid(withParent, newDocumentUuid);

  console.log(
    `[maimlParentInjector] 新規 <parent> (uuid=${projectUuid}) を <document> 直下に挿入しました。`
  );
  console.log(
    `[maimlParentInjector] Document UUID を再採番しました: ${newDocumentUuid}`
  );
  return result;
}
