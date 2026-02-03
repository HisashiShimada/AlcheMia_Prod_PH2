/**
 * MaiML to React Flow Converter
 * 
 * MaiMLデータをReact Flow形式に変換
 * PetriNetViewerの既存変換ロジックを活用し、EditorV2用に最適化
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import { Node, Edge } from 'reactflow';
import type { NodeData, Template, PlaceType, Property } from '../../types';

// 共通utilsの既存関数をインポート
import { 
  parseMaimlToPetriNet, 
  Template as MaimlTemplate 
} from '../../../../utils/maimlParser';
import { convertToReactFlowFormat } from '../../../../utils/reactFlowConverter';

/**
 * TemplateMap型（PetriNetViewer互換）
 */
interface TemplateMap {
  [nodeId: string]: MaimlTemplate;
}

/**
 * 変換結果型
 */
export interface ConversionResult {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

/**
 * 変換統計情報型
 */
export interface ConversionStats {
  totalNodes: number;
  placeNodes: number;
  transitionNodes: number;
  materialPlaces: number;
  conditionPlaces: number;
  resultPlaces: number;
  totalEdges: number;
}

/**
 * MaiMLデータをReact Flow形式に変換
 * 
 * @param maimlData - MaiML XML文字列
 * @returns { nodes, edges } - React Flow形式のデータ
 */
export function maimlToReactFlow(maimlData: string): ConversionResult {
  console.log('🚀 [maimlToReactFlow] 変換開始');
  
  if (!maimlData) {
    console.error('❌ [maimlToReactFlow] maimlDataが空です');
    return { nodes: [], edges: [] };
  }

  try {
    // 1. MaiMLをパース
    const petriNetData = parseMaimlToPetriNet(maimlData);
    const templateMap = petriNetData.templates;
    
    console.log('📊 [maimlToReactFlow] ペトリネット構造抽出完了:', {
      places: petriNetData.places.length,
      transitions: petriNetData.transitions.length,
      arcs: petriNetData.arcs.length,
      templates: Object.keys(templateMap).length
    });
    
    // 2. React Flow形式に変換（レイアウト計算含む）
    const { nodes, edges } = convertToReactFlowFormat(petriNetData);
    
    // 3. EditorV2用のノードタイプにマッピング
    console.log('🔍 [maimlToReactFlow] ノードマッピング開始:', {
      totalNodes: nodes.length
    });
    
    const editorNodes = nodes.map((node: Node) => {
      const nodeData = node.data as NodeData;
      if (nodeData.nodeType === 'place') {
        return convertPlaceNodeForEditor(node as Node<NodeData>, templateMap);
      } else if (nodeData.nodeType === 'transition') {
        return convertTransitionNodeForEditor(node as Node<NodeData>);
      }
      return node as Node<NodeData>;
    });
    
    console.log('✅ [maimlToReactFlow] 変換完了:', {
      totalNodes: editorNodes.length,
      placeNodes: editorNodes.filter((n: Node<NodeData>) => 
        n.type === 'materialTemplate' || 
        n.type === 'conditionTemplate' || 
        n.type === 'resultTemplate'
      ).length,
      transitionNodes: editorNodes.filter((n: Node<NodeData>) => n.type === 'transition').length,
      edges: edges.length
    });

    return { 
      nodes: editorNodes, 
      edges: edges as Edge[]
    };
    
  } catch (error) {
    console.error('❌ [maimlToReactFlow] 変換エラー:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return { nodes: [], edges: [] };
  }
}

/**
 * PlaceノードをEditorV2用に変換
 * 
 * @param node - React FlowノードオブジェクトfromPetriNetViewer
 * @param templateMap - テンプレートマップ
 * @returns EditorV2用のノード
 */
function convertPlaceNodeForEditor(
  node: Node<NodeData>, 
  templateMap: TemplateMap
): Node<NodeData> {
  // ノードタイプをEditorV2形式に変換
  const editorNodeType = mapNodeTypeToEditorType(node.type || 'materialTemplate');
  
  // Placeタイプを判定（material, condition, result）
  const placeType = determinePlaceType(node, templateMap);
  
  // テンプレート情報を取得
  const maimlTemplate = templateMap[node.id] || null;
  const editorTemplate = maimlTemplate ? convertMaimlTemplateToEditorTemplate(maimlTemplate) : undefined;
  
  console.log('🔍 [convertPlaceNodeForEditor] ノード変換:', {
    nodeId: node.id,
    hasTemplate: !!editorTemplate,
    placeType
  });
  
  return {
    ...node,
    type: editorNodeType,
    data: {
      ...node.data,
      placeType: placeType,
      name: node.data.name || node.data.label || '',
      description: node.data.description || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: editorTemplate as any,  // Template型をTemplateRefとして扱う
      properties: editorTemplate?.properties || []
    }
  };
}

/**
 * TransitionノードをEditorV2用に変換
 * 
 * @param node - React FlowノードオブジェクトfromPetriNetViewer
 * @returns EditorV2用のノード
 */
function convertTransitionNodeForEditor(node: Node<NodeData>): Node<NodeData> {
  return {
    ...node,
    type: 'transition',
    data: {
      ...node.data,
      name: node.data.name || node.data.label || '',
      description: node.data.description || '',
      hasInstruction: node.data.hasInstruction || false
    }
  };
}

/**
 * PetriNetViewerのノードタイプをEditorV2のノードタイプにマッピング
 * 
 * @param viewerNodeType - PetriNetViewerのノードタイプ
 * @returns EditorV2のノードタイプ
 */
function mapNodeTypeToEditorType(viewerNodeType: string): string {
  const mapping: Record<string, string> = {
    'materialTemplate': 'materialTemplate',
    'conditionTemplate': 'conditionTemplate',
    'resultTemplate': 'resultTemplate',
    'transition': 'transition'
  };
  
  const editorType = mapping[viewerNodeType];
  
  if (!editorType) {
    console.warn(`⚠️ [maimlToReactFlow] 未知のノードタイプ: ${viewerNodeType}, デフォルトでmaterialTemplateを使用`);
    return 'materialTemplate';
  }
  
  return editorType;
}

/**
 * Placeのタイプを判定（material, condition, result）
 * 
 * @param node - React Flowノード
 * @param templateMap - テンプレートマップ
 * @returns Placeタイプ
 */
function determinePlaceType(
  node: Node<NodeData>, 
  templateMap: TemplateMap
): PlaceType {
  // 1. ノードタイプから判定
  if (node.type === 'materialTemplate') return 'material';
  if (node.type === 'conditionTemplate') return 'condition';
  if (node.type === 'resultTemplate') return 'result';
  
  // 2. stereotypeから判定
  if (node.data.stereotype) {
    const stereotype = node.data.stereotype.toLowerCase();
    if (stereotype.includes('material')) return 'material';
    if (stereotype.includes('condition')) return 'condition';
    if (stereotype.includes('result')) return 'result';
  }
  
  // 3. templateMapから判定
  const template = node.data.template || templateMap[node.id];
  if (template && template.type) {
    const templateType = template.type.toLowerCase();
    if (templateType.includes('material')) return 'material';
    if (templateType.includes('condition')) return 'condition';
    if (templateType.includes('result')) return 'result';
  }
  
  // 4. デフォルト
  console.warn(`⚠️ [maimlToReactFlow] Place ${node.id} のタイプ判定不能、デフォルトでmaterialを使用`);
  return 'material';
}

/**
 * MaimlTemplateをEditorTemplate型に変換
 */
function convertMaimlTemplateToEditorTemplate(maimlTemplate: MaimlTemplate): Template {
  // PropertiesをEditorV2形式に変換
  const editorProperties: Property[] = (maimlTemplate.properties || []).map((prop, index) => ({
    id: `${maimlTemplate.id}_prop_${index}`,
    name: prop.key,
    key: prop.key,
    defaultValue: prop.defaultValue || '',
    type: prop.type || 'string',
    description: prop.description
  }));

  return {
    uuid: maimlTemplate.id,
    id: maimlTemplate.id,
    type: maimlTemplate.type,
    name: maimlTemplate.name,
    description: maimlTemplate.description,
    placeRefs: maimlTemplate.placeRefs || [],  // 空配列で初期化
    templateRefs: [],
    properties: editorProperties,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Template;  // 型アサーションで強制
}

/**
 * 変換統計情報を取得
 * 
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @returns 統計情報
 */
export function getConversionStats(
  nodes: Node<NodeData>[], 
  edges: Edge[]
): ConversionStats {
  const placeNodes = nodes.filter(n => 
    n.type === 'materialTemplate' || 
    n.type === 'conditionTemplate' || 
    n.type === 'resultTemplate'
  );
  const transitionNodes = nodes.filter(n => n.type === 'transition');
  
  return {
    totalNodes: nodes.length,
    placeNodes: placeNodes.length,
    transitionNodes: transitionNodes.length,
    materialPlaces: nodes.filter(n => n.type === 'materialTemplate').length,
    conditionPlaces: nodes.filter(n => n.type === 'conditionTemplate').length,
    resultPlaces: nodes.filter(n => n.type === 'resultTemplate').length,
    totalEdges: edges.length
  };
}