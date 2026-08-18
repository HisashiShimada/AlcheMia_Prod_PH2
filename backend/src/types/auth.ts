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
 * JWT権限情報
 * permission: 0=書込専用, 1=読取権限
 */
export interface Permission {
  functionId: string;
  permission: number;
}

/**
 * ユーザー情報
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roleName: string;
  roleCd: string;
  organizationId: string;
  organizationName: string;
  displayName: string;
  /** 所属組織階層グループCD一覧（多対多） */
  organizationGroupCds: string[];
  corporationId?: string;
  initialScreenFunctionCd: string;
}

/**
 * JWT ペイロード
 */
export interface JwtPayload {
  userId: string;
  organizationId: string;
  corporationId?: string;
  sessionId: string;  // 後方互換性のため残す（tokenIdと同じ値）
  tokenId: string;     // アクセストークンとリフレッシュトークンで共通のID
  permissions: Permission[];
  /** 所属組織階層グループCD一覧（多対多） */
  organizationGroupCds?: string[];
  iat: number;
  exp: number;
}

/**
 * リフレッシュトークンペイロード
 */
export interface RefreshTokenPayload {
  userId: string;
  organizationId: string;
  sessionId: string;
  tokenId: string;       // リフレッシュトークン固有ID
  iat: number;
  exp: number;
}

/**
 * トークンペア
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Redis保存用リフレッシュトークンデータ
 */
export interface StoredRefreshToken {
  userId: string;
  organizationId: string;
  sessionId: string;
  tokenId: string;
  issuedAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  userName?: string;
  email?: string;
}

/**
 * セッション情報（レスポンス用）
 */
export interface SessionInfo {
  tokenId: string;
  userId: string;
  userName: string;
  email: string;
  sessionDuration: string;        // "1日2時間30分" 形式
  durationMinutes: number;        // 分単位の継続時間
  loginTime: string;              // ISO 8601形式
  lastActivity: string;           // ISO 8601形式（現在はログイン時刻と同じ）
  ipAddress: string;
  userAgent: string;
  isCurrentUser: boolean;
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
