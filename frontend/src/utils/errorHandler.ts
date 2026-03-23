/**
 * エラーユーティリティ関数
 *
 * AppError オブジェクトの生成・ログ出力・正規化を担当する。
 * メッセージ変換は errorMapper.ts の mapErrorToMessage() を使用する。
 */

import { mapErrorToMessage } from './errorMapper';

/**
 * アプリケーション内部で使用するエラー情報オブジェクト
 */
export interface AppError {
  /** エラーコード（例: 'E5001'） */
  code: string;
  /** ユーザー向け表示メッセージ */
  message: string;
  /** 詳細説明 */
  detail: string;
  /** 発生日時（ISO 8601） */
  timestamp: string;
  /** 元の Error オブジェクト */
  originalError: Error | null;
}

/**
 * エラーコードからエラー情報オブジェクトを生成する
 *
 * @param errorCode - エラーコード（例: 'E5001'）
 * @param options - 上書きオプション
 * @returns AppError オブジェクト
 *
 * @example
 * ```typescript
 * const err = createError('E5001');
 * // => { code: 'E5001', message: 'ユーザー名またはパスワードが正しくありません', ... }
 *
 * const err = createError('E1001', { detail: 'サイズ: 100MB（上限: 50MB）' });
 * ```
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
 *
 * @param statusCode - HTTP ステータスコード
 * @param errorMessage - エラーメッセージ（キーワードで詳細判定に使用）
 * @returns エラーコード（例: 'E5001'）
 *
 * @example
 * ```typescript
 * getErrorCodeFromStatus(401);        // => 'E5001'
 * getErrorCodeFromStatus(403);        // => 'E5012'
 * getErrorCodeFromStatus(500, 'db');  // => 'E4002'
 * ```
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
 *
 * @param file - アップロード対象ファイル（null の場合は汎用エラー）
 * @param error - 発生した Error オブジェクト
 * @returns AppError オブジェクト
 *
 * @example
 * ```typescript
 * const appErr = handleFileUploadError(file, error);
 * logError(appErr);
 * ```
 */
export function handleFileUploadError(file: File | null, error: Error): AppError {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file && file.size > MAX_FILE_SIZE) {
    return createError('E1001', {
      detail: `ファイルサイズ: ${(file.size / 1024 / 1024).toFixed(2)}MB（上限: 50MB）`,
      originalError: error,
    });
  }
  const ext = file?.name.split('.').pop()?.toLowerCase();
  if (file && ext && !['maiml', 'xml', 'json', 'csv'].includes(ext)) {
    return createError('E1002', {
      detail: `ファイル形式: .${ext}`,
      originalError: error,
    });
  }
  return createError('E1001', { originalError: error });
}

/**
 * XMLパースエラーを処理する
 *
 * @param error - 発生した Error オブジェクト
 * @returns AppError オブジェクト
 *
 * @example
 * ```typescript
 * const appErr = handleXMLParseError(error);
 * logError(appErr);
 * ```
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
 * エラー情報をコンソールに出力する（[Exxx] 形式でコードを先頭に表示）
 *
 * @param errorInfo - AppError オブジェクト
 *
 * @example
 * ```typescript
 * const err = createError('E5001', { originalError: axiosError });
 * logError(err);
 * // => console.error('[E5001] ユーザー名またはパスワードが正しくありません', { ... })
 * ```
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
 *
 * @param error - 任意のエラー値
 * @returns AppError オブジェクト
 *
 * @example
 * ```typescript
 * try { ... } catch (e) {
 *   const appErr = normalizeError(e);
 *   logError(appErr);
 * }
 * ```
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
