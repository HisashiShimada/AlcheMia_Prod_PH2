/**
 * エラーハンドリングユーティリティ
 * AxiosErrorから適切なエラーメッセージを抽出
 */

import axios, { AxiosError } from 'axios';

/**
 * APIエラーレスポンス型定義
 */
interface ApiErrorResponse {
  error?: {
    message?: string;
    code?: string;
  };
}

/**
 * エラーオブジェクトからユーザーフレンドリーなエラーメッセージを抽出
 * 
 * @param error - エラーオブジェクト（AxiosError, Error, unknown）
 * @returns ユーザーに表示するエラーメッセージ（日本語）
 */
export function extractErrorMessage(error: unknown): string {
  // AxiosErrorの場合
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    // APIエラーレスポンスからメッセージを抽出
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message;
    }
    
    // HTTPステータスコード別デフォルトメッセージ
    switch (axiosError.response?.status) {
      case 400:
        return 'ファイル情報が不正です';
      case 401:
        return 'セッションが期限切れです。再ログインしてください';
      case 403:
        return 'アップロード権限がありません';
      case 404:
        return 'プロジェクトが見つかりません';
      case 500:
        return 'システムエラーが発生しました';
      default:
        return 'アップロードに失敗しました';
    }
  }
  
  // 通常のErrorオブジェクトの場合
  if (error instanceof Error) {
    // タイムアウトエラー
    if (error.message.includes('timeout')) {
      return 'アップロードがタイムアウトしました';
    }
    
    // ネットワークエラー
    if (error.message.includes('Network Error')) {
      return 'ネットワークエラーが発生しました';
    }
    
    // その他のエラー
    return 'アップロードに失敗しました';
  }
  
  // 不明なエラー型の場合
  return 'アップロードに失敗しました';
}
