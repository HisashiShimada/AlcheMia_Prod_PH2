/**
 * ロール管理API通信サービス
 * 
 * ロール管理のCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import { getRoleConfig } from '@/types/roleTypes';
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
 * ロールデータの汎用型
 */
export type MasterRecord = Record<string, unknown>;

/**
 * ロール一覧を取得
 */
export async function fetchMasters(
): Promise<MasterRecord[]> {
  const config = getRoleConfig();
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
 * ロールを1件取得（ID指定）
 */
export async function fetchMasterById(
  id: string
): Promise<MasterRecord> {
  const config = getRoleConfig();
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/${id}`;
  
  console.log(`=== Fetching ${config.displayName} by ID ===`);
  console.log('Endpoint:', endpoint);
  console.log('ID:', id);
  
  try {
    const response = await client.get<ApiResponse<MasterRecord>>(endpoint);
    
    console.log('Response status:', response.status);
    console.log('API Response:', response.data);
    
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
 * ロールを新規作成
 */
export async function createMaster(
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getRoleConfig();
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
 * ロールを更新
 */
export async function updateMaster(
  id: string,
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getRoleConfig();
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
 * ロールのステータスを更新（アクティブ/非アクティブ）
 */
export async function updateMasterStatus(
  id: string,
  isActive: boolean
): Promise<void> {
  const config = getRoleConfig();
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
 * ロールを一括でステータス更新
 */
export async function batchUpdateMasterStatus(
  ids: string[],
  isActive: boolean
): Promise<void> {
  const config = getRoleConfig();
  
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
  const config = getRoleConfig();
  
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
 * ロール新規追加
 */
export async function createRole(roleData: {
  role: string;
  roleName: string;
  initialScreenFunctionName: string | null;
  isActive: boolean;
}): Promise<void> {
  const config = getRoleConfig();
  const client = createApiClient();
  
  console.log('=== Creating Role ===');
  console.log('Endpoint:', config.apiEndpoint);
  console.log('roleData:', roleData);

  try {
    const response = await client.post<ApiResponse<void>>(config.apiEndpoint, roleData);
    
    console.log('Response status:', response.status);
    console.log('Create result:', response.data);

    if (!response.data.success) {
      throw new Error('Failed to create role');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<void>>;
    const errorMessage = axiosError.response?.data?.error?.message || 'ロールの作成に失敗しました';
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(errorMessage);
  }
}

/**
 * ロール更新
 */
export async function updateRole(
  roleId: string,
  roleData: {
    roleName?: string;
    initialScreenFunctionName?: string | null;
    isActive?: boolean;
  }
): Promise<void> {
  const config = getRoleConfig();
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/${roleId}`;

  console.log('=== Updating Role ===');
  console.log('Endpoint:', endpoint);
  console.log('roleId:', roleId);
  console.log('roleData:', roleData);

  try {
    const response = await client.put<ApiResponse<void>>(endpoint, roleData);

    console.log('Response status:', response.status);
    console.log('Update result:', response.data);

    if (!response.data.success) {
      throw new Error('Failed to update role');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<void>>;
    const errorMessage = axiosError.response?.data?.error?.message || 'ロールの更新に失敗しました';
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(errorMessage);
  }
}

/**
 * ロールの権限を更新
 */
export async function updateRolePermissions(
  roleId: string,
  functionName: string,
  functionWritePermissions: string
): Promise<void> {
  const config = getRoleConfig();
  const client = createApiClient();
  const endpoint = `${config.apiEndpoint}/${roleId}/permissions`;

  console.log('=== Updating Role Permissions ===');
  console.log('Endpoint:', endpoint);
  console.log('roleId:', roleId);
  console.log('functionName:', functionName);
  console.log('functionWritePermissions:', functionWritePermissions);

  try {
    const response = await client.put<ApiResponse<void>>(endpoint, {
      functionName,
      functionWritePermissions,
    });

    console.log('Response status:', response.status);
    console.log('Update result:', response.data);

    if (!response.data.success) {
      throw new Error('Failed to update role permissions');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<void>>;
    const errorMessage = axiosError.response?.data?.error?.message || '権限の更新に失敗しました';
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(errorMessage);
  }
}

/**
 * CSVファイルをダウンロード
 */
export async function downloadCsv(
  filters?: {
    searchText?: string;
    roleNameFilter?: string;
  }
): Promise<void> {
  const config = getRoleConfig();
  
  if (!config.supportsCsvDownload) {
    throw new Error(`${config.displayName}はCSVダウンロードに対応していません`);
  }
  
  const client = createApiClient();
  
  // クエリパラメータを構築
  const params: Record<string, string> = {};
  if (filters?.searchText?.trim()) {
    params.searchText = filters.searchText.trim();
  }
  if (filters?.roleNameFilter?.trim()) {
    params.roleNameFilter = filters.roleNameFilter.trim();
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
    
    // Content-Dispositionヘッダーからファイル名を抽出
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'role.csv'; // デフォルトのファイル名
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    console.log('Downloaded filename:', filename);
    
    // レスポンスをBlobとして取得
    const blob = new Blob([response.data], { type: 'text/csv' });
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename; // バックエンドから取得したファイル名を使用
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
