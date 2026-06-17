/**
 * MAIMLファイルを暗号化管理UIのツリー構造（MaimlTreeNode[]）に変換するユーティリティ
 *
 * @remarks
 * ブラウザの DOMParser を使用してXMLをパースします。
 * SSR環境では使用不可（クライアントサイド専用）。
 *
 * 暗号化可否の判定基準（案A）:
 * - MAIML仕様 encrypted_data_summary.md の globalObjectContentGroup 対象型および property/content を暗号化可とする
 * - place, transition, arc は Petri Net 構造要素のため暗号化不可（グレーアウト）
 * - uuid, name, description, annotation 等のメタデータは暗号化不可
 */

import type { MaimlTreeNode } from '@/types/encryption';

// ---------------------------------------------------------------------------
// 暗号化可否判定
// ---------------------------------------------------------------------------

/**
 * 暗号化可能な要素タグ名のセット
 *
 * globalObjectContentGroup を持つ型（MAIML仕様 11項）:
 *   dataType, resultsType, materialType, conditionType, resultType,
 *   documentType, creatorType, vendorType, ownerType, instrumentType,
 *   protocolType, methodType, programType, instructionType,
 *   materialTemplateType, conditionTemplateType, resultTemplateType,
 *   eventLogType, logType, traceType, eventType, pnmlType
 *
 * property/content 系（maiml-property.xsd）:
 *   全 propertyBaseType 派生型、全 contentBaseType 派生型
 */
const ENCRYPTABLE_TAGS = new Set([
  // データオブジェクト
  'data',
  'results',
  'material',
  'condition',
  'result',
  // document セクション
  'document',
  'creator',
  'vendor',
  'owner',
  'instrument',
  // protocol セクション
  'protocol',
  'method',
  'pnml', // pnmlType は globalObjectContentGroup を持つ（案A: pnml全体は可、place/transition/arcは不可）
  'program',
  'instruction',
  // テンプレート
  'materialTemplate',
  'conditionTemplate',
  'resultTemplate',
  // ログ系
  'eventLog',
  'log',
  'trace',
  'event',
  // property / content（全派生型を含む）
  'property',
  'content',
]);

/**
 * 要素タグ名が暗号化可能かどうかを返す
 *
 * @param tagName - MAIML要素のタグ名
 * @returns true: 暗号化可能 / false: グレーアウト（disabled）
 */
export function isEncryptableElement(tagName: string): boolean {
  return ENCRYPTABLE_TAGS.has(tagName);
}

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

/**
 * XPath風の簡易パスを生成する（ツリーノードの一意識別用）
 */
function buildPath(parent: string, tag: string, id?: string): string {
  if (id) return `${parent}/${tag}[@id='${id}']`;
  return `${parent}/${tag}`;
}

/**
 * 子要素から `property` ノードリストを MaimlTreeNode[] に変換する
 */
function parseProperties(
  parentEl: Element,
  parentPath: string,
  tagName = 'property',
): MaimlTreeNode[] {
  const nodes: MaimlTreeNode[] = [];
  Array.from(parentEl.children).forEach((child) => {
    if (child.localName !== tagName) return;

    const key = child.getAttribute('key') ?? '';
    const xsiType =
      child.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type') ?? '';
    const units = child.getAttribute('units') ?? '';
    const label = units ? `${key} (${units})` : key;
    const path = `${parentPath}/property[@key='${key}']`;

    const childProps =
      xsiType === 'propertyListType' ? parseProperties(child, path, 'property') : undefined;

    nodes.push({
      id: path,
      path,
      tagName: 'property',
      key,
      label,
      isEncrypted: false,
      isEncryptable: true, // property は常に暗号化可能
      children: childProps && childProps.length > 0 ? childProps : undefined,
    });
  });
  return nodes;
}

/**
 * `<content>` 要素を MaimlTreeNode に変換する
 */
function parseContent(el: Element, parentPath: string): MaimlTreeNode | null {
  const eid = el.getAttribute('id') ?? el.getAttribute('key') ?? '';
  const key = el.getAttribute('key') ?? '';
  const axis = el.getAttribute('axis') ?? '';
  const size = el.getAttribute('size') ?? '';
  const label = axis ? `${key} [axis=${axis}, size=${size}]` : key;
  const path = `${parentPath}/content[@id='${eid}']`;
  return {
    id: path,
    path,
    tagName: 'content',
    key,
    label,
    isEncrypted: false,
    isEncryptable: true, // content は常に暗号化可能
  };
}

/**
 * program 配下のテンプレート要素（materialTemplate / conditionTemplate / resultTemplate）をパース
 */
function parseTemplate(el: Element, parentPath: string): MaimlTreeNode {
  const eid = el.getAttribute('id') ?? '';
  const tag = el.localName;
  const path = buildPath(parentPath, tag, eid);

  const children: MaimlTreeNode[] = [];
  Array.from(el.children).forEach((child) => {
    if (child.localName === 'property') {
      const key = child.getAttribute('key') ?? '';
      const xsiType =
        child.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type') ?? '';
      const units = child.getAttribute('units') ?? '';
      const label = units ? `${key} (${units})` : key;
      const propPath = `${path}/property[@key='${key}']`;
      const grandchildren =
        xsiType === 'propertyListType'
          ? [
              ...parseProperties(child, propPath, 'property'),
              ...Array.from(child.children)
                .filter((c) => c.localName === 'content')
                .map((c) => parseContent(c, propPath))
                .filter(Boolean) as MaimlTreeNode[],
            ]
          : undefined;
      children.push({
        id: propPath,
        path: propPath,
        tagName: 'property',
        key,
        label,
        isEncrypted: false,
        isEncryptable: true,
        children: grandchildren && grandchildren.length > 0 ? grandchildren : undefined,
      });
    } else if (child.localName === 'content') {
      const node = parseContent(child, path);
      if (node) children.push(node);
    }
  });

  const name =
    el.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim() ??
    el.getElementsByTagNameNS('*', 'description')[0]?.textContent?.trim() ??
    eid;

  const placeTypeMap: Record<string, 'Material' | 'Condition' | 'Result'> = {
    materialTemplate: 'Material',
    conditionTemplate: 'Condition',
    resultTemplate: 'Result',
  };

  return {
    id: path,
    path,
    tagName: tag,
    label: name,
    placeType: placeTypeMap[tag],
    isEncrypted: false,
    isEncryptable: isEncryptableElement(tag),
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * data > results 配下をパース（material / condition / property / content）
 */
function parseResultsNode(el: Element, parentPath: string): MaimlTreeNode {
  const eid = el.getAttribute('id') ?? '';
  const path = buildPath(parentPath, 'results', eid);

  let label = eid;
  const nameEl = el.querySelector(':scope > name');
  const descEl = el.querySelector(':scope > description');
  if (nameEl?.textContent?.trim()) label = nameEl.textContent.trim();
  else if (descEl?.textContent?.trim()) label = descEl.textContent.trim();

  const children: MaimlTreeNode[] = [];
  Array.from(el.children).forEach((child) => {
    const tag = child.localName;
    if (tag === 'material' || tag === 'condition') {
      const cid = child.getAttribute('id') ?? '';
      const ref = child.getAttribute('ref') ?? '';
      const cpath = `${path}/${tag}[@id='${cid}']`;
      const clabel = cid || ref;
      const props = parseProperties(child, cpath);
      children.push({
        id: cpath,
        path: cpath,
        tagName: tag,
        label: clabel,
        placeType: tag === 'material' ? 'Material' : 'Condition',
        isEncrypted: false,
        isEncryptable: isEncryptableElement(tag),
        children: props.length > 0 ? props : undefined,
      });
    } else if (tag === 'property') {
      const key = child.getAttribute('key') ?? '';
      const units = child.getAttribute('units') ?? '';
      const propPath = `${path}/property[@key='${key}']`;
      const propLabel = units ? `${key} (${units})` : key;
      children.push({
        id: propPath,
        path: propPath,
        tagName: 'property',
        key,
        label: propLabel,
        isEncrypted: false,
        isEncryptable: true,
      });
    } else if (tag === 'content') {
      const node = parseContent(child, path);
      if (node) children.push(node);
    }
  });

  return {
    id: path,
    path,
    tagName: 'results',
    label,
    isEncrypted: false,
    isEncryptable: true,
    children: children.length > 0 ? children : undefined,
  };
}

// ---------------------------------------------------------------------------
// メインパーサー
// ---------------------------------------------------------------------------

/**
 * MAIMLのXML文字列をパースして MaimlTreeNode[] に変換する
 *
 * @param xml - MAIMLファイルのXML文字列
 * @returns MaimlTreeNode の配列（ルートレベル: document, protocol, data）
 */
export function parseMaimlToEncryptionTree(xml: string): MaimlTreeNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const root = doc.documentElement;
  const rootPath = '/maiml';
  const result: MaimlTreeNode[] = [];

  // ----------------------------------------------------------------
  // 1. document ノード
  // ----------------------------------------------------------------
  const documentEl = root.querySelector(':scope > document');
  if (documentEl) {
    const docId = documentEl.getAttribute('id') ?? 'document';
    const docPath = buildPath(rootPath, 'document', docId);
    const docChildren: MaimlTreeNode[] = [];

    const subTags = ['creator', 'vendor', 'owner', 'instrument'];
    subTags.forEach((tag) => {
      const el = documentEl.querySelector(`:scope > ${tag}`);
      if (!el) return;
      const eid = el.getAttribute('id') ?? tag;
      const epath = buildPath(docPath, tag, eid);
      const nameEl = el.querySelector(':scope > name');
      const descEl = el.querySelector(':scope > description');
      const elabel = nameEl?.textContent?.trim() ?? descEl?.textContent?.trim() ?? eid;
      docChildren.push({
        id: epath,
        path: epath,
        tagName: tag,
        label: elabel,
        isEncrypted: false,
        isEncryptable: isEncryptableElement(tag),
      });
    });

    result.push({
      id: docPath,
      path: docPath,
      tagName: 'document',
      label: 'document',
      isEncrypted: false,
      isEncryptable: true,
      children: docChildren.length > 0 ? docChildren : undefined,
    });
  }

  // ----------------------------------------------------------------
  // 2. protocol > method > pnml + program
  // ----------------------------------------------------------------
  const protocolEl = root.querySelector(':scope > protocol');
  if (protocolEl) {
    const protocolId = protocolEl.getAttribute('id') ?? 'protocol';
    const protocolPath = buildPath(rootPath, 'protocol', protocolId);
    const protocolChildren: MaimlTreeNode[] = [];

    protocolEl.querySelectorAll(':scope > method').forEach((methodEl) => {
      const methodId = methodEl.getAttribute('id') ?? 'method';
      const methodPath = buildPath(protocolPath, 'method', methodId);
      const methodChildren: MaimlTreeNode[] = [];

      // --- pnml ---
      const pnmlEl = methodEl.querySelector(':scope > pnml');
      if (pnmlEl) {
        const pnmlId = pnmlEl.getAttribute('id') ?? 'pnml';
        const pnmlPath = buildPath(methodPath, 'pnml', pnmlId);
        const pnmlChildren: MaimlTreeNode[] = [];

        // place（案A: 暗号化不可）
        pnmlEl.querySelectorAll(':scope > place').forEach((pl) => {
          const pid = pl.getAttribute('id') ?? '';
          const ppath = `${pnmlPath}/place[@id='${pid}']`;
          pnmlChildren.push({
            id: ppath,
            path: ppath,
            tagName: 'place',
            label: pid,
            isEncrypted: false,
            isEncryptable: false, // place は暗号化不可（案A）
          });
        });

        // transition（案A: 暗号化不可）
        pnmlEl.querySelectorAll(':scope > transition').forEach((tr) => {
          const tid = tr.getAttribute('id') ?? '';
          const tpath = `${pnmlPath}/transition[@id='${tid}']`;
          pnmlChildren.push({
            id: tpath,
            path: tpath,
            tagName: 'transition',
            label: tid,
            isEncrypted: false,
            isEncryptable: false, // transition は暗号化不可（案A）
          });
        });

        // arc（案A: 暗号化不可）
        pnmlEl.querySelectorAll(':scope > arc').forEach((arc) => {
          const aid = arc.getAttribute('id') ?? '';
          const src = arc.getAttribute('source') ?? '';
          const tgt = arc.getAttribute('target') ?? '';
          const apath = `${pnmlPath}/arc[@id='${aid}']`;
          pnmlChildren.push({
            id: apath,
            path: apath,
            tagName: 'arc',
            label: `${src} → ${tgt}`,
            isEncrypted: false,
            isEncryptable: false, // arc は暗号化不可（案A）
          });
        });

        methodChildren.push({
          id: pnmlPath,
          path: pnmlPath,
          tagName: 'pnml',
          label: pnmlEl.querySelector(':scope > name')?.textContent?.trim() ?? 'pnml',
          isEncrypted: false,
          isEncryptable: true, // pnml全体は暗号化可能（案A）
          children: pnmlChildren.length > 0 ? pnmlChildren : undefined,
        });
      }

      // --- program ---
      const programEl = methodEl.querySelector(':scope > program');
      if (programEl) {
        const programId = programEl.getAttribute('id') ?? 'program';
        const programPath = buildPath(methodPath, 'program', programId);
        const programChildren: MaimlTreeNode[] = [];

        // instruction
        programEl.querySelectorAll(':scope > instruction').forEach((inst) => {
          const iid = inst.getAttribute('id') ?? '';
          const ipath = buildPath(programPath, 'instruction', iid);
          const descEl = inst.querySelector(':scope > description');
          programChildren.push({
            id: ipath,
            path: ipath,
            tagName: 'instruction',
            label: descEl?.textContent?.trim() ?? iid,
            isEncrypted: false,
            isEncryptable: true,
          });
        });

        // materialTemplate / conditionTemplate / resultTemplate
        ['materialTemplate', 'conditionTemplate', 'resultTemplate'].forEach((tag) => {
          programEl.querySelectorAll(`:scope > ${tag}`).forEach((tpl) => {
            programChildren.push(parseTemplate(tpl, programPath));
          });
        });

        methodChildren.push({
          id: programPath,
          path: programPath,
          tagName: 'program',
          label:
            programEl.querySelector(':scope > description')?.textContent?.trim() ?? 'program',
          isEncrypted: false,
          isEncryptable: true,
          children: programChildren.length > 0 ? programChildren : undefined,
        });
      }

      protocolChildren.push({
        id: methodPath,
        path: methodPath,
        tagName: 'method',
        label: methodId,
        isEncrypted: false,
        isEncryptable: true,
        children: methodChildren.length > 0 ? methodChildren : undefined,
      });
    });

    result.push({
      id: protocolPath,
      path: protocolPath,
      tagName: 'protocol',
      label: 'protocol',
      isEncrypted: false,
      isEncryptable: true,
      children: protocolChildren.length > 0 ? protocolChildren : undefined,
    });
  }

  // ----------------------------------------------------------------
  // 3. data ノード
  // ----------------------------------------------------------------
  const dataEl = root.querySelector(':scope > data');
  if (dataEl) {
    const dataId = dataEl.getAttribute('id') ?? 'data';
    const dataPath = buildPath(rootPath, 'data', dataId);
    const dataChildren: MaimlTreeNode[] = [];

    dataEl.querySelectorAll(':scope > results').forEach((resEl) => {
      dataChildren.push(parseResultsNode(resEl, dataPath));
    });

    result.push({
      id: dataPath,
      path: dataPath,
      tagName: 'data',
      label: dataEl.querySelector(':scope > name')?.textContent?.trim() ?? 'data',
      isEncrypted: false,
      isEncryptable: true,
      children: dataChildren.length > 0 ? dataChildren : undefined,
    });
  }

  return result;
}

/**
 * /mocks/Raman.maiml を fetch してパースし MaimlTreeNode[] を返す
 * （フロントエンドモック用。本番ではバックエンドAPIを使用）
 */
export async function fetchAndParseMockMaiml(): Promise<MaimlTreeNode[]> {
  const response = await fetch('/mocks/Raman.maiml');
  if (!response.ok) {
    throw new Error(`Failed to fetch mock MAIML: ${response.statusText}`);
  }
  const xml = await response.text();
  return parseMaimlToEncryptionTree(xml);
}
