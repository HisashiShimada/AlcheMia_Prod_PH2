/**
 * nodeUtils - ノード操作ユーティリティ
 * 
 * ノードの生成・検証・変換などの純粋関数
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node } from 'reactflow';

/**
 * ノードタイプの定義
 */
export type NodeType = 'material' | 'condition' | 'result' | 'transition';

/**
 * Place型ノードの生成
 */
export const createPlaceNode = (
  type: 'material' | 'condition' | 'result',
  position: { x: number; y: number }
): Node<any> => {
  const timestamp = Date.now();
  const id = `${type}-${timestamp}`;
  
  return {
    id,
    type: `${type}TemplateNode`,
    position,
    data: {
      id,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      placeType: type,
      templates: [],
      namespaces: [],
    },
  };
};

/**
 * Transitionノードの生成
 */
export const createTransitionNode = (
  position: { x: number; y: number }
): Node<any> => {
  const timestamp = Date.now();
  const id = `transition-${timestamp}`;
  
  return {
    id,
    type: 'transitionNode',
    position,
    data: {
      id,
      name: 'Transition',
      nodeType: 'transition',
      method: null,
      document: null,
      instructionLabels: [],
    },
  };
};

/**
 * ノードタイプの判定
 */
export const getNodeType = (node: Node<any>): NodeType | null => {
  if (node.data.placeType) {
    return node.data.placeType as NodeType;
  }
  if (node.data.nodeType === 'transition') {
    return 'transition';
  }
  return null;
};

/**
 * ノードが選択可能か判定
 */
export const isNodeSelectable = (node: Node<any>): boolean => {
  return node.data !== undefined;
};

/**
 * ノードがPlace型か判定
 */
export const isPlaceNode = (node: Node<any>): boolean => {
  return ['material', 'condition', 'result'].includes(node.data.placeType);
};

/**
 * ノードがTransition型か判定
 */
export const isTransitionNode = (node: Node<any>): boolean => {
  return node.data.nodeType === 'transition';
};

/**
 * ノードのコピーを作成（オフセット付き）
 */
export const copyNodeWithOffset = (
  node: Node<any>,
  offset: { x: number; y: number } = { x: 50, y: 50 }
): Node<any> => {
  const timestamp = Date.now();
  const nodeType = getNodeType(node);
  const newId = `${nodeType}-${timestamp}`;
  
  return {
    ...node,
    id: newId,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
    data: {
      ...node.data,
      id: newId,
      name: `${node.data.name} (Copy)`,
    },
  };
};

/**
 * 複数ノードのIDを更新
 */
export const regenerateNodeIds = (nodes: Node<any>[]): Node<any>[] => {
  const idMap = new Map<string, string>();
  
  return nodes.map((node, index) => {
    const timestamp = Date.now() + index;
    const nodeType = getNodeType(node);
    const newId = `${nodeType}-${timestamp}`;
    idMap.set(node.id, newId);
    
    return {
      ...node,
      id: newId,
      data: {
        ...node.data,
        id: newId,
      },
    };
  });
};

/**
 * ノードの接続数をカウント
 */
export const getNodeConnectionCount = (
  nodeId: string,
  edges: any[]
): { incoming: number; outgoing: number } => {
  const incoming = edges.filter(e => e.target === nodeId).length;
  const outgoing = edges.filter(e => e.source === nodeId).length;
  
  return { incoming, outgoing };
};

/**
 * ノードの検証
 */
export const validateNode = (node: Node<any>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!node.id) {
    errors.push('ノードIDが存在しません');
  }
  
  if (!node.data) {
    errors.push('ノードデータが存在しません');
  }
  
  if (!node.data.name || node.data.name.trim() === '') {
    errors.push('ノード名が空です');
  }
  
  const nodeType = getNodeType(node);
  if (!nodeType) {
    errors.push('ノードタイプが不明です');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};