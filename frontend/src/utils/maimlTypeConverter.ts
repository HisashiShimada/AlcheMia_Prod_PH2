/**
 * MAIML Type Converter
 * 
 * xml-js形式のデータをXSD準拠の型安全な構造に変換するユーティリティ
 * 
 * @module maimlTypeConverter
 * @version 2.0.0
 * @date 2026-02-24
 * 
 * @note xml-js形式の動的な構造を扱うため、一部の関数でany型を使用しています。
 *       主要な入出力（エントリーポイントとProperty変換）は型安全に保たれています。
 * 
 * @changelog
 * - v2.0.0 (2026-02-24): エラーハンドリング機能追加。変換失敗時もMaimlRootを返却。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  type XmlJsElement,
  type XmlJsMaimlRoot,
  normalizeXmlJsArray,
  extractText,
  getAttribute
} from '@/types/xml-js-types';

import type {
  MaimlRoot,
  Document as MaimlDocument,
  Protocol,
  Method,
  PNML,
  Program,
  Property,
  PropertyType,
  Content,
  ContentType,
  Template,
  Place,
  Transition,
  Arc,
  Instruction,
  Data,
  Results,
  Material,
  Condition,
  Result,
  EventLog,
  Log,
  Trace,
  Event,
  DocumentTagData,
  PlaceRef,
  Reference,
  Insertion,
  Hash,
  InstanceRef,
  Extension,
  Globals,
  Classifier,
  PropertyCustomElement,
  Parent,
  Chain
} from '@/types/maiml-unified';

/**
 * 変換エラー情報
 */
export interface ConversionError {
  /** エラー発生箇所のパス（例: "protocol.method[0].pnml"） */
  path: string;
  /** エラー対象の要素名 */
  element: string;
  /** エラーメッセージ */
  message: string;
  /** エラーレベル */
  level: 'warning' | 'error';
  /** 元のエラーオブジェクト */
  originalError?: Error;
}

/**
 * 変換結果
 */
export interface ConversionResult {
  /** 変換されたデータ（部分的でも可） */
  data: MaimlRoot;
  /** 発生したエラーのリスト */
  errors: ConversionError[];
  /** エラーが発生したかどうか */
  hasErrors: boolean;
  /** 警告が発生したかどうか */
  hasWarnings: boolean;
}

/**
 * エラーコンテキスト（エラー収集用）
 */
class ErrorContext {
  private errors: ConversionError[] = [];
  private pathStack: string[] = [];

  pushPath(segment: string): void {
    this.pathStack.push(segment);
  }

  popPath(): void {
    this.pathStack.pop();
  }

  getCurrentPath(): string {
    return this.pathStack.join('.');
  }

  addError(element: string, message: string, level: 'warning' | 'error' = 'error', originalError?: Error): void {
    this.errors.push({
      path: this.getCurrentPath(),
      element,
      message,
      level,
      originalError
    });
    console.warn(`⚠️ [ConversionError] ${this.getCurrentPath()}.${element}: ${message}`);
  }

  getErrors(): ConversionError[] {
    return this.errors;
  }

  hasErrors(): boolean {
    return this.errors.some(e => e.level === 'error');
  }

  hasWarnings(): boolean {
    return this.errors.some(e => e.level === 'warning');
  }
}

/**
 * xml-jsオブジェクトのキーから名前空間プレフィックスを再帰的に除去する
 * 例: { 'maiml:pnml': {...}, 'ns:place': {...} } → { pnml: {...}, place: {...} }
 *
 * @param obj - xml-jsが生成したオブジェクト
 * @returns プレフィックス除去後のオブジェクト
 */
export function stripNamespacePrefixes(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripNamespacePrefixes);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // _attributes, _text などの xml-js 内部キーはそのまま保持
    // _attributes は XML 属性名（xsi:type 等）をそのまま保持するため再帰しない
    if (key === '_attributes') {
      result[key] = value;
      continue;
    }
    if (key.startsWith('_')) {
      result[key] = stripNamespacePrefixes(value);
      continue;
    }
    // 名前空間プレフィックスを除去（例: 'maiml:pnml' → 'pnml'）
    const strippedKey = key.includes(':') ? key.split(':').pop()! : key;
    // 同名キーが複数ある場合は配列化（安全のため）
    if (result[strippedKey] !== undefined) {
      result[strippedKey] = [
        ...(Array.isArray(result[strippedKey]) ? result[strippedKey] : [result[strippedKey]]),
        stripNamespacePrefixes(value)
      ];
    } else {
      result[strippedKey] = stripNamespacePrefixes(value);
    }
  }
  return result;
}

/**
 * xml-jsオブジェクトのタグ名キーを再帰的に小文字化する
 * 大文字小文字のみ異なるタグ名（例: <Protocol> vs <protocol>）を正規化する
 *
 * @remarks
 * - `_text`, `_attributes` などの xml-js 内部キーはそのまま保持
 * - `_attributes` の中身（属性名・属性値）はそのまま保持（xsi:type 等の値を変えない）
 */
export function normalizeTagCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeTagCase);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // xml-js 内部キー（_ 始まり）はそのまま保持
    if (key.startsWith('_')) {
      result[key] = value; // _attributes の中身は変えない
      continue;
    }
    const lowerKey = key.toLowerCase();
    // 同名キーが既にある場合は配列化
    const normalizedValue = normalizeTagCase(value);
    if (result[lowerKey] !== undefined) {
      result[lowerKey] = [
        ...(Array.isArray(result[lowerKey]) ? result[lowerKey] : [result[lowerKey]]),
        ...(Array.isArray(normalizedValue) ? normalizedValue : [normalizedValue])
      ];
    } else {
      result[lowerKey] = normalizedValue;
    }
  }
  return result;
}

/**
 * xml-jsからMaimlRootへの変換（エントリーポイント・エラーハンドリング付き）
 * 
 * @param xmlData - 変換元のxml-jsデータ
 * @returns 変換結果（データ + エラー情報）
 */
export function convertXmlJsToMaimlRoot(xmlData: XmlJsMaimlRoot | XmlJsElement): ConversionResult {
  console.log('🔄 [convertXmlJsToMaimlRoot] 型変換開始（エラーハンドリング有効）');
  
  const errorContext = new ErrorContext();
  errorContext.pushPath('maiml');
  
  try {
    // XmlJsMaimlRootの場合はmaimlを取得、XmlJsElementの場合はそのまま使用
    const rawMaimlElement = (xmlData as XmlJsMaimlRoot).maiml || xmlData as XmlJsElement;

    // ⭐ 名前空間プレフィックスを一括除去（全変換関数が固定キーでアクセスできるようにする）
    // ⭐ さらにタグ名キーを小文字化（大文字小文字差異を吸収: <Protocol> → protocol）
    const maimlElement = normalizeTagCase(stripNamespacePrefixes(rawMaimlElement));
    
    if (!maimlElement) {
      errorContext.addError('root', 'Invalid MAIML data: no maiml element found', 'error');
      return createErrorResult(errorContext);
    }
    
    const attrs = maimlElement._attributes || {};
    
    // documentとprotocolは必須
    const docElement = maimlElement.document as XmlJsElement | undefined;
    const protocolElement = maimlElement.protocol as XmlJsElement | undefined;
    
    // documentの変換
    let document: MaimlDocument;
    if (!docElement) {
      errorContext.addError('document', 'Document element is required but missing', 'error');
      document = createEmptyDocument();
    } else {
      try {
        errorContext.pushPath('document');
        document = convertDocument(docElement, errorContext);
        errorContext.popPath();
      } catch (error) {
        errorContext.addError('document', 'Failed to convert document', 'error', error as Error);
        document = createEmptyDocument();
        errorContext.popPath();
      }
    }
    
    // protocolの変換
    let protocol: Protocol;
    if (!protocolElement) {
      errorContext.addError('protocol', 'Protocol element is required but missing', 'error');
      protocol = createEmptyProtocol();
    } else {
      try {
        errorContext.pushPath('protocol');
        protocol = convertProtocol(protocolElement, errorContext);
        errorContext.popPath();
      } catch (error) {
        errorContext.addError('protocol', 'Failed to convert protocol', 'error', error as Error);
        protocol = createEmptyProtocol();
        errorContext.popPath();
      }
    }
    
    // dataの変換（オプション）
    let data: Data | undefined;
    if ((maimlElement as any).data) {
      try {
        errorContext.pushPath('data');
        data = convertData(maimlElement.data as XmlJsElement, errorContext);
        errorContext.popPath();
      } catch (error) {
        errorContext.addError('data', 'Failed to convert data', 'warning', error as Error);
        data = undefined;
        errorContext.popPath();
      }
    }
    
    // eventLogの変換（オプション）
    let eventLog: EventLog | undefined;
    if (maimlElement.eventlog) {
      try {
        errorContext.pushPath('eventLog');
        eventLog = convertEventLog(maimlElement.eventlog as XmlJsElement, errorContext);
        errorContext.popPath();
      } catch (error) {
        errorContext.addError('eventLog', 'Failed to convert eventLog', 'warning', error as Error);
        eventLog = undefined;
        errorContext.popPath();
      }
    }
    
    // 既知キー以外の要素を unknownElements に収集（MaimlRoot レベル）
    // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
    const ROOT_KNOWN_KEYS = new Set([
      '_attributes', 'document', 'protocol', 'data', 'eventlog'
    ]);
    const rootUnknownElements: Record<string, any> = {};
    for (const key of Object.keys(maimlElement)) {
      if (!ROOT_KNOWN_KEYS.has(key)) {
        rootUnknownElements[key] = maimlElement[key];
        errorContext.addError(
          key,
          `Unknown element <${key}> found in maiml root`,
          'warning'
        );
      }
    }

    const result: MaimlRoot = {
      xmlns: attrs.xmlns,
      xmlnsConcept: attrs['xmlns:concept'],
      xmlnsLifecycle: attrs['xmlns:lifecycle'],
      xmlnsTime: attrs['xmlns:time'],
      xmlnsXsd: attrs['xmlns:xsd'],
      xmlnsXsi: attrs['xmlns:xsi'],
      features: attrs.features,
      version: attrs.version || '1.0',
      xsiType: 'maimlRootType',
      document,
      protocol,
      data,
      eventLog,
      ...(Object.keys(rootUnknownElements).length > 0 ? { unknownElements: rootUnknownElements } : {})
    };
    
    console.log('✅ [convertXmlJsToMaimlRoot] 型変換完了');
    
    return {
      data: result,
      errors: errorContext.getErrors(),
      hasErrors: errorContext.hasErrors(),
      hasWarnings: errorContext.hasWarnings()
    };
    
  } catch (error) {
    errorContext.addError('root', 'Fatal error during conversion', 'error', error as Error);
    return createErrorResult(errorContext);
  } finally {
    errorContext.popPath();
  }
}

/**
 * エラー時の結果を作成
 */
function createErrorResult(errorContext: ErrorContext): ConversionResult {
  return {
    data: createEmptyMaimlRoot(),
    errors: errorContext.getErrors(),
    hasErrors: true,
    hasWarnings: errorContext.hasWarnings()
  };
}

/**
 * 空のMaimlRootを作成
 */
function createEmptyMaimlRoot(): MaimlRoot {
  return {
    version: '1.0',
    xsiType: 'maimlRootType',
    document: createEmptyDocument(),
    protocol: createEmptyProtocol()
  };
}

/**
 * 空のDocumentを作成
 */
function createEmptyDocument(): MaimlDocument {
  return {
    id: 'error-document',
    uuid: '',
    creators: [],
    vendors: [],
    owners: [],
    instruments: [],
    chains: [],
    parents: []
  };
}

/**
 * 空のProtocolを作成
 */
function createEmptyProtocol(): Protocol {
  return {
    id: 'error-protocol',
    uuid: '',
    methods: [],
    materialTemplates: [],
    conditionTemplates: [],
    resultTemplates: []
  };
}

/**
 * Document変換
 */
function convertDocument(xmlDoc: XmlJsElement, errorContext?: ErrorContext): MaimlDocument {
  if (!xmlDoc) {
    throw new Error('Document element is required');
  }

  const DOCUMENT_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'date', 'annotation',
    'creator', 'vendor', 'owner', 'instrument', 'chain', 'parent'
  ]);
  warnUnknownKeys(xmlDoc, DOCUMENT_KNOWN_KEYS, errorContext, `document(id=${getAttribute(xmlDoc, 'id') || 'unknown'})`);

  // 必須フィールドの検証
  const id = getAttribute(xmlDoc, 'id');
  if (!id && errorContext) {
    errorContext.addError('id', 'Document id is missing', 'warning');
  }
  
  const uuid = extractText(xmlDoc.uuid as XmlJsElement);
  if (!uuid && errorContext) {
    errorContext.addError('uuid', 'Document uuid is missing', 'warning');
  }
  
  return {
    id: id || '',
    uuid: uuid || '',
    name: extractText(xmlDoc.name as XmlJsElement),
    description: extractText(xmlDoc.description as XmlJsElement),
    date: extractText(xmlDoc.date as XmlJsElement),
    creators: convertArraySafe(xmlDoc.creator, convertCreator, errorContext, 'creator'),
    vendors: convertArraySafe(xmlDoc.vendor, convertVendor, errorContext, 'vendor'),
    owners: convertArraySafe(xmlDoc.owner, convertOwner, errorContext, 'owner'),
    instruments: xmlDoc.instrument ? convertArraySafe(xmlDoc.instrument, convertInstrument, errorContext, 'instrument') : [],
    chains:  (xmlDoc as any).chain  ? convertArraySafe((xmlDoc as any).chain,  (el: any) => convertChain(el),  errorContext, 'chain')  : [],
    parents: (xmlDoc as any).parent ? convertArraySafe((xmlDoc as any).parent, (el: any) => convertParent(el), errorContext, 'parent') : [],
  };
}

/**
 * Parent変換（再帰対応）
 */
function convertParent(xmlParent: any, errorContext?: ErrorContext): Parent {
  return {
    uuid: xmlParent.uuid?._text || '',
    hash: xmlParent.hash ? convertHash(xmlParent.hash) : { value: '' },
    // normalizeTagCase により 'parent' キーは小文字化済み
    parents: xmlParent.parent ? convertArray(xmlParent.parent, (el: any) => convertParent(el, errorContext)) : [],
    key: xmlParent._attributes?.key,
  };
}

/**
 * Chain変換（再帰対応）
 */
function convertChain(xmlChain: any, errorContext?: ErrorContext): Chain {
  return {
    uuid: xmlChain.uuid?._text || '',
    hash: xmlChain.hash ? convertHash(xmlChain.hash) : { value: '' },
    // normalizeTagCase により 'chain' キーは小文字化済み
    chains: xmlChain.chain ? convertArray(xmlChain.chain, (el: any) => convertChain(el, errorContext)) : [],
    key: xmlChain._attributes?.key,
  };
}

/**
 * Creator変換
 */
function convertCreator(xmlCreator: XmlJsElement): DocumentTagData {
  return {
    tagName : 'Creator',
    id: getAttribute(xmlCreator, 'id') || '',
    uuid: extractText(xmlCreator.uuid as XmlJsElement) || '',
    name: extractText(xmlCreator.name as XmlJsElement),
    description: extractText(xmlCreator.description as XmlJsElement),
    vendorRef: (xmlCreator as any).vendorref ? convertRef((xmlCreator as any).vendorref) : undefined,
    instrumentRef: (xmlCreator as any).instrumentref ? convertRef((xmlCreator as any).instrumentref) : undefined
  };
}

/**
 * Vendor変換
 */
function convertVendor(xmlVendor: XmlJsElement): DocumentTagData {
  return {
    tagName : 'Vendor',
    id: getAttribute(xmlVendor, 'id') || '',
    uuid: extractText(xmlVendor.uuid as XmlJsElement) || '',
    name: extractText(xmlVendor.name as XmlJsElement),
    description: extractText(xmlVendor.description as XmlJsElement)
  };
}

/**
 * Owner変換
 */
function convertOwner(xmlOwner: XmlJsElement): DocumentTagData {
  return {
    tagName : 'Owner',
    id: getAttribute(xmlOwner, 'id') || '',
    uuid: extractText(xmlOwner.uuid as XmlJsElement) || '',
    name: extractText(xmlOwner.name as XmlJsElement),
    description: extractText(xmlOwner.description as XmlJsElement)
  };
}

/**
 * Instrument変換
 */
function convertInstrument(xmlInstrument: XmlJsElement): DocumentTagData {
  return {
    tagName : 'Instrument',
    id: getAttribute(xmlInstrument, 'id') || '',
    uuid: extractText(xmlInstrument.uuid as XmlJsElement) || '',
    name: extractText(xmlInstrument.name as XmlJsElement),
    description: extractText(xmlInstrument.description as XmlJsElement)
  };
}

/**
 * Protocol変換
 */
function convertProtocol(xmlProtocol: XmlJsElement, errorContext?: ErrorContext): Protocol {
  if (!xmlProtocol) {
    throw new Error('Protocol element is required');
  }
  
  // 必須フィールドの検証
  const id = getAttribute(xmlProtocol, 'id');
  if (!id && errorContext) {
    errorContext.addError('id', 'Protocol id is missing', 'warning');
  }
  
  const uuid = extractText(xmlProtocol.uuid as XmlJsElement);
  if (!uuid && errorContext) {
    errorContext.addError('uuid', 'Protocol uuid is missing', 'warning');
  }
  
  const methods = normalizeXmlJsArray(xmlProtocol.method as XmlJsElement);

  // 既知キー以外の要素を unknownElements に収集
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const PROTOCOL_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'method', 'materialtemplate', 'conditiontemplate', 'resulttemplate'
  ]);
  const protocolUnknownElements: Record<string, any> = {};
  for (const key of Object.keys(xmlProtocol)) {
    if (!PROTOCOL_KNOWN_KEYS.has(key)) {
      protocolUnknownElements[key] = (xmlProtocol as any)[key];
      if (errorContext) {
        errorContext.addError(
          key,
          `Unknown element <${key}> found in protocol (id=${id || 'unknown'})`,
          'warning'
        );
      }
    }
  }

  return {
    id: id || '',
    uuid: uuid || '',
    name: extractText(xmlProtocol.name as XmlJsElement),
    description: extractText(xmlProtocol.description as XmlJsElement),
    methods: convertArraySafe(methods, convertMethod, errorContext, 'method'),
    materialTemplates: (xmlProtocol as any).materialtemplate ? convertArraySafe((xmlProtocol as any).materialtemplate, convertMaterialTemplate, errorContext, 'materialTemplate') : [],
    conditionTemplates: (xmlProtocol as any).conditiontemplate ? convertArraySafe((xmlProtocol as any).conditiontemplate, convertConditionTemplate, errorContext, 'conditionTemplate') : [],
    resultTemplates: (xmlProtocol as any).resulttemplate ? convertArraySafe((xmlProtocol as any).resulttemplate, convertResultTemplate, errorContext, 'resultTemplate') : [],
    ...(Object.keys(protocolUnknownElements).length > 0 ? { unknownElements: protocolUnknownElements } : {})
  };
}

/**
 * Method変換
 */
function convertMethod(xmlMethod: any, errorContext?: ErrorContext): Method {
  const pnml = xmlMethod.pnml as XmlJsElement | undefined;
  if (!pnml) {
    if (errorContext) {
      errorContext.addError('pnml', 'pnml element is required but missing', 'error');
    }
    throw new Error('pnml element is required');
  }
  
  // 必須フィールドの検証
  const id = xmlMethod._attributes?.id;
  if (!id && errorContext) {
    errorContext.addError('id', 'Method id is missing', 'warning');
  }
  
  const uuid = xmlMethod.uuid?._text;
  if (!uuid && errorContext) {
    errorContext.addError('uuid', 'Method uuid is missing', 'warning');
  }
  
  const program = normalizeArray(xmlMethod.program);

  // 既知キー以外の要素を unknownElements に収集
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const METHOD_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'pnml', 'program', 'materialtemplate', 'conditiontemplate', 'resulttemplate'
  ]);
  const methodUnknownElements: Record<string, any> = {};
  for (const key of Object.keys(xmlMethod)) {
    if (!METHOD_KNOWN_KEYS.has(key)) {
      methodUnknownElements[key] = xmlMethod[key];
      if (errorContext) {
        errorContext.addError(
          key,
          `Unknown element <${key}> found in method (id=${id || 'unknown'})`,
          'warning'
        );
      }
    }
  }

  return {
    id: id || '',
    uuid: uuid || '',
    name: xmlMethod.name?._text,
    description: xmlMethod.description?._text,
    pnml: convertPNML(pnml, errorContext),
    program: convertArraySafe(program, convertProgram, errorContext, 'program'),
    materialTemplates: xmlMethod.materialtemplate ? convertArraySafe(xmlMethod.materialtemplate, convertMaterialTemplate, errorContext, 'materialTemplate') : [],
    conditionTemplates: xmlMethod.conditiontemplate ? convertArraySafe(xmlMethod.conditiontemplate, convertConditionTemplate, errorContext, 'conditionTemplate') : [],
    resultTemplates: xmlMethod.resulttemplate ? convertArraySafe(xmlMethod.resulttemplate, convertResultTemplate, errorContext, 'resultTemplate') : [],
    ...(Object.keys(methodUnknownElements).length > 0 ? { unknownElements: methodUnknownElements } : {})
  };
}

/**
 * PNML変換
 */
function convertPNML(xmlPnml: any, errorContext?: ErrorContext): PNML {
  const PNML_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'place', 'transition', 'arc'
  ]);
  warnUnknownKeys(xmlPnml, PNML_KNOWN_KEYS, errorContext, `pnml(id=${xmlPnml._attributes?.id || 'unknown'})`);

  return {
    id: xmlPnml._attributes?.id || '',
    uuid: xmlPnml.uuid?._text || '',
    name: xmlPnml.name?._text,
    description: xmlPnml.description?._text,
    places: convertArray(xmlPnml.place, (el: any) => convertPlace(el, errorContext)),
    transitions: convertArray(xmlPnml.transition, (el: any) => convertTransition(el, errorContext)),
    arcs: convertArray(xmlPnml.arc, (el: any) => convertArc(el, errorContext))
  };
}

/**
 * Place変換
 */
function convertPlace(xmlPlace: any, errorContext?: ErrorContext): Place {
  const PLACE_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'position'
  ]);
  warnUnknownKeys(xmlPlace, PLACE_KNOWN_KEYS, errorContext, `place(id=${xmlPlace._attributes?.id || 'unknown'})`);

  // <position x="..." y="..." /> 要素を読み込む
  const positionEl = xmlPlace.position;
  let position: { x: number; y: number } | undefined;
  if (positionEl && positionEl._attributes) {
    const x = parseFloat(positionEl._attributes.x);
    const y = parseFloat(positionEl._attributes.y);
    if (!isNaN(x) && !isNaN(y)) {
      position = { x, y };
    }
  }

  return {
    id: xmlPlace._attributes?.id || '',
    uuid: xmlPlace.uuid?._text,
    name: xmlPlace.name?._text,
    description: xmlPlace.description?._text,
    position
  };
}

/**
 * Transition変換
 */
function convertTransition(xmlTransition: any, errorContext?: ErrorContext): Transition {
  const TRANSITION_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'position'
  ]);
  warnUnknownKeys(xmlTransition, TRANSITION_KNOWN_KEYS, errorContext, `transition(id=${xmlTransition._attributes?.id || 'unknown'})`);

  // <position x="..." y="..." /> 要素を読み込む
  const positionEl = xmlTransition.position;
  let position: { x: number; y: number } | undefined;
  if (positionEl && positionEl._attributes) {
    const x = parseFloat(positionEl._attributes.x);
    const y = parseFloat(positionEl._attributes.y);
    if (!isNaN(x) && !isNaN(y)) {
      position = { x, y };
    }
  }

  return {
    id: xmlTransition._attributes?.id || '',
    uuid: xmlTransition.uuid?._text,
    name: xmlTransition.name?._text,
    description: xmlTransition.description?._text,
    position
  };
}

/**
 * Arc変換
 */
function convertArc(xmlArc: any, errorContext?: ErrorContext): Arc {
  const ARC_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation'
  ]);
  warnUnknownKeys(xmlArc, ARC_KNOWN_KEYS, errorContext, `arc(id=${xmlArc._attributes?.id || 'unknown'})`);

  return {
    id: xmlArc._attributes?.id || '',
    uuid: xmlArc.uuid?._text,
    name: xmlArc.name?._text,
    description: xmlArc.description?._text,
    source: xmlArc._attributes?.source || '',
    target: xmlArc._attributes?.target || ''
  };
}

/**
 * Program変換
 */
function convertProgram(xmlProgram: any, errorContext?: ErrorContext): Program {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const PROGRAM_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'instruction', 'materialtemplate', 'conditiontemplate', 'resulttemplate'
  ]);
  warnUnknownKeys(xmlProgram, PROGRAM_KNOWN_KEYS, errorContext, `program(id=${xmlProgram._attributes?.id || 'unknown'})`);

  return {
    id: xmlProgram._attributes?.id || '',
    uuid: xmlProgram.uuid?._text || '',
    name: xmlProgram.name?._text,
    description: xmlProgram.description?._text,
    instructions: xmlProgram.instruction ? convertArray(xmlProgram.instruction, (el: any) => convertInstruction(el, errorContext)) : [],
    materialTemplates: xmlProgram.materialtemplate ? convertArray(xmlProgram.materialtemplate, (el: any) => convertMaterialTemplate(el, errorContext)) : [],
    conditionTemplates: xmlProgram.conditiontemplate ? convertArray(xmlProgram.conditiontemplate, (el: any) => convertConditionTemplate(el, errorContext)) : [],
    resultTemplates: xmlProgram.resulttemplate ? convertArray(xmlProgram.resulttemplate, (el: any) => convertResultTemplate(el, errorContext)) : []
  };
}

/**
 * Instruction変換
 */
function convertInstruction(xmlInstruction: any, errorContext?: ErrorContext): Instruction {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const INSTRUCTION_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'transitionref'
  ]);
  warnUnknownKeys(xmlInstruction, INSTRUCTION_KNOWN_KEYS, errorContext, `instruction(id=${xmlInstruction._attributes?.id || 'unknown'})`);

  return {
    id: xmlInstruction._attributes?.id || '',
    uuid: xmlInstruction.uuid?._text || '',
    name: xmlInstruction.name?._text,
    description: xmlInstruction.description?._text,
    transitionRef: xmlInstruction.transitionref ? convertRef(xmlInstruction.transitionref) : convertRef({ _attributes: { id: '', ref: '' } })
  };
}

/** 共通の Template 既知キー（normalizeTagCase後の小文字キー） */
const TEMPLATE_KNOWN_KEYS = new Set([
  '_attributes', 'uuid', 'name', 'description', 'annotation',
  'placeref', 'templateref', 'property', 'content', 'insertion'
]);

/**
 * Template変換（Material）
 */
function convertMaterialTemplate(xmlTemplate: any, errorContext?: ErrorContext): Template {
  warnUnknownKeys(xmlTemplate, TEMPLATE_KNOWN_KEYS, errorContext, `materialTemplate(id=${xmlTemplate._attributes?.id || 'unknown'})`);
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    category: 'material',
    placeRefs: xmlTemplate.placeref ? convertArray(xmlTemplate.placeref, convertPlaceRef) : [],
    templateRef: xmlTemplate.templateref ? convertRef(xmlTemplate.templateref) : undefined,
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : [],
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : [],
    insertion: xmlTemplate.insertion ? convertInsertion(xmlTemplate.insertion) : undefined
  };
}

/**
 * Template変換（Condition）
 */
function convertConditionTemplate(xmlTemplate: any, errorContext?: ErrorContext): Template {
  warnUnknownKeys(xmlTemplate, TEMPLATE_KNOWN_KEYS, errorContext, `conditionTemplate(id=${xmlTemplate._attributes?.id || 'unknown'})`);
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    category: 'condition',
    placeRefs: xmlTemplate.placeref ? convertArray(xmlTemplate.placeref, convertPlaceRef) : [],
    templateRef: xmlTemplate.templateref ? convertRef(xmlTemplate.templateref) : undefined,
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : [],
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : [],
    insertion: xmlTemplate.insertion ? convertInsertion(xmlTemplate.insertion) : undefined
  };
}

/**
 * Template変換（Result）
 */
function convertResultTemplate(xmlTemplate: any, errorContext?: ErrorContext): Template {
  warnUnknownKeys(xmlTemplate, TEMPLATE_KNOWN_KEYS, errorContext, `resultTemplate(id=${xmlTemplate._attributes?.id || 'unknown'})`);
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    category: 'result',
    placeRefs: xmlTemplate.placeref ? convertArray(xmlTemplate.placeref, convertPlaceRef) : [],
    templateRef: xmlTemplate.templateref ? convertRef(xmlTemplate.templateref) : undefined,
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : [],
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : [],
    insertion: xmlTemplate.insertion ? convertInsertion(xmlTemplate.insertion) : undefined
  };
}

/**
 * xml-js要素から <value> / <values> タグの値を柔軟に取得するヘルパー関数
 *
 * @param xmlEl - xml-js要素（convertXmlJsProperty / convertContent の引数）
 * @returns 取得した値（文字列）、または undefined（value/valuesタグが存在しない場合）
 *
 * @remarks
 * - value/valuesタグが存在しない場合: undefined を返す（タグなし）
 * - valueタグがあるがテキストなし（空タグ）: '' を返す（呼び出し側でデフォルト値に置換）
 * - valueタグが複数（配列）: スペース区切りで連結
 * - valuesタグ: テキストをそのまま返す（既存仕様）
 */
function extractPropertyValue(xmlEl: any): string | undefined {
  // <value>/<values> タグが存在しない場合 → undefined（タグなし）
  if (xmlEl.value === undefined && xmlEl.values === undefined) {
    return undefined;
  }

  // <values> タグの場合（既存仕様）
  if (xmlEl.values !== undefined) {
    return xmlEl.values._text !== undefined ? String(xmlEl.values._text) : '';
  }

  // <value> タグが配列（複数）の場合 → スペース区切りで連結
  if (Array.isArray(xmlEl.value)) {
    const parts = (xmlEl.value as any[])
      .map((v: any) => (v._text !== undefined ? String(v._text) : ''))
      .filter((s: string) => s !== '');
    return parts.length > 0 ? parts.join(' ') : '';
  }

  // <value> タグが単一オブジェクトの場合
  if (xmlEl.value !== null && typeof xmlEl.value === 'object') {
    return xmlEl.value._text !== undefined ? String(xmlEl.value._text) : '';
  }

  // フォールバック（文字列などのプリミティブが入っていた場合）
  return xmlEl.value !== undefined ? String(xmlEl.value) : '';
}

/**
 * xml-js要素を PropertyCustomElement に再帰変換するヘルパー
 */
function convertCustomElement(value: any): PropertyCustomElement {
  if (!value || typeof value !== 'object') {
    return { value: value !== undefined && value !== null ? String(value) : undefined };
  }
  const text = value._text !== undefined ? String(value._text) : undefined;
  const attrs: Record<string, string> = {};
  if (value._attributes) {
    Object.entries(value._attributes).forEach(([k, v]) => {
      if (v !== undefined && v !== null) attrs[k] = String(v);
    });
  }
  const children: Record<string, PropertyCustomElement> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('_')) continue;
    children[k] = convertCustomElement(v);
  }
  return {
    ...(text !== undefined ? { value: text } : {}),
    ...(Object.keys(attrs).length > 0 ? { attributes: attrs } : {}),
    ...(Object.keys(children).length > 0 ? { children } : {}),
  };
}

/**
 * Content変換（xml-jsからContent Union型へ）
 */
export function convertContent(xmlContent: any): Content {
  const key = xmlContent._attributes?.key || '';
  // xsi:type が未指定の場合は空文字として保持し、contentStringListType に強制変換しない
  const xsiType = (xmlContent._attributes?.['xsi:type'] || '') as ContentType;
  const description = xmlContent.description?._text || undefined;
  
  console.log(`🔄 [convertContent] ${key} (${xsiType})`);

  // ✅ カスタム属性（既知属性以外）を収集
  const KNOWN_CONTENT_ATTRS = new Set(['key', 'xsi:type', 'axis', 'size', 'id', 'ref', 'units', 'formatString', 'scaleFactor']);
  const customAttrs: Record<string, string> = {};
  if (xmlContent._attributes) {
    Object.entries(xmlContent._attributes).forEach(([k, v]) => {
      if (!KNOWN_CONTENT_ATTRS.has(k) && v !== undefined && v !== null) {
        customAttrs[k] = String(v);
      }
    });
  }

  // ✅ カスタム子要素（既知キー以外のタグ名）を収集
  const KNOWN_CONTENT_KEYS = new Set([
    '_attributes', 'description', 'value', 'values', 'property', 'content', 'uncertainty'
  ]);
  const customElements: Record<string, PropertyCustomElement> = {};
  for (const [tagName, tagValue] of Object.entries(xmlContent)) {
    if (KNOWN_CONTENT_KEYS.has(tagName)) continue;
    // xml-js の _attributes, _text などの内部キーも除外
    if (tagName.startsWith('_')) continue;
    customElements[tagName] = convertCustomElement(tagValue);
  }
  
  // value タグの有無で値を振り分け（extractPropertyValue を使用）
  const contentValueText = extractPropertyValue(xmlContent);

  // 基本プロパティ
  const result: Content = {
    key,
    xsiType,
    description,
    axis: xmlContent._attributes?.axis,
    size: xmlContent._attributes?.size ? parseInt(xmlContent._attributes.size) : undefined,
    id: xmlContent._attributes?.id,
    ref: xmlContent._attributes?.ref,
    value: contentValueText,
    units: xmlContent._attributes?.units,
    formatString: xmlContent._attributes?.formatString,
    scaleFactor: xmlContent._attributes?.scaleFactor ? parseFloat(xmlContent._attributes.scaleFactor) : undefined,
    properties: xmlContent.property ? convertArray(xmlContent.property, convertXmlJsProperty) : [],
    contents: xmlContent.content ? convertArray(xmlContent.content, convertContent) : [],
    uncertainty: [],
    ...(Object.keys(customAttrs).length > 0 ? { attributes: customAttrs } : {}),
    ...(Object.keys(customElements).length > 0 ? { customElements } : {}),
  };
  
  // ネストされたProperty
  if (xmlContent.property) {
    result.properties = convertArray(xmlContent.property, convertXmlJsProperty);
  }
  
  // ネストされたContent
  if (xmlContent.content) {
    result.contents = convertArray(xmlContent.content, convertContent);
  }
  
  // 不確実性情報
  if (xmlContent.uncertainty) {
    result.uncertainty = convertArray(xmlContent.uncertainty, convertContent);
  }
  
  return result;
}

/**
 * Property変換（xml-jsからProperty Union型へ）
 */
export function convertXmlJsProperty(xmlProp: any): Property {
  const key = xmlProp._attributes?.key || '';
  // xsi:type が未指定の場合は undefined として保持し、stringType に強制変換しない
  const rawXsiType = xmlProp._attributes?.['xsi:type'] as string | undefined;
  // xsi:type が未指定の場合は空文字として保持し、stringType に強制変換しない
  // 空文字の場合は末尾の「未指定」ブランチで処理される
  const xsiType = (rawXsiType || '') as PropertyType;
  const description = xmlProp.description?._text || undefined;
  
  console.log(`🔄 [convertXmlJsProperty] ${key} (${xsiType})`);

  // カスタム属性（既知キー以外）を抽出
  const KNOWN_ATTRS = new Set(['key', 'xsi:type', 'units', 'formatString', 'scaleFactor', 'axis', 'size', 'id', 'ref']);
  const customAttrs: Record<string, string> = {};
  if (xmlProp._attributes) {
    Object.entries(xmlProp._attributes).forEach(([k, v]) => {
      if (!KNOWN_ATTRS.has(k) && v !== undefined && v !== null) {
        customAttrs[k] = String(v);
      }
    });
  }
  const hasCustomAttrs = Object.keys(customAttrs).length > 0;
  
  // PropertyListTypeの場合（ネスト構造）
  if (xsiType === 'propertyListType') {
    const properties: Property[] = [];
    if (xmlProp.property) {
      const propArray = normalizeArray(xmlProp.property);
      propArray.forEach(p => {
        properties.push(convertXmlJsProperty(p)); // 再帰
      });
    }
    
    const result: Property = {
      key,
      xsiType: 'propertyListType',
      description,
      properties,
      contents: xmlProp.content ? convertArray(xmlProp.content, convertContent) : []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }
  
  // value タグの有無を先に判定（全ブランチで共通利用）
  const valueText = extractPropertyValue(xmlProp);

  // 数値型の場合
  if (xsiType === 'intType' || xsiType === 'doubleType' || xsiType === 'floatType' ||
      xsiType === 'longType' || xsiType === 'shortType' || xsiType === 'byteType' ||
      xsiType === 'unsignedIntType' || xsiType === 'unsignedLongType' ||
      xsiType === 'unsignedShortType' || xsiType === 'unsignedByteType' ||
      xsiType === 'decimalType') {
    const units = xmlProp._attributes?.units;
    const formatString = xmlProp._attributes?.formatString;
    const scaleFactor = parseFloat(xmlProp._attributes?.scaleFactor || '1.0');
    // valueタグなし → undefined、あり → 数値変換（失敗時は 0）
    let numValue: number | undefined;
    if (valueText !== undefined) {
      const parsed = parseFloat(valueText || '0');
      const isIntegerType = ['intType', 'longType', 'shortType', 'byteType',
        'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType'].includes(xsiType);
      numValue = isNaN(parsed) ? 0 : (isIntegerType ? Math.floor(parsed) : parsed);
    }
    const result: Property = {
      key, xsiType, description,
      value: numValue,
      units, formatString, scaleFactor,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // Boolean型の場合
  if (xsiType === 'booleanType') {
    // valueタグなし → undefined、あり → boolean変換
    const boolValue = valueText !== undefined
      ? (valueText.toLowerCase() === 'true')
      : undefined;
    const result: Property = {
      key, xsiType: 'booleanType', description,
      value: boolValue,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // DateTime型の場合
  if (xsiType === 'dateTimeType') {
    const result: Property = {
      key, xsiType: 'dateTimeType', description,
      value: valueText !== undefined ? valueText : undefined,
      formatString: xmlProp._attributes?.formatString,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // 文字列系特殊型の場合（tokenType, idType, idRefType, qualifiedNameType, uriType, uuidType, languageType）
  if (['tokenType', 'idType', 'idRefType', 'qualifiedNameType', 'uriType',
       'uuidType', 'languageType'].includes(xsiType)) {
    const result: Property = {
      key, xsiType, description,
      value: valueText !== undefined ? valueText : undefined,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // バイナリ型の場合（base64BinaryType, hexBinaryType）
  if (xsiType === 'base64BinaryType' || xsiType === 'hexBinaryType') {
    const result: Property = {
      key, xsiType, description,
      value: valueText !== undefined ? valueText : undefined,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // リスト型の場合（*ListType）
  if (xsiType.endsWith('ListType')) {
    const result: Property = {
      key, xsiType, description,
      value: valueText !== undefined ? valueText : undefined,
      units: xmlProp._attributes?.units,
      formatString: xmlProp._attributes?.formatString,
      scaleFactor: xmlProp._attributes?.scaleFactor ? parseFloat(xmlProp._attributes.scaleFactor) : undefined,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // stringEnumType（列挙型）の場合
  if (xsiType === 'stringEnumType') {
    const result: Property = {
      key, xsiType: 'stringEnumType', description,
      value: valueText !== undefined ? valueText : undefined,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // stringType 明示の場合
  if (xsiType === 'stringType') {
    const result: Property = {
      key, xsiType: 'stringType', description,
      value: valueText !== undefined ? valueText : undefined,
      properties: [], contents: []
    };
    if (hasCustomAttrs) result.attributes = customAttrs;
    return result;
  }

  // xsi:type 未指定の場合（xsiType === ''）:
  // 空文字のまま保持し、すべての属性（key / xsi:type を除く）を attributes として保持する
  {
    const allAttrs: Record<string, string> = {};
    if (xmlProp._attributes) {
      Object.entries(xmlProp._attributes).forEach(([k, v]) => {
        if (k !== 'key' && k !== 'xsi:type' && v !== undefined && v !== null) {
          allAttrs[k] = String(v);
        }
      });
    }
    const result: Property = {
      key,
      xsiType: '', // 未指定を空文字で明示（undefined の代わり）
      description,
      value: valueText !== undefined ? valueText : undefined,
      properties: [], contents: []
    };
    if (Object.keys(allAttrs).length > 0) result.attributes = allAttrs;
    return result;
  }
}

/**
 * PlaceRef変換
 */
function convertPlaceRef(xmlRef: any): PlaceRef {
  return {
    id: xmlRef._attributes?.id || '',
    ref: xmlRef._attributes?.ref || '',
    initialMarking: xmlRef._attributes?.initialMarking === 'true'
  };
}

/**
 * 汎用Ref変換
 */
function convertRef(xmlRef: any): Reference {
  return {
    id: xmlRef._attributes?.id || '',
    ref: xmlRef._attributes?.ref || ''
  };
}

/**
 * InstanceRef変換
 */
function convertInstanceRef(xmlRef: any): InstanceRef {
  return {
    id: xmlRef._attributes?.id || '',
    ref: xmlRef._attributes?.ref || '',
    name: xmlRef.name?._text,
    description: xmlRef.description?._text
  };
}

/**
 * Hash変換
 */
function convertHash(xmlHash: any): Hash {
  return {
    method: xmlHash._attributes?.method || xmlHash.method?._text,
    value: xmlHash._attributes?.value || xmlHash.value?._text || xmlHash._text
  };
}

/**
 * Insertion変換
 * 
 * XSD仕様: uri/format/uuid は子要素（xs:element）
 * 後方互換: 属性として書かれている場合もフォールバックで対応
 */
function convertInsertion(xmlInsertion: any): Insertion {
  return {
    uri: xmlInsertion.uri?._text || xmlInsertion._attributes?.uri || '',
    hash: xmlInsertion.hash ? convertHash(xmlInsertion.hash) : undefined,
    uuid: xmlInsertion.uuid?._text,
    format: xmlInsertion.format?._text || xmlInsertion._attributes?.format
  };
}

/**
 * Extension変換
 */
function convertExtension(xmlExtension: any): Extension {
  return {
    name: xmlExtension._attributes?.name || '',
    prefix: xmlExtension._attributes?.prefix || '',
    uri: xmlExtension._attributes?.uri || ''
  };
}

/**
 * Globals変換
 */
function convertGlobals(xmlGlobals: any): Globals {
  return {
    scope: xmlGlobals._attributes?.scope || '',
    properties: xmlGlobals.property ? convertArray(xmlGlobals.property, convertXmlJsProperty) : [],
    contents: xmlGlobals.content ? convertArray(xmlGlobals.content, convertContent) : []
  };
}

/**
 * Classifier変換
 */
function convertClassifier(xmlClassifier: any): Classifier {
  return {
    name: xmlClassifier._attributes?.name || '',
    scope: xmlClassifier._attributes?.scope || '',
    keys: xmlClassifier._attributes?.keys || ''
  };
}

/**
 * Data変換
 */
function convertData(xmlData: any, errorContext?: ErrorContext): Data {
  const DATA_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'results'
  ]);
  warnUnknownKeys(xmlData, DATA_KNOWN_KEYS, errorContext, `data(id=${xmlData._attributes?.id || 'unknown'})`);

  // 必須フィールドの検証
  const id = xmlData._attributes?.id;
  if (!id && errorContext) {
    errorContext.addError('id', 'Data id is missing', 'warning');
  }
  
  const uuid = xmlData.uuid?._text;
  if (!uuid && errorContext) {
    errorContext.addError('uuid', 'Data uuid is missing', 'warning');
  }
  
  return {
    id: id || '',
    uuid: uuid || '',
    name: xmlData.name?._text,
    description: xmlData.description?._text,
    results: convertArraySafe(xmlData.results, convertResults, errorContext, 'results')
  };
}

/**
 * Results変換
 */
function convertResults(xmlResults: any, errorContext?: ErrorContext): Results {
  const RESULTS_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'material', 'condition', 'result'
  ]);
  warnUnknownKeys(xmlResults, RESULTS_KNOWN_KEYS, errorContext, `results(id=${xmlResults._attributes?.id || 'unknown'})`);

  return {
    id: xmlResults._attributes?.id || '',
    uuid: xmlResults.uuid?._text || '',
    name: xmlResults.name?._text,
    description: xmlResults.description?._text,
    materials: xmlResults.material ? convertArray(xmlResults.material, (el: any) => convertMaterial(el, errorContext)) : [],
    conditions: xmlResults.condition ? convertArray(xmlResults.condition, (el: any) => convertCondition(el, errorContext)) : [],
    results: xmlResults.result ? convertArray(xmlResults.result, (el: any) => convertResult(el, errorContext)) : []
  };
}

/**
 * Material変換
 */
function convertMaterial(xmlMaterial: any, errorContext?: ErrorContext): Material {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const MATERIAL_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'instanceref', 'property', 'content'
  ]);
  warnUnknownKeys(xmlMaterial, MATERIAL_KNOWN_KEYS, errorContext, `material(id=${xmlMaterial._attributes?.id || 'unknown'})`);

  return {
    id: xmlMaterial._attributes?.id || '',
    uuid: xmlMaterial.uuid?._text || '',
    name: xmlMaterial.name?._text,
    description: xmlMaterial.description?._text,
    ref: xmlMaterial._attributes?.ref || '',
    instanceRef: xmlMaterial.instanceref ? convertInstanceRef(xmlMaterial.instanceref) : undefined,
    properties: xmlMaterial.property ? convertArray(xmlMaterial.property, convertXmlJsProperty) : [],
    contents: xmlMaterial.content ? convertArray(xmlMaterial.content, convertContent) : []
  };
}

/**
 * Condition変換
 */
function convertCondition(xmlCondition: any, errorContext?: ErrorContext): Condition {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const CONDITION_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'instanceref', 'property', 'content'
  ]);
  warnUnknownKeys(xmlCondition, CONDITION_KNOWN_KEYS, errorContext, `condition(id=${xmlCondition._attributes?.id || 'unknown'})`);

  return {
    id: xmlCondition._attributes?.id || '',
    uuid: xmlCondition.uuid?._text || '',
    name: xmlCondition.name?._text,
    description: xmlCondition.description?._text,
    ref: xmlCondition._attributes?.ref || '',
    instanceRef: xmlCondition.instanceref ? convertInstanceRef(xmlCondition.instanceref) : undefined,
    properties: xmlCondition.property ? convertArray(xmlCondition.property, convertXmlJsProperty) : [],
    contents: xmlCondition.content ? convertArray(xmlCondition.content, convertContent) : []
  };
}

/**
 * Result変換
 */
function convertResult(xmlResult: any, errorContext?: ErrorContext): Result {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const RESULT_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'instanceref', 'insertion', 'property', 'content'
  ]);
  warnUnknownKeys(xmlResult, RESULT_KNOWN_KEYS, errorContext, `result(id=${xmlResult._attributes?.id || 'unknown'})`);

  return {
    id: xmlResult._attributes?.id || '',
    uuid: xmlResult.uuid?._text || '',
    name: xmlResult.name?._text,
    description: xmlResult.description?._text,
    ref: xmlResult._attributes?.ref || '',
    instanceRef: xmlResult.instanceref ? convertInstanceRef(xmlResult.instanceref) : undefined,
    insertion: xmlResult.insertion ? convertInsertion(xmlResult.insertion) : undefined,
    properties: xmlResult.property ? convertArray(xmlResult.property, convertXmlJsProperty) : [],
    contents: xmlResult.content ? convertArray(xmlResult.content, convertContent) : []
  };
}

/**
 * EventLog変換
 */
function convertEventLog(xmlEventLog: any, errorContext?: ErrorContext): EventLog {
  const EVENTLOG_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'log'
  ]);
  warnUnknownKeys(xmlEventLog, EVENTLOG_KNOWN_KEYS, errorContext, `eventLog(id=${xmlEventLog._attributes?.id || 'unknown'})`);

  // 必須フィールドの検証
  const id = xmlEventLog._attributes?.id;
  if (!id && errorContext) {
    errorContext.addError('id', 'EventLog id is missing', 'warning');
  }
  
  const uuid = xmlEventLog.uuid?._text;
  if (!uuid && errorContext) {
    errorContext.addError('uuid', 'EventLog uuid is missing', 'warning');
  }
  
  return {
    id: id || '',
    uuid: uuid || '',
    name: xmlEventLog.name?._text,
    description: xmlEventLog.description?._text,
    logs: convertArraySafe(xmlEventLog.log, convertLog, errorContext, 'log')
  };
}

/**
 * Log変換
 */
function convertLog(xmlLog: any, errorContext?: ErrorContext): Log {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const LOG_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'ref',
    'extension', 'global', 'classifier', 'trace', 'creatorref', 'ownerref'
  ]);
  warnUnknownKeys(xmlLog, LOG_KNOWN_KEYS, errorContext, `log(id=${xmlLog._attributes?.id || 'unknown'})`);

  return {
    id: xmlLog._attributes?.id || '',
    uuid: xmlLog.uuid?._text || '',
    name: xmlLog.name?._text,
    description: xmlLog.description?._text,
    ref: xmlLog._attributes?.ref || '',
    extensions: xmlLog.extension ? convertArray(xmlLog.extension, convertExtension) : [],
    globals: xmlLog.global ? convertArray(xmlLog.global, convertGlobals) : [],
    classifiers: xmlLog.classifier ? convertArray(xmlLog.classifier, convertClassifier) : [],
    traces: convertArray(xmlLog.trace, (el: any) => convertTrace(el, errorContext)),
    creatorRefs: xmlLog.creatorref ? convertArray(xmlLog.creatorref, convertRef) : [],
    ownerRefs: xmlLog.ownerref ? convertArray(xmlLog.ownerref, convertRef) : []
  };
}

/**
 * Trace変換
 */
function convertTrace(xmlTrace: any, errorContext?: ErrorContext): Trace {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const TRACE_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'ref',
    'event', 'creatorref', 'ownerref'
  ]);
  warnUnknownKeys(xmlTrace, TRACE_KNOWN_KEYS, errorContext, `trace(id=${xmlTrace._attributes?.id || 'unknown'})`);

  return {
    id: xmlTrace._attributes?.id || '',
    uuid: xmlTrace.uuid?._text || '',
    name: xmlTrace.name?._text,
    description: xmlTrace.description?._text,
    ref: xmlTrace._attributes?.ref || '',
    events: convertArray(xmlTrace.event, (el: any) => convertEvent(el, errorContext)),
    creatorRefs: xmlTrace.creatorref ? convertArray(xmlTrace.creatorref, convertRef) : [],
    ownerRefs: xmlTrace.ownerref ? convertArray(xmlTrace.ownerref, convertRef) : []
  };
}

/**
 * Event変換
 */
function convertEvent(xmlEvent: any, errorContext?: ErrorContext): Event {
  // ※ normalizeTagCase により全キーは小文字化されているため小文字で定義
  const EVENT_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation', 'ref',
    'resultsref', 'creatorref', 'ownerref', 'property', 'content'
  ]);
  warnUnknownKeys(xmlEvent, EVENT_KNOWN_KEYS, errorContext, `event(id=${xmlEvent._attributes?.id || 'unknown'})`);

  return {
    id: xmlEvent._attributes?.id || '',
    uuid: xmlEvent.uuid?._text || '',
    name: xmlEvent.name?._text,
    description: xmlEvent.description?._text,
    ref: xmlEvent._attributes?.ref || '',
    resultsRefs: xmlEvent.resultsref ? convertArray(xmlEvent.resultsref, convertRef) : [],
    creatorRefs: xmlEvent.creatorref ? convertArray(xmlEvent.creatorref, convertRef) : [],
    ownerRefs: xmlEvent.ownerref ? convertArray(xmlEvent.ownerref, convertRef) : [],
    properties: xmlEvent.property ? convertArray(xmlEvent.property, convertXmlJsProperty) : [],
    contents: xmlEvent.content ? convertArray(xmlEvent.content, convertContent) : []
  };
}

/**
 * ヘルパー: 未知キーを警告として収集する共通関数
 *
 * @param xmlEl - 検査対象のxml-jsオブジェクト
 * @param knownKeys - 既知キーのSet（小文字で定義）
 * @param errorContext - エラーコンテキスト
 * @param elementLabel - ログ用の要素名（例: "document", "pnml"）
 */
function warnUnknownKeys(
  xmlEl: any,
  knownKeys: Set<string>,
  errorContext: ErrorContext | undefined,
  elementLabel: string
): void {
  if (!errorContext || !xmlEl || typeof xmlEl !== 'object') return;
  for (const key of Object.keys(xmlEl)) {
    if (!knownKeys.has(key)) {
      errorContext.addError(
        key,
        `Unknown element <${key}> found in ${elementLabel}`,
        'warning'
      );
    }
  }
}

/**
 * ヘルパー: 配列正規化
 */
function normalizeArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * ヘルパー: 配列変換
 */
function convertArray<T, R>(value: any, converter: (item: T) => R): R[] {
  const arr = normalizeArray(value);
  return arr.map(converter);
}

/**
 * ヘルパー: エラーハンドリング付き配列変換
 * 
 * 配列の各要素を変換し、エラーが発生した要素はスキップする
 */
function convertArraySafe<T, R>(
  value: any,
  converter: (item: T) => R,
  errorContext?: ErrorContext,
  elementName?: string
): R[] {
  const arr = normalizeArray(value);
  const results: R[] = [];
  
  arr.forEach((item, index) => {
    try {
      results.push(converter(item));
    } catch (error) {
      if (errorContext && elementName) {
        errorContext.addError(
          `${elementName}[${index}]`,
          `Failed to convert ${elementName} at index ${index}`,
          'warning',
          error as Error
        );
      }
      // エラーが発生した要素はスキップ
    }
  });
  
  return results;
}
