/**
 * 統一エラーコード定義（フロントエンド）
 *
 * E1xxx: CLIENT   - クライアント操作・入力エラー
 * E2xxx: DATA     - データ形式・パースエラー
 * E3xxx: NETWORK  - ネットワーク・通信エラー
 * E4xxx: SERVER   - サーバー・システム内部エラー
 * E5xxx: AUTH     - 認証・認可エラー
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
  | typeof E7006 | typeof E7007 | typeof E7008
  | typeof E9999
  | string; // 未知のコードも受け入れる

/**
 * エラーカテゴリ定義
 */
export const ERROR_CATEGORIES = {
  CLIENT: 'CLIENT',
  DATA: 'DATA',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER',
  AUTH: 'AUTH',
  RESOURCE: 'RESOURCE',
  BUSINESS: 'BUSINESS',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

/**
 * エラーコードからカテゴリを取得
 */
export function getErrorCategory(code: string): ErrorCategory {
  const prefix = code.substring(0, 2); // 'E1', 'E2', ...
  const num = parseInt(code.substring(1, 2)); // 1, 2, ...
  if (prefix !== 'E' || isNaN(num)) return ERROR_CATEGORIES.UNKNOWN;
  switch (num) {
    case 1: return ERROR_CATEGORIES.CLIENT;
    case 2: return ERROR_CATEGORIES.DATA;
    case 3: return ERROR_CATEGORIES.NETWORK;
    case 4: return ERROR_CATEGORIES.SERVER;
    case 5: return ERROR_CATEGORIES.AUTH;
    case 6: return ERROR_CATEGORIES.RESOURCE;
    case 7: return ERROR_CATEGORIES.BUSINESS;
    default: return ERROR_CATEGORIES.UNKNOWN;
  }
}

/**
 * HTTPステータスコード → エラーコード 変換マップ
 * バックエンドからエラーコードが返らない場合のフォールバック
 */
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: E1003, // Bad Request → バリデーションエラー
  401: E5013, // Unauthorized → 認証必須
  403: E5012, // Forbidden → アクセス拒否
  404: E6001, // Not Found → リソース不存在
  409: E6005, // Conflict → 重複
  429: E5007, // Too Many Requests → レート制限
  500: E4001, // Internal Server Error → サーバー内部エラー
  502: E3001, // Bad Gateway → サーバー接続失敗
  503: E3001, // Service Unavailable → サーバー接続失敗
  504: E3002, // Gateway Timeout → タイムアウト
};
