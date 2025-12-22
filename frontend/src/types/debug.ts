/**
 * デバッグ用の型定義
 * 開発環境専用のデバッグ機能で使用される型
 * 本番環境では使用されません
 */

/**
 * デバッグ用ユーザー情報
 * 開発環境でのテストログインに使用
 */
export interface DebugUser {
  username: string;
  password: string;
  displayName: string;
  role: string;
}

/**
 * デバッグログインパネルのProps
 */
export interface DebugLoginPanelProps {
  /** ログイン処理関数 */
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
  /** ローディング状態 */
  loading?: boolean;
  /** デバッグユーザーリスト */
  debugUsers: DebugUser[];
}
