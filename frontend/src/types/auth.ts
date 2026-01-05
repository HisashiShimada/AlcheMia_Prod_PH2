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
 * ユーザー情報
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  displayName: string;
}

/**
 * ログイン資格情報
 */
export interface LoginCredentials {
  username: string;
  password: string;
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
    role: UserRole;
    organizationId: string;
    organizationName: string;
    displayName: string;
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
