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
 * 権限情報
 */
export interface Permission {
  functionId: string;
  permission: number;  // 0=書込専用, 1=読取権限
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
}

/**
 * ログイン資格情報
 */
export interface LoginCredentials {
  username: string;
  password: string;
  // TODO: クライアント証明書を導入するまでの仮実装
  organizationId: string;
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
    permissions: Permission[];
  };
  session: {
    token: string;
    expiresAt: string;  // ISO 8601
  };
  redirectUrl: string;  // ロール別遷移先
}

/**
 * POST /api/v1/auth/resend-pin レスポンス
 */
export interface ResendPINResponse {
  message: string;
  email: string;
  expiresIn: number;
}

/**
 * 汎用メッセージレスポンス
 */
export interface MessageResponse {
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
