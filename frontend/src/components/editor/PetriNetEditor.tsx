/**
 * PetriNetEditor - メインコンポーネント
 * 
 * React Flowを使用したペトリネット表示・編集コンポーネント
 * TypeScript + Ant Design v6版
 * 
 * @version 3.0.0
 * @date 2025-12-23
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
} from 'reactflow';
import { Spin, Alert, Flex, theme } from 'antd';

// サブコンポーネント
import EditorToolbar from './EditorToolbar';
import MethodTabPanel from './MethodTabPanel';
import PropertyPanel from './PropertyPanel';
import TemplateEditorDialog from './TemplateEditorDialog';
import DocumentEditDialog from './DocumentEditDialog';
import WorkflowSelectorDialog from './WorkflowSelectorDialog';
import SaveConfirmDialog from './SaveConfirmDialog';
import ValidationPanel from './ValidationPanel';
import DraftManager from './DraftManager';
import TemplateList from './TemplateList';
import type { CategorizedTemplates } from './TemplateList';
import type { TemplateError } from './TemplateItem';
import { TemplateProvider, useTemplates } from '@/contexts/TemplateContext';

// ✅ window.cline* の型定義
declare global {
  interface Window {
    clineAddTemplate?: (data: { category: string; template: any }) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    clineDeleteTemplate?: (templateId: string) => void;
    clineUpdateTemplate?: (templateId: string, updatedTemplate: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    clineAllTemplates?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

// カスタムフック
import useHistory from '../../hooks/useHistory';
import { useWorkflow } from '../../hooks/useWorkflow';
import useDraftManager from '../../hooks/useDraftManager';

// ユーティリティ関数
import { convertReactFlowToMaiML, validatePetriNet } from '../../utils/converters/reactFlowToMaiml';
import { convertMultipleMethodsToMaiML } from '../../utils/converters/multiMethodConverter';
import { extractDocumentFromMaiML, fillMissingDocumentFields, type DocumentData } from '../../utils/documentParser';

// API Service
import { validateMaiml, correctMaiml } from '../../api/maimlApiService';

// Viewer用ノード（既存の正しいノード描画）
import MaterialTemplateNode from '../nodes/MaterialTemplateNode';
import ConditionTemplateNode from '../nodes/ConditionTemplateNode';
import ResultTemplateNode from '../nodes/ResultTemplateNode';
import TransitionNode from '../nodes/TransitionNode';
import { parseMaimlToPetriNet } from '../../utils/maimlParser';
import { convertToReactFlow } from '../../utils/reactFlowConverter';

import 'reactflow/dist/style.css';

/**
 * PetriNetEditor - Props型定義
 * 
 * @interface PetriNetEditorProps
 * @description
 * PetriNetEditorコンポーネントに渡すプロパティの型定義。
 * Reference版PetriNetEditorV2をベースに、TypeScript + Ant Design で実装。
 * Phase 6で新しいprops（initialContent、onSave等）が追加されました。
 */
export interface PetriNetEditorProps {
  maimlData?: string;
  onError?: (error: Error) => void;
  editingFileName?: string;
  editMode?: 'normal' | 'draft';
  originalFileName?: string;
  sourceS3Key?: string;
  // Phase 6追加: PetriNetEditorScreen用の新しいprops
  initialContent?: string;              // 初期MAIMLコンテンツ（maimlDataのエイリアス）
  projectId?: string;                   // プロジェクトID
  projectName?: string;                 // プロジェクト名（DocumentEditDialogのデフォルト値用）
  onSave?: (content: string) => Promise<void>;  // 保存コールバック
  onContentChange?: () => void;         // 変更通知コールバック
  // フォーマット管理統合用
  sourceContext?: 'project' | 'format'; // 遷移元コンテキスト（デフォルト: 'project'）
}

/**
 * Method データ型
 */
interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}


/**
 * PetriNetEditorInner - メインロジック
 */
const PetriNetEditorInner: React.FC<PetriNetEditorProps> = ({
  maimlData,
  onError,
  editingFileName,
  editMode,
  originalFileName,
  sourceS3Key,
  // Phase 6追加
  initialContent,
  projectId,
  projectName,
  onSave: onSaveCallback,
  onContentChange,
  // フォーマット管理統合用
  sourceContext = 'project', // デフォルト: 'project'
}) => {
  const { token } = theme.useToken();
  
  // ===== TemplateContext フック =====
  const { addTemplate, deleteTemplate, updateTemplate, allTemplates } = useTemplates();
  
  // ✅ グローバルスコープに設定（TemplateEditorDialogからアクセスするため）
  useEffect(() => {
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
  
  // initialContentとmaimlDataの統合（後方互換性維持）
  const effectiveMaimlData = initialContent || maimlData;
  
  // ===== エディタービューモード管理（Phase 1: ペトリネット/テンプレート切替） =====
  // 注意: propsのeditMode（'normal' | 'draft'）とは別の変数
  const [editorMode, setEditorMode] = useState<'petri-net' | 'template'>('petri-net');
  
  // ===== Phase A-2: ビューポート保存/復元 =====
  const [savedPetriNetViewport, setSavedPetriNetViewport] = useState<{
    x: number;
    y: number;
    zoom: number;
  } | null>(null);
  
  // ===== React Flow State =====
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== 編集 State =====
  const [selectedTool, setSelectedTool] = useState<'select' | 'workflow'>('select');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [clipboard, setClipboard] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showArcLabels, setShowArcLabels] = useState(false); // Phase 5: アーク属性表示トグル
  
  // ===== TemplateListView State =====
  const [showCommonTemplates, setShowCommonTemplates] = useState(false);
  const [templateErrors, setTemplateErrors] = useState<Record<string, TemplateError[]>>({});

  // ===== データ変換ロジック: Node → TemplateData（handleSaveTemplateで使用） =====
  const convertNodeToTemplateData = useCallback((node: Node): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: node.id,
      name: node.data.name || node.id,
      propertiesCount: node.data.properties?.length || 0,
      placeRefsCount: 0, // 将来実装
      type: node.type,
      description: node.data.description || '',
      data: node.data,
    };
  }, []);

  // ===== ダイアログ State =====
  const [saveConfirmDialogOpen, setSaveConfirmDialogOpen] = useState(false);
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateEditNode, setTemplateEditNode] = useState<Node | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [draftManagerOpen, setDraftManagerOpen] = useState(false);

  // ===== バリデーション/保存 State =====
  const [validationResult, setValidationResult] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isValidating, setIsValidating] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // ===== Phase A-3: エラー分類 State =====
  const [criticalErrors, setCriticalErrors] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [nonCriticalErrors, setNonCriticalErrors] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // ===== Phase B-1: エラー視覚化関数 =====
  const extractAffectedElements = useCallback((errors: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const affectedNodeIds = new Set<string>();
    const affectedEdgeIds = new Set<string>();
    
    errors.forEach(error => {
      // elementType と elementId から直接抽出
      if (error.elementType === 'node' && error.elementId) {
        affectedNodeIds.add(error.elementId);
      } else if (error.elementType === 'edge' && error.elementId) {
        affectedEdgeIds.add(error.elementId);
      }
      
      // メッセージからID抽出（フォールバック）
      const nodeMatch = error.message?.match(/node[:\s]+([a-zA-Z0-9_-]+)/i);
      const edgeMatch = error.message?.match(/edge[:\s]+([a-zA-Z0-9_-]+)/i);
      
      if (nodeMatch) affectedNodeIds.add(nodeMatch[1]);
      if (edgeMatch) affectedEdgeIds.add(edgeMatch[1]);
    });
    
    return { affectedNodeIds, affectedEdgeIds };
  }, []);

  const applyErrorVisualization = useCallback(() => {
    if (!validationResult || validationResult.valid) {
      // エラーなし - フラグをクリア
      setNodes(nds => nds.map(node => ({
        ...node,
        data: { ...node.data, hasError: false },
        className: node.className?.replace(' error-node', '') || ''
      })));
      
      setEdges(eds => eds.map(edge => ({
        ...edge,
        data: { ...edge.data, hasError: false },
        className: edge.className?.replace(' error-edge', '') || ''
      })));
      
      return;
    }
    
    const { affectedNodeIds, affectedEdgeIds } = 
      extractAffectedElements(validationResult.errors || []);
    
    console.log('🔴 [PetriNetEditor] エラー視覚化:', {
      affectedNodes: Array.from(affectedNodeIds),
      affectedEdges: Array.from(affectedEdgeIds)
    });
    
    // ノードにエラーフラグ設定
    setNodes(nds => nds.map(node => ({
      ...node,
      data: { 
        ...node.data, 
        hasError: affectedNodeIds.has(node.id) 
      },
      className: affectedNodeIds.has(node.id) 
        ? `${node.className || ''} error-node`.trim() 
        : node.className?.replace(' error-node', '') || ''
    })));
    
    // エッジにエラーフラグ設定
    setEdges(eds => eds.map(edge => ({
      ...edge,
      data: { 
        ...edge.data, 
        hasError: affectedEdgeIds.has(edge.id) 
      },
      className: affectedEdgeIds.has(edge.id) 
        ? `${edge.className || ''} error-edge`.trim() 
        : edge.className?.replace(' error-edge', '') || ''
    })));
  }, [validationResult, extractAffectedElements, setNodes, setEdges]);

  // ===== Document/Draft State =====
  const [documentData, setDocumentData] = useState<DocumentData | undefined>(undefined);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [pendingClickPosition, setPendingClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [draftModeHandled, setDraftModeHandled] = useState(false);

  // ===== 複数Method State =====
  const [methods, setMethods] = useState<MethodData[]>([]);
  const [activeMethodIndex, setActiveMethodIndex] = useState(0);
  const [multiMethodMode, setMultiMethodMode] = useState(false);

  // ===== React Flow Hooks =====
  const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  // ===== ユーザーID取得 =====
  const currentUserId = localStorage.getItem('userId') || 'default-user';

  // ===== Draft管理フック =====
  const currentEditState = useMemo(() => ({
    fileName: editingFileName || documentData?.name || 'Untitled',
    nodes: nodes,
    edges: edges,
    templates: {},
    documentData: documentData || undefined,
  }), [editingFileName, documentData, nodes, edges]);

  const {
    autoSaveEnabled,
    setAutoSaveEnabled,
    lastSavedDraft,
    lastAutoSaveTime,
  } = useDraftManager(currentEditState, {
    userId: currentUserId,
    autoSaveInterval: 30 * 1000,
    onAutoSaveSuccess: (draft: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.log('✅ [PetriNetEditor] 自動保存成功:', draft);
    },
    onAutoSaveError: (error: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('❌ [PetriNetEditor] 自動保存エラー:', error);
    },
  });

  // ===== Undo/Redo履歴管理 =====
  const { history, undo, redo, canUndo, canRedo, pushState, reset } = useHistory({
    nodes: [],
    edges: [],
  });

  // Workflow用のaddToHistory関数（pushStateをラップ）
  const addToHistory = useCallback((action: string, data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (action === 'ADD_WORKFLOW' && data.nodes && data.edges) {
      pushState({ nodes: data.nodes, edges: data.edges });
    }
  }, [pushState]);

  // ===== ワークフロー追加フック =====
  const { addWorkflow } = useWorkflow({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory,
    templates: { materialTemplates: {}, conditionTemplates: {}, resultTemplates: {} },
    setTemplates: () => {},
  });

  // ===== Refs =====
  const hasLoadedRef = useRef(false);
  const maimlDataRef = useRef<string | null>(null);
  const isFirstNodeRef = useRef(true);

  // ===== カスタムノードタイプ =====
  const nodeTypes = useMemo(
    () => ({
      materialTemplate: MaterialTemplateNode,
      conditionTemplate: ConditionTemplateNode,
      resultTemplate: ResultTemplateNode,
      transition: TransitionNode,
    }),
    []
  );

  console.log('🔍 [PetriNetEditor] Received editingFileName:', editingFileName);

  // ===== useEffect: history.presentとの同期 =====
  useEffect(() => {
    if (history.present.nodes && history.present.edges) {
      setNodes(history.present.nodes);
      setEdges(history.present.edges);
      console.log('↻ [PetriNetEditor] 履歴から状態復元:', {
        nodesCount: history.present.nodes.length,
        edgesCount: history.present.edges.length,
      });
    }
  }, [history.present, setNodes, setEdges]);

  // ===== useEffect: キーボードショートカット =====
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (templateEditorOpen || workflowDialogOpen) {
        return;
      }
      
      if (!event.key) {
        return;
      }
      
      const target = event.target as HTMLElement;
      const isTextInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
      
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          event.preventDefault();
          if (nodes.length > 0) {
            handleOpenSaveConfirmDialog();
            console.log('⌨️ [PetriNetEditor] Ctrl+S: 保存');
          }
        } else if (event.key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            if (canRedo) {
              redo();
              console.log('⌨️ [PetriNetEditor] Ctrl+Shift+Z: Redo');
            }
          } else {
            if (canUndo) {
              undo();
              console.log('⌨️ [PetriNetEditor] Ctrl+Z: Undo');
            }
          }
        } else if (event.key === 'y') {
          event.preventDefault();
          if (canRedo) {
            redo();
            console.log('⌨️ [PetriNetEditor] Ctrl+Y: Redo');
          }
        } else if (event.key === 'c' && !isTextInput) {
          event.preventDefault();
          if (selectedNodes.length > 0) {
            handleCopy();
            console.log('⌨️ [PetriNetEditor] Ctrl+C: Copy');
          }
        } else if (event.key === 'v' && !isTextInput) {
          event.preventDefault();
          if (clipboard) {
            handlePaste();
            console.log('⌨️ [PetriNetEditor] Ctrl+V: Paste');
          }
        }
      } else if (!event.ctrlKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === 'm' || key === 'c' || key === 'r' || key === 't') {
          setPressedKeys(prev => new Set(prev).add(key));
          console.log('⌨️ [PetriNetEditor] キー押下:', key);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (templateEditorOpen || workflowDialogOpen) {
        return;
      }
      
      if (!event.key) {
        return;
      }
      
      const key = event.key.toLowerCase();
      if (key === 'm' || key === 'c' || key === 'r' || key === 't') {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        console.log('⌨️ [PetriNetEditor] キー解放:', key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, canUndo, canRedo, selectedNodes, clipboard, nodes, templateEditorOpen, workflowDialogOpen]);

  // ===== useEffect: ウィンドウフォーカス時にキー状態をクリア =====
  useEffect(() => {
    const handleBlur = () => {
      setPressedKeys(new Set());
      console.log('⌨️ [PetriNetEditor] フォーカス喪失: キー状態クリア');
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  // ===== useEffect: editMode='draft'時の自動DraftManager表示 =====
  useEffect(() => {
    if (editMode === 'draft' && !draftModeHandled && !isLoading) {
      console.log('💾 [PetriNetEditor] Draft復元モード検出 - DraftManagerを自動表示');
      setDraftModeHandled(true);
      setDraftManagerOpen(true);
    }
  }, [editMode, draftModeHandled, isLoading]);

  // ===== useEffect: Phase 5 - アーク属性表示トグル =====
  useEffect(() => {
    setEdges((eds) => 
      eds.map((edge) => ({
        ...edge,
        label: showArcLabels ? (edge.data?.id || edge.id) : undefined,
        labelStyle: showArcLabels ? { 
          fill: '#333',
          fontSize: 12,
          fontWeight: 500,
        } : undefined,
        labelBgStyle: showArcLabels ? { 
          fill: '#fff',
          fillOpacity: 0.8,
        } : undefined,
      }))
    );
    console.log(`🔖 [PetriNetEditor] アーク属性表示: ${showArcLabels ? 'ON' : 'OFF'}`);
  }, [showArcLabels, setEdges]);

  // ===== Phase B-1: validationResult変更時にエラー視覚化適用 =====
  useEffect(() => {
    applyErrorVisualization();
  }, [validationResult, applyErrorVisualization]);

  // ===== useEffect: MaiMLデータ読み込みと変換 =====
  useEffect(() => {
    const fetchPetriNetData = async () => {
      if (!effectiveMaimlData) {
        console.log('🆕 [PetriNetEditor] 新規作成モード: 空の状態で起動');
        
        // sourceContextに応じてベース名を決定
        const baseName = sourceContext === 'format' && editingFileName 
          ? editingFileName.replace(/\.maiml$/, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
          : projectName;
        
        if (baseName && !documentData) {
          // 空のDocumentDataを作成
          const emptyDocumentData: DocumentData = {
            id: '',
            protocolId: '',
            methodId: '',
            pnmlId: '',
            programId: '',
            name: '',
            description: '',
            date: '',
            uuid: '',
            creators: [],  // 空配列
            vendors: [],   // 空配列
            owners: [],    // 空配列
            instruments: [],
          };
          
          // sourceContext === 'project' の場合のみfillMissingDocumentFieldsで補完
          const initialDocumentData = sourceContext === 'project'
            ? fillMissingDocumentFields(emptyDocumentData, baseName)
            : emptyDocumentData;
          
          setDocumentData(initialDocumentData);
          console.log('📄 [PetriNetEditor] Document初期化:', {
            sourceContext,
            baseName,
            補完実行: sourceContext === 'project',
            documentId: initialDocumentData.id,
            protocolId: initialDocumentData.protocolId,
            methodId: initialDocumentData.methodId,
          });
        }
        
        setIsLoading(false);
        setError(null);
        setNodes([]);
        setEdges([]);
        reset({ nodes: [], edges: [] });
        
        const newMethodId = documentData?.methodId || `method_${Date.now()}`;
        const initialMethod: MethodData = {
          methodId: newMethodId,
          methodIndex: 0,
          name: 'Method 1',
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        };
        setMethods([initialMethod]);
        setActiveMethodIndex(0);
        setMultiMethodMode(false);
        
        console.log('📋 [PetriNetEditor] 新規作成: Method配列初期化');
        
        return;
      }
      
      if (hasLoadedRef.current && maimlDataRef.current === effectiveMaimlData) {
        console.log('🔍 [PetriNetEditor] 既に読み込み済み、スキップ');
        return;
      }
      
      try {
        console.log('🔍 [PetriNetEditor] ペトリネット初期化開始（API経由）');
        setIsLoading(true);
        setError(null);
        
        hasLoadedRef.current = true;
        maimlDataRef.current = effectiveMaimlData;
        
        // Phase 6: 新しいAPI /api/v1/maiml/parse-petri-net-structure を使用
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ [PetriNetEditor] 認証トークンが見つかりません');
          throw new Error('認証トークンが見つかりません');
        }
        
        const multiMethodResponse = await fetch('/api/v1/maiml/parse-petri-net-structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ content: effectiveMaimlData }),
          credentials: 'include'
        });
        
        let isMultiMethod = false;
        
        if (multiMethodResponse.ok) {
          const multiMethodResult = await multiMethodResponse.json();
          
          // 新しいAPIのレスポンス形式: { success: true, data: { success, isMultiMethod, methods, ... } }
          if (multiMethodResult.success && multiMethodResult.data?.success && multiMethodResult.data.methods) {
            const methodsData = multiMethodResult.data.methods;
            
            console.log('🎯 [PetriNetEditor] 新API使用 - 複数method構造取得:', {
              apiVersion: multiMethodResult.meta?.apiVersion || 'unknown',
              isMultiMethod: multiMethodResult.data.isMultiMethod,
              methodCount: methodsData.length,
            });
            
            console.log('🎯 [PetriNetEditor] 複数method構造取得:', {
              methodCount: methodsData.length,
            });
            
            if (methodsData.length > 0) {
              isMultiMethod = methodsData.length > 1;
              
              const extractedDocument = extractDocumentFromMaiML(effectiveMaimlData || '');
              if (extractedDocument) {
                // まず元のファイル名を設定
                const documentWithFileName: DocumentData = {
                  ...extractedDocument,
                  name: extractedDocument.name || (originalFileName 
                    ? originalFileName.replace('.maiml', '') 
                    : 'document')
                };
                
                // sourceContext === 'project' の場合のみ不足フィールドを補完
                const baseName = projectName || documentWithFileName.name || 'template';
                const documentToSet = sourceContext === 'project'
                  ? fillMissingDocumentFields(documentWithFileName, baseName)
                  : documentWithFileName;
                
                setDocumentData(documentToSet);
                console.log('📄 [PetriNetEditor] Document読み込み完了（複数method）:', {
                  sourceContext,
                  補完実行: sourceContext === 'project',
                  originalId: extractedDocument.id,
                  finalId: documentToSet.id,
                  creatorsCount: documentToSet.creators.length,
                  vendorsCount: documentToSet.vendors.length,
                  ownersCount: documentToSet.owners.length,
                });
              }
              
              const convertedMethods = methodsData.map((method: any, index: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                // 各methodのデータをparse
                const methodStructure = parseMaimlToPetriNet(effectiveMaimlData || '', method.methodId);
                
                const { nodes: methodNodes, edges: methodEdges } = 
                  convertToReactFlow(methodStructure);
                
                const styledEdges = methodEdges.map(edge => ({
                  ...edge,
                  type: 'default' as const,
                  animated: false,
                  style: { 
                    stroke: '#333',
                    strokeWidth: 2,
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#333',
                  },
                }));
                
                return {
                  methodId: method.methodId,
                  methodIndex: index,
                  name: `Method ${index + 1}`,
                  nodes: methodNodes,
                  edges: styledEdges,
                  viewport: { x: 0, y: 0, zoom: 1 }
                };
              });
              
              console.log('✅ [PetriNetEditor] 複数method変換完了');
              
              setMethods(convertedMethods);
              setActiveMethodIndex(0);
              setMultiMethodMode(isMultiMethod);
              
              const firstMethod = convertedMethods[0];
              setNodes(firstMethod.nodes);
              setEdges(firstMethod.edges);
              
              reset({ nodes: firstMethod.nodes, edges: firstMethod.edges });
              
              setTimeout(() => {
                fitView({ padding: 0.2, duration: 300 });
              }, 100);
              
              setIsLoading(false);
              return;
            }
          }
        }
        
        console.log('🔄 [PetriNetEditor] フォールバック: 単一method処理');
        
        const extractedDocument = extractDocumentFromMaiML(effectiveMaimlData);
        if (extractedDocument) {
          // まず元のファイル名を設定
          const documentWithFileName: DocumentData = {
            ...extractedDocument,
            name: extractedDocument.name || (originalFileName 
              ? originalFileName.replace('.maiml', '') 
              : 'document')
          };
          
          // sourceContext === 'project' の場合のみ不足フィールドを補完
          const baseName = projectName || documentWithFileName.name || 'template';
          const documentToSet = sourceContext === 'project'
            ? fillMissingDocumentFields(documentWithFileName, baseName)
            : documentWithFileName;
          
          setDocumentData(documentToSet);
          console.log('📄 [PetriNetEditor] Document読み込み完了（単一method）:', {
            sourceContext,
            補完実行: sourceContext === 'project',
            originalId: extractedDocument.id,
            finalId: documentToSet.id,
            creatorsCount: documentToSet.creators.length,
            vendorsCount: documentToSet.vendors.length,
            ownersCount: documentToSet.owners.length,
          });
        }
        
        // parseMaimlToPetriNetで直接パース
        const structure = parseMaimlToPetriNet(effectiveMaimlData);
        
        const { nodes: convertedNodes, edges: convertedEdges } =
          convertToReactFlow(structure);

        console.log('✅ [PetriNetEditor] 変換完了');

        const styledEdges = convertedEdges.map((edge: Edge) => ({
          ...edge,
          type: 'default' as const,
          animated: false,
          style: { 
            stroke: '#333',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#333',
          },
        }));

        setNodes(convertedNodes);
        setEdges(styledEdges);
        
        reset({ nodes: convertedNodes, edges: styledEdges });
        
        const initialMethod: MethodData = {
          methodId: extractedDocument?.methodId || `method_${Date.now()}`,
          methodIndex: 0,
          name: 'Method 1',
          nodes: convertedNodes,
          edges: styledEdges,
          viewport: { x: 0, y: 0, zoom: 1 }
        };
        setMethods([initialMethod]);
        setActiveMethodIndex(0);
        setMultiMethodMode(false);
        
        console.log('📋 [PetriNetEditor] Method配列初期化');
        
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
        }, 100);
        
        setIsLoading(false);
        
        // ✅ Phase A-1: 自動バリデーション追加
        // データ読み込み完了後、500ms後に自動バリデーション実行
        setTimeout(() => {
          handleValidate();
        }, 500);
      } catch (err) {
        console.error('❌ [PetriNetEditor] 初期化エラー:', err);
        setError((err as Error).message || 'ペトリネット構造の読み込みに失敗しました');
        setIsLoading(false);
        
        if (onError) {
          onError(err as Error);
        }
      }
    };
    
    fetchPetriNetData();
  }, [effectiveMaimlData]);

  // ===== イベントハンドラー: ノード操作 =====
  /**
   * ノード追加ハンドラー
   * @param nodeType - ノードタイプ（'material' | 'condition' | 'result' | 'transition'）
   */
  const handleAddNode = useCallback((nodeType: string) => {
    const newNode: Node = {
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
        name: `New ${nodeType}`,
        description: '',
        placeType: nodeType,
        nodeType: nodeType === 'transition' ? 'transition' : 'place',
      },
    };
    
    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });
    console.log('➕ [PetriNetEditor] ノード追加:', newNode);
  }, [setNodes, edges, pushState]);

  const handleNodesDelete = useCallback((deletedNodes: Node[]) => {
    const deletedIds = deletedNodes.map(n => n.id);
    
    const affectedEdges = edges.filter(edge => 
      deletedIds.includes(edge.source) || 
      deletedIds.includes(edge.target)
    );
    
    console.log('🗑️ [PetriNetEditor] ノード削除:', {
      deletedNodes: deletedIds,
      affectedEdges: affectedEdges.map(e => e.id)
    });
    
    setEdges((eds) => eds.filter(e => 
      !affectedEdges.find(ae => ae.id === e.id)
    ));
    
    setNodes((nds) => {
      const newNodes = nds.filter(n => !deletedIds.includes(n.id));
      const newEdges = edges.filter(e => !affectedEdges.find(ae => ae.id === e.id));
      pushState({ nodes: newNodes, edges: newEdges });
      return newNodes;
    });
  }, [edges, setEdges, setNodes, pushState]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    console.log('🗑️ [PetriNetEditor] PropertyPanelからノード削除:', nodeId);
    
    setNodes((nds) => {
      const newNodes = nds.filter(n => n.id !== nodeId);
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });
    
    setSelectedNode(null);
  }, [setNodes, edges, pushState]);

  const handleConnect = useCallback((connection: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const edgeId = `arc-${Date.now()}`;
    const newEdge = {
      ...connection,
      id: edgeId,
      type: 'default',
      animated: false,
      style: { strokeWidth: 2 },
      markerEnd: {
        type: 'arrowclosed',
        color: '#333',
      },
      data: {
        id: edgeId,
      }
    };
    
    setEdges((eds) => {
      const newEdges = addEdge(newEdge, eds);
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    console.log('🔗 [PetriNetEditor] エッジ追加:', newEdge);
  }, [setEdges, nodes, pushState]);

  const handleEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    const deletedIds = deletedEdges.map(e => e.id);
    
    console.log('🗑️ [PetriNetEditor] エッジ削除（Deleteキー）:', {
      deletedEdges: deletedIds
    });
    
    setEdges((eds) => {
      const newEdges = eds.filter(e => !deletedIds.includes(e.id));
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    
    setSelectedEdge(null);
  }, [nodes, setEdges, pushState]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    console.log('🗑️ [PetriNetEditor] PropertyPanelからエッジ削除:', edgeId);
    
    setEdges((eds) => {
      const newEdges = eds.filter(e => e.id !== edgeId);
      pushState({ nodes, edges: newEdges });
      return newEdges;
    });
    
    setSelectedEdge(null);
  }, [setEdges, nodes, pushState]);

  // ドラッグ終了後の履歴保存（reference版と同じ実装）
  const handleNodeDragStop = useCallback((event: React.MouseEvent | React.TouchEvent, node: Node) => {
    // reference版と同様に、setTimeout(..., 0)で次のイベントループで履歴保存
    console.log('📍 [PetriNetEditor] ノード移動:', {
      id: node.id,
      position: node.position
    });
    
    setTimeout(() => {
      pushState({ nodes, edges });
    }, 0);
  }, [nodes, edges, pushState]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('📍 [PetriNetEditor] ノード選択:', {
      id: node.id,
      type: node.type,
    });
    setSelectedNode(node);
  }, []);

  const handleSelectionChange = useCallback(({ nodes: selectedNodesParam }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodesParam);
    if (selectedNodesParam.length === 1) {
      setSelectedNode(selectedNodesParam[0]);
    } else if (selectedNodesParam.length === 0) {
      setSelectedNode(null);
    } else {
      setSelectedNode(null);
    }
    console.log('📍 [PetriNetEditor] 選択変更:', {
      count: selectedNodesParam.length,
    });
  }, []);

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (selectedTool === 'workflow') {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      console.log('📍 [PetriNetEditor] ワークフロー追加位置クリック:', position);
      
      setPendingClickPosition(position);
      
      openWorkflowDialogInternal();
      
      return;
    }
    
    let nodeType: string | null = null;
    if (pressedKeys.has('m')) {
      nodeType = 'material';
    } else if (pressedKeys.has('c')) {
      nodeType = 'condition';
    } else if (pressedKeys.has('r')) {
      nodeType = 'result';
    } else if (pressedKeys.has('t')) {
      nodeType = 'transition';
    }
    
    if (!nodeType) return;
    
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType === 'transition' ? 'transition' : 
            nodeType === 'material' ? 'materialTemplate' :
            nodeType === 'condition' ? 'conditionTemplate' : 'resultTemplate',
      position,
      data: {
        id: `${nodeType}-${Date.now()}`,
        name: `New ${nodeType}`,
        description: '',
        placeType: nodeType,
        nodeType: nodeType === 'transition' ? 'transition' : 'place',
      },
    };
    
    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });
    
    console.log(`✨ [PetriNetEditor] ノード追加:`, {
      nodeType,
      position,
    });
  }, [pressedKeys, edges, pushState, setNodes, screenToFlowPosition, selectedTool]);

  const handleClosePropertyPanel = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleUpdateNodeProperty = useCallback((nodeId: string, newData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setNodes((nds) => {
      const newNodes = nds.map((node) =>
        node.id === nodeId ? { ...node, data: newData } : node
      );
      pushState({ nodes: newNodes, edges });
      
      const updatedNode = newNodes.find(n => n.id === nodeId);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
      
      return newNodes;
    });
    console.log('📝 [PetriNetEditor] プロパティ更新:', { nodeId, newData });
  }, [setNodes, edges, pushState]);

  const handleUpdateEdgeProperty = useCallback((edgeId: string, newId: string) => {
    setEdges((eds) => {
      const newEdges = eds.map((edge) =>
        edge.id === edgeId ? { ...edge, id: newId, data: { ...edge.data, id: newId } } : edge
      );
      pushState({ nodes, edges: newEdges });
      
      const updatedEdge = newEdges.find(e => e.id === newId);
      if (updatedEdge) {
        setSelectedEdge(updatedEdge);
      }
      
      return newEdges;
    });
    console.log('📝 [PetriNetEditor] エッジID更新:', { oldId: edgeId, newId });
  }, [setEdges, nodes, pushState]);

  // ===== Phase B-2: ノードID変更機能 =====
  const handleUpdateNodeId = useCallback((oldId: string, newId: string) => {
    console.log('🔄 [PetriNetEditor] ノードID変更:', { oldId, newId });
    
    // バリデーション
    if (oldId === newId) {
      return; // 変更なし
    }
    if (!newId || newId.trim() === '') {
      alert('IDを入力してください');
      return;
    }
    
    // 重複チェック
    const exists = nodes.some(n => n.id === newId && n.id !== oldId);
    if (exists) {
      alert('このIDは既に使用されています');
      return;
    }
    
    // ノードID変更
    setNodes(nds => {
      const newNodes = nds.map(node =>
        node.id === oldId 
          ? { ...node, id: newId, data: { ...node.data, id: newId } } 
          : node
      );
      
      // 関連エッジも更新
      setEdges(eds => {
        const newEdges = eds.map(edge => ({
          ...edge,
          source: edge.source === oldId ? newId : edge.source,
          target: edge.target === oldId ? newId : edge.target,
        }));
        
        pushState({ nodes: newNodes, edges: newEdges });
        return newEdges;
      });
      
      // 選択状態を更新
      if (selectedNode?.id === oldId) {
        const updatedNode = newNodes.find(n => n.id === newId);
        if (updatedNode) {
          setSelectedNode(updatedNode);
        }
      }
      
      return newNodes;
    });
    
    console.log('✅ [PetriNetEditor] ノードID変更完了:', { oldId, newId });
  }, [nodes, selectedNode, setNodes, setEdges, pushState]);

  const handleCopy = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    if (selectedNodes.length === 1) {
      const node = selectedNodes[0];
      setClipboard({
        type: node.type,
        position: node.position,
        data: { ...node.data },
      });
      console.log('📋 [PetriNetEditor] コピー:', node.data.name);
    } else {
      setClipboard({
        multiple: true,
        nodes: selectedNodes.map(node => ({
          type: node.type,
          position: node.position,
          data: { ...node.data },
        })),
      });
      console.log('📋 [PetriNetEditor] 複数コピー:', selectedNodes.length, 'ノード');
    }
  }, [selectedNodes]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    
    if (clipboard.multiple) {
      const newNodes = clipboard.nodes.map((clipNode: any, index: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const timestamp = Date.now() + index;
        const newId = `${clipNode.data.placeType || clipNode.data.nodeType}-${timestamp}`;
        return {
          id: newId,
          type: clipNode.type,
          position: {
            x: clipNode.position.x + 50,
            y: clipNode.position.y + 50,
          },
          data: {
            ...clipNode.data,
            id: newId,
            name: `${clipNode.data.name} (Copy)`,
          },
        };
      });
      
      setNodes((nds) => {
        const updatedNodes = [...nds, ...newNodes];
        pushState({ nodes: updatedNodes, edges });
        return updatedNodes;
      });
      
      console.log('📋 [PetriNetEditor] 複数ペースト:', newNodes.length, 'ノード');
    } else {
      const timestamp = Date.now();
      const newId = `${clipboard.data.placeType || clipboard.data.nodeType}-${timestamp}`;
      
      const newNode: Node = {
        id: newId,
        type: clipboard.type,
        position: {
          x: clipboard.position.x + 50,
          y: clipboard.position.y + 50,
        },
        data: {
          ...clipboard.data,
          id: newId,
          name: `${clipboard.data.name} (Copy)`,
        },
      };
      
      setNodes((nds) => {
        const newNodes = [...nds, newNode];
        pushState({ nodes: newNodes, edges });
        return newNodes;
      });
      
      setSelectedNode(newNode);
      
      console.log('📋 [PetriNetEditor] ペースト:', newNode.data.name);
    }
  }, [clipboard, edges, pushState, setNodes]);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    console.log('🔗 [PetriNetEditor] エッジ選択:', {
      id: edge.id,
      source: edge.source,
      target: edge.target,
    });
    
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, []);

  // ===== Phase A-2: エディタモード変更時にビューポート保存 =====
  const handleEditorModeChange = useCallback((newMode: 'petri-net' | 'template') => {
    if (newMode === 'template' && editorMode === 'petri-net') {
      // ペトリネットモードから切り替え時にビューポートを保存
      const currentViewport = getViewport();
      setSavedPetriNetViewport(currentViewport);
      console.log('💾 [PetriNetEditor] ビューポート保存:', currentViewport);
    }
    
    setEditorMode(newMode);
  }, [editorMode, getViewport]);
  
  // ===== Phase A-2: ペトリネットモードに戻る時にビューポート復元 =====
  useEffect(() => {
    if (editorMode === 'petri-net' && savedPetriNetViewport) {
      setTimeout(() => {
        setViewport(savedPetriNetViewport, { duration: 300 });
        console.log('🔄 [PetriNetEditor] ビューポート復元:', savedPetriNetViewport);
      }, 100);
    }
  }, [editorMode, savedPetriNetViewport, setViewport]);
  
  // ===== イベントハンドラー: ダイアログ操作 =====
  const handleOpenTemplateEditor = useCallback((node: Node) => {
    console.log('🔧 [PetriNetEditor] テンプレート編集:', node);
    
    // テンプレート編集ダイアログを開く前に現在の状態を履歴に保存
    pushState({ nodes, edges });
    
    setTemplateEditNode(node);
    setTemplateEditorOpen(true);
  }, [nodes, edges, pushState]);

  const handleCloseTemplateEditor = useCallback(() => {
    setTemplateEditorOpen(false);
    setTemplateEditNode(null);
  }, []);

  const convertNestedPropertiesToArray = useCallback((propertiesObj: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!propertiesObj || typeof propertiesObj !== 'object') {
      return [];
    }
    
    const convertPropertyRecursive = (prop: any, explicitKey: string | null = null): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const xsiType = prop.attributes?.['xsi:type'] || 'stringType';
      const finalKey = explicitKey || prop.key;
      
      const result: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        key: finalKey,
        name: finalKey,
        tagName: prop.tagName || 'property',
        type: xsiType,
        xsiType: xsiType,
      };
      
      if (prop.attributes) {
        if (prop.attributes.units) result.units = prop.attributes.units;
        if (prop.attributes.formatString) result.formatString = prop.attributes.formatString;
        if (prop.attributes.scaleFactor) result.scaleFactor = prop.attributes.scaleFactor;
      }
      
      if (xsiType === 'structuredType' || xsiType === 'arrayType') {
        if (prop.properties) {
          result.properties = Object.entries(prop.properties).map(([key, childProp]) =>
            convertPropertyRecursive(childProp, key)
          );
        }
        if (prop.value !== undefined) {
          result.value = prop.value;
        }
      } else {
        result.value = prop.value ?? '';
      }
      
      return result;
    };
    
    return Object.entries(propertiesObj).map(([key, prop]) => 
      convertPropertyRecursive(prop, key)
    );
  }, []);

  const handleSaveTemplate = useCallback((updatedNode: Node) => {
    console.log('💾 [PetriNetEditor] テンプレート保存:', updatedNode);
    
    // ✅ ペトリネットに配置されているかチェック
    const existsInPetriNet = nodes.some(n => n.id === updatedNode.id);
    
    if (updatedNode.data.isNewTemplate) {
      // 新規テンプレート: TemplateContextに追加（ペトリネットには追加しない）
      console.log('🆕 [PetriNetEditor] 新規テンプレートをTemplateContextに追加:', updatedNode.id);
      
      // カテゴリの判定
      const category = updatedNode.type === 'materialTemplate' ? 'material' :
                      updatedNode.type === 'conditionTemplate' ? 'condition' : 'result';
      
      // テンプレートデータを作成
      const templateData = convertNodeToTemplateData(updatedNode);
      
      // TemplateContextに追加
      addTemplate({ category, template: templateData });
      
      console.log('✅ [PetriNetEditor] テンプレート追加完了（ペトリネットには非表示）');
    } else if (existsInPetriNet) {
      // ペトリネットに配置済みのテンプレート: nodesを更新
      console.log('📝 [PetriNetEditor] ペトリネット内のテンプレートを更新:', updatedNode.id);
      handleUpdateNodeProperty(updatedNode.id, updatedNode.data);
    } else {
      // ペトリネット未配置の既存テンプレート: TemplateContextを更新
      console.log('📝 [PetriNetEditor] TemplateContextのテンプレートを更新:', updatedNode.id);
      
      // テンプレートデータを作成
      const templateData = convertNodeToTemplateData(updatedNode);
      
      // TemplateContextを更新
      updateTemplate(updatedNode.id, templateData);
      
      console.log('✅ [PetriNetEditor] テンプレート更新完了');
    }
    
    setTemplateEditorOpen(false);
    setTemplateEditNode(null);
  }, [nodes, addTemplate, updateTemplate, convertNodeToTemplateData, handleUpdateNodeProperty]);

  const handleOpenDocumentEditor = useCallback(() => {
    console.log('📄 [PetriNetEditor] Document編集ダイアログを開く');
    setDocumentDialogOpen(true);
  }, []);

  const handleCloseDocumentEditor = useCallback(() => {
    console.log('📄 [PetriNetEditor] Document編集ダイアログを閉じる');
    setDocumentDialogOpen(false);
  }, []);

  const handleSaveDocument = useCallback((updatedDocument: DocumentData) => {
    console.log('💾 [PetriNetEditor] Document保存:', updatedDocument);
    setDocumentData(updatedDocument);
    setDocumentDialogOpen(false);
  }, []);

  const handleOpenDraftManager = useCallback(() => {
    console.log('💾 [PetriNetEditor] DraftManager開く');
    setDraftManagerOpen(true);
  }, []);

  const handleCloseDraftManager = useCallback(() => {
    console.log('💾 [PetriNetEditor] DraftManager閉じる');
    setDraftManagerOpen(false);
  }, []);

  const handleLoadDraft = useCallback((draft: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log('💾 [PetriNetEditor] Draft読み込み:', draft);
    
    if (draft.nodes && draft.edges) {
      setNodes(draft.nodes);
      setEdges(draft.edges);
      reset({ nodes: draft.nodes, edges: draft.edges });
      
      if (draft.documentData) {
        setDocumentData(draft.documentData);
      }
      
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
    
    setDraftManagerOpen(false);
  }, [setNodes, setEdges, reset, fitView]);

  // ===== Phase A-3: エラー分類関数 =====
  const classifyErrors = useCallback((errors: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const critical: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const nonCritical: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    errors.forEach(error => {
      const isCritical = 
        error.code === 'syntax_error' || 
        error.code === 'invalid_structure' ||
        error.severity === 'critical';
      
      if (isCritical) {
        critical.push(error);
      } else {
        nonCritical.push(error);
      }
    });
    
    setCriticalErrors(critical);
    setNonCriticalErrors(nonCritical);
    
    console.log('🔍 [PetriNetEditor] エラー分類:', {
      critical: critical.length,
      nonCritical: nonCritical.length
    });
  }, []);

  const handleValidate = useCallback(async () => {
    console.log('✅ [PetriNetEditor] バリデーション開始');
    setIsValidating(true);
    setValidationPanelOpen(true);
    
    try {
      // MaiML生成
      const safeDocumentData: DocumentData = documentData || {
        id: 'document_default',
        protocolId: 'protocol_default',
        methodId: 'method_default',
        pnmlId: 'pnml_default',
        programId: 'program_default',
        name: 'Untitled',
        description: '',
        date: new Date().toISOString(),
        uuid: crypto.randomUUID(),
        creators: [],  // 空配列（マスタから追加）
        vendors: [],   // 空配列（マスタから追加）
        owners: [],    // 空配列（マスタから追加）
        instruments: [],
      };
      
      const maimlXml = await convertReactFlowToMaiML(
        nodes,
        edges,
        {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        safeDocumentData
      );
      
      // 実APIでバリデーション
      const apiResponse = await validateMaiml(maimlXml, false);
      
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error?.message || 'バリデーションに失敗しました');
      }
      
      const result = apiResponse.data;
      
      // エラーを文字列配列からオブジェクト配列に変換（エラー分類用）
      const errorObjects = result.errors.map(msg => ({
        code: 'VALIDATION_ERROR',
        message: msg,
        elementType: null,
        elementId: null
      }));
      
      // ✅ Phase A-3: エラー分類を実行
      if (errorObjects.length > 0) {
        classifyErrors(errorObjects);
      } else {
        // エラーなし - クリア
        setCriticalErrors([]);
        setNonCriticalErrors([]);
      }
      
      // ValidationPanel用のフォーマット
      setValidationResult({
        valid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
      });
      
      console.log('✅ [PetriNetEditor] バリデーション完了:', result);
    } catch (error) {
      console.error('❌ [PetriNetEditor] バリデーションエラー:', error);
      setValidationResult({
        valid: false,
        errors: [(error as Error).message],
        warnings: [],
      });
      setCriticalErrors([]);
      setNonCriticalErrors([]);
    } finally {
      setIsValidating(false);
    }
  }, [nodes, edges, documentData, classifyErrors]);

  const handleAutoCorrect = useCallback(async (selectedErrors: number[]) => {
    console.log('🔧 [PetriNetEditor] 自動補正開始');
    setIsCorrecting(true);
    
    try {
      // MaiML生成
      const safeDocumentData: DocumentData = documentData || {
        id: 'document_default',
        protocolId: 'protocol_default',
        methodId: 'method_default',
        pnmlId: 'pnml_default',
        programId: 'program_default',
        name: 'Untitled',
        description: '',
        date: new Date().toISOString(),
        uuid: crypto.randomUUID(),
        creators: [{ id: 'Creator', name: '', uuid: '', description: '', annotation: '' }],
        vendors: [{ id: 'Vendor', name: '', uuid: '', description: '', annotation: '' }],
        owners: [{ id: 'Owner', name: '', uuid: '', description: '', annotation: '' }],
        instruments: [{ id: 'Instrument', name: '', uuid: '', description: '', annotation: '' }],
      };
      
      const maimlXml = await convertReactFlowToMaiML(
        nodes,
        edges,
        {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        safeDocumentData
      );
      
      // 実APIで自動補正
      const apiResponse = await correctMaiml(maimlXml, 'safe');
      
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error?.message || '自動補正に失敗しました');
      }
      
      const result = apiResponse.data;
      
      if (result.corrected && result.correctedContent) {
        console.log('✅ [PetriNetEditor] 自動補正完了:', result.corrections);
        alert(`自動補正が完了しました\n\n適用された補正: ${result.corrections.length}件`);
        // 補正結果を反映する場合はここで処理
        // TODO: 補正されたMAIMLを再パースして表示
      } else {
        alert('補正が必要なエラーはありませんでした');
      }
    } catch (error) {
      console.error('❌ [PetriNetEditor] 自動補正エラー:', error);
      alert('自動補正に失敗しました: ' + (error as Error).message);
    } finally {
      setIsCorrecting(false);
    }
  }, [nodes, edges, documentData]);

  const handleOpenSaveConfirmDialog = useCallback(() => {
    console.log('💾 [PetriNetEditor] 保存確認ダイアログを開く');
    setSaveConfirmDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (action: string, destination: string, folder: string) => {
    console.log('💾 [PetriNetEditor] 保存開始:', { action, destination, folder });
    setIsSaving(true);
    
    try {
      // documentDataのundefinedチェック
      const safeDocumentData: DocumentData = documentData || {
        id: 'document_default',
        protocolId: 'protocol_default',
        methodId: 'method_default',
        pnmlId: 'pnml_default',
        programId: 'program_default',
        name: 'Untitled',
        description: '',
        date: new Date().toISOString(),
        uuid: crypto.randomUUID(),
        creators: [{ id: 'Creator', name: '', uuid: '', description: '', annotation: '' }],
        vendors: [{ id: 'Vendor', name: '', uuid: '', description: '', annotation: '' }],
        owners: [{ id: 'Owner', name: '', uuid: '', description: '', annotation: '' }],
        instruments: [{ id: 'Instrument', name: '', uuid: '', description: '', annotation: '' }],
      };
      
      let maimlXml: string;
      
      if (multiMethodMode && methods.length > 1) {
        const methodsWithUpdatedData = methods.map((method, index) => {
          if (index === activeMethodIndex) {
            return {
              ...method,
              nodes,
              edges,
              viewport: getViewport(),
            };
          }
          return method;
        });
        
        console.log('💾 [PetriNetEditor] 複数Method保存:', {
          methodCount: methodsWithUpdatedData.length,
        });
        
        maimlXml = await convertMultipleMethodsToMaiML(
          methodsWithUpdatedData,
          safeDocumentData,
          {} as any // eslint-disable-line @typescript-eslint/no-explicit-any
        );
      } else {
        console.log('💾 [PetriNetEditor] 単一Method保存');
        
        maimlXml = await convertReactFlowToMaiML(
          nodes,
          edges,
          {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          safeDocumentData
        );
      }
      
      // 保存先による処理分岐
      if (destination === 'download') {
        // ローカルダウンロード
        console.log('💾 [PetriNetEditor] ローカルダウンロード実行');
        
        const fileName = editingFileName || documentData?.name || 'Untitled';
        const downloadFileName = fileName.endsWith('.maiml') ? fileName : `${fileName}.maiml`;
        
        const blob = new Blob([maimlXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        console.log('✅ [PetriNetEditor] ローカルダウンロード完了:', downloadFileName);
        setSaveConfirmDialogOpen(false);
      } else {
        // S3保存
        const targetS3Key = folder;
        const base64Data = btoa(unescape(encodeURIComponent(maimlXml)));
        
        const response = await fetch('/api/worker/save-maiml-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            s3Key: targetS3Key,
            content: base64Data,
          }),
        });
        
        if (!response.ok) {
          throw new Error('保存に失敗しました');
        }
        
        const result = await response.json();
        console.log('✅ [PetriNetEditor] S3保存成功:', result);
        
        setSaveConfirmDialogOpen(false);
      }
    } catch (error) {
      console.error('❌ [PetriNetEditor] 保存エラー:', error);
      alert('保存に失敗しました: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, documentData, multiMethodMode, methods, activeMethodIndex, getViewport, editingFileName]);

  const handleMethodTabChange = useCallback((index: number) => {
    console.log('📑 [PetriNetEditor] Methodタブ切り替え:', index);
    
    const updatedMethods = [...methods];
    updatedMethods[activeMethodIndex] = {
      ...updatedMethods[activeMethodIndex],
      nodes,
      edges,
      viewport: getViewport(),
    };
    
    setMethods(updatedMethods);
    
    const targetMethod = updatedMethods[index];
    setNodes(targetMethod.nodes);
    setEdges(targetMethod.edges);
    reset({ nodes: targetMethod.nodes, edges: targetMethod.edges });
    
    if (targetMethod.viewport) {
      setViewport(targetMethod.viewport);
    }
    
    setActiveMethodIndex(index);
    
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 100);
  }, [methods, activeMethodIndex, nodes, edges, getViewport, setNodes, setEdges, reset, setViewport, fitView]);

  const handleAddMethod = useCallback(() => {
    console.log('➕ [PetriNetEditor] 新規Method追加');
    
    const updatedMethods = [...methods];
    updatedMethods[activeMethodIndex] = {
      ...updatedMethods[activeMethodIndex],
      nodes,
      edges,
      viewport: getViewport(),
    };
    
    const newMethodIndex = methods.length;
    const newMethodId = `method_${Date.now()}`;
    
    const newMethod: MethodData = {
      methodId: newMethodId,
      methodIndex: newMethodIndex,
      name: `Method ${newMethodIndex + 1}`,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    
    const newMethods = [...updatedMethods, newMethod];
    setMethods(newMethods);
    setMultiMethodMode(true);
    
    setNodes([]);
    setEdges([]);
    reset({ nodes: [], edges: [] });
    setActiveMethodIndex(newMethodIndex);
    
    console.log('✅ [PetriNetEditor] 新規Method追加完了:', newMethod);
  }, [methods, activeMethodIndex, nodes, edges, getViewport, setNodes, setEdges, reset]);

  const openWorkflowDialogInternal = useCallback(async () => {
    console.log('📂 [PetriNetEditor] ファイル一覧取得開始');
    setIsLoadingFiles(true);
    
    try {
      const response = await fetch('/api/worker/list-maiml-files', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('ファイル一覧の取得に失敗しました');
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.files) {
        setAvailableFiles(result.data.files);
        console.log('✅ [PetriNetEditor] ファイル一覧取得完了:', result.data.files.length);
      } else {
        setAvailableFiles([]);
      }
    } catch (error) {
      console.error('❌ [PetriNetEditor] ファイル一覧取得エラー:', error);
      setAvailableFiles([]);
    } finally {
      setIsLoadingFiles(false);
      setWorkflowDialogOpen(true);
    }
  }, []);

  const handleOpenWorkflowDialog = useCallback(() => {
    console.log('📂 [PetriNetEditor] Workflow追加ダイアログを開く');
    openWorkflowDialogInternal();
  }, [openWorkflowDialogInternal]);

  const handleCloseWorkflowDialog = useCallback(() => {
    console.log('📂 [PetriNetEditor] Workflow追加ダイアログを閉じる');
    setWorkflowDialogOpen(false);
    setPendingClickPosition(null);
  }, []);

  // ===== TemplateListView ハンドラー =====
  const handleTemplateSelect = useCallback((template: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log('📋 [PetriNetEditor] テンプレート選択:', template);
    
    // ペトリネットに配置されているかチェック
    const node = nodes.find(n => n.id === template.id);
    
    if (node) {
      // ペトリネット内のノードをフォーカス
      setSelectedNode(node);
      const viewport = getViewport();
      const x = node.position.x - (viewport.x / viewport.zoom);
      const y = node.position.y - (viewport.y / viewport.zoom);
      
      setViewport({ x: -x + 400, y: -y + 300, zoom: viewport.zoom }, { duration: 300 });
      
      console.log('✅ [PetriNetEditor] ノード選択・フォーカス:', node.id);
    } else {
      // ✅ 完全な仮ノードを作成
      const tempNode: Node = {
        id: template.id,
        type: template.type === 'material' ? 'materialTemplate' :
              template.type === 'condition' ? 'conditionTemplate' : 'resultTemplate',
        position: { x: 0, y: 0 },
        data: {
          id: template.id,
          name: template.name,
          description: template.description || '',
          nodeType: 'place',
          placeType: template.type,
          // ✅ template 追加
          template: {
            id: template.id,
            type: template.type === 'material' ? 'MaterialTemplate' :
                  template.type === 'condition' ? 'ConditionTemplate' :
                  'ResultTemplate',
            uuid: template.uuid,
            name: template.name,
            description: template.description || '',
            placeRefs: template.placeRefs || [],
            templateRefs: template.templateRefs || [],
            properties: template.properties,
          },
          // ✅ templateRef 追加
          templateRef: {
            type: template.type === 'material' ? 'MaterialTemplate' :
                  template.type === 'condition' ? 'ConditionTemplate' :
                  'ResultTemplate',
            uuid: template.uuid,
            name: template.name,
            description: template.description || '',
            placeRefs: template.placeRefs || [],
            templateRefs: template.templateRefs || [],
            properties: template.properties,
          },
          isNewTemplate: false, // ✅ 既存テンプレート
        },
      };
      
      setTemplateEditNode(tempNode);
      setTemplateEditorOpen(true);
      
      console.log('✅ [PetriNetEditor] テンプレート編集ダイアログを開く:', template.id);
    }
  }, [nodes, getViewport, setViewport]);

  // ===== Phase 6: テンプレート追加ハンドラー =====
  const handleTemplateAdd = useCallback((category: 'material' | 'condition' | 'result') => {
    console.log('➕ [PetriNetEditor] テンプレート追加:', category);
    
    const timestamp = Date.now();
    const newId = `${category}Template_${timestamp}`;
    
    const tempNode: Node = {
      id: newId,
      type: category === 'material' ? 'materialTemplate' :
            category === 'condition' ? 'conditionTemplate' : 'resultTemplate',
      position: { x: 0, y: 0 }, // ダミー位置（ペトリネットに配置しないため実際には使用されない）
      data: {
        id: newId,
        name: '', // ✅ 空文字（ユーザーが入力する）
        description: '',
        nodeType: 'place',
        placeType: category,
        // ✅ template 追加
        template: {
          id: newId,
          type: category === 'material' ? 'MaterialTemplate' :
                category === 'condition' ? 'ConditionTemplate' :
                'ResultTemplate',
          uuid: crypto.randomUUID(), // ✅ UUID生成
          placeRefs: [],
          templateRefs: [],
          properties: [],
        },
        // ✅ templateRef 追加
        templateRef: {
          type: category === 'material' ? 'MaterialTemplate' :
                category === 'condition' ? 'ConditionTemplate' :
                'ResultTemplate',
          uuid: crypto.randomUUID(), // ✅ UUID生成
          name: '',
          placeRefs: [],
          templateRefs: [],
          properties: [],
        },
        // ✅ 新規作成フラグ
        isNewTemplate: true,
        templateCategory: category,
        // ✅ 共通テンプレート/メソッド内テンプレートの判定
        isCommonTemplate: showCommonTemplates,
        methodId: showCommonTemplates ? null : (documentData?.methodId || null),
      },
    };
    
    setTemplateEditNode(tempNode);
    setTemplateEditorOpen(true);
    
    console.log('✅ [PetriNetEditor] 新規テンプレート仮ノード作成:', newId);
  }, [showCommonTemplates, documentData]);

  // ===== Phase 6: テンプレート削除ハンドラー =====
  const handleTemplateDelete = useCallback((templateId: string) => {
    console.log('🗑️ [PetriNetEditor] テンプレート削除:', templateId);
    
    if (!window.confirm(`テンプレート「${templateId}」を削除しますか？\nこの操作は元に戻せません。`)) {
      return;
    }
    
    // ✅ TemplateContextから削除（window.clineDeleteTemplateを使用）
    if (window.clineDeleteTemplate) {
      window.clineDeleteTemplate(templateId);
      console.log('✅ [PetriNetEditor] テンプレート削除完了');
    } else {
      console.error('❌ [PetriNetEditor] deleteTemplate関数が見つかりません');
    }
  }, []);

  const handleConfirmWorkflowSelection = useCallback(async (selectedFile: { s3Key: string; fileName?: string }) => {
    console.log('📂 [PetriNetEditor] Workflow選択確定:', selectedFile);
    
    if (!selectedFile || !selectedFile.s3Key) {
      console.error('❌ [PetriNetEditor] 無効なファイル選択');
      return;
    }
    
    try {
      const response = await fetch('/api/worker/load-maiml-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          s3Key: selectedFile.s3Key,
        }),
      });
      
      if (!response.ok) {
        throw new Error('ファイルの読み込みに失敗しました');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data?.content) {
        throw new Error('ファイルコンテンツが取得できませんでした');
      }
      
      const maimlContent = atob(result.data.content);
      
      await addWorkflow(maimlContent, pendingClickPosition || { x: 100, y: 100 });
      
      console.log('✅ [PetriNetEditor] Workflow追加完了');
    } catch (error) {
      console.error('❌ [PetriNetEditor] Workflow追加エラー:', error);
      alert('ワークフローの追加に失敗しました: ' + (error as Error).message);
    } finally {
      setWorkflowDialogOpen(false);
      setPendingClickPosition(null);
      setSelectedTool('select');
    }
  }, [addWorkflow, pendingClickPosition]);

  // ===== ローディング表示 =====
  if (isLoading) {
    return (
      <Flex
        style={{ height: '100%' }}
        vertical
        align="center"
        justify="center"
        gap="middle"
      >
        <Spin size="large" />
        <div style={{ color: '#666', fontSize: '0.875rem' }}>
          ペトリネットを読み込んでいます...
        </div>
      </Flex>
    );
  }

  // ===== エラー表示 =====
  if (error) {
    return (
      <Flex
        style={{ height: '100%', padding: 16 }}
        align="center"
        justify="center"
      >
        <Alert
          title="エラー"
          description={error}
          type="error"
          showIcon
          style={{ maxWidth: 600 }}
        />
      </Flex>
    );
  }

  // ===== メイン表示 =====
  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* EditorToolbar */}
      <EditorToolbar
        editMode={editorMode}
        onEditModeChange={handleEditorModeChange}
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        onAddNode={handleAddNode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onValidate={handleValidate}
        onSave={handleOpenSaveConfirmDialog}
        onEditDocument={handleOpenDocumentEditor}
        onOpenDraftManager={handleOpenDraftManager}
        autoSaveEnabled={autoSaveEnabled}
        onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
        lastAutoSaveTime={lastAutoSaveTime}
        showArcLabels={showArcLabels}
        onToggleArcLabels={() => setShowArcLabels(!showArcLabels)}
      />

      {/* MethodTabPanel - 初期状態から常に表示 */}
      {methods.length > 0 && (
        <MethodTabPanel
          methods={methods}
          activeMethodIndex={activeMethodIndex}
          currentNodes={nodes}
          onChange={handleMethodTabChange}
          onAddMethod={handleAddMethod}
          onEditMethodId={(index: number, newMethodId: string) => {
            const updatedMethods = [...methods];
            updatedMethods[index] = {
              ...updatedMethods[index],
              methodId: newMethodId,
            };
            setMethods(updatedMethods);
          }}
          onDeleteMethod={(index: number) => {
            const updatedMethods = methods.filter((_, i) => i !== index);
            setMethods(updatedMethods);
            if (activeMethodIndex >= updatedMethods.length) {
              setActiveMethodIndex(updatedMethods.length - 1);
            }
          }}
        />
      )}

      {/* メインコンテンツエリア: editorModeに応じて切り替え */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {editorMode === 'petri-net' ? (
          // ペトリネットモード: ReactFlowを表示
          <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={true}
          nodesConnectable={true}
          nodesFocusable={true}
          edgesFocusable={true}
          elementsSelectable={true}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionOnDrag={false}
          panOnDrag={[1, 2]}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          style={pressedKeys.size > 0 ? { cursor: 'crosshair' } : {}}
        >
          <Background color="#aaa" gap={15} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'materialTemplate') return '#4CAF50';
              if (node.type === 'conditionTemplate') return '#2196F3';
              if (node.type === 'resultTemplate') return '#FF9800';
              return '#9E9E9E';
            }}
            style={{
              backgroundColor: '#fff',
              border: '1px solid #ddd',
            }}
          />
        </ReactFlow>
        ) : (
          // テンプレートモード: TemplateListを表示（TemplateContextから直接取得）
          <div style={{ height: '100%', backgroundColor: token.colorBgLayout }}>
            <TemplateList
              templateErrors={templateErrors}
              showCommonTemplates={showCommonTemplates}
              onShowCommonTemplatesChange={setShowCommonTemplates}
              onTemplateSelect={handleTemplateSelect}
              onTemplateAdd={handleTemplateAdd}
              onTemplateDelete={handleTemplateDelete}
            />
          </div>
        )}

        {/* PropertyPanel - ペトリネットモード時のみ表示 */}
        {editorMode === 'petri-net' && (selectedNode || selectedEdge) && (
          <PropertyPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodes={nodes}
            edges={edges}
            onClose={handleClosePropertyPanel}
            onUpdate={handleUpdateNodeProperty}
            onUpdateEdge={handleUpdateEdgeProperty}
            onUpdateNodeId={handleUpdateNodeId}
            onDelete={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onOpenTemplateEditor={handleOpenTemplateEditor}
          />
        )}
      </div>

      {/* ダイアログ群 */}
      <TemplateEditorDialog
        open={templateEditorOpen}
        node={templateEditNode}
        onClose={handleCloseTemplateEditor}
        onSave={handleSaveTemplate}
        sourceContext={sourceContext}
        editingFileName={editingFileName}
      />

      <DocumentEditDialog
        open={documentDialogOpen}
        documentData={documentData}
        onClose={handleCloseDocumentEditor}
        onSave={handleSaveDocument}
      />

      <WorkflowSelectorDialog
        open={workflowDialogOpen}
        onClose={handleCloseWorkflowDialog}
        onSelect={handleConfirmWorkflowSelection}
        availableFiles={availableFiles}
        position={pendingClickPosition}
        isLoadingFiles={isLoadingFiles}
      />

      <SaveConfirmDialog
        open={saveConfirmDialogOpen}
        onClose={() => setSaveConfirmDialogOpen(false)}
        validationResult={validationResult}
        onSave={handleSave}
        sourceFolder={sourceS3Key}
        fileName={editingFileName || documentData?.name || 'Untitled.maiml'}
      />

      <ValidationPanel
        open={validationPanelOpen}
        onClose={() => setValidationPanelOpen(false)}
        validationResult={validationResult}
        isValidating={isValidating}
        isCorrecting={isCorrecting}
        onAutoCorrect={handleAutoCorrect}
      />

      <DraftManager
        open={draftManagerOpen}
        onClose={handleCloseDraftManager}
        onLoad={handleLoadDraft}
        currentEditState={currentEditState}
        userId={currentUserId}
      />
    </Flex>
  );
};

/**
 * PetriNetEditor - エントリーポイント（ReactFlowProviderラップ）
 */
const PetriNetEditor: React.FC<PetriNetEditorProps> = (props) => {
  console.log('🔍 [PetriNetEditor] Props received:', {
    hasInitialContent: !!props.initialContent,
    hasMaimlData: !!props.maimlData,
    editMode: props.editMode,
  });

  return (
    <ReactFlowProvider>
      <TemplateProvider
        maimlData={props.initialContent || props.maimlData || ''}
        validationResult={null}
        activeMethodIndex={0}
        methods={[]}
      >
        <PetriNetEditorInner {...props} />
      </TemplateProvider>
    </ReactFlowProvider>
  );
};

export default PetriNetEditor;
