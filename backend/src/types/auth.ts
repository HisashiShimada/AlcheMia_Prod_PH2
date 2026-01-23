/**
 * 認証関連の型定義
 * 
 * @description JWT、セッション、ユーザー情報の型を定義
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
 * JWTペイロード
 */
export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * ユーザー情報
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  displayName: string;
}

/**
 * セッション情報
 */
export interface SessionInfo {
  token: string;
  expiresAt: string;
}

/**
 * Result型（エラーハンドリング用）
 */
export type Result<T, E = ServiceError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * サービスエラー
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  originalError?: Error;
}

/**
 * ロール別リダイレクトURL
 */
export const ROLE_REDIRECT_URL: Record<UserRole, string> = {
  provider: '/provider',
  system_admin: '/system-admin',
  data_admin: '/data-admin',
  experiment_admin: '/experiment-admin',
  experiment_worker: '/experiment-worker',
  mi_engineer: '/mi-engineer'
};

/**
 * ロール別bcrypt rounds
 */
export const BCRYPT_ROUNDS: Record<UserRole, number> = {
  provider: 14,
  system_admin: 14,
  data_admin: 12,
  experiment_admin: 12,
  mi_engineer: 12,
  experiment_worker: 12
};

/**
 * PINコードデータ
 */
export interface PinCodeData {
  pinCode: string;
  expiresAt: Date;
}
