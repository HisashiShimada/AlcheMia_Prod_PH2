/**
 * ストレージリトライユーティリティ（バックエンド共通）
 *
 * S3/Swift へのストレージ書き込み失敗時に指数バックオフで自動リトライする
 * 共通ロジックを提供する。
 *
 * 使用箇所:
 *   - backend/src/services/fileAccessService.ts
 *   - backend/src/services/chunkUploadService.ts
 */

/**
 * エラーがリトライ対象かどうかを判定する（バックエンド用）
 *
 * ストレージ（S3/Swift）の一時的な書き込み失敗をリトライ対象とする。
 * ネットワーク系エラーコード（ECONNRESET, ETIMEDOUT, ECONNREFUSED, EPIPE）も対象。
 */
export const isRetryableStorageError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'];
    const code = (error as NodeJS.ErrnoException).code;
    if (code && retryableCodes.includes(code)) return true;
    // HTTP ステータス 5xx のエラーもリトライ
    const statusMatch = error.message.match(/(?:status|statusCode)[:\s]+(\d{3})/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      if (status >= 500) return true;
    }
  }
  return true; // ストレージエラーは基本的にリトライする
};

/**
 * 指数バックオフ付きリトライ実行（バックエンド用）
 *
 * @param fn          実行する非同期処理
 * @param maxRetries  最大リトライ回数（デフォルト: 3）
 * @param baseDelayMs 初回待機時間 ms（デフォルト: 1000）
 * @param label       ログ出力用ラベル
 */
export const withStorageRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
  label = 'storage'
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableStorageError(error)) throw error;
      if (attempt === maxRetries) throw error;

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      console.warn(`🔄 [${label}] リトライ ${attempt + 1}/${maxRetries} (${delayMs}ms 後):`, error);
      await new Promise<void>(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
};
