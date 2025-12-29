/**
 * SubNetViewer - React Flow版（Ant Design v6対応）- 非Modal版
 * トランジションノードのサブネットを表示するコンポーネント
 * 
 * @description
 * ViewRendererDialog内で使用するため、Modalは使用せず通常のdivベースで実装
 * Transitionノードに接続されたPlaceノード（入力/出力）をReact Flow形式で表示します。
 * - 左ペイン: React Flow（サブネット表示）
 * - 右ペイン: StructuredPropertySelector（プロパティ表示）
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Node,
  Edge,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Button,
  Space,
  Flex,
  Spin,
  Alert,
  Typography,
  Tooltip,
  theme,
} from 'antd';
import {
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

// カスタムノード
import MaterialTemplateNode from '../../nodes/MaterialTemplateNode';
import ConditionTemplateNode from '../../nodes/ConditionTemplateNode';
import ResultTemplateNode from '../../nodes/ResultTemplateNode';
import TransitionNode from '../../nodes/TransitionNode';

// プロパティビューア
import PropertyViewer from './PropertyViewer';

// React Flow変換ユーティリティ
import { 
  convertSubnetToReactFlow,
  SubnetData,
  PlaceInfo,
  ArcInfo,
  TemplateInfo,
} from '../../../utils/subnetReactFlowConverter';

const { Title, Text } = Typography;

// カスタムノードタイプの定義
const nodeTypes = {
  materialTemplate: MaterialTemplateNode,
  conditionTemplate: ConditionTemplateNode,
  resultTemplate: ResultTemplateNode,
  transition: TransitionNode,
};

/**
 * SubNetViewerProps
 */
interface SubNetViewerProps {
  open: boolean;
  nodeName: string;
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
  onClose: () => void;
}

/**
 * SubNetViewerInner - ReactFlowProvider内で動作する内部コンポーネント
 */
const SubNetViewerInner: React.FC<SubNetViewerProps> = ({
  open,
  nodeName,
  maimlData,
  templateMap,
  petriNetData,
  onClose,
}) => {
  const { token } = theme.useToken();
  
  // React Flow状態
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  // 基本状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subnetData, setSubnetData] = useState<SubnetData | null>(null);
  
  // 右ペイン（PropertyViewerWithSelection）
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
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


  // MAIMLデータからサブネット情報を抽出
  useEffect(() => {
    if (!nodeName || !open) {
      return;
    }

    const fetchSubnetData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`🔍 [SubNetViewer] トランジション "${nodeName}" のサブネット抽出開始`);
        
        // トランジションに接続されたアークをフィルタリング
        const transitionArcs = petriNetData.arcs.filter((arc) => 
          arc.source === nodeName || arc.target === nodeName
        );
        
        if (transitionArcs.length === 0) {
          setError(`トランジション "${nodeName}" に接続されたアークがありません`);
          setLoading(false);
          return;
        }
        
        // arcから関連するplaceIDを収集
        const relatedPlaceIds = new Set<string>();
        const relatedArcs: ArcInfo[] = [];
        
        transitionArcs.forEach((arc) => {
          relatedArcs.push({
            id: arc.id,
            source: arc.source,
            target: arc.target,
            weight: '1',
            description: arc.id,
          });
          
          // トランジション以外のノード（=placeID）を収集
          if (arc.source !== nodeName) {
            relatedPlaceIds.add(arc.source);
          }
          if (arc.target !== nodeName) {
            relatedPlaceIds.add(arc.target);
          }
        });
        
        // placesデータを使用
        const relatedPlaces: PlaceInfo[] = petriNetData.places
          .filter((place) => relatedPlaceIds.has(place.id))
          .map((place) => {
            // stereotypeからtemplateTypeを判定
            const stereotype = place.data.stereotype || '';
            const stereotypeLower = stereotype.toLowerCase();
            
            let templateType: 'material' | 'condition' | 'result' = 'material';
            if (stereotypeLower.includes('material')) {
              templateType = 'material';
            } else if (stereotypeLower.includes('condition')) {
              templateType = 'condition';
            } else if (stereotypeLower.includes('result')) {
              templateType = 'result';
            }
            
            // templateIdの取得
            let templateId: string | null = null;
            if (place.data.template && place.data.template.id) {
              templateId = place.data.template.id;
            } else if (place.data.templateId) {
              templateId = place.data.templateId;
            } else {
              templateId = place.id;
            }
            
            // templateMapから取得
            let templateInfo: TemplateInfo | null = null;
            if (templateId && templateMap[templateId]) {
              const templateMapEntry = templateMap[templateId];
              
              if (templateMapEntry && templateMapEntry.element) {
                templateInfo = {
                  id: templateId,
                  name: place.data.label || templateId,
                  type: templateType,
                  element: templateMapEntry.element,
                  properties: [],
                };
              }
            }
            
            return {
              id: place.id,
              name: place.data.label || place.id,
              isTemplate: true,
              templateType: templateType,
              templateName: place.data.label,
              templateInfo: templateInfo,
            };
          });
        
        // トランジション情報
        const transitionData = {
          id: nodeName,
          name: nodeName,
          type: 'normal',
        };
        
        // サブネットデータを構築
        const subnet: SubnetData = {
          transition: transitionData,
          places: relatedPlaces,
          arcs: relatedArcs,
        };
        
        setSubnetData(subnet);
        
        // React Flow形式に変換
        const { nodes: flowNodes, edges: flowEdges } = convertSubnetToReactFlow(subnet);
        
        console.log('✅ [SubNetViewer] React Flow変換完了:', {
          nodes: flowNodes.length,
          edges: flowEdges.length,
          places: relatedPlaces.length,
        });
        
        setNodes(flowNodes);
        setEdges(flowEdges);
        setLoading(false);
        
      } catch (err) {
        console.error('❌ [SubNetViewer] サブネットデータ構築エラー:', err);
        setError('サブネットデータの構築中にエラーが発生しました');
        setLoading(false);
      }
    };
    
    fetchSubnetData();
  }, [maimlData, nodeName, templateMap, petriNetData, setNodes, setEdges, open]);

  // ノードクリックハンドラー
  const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
    console.log('👆 [SubNetViewer] ノードクリック:', node.id, node.data.nodeType);
    
    setSelectedNodeId(node.id);
    setSelectedNode(node);

    // 基本情報
    const basicProperties: Record<string, PropertyObject> = {
      id: { key: 'id', value: String(node.id), type: 'string', description: 'ノードID' },
      type: { key: 'type', value: String(node.data.templateType || node.data.nodeType || 'place'), type: 'string', description: 'ノード種別' },
      name: { key: 'name', value: String(node.data.label || node.id), type: 'string', description: 'ノード名' },
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

    setStructuredProperties({
      basic: basicProperties,
      template: templateProperties,
      data: dataProperties
    });
    
    // 右ペインを開く
    setRightPanelOpen(true);
  }, []);

  // ビューポートリセット
  const handleResetView = useCallback(() => {
    setRightPanelOpen(false);
    setSelectedNode(null);
  }, []);

  // 情報表示（簡易版 - Alertで表示）
  const handleShowInfo = useCallback(() => {
    alert(`サブネット情報\n\n中心ノード: ${nodeName}\n関連プレース数: ${subnetData?.places.length || 0}\nアーク数: ${subnetData?.arcs.length || 0}\nテンプレート参照: ${Object.keys(templateMap).length}件`);
  }, [nodeName, subnetData, templateMap]);
  
  // PropertyViewerを閉じる
  const handleClosePropertyViewer = useCallback(() => {
    setRightPanelOpen(false);
    setSelectedNode(null);
    setSelectedNodeId(null);
  }, []);

  // React Flow設定
  const proOptions = { hideAttribution: true };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* 左ペイン: React Flow表示エリア */}
      <div
        style={{
          flex: rightPanelOpen ? '0 0 60%' : '1 1 100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'flex 0.3s ease',
          position: 'relative',
        }}
      >
        {/* ツールバー */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: token.borderRadius,
            padding: '4px',
            boxShadow: token.boxShadow,
          }}
        >
          <Space size="small">
            <Tooltip title="ビューリセット">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={handleResetView}
                size="small"
              />
            </Tooltip>
            <Tooltip title="情報表示">
              <Button
                type="text"
                icon={<InfoCircleOutlined />}
                onClick={handleShowInfo}
                size="small"
              />
            </Tooltip>
          </Space>
        </div>

        {loading && (
          <Flex 
            justify="center" 
            align="center" 
            style={{ height: '100%' }}
          >
            <Space>
              <Spin />
              <Text>読み込み中...</Text>
            </Space>
          </Flex>
        )}
        
        {error && (
          <div style={{ padding: token.padding }}>
            <Alert message={error} type="error" showIcon />
          </div>
        )}
        
        {!loading && !error && nodes.length > 0 && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{
                padding: 0.2,
                minZoom: 0.5,
                maxZoom: 1.5,
              }}
              proOptions={proOptions}
            >
              <MiniMap
                style={{
                  height: 100,
                  width: 150,
                }}
                nodeStrokeColor={() => '#1a192b'}
                nodeColor={() => '#fff'}
                nodeBorderRadius={2}
                maskColor="rgba(0, 0, 0, 0.2)"
              />
              <Controls />
              <Background color="#aaa" gap={16} />
            </ReactFlow>
          </div>
        )}
      </div>
      
      {/* 右ペイン: PropertyViewer */}
      {rightPanelOpen && selectedNode && (
        <div
          style={{
            flex: '0 0 40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderLeft: `1px solid ${token.colorBorder}`,
            backgroundColor: token.colorBgContainer,
          }}
        >
          <PropertyViewer
            properties={{
              id: selectedNode.id,
              name: selectedNode.data.label as string || selectedNode.id,
              type: (selectedNode.data.nodeType === 'transition' ? 'Transition' : 
                    selectedNode.data.templateType === 'material' ? 'Material' :
                    selectedNode.data.templateType === 'condition' ? 'Condition' :
                    selectedNode.data.templateType === 'result' ? 'Result' : 'Material') as 'Material' | 'Condition' | 'Result' | 'Transition',
            }}
            structuredProperties={structuredProperties}
            onClose={handleClosePropertyViewer}
          />
        </div>
      )}
    </div>
  );
};

/**
 * SubNetViewer - ReactFlowProviderでラップされたメインコンポーネント
 */
const SubNetViewer: React.FC<SubNetViewerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SubNetViewerInner {...props} />
    </ReactFlowProvider>
  );
};

export default SubNetViewer;
