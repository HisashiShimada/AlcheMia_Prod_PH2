/**
 * Template API Service
 * 
 * テンプレートファイルの取得・操作を行うAPIサービス
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import { createApiClient } from '@/utils/authUtils';

/**
 * テンプレートファイル型定義
 */
export interface TemplateFile {
  fileName: string;
  filePath: string;
  category: 'material' | 'condition' | 'result';
  size: number;
  lastModified: string;
  description?: string;
}

/**
 * テンプレートコンテンツ取得レスポンス
 */
export interface TemplateContentResponse {
  filePath: string;
  content: string;
  contentType: string;
}

/**
 * テンプレートファイル一覧を取得
 * 
 * @param organizationId 組織ID（必須）
 * @param category テンプレートカテゴリ
 * @returns テンプレートファイル一覧
 */
export const fetchTemplateFiles = async (
  organizationId: string,
  category: 'material' | 'condition' | 'result'
): Promise<TemplateFile[]> => {
  const client = createApiClient();
  
  try {
    const response = await client.get<{ success: boolean; data: TemplateFile[] }>(
      '/api/v1/templates/list',
      {
        params: {
          organization_id: organizationId,
          category: category
        },
        headers: {
          'X-Organization-Id': organizationId
        }
      }
    );
    
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch template files:', error);
    throw new Error('テンプレートファイル一覧の取得に失敗しました');
  }
};

/**
 * テンプレートファイルの内容を取得
 * 
 * @param organizationId 組織ID（必須）
 * @param filePath ファイルパス
 * @returns テンプレートコンテンツ（XML文字列）
 */
export const fetchTemplateContent = async (
  organizationId: string,
  filePath: string
): Promise<string> => {
  const client = createApiClient();
  
  try {
    const response = await client.get<{ success: boolean; data: TemplateContentResponse }>(
      '/api/v1/templates/content',
      {
        params: {
          organization_id: organizationId,
          file_path: filePath
        },
        headers: {
          'X-Organization-Id': organizationId
        }
      }
    );
    
    return response.data.data.content;
  } catch (error) {
    console.error('Failed to fetch template content:', error);
    throw new Error('テンプレートファイルの取得に失敗しました');
  }
};

/**
 * S3署名付きURLを取得してファイルを直接取得
 * 
 * @param organizationId 組織ID（必須）
 * @param filePath ファイルパス
 * @returns 署名付きURL
 */
export const getTemplateSignedUrl = async (
  organizationId: string,
  filePath: string
): Promise<string> => {
  const client = createApiClient();
  
  try {
    const response = await client.get<{ success: boolean; data: { url: string } }>(
      '/api/v1/templates/signed-url',
      {
        params: {
          organization_id: organizationId,
          file_path: filePath
        },
        headers: {
          'X-Organization-Id': organizationId
        }
      }
    );
    
    return response.data.data.url;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    throw new Error('署名付きURLの取得に失敗しました');
  }
};