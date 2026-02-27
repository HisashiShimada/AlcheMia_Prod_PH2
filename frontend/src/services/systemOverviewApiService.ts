/**
 * システム概要 API サービス
 * GET /api/v1/systemManagement/system-overview
 */

import { createApiClient } from '@/utils/authUtils';
import { AxiosError } from 'axios';
import { SystemOverviewData } from '../types/systemOverview';

/**
 * システム概要統計を取得
 *
 * @returns システム概要データ
 */
export async function getSystemOverview(): Promise<SystemOverviewData> {
  const client = createApiClient();

  try {
    const response = await client.get<{ success: boolean; data: SystemOverviewData }>(
      '/systemManagement/system-overview'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('システム概要情報の取得に失敗しました');
  } catch (error) {
    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    throw new Error(
      axiosError.response?.data?.error?.message || 'システム概要情報の取得に失敗しました'
    );
  }
}
