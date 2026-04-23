/**
 * 認証API クライアント
 * 
 * すべての認証関連のAPI通信を管理します。
 */

import axios, { AxiosError } from 'axios';
import type {
  LoginResponse,
  VerifyPINResponse,
  ResendPINResponse,
  MessageResponse,
  ErrorResponse,
} from '../types/auth';
import { mapErrorToMessage } from './errorMapper';

// API ベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// タイムアウト設定（30秒）
const TIMEOUT = 30000;

/**
 * APIエラーレスポンスの型ガード
 */
function isErrorResponse(data: unknown): data is { error: ErrorResponse['error'] } {
  return data !== null && typeof data === 'object' && 'error' in data;
}

/**
 * エラーハンドリング共通処理
 * 
 * @param error - Axiosエラーオブジェクト
 * @throws Error - ユーザーフレンドリーなエラーメッセージを含むError
 */
function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // レスポンスがある場合（サーバーエラー）
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      
      if (isErrorResponse(data)) {
        const errorCode = data.error.code;
        const errorMessage = data.error.message || mapErrorToMessage(errorCode);
        throw new Error(errorMessage);
      }
    }

    // タイムアウトエラー
    if (axiosError.code === 'ECONNABORTED') {
      throw new Error('リクエストがタイムアウトしました。しばらくしてから再度お試しください');
    }

    // ネットワークエラー
    if (!axiosError.response) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
    }
  }

  // その他のエラー
  throw new Error('予期しないエラーが発生しました。しばらくしてから再度お試しください');
}

/**
 * ログイン処理（Step 1/2）
 * ユーザー名・パスワードを検証し、PINコードをメール送信します。
 * 
 * @param username - ユーザー名
 * @param password - パスワード
 * @param organizationId - 組織ID
 * @returns LoginResponse - セッショントークン、メッセージ、メールアドレス（マスキング済み）、有効期限
 * 
 * @throws Error - 認証失敗、バリデーションエラー、レート制限超過など
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await login('user001', 'password123', 'org_001');
 *   console.log(response.sessionToken); // 'temp_session_abc123_1735185000'
 * } catch (error) {
 *   console.error(error.message); // 'ユーザー名またはパスワードが正しくありません'
 * }
 * ```
 */
export async function login(
  username: string,
  password: string,
  organizationId: string
): Promise<LoginResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        userId: username, // バックエンドは "userId" フィールドを期待する
        password,
      },
      {
        headers: {
          'X-Organization-Id': organizationId,
        },
        timeout: TIMEOUT,
      }
    );

    return response.data.data as LoginResponse;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * PINコード検証（Step 2/2）
 * PINコードを検証し、本セッションを生成します。
 * 
 * @param pinCode - PINコード（6桁）
 * @param sessionToken - 仮セッショントークン
 * @param organizationId - 組織ID
 * @returns VerifyPINResponse - ユーザー情報、セッション情報、リダイレクトURL
 * 
 * @throws Error - PINコード不正、期限切れ、試行回数超過など
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await verifyPin('123456', 'temp_session_abc123', 'org_001');
 *   console.log(response.user.role); // 'experiment_admin'
 *   console.log(response.redirectUrl); // '/experiment-admin'
 * } catch (error) {
 *   console.error(error.message); // 'PINコードが正しくありません'
 * }
 * ```
 */
export async function verifyPin(
  pinCode: string,
  sessionToken: string,
  organizationId: string
): Promise<VerifyPINResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/verify-pin`,
      {
        pinCode,
      },
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-Organization-Id': organizationId,
        },
        timeout: TIMEOUT,
      }
    );

    return response.data.data as VerifyPINResponse;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * PINコード再送信
 * 新しいPINコードを生成してメール送信します。
 * 
 * @param sessionToken - 仮セッショントークン
 * @param organizationId - 組織ID
 * @returns ResendPINResponse - メッセージ、メールアドレス（マスキング済み）、有効期限
 * 
 * @throws Error - トークン無効、レート制限超過など
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await resendPin('temp_session_abc123', 'org_001');
 *   console.log(response.message); // 'PINコードを再送信しました'
 * } catch (error) {
 *   console.error(error.message); // 'PINコード再送信回数が上限に達しました'
 * }
 * ```
 */
export async function resendPin(
  sessionToken: string,
  organizationId: string
): Promise<ResendPINResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/resend-pin`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-Organization-Id': organizationId,
        },
        timeout: TIMEOUT,
      }
    );

    return response.data.data as ResendPINResponse;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * パスワードリセット要求
 * パスワードリセット用のリンクをメール送信します。
 * 
 * @param username - ユーザー名
 * @param organizationId - 組織ID
 * @returns MessageResponse - 成功メッセージ
 * 
 * @throws Error - バリデーションエラー、レート制限超過など
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await resetPasswordRequest('user001', 'org_001');
 *   console.log(response.message); // 'パスワードリセット用のリンクをメールに送信しました'
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export async function resetPasswordRequest(
  username: string,
  organizationId: string
): Promise<MessageResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/reset-password-request`,
      {
        username,
      },
      {
        headers: {
          'X-Organization-Id': organizationId,
        },
        timeout: TIMEOUT,
      }
    );

    return response.data.data as MessageResponse;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * パスワードリセット実行
 * リセットトークンを使用してパスワードを変更します。
 * 
 * @param resetToken - リセットトークン
 * @param newPassword - 新しいパスワード
 * @returns MessageResponse - 成功メッセージ
 * 
 * @throws Error - トークン無効、期限切れなど
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await resetPassword('reset_token_123', 'NewPassword123!');
 *   console.log(response.message); // 'パスワードを変更しました'
 * } catch (error) {
 *   console.error(error.message); // 'リセットトークンが無効です'
 * }
 * ```
 */
export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<MessageResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/reset-password`,
      {
        resetToken,
        newPassword,
      },
      {
        timeout: TIMEOUT,
      }
    );

    return response.data.data as MessageResponse;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * ログアウト
 * セッショントークンを無効化し、Cookieをクリアします。
 * 
 * @param sessionToken - セッショントークン
 * @param organizationId - 組織ID
 * @returns MessageResponse - 成功メッセージ
 * 
 * @throws Error - トークン無効など
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await logout('maiml_session-abc123', 'org_001');
 *   console.log(response.message); // 'ログアウトしました'
 * } catch (error) {
 *   console.error(error.message); // 'セッショントークンが無効です'
 * }
 * ```
 */
export async function logout(
  sessionToken: string,
  organizationId: string
): Promise<MessageResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/logout`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-Organization-Id': organizationId,
        },
        timeout: TIMEOUT,
      }
    );

    return response.data.data as MessageResponse;
  } catch (error) {
    handleApiError(error);
  }
}
