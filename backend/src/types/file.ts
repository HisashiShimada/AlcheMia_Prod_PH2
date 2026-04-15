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
 * プロジェクトファイル一覧APIのレスポンス用ファイル型
 * フロントエンドの ProjectFile 型と同じ構造
 */
export interface ProjectFileResponse {
  /** ファイルID（S3キー） */
  id: string;
  /** ファイル名 */
  name: string;
  /** ファイルパス（organization_id を除いた相対パス） */
  path: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** 最終更新日時（ISO 8601形式） */
  lastModified: string;
  /** ファイル種別（拡張子 or 'folder'） */
  type: string;
  /** フォルダエントリかどうか */
  isFolder?: boolean;
  /** アーカイブフォルダ配下のファイルかどうか */
  isArchive?: boolean;
  /** アーカイブファイルのバージョン番号 */
  version?: number | null;
  /** 署名付きURL */
  signedUrl?: string | null;
  /** 作成日時（ISO 8601形式） */
  createdAt?: string;
  /** サブフォルダ内のファイル数（フォルダエントリの場合） */
  fileCount?: number;
}

/**
 * getProjectFiles サービスメソッドのレスポンスデータ型
 */
export interface GetProjectFilesData {
  projectId: string;
  projectName: string;
  /** ルート直下ファイル + サブフォルダエントリ */
  files: ProjectFileResponse[];
  /** サブフォルダ名 → ファイル一覧のマップ */
  subFolderFiles: Record<string, ProjectFileResponse[]>;
}

/**
 * ファイルアップロードメタデータ
 */
export interface UploadMetadata {
  projectId?: string;
  formatId?: string;
  batchName?: string;
  preserveFolderStructure?: boolean;
  /** initBatch で事前作成されたバッチID（渡された場合は既存バッチを再利用） */
  batchId?: string;
}

/**
 * アップロードファイル情報
 */
export interface UploadedFileInfo {
  fileId?: string;
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
  // ✨ Task: project_maiml_flg更新処理実装 - Phase 2
  // アップロード対象にMAIMLファイルが含まれているか
  hasMaimlFile?: boolean;
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
 * storageService.listFiles() が返す1ファイル分のオブジェクト型
 */
export interface StorageFileEntry {
  /** S3/Swift のフルキー（例: "{orgId}/projects/{name}/file.maiml"） */
  key: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** 最終更新日時 */
  lastModified: Date;
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
