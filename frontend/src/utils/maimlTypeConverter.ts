/**
 * MAIML Type Converter
 * 
 * xml-js形式のデータをXSD準拠の型安全な構造に変換するユーティリティ
 * 
 * @module maimlTypeConverter
 * @version 1.0.0
 * @date 2026-02-02
 * 
 * @note xml-js形式の動的な構造を扱うため、一部の関数でany型を使用しています。
 *       主要な入出力（エントリーポイントとProperty変換）は型安全に保たれています。
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
  Creator,
  Vendor,
  Owner,
  Instrument,
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
 * xml-jsからMaimlRootへの変換（エントリーポイント）
 */
export function convertXmlJsToMaimlRoot(xmlData: XmlJsMaimlRoot | XmlJsElement): MaimlRoot {
  console.log('🔄 [convertXmlJsToMaimlRoot] 型変換開始');
  
  // XmlJsMaimlRootの場合はmaimlを取得、XmlJsElementの場合はそのまま使用
  const maimlElement = (xmlData as XmlJsMaimlRoot).maiml || xmlData as XmlJsElement;
  
  if (!maimlElement) {
    throw new Error('Invalid MAIML data: no maiml element found');
  }
  
  const attrs = maimlElement._attributes || {};
  
  // documentとprotocolは必須
  const docElement = maimlElement.document as XmlJsElement | undefined;
  const protocolElement = maimlElement.protocol as XmlJsElement | undefined;
  
  if (!docElement || !protocolElement) {
    throw new Error('Document and Protocol elements are required');
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
    document: convertDocument(docElement),
    protocol: convertProtocol(protocolElement),
    data: maimlElement.data ? convertData(maimlElement.data as XmlJsElement) : undefined,
    eventLog: maimlElement.eventLog ? convertEventLog(maimlElement.eventLog as XmlJsElement) : undefined
  };
  
  console.log('✅ [convertXmlJsToMaimlRoot] 型変換完了');
  return result;
}

/**
 * Document変換
 */
function convertDocument(xmlDoc: XmlJsElement): MaimlDocument {
  if (!xmlDoc) {
    throw new Error('Document element is required');
  }
  
  return {
    id: getAttribute(xmlDoc, 'id') || '',
    uuid: extractText(xmlDoc.uuid as XmlJsElement) || '',
    name: extractText(xmlDoc.name as XmlJsElement),
    description: extractText(xmlDoc.description as XmlJsElement),
    date: extractText(xmlDoc.date as XmlJsElement),
    creators: convertArray(xmlDoc.creator, convertCreator),
    vendors: convertArray(xmlDoc.vendor, convertVendor),
    owners: convertArray(xmlDoc.owner, convertOwner),
    instruments: xmlDoc.instrument ? convertArray(xmlDoc.instrument, convertInstrument) : undefined
  };
}

/**
 * Creator変換
 */
function convertCreator(xmlCreator: XmlJsElement): Creator {
  return {
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
function convertVendor(xmlVendor: XmlJsElement): Vendor {
  return {
    id: getAttribute(xmlVendor, 'id') || '',
    uuid: extractText(xmlVendor.uuid as XmlJsElement) || '',
    name: extractText(xmlVendor.name as XmlJsElement),
    description: extractText(xmlVendor.description as XmlJsElement)
  };
}

/**
 * Owner変換
 */
function convertOwner(xmlOwner: XmlJsElement): Owner {
  return {
    id: getAttribute(xmlOwner, 'id') || '',
    uuid: extractText(xmlOwner.uuid as XmlJsElement) || '',
    name: extractText(xmlOwner.name as XmlJsElement),
    description: extractText(xmlOwner.description as XmlJsElement)
  };
}

/**
 * Instrument変換
 */
function convertInstrument(xmlInstrument: XmlJsElement): Instrument {
  return {
    id: getAttribute(xmlInstrument, 'id') || '',
    uuid: extractText(xmlInstrument.uuid as XmlJsElement) || '',
    name: extractText(xmlInstrument.name as XmlJsElement),
    description: extractText(xmlInstrument.description as XmlJsElement)
  };
}

/**
 * Protocol変換
 */
function convertProtocol(xmlProtocol: XmlJsElement): Protocol {
  if (!xmlProtocol) {
    throw new Error('Protocol element is required');
  }
  
  const methods = normalizeXmlJsArray(xmlProtocol.method as XmlJsElement);
  
  return {
    id: getAttribute(xmlProtocol, 'id') || '',
    uuid: extractText(xmlProtocol.uuid as XmlJsElement) || '',
    name: extractText(xmlProtocol.name as XmlJsElement),
    description: extractText(xmlProtocol.description as XmlJsElement),
    methods: methods.map(convertMethod),
    materialTemplates: xmlProtocol.materialTemplate ? convertArray(xmlProtocol.materialTemplate, convertMaterialTemplate) : undefined,
    conditionTemplates: xmlProtocol.conditionTemplate ? convertArray(xmlProtocol.conditionTemplate, convertConditionTemplate) : undefined,
    resultTemplates: xmlProtocol.resultTemplate ? convertArray(xmlProtocol.resultTemplate, convertResultTemplate) : undefined
  };
}

/**
 * Method変換
 */
function convertMethod(xmlMethod: any): Method {
  const pnml = xmlMethod.pnml as XmlJsElement | undefined;
  if (!pnml) {
    throw new Error('pnml element is required');
  }
  const program = normalizeArray(xmlMethod.program);
  
  return {
    id: xmlMethod._attributes?.id || '',
    uuid: xmlMethod.uuid?._text || '',
    name: xmlMethod.name?._text,
    description: xmlMethod.description?._text,
    pnml: convertPNML(pnml),
    program: program.map(convertProgram),
    materialTemplates: xmlMethod.materialTemplate ? convertArray(xmlMethod.materialTemplate, convertMaterialTemplate) : undefined,
    conditionTemplates: xmlMethod.conditionTemplate ? convertArray(xmlMethod.conditionTemplate, convertConditionTemplate) : undefined,
    resultTemplates: xmlMethod.resultTemplate ? convertArray(xmlMethod.resultTemplate, convertResultTemplate) : undefined
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
  return {
    id: xmlPlace._attributes?.id || '',
    uuid: xmlPlace.uuid?._text,
    name: xmlPlace.name?._text,
    description: xmlPlace.description?._text
  };
}

/**
 * Transition変換
 */
function convertTransition(xmlTransition: any): Transition {
  return {
    id: xmlTransition._attributes?.id || '',
    uuid: xmlTransition.uuid?._text,
    name: xmlTransition.name?._text,
    description: xmlTransition.description?._text
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
    instructions: xmlProgram.instruction ? convertArray(xmlProgram.instruction, convertInstruction) : undefined,
    materialTemplates: xmlProgram.materialTemplate ? convertArray(xmlProgram.materialTemplate, convertMaterialTemplate) : undefined,
    conditionTemplates: xmlProgram.conditionTemplate ? convertArray(xmlProgram.conditionTemplate, convertConditionTemplate) : undefined,
    resultTemplates: xmlProgram.resultTemplate ? convertArray(xmlProgram.resultTemplate, convertResultTemplate) : undefined
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
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : undefined,
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : undefined,
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
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : undefined,
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : undefined,
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
    properties: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : undefined,
    contents: xmlTemplate.content ? convertArray(xmlTemplate.content, convertContent) : undefined,
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
    scaleFactor: xmlContent._attributes?.scaleFactor ? parseFloat(xmlContent._attributes.scaleFactor) : undefined
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
      contents: xmlProp.content ? convertArray(xmlProp.content, convertContent) : undefined
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
      scaleFactor
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
      value: valueText.toLowerCase() === 'true'
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
      formatString: xmlProp._attributes?.formatString
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
      value: xmlProp.value?._text || ''
    };
    return result;
  }
  
  // バイナリ型の場合（base64BinaryType, hexBinaryType）
  if (xsiType === 'base64BinaryType' || xsiType === 'hexBinaryType') {
    const result: Property = {
      key,
      xsiType,
      description,
      value: xmlProp.value?._text || ''
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
      scaleFactor: xmlProp._attributes?.scaleFactor ? parseFloat(xmlProp._attributes.scaleFactor) : undefined
    };
    return result;
  }
  
  // stringEnumType（列挙型）の場合
  if (xsiType === 'stringEnumType') {
    const result: Property = {
      key,
      xsiType: 'stringEnumType',
      description,
      value: xmlProp.value?._text || ''
    };
    return result;
  }
  
  // デフォルトはString型として扱う
  const result: Property = {
    key,
    xsiType: 'stringType',
    description,
    value: xmlProp.value?._text || ''
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
    properties: xmlGlobals.property ? convertArray(xmlGlobals.property, convertXmlJsProperty) : undefined,
    contents: xmlGlobals.content ? convertArray(xmlGlobals.content, convertContent) : undefined
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
function convertData(xmlData: any): Data {
  return {
    id: xmlData._attributes?.id || '',
    uuid: xmlData.uuid?._text || '',
    name: xmlData.name?._text,
    description: xmlData.description?._text,
    results: convertArray(xmlData.results, convertResults)
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
    materials: xmlResults.material ? convertArray(xmlResults.material, convertMaterial) : undefined,
    conditions: xmlResults.condition ? convertArray(xmlResults.condition, convertCondition) : undefined,
    results: xmlResults.result ? convertArray(xmlResults.result, convertResult) : undefined
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
    properties: xmlMaterial.property ? convertArray(xmlMaterial.property, convertXmlJsProperty) : undefined,
    contents: xmlMaterial.content ? convertArray(xmlMaterial.content, convertContent) : undefined
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
    properties: xmlCondition.property ? convertArray(xmlCondition.property, convertXmlJsProperty) : undefined,
    contents: xmlCondition.content ? convertArray(xmlCondition.content, convertContent) : undefined
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
    properties: xmlResult.property ? convertArray(xmlResult.property, convertXmlJsProperty) : undefined,
    contents: xmlResult.content ? convertArray(xmlResult.content, convertContent) : undefined
  };
}

/**
 * EventLog変換
 */
function convertEventLog(xmlEventLog: any): EventLog {
  return {
    id: xmlEventLog._attributes?.id || '',
    uuid: xmlEventLog.uuid?._text || '',
    name: xmlEventLog.name?._text,
    description: xmlEventLog.description?._text,
    logs: convertArray(xmlEventLog.log, convertLog)
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
    extensions: xmlLog.extension ? convertArray(xmlLog.extension, convertExtension) : undefined,
    globals: xmlLog.global ? convertArray(xmlLog.global, convertGlobals) : undefined,
    classifiers: xmlLog.classifier ? convertArray(xmlLog.classifier, convertClassifier) : undefined,
    traces: convertArray(xmlLog.trace, convertTrace),
    creatorRefs: xmlLog.creatorRef ? convertArray(xmlLog.creatorRef, convertRef) : undefined,
    ownerRefs: xmlLog.ownerRef ? convertArray(xmlLog.ownerRef, convertRef) : undefined
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
    creatorRefs: xmlTrace.creatorRef ? convertArray(xmlTrace.creatorRef, convertRef) : undefined,
    ownerRefs: xmlTrace.ownerRef ? convertArray(xmlTrace.ownerRef, convertRef) : undefined
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
    resultsRefs: xmlEvent.resultsRef ? convertArray(xmlEvent.resultsRef, convertRef) : undefined,
    creatorRefs: xmlEvent.creatorRef ? convertArray(xmlEvent.creatorRef, convertRef) : undefined,
    ownerRefs: xmlEvent.ownerRef ? convertArray(xmlEvent.ownerRef, convertRef) : undefined,
    properties: xmlEvent.property ? convertArray(xmlEvent.property, convertXmlJsProperty) : undefined,
    contents: xmlEvent.content ? convertArray(xmlEvent.content, convertContent) : undefined
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