/**
 * API共通型定義
 * 全てのAPI呼び出しで使用される基本的な型
 */

/**
 * API成功レスポンス
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * APIエラーレスポンス
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  timestamp?: string;
}

/**
 * API呼び出し結果（成功またはエラー）
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * ソート順序
 */
export type SortOrder = 'asc' | 'desc';

/**
 * フィルタ条件の基本型
 */
export interface FilterParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * API呼び出しオプション
 */
export interface ApiOptions {
  /** タイムアウト時間（ミリ秒） */
  timeout?: number;
  /** リトライ回数 */
  retryCount?: number;
  /** キャッシュを使用するか */
  useCache?: boolean;
}

/**
 * ロード状態
 */
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

/**
 * データ取得状態（ロード状態 + データ）
 */
export interface DataState<T> extends LoadingState {
  data: T | null;
}

/**
 * APIエラーの型ガード
 */
export function isApiError(result: unknown): result is ApiError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    result.success === false &&
    'error' in result
  );
}

/**
 * API成功レスポンスの型ガード
 */
export function isApiResponse<T>(result: unknown): result is ApiResponse<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    result.success === true &&
    'data' in result
  );
}

/**
 * ページネーション付きレスポンスの型ガード
 */
export function isPaginatedResponse<T>(result: unknown): result is PaginatedResponse<T> {
  return (
    isApiResponse(result) &&
    'pagination' in result &&
    typeof result.pagination === 'object' &&
    result.pagination !== null
  );
}
