/**
 * 部署管理API通信サービス
 * 
 * 部署管理のCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import { getDepartmentConfig } from '@/types/departmentTypes';
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
 * 部署データの汎用型
 */
export type MasterRecord = Record<string, unknown>;

/**
 * 部署一覧を取得
 */
export async function fetchMasters(
): Promise<MasterRecord[]> {
  const config = getDepartmentConfig();
  const client = createApiClient();
  
  console.log(`=== Fetching ${config.displayName} ===`);
  console.log('Endpoint:', config.apiEndpoint);
  
  try {
    const response = await client.get<ApiResponse<MasterRecord[]>>(config.apiEndpoint);
    
    console.log('Response status:', response.status);
    console.log('API Response:', response.data);
    
    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<MasterRecord[]>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * 部署を新規作成
 */
export async function createMaster(
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getDepartmentConfig();
  const client = createApiClient();
  
  console.log(`=== Creating ${config.displayName} ===`);
  console.log('Endpoint:', config.apiEndpoint);
  console.log('Data:', data);
  
  try {
    const response = await client.post<ApiResponse<MasterRecord>>(config.apiEndpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<MasterRecord>>;
    if (axiosError.response?.status === 409) {
      throw new Error('入力されたIDは既に存在しています');
    }
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * 部署を更新
 */
export async function updateMaster(
  id: string,
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getDepartmentConfig();
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/${id}`;
  
  console.log(`=== Updating ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  
  try {
    const response = await client.put<ApiResponse<MasterRecord>>(endpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<MasterRecord>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * 部署のステータスを更新（アクティブ/非アクティブ）
 */
export async function updateMasterStatus(
  id: string,
  isActive: boolean
): Promise<void> {
  const config = getDepartmentConfig();
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/${id}/status`;

  console.log(`=== Updating ${config.displayName} Status ===`);
  console.log('Endpoint:', endpoint);
  console.log('isActive:', isActive);
  
  try {
    const response = await client.patch(endpoint, { isActive });
    console.log('Response status:', response.status);
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<void>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * 部署を一括でステータス更新
 */
export async function batchUpdateMasterStatus(
  ids: string[],
  isActive: boolean
): Promise<void> {
  const config = getDepartmentConfig();
  
  console.log(`=== Batch Updating ${config.displayName} Status ===`);
  console.log('IDs:', ids);
  console.log('isActive:', isActive);
  
  // 各IDに対して順次ステータス更新
  for (const id of ids) {
    await updateMasterStatus(id, isActive);
  }
}

/**
 * CSVファイルをアップロード
 */
export async function uploadCsv(
  file: File
): Promise<void> {
  const config = getDepartmentConfig();
  
  if (!config.supportsCsvUpload) {
    throw new Error(`${config.displayName}はCSVアップロードに対応していません`);
  }
  
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/upload-csv`;
  
  console.log(`=== Uploading CSV to ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('File:', file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await client.post<ApiResponse<unknown>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Upload result:', response.data);
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    const errorMessage = axiosError.response?.data?.error?.message || 'CSVアップロードに失敗しました';
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(errorMessage);
  }
}

/**
 * CSVファイルをダウンロード
 */
export async function downloadCsv(
  filters?: {
    search?: string;
    displayScope?: string;
    fixedFilters?: Record<string, string>;
  }
): Promise<void> {
  const config = getDepartmentConfig();
  
  if (!config.supportsCsvDownload) {
    throw new Error(`${config.displayName}はCSVダウンロードに対応していません`);
  }
  
  const client = createApiClient();
  
  // クエリパラメータを構築
  const params: Record<string, string> = {};
  if (filters?.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters?.displayScope && filters.displayScope !== 'all') {
    params.display_scope = filters.displayScope;
  }
  if (filters?.fixedFilters) {
    Object.entries(filters.fixedFilters).forEach(([key, value]) => {
      if (value) {
        params[key] = value;
      }
    });
  }
  
  const endpoint = `${config.apiEndpoint}/download-csv`;
  
  console.log(`=== Downloading CSV from ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('Filters:', filters);
  
  try {
    const response = await client.get(endpoint, {
      params,
      responseType: 'blob',
    });
    
    console.log('Response status:', response.status);
    
    // レスポンスをBlobとして取得
    const blob = new Blob([response.data], { type: 'text/csv' });
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'departments.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`CSVダウンロードに失敗しました: ${axiosError.response?.status || 'Unknown'} - ${axiosError.message}`);
  }
}
