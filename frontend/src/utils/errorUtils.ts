/**
 * エラーハンドリングユーティリティ（統合版）
 *
 * 以下のモジュールを統合:
 * - errorCodes.ts    : エラーコード定数・型・HTTPステータスマップ
 * - errorHandler.ts  : AppError生成・ログ出力・正規化
 * - errorMapper.ts   : エラーコード → メッセージ変換
 * - errorUtils.ts    : AxiosError からエラーコード・メッセージ抽出
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

import axios, { AxiosError } from 'axios';
import { getTranslation } from '../contexts/LanguageContext';
import { AuthServiceError } from '@/types/error';
import type { AppError } from '@/types/error';

// =============================================================================
// エラーコード定数（旧 errorCodes.ts）
// =============================================================================

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
export const E7013 = 'E7013'; // 別MAIMLへの上書き禁止（同一MAIMLベースの変更のみ許可）
export const E7014 = 'E7014'; // トランジション未登録
export const E7015 = 'E7015'; // 実験計画未登録

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
  | typeof E7011 | typeof E7012 | typeof E7013 | typeof E7014 | typeof E7015
  | typeof E9999
  | string; // 未知のコードも受け入れる

/**
 * エラーカテゴリ定義
 */
export const ERROR_CATEGORIES = {
  CLIENT:   'CLIENT',
  DATA:     'DATA',
  NETWORK:  'NETWORK',
  SERVER:   'SERVER',
  AUTH:     'AUTH',
  RESOURCE: 'RESOURCE',
  BUSINESS: 'BUSINESS',
  UNKNOWN:  'UNKNOWN',
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

// =============================================================================
// エラーメッセージマッピング（旧 errorMapper.ts）
// =============================================================================

/**
 * エラーコードから翻訳キーへのマッピング
 */
export const ERROR_CODE_TO_KEY: Record<string, string> = {
  // ===== E1xxx: CLIENT =====
  E1001: 'errors.E1001',
  E1002: 'errors.E1002',
  E1003: 'errors.E1003',
  E1004: 'errors.E1004',
  E1005: 'errors.E1005',
  E1006: 'errors.E1006',
  E1007: 'errors.E1007',
  E1008: 'errors.E1008',
  E1009: 'errors.E1009',

  // ===== E2xxx: DATA =====
  E2001: 'errors.E2001',
  E2002: 'errors.E2002',
  E2003: 'errors.E2003',
  E2004: 'errors.E2004',

  // ===== E3xxx: NETWORK =====
  E3001: 'errors.E3001',
  E3002: 'errors.E3002',
  E3003: 'errors.E3003',

  // ===== E4xxx: SERVER =====
  E4001: 'errors.E4001',
  E4002: 'errors.E4002',
  E4003: 'errors.E4003',
  E4004: 'errors.E4004',
  E4005: 'errors.E4005',
  E4006: 'errors.E4006',

  // ===== E5xxx: AUTH =====
  E5001: 'errors.E5001',
  E5002: 'errors.E5002',
  E5003: 'errors.E5003',
  E5004: 'errors.E5004',
  E5005: 'errors.E5005',
  E5006: 'errors.E5006',
  E5007: 'errors.E5007',
  E5008: 'errors.E5008',
  E5009: 'errors.E5009',
  E5010: 'errors.E5010',
  E5011: 'errors.E5011',
  E5012: 'errors.E5012',
  E5013: 'errors.E5013',
  E5014: 'errors.E5014',
  E5015: 'errors.E5015',

  // ===== E6xxx: RESOURCE =====
  E6001: 'errors.E6001',
  E6002: 'errors.E6002',
  E6003: 'errors.E6003',
  E6004: 'errors.E6004',
  E6005: 'errors.E6005',
  E6006: 'errors.E6006',

  // ===== E7xxx: BUSINESS =====
  E7001: 'errors.E7001',
  E7002: 'errors.E7002',
  E7003: 'errors.E7003',
  E7004: 'errors.E7004',
  E7005: 'errors.E7005',
  E7006: 'errors.E7006',
  E7007: 'errors.E7007',
  E7008: 'errors.E7008',
  E7009: 'errors.E7009',
  E7010: 'errors.E7010',
  E7011: 'errors.E7011',
  E7012: 'errors.E7012',
  E7013: 'errors.E7013',
  E7014: 'errors.E7014',
  E7015: 'errors.E7015',

  // ===== E9xxx: UNKNOWN =====
  E9999: 'errors.E9999',

  // ===== レガシーコード対応（バックエンドが旧コードを返す場合のフォールバック） =====
  AUTH_PIN_INVALID:        'errors.AUTH_PIN_INVALID',

  // ===== 認証サービス内部エラーコード =====
  PIN_VERIFY_FAILED:       'errors.PIN_VERIFY_FAILED',
  PIN_RESEND_FAILED:       'errors.PIN_RESEND_FAILED',
  AUTH_TOKEN_INVALID:      'errors.AUTH_TOKEN_INVALID',
  LOGOUT_FAILED:           'errors.LOGOUT_FAILED',
  RESET_REQUEST_FAILED:    'errors.RESET_REQUEST_FAILED',
  RESET_FAILED:            'errors.RESET_FAILED',
  CHANGE_PASSWORD_FAILED:  'errors.CHANGE_PASSWORD_FAILED',
  AUTH_SAME_PASSWORD:      'errors.AUTH_SAME_PASSWORD',

  // ===== プロジェクト操作系（チェックアウト・チェックイン・削除） =====
  CHECKOUT_NO_MAIML_FILE:       'errors.CHECKOUT_NO_MAIML_FILE',
  CHECKOUT_INVALID_STATUS:      'errors.CHECKOUT_INVALID_STATUS',
  CHECKOUT_NO_TASKS:            'errors.CHECKOUT_NO_TASKS',
  CHECKOUT_UNSENT_INSTRUCTIONS: 'errors.CHECKOUT_UNSENT_INSTRUCTIONS',
  CHECKOUT_NO_TRANSITIONS:      'errors.CHECKOUT_NO_TRANSITIONS',
  CHECKOUT_NO_EXPERIMENT_PLAN:  'errors.CHECKOUT_NO_EXPERIMENT_PLAN',
  TASK_NOT_COMPLETED:           'errors.TASK_NOT_COMPLETED',
  BUSINESS_MAIML_FILE_EXISTS:   'errors.BUSINESS_MAIML_FILE_EXISTS',
  PROJECT_ALREADY_CHECKED_OUT:  'errors.PROJECT_ALREADY_CHECKED_OUT',

  // ===== 会社管理・ユーザー管理・ロール管理 重複エラー =====
  DUPLICATE_CORPORATION_NAME:   'errors.DUPLICATE_CORPORATION_NAME',
  USER_ALREADY_EXISTS:          'errors.USER_ALREADY_EXISTS',
  DUPLICATE_ROLE_CD:            'errors.DUPLICATE_ROLE_CD',
} as const;

/**
 * @deprecated ERROR_CODE_TO_KEY を使用してください。
 * 後方互換性のために残しています。
 */
export const ERROR_MESSAGE_MAP: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    const key = ERROR_CODE_TO_KEY[prop];
    if (key) return getTranslation(key);
    return getTranslation('errors.default');
  },
  has(_target, prop: string) {
    return prop in ERROR_CODE_TO_KEY;
  },
});

/**
 * エラーコードをユーザーフレンドリーなメッセージにマッピングする
 * 現在の言語設定（ja / en）に応じた翻訳を返します。
 *
 * @param errorCode - APIから返されたエラーコード（例: 'E5001'）
 * @param defaultMessage - マッピングが見つからない場合のデフォルトメッセージ（省略時: errors.default の翻訳）
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
export function mapErrorToMessage(errorCode: string, defaultMessage?: string): string {
  if (!errorCode) {
    return defaultMessage ?? getTranslation('errors.default');
  }
  if (errorCode in ERROR_CODE_TO_KEY) {
    return getTranslation(ERROR_CODE_TO_KEY[errorCode]);
  }
  return defaultMessage ?? getTranslation('errors.default');
}

// =============================================================================
// AppError 生成・ログ（旧 errorHandler.ts）
// =============================================================================

/**
 * エラーコードからエラー情報オブジェクトを生成する
 */
export function createError(
  errorCode: string,
  options: {
    detail?: string;
    originalError?: Error;
  } = {}
): AppError {
  return {
    code: errorCode,
    message: mapErrorToMessage(errorCode),
    detail: options.detail ?? '',
    timestamp: new Date().toISOString(),
    originalError: options.originalError ?? null,
  };
}

/**
 * HTTPステータスコードからエラーコードを判定する
 */
export function getErrorCodeFromStatus(
  statusCode: number,
  errorMessage: string = ''
): string {
  if (statusCode === 401) return 'E5001';
  if (statusCode === 403) return 'E5012';
  if (statusCode >= 400 && statusCode < 500) {
    if (errorMessage.toLowerCase().includes('validation')) return 'E1003';
    if (errorMessage.toLowerCase().includes('required'))   return 'E1004';
    return 'E1003';
  }
  if (statusCode >= 500) {
    if (errorMessage.toLowerCase().includes('database') ||
        errorMessage.toLowerCase().includes('db'))         return 'E4002';
    return 'E4001';
  }
  return 'E9999';
}

/**
 * ファイルアップロードエラーを処理する
 */
export function handleFileUploadError(file: File | null, error: Error): AppError {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file && file.size > MAX_FILE_SIZE) {
    return createError('E1001', {
      detail: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB (limit: 50MB)`,
      originalError: error,
    });
  }
  const ext = file?.name.split('.').pop()?.toLowerCase();
  if (file && ext && !['maiml', 'xml', 'json', 'csv'].includes(ext)) {
    return createError('E1002', {
      detail: `File extension: .${ext}`,
      originalError: error,
    });
  }
  return createError('E1001', { originalError: error });
}

/**
 * XMLパースエラーを処理する
 */
export function handleXMLParseError(error: Error): AppError {
  let detail = 'XML形式が不正です';
  const lineMatch = error.message.match(/line (\d+)/i);
  if (lineMatch) {
    detail = `XML形式が不正です（行 ${lineMatch[1]}）`;
  }
  return createError('E2001', { detail, originalError: error });
}

/**
 * エラー情報をコンソールに出力する
 */
export function logError(errorInfo: AppError): void {
  console.error(`[${errorInfo.code}] ${errorInfo.message}`, {
    detail: errorInfo.detail,
    timestamp: errorInfo.timestamp,
    originalError: errorInfo.originalError,
  });
}

/**
 * 任意のエラーオブジェクトを AppError に統一する
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof Error) {
    return createError('E9999', { detail: error.message, originalError: error });
  }
  if (typeof error === 'string') {
    return createError('E9999', { detail: error });
  }
  return createError('E9999');
}

// =============================================================================
// AxiosError からのコード・メッセージ抽出（旧 errorUtils.ts）
// =============================================================================

/**
 * AxiosError のレスポンスボディ型（内部用）
 * types/api.ts の ApiErrorResponse とは構造が異なるため専用型として定義
 */
interface AxiosApiErrorBody {
  success?: boolean;
  error?: {
    message?: string;
    code?: string;
  };
}

/**
 * エラーオブジェクトからエラーコードを抽出する
 *
 * @param error - エラーオブジェクト（AxiosError, Error, unknown）
 * @returns エラーコード（例: 'E5001'）
 */
export function extractErrorCode(error: unknown): string {
  // AuthServiceError（authService.ts のカスタムエラー）からコードを優先して取得
  if (error instanceof AuthServiceError) {
    return error.code;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<AxiosApiErrorBody>;

    // タイムアウト
    if (axiosError.code === 'ECONNABORTED') return 'E3002';

    // ネットワークエラー（レスポンスなし）
    if (!axiosError.response) return 'E3001';

    // APIエラーレスポンスにコードがある場合はそれを優先
    const code = axiosError.response.data?.error?.code;
    if (code) return code;

    // HTTPステータスからコードを推定（フォールバック）
    const status = axiosError.response.status;
    return HTTP_STATUS_TO_ERROR_CODE[status] ?? 'E9999';
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) return 'E3002';
    if (error.message.includes('Network Error')) return 'E3003';
  }

  return 'E9999';
}

/**
 * エラーオブジェクトからユーザーフレンドリーなエラーメッセージを抽出
 *
 * @param error - エラーオブジェクト（AxiosError, Error, unknown）
 * @param defaultMessage - マッピングが見つからない場合のデフォルトメッセージ
 * @returns ユーザーに表示するエラーメッセージ
 */
export function extractErrorMessage(error: unknown, defaultMessage?: string): string {
  const code = extractErrorCode(error);
  return mapErrorToMessage(code, defaultMessage);
}
