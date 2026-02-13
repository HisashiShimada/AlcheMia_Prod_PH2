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
  Place,
  Arc,
  Transition,
  Property,
  Template,
  Content,
  Document
} from '@/types/maiml-unified';
import { 
  ErrorContent
} from '../types/maimlValidation'
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
// Draft管理関連の型定義 (useDraftManager用)
// 使用箇所: useDraftManager.ts, DraftManager.tsx, PetriNetEditorInner.tsx
// ============================================

/**
 * Draft情報の型定義
 * S3に保存されるDraftファイルのメタデータと内容
 */
export interface Draft {
  draft_key: string;
  draft_name: string;
  original_file_key?: string;
  last_saved_at: string;
  nodes?: Node<NodeData>[];
  edges?: Edge<EdgeData>[];
  templates?: Template[];
  documentData?: DocumentData;
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

/**
 * Draft保存データの型定義
 * Draft保存APIに送信するデータ構造
 */
export interface DraftSaveData {
  draftKey: string;
  draftName: string;
  originalFileKey?: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  templates?: Template[];
  documentData?: DocumentData;
}

/**
 * useDraftManagerオプションの型定義
 */
export interface UseDraftManagerOptions {
  userId?: string;
  autoSaveInterval?: number;
  autoSaveGenerations?: number;
  onAutoSaveSuccess?: (result: { draft_key: string }) => void;
  onAutoSaveError?: (error: Error) => void;
}

/**
 * useDraftManagerの返り値型
 */
export interface UseDraftManagerReturn {
  // 状態
  drafts: Draft[];
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;
  lastSavedDraft: Draft | null;
  lastAutoSaveTime: Date | null;
  
  // 操作関数
  fetchDrafts: () => Promise<Draft[] | undefined>;
  saveDraft: (draftData: DraftSaveData) => Promise<{ draft: Draft }>;
  deleteDraft: (draftKey: string) => Promise<unknown>;
  
  // 自動保存制御
  setAutoSaveEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  startAutoSaveTimer: () => void;
  stopAutoSaveTimer: () => void;
  cleanupOldAutoSaves: () => Promise<void>;
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