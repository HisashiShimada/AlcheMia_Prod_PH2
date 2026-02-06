/**
 * edgeHandlers - エッジ操作ハンドラー集約
 * 
 * エッジの追加・削除・選択などの操作を管理
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node, Edge, Connection } from 'reactflow';
import { NodeData, EdgeData } from '../types';

export interface EdgeHandlersProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setEdges: (edges: Edge<EdgeData>) => void;
  setSelectedNode: (node: Node<NodeData>) => void;
  setSelectedEdge: (edge: Edge<EdgeData>) => void;
  pushState: (state: any) => void;
}

export interface EdgeHandlersResult {
  handleConnect: (connection: Connection) => void;
  handleEdgeClick: (_event: any, edge: Edge<EdgeData>) => void;
  handleEdgesChange: (changes: Edge<EdgeData>[]) => void;
  handleDeleteEdge: (edgeId: string) => void;
}

/**
 * エッジ操作ハンドラーを生成
 */
export const createEdgeHandlers = ({
  nodes,
  edges,
  setEdges,
  setSelectedNode,
  setSelectedEdge,
  pushState,
}: EdgeHandlersProps): EdgeHandlersResult => {
  
  /**
   * エッジ接続（新規作成）
   */
  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // 接続可能性の検証
    const sourceType = sourceNode.data.placeType || sourceNode.data.nodeType;
    const targetType = targetNode.data.placeType || targetNode.data.nodeType;

    const isValidConnection =
      (sourceType === 'transition' &&
        (targetType === 'material' ||
          targetType === 'condition' ||
          targetType === 'result')) ||
      ((sourceType === 'material' ||
        sourceType === 'condition' ||
        sourceType === 'result') &&
        targetType === 'transition');

    if (!isValidConnection) {
      console.warn('⚠️ [edgeHandlers] 無効な接続:', sourceType, '→', targetType);
      return;
    }

    const newEdge: Edge<EdgeData> = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      type: 'default',
      animated: false,
      style: { stroke: '#555', strokeWidth: 2 },
    };

    setEdges((eds: Edge<EdgeData>[]) => {
      const newEdges = [...eds, newEdge];
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });

    console.log('🔗 [edgeHandlers] エッジ接続:', connection.source, '→', connection.target);
  };

  /**
   * エッジクリック
   */
  const handleEdgeClick = (_event: any, edge: Edge<EdgeData>) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    console.log('🖱️ [edgeHandlers] エッジ選択:', edge.id);
  };

  /**
   * エッジ変更（ReactFlow組み込み）
   */
  const handleEdgesChange = (changes: Edge<EdgeData>[]) => {
    setEdges((eds: Edge<EdgeData>[]) => {
      const newEdges = eds.map((edge: Edge<EdgeData>) => {
        const change = changes.find((c: Edge<EdgeData>) => c.id === edge.id);
        if (!change) return edge;

        if (change.type === 'select') {
          return { ...edge, selected: change.selected };
        }
        if (change.type === 'remove') {
          return null;
        }
        return edge;
      }).filter(Boolean);

      return newEdges;
    });
  };

  /**
   * エッジ削除
   */
  const handleDeleteEdge = (edgeId: string) => {
    setEdges((eds: Edge<EdgeData>[]) => {
      const newEdges = eds.filter((e: Edge<EdgeData>) => e.id !== edgeId);
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });

    setSelectedEdge(null);
    console.log('🗑️ [edgeHandlers] エッジ削除:', edgeId);
  };

  return {
    handleConnect,
    handleEdgeClick,
    handleEdgesChange,
    handleDeleteEdge,
  };
};