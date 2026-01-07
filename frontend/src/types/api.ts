/**
 * API共通型定義
 */

/**
 * API成功レスポンスの共通型
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * APIエラーレスポンスの共通型
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * APIレスポンスの共通型（成功またはエラー）
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * ログインレスポンスデータ
 */
export interface LoginResponseData {
  sessionToken: string;
  message: string;
  email: string;
  expiresIn: number;
}

/**
 * PINコード検証レスポンスデータ
 */
export interface VerifyPinResponseData {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    organizationId: string;
    organizationName: string;
    displayName: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
  redirectUrl: string;
}

/**
 * PINコード再送信レスポンスデータ
 */
export interface ResendPinResponseData {
  message: string;
  email: string;
  expiresIn: number;
}

/**
 * ログアウトレスポンスデータ
 */
export interface LogoutResponseData {
  message: string;
}

/**
 * パスワードリセット要求レスポンスデータ
 */
export interface ResetPasswordRequestResponseData {
  message: string;
  email: string;
}

/**
 * パスワードリセット実行レスポンスデータ
 */
export interface ResetPasswordResponseData {
  message: string;
}
