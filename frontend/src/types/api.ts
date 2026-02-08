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
  // 開発環境専用フィールド（NODE_ENV=developmentの場合のみ含まれる）
  pinCode?: string;
  devMode?: boolean;
}

/**
 * 権限情報
 */
export interface Permission {
  functionId: string;
  permission: number;  // 0=書込専用, 1=読取権限
}

/**
 * PINコード検証レスポンスデータ
 */
export interface VerifyPinResponseData {
  user: {
    id: string;
    username: string;
    email: string;
    roleName: string;
    roleCd: string;
    organizationId: string;
    organizationName: string;
    displayName: string;
    departmentCd: string;
    initialScreenFunctionCd: string;
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
