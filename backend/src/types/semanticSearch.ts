/**
 * セマンティック検索（トランジションセット型）型定義
 *
 * @description セマンティック検索に関するDBテーブル型・API型・サービス内部型を集約
 * @remarks
 * DDL: backend/migrations/20260226_create_transition_set_table.sql
 * 主キー: transition_set_id (uuid)
 * 検索単位: (organization_id, file_id, method_uuid, transition_id)
 */

// ============================================================================
// DBテーブル型
// ============================================================================

/**
 * transition_set テーブルの型定義
 */
export interface TransitionSet {
  transition_set_id: string;
  organization_id: string;
  project_name: string | null;
  file_id: string;
  file_path: string;
  method_uuid: string;
  transition_id: string;
  instruction_ids: string[] | null;
  instruction_descs: string[] | null;
  input_place_ids: string[];
  output_place_ids: string[];
  input_place_count: number;
  output_place_count: number;
  input_text: string;
  transition_text: string;
  output_text: string;
  structure_text: string;
  input_mt_count: number | null;
  input_ct_count: number | null;
  input_rt_count: number | null;
  output_mt_count: number | null;
  output_ct_count: number | null;
  output_rt_count: number | null;
  /** EmbeddingGemma 768次元ベクトル（input） */
  emb_input: number[];
  /** EmbeddingGemma 768次元ベクトル（transition） */
  emb_transition: number[];
  /** EmbeddingGemma 768次元ベクトル（output） */
  emb_output: number[];
  /** EmbeddingGemma 768次元ベクトル（structure） */
  emb_structure: number[];
  technique: string | null;
  embedding_model_version: string;
  norm_template_version: string;
  updated_at: Date;
}

// ============================================================================
// クエリ分解型
// ============================================================================

/**
 * gpt-oss-20b によるクエリ分解結果
 */
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

// ============================================================================
// 埋め込みサービス API型
// ============================================================================

/**
 * 埋め込みサービス（外部API）へのリクエスト型
 * POST /api/v1/embed
 */
export interface EmbedRequest {
  texts: string[];
}

/**
 * 埋め込みサービス（外部API）のレスポンス型
 */
export interface EmbedResponse {
  embeddings: number[][];
}

/**
 * 4軸テキスト（正規化後）
 */
export interface NormalizedTexts {
  input_text: string;
  transition_text: string;
  output_text: string;
  structure_text: string;
}

/**
 * 4軸ベクトル
 */
export interface FourAxisVectors {
  emb_input: number[];
  emb_transition: number[];
  emb_output: number[];
  emb_structure: number[];
}

// ============================================================================
// インデックス登録リクエスト型（MAIML解析結果から生成）
// ============================================================================

/**
 * 1トランジションセットの登録データ
 */
export interface TransitionSetUpsertData {
  organization_id: string;
  project_name: string | null;
  file_id: string;
  file_path: string;
  method_uuid: string;
  transition_id: string;
  instruction_ids: string[] | null;
  instruction_descs: string[] | null;
  input_place_ids: string[];
  output_place_ids: string[];
  input_place_count: number;
  output_place_count: number;
  input_text: string;
  transition_text: string;
  output_text: string;
  structure_text: string;
  input_mt_count: number | null;
  input_ct_count: number | null;
  input_rt_count: number | null;
  output_mt_count: number | null;
  output_ct_count: number | null;
  output_rt_count: number | null;
  emb_input: number[];
  emb_transition: number[];
  emb_output: number[];
  emb_structure: number[];
  technique: string | null;
  embedding_model_version: string;
  norm_template_version: string;
}

// ============================================================================
// インデックス登録API型
// ============================================================================

/**
 * インデックス登録 APIリクエスト
 * POST /api/v1/semantic-search/index
 */
export interface IndexRequest {
  /** 対象MAIMLファイルパス（organization_id省略の相対パス） */
  filePath: string;
}

/**
 * インデックス登録 APIレスポンス
 */
export interface IndexResponse {
  /** 登録/更新されたレコード数 */
  upsertedCount: number;
  /** ファイルパス */
  filePath: string;
}

// ============================================================================
// 検索API型
// ============================================================================

/**
 * 検索クエリ（4軸フリーテキスト）
 * POST /api/v1/semantic-search/search
 */
export interface SearchRequest {
  /** 入力条件のフリーテキスト（何を材料・サンプルとするか） */
  input_query: string;
  /** 手順内容のフリーテキスト（何をするか） */
  transition_query: string;
  /** 出力要求のフリーテキスト（何を得たいか） */
  output_query: string;
  /** 実験構造のフリーテキスト（実験の全体像） */
  structure_query: string;
  /** 返却上限数（デフォルト: 10、最大: 50） */
  top_k?: number;
  /** プロジェクト名フィルタ（指定時は特定プロジェクト内のみ検索） */
  project_name?: string;
  /** メソドロジーフィルタ（RAMAN, XRF 等）*/
  technique?: string;
  /** スコアリング重み設定 */
  weights?: SearchWeights;
}

/**
 * 検索スコアリング重み設定
 */
export interface SearchWeights {
  /** 入力軸の重み（デフォルト: 0.25） */
  input?: number;
  /** 遷移軸の重み（デフォルト: 0.25） */
  transition?: number;
  /** 出力軸の重み（デフォルト: 0.25） */
  output?: number;
  /** 構造軸の重み（デフォルト: 0.25） */
  structure?: number;
}

/**
 * 検索結果1件
 */
export interface SearchHit {
  transition_set_id: string;
  organization_id: string;
  project_name: string | null;
  file_id: string;
  file_path: string;
  method_uuid: string;
  transition_id: string;
  instruction_ids: string[] | null;
  instruction_descs: string[] | null;
  input_text: string;
  transition_text: string;
  output_text: string;
  structure_text: string;
  technique: string | null;
  /** 加重平均コサイン類似度スコア（0.0〜1.0） */
  score: number;
  /** 各軸のコサイン類似度（デバッグ・説明用） */
  score_detail: ScoreDetail;
}

/**
 * スコア詳細（4軸個別スコア）
 */
export interface ScoreDetail {
  input_score: number;
  transition_score: number;
  output_score: number;
  structure_score: number;
}

/**
 * 検索APIレスポンス
 */
export interface SearchResponse {
  hits: SearchHit[];
  total: number;
  query_info: SearchQueryInfo;
}

/**
 * 検索クエリメタ情報
 */
export interface SearchQueryInfo {
  top_k: number;
  weights: Required<SearchWeights>;
  technique_filter: string | null;
  project_name_filter: string | null;
  elapsed_ms: number;
}

// ============================================================================
// ファイル削除API型
// ============================================================================

/**
 * ファイル単位インデックス削除 APIリクエスト
 * DELETE /api/v1/semantic-search/index
 */
export interface DeleteIndexRequest {
  /** 削除対象MAIMLファイルパス */
  filePath: string;
}

/**
 * ファイル単位インデックス削除 APIレスポンス
 */
export interface DeleteIndexResponse {
  deletedCount: number;
  filePath: string;
}

// ============================================================================
// インデックス統計API型
// ============================================================================

/**
 * インデックス統計 APIレスポンス
 * GET /api/v1/semantic-search/stats
 */
export interface IndexStatsResponse {
  /** 組織内の総トランジションセット数 */
  totalTransitionSets: number;
  /** インデックス済みファイル数 */
  totalFiles: number;
  /** プロジェクト別集計 */
  byProject: ProjectStats[];
}

/**
 * プロジェクト別統計
 */
export interface ProjectStats {
  project_name: string | null;
  transition_set_count: number;
  file_count: number;
}
