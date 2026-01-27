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
import MaterialTemplateNode from '../nodes/MaterialTemplateNode';
import ConditionTemplateNode from '../nodes/ConditionTemplateNode';
import ResultTemplateNode from '../nodes/ResultTemplateNode';
import TransitionNode from '../nodes/TransitionNode';

// ダイアログコンポーネント
import PropertyViewerWithSelection from './dialogs/PropertyViewerWithSelection';
import { Drawer } from 'antd';

// ユーティリティ
import { parseMaimlToPetriNet } from '../../utils/maimlParser';
import { convertToReactFlow } from '../../utils/reactFlowConverter';

const { Title, Text } = Typography;

interface PetriNetViewerProps {
  maimlData?: string | null;
  dotData?: string | null;
  enhancedMode?: boolean;
  performanceStats?: unknown;
  propertyDisplayMode?: 'modal' | 'drawer';  // 新規: プロパティ表示モード
  containerElementId?: string;  // 新規: コンテナ要素ID
  selectedMethodId?: string;  // 🆕 複数メソッド対応: 選択されたメソッドID
  onOpenSubNetViewer?: (subnetData: {
    transitionName: string;
    maimlData: string;
    templateMap: Record<string, { element: Element }>;
    petriNetData: {
      places: Array<{
        id: string;
        data: {
          label?: string;
          stereotype?: string;
          template?: { id: string };
          templateId?: string;
        };
      }>;
      arcs: Array<{
        id: string;
        source: string;
        target: string;
      }>;
    };
  }) => void;
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
  performanceStats,
  propertyDisplayMode = 'modal',  // デフォルト: modal
  containerElementId,
  selectedMethodId,  // 🆕 複数メソッド対応
  onOpenSubNetViewer
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArcLabels, setShowArcLabels] = useState(false);

  // 🎯 複数メソッド管理用State
  const [multiMethodMode, setMultiMethodMode] = useState(false);
  const [methodName, setMethodName] = useState<string>('');

  // Drawer表示状態
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // プロパティオブジェクトの型定義（PropertyViewerWithSelectionと同じ）
  interface PropertyObject {
    key?: string;
    value?: unknown;
    type?: string;
    description?: string;
    defaultValue?: string;
  }

  // プロパティ構造（ノードのプロパティ情報）
  const [structuredProperties, setStructuredProperties] = useState<{
    basic: Record<string, PropertyObject>;
    template: Record<string, PropertyObject>;
    data: Record<string, PropertyObject>;
  }>({
    basic: {},
    template: {},
    data: {}
  });

  // ノード単位でプロパティ選択状態を管理
  const [selectedPropertiesByNode, setSelectedPropertiesByNode] = useState<Record<string, {
    basic: string[];
    template: string[];
    data: string[];
  }>>({});

  // SubNetViewer用のデータ（親に渡すため保持）
  const [petriNetStructure, setPetriNetStructure] = useState<{
    places: Array<{
      id: string;
      data: {
        label?: string;
        stereotype?: string;
        template?: { id: string };
        templateId?: string;
      };
    }>;
    arcs: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  } | null>(null);
  const [templateMap, setTemplateMap] = useState<Record<string, { element: Element }>>({});

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
      console.log('🔍 [PetriNetViewer] MAIMLデータの解析開始', {
        selectedMethodId: selectedMethodId || 'all'
      });
      
      // MAIML XMLをパース（🆕 selectedMethodIdを渡す）
      const structure = parseMaimlToPetriNet(maimlData, selectedMethodId);
      
      // ペトリネット構造をSubNetViewer用の形式に変換
      const placesForSubNet = structure.places.map(place => {
        // templatesからtypeを取得（存在しない場合はmaterial）
        const template = structure.templates[place.id];
        const templateType = template?.type || 'material';
        
        return {
          id: place.id,
          data: {
            label: place.name,
            stereotype: templateType, // templatesから取得したtypeを使用
            template: template ? { id: template.id } : undefined,
            templateId: template?.id,
          },
        };
      });
      
      setPetriNetStructure({
        places: placesForSubNet,
        arcs: structure.arcs,
      });
      
      // templateMapを保存（XML要素を含む形式に変換）
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(maimlData, 'text/xml');
      const newTemplateMap: Record<string, { element: Element }> = {};
      
      Object.entries(structure.templates).forEach(([placeId, template]) => {
        // XMLからテンプレート要素を取得
        const templateEl = xmlDoc.querySelector(
          `materialTemplate[id="${template.id}"], conditionTemplate[id="${template.id}"], resultTemplate[id="${template.id}"]`
        );
        if (templateEl) {
          newTemplateMap[placeId] = { element: templateEl };
        }
      });
      
      setTemplateMap(newTemplateMap);
      
      // React Flow形式に変換
      const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(structure);
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      
      console.log('✅ [PetriNetViewer] ペトリネット初期化完了:', {
        nodes: flowNodes.length,
        edges: flowEdges.length,
        places: structure.places.length,
        arcs: structure.arcs.length,
        selectedMethodId: selectedMethodId || 'all',
      });
    } catch (err) {
      console.error('❌ [PetriNetViewer] 初期化エラー:', err);
      setError(err instanceof Error ? err.message : 'ペトリネット構造の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [maimlData, selectedMethodId, setNodes, setEdges]);

  // ノードクリックハンドラ
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('👆 [PetriNetViewer] ノードクリック:', node.id, node.data?.nodeType);

    setSelectedNodeId(node.id);
    setSelectedNode(node);

    // Placeノードの場合、プロパティダイアログを表示
    if (node.data?.nodeType === 'place') {
      console.log('🔍 [PetriNetViewer] Placeノード処理開始');

      // 基本情報
      const basicProperties: Record<string, PropertyObject> = {
        id: { key: 'id', value: String(node.id), type: 'string', description: 'ノードID' },
        type: { key: 'type', value: String(node.data.templateType || 'material'), type: 'string', description: 'ノード種別' },
        name: { key: 'name', value: String(node.data.label || node.id), type: 'string', description: 'ノード名' },
        description: { key: 'description', value: String(node.data.description || '説明なし'), type: 'string', description: 'ノード説明' }
      };

      // テンプレートプロパティ
      const templateProperties: Record<string, PropertyObject> = {};
      if (node.data.properties && typeof node.data.properties === 'object') {
        Object.entries(node.data.properties).forEach(([key, value]) => {
          templateProperties[key] = {
            key,
            value: value || '値なし',
            type: 'string',
            description: '説明なし'
          };
        });
      }

      // データプロパティ
      const dataProperties: Record<string, PropertyObject> = {
        coordinates: {
          key: 'coordinates',
          value: `(${node.position.x.toFixed(2)}, ${node.position.y.toFixed(2)})`,
          type: 'coordinates',
          description: 'ノード座標'
        }
      };

      console.log('🔍 [PetriNetViewer] プロパティ設定:', {
        basic: Object.keys(basicProperties).length,
        template: Object.keys(templateProperties).length,
        data: Object.keys(dataProperties).length
      });

      setStructuredProperties({
        basic: basicProperties,
        template: templateProperties,
        data: dataProperties
      });

      setDrawerOpen(true);
    } else if (node.data?.nodeType === 'transition') {
      // Transitionノード → 親コンポーネントに通知
      console.log('🔍 [PetriNetViewer] Transitionノードクリック:', node.id);
      
      if (!petriNetStructure || !maimlData) {
        message.error('サブネット情報が取得できません');
        return;
      }
      
      // onOpenSubNetViewerコールバックがあれば呼び出す
      if (onOpenSubNetViewer) {
        onOpenSubNetViewer({
          transitionName: node.id,
          maimlData,
          templateMap,
          petriNetData: petriNetStructure,
        });
      } else {
        // コールバックがない場合は警告（開発時のデバッグ用）
        console.warn('⚠️ [PetriNetViewer] onOpenSubNetViewerコールバックが設定されていません');
        message.info('サブネット表示機能は準備中です');
      }
    }
  }, [petriNetStructure, maimlData, templateMap, onOpenSubNetViewer]);

  // プロパティ選択トグルハンドラ
  const handlePropertyToggle = useCallback((structure: 'basic' | 'template' | 'data', property: string) => {
    console.log('🔍 [PetriNetViewer] プロパティトグル:', { structure, property, selectedNodeId });

    if (!selectedNodeId) return;

    setSelectedPropertiesByNode(prev => {
      const nodeProps = prev[selectedNodeId] || { basic: [], template: [], data: [] };
      const newNodeProps = { ...nodeProps };
      const currentList = newNodeProps[structure] || [];

      if (currentList.includes(property)) {
        newNodeProps[structure] = currentList.filter(p => p !== property);
      } else {
        newNodeProps[structure] = [...currentList, property];
      }

      const newState = {
        ...prev,
        [selectedNodeId]: newNodeProps
      };

      console.log('🔍 [PetriNetViewer] 新しい選択状態:', newState);

      // 選択されたプロパティをノードデータに反映
      setNodes(nds => nds.map(node => {
        if (node.id === selectedNodeId) {
          // 選択されたプロパティから表示用データを構築
          const selectedPropsData: Record<string, string> = {};

          Object.entries(newNodeProps).forEach(([struct, props]) => {
            props.forEach(propKey => {
              const propData = structuredProperties[struct as keyof typeof structuredProperties]?.[propKey];
              if (propData && typeof propData === 'object' && 'value' in propData) {
                selectedPropsData[propKey] = String(propData.value);
              }
            });
          });

          console.log('🔍 [PetriNetViewer] selectedPropsData:', selectedPropsData);

          return {
            ...node,
            data: {
              ...node.data,
              selectedProperties: selectedPropsData,
            }
          };
        }
        return node;
      }));

      return newState;
    });
  }, [selectedNodeId, structuredProperties, setNodes]);

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
        <Space orientation="vertical" size="large" align="center">
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
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ヘッダー */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8, flexShrink: 0 }}>
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
            {multiMethodMode && methodName && (
              <Text type="secondary" style={{ fontSize: 12, color: '#1890ff' }}>
                📋 {methodName}
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
      <Card 
        style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}
        styles={{
          body: { 
            padding: 0, 
            height: '100%',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <div style={{ width: '100%', height: '100%', flex: 1, minHeight: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
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
      {performanceStats ? (
        <Card size="small" style={{ marginTop: 16 }}>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>パフォーマンス統計:</strong>
            </Text>
            <pre style={{ fontSize: 12, margin: 0, color: '#8c8c8c' }}>
              {JSON.stringify(performanceStats as Record<string, unknown>, null, 2)}
            </pre>
          </Space>
        </Card>
      ) : null}

      {/* プロパティ選択Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedNode(null);
          setSelectedNodeId(null);
        }}
        width={450}
        getContainer={containerElementId ? () => document.getElementById(containerElementId) as HTMLElement : document.body}
        styles={{ body: { padding: 0 } }}
      >
        {selectedNode && (
          <PropertyViewerWithSelection
            properties={{
              id: selectedNode.id,
              name: selectedNode.data?.label as string || selectedNode.id,
              type: (selectedNode.data?.templateType as 'Material' | 'Condition' | 'Result' | 'Transition') || 'Material',
            }}
            structuredProperties={structuredProperties}
            selectedProperties={selectedPropertiesByNode[selectedNode.id] || { basic: [], template: [], data: [] }}
            onPropertyToggle={handlePropertyToggle}
            onClose={() => {
              setDrawerOpen(false);
              setSelectedNode(null);
              setSelectedNodeId(null);
            }}
          />
        )}
      </Drawer>
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
