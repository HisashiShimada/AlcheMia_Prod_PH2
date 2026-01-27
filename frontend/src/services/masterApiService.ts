/**
 * マスタ管理API通信サービス
 * 
 * マスタのCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { getOrganizationId } from '@/utils/sessionStorageHelper';
import type { MasterType, MasterConfig } from '@/config/masterConfig';
import { getMasterConfigByType } from '@/config/masterConfig';

/**
 * API基本URL
 */
const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

/**
 * APIリクエストヘッダー
 */
const getHeaders = (organizationId?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }
  
  return headers;
};

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
 * マスタデータの汎用型
 */
export type MasterRecord = Record<string, unknown>;

/**
 * マスタ一覧を取得
 */
export async function fetchMasters(
  type: MasterType
): Promise<MasterRecord[]> {
  const config = getMasterConfigByType(type);
  const apiUrl = getApiUrl();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    throw new Error('組織IDが取得できません');
  }
  
  const endpoint = `${apiUrl}${config.apiEndpoint}`;
  
  console.log(`=== Fetching ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(organizationId),
    credentials: 'include',
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  const result: ApiResponse<MasterRecord[]> = await response.json();
  console.log('API Response:', result);
  
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  } else {
    throw new Error('Invalid API response format');
  }
}

/**
 * マスタを新規作成
 */
export async function createMaster(
  type: MasterType,
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getMasterConfigByType(type);
  const apiUrl = getApiUrl();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    throw new Error('組織IDが取得できません');
  }
  
  const endpoint = `${apiUrl}${config.apiEndpoint}`;
  
  console.log(`=== Creating ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(organizationId),
    credentials: 'include', // JWTトークン（Cookie）を送信
    body: JSON.stringify(data),
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('入力されたIDは既に存在しています');
    }
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  const result: ApiResponse<MasterRecord> = await response.json();
  
  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error('Invalid API response format');
  }
}

/**
 * マスタを更新
 */
export async function updateMaster(
  type: MasterType,
  id: string,
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getMasterConfigByType(type);
  const apiUrl = getApiUrl();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    throw new Error('組織IDが取得できません');
  }
  
  const endpoint = `${apiUrl}${config.apiEndpoint}/${id}`;
  
  console.log(`=== Updating ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: getHeaders(organizationId),
    credentials: 'include', // JWTトークン（Cookie）を送信
    body: JSON.stringify(data),
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  const result: ApiResponse<MasterRecord> = await response.json();
  
  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error('Invalid API response format');
  }
}

/**
 * マスタのステータスを更新（アクティブ/非アクティブ）
 */
export async function updateMasterStatus(
  type: MasterType,
  id: string,
  isActive: boolean
): Promise<void> {
  const config = getMasterConfigByType(type);
  const apiUrl = getApiUrl();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    throw new Error('組織IDが取得できません');
  }
  
  const endpoint = `${apiUrl}${config.apiEndpoint}/${id}/status`;
  
  console.log(`=== Updating ${config.displayName} Status ===`);
  console.log('Endpoint:', endpoint);
  console.log('isActive:', isActive);
  
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getHeaders(organizationId),
    credentials: 'include', // JWTトークン（Cookie）を送信
    body: JSON.stringify({ isActive }),
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
}

/**
 * マスタを一括でステータス更新
 */
export async function batchUpdateMasterStatus(
  type: MasterType,
  ids: string[],
  isActive: boolean
): Promise<void> {
  const config = getMasterConfigByType(type);
  
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
  type: MasterType,
  file: File
): Promise<void> {
  const config = getMasterConfigByType(type);
  
  if (!config.supportsCsvUpload) {
    throw new Error(`${config.displayName}はCSVアップロードに対応していません`);
  }
  
  const apiUrl = getApiUrl();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    throw new Error('組織IDが取得できません');
  }
  
  const endpoint = `${apiUrl}${config.apiEndpoint}/upload-csv`;
  
  console.log(`=== Uploading CSV to ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('File:', file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Organization-Id': organizationId,
    },
    credentials: 'include', // JWTトークン（Cookie）を送信
    body: formData,
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error?.message || 'CSVアップロードに失敗しました';
    throw new Error(errorMessage);
  }
  
  const result: ApiResponse<unknown> = await response.json();
  console.log('Upload result:', result);
}

/**
 * CSVファイルをダウンロード
 */
export async function downloadCsv(
  type: MasterType,
  filters?: {
    search?: string;
    displayScope?: string;
    fixedFilters?: Record<string, string>;
  }
): Promise<void> {
  const config = getMasterConfigByType(type);
  
  if (!config.supportsCsvDownload) {
    throw new Error(`${config.displayName}はCSVダウンロードに対応していません`);
  }
  
  const apiUrl = getApiUrl();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    throw new Error('組織IDが取得できません');
  }
  
  // クエリパラメータを構築
  const params = new URLSearchParams();
  if (filters?.search?.trim()) {
    params.append('search', filters.search.trim());
  }
  if (filters?.displayScope && filters.displayScope !== 'all') {
    params.append('display_scope', filters.displayScope);
  }
  if (filters?.fixedFilters) {
    Object.entries(filters.fixedFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
  }
  
  const queryString = params.toString();
  const endpoint = `${apiUrl}${config.apiEndpoint}/download-csv${queryString ? `?${queryString}` : ''}`;
  
  console.log(`=== Downloading CSV from ${config.displayName} ===`);
  console.log('Endpoint:', endpoint);
  console.log('Filters:', filters);
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Organization-Id': organizationId,
      'Authorization': 'Bearer dummy-token-for-development',
    },
    credentials: 'include',
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`CSVダウンロードに失敗しました: ${response.status} - ${errorText}`);
  }
  
  // レスポンスをBlobとして取得
  const blob = await response.blob();
  
  // ダウンロードリンクを作成
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${config.type}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}