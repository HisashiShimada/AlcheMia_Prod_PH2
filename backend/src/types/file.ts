/**
 * ファイル関連の型定義（フロントエンドと共通）
 */

import { BatchSummary } from './uploadBatch';
import { MaimlAnalysisResult } from './maimlAnalysis';

/**
 * プロジェクトファイル（APIレスポンス用）
 */
export interface ProjectFile {
  /** ファイル名 */
  fileName: string;
  
  /** ファイルパス（S3キー） */
  filePath: string;
  
  /** ファイルサイズ（バイト） */
  fileSize: number;
  
  /** アーカイブファイルかどうか */
  isArchive?: boolean;
  
  /** バージョン番号（アーカイブファイルの場合） */
  version?: number;
  
  /** 署名付きURL（TTL: 3600秒） */
  signedUrl?: string;
  
  /** 作成日時（ISO 8601形式） */
  createdAt?: string;
}

/**
 * ファイル一覧レスポンス
 */
export interface FileListResponse {
  files: ProjectFile[];
}

/**
 * ファイルアップロードメタデータ
 */
export interface UploadMetadata {
  projectId?: string;
  formatId?: string;
  batchName?: string;
  preserveFolderStructure?: boolean;
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
  // Phase2-3: MAIML解析統合（2026-02-18）
  maimlAnalysis?: MaimlAnalysisResult;
}

/**
 * アップロードサマリー
 */
export interface UploadSummary {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalSize: number;
}

/**
 * ファイルアップロード結果
 */
export interface FileUploadResult {
  uploadMode: string;
  files: UploadedFileInfo[];
  summary: UploadSummary;
  // Phase1-3: 空フォルダプレースホルダー結果（2026-02-18）
  emptyFolders?: PlaceholderResult[];
  // Phase2-1: バッチ情報（2026-02-18）
  batch?: BatchSummary;
}

/**
 * プレースホルダー作成結果（Phase1-3: 空フォルダプレースホルダー機能）
 */
export interface PlaceholderResult {
  /** フォルダパス */
  folderPath: string;
  /** プレースホルダーファイルキー（作成された場合） */
  placeholderKey?: string;
  /** 作成成功フラグ */
  success: boolean;
  /** スキップされた場合（既に存在する） */
  skipped?: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * Multerファイル型（Express.Multer.File）
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
