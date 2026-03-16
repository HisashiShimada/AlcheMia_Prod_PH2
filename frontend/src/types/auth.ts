/**
 * 認証関連の型定義
 */

/**
 * ユーザーロール
 */
export type UserRole = 
  | 'provider'
  | 'system_admin'
  | 'data_admin'
  | 'experiment_admin'
  | 'experiment_worker'
  | 'mi_engineer';

/**
 * メニュータイプ定義
 */
export type MenuType = 
  | 'provider'
  | 'system_admin'
  | 'data_admin'
  | 'experiment_admin'
  | 'experiment_worker'
  | 'mi_engineer';

/**
 * メニュータイプとfunctionIdのマッピング
 */
export const MENU_FUNCTION_IDS: Record<MenuType, string> = {
  provider: '010000',
  system_admin: '020000',
  data_admin: '030000',
  experiment_admin: '040000',
  experiment_worker: '050000',
  mi_engineer: '060000',
} as const;

/**
 * 権限情報
 */
export interface Permission {
  functionId: string;
  permission: number;  // 0=書込専用, 1=読取権限
}

/**
 * JWTペイロードの型定義
 */
export interface JwtPayload {
  userId: string;
  organizationId: string;
  sessionId: string;
  permissions: Permission[];
  iat: number;
  exp: number;
}

/**
 * ユーザー情報
 */
export interface User {
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
  permissions?: Permission[];  // ユーザーの権限情報（メニューアクセス制御用）
}


/**
 * 認証状態
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * 認証フロー状態
 */
export type AuthFlowState = 
  | 'login'           // ログイン画面
  | 'pin-input'       // PINコード入力画面
  | 'reset-request'   // パスワードリセット要求画面
  | 'reset-sent';     // リセットリンク送信完了画面

/**
 * ロール別リダイレクトURLマッピング
 */
export const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  provider: '/provider',
  system_admin: '/system-admin',
  data_admin: '/data-admin',
  experiment_admin: '/experiment-admin',
  experiment_worker: '/experiment-worker',
  mi_engineer: '/mi-engineer',
} as const;

// ===== API レスポンス型定義 =====

/**
 * POST /api/v1/auth/login レスポンス
 */
export interface LoginResponse {
  sessionToken: string;
  message: string;
  email: string;        // マスキング済み（"use***@example.com"）
  expiresIn: number;    // 秒単位（300 = 5分）
}

/**
 * POST /api/v1/auth/resend-pin レスポンス
 */
export interface ResendPINResponse {
  message: string;
  email: string;     // マスキング済み（"use***@example.com"）
  expiresIn: number; // 秒単位（300 = 5分）
}

/**
 * POST /api/v1/auth/verify-pin レスポンス
 */
export interface VerifyPINResponse {
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
    permissions?: Permission[];  // ユーザーの権限情報
  };
  session: {
    token: string;
    expiresAt: string;  // ISO 8601
  };
  passwordChangeRequired: boolean;  // 一時パスワードでログインした場合はtrue
  redirectUrl: string;  // ロール別遷移先
}

/**
 * ログイン認証情報
 */
export interface LoginCredentials {
  userId: string;
  password: string;
  organizationId: string;
}

/**
 * 汎用メッセージレスポンス
 */
export interface MessageResponse {
  message: string;
}

/**
 * POST /api/v1/auth/change-password リクエスト
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * POST /api/v1/auth/change-password レスポンス
 */
export interface ChangePasswordResponse {
  message: string;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
      code?: string;
    }>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
