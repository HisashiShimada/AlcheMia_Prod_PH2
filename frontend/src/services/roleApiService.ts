/**
 * ロール管理API通信サービス
 * 
 * ロール管理のCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import { getRoleConfig } from '@/types/roleTypes';
import type { RoleRecord } from '@/types/roleTypes';
import type { ServiceApiResponse } from '@/types/api';

/** roleApiService 内部の汎用型エイリアス */
type MasterRecord = RoleRecord;

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
    const response = await client.get<ServiceApiResponse<MasterRecord[]>>(config.apiEndpoint);
    
    console.log('Response status:', response.status);
    console.log('API Response:', response.data);
    
    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('API Error (fetchMasters):', error);
    throw error;
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
    const response = await client.get<ServiceApiResponse<MasterRecord>>(endpoint);
    
    console.log('Response status:', response.status);
    console.log('API Response:', response.data);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('API Error (fetchMasterById):', error);
    throw error;
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
    const response = await client.post<ServiceApiResponse<MasterRecord>>(config.apiEndpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('API Error (createMaster):', error);
    throw error;
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
    const response = await client.put<ServiceApiResponse<MasterRecord>>(endpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('API Error (updateMaster):', error);
    throw error;
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
    console.error('API Error (updateMasterStatus):', error);
    throw error;
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
    const response = await client.post<ServiceApiResponse<unknown>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Upload result:', response.data);
  } catch (error) {
    console.error('API Error (uploadCsv):', error);
    throw error;
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
    const response = await client.post<ServiceApiResponse<void>>(config.apiEndpoint, roleData);
    
    console.log('Response status:', response.status);
    console.log('Create result:', response.data);

    if (!response.data.success) {
      throw new Error('Failed to create role');
    }
  } catch (error) {
    console.error('API Error (createRole):', error);
    throw error;
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
    const response = await client.put<ServiceApiResponse<void>>(endpoint, roleData);

    console.log('Response status:', response.status);
    console.log('Update result:', response.data);

    if (!response.data.success) {
      throw new Error('Failed to update role');
    }
  } catch (error) {
    console.error('API Error (updateRole):', error);
    throw error;
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
    const response = await client.put<ServiceApiResponse<void>>(endpoint, {
      functionName,
      functionWritePermissions,
    });

    console.log('Response status:', response.status);
    console.log('Update result:', response.data);

    if (!response.data.success) {
      throw new Error('Failed to update role permissions');
    }
  } catch (error) {
    console.error('API Error (updateRolePermissions):', error);
    throw error;
  }
}

/**
 * CSVファイルをダウンロード
 */
export async function downloadCsv(
  filters?: {
    searchText?: string;
    roleNameFilter?: string;
    ids?: string[];
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
  if (filters?.ids && filters.ids.length > 0) {
    params.ids = filters.ids.join(',');
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
    // AxiosErrorはそのままスロー（エラーコード情報を保持）
    console.error('API Error (downloadCsv):', error);
    throw error;
  }
}
