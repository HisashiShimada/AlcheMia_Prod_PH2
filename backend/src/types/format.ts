/**
 * フォーマットフォルダ情報の型定義
 */
export interface FormatFolder {
  id: string;
  name: string;
  folderName: string;
  description: string;
  fileCount: number;
  fileType: 'xml' | 'maiml';
  category: 'template' | 'workflow';
  department: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * ファイルタイプフィルタ
 */
export type FileTypeFilter = 'all' | 'xml' | 'maiml';

/**
 * フォーマットファイル情報の型定義
 */
export interface FormatFile {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder: boolean;
  fileCount?: number; // フォルダの場合のみ
}

/**
 * フォーマットフォルダ作成リクエストの型定義（部門直下）
 */
export interface CreateFormatFolderRequest {
  folderName: string; // 1-255文字、英数字・アンダースコアのみ
}

/**
 * フォーマットフォルダ作成レスポンスの型定義（部門直下）
 */
export interface CreateFormatFolderResponse {
  folder_name: string;
  folder_path: string; // {organization_id}/formats/{department_cd}/{folder_name}
  department_cd: string;
  created_at: string;
}

/**
 * フォーマット内サブフォルダ作成リクエストの型定義
 */
export interface CreateFormatSubfolderRequest {
  formatName: string; // フォーマット名（chemistry, materials等）
  subfolderName: string; // サブフォルダ名（1-255文字、英数字・アンダースコア・ハイフンのみ）
  parentPath?: string; // 親フォルダのパス（オプション、空文字列=ルート直下）
}

/**
 * フォーマット内サブフォルダ作成レスポンスの型定義
 */
export interface CreateFormatSubfolderResponse {
  folder_name: string;
  folder_path: string; // formatName/subfolderName または formatName/parentPath/subfolderName
  full_swift_path: string; // {organization_id}/formats/{department_cd}/formatName/subfolderName
  created_at: string;
}
