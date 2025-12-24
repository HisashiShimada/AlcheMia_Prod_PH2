/**
 * SubNetViewer用 React Flow変換ユーティリティ
 * subnetData形式 → React Flow形式への変換
 * 
 * @description
 * トランジションに接続されたPlaceノード（入力/出力）をReact Flow形式に変換します。
 * - 入力Place: 左側に配置
 * - Transition: 中央に配置
 * - 出力Place: 右側に配置
 */

import { Node, Edge } from 'reactflow';

/**
 * トランジション情報
 */
export interface TransitionInfo {
  id: string;
  name: string;
  type?: string;
}

/**
 * テンプレート情報
 */
export interface TemplateInfo {
  id: string;
  name: string;
  type: string;
  element: Element;
  properties: Record<string, unknown>[];
}

/**
 * Place情報
 */
export interface PlaceInfo {
  id: string;
  name: string;
  isTemplate: boolean;
  templateType: 'material' | 'condition' | 'result';
  templateName?: string;
  templateInfo?: TemplateInfo | null;
}

/**
 * アーク情報
 */
export interface ArcInfo {
  id: string;
  source: string;
  target: string;
  weight?: string;
  description?: string;
}

/**
 * サブネットデータ
 */
export interface SubnetData {
  transition: TransitionInfo;
  places: PlaceInfo[];
  arcs: ArcInfo[];
}

/**
 * React Flow変換結果
 */
export interface ReactFlowConversionResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * サブネットデータをReact Flow形式に変換
 * 
 * @param subnetData - { transition, places, arcs }
 * @returns { nodes, edges } - React Flow形式のノードとエッジ
 */
export const convertSubnetToReactFlow = (
  subnetData: SubnetData | null
): ReactFlowConversionResult => {
  if (!subnetData) {
    return { nodes: [], edges: [] };
  }

  const { transition, places, arcs } = subnetData;
  
  // ノードとエッジの配列
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // レイアウト設定
  const centerX = 400;
  const centerY = 300;
  const horizontalSpacing = 350;
  const verticalSpacing = 180;
  
  // トランジションノードを追加（中央）
  nodes.push({
    id: transition.id,
    type: 'transition',
    position: { x: centerX - 90, y: centerY - 35 }, // TransitionNodeのサイズに基づく
    data: {
      label: transition.name || transition.id,
      nodeType: 'transition',
      transitionType: transition.type || 'normal',
    },
  });
  
  // 入力プレースと出力プレースに分類
  const inputPlaces: PlaceInfo[] = [];
  const outputPlaces: PlaceInfo[] = [];
  
  arcs.forEach((arc) => {
    // トランジションに入るアーク → 入力Place
    if (arc.target === transition.id) {
      const place = places.find((p) => p.id === arc.source);
      if (place && !inputPlaces.find((p) => p.id === place.id)) {
        inputPlaces.push(place);
      }
    }
    // トランジションから出るアーク → 出力Place
    else if (arc.source === transition.id) {
      const place = places.find((p) => p.id === arc.target);
      if (place && !outputPlaces.find((p) => p.id === place.id)) {
        outputPlaces.push(place);
      }
    }
  });
  
  // 入力プレースをノードとして追加（左側）
  inputPlaces.forEach((place, index) => {
    const totalPlaces = inputPlaces.length;
    let yPos: number;
    
    if (totalPlaces === 1) {
      // 1つの場合は中央
      yPos = centerY - 20; // ノード半径を考慮
    } else {
      // 複数の場合は均等配置
      const totalHeight = (totalPlaces - 1) * verticalSpacing;
      const startY = centerY - totalHeight / 2 - 20;
      yPos = startY + index * verticalSpacing;
    }
    
    // ノードタイプを決定
    let nodeType = 'materialTemplate'; // デフォルト
    if (place.isTemplate) {
      switch (place.templateType) {
        case 'material':
          nodeType = 'materialTemplate';
          break;
        case 'condition':
          nodeType = 'conditionTemplate';
          break;
        case 'result':
          nodeType = 'resultTemplate';
          break;
        default:
          nodeType = 'materialTemplate';
      }
    }
    
    nodes.push({
      id: place.id,
      type: nodeType,
      position: { x: centerX - horizontalSpacing - 40, y: yPos },
      data: {
        label: place.name || place.id,
        nodeType: 'place',
        isTemplate: place.isTemplate,
        templateType: place.templateType,
        templateName: place.templateName,
        template: place.templateInfo || null,
      },
    });
  });
  
  // 出力プレースをノードとして追加（右側）
  outputPlaces.forEach((place, index) => {
    const totalPlaces = outputPlaces.length;
    let yPos: number;
    
    if (totalPlaces === 1) {
      // 1つの場合は中央
      yPos = centerY - 20;
    } else {
      // 複数の場合は均等配置
      const totalHeight = (totalPlaces - 1) * verticalSpacing;
      const startY = centerY - totalHeight / 2 - 20;
      yPos = startY + index * verticalSpacing;
    }
    
    // ノードタイプを決定
    let nodeType = 'materialTemplate';
    if (place.isTemplate) {
      switch (place.templateType) {
        case 'material':
          nodeType = 'materialTemplate';
          break;
        case 'condition':
          nodeType = 'conditionTemplate';
          break;
        case 'result':
          nodeType = 'resultTemplate';
          break;
        default:
          nodeType = 'materialTemplate';
      }
    }
    
    nodes.push({
      id: place.id,
      type: nodeType,
      position: { x: centerX + horizontalSpacing - 40, y: yPos },
      data: {
        label: place.name || place.id,
        nodeType: 'place',
        isTemplate: place.isTemplate,
        templateType: place.templateType,
        templateName: place.templateName,
        template: place.templateInfo || null,
      },
    });
  });
  
  // アークをエッジとして追加
  arcs.forEach((arc, index) => {
    const sourceIsTransition = arc.source === transition.id;
    const targetIsTransition = arc.target === transition.id;
    
    // トランジションに関連しないアークはスキップ
    if (!sourceIsTransition && !targetIsTransition) {
      return;
    }
    
    edges.push({
      id: `edge-${arc.id || index}`,
      source: arc.source,
      target: arc.target,
      type: 'default',
      animated: false,
      label: arc.description || arc.id || '',
      style: {
        stroke: '#333',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#0066CC',
        fontSize: 12,
        fontWeight: 'normal',
      },
      labelBgStyle: {
        fill: 'white',
        fillOpacity: 0.8,
      },
    });
  });
  
  console.log('🔄 [SubNetViewer] React Flow変換完了:', {
    totalNodes: nodes.length,
    transitionNodes: 1,
    placeNodes: nodes.length - 1,
    totalEdges: edges.length,
    inputPlaces: inputPlaces.length,
    outputPlaces: outputPlaces.length,
  });
  
  return { nodes, edges };
};
