// frontend/src/components/viewer/PetriNetEditor.tsx
// PetriNetEditorコンポーネント（Ant Design v6版 - 完全版）

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, Button, Space, Typography, Alert, Flex, message, Modal, Input, Drawer } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

// カスタムノードコンポーネント
import MaterialTemplateNode from './nodes/MaterialTemplateNode';
import ConditionTemplateNode from './nodes/ConditionTemplateNode';
import ResultTemplateNode from './nodes/ResultTemplateNode';
import TransitionNode from './nodes/TransitionNode';

// ユーティリティ
import { parseMaimlToPetriNet } from './utils/maimlParser';
import { convertToReactFlow } from './utils/reactFlowConverter';
import { generateMaimlXml, validatePetriNet, DocumentInfo } from './utils/maimlGenerator';

// ダイアログ
import DocumentEditDialog from './dialogs/DocumentEditDialog';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PetriNetEditorProps {
  editingFileName?: string;
  initialMaiMLData?: string | null;
  onExitEdit?: () => void;
}

// カスタムノードタイプの定義
const nodeTypes = {
  materialTemplate: MaterialTemplateNode,
  conditionTemplate: ConditionTemplateNode,
  resultTemplate: ResultTemplateNode,
  transition: TransitionNode,
};

/**
 * 履歴管理用の状態
 */
interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

/**
 * PetriNetEditor Inner コンポーネント
 */
const PetriNetEditorInner: React.FC<PetriNetEditorProps> = ({
  editingFileName,
  initialMaiMLData,
  onExitEdit,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  
  // Undo/Redo履歴
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Document情報
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo>({
    name: editingFileName?.replace('.maiml', '') || 'Untitled',
    description: '',
  });
  
  // UI状態
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [draftListOpen, setDraftListOpen] = useState(false);

  // 初期データ読み込み
  useEffect(() => {
    if (initialMaiMLData) {
      try {
        const structure = parseMaimlToPetriNet(initialMaiMLData);
        const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(structure);
        
        setNodes(flowNodes);
        setEdges(flowEdges);
        
        // 履歴更新は次のレンダリング後に実行
        setTimeout(() => {
          setHistory([{ nodes: flowNodes, edges: flowEdges }]);
          setHistoryIndex(0);
        }, 0);
        
        console.log('✅ [PetriNetEditor] MAIML読み込み完了:', {
          nodes: flowNodes.length,
          edges: flowEdges.length,
        });
      } catch (err) {
        console.error('❌ [PetriNetEditor] MAIML読み込みエラー:', err);
        message.error('MAIMLファイルの読み込みに失敗しました');
      }
    }
  }, [initialMaiMLData, setNodes, setEdges]);

  // 履歴に追加
  const pushHistory = useCallback((newState: HistoryState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      // 履歴は最大50件
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setNodes(state.nodes);
      setEdges(state.edges);
      setHistoryIndex(newIndex);
      console.log('↩️ [PetriNetEditor] Undo:', newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setNodes(state.nodes);
      setEdges(state.edges);
      setHistoryIndex(newIndex);
      console.log('↪️ [PetriNetEditor] Redo:', newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // ノード追加
  const handleAddNode = useCallback((nodeType: 'material' | 'condition' | 'result' | 'transition') => {
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType === 'transition' ? 'transition' : `${nodeType}Template`,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: {
        label: `New ${nodeType}`,
        nodeType: nodeType === 'transition' ? 'transition' : 'place',
        templateType: nodeType === 'transition' ? undefined : nodeType,
        description: '',
      },
    };

    setNodes(nds => {
      const newNodes = [...nds, newNode];
      pushHistory({ nodes: newNodes, edges });
      return newNodes;
    });
    
    message.success(`${nodeType}ノードを追加しました`);
  }, [setNodes, edges, pushHistory]);

  // エッジ接続
  const handleConnect = useCallback((connection: Connection) => {
    setEdges(eds => {
      const newEdges = addEdge({
        ...connection,
        type: 'smoothstep',
        animated: false,
        style: { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
      }, eds);
      pushHistory({ nodes, edges: newEdges });
      return newEdges;
    });
    
    message.success('エッジを接続しました');
  }, [setEdges, nodes, pushHistory]);

  // ノード削除
  const handleNodesDelete = useCallback((deletedNodes: Node[]) => {
    const deletedIds = deletedNodes.map(n => n.id);
    
    setNodes(nds => {
      const newNodes = nds.filter(n => !deletedIds.includes(n.id));
      pushHistory({ nodes: newNodes, edges });
      return newNodes;
    });
    
    setEdges(eds => {
      return eds.filter(e => 
        !deletedIds.includes(e.source) && 
        !deletedIds.includes(e.target)
      );
    });
    
    message.success('ノードを削除しました');
  }, [setNodes, setEdges, edges, pushHistory]);

  // エッジ削除
  const handleEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    const deletedIds = deletedEdges.map(e => e.id);
    
    setEdges(eds => {
      const newEdges = eds.filter(e => !deletedIds.includes(e.id));
      pushHistory({ nodes, edges: newEdges });
      return newEdges;
    });
    
    message.success('エッジを削除しました');
  }, [setEdges, nodes, pushHistory]);

  // ノード選択
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setPropertyDrawerOpen(true);
  }, []);

  // エッジ選択
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setPropertyDrawerOpen(true);
  }, []);

  // プロパティ更新
  const handleUpdateNodeProperty = useCallback((property: string, value: string) => {
    if (!selectedNode) return;
    
    setNodes(nds => {
      const newNodes = nds.map(node => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              [property]: value,
            },
          };
        }
        return node;
      });
      pushHistory({ nodes: newNodes, edges });
      
      // 選択ノードも更新
      const updated = newNodes.find(n => n.id === selectedNode.id);
      if (updated) {
        setSelectedNode(updated);
      }
      
      return newNodes;
    });
  }, [selectedNode, setNodes, edges, pushHistory]);

  // 保存
  const handleSave = useCallback(async () => {
    try {
      // バリデーション
      const validation = validatePetriNet(nodes, edges);
      
      if (!validation.valid) {
        Modal.error({
          title: 'バリデーションエラー',
          content: (
            <div>
              {validation.errors.map((err, idx) => (
                <p key={idx}>• {err}</p>
              ))}
            </div>
          ),
        });
        return;
      }
      
      // 警告がある場合は表示
      if (validation.warnings.length > 0) {
        const proceed = await new Promise<boolean>((resolve) => {
          Modal.warning({
            title: '警告',
            content: (
              <div>
                {validation.warnings.map((warn, idx) => (
                  <p key={idx}>• {warn}</p>
                ))}
                <p style={{ marginTop: 16 }}>保存を続行しますか？</p>
              </div>
            ),
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
            okText: '保存',
            cancelText: 'キャンセル',
          });
        });
        
        if (!proceed) return;
      }
      
      // MAIML生成
      const maimlXml = generateMaimlXml(nodes, edges, documentInfo);
      
      // ローカルダウンロード
      const blob = new Blob([maimlXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentInfo.name}.maiml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success(`${documentInfo.name}.maimlをダウンロードしました`);
      setSaveDialogOpen(false);
      
    } catch (err) {
      console.error('❌ [PetriNetEditor] 保存エラー:', err);
      message.error('保存に失敗しました');
    }
  }, [nodes, edges, documentInfo]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Flex justify="space-between" align="center">
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              ペトリネットエディタ
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {documentInfo.name}
            </Text>
          </Space>

          <Space>
            {/* ノード追加ボタン */}
            <Button.Group>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => handleAddNode('material')}
              >
                Material
              </Button>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => handleAddNode('condition')}
              >
                Condition
              </Button>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => handleAddNode('result')}
              >
                Result
              </Button>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => handleAddNode('transition')}
              >
                Transition
              </Button>
            </Button.Group>

            {/* Undo/Redo */}
            <Button.Group>
              <Button 
                size="small" 
                icon={<UndoOutlined />}
                onClick={handleUndo}
                disabled={!canUndo}
              >
                Undo
              </Button>
              <Button 
                size="small" 
                icon={<RedoOutlined />}
                onClick={handleRedo}
                disabled={!canRedo}
              >
                Redo
              </Button>
            </Button.Group>

            {/* Document編集 */}
            <Button 
              size="small" 
              icon={<SettingOutlined />}
              onClick={() => setDocumentDialogOpen(true)}
            >
              Document
            </Button>

            {/* 保存 */}
            <Button 
              type="primary" 
              size="small" 
              icon={<SaveOutlined />}
              onClick={() => setSaveDialogOpen(true)}
              disabled={nodes.length === 0}
            >
              ローカル保存
            </Button>
            
            {/* Draft保存（モック） */}
            <Button 
              size="small" 
              icon={<FileTextOutlined />}
              onClick={() => {
                Modal.info({
                  title: 'Draft保存機能',
                  content: 'Draft保存機能は未実装です。LocalStorageを使用した保存機能を後日実装予定です。',
                });
              }}
              disabled={nodes.length === 0}
            >
              Draft保存
            </Button>
            
            {/* S3保存（モック） */}
            <Button 
              size="small" 
              icon={<SaveOutlined />}
              onClick={() => {
                Modal.info({
                  title: 'S3保存機能',
                  content: 'S3への保存機能は未実装です。API連携が必要です。',
                });
              }}
              disabled={nodes.length === 0}
            >
              S3保存
            </Button>

            {/* 終了 */}
            {onExitEdit && (
              <Button size="small" onClick={onExitEdit}>
                終了
              </Button>
            )}
          </Space>
        </Flex>
      </Card>

      {/* React Flow */}
      <Card style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onConnect={handleConnect}
            onNodesDelete={handleNodesDelete}
            onEdgesDelete={handleEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={true}
            nodesConnectable={true}
            nodesFocusable={true}
            elementsSelectable={true}
            deleteKeyCode="Delete"
            minZoom={0.1}
            maxZoom={4}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap style={{ height: 120, width: 200 }} />
          </ReactFlow>
        </div>
      </Card>

      {/* プロパティDrawer */}
      <Drawer
        title={selectedNode ? "ノードプロパティ" : "エッジプロパティ"}
        placement="right"
        onClose={() => setPropertyDrawerOpen(false)}
        open={propertyDrawerOpen}
        width={400}
      >
        {selectedNode && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong>ラベル</Text>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdateNodeProperty('label', e.target.value)}
                placeholder="ノード名を入力"
              />
            </div>
            <div>
              <Text strong>説明</Text>
              <TextArea
                value={selectedNode.data.description || ''}
                onChange={(e) => handleUpdateNodeProperty('description', e.target.value)}
                placeholder="説明を入力"
                rows={4}
              />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ID: {selectedNode.id}
              </Text>
            </div>
          </Space>
        )}
        {selectedEdge && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Source: {selectedEdge.source}</Text>
            <Text>Target: {selectedEdge.target}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {selectedEdge.id}
            </Text>
          </Space>
        )}
      </Drawer>

      {/* Document編集ダイアログ */}
      <DocumentEditDialog
        open={documentDialogOpen}
        documentData={documentInfo}
        onClose={() => setDocumentDialogOpen(false)}
        onSave={(data) => {
          setDocumentInfo(data);
          setDocumentDialogOpen(false);
          message.success('Document情報を更新しました');
        }}
      />

      {/* 保存ダイアログ */}
      <Modal
        title="保存"
        open={saveDialogOpen}
        onOk={handleSave}
        onCancel={() => setSaveDialogOpen(false)}
        okText="ダウンロード"
        cancelText="キャンセル"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>ファイル名</Text>
            <Input
              value={documentInfo.name}
              onChange={(e) => setDocumentInfo({ ...documentInfo, name: e.target.value })}
              placeholder="ファイル名を入力"
              suffix=".maiml"
            />
          </div>
          <div>
            <Text strong>説明（オプション）</Text>
            <TextArea
              value={documentInfo.description}
              onChange={(e) => setDocumentInfo({ ...documentInfo, description: e.target.value })}
              placeholder="説明を入力"
              rows={3}
            />
          </div>
          <Alert
            message="情報"
            description={`ノード: ${nodes.length}, エッジ: ${edges.length}`}
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
};

/**
 * PetriNetEditor メインコンポーネント
 */
const PetriNetEditor: React.FC<PetriNetEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <PetriNetEditorInner {...props} />
    </ReactFlowProvider>
  );
};

export default PetriNetEditor;
