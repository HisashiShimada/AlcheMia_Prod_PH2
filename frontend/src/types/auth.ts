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
  | 'experiment_worker';

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
