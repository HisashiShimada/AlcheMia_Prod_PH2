/**
 * フォーマット管理API Service
 * 
 * MAIMLワークフローテンプレートとXMLテンプレートファイルの管理機能を提供
 * API設計書: docs/design/api/api_format_management.md
 * 
 * @remarks
 * utils/formatApi.ts から services/ へ統合済み（2026-05-12）
 */

import type { ApiResponse } from '@/types/api';
import type {
  FormatListResponse,
  CreateFormatFileRequest,
  CreateFormatFileResponse,
} from '@/types/format';
import { getTranslation } from '@/contexts/LanguageContext';
import { createApiClient } from '@/utils/authUtils';

/**
 * フォーマット一覧を取得
 * GET /api/v1/formats
 *
 * @param organizationGroupCd - 組織グループCD（省略時はバックエンドがユーザー所属の先頭グループを使用）
 */
export async function getFormats(organizationGroupCd?: string): Promise<ApiResponse<FormatListResponse>> {
  const client = createApiClient();

  try {
    const queryParams = organizationGroupCd
      ? `?organizationGroupCd=${encodeURIComponent(organizationGroupCd)}`
      : '';
    const response = await client.get<ApiResponse<FormatListResponse>>(
      `/formats${queryParams}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || getTranslation('formatApi.getFormatsError')
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
  const client = createApiClient();

  try {
    const queryParams = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
    const response = await client.get<ApiResponse<{ files: unknown[] }>>(
      `/formats/${folderName}/files${queryParams}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || getTranslation('formatApi.getFormatFilesError')
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
 * @param organizationGroupCd - 組織グループCD（省略時はバックエンドがユーザー所属の先頭グループを使用）
 */
export async function createFormatSubfolder(
  formatName: string,
  subfolderName: string,
  parentPath?: string,
  organizationGroupCd?: string
): Promise<ApiResponse<{
  folder_name: string;
  folder_path: string;
  full_swift_path: string;
  created_at: string;
}>> {
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
        ...(organizationGroupCd ? { organizationGroupCd } : {}),
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || getTranslation('formatApi.createSubfolderError')
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
 * @param organizationGroupCd - 組織グループCD（省略時はバックエンドがユーザー所属の先頭グループを使用）
 */
export async function createFormatFile(
  folderName: string,
  data: CreateFormatFileRequest,
  organizationGroupCd?: string
): Promise<ApiResponse<CreateFormatFileResponse>> {
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<CreateFormatFileResponse>>(
      `/formats/${folderName}/files`,
      { ...data, ...(organizationGroupCd ? { organizationGroupCd } : {}) }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || getTranslation('formatApi.createFileError')
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatFile error:', error);
    throw error;
  }
}

/**
 * フォーマットフォルダを作成（組織グループ直下）
 * POST /api/v1/formats/folders
 * 
 * @param folderName - フォルダ名
 * @param organizationGroupCd - 組織グループCD（省略時はバックエンドがユーザー所属の先頭グループを使用）
 */
export async function createFormatFolder(
  folderName: string,
  organizationGroupCd?: string
): Promise<ApiResponse<{
  folder_name: string;
  folder_path: string;
  organization_group_cd: string;
  created_at: string;
}>> {
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{
      folder_name: string;
      folder_path: string;
      organization_group_cd: string;
      created_at: string;
    }>>(
      '/formats/folders',
      { folderName, ...(organizationGroupCd ? { organizationGroupCd } : {}) }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || getTranslation('formatApi.createFolderError')
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatFolder error:', error);
    throw error;
  }
}

/**
 * フォーマットファイルの内容を更新
 * PUT /api/v1/formats/files
 * 
 * @param filePath - ファイルパス
 * @param content - ファイル内容
 */
export async function updateFormatFileContent(
  filePath: string,
  content: string
): Promise<ApiResponse<{ message: string }>> {
  const client = createApiClient();

  try {
    const response = await client.put<ApiResponse<{ message: string }>>(
      '/formats/files',
      {
        content,
        filePath,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || getTranslation('formatApi.updateFileError')
      );
    }

    return response.data;
  } catch (error) {
    console.error('updateFormatFileContent error:', error);
    throw error;
  }
}

/**
 * 互換性のためのエイリアス
 */
export const fetchFormats = getFormats;
export const fetchFormatFiles = getFormatFiles;
