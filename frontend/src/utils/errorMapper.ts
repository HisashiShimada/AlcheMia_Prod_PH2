/**
 * エラーコードをユーザーフレンドリーなメッセージにマッピングするユーティリティ
 *
 * ⚠️ このファイルがエラーコード → 翻訳メッセージの唯一の変換場所です。
 *    authService.ts や errorUtils.ts では翻訳を行わず、必ずここを経由してください。
 *
 * 各エラーコードは locales/ja.json・locales/en.json の errors.* セクションに
 * 翻訳文言が定義されており、現在の言語設定に応じた文言を返します。
 */

import { getTranslation } from '../contexts/LanguageContext';

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

  // ===== E9xxx: UNKNOWN =====
  E9999: 'errors.E9999',

  // ===== レガシーコード対応（バックエンドが旧コードを返す場合のフォールバック） =====
  AUTH_PIN_INVALID: 'errors.AUTH_PIN_INVALID',

  // ===== プロジェクト操作系（チェックアウト・チェックイン・削除） =====
  CHECKOUT_NO_MAIML_FILE: 'errors.CHECKOUT_NO_MAIML_FILE',
  CHECKOUT_INVALID_STATUS: 'errors.CHECKOUT_INVALID_STATUS',
  CHECKOUT_NO_TASKS: 'errors.CHECKOUT_NO_TASKS',
  CHECKOUT_UNSENT_INSTRUCTIONS: 'errors.CHECKOUT_UNSENT_INSTRUCTIONS',
  TASK_NOT_COMPLETED: 'errors.TASK_NOT_COMPLETED',
  BUSINESS_MAIML_FILE_EXISTS: 'errors.BUSINESS_MAIML_FILE_EXISTS',
  PROJECT_ALREADY_CHECKED_OUT: 'errors.PROJECT_ALREADY_CHECKED_OUT',
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
 *
 * @example
 * ```typescript
 * const message = mapErrorToMessage('E5001');
 * // ja => 'ユーザー名またはパスワードが正しくありません'
 * // en => 'Invalid username or password'
 *
 * const message = mapErrorToMessage('E9999', 'カスタムメッセージ');
 * // => 'カスタムメッセージ'
 * ```
 */
export function mapErrorToMessage(errorCode: string, defaultMessage?: string): string {
  // 空文字列、null、undefinedの場合はデフォルトメッセージを返す
  if (!errorCode) {
    return defaultMessage ?? getTranslation('errors.default');
  }

  // マッピングに存在する場合は翻訳済みメッセージを返す
  if (errorCode in ERROR_CODE_TO_KEY) {
    return getTranslation(ERROR_CODE_TO_KEY[errorCode]);
  }

  // マッピングに存在しない場合はデフォルトメッセージを返す
  return defaultMessage ?? getTranslation('errors.default');
}
