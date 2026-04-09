/**
 * マスタ管理API通信サービス
 * 
 * マスタのCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import type { MasterDataType, MasterDataConfig } from '@/types/masterDataTypes';
import { getMasterDataConfig } from '@/types/masterDataTypes';
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
 * マスタレコード共通基底型（インデックスシグネチャ付き）
 */
export interface BaseMasterRecord {
  // 共通フィールド
  organizationId: string;
  corporationId: string;
  isActive: boolean;
  createUserId: string;
  updateUserId: string;
  createdAt: string;  // ISO 8601形式の文字列
  updatedAt: string;  // ISO 8601形式の文字列
  
  // 動的プロパティアクセス用のインデックスシグネチャ
  [key: string]: unknown;
}

/**
 * Creatorマスタのレコード型
 */
export interface CreatorRecord extends BaseMasterRecord {
  // Creator固有フィールド
  creatorId: string;
  creatorUuid: string;
  creatorName: string;
  creatorDescription: string;
  creatorAnnotation: string;
  vendorName?: string;      // JOIN時に含まれる（オプショナル）
  instrumentName?: string;  // JOIN時に含まれる（オプショナル）
  vendorIsActive?: boolean; // JOIN時のVendorのアクティブ状態（オプショナル）
  instrumentIsActive?: boolean; // JOIN時のInstrumentのアクティブ状態（オプショナル）
}

/**
 * Instrumentマスタのレコード型
 */
export interface InstrumentRecord extends BaseMasterRecord {
  // Instrument固有フィールド
  instrumentId: string;
  instrumentUuid: string;
  instrumentName: string;
  instrumentDescription: string;
  instrumentAnnotation: string;
}

/**
 * Vendorマスタのレコード型
 */
export interface VendorRecord extends BaseMasterRecord {
  // Vendor固有フィールド
  vendorId: string;
  vendorUuid: string;
  vendorName: string;
  vendorDescription: string;
  vendorAnnotation: string;
}

/**
 * Attributeマスタのレコード型
 * 主キー: (organization_id, attribute_name, attribute_value)
 */
export interface AttributeRecord extends BaseMasterRecord {
  // Attribute固有フィールド（attributeIdは廃止済み）
  attributeName: string;
  attributeValue: string;
  attributeRemark?: string;  // 属性_備考（nullable）
  departmentCd: string;
  departmentName: string;
}

/**
 * マスタデータの汎用型（Union型）
 */
export type MasterRecord = CreatorRecord | InstrumentRecord | VendorRecord | AttributeRecord;

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
): Promise<MasterRecord[]> {
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
    const response = await client.get<ApiResponse<MasterRecord[]>>(config.apiEndpoint, {
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
    const axiosError = error as AxiosError<ApiResponse<MasterRecord[]>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * マスタを新規作成
 */
export async function createMaster(
  type: MasterDataType,
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getMasterDataConfig(type);
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
 * マスタを更新
 */
export async function updateMaster(
  type: MasterDataType,
  id: string,
  data: MasterRecord
): Promise<MasterRecord> {
  const config = getMasterDataConfig(type);
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
    const axiosError = error as AxiosError<ApiResponse<void>>;
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
