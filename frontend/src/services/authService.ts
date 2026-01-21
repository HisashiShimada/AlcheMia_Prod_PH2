/**
 * 認証APIサービス
 * バックエンドの認証APIとの通信を担当
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { LoginCredentials } from '@/types/auth';
import type {
  ApiResponse,
  LoginResponseData,
  VerifyPinResponseData,
  ResendPinResponseData,
  LogoutResponseData,
  ResetPasswordRequestResponseData,
  ResetPasswordResponseData,
} from '@/types/api';

/**
 * Axiosインスタンスの作成
 */
const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  
  const client = axios.create({
    baseURL: `${baseURL}`,
    timeout: 10000, // 10秒
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // HTTPOnly Cookie送信のため
  });

  // クライアント証明書認証使用時:
  // X-Organization-IdはNginxが自動設定するため、
  // フロントエンドからの送信は不要
  
  // 開発環境でNginxを使用しない場合は、以下のコメントを外す
  // client.interceptors.request.use(
  //   (config) => {
  //     const organizationId = '{c9621ed6-5def-4970-8e7f-fbe97c98e3ed}';
  //     if (organizationId) {
  //       config.headers['X-Organization-Id'] = organizationId;
  //     }
  //     return config;
  //   },
  //   (error) => {
  //     return Promise.reject(error);
  //   }
  // );

  return client;
};

const apiClient = createApiClient();

/**
 * APIエラーハンドリング
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details?: Array<{
      field: string;
      message: string;
      code: string;
    }>
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

/**
 * エラーメッセージを日本語化
 */
const translateErrorMessage = (code: string, defaultMessage: string): string => {
  const errorMessages: Record<string, string> = {
    // バリデーションエラー
    VALIDATION_ERROR: '入力内容に誤りがあります',
    
    // 認証エラー
    AUTH_INVALID_CREDENTIALS: 'ユーザー名またはパスワードが正しくありません',
    AUTH_ACCOUNT_DISABLED: 'アカウントが無効化されています。管理者にお問い合わせください',
    AUTH_TOKEN_INVALID: 'セッションが無効です。再度ログインしてください',
    AUTH_TOKEN_EXPIRED: 'セッションの有効期限が切れました。再度ログインしてください',
    AUTH_UNAUTHORIZED: '認証が必要です',
    AUTH_FORBIDDEN: 'アクセスが拒否されました',
    
    // PINコードエラー
    AUTH_PIN_INVALID: 'PINコードが正しくありません',
    AUTH_PIN_EXPIRED: 'PINコードの有効期限が切れています',
    AUTH_PIN_MAX_ATTEMPTS: 'PINコードの入力試行回数が上限を超えました',
    
    // リソースエラー
    RESOURCE_NOT_FOUND: 'リソースが見つかりません',
    
    // システムエラー
    SYSTEM_ERROR: 'システムエラーが発生しました',
    SYSTEM_DATABASE_ERROR: 'データベースエラーが発生しました',
    SYSTEM_EMAIL_SEND_FAILED: 'メール送信に失敗しました。しばらく待ってから再試行してください',
    SYSTEM_JWT_GENERATION_FAILED: 'セッション生成に失敗しました',
    
    // ネットワークエラー
    NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください',
    TIMEOUT_ERROR: 'リクエストがタイムアウトしました。再度お試しください',
    SERVER_UNAVAILABLE: 'サーバーに接続できません。しばらく待ってから再試行してください',
  };

  return errorMessages[code] || defaultMessage;
};

/**
 * Axiosエラーをハンドリング
 */
const handleApiError = (error: unknown): AuthServiceError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<never>>;
    
    // タイムアウトエラー
    if (axiosError.code === 'ECONNABORTED') {
      return new AuthServiceError(
        translateErrorMessage('TIMEOUT_ERROR', 'リクエストがタイムアウトしました'),
        'TIMEOUT_ERROR'
      );
    }
    
    // ネットワークエラー
    if (!axiosError.response) {
      return new AuthServiceError(
        translateErrorMessage('SERVER_UNAVAILABLE', 'サーバーに接続できません'),
        'SERVER_UNAVAILABLE'
      );
    }
    
    // APIエラーレスポンス
    const response = axiosError.response.data;
    if (response && !response.success && response.error) {
      const errorCode = response.error.code || 'UNKNOWN_ERROR';
      const errorMessage = translateErrorMessage(
        errorCode,
        response.error.message || 'エラーが発生しました'
      );
      return new AuthServiceError(errorMessage, errorCode, response.error.details);
    }
    
    // レスポンスはあるがエラー構造が不正な場合
    if (axiosError.response.status >= 400) {
      const statusCode = axiosError.response.status;
      let errorCode = 'HTTP_ERROR';
      let errorMessage = 'エラーが発生しました';
      
      if (statusCode === 401) {
        errorCode = 'AUTH_UNAUTHORIZED';
        errorMessage = translateErrorMessage(errorCode, '認証が必要です');
      } else if (statusCode === 403) {
        errorCode = 'AUTH_FORBIDDEN';
        errorMessage = translateErrorMessage('AUTH_FORBIDDEN', 'アクセスが拒否されました');
      } else if (statusCode === 404) {
        errorCode = 'RESOURCE_NOT_FOUND';
        errorMessage = translateErrorMessage('RESOURCE_NOT_FOUND', 'リソースが見つかりません');
      } else if (statusCode >= 500) {
        errorCode = 'SYSTEM_ERROR';
        errorMessage = translateErrorMessage('SYSTEM_ERROR', 'サーバーエラーが発生しました');
      }
      
      return new AuthServiceError(errorMessage, errorCode);
    }
  }
  
  // その他のエラー
  return new AuthServiceError(
    translateErrorMessage('UNKNOWN_ERROR', 'エラーが発生しました'),
    'UNKNOWN_ERROR'
  );
};

/**
 * 認証サービス
 */
export const authService = {
  /**
   * ログイン
   * @param credentials ユーザー名とパスワード
   * @param orgId 組織ID（オプション、開発環境用）
   * @returns セッショントークンとメッセージ
   */
  async login(credentials: LoginCredentials, orgId?: string): Promise<LoginResponseData> {
    try {
      // クエリパラメータにorgIdを追加（開発環境用）
      const params = orgId ? { orgId } : {};
      
      const response = await apiClient.post<ApiResponse<LoginResponseData>>(
        '/auth/login',
        credentials,
        { params }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new AuthServiceError('ログインに失敗しました', 'LOGIN_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * PINコード検証
   * @param pinCode 6桁のPINコード
   * @param sessionToken 仮セッショントークン
   * @returns ユーザー情報とセッション情報
   */
  async verifyPin(pinCode: string, sessionToken: string): Promise<VerifyPinResponseData> {
    try {
      const response = await apiClient.post<ApiResponse<VerifyPinResponseData>>(
        '/auth/verify-pin',
        { pinCode },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new AuthServiceError('PIN検証に失敗しました', 'PIN_VERIFY_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * PINコード再送信
   * @param sessionToken 仮セッショントークン
   * @returns 再送信結果
   */
  async resendPin(sessionToken: string): Promise<ResendPinResponseData> {
    try {
      const response = await apiClient.post<ApiResponse<ResendPinResponseData>>(
        '/auth/resend-pin',
        {},
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new AuthServiceError('PIN再送信に失敗しました', 'PIN_RESEND_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * ログアウト
   * @returns ログアウト結果
   */
  async logout(): Promise<LogoutResponseData> {
    try {
      // SessionStorageからセッショントークンを取得
      let sessionToken = '';
      if (typeof window !== 'undefined') {
        sessionToken = sessionStorage.getItem('sessionToken') || '';
      }

      // トークンがない場合はエラー
      if (!sessionToken) {
        throw new AuthServiceError(
          'セッショントークンが見つかりません',
          'AUTH_TOKEN_MISSING'
        );
      }

      // Authorizationヘッダーにトークンを設定してリクエスト
      const response = await apiClient.post<ApiResponse<LogoutResponseData>>(
        '/auth/logout',
        {},  // ボディは空
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
      
      if (response.data.success) {
        // 成功したらSessionStorageからトークンを削除
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('sessionToken');
        }
        return response.data.data;
      }
      
      throw new AuthServiceError('ログアウトに失敗しました', 'LOGOUT_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * パスワードリセット要求
   * @param username ユーザー名
   * @returns リセット要求結果
   */
  async resetPasswordRequest(username: string): Promise<ResetPasswordRequestResponseData> {
    try {
      const response = await apiClient.post<ApiResponse<ResetPasswordRequestResponseData>>(
        '/auth/reset-password-request',
        { username }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new AuthServiceError('パスワードリセット要求に失敗しました', 'RESET_REQUEST_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * パスワードリセット実行
   * @param resetToken リセットトークン
   * @param newPassword 新しいパスワード
   * @returns リセット結果
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<ResetPasswordResponseData> {
    try {
      const response = await apiClient.post<ApiResponse<ResetPasswordResponseData>>(
        '/auth/reset-password',
        { resetToken, newPassword }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new AuthServiceError('パスワードリセットに失敗しました', 'RESET_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default authService;
