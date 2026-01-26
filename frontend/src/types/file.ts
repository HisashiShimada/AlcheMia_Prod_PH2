/**
 * ファイル関連の型定義
 */

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
