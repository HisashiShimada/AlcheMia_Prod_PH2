/**
 * SessionStorage関連の型定義
 */

/**
 * SessionStorageに保存されるユーザー情報
 */
export interface SessionUserInfo {
  /** ユーザーID */
  id: string;
  /** ユーザー名 */
  username: string;
  /** 表示名 */
  displayName: string;
  /** メールアドレス */
  email: string;
  /** 組織ID */
  organizationId: string;
  /** 組織名 */
  organizationName: string;
  /** ロール */
  role: string;
}

/**
 * SessionStorageのキー定義
 */
export const SESSION_STORAGE_KEYS = {
  /** セッショントークン */
  SESSION_TOKEN: 'sessionToken',
  /** ユーザー情報 */
  USER: 'user',
} as const;