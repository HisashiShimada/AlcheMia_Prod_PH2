/**
 * ストレージ（S3/Swift）関連の型定義
 * 使用箇所: useNamespaceOperations.ts, maimlApiService.ts など
 */

/**
 * S3ファイル情報の型定義
 */
export interface S3File {
  key?: string;
  name?: string;
  size?: number;
  lastModified?: string;
}

/**
 * ストレージファイル情報の型定義（S3File の別名）
 * 使用箇所: PetriNetEditorInner.tsx
 */
export type StorageFile = S3File;

/**
 * S3フォルダ情報の型定義
 */
export interface S3Folder {
  name: string;
  path: string;
  level: number;
  children: Record<string, S3Folder>;
  files: string[];
  xmlFileCount: number;
  totalFileCount: number;
  totalXmlFileCount?: number;
  totalAllFileCount?: number;
}

// ============================================================================
// maimlApiService.ts 用 APIレスポンス型
// ============================================================================

/**
 * ストレージファイル一覧取得レスポンス
 * 使用箇所: maimlApiService.ts listStorageFiles()
 */
export interface ListFilesResponse {
  files: S3File[];
  totalCount?: number;
}

/**
 * ストレージファイル内容取得レスポンス
 * 使用箇所: maimlApiService.ts getStorageFileContent()
 * APIレスポンスは { data: { content, fileKey, ... } } のネスト構造
 */
export interface FileContentResponse {
  content?: string;
  fileKey?: string;
  contentType?: string;
  size?: number;
  /** APIレスポンスのネスト構造（response.data.data.content でアクセス） */
  data?: {
    content: string;
    fileKey?: string;
    contentType?: string;
    size?: number;
  };
}

/**
 * MAIML自動補正レスポンス
 * 使用箇所: maimlApiService.ts autoCorrectMaimlRealtime()
 */
export interface AutoCorrectResponse {
  correctedContent: string;
  correctedCount: number;
  corrections: Array<{
    errorIndex: number;
    description: string;
    applied: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// editorv2/WorkflowSelectorDialog 用
// ---------------------------------------------------------------------------

/**
 * フォルダツリーノード型
 * editorv2/WorkflowSelectorDialog で使用
 */
export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  fileCount: number;
}
