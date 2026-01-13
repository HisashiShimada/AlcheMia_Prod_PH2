/**
 * フォーマット関連の型定義
 */

/**
 * フォーマットカテゴリ
 */
export type FormatCategory = 
  | 'protocol'      // プロトコル
  | 'material'      // 材料
  | 'measurement'   // 測定
  | 'analysis'      // 分析
  | 'sample'        // サンプル
  | 'device';       // デバイス

/**
 * ファイルタイプ
 */
export type FormatFileType = 'xml' | 'maiml';

/**
 * フォーマット
 */
export interface Format {
  id: string;
  name: string;
  folderName: string;
  description: string;
  fileCount: number;
  fileType: FormatFileType;
  category: FormatCategory;
  department: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * フォーマットファイル
 */
export interface FormatFile {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  version?: string;
  description?: string;
  isFolder?: boolean;
  fileCount?: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

/**
 * フォーマットファイル詳細データ（モーダル表示用）
 */
export interface FormatFileDetailData extends FormatFile {
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

/**
 * フォーマットファイル構造
 */
export interface FormatFileStructure {
  root: FormatFile[];
  subfolders?: Record<string, {
    name: string;
    files: FormatFile[];
  }>;
}

/**
 * サブフォルダ情報
 */
export interface SubFolder {
  value: string;
  label: string;
}

/**
 * フォーマット作成データ
 */
export interface CreateFormatData {
  name: string;
  folderName: string;
  description: string;
  fileType: FormatFileType;
  category: FormatCategory;
  department: string;
}

/**
 * フォーマットファイル作成データ
 */
export interface CreateFormatFileData {
  formatId: string;
  name: string;
  description?: string;
  content?: string;
  createdBy: string;
  createdByName: string;
}

/**
 * フォーマットフォルダ作成データ
 */
export interface CreateFormatFolderData {
  formatId: string;
  folderName: string;
  description?: string;
}

/**
 * フォーマットフィルタ条件
 */
export interface FormatFilterParams {
  search?: string;
  categoryFilter?: 'all' | FormatCategory;
  fileTypeFilter?: 'all' | FormatFileType;
  sortBy?: 'name' | 'category' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * フォーマット統計情報
 */
export interface FormatStats {
  total: number;
  byCategory: Record<FormatCategory, number>;
  byFileType: Record<FormatFileType, number>;
}

/**
 * フォーマット一覧レスポンス
 */
export interface FormatListResponse {
  folders: Format[];
  stats?: FormatStats;
}

/**
 * フォーマット詳細レスポンス
 */
export interface FormatDetailResponse {
  format: Format;
}

/**
 * フォーマットファイル一覧レスポンス
 */
export interface FormatFilesResponse {
  files: FormatFile[];
}

/**
 * フォーマットアップロード情報
 */
export interface FormatUploadInfo {
  formatId: string;
  formatName: string;
  folderName: string;
  subFolder?: string;
}

/**
 * フォーマットアップロード結果
 */
export interface FormatUploadResult {
  success: boolean;
  fileCount: number;
  uploadedFiles: string[];
  errors?: string[];
}

/**
 * 名前空間関連の型定義
 */

/**
 * S3フォルダ構造
 */
export interface Folder {
  name: string;
  path: string;
  level: number;
  subfolders: Folder[];
  files: string[];
  xmlFileCount: number;
  totalFileCount: number;
  totalXmlFileCount: number;
  totalAllFileCount: number;
}

/**
 * S3ファイル情報
 */
export interface FileInfo {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
}

/**
 * 名前空間データ
 */
export interface NamespaceData {
  namespaceURI: string;
  hierarchyPath: string[];
  properties: Record<string, PropertyData>;
  contents: Record<string, PropertyData>;
  totalElements: number;
}

/**
 * プロパティデータ（名前空間用）
 */
export interface PropertyData {
  key?: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: PropertyData[];
  namespaceOrigin?: boolean;
  namespaceSource?: {
    uri: string;
    hierarchyPath: string[];
    importedAt: string;
    originalKey?: string;
  };
}
