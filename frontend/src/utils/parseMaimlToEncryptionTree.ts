/**
 * MAIMLファイルを暗号化管理UIのツリー構造（MaimlTreeNode[]）に変換するユーティリティ
 *
 * @remarks
 * MaimlParserTyped（xml-js ベース）を使用してXMLをパースします。
 * 旧実装（DOMParser）から移行済み。SSR環境でも使用可能。
 *
 * MAIML XSD 仕様 (docs/design/maiml/) に基づく正確な階層構造:
 *
 * maiml
 *   ├─ document (globalObjectContentGroup: property/content)
 *   │   ├─ creator (globalObjectContentGroup)
 *   │   ├─ vendor  (globalObjectContentGroup)
 *   │   ├─ owner   (globalObjectContentGroup)
 *   │   └─ instrument (globalObjectContentGroup)
 *   ├─ protocol (globalObjectContentGroup)
 *   │   ├─ materialTemplate (globalObjectContentGroup)
 *   │   ├─ conditionTemplate (globalObjectContentGroup)
 *   │   ├─ resultTemplate (globalObjectContentGroup)
 *   │   └─ method (globalObjectContentGroup)
 *   │       ├─ pnml (globalObjectContentGroup: place/transition/arc は暗号化不可)
 *   │       ├─ program (globalObjectContentGroup)
 *   │       │   ├─ instruction (globalObjectContentGroup)
 *   │       │   ├─ materialTemplate (globalObjectContentGroup)
 *   │       │   ├─ conditionTemplate (globalObjectContentGroup)
 *   │       │   └─ resultTemplate (globalObjectContentGroup)
 *   │       ├─ materialTemplate (globalObjectContentGroup)
 *   │       ├─ conditionTemplate (globalObjectContentGroup)
 *   │       └─ resultTemplate (globalObjectContentGroup)
 *   ├─ data (globalObjectContentGroup)
 *   │   └─ results (globalObjectContentGroup)
 *   │       ├─ material (globalObjectContentGroup)
 *   │       ├─ condition (globalObjectContentGroup)
 *   │       └─ result (globalObjectContentGroup)
 *   └─ eventLog (globalObjectContentGroup)
 *       └─ log (globalObjectContentGroup)
 *           └─ trace (globalObjectContentGroup)
 *               └─ event (globalObjectContentGroup)
 *
 * 暗号化可否:
 *   - globalObjectContentGroup を持つ要素全般: 暗号化可能
 *   - place / transition / arc: Petri Net 構造要素のため暗号化不可
 *   - property / content: 暗号化可能（globalObjectContentGroup 内の genericDataContainerGroup 要素）
 */

import type { MaimlTreeNode } from '@/types/encryption';
import type {
  MaimlRoot,
  Document as MaimlDocument,
  Protocol,
  Method,
  PNML,
  Program,
  Instruction,
  Template,
  Data,
  Results,
  Material,
  Condition,
  Result,
  EventLog,
  Log,
  Trace,
  Event,
  Property,
  Content,
} from '@/types/maiml-unified';
import { MaimlParserTyped } from '@/utils/maimlParserTyped';

// ---------------------------------------------------------------------------
// 暗号化可否判定
// ---------------------------------------------------------------------------

/**
 * 暗号化可能な要素タグ名のセット（globalObjectContentGroup を持つ型）
 */
const ENCRYPTABLE_TAGS = new Set([
  // document セクション
  'document', 'creator', 'vendor', 'owner', 'instrument',
  // protocol セクション
  'protocol', 'method', 'pnml',
  'program', 'instruction',
  'materialTemplate', 'conditionTemplate', 'resultTemplate',
  // data セクション
  'data', 'results', 'material', 'condition', 'result',
  // eventLog セクション
  'eventLog', 'log', 'trace', 'event',
  // genericDataContainerGroup
  'property', 'content',
]);

/**
 * 要素タグ名が暗号化可能かどうかを返す
 */
export function isEncryptableElement(tagName: string): boolean {
  return ENCRYPTABLE_TAGS.has(tagName);
}

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

/** XPath風の簡易パスを生成する */
function buildPath(parent: string, tag: string, id?: string): string {
  if (id) return `${parent}/${tag}[@id='${id}']`;
  return `${parent}/${tag}`;
}

/** placeType バッジ用マップ */
const PLACE_TYPE_MAP: Record<string, 'Material' | 'Condition' | 'Result'> = {
  materialTemplate: 'Material',
  conditionTemplate: 'Condition',
  resultTemplate: 'Result',
  material: 'Material',
  condition: 'Condition',
  result: 'Result',
};

// ---------------------------------------------------------------------------
// property / content ノード変換
// ---------------------------------------------------------------------------

/**
 * Property オブジェクトを MaimlTreeNode に変換（propertyListType の再帰も対応）
 */
function buildPropertyNode(prop: Property, parentPath: string): MaimlTreeNode {
  const key = prop.key ?? '';
  const units = (prop as any).units ?? '';
  const label = units ? `${key} (${units})` : key;
  const path = `${parentPath}/property[@key='${key}']`;

  const children: MaimlTreeNode[] = [];
  if (prop.xsiType === 'propertyListType') {
    (prop.properties ?? []).forEach((child) => {
      children.push(buildPropertyNode(child, path));
    });
    (prop.contents ?? []).forEach((child) => {
      children.push(buildContentNode(child, path));
    });
  }

  return {
    id: path,
    path,
    tagName: 'property',
    key,
    label,
    isEncrypted: false,
    isEncryptable: true,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Content オブジェクトを MaimlTreeNode に変換
 */
function buildContentNode(content: Content, parentPath: string): MaimlTreeNode {
  const key = content.key ?? '';
  const eid = content.id ?? key;
  const axis = content.axis ?? '';
  const size = content.size !== undefined ? String(content.size) : '';
  const label = axis ? `${key} [axis=${axis}, size=${size}]` : key;
  const path = `${parentPath}/content[@id='${eid || key}']`;

  return {
    id: path,
    path,
    tagName: 'content',
    key,
    label,
    isEncrypted: false,
    isEncryptable: true,
  };
}

/**
 * Property[] / Content[] を MaimlTreeNode[] に変換する共通処理
 * （genericDataContainerGroup 相当）
 */
function buildDataContainerChildren(
  properties: Property[],
  contents: Content[],
  parentPath: string,
): MaimlTreeNode[] {
  const nodes: MaimlTreeNode[] = [];
  (properties ?? []).forEach((p) => nodes.push(buildPropertyNode(p, parentPath)));
  (contents ?? []).forEach((c) => nodes.push(buildContentNode(c, parentPath)));
  return nodes;
}

// ---------------------------------------------------------------------------
// globalObjectContentGroup を持つ要素の汎用ビルダー
// ---------------------------------------------------------------------------

/**
 * globalObjectContentGroup を持つ要素を MaimlTreeNode に変換する汎用関数
 */
function buildGlobalNode(
  tagName: string,
  id: string,
  name: string | undefined,
  description: string | undefined,
  parentPath: string,
  properties: Property[],
  contents: Content[],
  additionalChildren: MaimlTreeNode[] = [],
): MaimlTreeNode {
  const path = buildPath(parentPath, tagName, id || undefined);
  const label = name ?? description ?? id ?? tagName;

  const dataChildren = buildDataContainerChildren(properties, contents, path);
  const allChildren = [...dataChildren, ...additionalChildren];

  return {
    id: path,
    path,
    tagName,
    label,
    placeType: PLACE_TYPE_MAP[tagName],
    isEncrypted: false,
    isEncryptable: isEncryptableElement(tagName),
    children: allChildren.length > 0 ? allChildren : undefined,
  };
}

// ---------------------------------------------------------------------------
// 各セクション専用ビルダー
// ---------------------------------------------------------------------------

/** Template（materialTemplate / conditionTemplate / resultTemplate）を変換 */
function buildTemplateNode(tpl: Template, tagName: string, parentPath: string): MaimlTreeNode {
  return buildGlobalNode(
    tagName,
    tpl.id,
    tpl.name,
    tpl.description,
    parentPath,
    tpl.properties ?? [],
    tpl.contents ?? [],
  );
}

/** Instruction を変換 */
function buildInstructionNode(inst: Instruction, parentPath: string): MaimlTreeNode {
  return buildGlobalNode(
    'instruction',
    inst.id,
    inst.name,
    inst.description,
    parentPath,
    [],
    [],
  );
}

/** Program を変換（instruction + template を子に持つ） */
function buildProgramNode(prog: Program, parentPath: string): MaimlTreeNode {
  const path = buildPath(parentPath, 'program', prog.id || undefined);
  const additionalChildren: MaimlTreeNode[] = [];

  (prog.instructions ?? []).forEach((inst) => {
    additionalChildren.push(buildInstructionNode(inst, path));
  });
  (prog.materialTemplates ?? []).forEach((tpl) => {
    additionalChildren.push(buildTemplateNode(tpl, 'materialTemplate', path));
  });
  (prog.conditionTemplates ?? []).forEach((tpl) => {
    additionalChildren.push(buildTemplateNode(tpl, 'conditionTemplate', path));
  });
  (prog.resultTemplates ?? []).forEach((tpl) => {
    additionalChildren.push(buildTemplateNode(tpl, 'resultTemplate', path));
  });

  return buildGlobalNode(
    'program',
    prog.id,
    prog.name,
    prog.description,
    parentPath,
    [],
    [],
    additionalChildren,
  );
}

/** PNML を変換（place/transition/arc は暗号化不可） */
function buildPnmlNode(pnml: PNML, parentPath: string): MaimlTreeNode {
  const path = buildPath(parentPath, 'pnml', pnml.id || undefined);
  const structuralChildren: MaimlTreeNode[] = [];

  (pnml.places ?? []).forEach((pl) => {
    const ppath = `${path}/place[@id='${pl.id}']`;
    structuralChildren.push({
      id: ppath,
      path: ppath,
      tagName: 'place',
      label: pl.name ?? pl.id,
      isEncrypted: false,
      isEncryptable: false,
    });
  });

  (pnml.transitions ?? []).forEach((tr) => {
    const tpath = `${path}/transition[@id='${tr.id}']`;
    structuralChildren.push({
      id: tpath,
      path: tpath,
      tagName: 'transition',
      label: tr.name ?? tr.id,
      isEncrypted: false,
      isEncryptable: false,
    });
  });

  (pnml.arcs ?? []).forEach((arc) => {
    const apath = `${path}/arc[@id='${arc.id}']`;
    structuralChildren.push({
      id: apath,
      path: apath,
      tagName: 'arc',
      label: `${arc.source} → ${arc.target}`,
      isEncrypted: false,
      isEncryptable: false,
    });
  });

  return buildGlobalNode(
    'pnml',
    pnml.id,
    pnml.name,
    pnml.description,
    parentPath,
    [],
    [],
    structuralChildren,
  );
}

/** Method を変換（pnml + program + template を子に持つ） */
function buildMethodNode(method: Method, parentPath: string): MaimlTreeNode {
  const path = buildPath(parentPath, 'method', method.id || undefined);
  const additionalChildren: MaimlTreeNode[] = [];

  // pnml
  buildPnmlNode(method.pnml, path) && additionalChildren.push(buildPnmlNode(method.pnml, path));

  (method.program ?? []).forEach((prog) => {
    additionalChildren.push(buildProgramNode(prog, path));
  });
  (method.materialTemplates ?? []).forEach((tpl) => {
    additionalChildren.push(buildTemplateNode(tpl, 'materialTemplate', path));
  });
  (method.conditionTemplates ?? []).forEach((tpl) => {
    additionalChildren.push(buildTemplateNode(tpl, 'conditionTemplate', path));
  });
  (method.resultTemplates ?? []).forEach((tpl) => {
    additionalChildren.push(buildTemplateNode(tpl, 'resultTemplate', path));
  });

  return buildGlobalNode(
    'method',
    method.id,
    method.name,
    method.description,
    parentPath,
    [],
    [],
    additionalChildren,
  );
}

/** Results を変換（material/condition/result を子に持つ） */
function buildResultsNode(results: Results, parentPath: string): MaimlTreeNode {
  const path = buildPath(parentPath, 'results', results.id || undefined);
  const additionalChildren: MaimlTreeNode[] = [];

  (results.materials ?? []).forEach((mat) => {
    additionalChildren.push(
      buildGlobalNode('material', mat.id, mat.name, mat.description, path, mat.properties ?? [], mat.contents ?? []),
    );
  });
  (results.conditions ?? []).forEach((cond) => {
    additionalChildren.push(
      buildGlobalNode('condition', cond.id, cond.name, cond.description, path, cond.properties ?? [], cond.contents ?? []),
    );
  });
  (results.results ?? []).forEach((res) => {
    additionalChildren.push(
      buildGlobalNode('result', res.id, res.name, res.description, path, res.properties ?? [], res.contents ?? []),
    );
  });

  return buildGlobalNode(
    'results',
    results.id,
    results.name,
    results.description,
    parentPath,
    [],
    [],
    additionalChildren,
  );
}

/** Event を変換 */
function buildEventNode(evt: Event, parentPath: string): MaimlTreeNode {
  return buildGlobalNode(
    'event',
    evt.id,
    evt.name,
    evt.description,
    parentPath,
    evt.properties ?? [],
    evt.contents ?? [],
  );
}

/** Trace を変換（event を子に持つ） */
function buildTraceNode(trace: Trace, parentPath: string): MaimlTreeNode {
  const path = buildPath(parentPath, 'trace', trace.id || undefined);
  const additionalChildren: MaimlTreeNode[] = [];

  (trace.events ?? []).forEach((evt) => {
    additionalChildren.push(buildEventNode(evt, path));
  });

  return buildGlobalNode(
    'trace',
    trace.id,
    trace.name,
    trace.description,
    parentPath,
    [],
    [],
    additionalChildren,
  );
}

/** Log を変換（trace を子に持つ） */
function buildLogNode(log: Log, parentPath: string): MaimlTreeNode {
  const path = buildPath(parentPath, 'log', log.id || undefined);
  const additionalChildren: MaimlTreeNode[] = [];

  (log.traces ?? []).forEach((trace) => {
    additionalChildren.push(buildTraceNode(trace, path));
  });

  return buildGlobalNode(
    'log',
    log.id,
    log.name,
    log.description,
    parentPath,
    [],
    [],
    additionalChildren,
  );
}

// ---------------------------------------------------------------------------
// MaimlRoot → MaimlTreeNode[] 変換
// ---------------------------------------------------------------------------

/**
 * パース済みの MaimlRoot を暗号化管理UIのツリー構造（MaimlTreeNode[]）に変換する
 *
 * @param maimlRoot - MaimlParserTyped によってパースされた MaimlRoot
 * @returns MaimlTreeNode の配列（ルートレベル: document, protocol, data, eventLog）
 */
export function maimlRootToEncryptionTree(maimlRoot: MaimlRoot): MaimlTreeNode[] {
  const rootPath = '/maiml';
  const result: MaimlTreeNode[] = [];

  // ----------------------------------------------------------------
  // 1. document
  // ----------------------------------------------------------------
  const doc: MaimlDocument = maimlRoot.document;
  if (doc) {
    const docPath = buildPath(rootPath, 'document', doc.id || undefined);
    const additionalChildren: MaimlTreeNode[] = [];

    (doc.creators ?? []).forEach((c) =>
      additionalChildren.push(buildGlobalNode('creator', c.id, c.name, c.description, docPath, [], []))
    );
    (doc.vendors ?? []).forEach((v) =>
      additionalChildren.push(buildGlobalNode('vendor', v.id, v.name, v.description, docPath, [], []))
    );
    (doc.owners ?? []).forEach((o) =>
      additionalChildren.push(buildGlobalNode('owner', o.id, o.name, o.description, docPath, [], []))
    );
    (doc.instruments ?? []).forEach((i) =>
      additionalChildren.push(buildGlobalNode('instrument', i.id, i.name, i.description, docPath, [], []))
    );

    result.push(
      buildGlobalNode('document', doc.id, doc.name, doc.description, rootPath, [], [], additionalChildren),
    );
  }

  // ----------------------------------------------------------------
  // 2. protocol
  // ----------------------------------------------------------------
  const protocol: Protocol = maimlRoot.protocol;
  if (protocol) {
    const protocolPath = buildPath(rootPath, 'protocol', protocol.id || undefined);
    const additionalChildren: MaimlTreeNode[] = [];

    (protocol.methods ?? []).forEach((method) => {
      additionalChildren.push(buildMethodNode(method, protocolPath));
    });
    (protocol.materialTemplates ?? []).forEach((tpl) => {
      additionalChildren.push(buildTemplateNode(tpl, 'materialTemplate', protocolPath));
    });
    (protocol.conditionTemplates ?? []).forEach((tpl) => {
      additionalChildren.push(buildTemplateNode(tpl, 'conditionTemplate', protocolPath));
    });
    (protocol.resultTemplates ?? []).forEach((tpl) => {
      additionalChildren.push(buildTemplateNode(tpl, 'resultTemplate', protocolPath));
    });

    result.push(
      buildGlobalNode('protocol', protocol.id, protocol.name, protocol.description, rootPath, [], [], additionalChildren),
    );
  }

  // ----------------------------------------------------------------
  // 3. data
  // ----------------------------------------------------------------
  const data: Data | undefined = maimlRoot.data;
  if (data) {
    const dataPath = buildPath(rootPath, 'data', data.id || undefined);
    const additionalChildren: MaimlTreeNode[] = [];

    (data.results ?? []).forEach((res) => {
      additionalChildren.push(buildResultsNode(res, dataPath));
    });

    result.push(
      buildGlobalNode('data', data.id, data.name, data.description, rootPath, [], [], additionalChildren),
    );
  }

  // ----------------------------------------------------------------
  // 4. eventLog
  // ----------------------------------------------------------------
  const eventLog: EventLog | undefined = maimlRoot.eventLog;
  if (eventLog) {
    const eventLogPath = buildPath(rootPath, 'eventLog', eventLog.id || undefined);
    const additionalChildren: MaimlTreeNode[] = [];

    (eventLog.logs ?? []).forEach((log) => {
      additionalChildren.push(buildLogNode(log, eventLogPath));
    });

    result.push(
      buildGlobalNode('eventLog', eventLog.id, eventLog.name, eventLog.description, rootPath, [], [], additionalChildren),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// メインパーサー（公開API）
// ---------------------------------------------------------------------------

/**
 * MAIMLのXML文字列をパースして MaimlTreeNode[] に変換する
 *
 * @param xml - MAIMLファイルのXML文字列
 * @returns MaimlTreeNode の配列（ルートレベル: document, protocol, data, eventLog）
 * @throws {Error} XMLパースに失敗した場合
 */
export function parseMaimlToEncryptionTree(xml: string): MaimlTreeNode[] {
  const parser = new MaimlParserTyped(xml);

  if (parser.hasConversionErrors()) {
    // エラーがあってもパース結果を利用するが、警告ログを出す
    parser
      .getConversionErrors()
      .filter((e) => e.level === 'error')
      .forEach((e) => {
        console.error(`[parseMaimlToEncryptionTree] Parse error at ${e.path}.${e.element}: ${e.message}`);
      });
  }

  return maimlRootToEncryptionTree(parser.getTypedMaiml());
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
