/**
 * S3/Swiftストレージ関連の型定義（Frontend）
 * 
 * @description ファイル操作、一覧取得、自動補正などの型
 * @reference Backend版: backend/src/types/storage.ts
 */

/**
 * ファイル情報
 */
export interface StorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
  organizationId: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  managerId: string | null;
  checkoutTime: string | null;
  workId: string | null;
  workUuid: string | null;
  workerId: string | null;
  assignedWorkerId: string | null;
  assignedTo: string | null;
}

/**
 * ファイル一覧取得のレスポンス
 */
export interface ListFilesResponse {
  files: StorageFile[];
  hierarchicalData: unknown[]; // TODO: Phase 7で階層構造の型定義を追加
  totalCount: number;
  organizationId: string;
  cached: boolean;
  processingTime?: number;
  cacheAge?: number;
  timestamp: string;
}

/**
 * ファイル内容取得のレスポンス
 */
export interface FileContentResponse {
  data: {
    content: string;
    fileKey: string;
    contentLength: number;
    lastModified: string;
    contentType: string;
  };
}

/**
 * 自動補正の適用結果
 */
export interface CorrectionResult {
  errorIndex: number;
  type: string;
  description: string;
  applied: boolean;
  reason?: string;
}

/**
 * 自動補正のレスポンス
 */
export interface AutoCorrectResponse {
  correctedContent: string;
  appliedCorrections: CorrectionResult[];
  correctionCount: number;
  totalAttempted: number;
  message: string;
  timestamp: string;
}

/**
 * ファイル一覧取得のリクエストパラメータ
 */
export interface ListFilesRequest {
  organizationId: string;
  prefix?: string;
  maxResults?: number;
}

/**
 * ファイル内容取得のリクエストパラメータ
 */
export interface GetFileContentRequest {
  key: string;
}

/**
 * 自動補正のリクエストパラメータ
 */
export interface AutoCorrectRequest {
  maimlContent: string;
  selectedErrors: number[];
  organizationId: string;
}
