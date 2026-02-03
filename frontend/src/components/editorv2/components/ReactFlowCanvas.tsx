/**
 * ReactFlowCanvas - ReactFlowキャンバスコンポーネント
 * 
 * PetriNetのビジュアル表示とインタラクション
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

// カスタムノード
import {
  MaterialPlaceNode,
  ConditionPlaceNode,
  ResultPlaceNode,
  TransitionNode,
} from './nodes';

/**
 * ReactFlowCanvasのProps
 */
export interface ReactFlowCanvasProps {
  /** ノード配列 */
  nodes: Node[];
  /** エッジ配列 */
  edges: Edge[];
  /** ノードクリックハンドラ */
  onNodeClick?: (nodeId: string) => void;
  /** エッジクリックハンドラ */
  onEdgeClick?: (edgeId: string) => void;
  /** キャンバスクリックハンドラ */
  onCanvasClick?: () => void;
  /** ノード変更ハンドラ */
  onNodesChange?: (changes: NodeChange[]) => void;
  /** エッジ変更ハンドラ */
  onEdgesChange?: (changes: EdgeChange[]) => void;
  /** コネクション作成ハンドラ */
  onConnect?: (connection: Connection) => void;
  /** 選択中のノードID */
  selectedNodeId?: string | null;
  /** 選択中のエッジID */
  selectedEdgeId?: string | null;
}

/**
 * ReactFlowCanvasコンポーネント
 * 
 * PetriNetのビジュアル編集キャンバス
 */
const ReactFlowCanvas: React.FC<ReactFlowCanvasProps> = ({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onCanvasClick,
  onNodesChange,
  onEdgesChange,
  onConnect,
  selectedNodeId,
  selectedEdgeId,
}) => {
  /**
   * カスタムノードタイプの定義
   */
  const nodeTypes = useMemo(
    () => ({
      materialPlace: MaterialPlaceNode,
      conditionPlace: ConditionPlaceNode,
      resultPlace: ResultPlaceNode,
      transition: TransitionNode,
    }),
    []
  );

  /**
   * ノードクリックハンドラ
   */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  /**
   * エッジクリックハンドラ
   */
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge.id);
      }
    },
    [onEdgeClick]
  );

  /**
   * キャンバスクリックハンドラ
   */
  const handlePaneClick = useCallback(() => {
    if (onCanvasClick) {
      onCanvasClick();
    }
  }, [onCanvasClick]);

  /**
   * 選択状態を反映したノード配列
   */
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  /**
   * 選択状態を反映したエッジ配列
   */
  const edgesWithSelection = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      selected: edge.id === selectedEdgeId,
    }));
  }, [edges, selectedEdgeId]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edgesWithSelection}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        {/* 背景グリッド */}
        <Background gap={16} size={1} />

        {/* コントロールパネル */}
        <Controls />

        {/* ミニマップ */}
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
};

export default ReactFlowCanvas;