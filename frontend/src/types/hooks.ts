/**
 * カスタムフック関連の型定義
 * 各フックの Options / Return 型を集約
 */

import type { Node, Edge } from 'reactflow';
import type { NodeData, EdgeData, ClipboardData, Draft } from './editor';
import type { EditorState } from '../hooks/useHistory';
import type {
  SemanticSearchHit,
  IndexStatsResponse,
  SemanticSearchHealth,
  SearchHistoryItem,
  SemanticSearchRequest,
} from './semanticSearch';

// ============================================================================
// useDraftManager 関連
// ============================================================================

/**
 * useDraftManager オプションの型定義
 * 使用箇所: useDraftManager.ts
 */
export interface UseDraftManagerOptions {
  userId?: string;
  autoSaveInterval?: number;
  autoSaveGenerations?: number;
  onAutoSaveSuccess?: (result: { draft_key: string }) => void;
  onAutoSaveError?: (error: Error) => void;
  /** プロジェクトID（Draft保存時に記録し、復元時のプロジェクト特定に使用） */
  projectId?: string;
}

/**
 * useDraftManager の返り値型
 * 使用箇所: useDraftManager.ts
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
  saveDraft: (draftData: Draft) => Promise<Draft>;
  deleteDraft: (draftKey: string) => Promise<unknown>;

  // 自動保存制御
  setAutoSaveEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  startAutoSaveTimer: () => void;
  stopAutoSaveTimer: () => void;
  resumeAutoSaveTimer: () => void;
  cleanupOldAutoSaves: () => Promise<void>;
}

// ============================================================================
// useEditorActions 関連
// ============================================================================

/**
 * useEditorActions のプロパティ型
 * 使用箇所: hooks/useEditorActions.ts
 */
export interface UseEditorActionsProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  selectedNodes: Node<NodeData>[];
  clipboard: ClipboardData | null;
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge<EdgeData>[]>>;
  setClipboard: (clipboard: ClipboardData | null) => void;
  setSelectedNode: (node: Node<NodeData>) => void;
  setSelectedEdge: (edge: Edge<EdgeData>) => void;
  pushState: (state: EditorState) => void;
}

/**
 * useEditorActions の返り値型
 * 使用箇所: hooks/useEditorActions.ts
 */
export interface UseEditorActionsResult {
  handleCopy: () => void;
  handlePaste: () => void;
}

// ============================================================================
// useSemanticSearch 関連
// ============================================================================

/**
 * useSemanticSearch の返り値型
 * 使用箇所: hooks/useSemanticSearch.ts
 */
export interface UseSemanticSearchReturn {
  /** 検索結果 */
  hits: SemanticSearchHit[];
  /** ローディング状態 */
  loading: boolean;
  /** エラー */
  error: string | null;
  /** 検索実行済みか */
  searched: boolean;
  /** 検索実行時間(ms) */
  elapsedMs: number | null;
  /** インデックス統計 */
  stats: IndexStatsResponse | null;
  /** ヘルス情報 */
  health: SemanticSearchHealth | null;
  /** 検索履歴 */
  history: SearchHistoryItem[];
  /** 検索実行 */
  search: (request: SemanticSearchRequest) => Promise<void>;
  /** 統計取得 */
  fetchStats: () => Promise<void>;
  /** ヘルスチェック */
  fetchHealth: () => Promise<void>;
  /** 結果クリア */
  clearResults: () => void;
}
