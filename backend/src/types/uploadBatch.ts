/**
 * アップロードバッチ型定義
 * Phase 2-1: バッチ管理機能
 */

/**
 * アップロード種別
 */
export type UploadType = 'single' | 'bulk' | 'folder' | 'draft';

/**
 * バッチステータス
 */
export type BatchStatus = 
  | 'in_progress'        // アップロード中
  | 'completed'          // 完了（全成功）
  | 'completed_with_errors'  // 完了（一部失敗）
  | 'failed'             // 失敗（全失敗）
  | 'cancelled';         // キャンセル（Task: アップロードキャンセル機能実装）

/**
 * アップロードバッチ情報
 * Version: 2.0 (Reference版準拠)
 */
export interface UploadBatch {
  /** バッチ識別子（batch_YYYYMMDD_HHMMSS_random）主キー */
  batchId: string;
  /** バッチ名 */
  batchName: string;
  /** アップロード種別 */
  uploadType: UploadType;
  /** 組織ID */
  organizationId: string;
  /** アップロード実行者（VARCHAR(50)） */
  uploadBy: string;
  /** 合計ファイル数 */
  totalFiles: number;
  /** 完了ファイル数 */
  completedFiles: number;
  /** 失敗ファイル数 */
  failedFiles: number;
  /** バッチステータス */
  status: BatchStatus;
  /** 開始時刻 */
  startTime: Date;
  /** 終了時刻 */
  endTime?: Date;
  /** 作成日時 */
  createAt: Date;
  /** 更新日時 */
  updateAt: Date;
}

/**
 * バッチ作成パラメータ
 */
export interface CreateBatchParams {
  /** バッチ名（省略時は自動生成） */
  batchName?: string;
  /** アップロード種別 */
  uploadType: UploadType;
  /** 組織ID */
  organizationId: string;
  /** アップロード実行ユーザーID */
  uploadedBy: string;
  /** 合計ファイル数 */
  totalFiles: number;
}

/**
 * バッチ更新パラメータ
 */
export interface UpdateBatchParams {
  /** 完了ファイル数 */
  completedFiles?: number;
  /** 失敗ファイル数 */
  failedFiles?: number;
  /** バッチステータス */
  status?: BatchStatus;
  /** 終了時刻 */
  endTime?: Date;
}

/**
 * バッチ検索条件
 */
export interface BatchSearchParams {
  /** 組織ID（必須） */
  organizationId: string;
  /** アップロード実行ユーザーID（オプション） */
  uploadedBy?: string;
  /** バッチステータス（オプション） */
  status?: BatchStatus;
  /** 開始日（オプション） */
  startDate?: Date;
  /** 終了日（オプション） */
  endDate?: Date;
  /** 取得件数上限（デフォルト: 50） */
  limit?: number;
  /** オフセット（デフォルト: 0） */
  offset?: number;
}

/**
 * バッチ進捗情報
 */
export interface BatchProgress {
  /** バッチ識別子 */
  batchId: string;
  /** バッチ名 */
  batchName: string;
  /** 合計ファイル数 */
  totalFiles: number;
  /** 完了ファイル数 */
  completedFiles: number;
  /** 失敗ファイル数 */
  failedFiles: number;
  /** 進捗率（%） */
  progressPercent: number;
  /** バッチステータス */
  status: BatchStatus;
}

/**
 * バッチサマリー情報（レスポンス用）
 */
export interface BatchSummary {
  /** バッチ識別子 */
  batchId: string;
  /** バッチ名 */
  batchName: string;
  /** バッチステータス */
  status: BatchStatus;
}
