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

import type { Node, Edge, Viewport, Connection } from 'reactflow';

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
  Content
} from '@/types/maiml-unified';

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

/**
 * TemplateRef型定義（reactFlowConverter用）
 */
// export interface TemplateRef {
//   type: string;
//   uuid?: string;
//   name?: string;
//   placeRefs?: Array<string | PlaceRef>;
//   templateRefs?: string[] | Array<{ id: string; href: string }>;
//   properties?: Record<string, unknown>;
//   stereotype?: string;
//   description?: string;
//   annotation?: string;
//   templateId?: string;
//   id?: string;
//   [key: string]: any;
// }

// export interface Template {
//   id: string;
//   uuid: string;
//   type: string;
//   name: string;
//   description?: string;
//   properties: Property[] | Record<string, unknown>;
//   placeRefs?: Array<string | PlaceRef>;
//   templateRefs?: string[] | Array<{ id: string; href: string }>;
//   stereotype?: string;
//   annotation?: string;
//   templateId?: string;
//   [key: string]: any;
// }

// ============================================
// Petri Net データ構造の型定義
// ============================================


/**
 * Transition型定義（reactFlowConverter用）
 */
// export interface Transition {
//   id: string;
//   data: {
//     name?: string;
//     description?: string;
//     hasInstruction?: boolean;
//     transition?: any;
//     pnmlId?: string | null;
//     [key: string]: any;
//   };
// }

/**
 * PNMLメタデータ型定義
 */
export interface PnmlMetadata {
  pnmlId: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

// ============================================
// Document関連の型定義
// ============================================

/**
 * 参照オブジェクト型（エディター用）
 * XSD準拠のReference型とは異なり、エディター固有の参照形式
 */
export interface RefObject {
  id?: string;
  ref?: string;
}

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
  instruments?: Instrument[];
  /** 作成日時（ISO 8601形式） */
  date?: string;
  /** デジタル署名（オプション） */
  Signature?: any;
  /** チェーン構造（ブロックチェーン用、オプション） */
  chain?: any[];
  /** 親要素参照（オプション） */
  parent?: any[];
  
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
  editMode?: string;
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

export interface EditorToolbarProps {
  // ノード追加
  onAddNode: (nodeType: 'material' | 'condition' | 'result' | 'transition') => void;
  
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // 保存
  onSave: () => void;
  canSave: boolean;
  
  // Document編集
  onEditDocument: () => void;
  
  // バリデーション
  onValidate: () => void;
  isValidating: boolean;
  
  // ワークフロー追加
  onAddWorkflow: () => void;
  workflowModeActive: boolean;
  
  // Draft管理
  onOpenDraftManager?: () => void;
  
  // 自動保存
  autoSaveEnabled?: boolean;
  onAutoSaveToggle?: (checked: boolean) => void;
  lastAutoSaveTime?: string | Date | null;
  
  // ビューモード切替
  viewMode?: 'petriNet' | 'templates';
  onViewModeChange?: (mode: 'petriNet' | 'templates') => void;
}

export interface MethodTabPanelProps {
  // methodデータ配列
  methods: MethodData[];
  
  // 現在アクティブなmethodのindex
  activeMethodIndex: number;
  
  // 現在編集中のノード配列（リアルタイム更新用）
  currentNodes?: Node[];
  
  // タブ切り替え時のコールバック
  onChange?: (index: number) => void;
  
  // Method追加時のコールバック
  onAddMethod?: () => void;
  
  // MethodID編集時のコールバック
  onEditMethodId?: (index: number, newMethodId: string) => void;
  
  // Method削除時のコールバック
  onDeleteMethod?: (index: number) => void;
}

export interface PropertyPanelProps {
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  onUpdate: (nodeId: string, data: NodeData) => void;
  onUpdateEdge?: (oldEdgeId: string, newEdgeId: string) => void;
  onClose: () => void;
  onOpenTemplateEditor: (node: Node<NodeData>) => void;
  onDelete: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onUpdateNodeId?: (oldId: string, newId: string) => void;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  methods: MethodData[];
  activeMethodIndex: number;
}

export interface TemplateEditorDialogProps {
  open: boolean;
  node: {
    id: string;
    data: NodeData;
  };
  onClose: () => void;
  onSave: (
    nodeId: string,
    templateRef: Template,
    isNewTemplate: boolean,
    templateCategory: string,
    isCommonTemplate: boolean,
    methodId: string | null
  ) => void;
  allNodes?: Array<{ id: string; data: NodeData }>;
  templateErrors?: Record<string, ValidationError[]>;
}

export interface DocumentEditDialogProps {
  open: boolean;
  documentData?: DocumentData | null;
  onClose: () => void;
  onSave: (document: DocumentData) => void;
  readOnly?: boolean;
}

export interface ValidationPanelProps {
  open: boolean;
  validationResult: ValidationResult | null;
  onClose: () => void;
  onErrorClick?: (error: ValidationError) => void;
}

export interface DraftManagerProps {
  open: boolean;
  onClose: () => void;
  onLoadDraft: (draft: DraftData) => void;
  onDeleteDraft: (draftId: string) => void;
}

export interface WorkflowSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (workflow: WorkflowData) => void;
}

// ============================================
// Hook戻り値型定義
// ============================================

export interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushHistory: (state: HistoryState) => void;
  clearHistory: () => void;
}

export interface UseWorkflowReturn {
  loading: boolean;
  error: string | null;
  loadWorkflow: (path: string) => Promise<WorkflowData | null>;
  saveWorkflow: (path: string, data: string) => Promise<boolean>;
}

export interface UseDraftManagerReturn {
  drafts: DraftData[];
  saveDraft: (name: string, state: HistoryState) => void;
  loadDraft: (draftId: string) => DraftData | null;
  deleteDraft: (draftId: string) => void;
  clearDrafts: () => void;
}

// ============================================
// petriNetExtractor用の型定義
// ============================================

/**
 * InsertionData型定義（template内のinsertion要素）
 */
export interface InsertionData {
  uri: string;
  hash: string;
  format: string;
}

/**
 * NestedPropertyNode型定義（NestedPropertyEditor形式）
 */
export interface NestedPropertyNode {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, any>;
  children: NestedPropertyNode[];
}

/**
 * MaiMLParserから返されるTemplateアイテムの型定義
 * 
 * Phase 5-4更新: maimlParserTypedとの互換性のため、nameとdescriptionをオプショナルに変更
 */
export interface TemplateItem {
  id: string;
  name?: string;  // オプショナルに変更（maimlParserTyped互換性）
  description?: string;
  annotation?: string;
  properties: PropertyItem[];
  [key: string]: any;
}

/**
 * プロパティアイテムの型定義
 */
export interface PropertyItem {
  key?: string;
  name?: string;
  type?: string;
  xsiType?: string;
  tagName?: string;
  units?: string;
  formatString?: string;
  scaleFactor?: number;
  defaultValue?: any;
  description?: string;
  properties?: PropertyItem[];
  elements?: Record<string, any>;
  [key: string]: any;
}

/**
 * PlaceRef配列の要素型
 */
export interface PlaceRefObject {
  id: string;
  ref: string;
  uuid: string;
}

/**
 * TemplateRef配列の要素型
 */
export interface TemplateRefObject {
  id: string;
  href: string;
}

// ============================================
// maimlParserExp.ts用の型定義
// ============================================

/**
 * トランジション情報型（ExperimentManager用）
 */
export interface TransitionInfo {
  id: string;
  methodId: string;
  methodIndex: number;
  name: string;
  description: string;
  hasInstruction: boolean;
  arcCount: number;
  arcs: ArcInfo[];
  displayName: string;
  category: string;
  isExperimentRelevant: boolean;
}

/**
 * アーク情報型
 */
export interface ArcInfo {
  id: string;
  source: string;
  target: string;
  direction: 'incoming' | 'outgoing';
  methodId?: string;
  methodIndex?: number;
}

/**
 * トランジション抽出結果型
 */
export interface TransitionExtractionResult {
  success: boolean;
  error: string | null;
  transitions: TransitionInfo[];
  metadata: {
    hasProtocol: boolean;
    hasMethod: boolean;
    hasPnml: boolean;
    methodCount?: number;
    pnmlCount?: number;
    transitionElementCount?: number;
    extractedCount?: number;
    experimentRelevantCount?: number;
    categories?: string[];
    methodBreakdown?: Array<{
      methodId: string;
      transitionCount: number;
    }>;
    error?: string;
  };
}

/**
 * Method情報型（getMethods用）
 */
export interface MethodInfoFromParser {
  methodId: string;
  methodName: string;
  transitions: Array<{
    id: string;
    name: string;
  }>;
  transitionCount: number;
}

/**
 * ファイル基本情報型
 */
export interface FileBasicInfo {
  hasProtocol: boolean;
  hasMethod: boolean;
  hasProgram: boolean;
  hasPnml: boolean;
  hasData: boolean;
  protocolName: string;
  methodName: string;
  fileVersion: string;
  namespace: string;
  error?: string;
}

/**
 * ファイル検証結果型
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: FileBasicInfo;
}

/**
 * テンプレートカテゴリ型
 */
export interface TemplateCategories {
  materials: ParsedTemplate[];
  conditions: ParsedTemplate[];
  results: ParsedTemplate[];
}

/**
 * パース済みテンプレート型
 */
export interface ParsedTemplate {
  id: string;
  type: string;
  name: string;
  description?: string;
  placeRef: string;
  placeRefs: string[];
  transitionRef: string | null;
  properties: ParsedProperty[];
  hasTemplateRef: boolean;
  hasInsertion: boolean;
  resolvedFromRef: string | null;
}

/**
 * パース済みプロパティ型
 */
export interface ParsedProperty {
  key: string;
  type: string;
  xsiType?: string;
  description?: string;
  units?: string;
  defaultValue?: any;
  properties?: ParsedProperty[];
  isOnePoint?: boolean;
  source?: string;
  nestLevel?: number;
  nestedPropertyCount?: number;
  hasNestedContent?: boolean;
  value?: string;
  hasMixedContent?: boolean;
  formatString?: string;
  scaleFactor?: number;
  contentType?: string;
  size?: number;
  axis?: string;
  elements?: Record<string, any>;
}

/**
 * 既存実験データ型
 */
export interface ExistingExperimentData {
  materials: ExistingDataElement[];
  conditions: ExistingDataElement[];
  results: ExistingDataElement[];
  [key: string]: ExistingDataElement[];  // インデックスシグネチャ（動的アクセス用）
}

/**
 * 既存データ要素型
 */
export interface ExistingDataElement {
  elementId: string;
  templateRef: string;
  templateName: string;
  categoryType: string;
  properties: Record<string, any>;
  timestamp: string;
  source: string;
  description?: string;
  uuid?: string;
  onePointCount?: number;
  propertyListTypeCount?: number;
}

/**
 * コンテンツデータ型（content要素用）
 */
export interface ContentData {
  type: 'content';
  contentType: string;
  axis: string;
  units: string;
  key: string;
  size: number;
  formatString: string;
  scaleFactor: number;
  values: number[];
  rawValue: string;
  isDataGrid: boolean;
  parsedSize: number;
  isValidSize: boolean;
  source: string;
  statistics: {
    min: number;
    max: number;
    avg: number;
    count: number;
  };
}

// ============================================
// maimlParserExp.ts用の内部型定義
// ============================================

/**
 * xml-js形式のXML要素型
 * _attributes, _text プロパティを持つ基本XML要素
 */
export interface XmlElement {
  _attributes?: Record<string, string>;
  _text?: string;
  [key: string]: any;
}

/**
 * xml-js形式のMAIML構造型
 * maimlParserExpのコンストラクタで解析される最上位構造
 */
export interface MaimlStructure {
  maiml?: {
    _attributes?: Record<string, string>;
    protocol?: ProtocolElement;
    data?: DataElement | DataElement[];
    eventLog?: any;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Protocol要素型
 * MAIML内のprotocol要素を表す
 */
export interface ProtocolElement {
  _attributes?: Record<string, string>;
  name?: XmlElement;
  method?: MethodElement[];
  materialTemplate?: any[];
  conditionTemplate?: any[];
  resultTemplate?: any[];
  [key: string]: any;
}

/**
 * Method要素型
 * protocol内のmethod要素を表す（複数存在可能）
 */
export interface MethodElement {
  _attributes?: Record<string, string>;
  name?: XmlElement;
  pnml?: PnmlElement[];
  program?: ProgramElement[];
  materialTemplate?: any[];
  conditionTemplate?: any[];
  resultTemplate?: any[];
  [key: string]: any;
}

/**
 * PNML要素型
 * Petri Net Markup Language要素（place, transition, arc等を含む）
 */
export interface PnmlElement {
  _attributes?: Record<string, string>;
  transition?: any | any[];
  place?: any | any[];
  arc?: any | any[];
  [key: string]: any;
}

/**
 * Program要素型
 * method内のprogram要素（instruction等を含む）
 */
export interface ProgramElement {
  _attributes?: Record<string, string>;
  instruction?: any | any[];
  materialTemplate?: any | any[];
  conditionTemplate?: any | any[];
  resultTemplate?: any | any[];
  [key: string]: any;
}

/**
 * Data要素型
 * MAIML内のdata要素（実験データを含む）
 */
export interface DataElement {
  _attributes?: Record<string, string>;
  results?: ResultsElement | ResultsElement[];
  [key: string]: any;
}

/**
 * Results要素型
 * data内のresults要素（material, condition, result等を含む）
 */
export interface ResultsElement {
  _attributes?: Record<string, string>;
  material?: any | any[];
  condition?: any | any[];
  result?: any | any[];
  [key: string]: any;
}

/**
 * Instruction要素型
 * findInstructionInMethod の戻り値型
 */
export interface InstructionElement {
  _attributes?: Record<string, string>;
  description?: XmlElement;
  transitionRef?: {
    _attributes?: {
      ref: string;
    };
  };
  [key: string]: any;
}

/**
 * Insertion Property型
 * parseInsertionElement の戻り値型
 * insertion要素をプロパティ形式に変換したもの
 */
export interface InsertionProperty {
  key: 'insertion';
  type: 'insertion';
  description: string;
  elements: {
    uri?: {
      key: 'uri';
      type: 'stringType';
      description: string;
      defaultValue: string;
      required: boolean;
      isFileInput: boolean;
      source: string;
    };
    hash?: {
      key: 'hash';
      type: 'stringType';
      description: string;
      defaultValue: string;
      required: boolean;
      autoGenerate: boolean;
      source: string;
    };
    format?: {
      key: 'format';
      type: 'stringType';
      description: string;
      defaultValue: string;
      required: boolean;
      autoDetect: boolean;
      source: string;
    };
  };
  required: boolean;
  source: string;
  elementCount: number;
}

/**
 * DOMParser抽出オプション型
 * DOMParser版のテンプレート抽出で使用されるオプション
 */
export interface DomParserOptions {
  preserveEmptyElements?: boolean;
  extractNestedProperties?: boolean;
}

/**
 * DOMベースのテンプレート抽出結果型
 * getTemplatesFromDOM の戻り値型
 */
export interface DomTemplateExtractionResult {
  materials: ParsedTemplate[];
  conditions: ParsedTemplate[];
  results: ParsedTemplate[];
  source: 'dom_parser';
}
