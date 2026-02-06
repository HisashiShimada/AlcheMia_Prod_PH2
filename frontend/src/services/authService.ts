/**
 * 認証APIサービス
 * バックエンドの認証APIとの通信を担当
 */

import axios, { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import { setTokenPair, clearAllTokens } from '@/utils/tokenStorage';
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
   * @param orgId 組織ID（ログイン画面ではURLクエリパラメータから取得）
   * @returns セッショントークンとメッセージ
   */
  async login(credentials: LoginCredentials, orgId?: string): Promise<LoginResponseData> {
    try {
      // ログイン画面では組織IDをクエリパラメータで送信
      // （ログイン前のため、証明書認証によるヘッダー設定がまだ行われていない）
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
   * @param sessionToken 仮セッショントークン（SessionStorageに保存済み）
   * @param orgId 組織ID（ログイン画面ではURLクエリパラメータから取得）
   * @returns ユーザー情報とセッション情報
   */
  async verifyPin(pinCode: string, sessionToken: string, orgId?: string): Promise<VerifyPinResponseData> {
    try {
      // ログイン画面では組織IDをクエリパラメータで送信
      const params = orgId ? { orgId } : {};
      
      // Authorizationヘッダーはインターセプターで自動付与される
      const response = await apiClient.post<ApiResponse<VerifyPinResponseData>>(
        '/auth/verify-pin',
        { pinCode },
        { params }
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
   * @param sessionToken 仮セッショントークン（SessionStorageに保存済み）
   * @param orgId 組織ID（ログイン画面ではURLクエリパラメータから取得）
   * @returns 再送信結果
   */
  async resendPin(sessionToken: string, orgId?: string): Promise<ResendPinResponseData> {
    try {
      // ログイン画面では組織IDをクエリパラメータで送信
      const params = orgId ? { orgId } : {};
      
      // Authorizationヘッダーはインターセプターで自動付与される
      const response = await apiClient.post<ApiResponse<ResendPinResponseData>>(
        '/auth/resend-pin',
        {},
        { params }
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
   * リフレッシュトークンを使用してアクセストークンを更新
   * リフレッシュトークンはhttpOnly Cookieに保存されており、自動的に送信される
   * 
   * @returns 新しいアクセストークン（失敗時はnull）
   * @note リダイレクト処理は呼び出し元（authUtils.tsのインターセプター）で実施
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      // リフレッシュトークンはCookieから自動的に送信される
      const response = await apiClient.post<ApiResponse<{
        accessToken: string;
        expiresIn: number;
      }>>(
        '/auth/refresh',
        {} // bodyは空（リフレッシュトークンはCookieから取得）
      );

      if (response.data.success) {
        // 新しいアクセストークンを保存
        setTokenPair(response.data.data.accessToken);

        console.log('[authService] トークン更新成功');
        return response.data.data.accessToken;
      } else {
        // リフレッシュトークンが無効（期限切れなど）
        console.error('[authService] リフレッシュトークンが無効です');
        clearAllTokens();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('userInfo');
        }
        return null;
      }
    } catch (error) {
      // API呼び出しエラー（ネットワークエラー、401エラーなど）
      console.error('[authService] トークン更新エラー:', error);
      clearAllTokens();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('userInfo');
      }
      return null;
    }
  },

  /**
   * ログアウト
   * リフレッシュトークンはhttpOnly Cookieに保存されており、自動的に送信される
   * @returns ログアウト結果
   */
  async logout(): Promise<LogoutResponseData> {
    try {
      // Authorizationヘッダーはインターセプターで自動付与される
      // リフレッシュトークンはCookieから自動的に送信され、バックエンドで無効化される
      const response = await apiClient.post<ApiResponse<LogoutResponseData>>(
        '/auth/logout',
        {} // bodyは空（リフレッシュトークンはCookieから取得）
      );
      
      if (response.data.success) {
        // 成功したらすべてのトークンとセッション情報を削除
        clearAllTokens();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('userInfo');
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
