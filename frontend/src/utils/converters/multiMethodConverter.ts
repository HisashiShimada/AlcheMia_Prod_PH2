/**
 * Multi-Method MaiML Converter
 * 
 * 複数method要素を持つMaiMLファイルの生成
 * 
 * @version 1.0.0
 * @date 2025-12-23
 */

import { Node, Edge } from 'reactflow';
import {
  escapeXml,
  generateUUID,
  buildPropertyXML,
  buildDocumentXML,
  Template,
} from './reactFlowToMaiml';
import { PLACE_DESC_IMPORTED, PLACE_DESC_EXISTING, PLACE_DESC_IMPORTED_EN } from '../../constants/placeDescriptions';
import { DocumentData } from '../documentParser';

/**
 * Method情報の型定義
 */
export interface MethodInfo {
  nodes: Node[];
  edges: Edge[];
  methodId: string;
}

/**
 * 共通テンプレートXMLを生成（複数placeRef対応、protocol直下用）
 * @param node - React Flowノード（共通テンプレート本体）
 * @param templateType - テンプレートタイプ
 * @param allPlaces - 全placeノード（継承元検索用）
 * @param allNodes - 全ノード（commonTemplateRef参照検索用）
 * @returns 共通テンプレート要素のXML文字列
 */
function buildCommonTemplateXML(
  node: Node,
  templateType: string,
  allPlaces: Node[] = [],
  allNodes: Node[] = []
): string {
  const template = node.data.template as Template;
  const prefix = templateType === 'materialTemplate' ? 'MT' :
                 templateType === 'conditionTemplate' ? 'CT' : 'RT';
  const templateId = template.templateId || template.id || `Common${prefix}${node.id}`;
  
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
  
  // name
  if (template.name) {
    xml += `      <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description
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
  // 1. 共通テンプレート本体のplaceRef
  const placeRefId = template.placeRefId || `${templateId}TL`;
  xml += `      <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(node.id)}"/>\n`;
  
  // 2. この共通テンプレートを参照している他のノードのplaceRef
  const referencingNodes = allNodes.filter(n => 
    n.id !== node.id &&
    n.data.commonTemplateRef === node.id
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
        `Common${prefix}${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      xml += `      <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  xml += `    </${templateType}>\n`;
  return xml;
}

/**
 * Template要素のXMLを生成
 * @param node - ノード情報
 * @param templateType - テンプレートタイプ
 * @param allNodes - 全ノード配列（templateRef解決用）
 * @returns template要素のXML文字列
 */
function buildTemplateXML(node: Node, templateType: string, allNodes: Node[] = []): string {
  const template = node.data.template as Template;
  const prefix = templateType === 'materialTemplate' ? 'MT' :
                 templateType === 'conditionTemplate' ? 'CT' : 'RT';
  const templateId = template.templateId || template.id || `${prefix}${node.id}`;
  
  let templateXml = `        <${templateType} id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    templateXml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    templateXml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
  if (template.insertion) {
    templateXml += `          <insertion>\n`;
    // uri は必須（undefinedでも空文字で出力）
    templateXml += `            <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
    // hash は必須（undefinedでも空文字で出力）
    templateXml += `            <hash>${escapeXml(template.insertion.hash ?? '')}</hash>\n`;
    if (template.insertion.format) {
      templateXml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    templateXml += `          </insertion>\n`;
  }
  
  // name
  if (template.name) {
    templateXml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description
  if (template.description) {
    templateXml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter(prop => prop.type !== 'insertion')
      .forEach(prop => {
        templateXml += buildPropertyXML(prop, 5);
      });
  }
  
  // XSD準拠: placeRef → templateRef の順で出力
  const placeRefId = template.placeRefId || `${templateId}TL`;
  templateXml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(node.id)}"/>\n`;

  // XSD準拠: templateRef は placeRef の後に出力
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = allNodes.find(p => p.id === inheritNodeId && p.type !== 'transition');
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplate = inheritNode.data.template as Template;
      const inheritTemplateId = inheritTemplate.templateId || inheritTemplate.id || `${prefix}${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      templateXml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }

  templateXml += `        </${templateType}>\n`;
  
  return templateXml;
}

/**
 * 単一method要素のXMLを生成
 * @param method - method情報（nodes, edges, methodId含む）
 * @param index - methodのindex
 * @param fileName - ファイル名
 * @returns method要素のXML文字列
 */
function buildMethodXML(method: MethodInfo, index: number, fileName: string): string {
  const { nodes, edges, methodId } = method;
  const methodUuid = generateUUID();
  const pnmlId = `pnml_${methodId}`;
  const pnmlUuid = generateUUID();
  const programId = `program_${methodId}`;
  const programUuid = generateUUID();
  
  // ノードを種類別に分類
  const places = nodes.filter(n => n.type !== 'transition');
  const transitions = nodes.filter(n => n.type === 'transition');
  
  let methodXml = `    <method id="${escapeXml(methodId)}">\n`;
  methodXml += `      <uuid>${escapeXml(methodUuid)}</uuid>\n`;
  methodXml += `      <pnml id="${escapeXml(pnmlId)}">\n`;
  methodXml += `        <uuid>${escapeXml(pnmlUuid)}</uuid>\n`;
  methodXml += `        <name>${escapeXml(fileName)}_${escapeXml(methodId)}</name>\n`;
  
  // Place要素群
  places.forEach(place => {
    const hasDescription = place.data.description && 
      place.data.description !== PLACE_DESC_IMPORTED &&
      place.data.description !== PLACE_DESC_EXISTING &&
      place.data.description !== PLACE_DESC_IMPORTED_EN;
    
    if (hasDescription) {
      methodXml += `        <place id="${escapeXml(place.id)}">\n`;
      methodXml += `          <description>${escapeXml(place.data.description)}</description>\n`;
      methodXml += `        </place>\n`;
    } else {
      methodXml += `        <place id="${escapeXml(place.id)}"/>\n`;
    }
  });
  
  // Transition要素群
  transitions.forEach(transition => {
    methodXml += `        <transition id="${escapeXml(transition.id)}"/>\n`;
  });
  
  // Arc要素群
  edges.forEach(arc => {
    methodXml += `        <arc id="${escapeXml(arc.id)}" source="${escapeXml(arc.source)}" target="${escapeXml(arc.target)}">\n`;
    methodXml += `        </arc>\n`;
  });
  
  methodXml += `      </pnml>\n`;
  
  // Program要素
  methodXml += `      <program id="${escapeXml(programId)}">\n`;
  methodXml += `        <uuid>${escapeXml(programUuid)}</uuid>\n`;
  
  // Instruction要素群
  transitions.forEach(transition => {
    methodXml += `        <instruction id="${escapeXml(transition.id)}">\n`;
    methodXml += `          <uuid>${escapeXml(generateUUID())}</uuid>\n`;
    methodXml += `          <description>${escapeXml(transition.data.description || transition.data.name || transition.id)}</description>\n`;
    methodXml += `          <transitionRef id="TR_${escapeXml(transition.id)}" ref="${escapeXml(transition.id)}"/>\n`;
    methodXml += `        </instruction>\n`;
  });
  
  // Template要素群（共通テンプレートを除外）
  const templateNodes = places.filter(place => {
    return place.data.template && 
           place.data.template.type &&
           !place.data.isCommonTemplate; // 共通テンプレートは除外
  });
  
  const materialTemplates = templateNodes.filter(n => n.data.placeType === 'material');
  const conditionTemplates = templateNodes.filter(n => n.data.placeType === 'condition');
  const resultTemplates = templateNodes.filter(n => n.data.placeType === 'result');
  
  // materialTemplate要素群
  materialTemplates.forEach(node => {
    methodXml += buildTemplateXML(node, 'materialTemplate', places);
  });
  
  // conditionTemplate要素群
  conditionTemplates.forEach(node => {
    methodXml += buildTemplateXML(node, 'conditionTemplate', places);
  });
  
  // resultTemplate要素群
  resultTemplates.forEach(node => {
    methodXml += buildTemplateXML(node, 'resultTemplate', places);
  });
  
  methodXml += `      </program>\n`;
  methodXml += `    </method>\n`;
  
  return methodXml;
}

/**
 * 複数methodを含むMaiML XMLを生成
 * @param methods - methods配列（各methodにnodes, edges, methodIdを含む）
 * @param metadata - メタデータ
 * @param documentData - Document情報
 * @returns MaiML XML文字列
 */
export function convertMultipleMethodsToMaiML(
  methods: MethodInfo[],
  metadata: { name?: string; description?: string } = {},
  documentData: DocumentData | null = null
): string {
  if (!methods || methods.length === 0) {
    throw new Error('methodsが空です');
  }
  
  const fileName = (documentData && documentData.name) ? documentData.name : (metadata.name || 'document');
  
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
      protocolId: 'protocolID',
      methodId: 'methodID',
      pnmlId: 'pnmlID',
      programId: 'programID',
      creators: [],
      vendors: [],
      owners: [],
      instruments: [],
    };
    maiml += buildDocumentXML(defaultDoc);
  }
  
  // Protocol要素
  const protocolId = documentData?.protocolId || 'protocolID';
  const protocolUuid = generateUUID();
  
  maiml += `  <protocol id="${escapeXml(protocolId)}">\n`;
  maiml += `    <uuid>${escapeXml(protocolUuid)}</uuid>\n`;
  
  // 全methodsから共通テンプレートを収集
  const allCommonTemplates: Node[] = [];
  const seenTemplateIds = new Set<string>(); // 重複除外用
  
  methods.forEach(method => {
    const places = method.nodes.filter(n => n.type !== 'transition');
    const commonTemplatesInMethod = places.filter(node => 
      node.data.nodeType === 'place' &&
      node.data.isCommonTemplate === true &&
      node.data.template &&
      node.data.template.type
    );
    
    commonTemplatesInMethod.forEach(node => {
      // テンプレートIDで重複チェック
      const template = node.data.template as Template;
      const prefix = node.data.placeType === 'material' ? 'MT' :
                     node.data.placeType === 'condition' ? 'CT' : 'RT';
      const templateId = template.templateId || template.id || `Common${prefix}${node.id}`;
      
      if (!seenTemplateIds.has(templateId)) {
        seenTemplateIds.add(templateId);
        allCommonTemplates.push(node);
      }
    });
  });
  
  // XSD準拠: protocolType は uuid → method+ → materialTemplate* → conditionTemplate* → resultTemplate* の順
  // 各method要素を先に出力
  methods.forEach((method, index) => {
    maiml += buildMethodXML(method, index, fileName);
  });

  // 共通テンプレートを method の後に出力
  if (allCommonTemplates.length > 0) {
    console.log('📋 複数methodから共通テンプレートを収集（method後）:', allCommonTemplates.length, '個');
    
    // 全ノードを収集（継承元検索用 & commonTemplateRef参照検索用）
    const allPlaces: Node[] = [];
    const allNodes: Node[] = [];
    methods.forEach(method => {
      const places = method.nodes.filter(n => n.type !== 'transition');
      allPlaces.push(...places);
      allNodes.push(...method.nodes);
    });
    
    // タイプ別に分類
    const commonMaterialTemplates = allCommonTemplates.filter(n => n.data.placeType === 'material');
    const commonConditionTemplates = allCommonTemplates.filter(n => n.data.placeType === 'condition');
    const commonResultTemplates = allCommonTemplates.filter(n => n.data.placeType === 'result');
    
    commonMaterialTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'materialTemplate', allPlaces, allNodes);
    });
    commonConditionTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'conditionTemplate', allPlaces, allNodes);
    });
    commonResultTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'resultTemplate', allPlaces, allNodes);
    });
  }
  
  maiml += `  </protocol>\n`;
  
  // XSD準拠: data/eventLog は globalObjectContentGroup により uuid が必須
  maiml += `  <data id="dataID">\n`;
  maiml += `    <uuid>${generateUUID()}</uuid>\n`;
  maiml += `  </data>\n`;
  maiml += `  <eventLog id="eventLogID">\n`;
  maiml += `    <uuid>${generateUUID()}</uuid>\n`;
  maiml += `  </eventLog>\n`;
  
  maiml += `</maiml>`;
  
  return maiml;
}
