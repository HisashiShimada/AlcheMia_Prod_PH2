/**
 * ErrorUtils テスト
 * エラーメッセージ抽出ユーティリティのテスト
 */

import { AxiosError } from 'axios';
import { extractErrorMessage } from '../errorUtils';

describe('extractErrorMessage', () => {
  describe('APIエラーレスポンス', () => {
    it('should extract error message from API response', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'ファイル情報が不正です',
            },
          },
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe('ファイル情報が不正です');
    });

    it('should extract detailed validation error message', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'ファイルサイズが上限（100MB）を超えています',
            },
          },
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'ファイルサイズが上限（100MB）を超えています'
      );
    });
  });

  describe('HTTPステータスコード別デフォルトメッセージ', () => {
    it('should return default message for 400 Bad Request', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {},
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe('ファイル情報が不正です');
    });

    it('should return default message for 401 Unauthorized', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'セッションが期限切れです。再ログインしてください'
      );
    });

    it('should return default message for 403 Forbidden', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {},
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'アップロード権限がありません'
      );
    });

    it('should return default message for 404 Not Found', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'プロジェクトが見つかりません'
      );
    });

    it('should return default message for 500 Internal Server Error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'システムエラーが発生しました'
      );
    });

    it('should return generic message for unknown status code', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 418,
          data: {},
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'アップロードに失敗しました'
      );
    });
  });

  describe('ネットワークエラー', () => {
    it('should identify timeout error from message', () => {
      const error = new Error('timeout of 300000ms exceeded');

      expect(extractErrorMessage(error)).toBe(
        'アップロードがタイムアウトしました'
      );
    });

    it('should identify network error from message', () => {
      const error = new Error('Network Error');

      expect(extractErrorMessage(error)).toBe(
        'ネットワークエラーが発生しました'
      );
    });

    it('should return generic message for other Error instances', () => {
      const error = new Error('Some other error');

      expect(extractErrorMessage(error)).toBe(
        'アップロードに失敗しました'
      );
    });
  });

  describe('不明なエラー', () => {
    it('should return generic message for unknown error type', () => {
      const unknownError = { message: 'Unknown error' };

      expect(extractErrorMessage(unknownError)).toBe(
        'アップロードに失敗しました'
      );
    });

    it('should return generic message for null', () => {
      expect(extractErrorMessage(null)).toBe('アップロードに失敗しました');
    });

    it('should return generic message for undefined', () => {
      expect(extractErrorMessage(undefined)).toBe(
        'アップロードに失敗しました'
      );
    });
  });

  describe('エッジケース', () => {
    it('should handle Axios error without response', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Request failed',
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'アップロードに失敗しました'
      );
    });

    it('should handle Axios error with empty response data', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: null,
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'システムエラーが発生しました'
      );
    });

    it('should prioritize API message over status code default', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            error: {
              message: 'カスタムエラーメッセージ',
            },
          },
        },
      } as AxiosError;

      expect(extractErrorMessage(axiosError)).toBe(
        'カスタムエラーメッセージ'
      );
    });
  });
});
