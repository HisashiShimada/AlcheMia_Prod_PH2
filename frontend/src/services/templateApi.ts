/**
 * Template API Service
 *
 * テンプレートファイルの取得・操作を行うAPIサービス
 *
 * @version 2.0.0
 * @date 2026-03-07
 * @updated 呼び出し先を /api/v1/maiml/formats および /api/v1/maiml/file-content に変更
 */

import { createApiClient } from '@/utils/authUtils';

// ========== 型定義 ==========

import type {
  FormatTemplateFile,
  FormatFolder,
  FormatOrganizationGroup,
  ListFormatsResponse,
} from '@/types/format';

// ========== API 関数 ==========

/**
 * フォーマットテンプレートファイル一覧を取得
 *
 * formats/ 配下を全部門横断で走査し、material/ condition/ result/ 配下の
 * .xml ファイルのみを階層構造で返す。
 *
 * @returns 部門 → フォルダ → ファイルの階層構造
 */
export const fetchTemplateFiles = async (): Promise<ListFormatsResponse> => {
  const client = createApiClient();

  try {
    const response = await client.get<{ success: boolean; data: ListFormatsResponse }>(
      '/maiml/formats'
    );

    return response.data.data || { organizationGroups: [] };
  } catch (error) {
    console.error('Failed to fetch template files:', error);
    throw new Error('テンプレートファイル一覧の取得に失敗しました');
  }
};

/**
 * テンプレートファイルの内容を取得
 *
 * S3フルキー（組織ID付き）を指定して、ファイル内容を取得する。
 *
 * @param fileKey S3フルキー（例: {organizationId}/formats/dept_001/material/template1.xml）
 * @returns XML文字列
 */
export const fetchTemplateContent = async (fileKey: string): Promise<string> => {
  const client = createApiClient();

  try {
    const response = await client.get<{
      success: boolean;
      data: { data: { content: string } };
    }>('/maiml/file-content', {
      params: { key: fileKey },
    });

    // レスポンス構造: { success, data: { data: { content, fileKey, ... } } }
    return response.data.data?.data?.content ?? '';
  } catch (error) {
    console.error('Failed to fetch template content:', error);
    throw new Error('テンプレートファイルの取得に失敗しました');
  }
};
