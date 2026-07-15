/**
 * フォーマット関連の型定義
 */

import type { Template } from '@/types/maiml-unified';
import type { PropertyData } from '@/types/editor';

// ---------------------------------------------------------------------------
// format/FormatUploadDialog 用
// ---------------------------------------------------------------------------

/**
 * アップロードモード
 * format/FormatUploadDialog で使用
 */
export type UploadMode = 'single' | 'bulk' | 'folder';

/**
 * アップロード状態
 * format/FormatUploadDialog で使用
 */
export interface UploadState {
  isUploading: boolean;
  progress: number;
  uploadedCount: number;
  totalCount: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// format/FormatSearchModal 用
// ---------------------------------------------------------------------------

/**
 * 検索条件
 * format/FormatSearchModal で使用
 */
export interface SearchCriteria {
  attribute: string;
  value: string;
}

/**
 * 検索結果（フォーマットファイル）
 * format/FormatSearchModal で使用
 */
export interface FormatSearchResult {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  version?: string;
  description?: string;
  formatName: string;
  category: string;
  matchCount: number;
  matchedAttributes?: Array<{
    attribute: string;
    value: string;
  }>;
}

/**
 * 検索統計
 * format/FormatSearchModal で使用
 */
export interface SearchStats {
  totalFiles: number;
  totalMatches: number;
  searchDuration: number;
  totalCriteria: number;
}

// ---------------------------------------------------------------------------
// 既存型定義
// ---------------------------------------------------------------------------

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
  organizationGroup: string;
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
 * フォーマットファイルの型定義
 * 使用箇所: format/FormatFileListTable.tsx, format/FormatManagement.tsx
 */
export interface FormatFileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  version?: string;
  description?: string;
  creator?: string;
  isFolder?: boolean;
  fileCount?: number;
}

/**
 * フォーマットファイル詳細データの型定義
 * 使用箇所: format/FormatFileDetailModal.tsx, format/FormatManagement.tsx
 */
export interface FormatFileDetailData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  version?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  // XML/MAIMLファイル編集用プロパティ
  content?: string;
  isNewFile?: boolean;
  // XMLパース結果（Template型経由）
  parsedTemplate?: Template;
  // XMLパース結果（PropertyData形式直接）
  parsedProperties?: Record<string, PropertyData>;
  parsedContents?: Record<string, PropertyData>;
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
  organizationGroup: string;
}

/**
 * フォーマットファイル作成データ
 * 使用箇所: format/CreateFormatFileModal.tsx, format/FormatManagement.tsx
 */
export interface CreateFormatFileData {
  fileName: string;
  fileNameWithExtension: string;
  formatId: string;
  formatName: string;
  fileType: 'xml' | 'maiml';
  templateType?: 'material' | 'condition' | 'result';
  createdBy: string;
  createdByName: string;
  currentPath?: string;
}

/**
 * フォーマットフォルダ作成データ
 * 使用箇所: format/CreateFormatFolderModal.tsx, format/FormatManagement.tsx
 */
export interface CreateFormatFolderData {
  formatId: string;
  folderName: string;
  currentPath?: string;
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
 * フォーマットファイル作成リクエストの型定義
 */
export interface CreateFormatFileRequest {
  fileName: string;  // 拡張子を含むファイル名（例: "test.xml", "workflow.maiml"）
  description?: string;
  currentPath?: string; // 現在のサブフォルダパス
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
 * フォーマットファイル作成レスポンス
 */
export interface CreateFormatFileResponse {
  filePath: string;
  fileName: string;
  fileType: string;
  size: number;
  createdAt: string;
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

// ---------------------------------------------------------------------------
// templateApi から移動した型
// ---------------------------------------------------------------------------

/**
 * フォーマットテンプレートファイル情報
 */
export interface FormatTemplateFile {
  key: string;
  fileName: string;
  size: number;
}

/**
 * フォーマットフォルダ情報
 */
export interface FormatFolder {
  folderName: 'material' | 'condition' | 'result';
  files: FormatTemplateFile[];
}

/**
 * フォーマット組織グループ情報
 */
export interface FormatOrganizationGroup {
  organizationGroupCd: string;
  folders: FormatFolder[];
}

/**
 * フォーマット一覧レスポンス
 */
export interface ListFormatsResponse {
  organizationGroups: FormatOrganizationGroup[];
}

// ============================================================================
// 名前空間解析関連の型定義
// 使用箇所: useNamespaceOperations.ts
// ============================================================================

/**
 * 解析された要素の型定義
 */
export interface ParsedElement {
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: ParsedElement[];
  key?: string;
  namespaceOrigin?: boolean;
  namespaceSource?: {
    uri: string;
    hierarchyPath: string[];
    importedAt: string;
    originalKey?: string;
  };
}

/**
 * 要素コレクションアイテムの型定義
 */
export interface CollectedElement {
  key: string;
  element: ParsedElement;
  path: string[];
  hierarchyScore: number;
  xsiType: string;
}

/**
 * 名前空間データの型定義
 */
export interface NamespaceData {
  namespaceURI: string;
  hierarchyPath: string[];
  properties: Record<string, ParsedElement>;
  contents: Record<string, ParsedElement>;
  totalElements: number;
}
