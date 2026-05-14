/**
 * code_master API Service
 * 
 * コードマスターSelectオプション取得のためのAPI通信処理
 * 
 * @module codeMasterApiService
 * @version 1.0.0
 * @date 2026-02-20
 */

import { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import type { SelectOption } from '@/types/common';

/**
 * Selectオプション取得
 * GET /api/v1/code-master/:codeDivision/options
 * 
 * @param codeDivision - コード区分
 * @returns {Promise<SelectOption[]>} Selectオプション配列
 * 
 * @example
 * ```typescript
 * const options = await getSelectOptions('experiment_condition');
 * // => [{ value: 0, label: '全て同一条件' }, { value: 1, label: '実験ごとに条件変更' }]
 * ```
 */
export const getSelectOptions = async (
  codeDivision: string
): Promise<SelectOption[]> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getSelectOptions - Request', { codeDivision });
    
    const response = await client.get<{
      success: true;
      data: {
        codeDivision: string;
        options: SelectOption[];
      };
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/code-master/${encodeURIComponent(codeDivision)}/options`);

    console.log('[DEBUG] getSelectOptions - Success', {
      codeDivision,
      optionsCount: response.data.data.options.length,
    });
    
    return response.data.data.options;
  } catch (error) {
    console.error('[DEBUG] getSelectOptions - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
      codeDivision,
    });
    throw error;
  }
};

/**
 * 複数Selectオプション一括取得
 * POST /api/v1/code-master/options/bulk
 * 
 * @param codeDivisions - コード区分の配列
 * @returns {Promise<Record<string, SelectOption[]>>} コード区分をキーとしたSelectオプションのマップ
 * 
 * @example
 * ```typescript
 * const options = await getMultipleSelectOptions(['experiment_condition', 'task_status']);
 * // => { 
 * //   experiment_condition: [{ value: 0, label: '...' }, ...],
 * //   task_status: [{ value: 0, label: '...' }, ...]
 * // }
 * ```
 */
export const getMultipleSelectOptions = async (
  codeDivisions: string[]
): Promise<Record<string, SelectOption[]>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getMultipleSelectOptions - Request', {
      codeDivisions,
      count: codeDivisions.length,
    });
    
    const response = await client.post<{
      success: true;
      data: Record<string, SelectOption[]>;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/code-master/options/bulk', { codeDivisions });

    console.log('[DEBUG] getMultipleSelectOptions - Success', {
      codeDivisions,
      receivedKeys: Object.keys(response.data.data),
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] getMultipleSelectOptions - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
      codeDivisions,
    });
    throw error;
  }
};
