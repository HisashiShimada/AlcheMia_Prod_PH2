/**
 * PetriNetEditorInner - メインコンポーネント
 * 
 * React Flowを使用したペトリネット表示・編集コンポーネント
 * Phase 2: 読み取り専用ビューア（編集機能なし）
 * 
 * @version 2.0.0-beta
 * @date 2025-10-30
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type SelectionMode,
  type BackgroundVariant,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import { Flex, Spin, Alert, Typography, Space, theme } from 'antd';
import { TemplateProvider, useTemplates } from '../../contexts/TemplateContext';
import { AttributeDisplayProvider } from '../../contexts/AttributeDisplayContext';
import TemplateList from './components/TemplateViewer/TemplateList';
import EditorToolbar from './components/EditorToolbar';
import MethodTabPanel from './components/MethodTabPanel';
import PropertyPanel from './components/PropertyPanel';
import TemplateEditorDialog from './components/TemplateEditorDialog';
import DocumentEditDialog from './components/DocumentEditDialog';
import WorkflowSelectorDialog from './components/WorkflowSelectorDialog';
import useHistory from './hooks/useHistory';
import { useWorkflow } from './hooks/useWorkflow';
import { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';
import useDraftManager from './hooks/useDraftManager';
import DraftManager from './components/DraftManager';
import SaveConfirmDialog from './components/SaveConfirmDialog';
import ValidationPanel from './components/ValidationPanel';
import XMLViewerWrapper from './components/XMLViewerWrapper';
import { convertReactFlowToMaiML } from './utils/converters/reactFlowToMaiml';
import { convertMultipleMethodsToMaiML } from './utils/converters/multiMethodConverter';
// Viewer用ノードをインポート（既存の正しいノード描画）
import MaterialTemplateNode from '../nodes/MaterialTemplateNode';
import ConditionTemplateNode from '../nodes/ConditionTemplateNode';
import ResultTemplateNode from '../nodes/ResultTemplateNode';
import TransitionNode from '../nodes/TransitionNode';
import { buildTemplateMap } from '../../utils/petriNetExtractor';
import { convertToReactFlowFormat } from '../../utils/reactFlowConverter';
import { addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
// Phase 2: maimlParserTyped導入
import { MaimlParserTyped } from '../../utils/maimlParserTyped';
import type { Template, PlaceRef as XsdPlaceRef, Method, Property, Document as MaimlDocument } from '../../types/maiml-unified';
// Owner初期値生成用
import { generateInitialDocumentData, generateInitialMethod } from '../../utils/documentInitializer';
// 型定義をインポート
import type {
  NodeData,
  EdgeData,
  DocumentData,
  MethodData,
  FileInfo,
  ClipboardData,
  NodeType,
  Draft, 
  EditState
} from '../../types/editor';
import type { NodeTypes } from 'reactflow';

// ===== Phase 8: 分離したモジュールをインポート =====
// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditorActions } from './hooks/useEditorActions';
import type { TemplatesByCategory } from '@/types/editor';
import * as maimlService from '../../services/maimlApiService';
import { AnalysisResult, ErrorContent } from '@/types/maimlValidation';
import type { StorageFile } from '@/types/storage';
// ✅ window.cline* の型定義
declare global {
  interface Window {
    clineAddTemplate: (templateData: { category: 'material' | 'condition' | 'result'; template: Template }) => void;
    clineDeleteTemplate: (templateId: string) => void;
    clineUpdateTemplate: (templateId: string, updatedTemplate: Template) => void;
    clineAllTemplates: TemplatesByCategory;
  }
}

// ===== ユーティリティ関数 =====
/**
 * unknown型のエラーからメッセージを安全に抽出
 */
const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '不明なエラーが発生しました';
};

// 動的インポート（循環依存回避）- 一時的に無効化
// const TemplateListView = lazy(() => import('./components/TemplateListView'));

// 内部コンポーネント
const PetriNetEditorContent = ({ maimlData, onError, editingFileName, editMode, initialDocumentId, initialDescription, onContentChange, onContentSaved, ...props }: PetriNetEditorInnerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<'select' | 'workflow'>('select');
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node<NodeData>[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [saveConfirmDialogOpen, setSaveConfirmDialogOpen] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<AnalysisResult | null>(null);
  
  // ✅ Phase 9.10 Step7: error型と saveError型をnullで統一
  const [error, setError] = useState<string | null>(null);
  
  // エラーマッピング用に TemplateContext を後で取得するため、
  // ここではContextをラップせずにステートのみ管理
  const [validationPanelOpen, setValidationPanelOpen] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Phase 3 (Error Handling Enhancement): エラー分類
  const [criticalErrors, setCriticalErrors] = useState<ErrorContent[]>([]);
  const [nonCriticalErrors, setNonCriticalErrors] = useState<ErrorContent[]>([]);
  
  // Phase 3: エラー分類ロジック
  useEffect(() => {
    if (validationResult && validationResult.errors) {
      // 致命的エラータイプ（ペトリネット表示不可）
      // missing_required は Document要素の欠落なのでペトリネット表示は可能
      const criticalTypes = ['syntax_error', 'invalid_structure'];
      
      // エラー分類
      const critical = validationResult.errors.filter(err => 
        criticalTypes.includes(err.type)
      );
      
      const nonCritical = validationResult.errors.filter(err => 
        !criticalTypes.includes(err.type)
      );
      
      setCriticalErrors(critical);
      setNonCriticalErrors(nonCritical);
      
      console.log('🔍 [ErrorClassification] エラー分類完了:', {
        critical: critical.length,
        nonCritical: nonCritical.length,
        totalErrors: validationResult.errors.length,
        criticalTypes: critical.map(e => e.type),
        nonCriticalTypes: nonCritical.map(e => e.type),
        allErrorTypes: validationResult.errors.map(e => e.type)
      });
      
      // 🔍 デバッグ: エラーのサンプルを表示
      if (nonCritical.length > 0) {
        console.log('🔍 [ErrorClassification] 非致命的エラーサンプル（最初の3件）:', 
          nonCritical.slice(0, 3).map(e => ({
            type: e.type,
            message: e.message,
            duplicateId: e.duplicateId,
            ref: e.ref,
            paths: e.paths
          }))
        );
      }
    } else {
      // バリデーション結果がない場合はクリア
      setCriticalErrors([]);
      setNonCriticalErrors([]);
    }
  }, [validationResult]);
  
  // Phase 3: エラーからノード/アークIDを抽出（改善版）
  const extractAffectedElements = useCallback((errors: ErrorContent[]) => {
    const nodeErrorMap: Record<string, ErrorContent[]> = {};
    const edgeErrorMap: Record<string, ErrorContent[]> = {};
    const affectedNodeIds = new Set<string>();
    const affectedEdgeIds = new Set<string>();

    errors.forEach((error: ErrorContent) => {
      // duplicate_idエラーの場合
      if (error.type === 'duplicate_id' && error.duplicateId) {
        // pathsからノード/アークを特定
        error.paths?.forEach((path: string) => {
          if (path.includes('place[') || path.includes('transition[')) {
            if (error.duplicateId) {
              affectedNodeIds.add(error.duplicateId);
              if (!nodeErrorMap[error.duplicateId]) nodeErrorMap[error.duplicateId] = [];
              nodeErrorMap[error.duplicateId].push(error);
            }
          } else if (path.includes('arc[')) {
            if (error.duplicateId) {
              affectedEdgeIds.add(error.duplicateId);
              if (!edgeErrorMap[error.duplicateId]) edgeErrorMap[error.duplicateId] = [];
              edgeErrorMap[error.duplicateId].push(error);
            }
          }
        });
      }
      
      // reference_errorの場合
      else if (error.type === 'reference_error' && error.ref) {
        affectedNodeIds.add(error.ref);
        if (!nodeErrorMap[error.ref]) nodeErrorMap[error.ref] = [];
        nodeErrorMap[error.ref].push(error);
      }
      
      // missing_attribute, invalid_valueなどの場合
      else if (error.path) {
        // xpathからID抽出を試みる
        const match = error.path.match(/@id='([^']+)'/);
        if (match) {
          const elementId = match[1];
          
          // pathsまたはxpathから要素タイプを判定
          const isArc = error.path.includes('arc[') || error.paths?.some(p => p.includes('arc['));
          const isPlace = error.path.includes('place[') || error.paths?.some(p => p.includes('place['));
          const isTransition = error.path.includes('transition[') || error.paths?.some(p => p.includes('transition['));
          
          if (isArc) {
            affectedEdgeIds.add(elementId);
            if (!edgeErrorMap[elementId]) edgeErrorMap[elementId] = [];
            edgeErrorMap[elementId].push(error);
          } else if (isPlace || isTransition) {
            affectedNodeIds.add(elementId);
            if (!nodeErrorMap[elementId]) nodeErrorMap[elementId] = [];
            nodeErrorMap[elementId].push(error);
          }
        }
      }
    });
    
    return {
      nodeIds: Array.from(affectedNodeIds),
      edgeIds: Array.from(affectedEdgeIds),
      nodeErrorMap,
      edgeErrorMap
    };
  }, []);
  
  // Phase 3: エラーノード/アークの視覚化
  useEffect(() => {
    if (nonCriticalErrors.length > 0) {
      const { nodeIds, edgeIds } = extractAffectedElements(nonCriticalErrors);
      
      console.log('🎨 [ErrorVisualization] エラー要素抽出:', {
        errorNodes: nodeIds.length,
        errorEdges: edgeIds.length,
        nodeIds,
        edgeIds
      });
      
      // ノードにエラーフラグとclassNameを追加
      setNodes(prevNodes => 
        prevNodes.map(node => {
          const hasError = nodeIds.includes(node.id);
          const nodeErrors = nonCriticalErrors.filter(err => 
            err.duplicateId === node.id || err.ref === node.id
          );
          
          return {
            ...node,
            data: {
              ...node.data,
              hasError: hasError,
              errors: nodeErrors
            },
            className: hasError ? 'error-node' : ''
          };
        })
      );
      
      // エッジにエラーフラグとclassNameを追加
      setEdges(prevEdges =>
        prevEdges.map(edge => {
          const hasError = edgeIds.includes(edge.id);
          const edgeErrors = nonCriticalErrors.filter(err =>
            err.duplicateId === edge.id
          );
          
          return {
            ...edge,
            data: {
              ...edge.data,
              hasError: hasError,
              errors: edgeErrors
            },
            className: hasError ? 'error-edge' : '',
            style: hasError ? {
              ...edge.style,
              stroke: '#f44336',
              strokeWidth: 3
            } : edge.style
          };
        })
      );
      
      console.log('✅ [ErrorVisualization] エラーノード/エッジを視覚化完了');
    } else {
      // エラーがない場合はエラーフラグをクリア
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            hasError: false,
            errors: []
          },
          className: ''
        }))
      );
      
      setEdges(prevEdges =>
        prevEdges.map(edge => ({
          ...edge,
          data: {
            ...edge.data,
            hasError: false,
            errors: []
          },
          className: '',
          style: {
            ...edge.style,
            stroke: '#333',
            strokeWidth: 2
          }
        }))
      );
    }
  }, [nonCriticalErrors, extractAffectedElements, setNodes, setEdges]);
  
  const [templateEditorOpen, setTemplateEditorOpen] = useState<boolean>(false); // Phase 4A: Templateエディタ
  const [templateEditNode, setTemplateEditNode] = useState<Node<NodeData> | null>(null); // Phase 4A: 編集中ノード
  const [documentDialogOpen, setDocumentDialogOpen] = useState<boolean>(false); // Document編集ダイアログ
  const [documentData, setDocumentData] = useState<DocumentData | null>(null); // Document情報
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState<boolean>(false); // ワークフロー選択ダイアログ
  const [availableFiles, setAvailableFiles] = useState<Array<{ key: string; name: string; lastModified?: string; size?: number }>>([]); // 利用可能なファイル一覧
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false); // ファイル読み込み中
  const [pendingClickPosition, setPendingClickPosition] = useState<{ x: number; y: number } | null>(null); // クリック位置保持（将来用）
  const [lastAddedNodeId, setLastAddedNodeId] = useState<string | null>(null); // 最後に追加したノードID（ミニマップ強調用）
  const [draftManagerOpen, setDraftManagerOpen] = useState<boolean>(false); // Draft管理ダイアログ
  const [draftModeHandled, setDraftModeHandled] = useState<boolean>(false); // ✅ UX改善2: draftモード処理済みフラグ
  
  // テンプレート一覧表示機能State（methodsより先に定義）
  const [viewMode, setViewMode] = useState<'petriNet' | 'templates' | 'xml'>('petriNet');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCommonTemplates, setShowCommonTemplates] = useState<boolean>(false); // 共通テンプレート表示フラグ
  const [savedPetriNetViewport, setSavedPetriNetViewport] = useState<{ x: number; y: number; zoom: number } | null>(null); // ペトリネットモードのビューポート保存用
  // templates と templateErrors は TemplateContext から取得
  
  // 複数method管理State
  const [methods, setMethods] = useState<MethodData[]>([]);
  const [activeMethodIndex, setActiveMethodIndex] = useState<number>(0);
  const [multiMethodMode, setMultiMethodMode] = useState<boolean>(false);
  
  const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  
  // ユーザーID取得（localStorageのuserInfoから）
  const currentUserId = React.useMemo(() => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return userInfo.id || 'unknown-user';
    } catch {
      return 'unknown-user';
    }
  }, []);
  
  // Draft管理フック初期化
  const currentEditState : EditState = useMemo(() => ({
    fileName: editingFileName || documentData?.name || 'Untitled',
    nodes: nodes,
    edges: edges,
    templates: [], // 簡易実装（将来的にテンプレート情報を含める）
    documentData: documentData || undefined,
  }), [editingFileName, documentData, nodes, edges]);
  
  const {
    autoSaveEnabled,
    setAutoSaveEnabled,
    lastSavedDraft,
    lastAutoSaveTime, // number | null
    deleteDraft,
    fetchDrafts,
    stopAutoSaveTimer,
    resumeAutoSaveTimer,
  } = useDraftManager(currentEditState, {
    userId: currentUserId,
    autoSaveInterval: 30 * 1000, // 30秒
    projectId: initialDocumentId,
    onAutoSaveSuccess: (draft) => {
      console.log('✅ [PetriNetEditorInner] 自動保存成功:', draft);
    },
    onAutoSaveError: (error) => {
      console.error('❌ [PetriNetEditorInner] 自動保存エラー:', error);
    },
  });

  // ===== セッションハートビートフック =====
  useSessionHeartbeat();

  console.log('🔍 [PetriNetEditorInner] Received editingFileName:', editingFileName);
  
  // Phase 3C: Undo/Redo履歴管理
  const { history, undo, redo, canUndo, canRedo, pushState, reset } = useHistory({
    nodes: [],
    edges: [],
  });
  
  // ワークフロー追加フック
  const { addWorkflow } = useWorkflow({
    addToHistory: (action: string, data: unknown) => {
      // useHistoryのpushStateは{ nodes, edges }形式を期待するため、変換
      if (action === 'addWorkflow' && typeof data === 'object' && data !== null) {
        const workflowData = data as { nodes?: Node<NodeData>[]; edges?: Edge<EdgeData>[] };
        if (workflowData.nodes && workflowData.edges) {
          // ✅ 修正: 既存ノード/エッジ + 追加分を合わせてpushState
          // pushState({ nodes: workflowData.nodes, edges: workflowData.edges }) だと
          // history.present が追加分のみになり、history同期useEffectが既存ノードを上書きしてしまう
          pushState({
            nodes: [...nodes, ...workflowData.nodes],
            edges: [...edges, ...workflowData.edges]
          });
        }
      }
    },
  });
  
  // 初回読み込み済みフラグ（重複実行防止）
  const hasLoadedRef = useRef(false);
  const maimlDataRef = useRef('');
  const isLoadingRef = useRef(false); // 🔧 FIX: ローディング中フラグを追加
  const isFirstNodeRef = useRef(true); // Bug Fix: 初回ノード追加フラグ
  // ✅ Fix: pushStateをsetNodesコールバック外で呼ぶために使用するref
  const updatedNodesRef = useRef<Node<NodeData>[]>([]);

  // Phase 3C: history.presentとの同期
  useEffect(() => {
    if (history.present.nodes && history.present.edges) {
      setNodes(history.present.nodes);
      setEdges(history.present.edges);
      console.log('↻ [PetriNetEditorInner] 履歴から状態復元:', {
        nodesCount: history.present.nodes.length,
        edgesCount: history.present.edges.length,
      });
    }
  }, [history.present, setNodes, setEdges]);

  // ✅ Bug Fix: nodes/edges更新時にmethods配列も自動同期
  useEffect(() => {
    if (methods.length > 0 && activeMethodIndex < methods.length) {
      const currentViewport = getViewport();
      setMethods(prev => {
        const updated = [...prev];
        // 現在のmethodのnodesとedgesを最新の状態に更新
        updated[activeMethodIndex] = {
          ...updated[activeMethodIndex],
          nodes: nodes,
          edges: edges,
          viewport: currentViewport
        };
        return updated;
      });
    }
  }, [nodes, edges]); // nodesとedgesの変更を監視

  // ===== Phase 8 Step 3: エディタアクション統合 =====
  // useEditorActionsフックを使用
  const { handleCopy, handlePaste } = useEditorActions({
    nodes,
    edges,
    selectedNodes,
    clipboard,
    setNodes,
    setEdges,
    setClipboard,
    setSelectedNode,
    setSelectedEdge,
    pushState,
  });

  // ===== Phase 9.1 Step 1: handleOpenSaveConfirmDialog を useKeyboardShortcuts より前に定義 =====
  // Week1: 新保存ダイアログを開く（バリデーション実行）
  const handleOpenSaveConfirmDialog = useCallback(async () => {
    try {
      console.log('🔍 [handleOpenSaveConfirmDialog] バリデーション実行開始');
      console.log('🔍 [handleOpenSaveConfirmDialog] documentData:', documentData);
      console.log('🔍 [handleOpenSaveConfirmDialog] nodes:', nodes.length);
      console.log('🔍 [handleOpenSaveConfirmDialog] edges:', edges.length);
      
      // MaiML生成（ファイル名を正しく設定）
      const metadata = {
        name: documentData?.name || 'document',
        description: documentData?.description || '',
      };
      console.log('🔍 [handleOpenSaveConfirmDialog] metadata:', metadata);
      
      // ✅ TemplateContextからallTemplatesを取得
      const allTemplatesFromContext = window.clineAllTemplates || null;
      
      // ✅ 複数メソッド対応: allMethodsを作成
      const currentViewport = getViewport();
      const updatedMethods = [...methods];
      updatedMethods[activeMethodIndex] = {
        ...updatedMethods[activeMethodIndex],
        nodes: nodes,
        edges: edges,
        viewport: currentViewport
      };
      
      let maimlXml;
      
      console.log('🔍 [handleOpenSaveConfirmDialog] MaiML生成開始');
      
      // ✅ 複数method対応: multiMethodModeの場合は全methodsでバリデーション
      if (multiMethodMode && methods.length > 0) {
        console.log('📋 [handleOpenSaveConfirmDialog] 複数methodモード: convertMultipleMethodsToMaiMLを使用');
        // Method[]を直接渡す（convertMultipleMethodsToMaiMLはMethod[]を期待）
        maimlXml = convertMultipleMethodsToMaiML(updatedMethods, metadata, documentData, allTemplatesFromContext);
        console.log('✅ [handleOpenSaveConfirmDialog] convertMultipleMethodsToMaiML完了');
      } else {
        console.log('📋 [handleOpenSaveConfirmDialog] 単一methodモード: convertReactFlowToMaiMLを使用');
        maimlXml = await convertReactFlowToMaiML(nodes, edges, metadata, documentData, null, allTemplatesFromContext);
        console.log('✅ [handleOpenSaveConfirmDialog] convertReactFlowToMaiML完了');
      }
      
      console.log('✅ [handleOpenSaveConfirmDialog] MaiML生成完了:', {
        length: maimlXml?.length || 0,
        firstChars: maimlXml?.substring(0, 100) || 'EMPTY',
        containsInvalidChar: maimlXml?.includes('�') || false
      });
      
      // Base64エンコード（バリデーションAPI用）
      console.log('🔍 [handleOpenSaveConfirmDialog] Base64エンコード開始');
      const base64Data = btoa(unescape(encodeURIComponent(maimlXml)));
      console.log('✅ [handleOpenSaveConfirmDialog] Base64エンコード完了:', {
        originalLength: maimlXml.length,
        base64Length: base64Data.length
      });
      
      // バリデーションAPI呼び出し
      console.log('🔍 [handleOpenSaveConfirmDialog] バリデーションAPI呼び出し');
      const response = await maimlService.validateMaiml(base64Data);
      
      if (!response.success) {
        throw new Error(`バリデーションエラー: ${response.error?.message}`);
      }
      
      const result = response.data as AnalysisResult;
      
      console.log('✅ [PetriNetEditorInner] バリデーション完了:', {
        errors: result.errors?.length || 0,
        warnings: result.warnings?.length || 0,
      });
      
      // バリデーション結果を保存
      setValidationResult(result);
      
      // SaveConfirmDialogを開く
      setSaveConfirmDialogOpen(true);
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [PetriNetEditorInner] バリデーションエラー:', errorMessage);
      alert(`バリデーション実行に失敗しました: ${errorMessage}`);
    }
  }, [nodes, edges, documentData, getViewport, methods, activeMethodIndex, multiMethodMode]);

  // ===== Phase 8 Step 2: キーボードショートカット統合 =====
  // useKeyboardShortcutsフックを使用
  const { pressedKeys: keysPressedFromHook } = useKeyboardShortcuts({
    nodes,
    clipboard,
    canUndo,
    canRedo,
    selectedNodes,
    templateEditorOpen,
    saveConfirmDialogOpen,
    workflowDialogOpen,
    undo,
    redo,
    handleCopy,
    handlePaste,
    handleOpenSaveConfirmDialog,
  });

  // pressedKeysを更新（M/C/R/Tキー用）
  useEffect(() => {
    setPressedKeys(keysPressedFromHook);
  }, [keysPressedFromHook]);

  // ✅ UX改善2: editMode='draft'時の自動DraftManager表示
  useEffect(() => {
    if (editMode === 'draft' && !draftModeHandled && !isLoading) {
      console.log('💾 [PetriNetEditorInner] Draft復元モード検出 - DraftManagerを自動表示');
      setDraftModeHandled(true);
      setDraftManagerOpen(true);
    }
  }, [editMode, draftModeHandled, isLoading]);

  // ✅ openDraftManagerOnStart: 起動時にDraftManagerを自動表示
  const openDraftManagerOnStartHandledRef = useRef(false);
  useEffect(() => {
    if (props.openDraftManagerOnStart && !openDraftManagerOnStartHandledRef.current && !isLoading) {
      console.log('💾 [PetriNetEditorInner] openDraftManagerOnStart フラグ検出 - DraftManagerを自動表示');
      openDraftManagerOnStartHandledRef.current = true;
      setDraftManagerOpen(true);
    }
  }, [props.openDraftManagerOnStart, isLoading]);

  // Viewer用ノードを使用（pentagon等の正しい形状）
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      materialTemplate: MaterialTemplateNode,
      conditionTemplate: ConditionTemplateNode,
      resultTemplate: ResultTemplateNode,
      transition: TransitionNode,
    }),
    []
  );

  // MaiMLデータ読み込みと変換（バックエンドAPI使用 - Phase 2A安定版）
  useEffect(() => {
    const fetchPetriNetData = async () => {
      // 🔧 FIX: ローディング中なら何もしない
      if (isLoadingRef.current) {
        console.log('🔍 [PetriNetEditorInner] Already loading, skip');
        return;
      }
      
      // 新規作成モード: maimlDataがnullの場合は空の状態で起動
      if (!maimlData) {
        console.log('🆕 [PetriNetEditorInner] 新規作成モード: 空の状態で起動');
        
        if (editingFileName && !documentData) {
          // ✅ Util関数でDocumentDataとMethodIDを生成（initialDocumentId/initialDescriptionを渡す）
          const { documentData: initialDocumentData } = generateInitialDocumentData(editingFileName, {
            documentId: initialDocumentId,
            description: initialDescription,
          });
          setDocumentData(initialDocumentData);
          
          // ✅ Util関数でMethodDataを生成
          const initialMethod = generateInitialMethod(initialDocumentData.methodId);
          setMethods([initialMethod]);
        } else {
          // editingFileNameがない場合のフォールバック
          const { documentData: initialDocumentData } = generateInitialDocumentData(undefined, {
            documentId: initialDocumentId,
            description: initialDescription,
          });
          setDocumentData(initialDocumentData);
          
          const initialMethod = generateInitialMethod(initialDocumentData.methodId);
          setMethods([initialMethod]);
        }
        
        setIsLoading(false);
        setError(null);
        setNodes([]);
        setEdges([]);
        reset({ nodes: [], edges: [] });
        setActiveMethodIndex(0);
        setMultiMethodMode(false);
        
        console.log('📋 [PetriNetEditorInner] 新規作成: 初期化完了');
        
        return;
      }
      
      // 重複実行防止: 同じmaimlDataで既に読み込み済みの場合はスキップ
      if (hasLoadedRef.current && maimlDataRef.current === maimlData) {
        console.log('🔍 [PetriNetEditorInner] 既に読み込み済み、スキップ');
        return;
      }
      
      try {
        console.log('🔍 [PetriNetEditorInner] ペトリネット初期化開始（API経由）');
        setIsLoading(true);
        setError(null);
        
        // 🔧 FIX: ローディングフラグを設定
        isLoadingRef.current = true;
        
        // 読み込み開始フラグを設定
        hasLoadedRef.current = true;
        maimlDataRef.current = maimlData;

        const parser = new MaimlParserTyped(maimlData);
        let isMultiMethod = false;
        const methodsData = parser.getMethods();
            
        // 🎯 複数methodの場合
        if (methodsData.length > 0) {
          isMultiMethod = methodsData.length > 1;
              
          // テンプレートマップ構築
          const templateMap = buildTemplateMap(maimlData);
              
          // 🎯 Phase 3.1: maimlParserTypedを使用した共通テンプレート検出
          const parser = new MaimlParserTyped(maimlData);
          
          const commonTemplateIds = new Set<string>();
          const commonTemplateRefMap: Record<string, string> = {}; // { placeId: firstPlaceId }
          
          // parser.getTemplates()を使用して統一のTemplate型配列を取得
          const { material, condition, result } = parser.getTemplates();
          const allTemplates: Template[] = Array.from([...material, ...condition, ...result]).filter((t): t is Template => t != null && typeof t === 'object' && !!t.id);
              
          allTemplates.forEach((template: Template | null | undefined) => {
            // ✅ 安全ガード: template または template.id が falsy な場合はスキップ
            const templateId = template?.id;
            if (!templateId) return;
            const placeRefs = template?.placeRefs || []; // XSD準拠: placeRef（配列）
            
            if (placeRefs.length > 1 && templateId) {
              commonTemplateIds.add(templateId);
              
              // XSD準拠のPlaceRef型から参照IDを取得
              const getPlaceIdFromRef = (placeRef: XsdPlaceRef): string | null => {
                return placeRef.ref || null; // XSD準拠: refプロパティのみ
              };
              
              // 最初のplaceRef以外のplaceに対して参照関係を設定
              const firstPlaceId = getPlaceIdFromRef(placeRefs[0]);
              
              if (firstPlaceId) {
                for (let i = 1; i < placeRefs.length; i++) {
                  const placeId = getPlaceIdFromRef(placeRefs[i]);
                  if (placeId) {
                    commonTemplateRefMap[placeId] = firstPlaceId;
                  }
                }
                
                console.log('🔗 [PetriNetEditorInner] 共通テンプレート検出 (型安全):', {
                  templateId,
                  placeRefCount: placeRefs.length,
                  firstPlaceId,
                  referencePlaceIds: placeRefs.slice(1).map((ref) => getPlaceIdFromRef(ref))
                });
              } else {
                console.warn('⚠️ [PetriNetEditorInner] placeRef IDが取得できません:', {
                  templateId,
                  placeRef: placeRefs[0]
                });
              }
            }
          });
              
          console.log('📋 [PetriNetEditorInner] 共通テンプレート一覧 (型安全):', Array.from(commonTemplateIds));
          console.log('🔗 [PetriNetEditorInner] 参照関係マップ:', commonTemplateRefMap);
          
          let extractedDoc: MaimlDocument | null = null;
          try {
            extractedDoc = parser.getDocument();
          } catch (docError) {
            console.warn('⚠️ [fetchPetriNetData] Document取得エラー（処理続行）:', docError);
          }

          if (extractedDoc) {
            const documentWithCorrectName: DocumentData = {
              ...extractedDoc,
              name: props.originalFileName 
                ? props.originalFileName.replace('.maiml', '') 
                : (extractedDoc.name || 'document'),
            };
            setDocumentData(documentWithCorrectName);
            console.log('📄 [PetriNetEditorInner] Document情報を読み込みました（型安全）:', documentWithCorrectName);
          }
            
              
          // 各methodをReact Flow形式に変換
          const convertedMethods = methodsData.map((method: Method, index: number): MethodData => {
            const methodPetriNetData = {
              methods : methodsData,
              places: method.pnml.places || [],
              transitions: method.pnml.transitions || [],
              arcs: method.pnml.arcs || [],
            };
            
            // React Flow形式に変換
            const { nodes: methodNodes, edges: methodEdges } = 
              convertToReactFlowFormat(parser,methodPetriNetData, templateMap);
            
            // 🎯 共通テンプレートフラグと参照関係を設定
            const nodesWithCommonFlag = methodNodes.map((node: Node<NodeData>): Node<NodeData> => {
              if (node.data.nodeType === 'place') {
                const placeId = node.id;
                
                // templateMapからtemplate IDを取得
                const templateInfo = templateMap[placeId];
                const templateId = templateInfo?.id;
                
                console.log('🔍 [PetriNetEditorInner] ノード処理:', {
                  placeId,
                  templateId,
                  hasTemplateInfo: !!templateInfo
                });
                
                // 共通テンプレート参照の場合
                if (commonTemplateRefMap[placeId]) {
                  const referencedPlaceId = commonTemplateRefMap[placeId];
                  console.log('🔗 [PetriNetEditorInner] commonTemplateRef設定:', {
                    placeId,
                    referencedPlaceId,
                    templateId
                  });
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      commonTemplateRef: referencedPlaceId,
                      isCommonTemplate: true, // ✅ 共通テンプレートRefを持つノードはチェックをONにする
                    }
                  };
                }
                
                // 共通テンプレートの定義元の場合
                if (templateId && commonTemplateIds.has(templateId)) {
                  console.log('✅ [PetriNetEditorInner] 共通テンプレートフラグ設定:', {
                    placeId,
                    templateId
                  });
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      isCommonTemplate: true
                    }
                  };
                }
              }
              return node;
            });
            
            // エッジにスタイルとマーカーを追加
            const styledEdges = methodEdges.map((edge: Edge<EdgeData>): Edge<EdgeData> => ({
              ...edge,
              type: 'default',
              animated: false,
              style: { 
                stroke: '#333',
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#333',
                width: 20,
                height: 20,
              },
            }));
            
            return {
              methodId: method.id,
              methodIndex: index,
              name: `Method ${index + 1}`,
              nodes: nodesWithCommonFlag,
              edges: styledEdges,
              viewport: { x: 0, y: 0, zoom: 1 }
            };
          });
              
          console.log('✅ [PetriNetEditorInner] 複数method変換完了:', {
            methodCount: convertedMethods.length,
            methods: convertedMethods.map((m: MethodData) => ({
              methodId: m.methodId,
              nodeCount: m.nodes.length,
              edgeCount: m.edges.length
            }))
          });
              
          // methods配列を設定
          setMethods(convertedMethods);
          setActiveMethodIndex(0);
          setMultiMethodMode(isMultiMethod);
          
          // 最初のmethodを表示
          const firstMethod = convertedMethods[0];
          setNodes(firstMethod.nodes);
          setEdges(firstMethod.edges);
          
          // 履歴をリセット
          reset({ nodes: firstMethod.nodes, edges: firstMethod.edges });
          
          // 初期表示でフィットビュー
          setTimeout(() => {
            fitView({ padding: 0.2, duration: 300 });
          }, 100);
              
          // 🆕 Phase 3: 複数methodコードパスでも自動バリデーション実行
          setTimeout(async () => {
            try {
              console.log('🔍 [PetriNetEditorInner] 自動バリデーション実行開始（複数method）');
              console.log('🔍 [PetriNetEditorInner] maimlData preview:', maimlData?.substring(0, 200));
              
              const base64Data = btoa(unescape(encodeURIComponent(maimlData)));
              const userInfoStr1 = localStorage.getItem('userInfo');
              const userInfo1 = userInfoStr1 ? JSON.parse(userInfoStr1) : null;
              const currentOrgId = userInfo1?.organizationId || null;
              
              console.log('🔍 [PetriNetEditorInner] バリデーションリクエスト:', {
                base64Length: base64Data.length,
                organizationId: currentOrgId
              });
              
              const validateResponse = await maimlService.validateMaiml(base64Data);
              
              if (validateResponse.success) {
                const validateResult = validateResponse.data as AnalysisResult;
                console.log('✅ [PetriNetEditorInner] 自動バリデーション完了（複数method）:', {
                  success: validateResponse.success,
                  errorCount: validateResult.errors?.length || 0,
                  warningCount: validateResult.warnings?.length || 0,
                  errorSample: validateResult.errors?.[0] || null
                });
                
                // 🔍 デバッグ: エラー内容を詳細に表示
                if (validateResult.errors && validateResult.errors.length > 0) {
                  console.log('⚠️ [PetriNetEditorInner] バリデーションエラー詳細:', validateResult.errors);
                }
                
                setValidationResult(validateResult);
                console.log('📊 [PetriNetEditorInner] validationResult設定完了');
              } else {
                const errorText = validateResponse.error ;
                console.error('❌ [PetriNetEditorInner] バリデーションAPIエラー:', {
                  errorText
                });
              }
            } catch (validateErr: unknown) {
              const errorMessage = getErrorMessage(validateErr);
              console.error('❌ [PetriNetEditorInner] 自動バリデーション例外:', {
                message: errorMessage
              });
            }
          }, 500);
      } else {
          // methodsが取得できなかった場合：フォールバック用methodを設定してタブを表示
          console.warn('⚠️ [fetchPetriNetData] MAIMLのmethod取得件数が0 - フォールバック処理');
          const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
          setMethods([fallbackMethod]);
          setActiveMethodIndex(0);
          setMultiMethodMode(false);
          setNodes([]);
          setEdges([]);
          reset({ nodes: [], edges: [] });
          setIsLoading(false);

          // ⭐ Phase 2: 変換エラー・警告があれば ValidationPanel に表示
          const convErrors = parser.getConversionErrors();
          if (convErrors.length > 0) {
            console.warn('⚠️ [fetchPetriNetData] 変換エラー/警告をValidationPanelに表示:', convErrors);
            // ※ type を 'syntax_error' にすると criticalTypes に該当して画面が操作不能になるため
            //   'unknown_element' を使用して非致命的エラー扱いにする
            const errorContents = convErrors
              .filter(e => e.level === 'error')
              .map(e => ({
                type: 'unknown_element',
                severity: 'error' as const,
                message: `[${e.path}.${e.element}] ${e.message}`,
              }));
            const warningContents = convErrors
              .filter(e => e.level === 'warning')
              .map(e => ({
                type: 'unknown_element',
                severity: 'warning' as const,
                message: `[${e.path}.${e.element}] ${e.message}`,
              }));
            const conversionValidationResult: AnalysisResult = {
              fileKey: '',
              isValid: errorContents.length === 0,
              errors: errorContents,
              warnings: warningContents,
              autoCorrections: [],
            };
            setValidationResult(conversionValidationResult);
            setTimeout(() => {
              setValidationPanelOpen(true);
            }, 0);
          }
      }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        console.error('❌ [PetriNetEditorInner] 初期化エラー:', errorMessage);
        
        // Phase 3: エラーをvalidationResultに変換
        const errorValidationResult: AnalysisResult = {
          fileKey : '',
          isValid: false,
          errors: [{
            type: 'syntax_error',
            severity: 'error' as const,
            message: errorMessage || 'ペトリネット構造の読み込みに失敗しました',
            details: err instanceof Error ? err.stack : undefined
          }],
          warnings: [],
          autoCorrections: [],
        };
        setValidationResult(errorValidationResult);
        setError(errorMessage || 'ペトリネット構造の読み込みに失敗しました');
        
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        // 🔧 FIX: ローディングフラグを解除（正常・エラー問わず必ず実行）
        setIsLoading(false);
        isLoadingRef.current = false;
        console.log('🔍 [PetriNetEditorInner] Loading flag cleared');
      }
    };
    
    fetchPetriNetData();
  }, [maimlData]); // 依存配列を最小限に（maimlDataの変更時のみ実行）

  // ノード追加ハンドラー（Phase 3A + 3C: 履歴追加）
  const handleAddNode = useCallback((nodeType: string) => {
    // 現在の画面中央をフロー座標に変換（ビューポート中心配置）
    const canvasCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const newNode: Node<NodeData> = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType === 'transition' ? 'transition' : 
            nodeType === 'material' ? 'materialTemplate' :
            nodeType === 'condition' ? 'conditionTemplate' : 'resultTemplate',
      position: {
        x: canvasCenter.x + (Math.random() - 0.5) * 200,
        y: canvasCenter.y + (Math.random() - 0.5) * 200,
      },
      data: {
        id: `${nodeType}-${Date.now()}`,
        name: '',
        description: '',
        placeType: nodeType,
        nodeType: (nodeType === 'transition' ? 'transition' : 'place') as NodeType,
        // ✅ 修正: template自動生成を停止（PropertyPanelの編集ボタンで生成）
        // template: null,
        // templateRef: null,
      },
    };
    
    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      // Phase 3C: 履歴に追加
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });
    // ミニマップ強調: 最後に追加したノードIDを更新（2秒後に自動解除）
    setLastAddedNodeId(newNode.id);
    setTimeout(() => setLastAddedNodeId(null), 2000);
    onContentChange?.();
    console.log('➕ [PetriNetEditorInner] ノード追加（テンプレートなし）:', newNode);
  }, [setNodes, edges, pushState, onContentChange, screenToFlowPosition]);

  // テンプレートとノードの紐づき（placeRef）を解除するヘルパー
  // ノード自体は削除済み or 削除中の想定。テンプレート自体は削除しない。
  // 全カテゴリ（material/condition/result）を網羅し、紐づくテンプレートをすべて解除する。
  // TODO: Undo 時に placeRef を元に戻すには TemplateContext 側の履歴管理が必要（現在は対象外）
  const unlinkTemplateFromNode = useCallback((targetNodes: Node<NodeData>[]) => {
    const allTemplates = window.clineAllTemplates;
    if (!allTemplates || !window.clineUpdateTemplate) return;

    const categories = ['material', 'condition', 'result'] as const;

    targetNodes.forEach(node => {
      // transition はテンプレートなし
      if (node.data.nodeType === 'transition') return;

      // 全カテゴリを網羅して、このノードの ref を含むテンプレートをすべて解除
      categories.forEach(cat => {
        const templatesInCat = (allTemplates[cat] as Template[] | undefined) ?? [];
        templatesInCat.forEach((template: Template) => {
          if (!template.id) return;
          if (!template.placeRefs?.some((pr: XsdPlaceRef) => pr.ref === node.id)) return;

          // placeRefs から削除ノードの ref を除去
          const updatedPlaceRefs = template.placeRefs.filter(
            (pr: XsdPlaceRef) => pr.ref !== node.id
          );

          const updatedTemplate: Template = { ...template, placeRefs: updatedPlaceRefs };
          window.clineUpdateTemplate!(template.id, updatedTemplate);
          console.log('🔗 [unlinkTemplateFromNode] placeRef解除:', {
            category: cat,
            templateId: template.id,
            nodeId: node.id,
          });
        });
      });
    });
  }, []);

  // ノード削除ハンドラー（Phase 3A + 3C: 履歴追加 + エッジ削除修正）
  const handleNodesDelete = useCallback((deletedNodes: Node<NodeData>[]) => {
    const deletedIds = deletedNodes.map(n => n.id);
    
            // 削除されるノードに接続されているエッジを特定
            const affectedEdges = edges.filter((edge: Edge<EdgeData>) => 
              deletedIds.includes(edge.source) || 
              deletedIds.includes(edge.target)
            );
            
            console.log('🗑️ [PetriNetEditorInner] ノード削除:', {
              deletedNodes: deletedIds,
              affectedEdges: affectedEdges.map((e: Edge<EdgeData>) => e.id)
            });
            
            // エッジを明示的に削除
            setEdges((eds: Edge<EdgeData>[]) => eds.filter((e: Edge<EdgeData>) => 
              !affectedEdges.find((ae: Edge<EdgeData>) => ae.id === e.id)
            ));
            
            // ノードを削除（ReactFlowが処理するので、setNodesで新しい配列を返す）
            setNodes((nds: Node<NodeData>[]) => {
              const newNodes = nds.filter((n: Node<NodeData>) => !deletedIds.includes(n.id));
              // 履歴に追加（エッジも更新後の状態で）
              const newEdges = edges.filter((e: Edge<EdgeData>): boolean => !affectedEdges.find((ae: Edge<EdgeData>) => ae.id === e.id));
              pushState({ nodes: newNodes, edges: newEdges });
              return newNodes;
            });

            // テンプレートの placeRef 紐づきを解除（テンプレート自体は削除しない）
            unlinkTemplateFromNode(deletedNodes);

            onContentChange?.();
  }, [edges, setEdges, setNodes, pushState, onContentChange, unlinkTemplateFromNode]);

  // PropertyPanelからのノード削除ハンドラー
  const handleDeleteNode = useCallback((nodeId: string) => {
    console.log('🗑️ [PetriNetEditorInner] PropertyPanelからノード削除:', nodeId);

    // 接続エッジを特定
    const affectedEdges = edges.filter((e: Edge<EdgeData>) =>
      e.source === nodeId || e.target === nodeId
    );

    // エッジを削除
    setEdges((eds: Edge<EdgeData>[]) =>
      eds.filter((e: Edge<EdgeData>) => !affectedEdges.find((ae: Edge<EdgeData>) => ae.id === e.id))
    );

    // ノードを削除 + 履歴追加
    setNodes((nds) => {
      const newNodes = nds.filter(n => n.id !== nodeId);
      const newEdges = edges.filter((e: Edge<EdgeData>) => !affectedEdges.find((ae: Edge<EdgeData>) => ae.id === e.id));
      pushState({ nodes: newNodes, edges: newEdges });
      return newNodes;
    });

    // テンプレートの placeRef 紐づきを解除（テンプレート自体は削除しない）
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      unlinkTemplateFromNode([targetNode]);
    }

    onContentChange?.();
    // 選択状態をクリア
    setSelectedNode(null);
  }, [nodes, edges, setEdges, setNodes, pushState, onContentChange, unlinkTemplateFromNode]);

  // エッジ接続ハンドラー（Phase 3A + 3C: 履歴追加）
  const handleConnect = useCallback((connection: Connection) => {
    const edgeId = `arc-${Date.now()}`;
    const newEdge = {
      ...connection,
      id: edgeId,
      type: 'default',
      animated: false,
      style: { strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#333',
        width: 20,
        height: 20,
      },
      // data構造（将来の拡張用、現在はID編集のみ対応）
      data: {
        id: edgeId,
      }
    };
    
    setEdges((eds) => {
      const newEdges = addEdge(newEdge, eds);
      // Phase 3C: 履歴に追加
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    onContentChange?.();
    console.log('🔗 [PetriNetEditorInner] エッジ追加:', newEdge);
  }, [setEdges, nodes, pushState, onContentChange]);

  // エッジ削除ハンドラー（Phase 3A + 3C: 履歴追加）
  const handleEdgesDelete = useCallback((deletedEdges: Edge<EdgeData>[]) => {
    const deletedIds = deletedEdges.map(e => e.id);
    
    console.log('🗑️ [PetriNetEditorInner] エッジ削除（Deleteキー）:', {
      deletedEdges: deletedIds
    });
    
    // エッジを削除
    setEdges((eds) => {
      const newEdges = eds.filter(e => !deletedIds.includes(e.id));
      // Phase 3C: 履歴に追加
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    
    onContentChange?.();
    // 選択状態をクリア
    setSelectedEdge(null);
  }, [nodes, setEdges, pushState, onContentChange]);

  // PropertyPanelからのエッジ削除ハンドラー（Phase 3.1）
  const handleDeleteEdge = useCallback((edgeId: string) => {
    console.log('🗑️ [PetriNetEditorInner] PropertyPanelからエッジ削除:', edgeId);
    
    setEdges((eds) => {
      const newEdges = eds.filter(e => e.id !== edgeId);
      // 履歴に追加
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    
    onContentChange?.();
    // 選択状態をクリア
    setSelectedEdge(null);
  }, [setEdges, nodes, pushState, onContentChange]);

  // ノードドラッグ停止ハンドラー（Phase 3A + 3C: 履歴追加）
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
    console.log('📍 [PetriNetEditorInner] ノード移動:', {
      id: node.id,
      position: node.position
    });
    
    // Phase 3C: 移動後の状態を履歴に追加
    setTimeout(() => {
      pushState({ nodes, edges });
    }, 0);
    onContentChange?.();
  }, [nodes, edges, pushState, onContentChange]);

  // ノード選択ハンドラー（Phase 3B: プロパティパネル表示 + Phase 3C-3: 複数選択）
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
    console.log('📍 [PetriNetEditorInner] ノード選択:', {
      id: node.id,
      type: node.type,
      data: node.data
    });
    setSelectedNode(node);
  }, []);

  // Phase 3C-3: 選択変更ハンドラー
  const handleSelectionChange = useCallback(({ nodes }: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => {
    setSelectedNodes(nodes);
    if (nodes.length === 1) {
      setSelectedNode(nodes[0]);
    } else if (nodes.length === 0) {
      setSelectedNode(null);
    } else {
      // 複数選択時はプロパティパネルを閉じる
      setSelectedNode(null);
    }
    console.log('📍 [PetriNetEditorInner] 選択変更:', {
      count: nodes.length,
      ids: nodes.map(n => n.id)
    });
  }, []);

  // ワークフロー追加ダイアログを開く（内部関数） - handlePaneClickより先に定義
  const openWorkflowDialogInternal = useCallback(async () => {
    console.log('🔄 [PetriNetEditorInner] ワークフロー選択ダイアログを開く');
    setWorkflowDialogOpen(true);
    setIsLoadingFiles(true);
    
    try {
      // ストレージファイル一覧取得（新APIエンドポイント使用）
      const userInfoStr2 = localStorage.getItem('userInfo');
      const userInfo2 = userInfoStr2 ? JSON.parse(userInfoStr2) : null;
      const currentOrgId = userInfo2?.organizationId || null;
      
      if (!currentOrgId) {
        throw new Error('組織IDが取得できません');
      }
      
      // ✅ 修正: maimlServiceのlistStorageFilesを使用
      const response = await maimlService.listStorageFiles(currentOrgId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'ファイル一覧取得に失敗しました');
      }
      
      // .maimlファイルのみフィルタリング
      const maimlFiles = response.data.files
        .filter((file: StorageFile) => file.key && file.key.endsWith('.maiml'))
        .map((file: StorageFile) => ({
          key: file.key,
          name: file.name || file.key.split('/').pop() || '',
          lastModified: file.lastModified,
          size: file.size,
        }));
      
      setAvailableFiles(maimlFiles);
      console.log('✅ [PetriNetEditorInner] ファイル一覧取得完了:', maimlFiles.length);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ [PetriNetEditorInner] ファイル一覧取得エラー:', error);
      alert(`ファイル一覧の取得に失敗しました: ${error.message}`);
      setWorkflowDialogOpen(false);
      setSelectedTool('select');
      setPendingClickPosition(null);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Phase 3C-3: キャンバスクリックでノード追加（キー押下中のみ）+ ワークフロー追加モード
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    // ワークフローモード時の処理
    if (selectedTool === 'workflow') {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      console.log('📍 [PetriNetEditorInner] ワークフロー追加位置クリック:', position);
      
      // クリック位置を保存
      setPendingClickPosition(position);
      
      // ファイル選択ダイアログを開く
      openWorkflowDialogInternal();
      
      return;
    }
    
    // 押されているキーをチェック
    let nodeType = null;
    if (pressedKeys.has('m')) {
      nodeType = 'material';
    } else if (pressedKeys.has('c')) {
      nodeType = 'condition';
    } else if (pressedKeys.has('r')) {
      nodeType = 'result';
    } else if (pressedKeys.has('t')) {
      nodeType = 'transition';
    }
    
    if (!nodeType) return; // キーが押されていない場合は何もしない
    
    // Bug Fix: screenToFlowPositionを使用（パンのみ防止、位置ずれは既知の問題として保留）
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    // 初回判定フラグ
    const isFirstNode = isFirstNodeRef.current;
    if (isFirstNode) {
      isFirstNodeRef.current = false;
    }
    
    const newNode: Node<NodeData> = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType === 'transition' ? 'transition' : 
            nodeType === 'material' ? 'materialTemplate' :
            nodeType === 'condition' ? 'conditionTemplate' : 'resultTemplate',
      position,
      data: {
        id: `${nodeType}-${Date.now()}`,
        name: '',
        description: '',
        placeType: nodeType,
        nodeType: (nodeType === 'transition' ? 'transition' : 'place') as NodeType,
        // ✅ 修正: template自動生成を停止（PropertyPanelの編集ボタンで生成）
        // template: null,
        // templateRef: null,
      },
    };
    
    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });
    // ミニマップ強調: 最後に追加したノードIDを更新（2秒後に自動解除）
    setLastAddedNodeId(newNode.id);
    setTimeout(() => setLastAddedNodeId(null), 2000);
    onContentChange?.();
    
    console.log(`✨ [PetriNetEditorInner] ${isFirstNode ? '🎯初回' : '2回目以降'}ノード追加（テンプレートなし）:`, {
      nodeType,
      position,
      screenCoords: { x: event.clientX, y: event.clientY }
    });
  }, [pressedKeys, edges, pushState, setNodes, screenToFlowPosition, selectedTool, openWorkflowDialogInternal, onContentChange, setLastAddedNodeId]);

  // プロパティパネルを閉じる
  const handleClosePropertyPanel = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // ノードプロパティ更新（Phase 3B + 3C: 履歴追加）
  const handleUpdateNodeProperty = useCallback((nodeId: string, newData: NodeData) => {
    setNodes((nds) => {
      const newNodes = nds.map((node) =>
        node.id === nodeId ? { ...node, data: newData } : node
      );
      // Phase 3C: 履歴に追加
      pushState({ nodes: newNodes, edges });
      
      // 選択中のノードも更新（PropertyPanel表示更新のため）
      const updatedNode = newNodes.find(n => n.id === nodeId);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
      
      return newNodes;
    });
    onContentChange?.();
    console.log('📝 [PetriNetEditorInner] プロパティ更新:', { nodeId, newData });
  }, [setNodes, edges, pushState, onContentChange]);

  // ノードID変更ハンドラー
  const handleUpdateNodeId = useCallback((oldId: string, newId: string) => {
    console.log('🔄 [PetriNetEditorInner] ノードID変更:', { oldId, newId });
    
    // ✅ TemplateContextのテンプレートも更新（placeRefsの参照を更新）
    if (window.clineAllTemplates && window.clineUpdateTemplate) {
      const allTemplates = window.clineAllTemplates;
      
      // 全カテゴリのテンプレートをチェック
      (['material', 'condition', 'result'] as const).forEach((category) => {
        const templates : Template[] = (allTemplates[category] || []).filter((t): t is Template => t != null && typeof t === 'object' && !!t.id);
          if (templates.length > 0) {
          templates.forEach((template: Template) => {
            if (!template || !template.id) return; // ✅ 安全ガード
            // このテンプレートのplaceRefsにoldIdが含まれている場合
            if (template.placeRefs && template.placeRefs.find((r) => r.ref === oldId)) {
              console.log('🔄 [PetriNetEditorInner] テンプレートのplaceRefsを更新:', {
                templateId: template.id,
                category,
                oldId,
                newId
              });
              
              // placeRefsを更新
              const updatedPlaceRefs = template.placeRefs;
              updatedPlaceRefs.forEach(pr => {
                if (pr.ref === oldId) {
                  pr.ref = newId;
                }
            });
              
              // テンプレートを更新
              window.clineUpdateTemplate(template.id, {
                ...template, placeRefs: updatedPlaceRefs,
              });
            }
          });
        }
      });
    }
    
    // ノードとエッジを同時に更新し、その後履歴に追加
    setNodes((prevNodes) => {
      const newNodes = prevNodes.map((node) =>
        node.id === oldId
          ? { ...node, id: newId, data: { ...node.data, id: newId } }
          : node
      );
      
      // 選択中のノードも更新
      const updatedNode = newNodes.find(n => n.id === newId);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
      
      // エッジも同時に更新
      setEdges((prevEdges) => {
        const newEdges = prevEdges.map((edge) => ({
          ...edge,
          source: edge.source === oldId ? newId : edge.source,
          target: edge.target === oldId ? newId : edge.target,
        }));
        
        // 履歴に追加（更新後の状態を使用）
        pushState({ nodes: newNodes, edges: newEdges });
        console.log('✅ [PetriNetEditorInner] ノードID変更完了 - 履歴追加:', { oldId, newId });
        
        return newEdges;
      });
      
      return newNodes;
    });
    onContentChange?.();
  }, [setNodes, setEdges, pushState, onContentChange]);

  // エッジプロパティ更新（Phase 3: エッジID変更対応）
  const handleUpdateEdgeProperty = useCallback((edgeId: string, newId: string) => {
    setEdges((eds) => {
      const newEdges = eds.map((edge) =>
        edge.id === edgeId ? { ...edge, id: newId, data: { ...edge.data, id: newId } } : edge
      );
      // 履歴に追加
      pushState({ nodes, edges: newEdges });
      
      // 選択中のエッジも更新（PropertyPanel表示更新のため）
      const updatedEdge = newEdges.find(e => e.id === newId);
      if (updatedEdge) {
        setSelectedEdge(updatedEdge);
      }
      
      return newEdges;
    });
    onContentChange?.();
    console.log('📝 [PetriNetEditorInner] エッジID更新:', { oldId: edgeId, newId });
  }, [setEdges, nodes, pushState, onContentChange]);

  // Phase 4A: テンプレート編集ダイアログを開く
  const handleOpenTemplateEditor = useCallback((node: Node<NodeData>) => {
    console.log('🔧 [PetriNetEditorInner] テンプレート編集:', node);

    // ✅ methodId が未設定のノードには activeMethod の methodId を補完する
    // これにより TemplateEditorDialog.handleSave → handleSaveTemplate で
    // correctMethodId が正しく解決される
    const isCommon = node.data.isCommonTemplate || false;
    const currentMethodId = methods[activeMethodIndex]?.methodId;
    const nodeWithMethodId: Node<NodeData> = {
      ...node,
      data: {
        ...node.data,
        methodId: isCommon
          ? null                                          // 共通テンプレートは null のまま
          : (node.data.methodId ?? currentMethodId ?? null), // 未設定なら activeMethod の ID を補完
      },
    };

    console.log('📋 [PetriNetEditorInner] TemplateEditorDialog に渡す methodId:', {
      original: node.data.methodId,
      补完後: nodeWithMethodId.data.methodId,
      isCommon,
      activeMethodId: currentMethodId,
    });

    setTemplateEditNode(nodeWithMethodId);
    setTemplateEditorOpen(true);
  }, [methods, activeMethodIndex]);

  // Phase 4A: テンプレート編集ダイアログを閉じる
  const handleCloseTemplateEditor = useCallback(() => {
    setTemplateEditorOpen(false);
    setTemplateEditNode(null);
  }, []);

  /**
   * ✅ 修正版: NestedPropertyEditor形式をMaiMLParser配列形式に変換
   * @param {Object} propertiesObj - NestedPropertyEditor形式のpropertiesオブジェクト
   * @returns {Property[]} MaiMLParser配列形式のproperties
   */
  const convertNestedPropertiesToArray = useCallback((propertiesObj: Record<string, unknown>): Property[] => {
    if (!propertiesObj || typeof propertiesObj !== 'object') {
      return [];
    }
    
    console.log('🔄 [convertNestedPropertiesToArray] 変換開始:', {
      keys: Object.keys(propertiesObj),
      sample: propertiesObj[Object.keys(propertiesObj)[0]]
    });
    
    // ✅ 修正: プロパティオブジェクトの型定義
    interface PropInput {
      key?: string;
      tagName?: string;
      attributes?: Record<string, unknown>;
      elements?: Record<string, unknown>;
      children?: unknown[];
    }
    
    // ✅ 修正: 再帰的な変換関数（子要素用）
    const convertPropertyRecursive = (prop: PropInput, explicitKey: string | null = null): Property => {
      const attributes = prop.attributes as Record<string, string> || {};
      const elements = prop.elements as Record<string, unknown> || {};
      const xsiType = attributes['xsi:type'] || 'stringType';
      const finalKey = explicitKey || prop.key || 'property';
      
      const result: Property = {
        key: String(finalKey),
        xsiType: xsiType,
        properties: [],
        contents: []
      };
      
      // attributes から units, formatString, scaleFactor を抽出
      if (attributes.units) result.units = String(attributes.units);
      if (attributes.formatString) result.formatString = String(attributes.formatString);
      if (attributes.scaleFactor) result.scaleFactor = Number(attributes.scaleFactor);
      
      // elements から value, description を抽出
      if (elements.value !== undefined) result.value = String(elements.value);
      if (elements.description !== undefined) result.description = String(elements.description);
      
      // 子要素がある場合（propertyListType）
      if (prop.children && Array.isArray(prop.children) && prop.children.length > 0) {
        console.log(`  🔄 [convertPropertyRecursive] ${prop.key}に子要素あり:`, prop.children.length);
        result.properties = prop.children.map(child => convertPropertyRecursive(child as PropInput, null));
      }
      
      return result;
    };
    
    // ✅ 修正: Object.entries()でkeyを取得して配列に変換
    const resultArray = Object.entries(propertiesObj).map(([objKey, prop]: [string, unknown]) => {
      console.log(`  📌 [convertNestedPropertiesToArray] 処理中: ${objKey}`, {
        propKey: (prop as PropInput).key,
        propTagName: (prop as PropInput).tagName
      });
      
      // objKeyを明示的に渡す
      return convertPropertyRecursive(prop as PropInput, objKey);
    });
    
    console.log('✅ [convertNestedPropertiesToArray] 変換完了:', {
      count: resultArray.length,
      keys: resultArray.map(p => p.key),
      sample: resultArray[0]
    });
    
    return resultArray;
  }, []);

  // Phase 4A: テンプレート保存ハンドラー（新規作成対応）
  const handleSaveTemplate = useCallback((
    nodeId: string, 
    templateRef: Template, 
    isNewTemplate: boolean, 
    templateCategory: string, 
    isCommonTemplate: boolean, 
    methodId: string | undefined
  ) => {
    console.log('💾 [PetriNetEditorInner] Template保存開始:', { 
      nodeId, 
      templateRef,
      templateId: templateRef.id,  // ✅ テンプレートIDを確認
      isNewTemplate,
      templateCategory,
      isCommonTemplate,
      methodId,  // ✅ このmethodIdを優先的に使用
      placeRefs: templateRef.placeRefs
    });
    
    // ✅ テンプレートIDを取得（templateRef.idを優先、なければnodeId）
    const templateId = templateRef.id || nodeId;
    console.log('📋 [PetriNetEditorInner] 使用するテンプレートID:', templateId);
    
    // ✅ 修正: 元のtemplateRefの全プロパティを保持しつつ、propertiesのみを変換
    const convertedTemplateRef = {
      ...templateRef,  // uuid, placeRefs, templateRefs等を保持
      properties: templateRef.properties && typeof templateRef.properties === 'object' && !Array.isArray(templateRef.properties)
        ? convertNestedPropertiesToArray(templateRef.properties)
        : templateRef.properties || []
    };
    
    // ✅ 修正: placeRefsが空の場合、実際のノードが存在する場合のみ自分自身を追加
    if (!convertedTemplateRef.placeRefs || convertedTemplateRef.placeRefs.length === 0) {
      // ノードが実際に存在するかチェック
      const nodeExists = nodes.some(n => n.id === nodeId);
      if (nodeExists) {
        console.log('⚠️ [PetriNetEditorInner] placeRefsが空です、自分自身を追加:', nodeId);
        convertedTemplateRef.placeRefs = [{ id: '',ref: nodeId}];
      } else {
        console.log('ℹ️ [PetriNetEditorInner] テンプレート一覧からの追加、placeRefsは空のまま');
        convertedTemplateRef.placeRefs = [];
      }
    }
    
    console.log('✅ [PetriNetEditorInner] Properties変換完了:', {
      元の形式: typeof templateRef.properties,
      元のキー数: templateRef.properties ? Object.keys(templateRef.properties).length : 0,
      変換後の配列長: convertedTemplateRef.properties.length,
      変換後サンプル: convertedTemplateRef.properties[0],
      保持されたuuid: convertedTemplateRef.uuid,
      保持されたplaceRefs: convertedTemplateRef.placeRefs,
      保持されたtemplateRef: convertedTemplateRef.templateRef
    });
    
    // 新規テンプレート作成の場合
    if (isNewTemplate) {
      // ✅ 修正: methodIdパラメータを優先的に使用（PropertyPanelから渡される）
      const correctMethodId = isCommonTemplate ? undefined : (methodId || documentData?.methodId || methods[activeMethodIndex]?.methodId);
      
      console.log('➕ [PetriNetEditorInner] 新規テンプレート作成:', {
        category: templateCategory,
        isCommon: isCommonTemplate,
        methodId: methodId,
        correctMethodId: correctMethodId,
        documentDataMethodId: documentData?.methodId,
        activeMethodMethodId: methods[activeMethodIndex]?.methodId,
        placeRefs: convertedTemplateRef.placeRefs,
        templateId: templateId  // ✅ テンプレートIDをログ
      });
      
      // TemplateContextに追加（window.clineAddTemplateを使用）
      const newTemplateForContext: Template = {
        id: templateId,  // ✅ 修正: templateIdを使用
        uuid: convertedTemplateRef.uuid,
        name: convertedTemplateRef.name || '',
        description: convertedTemplateRef.description,
        category: templateCategory,
        properties: convertedTemplateRef.properties || [],
        contents: convertedTemplateRef.contents || [],
        placeRefs: convertedTemplateRef.placeRefs || [],
        templateRef: convertedTemplateRef.templateRef,
        methodId: correctMethodId,
      };

      if (window.clineAddTemplate) {
        window.clineAddTemplate({
          category: templateCategory === 'material' ? 'material' : templateCategory === 'condition' ? 'condition' : 'result',
          template: newTemplateForContext,
        });
        console.log('✅ [PetriNetEditorInner] 新規テンプレートをContextに追加完了:', { correctMethodId });
      } else {
        console.error('❌ [PetriNetEditorInner] addTemplate関数が見つかりません');
      }

      // ✅ 修正: 新規テンプレート作成時もnodesのdata.templateを更新する
      // （methodsのuseEffectがnodesの変化を監視しているため、ここで更新が必要）
      const newPlaceRefsToUpdate = newTemplateForContext.placeRefs || [];
      setNodes((nds) => {
        const newNodes = nds.map((node: Node<NodeData>) => {
          if (newPlaceRefsToUpdate.some((pr) => pr.ref === node.id)) {
            console.log('✅ [PetriNetEditorInner] 新規テンプレート: ノードにテンプレート設定:', {
              nodeId: node.id,
              templateId: templateId,
              isCommonTemplate: isCommonTemplate,
              methodId: correctMethodId,
            });
            return {
              ...node,
              data: {
                ...node.data,
                template: newTemplateForContext,
                templateRef: newTemplateForContext,
                isCommonTemplate: isCommonTemplate,
                // ✅ 共通テンプレートの場合、自分自身のテンプレートIDをcommonTemplateRefに設定
                // これによりPropertyPanelの「共通テンプレート参照」ドロップダウンが選択状態になる
                commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
              },
            };
          }
          return node;
        });
        // ✅ Fix: refに保存してコールバック外でpushState/setSelectedNodeを呼ぶ
        updatedNodesRef.current = newNodes;
        return newNodes;
      });

      // ✅ Fix: setNodesコールバック外でpushStateとsetSelectedNodeを呼ぶ
      // → pushStateがコールバック内にあると history.present 変化→useEffect発火→setNodes再実行で
      //   2件目のノード更新が上書きされる問題を防ぐ
      setTimeout(() => {
        pushState({ nodes: updatedNodesRef.current, edges });
        // ✅ Fix: nodeIdがcanvasノードIDでない場合（テンプレート管理ビュー経由）は
        // newPlaceRefsToUpdateから最初にマッチしたノードをselectedNodeにする
        const candidateId = updatedNodesRef.current.some(n => n.id === nodeId)
          ? nodeId
          : newPlaceRefsToUpdate[0]?.ref;
        const updatedNode = updatedNodesRef.current.find(n => n.id === candidateId);
        if (updatedNode) {
          setSelectedNode(updatedNode);
        }
      }, 0);

      // ✅ Fix: 非アクティブメソッドのノードも更新する
      // setNodes はアクティブメソッドのみ更新するため、methods stateも更新する
      setMethods(prev => {
        return prev.map((method, idx) => {
          if (idx === activeMethodIndex) return method; // アクティブメソッドはsetNodesで更新済み
          const updatedNodes = method.nodes.map((node: Node<NodeData>) => {
            if (newPlaceRefsToUpdate.some((pr) => pr.ref === node.id)) {
              return {
                ...node,
                data: {
                  ...node.data,
                  template: newTemplateForContext,
                  templateRef: newTemplateForContext,
                  isCommonTemplate: isCommonTemplate,
                  commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
                },
              };
            }
            return node;
          });
          return { ...method, nodes: updatedNodes };
        });
      });

      onContentChange?.();
      // テンプレートエディタを閉じる
      setTemplateEditorOpen(false);
      setTemplateEditNode(null);
      return;
    }
    
    // 既存テンプレートの更新
    console.log('🔄 [PetriNetEditorInner] 既存テンプレート更新:', {
      nodeId,
      templateId: templateId,
      placeRefs: convertedTemplateRef.placeRefs,
      placeRefsLength: convertedTemplateRef.placeRefs?.length,
      placeRefIds: convertedTemplateRef.placeRefs?.map(pr => pr.ref),
      isNewTemplate,
      templateCategory,
      isCommonTemplate,
      methodId
    });
    
      // ✅ 既存テンプレートの元の情報を取得（TemplateContextから）
      if (window.clineAllTemplates) {
        const allTemplates = window.clineAllTemplates;
        let originalTemplate: Template = {id: '', name: '', uuid: '', category: '', placeRefs : [], properties: [], contents: []};
        
        // 全カテゴリから元のテンプレートを検索（templateIdで検索）
        (['material', 'condition', 'result'] as const).forEach((category) => {
        const templates : Template[] = (allTemplates[category] || []).filter((t): t is Template => t != null && typeof t === 'object' && !!t.id);
          if (!originalTemplate.id && templates.length > 0) {
            const found = templates.find((t: Template) => t.id === templateId);
            if (found) {  // ✅ 修正: find()がundefinedを返す場合に備えてチェック
              originalTemplate = found;
            }
          }
        });
        
        console.log('🔍 [PetriNetEditorInner] 元のテンプレート情報:', {
          found: !!originalTemplate,
          originalMethodId: originalTemplate?.methodId,
          originalPlaceRefsLength: originalTemplate?.placeRefs?.length,
          newPlaceRefsLength: convertedTemplateRef.placeRefs?.length
        });
        
        // ✅ 元のテンプレート情報を優先（methodId、typeを保持）
        const finalTemplateCategory = originalTemplate?.category || templateCategory;
        const finalMethodId = originalTemplate?.methodId !== undefined ? originalTemplate.methodId : methodId;
      
      // TemplateContextを更新（window.clineUpdateTemplateを使用）
      if (window.clineUpdateTemplate) {
        window.clineUpdateTemplate(templateId, {  // ✅ 修正: templateIdを使用
            id: templateId,  // ✅ 修正: templateIdを使用
            uuid: convertedTemplateRef.uuid,
            name: convertedTemplateRef.name || '',
            description: convertedTemplateRef.description,
            category: finalTemplateCategory,
            properties: convertedTemplateRef.properties,
            contents: convertedTemplateRef.contents || [],
            placeRefs: convertedTemplateRef.placeRefs || [],
            templateRef: convertedTemplateRef.templateRef,
            methodId: finalMethodId,
        });
        console.log('✅ [PetriNetEditorInner] TemplateContext更新完了:', {
          finalTemplateCategory,
          finalMethodId
        });
      } else {
        console.error('❌ [PetriNetEditorInner] updateTemplate関数が見つかりません');
      }
    } else {
      console.error('❌ [PetriNetEditorInner] allTemplates関数が見つかりません');
    }
    
    // ✅ 修正: placeRefsに含まれる全てのノードにテンプレートを設定
    const existingPlaceRefsToUpdate = convertedTemplateRef.placeRefs || [];
    setNodes((nds) => {
      console.log('🔄 [PetriNetEditorInner] ノードにテンプレート紐付け:', {
        templateId: templateId,
        existingPlaceRefsToUpdate,
        totalNodes: nds.length,
        isCommonTemplate: isCommonTemplate,
        methodId: methodId
      });
      
      const newNodes = nds.map((node: Node<NodeData>) => {
        // placeRefsに含まれるノードにテンプレートを設定
        if (existingPlaceRefsToUpdate.some((pr) => pr.ref === node.id)) {
          console.log('✅ [PetriNetEditorInner] ノードにテンプレート設定:', {
            nodeId: node.id,
            templateId: templateId,
            hasExistingTemplate: !!node.data.template,
            isCommonTemplate: isCommonTemplate
          });
          
          return {
            ...node,
            data: {
              ...node.data,
              template: convertedTemplateRef,
              templateRef: convertedTemplateRef, // 互換性のため両方保持
              isCommonTemplate: isCommonTemplate, // ✅ 追加: 共通テンプレートフラグを設定
              // ✅ 修正: 共通テンプレートの場合、templateIdをcommonTemplateRefに設定
              // これによりテンプレート管理ビューのPlaceRef追加後もPropertyPanelのドロップダウンが正しく表示される
              commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
            },
          };
        }
        return node;
      });
      
      // ✅ Fix: refに保存してコールバック外でpushState/setSelectedNodeを呼ぶ
      updatedNodesRef.current = newNodes;
      return newNodes;
    });

    // ✅ Fix: setNodesコールバック外でpushStateとsetSelectedNodeを呼ぶ
    // → pushStateがコールバック内にあると history.present 変化→useEffect発火→setNodes再実行で
    //   2件目のノード更新が上書きされる問題を防ぐ
    setTimeout(() => {
      pushState({ nodes: updatedNodesRef.current, edges });
      // ✅ Fix: nodeIdがcanvasノードIDでない場合（テンプレート管理ビュー経由）は
      // existingPlaceRefsToUpdateから最初にマッチしたノードをselectedNodeにする
      const candidateId = updatedNodesRef.current.some(n => n.id === nodeId)
        ? nodeId
        : existingPlaceRefsToUpdate[0]?.ref;
      const updatedNode = updatedNodesRef.current.find(n => n.id === candidateId);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
    }, 0);

    // ✅ Fix: 非アクティブメソッドのノードも更新する
    // setNodes はアクティブメソッドのみ更新するため、methods stateも更新する
    setMethods(prev => {
      return prev.map((method, idx) => {
        if (idx === activeMethodIndex) return method; // アクティブメソッドはsetNodesで更新済み
        const updatedNodes = method.nodes.map((node: Node<NodeData>) => {
          if (existingPlaceRefsToUpdate.some((pr) => pr.ref === node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                template: convertedTemplateRef,
                templateRef: convertedTemplateRef,
                isCommonTemplate: isCommonTemplate,
                commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
              },
            };
          }
          return node;
        });
        return { ...method, nodes: updatedNodes };
      });
    });

    onContentChange?.();
    console.log('💾 [PetriNetEditorInner] Template保存完了:', { nodeId, templateId, convertedTemplateRef });  // ✅ templateIdを追加
  }, [setNodes, setMethods, activeMethodIndex, edges, pushState, convertNestedPropertiesToArray, onContentChange, methods, documentData]);

  // Document編集ダイアログを開く
  const handleOpenDocumentEditor = useCallback(() => {
    console.log('📄 [PetriNetEditorInner] Document編集を開く');
    setDocumentDialogOpen(true);
  }, []);

  // Document編集ダイアログを閉じる
  const handleCloseDocumentEditor = useCallback(() => {
    setDocumentDialogOpen(false);
  }, []);

  // Document保存ハンドラー
  const handleSaveDocument = useCallback((newDocumentData: DocumentData) => {
    setDocumentData(newDocumentData);
    onContentChange?.();
    console.log('💾 [PetriNetEditorInner] Document保存:', newDocumentData);
  }, [onContentChange]);

  // Draft管理ダイアログを開く
  const handleOpenDraftManager = useCallback(() => {
    console.log('📂 [PetriNetEditorInner] Draft管理ダイアログを開く');
    setDraftManagerOpen(true);
  }, []);

  // Draft管理ダイアログを閉じる
  const handleCloseDraftManager = useCallback(() => {
    setDraftManagerOpen(false);
  }, []);

  // ✅ 修正③: DraftManagerダイアログ表示中は自動保存を停止・再開する
  useEffect(() => {
    if (draftManagerOpen) {
      console.log('🛑 [PetriNetEditorInner] DraftManagerダイアログ表示 - 自動保存停止');
      stopAutoSaveTimer();
    } else {
      console.log('▶️ [PetriNetEditorInner] DraftManagerダイアログ非表示 - 自動保存再開');
      resumeAutoSaveTimer(); // isPausedRefを解除してからタイマーを開始
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftManagerOpen]);

  // ✅ 修正④: 自動保存トグルハンドラー（resumeAutoSaveTimer/stopAutoSaveTimerを直接呼ぶ）
  const handleAutoSaveToggle = useCallback((enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    if (enabled) {
      console.log('▶️ [PetriNetEditorInner] 自動保存トグル ON - タイマー開始');
      resumeAutoSaveTimer(); // isPausedRefを解除してからタイマーを開始
    } else {
      console.log('🛑 [PetriNetEditorInner] 自動保存トグル OFF - タイマー停止');
      stopAutoSaveTimer();
    }
  }, [setAutoSaveEnabled, resumeAutoSaveTimer, stopAutoSaveTimer]);

  // ビューモード切替ハンドラー
  const handleViewModeChange = useCallback((newMode: 'petriNet' | 'templates' | 'xml') => {
    console.log('🔄 [PetriNetEditorInner] ビューモード切替:', { from: viewMode, to: newMode });
    
    // ペトリネットモードから切り替える場合、ビューポートを保存
    if (viewMode === 'petriNet' && newMode !== 'petriNet') {
      const currentViewport = getViewport();
      setSavedPetriNetViewport(currentViewport);
      console.log('💾 [PetriNetEditorInner] ペトリネットビューポート保存:', currentViewport);
    }
    
    setViewMode(newMode);
    
    // ビューモード切替時にPropertyPanelを閉じる
    setSelectedNode(null);
    setSelectedEdge(null);
    
    // ペトリネットモードに切り替える際の処理
    if (newMode === 'petriNet') {
      setShowCommonTemplates(false);
    }
  }, [viewMode, getViewport]);
  
  // ビューモード変更時のビューポート復元
  useEffect(() => {
    if (viewMode === 'petriNet' && savedPetriNetViewport) {
      // React Flowのレンダリング後にビューポートを復元
      const timer = setTimeout(() => {
        setViewport(savedPetriNetViewport);
        console.log('🔄 [PetriNetEditorInner] ペトリネットビューポート復元:', savedPetriNetViewport);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [viewMode, savedPetriNetViewport, setViewport]);

  // テンプレート選択ハンドラー
  const handleTemplateSelect = useCallback((template: Template) => {
    console.log('📝 [PetriNetEditorInner] テンプレート選択:', template);
    setSelectedTemplate(template);
    
    // ✅ 修正: uuid, placeRefs, templateRefs, descriptionを含めた仮ノードを作成
            // ✅ 共通テンプレートかどうかを判定（methodIdがnull/undefinedなら共通テンプレート）
            const isCommonTmpl = template.methodId === null || template.methodId === undefined;
            const tempNode: Node<NodeData> = {
              id: template.id,
              position: { x: 0, y: 0 }, // ✅ 追加: position必須
              data: {
                id: template.id,
                name: template.name || '',
                description: template.description || '',
                nodeType: 'place' as NodeType,
                placeType: template.category,
                isCommonTemplate: isCommonTmpl, // ✅ 修正: 共通テンプレートフラグを設定
                methodId: template.methodId || null,
                template: {
                  id: template.id,
                  name: template.name || '',
                  description: template.description || '',
                  category: template.category,
                  uuid: template.uuid || uuidv4(),
                  placeRefs: template.placeRefs || [],
                  templateRef: template.templateRef,
                  properties: template.properties || [],
                  contents: template.contents || [],
                },
                templateRef: {
                  id: template.id,
                  name: template.name || '',
                  description: template.description || '',
                  category: template.category,
                  uuid: template.uuid || uuidv4(),
                  placeRefs: template.placeRefs || [],
                  templateRef: template.templateRef,
                  properties: template.properties || [],
                  contents: template.contents || [],
                },
              },
            };
            
            console.log('✅ [PetriNetEditorInner] 仮ノード作成完了:', {
              hasUuid: !!tempNode.data.template?.uuid,
              hasPlaceRefs: !!tempNode.data.template?.placeRefs,
              hasTemplateRefs: !!tempNode.data.template?.templateRef,
              hasDescription: !!tempNode.data.description,
              templateRefKeys: tempNode.data.templateRef ? Object.keys(tempNode.data.templateRef) : []
            });
    
    // TemplateEditorDialogを開く
    setTemplateEditNode(tempNode);
    setTemplateEditorOpen(true);
  }, []);

  // テンプレート追加ハンドラー
  const handleTemplateAdd = useCallback((category: string) => {
    console.log('➕ [PetriNetEditorInner] テンプレート追加:', category);
    
    // 新規テンプレート用の仮ノードを作成
    const timestamp = Date.now();
    const newId = `${category}Template_${timestamp}`;
    
            const tempNode: Node<NodeData> = {
              id: newId,
              type: category === 'material' ? 'materialTemplate' :
                    category === 'condition' ? 'conditionTemplate' : 'resultTemplate',
              position: { x: 0, y: 0 }, // ✅ 追加: position必須
              data: {
                id: newId,
                name: '',
                description: '',
                nodeType: 'place' as NodeType,
                placeType: category,
                template: {
                  id: newId,
                  name: '',
                  description: '',
                  category: category === 'material' ? 'material' :
                    category === 'condition' ? 'condition' : 'result',
                  uuid: uuidv4(),
                  placeRefs: [],
                  templateRef: undefined,
                  properties: [],
                  contents: []
                },
                templateRef: {
                  id: newId,
                  name: '',
                  description: '',
                  category: category === 'material' ? 'material' :
                    category === 'condition' ? 'condition' : 'result',
                  uuid: uuidv4(),
                  placeRefs: [],
                  templateRef: undefined,
                  properties: [],
                  contents: []
                },
                // 新規作成フラグ
                isNewTemplate: true,
                templateCategory: category,
                // 共通テンプレート/メソッド内テンプレートの判定
                isCommonTemplate: showCommonTemplates,
                methodId: showCommonTemplates ? null : (methods[activeMethodIndex]?.methodId || null),
              },
            };
    
    console.log('✅ [PetriNetEditorInner] 新規テンプレート仮ノード作成:', {
      id: newId,
      category,
      isCommonTemplate: tempNode.data.isCommonTemplate,
      methodId: tempNode.data.methodId,
    });
    
    // TemplateEditorDialogを開く
    setTemplateEditNode(tempNode);
    setTemplateEditorOpen(true);
  }, [showCommonTemplates, methods, activeMethodIndex]);

  // テンプレート削除ハンドラー
  const handleTemplateDelete = useCallback((templateId: string) => {
    console.log('🗑️ [PetriNetEditorInner] テンプレート削除:', templateId);
    
    if (!window.confirm(`テンプレート「${templateId}」を削除しますか？\nこの操作は元に戻せません。`)) {
      return;
    }
    
    // TemplateContextから削除（window.clineDeleteTemplateを使用）
    if (window.clineDeleteTemplate) {
      window.clineDeleteTemplate(templateId);
      console.log('✅ [PetriNetEditorInner] テンプレート削除完了');
    } else {
      console.error('❌ [PetriNetEditorInner] deleteTemplate関数が見つかりません');
    }
  }, []);

  // Draft読み込みハンドラー
  const handleLoadDraft = useCallback((draft: Draft) => {
    console.log('📖 [PetriNetEditorInner] Draft読み込み:', draft);
    
    try {
      // Draftからノードとエッジを復元
      const loadedNodes = draft.nodes || [];
      const loadedArcs = draft.edges || []; // arcsキーを優先、後方互換のためedgesもチェック
      
      console.log('🔍 [PetriNetEditorInner] Draft読み込みデータ:', {
        nodesCount: loadedNodes.length,
        arcsCount: loadedArcs.length,
        arcsSample: loadedArcs.slice(0, 3)
      });
      
      // エッジにスタイルとマーカーを追加
      const styledEdges : Edge<EdgeData>[] = loadedArcs.map(edge => ({
        ...edge,
        type: 'default',
        animated: false,
        style: { 
          stroke: '#333',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#333',
          width: 20,
          height: 20,
        },
      }));
      
      setNodes(loadedNodes);
      setEdges(styledEdges);
      
      // Document情報も復元
      if (draft.documentData) {
        setDocumentData(draft.documentData);
      }
      
      // 履歴をリセット
      reset({ nodes: loadedNodes, edges: styledEdges });
      
      console.log('✅ [PetriNetEditorInner] Draft読み込み完了:', {
        nodesCount: loadedNodes.length,
        edgesCount: styledEdges.length,
        hasDocument: !!draft.documentData,
      });
      
      // フィットビュー
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [PetriNetEditorInner] バリデーションエラー:', errorMessage);
      alert(`バリデーション実行に失敗しました: ${errorMessage}`);
    }
  }, [setNodes, setEdges, reset, fitView]);

  // Method切り替えハンドラー
  const handleMethodChange = useCallback((newIndex: number) => {
    console.log('🔄 [PetriNetEditorInner] Method切り替え:', { from: activeMethodIndex, to: newIndex });
    
    // 1. 現在のmethod状態を保存（ビューポート含む）
    const currentViewport = getViewport();
    setMethods(prev => {
      const updated = [...prev];
      updated[activeMethodIndex] = {
        ...updated[activeMethodIndex],
        nodes: nodes,
        edges: edges,
        viewport: currentViewport
      };
      return updated;
    });
    
    // 2. 新しいmethodのノード/エッジを読み込み
    const newMethod = methods[newIndex];
    setNodes(newMethod.nodes);
    setEdges(newMethod.edges);
    setActiveMethodIndex(newIndex);
    
    // 3. ビューポート復元
    if (newMethod.viewport) {
      setTimeout(() => {
        setViewport(newMethod.viewport);
      }, 50);
    }
    
    console.log('✅ [PetriNetEditorInner] Method切り替え完了:', {
      methodId: newMethod.methodId,
      nodesCount: newMethod.nodes.length,
      edgesCount: newMethod.edges.length
    });
  }, [methods, activeMethodIndex, nodes, edges, setNodes, setEdges, getViewport, setViewport]);

  // Method追加ハンドラー
  const handleAddMethod = useCallback(() => {
    console.log('➕ [PetriNetEditorInner] Method追加');
    
    const timestamp = Date.now();
    const newMethod = {
      methodId: `method_${timestamp}`,
      methodIndex: methods.length,
      name: `Method ${methods.length + 1}`,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };
    
    // 現在のmethod状態を保存
    const currentViewport = getViewport();
    setMethods(prev => {
      const updated = [...prev];
      updated[activeMethodIndex] = {
        ...updated[activeMethodIndex],
        nodes: nodes,
        edges: edges,
        viewport: currentViewport
      };
      return [...updated, newMethod];
    });
    
    // 新しいmethodに切り替え
    setNodes([]);
    setEdges([]);
    setActiveMethodIndex(methods.length);
    setMultiMethodMode(true);
    
    console.log('✅ [PetriNetEditorInner] Method追加完了:', newMethod);
  }, [methods, activeMethodIndex, nodes, edges, getViewport, setNodes, setEdges]);

  // Method削除ハンドラー
  const handleDeleteMethod = useCallback((index: number) => {
    console.log('🗑️ [PetriNetEditorInner] Method削除:', index);
    
    if (methods.length === 1) {
      alert('最後のMethodは削除できません。');
      return;
    }
    
    const newMethods = methods.filter((_, i) => i !== index);
    setMethods(newMethods);
    
    // アクティブなmethodを調整
    if (index === activeMethodIndex) {
      const newIndex = index > 0 ? index - 1 : 0;
      setActiveMethodIndex(newIndex);
      setNodes(newMethods[newIndex].nodes);
      setEdges(newMethods[newIndex].edges);
      console.log('✅ [PetriNetEditorInner] アクティブなMethodを削除、切り替え:', newIndex);
    } else if (index < activeMethodIndex) {
      setActiveMethodIndex(activeMethodIndex - 1);
      console.log('✅ [PetriNetEditorInner] 前方のMethod削除、インデックス調整');
    }
    
    console.log('✅ [PetriNetEditorInner] Method削除完了');
  }, [methods, activeMethodIndex, setNodes, setEdges]);

  // Method ID編集ハンドラー
  const handleEditMethodId = useCallback((index: number, newMethodId: string) => {
    console.log('✏️ [PetriNetEditorInner] Method ID編集:', { index, newMethodId });
    
    setMethods(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        methodId: newMethodId
      };
      return updated;
    });
    
    console.log('✅ [PetriNetEditorInner] Method ID編集完了');
  }, []);

  // ワークフロー追加モード切り替え
  const handleWorkflowModeToggle = useCallback(() => {
    if (selectedTool === 'workflow') {
      // モード解除
      setSelectedTool('select');
      setPendingClickPosition(null);
      console.log('🔄 [PetriNetEditorInner] ワークフロー追加モード解除');
    } else {
      // モード有効化
      setSelectedTool('workflow');
      console.log('🔄 [PetriNetEditorInner] ワークフロー追加モード有効化（キャンバスクリックを待機中）');
    }
  }, [selectedTool]);

  // ワークフロー追加ダイアログを閉じる
  const handleCloseWorkflowDialog = useCallback(() => {
    setWorkflowDialogOpen(false);
    setAvailableFiles([]);
  }, []);

  // ワークフローファイル選択ハンドラー
  const handleWorkflowFileSelect = useCallback(async (file: FileInfo) => {
    console.log('📂 [PetriNetEditorInner] ワークフローファイル選択:', file);
    
    try {
      // ✅ 修正: maimlServiceのgetStorageFileContentを使用
      const response = await maimlService.getStorageFileContent(file.key);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'ファイル内容取得に失敗しました');
      }
      
      // ✅ 修正: FileContentResponseはdataプロパティにネストされている
      const maimlContent = response.data.data.content;
      
      console.log('✅ [PetriNetEditorInner] MaiMLファイル取得完了:', {
        fileKey: file.key,
        contentLength: maimlContent.length
      });
      
      // クリック位置を使用（保存されている場合）、なければキャンバス中央
      const targetPosition = pendingClickPosition || {
        x: 400,
        y: 300,
      };
      
      console.log('🎯 [PetriNetEditorInner] ワークフロー追加位置:', targetPosition);
      
      // ワークフロー追加実行
      const result2 = await addWorkflow(targetPosition, maimlContent, file.name);
      
      if (result2.success) {
        // ✅ 修正: ReactFlowのstateに追加分をマージ（置き換えではなく追加）
        // addWorkflow内部のsetNodes/setEdgesはuseWorkflow内部stateを更新するが、
        // PetriNetEditorInnerのReactFlow stateには反映されないため、ここで明示的に追加する
        if (result2.nodes && result2.edges) {
          setNodes(prev => [...prev, ...result2.nodes!]);
          setEdges(prev => [...prev, ...result2.edges!]);
        }

        // ✅ 修正: ワークフローのテンプレートを TemplateContext に追加
        // addWorkflow が返す templates を window.clineAddTemplate で登録しないと
        // 保存時の window.clineAllTemplates に含まれずテンプレートが消える
        if (result2.templates && window.clineAddTemplate) {
          const currentMethodId = methods[activeMethodIndex]?.methodId;
          console.log('📋 [PetriNetEditorInner] ワークフローテンプレートをContextに追加:', {
            material: result2.templates.material.length,
            condition: result2.templates.condition.length,
            result: result2.templates.result.length,
            currentMethodId,
          });

          const registerTemplates = (
            category: 'material' | 'condition' | 'result',
            templateList: import('../../types/maiml-unified').Template[]
          ) => {
            templateList.forEach(t => {
              // methodId が未設定の場合はアクティブメソッドの ID を補完
              const templateWithMethodId = {
                ...t,
                methodId: t.methodId !== undefined ? t.methodId : currentMethodId,
              };
              window.clineAddTemplate({
                category,
                template: templateWithMethodId,
              });
              console.log(`  ✅ [PetriNetEditorInner] ${category}テンプレート追加: ${t.id} (methodId: ${templateWithMethodId.methodId})`);
            });
          };

          registerTemplates('material', result2.templates.material);
          registerTemplates('condition', result2.templates.condition);
          registerTemplates('result', result2.templates.result);
        }

        console.log('✅ [PetriNetEditorInner] ワークフロー追加完了:', result2.message);
        alert(result2.message);
        
        // ワークフローモード解除
        setSelectedTool('select');
        setPendingClickPosition(null);
      } else {
        throw new Error(result2.error);
      }
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [PetriNetEditorInner] ワークフロー追加エラー:', errorMessage);
      alert(`ワークフロー追加に失敗しました: ${errorMessage}`);
      // エラー時もモード解除
      setSelectedTool('select');
      setPendingClickPosition(null);
      throw err;
    }
  }, [addWorkflow, pendingClickPosition]);


  // Week1: 新保存ダイアログを閉じる
  const handleCloseSaveConfirmDialog = useCallback(() => {
    if (!isSaving) {
      setSaveConfirmDialogOpen(false);
      setValidationResult(null);
    }
  }, [isSaving]);

  // Week2: ValidationPanelを開く（バリデーション実行）
  const handleOpenValidationPanel = useCallback(async () => {
    console.log('📋 [PetriNetEditorInner] ValidationPanelを開く - バリデーション実行');

    // ⭐ Phase 2: フォールバック由来の変換エラーが既にある場合はAPIを呼ばずそのまま表示
    if (validationResult && validationResult.errors?.some(e => e.type === 'unknown_element')) {
      console.log('ℹ️ [handleOpenValidationPanel] 変換エラー結果を再利用（APIスキップ）');
      setValidationPanelOpen(true);
      return;
    }
    
    try {
      setIsValidating(true);
      
      // MaiML生成
      const metadata = {
        name: documentData?.name || 'document',
        description: documentData?.description || '',
      };
      
      // ✅ TemplateContextからallTemplatesを取得
      const allTemplatesFromContext = window.clineAllTemplates || null;
      
      // ✅ 複数メソッド対応: 現在のmethod状態を保存してallMethodsを作成
      const currentViewport = getViewport();
      const updatedMethods = [...methods];
      updatedMethods[activeMethodIndex] = {
        ...updatedMethods[activeMethodIndex],
        nodes: nodes,
        edges: edges,
        viewport: currentViewport
      };
      
      let maimlXml;
      
      // ✅ 複数method対応: multiMethodModeの場合は全methodsでバリデーション
      if (multiMethodMode && methods.length > 0) {
        console.log('📋 [handleOpenValidationPanel] 複数methodモード: convertMultipleMethodsToMaiMLを使用');
        maimlXml = convertMultipleMethodsToMaiML(updatedMethods, metadata, documentData, allTemplatesFromContext);
        console.log('✅ [handleOpenValidationPanel] convertMultipleMethodsToMaiML完了');
      } else {
        console.log('📋 [handleOpenValidationPanel] 単一methodモード: convertReactFlowToMaiMLを使用');
        maimlXml = await convertReactFlowToMaiML(nodes, edges, metadata, documentData ?? null, null, allTemplatesFromContext);
        console.log('✅ [handleOpenValidationPanel] convertReactFlowToMaiML完了');
      }
      
      // Base64エンコード
      const bytes = new TextEncoder().encode(maimlXml);
      const base64Data = btoa(String.fromCharCode(...bytes));
      
      console.log('🔍 [handleOpenValidationPanel] バリデーションAPI呼び出し');
      const response = await maimlService.validateMaiml(base64Data);
      
      if (!response.success) {
        throw new Error(`バリデーションエラー: ${response.error}`);
      }
      
      const result = response.data as AnalysisResult;
      
      console.log('✅ [handleOpenValidationPanel] バリデーション完了:', {
        errors: result.errors?.length || 0,
        warnings: result.warnings?.length || 0,
      });
      
      // バリデーション結果を保存
      setValidationResult(result);
      
      // ✅ 修正: 状態更新後にValidationPanelを開く（次のレンダリングサイクル）
      setTimeout(() => {
        setValidationPanelOpen(true);
      }, 0);
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [handleOpenValidationPanel] バリデーションエラー:', errorMessage);
      alert(`バリデーション実行に失敗しました: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  }, [nodes, edges, documentData]);

  // Week2: ValidationPanelを閉じる
  const handleCloseValidationPanel = useCallback(() => {
    setValidationPanelOpen(false);
  }, []);

  // Week2: 自動補正実行
  const handleAutoCorrect = useCallback(async (selectedErrors: number[]) => {
    try {
      console.log('🔧 [PetriNetEditorInner] 自動補正実行:', selectedErrors);
      setIsCorrecting(true);
      
      // MaiML生成
      const metadata = {
        name: documentData?.name || 'Untitled',
        description: documentData?.description || '',
      };
      const maimlXml = await convertReactFlowToMaiML(nodes, edges, metadata, documentData);
      
      // Base64エンコード
      const base64Data = btoa(unescape(encodeURIComponent(maimlXml)));
      
      // 自動補正API呼び出し（新APIエンドポイント使用）
      const userInfoStr3 = localStorage.getItem('userInfo');
      const userInfo3 = userInfoStr3 ? JSON.parse(userInfoStr3) : null;
      const currentOrgId = userInfo3?.organizationId || null;
      
      if (!currentOrgId) {
        throw new Error('組織IDが取得できません');
      }
      
      const response = await maimlService.autoCorrectMaimlRealtime(
        base64Data,
        selectedErrors,
        currentOrgId
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '自動補正に失敗しました');
      }
      
      console.log('✅ [PetriNetEditorInner] 自動補正完了');
      
      // 補正結果を反映する場合はここで処理
      // （現在は簡易実装のため、再検証を促すのみ）
      alert('自動補正が完了しました。再検証を実行してください。');
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [PetriNetEditorInner] 自動補正エラー:', errorMessage);
      alert(`自動補正に失敗しました: ${errorMessage}`);
    } finally {
      setIsCorrecting(false);
    }
  }, [nodes, edges, documentData]);

  // Week2: 再検証実行
  const handleRevalidate = useCallback(async () => {
    // ValidationPanelを開いたまま再検証
    await handleOpenValidationPanel();
  }, [handleOpenValidationPanel]);

  // Week1: SaveConfirmDialogからの保存アクション処理
  const handleSaveConfirmAction = useCallback(async (action: string, saveDestination: string, folder?: string) => {
    console.log('💾 [PetriNetEditorInner] SaveConfirmAction開始:', { action, saveDestination, folder });
    console.log('🔍 [PetriNetEditorInner] documentData:', documentData);
    console.log('🔍 [PetriNetEditorInner] multiMethodMode:', multiMethodMode);
    console.log('🔍 [PetriNetEditorInner] nodes数:', nodes.length);
    console.log('🔍 [PetriNetEditorInner] edges数:', edges.length);
    
    // キャンセル
    if (action === 'cancel') {
      handleCloseSaveConfirmDialog();
      return;
    }
    
    try {
      console.log('🔍 [PetriNetEditorInner] 保存処理開始');
      setIsSaving(true);
      
      // MaiML生成（Document要素なし、V1互換）
      const metadata = {
        name: documentData?.name || 'document',
        description: documentData?.description || '',
      };
      console.log('💾 [PetriNetEditorInner] 保存時のmetadata:', metadata);
      
      let maimlXml;
      
      console.log('🔍 [PetriNetEditorInner] MaiML生成開始');
      
      // ✅ TemplateContextからallTemplatesを取得
      const allTemplatesFromContext = window.clineAllTemplates || null;
      console.log('🔍 [handleSaveConfirmAction] allTemplates取得:', {
        hasAllTemplates: !!allTemplatesFromContext,
        material: allTemplatesFromContext?.material?.length || 0,
        condition: allTemplatesFromContext?.condition?.length || 0,
        result: allTemplatesFromContext?.result?.length || 0
      });
      
      // ✅ 複数method対応: multiMethodModeの場合は全methodsを保存
      if (multiMethodMode && methods.length > 0) {
        console.log('📋 [PetriNetEditorInner] 複数methodモード: convertMultipleMethodsToMaiMLを使用');
        
        // 現在のmethod状態を保存
        const currentViewport = getViewport();
        const updatedMethods = [...methods];
        updatedMethods[activeMethodIndex] = {
          ...updatedMethods[activeMethodIndex],
          nodes: nodes,
          edges: edges,
          viewport: currentViewport
        };
        
        console.log('📋 [PetriNetEditorInner] 保存するmethod数:', updatedMethods.length);

        // Method[]を直接渡す（convertMultipleMethodsToMaiMLはMethod[]を期待）
        console.log('🔍 [PetriNetEditorInner] convertMultipleMethodsToMaiML呼び出し');
        maimlXml = convertMultipleMethodsToMaiML(updatedMethods, metadata, documentData, allTemplatesFromContext);
        console.log('✅ [PetriNetEditorInner] convertMultipleMethodsToMaiML完了');
      } else {
        console.log('📋 [PetriNetEditorInner] 単一methodモード: convertReactFlowToMaiMLを使用');
        
        // 単一method用コンバーター使用（allTemplatesを渡す）
        console.log('🔍 [PetriNetEditorInner] convertReactFlowToMaiML呼び出し');
        maimlXml = await convertReactFlowToMaiML(nodes, edges, metadata, documentData ?? null, null, allTemplatesFromContext);
        console.log('✅ [PetriNetEditorInner] convertReactFlowToMaiML完了');
      }
      
      console.log('✅ [PetriNetEditorInner] MaiML生成完了:', {
        xmlLength: maimlXml?.length || 0,
        xmlPreview: maimlXml?.substring(0, 200) || 'EMPTY'
      });
      
      // 自動補正の場合
      if (action === 'auto-correct') {
        console.log('🔧 [PetriNetEditorInner] 自動補正実行');
        
        // Base64エンコード
        const base64Data = btoa(unescape(encodeURIComponent(maimlXml)));
        
        // 自動補正API呼び出し（新APIエンドポイント使用）
        const userInfoStr4 = localStorage.getItem('userInfo');
        const userInfo4 = userInfoStr4 ? JSON.parse(userInfoStr4) : null;
        const currentOrgId = userInfo4?.organizationId || null;
        
        if (!currentOrgId) {
          throw new Error('組織IDが取得できません');
        }
        
        const response = await maimlService.autoCorrectMaimlRealtime(
          base64Data,
          [], // selectedErrors: 空配列（全エラーを補正）
          currentOrgId
        );
        
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || '自動補正に失敗しました');
        }
        
        // 補正されたMAIMLを取得（Base64デコード）
        if (response.data.correctedContent) {
          maimlXml = atob(response.data.correctedContent);
          console.log('✅ [PetriNetEditorInner] 自動補正完了');
        }
      }
      
      // 保存先に応じて処理を分岐
      if (saveDestination === 's3') {
        // S3保存
        console.log('☁️ [PetriNetEditorInner] S3に保存:', folder);
        console.log('🔍 [PetriNetEditorInner] sourceS3Key:', props.sourceS3Key);
        
        const userInfoStr5 = localStorage.getItem('userInfo');
        const userInfo5 = userInfoStr5 ? JSON.parse(userInfoStr5) : null;
        const currentOrgId = userInfo5?.organizationId || null;
        
        // ファイル名決定（DocumentEditDialogで設定した名前 > 元のファイル名 > デフォルト）
        const baseFileName = documentData?.name 
          || props.originalFileName?.replace('.maiml', '') 
          || 'document';
        const fileName = `${baseFileName}.maiml`;
        
        // フォルダ決定（SaveConfirmDialogで選択されたフォルダ、なければ元のS3Keyのフォルダ、最後にデフォルト）
        let fileKey;
        if (folder) {
          // ユーザーが選択したフォルダ
          fileKey = `${folder}/${fileName}`;
        } else if (props.sourceS3Key) {
          // 元のS3Keyからフォルダ部分を抽出
          const folderPart = props.sourceS3Key.substring(0, props.sourceS3Key.lastIndexOf('/'));
          fileKey = folderPart ? `${folderPart}/${fileName}` : `${currentOrgId}/${fileName}`;
        } else {
          // デフォルト（組織ルート）
          fileKey = `${currentOrgId}/${fileName}`;
        }
        
        console.log('💾 [PetriNetEditorInner] S3保存先:', { fileName, fileKey });

        const base64Data = btoa(unescape(encodeURIComponent(maimlXml)));
        
        // editModeに応じてarchiveパラメータを設定
        // 'project' → true（アーカイブ化）, 'format' → false（上書き）
        const archive = editMode === 'project';
        console.log('💾 [PetriNetEditorInner] アーカイブ設定:', { editMode, archive });
        
        // S3ファイル保存API
        const response = await maimlService.saveMaiml(fileKey, base64Data, archive)
        
        if (!response.success) {
          const errorData = response.error;
          throw new Error(errorData?.message || `S3保存に失敗しました ()`);
        }
        
        const result = response.data;
        console.log('✅ [PetriNetEditorInner] S3保存完了:', result);

        alert(`ペトリネット "${metadata.name}" をS3に保存しました`);

        // S3保存成功時のみDraftを全削除（自動保存Draftをクリア）
        try {
          const currentDrafts = await fetchDrafts();
          if (currentDrafts && currentDrafts.length > 0) {
            console.log(`🗑️ [PetriNetEditorInner] S3保存成功のためDraftを全削除: ${currentDrafts.length}件`);
            for (const draft of currentDrafts) {
              await deleteDraft(draft.draftKey);
            }
            console.log('✅ [PetriNetEditorInner] Draft全削除完了');
          }
        } catch (draftErr) {
          // Draft削除失敗はサイレントに無視（保存自体は成功しているため）
          console.warn('⚠️ [PetriNetEditorInner] 保存後のDraft削除に失敗（無視）:', draftErr);
        }
        
      } else {
        // ローカルダウンロード
        console.log('📥 [PetriNetEditorInner] ローカルダウンロード');
        console.log('🔍 [PetriNetEditorInner] documentData:', documentData);
        console.log('🔍 [PetriNetEditorInner] metadata:', metadata);
        console.log('🔍 [PetriNetEditorInner] originalFileName:', props.originalFileName);
        
        // ファイル名を決定（優先順位: DocumentEditDialogで設定した名前 > 元のファイル名 > デフォルト）
        let fileName = documentData?.name 
          || props.originalFileName?.replace('.maiml', '') 
          || 'document';
        console.log('🔍 [PetriNetEditorInner] Raw fileName:', fileName);
        
        // 不正な文字を置換
        fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
        console.log('🔍 [PetriNetEditorInner] Sanitized fileName:', fileName);
        
        // Blob生成
        const blob = new Blob([maimlXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        // ダウンロード実行
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.maiml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // URLを解放
        URL.revokeObjectURL(url);
        
        console.log('✅ [PetriNetEditorInner] ローカルダウンロード完了:', `${fileName}.maiml`);
        
        alert(`ペトリネット "${fileName}" をダウンロードしました`);
      }
      
      // 保存成功: 未保存フラグをリセット
      onContentSaved?.();
      
      // ダイアログを閉じる
      setSaveConfirmDialogOpen(false);
      setValidationResult(null);
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [PetriNetEditorInner] 保存エラー詳細:', {
        message: errorMessage,
        error: err instanceof Error ? {
          name: err.name,
          message: err.message,
          stack: err.stack
        } : { raw: String(err) }
      });
      alert(`保存に失敗しました: ${errorMessage}\n\n詳細はコンソールログを確認してください。`);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, documentData, handleCloseSaveConfirmDialog, onContentSaved]);

  // エッジ選択ハンドラー（Phase 3: エッジ選択でPropertyPanel表示）
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge<EdgeData>) => {
    console.log('🔗 [PetriNetEditorInner] エッジ選択:', {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data
    });
    
    // エッジ選択時はノード選択をクリア
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, []);

  // ローディング表示
  const { token } = theme.useToken();
  
  if (isLoading) {
    return (
      <Flex 
        vertical 
        align="center" 
        justify="center" 
        gap="middle"
        style={{ height: '100%' }}
      >
        <Spin size="large" />
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          ペトリネットを読み込んでいます...
        </Typography.Text>
      </Flex>
    );
  }

  // Phase 3: 致命的エラーのみ表示を停止
  if (criticalErrors.length > 0) {
    return (
      <Flex 
        vertical 
        align="center" 
        justify="center" 
        gap="large"
        style={{ height: '100%', padding: token.paddingLG }}
      >
        <Alert
          type="error"
          title="致命的なエラーが発生しました"
          description="ペトリネットを表示できません。"
          showIcon
          style={{ maxWidth: 600, width: '100%' }}
        />
        <Space orientation="vertical" style={{ width: '100%', maxWidth: 600 }}>
          {criticalErrors.map((err, idx) => (
            <Alert 
              key={idx} 
              type="error" 
              title={err.message}
              showIcon
            />
          ))}
        </Space>
      </Flex>
    );
  }

  // 従来のエラー表示（非致命的エラーとして扱う）
  if (error && criticalErrors.length === 0) {
    return (
      <Flex 
        align="center" 
        justify="center" 
        style={{ height: '100%', padding: token.paddingLG }}
      >
        <Alert
          type="error"
          title={error}
          showIcon
          style={{ maxWidth: 600 }}
        />
      </Flex>
    );
  }

  // 通常の編集画面表示（新規作成時も含む）
  // AttributeDisplayProvider → TemplateProvider の順でラップ
  return (
    <AttributeDisplayProvider>
    <TemplateProvider 
      maimlData={maimlData} 
      validationResult={validationResult}
      activeMethodIndex={activeMethodIndex}
      methods={methods}
    >
      <PetriNetEditorInnerUI
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        handleNodeClick={handleNodeClick}
        handleEdgeClick={handleEdgeClick}
        handleNodesDelete={handleNodesDelete}
        handleEdgesDelete={handleEdgesDelete}
        handleConnect={handleConnect}
        handleNodeDragStop={handleNodeDragStop}
        handleSelectionChange={handleSelectionChange}
        handlePaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        pressedKeys={pressedKeys}
        methods={methods}
        multiMethodMode={multiMethodMode}
        activeMethodIndex={activeMethodIndex}
        handleMethodChange={handleMethodChange}
        handleAddMethod={handleAddMethod}
        handleEditMethodId={handleEditMethodId}
        handleDeleteMethod={handleDeleteMethod}
        nonCriticalErrors={nonCriticalErrors}
        handleOpenValidationPanel={handleOpenValidationPanel}
        handleAddNode={handleAddNode}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        handleOpenSaveConfirmDialog={handleOpenSaveConfirmDialog}
        handleOpenDocumentEditor={handleOpenDocumentEditor}
        isValidating={isValidating}
        handleWorkflowModeToggle={handleWorkflowModeToggle}
        selectedTool={selectedTool}
        handleOpenDraftManager={handleOpenDraftManager}
        autoSaveEnabled={autoSaveEnabled}
        setAutoSaveEnabled={setAutoSaveEnabled}
        onAutoSaveToggle={handleAutoSaveToggle}
        lastAutoSaveTime={lastAutoSaveTime}
        viewMode={viewMode}
        handleViewModeChange={handleViewModeChange}
        handleTemplateSelect={handleTemplateSelect}
        handleTemplateAdd={handleTemplateAdd}
        handleTemplateDelete={handleTemplateDelete}
        showCommonTemplates={showCommonTemplates}
        setShowCommonTemplates={setShowCommonTemplates}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        handleUpdateNodeProperty={handleUpdateNodeProperty}
        handleUpdateNodeId={handleUpdateNodeId}
        handleUpdateEdgeProperty={handleUpdateEdgeProperty}
        handleClosePropertyPanel={handleClosePropertyPanel}
        handleOpenTemplateEditor={handleOpenTemplateEditor}
        handleDeleteNode={handleDeleteNode}
        handleDeleteEdge={handleDeleteEdge}
        saveConfirmDialogOpen={saveConfirmDialogOpen}
        validationResult={validationResult}
        handleCloseSaveConfirmDialog={handleCloseSaveConfirmDialog}
        handleSaveConfirmAction={handleSaveConfirmAction}
        isSaving={isSaving}
        templateEditorOpen={templateEditorOpen}
        handleCloseTemplateEditor={handleCloseTemplateEditor}
          templateEditNode={templateEditNode}
          handleSaveTemplate={handleSaveTemplate}
        documentDialogOpen={documentDialogOpen}
        documentData={documentData}
        handleCloseDocumentEditor={handleCloseDocumentEditor}
        handleSaveDocument={handleSaveDocument}
        validationPanelOpen={validationPanelOpen}
        handleCloseValidationPanel={handleCloseValidationPanel}
        handleAutoCorrect={handleAutoCorrect}
        handleRevalidate={handleRevalidate}
        isCorrecting={isCorrecting}
        workflowDialogOpen={workflowDialogOpen}
        handleCloseWorkflowDialog={handleCloseWorkflowDialog}
        handleWorkflowFileSelect={handleWorkflowFileSelect}
        availableFiles={availableFiles}
        draftManagerOpen={draftManagerOpen}
        handleCloseDraftManager={handleCloseDraftManager}
        handleLoadDraft={handleLoadDraft}
        lastSavedDraft={lastSavedDraft}
        currentEditState={currentEditState}
        currentUserId={currentUserId}
        sourceS3Key={props.sourceS3Key}
        projectId={initialDocumentId}
        lastAddedNodeId={lastAddedNodeId}
      />
    </TemplateProvider>
    </AttributeDisplayProvider>
  );
};

// PetriNetEditorInnerUI Props型定義
interface PetriNetEditorInnerUIProps {
  // React Flow関連
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge<EdgeData>[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  
  // イベントハンドラ
  handleNodeClick: (event: React.MouseEvent, node: Node<NodeData>) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: Edge<EdgeData>) => void;
  handleNodesDelete: (nodes: Node<NodeData>[]) => void;
  handleEdgesDelete: (edges: Edge<EdgeData>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleNodeDragStop: (event: React.MouseEvent, node: Node<NodeData>) => void;
  handleSelectionChange: (params: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
  handlePaneClick: (event: React.MouseEvent) => void;
  
  // Node Types
  nodeTypes: NodeTypes;
  
  // キーボード
  pressedKeys: Set<string>;
  
  // Method管理
  methods: MethodData[];
  multiMethodMode: boolean;
  activeMethodIndex: number;
  handleMethodChange: (index: number) => void;
  handleAddMethod: () => void;
  handleEditMethodId: (index: number, newMethodId: string) => void;
  handleDeleteMethod: (index: number) => void;
  
  // バリデーション
  nonCriticalErrors: ErrorContent[];
  handleOpenValidationPanel: () => void;
  
  // ツールバー
  handleAddNode: (nodeType: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  handleOpenSaveConfirmDialog: () => void;
  handleOpenDocumentEditor: () => void;
  isValidating: boolean;
  handleWorkflowModeToggle: () => void;
  selectedTool: 'select' | 'workflow';
  handleOpenDraftManager: () => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  onAutoSaveToggle: (enabled: boolean) => void;
  lastAutoSaveTime: Date | null;
  
  // ビューモード
  viewMode: 'petriNet' | 'templates' | 'xml';
  handleViewModeChange: (mode: 'petriNet' | 'templates' | 'xml') => void;
  handleTemplateSelect: (template: Template) => void;
  handleTemplateAdd: (category: string) => void;
  handleTemplateDelete: (templateId: string) => void;
  showCommonTemplates: boolean;
  setShowCommonTemplates: (show: boolean) => void;
  
  // PropertyPanel
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  handleUpdateNodeProperty: (nodeId: string, newData: NodeData) => void;
  handleUpdateNodeId: (oldId: string, newId: string) => void;
  handleUpdateEdgeProperty: (edgeId: string, newId: string) => void;
  handleClosePropertyPanel: () => void;
  handleOpenTemplateEditor: (node: Node<NodeData>) => void;
  handleDeleteNode: (nodeId: string) => void;
  handleDeleteEdge: (edgeId: string) => void;
  
  // ダイアログ
  saveConfirmDialogOpen: boolean;
  validationResult: AnalysisResult | null;
  handleCloseSaveConfirmDialog: () => void;
  handleSaveConfirmAction: (action: string, saveDestination: string, folder?: string) => void;
  isSaving: boolean;
  
  templateEditorOpen: boolean;
  handleCloseTemplateEditor: () => void;
  templateEditNode: Node<NodeData> | null;
  handleSaveTemplate: (
    nodeId: string,
    templateRef: Template,
    isNewTemplate: boolean,
    templateCategory: string,
    isCommonTemplate: boolean,
    methodId: string | undefined
  ) => void;
  
  documentDialogOpen: boolean;
  documentData: DocumentData | null;
  handleCloseDocumentEditor: () => void;
  handleSaveDocument: (newDocumentData: DocumentData) => void;
  
  validationPanelOpen: boolean;
  handleCloseValidationPanel: () => void;
  handleAutoCorrect: (selectedErrors: number[]) => void;
  handleRevalidate: () => void;
  isCorrecting: boolean;
  
  workflowDialogOpen: boolean;
  handleCloseWorkflowDialog: () => void;
  handleWorkflowFileSelect: (file: FileInfo) => void;
  availableFiles: Array<{ key: string; name: string; lastModified?: string; size?: number }>;
  
  draftManagerOpen: boolean;
  handleCloseDraftManager: () => void;
  handleLoadDraft: (draft: Draft) => void;
  lastSavedDraft: Draft | null;
  currentEditState: EditState;
  currentUserId: string;
  sourceS3Key?: string;
  /** プロジェクトID（DraftManagerに渡してDraft保存時にproject_idを記録する） */
  projectId?: string;
  /** MAIMLデータ（XMLビュー表示用） */
  maimlData?: string | null;
  /** 最後に追加したノードID（ミニマップ強調表示用） */
  lastAddedNodeId: string | null;
}

// UIレンダリングコンポーネント（TemplateProvider内）
const PetriNetEditorInnerUI: React.FC<PetriNetEditorInnerUIProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  handleNodeClick,
  handleEdgeClick,
  handleNodesDelete,
  handleEdgesDelete,
  handleConnect,
  handleNodeDragStop,
  handleSelectionChange,
  handlePaneClick,
  nodeTypes,
  pressedKeys,
  methods,
  activeMethodIndex,
  handleMethodChange,
  handleAddMethod,
  handleEditMethodId,
  handleDeleteMethod,
  nonCriticalErrors,
  handleOpenValidationPanel,
  handleAddNode,
  undo,
  redo,
  canUndo,
  canRedo,
  handleOpenSaveConfirmDialog,
  handleOpenDocumentEditor,
  isValidating,
  handleWorkflowModeToggle,
  selectedTool,
  handleOpenDraftManager,
  autoSaveEnabled,
  setAutoSaveEnabled,
  onAutoSaveToggle,
  lastAutoSaveTime,
  viewMode,
  handleViewModeChange,
  handleTemplateSelect,
  handleTemplateAdd,
  handleTemplateDelete,
  showCommonTemplates,
  setShowCommonTemplates,
  selectedNode,
  selectedEdge,
  handleUpdateNodeProperty,
  handleUpdateNodeId,
  handleUpdateEdgeProperty,
  handleClosePropertyPanel,
  handleOpenTemplateEditor,
  handleDeleteNode,
  handleDeleteEdge,
  saveConfirmDialogOpen,
  validationResult,
  handleCloseSaveConfirmDialog,
  handleSaveConfirmAction,
  templateEditorOpen,
  handleCloseTemplateEditor,
  templateEditNode,
  handleSaveTemplate,
  documentDialogOpen,
  documentData,
  handleCloseDocumentEditor,
  handleSaveDocument,
  validationPanelOpen,
  handleCloseValidationPanel,
  handleAutoCorrect,
  handleRevalidate,
  isCorrecting,
  workflowDialogOpen,
  handleCloseWorkflowDialog,
  handleWorkflowFileSelect,
  availableFiles,
  draftManagerOpen,
  handleCloseDraftManager,
  handleLoadDraft,
  lastSavedDraft,
  currentEditState,
  currentUserId,
  sourceS3Key,
  projectId,
  lastAddedNodeId,
}) => {
  // TemplateContextからtemplateErrors、addTemplate、deleteTemplate、updateTemplate、allTemplatesを取得
  const { templateErrors, addTemplate, deleteTemplate, updateTemplate, allTemplates } = useTemplates();
  
  // グローバルスコープに設定（TemplateEditorDialogからアクセスするため）
  React.useEffect(() => {
    window.clineAddTemplate = addTemplate;
    window.clineDeleteTemplate = deleteTemplate;
    window.clineUpdateTemplate = updateTemplate;
    window.clineAllTemplates = allTemplates;
    return () => {
      // @ts-expect-error - cleanup時のdelete操作
      if (window.clineAddTemplate) delete window.clineAddTemplate;
      // @ts-expect-error - cleanup時のdelete操作
      if (window.clineDeleteTemplate) delete window.clineDeleteTemplate;
      // @ts-expect-error - cleanup時のdelete操作
      if (window.clineUpdateTemplate) delete window.clineUpdateTemplate;
      // @ts-expect-error - cleanup時のdelete操作
      if (window.clineAllTemplates) delete window.clineAllTemplates;
    };
  }, [addTemplate, deleteTemplate, updateTemplate, allTemplates]);
  
  const { token } = theme.useToken();
  
  return (
    <Flex vertical style={{ height: '100%' }}>
        {/* Phase 3: 非致命的エラー警告バナー */}
        {nonCriticalErrors.length > 0 && (
          <Alert 
            type="warning"
            title={
              <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                <span>{nonCriticalErrors.length}件の警告があります</span>
                <button
                  onClick={handleOpenValidationPanel}
                  style={{
                    marginLeft: '8px',
                    padding: '4px 12px',
                    backgroundColor: token.colorWarning,
                    color: 'white',
                    border: 'none',
                    borderRadius: token.borderRadiusSM,
                    cursor: 'pointer',
                    fontSize: token.fontSizeSM,
                    fontWeight: 500,
                  }}
                >
                  詳細を表示
                </button>
              </Flex>
            }
            showIcon
            banner
            style={{ marginBottom: 0, borderRadius: 0 }}
          />
        )}
        
        {/* Phase 3A: 編集ツールバー + Phase 3C: Undo/Redo + Week1: 新保存機能 + Week2: バリデーション + Document編集 + ワークフロー追加 + ビュー切替 */}
          <EditorToolbar
          onAddNode={handleAddNode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSave={handleOpenSaveConfirmDialog}
          canSave={nodes.length > 0}
          onEditDocument={handleOpenDocumentEditor}
          onValidate={handleOpenValidationPanel}
          isValidating={isValidating}
          onAddWorkflow={handleWorkflowModeToggle}
          workflowModeActive={selectedTool === 'workflow'}
          onOpenDraftManager={handleOpenDraftManager}
          autoSaveEnabled={autoSaveEnabled}
          onAutoSaveToggle={onAutoSaveToggle}
          lastAutoSaveTime={lastAutoSaveTime !== null ? new Date(lastAutoSaveTime) : null}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        
        {/* Method管理タブUI - 共通テンプレート表示時は非表示 */}
        {methods.length > 0 && !showCommonTemplates && (
          <MethodTabPanel
            methods={methods}
            activeMethodIndex={activeMethodIndex}
            currentNodes={nodes}
            onChange={handleMethodChange}
            onAddMethod={handleAddMethod}
            onEditMethodId={handleEditMethodId}
            onDeleteMethod={handleDeleteMethod}
          />
        )}
        
        {/* React Flowキャンバス または テンプレート一覧 */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {viewMode === 'petriNet' ? (
            <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onNodesDelete={handleNodesDelete}
            onEdgesDelete={handleEdgesDelete}
            onConnect={handleConnect}
            onNodeDragStop={handleNodeDragStop}
            onSelectionChange={handleSelectionChange}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            // Phase 3A: 編集機能有効化
            nodesDraggable={true}
            nodesConnectable={true}
            nodesFocusable={true}
            edgesFocusable={true}
            elementsSelectable={true}
            deleteKeyCode="Delete"
            // Phase 3C-3: 複数選択有効化
            multiSelectionKeyCode="Control"
            selectionOnDrag={false}
            panOnDrag={true}
            panActivationKeyCode="Space"
            selectionMode={'partial' as SelectionMode}
            // ズーム・パン設定
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScroll={false}
            minZoom={0.1}
            maxZoom={4}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            // スタイル設定
            proOptions={{ hideAttribution: true }}
            // Phase 3C-3: ノード追加キー押下中のカーソル変更
            style={pressedKeys.size > 0 ? { cursor: 'crosshair' } : {}}
          >
            <Background 
              color="#aaa" 
              gap={16} 
              size={1}
              variant={'dots' as BackgroundVariant}
            />
            <Controls 
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(node) => {
                // PlaceTypeに応じて色を変更
                if (node.data && node.data.placeType) {
                  switch (node.data.placeType) {
                    case 'material':
                      return '#F8C471';
                    case 'condition':
                      return '#85C1E9';
                    case 'result':
                      return '#D7BDE2';
                    default:
                      return '#CCCCCC';
                  }
                }
                // Transitionの場合
                if (node.type === 'transition') {
                  return '#CCCCCC';
                }
                return '#E0E0E0';
              }}
              nodeStrokeColor={(node) =>
                node.id === lastAddedNodeId ? '#FF4444' : 'transparent'
              }
              nodeStrokeWidth={3}
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                backgroundColor: '#f5f5f5',
              }}
            />
          </ReactFlow>
          ) : viewMode === 'templates' ? (
            <TemplateList 
              onTemplateSelect={handleTemplateSelect}
              showCommonTemplates={showCommonTemplates}
              onShowCommonTemplatesChange={setShowCommonTemplates}
              onTemplateAdd={handleTemplateAdd}
              onTemplateDelete={handleTemplateDelete}
            />
          ) : viewMode === 'xml' ? (
            <XMLViewerWrapper
              nodes={nodes}
              edges={edges}
              documentData={documentData}
              multiMethodMode={false}
              methods={methods}
              activeMethodIndex={activeMethodIndex}
            />
          ) : null}

          {/* Phase 3B: プロパティパネル（ノード・エッジ対応） */}
          {(selectedNode || selectedEdge) && (
            <PropertyPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onUpdate={handleUpdateNodeProperty as (nodeId: string, data: NodeData) => void}
              onUpdateNodeId={handleUpdateNodeId}
              onUpdateEdge={handleUpdateEdgeProperty}
              onClose={handleClosePropertyPanel}
              onOpenTemplateEditor={handleOpenTemplateEditor}
              onDelete={handleDeleteNode}
              onDeleteEdge={handleDeleteEdge}
              nodes={nodes}
              edges={edges}
              methods={methods}
              activeMethodIndex={activeMethodIndex}
            />
          )}
        </div>

        {/* Week1: 新保存確認ダイアログ */}
        <SaveConfirmDialog
          open={saveConfirmDialogOpen}
          onClose={handleCloseSaveConfirmDialog}
          validationResult={validationResult}
          onSave={handleSaveConfirmAction}
          sourceFolder={
            sourceS3Key && sourceS3Key.lastIndexOf('/') > 0
              ? sourceS3Key.substring(0, sourceS3Key.lastIndexOf('/'))
              : undefined
          }
        />

        {/* Phase 4A: テンプレート編集ダイアログ */}
        <TemplateEditorDialog
          open={templateEditorOpen}
          onClose={handleCloseTemplateEditor}
          node={templateEditNode ?? { id: '', data: {} as NodeData }}
          onSave={(nodeId: string, templateRef: Template, isNewTemplate: boolean, templateCategory: string, isCommonTemplate: boolean, methodId: string | null) => handleSaveTemplate(nodeId, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId || undefined)}
          allNodes={(() => {
            // 共通テンプレートかどうかを判定
            const isCommonTemplate = 
              !templateEditNode?.data?.methodId ||
              showCommonTemplates;
            
            // ✅ 共通テンプレート：全methodsのnodesを返す
            // ✅ 通常テンプレート：現在のmethodのnodesのみ返す
            if (isCommonTemplate && methods.length > 0) {
              return methods.flatMap(method => method.nodes);
            }
            return nodes;
          })()}
          templateErrors={templateErrors}
        />

        {/* Document編集ダイアログ */}
        <DocumentEditDialog
          open={documentDialogOpen}
          documentData={documentData}
          onClose={handleCloseDocumentEditor}
          onSave={handleSaveDocument}
        />

        {/* Week2: ValidationPanel */}
        <ValidationPanel
          show={validationPanelOpen}
          validationResult={validationResult}
          onClose={handleCloseValidationPanel}
          onAutoCorrect={handleAutoCorrect}
          onRevalidate={handleRevalidate}
          isValidating={isValidating}
          isCorrecting={isCorrecting}
        />

        {/* ワークフロー選択ダイアログ */}
        <WorkflowSelectorDialog
          open={workflowDialogOpen}
          onClose={handleCloseWorkflowDialog}
          onSelect={async (file: FileInfo) => {
            await handleWorkflowFileSelect(file);
          }}
          availableFiles={availableFiles}
        />

        {/* Draft管理ダイアログ */}
        <DraftManager
          show={draftManagerOpen}
          onClose={handleCloseDraftManager}
          onLoadDraft={(draft) => {
            handleLoadDraft(draft as unknown as Draft);
          }}
          currentEditState={currentEditState}
          userId={currentUserId}
          autoSaveEnabled={autoSaveEnabled}
          onAutoSaveToggle={onAutoSaveToggle}
          currentDraftKey={lastSavedDraft?.draftKey || null}
          projectId={projectId}
        />
      </Flex>
  );
};

export interface PetriNetEditorInnerProps {
  maimlData: string | null;
  onError?: (error: Error) => void;
  editingFileName?: string;
  editMode: string;
  /**
   * 起動時に DraftManager を自動表示するかどうか
   * MAIMLファイルが存在せず、バックエンドDraftがある場合に使用
   */
  openDraftManagerOnStart?: boolean;
  /** DocumentData.id の初期値（新規作成時のみ適用） */
  initialDocumentId?: string;
  /** DocumentData.description の初期値（新規作成時のみ適用） */
  initialDescription?: string;
  originalFileName?: string;
  sourceS3Key?: string;
  /** コンテンツが変更されたときのコールバック（未保存変更フラグの設定用） */
  onContentChange?: () => void;
  /** 保存が完了したときのコールバック（未保存変更フラグのリセット用） */
  onContentSaved?: () => void;
  [key: string]: unknown;
}

// 外部コンポーネント
const PetriNetEditorInner = (props: PetriNetEditorInnerProps) => {
  return <PetriNetEditorContent {...props} />;
};

export default PetriNetEditorInner;
