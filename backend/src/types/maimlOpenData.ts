/**
 * MaiML OpenData Pipeline 型定義
 *
 * @description MaiML公開処理パイプラインで使用するDB・API関連の型定義
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md
 */

// ============================================================
// DBテーブル型定義
// ============================================================

/**
 * maiml_asset テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * 主キー: asset_id (BIGSERIAL)
 * TODO: v1.3以前の設計書確認後、スキーマを完全定義する
 */
export interface MaimlAsset {
  asset_id?: number;
  organization_id: string;
  file_uri: string;
  doc_name?: string | null;
  template_only: boolean;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * maiml_publish_registry テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * 主キー: registry_id (BIGSERIAL)
 * TODO: v1.3以前の設計書確認後、スキーマを完全定義する
 */
export interface MaimlPublishRegistry {
  registry_id?: number;
  asset_id: number;
  file_uri: string;
  /** TODO: status の遷移ルールを確定させる */
  status: 'requested' | 'processing' | 'published' | 'unpublished';
  template_only: boolean;
  store_raw_series: boolean;
  store_raw_raster: boolean;
  raw_chunk_size: number;
  raw_compression: string;
  keep_raw_on_unpublish: boolean;
  retention_until?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * maiml_condition_kv テーブルの型定義
 *
 * @remarks
 * DDL: BasicDesign v1.3 § 4.1
 */
export interface MaimlConditionKv {
  asset_id: number;
  template_id?: string | null;
  instruction_id?: string | null;
  source_section: string;
  path: string;
  key: string;
  idx: number;
  value_text?: string | null;
  value_num?: number | null;
  unit?: string | null;
  value_type?: string | null;
  format_string?: string | null;
  scale_factor?: number | null;
}

/**
 * maiml_material_kv テーブルの型定義
 *
 * @remarks
 * DDL: BasicDesign v1.3 § 4.2
 */
export interface MaimlMaterialKv {
  asset_id: number;
  template_id?: string | null;
  instruction_id?: string | null;
  source_section: string;
  path: string;
  key: string;
  idx: number;
  value_text?: string | null;
  value_num?: number | null;
  unit?: string | null;
  value_type?: string | null;
  format_string?: string | null;
  scale_factor?: number | null;
}

/**
 * series_type の列挙型
 *
 * @remarks
 * TODO: key属性の実値を含むMaiMLサンプル（クロマトグラフィー系）入手後、
 *       TIC / SPECTRUM_TOTAL の判定ロジックを確定させる
 */
export type SeriesType = 'TIC' | 'SPECTRUM_TOTAL' | 'OTHER';

/**
 * プレビューモードの列挙型
 */
export type PreviewMode = 'uniform' | 'maxhold' | 'mmr';

/**
 * maiml_series_preview テーブルの型定義
 *
 * @remarks
 * DDL: BasicDesign v1.3 § 5.4
 */
export interface MaimlSeriesPreview {
  preview_id?: number;
  asset_id: number;
  instruction_id?: string | null;
  template_id?: string | null;
  result_id?: string | null;
  result_name?: string | null;
  content_id?: string | null;
  content_size?: number | null;
  series_type: SeriesType;
  x_label: string;
  y_label: string;
  mode: PreviewMode;
  params: Record<string, unknown>;
  original_points: number;
  preview_points: number;
  x: number[];
  y: number[];
  x_min?: number | null;
  x_max?: number | null;
  y_min?: number | null;
  y_max?: number | null;
  quality?: PreviewQuality | null;
  created_at?: Date;
}

/**
 * プレビュー品質指標
 *
 * @remarks
 * BasicDesign v1.3 § 5.3
 */
export interface PreviewQuality {
  mae?: number;
  mape?: number;
  peak_recall?: number;
  area_ratio?: number;
}

/**
 * maiml_series_raw_header テーブルの型定義
 *
 * @remarks
 * DDL: BasicDesign v1.3 § 6.1
 */
export interface MaimlSeriesRawHeader {
  raw_id?: number;
  asset_id: number;
  instruction_id?: string | null;
  template_id?: string | null;
  result_id?: string | null;
  result_name?: string | null;
  content_id: string;
  content_size?: number | null;
  x_label?: string | null;
  y_label?: string | null;
  x_unit?: string | null;
  y_unit?: string | null;
  points_total: number;
  chunk_count: number;
  storage_format: 'array' | 'binary';
  compression: string;
  checksum_sha256?: string | null;
  created_at?: Date;
}

/**
 * maiml_series_raw_chunk テーブルの型定義（Array方式）
 *
 * @remarks
 * DDL: BasicDesign v1.3 § 6.2
 */
export interface MaimlSeriesRawChunk {
  raw_id: number;
  chunk_index: number;
  point_offset: number;
  point_count: number;
  x_chunk: number[];
  y_chunk: number[];
}

// ============================================================
// API リクエスト / レスポンス型定義
// ============================================================

/**
 * 公開リクエスト
 */
export interface PublishRequest {
  /** テンプレートのみ公開するか（値なし）。デフォルト: false */
  template_only?: boolean;
  /** 生データを保存するか。デフォルト: false */
  store_raw_series?: boolean;
  /** ラスタデータを保存するか。デフォルト: false */
  store_raw_raster?: boolean;
  /** チャンクサイズ（点数）。デフォルト: 65536 */
  raw_chunk_size?: number;
  /** 圧縮方式。デフォルト: 'zstd' */
  raw_compression?: string;
  /** 非公開時に生データを残すか。デフォルト: false */
  keep_raw_on_unpublish?: boolean;
  /** 公開期限（ISO 8601形式）。省略時は無期限 */
  retention_until?: string | null;
  /**
   * プレビュー生成モード。デフォルト: 'uniform'
   * TODO: デフォルトモードを確定させる
   */
  preview_mode?: PreviewMode;
}

/**
 * 非公開リクエスト
 */
export interface UnpublishRequest {
  /**
   * 非公開モード
   * - keep_meta: 代表メタデータを残す（デフォルト）
   * - full_delete: 完全削除
   */
  mode?: 'keep_meta' | 'full_delete';
}

/**
 * 公開レスポンス
 */
export interface PublishResponse {
  asset_id: number;
  registry_id: number;
  status: MaimlPublishRegistry['status'];
  doc_name: string | null;
  file_uri: string;
  template_only: boolean;
  store_raw_series: boolean;
  message: string;
}

/**
 * 公開ステータス取得レスポンス
 */
export interface PublishStatusResponse {
  is_published: boolean;
  asset_id: number | null;
  registry_id: number | null;
  status: MaimlPublishRegistry['status'] | null;
  doc_name: string | null;
  template_only: boolean | null;
  store_raw_series: boolean | null;
  retention_until: Date | null;
  published_at: Date | null;
}

// ============================================================
// 内部処理用型定義
// ============================================================

/**
 * KV抽出の入力コンテキスト
 */
export interface KvExtractContext {
  asset_id: number;
  /** 現在のinstruction要素のid属性 */
  current_instruction_id: string | null;
  /** 現在のtemplate要素のid属性 */
  current_template_id: string | null;
  /** 現在のsource_section（conditionTemplate / condition 等） */
  source_section: string;
}

/**
 * seriesデータ（XML解析結果）
 */
export interface ParsedSeries {
  instruction_id: string | null;
  template_id: string | null;
  result_id: string | null;
  result_name: string | null;
  content_id: string | null;
  content_size: number | null;
  x_label: string;
  y_label: string;
  x_unit: string | null;
  y_unit: string | null;
  x_values: number[];
  y_values: number[];
}

/**
 * Ingest処理の結果サマリー
 */
export interface IngestResult {
  asset_id: number;
  doc_name: string | null;
  condition_kv_count: number;
  material_kv_count: number;
  preview_count: number;
  raw_header_count: number;
  raw_chunk_count: number;
}
