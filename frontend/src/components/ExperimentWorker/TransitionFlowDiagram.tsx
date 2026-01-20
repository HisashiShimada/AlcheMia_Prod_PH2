'use client';

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Empty, Space, Typography, theme } from 'antd';
import { PartitionOutlined } from '@ant-design/icons';
import { Transition } from '@/types/experimentWorker';
import TransitionFlowNode from './TransitionFlowNode';

const { Text, Title } = Typography;

interface TransitionFlowDiagramProps {
  transitions: Transition[];
  onRecordClick: (transition: Transition) => void;
  onIssueClick: (transition: Transition) => void;
  isProjectRecordable: boolean;
  methodName?: string;
}

// カスタムノードタイプの登録
const nodeTypes = {
  transitionNode: TransitionFlowNode,
};

/**
 * トランジションフロー図表示コンポーネント
 * React Flowを使用してトランジションを視覚的に表示
 */
export default function TransitionFlowDiagram({
  transitions,
  onRecordClick,
  onIssueClick,
  isProjectRecordable,
  methodName,
}: TransitionFlowDiagramProps) {
  const { token } = theme.useToken();

  // トランジションからReact Flow用のノードとエッジを生成
  const initialNodes = useMemo(() => {
    if (!transitions || transitions.length === 0) {
      return [];
    }

    // workOrder順にソート（workOrderがない場合は元の順序を維持）
    const sortedTransitions = [...transitions].sort((a, b) => {
      if (a.workOrder !== undefined && b.workOrder !== undefined) {
        return a.workOrder - b.workOrder;
      }
      // workOrderがない場合は元の順序を維持
      return 0;
    });

    // 自動レイアウト: 左から右への水平配置
    const horizontalSpacing = 270; // 横間隔（ノード幅を200pxに拡大したので調整）
    const verticalSpacing = 180; // 縦間隔（ボタン追加で高さが増えたので調整）
    const nodesPerRow = 4; // 1行あたりのノード数

    return sortedTransitions.map((transition, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;

      return {
        id: transition.transitionId,
        type: 'transitionNode',
        position: {
          x: col * horizontalSpacing + 50,
          y: row * verticalSpacing + 50,
        },
        data: {
          transition,
          onRecordClick,
          onIssueClick,
          isProjectRecordable,
        },
        draggable: true,
      };
    }) as Node[];
  }, [transitions, onRecordClick, onIssueClick, isProjectRecordable]);

  // エッジの生成（workOrder順に接続）
  const initialEdges = useMemo(() => {
    if (!transitions || transitions.length === 0) {
      return [];
    }

    // workOrder順にソート
    const sortedTransitions = [...transitions].sort((a, b) => {
      if (a.workOrder !== undefined && b.workOrder !== undefined) {
        return a.workOrder - b.workOrder;
      }
      return 0;
    });

    // workOrderで隣接するトランジション間にエッジを追加（常に表示）
    const edges: Edge[] = [];
    for (let i = 0; i < sortedTransitions.length - 1; i++) {
      const current = sortedTransitions[i];
      const next = sortedTransitions[i + 1];

      // すべての隣接トランジション間にエッジを追加
      edges.push({
        id: `edge-${current.transitionId}-${next.transitionId}`,
        source: current.transitionId,
        target: next.transitionId,
        type: 'smoothstep',
        animated: false,  // 実線にする
        style: {
          stroke: '#000000',  // 黒色にする
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#000000',  // 黒色にする
          width: 20,
          height: 20,
        },
      });
    }

    return edges;
  }, [transitions, token.colorPrimary]);

  // React FlowのuseNodesStateとuseEdgesStateを使用
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ノードデータが変更された場合に更新
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // トランジションが空の場合
  if (!transitions || transitions.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '500px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: token.colorBgLayout,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <Empty
          image={<PartitionOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />}
          imageStyle={{ height: 48 }}
          description={
            <Space direction="vertical" align="center" size="small">
              <Title level={4} type="secondary" style={{ margin: 0 }}>
                トランジションがありません
              </Title>
              <Text type="secondary">
                選択されたタスクにトランジションが含まれていません
              </Text>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        background: token.colorBgLayout,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        connectionMode={ConnectionMode.Loose}
        // ノードのドラッグを有効化
        nodesDraggable={true}
        nodesConnectable={false} // 接続は無効化
        elementsSelectable={true}
        // パンニング設定
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        // スタイル
        style={{
          background: token.colorBgLayout,
        }}
      >
        {/* 背景グリッド */}
        <Background
          color={token.colorBorder}
          gap={20}
          size={1}
        />

        {/* コントロールパネル（ズーム、フィット） */}
        <Controls showInteractive={false} />

        {/* ミニマップ */}
        <MiniMap
          nodeColor={(node) => {
            const transition = (node.data as { transition: Transition }).transition;
            const status = transition?.status;
            
            if (!status || status === 'not_started') return token.colorBorder;
            if (status === 'in_progress') return token.colorWarning;
            if (status === 'completed') return token.colorSuccess;
            if (status === 'on_hold') return token.colorWarning;
            if (status === 'issue') return token.colorError;
            
            return token.colorBorder;
          }}
          maskColor={`${token.colorBgContainer}CC`}
          style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadiusSM,
          }}
        />

        {/* 情報パネル */}
        <Panel position="top-left">
          <div
            style={{
              background: token.colorBgContainer,
              padding: `${token.paddingSM}px ${token.paddingMD}px`,
              borderRadius: token.borderRadiusSM,
              border: `1px solid ${token.colorBorder}`,
              boxShadow: token.boxShadow,
            }}
          >
            <Space direction="vertical" size="small">
              {methodName && (
                <Text strong style={{ fontSize: 14 }}>
                  {methodName}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                トランジション数: {transitions.length}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ドラッグで移動、スクロールでズーム
              </Text>
            </Space>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
