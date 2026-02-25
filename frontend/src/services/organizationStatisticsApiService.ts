/**
 * 組織統計情報API通信サービス
 */

import { createApiClient } from '@/utils/authUtils';
import { AxiosError } from 'axios';

/**
 * APIレスポンスの型定義
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 組織統計情報の型定義
 */
export interface OrganizationStatistics {
  storage: {
    /** 使用中ストレージ量（GB） */
    used: number;
    /** 最大ストレージ量（GB） */
    total: number;
    /** 単位（GB） */
    unit: string;
    /** 使用率（0〜1） */
    usageRate: number;
  };
  projects: {
    /** 現在のプロジェクト数 */
    count: number;
    /** 上限値 */
    total: number;
  };
  activeUsers: {
    /** アクティブセッション数（Redis） */
    count: number;
    /** 組織利用者数（DB） */
    total: number;
  };
}

const API_ENDPOINT = '/systemManagement/organization_statistics';

/**
 * 組織統計情報を取得
 */
export async function fetchOrganizationStatistics(): Promise<OrganizationStatistics> {
  const client = createApiClient();

  try {
    const response = await client.get<ApiResponse<OrganizationStatistics>>(API_ENDPOINT);

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<OrganizationStatistics>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(
      `API Error: ${axiosError.response?.status || 'Unknown'} - ${
        axiosError.response?.data?.error?.message || axiosError.message
      }`
    );
  }
}
