// frontend/src/components/viewer/PetriNetViewer.tsx
// PetriNetViewerコンポーネント（Ant Design v6版 - 完全版）

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, Button, Space, Typography, Alert, Spin, Flex, Switch, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import { 
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';

// カスタムノードコンポーネント
import MaterialTemplateNode from './nodes/MaterialTemplateNode';
import ConditionTemplateNode from './nodes/ConditionTemplateNode';
import ResultTemplateNode from './nodes/ResultTemplateNode';
import TransitionNode from './nodes/TransitionNode';

// ユーティリティ
import { parseMaimlToPetriNet } from './utils/maimlParser';
import { convertToReactFlow } from './utils/reactFlowConverter';

const { Title, Text } = Typography;

interface PetriNetViewerProps {
  maimlData?: string | null;
  dotData?: string | null;
  enhancedMode?: boolean;
  performanceStats?: unknown;
}

// カスタムノードタイプの定義
const nodeTypes = {
  materialTemplate: MaterialTemplateNode,
  conditionTemplate: ConditionTemplateNode,
  resultTemplate: ResultTemplateNode,
  transition: TransitionNode,
};

/**
 * PetriNetViewer Inner コンポーネント
 * ReactFlowProvider内で動作
 */
const PetriNetViewerInner: React.FC<PetriNetViewerProps> = ({
  maimlData,
  dotData,
  enhancedMode = false,
  performanceStats
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArcLabels, setShowArcLabels] = useState(false);

  // MAIML データの読み込みと変換
  useEffect(() => {
    if (!maimlData) {
      setNodes([]);
      setEdges([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [PetriNetViewer] MAIMLデータの解析開始');
      
      // MAIML XMLをパース
      const structure = parseMaimlToPetriNet(maimlData);
      
      // React Flow形式に変換
      const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(structure);
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      
      console.log('✅ [PetriNetViewer] ペトリネット初期化完了:', {
        nodes: flowNodes.length,
        edges: flowEdges.length,
      });
    } catch (err) {
      console.error('❌ [PetriNetViewer] 初期化エラー:', err);
      setError(err instanceof Error ? err.message : 'ペトリネット構造の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [maimlData, setNodes, setEdges]);

  // エクスポートメニュー
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'png',
      label: 'PNG画像として保存',
      icon: <DownloadOutlined />,
      onClick: () => {
        message.info('PNG出力機能は今後実装予定です');
        console.log('PNG出力');
      },
    },
    {
      key: 'svg',
      label: 'SVG形式として保存',
      icon: <DownloadOutlined />,
      onClick: () => {
        message.info('SVG出力機能は今後実装予定です');
        console.log('SVG出力');
      },
    },
    {
      key: 'json',
      label: 'JSON形式として保存',
      icon: <DownloadOutlined />,
      onClick: () => {
        const flowData = {
          nodes,
          edges,
          metadata: {
            exportedAt: new Date().toISOString(),
            nodeCount: nodes.length,
            edgeCount: edges.length,
          }
        };
        
        const dataStr = JSON.stringify(flowData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.download = `petri-net-${new Date().getTime()}.json`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        message.success('JSON形式で保存しました');
      },
    },
  ];

  // アーク属性表示のためのエッジ更新
  const displayEdges: Edge[] = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      label: showArcLabels ? (edge.data?.name || edge.label) : undefined,
      labelStyle: showArcLabels ? { fill: '#666', fontWeight: 400, fontSize: 10 } : undefined,
      labelBgStyle: showArcLabels ? { fill: '#f5f5f5', fillOpacity: 0.9 } : undefined,
      labelBgPadding: showArcLabels ? [4, 2] as [number, number] : undefined,
      labelBgBorderRadius: showArcLabels ? 3 : undefined,
    }));
  }, [edges, showArcLabels]);

  // React Flow設定
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  // データなし
  if (!maimlData && !dotData) {
    return (
      <Alert
        message="データなし"
        description="MAIMLデータまたはDOTデータが指定されていません"
        type="info"
        showIcon
      />
    );
  }

  // ローディング
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 500 
      }}>
        <Space direction="vertical" size="large" align="center">
          <Spin size="large" />
          <Text type="secondary">ペトリネット構造を読み込み中...</Text>
        </Space>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <Alert
        message="エラー"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Flex justify="space-between" align="center">
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              ペトリネット図 (React Flow)
            </Title>
            {enhancedMode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Enhanced Mode
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              ノード: {nodes.length} | エッジ: {edges.length}
            </Text>
          </Space>

          <Space>
            <Space size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                アーク名表示
              </Text>
              <Switch
                size="small"
                checked={showArcLabels}
                onChange={setShowArcLabels}
              />
            </Space>

            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button size="small" icon={<DownloadOutlined />}>
                エクスポート
              </Button>
            </Dropdown>
          </Space>
        </Flex>
      </Card>

      {/* React Flow */}
      <Card style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.1,
              minZoom: 0.1,
              maxZoom: 2,
            }}
            minZoom={0.05}
            maxZoom={4}
            proOptions={proOptions}
          >
            <Background />
            <Controls />
            <MiniMap
              style={{
                height: 120,
                width: 200,
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
          </ReactFlow>
        </div>
      </Card>

      {/* 情報表示 */}
      {performanceStats && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>パフォーマンス統計:</strong>
            </Text>
            <pre style={{ fontSize: 12, margin: 0, color: '#8c8c8c' }}>
              {JSON.stringify(performanceStats, null, 2)}
            </pre>
          </Space>
        </Card>
      )}
    </div>
  );
};

/**
 * PetriNetViewer メインコンポーネント
 * ReactFlowProviderでラップ
 */
const PetriNetViewer: React.FC<PetriNetViewerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <PetriNetViewerInner {...props} />
    </ReactFlowProvider>
  );
};

export default PetriNetViewer;
