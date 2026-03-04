/**
 * セマンティック検索 フロントエンド型定義
 *
 * @description セマンティック検索のフロントエンド向け型定義
 */

/** 4軸重みオブジェクト */
export interface SearchWeights {
  input: number;
  transition: number;
  output: number;
  structure: number;
}

/** 重みプリセット */
export interface WeightPreset {
  label: string;
  weights: SearchWeights;
}

/** 検索リクエストパラメータ */
export interface SemanticSearchRequest {
  input_query?: string;
  transition_query?: string;
  output_query?: string;
  structure_query?: string;
  top_k?: number;
  project_name?: string;
  technique?: string;
  weights?: SearchWeights;
}

/** スコア詳細（4軸個別スコア） */
export interface ScoreDetail {
  input_score: number;
  transition_score: number;
  output_score: number;
  structure_score: number;
}

/** 検索結果1件 */
export interface SemanticSearchHit {
  transition_set_id: string;
  organization_id: string;
  project_name: string | null;
  file_id: string;
  file_path: string;
  method_uuid: string;
  transition_id: string;
  technique: string | null;
  /** 加重平均コサイン類似度スコア（0.0〜1.0） */
  score: number;
  /** 各軸のコサイン類似度（デバッグ・説明用） */
  score_detail: ScoreDetail;
  input_text: string;
  transition_text: string;
  output_text: string;
  structure_text: string;
  instruction_ids: string[] | null;
  instruction_descs: string[] | null;
  input_place_ids: string[] | null;
  output_place_ids: string[] | null;
  input_place_count: number;
  output_place_count: number;
}

/** 検索レスポンス */
export interface SemanticSearchResponse {
  hits: SemanticSearchHit[];
  total: number;
  query_info: {
    top_k: number;
    weights: SearchWeights;
    technique_filter: string | null;
    project_name_filter: string | null;
    elapsed_ms: number;
  };
}

/** インデックス統計（プロジェクト別） */
export interface ProjectIndexStat {
  project_name: string | null;
  transition_set_count: number;
  file_count: number;
}

/** インデックス統計レスポンス */
export interface IndexStatsResponse {
  totalTransitionSets: number;
  totalFiles: number;
  byProject: ProjectIndexStat[];
}

/** ヘルスチェックレスポンス */
export interface SemanticSearchHealth {
  status: 'ok' | 'degraded';
  ollama: 'ok' | 'unreachable';
  serviceInfo: Record<string, unknown>;
}

/** バッチジョブステータス */
export type BatchJobStatus = 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** バッチジョブ */
export interface BatchJob {
  id: string;
  organization_id: string;
  status: BatchJobStatus;
  total_files: number;
  processed_files: number;
  failed_files: number;
  skipped_files: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/** バッチ統計 */
export interface BatchStats {
  total_jobs: number;
  total_files_processed: number;
  total_files_failed: number;
  total_embeddings_generated: number;
}

/** バッチ処理オプション */
export interface BatchIngestOptions {
  forceReprocess?: boolean;
  maxFiles?: number | null;
}

/** gpt-oss-20b によるクエリ分解結果 */
export interface DecomposedQuery {
  /** 入力条件クエリ（CT/MT focused） */
  q_in: string;
  /** 手順クエリ（procedure steps） */
  q_tr: string;
  /** 出力要求クエリ（RT focused） */
  q_out: string;
  /** 実験構造クエリ（place counts + MT/CT/RT counts） */
  q_struct: string;
  /** 検出されたメソドロジー（例: RAMAN, XRF） */
  methodology: string | null;
  /** メソドロジー検出信頼度（0.0〜1.0） */
  methodology_confidence: number;
  /** 分解信頼度（0.0〜1.0） */
  confidence: number;
  /** フォールバック動作フラグ（gpt-oss未接続時） */
  fallback?: boolean;
  /** エラーメッセージ（フォールバック時） */
  error?: string;
}

/** 検索履歴アイテム */
export interface SearchHistoryItem {
  id: string;
  timestamp: Date;
  request: SemanticSearchRequest;
  resultCount: number;
}
