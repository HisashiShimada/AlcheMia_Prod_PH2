/**
 * フォーマット管理API
 * 
 * フォーマット管理画面で使用する実API呼び出しを提供します。
 * このファイルはモックではなく、実際のバックエンドAPIと通信します。
 */

import type { ApiResponse } from '@/types/api';
import type { 
  FormatListResponse,
  CreateFormatFileRequest,
  CreateFormatFileResponse,
} from '@/types/format';

/**
 * フォーマット一覧を取得
 * GET /api/v1/formats
 */
export async function getFormats(): Promise<ApiResponse<FormatListResponse>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const response = await client.get<ApiResponse<FormatListResponse>>(
      '/formats'
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'フォーマット一覧の取得に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('getFormats error:', error);
    throw error;
  }
}

/**
 * フォーマットファイル一覧を取得
 * GET /api/v1/formats/:folderName/files
 * 
 * @param folderName - フォルダ名
 * @param subPath - サブパス（オプション）
 */
export async function getFormatFiles(
  folderName: string,
  subPath?: string
): Promise<ApiResponse<{ files: unknown[] }>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const queryParams = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
    const response = await client.get<ApiResponse<{ files: unknown[] }>>(
      `/formats/${folderName}/files${queryParams}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'ファイル一覧の取得に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('getFormatFiles error:', error);
    throw error;
  }
}

/**
 * フォーマット内にサブフォルダを作成
 * POST /api/v1/formats/subfolders
 * 
 * @param formatName - フォーマット名（例: chemistry, materials）
 * @param subfolderName - サブフォルダ名（1-255文字、英数字・アンダースコア・ハイフン）
 * @param parentPath - 親フォルダのパス（オプション、空文字列=ルート直下）
 */
export async function createFormatSubfolder(
  formatName: string,
  subfolderName: string,
  parentPath?: string
): Promise<ApiResponse<{
  folder_name: string;
  folder_path: string;
  full_swift_path: string;
  created_at: string;
}>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{
      folder_name: string;
      folder_path: string;
      full_swift_path: string;
      created_at: string;
    }>>(
      '/formats/subfolders',
      {
        formatName,
        subfolderName,
        parentPath: parentPath || '',
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'サブフォルダの作成に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatSubfolder error:', error);
    throw error;
  }
}

/**
 * フォーマットファイルを作成
 * POST /api/v1/formats/:folderName/files
 * 
 * @param folderName - フォーマットフォルダ名（例: chemistry）
 * @param data - ファイル作成データ
 */
export async function createFormatFile(
  folderName: string,
  data: CreateFormatFileRequest
): Promise<ApiResponse<CreateFormatFileResponse>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<CreateFormatFileResponse>>(
      `/formats/${folderName}/files`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'ファイルの作成に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatFile error:', error);
    throw error;
  }
}

/**
 * フォーマットフォルダを作成（部門直下）
 * POST /api/v1/formats/folders
 * 
 * @param folderName - フォルダ名
 */
export async function createFormatFolder(
  folderName: string
): Promise<ApiResponse<{
  folder_name: string;
  folder_path: string;
  department_cd: string;
  created_at: string;
}>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{
      folder_name: string;
      folder_path: string;
      department_cd: string;
      created_at: string;
    }>>(
      '/formats/folders',
      { folderName }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'フォルダの作成に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatFolder error:', error);
    throw error;
  }
}

/**
 * 互換性のためのエイリアス
 * apiClient.ts からの移行をスムーズにするため
 */
export const fetchFormats = getFormats;
export const fetchFormatFiles = getFormatFiles;
