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
  DocumentData,
  MethodData,
  EdgeData,
  TemplatesByCategory,
  ExtractedUuids,
} from '../types/editor';

import { Property, Content, Template, Parent } from '@/types/maiml-unified';
import { PLACE_DESC_IMPORTED, PLACE_DESC_EXISTING, PLACE_DESC_IMPORTED_EN } from '@/constants/placeDescriptions';

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
// export interface Property {
//   key?: string;
//   name?: string;
//   type?: string;
//   xsiType?: string;
//   attributes?: Record<string, string>;
//   elements?: Record<string, string>;
//   units?: string;
//   unit?: string;
//   formatString?: string;
//   scaleFactor?: string;
//   description?: string;
//   value?: string;
//   defaultValue?: string;
//   children?: Property[];
//   properties?: Property[];
//   axis?: string;
//   contentType?: string;
//   id?: string;
//   size?: string;
// }

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
 * @param allTemplates - TemplateContext のテンプレート（オプション）
 * @param allMethods - 全メソッドの配列（複数メソッド対応）
 * @returns { valid: boolean, errors: string[] }
 */
export function validatePetriNet(
  nodes: Node<NodeData>[], 
  edges: Edge<EdgeData>[], 
  allTemplates: TemplatesByCategory | null = null, 
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
      const isCommonTemplate = template.methodId === null || template.methodId === undefined;
      
      if (placeRefs.length === 0) {
        console.warn(`⚠️ [validatePetriNet] テンプレート ${templateId} のplaceRefsが空です`);
      } else {
        // ✅ 共通テンプレートの場合は全メソッドのノードIDでチェック
        const checkNodeIds = isCommonTemplate ? allNodeIds : nodeIds;
        const invalidRefs = placeRefs.filter(ref => !checkNodeIds.has(ref.ref));
        
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
      if (place.data.template) {
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
          const invalidRefs = placeRefs.filter(ref => !nodeIds.has(ref.ref));
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
 * <parent> タグを再帰的に生成する（内部ヘルパー）
 */
function buildParentXML(parent: Parent, indentLevel: number): string {
  const ind = '  '.repeat(indentLevel);
  const childInd = '  '.repeat(indentLevel + 1);
  let xml = `\n${ind}<parent>`;
  if (parent.uuid) {
    xml += `\n${childInd}<uuid>${escapeXml(parent.uuid)}</uuid>`;
  }
  if (parent.hash?.value) {
    const methodAttr = parent.hash.method ? ` method="${escapeXml(parent.hash.method)}"` : '';
    xml += `\n${childInd}<hash${methodAttr}>${escapeXml(parent.hash.value)}</hash>`;
  }
  // ネストされた <parent> を再帰的に出力
  if (Array.isArray(parent.parents)) {
    for (const nested of parent.parents) {
      xml += buildParentXML(nested, indentLevel + 1);
    }
  }
  xml += `\n${ind}</parent>`;
  return xml;
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

  // <parent> ブロック（<uuid> の前に出力 - XSD仕様に準拠）
  const parents = (doc as { parents?: Parent[] }).parents;
  if (Array.isArray(parents) && parents.length > 0) {
    for (const p of parents) {
      documentXml += buildParentXML(p, 2);
    }
  }

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
  const creators = doc.creators || (doc.creators ? [doc.creators] : []);
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
  const vendors = doc.vendors || (doc.vendors ? [doc.vendors] : []);
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
  const owners = doc.owners || (doc.owners ? [doc.owners] : []);
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
  const instruments = doc.instruments || (doc.instruments ? [doc.instruments] : []);
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
  const propName = prop.key || '';
  
  // NestedPropertyEditor形式とMaiMLParser形式の両方に対応
  // xsi:type が未指定（空文字）の場合は stringType に強制変換しない
  const propType = prop.xsiType || '';
  
  let propertyXml = `${indent}<property key="${escapeXml(propName)}"`;
  
  // ✅ 既存処理をそのまま維持（units、formatString、scaleFactor）
  if (prop.units) {
    propertyXml += ` units="${escapeXml(prop.units)}"`;
  }
  if (prop.formatString) {
    propertyXml += ` formatString="${escapeXml(prop.formatString)}"`;
  }
  if (prop.scaleFactor) {
    propertyXml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
  }
  
  // ✅ 新規: prop.attributesから動的に属性を出力（id、ref、カスタム属性）
  if (prop.attributes) {
    Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
      if (attrName !== 'xsi:type' && attrValue) {
        propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  }
  
  // xsi:type が空文字（未指定）の場合は xsi:type 属性を出力しない
  if (propType) {
    propertyXml += ` xsi:type="${escapeXml(propType)}"`;
  }
  propertyXml += `>\n`;
  
  // ✅ propertyListTypeの場合：子property要素を再帰的に出力
  if (propType === 'propertyListType') {
    // MaiMLParser形式: prop.properties
    if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      prop.properties.forEach(childProp => {
        propertyXml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
  }
  // ✅ content要素の処理
  else if (propType === 'content' || propType === 'contentDoubleListType' || propType === 'contentListType') {
    if (prop.contents && prop.contents.length > 0) {
      prop.contents.forEach((content) => {
        propertyXml += buildContentXML(content, indentLevel + 1);
      });
    }
  }
  // ✅ 通常のpropertyの場合：value/description/customElements要素を出力
  else {
    // description（MaiMLParser形式専用）
    if (prop.description !== undefined && prop.description !== '') {
      propertyXml += `${indent}  <description>${escapeXml(prop.description)}</description>\n`;
    }
    // value
    const value = prop.value|| '';
    if (value !== '') {
      propertyXml += `${indent}  <value>${escapeXml(String(value))}</value>\n`;
    }
    
    // ✅ 新規: prop.customElementsからカスタム子要素を出力
    if (prop.customElements) {
      Object.entries(prop.customElements).forEach(([elementName, customElement]) => {
        if (customElement && customElement.value !== undefined && customElement.value !== null && customElement.value !== '') {
          let elementXml = `${indent}  <${elementName}`;
          // 属性を出力
          if (customElement.attributes) {
            Object.entries(customElement.attributes).forEach(([attrName, attrValue]) => {
              if (attrValue) {
                elementXml += ` ${attrName}="${escapeXml(attrValue)}"`;
              }
            });
          }
          elementXml += `>${escapeXml(String(customElement.value))}</${elementName}>\n`;
          propertyXml += elementXml;
        }
      });
    }

    // ✅ uncertainty 子要素を出力
    if (prop.uncertainty && Array.isArray(prop.uncertainty) && prop.uncertainty.length > 0) {
      prop.uncertainty.forEach((uc) => {
        propertyXml += buildUncertaintyXML(uc, indentLevel + 1);
      });
    }
  }
  
  propertyXml += `${indent}</property>\n`;
  
  return propertyXml;
}

/**
 * uncertainty 子要素を XML として出力するヘルパー
 * @param uc - uncertainty (Content型)
 * @param indentLevel - インデントレベル
 * @returns uncertainty 要素の XML 文字列
 */
function buildUncertaintyXML(uc: Content, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  let xml = `${indent}<uncertainty`;

  if (uc.key) xml += ` key="${escapeXml(uc.key)}"`;
  if (uc.xsiType) xml += ` xsi:type="${escapeXml(uc.xsiType)}"`;
  if (uc.units) xml += ` units="${escapeXml(uc.units)}"`;

  // 追加属性 (attributes フィールド)
  if (uc.attributes) {
    const skipped = new Set(['key', 'xsi:type', 'units']);
    Object.entries(uc.attributes).forEach(([k, v]) => {
      if (!skipped.has(k) && v) xml += ` ${k}="${escapeXml(v)}"`;
    });
  }

  const hasChildren =
    (uc.description !== undefined && uc.description !== '') ||
    (uc.value !== undefined && uc.value !== '') ||
    (uc.properties && uc.properties.length > 0) ||
    (uc.contents && uc.contents.length > 0);

  if (!hasChildren) {
    xml += `/>\n`;
    return xml;
  }

  xml += `>\n`;

  if (uc.description !== undefined && uc.description !== '') {
    xml += `${indent}  <description>${escapeXml(uc.description)}</description>\n`;
  }
  if (uc.value !== undefined && uc.value !== '') {
    xml += `${indent}  <value>${escapeXml(String(uc.value))}</value>\n`;
  }
  if (uc.properties && uc.properties.length > 0) {
    uc.properties.forEach((p) => {
      xml += buildPropertyXML(p, indentLevel + 1);
    });
  }
  if (uc.contents && uc.contents.length > 0) {
    uc.contents.forEach((c) => {
      xml += buildContentXML(c, indentLevel + 1);
    });
  }

  xml += `${indent}</uncertainty>\n`;
  return xml;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomElementNode = { value?: string | number | boolean; attributes?: Record<string, string>; children?: Record<string, any> };

/**
 * PropertyCustomElement を再帰的にXML出力するヘルパー
 * @param tagName - タグ名
 * @param element - PropertyCustomElement オブジェクト
 * @param indentLevel - インデントレベル
 * @returns XML文字列
 */
function buildCustomElementXML(tagName: string, element: CustomElementNode, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  let xml = `${indent}<${tagName}`;

  // 属性を出力
  if (element.attributes) {
    Object.entries(element.attributes).forEach(([attrName, attrValue]) => {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        xml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  }

  const hasChildren = element.children && Object.keys(element.children).length > 0;
  const hasValue = element.value !== undefined && element.value !== null && element.value !== '';

  if (!hasChildren && !hasValue) {
    xml += `/>\n`;
  } else if (hasChildren && !hasValue) {
    xml += `>\n`;
    Object.entries(element.children!).forEach(([childTag, childElement]) => {
      xml += buildCustomElementXML(childTag, childElement as CustomElementNode, indentLevel + 1);
    });
    xml += `${indent}</${tagName}>\n`;
  } else {
    xml += `>${escapeXml(String(element.value))}</${tagName}>\n`;
  }

  return xml;
}

/**
 * content要素を完全に出力（MaiMLParser.jsデータ構造対応）
 * @param content - contentオブジェクト（property型の場合もある）
 * @param indentLevel - インデントレベル
 * @returns content要素のXML文字列
 */
export function buildContentXML(content: Content, indentLevel = 6): string {
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

  // ✅ カスタム属性を動的に出力（Content.attributes フィールド）
  if (content.attributes) {
    // 既に個別出力している属性は除外
    const skippedAttrs = new Set(['axis', 'formatString', 'id', 'key', 'scaleFactor', 'size', 'units', 'xsi:type']);
    Object.entries(content.attributes).forEach(([attrName, attrValue]) => {
      if (!skippedAttrs.has(attrName) && attrValue) {
        contentXml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  }
  
  // ✅ 修正: contentTypeまたはxsiTypeを使用
  // xsi:type が未指定（空文字）の場合は contentDoubleListType に強制変換しない
  const xsiType = content.xsiType || '';
  // xsi:type が空文字（未指定）の場合は xsi:type 属性を出力しない
  if (xsiType) {
    contentXml += ` xsi:type="${escapeXml(xsiType)}"`;
  }
  
  contentXml += `>\n`;

  // description（オプション）
  if (content.description !== undefined && content.description !== '') {
    contentXml += `${indent}  <description>${escapeXml(content.description)}</description>\n`;
  }

  // value（オプション）
  if (content.value !== undefined && content.value !== '') {
    contentXml += `${indent}  <value>${escapeXml(String(content.value))}</value>\n`;
  }

  // ✅ カスタム要素を出力（Content.customElements フィールド）
  if (content.customElements) {
    Object.entries(content.customElements).forEach(([tagName, element]) => {
      contentXml += buildCustomElementXML(tagName, element, indentLevel + 1);
    });
  }

  // ✅ ネストされた子 Property を再帰出力
  if (content.properties && content.properties.length > 0) {
    content.properties.forEach((childProp: Property) => {
      contentXml += buildPropertyXML(childProp, indentLevel + 1);
    });
  }

  // ✅ ネストされた子 Content を再帰出力
  if (content.contents && content.contents.length > 0) {
    content.contents.forEach((childContent: Content) => {
      contentXml += buildContentXML(childContent, indentLevel + 1);
    });
  }

  // ✅ 不確かさ（uncertainty）を出力
  if (content.uncertainty && content.uncertainty.length > 0) {
    content.uncertainty.forEach((uc: Content) => {
      contentXml += buildUncertaintyXML(uc, indentLevel + 1);
    });
  }

  contentXml += `${indent}</content>\n`;
  
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
  
  const templateId = template.id  || `Common${templateType.replace('Template', '')}${node.id}`;
  
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
    // hash は必須（undefinedでも空文字で出力）、method属性が存在する場合は出力
    const hashMethodAttr1 = template.insertion.hash?.method ? ` method="${escapeXml(template.insertion.hash.method)}"` : '';
    xml += `        <hash${hashMethodAttr1}>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
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
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties.forEach((prop: Property) => {
      xml += buildPropertyXML(prop, 3);
    });
  }

  // content要素群
  if (template.contents && template.contents.length > 0) {
    template.contents.forEach((content: Content) => {
      xml += buildContentXML(content, 3);
    });
  }
  
  // XSD準拠: placeRef（必須・1以上）を placeRef→templateRef の順で出力
  const placeRefs = template.placeRefs || [];
  console.log(`📋 共通テンプレート ${templateId}: placeRefs数 ${placeRefs.length}`, placeRefs);
  
  placeRefs.forEach((placeRef, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefs[0].id || `${templateId}TL`)
      : `${templateId}TL_ref${index}`;
    xml += `      <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef.ref)}"/>\n`;
    console.log(`  ✅ placeRef追加: id="${placeRefId}" ref="${placeRef.ref}"`);
  });

  // XSD準拠: templateRef は placeRef の後に出力
  if (template.templateRef) {
    const inheritNodeId = template.templateRef.ref;
    const inheritNode = allPlaces.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.id ||
        `Common${templateType.replace('Template', '')}${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      xml += `      <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
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
  edges: Edge<EdgeData>[], 
  metadata: Record<string, string> = {}, 
  documentData: DocumentData | null = null, 
  originalStructure: OriginalStructure | null = null, 
  allTemplates: TemplatesByCategory | null = null, 
  allMethods: MethodData[] | null = null,
  savedUuids: ExtractedUuids | null = null
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
  const protocolId = documentData?.protocolId|| 'protocolID';
  const methodId = documentData?.methodId|| 'methodID';
  const pnmlId = `pnml_${methodId}`;
  const pnmlName = `${fileName}_${methodId}`;
  const pnmlDescription ='';
  const programId = `program_${methodId}`;
  const programDescription =  '';

  // savedUuidsがあれば既存UUIDを優先使用（変更なし時にUUIDを維持）
  const protocolUuid = savedUuids?.protocol || originalStructure?.protocol?.uuid || generateUUID();
  const methodUuid = savedUuids?.methods.get(methodId) || originalStructure?.method?.uuid || generateUUID();
  const pnmlUuid = savedUuids?.pnmls.get(methodId) || originalStructure?.pnml?.uuid || generateUUID();
  const programUuid = savedUuids?.programs.get(methodId) || originalStructure?.program?.uuid || generateUUID();
  
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
      creators: [],
      vendors: [],
      owners: [],
      instruments: [],
      chains : [],
      parents : []
    };
    maiml += buildDocumentXML(defaultDoc);
  }
  
  // 共通テンプレート（protocol直下に配置）
  const commonTemplates: Node<NodeData>[] = [];
  
  // ✅ allTemplatesから共通テンプレート（methodId === null）を取得
  if (allTemplates) {
    console.log('📋 [convertReactFlowToMaiML] 共通テンプレート取得開始');
    
    // Material共通テンプレート（methodIdがnullまたはundefinedのもの）
    // ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
    if (allTemplates.material) {
      const commonMaterials = allTemplates.material.filter((t: Template) => t.methodId === null || t.methodId === undefined);
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
            placeType: 'material',
            template: {
              ...template,
              category: 'material',
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
            },
            isCommonTemplate: true
          }
        };
        commonTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] 共通MaterialTemplate追加:', template.id);
      });
    }
    
    // Condition共通テンプレート（methodIdがnullまたはundefinedのもの）
    // ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
    if (allTemplates.condition) {
      const commonConditions = allTemplates.condition.filter((t: Template) => t.methodId === null || t.methodId === undefined);
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
            placeType: 'condition',
            template: {
              ...template,
              category: 'condition',
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
            },
            isCommonTemplate: true
          }
        };
        commonTemplates.push(fakeNode);
        console.log('✅ [convertReactFlowToMaiML] 共通ConditionTemplate追加:', template.id);
      });
    }
    
    // Result共通テンプレート（methodIdがnullまたはundefinedのもの）
    // ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
    if (allTemplates.result) {
      const commonResults = allTemplates.result.filter((t: Template) => t.methodId === null || t.methodId === undefined);
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
            placeType: 'result',
            template: {
              ...template,
              category: 'result',
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
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
  
  // XSD準拠: protocolType は method → materialTemplate → conditionTemplate → resultTemplate の順
  // 共通テンプレートは method の後に出力する
  maiml += `    <method id="${escapeXml(methodId)}">\n`;
  maiml += `      <uuid>${escapeXml(methodUuid)}</uuid>\n`;
  // method nameがあれば<name>タグを出力
  const singleMethodName = allMethods?.[0]?.name;
  if (singleMethodName) {
    maiml += `      <name>${escapeXml(singleMethodName)}</name>\n`;
  }
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
      descValue !== PLACE_DESC_IMPORTED &&
      descValue !== PLACE_DESC_EXISTING &&
      descValue !== PLACE_DESC_IMPORTED_EN &&
      String(descValue).trim() !== '';
    
    // Place要素は常に出力
    maiml += `        <place id="${escapeXml(place.id)}">\n`;
    
    // uuid（オプション）: node.data.maimlUuid → savedUuids フォールバック
    const placeUuid = place.data.maimlUuid ?? savedUuids?.places.get(place.id);
    if (placeUuid) {
      maiml += `          <uuid>${escapeXml(placeUuid)}</uuid>\n`;
    }
    
    // 名前：有効な値がある場合のみ出力（フォールバックなし）
    if (hasValidName) {
      maiml += `          <name>${escapeXml(String(nameValue).trim())}</name>\n`;
    }
    
    // 説明：有効な値がある場合のみ出力
    if (hasDescription) {
      maiml += `          <description>${escapeXml(String(descValue).trim())}</description>\n`;
    }
    
    // ノード座標を <position> タグとして書き出す
    if (place.position) {
      maiml += `          <position x="${place.position.x}" y="${place.position.y}"/>\n`;
    }
    
    maiml += `        </place>\n`;
  });
  
  // Transition要素群
  transitions.forEach(transition => {
    const hasName = transition.data.name && transition.data.name.trim() !== '';
    const hasDescription = transition.data.description && transition.data.description.trim() !== '';
    const hasPosition = !!transition.position;

    // uuid（オプション）: node.data.maimlUuid → savedUuids フォールバック
    const transitionUuid = transition.data.maimlUuid ?? savedUuids?.transitions.get(transition.id);
    if (hasName || hasDescription || hasPosition || transitionUuid) {
      maiml += `        <transition id="${escapeXml(transition.id)}">\n`;
      if (transitionUuid) {
        maiml += `          <uuid>${escapeXml(transitionUuid)}</uuid>\n`;
      }
      if (hasName) {
        maiml += `          <name>${escapeXml(transition.data.name)}</name>\n`;
      }
      if (hasDescription) {
        maiml += `          <description>${escapeXml(transition.data.description)}</description>\n`;
      }
      // ノード座標を <position> タグとして書き出す
      if (hasPosition) {
        maiml += `          <position x="${transition.position.x}" y="${transition.position.y}"/>\n`;
      }
      maiml += `        </transition>\n`;
    } else {
      maiml += `        <transition id="${escapeXml(transition.id)}"/>\n`;
    }
  });
  
  // Arc要素群
  edges.forEach(arc => {
    // uuid（オプション）: edge.data.maimlUuid → savedUuids フォールバック
    const arcUuid = arc.data?.maimlUuid ?? savedUuids?.arcs.get(arc.id);
    maiml += `        <arc id="${escapeXml(arc.id)}" source="${escapeXml(arc.source)}" target="${escapeXml(arc.target)}">\n`;
    if (arcUuid) {
      maiml += `          <uuid>${escapeXml(arcUuid)}</uuid>\n`;
    }
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
      // ── UUID: savedUuidsに保存済みUUIDがあれば再利用（下位タグ変更なし→上位UUID継続）
      maiml += `          <uuid>${savedUuids?.instructions.get(instructionId) || generateUUID()}</uuid>\n`;
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
    // documentData?.methodId が undefined の場合は allMethods[0]?.methodId をフォールバック
    // それも undefined の場合は「共通テンプレートでない全テンプレート」を出力する
    const currentMethodId = documentData?.methodId || allMethods?.[0]?.methodId;
    const hasKnownMethodId = currentMethodId !== undefined && currentMethodId !== null;
    console.log('🔍 [convertReactFlowToMaiML] フィルタリング条件:', {
      currentMethodId,
      hasKnownMethodId,
      documentDataMethodId: documentData?.methodId,
      allMethodsFirstId: allMethods?.[0]?.methodId,
      allMaterialCount: allTemplates.material?.length || 0,
      allConditionCount: allTemplates.condition?.length || 0,
      allResultCount: allTemplates.result?.length || 0
    });
    
    // materialTemplates
    if (allTemplates.material) {
      // currentMethodIdが特定できている場合はそのIDでフィルタ
      // 特定できていない場合は「共通テンプレートでない全テンプレート」を含める
      const contextMaterialTemplates = allTemplates.material.filter((t: Template) => 
        (hasKnownMethodId ? t.methodId === currentMethodId : (t.methodId !== null && t.methodId !== undefined))
        && t.placeRefs && t.placeRefs.length > 0
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
            placeType: 'material',
            template: {
              ...template,
              category: 'material',
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
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
        (hasKnownMethodId ? t.methodId === currentMethodId : (t.methodId !== null && t.methodId !== undefined))
        && t.placeRefs && t.placeRefs.length > 0
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
            placeType: 'condition',
            template: {
              ...template,
              category: 'condition',
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
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
        (hasKnownMethodId ? t.methodId === currentMethodId : (t.methodId !== null && t.methodId !== undefined))
        && t.placeRefs && t.placeRefs.length > 0
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
            placeType: 'result',
            template: {
              ...template,
              category: 'result',
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
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
    
    const templateId = template.id || `MT${node.id}`;
    let placeRefs = template.placeRefs || [];
    if (placeRefs.length === 0) {
      placeRefs = [{id: '',ref : node.id}];
    }
    
    maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
    
    // uuid: savedUuids が存在する場合はそのキーで解決（キーなし=dirty → 新規生成）
    //       savedUuids が null（新規作成）の場合は template.uuid を使用
    const materialTemplateUuid = savedUuids !== null
      ? (savedUuids.templates.get(templateId) ?? generateUUID())
      : (template.uuid ?? generateUUID());
    maiml += `          <uuid>${escapeXml(materialTemplateUuid)}</uuid>\n`;
    
    // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
    if (template.insertion) {
      maiml += `          <insertion>\n`;
      maiml += `            <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
      const hashMethodAttrM = template.insertion.hash?.method ? ` method="${escapeXml(template.insertion.hash.method)}"` : '';
      maiml += `            <hash${hashMethodAttrM}>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
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
    
    // property要素群
    if (template.properties && template.properties.length > 0) {
      template.properties.forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
    }

    // content要素群
    if (template.contents && template.contents.length > 0) {
      template.contents.forEach((content: Content) => {
        maiml += buildContentXML(content, 5);
      });
    }
    
    // XSD準拠: placeRef → templateRef の順で出力
    placeRefs.forEach((placeRef, index) => {
      const placeRefId = index === 0 
        ? (template.placeRefs[0].id || `${templateId}TL`)
        : `${templateId}TL_${index}`;
      maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef.ref)}"/>\n`;
    });

    // XSD準拠: templateRef は placeRef の後に出力
    if (template.templateRef) {
      const inheritNode = places.find(p => p.id === template.templateRef!.ref);
      if (inheritNode && inheritNode.data.template) {
        const inheritTemplateId = inheritNode.data.template.id || `MT${inheritNode.id}`;
        maiml += `          <templateRef id="${escapeXml(`templateRef_${templateId}`)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
      }
    }
    
    maiml += `        </materialTemplate>\n`;
  });
  console.log('✅ [convertReactFlowToMaiML] materialTemplate出力完了');
  
  // conditionTemplate要素群
  conditionTemplates.forEach(node => {
    const template = node.data.template;
    if (!template) return;
    
    const templateId = template.id || `CT${node.id}`;
    let placeRefs = template.placeRefs || [];
    if (placeRefs.length === 0) {
      placeRefs = [{id: '', ref: node.id}];
    }
    
    maiml += `        <conditionTemplate id="${escapeXml(templateId)}">\n`;
    
    // uuid: savedUuids が存在する場合はそのキーで解決（キーなし=dirty → 新規生成）
    //       savedUuids が null（新規作成）の場合は template.uuid を使用
    const conditionTemplateUuid = savedUuids !== null
      ? (savedUuids.templates.get(templateId) ?? generateUUID())
      : (template.uuid ?? generateUUID());
    maiml += `          <uuid>${escapeXml(conditionTemplateUuid)}</uuid>\n`;
    
    // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
    if (template.insertion) {
      maiml += `          <insertion>\n`;
      maiml += `            <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
      const hashMethodAttrC = template.insertion.hash?.method ? ` method="${escapeXml(template.insertion.hash.method)}"` : '';
      maiml += `            <hash${hashMethodAttrC}>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
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
    
    // property要素群
    if (template.properties && template.properties.length > 0) {
      template.properties.forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
    }

    // content要素群
    if (template.contents && template.contents.length > 0) {
      template.contents.forEach((content: Content) => {
        maiml += buildContentXML(content, 5);
      });
    }
    
    // XSD準拠: placeRef → templateRef の順で出力
    placeRefs.forEach((placeRef, index) => {
      const placeRefId = index === 0 
        ? (template.placeRefs[0].id || `${templateId}TL`)
        : `${templateId}TL_${index}`;
      maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef.ref)}"/>\n`;
    });

    // XSD準拠: templateRef は placeRef の後に出力
    if (template.templateRef) {
      const inheritNode = places.find(p => p.id === template.templateRef!.ref);
      if (inheritNode && inheritNode.data.template) {
        const inheritTemplateId = inheritNode.data.template.id || `CT${inheritNode.id}`;
        maiml += `          <templateRef id="${escapeXml(`templateRef_${templateId}`)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
      }
    }
    
    maiml += `        </conditionTemplate>\n`;
  });
  console.log('✅ [convertReactFlowToMaiML] conditionTemplate出力完了');
  
  // resultTemplate要素群
  resultTemplates.forEach(node => {
    const template = node.data.template;
    if (!template) return;
    
    const templateId = template.id || `RT${node.id}`;
    let placeRefs = template.placeRefs || [];
    if (placeRefs.length === 0) {
      placeRefs = [{id: '', ref: node.id}];
    }
    
    maiml += `        <resultTemplate id="${escapeXml(templateId)}">\n`;
    
    // uuid: savedUuids が存在する場合はそのキーで解決（キーなし=dirty → 新規生成）
    //       savedUuids が null（新規作成）の場合は template.uuid を使用
    const resultTemplateUuid = savedUuids !== null
      ? (savedUuids.templates.get(templateId) ?? generateUUID())
      : (template.uuid ?? generateUUID());
    maiml += `          <uuid>${escapeXml(resultTemplateUuid)}</uuid>\n`;
    
    // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
    if (template.insertion) {
      maiml += `          <insertion>\n`;
      maiml += `            <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
      const hashMethodAttrR = template.insertion.hash?.method ? ` method="${escapeXml(template.insertion.hash.method)}"` : '';
      maiml += `            <hash${hashMethodAttrR}>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
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
    
    // property要素群
    if (template.properties && template.properties.length > 0) {
      template.properties.forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
    }

    // content要素群
    if (template.contents && template.contents.length > 0) {
      template.contents.forEach((content: Content) => {
        maiml += buildContentXML(content, 5);
      });
    }
    
    // XSD準拠: placeRef → templateRef の順で出力
    placeRefs.forEach((placeRef, index) => {
      const placeRefId = index === 0 
        ? (template.placeRefs[0].id || `${templateId}TL`)
        : `${templateId}TL_${index}`;
      maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef.ref)}"/>\n`;
    });

    // XSD準拠: templateRef は placeRef の後に出力
    if (template.templateRef) {
      const inheritNode = places.find(p => p.id === template.templateRef!.ref);
      if (inheritNode && inheritNode.data.template) {
        const inheritTemplateId = inheritNode.data.template.id || `RT${inheritNode.id}`;
        maiml += `          <templateRef id="${escapeXml(`templateRef_${templateId}`)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
      }
    }
    
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
    // XSD準拠: globalObjectContentGroup により uuid が必須
    maiml += `  <data id="${escapeXml(dataId)}">\n`;
    // savedUuids に dataUuid があれば再利用して UUID 書き換えを防ぐ
    maiml += `    <uuid>${savedUuids?.dataUuid || generateUUID()}</uuid>\n`;
    maiml += `  </data>\n`;
  }
  
  if (originalStructure?.eventLog?.rawXML) {
    maiml += `  ${originalStructure.eventLog.rawXML}\n`;
  } else {
    const eventLogId = originalStructure?.eventLog?.id || 'eventLogID';
    // XSD準拠: globalObjectContentGroup により uuid が必須
    maiml += `  <eventLog id="${escapeXml(eventLogId)}">\n`;
    // savedUuids に eventLogUuid があれば再利用して UUID 書き換えを防ぐ
    maiml += `    <uuid>${savedUuids?.eventLogUuid || generateUUID()}</uuid>\n`;
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
