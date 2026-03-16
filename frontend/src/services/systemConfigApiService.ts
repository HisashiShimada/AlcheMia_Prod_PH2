/**
 * システム設定 API サービス
 * GET /api/v1/provider/system-config
 */

import { createApiClient } from '@/utils/authUtils';
import { AxiosError } from 'axios';

/** システム設定値の型（キー名 → 値） */
export type SystemConfig = Record<string, string | number | boolean>;

/**
 * システム設定値を取得
 *
 * @param keys 取得するキー名の配列（省略時は全設定を返す）
 * @returns システム設定値のオブジェクト
 */
export async function getSystemConfig(keys?: string[]): Promise<SystemConfig> {
  const client = createApiClient();

  const query = keys && keys.length > 0
    ? `?keys=${keys.join(',')}`
    : '';

  try {
    const response = await client.get<{ success: boolean; data: SystemConfig }>(
      `/provider/system-config${query}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('システム設定情報の取得に失敗しました');
  } catch (error) {
    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    throw new Error(
      axiosError.response?.data?.error?.message || 'システム設定情報の取得に失敗しました'
    );
  }
}
