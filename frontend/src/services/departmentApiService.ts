/**
 * 部署管理API通信サービス
 * 
 * 部署管理のCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import { getDepartmentConfig } from '@/types/departmentTypes';
import type { DepartmentRecord, MasterRecord, CsvUploadResult } from '@/types/departmentTypes';
import type { ApiResponse } from '@/types/api';

/**
 * 部署新規作成 API リクエストの型（camelCase）
 * バックエンドの departmentRoutes.ts バリデーション（body('departmentCd') 等）に合わせた型定義
 */
export interface CreateDepartmentRequest {
  departmentCd: string;
  departmentName: string;
  isActive?: boolean;
}

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
    console.error('API Error (fetchMasters):', error);
    throw error;
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
    console.error('API Error (createMaster):', error);
    throw error;
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
    console.error('API Error (updateMaster):', error);
    throw error;
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
    console.error('API Error (updateMasterStatus):', error);
    throw error;
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
    const response = await client.post<ApiResponse<CsvUploadResult>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Upload result:', response.data);
    
    // バリデーションエラーのチェック（HTTPステータス200でもエラーの場合がある）
    if (response.data.success && response.data.data) {
      const result = response.data.data;
      
      if (result.failureCount > 0 && result.errors.length > 0) {
        // エラーがある場合はメッセージを表示
        const errorMessage = result.errors[0].message;
        console.error('CSV validation error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // 成功時はログ出力のみ
      console.log(`CSV upload successful: ${result.successCount} records created`);
    }
  } catch (error) {
    // すでにErrorオブジェクトの場合はそのまま再スロー（バリデーションエラー）
    if (error instanceof Error && !('isAxiosError' in error)) {
      throw error;
    }
    // AxiosErrorはそのままスロー（エラーコード情報を保持）
    console.error('API Error (uploadCsv):', error);
    throw error;
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
    console.log('Response headers:', response.headers);
    
    // レスポンスをBlobとして取得
    const blob = new Blob([response.data], { type: 'text/csv' });
    
    // Content-Dispositionヘッダーからファイル名を取得（大文字小文字を考慮）
    const contentDisposition = 
      response.headers['content-disposition'] || 
      response.headers['Content-Disposition'];
    
    console.log('Content-Disposition header:', contentDisposition);
    
    let filename = 'departments.csv'; // デフォルト値
    
    if (contentDisposition) {
      // filename="..." または filename=... の両方に対応
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        // クォートを除去
        filename = filenameMatch[1].replace(/['"]/g, '');
        console.log('Extracted filename from Content-Disposition:', filename);
      } else {
        console.warn('Content-Disposition header exists but filename not found');
      }
    } else {
      // Content-Dispositionヘッダーがない場合は、フロントエンド側でタイムスタンプを生成
      console.warn('Content-Disposition header not found, generating timestamp on frontend');
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '')
        .slice(0, 14);
      filename = `departments_${timestamp}.csv`;
      console.log('Generated filename:', filename);
    }
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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
