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

  // // リクエストインターセプター（組織IDヘッダーの自動付与）
  // client.interceptors.request.use(
  //   (config) => {
  //     const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;
  //     if (organizationId) {
  //       config.headers['X-Organization-Id'] = organizationId;
  //     }
  //     return config;
  //   },
  //   (error) => {
  //     return Promise.reject(error);
  //   }
  // );

  // リクエストインターセプター（組織IDヘッダーの自動付与）
  client.interceptors.request.use(
    (config) => {
      // TODO：クライアント証明書導入までの仮実装
      // const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
      const organizationId = '{c9621ed6-5def-4970-8e7f-fbe97c98e3ed}';
      if (organizationId) {
        config.headers['X-Organization-Id'] = organizationId;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

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
    
    // PINコードエラー
    AUTH_PIN_INVALID: 'PINコードが正しくありません',
    AUTH_PIN_EXPIRED: 'PINコードの有効期限が切れています',
    AUTH_PIN_MAX_ATTEMPTS: 'PINコードの入力試行回数が上限を超えました',
    
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
    if (response && !response.success) {
      const errorCode = response.error.code;
      const errorMessage = translateErrorMessage(errorCode, response.error.message);
      return new AuthServiceError(errorMessage, errorCode, response.error.details);
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
   * @returns セッショントークンとメッセージ
   */
  async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>(
        '/auth/login',
        credentials
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
      const response = await apiClient.post<ApiResponse<LogoutResponseData>>(
        '/auth/logout'
      );
      
      if (response.data.success) {
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
