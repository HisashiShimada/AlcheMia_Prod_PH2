/**
 * 統一エラーコード定義
 *
 * E1xxx: CLIENT  - クライアント操作・入力エラー
 * E2xxx: DATA    - データ形式・パースエラー
 * E3xxx: NETWORK - ネットワーク・通信エラー
 * E4xxx: SERVER  - サーバー・システム内部エラー
 * E5xxx: AUTH    - 認証・認可エラー
 * E6xxx: RESOURCE - リソース不存在・競合
 * E7xxx: BUSINESS - 業務ロジックエラー
 * E9xxx: UNKNOWN  - 不明なエラー
 */

// ===== E1xxx: CLIENT =====
export const E1001 = 'E1001'; // ファイルサイズ超過
export const E1002 = 'E1002'; // ファイル形式エラー
export const E1003 = 'E1003'; // バリデーションエラー
export const E1004 = 'E1004'; // 必須項目不足
export const E1005 = 'E1005'; // 入力形式エラー
export const E1006 = 'E1006'; // フォルダ名エラー
export const E1007 = 'E1007'; // サブフォルダ名エラー
export const E1008 = 'E1008'; // コンテンツ形式エラー
export const E1009 = 'E1009'; // フォーマット名未指定

// ===== E2xxx: DATA =====
export const E2001 = 'E2001'; // XMLパース失敗
export const E2002 = 'E2002'; // データ形式エラー
export const E2003 = 'E2003'; // データ読み込みエラー
export const E2004 = 'E2004'; // データ保存エラー

// ===== E3xxx: NETWORK =====
export const E3001 = 'E3001'; // サーバー接続失敗
export const E3002 = 'E3002'; // タイムアウトエラー
export const E3003 = 'E3003'; // ネットワークエラー

// ===== E4xxx: SERVER =====
export const E4001 = 'E4001'; // サーバー内部エラー
export const E4002 = 'E4002'; // データベースエラー
export const E4003 = 'E4003'; // メール送信失敗
export const E4004 = 'E4004'; // JWTトークン生成失敗
export const E4005 = 'E4005'; // Redisエラー
export const E4006 = 'E4006'; // ストレージエラー

// ===== E5xxx: AUTH =====
export const E5001 = 'E5001'; // ログイン認証失敗
export const E5002 = 'E5002'; // トークン無効・期限切れ
export const E5003 = 'E5003'; // PINコード不正
export const E5004 = 'E5004'; // PINコード期限切れ
export const E5005 = 'E5005'; // PINコード試行回数超過
export const E5006 = 'E5006'; // アカウント無効
export const E5007 = 'E5007'; // ログイン試行回数超過
export const E5008 = 'E5008'; // PIN再送信回数超過
export const E5009 = 'E5009'; // リセットトークン不正
export const E5010 = 'E5010'; // リセットトークン期限切れ
export const E5011 = 'E5011'; // リセットトークン使用済み
export const E5012 = 'E5012'; // アクセス拒否
export const E5013 = 'E5013'; // 認証必須
export const E5014 = 'E5014'; // セッション期限切れ
export const E5015 = 'E5015'; // 権限不足

// ===== E6xxx: RESOURCE =====
export const E6001 = 'E6001'; // リソース不存在
export const E6002 = 'E6002'; // ファイル不存在
export const E6003 = 'E6003'; // フォルダ不存在
export const E6004 = 'E6004'; // 親フォルダ不存在
export const E6005 = 'E6005'; // ファイル重複
export const E6006 = 'E6006'; // フォルダ重複

// ===== E7xxx: BUSINESS =====
export const E7001 = 'E7001'; // プロジェクト名重複
export const E7002 = 'E7002'; // プロジェクトチェックアウト中
export const E7003 = 'E7003'; // MAIMLファイル未登録
export const E7004 = 'E7004'; // 既に確認済み
export const E7005 = 'E7005'; // プロジェクト状態不正
export const E7006 = 'E7006'; // プロジェクト指示不存在
export const E7007 = 'E7007'; // タスク作業中
export const E7008 = 'E7008'; // タスク・メソッド不存在
export const E7009 = 'E7009'; // MAIMLファイル存在
export const E7010 = 'E7010'; // タスク未完了
export const E7011 = 'E7011'; // 処理中
export const E7012 = 'E7012'; // 非公開済み
export const E7013 = 'E7013'; // MAIML UUID重複（別プロジェクトに登録済み）

// ===== E9xxx: UNKNOWN =====
export const E9999 = 'E9999'; // 予期しないエラー

/**
 * ErrorCode 型
 */
export type ErrorCode =
  | typeof E1001 | typeof E1002 | typeof E1003 | typeof E1004 | typeof E1005
  | typeof E1006 | typeof E1007 | typeof E1008 | typeof E1009
  | typeof E2001 | typeof E2002 | typeof E2003 | typeof E2004
  | typeof E3001 | typeof E3002 | typeof E3003
  | typeof E4001 | typeof E4002 | typeof E4003 | typeof E4004 | typeof E4005 | typeof E4006
  | typeof E5001 | typeof E5002 | typeof E5003 | typeof E5004 | typeof E5005
  | typeof E5006 | typeof E5007 | typeof E5008 | typeof E5009 | typeof E5010
  | typeof E5011 | typeof E5012 | typeof E5013 | typeof E5014 | typeof E5015
  | typeof E6001 | typeof E6002 | typeof E6003 | typeof E6004 | typeof E6005 | typeof E6006
  | typeof E7001 | typeof E7002 | typeof E7003 | typeof E7004 | typeof E7005
  | typeof E7006 | typeof E7007 | typeof E7008 | typeof E7009 | typeof E7010
  | typeof E7011 | typeof E7012 | typeof E7013
  | typeof E9999;

/**
 * 旧コード → 新コード 変換マップ
 * バックエンドの移行期間中に使用する
 */
export const LEGACY_CODE_MAP: Record<string, ErrorCode> = {
  // CLIENT
  VALIDATION_ERROR: E1003,
  VALIDATION_REQUIRED_FIELD: E1004,
  REQUIRED_FIELD: E1004,
  VALIDATION_INVALID_FORMAT: E1005,
  INVALID_FOLDER_NAME: E1006,
  INVALID_FOLDER_NAME_LENGTH: E1006,
  INVALID_SUBFOLDER_NAME: E1007,
  INVALID_SUBFOLDER_NAME_LENGTH: E1007,
  INVALID_CONTENT: E1008,
  FORMAT_NAME_REQUIRED: E1009,

  // SERVER
  SYSTEM_ERROR: E4001,
  SYSTEM_INTERNAL_ERROR: E4001,
  SYSTEM_DATABASE_ERROR: E4002,
  SYSTEM_EMAIL_SEND_FAILED: E4003,
  SYSTEM_JWT_GENERATION_FAILED: E4004,
  SYSTEM_REDIS_ERROR: E4005,
  STORAGE_ERROR: E4006,

  // AUTH
  AUTH_INVALID_CREDENTIALS: E5001,
  AUTH_TOKEN_EXPIRED: E5002,
  AUTH_TOKEN_INVALID: E5002,
  AUTH_PIN_INVALID: E5003,
  AUTH_PIN_EXPIRED: E5004,
  AUTH_PIN_MAX_ATTEMPTS: E5005,
  AUTH_ACCOUNT_DISABLED: E5006,
  AUTH_RATE_LIMIT_EXCEEDED: E5007,
  AUTH_RESEND_LIMIT_EXCEEDED: E5008,
  AUTH_RESET_TOKEN_INVALID: E5009,
  AUTH_RESET_TOKEN_EXPIRED: E5010,
  AUTH_RESET_TOKEN_USED: E5011,
  AUTH_FORBIDDEN: E5012,
  ACCESS_DENIED: E5012,
  AUTH_UNAUTHORIZED: E5013,
  AUTH_REQUIRED: E5013,
  AUTH_SESSION_EXPIRED: E5014,
  PERMISSION_INSUFFICIENT: E5015,

  // RESOURCE
  RESOURCE_NOT_FOUND: E6001,
  FILE_NOT_FOUND: E6002,
  FOLDER_NOT_FOUND: E6003,
  PARENT_FOLDER_NOT_FOUND: E6004,
  FILE_ALREADY_EXISTS: E6005,
  FOLDER_ALREADY_EXISTS: E6006,

  // BUSINESS
  BUSINESS_DUPLICATE_PROJECT_NAME: E7001,
  BUSINESS_PROJECT_CHECKED_OUT: E7002,
  PROJECT_ALREADY_CHECKED_OUT: E7002,
  BUSINESS_MAIML_NOT_REGISTERED: E7003,
  BUSINESS_ALREADY_ACKNOWLEDGED: E7004,
  PROJECT_STATUS_INVALID: E7005,
  PROJECT_INSTRUCTION_NOT_FOUND: E7006,
  TASK_IN_PROGRESS: E7007,
  TASK_NOT_FOUND: E7008,
  METHOD_NOT_FOUND: E7008,
  BUSINESS_MAIML_FILE_EXISTS: E7009,
  TASKS_NOT_COMPLETED: E7010,
  ALREADY_IN_PROGRESS: E7011,
  NOT_PUBLISHED: E7012,
  PROJECT_NOT_FOUND: E6001,
  PROJECT_NOT_CHECKED_OUT: E7002,
  MAIML_NOT_FOUND: E6002,
};

/**
 * エラーコード付きアプリケーションエラー
 *
 * Service 層で throw し、Controller 層が error.code プロパティで分岐する。
 * 日本語メッセージ文字列によるエラー判定を排除するために使用する。
 *
 * @example
 * // Service 層
 * throw new AppError(E1006, 'Folder name must contain only alphanumeric and underscore characters.');
 *
 * // Controller 層
 * if (error instanceof AppError) {
 *   return res.status(400).json({ error: { code: error.code } });
 * }
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    // Prototype chain を正しく繋ぐ（TypeScript でのサブクラス化に必要）
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
