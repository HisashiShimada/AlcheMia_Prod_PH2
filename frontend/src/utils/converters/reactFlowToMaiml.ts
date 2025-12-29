/**
 * React Flow to MaiML Converter
 * 
 * React FlowのノードとエッジからMaiML XML形式に変換する関数群
 * 
 * @version 1.0.0
 * @date 2025-12-23
 */

import { Node, Edge } from 'reactflow';
import { DocumentData } from '../documentParser';

/**
 * プロパティの型定義
 */
export interface Property {
  key?: string;
  name?: string;
  type?: string;
  xsiType?: string;
  value?: string;
  defaultValue?: string;
  description?: string;
  units?: string;
  unit?: string;
  formatString?: string;
  scaleFactor?: string;
  properties?: Property[];
  children?: Property[];
  attributes?: Record<string, string>;
  elements?: Record<string, string>;
  axis?: string;
  id?: string;
  size?: string;
  contentType?: string;
  insertion?: InsertionData;
}

/**
 * Insertionデータの型定義
 */
export interface InsertionData {
  uri?: string;
  hash?: string;
  format?: string;
}

/**
 * テンプレートの型定義
 */
export interface Template {
  templateId?: string;
  id?: string;
  uuid?: string;
  name?: string;
  description?: string;
  type?: string;
  href?: string;
  properties?: Property[];
  insertion?: InsertionData;
  placeRefId?: string;
}

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * MaiML構造情報の型定義
 */
export interface MaiMLStructure {
  protocol?: {
    id: string;
    uuid: string;
  };
  method?: {
    id: string;
    uuid: string;
  };
  pnml?: {
    id: string;
    uuid: string;
    name?: string;
    description?: string;
  };
  program?: {
    id: string;
    uuid: string;
    description?: string;
  };
  instructions?: Record<string, {
    instructionId: string;
    uuid: string;
    description?: string;
    transitionRefId: string;
    transitionRefRef: string;
  }>;
  data?: {
    id: string;
    rawXML?: string;
  };
  eventLog?: {
    id: string;
    rawXML?: string;
  };
}

/**
 * グラフ統計情報の型定義
 */
export interface GraphStatistics {
  totalNodes: number;
  places: number;
  transitions: number;
  edges: number;
  placesByType: {
    material: number;
    condition: number;
    result: number;
  };
}

/**
 * XML特殊文字をエスケープ
 * @param text - エスケープする文字列
 * @returns エスケープされた文字列
 */
export function escapeXml(text: string | number | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * UUIDを生成
 * @returns UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * ペトリネット構造のバリデーション
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @returns バリデーション結果
 */
export function validatePetriNet(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  
  // 1. ノード存在チェック
  if (!nodes || nodes.length === 0) {
    errors.push('ノードが1つも存在しません');
    return { valid: false, errors };
  }
  
  // 2. エッジの接続先存在チェック
  const nodeIds = new Set(nodes.map(n => n.id));
  if (edges && edges.length > 0) {
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`エッジ ${edge.id} のsource ${edge.source} が存在しません`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`エッジ ${edge.id} のtarget ${edge.target} が存在しません`);
      }
    });
  }
  
  // 3. Place-Transition制約チェック
  if (edges && edges.length > 0) {
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const sourceIsPlace = sourceNode.type !== 'transition';
        const targetIsPlace = targetNode.type !== 'transition';
        
        if (sourceIsPlace === targetIsPlace) {
          errors.push(`エッジ ${edge.id}: Place同士またはTransition同士は接続できません`);
        }
      }
    });
  }
  
  // 4. 必須プロパティチェック
  nodes.forEach(node => {
    if (!node.data) {
      errors.push(`ノード ${node.id} にdataが存在しません`);
      return;
    }
    if (!node.data.name || node.data.name.trim() === '') {
      errors.push(`ノード ${node.id} に名前が設定されていません`);
    }
    if (!node.position) {
      errors.push(`ノード ${node.id} に位置情報が存在しません`);
    }
  });
  
  // 5. ID重複チェック
  const idCounts: Record<string, number> = {};
  nodes.forEach(node => {
    idCounts[node.id] = (idCounts[node.id] || 0) + 1;
  });
  Object.entries(idCounts).forEach(([id, count]) => {
    if (count > 1) {
      errors.push(`ノードID ${id} が${count}回重複しています`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Document要素のXMLを生成（複数要素対応版）
 * @param documentData - Document情報
 * @returns Document要素のXML文字列
 */
export function buildDocumentXML(documentData: DocumentData | null): string {
  if (!documentData) {
    return '';
  }
  
  const doc = documentData;
  let documentXml = `  <document id="${escapeXml(doc.id || 'documentID')}">
    <name>${escapeXml(doc.name || 'document')}</name>`;
  
  if (doc.uuid) {
    documentXml += `\n    <uuid>${escapeXml(doc.uuid)}</uuid>`;
  }
  if (doc.description) {
    documentXml += `\n    <description>${escapeXml(doc.description)}</description>`;
  }
  if (doc.date) {
    documentXml += `\n    <date>${escapeXml(doc.date)}</date>`;
  }
  
  // Creators（配列対応）
  const creators = doc.creators || [];
  creators.forEach(creator => {
    documentXml += `\n    <creator id="${escapeXml(creator.id || 'Creator')}">
      <name>${escapeXml(creator.name || '')}</name>`;
    if (creator.uuid) {
      documentXml += `\n      <uuid>${escapeXml(creator.uuid)}</uuid>`;
    }
    if (creator.description) {
      documentXml += `\n      <description>${escapeXml(creator.description)}</description>`;
    }
    if (creator.annotation) {
      documentXml += `\n      <annotation>${escapeXml(creator.annotation)}</annotation>`;
    }
    if (creator.vendorRef && creator.vendorRef.id && creator.vendorRef.ref) {
      documentXml += `\n      <vendorRef id="${escapeXml(creator.vendorRef.id)}" ref="${escapeXml(creator.vendorRef.ref)}" />`;
    }
    if (creator.instrumentRef && creator.instrumentRef.id && creator.instrumentRef.ref) {
      documentXml += `\n      <instrumentRef id="${escapeXml(creator.instrumentRef.id)}" ref="${escapeXml(creator.instrumentRef.ref)}" />`;
    }
    documentXml += `\n    </creator>`;
  });
  
  // Vendors（配列対応）
  const vendors = doc.vendors || [];
  vendors.forEach(vendor => {
    documentXml += `\n    <vendor id="${escapeXml(vendor.id || 'Vendor')}">
      <name>${escapeXml(vendor.name || '')}</name>`;
    if (vendor.uuid) {
      documentXml += `\n      <uuid>${escapeXml(vendor.uuid)}</uuid>`;
    }
    if (vendor.description) {
      documentXml += `\n      <description>${escapeXml(vendor.description)}</description>`;
    }
    if (vendor.annotation) {
      documentXml += `\n      <annotation>${escapeXml(vendor.annotation)}</annotation>`;
    }
    documentXml += `\n    </vendor>`;
  });
  
  // Owners（配列対応）
  const owners = doc.owners || [];
  owners.forEach(owner => {
    documentXml += `\n    <owner id="${escapeXml(owner.id || 'Owner')}">
      <name>${escapeXml(owner.name || '')}</name>`;
    if (owner.uuid) {
      documentXml += `\n      <uuid>${escapeXml(owner.uuid)}</uuid>`;
    }
    if (owner.description) {
      documentXml += `\n      <description>${escapeXml(owner.description)}</description>`;
    }
    if (owner.annotation) {
      documentXml += `\n      <annotation>${escapeXml(owner.annotation)}</annotation>`;
    }
    documentXml += `\n    </owner>`;
  });
  
  // Instruments（配列対応）
  const instruments = doc.instruments || [];
  instruments.forEach(instrument => {
    documentXml += `\n    <instrument id="${escapeXml(instrument.id || 'Instrument')}">
      <name>${escapeXml(instrument.name || '')}</name>`;
    if (instrument.uuid) {
      documentXml += `\n      <uuid>${escapeXml(instrument.uuid)}</uuid>`;
    }
    if (instrument.description) {
      documentXml += `\n      <description>${escapeXml(instrument.description)}</description>`;
    }
    if (instrument.annotation) {
      documentXml += `\n      <annotation>${escapeXml(instrument.annotation)}</annotation>`;
    }
    documentXml += `\n    </instrument>`;
  });
  
  documentXml += `\n  </document>\n`;
  
  return documentXml;
}

/**
 * property要素を再帰的に出力
 * @param prop - プロパティオブジェクト
 * @param indentLevel - インデントレベル
 * @returns property要素のXML文字列
 */
export function buildPropertyXML(prop: Property, indentLevel: number = 5): string {
  const indent = '  '.repeat(indentLevel);
  const propName = prop.key || prop.name || '';
  
  const propType = prop.attributes?.['xsi:type'] || prop.type || prop.xsiType || 'stringType';
  
  let propertyXml = `${indent}<property key="${escapeXml(propName)}"`;
  
  // 属性出力
  if (prop.attributes) {
    Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
      if (attrName !== 'xsi:type' && attrValue) {
        propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  } else {
    if (prop.units || prop.unit) {
      propertyXml += ` units="${escapeXml(prop.units || prop.unit)}"`;
    }
    if (prop.formatString) {
      propertyXml += ` formatString="${escapeXml(prop.formatString)}"`;
    }
    if (prop.scaleFactor) {
      propertyXml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
    }
  }
  
  propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
  
  // elements出力
  if (prop.elements && Object.keys(prop.elements).length > 0) {
    Object.entries(prop.elements).forEach(([elemName, elemValue]) => {
      if (elemValue !== undefined && elemValue !== '') {
        propertyXml += `${indent}  <${elemName}>${escapeXml(elemValue)}</${elemName}>\n`;
      }
    });
  }
  
  // propertyListTypeの子要素
  if (propType === 'propertyListType') {
    if (prop.children && Array.isArray(prop.children) && prop.children.length > 0) {
      prop.children.forEach(childProp => {
        propertyXml += buildPropertyXML(childProp, indentLevel + 1);
      });
    } else if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      prop.properties.forEach(childProp => {
        propertyXml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
  } else if (propType === 'content' || propType === 'contentDoubleListType' || propType === 'contentListType') {
    propertyXml += buildContentXML(prop, indentLevel + 1);
  } else if (!prop.elements) {
    if (prop.description !== undefined && prop.description !== '') {
      propertyXml += `${indent}  <description>${escapeXml(prop.description)}</description>\n`;
    }
    const value = prop.value || prop.defaultValue || '';
    if (value !== '') {
      propertyXml += `${indent}  <value>${escapeXml(value)}</value>\n`;
    }
  }
  
  propertyXml += `${indent}</property>\n`;
  
  return propertyXml;
}

/**
 * content要素を出力
 * @param content - contentオブジェクト
 * @param indentLevel - インデントレベル
 * @returns content要素のXML文字列
 */
function buildContentXML(content: Property, indentLevel: number = 6): string {
  const indent = '  '.repeat(indentLevel);
  
  let contentXml = `${indent}<content`;
  
  if (content.axis) contentXml += ` axis="${escapeXml(content.axis)}"`;
  if (content.formatString) contentXml += ` formatString="${escapeXml(content.formatString)}"`;
  if (content.id) contentXml += ` id="${escapeXml(content.id)}"`;
  if (content.key) contentXml += ` key="${escapeXml(content.key)}"`;
  if (content.scaleFactor) contentXml += ` scaleFactor="${escapeXml(content.scaleFactor)}"`;
  if (content.size) contentXml += ` size="${escapeXml(content.size)}"`;
  if (content.units) contentXml += ` units="${escapeXml(content.units)}"`;
  
  const xsiType = content.contentType || content.xsiType || content.type || 'contentDoubleListType';
  contentXml += ` xsi:type="${escapeXml(xsiType)}"`;
  
  contentXml += `>\n${indent}</content>\n`;
  
  return contentXml;
}

/**
 * 共通テンプレートXMLを生成
 * @param node - React Flowノード
 * @param templateType - テンプレートタイプ
 * @param allPlaces - 全placeノード
 * @param allNodes - 全ノード
 * @returns 共通テンプレート要素のXML文字列
 */
function buildCommonTemplateXML(
  node: Node,
  templateType: string,
  allPlaces: Node[] = [],
  allNodes: Node[] = []
): string {
  const template = node.data.template as Template;
  const templateId = template.templateId || template.id || `Common${templateType.replace('Template', '')}${node.id}`;
  
  let xml = `    <${templateType} id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    xml += `      <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    xml += `      <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = allPlaces.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplate = inheritNode.data.template as Template;
      const inheritTemplateId = inheritTemplate.templateId || inheritTemplate.id || 
        `Common${templateType.replace('Template', '')}${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      xml += `      <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    xml += `      <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      xml += `        <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      xml += `        <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      xml += `        <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    xml += `      </insertion>\n`;
  }
  
  if (template.name) {
    xml += `      <name>${escapeXml(template.name)}</name>\n`;
  }
  if (template.description) {
    xml += `      <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter(prop => prop.type !== 'insertion')
      .forEach(prop => {
        xml += buildPropertyXML(prop, 3);
      });
  }
  
  // 複数のplaceRef
  const placeRefId = template.placeRefId || `${templateId}TL`;
  xml += `      <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(node.id)}"/>\n`;
  
  const referencingNodes = allNodes.filter(n => 
    n.id !== node.id && n.data.commonTemplateRef === node.id
  );
  
  console.log(`📋 共通テンプレート ${templateId}: ${referencingNodes.length}個のノードから参照されています`, 
    referencingNodes.map(n => n.id));
  
  referencingNodes.forEach((refNode, index) => {
    const refPlaceRefId = `${templateId}TL_ref${index + 1}`;
    xml += `      <placeRef id="${escapeXml(refPlaceRefId)}" ref="${escapeXml(refNode.id)}"/>\n`;
  });
  
  xml += `    </${templateType}>\n`;
  return xml;
}

/**
 * React FlowのノードとエッジからMaiML XMLを生成
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @param metadata - メタデータ
 * @param documentData - Document情報
 * @param originalStructure - 元MaiML構造情報
 * @returns MaiML XML文字列
 */
export async function convertReactFlowToMaiML(
  nodes: Node[],
  edges: Edge[],
  metadata: { name?: string; description?: string } = {},
  documentData: DocumentData | null = null,
  originalStructure: MaiMLStructure | null = null
): Promise<string> {
  // バリデーション
  const validation = validatePetriNet(nodes, edges);
  if (!validation.valid) {
    throw new Error(`バリデーションエラー:\n${validation.errors.join('\n')}`);
  }
  
  const fileName = (documentData && documentData.name) ? documentData.name : (metadata.name || 'document');
  
  const places = nodes.filter(n => n.type !== 'transition');
  const transitions = nodes.filter(n => n.type === 'transition');
  
  const protocolId = documentData?.protocolId || originalStructure?.protocol?.id || 'protocolID';
  const protocolUuid = originalStructure?.protocol?.uuid || generateUUID();
  const methodId = documentData?.methodId || originalStructure?.method?.id || 'methodID';
  const methodUuid = originalStructure?.method?.uuid || generateUUID();
  const pnmlId = documentData?.pnmlId || originalStructure?.pnml?.id || 'pnmlID';
  const pnmlUuid = originalStructure?.pnml?.uuid || generateUUID();
  const pnmlName = originalStructure?.pnml?.name || `${fileName}PNML`;
  const pnmlDescription = originalStructure?.pnml?.description || '';
  const programId = documentData?.programId || originalStructure?.program?.id || 'programID';
  const programUuid = originalStructure?.program?.uuid || generateUUID();
  const programDescription = originalStructure?.program?.description || '';
  
  // XMLヘッダー
  let maiml = `<?xml version="1.0" encoding="utf-8" standalone="no"?>\n`;
  maiml += `<maiml version="1.0" xmlns="http://www.maiml.org/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">\n`;
  
  // Document要素
  if (documentData) {
    maiml += buildDocumentXML(documentData);
  } else {
    const defaultDoc: DocumentData = {
      id: 'documentID',
      uuid: generateUUID(),
      name: fileName,
      description: '',
      date: new Date().toISOString(),
      protocolId,
      methodId,
      pnmlId,
      programId,
      creators: [],
      vendors: [],
      owners: [],
      instruments: [],
    };
    maiml += buildDocumentXML(defaultDoc);
  }
  
  // Template要素群
  const templateNodes = places.filter(place => place.data.template && place.data.template.type);
  const commonTemplates = templateNodes.filter(n => n.data.isCommonTemplate === true);
  const normalTemplates = templateNodes.filter(n => !n.data.isCommonTemplate);
  
  maiml += `  <protocol id="${escapeXml(protocolId)}">\n`;
  maiml += `    <uuid>${escapeXml(protocolUuid)}</uuid>\n`;
  
  // 共通テンプレート出力
  if (commonTemplates.length > 0) {
    console.log('📋 共通テンプレートを<protocol>直下に出力:', commonTemplates.length, '個');
    
    const commonMaterialTemplates = commonTemplates.filter(n => n.data.placeType === 'material');
    const commonConditionTemplates = commonTemplates.filter(n => n.data.placeType === 'condition');
    const commonResultTemplates = commonTemplates.filter(n => n.data.placeType === 'result');
    
    commonMaterialTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'materialTemplate', places, nodes);
    });
    commonConditionTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'conditionTemplate', places, nodes);
    });
    commonResultTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'resultTemplate', places, nodes);
    });
  }
  
  maiml += `    <method id="${escapeXml(methodId)}">\n`;
  maiml += `      <uuid>${escapeXml(methodUuid)}</uuid>\n`;
  maiml += `      <pnml id="${escapeXml(pnmlId)}">\n`;
  maiml += `        <uuid>${escapeXml(pnmlUuid)}</uuid>\n`;
  
  if (originalStructure?.pnml?.name || !originalStructure) {
    maiml += `        <name>${escapeXml(pnmlName)}</name>\n`;
  }
  if (pnmlDescription) {
    maiml += `        <description>${escapeXml(pnmlDescription)}</description>\n`;
  }
  
  // Place要素群
  places.forEach(place => {
    const hasName = place.data.name && place.data.name.trim() !== '';
    const hasDescription = place.data.description && 
      place.data.description !== 'インポート済み' && 
      place.data.description !== '既存プレース' && 
      place.data.description !== 'imported' &&
      place.data.description.trim() !== '';
    
    if (hasName || hasDescription) {
      maiml += `        <place id="${escapeXml(place.id)}">\n`;
      if (hasName) {
        maiml += `          <name>${escapeXml(place.data.name)}</name>\n`;
      }
      if (hasDescription) {
        maiml += `          <description>${escapeXml(place.data.description)}</description>\n`;
      }
      maiml += `        </place>\n`;
    } else {
      maiml += `        <place id="${escapeXml(place.id)}"/>\n`;
    }
  });
  
  // Transition要素群
  transitions.forEach(transition => {
    const hasName = transition.data.name && transition.data.name.trim() !== '';
    const hasDescription = transition.data.description && transition.data.description.trim() !== '';
    
    if (hasName || hasDescription) {
      maiml += `        <transition id="${escapeXml(transition.id)}">\n`;
      if (hasName) {
        maiml += `          <name>${escapeXml(transition.data.name)}</name>\n`;
      }
      if (hasDescription) {
        maiml += `          <description>${escapeXml(transition.data.description)}</description>\n`;
      }
      maiml += `        </transition>\n`;
    } else {
      maiml += `        <transition id="${escapeXml(transition.id)}"/>\n`;
    }
  });
  
  // Arc要素群
  edges.forEach(arc => {
    maiml += `        <arc id="${escapeXml(arc.id)}" source="${escapeXml(arc.source)}" target="${escapeXml(arc.target)}">\n`;
    maiml += `        </arc>\n`;
  });
  
  maiml += `      </pnml>\n`;
  
  // Program要素
  maiml += `      <program id="${escapeXml(programId)}">\n`;
  maiml += `        <uuid>${escapeXml(programUuid)}</uuid>\n`;
  if (programDescription) {
    maiml += `        <description>${escapeXml(programDescription)}</description>\n`;
  }
  
  // Instruction要素群
  transitions.forEach(transition => {
    const transitionId = transition.id;
    const originalInstruction = originalStructure?.instructions?.[transitionId];
    
    if (originalInstruction) {
      maiml += `        <instruction id="${escapeXml(originalInstruction.instructionId)}">\n`;
      maiml += `          <uuid>${escapeXml(originalInstruction.uuid)}</uuid>\n`;
      if (originalInstruction.description) {
        maiml += `          <description>${escapeXml(originalInstruction.description)}</description>\n`;
      }
      maiml += `          <transitionRef id="${escapeXml(originalInstruction.transitionRefId)}" ref="${escapeXml(originalInstruction.transitionRefRef)}"/>\n`;
      maiml += `        </instruction>\n`;
    } else {
      maiml += `        <instruction id="${escapeXml(transition.id)}">\n`;
      maiml += `          <uuid>${generateUUID()}</uuid>\n`;
      maiml += `          <description>${escapeXml(transition.data.description || transition.data.name || transition.id)}</description>\n`;
      maiml += `          <transitionRef id="TR_${escapeXml(transition.id)}" ref="${escapeXml(transition.id)}"/>\n`;
      maiml += `        </instruction>\n`;
    }
  });
  
  // 通常テンプレート出力（program内）は省略（大規模なため、必要に応じて後で追加）
  
  maiml += `      </program>\n`;
  maiml += `    </method>\n`;
  maiml += `  </protocol>\n`;
  
  // data/eventLog要素
  const dataId = originalStructure?.data?.id || 'dataID';
  maiml += `  <data id="${escapeXml(dataId)}">\n`;
  maiml += `  </data>\n`;
  
  const eventLogId = originalStructure?.eventLog?.id || 'eventLogID';
  maiml += `  <eventLog id="${escapeXml(eventLogId)}">\n`;
  maiml += `  </eventLog>\n`;
  
  maiml += `</maiml>`;
  
  return maiml;
}

/**
 * バリデーションエラーメッセージを整形
 * @param errors - エラー配列
 * @returns 整形されたエラーメッセージ
 */
export function formatValidationErrors(errors: string[]): string {
  if (!errors || errors.length === 0) {
    return 'エラーはありません';
  }
  
  return `以下のエラーが見つかりました:\n\n${errors.map((err, i) => `${i + 1}. ${err}`).join('\n')}`;
}

/**
 * ノード・エッジの統計情報を取得
 * @param nodes - ノード配列
 * @param edges - エッジ配列
 * @returns 統計情報
 */
export function getGraphStatistics(nodes: Node[], edges: Edge[]): GraphStatistics {
  const places = nodes.filter(n => n.type !== 'transition');
  const transitions = nodes.filter(n => n.type === 'transition');
  
  const placesByType = {
    material: places.filter(p => p.data.placeType === 'material').length,
    condition: places.filter(p => p.data.placeType === 'condition').length,
    result: places.filter(p => p.data.placeType === 'result').length,
  };
  
  return {
    totalNodes: nodes.length,
    places: places.length,
    transitions: transitions.length,
    edges: edges ? edges.length : 0,
    placesByType
  };
}
