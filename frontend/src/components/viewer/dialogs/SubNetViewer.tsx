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

// データタブ用ユーティリティ
import { fetchDataInfoFromMaiml, DataPropertyObject } from '../../../utils/maimlDataExtractor';

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
  // 複数method対応（Reference版から追加）
  arcsData?: Array<{
    id: string;
    source: string;
    target: string;
  }> | null;
  placesData?: Array<{
    id: string;
    data: {
      label?: string;
      stereotype?: string;
      template?: { id: string };
      templateId?: string;
    };
  }> | null;
  multiMethodMode?: boolean;
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
  arcsData = null,
  placesData = null,
  multiMethodMode = false,
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


  /**
   * ✅ Fix3: テンプレート要素から基本情報とプロパティを抽出する関数
   * reference版 PropertyViewer.js の fetchTemplateInfo() 相当の実装
   * - uuid/description/insertion → basicInfo へ
   * - placeRef → 除外（テンプレートタブに混入させない）
   * - property 要素 → key + value + description + content で構造化
   */
  const extractTemplateInfo = useCallback((templateElement: Element | null, templateType: string): {
    basicInfo: Record<string, string>;
    templateProps: Record<string, { key: string; value?: string; description?: string; xsiType?: string; units?: string; content?: Record<string, string> }>;
  } => {
    if (!templateElement) {
      console.error('❌ [SubNetViewer] テンプレート要素がありません');
      return { basicInfo: { id: 'unknown', type: templateType, name: '不明' }, templateProps: {} };
    }

    // ※ xmlns 付き XML は querySelector(':scope > tag') がヒットしないため
    //   getElementsByTagName でダイレクトチルドレンを取得するヘルパーを使用する
    const directChild = (parent: Element, tagName: string): Element | null => {
      const children = parent.getElementsByTagName(tagName);
      for (let i = 0; i < children.length; i++) {
        if (children[i].parentElement === parent) return children[i];
      }
      return null;
    };
    const directChildren = (parent: Element, tagName: string): Element[] => {
      const result: Element[] = [];
      const children = parent.getElementsByTagName(tagName);
      for (let i = 0; i < children.length; i++) {
        if (children[i].parentElement === parent) result.push(children[i]);
      }
      return result;
    };

    // --- 基本情報 ---
    const basicInfo: Record<string, string> = {
      id: templateElement.getAttribute('id') || '',
      type: templateType.charAt(0).toUpperCase() + templateType.slice(1),
      name: templateElement.getAttribute('name') || '名称未設定',
    };

    // uuid 子要素
    const uuidEl = directChild(templateElement, 'uuid');
    if (uuidEl?.textContent?.trim()) {
      basicInfo.uuid = uuidEl.textContent.trim();
    }

    // description 子要素
    const descEl = directChild(templateElement, 'description');
    if (descEl?.textContent?.trim()) {
      basicInfo.description = descEl.textContent.trim();
    }

    // annotation 子要素
    const annotationEl = directChild(templateElement, 'annotation');
    if (annotationEl?.textContent?.trim()) {
      basicInfo.annotation = annotationEl.textContent.trim();
    }

    // insertion 子要素
    const insertionEl = directChild(templateElement, 'insertion');
    if (insertionEl) {
      const uri = directChild(insertionEl, 'uri')?.textContent?.trim();
      const hash = directChild(insertionEl, 'hash')?.textContent?.trim();
      const format = directChild(insertionEl, 'format')?.textContent?.trim();
      if (uri) basicInfo.insertion_uri = uri;
      if (hash) basicInfo.insertion_hash = hash;
      if (format) basicInfo.insertion_format = format;
    }

    // placeRef → 基本情報タブには表示しない（内部参照のため）

    // --- テンプレートプロパティ（property 要素のみ） ---
    const templateProps: Record<string, { key: string; value?: string; description?: string; xsiType?: string; units?: string; content?: Record<string, string> }> = {};
    const propElements = directChildren(templateElement, 'property');

    propElements.forEach((prop) => {
      const key = prop.getAttribute('key');
      if (!key) return;

      const propObj: { key: string; value?: string; description?: string; xsiType?: string; units?: string; content?: Record<string, string> } = { key };

      // xsi:type 属性
      const xsiType = prop.getAttribute('xsi:type') || prop.getAttribute('type');
      if (xsiType) propObj.xsiType = xsiType;

      // units 属性
      const units = prop.getAttribute('units');
      if (units) propObj.units = units;

      // value 子要素
      const valueEl = directChild(prop, 'value');
      if (valueEl) propObj.value = valueEl.textContent?.trim();

      // description 子要素
      const propDescEl = directChild(prop, 'description');
      if (propDescEl) propObj.description = propDescEl.textContent?.trim();

      // content 子要素
      const contentEl = directChild(prop, 'content');
      if (contentEl) {
        const contentObj: Record<string, string> = {};
        for (let k = 0; k < contentEl.attributes.length; k++) {
          const attr = contentEl.attributes[k];
          contentObj[attr.name] = attr.value;
        }
        const contentText = contentEl.textContent?.trim();
        if (contentText) contentObj.value = contentText;
        propObj.content = contentObj;
      }

      templateProps[`property_${key}`] = propObj;
    });

    console.log(`✅ [SubNetViewer] extractTemplateInfo 完了:`, {
      basicInfoKeys: Object.keys(basicInfo),
      templatePropsCount: Object.keys(templateProps).length,
    });

    return { basicInfo, templateProps };
  }, []);

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
        
        // 複数method対応: arcsDataとplacesDataが渡された場合はそれを使用（Reference版ロジック）
        let currentArcs = petriNetData.arcs;
        let currentPlaces = petriNetData.places;
        
        if (multiMethodMode && arcsData && placesData) {
          console.log(`🎯 [SubNetViewer] 渡されたデータを使用（複数methodモード）`);
          currentArcs = arcsData;
          currentPlaces = placesData;
        }
        
        // トランジションに接続されたアークをフィルタリング
        const transitionArcs = currentArcs.filter((arc) => 
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
        
        // placesデータを使用（currentPlaces を使用: multiMethodMode時は arcsData/placesData を優先）
        const relatedPlaces: PlaceInfo[] = currentPlaces
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
            
            // templateMapから取得
            // buildTemplateMap() のキーは placeId（placeRef.ref の値）なので、place.id で優先アクセス
            let templateInfo: TemplateInfo | null = null;

            // ① placeId で検索（優先）
            if (templateMap[place.id]?.element) {
              templateInfo = {
                id: place.id,
                name: place.data.label || place.id,
                type: templateType,
                element: templateMap[place.id].element,
                properties: [],
              };
              console.log(`✅ [SubNetViewer] Place ${place.id} templateMap取得: placeIdキーでヒット`);
            }

            // ② templateId で検索（フォールバック）
            if (!templateInfo) {
              const templateId = place.data.template?.id || place.data.templateId;
              if (templateId && templateMap[templateId]?.element) {
                templateInfo = {
                  id: templateId,
                  name: place.data.label || templateId,
                  type: templateType,
                  element: templateMap[templateId].element,
                  properties: [],
                };
                console.log(`✅ [SubNetViewer] Place ${place.id} templateMap取得: templateIdキーでヒット (${templateId})`);
              }
            }

            if (!templateInfo) {
              console.warn(`⚠️ [SubNetViewer] Place ${place.id} templateMapエントリなし`, {
                placeId: place.id,
                templateId: place.data.template?.id || place.data.templateId,
                templateMapKeys: Object.keys(templateMap).slice(0, 5),
              });
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
  }, [maimlData, nodeName, templateMap, petriNetData, setNodes, setEdges, open, multiMethodMode, arcsData, placesData]);

  // ✅ Fix3: ノードクリックハンドラー（新しい extractTemplateInfo を使用）
  const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
    console.log('👆 [SubNetViewer] ノードクリック:', node.id, node.data.nodeType);
    
    setSelectedNodeId(node.id);
    setSelectedNode(node);

    // PlaceノードかつTemplateの場合: extractTemplateInfo を使用（reference版 fetchTemplateInfo 相当）
    if (node.data.nodeType === 'place' && node.data.isTemplate && node.data.template) {
      const { basicInfo, templateProps } = extractTemplateInfo(
        node.data.template.element,
        node.data.templateType as string
      );

      // 基本情報タブ: uuid/description/insertion/placeRefs を含む
      const basicProperties: Record<string, PropertyObject> = {};
      Object.entries(basicInfo).forEach(([key, value]) => {
        basicProperties[key] = { key, value, type: 'string', description: key };
      });

      // テンプレートタブ: property 要素のみ（placeRef は除外済み）
      const templateProperties: Record<string, PropertyObject> = {};
      Object.entries(templateProps).forEach(([propKey, propObj]) => {
        // PropertyViewer.tsx の template タブ描画に合わせて詰める
        templateProperties[propKey] = {
          key: propObj.key,
          value: propObj.value ?? '',
          type: propObj.xsiType ?? 'string',
          description: [
            propObj.description,
            propObj.units ? `単位: ${propObj.units}` : undefined,
          ].filter(Boolean).join(' / ') || propObj.key,
        };
      });

      // ✅ Fix8b: データタブ: MAIMLの<data><results>から実験結果値を取得
      // data.results.*.ref はテンプレートIDを指しているため、テンプレートIDを使用する
      const templateIdForData = (node.data.template?.element as Element | undefined)?.getAttribute('id') ?? node.id;
      const dataInfo = fetchDataInfoFromMaiml(
        maimlData,
        templateIdForData,
        (node.data.templateType as string).toLowerCase() as 'material' | 'condition' | 'result'
      );
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
          }

      setStructuredProperties({
        basic: basicProperties,
        template: templateProperties,
        data: dataProperties,
      });
    }
    // Transitionノードの場合
    else if (node.data.nodeType === 'transition') {
      const basicProperties: Record<string, PropertyObject> = {
        id: { key: 'id', value: String(node.id), type: 'string', description: 'トランジションID' },
        type: { key: 'type', value: 'Transition', type: 'string', description: 'ノード種別' },
        name: { key: 'name', value: String(node.data.label || node.id), type: 'string', description: 'トランジション名' },
      };

      setStructuredProperties({
        basic: basicProperties,
        template: {},
        data: {},
      });
    }
    // その他のノード
    else {
      const basicProperties: Record<string, PropertyObject> = {
        id: { key: 'id', value: String(node.id), type: 'string', description: 'ノードID' },
        type: { key: 'type', value: String(node.data.templateType || node.data.nodeType || 'place'), type: 'string', description: 'ノード種別' },
        name: { key: 'name', value: String(node.data.label || node.id), type: 'string', description: 'ノード名' },
      };

      setStructuredProperties({
        basic: basicProperties,
        template: {},
        data: {},
      });
    }
    
    // 右ペインを開く
    setRightPanelOpen(true);
  }, [extractTemplateInfo]);

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
            <Alert title={error} type="error" showIcon />
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
