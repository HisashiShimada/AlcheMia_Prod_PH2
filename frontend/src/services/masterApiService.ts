/**
 * マスタ管理API通信サービス
 * 
 * マスタのCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import { HTTP_STATUS } from '@/constants/httpStatus';
import type { MasterDataType } from '@/types/masterDataTypes';
import { getMasterDataConfig } from '@/types/masterDataTypes';
import { AxiosError } from 'axios';
import type { ServiceApiResponse } from '@/types/api';

import type {
  BaseMasterRecord,
  CreatorRecord,
  InstrumentRecord,
  VendorRecord,
  AttributeRecord,
  MasterApiRecord,
} from '@/types/masterDataTypes';

/**
 * マスタ一覧を取得
 */
export async function fetchMasters(
  type: MasterDataType,
  filters?: {
    displayScope?: 'all' | 'own';
    search?: string;
    isActive?: boolean;
  }
): Promise<MasterApiRecord[]> {
  const config = getMasterDataConfig(type);
  const client = createApiClient();
  
  // クエリパラメータを構築
  const params: Record<string, string> = {};
  if (filters?.displayScope) {
    params.display_scope = filters.displayScope;
  }
  if (filters?.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters?.isActive !== undefined) {
    params.is_active = String(filters.isActive);
  }
  
  console.log(`=== Fetching ${config.displayName} ===`);
  console.log('Endpoint:', config.apiEndpoint);
  console.log('Filters:', filters);
  console.log('Params:', params);
  
  try {
    const response = await client.get<ServiceApiResponse<MasterApiRecord[]>>(config.apiEndpoint, {
      params,
    });
    
    console.log('Response status:', response.status);
    console.log('API Response:', response.data);
    
    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ServiceApiResponse<MasterApiRecord[]>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * マスタを新規作成
 */
export async function createMaster(
  type: MasterDataType,
  data: Record<string, unknown>
): Promise<MasterApiRecord> {
  const config = getMasterDataConfig(type);
  const client = createApiClient();
  
  console.log(`=== Creating ${config.displayName} ===`);
  console.log('Endpoint:', config.apiEndpoint);
  console.log('Data:', data);
  
  try {
    const response = await client.post<ServiceApiResponse<MasterApiRecord>>(config.apiEndpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ServiceApiResponse<MasterApiRecord>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    // AxiosError をそのまま再スローすることで、呼び出し元の extractErrorMessage が
    // バックエンドの error.message を正しく取得できるようにする
    throw error;
  }
}

/**
 * マスタを更新
 */
export async function updateMaster(
  type: MasterDataType,
  id: string,
  data: Record<string, unknown>
): Promise<MasterApiRecord> {
  const config = getMasterDataConfig(type);
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/${id}`;
  
  console.log(`=== Updating ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  
  try {
    const response = await client.put<ServiceApiResponse<MasterApiRecord>>(endpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ServiceApiResponse<MasterApiRecord>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    // AxiosError をそのまま再スローすることで、呼び出し元の extractErrorMessage が
    // バックエンドの error.message を正しく取得できるようにする
    throw error;
  }
}

/**
 * マスタのステータスを更新（アクティブ/非アクティブ）
 */
export async function updateMasterStatus(
  type: MasterDataType,
  id: string,
  isActive: boolean
): Promise<void> {
  const config = getMasterDataConfig(type);
  const client = createApiClient();
  // Attributeマスタは id が "name__value" 形式で % などの特殊文字を含む可能性があるためエンコードする
  const endpoint = `${config.apiEndpoint}/${encodeURIComponent(id)}/status`;
  
  console.log(`=== Updating ${config.displayName} Status ===`);
  console.log('Endpoint:', endpoint);
  console.log('isActive:', isActive);
  
  try {
    const response = await client.patch(endpoint, { isActive });
    console.log('Response status:', response.status);
  } catch (error) {
    const axiosError = error as AxiosError<ServiceApiResponse<void>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * マスタを一括でステータス更新
 */
export async function batchUpdateMasterStatus(
  type: MasterDataType,
  ids: string[],
  isActive: boolean
): Promise<void> {
  const config = getMasterDataConfig(type);
  
  console.log(`=== Batch Updating ${config.displayName} Status ===`);
  console.log('IDs:', ids);
  console.log('isActive:', isActive);
  
  // 各IDに対して順次ステータス更新
  for (const id of ids) {
    await updateMasterStatus(type, id, isActive);
  }
}

/**
 * CSVファイルをアップロード
 */
export async function uploadCsv(
  type: MasterDataType,
  file: File
): Promise<void> {
  const config = getMasterDataConfig(type);
  
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
    const response = await client.post<ServiceApiResponse<unknown>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Upload result:', response.data);
  } catch (error) {
    const axiosError = error as AxiosError<ServiceApiResponse<unknown>>;
    const errorMessage = axiosError.response?.data?.error?.message || 'CSVアップロードに失敗しました';
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(errorMessage);
  }
}

/**
 * CSVファイルをダウンロード
 */
export async function downloadCsv(
  type: MasterDataType,
  filters?: {
    search?: string;
    displayScope?: string;
    fixedFilters?: Record<string, string>;
  }
): Promise<void> {
  const config = getMasterDataConfig(type);
  
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
    link.download = `${config.type}.csv`;
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

/**
 * Attributeマスタ一覧を取得（NestedPropertyEditor用）
 *
 * 属性追加ダイアログの選択肢生成に特化した軽量ラッパー関数。
 * isActive=true のレコードのみを返します。
 *
 * @returns AttributeRecord[] - アクティブなAttributeマスタ一覧
 */
export async function fetchAttributeMasters(applyOrganizationGroupFilter?: boolean): Promise<AttributeRecord[]> {
  try {
    const config = getMasterDataConfig('attribute');
    const client = createApiClient();
    const params: Record<string, string> = { is_active: 'true' };
    if (applyOrganizationGroupFilter) {
      params.apply_organization_group_filter = 'true';
    }
    const response = await client.get<ServiceApiResponse<AttributeRecord[]>>(config.apiEndpoint, { params });
    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('fetchAttributeMasters error:', error);
    return [];
  }
}
