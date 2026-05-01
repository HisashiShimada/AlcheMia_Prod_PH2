/**
 * 認証APIサービス
 * バックエンドの認証APIとの通信を担当
 */

import axios, { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { setTokenPair, clearAllTokens } from '@/utils/tokenStorage';
import { mapErrorToMessage } from '@/utils/errorMapper';
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
 *
 * エラーコードはそのまま保持してthrowする（翻訳しない）。
 * メッセージ変換は errorMapper.ts が唯一の変換場所。
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'E9999',
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
 * Axiosエラーをハンドリング
 *
 * - エラーコードは翻訳せずそのまま保持する
 * - バックエンドが返した code / message をそのまま AuthServiceError に詰める
 * - バックエンドが code を返さない場合は HTTP ステータスから errorCodes.ts のコードに変換する
 */
const handleApiError = (error: unknown): AuthServiceError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<never>>;

    // タイムアウトエラー
    if (axiosError.code === 'ECONNABORTED') {
      return new AuthServiceError('リクエストがタイムアウトしました', 'E3002');
    }

    // ネットワークエラー（レスポンスなし）
    if (!axiosError.response) {
      return new AuthServiceError('サーバーに接続できません', 'E3001');
    }

    // APIエラーレスポンス（バックエンドが error.code を返している場合）
    const response = axiosError.response.data;
    if (response && !response.success && response.error) {
      // ✅ mapErrorToMessage を経由して日本語メッセージに変換
      const code = response.error.code || 'E9999';
      return new AuthServiceError(
        mapErrorToMessage(code, response.error.message || 'エラーが発生しました'),
        code,
        response.error.details
      );
    }

    // レスポンスはあるがエラー構造が不正な場合 → HTTPステータスからコードを推定
    const statusCode = axiosError.response.status;
    if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
      return new AuthServiceError('認証が必要です', 'E5013');
    } else if (statusCode === HTTP_STATUS.FORBIDDEN) {
      return new AuthServiceError('アクセスが拒否されました', 'E5012');
    } else if (statusCode === HTTP_STATUS.NOT_FOUND) {
      return new AuthServiceError('リソースが見つかりません', 'E6001');
    } else if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      return new AuthServiceError('サーバーエラーが発生しました', 'E4001');
    }

    return new AuthServiceError('エラーが発生しました', 'E9999');
  }

  // その他のエラー
  return new AuthServiceError('エラーが発生しました', 'E9999');
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

      // インターセプターはレスポンスをそのまま返すため、response.data.data でアンラップする
      if (response.data.success) {
        return response.data.data;
      }

      // エラーレスポンスの場合（通常はAxiosErrorとして捕捉されるため、ここには到達しにくい）
      throw new AuthServiceError(
        response.data.error?.message || 'ログインに失敗しました',
        response.data.error?.code || 'E9999',
        response.data.error?.details
      );
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
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
          localStorage.removeItem('userInfo');
        }
        return null;
      }
    } catch (error) {
      // 401エラー（リフレッシュトークンなし/期限切れ）は正常ケースなのでログ出力しない
      if (axios.isAxiosError(error) && error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
        // 通常ログイン時の初回アクセスなので、静かに処理
        clearAllTokens();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userInfo');
        }
        return null;
      }
      
      // その他のエラー（ネットワークエラーなど）はログ出力
      console.error('[authService] トークン更新エラー:', error);
      clearAllTokens();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userInfo');
      }
      return null;
    }
  },

  /**
   * リフレッシュトークンを使用してログイン状態を復元（自動ログイン用）
   * リフレッシュトークンはhttpOnly Cookieに保存されており、自動的に送信される
   * 
   * @returns ユーザー情報とセッション情報（失敗時はエラーをスロー）
   * @note 自動ログイン機能で使用
   */
  async refreshToken(): Promise<VerifyPinResponseData> {
    try {
      // リフレッシュトークンはCookieから自動的に送信される
      const response = await apiClient.post<ApiResponse<{
        accessToken: string;
        expiresIn: number;
        user: {
          id: string;
          username: string;
          email: string;
          roleName: string;
          roleCd: string;
          organizationId: string;
          organizationName: string;
          displayName: string;
          departmentCd: string;
          initialScreenFunctionCd: string;
        };
      }>>(
        '/auth/refresh',
        {} // bodyは空（リフレッシュトークンはCookieから取得）
      );

      if (response.data.success) {
        const { accessToken, user } = response.data.data;
        
        // 新しいアクセストークンを保存
        setTokenPair(accessToken);
        
        // VerifyPinResponseDataと同じ形式で返す
        return {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            roleName: user.roleName,  // バックエンドから返されたroleNameを使用
            roleCd: user.roleCd,
            organizationId: user.organizationId,
            organizationName: user.organizationName,
            displayName: user.displayName,
            departmentCd: user.departmentCd,
            initialScreenFunctionCd: user.initialScreenFunctionCd,
          },
          session: {
            token: accessToken,
            expiresAt: new Date(Date.now() + response.data.data.expiresIn * 1000).toISOString(),
          },
          passwordChangeRequired: false,
          redirectUrl: '/', // デフォルトのリダイレクト先
        };
      } else {
        // リフレッシュトークンが無効（期限切れなど）
        throw new AuthServiceError('リフレッシュトークンが無効です', 'AUTH_TOKEN_INVALID');
      }
    } catch (error) {
      throw handleApiError(error);
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
          localStorage.removeItem('userInfo');
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
   * @param email メールアドレス
   * @param orgId 組織ID（ログイン画面ではURLクエリパラメータから取得）
   * @returns リセット要求結果
   */
  async resetPasswordRequest(email: string, orgId?: string): Promise<ResetPasswordRequestResponseData> {
    try {
      // ログイン画面では組織IDをクエリパラメータで送信
      const params = orgId ? { orgId } : {};
      
      const response = await apiClient.post<ApiResponse<ResetPasswordRequestResponseData>>(
        '/auth/reset-password-request',
        { email },
        { params }
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

  /**
   * パスワード変更（認証済みユーザー用）
   * @param currentPassword 現在のパスワード
   * @param newPassword 新しいパスワード
   * @returns 変更結果
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Authorizationヘッダーはインターセプターで自動付与される
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        '/auth/change-password',
        { currentPassword, newPassword }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new AuthServiceError('パスワード変更に失敗しました', 'CHANGE_PASSWORD_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default authService;
