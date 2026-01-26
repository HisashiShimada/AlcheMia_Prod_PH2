/**
 * ファイル関連の型定義（フロントエンドと共通）
 */

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