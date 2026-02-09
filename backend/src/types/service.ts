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
 * デフォルトbcrypt rounds設定
 * role情報が不明な場合に使用（標準的なセキュリティ強度）
 */
export const DEFAULT_BCRYPT_ROUNDS = 12;

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
 * PINコード送信情報（メール送信結果を含む）
 */
export interface PinCodeSendData {
  pinCode: string;
  expiresAt: Date;
  maskedEmail: string;
}
