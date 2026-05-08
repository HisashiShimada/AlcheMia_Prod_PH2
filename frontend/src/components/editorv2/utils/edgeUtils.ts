/**
 * edgeUtils - エッジ操作ユーティリティ
 * 
 * エッジの生成・検証・変換などの純粋関数
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node, Edge } from 'reactflow';
import { getNodeType } from './nodeUtils';
import { EdgeData, NodeData } from '../../../types/editor';
import { getTranslation } from '../../../contexts/LanguageContext';

/**
 * エッジの生成
 */
export const createEdge = (
  sourceId: string,
  targetId: string,
  animated: boolean = false
): Edge<EdgeData> => {
  return {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'default',
    animated,
    style: { stroke: '#555', strokeWidth: 2 },
  };
};

/**
 * エッジ接続の妥当性検証
 */
export const isValidConnection = (
  sourceNode: Node<NodeData> | undefined,
  targetNode: Node<NodeData> | undefined
): boolean => {
  if (!sourceNode || !targetNode) {
    return false;
  }

  const sourceType = getNodeType(sourceNode);
  const targetType = getNodeType(targetNode);

  if (!sourceType || !targetType) {
    return false;
  }

  // Transition → Place または Place → Transition のみ許可
  return (
    (sourceType === 'transition' &&
      (targetType === 'material' ||
        targetType === 'condition' ||
        targetType === 'result')) ||
    ((sourceType === 'material' ||
      sourceType === 'condition' ||
      sourceType === 'result') &&
      targetType === 'transition')
  );
};

/**
 * ノードが接続されているか判定
 */
export const isNodeConnected = (nodeId: string, edges: Edge<EdgeData>[]): boolean => {
  return edges.some(e => e.source === nodeId || e.target === nodeId);
};

/**
 * 特定のノード間にエッジが存在するか確認
 */
export const edgeExists = (
  sourceId: string,
  targetId: string,
  edges: Edge<EdgeData>[]
): boolean => {
  return edges.some(
    e => e.source === sourceId && e.target === targetId
  );
};

/**
 * ノードに接続されているエッジを取得
 */
export const getConnectedEdges = (
  nodeId: string,
  edges: Edge<EdgeData>[]
): { incoming: Edge<EdgeData>[]; outgoing: Edge<EdgeData>[] } => {
  const incoming = edges.filter(e => e.target === nodeId);
  const outgoing = edges.filter(e => e.source === nodeId);
  
  return { incoming, outgoing };
};

/**
 * ノードIDのリマップ（複数ノードコピー時のエッジ更新用）
 */
export const remapEdgeIds = (
  edges: Edge<EdgeData>[],
  oldToNewIdMap: Map<string, string>
): Edge<EdgeData>[] => {
  return edges
    .map(edge => {
      const newSourceId = oldToNewIdMap.get(edge.source);
      const newTargetId = oldToNewIdMap.get(edge.target);
      
      // 両方のノードがマップに存在する場合のみ、エッジを残す
      if (newSourceId && newTargetId) {
        return {
          ...edge,
          id: `${newSourceId}-${newTargetId}`,
          source: newSourceId,
          target: newTargetId,
        };
      }
      return null;
    })
    .filter((edge): edge is Edge<EdgeData> => edge !== null);
};

/**
 * エッジの検証
 */
export const validateEdge = (
  edge: Edge<EdgeData>,
  nodes: Node<NodeData>[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!edge.id) {
    errors.push(getTranslation('editor.validation.edgeIdMissing'));
  }
  
  if (!edge.source) {
    errors.push(getTranslation('editor.validation.sourceNodeIdMissing'));
  }
  
  if (!edge.target) {
    errors.push(getTranslation('editor.validation.targetNodeIdMissing'));
  }
  
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  
  if (!sourceNode) {
    errors.push(`${getTranslation('editor.validation.sourceNodeNotFoundPrefix')}(${edge.source})${getTranslation('editor.validation.notFoundSuffix')}`);
  }
  
  if (!targetNode) {
    errors.push(`${getTranslation('editor.validation.targetNodeNotFoundPrefix')}(${edge.target})${getTranslation('editor.validation.notFoundSuffix')}`);
  }
  
  if (sourceNode && targetNode && !isValidConnection(sourceNode, targetNode)) {
    errors.push(getTranslation('editor.validation.invalidConnectionType'));
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 循環参照の検出
 */
export const detectCycle = (
  nodeId: string,
  edges: Edge<EdgeData>[],
  visited: Set<string> = new Set()
): boolean => {
  if (visited.has(nodeId)) {
    return true;
  }
  
  visited.add(nodeId);
  
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  for (const edge of outgoingEdges) {
    if (detectCycle(edge.target, edges, new Set(visited))) {
      return true;
    }
  }
  
  return false;
};