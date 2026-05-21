/**
 * PetriNetEditorV2 統合型定義
 * 
 * index.tsとeditorTypes.tsを統合し、重複を削除
 * すべてのエディター関連の型定義を集約
 * 
 * @version 3.2.0
 * @date 2026-01-30
 */

import type { Node, Edge, Viewport } from 'reactflow';

// XSD準拠の型定義をimport
import type {
  Place,
  Arc,
  Transition,
  Property,
  Template,
  Content,
  Document,
  Method,
} from '@/types/maiml-unified';
import {
  ErrorContent,
} from './maimlValidation';
import type { AnalysisResult } from '@/types/maimlValidation';
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
 * Place種別
 */
export type PlaceType = 'material' | 'condition' | 'result';

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
  errors?: ErrorContent[];
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
  /** MAIML UUID管理: place/transitionのuuid値（編集中のUUID状態管理用） */
  maimlUuid?: string;
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
  errors?: ErrorContent[];
  /** MAIML UUID管理: arcのuuid値（編集中のUUID状態管理用） */
  maimlUuid?: string;
}

// ============================================
// Document関連の型定義
// ============================================

/**
 * Document情報の型定義 - XSD準拠Document型の拡張版
 * 
 * Phase 3.3: maimlParserTyped.getDocument()との互換性を確保
 * - 基本: XSD準拠のDocument型（maiml-unified.ts）
 * - 拡張: エディター用の追加プロパティ
 * 
 * @see frontend/src/types/maiml-unified.ts Document型
 */
export interface DocumentData extends Document {
  
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
  signatureEnabled?: boolean;
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

// ============================================
// ファイル関連の型定義
// ============================================

export interface FileInfo {
  key: string;
  name?: string;  // オプショナルに変更（S3ファイル一覧からkeyのみ取得される場合がある）
  content?: string;
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
// Draft管理関連の型定義 (useDraftManager用)
// 使用箇所: useDraftManager.ts, DraftManager.tsx, PetriNetEditorInner.tsx
// ============================================

/**
 * Draft情報の型定義
 * S3に保存されるDraftファイルのメタデータと内容
 */
export interface Draft {
  draftKey: string;
  draftName: string;
  originalFileKey?: string;
  lastSavedAt: string;
  nodes?: Node<NodeData>[];
  edges?: Edge<EdgeData>[];
  templates?: Template[];
  documentData?: DocumentData;
  /** プロジェクトID（プロジェクト管理画面からのDraft特定用） */
  projectId?: string | null;
}

/**
 * 編集状態の型定義
 * エディタの現在の編集状態を表す
 */
export interface EditState {
  fileName: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  templates?: Template[];
  documentData?: DocumentData;
}

// ============================================
// Template関連の型定義
// ============================================

/**
 * テンプレートエラーの型定義
 * 使用箇所: TemplateItem.tsx, TemplateList.tsx, TemplateEditorDialog.tsx
 */
export interface TemplateError {
  type?: string;
  level: string;
  message: string;
}

/**
 * カテゴリ別テンプレートの型定義
 * 使用箇所: TemplateList.tsx, PetriNetEditorInner.tsx
 */
export interface TemplatesByCategory {
  material: Template[];
  condition: Template[];
  result: Template[];
}

/**
 * 保存データの型定義
 * 使用箇所: SaveDialog.tsx, PetriNetEditorInner.tsx
 */
export interface SaveData {
  name: string;
  description: string;
}

// ============================================
// useWorkflow 関連の型定義
// ============================================

/**
 * ノード境界情報の型定義
 * 使用箇所: useWorkflow.ts
 */
export interface NodeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  center: {
    x: number;
    y: number;
  };
}

/**
 * ID重複解決結果の型定義
 * 使用箇所: useWorkflow.ts
 */
export interface IdConflictResolution {
  mappedNodes: Node<NodeData>[];
  mappedEdges: Edge<EdgeData>[];
  idMapping: Record<string, string>;
}

/**
 * ワークフロー追加結果の型定義
 * 使用箇所: useWorkflow.ts
 */
export interface WorkflowAddResult {
  success: boolean;
  nodes?: Node<NodeData>[];
  edges?: Edge<EdgeData>[];
  templates?: TemplatesByCategory;
  message?: string;
  error?: string;
}

/**
 * ワークフローノードタイプ定義（useWorkflow用）
 * NodeType（'place' | 'transition'）とは区別するため WorkflowNodeType とする
 * 使用箇所: useWorkflow.ts
 */
export type WorkflowNodeType =
  | 'materialPlace'
  | 'conditionPlace'
  | 'resultPlace'
  | 'transition'
  | 'materialTemplate'
  | 'conditionTemplate'
  | 'resultTemplate';

/**
 * useWorkflow パラメータの型定義
 * 使用箇所: useWorkflow.ts
 */
export interface UseWorkflowParams {
  addToHistory: (action: string, data: unknown) => void;
}

/**
 * useWorkflow の返り値型
 * 使用箇所: useWorkflow.ts
 */
export interface UseWorkflowReturn {
  // 状態
  methods: MethodData[];
  activeMethodIndex: number;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  templates: TemplatesByCategory;

  // メソッド操作
  setActiveMethodIndex: (index: number) => void;

  // ノード操作
  addNode: (nodeType: WorkflowNodeType, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  deleteNode: (nodeId: string) => void;

  // エッジ操作
  addEdge: (connection: import('reactflow').Connection) => void;
  deleteEdge: (edgeId: string) => void;

  // ReactFlow連携
  updateNodesFromChanges: (changes: import('reactflow').NodeChange[]) => void;
  updateEdgesFromChanges: (changes: import('reactflow').EdgeChange[]) => void;

  // ワークフロー追加
  addWorkflow: (
    clickPosition: { x: number; y: number },
    maimlContent: string,
    fileName?: string
  ) => Promise<WorkflowAddResult>;

  // データ読み込み・保存
  loadMaimlData: (maimlContent: string) => Promise<void>;
  exportToMaiml: () => string;
}

// ============================================
// reactFlowConverter 用型定義
// ============================================

/**
 * Petri Netデータ型（reactFlowConverter.ts より移動）
 */
export interface PetriNetData {
  methods: Method[];
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
}

/**
 * React Flow変換結果の型定義（reactFlowConverter.ts より移動）
 */
export interface ReactFlowFormat {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

// ============================================
// maimlToReactFlow 用型定義
// ============================================

/**
 * maimlToReactFlow 変換結果型（maimlToReactFlow.ts より移動）
 */
export interface ConversionResult {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

/**
 * maimlToReactFlow 変換統計情報型（maimlToReactFlow.ts より移動）
 */
export interface ConversionStats {
  totalNodes: number;
  placeNodes: number;
  transitionNodes: number;
  materialPlaces: number;
  conditionPlaces: number;
  resultPlaces: number;
  totalEdges: number;
}

// ---------------------------------------------------------------------------
// TemplateContext
// ---------------------------------------------------------------------------

/**
 * TemplateContext の値型
 * （TemplateContext.tsx より移動）
 */
// ---------------------------------------------------------------------------
// viewer/dialogs 共通型
// ---------------------------------------------------------------------------

/**
 * プロパティオブジェクト（PropertyViewer / PropertyViewerWithSelection / StructuredPropertySelector 共通）
 */
export interface PropertyObject {
  key?: string;
  value?: unknown;
  type?: string;
  description?: string;
  defaultValue?: string;
  elements?: {
    value?: unknown;
  };
  children?: unknown[];
}

/**
 * 構造化されたプロパティ（basic / template / data の3区分）
 */
export interface StructuredProperties {
  basic: Record<string, PropertyObject>;
  template: Record<string, PropertyObject>;
  data: Record<string, PropertyObject>;
}

/**
 * 選択されたプロパティキーの状態
 */
export interface SelectedProperties {
  basic: string[];
  template: string[];
  data: string[];
}

/**
 * PropertyViewerWithSelection テーブル行データ型
 */
export interface TableDataType {
  key: string;
  propKey: string;
  value: unknown;
  xsiType?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// viewer/ViewRendererDialog・ExperimentWorker/InstructionFlowDialog 共通型
// ---------------------------------------------------------------------------

/**
 * ファイルデータ型
 * viewer/ViewRendererDialog / ExperimentWorker/InstructionFlowDialog で使用
 */
export interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
  /** APIから取得済みのファイルコンテンツ（設定されていればfetchをスキップ） */
  content?: string;
}

/**
 * サブネットデータ型
 * viewer/ViewRendererDialog / ExperimentWorker/InstructionFlowDialog で使用
 */
export interface SubnetData {
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
}

// ---------------------------------------------------------------------------
// progress/PetriNetVisualization 用型
// ---------------------------------------------------------------------------

/**
 * カスタムノードのデータ型
 * progress/PetriNetVisualization で使用
 */
export interface CustomNodeData {
  label: string;
  stereotype?: string;
  isFired?: boolean;
  isCompleted?: boolean;
  isInProgress?: boolean;
  progressChip?: React.ReactNode;
  tooltip?: string;
}

/**
 * NestedPropertyEditor の名前空間ソース情報
 * 移動元: components/editorv2/NestedPropertyEditor.tsx
 */
export interface NamespaceSource {
  fileName?: string;
  uri?: string;
  hierarchyPath?: string;
  importedAt?: string;
}

/**
 * NestedPropertyEditor 用プロパティデータ
 * 移動元: components/editorv2/NestedPropertyEditor.tsx
 */
export interface PropertyData {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: PropertyData[];
  namespaceOrigin?: boolean;
  namespaceSource?: NamespaceSource;
}

export interface TemplateContextType {
  templates: TemplatesByCategory;
  allTemplates: TemplatesByCategory;
  commonTemplates: TemplatesByCategory;
  templateErrors: Record<string, TemplateError[]>;
  isLoading: boolean;
  addTemplate: (templateData: { category: 'material' | 'condition' | 'result'; template: Template }) => void;
  deleteTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string, updatedTemplate: Template) => void;
  validationResult?: AnalysisResult | null;
}

// ============================================
// MAIML UUID管理型定義
// ============================================

/**
 * 上位タグのUUID状態管理型
 * pnml/program/method/protocol の UUID を保持する。
 * document.uuid はタスクAが採番済みのため対象外。
 *
 * 使用箇所: PetriNetEditorInner.tsx
 */
export interface UpperUuids {
  /** protocol タグの UUID */
  protocol: string;
  /** methodId → method タグの UUID */
  methods: Map<string, string>;
  /** methodId → pnml タグの UUID */
  pnmls: Map<string, string>;
  /** methodId → program タグの UUID */
  programs: Map<string, string>;
}

/**
 * 変更フラグ管理型
 * 下位タグが変更された際に上位タグの UUID を再生成するかを制御する。
 *
 * 使用箇所: PetriNetEditorInner.tsx
 */
export interface DirtyFlags {
  /** protocol タグが変更済みか */
  protocol: boolean;
  /** 変更のあった method の methodId セット */
  methods: Set<string>;
  /** 変更のあった pnml の methodId セット */
  pnmls: Set<string>;
  /** 変更のあった program の methodId セット */
  programs: Set<string>;
  /** dirty な templateId のセット（templateUUID再生成対象） */
  templates: Set<string>;
}

/**
 * MAIML UUID 抽出結果型
 * maimlUuidExtractor.extractUuidsFromMaiml() の戻り値。
 *
 * 使用箇所: PetriNetEditorInner.tsx, maimlUuidExtractor.ts
 */
export interface ExtractedUuids {
  /** place ID → uuid */
  places: Map<string, string>;
  /** transition ID → uuid */
  transitions: Map<string, string>;
  /** arc ID → uuid */
  arcs: Map<string, string>;
  /** template ID → uuid (全レベル共通) */
  templates: Map<string, string>;
  /** instruction ID → uuid */
  instructions: Map<string, string>;
  /** protocol uuid */
  protocol: string;
  /** methodId → method uuid */
  methods: Map<string, string>;
  /** methodId → pnml uuid */
  pnmls: Map<string, string>;
  /** methodId → program uuid */
  programs: Map<string, string>;
  /** data タグの uuid（変更なし保存で維持するため） */
  dataUuid?: string;
  /** eventLog タグの uuid（変更なし保存で維持するため） */
  eventLogUuid?: string;
}
