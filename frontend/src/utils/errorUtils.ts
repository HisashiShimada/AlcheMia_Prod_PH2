/**
 * エラーハンドリングユーティリティ
 * AxiosErrorからエラーコードを抽出し、errorMapper.ts 経由でメッセージを取得する。
 *
 * ⚠️ このファイルでは日本語メッセージを直接定義しない。
 *    メッセージ変換は必ず errorMapper.ts の mapErrorToMessage() を使用する。
 */

import axios, { AxiosError } from 'axios';
import { mapErrorToMessage } from './errorMapper';
import { HTTP_STATUS_TO_ERROR_CODE } from './errorCodes';
import { ApiError } from './authApi';

/**
 * APIエラーレスポンス型定義
 */
interface ApiErrorResponse {
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
  // ApiError（authApi.ts のカスタムエラー）からコードを優先して取得
  if (error instanceof ApiError) {
    return error.code;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

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
 * @returns ユーザーに表示するエラーメッセージ（日本語）
 */
export function extractErrorMessage(error: unknown, defaultMessage?: string): string {
  const code = extractErrorCode(error);
  return mapErrorToMessage(code, defaultMessage);
}
