'use client';

import React, { useMemo } from 'react';
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

    const horizontalSpacing = 290; // レベル間の水平間隔
    const verticalSpacing   = 200; // 同レベル内の垂直間隔

    // ── BFS トポロジカルソートでレベル（列）を計算 ──────────────────
    // prerequisiteTransitionIds を使い、依存関係グラフを走査する。
    // 前提なし (inDegree=0) のノードを level=0 とし、
    // 後続ノードのレベルを max(現在+1, 既存) で更新していく。
    const levels = new Map<string, number>();
    const inDegree = new Map<string, number>();

    // 初期化
    transitions.forEach((t) => {
      levels.set(t.transitionId, 0);
      inDegree.set(t.transitionId, (t.prerequisiteTransitionIds ?? []).length);
    });

    // inDegree=0 のノードからキュー開始
    const queue: string[] = [];
    transitions.forEach((t) => {
      if ((inDegree.get(t.transitionId) ?? 0) === 0) {
        queue.push(t.transitionId);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentLevel = levels.get(currentId) ?? 0;

      // 後続ノード（自分を前提とするもの）を探す
      transitions.forEach((t) => {
        if (!(t.prerequisiteTransitionIds ?? []).includes(currentId)) return;
        const newLevel = currentLevel + 1;
        if (newLevel > (levels.get(t.transitionId) ?? 0)) {
          levels.set(t.transitionId, newLevel);
        }
        const deg = (inDegree.get(t.transitionId) ?? 1) - 1;
        inDegree.set(t.transitionId, deg);
        if (deg === 0) {
          queue.push(t.transitionId);
        }
      });
    }

    // ── レベルごとにグループ化してノード位置を決定 ─────────────────
    const transitionsByLevel = new Map<number, Transition[]>();
    transitions.forEach((t) => {
      const lv = levels.get(t.transitionId) ?? 0;
      if (!transitionsByLevel.has(lv)) transitionsByLevel.set(lv, []);
      transitionsByLevel.get(lv)!.push(t);
    });

    // 同一レベル内は workOrder → transitionId の順でソート（縦並びの安定化）
    transitionsByLevel.forEach((group) => {
      group.sort((a, b) => {
        const wa = a.workOrder ?? 0;
        const wb = b.workOrder ?? 0;
        if (wa !== wb) return wa - wb;
        return a.transitionId.localeCompare(b.transitionId);
      });
    });

    return transitions.map((transition) => {
      const lv = levels.get(transition.transitionId) ?? 0;
      const group = transitionsByLevel.get(lv) ?? [];
      const indexInLevel = group.findIndex((t) => t.transitionId === transition.transitionId);
      return {
        id: transition.transitionId,
        type: 'transitionNode',
        position: {
          x: lv * horizontalSpacing + 50,
          y: indexInLevel * verticalSpacing + 50,
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

  // エッジの生成（prerequisiteTransitionIds ベースの依存関係接続）
  const initialEdges = useMemo(() => {
    if (!transitions || transitions.length === 0) {
      return [];
    }

    const edges: Edge[] = [];
    transitions.forEach((t) => {
      (t.prerequisiteTransitionIds ?? []).forEach((prereqId) => {
        // 前提トランジションが transitions 内に存在する場合のみエッジを追加
        if (!transitions.some((tr) => tr.transitionId === prereqId)) return;
        edges.push({
          id: `edge-${prereqId}-${t.transitionId}`,
          source: prereqId,
          target: t.transitionId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#000000', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#000000',
            width: 20,
            height: 20,
          },
        });
      });
    });
    return edges;
  }, [transitions]);

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
        data-testid="transition-flow-diagram-empty"
      >
        <Empty
          image={<PartitionOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />}
          imageStyle={{ height: 48 }}
          description={
            <Space orientation="vertical" align="center" size="small">
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
      data-testid="transition-flow-diagram"
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
            <Space orientation="vertical" size="small">
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
