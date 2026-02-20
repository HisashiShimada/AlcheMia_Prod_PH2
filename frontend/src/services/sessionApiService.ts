/**
 * セッション管理API通信サービス
 * 
 * @description
 * - アクティブセッション一覧取得
 * - セッション強制終了
 */

import { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import type { ApiResponse } from '@/types/api';
import type {
  SessionListResponse,
  SessionTerminateResponse,
} from '@/types/session';

/**
 * アクティブセッション一覧を取得
 * 
 * GET /api/v1/sessions
 * 
 * @returns セッション一覧
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const sessions = await getActiveSessions();
 * console.log(`アクティブセッション数: ${sessions.count}`);
 * ```
 */
export const getActiveSessions = async (): Promise<SessionListResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getActiveSessions - API call start');
    
    const response = await client.get<ApiResponse<SessionListResponse>>(
      '/sessions'
    );

    console.log('[DEBUG] getActiveSessions - Response received', {
      status: response.status,
      success: response.data.success,
    });
    
    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'セッション一覧の取得に失敗しました'
      );
    }

    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] getActiveSessions - Error caught', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * セッションを強制終了
 * 
 * DELETE /api/v1/sessions/:tokenId
 * 
 * @param tokenId トークンID
 * @returns 終了結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * await terminateSession('550e8400-e29b-41d4-a716-446655440000');
 * console.log('セッションを終了しました');
 * ```
 */
export const terminateSession = async (
  tokenId: string
): Promise<SessionTerminateResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] terminateSession - API call start', { tokenId });
    
    const response = await client.delete<ApiResponse<SessionTerminateResponse>>(
      `/sessions/${tokenId}`
    );

    console.log('[DEBUG] terminateSession - Response received', {
      status: response.status,
      success: response.data.success,
    });
    
    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'セッションの終了に失敗しました'
      );
    }

    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] terminateSession - Error caught', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
      tokenId,
    });
    throw error;
  }
};
