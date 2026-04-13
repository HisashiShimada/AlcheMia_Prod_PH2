/**
 * ファイル関連の型定義
 */

/**
 * S3/Swiftファイル情報の型定義
 * （apiClient.ts の fetchFileList の戻り値で使用）
 */
export interface FileInfo {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
}


/**
 * プロジェクトファイル
 */
export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
  
  /** アーカイブファイルかどうか */
  isArchive?: boolean;
  
  /** バージョン番号（アーカイブファイルの場合） */
  version?: number;
  
  /** 署名付きURL（TTL: 3600秒） */
  signedUrl?: string;
  
  /** 作成日時（ISO 8601形式） */
  createdAt?: string;
  
  /** チェックアウト中かどうか */
  isCheckedOut?: boolean;
  
  /** チェックアウトしたユーザー */
  checkedOutBy?: string | null;
  
  /** チェックアウト日時 */
  checkedOutAt?: string | null;
}

/**
 * プロジェクトファイル構造
 */
export interface ProjectFileStructure {
  root: ProjectFile[];
  archive?: ProjectFile[];
}

/**
 * ファイルアップロードモード
 */
export type UploadMode = 
  | 'single'        // 単一ファイル
  | 'multiple'      // 複数ファイル
  | 'folder';       // フォルダ

/**
 * プロジェクトファイル一覧レスポンス
 */
export interface ProjectFilesResponse {
  files: ProjectFile[];
}

/**
 * ファイル一覧レスポンス（API用）
 */
export interface FileListResponse {
  files: ProjectFile[];
}

/**
 * ファイルアップロード結果
 */
export interface FileUploadResult {
  mode: string;
  fileCount: number;
  success: boolean;
  uploadedFiles?: string[];
  errors?: string[];
}

/**
 * ファイルダウンロードリクエスト
 */
export interface FileDownloadRequest {
  fileId: string;
  fileName: string;
}

/**
 * ファイル削除リクエスト
 */
export interface FileDeleteRequest {
  fileId: string;
  projectId?: string;
}

/**
 * ファイル移動リクエスト
 */
export interface FileMoveRequest {
  fileId: string;
  sourceFolder: string;
  targetFolder: string;
}

/**
 * ファイルコピーリクエスト
 */
export interface FileCopyRequest {
  fileId: string;
  sourceFolder: string;
  targetFolder: string;
  newName?: string;
}

/**
 * ファイル名変更リクエスト
 */
export interface FileRenameRequest {
  fileId: string;
  newName: string;
}

/**
 * フォルダ作成リクエスト
 */
export interface CreateFolderRequest {
  projectId: string;
  parentFolder: string;
  folderName: string;
}

/**
 * ファイル検索条件
 */
export interface FileSearchParams {
  search?: string;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  sizeMin?: number;
  sizeMax?: number;
}

/**
 * ファイルメタデータ
 */
export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  mimeType?: string;
  lastModified: string;
  createdAt?: string;
  createdBy?: string;
  modifiedBy?: string;
  checksum?: string;
  encoding?: string;
  isReadOnly?: boolean;
  tags?: string[];
}

/**
 * ファイル統計情報
 */
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  byFolder: Record<string, number>;
}

/**
 * アップロード進捗情報
 */
export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  uploadedCount: number;
  totalCount: number;
}

/**
 * アップロードファイル情報
 */
export interface UploadedFileInfo {
  fileId: string;
  fileName: string;
  filePath: string;
  s3Key: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

/**
 * アップロードレスポンスデータ
 */
export interface UploadResponseData {
  uploadMode: string;
  files: UploadedFileInfo[];
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalSize: number;
  };
  // ✨ Task: project_maiml_flg更新処理実装 - Phase 3
  // アップロード対象にMAIMLファイルが含まれているか
  hasMaimlFile?: boolean;
  // ✨ Task: アップロードキャンセル機能実装
  // バッチID（キャンセル処理で使用）
  batchId?: string;
}

/**
 * アップロードメタデータ
 */
export interface UploadMetadata {
  projectId?: string;
  formatId?: string;
  batchName?: string;
  preserveFolderStructure?: boolean;
}

/**
 * アップロードパラメータ
 */
export interface UploadFilesParams {
  uploadMode: 'single' | 'bulk' | 'folder';
  targetPath: string;
  files: File[];
  metadata?: UploadMetadata;
  onProgress?: (progress: UploadProgress) => void;
  /**
   * ファイルごとの進捗コールバック。
   * 各ファイルの進捗を独立して通知するために使用する。
   * @param fileName ファイル名
   * @param percent  進捗パーセンテージ（0〜100）
   * @param status   プログレスバーの状態
   */
  onFileProgress?: (fileName: string, percent: number, status: 'active' | 'success' | 'exception') => void;
  /** リトライ発生時のコールバック。UI 側でリトライ状態を表示するために使用 */
  onRetry?: (state: UploadRetryState) => void;
  /**
   * チャンクアップロードセッション開始直後に uploadId を通知するコールバック。
   * UI 側でキャンセル処理（abortChunkUpload）を行うために使用する。
   */
  onSessionInit?: (uploadId: string) => void;
  /**
   * アップロードをキャンセルするための AbortSignal。
   * AbortController.signal を渡すことでアップロードを中断できる。
   */
  signal?: AbortSignal;
}

/**
 * アップロード結果サマリー
 *
 * アップロード完了後に UI へ表示する結果情報。
 */
export interface UploadResultSummary {
  /** 成功したファイル数 */
  successCount: number;
  /** 失敗したファイル数 */
  failureCount: number;
  /** 失敗したファイル名の一覧 */
  failedFileNames: string[];
}

// ---------------------------------------------------------------------------
// チャンク分割アップロード関連型定義 (2026-03-25)
// ---------------------------------------------------------------------------

/**
 * チャンクアップロードセッション情報
 *
 * init API が返す uploadId と、送信に必要なメタ情報を保持する。
 */
export interface ChunkUploadSession {
  /** サーバーが発行したセッション識別子 */
  uploadId: string;
  /** 総チャンク数 */
  totalChunks: number;
  /** 1 チャンクあたりのサイズ（バイト） */
  chunkSize: number;
}

/**
 * チャンクアップロードオプション
 *
 * uploadFileWithChunks() に渡す設定値。
 */
export interface ChunkUploadOptions {
  /**
   * 1 チャンクあたりのサイズ（バイト）。
   * デフォルト: 10 * 1024 * 1024 (10MB)
   */
  chunkSize?: number;
  /**
   * 進捗コールバック。
   * 統一計算式 (完了済みバイト数 + e.loaded) / file.size × 100 で算出した
   * パーセンテージ（0〜100）を受け取る。
   */
  onProgress?: (percent: number) => void;
  /**
   * セッション開始直後に uploadId を通知するコールバック。
   * 呼び出し元でキャンセル処理（abortChunkUpload）を行うために使用する。
   */
  onSessionInit?: (uploadId: string) => void;
  /**
   * リトライ発生時のコールバック。
   * UI 側でリトライ状態を表示するために使用する。
   */
  onRetry?: (state: UploadRetryState) => void;
}

/**
 * ファイルごとのアップロード進捗状態
 *
 * プログレスバーの表示に使用する。
 */
export interface UploadProgressState {
  /** 進捗パーセンテージ（0〜100） */
  percent: number;
  /** プログレスバーの状態 */
  status: 'active' | 'success' | 'exception' | 'normal';
}

// ---------------------------------------------------------------------------
// リトライ機能関連型定義 (2026-03-26)
// ---------------------------------------------------------------------------

/**
 * リトライ設定オプション
 *
 * withRetry() に渡す設定値。
 */
export interface UploadRetryOptions {
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries: number;
  /** 初回リトライ待機時間（ミリ秒）。指数バックオフの基準値（デフォルト: 1000） */
  baseDelayMs: number;
}

/**
 * リトライ状態
 *
 * リトライ発生時に UI 側へコールバックで通知する情報。
 * 「リトライ中... (1/3)」のようなメッセージ表示に使用する。
 */
export interface UploadRetryState {
  /** 現在のリトライ回数（1 始まり） */
  retryCount: number;
  /** 最大リトライ回数 */
  maxRetries: number;
  // ✨ Task: アップロードキャンセル機能実装
  // アップロードをキャンセルするためのAbortSignal
  signal?: AbortSignal;

}
