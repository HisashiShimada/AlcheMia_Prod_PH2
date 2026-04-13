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
  
  // xsi:type が未指定（空文字）の場合は stringType に強制変換しない
  const propType = prop.attributes?.['xsi:type'] || prop.type || prop.xsiType || '';
  
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
  
  // xsi:type が空文字（未指定）の場合は xsi:type 属性を出力しない
  if (propType) {
    propertyXml += ` xsi:type="${escapeXml(propType)}"`;
  }
  propertyXml += `>\n`;
  
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
  
  // xsi:type が未指定（空文字）の場合は contentDoubleListType に強制変換しない
  const xsiType = content.contentType || content.xsiType || content.type || '';
  // xsi:type が空文字（未指定）の場合は xsi:type 属性を出力しない
  if (xsiType) {
    contentXml += ` xsi:type="${escapeXml(xsiType)}"`;
  }
  
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
  
  // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
  if (template.insertion) {
    xml += `      <insertion>\n`;
    // uri は必須（undefinedでも空文字で出力）
    xml += `        <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
    // hash は必須（undefinedでも空文字で出力）
    xml += `        <hash>${escapeXml(template.insertion.hash ?? '')}</hash>\n`;
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
  
  // XSD準拠: placeRef → templateRef の順で出力
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

  // XSD準拠: templateRef は placeRef の後に出力
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
  
  xml += `    </${templateType}>\n`;
  return xml;
}
