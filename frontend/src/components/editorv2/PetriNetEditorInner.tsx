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
import { TemplateList } from './components/TemplateViewer';
import EditorToolbar from './components/EditorToolbar';
import MethodTabPanel from './components/MethodTabPanel';
import PropertyPanel from './components/PropertyPanel';
import TemplateEditorDialog from './components/TemplateEditorDialog';
import DocumentEditDialog from './components/DocumentEditDialog';
import WorkflowSelectorDialog from './components/WorkflowSelectorDialog';
import useHistory from './hooks/useHistory';
import { useWorkflow } from './hooks/useWorkflow';
import useDraftManager from './hooks/useDraftManager';
import SaveDialog from './components/SaveDialog';
import DraftManager from './components/DraftManager';
import SaveConfirmDialog from './components/SaveConfirmDialog';
import ValidationPanel from './components/ValidationPanel';
import { convertReactFlowToMaiML, validatePetriNet } from './utils/converters/reactFlowToMaiml';
import { convertMultipleMethodsToMaiML } from './utils/converters/multiMethodConverter';
// Viewer用ノードをインポート（既存の正しいノード描画）
import MaterialTemplateNode from '../nodes/MaterialTemplateNode';
import ConditionTemplateNode from '../nodes/ConditionTemplateNode';
import ResultTemplateNode from '../nodes/ResultTemplateNode';
import TransitionNode from '../nodes/TransitionNode';
import { buildTemplateMap } from '../../utils/petriNetExtractor';
import { convertToReactFlowFormat } from '../../utils/reactFlowConverter';
// Phase 3.2: documentParser.tsを削除し、maimlParserTyped.getDocument()を使用
// import { extractDocumentFromMaiML } from './utils/documentParser';
// import { extractTemplatesFromMaiML, mapValidationErrorsToTemplates } from './utils/templateExtractor';
import { addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
// Phase 2: maimlParserTyped導入
import { MaimlParserTyped } from '../../utils/maimlParserTyped';
import type { Template, PlaceRef as XsdPlaceRef, Document,Method, Property } from '../../types/maiml-unified';
// 型定義をインポート
import type {
  NodeData,
  EdgeData,
  DocumentData,
  MethodData,
  FileInfo,
  ClipboardData,
  PetriNetEditorInnerProps,
  NodeType,
  ValidationResult,
  ValidationError,
  DraftData
} from './types';
import { Draft,EditState } from './hooks/useDraftManager';

// ===== Phase 8: 分離したモジュールをインポート =====
// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditorActions } from './hooks/useEditorActions';

// Handlers
import { createNodeHandlers } from './handlers/nodeHandlers';
import { createEdgeHandlers } from './handlers/edgeHandlers';

import { TemplatesByCategory } from './components/TemplateViewer/TemplateList';

// ✅ window.cline* の型定義
declare global {
  interface Window {
    clineAddTemplate: (templateData: { category: 'material' | 'condition' | 'result'; template: Template }) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    clineDeleteTemplate: (templateId: string) => void;
    clineUpdateTemplate: (templateId: string, updatedTemplate: Template) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    clineAllTemplates: TemplatesByCategory; // eslint-disable-line @typescript-eslint/no-explicit-any
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
const PetriNetEditorContent = ({ maimlData, onError, editingFileName, editMode, ...props }: PetriNetEditorInnerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<'select' | 'workflow'>('select');
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node<NodeData>[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [saveConfirmDialogOpen, setSaveConfirmDialogOpen] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // ✅ Phase 9.10 Step7: error型と saveError型をnullで統一
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | undefined>();
  
  // エラーマッピング用に TemplateContext を後で取得するため、
  // ここではContextをラップせずにステートのみ管理
  const [validationPanelOpen, setValidationPanelOpen] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Phase 3 (Error Handling Enhancement): エラー分類
  const [criticalErrors, setCriticalErrors] = useState<ValidationError[]>([]);
  const [nonCriticalErrors, setNonCriticalErrors] = useState<ValidationError[]>([]);
  
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
  const extractAffectedElements = useCallback((errors: ValidationError[]) => {
    const nodeErrors: Record<string, ValidationError[]> = {};
    const edgeErrors: Record<string, ValidationError[]> = {};
    const nodeErrorMap: Record<string, ValidationError[]> = {};
    const edgeErrorMap: Record<string, ValidationError[]> = {};
    const affectedNodeIds = new Set<string>();
    const affectedEdgeIds = new Set<string>();

    errors.forEach((error: ValidationError) => {
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
      else if (error.xpath) {
        // xpathからID抽出を試みる
        const match = error.xpath.match(/@id='([^']+)'/);
        if (match) {
          const elementId = match[1];
          
          // pathsまたはxpathから要素タイプを判定
          const isArc = error.xpath.includes('arc[') || error.paths?.some(p => p.includes('arc['));
          const isPlace = error.xpath.includes('place[') || error.paths?.some(p => p.includes('place['));
          const isTransition = error.xpath.includes('transition[') || error.paths?.some(p => p.includes('transition['));
          
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
  
  // テンプレート抽出（maimlData読み込み時）- 一時的に無効化
  // useEffect(() => {
  //   if (maimlData) {
  //     console.log('🔍 [PetriNetEditorInner] テンプレート抽出開始');
  //     const extractedTemplates = extractTemplatesFromMaiML(maimlData);
  //     setTemplates(extractedTemplates);
  //     console.log('✅ [PetriNetEditorInner] テンプレート抽出完了:', {
  //       material: extractedTemplates.material.length,
  //       condition: extractedTemplates.condition.length,
  //       result: extractedTemplates.result.length
  //     });
  //   }
  // }, [maimlData]);
  
  // エラーマッピング（validationResult更新時）- 一時的に無効化
  // useEffect(() => {
  //   if (validationResult && templates) {
  //     console.log('🔍 [PetriNetEditorInner] エラーマッピング開始');
  //     const errorMap = mapValidationErrorsToTemplates(validationResult, templates);
  //     setTemplateErrors(errorMap);
  //     console.log('✅ [PetriNetEditorInner] エラーマッピング完了:', {
  //       templatesWithErrors: Object.keys(errorMap).length
  //     });
  //   }
  // }, [validationResult, templates]);
  
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
  const [draftManagerOpen, setDraftManagerOpen] = useState<boolean>(false); // Draft管理ダイアログ
  const [draftModeHandled, setDraftModeHandled] = useState<boolean>(false); // ✅ UX改善2: draftモード処理済みフラグ
  
  // テンプレート一覧表示機能State（methodsより先に定義）
  const [viewMode, setViewMode] = useState<'petriNet' | 'templates'>('petriNet');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCommonTemplates, setShowCommonTemplates] = useState<boolean>(false); // 共通テンプレート表示フラグ
  const [savedPetriNetViewport, setSavedPetriNetViewport] = useState<{ x: number; y: number; zoom: number } | null>(null); // ペトリネットモードのビューポート保存用
  // templates と templateErrors は TemplateContext から取得
  
  // 複数method管理State
  const [methods, setMethods] = useState<MethodData[]>([]);
  const [activeMethodIndex, setActiveMethodIndex] = useState<number>(0);
  const [multiMethodMode, setMultiMethodMode] = useState<boolean>(false);
  
  const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  
  // ユーザーID取得（AuthProviderから）
  const currentUserId = localStorage.getItem('userId') || 'default-user';
  
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
  } = useDraftManager(currentEditState, {
    userId: currentUserId,
    autoSaveInterval: 30 * 1000, // 30秒
    onAutoSaveSuccess: (draft) => {
      console.log('✅ [PetriNetEditorInner] 自動保存成功:', draft);
    },
    onAutoSaveError: (error) => {
      console.error('❌ [PetriNetEditorInner] 自動保存エラー:', error);
    },
  });
  
  console.log('🔍 [PetriNetEditorInner] Received editingFileName:', editingFileName);
  
  // Phase 3C: Undo/Redo履歴管理
  const { history, undo, redo, canUndo, canRedo, pushState, reset } = useHistory({
    nodes: [],
    edges: [],
  });
  
  // ワークフロー追加フック
  const { addWorkflow } = useWorkflow({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory: pushState,
    templates: { materialTemplates: {}, conditionTemplates: {}, resultTemplates: {} }, // 簡易実装
    setTemplates: () => {}, // 簡易実装（テンプレート管理は将来対応）
  });
  
  // 初回読み込み済みフラグ（重複実行防止）
  const hasLoadedRef = useRef(false);
  const maimlDataRef = useRef('');
  const isLoadingRef = useRef(false); // 🔧 FIX: ローディング中フラグを追加
  const isFirstNodeRef = useRef(true); // Bug Fix: 初回ノード追加フラグ

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
    pushState: pushState as any,
  });

  // ===== Phase 8 Step 4: ノードハンドラ統合 =====
  // createNodeHandlersを使用
  const nodeHandlers = createNodeHandlers({
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge,
    pushState,
    setTemplateEditorOpen,
    setEditingTemplateType: () => {}, // 未使用（将来の拡張用）
    setEditingNodeId: () => {},      // 未使用（将来の拡張用）
    setEditingNodeName: () => {},    // 未使用（将来の拡張用）
  });

  // ===== Phase 8 Step 5: エッジハンドラ統合 =====
  // createEdgeHandlersを使用
  const edgeHandlers = createEdgeHandlers({
    nodes,
    edges,
    setEdges,
    setSelectedEdge,
    setSelectedNode,
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
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      console.log('🔍 [handleOpenSaveConfirmDialog] バリデーションAPI呼び出し');
      const response = await fetch('/api/s3/validate-maiml-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          maimlContent: base64Data,
          organizationId: currentOrgId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`バリデーションエラー: ${response.status}`);
      }
      
      const result = await response.json();
      
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
    saveDialogOpen,
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

  // ===== 旧実装（バックアップ - コメントアウト） =====
  // // Phase 3C/3D: キーボードショートカット（Ctrl+Z/Y/C/V/S + M/C/R/T）
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     // Bug Fix: Dialogやモーダルが開いている場合はキーボードショートカットを無効化
  //     if (templateEditorOpen || saveDialogOpen || workflowDialogOpen) {
  //       return;
  //     }
  //     
  //     // Bug Fix: event.keyがundefinedの場合は処理しない
  //     if (!event.key) {
  //       return;
  //     }
  //     
  //     // ✅ 修正: テキストBOX（input/textarea）にフォーカスがある場合、Ctrl+C/Ctrl+Vは無効化しない
  //     const target = event.target as HTMLElement | null;
  //     const isTextInput = target && (
  //       target.tagName === 'INPUT' || 
  //       target.tagName === 'TEXTAREA' || 
  //       target.isContentEditable
  //     );
  //     
  //     // Ctrl (Windows/Linux) または Cmd (Mac)
  //     if (event.ctrlKey || event.metaKey) {
  //       if (event.key === 's') {
  //         // Ctrl+S → Save (Week1: 新保存ダイアログ)
  //         event.preventDefault();
  //         if (nodes.length > 0) {
  //           handleOpenSaveConfirmDialog();
  //           console.log('⌨️ [PetriNetEditorInner] キーボードショートカット: Save (新ダイアログ)');
  //         }
  //       } else if (event.key === 'z') {
  //         event.preventDefault();
  //         if (event.shiftKey) {
  //           // Ctrl+Shift+Z → Redo
  //           if (canRedo) {
  //             redo();
  //             console.log('⌨️ [PetriNetEditorInner] キーボードショートカット: Redo');
  //           }
  //         } else {
  //           // Ctrl+Z → Undo
  //           if (canUndo) {
  //             undo();
  //             console.log('⌨️ [PetriNetEditorInner] キーボードショートカット: Undo');
  //           }
  //         }
  //       } else if (event.key === 'y') {
  //         // Ctrl+Y → Redo
  //         event.preventDefault();
  //         if (canRedo) {
  //           redo();
  //           console.log('⌨️ [PetriNetEditorInner] キーボードショートカット: Redo');
  //         }
  //       } else if (event.key === 'c') {
  //         // Ctrl+C → Copy
  //         // ✅ 修正: テキストBOXにフォーカスがある場合はスキップ
  //         if (!isTextInput) {
  //           event.preventDefault();
  //           if (selectedNodes.length > 0) {
  //             handleCopy();
  //             console.log('⌨️ [PetriNetEditorInner] キーボードショートカット: Copy');
  //           }
  //         }
  //       } else if (event.key === 'v') {
  //         // Ctrl+V → Paste
  //         // ✅ 修正: テキストBOXにフォーカスがある場合はスキップ
  //         if (!isTextInput) {
  //           event.preventDefault();
  //           if (clipboard) {
  //             handlePaste();
  //             console.log('⌨️ [PetriNetEditorInner] キーボードショートカット: Paste');
  //           }
  //         }
  //       }
  //     } else if (!event.ctrlKey && !event.metaKey) {
  //       // Phase 3C-3: ノード追加キー（押されている間有効）
  //       const key = event.key.toLowerCase();
  //       if (key === 'm' || key === 'c' || key === 'r' || key === 't') {
  //         setPressedKeys(prev => new Set(prev).add(key));
  //         console.log('⌨️ [PetriNetEditorInner] キー押下:', key);
  //       }
  //     }
  //   };
  //
  //   const handleKeyUp = (event: KeyboardEvent) => {
  //     // Bug Fix: Dialogやモーダルが開いている場合は処理しない
  //     if (templateEditorOpen || saveDialogOpen || workflowDialogOpen) {
  //       return;
  //     }
  //     
  //     // Bug Fix: event.keyがundefinedの場合は処理しない
  //     if (!event.key) {
  //       return;
  //     }
  //     
  //     const key = event.key.toLowerCase();
  //     if (key === 'm' || key === 'c' || key === 'r' || key === 't') {
  //       setPressedKeys(prev => {
  //         const newSet = new Set(prev);
  //         newSet.delete(key);
  //         return newSet;
  //       });
  //       console.log('⌨️ [PetriNetEditorInner] キー解放:', key);
  //     }
  //   };
  //
  //   window.addEventListener('keydown', handleKeyDown);
  //   window.addEventListener('keyup', handleKeyUp);
  //   return () => {
  //     window.removeEventListener('keydown', handleKeyDown);
  //     window.removeEventListener('keyup', handleKeyUp);
  //   };
  // }, [undo, redo, canUndo, canRedo, selectedNodes, clipboard, nodes]);
  //
  // // Phase 3C-3: ウィンドウフォーカス時にキー状態をクリア
  // useEffect(() => {
  //   const handleBlur = () => {
  //     setPressedKeys(new Set());
  //     console.log('⌨️ [PetriNetEditorInner] フォーカス喪失: キー状態クリア');
  //   };
  //
  //   window.addEventListener('blur', handleBlur);
  //   return () => window.removeEventListener('blur', handleBlur);
  // }, []);

  // ✅ UX改善2: editMode='draft'時の自動DraftManager表示
  useEffect(() => {
    if (editMode === 'draft' && !draftModeHandled && !isLoading) {
      console.log('💾 [PetriNetEditorInner] Draft復元モード検出 - DraftManagerを自動表示');
      setDraftModeHandled(true);
      setDraftManagerOpen(true);
    }
  }, [editMode, draftModeHandled, isLoading]);

  // Viewer用ノードを使用（pentagon等の正しい形状）
  const nodeTypes = useMemo(
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
        
        // 新規作成時: editingFileNameからdocumentDataを初期化
        let initialMethodId = `method_${Date.now()}`;  // デフォルト値
        
        if (editingFileName && !documentData) {
          const baseFileName = editingFileName.replace('.maiml', '');
          const uuidFull = crypto.randomUUID();
          const uuidPrefix = uuidFull.substring(0, 8);
          
          // ✅ 修正: methodIdを先に生成
          initialMethodId = `method_${baseFileName}_${uuidPrefix}`;
          
          // ✅ 修正: 日付フォーマット生成
          const now = new Date();
          const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD形式
          
          // ✅ Phase 4: XSD準拠のDocumentData型に修正（creator/vendor/owner/instrument配列）
          const initialDocumentData: DocumentData = {
            id: `document_${Date.now()}`,
            uuid: uuidFull,
            name: baseFileName || 'document',
            description: '',
            date: formattedDate,
            // XSD準拠プロパティ（配列、必須）
            creators: [{ id: 'Creator', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
            vendors: [{ id: 'Vendor', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
            owners: [{ id: 'Owner', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
            instruments: [{ id: 'Instrument', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
            // エディター用拡張プロパティ
            protocolId: `protocol_${Date.now()}`,
            methodId: `method_${Date.now()}`,
            pnmlId: `pnml_${Date.now()}`,
            programId: `program_${Date.now()}`,
            chains:[],
            parents : []
          };
          setDocumentData(initialDocumentData);
          console.log('📄 [PetriNetEditorInner] 新規作成: documentData初期化（ID自動生成）:', {
            documentId: initialDocumentData.id,
            protocolId: initialDocumentData.protocolId,
            methodId: initialDocumentData.methodId,
            pnmlId: initialDocumentData.pnmlId,
            programId: initialDocumentData.programId
          });
        }
        
        setIsLoading(false);
        setError(null);
        setNodes([]);
        setEdges([]);
        reset({ nodes: [], edges: [] });
        
        // ✅ 修正: 新規作成時もmethods配列を初期化（MethodTabPanelを表示するため）
        // 上で生成したinitialMethodIdを使用
        console.log('🆕 [PetriNetEditorInner] 新規作成: Method配列初期化:', {
          initialMethodId
        });
        
        const initialMethod: MethodData = {
          methodId: initialMethodId,
          methodIndex: 0,
          name: 'Method 1',
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        };
        setMethods([initialMethod]);
        setActiveMethodIndex(0);
        setMultiMethodMode(false);
        
        console.log('📋 [PetriNetEditorInner] 新規作成: Method配列初期化');
        
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
          const allTemplates: Template[] = [...material, ...condition, ...result];
              
          allTemplates.forEach((template: Template) => {
            const templateId = template.id;
            const placeRefs = template.placeRefs || []; // XSD準拠: placeRef（配列）
            
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
              
          // Phase 3.2: maimlParserTyped.getDocument()を使用してDocument情報を抽出
          try {
            const docParser = new MaimlParserTyped(maimlData);
            const extractedDoc = docParser.getDocument();
            
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
          } catch (docError) {
            console.warn('⚠️ [PetriNetEditorInner] Document情報の取得に失敗:', docError);
            // Documentがない場合でもペトリネット表示は続行
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
                      commonTemplateRef: referencedPlaceId
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
              
          setIsLoading(false);
              
          // 🆕 Phase 3: 複数methodコードパスでも自動バリデーション実行
          setTimeout(async () => {
            try {
              console.log('🔍 [PetriNetEditorInner] 自動バリデーション実行開始（複数method）');
              console.log('🔍 [PetriNetEditorInner] maimlData preview:', maimlData?.substring(0, 200));
              
              const base64Data = btoa(unescape(encodeURIComponent(maimlData)));
              const currentOrgId = localStorage.getItem('currentOrganizationId');
              
              console.log('🔍 [PetriNetEditorInner] バリデーションリクエスト:', {
                base64Length: base64Data.length,
                organizationId: currentOrgId
              });
              
              const validateResponse = await fetch('/api/s3/validate-maiml-content', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  maimlContent: base64Data,
                  organizationId: currentOrgId,
                }),
              });
              
              if (validateResponse.ok) {
                const validateResult = await validateResponse.json();
                console.log('✅ [PetriNetEditorInner] 自動バリデーション完了（複数method）:', {
                  success: validateResult.success,
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
                const errorText = await validateResponse.text();
                console.error('❌ [PetriNetEditorInner] バリデーションAPIエラー:', {
                  status: validateResponse.status,
                  statusText: validateResponse.statusText,
                  errorText: errorText.substring(0, 500)
                });
              }
            } catch (validateErr: unknown) {
              const errorMessage = getErrorMessage(validateErr);
              console.error('❌ [PetriNetEditorInner] 自動バリデーション例外:', {
                message: errorMessage
              });
            }
          }, 500);
      }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        console.error('❌ [PetriNetEditorInner] 初期化エラー:', errorMessage);
        
        // Phase 3: エラーをvalidationResultに変換
        const errorValidationResult: ValidationResult = {
          success: false,
          isValid: false,
          errors: [{
            type: 'syntax_error',
            severity: 'error' as const,
            message: errorMessage || 'ペトリネット構造の読み込みに失敗しました',
            details: err instanceof Error ? err.stack : undefined
          }],
          warnings: []
        };
        setValidationResult(errorValidationResult);
        setError(errorMessage || 'ペトリネット構造の読み込みに失敗しました');
        setIsLoading(false);
        
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        // 🔧 FIX: ローディングフラグを解除
        isLoadingRef.current = false;
        console.log('🔍 [PetriNetEditorInner] Loading flag cleared');
      }
    };
    
    fetchPetriNetData();
  }, [maimlData]); // 依存配列を最小限に（maimlDataの変更時のみ実行）

  // ノード追加ハンドラー（Phase 3A + 3C: 履歴追加）
  const handleAddNode = useCallback((nodeType: string) => {
    const newNode: Node<NodeData> = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType === 'transition' ? 'transition' : 
            nodeType === 'material' ? 'materialTemplate' :
            nodeType === 'condition' ? 'conditionTemplate' : 'resultTemplate',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
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
    console.log('➕ [PetriNetEditorInner] ノード追加（テンプレートなし）:', newNode);
  }, [setNodes, edges, pushState]);

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
  }, [edges, setEdges, setNodes, pushState]);

  // PropertyPanelからのノード削除ハンドラー
  const handleDeleteNode = useCallback((nodeId: string) => {
    console.log('🗑️ [PetriNetEditorInner] PropertyPanelからノード削除:', nodeId);
    
    setNodes((nds) => {
      const newNodes = nds.filter(n => n.id !== nodeId);
      // 履歴に追加
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });
    
    // 選択状態をクリア
    setSelectedNode(null);
  }, [setNodes, edges, pushState]);

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
    console.log('🔗 [PetriNetEditorInner] エッジ追加:', newEdge);
  }, [setEdges, nodes, pushState]);

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
    
    // 選択状態をクリア
    setSelectedEdge(null);
  }, [nodes, setEdges, pushState]);

  // PropertyPanelからのエッジ削除ハンドラー（Phase 3.1）
  const handleDeleteEdge = useCallback((edgeId: string) => {
    console.log('🗑️ [PetriNetEditorInner] PropertyPanelからエッジ削除:', edgeId);
    
    setEdges((eds) => {
      const newEdges = eds.filter(e => e.id !== edgeId);
      // 履歴に追加
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    
    // 選択状態をクリア
    setSelectedEdge(null);
  }, [setEdges, nodes, pushState]);

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
  }, [nodes, edges, pushState]);

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
      // S3ファイル一覧取得
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      const response = await fetch(`/api/s3/files?organizationId=${currentOrgId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`ファイル一覧取得エラー: ${response.status}`);
      }
      
      const result = await response.json();
      
              // .maimlファイルのみフィルタリング
              const maimlFiles = (result.files || []).filter((file: { key: string; name?: string }) => 
                file.key && file.key.endsWith('.maiml')
              ).map((file: { key: string; name?: string; lastModified?: string; size?: number }) => ({
                ...file,
                name: file.name || file.key.split('/').pop(),
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
    
    console.log(`✨ [PetriNetEditorInner] ${isFirstNode ? '🎯初回' : '2回目以降'}ノード追加（テンプレートなし）:`, {
      nodeType,
      position,
      screenCoords: { x: event.clientX, y: event.clientY }
    });
  }, [pressedKeys, edges, pushState, setNodes, screenToFlowPosition, selectedTool, openWorkflowDialogInternal]);

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
    console.log('📝 [PetriNetEditorInner] プロパティ更新:', { nodeId, newData });
  }, [setNodes, edges, pushState]);

  // ノードID変更ハンドラー
  const handleUpdateNodeId = useCallback((oldId: string, newId: string) => {
    console.log('🔄 [PetriNetEditorInner] ノードID変更:', { oldId, newId });
    
    // ✅ TemplateContextのテンプレートも更新（placeRefsの参照を更新）
    if (window.clineAllTemplates && window.clineUpdateTemplate) {
      const allTemplates = window.clineAllTemplates;
      
      // 全カテゴリのテンプレートをチェック
      (['material', 'condition', 'result'] as const).forEach((category) => {
        const templates : Template[] = allTemplates[category];
        if (templates.length > 0) {
          templates.forEach((template: Template) => {
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
  }, [setNodes, setEdges, pushState]);

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
    console.log('📝 [PetriNetEditorInner] エッジID更新:', { oldId: edgeId, newId });
  }, [setEdges, nodes, pushState]);

  // Phase 4A: テンプレート編集ダイアログを開く
  const handleOpenTemplateEditor = useCallback((node: Node<NodeData>) => {
    console.log('🔧 [PetriNetEditorInner] テンプレート編集:', node);
    setTemplateEditNode(node);
    setTemplateEditorOpen(true);
  }, []);

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
      if (window.clineAddTemplate) {
        window.clineAddTemplate({
          category: templateCategory === 'material' ? 'material' : templateCategory === 'condition' ? 'condition' : 'result',
          template: {
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
          }
        });
        console.log('✅ [PetriNetEditorInner] 新規テンプレートをContextに追加完了:', { correctMethodId });
      } else {
        console.error('❌ [PetriNetEditorInner] addTemplate関数が見つかりません');
      }
      
      // テンプレートエディタを閉じる
      setTemplateEditorOpen(false);
      setTemplateEditNode(null);
      return;
    }
    
    // 既存テンプレートの更新
    console.log('🔄 [PetriNetEditorInner] 既存テンプレート更新:', {
      nodeId,
      placeRefs: convertedTemplateRef.placeRefs,
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
        const templates : Template[] = allTemplates[category];
          if (!originalTemplate && templates.length > 0) {
            originalTemplate = templates.find((t: Template) => t.id === templateId)!;  // ✅ 修正: templateIdで検索
          }
        });
        
        console.log('🔍 [PetriNetEditorInner] 元のテンプレート情報:', {
          found: !!originalTemplate,
          originalMethodId: originalTemplate?.methodId,
          placeRefsLength: convertedTemplateRef.placeRefs?.length
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
    setNodes((nds) => {
      const placeRefsToUpdate = convertedTemplateRef.placeRefs || [];
      console.log('🔄 [PetriNetEditorInner] ノードにテンプレート紐付け:', {
        templateId: templateId,
        placeRefsToUpdate,
        totalNodes: nds.length,
        isCommonTemplate: isCommonTemplate,
        methodId: methodId
      });
      
      const newNodes = nds.map((node: Node<NodeData>) => {
        // placeRefsに含まれるノードにテンプレートを設定
        if (placeRefsToUpdate.some((pr) => pr.ref === node.id)) {
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
            },
          };
        }
        return node;
      });
      
      // 履歴に追加
      pushState({ nodes: newNodes, edges });
      
      // 選択ノードも更新
      const updatedNode = newNodes.find(n => n.id === nodeId);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
      
      return newNodes;
    });
    
    console.log('💾 [PetriNetEditorInner] Template保存完了:', { nodeId, templateId, convertedTemplateRef });  // ✅ templateIdを追加
  }, [setNodes, edges, pushState, convertNestedPropertiesToArray]);

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
    console.log('💾 [PetriNetEditorInner] Document保存:', newDocumentData);
  }, []);

  // Draft管理ダイアログを開く
  const handleOpenDraftManager = useCallback(() => {
    console.log('📂 [PetriNetEditorInner] Draft管理ダイアログを開く');
    setDraftManagerOpen(true);
  }, []);

  // Draft管理ダイアログを閉じる
  const handleCloseDraftManager = useCallback(() => {
    setDraftManagerOpen(false);
  }, []);

  // ビューモード切替ハンドラー
  const handleViewModeChange = useCallback((newMode: 'petriNet' | 'templates') => {
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
            const tempNode: Node<NodeData> = {
              id: template.id,
              position: { x: 0, y: 0 }, // ✅ 追加: position必須
              data: {
                id: template.id,
                name: template.name || '',
                description: template.description || '',
                nodeType: 'place' as NodeType,
                placeType: template.category,
                template: {
                  id: template.id,
                  name: template.name || '',
                  description: template.description || '',
                  category: template.category,
                  uuid: template.uuid || crypto.randomUUID(),
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
                  uuid: template.uuid || crypto.randomUUID(),
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
                  uuid: crypto.randomUUID(),
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
                  uuid: crypto.randomUUID(),
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
  const handleLoadDraft = useCallback((draft: DraftData) => {
    console.log('📖 [PetriNetEditorInner] Draft読み込み:', draft);
    
    try {
      // Draftからノードとエッジを復元
      const loadedNodes = draft.nodes || [];
      const loadedArcs = draft.arcs || draft.edges || []; // arcsキーを優先、後方互換のためedgesもチェック
      
      console.log('🔍 [PetriNetEditorInner] Draft読み込みデータ:', {
        nodesCount: loadedNodes.length,
        arcsCount: loadedArcs.length,
        arcsSample: loadedArcs.slice(0, 3)
      });
      
      // エッジにスタイルとマーカーを追加
      const styledEdges = loadedArcs.map(edge => ({
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
      // S3からMaiMLファイル取得
      const response = await fetch(`/api/s3/file-content?key=${encodeURIComponent(file.key)}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`ファイル取得エラー: ${response.status}`);
      }
      
      const result = await response.json();
      const maimlContent = result.data.content;
      
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

  // ===== 旧実装（バックアップ - コメントアウト） =====
  // // Phase 3C-2/3: コピーハンドラー（複数選択対応）
  // const handleCopy = useCallback(() => {
  //   if (selectedNodes.length === 0) return;
  //   
  //   if (selectedNodes.length === 1) {
  //     // 単一ノードコピー
  //     const node = selectedNodes[0];
  //     setClipboard({
  //       type: node.type,
  //       position: node.position,
  //       data: { ...node.data },
  //     });
  //     console.log('📋 [PetriNetEditorInner] コピー:', node.data.name);
  //   } else {
  //     // 複数ノードコピー
  //     setClipboard({
  //       multiple: true,
  //       nodes: selectedNodes.map(node => ({
  //         type: node.type,
  //         position: node.position,
  //         data: { ...node.data },
  //       })),
  //     });
  //     console.log('📋 [PetriNetEditorInner] 複数コピー:', selectedNodes.length, 'ノード');
  //   }
  // }, [selectedNodes]);
  //
  // // Phase 3C-2/3: ペーストハンドラー（複数選択対応）
  // const handlePaste = useCallback(() => {
  //   if (!clipboard) return;
  //   
  //   if (clipboard.multiple) {
  //     // 複数ノードペースト
  //     const newNodes = clipboard.nodes.map((clipNode, index) => {
  //       const timestamp = Date.now() + index;
  //       const newId = `${clipNode.data.placeType || clipNode.data.nodeType}-${timestamp}`;
  //       return {
  //         id: newId,
  //         type: clipNode.type,
  //         position: {
  //           x: clipNode.position.x + 50,
  //           y: clipNode.position.y + 50,
  //         },
  //         data: {
  //           ...clipNode.data,
  //           id: newId,
  //           name: `${clipNode.data.name} (Copy)`,
  //         },
  //       };
  //     });
  //     
  //     setNodes((nds) => {
  //       const updatedNodes = [...nds, ...newNodes];
  //       pushState({ nodes: updatedNodes, edges });
  //       return updatedNodes;
  //     });
  //     
  //     console.log('📋 [PetriNetEditorInner] 複数ペースト:', newNodes.length, 'ノード');
  //   } else {
  //     // 単一ノードペースト
  //     const timestamp = Date.now();
  //     const newId = `${clipboard.data.placeType || clipboard.data.nodeType}-${timestamp}`;
  //     
  //     const newNode = {
  //       id: newId,
  //       type: clipboard.type,
  //       position: {
  //         x: clipboard.position.x + 50,
  //         y: clipboard.position.y + 50,
  //       },
  //       data: {
  //         ...clipboard.data,
  //         id: newId,
  //         name: `${clipboard.data.name} (Copy)`,
  //       },
  //     };
  //     
  //     setNodes((nds) => {
  //       const newNodes = [...nds, newNode];
  //       pushState({ nodes: newNodes, edges });
  //       return newNodes;
  //     });
  //     
  //     setSelectedNode(newNode);
  //     
  //     console.log('📋 [PetriNetEditorInner] ペースト:', newNode.data.name);
  //   }
  // }, [clipboard, edges, pushState, setNodes]);

  // Phase 3D: 旧保存ダイアログを開く（互換性のため残す）
  const handleOpenSaveDialog = useCallback(() => {
    setSaveDialogOpen(true);
    setSaveError(null);
  }, []);

  // Phase 3D: 旧保存ダイアログを閉じる
  const handleCloseSaveDialog = useCallback(() => {
    setSaveDialogOpen(false);
    setSaveError(null);
  }, []);


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
      const base64Data = btoa(unescape(encodeURIComponent(maimlXml)));
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      
      console.log('🔍 [handleOpenValidationPanel] バリデーションAPI呼び出し');
      const response = await fetch('/api/s3/validate-maiml-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          maimlContent: base64Data,
          organizationId: currentOrgId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`バリデーションエラー: ${response.status}`);
      }
      
      const result = await response.json();
      
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
      
    } catch (err: unknown) {
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
  const handleAutoCorrect = useCallback(async (selectedErrors: ValidationError[]) => {
    try {
      console.log('🔧 [PetriNetEditorInner] 自動補正実行:', selectedErrors);
      setIsCorrecting(true);
      
      // MaiML生成
      const metadata = {
        name: documentData?.name || 'Untitled',
        description: documentData?.description || '',
      };
      const maimlXml = await convertReactFlowToMaiML(nodes, edges, metadata, documentData);
      
      // 自動補正API呼び出し
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      const response = await fetch('/api/s3/maiml-auto-correct-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          maimlContent: maimlXml,
          organizationId: currentOrgId,
          selectedErrors,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`自動補正エラー: ${response.status}`);
      }
      
      const result = await response.json();
      
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
        
        // 自動補正API呼び出し
        const currentOrgId = localStorage.getItem('currentOrganizationId');
        const response = await fetch('/api/s3/maiml-auto-correct-realtime', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            maimlContent: maimlXml,
            organizationId: currentOrgId,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`自動補正エラー: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.correctedMaiml) {
          maimlXml = result.correctedMaiml;
          console.log('✅ [PetriNetEditorInner] 自動補正完了');
        }
      }
      
      // 保存先に応じて処理を分岐
      if (saveDestination === 's3') {
        // S3保存
        console.log('☁️ [PetriNetEditorInner] S3に保存:', folder);
        console.log('🔍 [PetriNetEditorInner] sourceS3Key:', props.sourceS3Key);
        
        const currentOrgId = localStorage.getItem('currentOrganizationId');
        
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
        
        // S3ファイル保存API（uploadRoutes.jsの/saveエンドポイント）
        const response = await fetch('/api/s3/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            fileKey: fileKey,
            content: maimlXml,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `S3保存に失敗しました (${response.status})`);
        }
        
        const result = await response.json();
        console.log('✅ [PetriNetEditorInner] S3保存完了:', result);
        
        alert(`ペトリネット "${metadata.name}" をS3に保存しました`);
        
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
  }, [nodes, edges, documentData, handleCloseSaveConfirmDialog]);

  // Phase 3D: 保存ハンドラー
  const handleSave = useCallback(async (metadata: { name: string; description: string }) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      console.log('💾 [PetriNetEditorInner] 保存開始:', {
        name: metadata.name,
        nodesCount: nodes.length,
        edgesCount: edges.length
      });
      
      // バリデーション
      const validation = validatePetriNet(nodes, edges);
      if (!validation.valid) {
        throw new Error(`バリデーションエラー:\n${validation.errors.join('\n')}`);
      }
      
      // MaiML変換（Document情報を含む）
      const maimlXml = await convertReactFlowToMaiML(nodes, edges, metadata, documentData);
      
      console.log('📄 [PetriNetEditorInner] MaiML生成完了:', {
        xmlLength: maimlXml.length,
        hasDocument: !!documentData
      });
      
      // Draft API呼び出し
      const response = await fetch('/api/s3/maiml-drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: metadata.name,
          description: metadata.description,
          content: maimlXml,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `保存に失敗しました (${response.status})`);
      }
      
      const result = await response.json();
      
      setSaveDialogOpen(false);
      
      console.log('✅ [PetriNetEditorInner] Draft保存完了:', result);
      
      // 成功通知（将来的にSnackbarなどを使用）
      alert(`ペトリネット "${metadata.name}" を保存しました`);
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ [PetriNetEditorInner] Draft保存エラー:', errorMessage);
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges]);

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
          message="致命的なエラーが発生しました"
          description="ペトリネットを表示できません。"
          showIcon
          style={{ maxWidth: 600, width: '100%' }}
        />
        <Space direction="vertical" style={{ width: '100%', maxWidth: 600 }}>
          {criticalErrors.map((err, idx) => (
            <Alert 
              key={idx} 
              type="error" 
              message={err.message}
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
          message={error}
          showIcon
          style={{ maxWidth: 600 }}
        />
      </Flex>
    );
  }

  // 通常の編集画面表示（新規作成時も含む）
  // TemplateProviderで内部をラップ
  return (
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
        saveDialogOpen={saveDialogOpen}
        handleCloseSaveDialog={handleCloseSaveDialog}
        handleSave={handleSave}
        saveError={saveError}
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
      />
    </TemplateProvider>
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
  handleConnect: (connection: any) => void;
  handleNodeDragStop: (event: React.MouseEvent, node: Node<NodeData>) => void;
  handleSelectionChange: (params: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
  handlePaneClick: (event: React.MouseEvent) => void;
  
  // Node Types
  nodeTypes: Record<string, React.ComponentType<any>>;
  
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
  nonCriticalErrors: ValidationError[];
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
  lastAutoSaveTime: Date | null;
  
  // ビューモード
  viewMode: 'petriNet' | 'templates';
  handleViewModeChange: (mode: 'petriNet' | 'templates') => void;
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
  saveDialogOpen: boolean;
  handleCloseSaveDialog: () => void;
  handleSave: (metadata: any) => void;
  saveError: string | undefined;
  
  saveConfirmDialogOpen: boolean;
  validationResult: ValidationResult | null;
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
  handleAutoCorrect: (selectedErrors: any[]) => void;
  handleRevalidate: () => void;
  isCorrecting: boolean;
  
  workflowDialogOpen: boolean;
  handleCloseWorkflowDialog: () => void;
  handleWorkflowFileSelect: (file: any) => void;
  availableFiles: Array<{ key: string; name: string; lastModified?: string; size?: number }>;
  
  draftManagerOpen: boolean;
  handleCloseDraftManager: () => void;
  handleLoadDraft: (draft: DraftData) => void;
  lastSavedDraft: Draft | null;
  currentEditState: any;
  currentUserId: string;
  sourceS3Key?: string;
}

// UIレンダリングコンポーネント（TemplateProvider内）
const PetriNetEditorInnerUI: React.FC<PetriNetEditorInnerUIProps> = ({
  nodes,
  edges,
  setNodes,
  setEdges,
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
  multiMethodMode,
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
  saveDialogOpen,
  handleCloseSaveDialog,
  handleSave,
  saveError,
  saveConfirmDialogOpen,
  validationResult,
  handleCloseSaveConfirmDialog,
  handleSaveConfirmAction,
  isSaving,
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
      delete window.clineAddTemplate;
      delete window.clineDeleteTemplate;
      delete window.clineUpdateTemplate;
      delete window.clineAllTemplates;
    };
  }, [addTemplate, deleteTemplate, updateTemplate, allTemplates]);
  
  const { token } = theme.useToken();
  
  return (
    <Flex vertical style={{ height: '100%' }}>
        {/* Phase 3: 非致命的エラー警告バナー */}
        {nonCriticalErrors.length > 0 && (
          <Alert 
            type="warning"
            message={
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
          onAutoSaveToggle={() => setAutoSaveEnabled(!autoSaveEnabled)}
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
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                backgroundColor: '#f5f5f5',
              }}
            />
          </ReactFlow>
          ) : (
            <TemplateList 
              onTemplateSelect={handleTemplateSelect}
              showCommonTemplates={showCommonTemplates}
              onShowCommonTemplatesChange={setShowCommonTemplates}
              onTemplateAdd={handleTemplateAdd}
              onTemplateDelete={handleTemplateDelete}
            />
          )}

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

        {/* Phase 3D: 保存ダイアログ（旧版） */}
        <SaveDialog
          open={saveDialogOpen}
          onClose={handleCloseSaveDialog}
          onSave={handleSave}
          isLoading={isSaving}
          error={saveError}
        />

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
          onSave={(nodeId: string, templateRef: Template, isNewTemplate: boolean, templateCategory: string, isCommonTemplate: boolean, methodId: string | null) => handleSaveTemplate(nodeId, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId)}
          allNodes={(() => {
            // 共通テンプレートかどうかを判定
            const isCommonTemplate = 
              !templateEditNode?.data?.template?.methodId ||
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
          onLoadDraft={(draft: Record<string, unknown>) => {
            handleLoadDraft(draft as unknown as DraftData);
          }}
          currentEditState={currentEditState}
          userId={currentUserId}
          autoSaveEnabled={autoSaveEnabled}
          onAutoSaveToggle={() => setAutoSaveEnabled(!autoSaveEnabled)}
          currentDraftKey={lastSavedDraft?.draft_key || null}
        />
      </Flex>
  );
};

// 外部コンポーネント
const PetriNetEditorInner = (props: PetriNetEditorInnerProps) => {
  return <PetriNetEditorContent {...props} />;
};

export default PetriNetEditorInner;
