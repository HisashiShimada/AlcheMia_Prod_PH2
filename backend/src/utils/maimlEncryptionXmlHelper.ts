/**
 * MAIML 暗号化 XML 操作ユーティリティ
 *
 * @remarks
 * MAIMLファイル内の要素を `<EncryptedData>` に置換する処理、
 * および `<EncryptedData>` から `CipherResult` を抽出する処理を提供する。
 *
 * 依存ライブラリ: `@xmldom/xmldom`（既存コードと同じパーサーを使用）
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { CipherResult, InsertionRefs } from '../types/encryptionTypes';
import { getEncryptableElementNames } from './maimlSchemaHelper';

// ---------------------------------------------------------------------------
// 内部定数
// ---------------------------------------------------------------------------

const XENC_NS = 'http://www.w3.org/2001/04/xmlenc#';
const XDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';

// ---------------------------------------------------------------------------
// <EncryptedData> XML 生成
// ---------------------------------------------------------------------------

/**
 * CipherResult から W3C XML Encryption Core 1.1 準拠の `<xenc:EncryptedData>` XML 文字列を生成する。
 *
 * @param cipherResult 暗号化結果（`maimlEncryptionService.encryptElement` の戻り値）
 * @param insertionRefXml `<childUri>`/`<childHash>`/`<childUuid>` の XML フラグメント（挿入する場合）
 * @returns `<xenc:EncryptedData>...</xenc:EncryptedData>` XML 文字列
 */
export function buildEncryptedDataXml(
  cipherResult: CipherResult,
  insertionRefXml?: string,
): string {
  const insertionBlock = insertionRefXml ? `\n${insertionRefXml}` : '';
  return [
    `<xenc:EncryptedData`,
    ` xmlns:xenc="${XENC_NS}"`,
    ` xmlns:ds="${XDSIG_NS}"`,
    ` Id="${cipherResult.encryptionId}"`,
    ` Type="${XENC_NS}Element"`,
    `>`,
    `  <xenc:EncryptionMethod Algorithm="${cipherResult.algorithmUri}"/>`,
    `  <ds:KeyInfo>`,
    `    <ds:KeyName>${escapeXml(cipherResult.keyId)}</ds:KeyName>`,
    `  </ds:KeyInfo>`,
    `  <xenc:CipherData>`,
    `    <xenc:CipherValue>${cipherResult.cipherValueBase64}</xenc:CipherValue>`,
    `  </xenc:CipherData>`,
    `</xenc:EncryptedData>${insertionBlock}`,
  ].join('');
}

// ---------------------------------------------------------------------------
// <EncryptedData> → CipherResult 抽出
// ---------------------------------------------------------------------------

/**
 * XML 文字列から `<xenc:EncryptedData>` の内容を解析して `CipherResult` を抽出する。
 *
 * @param xmlContent 検索対象の XML 文字列（MAIML 全体またはその一部）
 * @param encryptionId 取得対象の `EncryptedData` の Id 属性（省略時は最初の要素を返す）
 * @returns 解析した `CipherResult`、見つからない場合は null
 */
export function extractCipherResultFromXml(
  xmlContent: string,
  encryptionId?: string,
): CipherResult | null {
  const parser = new DOMParser();

  // EncryptedData を含む XML をパース（ルートラッパーが必要な場合があるため追加）
  let doc: Document;
  try {
    doc = parser.parseFromString(xmlContent, 'text/xml');
    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      // ルートラッパーを付けて再試行
      doc = parser.parseFromString(`<root>${xmlContent}</root>`, 'text/xml');
    }
  } catch {
    return null;
  }

  // <xenc:EncryptedData> または <EncryptedData> を探す
  const encDataElements = [
    ...Array.from(doc.getElementsByTagNameNS(XENC_NS, 'EncryptedData')),
    ...Array.from(doc.getElementsByTagName('xenc:EncryptedData')),
    ...Array.from(doc.getElementsByTagName('EncryptedData')),
  ];

  let target: Element | null = null;
  if (encryptionId) {
    target = encDataElements.find(
      (el) => el.getAttribute('Id') === encryptionId,
    ) ?? null;
  } else {
    target = encDataElements[0] ?? null;
  }

  if (!target) return null;

  // Id 属性（encryptionId）
  const id = target.getAttribute('Id') ?? '';

  // EncryptionMethod/@Algorithm → algorithmUri
  const methodEl =
    target.getElementsByTagNameNS(XENC_NS, 'EncryptionMethod')[0] ??
    target.getElementsByTagName('xenc:EncryptionMethod')[0] ??
    target.getElementsByTagName('EncryptionMethod')[0];
  const algorithmUri = methodEl?.getAttribute('Algorithm') ?? '';

  // ds:KeyName → keyId
  const keyNameEl =
    target.getElementsByTagNameNS(XDSIG_NS, 'KeyName')[0] ??
    target.getElementsByTagName('ds:KeyName')[0] ??
    target.getElementsByTagName('KeyName')[0];
  const keyId = keyNameEl?.textContent?.trim() ?? '';

  // xenc:CipherValue → cipherValueBase64
  const cipherValEl =
    target.getElementsByTagNameNS(XENC_NS, 'CipherValue')[0] ??
    target.getElementsByTagName('xenc:CipherValue')[0] ??
    target.getElementsByTagName('CipherValue')[0];
  const cipherValueBase64 = cipherValEl?.textContent?.trim() ?? '';

  if (!algorithmUri || !cipherValueBase64) return null;

  return {
    encryptionId: id,
    keyId,
    cipherValueBase64,
    algorithmUri,
    encryptedAt: '',  // 抽出時は不明
  };
}

// ---------------------------------------------------------------------------
// XML 内の要素を取得
// ---------------------------------------------------------------------------

/**
 * targetPath 形式でMAIML XML から対象要素を検索して XML 文字列として返す。
 *
 * @remarks
 * targetPath 形式の解釈（優先順位順）:
 *   1. `#id=xxx` → id="xxx" 属性を持つ要素を探す
 *   2. `tagName` → 単純なタグ名（最初にマッチした要素）
 *   3. `parent/child` → 親タグ名 / 子タグ名 のパス（単純実装）
 *
 * @param xmlContent 検索対象の MAIML XML 文字列
 * @param targetPath フロントエンドから送られるパス文字列
 * @returns 対象要素の XML 文字列、見つからない場合は null
 */
export function getElementXmlByTargetPath(
  xmlContent: string,
  targetPath: string,
): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const parseErrors = doc.getElementsByTagName('parsererror');
  if (parseErrors.length > 0) return null;

  const element = findElementByTargetPath(doc, targetPath);
  if (!element) return null;

  const serializer = new XMLSerializer();
  return serializer.serializeToString(element);
}

/**
 * XML文書から targetPath に対応する要素を返す（内部ヘルパー）
 */
function findElementByTargetPath(
  doc: Document,
  targetPath: string,
): Element | null {
  // パターン1: "#id=value" 形式
  const idMatch = targetPath.match(/^#?id=(.+)$/i);
  if (idMatch) {
    const id = idMatch[1];
    return findElementById(doc.documentElement, id);
  }

  // パターン2: "parent/child" 形式（スラッシュ区切り）
  if (targetPath.includes('/')) {
    const parts = targetPath.split('/').filter(Boolean);
    let current: Element | null = doc.documentElement;
    for (const part of parts) {
      if (!current) return null;
      const tagPart = part.replace(/\[.*\]$/, '').trim(); // 属性フィルタを除去
      const attrMatch = part.match(/\[(.+?)=["']?(.+?)["']?\]/);
      const children: Element[] = Array.from(current.getElementsByTagName('*'));
      const found: Element | undefined = children.find((el: Element) => {
        if (el.nodeName !== tagPart && el.localName !== tagPart) return false;
        if (attrMatch) {
          return el.getAttribute(attrMatch[1]) === attrMatch[2];
        }
        return true;
      });
      current = found ?? null;
    }
    return current;
  }

  // パターン3: 単純タグ名
  const tagName = targetPath.trim();
  const elements = doc.getElementsByTagName(tagName);
  return elements.length > 0 ? elements.item(0) : null;
}

/**
 * id 属性で要素を再帰的に検索する
 */
function findElementById(element: Element, id: string): Element | null {
  if (element.getAttribute('id') === id || element.getAttribute('Id') === id) {
    return element;
  }
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i);
    if (child && child.nodeType === 1) {
      const found = findElementById(child as Element, id);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// XML 内の要素を置換
// ---------------------------------------------------------------------------

/**
 * XML 文字列内の指定要素を別の XML 文字列で置換する。
 *
 * @remarks
 * 処理手順:
 *   1. DOMParser で XML を解析して対象要素を特定
 *   2. XMLSerializer で対象要素の文字列表現を取得
 *   3. 文字列置換で `replacementXml` に差し替え
 *
 * @param xmlContent 元の XML 文字列
 * @param targetPath 置換対象のパス
 * @param replacementXml 置換後の XML 文字列
 * @returns 置換後の XML 文字列。対象が見つからない場合は元の文字列を返す
 */
export function replaceElementInXml(
  xmlContent: string,
  targetPath: string,
  replacementXml: string,
): { updated: string; replaced: boolean } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const parseErrors = doc.getElementsByTagName('parsererror');
  if (parseErrors.length > 0) {
    return { updated: xmlContent, replaced: false };
  }

  const element = findElementByTargetPath(doc, targetPath);
  if (!element) {
    return { updated: xmlContent, replaced: false };
  }

  const serializer = new XMLSerializer();
  const originalXml = serializer.serializeToString(element);

  // 文字列置換（最初にマッチした箇所のみ置換）
  const updated = xmlContent.replace(originalXml, replacementXml);
  const replaced = updated !== xmlContent;

  return { updated, replaced };
}

// ---------------------------------------------------------------------------
// EncryptedData 要素の一覧収集
// ---------------------------------------------------------------------------

/**
 * MAIML XML 内の全 `<EncryptedData>` 要素を収集して情報リストを返す。
 *
 * @param xmlContent MAIML XML 文字列
 * @returns 暗号化済み要素情報の配列
 */
export function findEncryptedDataElements(
  xmlContent: string,
): EncryptedElementInfo[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const parseErrors = doc.getElementsByTagName('parsererror');
  if (parseErrors.length > 0) return [];

  const encDataElements = [
    ...Array.from(doc.getElementsByTagNameNS(XENC_NS, 'EncryptedData')),
    ...Array.from(doc.getElementsByTagName('xenc:EncryptedData')),
    ...Array.from(doc.getElementsByTagName('EncryptedData')),
  ];

  // 重複除去（同じ要素が複数のgetElementsBy* にヒットする場合がある）
  const unique = deduplicateElements(encDataElements);

  return unique.map((el) => {
    const id = el.getAttribute('Id') ?? '';

    const methodEl =
      el.getElementsByTagNameNS(XENC_NS, 'EncryptionMethod')[0] ??
      el.getElementsByTagName('xenc:EncryptionMethod')[0] ??
      el.getElementsByTagName('EncryptionMethod')[0];
    const algorithmUri = methodEl?.getAttribute('Algorithm') ?? '';

    const keyNameEl =
      el.getElementsByTagNameNS(XDSIG_NS, 'KeyName')[0] ??
      el.getElementsByTagName('ds:KeyName')[0] ??
      el.getElementsByTagName('KeyName')[0];
    const keyId = keyNameEl?.textContent?.trim() ?? '';

    // 親要素のパスを生成（簡易）
    const parentPath = getSimpleElementPath(el);

    return {
      encryptionId: id,
      algorithmUri,
      keyId,
      parentPath,
    };
  });
}

/**
 * DOM 要素の重複を参照比較で除去する（内部ヘルパー）
 */
function deduplicateElements(elements: Element[]): Element[] {
  const seen = new Set<Element>();
  return elements.filter((el) => {
    if (seen.has(el)) return false;
    seen.add(el);
    return true;
  });
}

/**
 * 要素の簡易パス（タグ名の連結）を生成する（内部ヘルパー）
 */
function getSimpleElementPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeName !== '#document') {
    const id = current.getAttribute('Id') ?? current.getAttribute('id');
    parts.unshift(id ? `${current.localName ?? current.nodeName}[@id="${id}"]` : (current.localName ?? current.nodeName));
    current = current.parentElement ?? (current.parentNode as Element | null);
  }
  return '/' + parts.join('/');
}

// ---------------------------------------------------------------------------
// MAIML ツリー構造生成
// ---------------------------------------------------------------------------

/**
 * MAIML XML をパースして暗号化対象ツリーを生成する。
 *
 * @remarks
 * 暗号化可能な要素（`isEncryptable: true`）の判定基準:
 *   - `maimlSchemaHelper.ts` の `getEncryptableElementNames()` が返す XSD 解析結果に基づく
 *   - XSD 上で `xs:choice` に `encryptionGroup` を持つ型に対応する要素のみ `true`
 *   - Petri Net 構造要素（`place`, `transition`, `arc`）は XSD 上 encryptionGroup を持たないため `false`
 *   - ルート要素（`maiml`）は対象外
 *
 * @param xmlContent MAIML XML 文字列
 * @returns ツリーノードの配列（ルートレベル）
 */
export async function parseMaimlToEncryptionTree(
  xmlContent: string,
): Promise<MaimlTreeNode[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const parseErrors = doc.getElementsByTagName('parseerror');
  if (parseErrors.length > 0) return [];

  // XSD 解析結果から暗号化可能要素名の集合を取得
  // （getEncryptableElementNames が XSD を動的解析しキャッシュするため、
  //   2回目以降はキャッシュから即時返却される）
  const encryptableTags = await getEncryptableElementNames();

  return buildTreeNodes(doc.documentElement, '', encryptableTags);
}

/**
 * DOM ノードから再帰的にツリーを構築する（内部ヘルパー）
 *
 * @param element 現在の DOM 要素
 * @param parentPath 親要素のパス文字列
 * @param encryptableTags XSD 解析結果から取得した暗号化可能要素名の Set
 */
function buildTreeNodes(
  element: Element,
  parentPath: string,
  encryptableTags: Set<string>,
): MaimlTreeNode[] {
  const nodes: MaimlTreeNode[] = [];

  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i);
    if (!child || child.nodeType !== 1) continue; // 要素ノードのみ

    const el = child as Element;
    const tagName = el.localName ?? el.nodeName;
    const id = el.getAttribute('Id') ?? el.getAttribute('id') ?? el.getAttribute('name') ?? `${tagName}-${i}`;
    const path = `${parentPath}/${tagName}[@id="${id}"]`;

    // <EncryptedData> の存在確認（isEncrypted）
    const encDataEls = el.getElementsByTagNameNS(XENC_NS, 'EncryptedData');
    const encDataEls2 = el.getElementsByTagName('xenc:EncryptedData');
    const encDataEls3 = el.getElementsByTagName('EncryptedData');
    const isEncrypted = encDataEls.length > 0 || encDataEls2.length > 0 || encDataEls3.length > 0;

    const node: MaimlTreeNode = {
      id,
      tagName,
      path,
      label: el.getAttribute('name') ?? el.getAttribute('id') ?? tagName,
      // XSD 解析結果に基づいて isEncryptable を判定（ハードコードを廃止）
      isEncryptable: encryptableTags.has(tagName),
      isEncrypted,
      children: buildTreeNodes(el, path, encryptableTags),
    };

    nodes.push(node);
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// 型定義（Controller / types から参照）
// ---------------------------------------------------------------------------

/**
 * MAIML ツリーノード（暗号化対象ツリー用）
 */
export interface MaimlTreeNode {
  /** ノードの ID（タグ id 属性または自動採番） */
  id: string;
  /** XML タグ名 */
  tagName: string;
  /** ツリーパス */
  path: string;
  /** 表示ラベル */
  label: string;
  /** 暗号化可能かどうか */
  isEncryptable: boolean;
  /** 現在暗号化済みかどうか */
  isEncrypted: boolean;
  /** 子ノード */
  children: MaimlTreeNode[];
}

/**
 * 暗号化済み要素情報
 */
export interface EncryptedElementInfo {
  /** EncryptedData の Id 属性 */
  encryptionId: string;
  /** 使用アルゴリズムの URI */
  algorithmUri: string;
  /** 暗号化に使用した鍵 ID */
  keyId: string;
  /** 親要素のパス（簡易） */
  parentPath: string;
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * XML 特殊文字をエスケープする
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * InsertionRefs 配列から `<childUri>/<childHash>/<childUuid>` XML フラグメントを生成する。
 *
 * @param refs InsertionRefs の配列（`maimlEncryptionService.extractInsertionRefs` の戻り値）
 * @returns XML フラグメント文字列（挿入用）。空の場合は空文字列
 */
export function buildChildRefsXml(refs: InsertionRefs[]): string {
  if (refs.length === 0) return '';
  return refs
    .map(
      (ref) =>
        `<childUri>${escapeXml(ref.uri)}</childUri>\n` +
        `<childHash>${escapeXml(ref.hash)}</childHash>\n` +
        `<childUuid>${escapeXml(ref.uuid)}</childUuid>`,
    )
    .join('\n');
}
