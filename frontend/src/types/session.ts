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

/**
 * セッション管理画面用の型定義
 */

/**
 * セッション情報（セッション管理画面用）
 */
export interface SessionInfo {
  /** トークンID */
  tokenId: string;
  /** ユーザーID */
  userId: string;
  /** ユーザー名 */
  userName: string;
  /** メールアドレス */
  email: string;
  /** セッション継続時間（表示用） */
  sessionDuration: string;
  /** セッション継続時間（分単位） */
  durationMinutes: number;
  /** ログイン時刻 */
  loginTime: string;
  /** 最終アクティビティ時刻 */
  lastActivity: string;
  /** IPアドレス */
  ipAddress: string;
  /** User-Agent */
  userAgent: string;
  /** 現在のユーザーかどうか */
  isCurrentUser: boolean;
}

/**
 * セッション一覧レスポンス型
 */
export interface SessionListResponse {
  /** セッション情報の配列 */
  sessions: SessionInfo[];
  /** セッション数 */
  count: number;
}

/**
 * セッション終了レスポンス型
 */
export interface SessionTerminateResponse {
  /** メッセージ */
  message: string;
  /** トークンID */
  tokenId: string;
}
