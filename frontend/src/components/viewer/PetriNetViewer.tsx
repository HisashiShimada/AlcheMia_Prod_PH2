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

// ユーティリティ（新方式: maimlParserTyped）
import { MaimlParserTyped } from '../../utils/maimlParserTyped';
import { buildTemplateMap } from '../../utils/petriNetExtractor';
import { convertToReactFlowFormat } from '../../utils/reactFlowConverter';
import type { Method } from '../../types/maiml-unified';

// データタブ用ユーティリティ
import { fetchDataInfoFromMaiml, DataPropertyObject } from '../../utils/maimlDataExtractor';

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
      console.log('🔍 [PetriNetViewer] MAIMLデータの解析開始（新方式: maimlParserTyped）', {
        selectedMethodId: selectedMethodId || 'all'
      });

      // 新方式: MaimlParserTyped でパース
      const parser = new MaimlParserTyped(maimlData);
      const methodsData: Method[] = parser.getMethods();

      // selectedMethodId が指定されている場合は対象メソッドのみ、なければ最初のメソッドを使用
      const targetMethod = selectedMethodId
        ? methodsData.find((m: Method) => m.id === selectedMethodId) || methodsData[0]
        : methodsData[0];

      if (!targetMethod) {
        setNodes([]);
        setEdges([]);
        setError('メソッドが見つかりません');
        return;
      }

      // templateMap を構築（buildTemplateMap: placeId -> Template）
      const builtTemplateMap = buildTemplateMap(maimlData);

      // SubNetViewer 用の構造データを生成
      const placesForSubNet = (targetMethod.pnml.places || []).map((place) => {
        const tmpl = builtTemplateMap[place.id];
        return {
          id: place.id,
          data: {
            label: place.name || place.id,
            stereotype: tmpl?.category || 'material',
            template: tmpl ? { id: tmpl.id } : undefined,
            templateId: tmpl?.id,
            // ✅ Fix1: uuid/description を追加してSubNetViewerで表示できるようにする
            uuid: tmpl?.uuid,
            description: tmpl?.description,
          },
        };
      });

      setPetriNetStructure({
        places: placesForSubNet,
        arcs: targetMethod.pnml.arcs || [],
      });

      // templateMap を SubNetViewer 用の { element: Element } 形式に変換
      const xmlDoc = new DOMParser().parseFromString(maimlData, 'text/xml');
      const newTemplateMap: Record<string, { element: Element }> = {};
      Object.entries(builtTemplateMap).forEach(([placeId, tmpl]) => {
        const el = xmlDoc.querySelector(
          `materialTemplate[id="${tmpl.id}"], conditionTemplate[id="${tmpl.id}"], resultTemplate[id="${tmpl.id}"]`
        );
        if (el) {
          newTemplateMap[placeId] = { element: el };
        }
      });
      setTemplateMap(newTemplateMap);

      // React Flow 形式に変換（新シグネチャ: parser, petriNetData, templateMap）
      // Viewer は selectedMethodId で1メソッドずつ表示する方針。
      // methods に全メソッドを渡すと pnmlGroup フレームノードが生成されるが、
      // PetriNetViewer の nodeTypes に pnmlGroup が未登録のため黒点になる。
      // → methods: [targetMethod] で単一メソッドモードにして pnmlGroup を抑制する。
      const petriNetData = {
        methods: [targetMethod],
        places: targetMethod.pnml.places || [],
        transitions: targetMethod.pnml.transitions || [],
        arcs: targetMethod.pnml.arcs || [],
      };
      const { nodes: flowNodes, edges: flowEdges } = convertToReactFlowFormat(
        parser,
        petriNetData,
        builtTemplateMap
      );

      setNodes(flowNodes);
      setEdges(flowEdges);

      console.log('✅ [PetriNetViewer] ペトリネット初期化完了（新方式）:', {
        nodes: flowNodes.length,
        edges: flowEdges.length,
        places: petriNetData.places.length,
        arcs: petriNetData.arcs.length,
        selectedMethodId: selectedMethodId || targetMethod.id,
      });
    } catch (err) {
      console.error('❌ [PetriNetViewer] 初期化エラー:', err);
      setError(err instanceof Error ? err.message : 'ペトリネット構造の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [maimlData, selectedMethodId, setNodes, setEdges]);

  // ✅ Fix6: テンプレート要素から基本情報とプロパティを抽出（SubNetViewer.extractTemplateInfo と同じロジック）
  const extractTemplateInfoForNode = useCallback((templateElement: Element | null, templateType: string): {
    basicInfo: Record<string, PropertyObject>;
    templateProps: Record<string, PropertyObject>;
  } => {
    if (!templateElement) return { basicInfo: {}, templateProps: {} };

    const basicInfo: Record<string, PropertyObject> = {
      id: { key: 'id', value: templateElement.getAttribute('id') || '', type: 'string', description: 'テンプレートID' },
      type: { key: 'type', value: templateType.charAt(0).toUpperCase() + templateType.slice(1), type: 'string', description: 'テンプレート種別' },
      name: { key: 'name', value: templateElement.getAttribute('name') || '名称未設定', type: 'string', description: 'テンプレート名' },
    };

    const uuidEl = templateElement.querySelector(':scope > uuid');
    if (uuidEl?.textContent?.trim()) {
      basicInfo.uuid = { key: 'uuid', value: uuidEl.textContent.trim(), type: 'string', description: 'UUID' };
    }
    const descEl = templateElement.querySelector(':scope > description');
    if (descEl?.textContent?.trim()) {
      basicInfo.description = { key: 'description', value: descEl.textContent.trim(), type: 'string', description: '説明' };
    }
    const annotationEl = templateElement.querySelector(':scope > annotation');
    if (annotationEl?.textContent?.trim()) {
      basicInfo.annotation = { key: 'annotation', value: annotationEl.textContent.trim(), type: 'string', description: 'アノテーション' };
    }
    const insertionEl = templateElement.querySelector(':scope > insertion');
    if (insertionEl) {
      const uri = insertionEl.querySelector(':scope > uri')?.textContent?.trim();
      const hash = insertionEl.querySelector(':scope > hash')?.textContent?.trim();
      const format = insertionEl.querySelector(':scope > format')?.textContent?.trim();
      if (uri) basicInfo.insertion_uri = { key: 'insertion_uri', value: uri, type: 'string', description: 'Insertion URI' };
      if (hash) basicInfo.insertion_hash = { key: 'insertion_hash', value: hash, type: 'string', description: 'Insertion Hash' };
      if (format) basicInfo.insertion_format = { key: 'insertion_format', value: format, type: 'string', description: 'Insertion Format' };
    }
    // placeRef → 基本情報タブには表示しない（内部参照のため）

    // property 要素をテンプレートプロパティとして取得
    const templateProps: Record<string, PropertyObject> = {};
    Array.from(templateElement.querySelectorAll(':scope > property')).forEach((prop) => {
      const key = prop.getAttribute('key');
      if (!key) return;
      const xsiType = prop.getAttribute('xsi:type') || prop.getAttribute('type') || 'string';
      const units = prop.getAttribute('units');
      const value = prop.querySelector(':scope > value')?.textContent?.trim() ?? '';
      const desc = prop.querySelector(':scope > description')?.textContent?.trim();
      templateProps[`property_${key}`] = {
        key,
        value,
        type: xsiType,
        description: [desc, units ? `単位: ${units}` : undefined].filter(Boolean).join(' / ') || key,
      };
    });

    return { basicInfo, templateProps };
  }, []);

  // ノードクリックハンドラ
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('👆 [PetriNetViewer] ノードクリック:', node.id, node.data?.nodeType);

    setSelectedNodeId(node.id);
    setSelectedNode(node);

    // Placeノードの場合、プロパティダイアログを表示
    if (node.data?.nodeType === 'place') {
      console.log('🔍 [PetriNetViewer] Placeノード処理開始');

      // ✅ Fix6: templateMap からテンプレート要素を取得して詳細プロパティを抽出
      const tmplEntry = templateMap[node.id];
      let basicProperties: Record<string, PropertyObject>;
      let templateProperties: Record<string, PropertyObject>;

      if (tmplEntry?.element) {
        const templateType = String(node.data.templateType || 'material');
        const { basicInfo, templateProps } = extractTemplateInfoForNode(tmplEntry.element, templateType);
        basicProperties = basicInfo;
        templateProperties = templateProps;
      } else {
        // templateMap にヒットしない場合は node.data からフォールバック
        basicProperties = {
          id: { key: 'id', value: String(node.id), type: 'string', description: 'ノードID' },
          type: { key: 'type', value: String(node.data.templateType || 'material'), type: 'string', description: 'ノード種別' },
          name: { key: 'name', value: String(node.data.label || node.id), type: 'string', description: 'ノード名' },
          description: { key: 'description', value: String(node.data.description || '説明なし'), type: 'string', description: 'ノード説明' },
        };
        templateProperties = {};
        if (node.data.properties && typeof node.data.properties === 'object') {
          Object.entries(node.data.properties).forEach(([key, value]) => {
            templateProperties[key] = { key, value: value || '値なし', type: 'string', description: key };
          });
        }
      }

      // ✅ Fix8c: データタブ: MAIMLの<data><results>から実験結果値を取得
      // data.results.*.ref はテンプレートIDを指しているため、テンプレートIDを使用する
      const templateType = String(node.data.templateType || 'material').toLowerCase() as 'material' | 'condition' | 'result';
      // templateMap から templateId を取得（templateMap[node.id].element の id 属性）
      const templateIdForData =
        tmplEntry?.element?.getAttribute('id') ??
        String(node.data.templateId || node.data.template?.id || node.id);
      const dataInfo = maimlData
        ? fetchDataInfoFromMaiml(maimlData, templateIdForData, templateType)
        : null;

      const dataProperties: Record<string, PropertyObject> = {};
      if (dataInfo) {
        Object.entries(dataInfo).forEach(([rawKey, val]) => {
          if (rawKey.startsWith('property_')) {
            const propObj = val as DataPropertyObject;
            const displayKey = rawKey.slice('property_'.length);
            // property_* の各フィールドを個別エントリに展開して表示
            if (propObj.value !== undefined) {
              dataProperties[`${rawKey}_value`] = {
                key: `${displayKey} (value)`,
                value: propObj.value,
                type: propObj.xsiType ?? 'string',
                description: propObj.description ?? displayKey,
              };
            }
            if (propObj.xsiType) {
              dataProperties[`${rawKey}_type`] = {
                key: `${displayKey} (type)`,
                value: propObj.xsiType,
                type: 'string',
                description: `${displayKey} の xsi:type`,
              };
            }
            if (propObj.units) {
              dataProperties[`${rawKey}_units`] = {
                key: `${displayKey} (units)`,
                value: propObj.units,
                type: 'string',
                description: `${displayKey} の単位`,
              };
            }
            if (propObj.description) {
              dataProperties[`${rawKey}_desc`] = {
                key: `${displayKey} (description)`,
                value: propObj.description,
                type: 'string',
                description: `${displayKey} の説明`,
              };
            }
          } else {
            dataProperties[rawKey] = {
              key: rawKey,
              value: String(val ?? ''),
              type: 'string',
              description: rawKey,
            };
          }
        });
      } else {
        // data要素が見つからない場合はノード座標のみ
        dataProperties.coordinates = {
          key: 'coordinates',
          value: `(${node.position.x.toFixed(2)}, ${node.position.y.toFixed(2)})`,
          type: 'coordinates',
          description: 'ノード座標',
        };
      }

      console.log('🔍 [PetriNetViewer] プロパティ設定:', {
        basic: Object.keys(basicProperties).length,
        template: Object.keys(templateProperties).length,
        data: Object.keys(dataProperties).length,
        tmplHit: !!tmplEntry?.element,
        dataHit: !!dataInfo,
      });

      setStructuredProperties({
        basic: basicProperties,
        template: templateProperties,
        data: dataProperties,
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
  }, [petriNetStructure, maimlData, templateMap, onOpenSubNetViewer, extractTemplateInfoForNode]);

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
