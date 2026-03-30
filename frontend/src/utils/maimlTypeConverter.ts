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
  Classifier
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
    if (maimlElement.data) {
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
    if (maimlElement.eventLog) {
      try {
        errorContext.pushPath('eventLog');
        eventLog = convertEventLog(maimlElement.eventLog as XmlJsElement, errorContext);
        errorContext.popPath();
      } catch (error) {
        errorContext.addError('eventLog', 'Failed to convert eventLog', 'warning', error as Error);
        eventLog = undefined;
        errorContext.popPath();
      }
    }
    
    // 既知キー以外の要素を unknownElements に収集（MaimlRoot レベル）
    const ROOT_KNOWN_KEYS = new Set([
      '_attributes', 'document', 'protocol', 'data', 'eventLog'
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
    chains:  [],
    parents:  [],
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
    vendorRef: xmlCreator.vendorRef ? convertRef(xmlCreator.vendorRef) : undefined,
    instrumentRef: xmlCreator.instrumentRef ? convertRef(xmlCreator.instrumentRef) : undefined
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
  const PROTOCOL_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'method', 'materialTemplate', 'conditionTemplate', 'resultTemplate'
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
    materialTemplates: xmlProtocol.materialTemplate ? convertArraySafe(xmlProtocol.materialTemplate, convertMaterialTemplate, errorContext, 'materialTemplate') : [],
    conditionTemplates: xmlProtocol.conditionTemplate ? convertArraySafe(xmlProtocol.conditionTemplate, convertConditionTemplate, errorContext, 'conditionTemplate') : [],
    resultTemplates: xmlProtocol.resultTemplate ? convertArraySafe(xmlProtocol.resultTemplate, convertResultTemplate, errorContext, 'resultTemplate') : [],
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
  const METHOD_KNOWN_KEYS = new Set([
    '_attributes', 'uuid', 'name', 'description', 'annotation',
    'pnml', 'program', 'materialTemplate', 'conditionTemplate', 'resultTemplate'
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
    pnml: convertPNML(pnml),
    program: convertArraySafe(program, convertProgram, errorContext, 'program'),
    materialTemplates: xmlMethod.materialTemplate ? convertArraySafe(xmlMethod.materialTemplate, convertMaterialTemplate, errorContext, 'materialTemplate') : [],
    conditionTemplates: xmlMethod.conditionTemplate ? convertArraySafe(xmlMethod.conditionTemplate, convertConditionTemplate, errorContext, 'conditionTemplate') : [],
    resultTemplates: xmlMethod.resultTemplate ? convertArraySafe(xmlMethod.resultTemplate, convertResultTemplate, errorContext, 'resultTemplate') : [],
    ...(Object.keys(methodUnknownElements).length > 0 ? { unknownElements: methodUnknownElements } : {})
  };
}

/**
 * PNML変換
 */
function convertPNML(xmlPnml: any): PNML {
  return {
    id: xmlPnml._attributes?.id || '',
    uuid: xmlPnml.uuid?._text || '',
    name: xmlPnml.name?._text,
    description: xmlPnml.description?._text,
    places: convertArray(xmlPnml.place, convertPlace),
    transitions: convertArray(xmlPnml.transition, convertTransition),
    arcs: convertArray(xmlPnml.arc, convertArc)
  };
}

/**
 * Place変換
 */
function convertPlace(xmlPlace: any): Place {
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
function convertTransition(xmlTransition: any): Transition {
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
function convertArc(xmlArc: any): Arc {
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
function convertProgram(xmlProgram: any): Program {
  return {
    id: xmlProgram._attributes?.id || '',
    uuid: xmlProgram.uuid?._text || '',
    name: xmlProgram.name?._text,
    description: xmlProgram.description?._text,
    instructions: xmlProgram.instruction ? convertArray(xmlProgram.instruction, convertInstruction) : [],
    materialTemplates: xmlProgram.materialTemplate ? convertArray(xmlProgram.materialTemplate, convertMaterialTemplate) : [],
    conditionTemplates: xmlProgram.conditionTemplate ? convertArray(xmlProgram.conditionTemplate, convertConditionTemplate) : [],
    resultTemplates: xmlProgram.resultTemplate ? convertArray(xmlProgram.resultTemplate, convertResultTemplate) : []
  };
}

/**
 * Instruction変換
 */
function convertInstruction(xmlInstruction: any): Instruction {
  return {
    id: xmlInstruction._attributes?.id || '',
    uuid: xmlInstruction.uuid?._text || '',
    name: xmlInstruction.name?._text,
    description: xmlInstruction.description?._text,
    transitionRef: convertRef(xmlInstruction.transitionRef)
  };
}

/**
 * Template変換（Material）
 */
function convertMaterialTemplate(xmlTemplate: any): Template {
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    category: 'material',
    placeRefs: convertArray(xmlTemplate.placeRef, convertPlaceRef),
    templateRef: xmlTemplate.templateRef ? convertRef(xmlTemplate.templateRef) : undefined,
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : [],
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : [],
    insertion: xmlTemplate.insertion ? convertInsertion(xmlTemplate.insertion) : undefined
  };
}

/**
 * Template変換（Condition）
 */
function convertConditionTemplate(xmlTemplate: any): Template {
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    category: 'condition',
    placeRefs: convertArray(xmlTemplate.placeRef, convertPlaceRef),
    templateRef: xmlTemplate.templateRef ? convertRef(xmlTemplate.templateRef) : undefined,
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : [],
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : [],
    insertion: xmlTemplate.insertion ? convertInsertion(xmlTemplate.insertion) : undefined
  };
}

/**
 * Template変換（Result）
 */
function convertResultTemplate(xmlTemplate: any): Template {
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    category: 'result',
    placeRefs: convertArray(xmlTemplate.placeRef, convertPlaceRef),
    templateRef: xmlTemplate.templateRef ? convertRef(xmlTemplate.templateRef) : undefined,
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : [],
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : [],
    insertion: xmlTemplate.insertion ? convertInsertion(xmlTemplate.insertion) : undefined
  };
}

/**
 * Content変換（xml-jsからContent Union型へ）
 */
export function convertContent(xmlContent: any): Content {
  const key = xmlContent._attributes?.key || '';
  const xsiType = (xmlContent._attributes?.['xsi:type'] || 'contentStringListType') as ContentType;
  const description = xmlContent.description?._text || undefined;
  
  console.log(`🔄 [convertContent] ${key} (${xsiType})`);
  
  // 基本プロパティ
  const result: Content = {
    key,
    xsiType,
    description,
    axis: xmlContent._attributes?.axis,
    size: xmlContent._attributes?.size ? parseInt(xmlContent._attributes.size) : undefined,
    id: xmlContent._attributes?.id,
    ref: xmlContent._attributes?.ref,
    value: xmlContent.value?._text || xmlContent.values?._text,
    units: xmlContent._attributes?.units,
    formatString: xmlContent._attributes?.formatString,
    scaleFactor: xmlContent._attributes?.scaleFactor ? parseFloat(xmlContent._attributes.scaleFactor) : undefined,
    properties: xmlContent.property ? convertArray(xmlContent.property, convertXmlJsProperty) : [],
    contents: xmlContent.content ? convertArray(xmlContent.content, convertContent) : [],
    uncertainty: [],
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
  const xsiType = (xmlProp._attributes?.['xsi:type'] || 'stringType') as PropertyType;
  const description = xmlProp.description?._text || undefined;
  
  console.log(`🔄 [convertXmlJsProperty] ${key} (${xsiType})`);
  
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
    return result;
  }
  
  // 数値型の場合
  if (xsiType === 'intType' || xsiType === 'doubleType' || xsiType === 'floatType' ||
      xsiType === 'longType' || xsiType === 'shortType' || xsiType === 'byteType' ||
      xsiType === 'unsignedIntType' || xsiType === 'unsignedLongType' || 
      xsiType === 'unsignedShortType' || xsiType === 'unsignedByteType' ||
      xsiType === 'decimalType') {
    const valueText = xmlProp.value?._text || '0';
    const value = parseFloat(valueText);
    const units = xmlProp._attributes?.units;
    const formatString = xmlProp._attributes?.formatString;
    const scaleFactor = parseFloat(xmlProp._attributes?.scaleFactor || '1.0');
    
    const result: Property = {
      key,
      xsiType,
      description,
      value: isNaN(value) ? 0 : (xsiType === 'intType' || xsiType.includes('Type') && 
             ['longType', 'shortType', 'byteType', 'unsignedIntType', 'unsignedLongType', 
              'unsignedShortType', 'unsignedByteType'].includes(xsiType) ? Math.floor(value) : value),
      units,
      formatString,
      scaleFactor,
      properties : [],
      contents : []
    };
    return result;
  }
  
  // Boolean型の場合
  if (xsiType === 'booleanType') {
    const valueText = xmlProp.value?._text || 'false';
    const result: Property = {
      key,
      xsiType: 'booleanType',
      description,
      value: valueText.toLowerCase() === 'true',
      properties : [],
      contents : []
    };
    return result;
  }
  
  // DateTime型の場合
  if (xsiType === 'dateTimeType') {
    const result: Property = {
      key,
      xsiType: 'dateTimeType',
      description,
      value: xmlProp.value?._text || '',
      formatString: xmlProp._attributes?.formatString,
      properties : [],
      contents : []
    };
    return result;
  }
  
  // 文字列系特殊型の場合（tokenType, idType, idRefType, qualifiedNameType, uriType, uuidType, languageType）
  if (['tokenType', 'idType', 'idRefType', 'qualifiedNameType', 'uriType', 
       'uuidType', 'languageType'].includes(xsiType)) {
    const result: Property = {
      key,
      xsiType,
      description,
      value: xmlProp.value?._text || '',
      properties : [],
      contents : []
    };
    return result;
  }
  
  // バイナリ型の場合（base64BinaryType, hexBinaryType）
  if (xsiType === 'base64BinaryType' || xsiType === 'hexBinaryType') {
    const result: Property = {
      key,
      xsiType,
      description,
      value: xmlProp.value?._text || '',
      properties : [],
      contents : []
    };
    return result;
  }
  
  // リスト型の場合
  if (xsiType.endsWith('ListType')) {
    const valueText = xmlProp.value?._text || xmlProp.values?._text || '';
    const result: Property = {
      key,
      xsiType,
      description,
      value: valueText,
      units: xmlProp._attributes?.units,
      formatString: xmlProp._attributes?.formatString,
      scaleFactor: xmlProp._attributes?.scaleFactor ? parseFloat(xmlProp._attributes.scaleFactor) : undefined,
      properties : [],
      contents : []
    };
    return result;
  }
  
  // stringEnumType（列挙型）の場合
  if (xsiType === 'stringEnumType') {
    const result: Property = {
      key,
      xsiType: 'stringEnumType',
      description,
      value: xmlProp.value?._text || '',
      properties : [],
      contents : []
    };
    return result;
  }
  
  // デフォルトはString型として扱う
  const result: Property = {
    key,
    xsiType: 'stringType',
    description,
    value: xmlProp.value?._text || '',
    properties : [],
    contents : []
  };
  return result;
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
 */
function convertInsertion(xmlInsertion: any): Insertion {
  return {
    uri: xmlInsertion._attributes?.uri || '',
    hash: xmlInsertion.hash ? convertHash(xmlInsertion.hash) : undefined,
    uuid: xmlInsertion.uuid?._text,
    format: xmlInsertion._attributes?.format
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
function convertResults(xmlResults: any): Results {
  return {
    id: xmlResults._attributes?.id || '',
    uuid: xmlResults.uuid?._text || '',
    name: xmlResults.name?._text,
    description: xmlResults.description?._text,
    materials: xmlResults.material ? convertArray(xmlResults.material, convertMaterial) : [],
    conditions: xmlResults.condition ? convertArray(xmlResults.condition, convertCondition) : [],
    results: xmlResults.result ? convertArray(xmlResults.result, convertResult) : []
  };
}

/**
 * Material変換
 */
function convertMaterial(xmlMaterial: any): Material {
  return {
    id: xmlMaterial._attributes?.id || '',
    uuid: xmlMaterial.uuid?._text || '',
    name: xmlMaterial.name?._text,
    description: xmlMaterial.description?._text,
    ref: xmlMaterial._attributes?.ref || '',
    instanceRef: xmlMaterial.instanceRef ? convertInstanceRef(xmlMaterial.instanceRef) : undefined,
    properties: xmlMaterial.property ? convertArray(xmlMaterial.property, convertXmlJsProperty) : [],
    contents: xmlMaterial.content ? convertArray(xmlMaterial.content, convertContent) : []
  };
}

/**
 * Condition変換
 */
function convertCondition(xmlCondition: any): Condition {
  return {
    id: xmlCondition._attributes?.id || '',
    uuid: xmlCondition.uuid?._text || '',
    name: xmlCondition.name?._text,
    description: xmlCondition.description?._text,
    ref: xmlCondition._attributes?.ref || '',
    instanceRef: xmlCondition.instanceRef ? convertInstanceRef(xmlCondition.instanceRef) : undefined,
    properties: xmlCondition.property ? convertArray(xmlCondition.property, convertXmlJsProperty) : [],
    contents: xmlCondition.content ? convertArray(xmlCondition.content, convertContent) : []
  };
}

/**
 * Result変換
 */
function convertResult(xmlResult: any): Result {
  return {
    id: xmlResult._attributes?.id || '',
    uuid: xmlResult.uuid?._text || '',
    name: xmlResult.name?._text,
    description: xmlResult.description?._text,
    ref: xmlResult._attributes?.ref || '',
    instanceRef: xmlResult.instanceRef ? convertInstanceRef(xmlResult.instanceRef) : undefined,
    insertion: xmlResult.insertion ? convertInsertion(xmlResult.insertion) : undefined,
    properties: xmlResult.property ? convertArray(xmlResult.property, convertXmlJsProperty) : [],
    contents: xmlResult.content ? convertArray(xmlResult.content, convertContent) : []
  };
}

/**
 * EventLog変換
 */
function convertEventLog(xmlEventLog: any, errorContext?: ErrorContext): EventLog {
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
function convertLog(xmlLog: any): Log {
  return {
    id: xmlLog._attributes?.id || '',
    uuid: xmlLog.uuid?._text || '',
    name: xmlLog.name?._text,
    description: xmlLog.description?._text,
    ref: xmlLog._attributes?.ref || '',
    extensions: xmlLog.extension ? convertArray(xmlLog.extension, convertExtension) : [],
    globals: xmlLog.global ? convertArray(xmlLog.global, convertGlobals) : [],
    classifiers: xmlLog.classifier ? convertArray(xmlLog.classifier, convertClassifier) : [],
    traces: convertArray(xmlLog.trace, convertTrace),
    creatorRefs: xmlLog.creatorRef ? convertArray(xmlLog.creatorRef, convertRef) : [],
    ownerRefs: xmlLog.ownerRef ? convertArray(xmlLog.ownerRef, convertRef) : []
  };
}

/**
 * Trace変換
 */
function convertTrace(xmlTrace: any): Trace {
  return {
    id: xmlTrace._attributes?.id || '',
    uuid: xmlTrace.uuid?._text || '',
    name: xmlTrace.name?._text,
    description: xmlTrace.description?._text,
    ref: xmlTrace._attributes?.ref || '',
    events: convertArray(xmlTrace.event, convertEvent),
    creatorRefs: xmlTrace.creatorRef ? convertArray(xmlTrace.creatorRef, convertRef) : [],
    ownerRefs: xmlTrace.ownerRef ? convertArray(xmlTrace.ownerRef, convertRef) : []
  };
}

/**
 * Event変換
 */
function convertEvent(xmlEvent: any): Event {
  return {
    id: xmlEvent._attributes?.id || '',
    uuid: xmlEvent.uuid?._text || '',
    name: xmlEvent.name?._text,
    description: xmlEvent.description?._text,
    ref: xmlEvent._attributes?.ref || '',
    resultsRefs: xmlEvent.resultsRef ? convertArray(xmlEvent.resultsRef, convertRef) : [],
    creatorRefs: xmlEvent.creatorRef ? convertArray(xmlEvent.creatorRef, convertRef) : [],
    ownerRefs: xmlEvent.ownerRef ? convertArray(xmlEvent.ownerRef, convertRef) : [],
    properties: xmlEvent.property ? convertArray(xmlEvent.property, convertXmlJsProperty) : [],
    contents: xmlEvent.content ? convertArray(xmlEvent.content, convertContent) : []
  };
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
