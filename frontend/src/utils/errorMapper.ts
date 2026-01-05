/**
 * エラーコードをユーザーフレンドリーなメッセージにマッピングするユーティリティ
 */

/**
 * エラーコードとメッセージのマッピング
 */
export const ERROR_MESSAGE_MAP: Record<string, string> = {
  // 認証エラー
  AUTH_INVALID_CREDENTIALS: 'ユーザー名またはパスワードが正しくありません',
  AUTH_TOKEN_EXPIRED: 'セッションの有効期限が切れました。再度ログインしてください',
  AUTH_TOKEN_INVALID: 'セッショントークンが無効です',
  AUTH_PIN_INVALID: 'PINコードが正しくありません',
  AUTH_PIN_EXPIRED: 'PINコードの有効期限が切れました。再送信してください',
  AUTH_PIN_MAX_ATTEMPTS: 'PINコード入力試行回数の上限に達しました。最初からやり直してください',
  AUTH_ACCOUNT_DISABLED: 'アカウントが無効化されています。管理者にお問い合わせください',
  AUTH_RATE_LIMIT_EXCEEDED: 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください',
  AUTH_RESEND_LIMIT_EXCEEDED: 'PINコード再送信回数が上限に達しました。しばらくしてから再度お試しください',

  // バリデーションエラー
  VALIDATION_ERROR: '入力内容に誤りがあります',
  REQUIRED_FIELD: '必須項目です',

  // システムエラー
  SYSTEM_EMAIL_SEND_FAILED: 'メール送信に失敗しました。しばらくしてから再度お試しください',
  SYSTEM_DATABASE_ERROR: 'システムエラーが発生しました。管理者にお問い合わせください',
} as const;

/**
 * デフォルトエラーメッセージ
 */
const DEFAULT_ERROR_MESSAGE = 'エラーが発生しました。しばらくしてから再度お試しください';

/**
 * エラーコードをユーザーフレンドリーなメッセージにマッピングする
 * 
 * @param errorCode - APIから返されたエラーコード
 * @param defaultMessage - マッピングが見つからない場合のデフォルトメッセージ
 * @returns ユーザーフレンドリーなエラーメッセージ
 * 
 * @example
 * ```typescript
 * const message = mapErrorToMessage('AUTH_INVALID_CREDENTIALS');
 * // => 'ユーザー名またはパスワードが正しくありません'
 * 
 * const message = mapErrorToMessage('UNKNOWN_ERROR', 'カスタムメッセージ');
 * // => 'カスタムメッセージ'
 * ```
 */
export function mapErrorToMessage(
  errorCode: string,
  defaultMessage: string = DEFAULT_ERROR_MESSAGE
): string {
  // 空文字列、null、undefinedの場合はデフォルトメッセージを返す
  if (!errorCode) {
    return defaultMessage;
  }

  // マッピングに存在する場合はそのメッセージを返す
  if (errorCode in ERROR_MESSAGE_MAP) {
    return ERROR_MESSAGE_MAP[errorCode];
  }

  // マッピングに存在しない場合はデフォルトメッセージを返す
  return defaultMessage;
}
