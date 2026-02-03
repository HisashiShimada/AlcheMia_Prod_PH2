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
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
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
  TransitionRef,
  TemplateRef
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
    'xmlns:concept': attrs['xmlns:concept'],
    'xmlns:lifecycle': attrs['xmlns:lifecycle'],
    'xmlns:time': attrs['xmlns:time'],
    'xmlns:xsd': attrs['xmlns:xsd'],
    'xmlns:xsi': attrs['xmlns:xsi'],
    features: attrs.features,
    version: attrs.version || '1.0',
    'xsi:type': 'maimlRootType',
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
    creator: convertArray(xmlDoc.creator, convertCreator),
    vendor: convertArray(xmlDoc.vendor, convertVendor),
    owner: convertArray(xmlDoc.owner, convertOwner),
    instrument: xmlDoc.instrument ? convertArray(xmlDoc.instrument, convertInstrument) : undefined
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
    vendorRef: xmlCreator.vendorRef ? convertArray(xmlCreator.vendorRef, convertRef) : undefined,
    instrumentRef: xmlCreator.instrumentRef ? convertArray(xmlCreator.instrumentRef, convertRef) : undefined
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
    method: methods.map(convertMethod),
    materialTemplate: xmlProtocol.materialTemplate ? convertArray(xmlProtocol.materialTemplate, convertMaterialTemplate) : undefined,
    conditionTemplate: xmlProtocol.conditionTemplate ? convertArray(xmlProtocol.conditionTemplate, convertConditionTemplate) : undefined,
    resultTemplate: xmlProtocol.resultTemplate ? convertArray(xmlProtocol.resultTemplate, convertResultTemplate) : undefined
  };
}

/**
 * Method変換
 */
function convertMethod(xmlMethod: any): Method {
  const pnml = normalizeArray(xmlMethod.pnml);
  const program = normalizeArray(xmlMethod.program);
  
  return {
    id: xmlMethod._attributes?.id || '',
    uuid: xmlMethod.uuid?._text || '',
    name: xmlMethod.name?._text,
    description: xmlMethod.description?._text,
    pnml: pnml.map(convertPNML),
    program: program.map(convertProgram),
    materialTemplate: xmlMethod.materialTemplate ? convertArray(xmlMethod.materialTemplate, convertMaterialTemplate) : undefined,
    conditionTemplate: xmlMethod.conditionTemplate ? convertArray(xmlMethod.conditionTemplate, convertConditionTemplate) : undefined,
    resultTemplate: xmlMethod.resultTemplate ? convertArray(xmlMethod.resultTemplate, convertResultTemplate) : undefined
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
    place: convertArray(xmlPnml.place, convertPlace),
    transition: convertArray(xmlPnml.transition, convertTransition),
    arc: convertArray(xmlPnml.arc, convertArc)
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
    instruction: xmlProgram.instruction ? convertArray(xmlProgram.instruction, convertInstruction) : undefined,
    materialTemplate: xmlProgram.materialTemplate ? convertArray(xmlProgram.materialTemplate, convertMaterialTemplate) : undefined,
    conditionTemplate: xmlProgram.conditionTemplate ? convertArray(xmlProgram.conditionTemplate, convertConditionTemplate) : undefined,
    resultTemplate: xmlProgram.resultTemplate ? convertArray(xmlProgram.resultTemplate, convertResultTemplate) : undefined
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
    transitionRef: convertArray(xmlInstruction.transitionRef, convertRef)
  };
}

/**
 * Template変換（Material）
 */
function convertMaterialTemplate(xmlTemplate: any): MaterialTemplate {
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    placeRef: convertArray(xmlTemplate.placeRef, convertPlaceRef),
    templateRef: xmlTemplate.templateRef ? convertArray(xmlTemplate.templateRef, convertRef) : undefined,
    property: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : undefined
  };
}

/**
 * Template変換（Condition）
 */
function convertConditionTemplate(xmlTemplate: any): ConditionTemplate {
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    placeRef: convertArray(xmlTemplate.placeRef, convertPlaceRef),
    templateRef: xmlTemplate.templateRef ? convertArray(xmlTemplate.templateRef, convertRef) : undefined,
    property: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : undefined
  };
}

/**
 * Template変換（Result）
 */
function convertResultTemplate(xmlTemplate: any): ResultTemplate {
  return {
    id: xmlTemplate._attributes?.id || '',
    uuid: xmlTemplate.uuid?._text || '',
    name: xmlTemplate.name?._text,
    description: xmlTemplate.description?._text,
    placeRef: xmlTemplate.placeRef ? convertArray(xmlTemplate.placeRef, convertPlaceRef) : undefined,
    templateRef: xmlTemplate.templateRef ? convertArray(xmlTemplate.templateRef, convertRef) : undefined,
    property: xmlTemplate.property ? convertArray(xmlTemplate.property, convertXmlJsProperty) : undefined
  };
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
      'xsi:type': 'propertyListType',
      description,
      properties
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
    
    if (xsiType === 'intType') {
      const result: Property = {
        key,
        'xsi:type': 'intType',
        description,
        value: isNaN(value) ? 0 : Math.floor(value),
        units: xmlProp._attributes?.units,
        formatString: xmlProp._attributes?.formatString,
        scaleFactor: parseFloat(xmlProp._attributes?.scaleFactor || '1.0')
      };
      return result;
    } else if (xsiType === 'doubleType') {
      const result: Property = {
        key,
        'xsi:type': 'doubleType',
        description,
        value: isNaN(value) ? 0 : value,
        units: xmlProp._attributes?.units,
        formatString: xmlProp._attributes?.formatString,
        scaleFactor: parseFloat(xmlProp._attributes?.scaleFactor || '1.0')
      };
      return result;
    } else if (xsiType === 'floatType') {
      const result: Property = {
        key,
        'xsi:type': 'floatType',
        description,
        value: isNaN(value) ? 0 : value,
        units: xmlProp._attributes?.units,
        formatString: xmlProp._attributes?.formatString,
        scaleFactor: parseFloat(xmlProp._attributes?.scaleFactor || '1.0')
      };
      return result;
    }
  }
  
  // Boolean型の場合
  if (xsiType === 'booleanType') {
    const valueText = xmlProp.value?._text || 'false';
    const result: Property = {
      key,
      'xsi:type': 'booleanType',
      description,
      value: valueText.toLowerCase() === 'true'
    };
    return result;
  }
  
  // DateTime型の場合
  if (xsiType === 'dateTimeType') {
    const result: Property = {
      key,
      'xsi:type': 'dateTimeType',
      description,
      value: xmlProp.value?._text || '',
      formatString: xmlProp._attributes?.formatString
    };
    return result;
  }
  
  // デフォルトはString型として扱う
  const result: Property = {
    key,
    'xsi:type': 'stringType',
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
    name: xmlRef.name?._text,
    description: xmlRef.description?._text,
    initialMarking: xmlRef._attributes?.initialMarking === 'true'
  };
}

/**
 * 汎用Ref変換
 */
function convertRef(xmlRef: any): TransitionRef | TemplateRef {
  return {
    id: xmlRef._attributes?.id || '',
    ref: xmlRef._attributes?.ref || '',
    name: xmlRef.name?._text,
    description: xmlRef.description?._text
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
    material: xmlResults.material ? convertArray(xmlResults.material, convertMaterial) : undefined,
    condition: xmlResults.condition ? convertArray(xmlResults.condition, convertCondition) : undefined,
    result: xmlResults.result ? convertArray(xmlResults.result, convertResult) : undefined
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
    property: xmlMaterial.property ? convertArray(xmlMaterial.property, convertXmlJsProperty) : undefined
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
    property: xmlCondition.property ? convertArray(xmlCondition.property, convertXmlJsProperty) : undefined
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
    property: xmlResult.property ? convertArray(xmlResult.property, convertXmlJsProperty) : undefined
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
    log: convertArray(xmlEventLog.log, convertLog)
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
    trace: convertArray(xmlLog.trace, convertTrace)
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
    event: convertArray(xmlTrace.event, convertEvent)
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
    property: xmlEvent.property ? convertArray(xmlEvent.property, convertXmlJsProperty) : undefined
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