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
export type PlaceType = 'material' | 'condition' | 'result';

/**
 * ノードデータ型 - index.tsとeditorTypes.tsを統合
 */
export interface NodeData {
  id: string;
  name: string;
  description: string;
  nodeType: NodeType;
  placeType?: PlaceType;
  template?: Template | TemplateRef;
  templateRef?: TemplateRef;
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
  properties?: Property[] | Record<string, unknown>;
  templateId?: string;
  pnmlId?: string | null;
  transition?: any;
  hasInstruction?: boolean;
  [key: string]: any;
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
// テンプレート関連の型定義
// ============================================

export interface Property {
  id: string;
  name: string;
  type: string;
  value?: any;
  unit?: string;
  description?: string;
  [key: string]: any;
}

/**
 * PlaceRef型定義（template内のplace参照）
 */
export interface PlaceRef {
  id?: string;
  ref?: string;
  uuid?: string;
}

/**
 * TemplateRef型定義（reactFlowConverter用）
 */
export interface TemplateRef {
  type: string;
  uuid?: string;
  name?: string;
  placeRefs?: Array<string | PlaceRef>;
  templateRefs?: string[] | Array<{ id: string; href: string }>;
  properties?: Record<string, unknown>;
  stereotype?: string;
  description?: string;
  annotation?: string;
  templateId?: string;
  id?: string;
  [key: string]: any;
}

export interface Template {
  id: string;
  uuid: string;
  type: string;
  name: string;
  description?: string;
  properties: Property[] | Record<string, unknown>;
  placeRefs?: Array<string | PlaceRef>;
  templateRefs?: string[] | Array<{ id: string; href: string }>;
  stereotype?: string;
  annotation?: string;
  templateId?: string;
  [key: string]: any;
}

/**
 * Template データ型定義（拡張版 - TemplateEditorDialog用）
 */
export interface TemplateData {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  type?: string;
  properties?: Record<string, unknown>;
  contents?: Record<string, unknown>;
  insertion?: {
    uri?: string;
    hash?: string;
    format?: string;
  };
  placeRefs?: Array<string | PlaceRef>;
  templateRefs?: string[];
  href?: string;
  stereotype?: string;
  annotation?: string;
  templateId?: string;
}

/**
 * TemplateMap型定義
 */
export type TemplateMap = Record<string, Template>;

// ============================================
// Petri Net データ構造の型定義
// ============================================

/**
 * Place型定義（reactFlowConverter用）
 */
export interface Place {
  id: string;
  data: {
    name?: string;
    description?: string;
    stereotype?: string;
    properties?: Property[];
    annotation?: string;
    pnmlId?: string | null;
  };
}

/**
 * Transition型定義（reactFlowConverter用）
 */
export interface Transition {
  id: string;
  data: {
    name?: string;
    description?: string;
    hasInstruction?: boolean;
    transition?: any;
    pnmlId?: string | null;
    [key: string]: any;
  };
}

/**
 * Arc型定義（reactFlowConverter用）
 */
export interface Arc {
  id?: string;
  source: string;
  target: string;
  [key: string]: any;
}

/**
 * PNMLメタデータ型定義
 */
export interface PnmlMetadata {
  pnmlId: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Petri Netデータ型定義（reactFlowConverter用）
 */
export interface PetriNetData {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
  pnmlMetadata?: PnmlMetadata[];
  [key: string]: any;
}

// ============================================
// Document関連の型定義
// ============================================

export interface RefObject {
  id?: string;
  ref?: string;
}

export interface Creator {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
  vendorRef?: RefObject;
  instrumentRef?: RefObject;
}

export interface Vendor {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
}

export interface Owner {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
}

export interface Instrument {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
}

/**
 * SignatureData型定義（DocumentEditDialog用）
 */
export interface SignatureData {
  enabled: boolean;
}

/**
 * Document情報の型定義 - 統合版
 * 複数形プロパティ（index.ts）+ 単数形プロパティ（editorTypes.ts）
 */
export interface DocumentData {
  id: string;
  protocolId: string;
  methodId: string;
  pnmlId: string;
  programId: string;
  name: string;
  description: string;
  date: string;
  uuid: string;
  // 複数形プロパティ（基本）
  creators: Creator[];
  vendors: Vendor[];
  owners: Owner[];
  instruments: Instrument[];
  // 署名情報
  signature?: SignatureData;
  // 単数形プロパティ（後方互換性のため）
  creator?: { id: string; name: string };
  vendor?: { id: string; name: string };
  owner?: { id: string; name: string };
  instrument?: { id: string; name: string };
  [key: string]: any;
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
  handleTemplateSelect: (template: TemplateRef) => void;
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
    templateRef: TemplateRef,
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
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
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
    templateRef: TemplateData,
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
 * TemplateMapEntry型定義（buildTemplateMapの戻り値の要素型）
 * 
 * Phase 5-4更新: maimlParserTypedとの互換性のため、nameをオプショナルに変更
 */
export interface TemplateMapEntry {
  id: string;
  uuid?: string;  // オプショナルに変更
  name?: string;  // オプショナルに変更（maimlParserTyped互換性）
  description?: string;
  annotation?: string;
  properties: Property[];
  propertiesNested: Record<string, NestedPropertyNode>;
  insertion?: InsertionData;
  templateId: string;
  type: 'material' | 'condition' | 'result';
  stereotype: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate';
  element?: Element | null;
  placeRefs: PlaceRef[];
  templateRefs: Array<{ id: string; href: string }>;
}

/**
 * PetriNetExtractResult型定義（extractPetriNetStructureの戻り値）
 */
export interface PetriNetExtractResult {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
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

/**
 * TransitionNode型定義（generateSubnetData用）
 */
export interface TransitionNode {
  data?: {
    pnmlId?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
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
