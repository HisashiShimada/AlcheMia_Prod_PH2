/**
 * PetriNetEditorV2 統合型定義
 * 
 * index.tsとeditorTypes.tsを統合し、重複を削除
 * すべてのエディター関連の型定義を集約
 * 
 * @version 3.2.0
 * @date 2026-01-30
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Node, Edge, Viewport, Connection, NodeTypes } from 'reactflow';

// XSD準拠の型定義をimport
import type {
  Creator,
  Vendor,
  Owner,
  Instrument,
  Place,
  Arc,
  Transition,
  Property,
  Template,
  PlaceRef,
  Reference,
  Content,
  Chain,
  Parent
} from '@/types/maiml-unified';
import { TemplateError } from '../components/editorv2/components/TemplateViewer/TemplateItem';

// ============================================
// 基本型定義
// ============================================

/**
 * 位置座標型
 */
export interface Position {
  x: number;
  y: number;
}

// ============================================
// ノード関連の型定義
// ============================================

export type NodeType = 'place' | 'transition';

/**
 * ノードデータ型 - index.tsとeditorTypes.tsを統合
 */
export interface NodeData {
  id: string;
  name: string;
  description: string;
  nodeType: NodeType;
  placeType: string;
  template?: Template;
  templateRef?: Template;
  // editorTypes.tsから追加（拡張プロパティ）
  isNewTemplate?: boolean;
  templateCategory?: string;
  methodId?: string | null;
  hasError?: boolean;
  errors?: ValidationError[];
  isCommonTemplate?: boolean;
  commonTemplateRef?: string;
  // reactFlowConverterで使用される追加プロパティ
  nodeId?: string;
  stereotype?: string;
  annotation?: string;
  properties?: Property[];
  contents? : Content[];
  templateId?: string;
  pnmlId?: string | null;
  transition?: Transition;
  instructionId?: string;
}

// ============================================
// エッジ関連の型定義
// ============================================

/**
 * エッジデータ型
 */
export interface EdgeData {
  id?: string;
  hasError?: boolean;
  errors?: ValidationError[];
}

// ============================================
// Document関連の型定義
// ============================================


/**
 * SignatureData型定義（DocumentEditDialog用）
 */
export interface SignatureData {
  enabled: boolean;
}

/**
 * Document情報の型定義 - XSD準拠Document型の拡張版
 * 
 * Phase 3.3: maimlParserTyped.getDocument()との互換性を確保
 * - 基本: XSD準拠のDocument型（maiml-unified.ts）
 * - 拡張: エディター用の追加プロパティ
 * 
 * @see frontend/src/types/maiml-unified.ts Document型
 */
export interface DocumentData {
  // ============================================================================
  // XSD準拠プロパティ（Document型から継承）
  // ============================================================================
  
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** 作成者情報（XSD: 配列、実MAIML: 通常1個） */
  creators: Creator[];
  /** ベンダー情報（XSD: 配列、実MAIML: 通常1個） */
  vendors: Vendor[];
  /** 所有者情報（XSD: 配列、実MAIML: 通常1個） */
  owners: Owner[];
  /** 機器情報（XSD: 配列、実MAIML: 通常1個） */
  instruments: Instrument[];
  /** 作成日時（ISO 8601形式） */
  date?: string;
  /** デジタル署名（オプション） */
  Signature?: any;
  /** チェーン構造（ブロックチェーン用、オプション） */
  chains: Chain[];
  /** 親要素参照（オプション） */
  parents: Parent[];
  
  // ============================================================================
  // エディター用拡張プロパティ
  // ============================================================================
  
  /** Protocol要素のID（エディター用、UI表示で使用） */
  protocolId?: string;
  /** Method要素のID（エディター用、UI表示で使用） */
  methodId?: string;
  /** PNML要素のID（エディター用、UI表示で使用） */
  pnmlId?: string;
  /** Program要素のID（エディター用、UI表示で使用） */
  programId?: string;
  
  /** 署名情報（エディター用、下位互換性のため） */
  signature?: SignatureData;
}

// ============================================
// Method関連の型定義
// ============================================

/**
 * Method定義（統一名称: MethodData）
 * 旧Method型（editorTypes.ts）とMethodData型（index.ts）を統合
 */
export interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  viewport: Viewport;
  // APIレスポンス用プロパティ（オプショナル）
  places?: Place[];
  transitions?: Transition[];
  arcs?: Arc[];
}

/**
 * MethodInfo型（互換性のため残す）
 * @deprecated MethodDataを使用してください
 */
export type MethodInfo = MethodData;

/**
 * Method定義（エイリアス）
 */
export type Method = MethodData;

// ============================================
// バリデーション関連の型定義
// ============================================

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  type: string;
  severity: ValidationSeverity;
  message: string;
  xpath?: string;
  paths?: string[];
  duplicateId?: string;
  ref?: string;
  details?: any;
}

export interface ValidationWarning {
  type: string;
  message: string;
  xpath?: string;
  details?: any;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean; // 必須プロパティ
}

// ============================================
// ファイル関連の型定義
// ============================================

export interface FileInfo {
  key: string;
  name?: string;  // オプショナルに変更（S3ファイル一覧からkeyのみ取得される場合がある）
  lastModified?: string;
  size?: number;
}

export interface WorkflowFile {
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
}

export interface WorkflowData {
  name: string;
  path: string;
  content: string;
}

// ============================================
// クリップボード関連の型定義
// ============================================

/**
 * クリップボードデータ型
 * 使用箇所: PetriNetEditorInner.tsx L114
 */
export interface ClipboardData {
  multiple?: boolean;
  type?: string;
  position?: { x: number; y: number };
  data?: NodeData;
  nodes?: Array<{
    type: string;
    position: { x: number; y: number };
    data: NodeData;
  }>;
}

// ============================================
// ドラフト関連の型定義
// ============================================

export interface DraftData {
  id: string;
  timestamp: number;
  name: string;
  description?: string;
  methods: MethodData[];
  document: DocumentData;
  templates: Template[];
  // 簡易版プロパティ（後方互換性のため）
  nodes?: Node<NodeData>[];
  arcs?: Edge<EdgeData>[];
  edges?: Edge<EdgeData>[];
  documentData?: DocumentData;
}

// ============================================
// 履歴関連の型定義
// ============================================

export interface HistoryState {
  methods: MethodData[];
  document: DocumentData;
  templates: Template[];
}


// ============================================
// コンポーネントProps型定義
// ============================================

export interface PetriNetEditorV2Props {
  maimlFilePath?: string;
  onSave?: (data: any) => void;
  onClose?: () => void;
  readOnly?: boolean;
  initialData?: string;
}

/**
 * PetriNetEditorInner Props型定義
 */
export interface PetriNetEditorInnerProps {
  maimlData: string | null;
  onError?: (error: Error) => void;
  editingFileName?: string;
  editMode: string;
  originalFileName?: string;
  sourceS3Key?: string;
  [key: string]: unknown;
}

/**
 * PetriNetEditorInnerUI Props型定義
 */
export interface PetriNetEditorInnerUIProps {
  // React Flow関連
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge<EdgeData>[]>>;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  
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
  lastAutoSaveTime: number | null;
  
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
  saveError: string | null;
  
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
    methodId: string | null
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
  handleWorkflowFileSelect: (file: FileInfo) => Promise<void>;
  availableFiles: FileInfo[];
  
  draftManagerOpen: boolean;
  handleCloseDraftManager: () => void;
  handleLoadDraft: (draft: any) => void;
  lastSavedDraft: any;
  currentEditState: any;
  currentUserId: string;
  sourceS3Key?: string;
}