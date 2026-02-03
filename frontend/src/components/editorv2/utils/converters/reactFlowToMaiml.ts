/**
 * React Flow to MaiML Converter
 * 
 * React FlowのノードとエッジからMaiML XML形式に変換する関数群
 * 
 * @version 2.0.0-beta
 * @date 2026-01-29
 */

import { Node, Edge } from 'reactflow';
import { 
  NodeData,
  NodeType,
  PlaceType,
  Template,
  TemplateMap,
  DocumentData,
  MethodData
} from '../../types';

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
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
 * 元MaiML構造情報の型定義
 */
export interface OriginalStructure {
  protocol?: {
    id?: string;
    uuid?: string;
  };
  method?: {
    id?: string;
    uuid?: string;
  };
  pnml?: {
    id?: string;
    uuid?: string;
    name?: string;
    description?: string;
  };
  program?: {
    id?: string;
    uuid?: string;
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
    id?: string;
    rawXML?: string;
  };
  eventLog?: {
    id?: string;
    rawXML?: string;
  };
}

/**
 * Property型の定義（MaiMLParser形式とNestedPropertyEditor形式の両方に対応）
 */
export interface Property {
  key?: string;
  name?: string;
  type?: string;
  xsiType?: string;
  attributes?: Record<string, string>;
  elements?: Record<string, string>;
  units?: string;
  unit?: string;
  formatString?: string;
  scaleFactor?: string;
  description?: string;
  value?: string;
  defaultValue?: string;
  children?: Property[];
  properties?: Property[];
  axis?: string;
  contentType?: string;
  id?: string;
  size?: string;
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
 * Place要素のXMLを生成
 * @param node - React Flowノード
 * @returns Place要素のXML文字列
 */
function buildPlaceXML(node: Node<NodeData>): string {
  const { id, data, position } = node;
  const placeType = data.placeType || 'material';
  
  // 基本情報
  let placeXml = `    <place id="${escapeXml(id)}" placeType="${escapeXml(placeType)}">
      <name>${escapeXml(data.name || 'Unnamed Place')}</name>
      <description>${escapeXml(data.description || '')}</description>
      <position x="${Math.round(position.x)}" y="${Math.round(position.y)}" />`;
  
  // Template情報がある場合は追加
  if (data.templateRef && data.templateRef.properties && data.templateRef.properties.length > 0) {
    const templateType = data.templateRef.type || 
      (placeType === 'material' ? 'MaterialTemplate' :
       placeType === 'condition' ? 'ConditionTemplate' :
       'ResultTemplate');
    
    placeXml += `\n      <templateRef>
        <${escapeXml(templateType)}>`;
    
    // プロパティを追加
    data.templateRef.properties.forEach(prop => {
      placeXml += `\n          <property name="${escapeXml(prop.name)}">
            <value>${escapeXml(prop.value || '')}</value>`;
      
      // 単位がある場合のみ追加
      if (prop.unit) {
        placeXml += `\n            <unit>${escapeXml(prop.unit)}</unit>`;
      }
      
      placeXml += `\n          </property>`;
    });
    
    placeXml += `\n        </${escapeXml(templateType)}>
      </templateRef>`;
  }
  
  placeXml += `\n    </place>`;
  
  return placeXml;
}

/**
 * Transition要素のXMLを生成
 * @param node - React Flowノード
 * @returns Transition要素のXML文字列
 */
function buildTransitionXML(node: Node<NodeData>): string {
  const { id, data, position } = node;
  
  return `    <transition id="${escapeXml(id)}">
      <name>${escapeXml(data.name || 'Unnamed Transition')}</name>
      <description>${escapeXml(data.description || '')}</description>
      <position x="${Math.round(position.x)}" y="${Math.round(position.y)}" />
    </transition>`;
}

/**
 * Arc要素のXMLを生成
 * @param edge - React Flowエッジ
 * @returns Arc要素のXML文字列
 */
function buildArcXML(edge: Edge): string {
  const { id, source, target } = edge;
  
  // MaiML規約: arcにはid, source, target属性のみ（descriptionなし）
  return `    <arc id="${escapeXml(id)}" source="${escapeXml(source)}" target="${escapeXml(target)}" />`;
}

/**
 * ペトリネット構造のバリデーション
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @param allTemplates - TemplateContext のテンプレート（オプション）
 * @param allMethods - 全メソッドの配列（複数メソッド対応）
 * @returns { valid: boolean, errors: string[] }
 */
export function validatePetriNet(
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  allTemplates: TemplateMap | null = null, 
  allMethods: MethodData[] | null = null
): ValidationResult {
  const errors: string[] = [];
  
  console.log('🔍 [validatePetriNet] バリデーション開始:', {
    nodesCount: nodes?.length || 0,
    edgesCount: edges?.length || 0,
    nodesSample: nodes?.[0] || null,
    hasAllTemplates: !!allTemplates,
    hasAllMethods: !!allMethods,
    methodsCount: allMethods?.length || 0
  });
  
  // 1. ノード存在チェック
  if (!nodes || nodes.length === 0) {
    console.log('❌ [validatePetriNet] ノードが存在しません');
    errors.push('ノードが1つも存在しません');
    return { valid: false, errors };
  }
  
  // 1.5. テンプレートのplaceRefsチェック（MaiML規約）
  const places = nodes.filter(n => n.type !== 'transition');
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // ✅ 複数メソッド対応: 全メソッドのノードIDを収集
  const allNodeIds = new Set(nodeIds);
  if (allMethods && allMethods.length > 0) {
    console.log('🔍 [validatePetriNet] allMethods詳細:', {
      methodsCount: allMethods.length,
      methods: allMethods.map(m => ({
        methodId: m.methodId,
        methodIndex: m.methodIndex,
        hasNodes: !!m.nodes,
        nodesCount: m.nodes?.length || 0,
        nodeIds: m.nodes?.map((n: Node<NodeData>) => n.id).slice(0, 5) || []
      }))
    });
    
    allMethods.forEach((method, index) => {
      if (method.nodes) {
        method.nodes.forEach((node: Node<NodeData>) => allNodeIds.add(node.id));
        console.log(`  Method ${index} (${method.methodId}): ${method.nodes.length}ノード追加`);
      } else {
        console.warn(`  ⚠️ Method ${index} (${method.methodId}): nodesプロパティがありません`);
      }
    });
    console.log('🔍 [validatePetriNet] 全メソッドのノードID数:', allNodeIds.size);
    console.log('🔍 [validatePetriNet] 全ノードIDサンプル:', Array.from(allNodeIds).slice(0, 10));
  }
  
  console.log('🔍 [validatePetriNet] テンプレートチェック開始:', {
    placesCount: places.length,
    nodeIdsCount: nodeIds.size,
    allNodeIdsCount: allNodeIds.size
  });
  
  // ✅ TemplateContextからのテンプレートチェック（共通テンプレート対応）
  if (allTemplates) {
    const allTemplatesList: Template[] = [];
    if (Array.isArray(allTemplates.material)) {
      allTemplatesList.push(...allTemplates.material);
    }
    if (Array.isArray(allTemplates.condition)) {
      allTemplatesList.push(...allTemplates.condition);
    }
    if (Array.isArray(allTemplates.result)) {
      allTemplatesList.push(...allTemplates.result);
    }
    
    allTemplatesList.forEach(template => {
      const templateId = template.id;
      const placeRefs = template.placeRefs || [];
      const isCommonTemplate = template.methodId === null;
      
      if (placeRefs.length === 0) {
        console.warn(`⚠️ [validatePetriNet] テンプレート ${templateId} のplaceRefsが空です`);
      } else {
        // ✅ 共通テンプレートの場合は全メソッドのノードIDでチェック
        const checkNodeIds = isCommonTemplate ? allNodeIds : nodeIds;
        const invalidRefs = placeRefs.filter(ref => !checkNodeIds.has(ref));
        
        if (invalidRefs.length > 0) {
          console.error(`❌ [validatePetriNet] テンプレート ${templateId}: 存在しないノードへの参照`, {
            invalidRefs,
            isCommonTemplate,
            checkedAgainst: isCommonTemplate ? 'allNodeIds' : 'currentMethodNodeIds'
          });
          errors.push(`テンプレート ${templateId}: 存在しないノードへの参照 [${invalidRefs.join(', ')}]`);
        }
      }
    });
  }
  // フォールバック: ノードのテンプレートをチェック
  else {
    places.forEach(place => {
      if (place.data.template && place.data.template.type) {
        const template = place.data.template;
        const templateId = template.id || place.id;
        
        // placeRefsの存在チェック
        const placeRefs = template.placeRefs || [];
        
        // placeRefsが空の場合
        if (placeRefs.length === 0) {
          // 自分自身のノードが存在する場合は警告のみ（自動補完可能）
          if (nodeIds.has(place.id)) {
            console.warn(`⚠️ [validatePetriNet] テンプレート ${templateId} のplaceRefsが空です（自動的に自分自身を追加します）`);
          } else {
            // ノードが存在しない場合はエラー
            console.error(`❌ [validatePetriNet] テンプレート ${templateId}: placeRef要素が1つも存在しません`);
            errors.push(`テンプレート ${templateId}: placeRef要素が1つも存在しません（MaiML規約違反）`);
          }
        } else {
          // placeRefsが存在する場合、参照先ノードの存在をチェック
          const invalidRefs = placeRefs.filter(ref => !nodeIds.has(ref));
          if (invalidRefs.length > 0) {
            console.error(`❌ [validatePetriNet] テンプレート ${templateId}: 存在しないノードへの参照`, invalidRefs);
            errors.push(`テンプレート ${templateId}: 存在しないノードへの参照 [${invalidRefs.join(', ')}]`);
          }
        }
      }
    });
  }
  
  console.log('✅ [validatePetriNet] テンプレートチェック完了:', {
    errorCount: errors.length
  });
  
  // 2. エッジの接続先存在チェック
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
  // PlaceからTransition、TransitionからPlaceのみ接続可能
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
    // 名前チェックを削除（空の場合はIDをフォールバックとして使用するため）
    // バリデーションエラーとしない
    
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
  
  const result: ValidationResult = {
    valid: errors.length === 0,
    errors
  };
  
  console.log('✅ [validatePetriNet] バリデーション完了:', {
    valid: result.valid,
    errorCount: result.errors.length,
    errors: result.errors
  });
  
  return result;
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
  
  // Creators（配列対応、後方互換性維持）
  const creators = doc.creators || (doc.creator ? [doc.creator] : []);
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
    // vendorRefは両方の属性が存在する場合のみ出力
    if (creator.vendorRef && creator.vendorRef.id && creator.vendorRef.ref) {
      documentXml += `\n      <vendorRef id="${escapeXml(creator.vendorRef.id)}" ref="${escapeXml(creator.vendorRef.ref)}" />`;
    }
    // instrumentRefは両方の属性が存在する場合のみ出力
    if (creator.instrumentRef && creator.instrumentRef.id && creator.instrumentRef.ref) {
      documentXml += `\n      <instrumentRef id="${escapeXml(creator.instrumentRef.id)}" ref="${escapeXml(creator.instrumentRef.ref)}" />`;
    }
    documentXml += `\n    </creator>`;
  });
  
  // Vendors（配列対応、後方互換性維持）
  const vendors = doc.vendors || (doc.vendor ? [doc.vendor] : []);
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
  
  // Owners（配列対応、後方互換性維持）
  const owners = doc.owners || (doc.owner ? [doc.owner] : []);
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
  
  // Instruments（配列対応、後方互換性維持、0個OK）
  const instruments = doc.instruments || (doc.instrument ? [doc.instrument] : []);
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
 * property要素を再帰的に出力（NestedPropertyEditor形式とMaiMLParser形式の両方に対応）
 * propertyListType等のネスト構造に対応
 * @param prop - プロパティオブジェクト
 * @param indentLevel - インデントレベル
 * @returns property要素のXML文字列
 */
export function buildPropertyXML(prop: Property, indentLevel = 5): string {
  const indent = '  '.repeat(indentLevel);
  const propName = prop.key || prop.name || '';
  
  // NestedPropertyEditor形式とMaiMLParser形式の両方に対応
  const propType = prop.attributes?.['xsi:type'] || prop.type || prop.xsiType || 'stringType';
  
  let propertyXml = `${indent}<property key="${escapeXml(propName)}"`;
  
  // ✅ NestedPropertyEditor形式の属性出力
  if (prop.attributes) {
    Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
      if (attrName !== 'xsi:type' && attrValue) {
        propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  }
  // ✅ MaiMLParser形式の属性出力
  else {
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
  
  // ✅ NestedPropertyEditor形式: elements（description, value等）を出力
  if (prop.elements && Object.keys(prop.elements).length > 0) {
    Object.entries(prop.elements).forEach(([elemName, elemValue]) => {
      if (elemValue !== undefined && elemValue !== '') {
        propertyXml += `${indent}  <${elemName}>${escapeXml(elemValue)}</${elemName}>\n`;
      }
    });
  }
  
  // ✅ propertyListTypeの場合：子property要素を再帰的に出力
  if (propType === 'propertyListType') {
    // NestedPropertyEditor形式: prop.children
    if (prop.children && Array.isArray(prop.children) && prop.children.length > 0) {
      prop.children.forEach(childProp => {
        propertyXml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
    // MaiMLParser形式: prop.properties
    else if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      prop.properties.forEach(childProp => {
        propertyXml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
  }
  // ✅ content要素の処理
  else if (propType === 'content' || propType === 'contentDoubleListType' || propType === 'contentListType') {
    propertyXml += buildContentXML(prop, indentLevel + 1);
  }
  // ✅ 通常のpropertyの場合：value/description要素を出力（MaiMLParser形式のみ、NestedPropertyEditorは上で処理済み）
  else if (!prop.elements) {
    // description（MaiMLParser形式専用）
    if (prop.description !== undefined && prop.description !== '') {
      propertyXml += `${indent}  <description>${escapeXml(prop.description)}</description>\n`;
    }
    // value
    const value = prop.value || prop.defaultValue || '';
    if (value !== '') {
      propertyXml += `${indent}  <value>${escapeXml(value)}</value>\n`;
    }
  }
  
  propertyXml += `${indent}</property>\n`;
  
  return propertyXml;
}

/**
 * content要素を完全に出力（MaiMLParser.jsデータ構造対応）
 * @param content - contentオブジェクト（property型の場合もある）
 * @param indentLevel - インデントレベル
 * @returns content要素のXML文字列
 */
function buildContentXML(content: Property, indentLevel = 6): string {
  const indent = '  '.repeat(indentLevel);
  
  let contentXml = `${indent}<content`;
  
  // ✅ 修正: 全ての属性を出力（MaiMLParser.jsが返すフィールド名に対応）
  if (content.axis) contentXml += ` axis="${escapeXml(content.axis)}"`;
  if (content.formatString) contentXml += ` formatString="${escapeXml(content.formatString)}"`;
  if (content.id) contentXml += ` id="${escapeXml(content.id)}"`;
  if (content.key) contentXml += ` key="${escapeXml(content.key)}"`;
  if (content.scaleFactor) contentXml += ` scaleFactor="${escapeXml(content.scaleFactor)}"`;
  if (content.size) contentXml += ` size="${escapeXml(content.size)}"`;
  if (content.units) contentXml += ` units="${escapeXml(content.units)}"`;
  
  // ✅ 修正: contentTypeまたはxsiTypeを使用
  const xsiType = content.contentType || content.xsiType || content.type || 'contentDoubleListType';
  contentXml += ` xsi:type="${escapeXml(xsiType)}"`;
  
  // 値は基本的に空（MaiML仕様ではcontentは空要素）
  contentXml += `>\n${indent}</content>\n`;
  
  return contentXml;
}

/**
 * 共通テンプレートXMLを生成（複数placeRef対応、protocol直下用）
 * @param node - React Flowノード（共通テンプレート本体）
 * @param templateType - テンプレートタイプ（materialTemplate/conditionTemplate/resultTemplate）
 * @param allPlaces - 全placeノード（継承元検索用）
 * @param allNodes - 全ノード（commonTemplateRef参照検索用）
 * @returns 共通テンプレート要素のXML文字列
 */
function buildCommonTemplateXML(
  node: Node<NodeData>, 
  templateType: string, 
  allPlaces: Node<NodeData>[] = [], 
  allNodes: Node<NodeData>[] = []
): string {
  const template = node.data.template;
  if (!template) return '';
  
  const templateId = template.templateId || template.id || `Common${templateType.replace('Template', '')}${node.id}`;
  
  let xml = `    <${templateType} id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    xml += `      <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    xml += `      <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = allPlaces.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || 
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
  
  // name（オプション）
  if (template.name) {
    xml += `      <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description（オプション）
  if (template.description) {
    xml += `      <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群（insertion型を除外して出力）
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        xml += buildPropertyXML(prop, 3);
      });
  }
  
  // ✅ 共通テンプレート: 複数のplaceRefを出力（template.placeRefsから取得）
  const placeRefs = template.placeRefs || [];
  
  console.log(`📋 共通テンプレート ${templateId}: placeRefs数 ${placeRefs.length}`, placeRefs);
  
  // template.placeRefsの各ノードIDに対してplaceRefを出力
  placeRefs.forEach((placeRefNodeId, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_ref${index}`;
    
    xml += `      <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRefNodeId)}"/>\n`;
    
    console.log(`  ✅ placeRef追加: id="${placeRefId}" ref="${placeRefNodeId}"`);
  });
  
  xml += `    </${templateType}>\n`;
  return xml;
}

/**
 * React FlowのノードとエッジからMaiML XMLを生成
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @param metadata - メタデータ（name, descriptionなど）
 * @param documentData - Document情報（オプション）
 * @param originalStructure - 元MaiML構造情報（オプション）
 * @param allTemplates - TemplateContext のテンプレート（オプション）
 * @param allMethods - 全メソッドの配列（複数メソッド対応）（オプション）
 * @returns MaiML XML文字列（Promise）
 */
export async function convertReactFlowToMaiML(
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  metadata: Record<string, string> = {}, 
  documentData: DocumentData | null = null, 
  originalStructure: OriginalStructure | null = null, 
  allTemplates: TemplateMap | null = null, 
  allMethods: MethodData[] | null = null
): Promise<string> {
  // バリデーション（allTemplatesとallMethodsを渡す）
  const validation = validatePetriNet(nodes, edges, allTemplates, allMethods);
  if (!validation.valid) {
    throw new Error(`バリデーションエラー:\n${validation.errors.join('\n')}`);
  }
  
  // ファイル名を決定（ドキュメント名 or メタデータ名）
  const fileName = (documentData && documentData.name) ? documentData.name : (metadata.name || 'document');
  
  // ノードを種類別に分類
  const places = nodes.filter(n => n.type !== 'transition');
  const transitions = nodes.filter(n => n.type === 'transition');
  
  console.log('🔍 [convertReactFlowToMaiML] テンプレート情報:', {
    allTemplates: allTemplates ? {
      material: allTemplates.material?.length || 0,
      condition: allTemplates.condition?.length || 0,
      result: allTemplates.result?.length || 0
    } : 'なし',
    placesCount: places.length
  });
  
  // documentDataからIDを取得（優先）、なければ元構造、最後にデフォルト値
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
  
  // MaiML要素開始（正しい名前空間）
  maiml += `<maiml version="1.0" xmlns="http://www.maiml.org/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">\n`;
  
  // Document要素（<maiml>直下、<protocol>の前に配置 - 必須）
  if (documentData) {
    maiml += buildDocumentXML(documentData);
  } else {
    // documentDataがない場合はデフォルトDocument要素を生成
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
      instruments: []
    };
    maiml += buildDocumentXML(defaultDoc);
  }
  
  // 共通テンプレート（protocol直下に配置）
  const commonTemplates: Node<NodeData>[] = [];
  
  // ✅ allTemplatesから共通テンプレート（methodId === null）を取得
  if (allTemplates) {
    console.log('📋 [convertReactFlowToMaiML] 共通テンプレート取得開始');
    
    // Material共通テンプレート
    if (allTemplates.material) {
      const commonMaterials = allTemplates.material.filter((t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0);
      commonMaterials.forEach((template: Template) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'materialTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place' as NodeType,
            placeType: 'material' as PlaceType,
            template: {
              ...template,
              type: 'MaterialTemplate',
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            },
            isCommonTemplate: true
          }
        };
        commonTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] 共通MaterialTemplate追加:', template.id);
      });
    }
    
    // Condition共通テンプレート
    if (allTemplates.condition) {
      const commonConditions = allTemplates.condition.filter((t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0);
      commonConditions.forEach((template: Template) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'conditionTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place' as NodeType,
            placeType: 'condition' as PlaceType,
            template: {
              ...template,
              type: 'ConditionTemplate',
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            },
            isCommonTemplate: true
          }
        };
        commonTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] 共通ConditionTemplate追加:', template.id);
      });
    }
    
    // Result共通テンプレート
    if (allTemplates.result) {
      const commonResults = allTemplates.result.filter((t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0);
      commonResults.forEach((template: Template) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'resultTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place' as NodeType,
            placeType: 'result' as PlaceType,
            template: {
              ...template,
              type: 'ResultTemplate',
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            },
            isCommonTemplate: true
          }
        };
        commonTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] 共通ResultTemplate追加:', template.id);
      });
    }
    
    console.log('📊 [convertReactFlowToMaiML] 共通テンプレート統計:', {
      total: commonTemplates.length,
      material: commonTemplates.filter(t => t.data.placeType === 'material').length,
      condition: commonTemplates.filter(t => t.data.placeType === 'condition').length,
      result: commonTemplates.filter(t => t.data.placeType === 'result').length
    });
  }
  
  // Protocol > Method > PNML構造（2スペースインデント）
  maiml += `  <protocol id="${escapeXml(protocolId)}">\n`;
  maiml += `    <uuid>${escapeXml(protocolUuid)}</uuid>\n`;
  
  // ✅ 共通テンプレートを<protocol>直下に出力（<method>の前）
  if (commonTemplates.length > 0) {
    console.log('📋 共通テンプレートを<protocol>直下に出力:', commonTemplates.length, '個');
    
    // タイプ別に分類
    const commonMaterialTemplates = commonTemplates.filter(n => n.data.placeType === 'material');
    const commonConditionTemplates = commonTemplates.filter(n => n.data.placeType === 'condition');
    const commonResultTemplates = commonTemplates.filter(n => n.data.placeType === 'result');
    
    // materialTemplate
    commonMaterialTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'materialTemplate', places, nodes);
    });
    
    // conditionTemplate
    commonConditionTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'conditionTemplate', places, nodes);
    });
    
    // resultTemplate
    commonResultTemplates.forEach(node => {
      maiml += buildCommonTemplateXML(node, 'resultTemplate', places, nodes);
    });
  }
  
  maiml += `    <method id="${escapeXml(methodId)}">\n`;
  maiml += `      <uuid>${escapeXml(methodUuid)}</uuid>\n`;
  maiml += `      <pnml id="${escapeXml(pnmlId)}">\n`;
  maiml += `        <uuid>${escapeXml(pnmlUuid)}</uuid>\n`;
  
  // name/descriptionは元ファイルに存在する場合のみ出力
  if (originalStructure?.pnml?.name || !originalStructure) {
    maiml += `        <name>${escapeXml(pnmlName)}</name>\n`;
  }
  if (pnmlDescription) {
    maiml += `        <description>${escapeXml(pnmlDescription)}</description>\n`;
  }
  
  // Place要素群
  places.forEach(place => {
    // 名前フィールドのチェック（null、undefined、空文字を適切に処理）
    const nameValue = place.data.name;
    const hasValidName = nameValue !== undefined && 
                         nameValue !== null && 
                         String(nameValue).trim() !== '';
    
    // 説明フィールドのチェック
    const descValue = place.data.description;
    const hasDescription = descValue &&
      descValue !== 'インポート済み' &&
      descValue !== '既存プレース' &&
      descValue !== 'imported' &&
      String(descValue).trim() !== '';
    
    // Place要素は常に出力
    maiml += `        <place id="${escapeXml(place.id)}">\n`;
    
    // 名前：有効な値がある場合のみ出力（フォールバックなし）
    if (hasValidName) {
      maiml += `          <name>${escapeXml(String(nameValue).trim())}</name>\n`;
    }
    
    // 説明：有効な値がある場合のみ出力
    if (hasDescription) {
      maiml += `          <description>${escapeXml(String(descValue).trim())}</description>\n`;
    }
    
    maiml += `        </place>\n`;
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
      // 元ファイルのinstruction情報を使用
      maiml += `        <instruction id="${escapeXml(originalInstruction.instructionId)}">\n`;
      maiml += `          <uuid>${escapeXml(originalInstruction.uuid)}</uuid>\n`;
      if (originalInstruction.description) {
        maiml += `          <description>${escapeXml(originalInstruction.description)}</description>\n`;
      }
      maiml += `          <transitionRef id="${escapeXml(originalInstruction.transitionRefId)}" ref="${escapeXml(originalInstruction.transitionRefRef)}"/>\n`;
      maiml += `        </instruction>\n`;
    } else {
      // ✅ 修正: 新規作成の場合、transitionIDと重複しないよう"instruction_"プレフィックスを追加
      const instructionId = `instruction_${transition.id}`;
      maiml += `        <instruction id="${escapeXml(instructionId)}">\n`;
      maiml += `          <uuid>${generateUUID()}</uuid>\n`;
      maiml += `          <description>${escapeXml(transition.data.description || transition.data.name || transition.id)}</description>\n`;
      maiml += `          <transitionRef id="TR_${escapeXml(transition.id)}" ref="${escapeXml(transition.id)}"/>\n`;
      maiml += `        </instruction>\n`;
    }
  });
  
  // テンプレート生成（allTemplatesから取得）
  const materialTemplates: Node<NodeData>[] = [];
  const conditionTemplates: Node<NodeData>[] = [];
  const resultTemplates: Node<NodeData>[] = [];
  
  // allTemplatesが提供されている場合、そこからテンプレートを取得
  if (allTemplates) {
    console.log('📋 [convertReactFlowToMaiML] TemplateContextからテンプレート取得');
    
    // 現在のmethodIdを取得
    const currentMethodId = documentData?.methodId;
    console.log('🔍 [convertReactFlowToMaiML] フィルタリング条件:', {
      currentMethodId,
      allMaterialCount: allTemplates.material?.length || 0,
      allConditionCount: allTemplates.condition?.length || 0,
      allResultCount: allTemplates.result?.length || 0
    });
    
    // materialTemplates
    if (allTemplates.material) {
      const contextMaterialTemplates = allTemplates.material.filter((t: Template) => 
        t.methodId === currentMethodId && t.placeRefs && t.placeRefs.length > 0
      );
      
      contextMaterialTemplates.forEach((template: Template) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'materialTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place' as NodeType,
            placeType: 'material' as PlaceType,
            template: {
              ...template,
              type: 'MaterialTemplate',
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            }
          }
        };
        materialTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] MaterialTemplate追加:', template.id);
      });
    }
    
    // conditionTemplates
    if (allTemplates.condition) {
      const contextConditionTemplates = allTemplates.condition.filter((t: Template) => 
        t.methodId === currentMethodId && t.placeRefs && t.placeRefs.length > 0
      );
      
      contextConditionTemplates.forEach((template: Template) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'conditionTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place' as NodeType,
            placeType: 'condition' as PlaceType,
            template: {
              ...template,
              type: 'ConditionTemplate',
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            }
          }
        };
        conditionTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] ConditionTemplate追加:', template.id);
      });
    }
    
    // resultTemplates
    if (allTemplates.result) {
      const contextResultTemplates = allTemplates.result.filter((t: Template) => 
        t.methodId === currentMethodId && t.placeRefs && t.placeRefs.length > 0
      );
      
      contextResultTemplates.forEach((template: Template) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'resultTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place' as NodeType,
            placeType: 'result' as PlaceType,
            template: {
              ...template,
              type: 'ResultTemplate',
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            }
          }
        };
        resultTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] ResultTemplate追加:', template.id);
      });
    }
    
    console.log('📊 [convertReactFlowToMaiML] テンプレート統計:', {
      material: materialTemplates.length,
      condition: conditionTemplates.length,
      result: resultTemplates.length
    });
  }
  
  // Template要素群の出力
  console.log('📋 [convertReactFlowToMaiML] Template出力開始:', {
    materialCount: materialTemplates.length,
    conditionCount: conditionTemplates.length,
    resultCount: resultTemplates.length
  });
  
  // materialTemplate要素群
  materialTemplates.forEach(node => {
    const template = node.data.template;
    if (!template) return;
    
    const templateId = template.templateId || template.id || `MT${node.id}`;
    let placeRefs = template.placeRefs || [];
    if (placeRefs.length === 0) {
      placeRefs = [node.id];
    }
    
    maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
    
    // uuid
    if (template.uuid) {
      maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
    } else {
      maiml += `          <uuid>${generateUUID()}</uuid>\n`;
    }
    
    // テンプレート継承（templateRef要素）
    if (template.href) {
      const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
      const inheritNode = places.find(p => p.id === inheritNodeId);
      if (inheritNode && inheritNode.data.template) {
        const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `MT${inheritNode.id}`;
        const templateRefId = `templateRef_${templateId}`;
        maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
      }
    }
    
    // insertion要素
    if (template.insertion) {
      maiml += `          <insertion>\n`;
      if (template.insertion.uri !== undefined) {
        maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
      }
      if (template.insertion.hash !== undefined) {
        maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
      }
      if (template.insertion.format) {
        maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
      }
      maiml += `          </insertion>\n`;
    }
    
    // name（オプション）
    if (template.name) {
      maiml += `          <name>${escapeXml(template.name)}</name>\n`;
    }
    
    // description（オプション）
    if (template.description) {
      maiml += `          <description>${escapeXml(template.description)}</description>\n`;
    }
    
    // property要素群（insertion型を除外して出力）
    if (template.properties && template.properties.length > 0) {
      template.properties
        .filter((prop: Property) => prop.type !== 'insertion')
        .forEach((prop: Property) => {
          maiml += buildPropertyXML(prop, 5);
        });
    }
    
    // placeRef（複数対応）
    placeRefs.forEach((placeRef, index) => {
      const placeRefId = index === 0 
        ? (template.placeRefId || `${templateId}TL`)
        : `${templateId}TL_${index}`;
      maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
    });
    
    maiml += `        </materialTemplate>\n`;
  });
  console.log('✅ [convertReactFlowToMaiML] materialTemplate出力完了');
  
  // conditionTemplate要素群
  conditionTemplates.forEach(node => {
    const template = node.data.template;
    if (!template) return;
    
    const templateId = template.templateId || template.id || `CT${node.id}`;
    let placeRefs = template.placeRefs || [];
    if (placeRefs.length === 0) {
      placeRefs = [node.id];
    }
    
    maiml += `        <conditionTemplate id="${escapeXml(templateId)}">\n`;
    
    // uuid
    if (template.uuid) {
      maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
    } else {
      maiml += `          <uuid>${generateUUID()}</uuid>\n`;
    }
    
    // テンプレート継承（templateRef要素）
    if (template.href) {
      const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
      const inheritNode = places.find(p => p.id === inheritNodeId);
      if (inheritNode && inheritNode.data.template) {
        const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `CT${inheritNode.id}`;
        const templateRefId = `templateRef_${templateId}`;
        maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
      }
    }
    
    // insertion要素
    if (template.insertion) {
      maiml += `          <insertion>\n`;
      if (template.insertion.uri !== undefined) {
        maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
      }
      if (template.insertion.hash !== undefined) {
        maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
      }
      if (template.insertion.format) {
        maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
      }
      maiml += `          </insertion>\n`;
    }
    
    // name（オプション）
    if (template.name) {
      maiml += `          <name>${escapeXml(template.name)}</name>\n`;
    }
    
    // description（オプション）
    if (template.description) {
      maiml += `          <description>${escapeXml(template.description)}</description>\n`;
    }
    
    // property要素群（insertion型を除外して出力）
    if (template.properties && template.properties.length > 0) {
      template.properties
        .filter((prop: Property) => prop.type !== 'insertion')
        .forEach((prop: Property) => {
          maiml += buildPropertyXML(prop, 5);
        });
    }
    
    // placeRef（複数対応）
    placeRefs.forEach((placeRef, index) => {
      const placeRefId = index === 0 
        ? (template.placeRefId || `${templateId}TL`)
        : `${templateId}TL_${index}`;
      maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
    });
    
    maiml += `        </conditionTemplate>\n`;
  });
  console.log('✅ [convertReactFlowToMaiML] conditionTemplate出力完了');
  
  // resultTemplate要素群
  resultTemplates.forEach(node => {
    const template = node.data.template;
    if (!template) return;
    
    const templateId = template.templateId || template.id || `RT${node.id}`;
    let placeRefs = template.placeRefs || [];
    if (placeRefs.length === 0) {
      placeRefs = [node.id];
    }
    
    maiml += `        <resultTemplate id="${escapeXml(templateId)}">\n`;
    
    // uuid
    if (template.uuid) {
      maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
    } else {
      maiml += `          <uuid>${generateUUID()}</uuid>\n`;
    }
    
    // テンプレート継承（templateRef要素）
    if (template.href) {
      const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
      const inheritNode = places.find(p => p.id === inheritNodeId);
      if (inheritNode && inheritNode.data.template) {
        const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `RT${inheritNode.id}`;
        const templateRefId = `templateRef_${templateId}`;
        maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
      }
    }
    
    // insertion要素
    if (template.insertion) {
      maiml += `          <insertion>\n`;
      if (template.insertion.uri !== undefined) {
        maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
      }
      if (template.insertion.hash !== undefined) {
        maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
      }
      if (template.insertion.format) {
        maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
      }
      maiml += `          </insertion>\n`;
    }
    
    // name（オプション）
    if (template.name) {
      maiml += `          <name>${escapeXml(template.name)}</name>\n`;
    }
    
    // description（オプション）
    if (template.description) {
      maiml += `          <description>${escapeXml(template.description)}</description>\n`;
    }
    
    // property要素群（insertion型を除外して出力）
    if (template.properties && template.properties.length > 0) {
      template.properties
        .filter((prop: Property) => prop.type !== 'insertion')
        .forEach((prop: Property) => {
          maiml += buildPropertyXML(prop, 5);
        });
    }
    
    // placeRef（複数対応）
    placeRefs.forEach((placeRef, index) => {
      const placeRefId = index === 0 
        ? (template.placeRefId || `${templateId}TL`)
        : `${templateId}TL_${index}`;
      maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
    });
    
    maiml += `        </resultTemplate>\n`;
  });
  console.log('✅ [convertReactFlowToMaiML] resultTemplate出力完了');
  
  maiml += `      </program>\n`;
  maiml += `    </method>\n`;
  maiml += `  </protocol>\n`;
  
  // data/eventLog要素（元のXMLがあれば使用）
  if (originalStructure?.data?.rawXML) {
    maiml += `  ${originalStructure.data.rawXML}\n`;
  } else {
    const dataId = originalStructure?.data?.id || 'dataID';
    maiml += `  <data id="${escapeXml(dataId)}">\n`;
    maiml += `  </data>\n`;
  }
  
  if (originalStructure?.eventLog?.rawXML) {
    maiml += `  ${originalStructure.eventLog.rawXML}\n`;
  } else {
    const eventLogId = originalStructure?.eventLog?.id || 'eventLogID';
    maiml += `  <eventLog id="${escapeXml(eventLogId)}">\n`;
    maiml += `  </eventLog>\n`;
  }
  
  maiml += `</maiml>`;
  
  return maiml;
}

/**
 * MaiML XMLをフォーマット（インデント整形）
 * @param xml - XML文字列
 * @returns フォーマットされたXML文字列
 */
export function formatMaiMLXml(xml: string): string {
  // 既に整形済みなのでそのまま返す
  return xml;
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
export function getGraphStatistics(nodes: Node<NodeData>[], edges: Edge[]): GraphStatistics {
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
