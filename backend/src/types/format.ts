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
