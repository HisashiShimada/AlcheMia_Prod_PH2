/**
 * サービス層の共通型定義
 */

/**
 * Result型 - エラーハンドリング用
 */
export type Result<T, E = ServiceError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * ServiceError - サービス層のエラー型
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  originalError?: Error;
}

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
 * ロール別bcrypt rounds設定
 */
export const BCRYPT_ROUNDS: Record<UserRole, number> = {
  provider: 14,
  system_admin: 14,
  data_admin: 12,
  experiment_admin: 12,
  experiment_worker: 12,
  mi_engineer: 12
};

/**
 * PINコード情報
 */
export interface PinCodeData {
  pinCode: string;
  expiresAt: Date;
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
