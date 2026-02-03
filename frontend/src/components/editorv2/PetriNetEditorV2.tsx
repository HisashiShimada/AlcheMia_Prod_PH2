/**
 * PetriNetEditorV2 - PetriNet編集メインコンポーネント
 * 
 * Material-UI → Ant Design変換版
 * Phase 9: カスタムフック統合版
 * 
 * @version 2.0.0 (Phase 9)
 * @date 2026-01-29
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Layout, message } from 'antd';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

// カスタムフック
import {
  useWorkflow,
  useHistory,
  useDraftManager,
  useNamespaceOperations,
  type NodeType,
} from './hooks';

// コンポーネント
import {
  EditorToolbar,
  MethodTabPanel,
  PropertyPanel,
  ValidationPanel,
  SaveDialog,
  DocumentEditDialog,
  TemplateEditorDialog,
  ReactFlowCanvas,
} from './components';

const { Content } = Layout;

/**
 * PetriNetEditorV2 Props
 */
export interface PetriNetEditorV2Props {
  projectId: string;
  onClose?: () => void;
  onSave?: (data: unknown) => void;
}

/**
 * PetriNetEditorV2 - PetriNet編集メインコンポーネント
 * 
 * Phase 9: カスタムフック統合完了版
 * 実際のデータフローを実装
 */
const PetriNetEditorV2: React.FC<PetriNetEditorV2Props> = ({
  projectId,
  onClose,
  onSave,
}) => {
  // ========================
  // ローカル状態
  // ========================
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  // ダイアログ表示状態
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // ========================
  // カスタムフック統合（Phase 9）
  // ========================
  
  /**
   * 履歴管理フック
   */
  const history = useHistory({ nodes: [], edges: [] });
  
  /**
   * 履歴追加のアダプター関数
   */
  const addToHistory = useCallback((action: string, data: unknown) => {
    // EditorStateに変換
    if (data && typeof data === 'object' && 'nodes' in data && 'edges' in data) {
      const editorState = data as { nodes: Node[]; edges: Edge[] };
      history.pushState({
        nodes: editorState.nodes,
        edges: editorState.edges
      });
    }
  }, [history]);
  
  /**
   * ワークフロー管理フック（中核）
   */
  const workflow = useWorkflow({
    projectId,
    addToHistory
  });
  
  /**
   * Draft管理フック
   */
  const draftManager = useDraftManager(
    {
      fileName: `project_${projectId}.maiml`,
      nodes: workflow.nodes,
      edges: workflow.edges,
      templates: workflow.templates as unknown as Record<string, unknown>
    },
    {
      userId: 'current-user', // TODO: 実際のユーザーIDに置き換え
      autoSaveInterval: 30000, // 30秒
      autoSaveGenerations: 3,
      onAutoSaveSuccess: (result) => {
        console.log('✅ [PetriNetEditorV2] 自動保存成功:', result.draft_key);
      },
      onAutoSaveError: (error) => {
        console.error('❌ [PetriNetEditorV2] 自動保存エラー:', error);
        message.error('自動保存に失敗しました');
      }
    }
  );
  
  /**
   * 名前空間操作フック
   */
  const namespaceOps = useNamespaceOperations();

  // ========================
  // メモ化された値
  // ========================
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return workflow.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, workflow.nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return workflow.edges.find(e => e.id === selectedEdgeId) || null;
  }, [selectedEdgeId, workflow.edges]);

  // ========================
  // イベントハンドラ
  // ========================
  
  /**
   * 保存処理
   */
  const handleSave = useCallback(async () => {
    try {
      console.log('💾 [PetriNetEditorV2] 保存開始');
      
      // MaiMLエクスポート
      const maimlContent = workflow.exportToMaiml();
      
      // TODO: Phase 10でAPI保存を実装
      console.log('✅ [PetriNetEditorV2] MaiMLエクスポート完了');
      
      message.success('保存しました');
      setShowSaveDialog(false);
      
      if (onSave) {
        onSave({
          maimlContent,
          nodes: workflow.nodes,
          edges: workflow.edges,
          templates: workflow.templates
        });
      }
    } catch (error) {
      message.error('保存に失敗しました');
      console.error('❌ [PetriNetEditorV2] 保存エラー:', error);
    }
  }, [workflow, onSave]);

  /**
   * バリデーション実行
   */
  const handleValidate = useCallback(() => {
    // TODO: Phase 10でバリデーション実装
    console.log('🔍 [PetriNetEditorV2] バリデーション実行');
    message.info('バリデーションを実行しました');
  }, []);

  /**
   * ノード選択ハンドラ
   */
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }, []);

  /**
   * エッジ選択ハンドラ
   */
  const handleEdgeSelect = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
  }, []);

  /**
   * ノード変更ハンドラ（ReactFlow）
   */
  const handleNodesChange = useCallback((changes: any) => {
    // ドラッグによる位置変更を反映
    workflow.updateNodesFromChanges(changes);
  }, [workflow]);

  /**
   * エッジ変更ハンドラ（ReactFlow）
   */
  const handleEdgesChange = useCallback((changes: any) => {
    // エッジの削除などを反映
    workflow.updateEdgesFromChanges(changes);
  }, [workflow]);

  /**
   * コネクション作成ハンドラ（ReactFlow）
   */
  const handleConnect = useCallback((connection: any) => {
    workflow.addEdge(connection);
    message.success('エッジを追加しました');
  }, [workflow]);

  /**
   * メソッド切り替えハンドラ
   */
  const handleMethodChange = useCallback((methodIndex: number) => {
    workflow.setActiveMethodIndex(methodIndex);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [workflow]);

  /**
   * テンプレート編集ダイアログ表示
   */
  const handleOpenTemplateDialog = useCallback(() => {
    if (!selectedNode) {
      message.warning('ノードを選択してください');
      return;
    }
    setShowTemplateDialog(true);
  }, [selectedNode]);

  /**
   * ドキュメント編集ダイアログ表示
   */
  const handleOpenDocumentDialog = useCallback(() => {
    if (!selectedNode && !selectedEdge) {
      message.warning('ノードまたはエッジを選択してください');
      return;
    }
    setShowDocumentDialog(true);
  }, [selectedNode, selectedEdge]);

  // ========================
  // レンダリング
  // ========================
  return (
    <ReactFlowProvider>
      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* ツールバー */}
        <EditorToolbar
          onAddNode={(nodeType) => {
            // NodeTypeに変換
            const fullNodeType = `${nodeType}Place` as NodeType;
            workflow.addNode(fullNodeType, { x: 100, y: 100 });
            message.success(`ノード追加: ${nodeType}`);
          }}
          onUndo={() => {
            history.undo();
            message.info('元に戻しました');
          }}
          onRedo={() => {
            history.redo();
            message.info('やり直しました');
          }}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onSave={() => setShowSaveDialog(true)}
          canSave={workflow.nodes.length > 0}
          onEditDocument={handleOpenDocumentDialog}
          onValidate={handleValidate}
          isValidating={false}
          onAddWorkflow={() => {
            // TODO: Phase 10でワークフロー追加ダイアログ表示
            message.info('ワークフロー追加機能（Phase 10実装予定）');
          }}
          workflowModeActive={false}
        />

        {/* メインコンテンツ */}
        <Content style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* メソッドタブパネル */}
            <MethodTabPanel
              methods={workflow.methods.map(m => ({
                methodId: m.methodId,
                nodes: m.nodes,
                edges: m.edges
              }))}
              activeMethodIndex={workflow.activeMethodIndex}
              onChange={handleMethodChange}
            />

            {/* ReactFlowキャンバス */}
            <div style={{ flex: 1, background: '#fafafa' }}>
              <ReactFlowCanvas
                nodes={workflow.nodes}
                edges={workflow.edges}
                onNodeClick={handleNodeSelect}
                onEdgeClick={handleEdgeSelect}
                onCanvasClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
              />
            </div>
          </div>

          {/* 右サイドパネル */}
          <div style={{ 
            width: 400, 
            borderLeft: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* プロパティパネル */}
            <div style={{ flex: 1, overflow: 'auto', borderBottom: '1px solid #f0f0f0' }}>
              <PropertyPanel
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onOpenTemplateEditor={handleOpenTemplateDialog}
                onUpdate={(nodeId, updates) => {
                  workflow.updateNode(nodeId, updates);
                  message.success('更新しました');
                }}
                onClose={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                onDelete={() => {
                  if (selectedNodeId) {
                    workflow.deleteNode(selectedNodeId);
                    setSelectedNodeId(null);
                    message.success('削除しました');
                  } else if (selectedEdgeId) {
                    workflow.deleteEdge(selectedEdgeId);
                    setSelectedEdgeId(null);
                    message.success('削除しました');
                  }
                }}
                nodes={workflow.nodes}
                edges={workflow.edges}
                methods={workflow.methods.map(m => ({
                  methodId: m.methodId,
                  nodes: m.nodes,
                  edges: m.edges
                }))}
                activeMethodIndex={workflow.activeMethodIndex}
              />
            </div>

            {/* バリデーションパネル */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ValidationPanel
                validationResult={{
                  isValid: true,
                  errors: [],
                  warnings: []
                }}
                show={true}
                onClose={() => {}}
              />
            </div>
          </div>
        </Content>

        {/* 保存ダイアログ */}
        <SaveDialog
          open={showSaveDialog}
          onSave={handleSave}
          onClose={() => setShowSaveDialog(false)}
        />

        {/* ドキュメント編集ダイアログ */}
        <DocumentEditDialog
          open={showDocumentDialog}
          onClose={() => setShowDocumentDialog(false)}
          onSave={(data) => {
            // TODO: Phase 8-4で実装
            console.log('Document saved:', data);
            setShowDocumentDialog(false);
          }}
        />

        {/* テンプレート編集ダイアログ */}
        {selectedNode && (
          <TemplateEditorDialog
            open={showTemplateDialog}
            node={selectedNode}
            onClose={() => setShowTemplateDialog(false)}
            onSave={(nodeId, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId) => {
              // TODO: Phase 10でテンプレート保存実装
              console.log('✅ [PetriNetEditorV2] Template saved:', nodeId, templateRef);
              setShowTemplateDialog(false);
              message.success('テンプレートを保存しました');
            }}
            allNodes={workflow.nodes}
            templateErrors={{}}
          />
        )}
      </Layout>
    </ReactFlowProvider>
  );
};

export default PetriNetEditorV2;