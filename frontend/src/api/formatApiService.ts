/**
 * フォーマット管理API Service
 * 
 * MAIMLワークフローテンプレートとXMLテンプレートファイルの管理機能を提供
 * API設計書: docs/design/api/api_format_management.md
 */

import axios, { AxiosError } from 'axios';

// API Base URL（環境変数から取得、デフォルトは相対パス）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * 統一レスポンス形式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Axiosインスタンスの作成
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
  });

  client.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      if (error.response?.data) {
        const errorMessage = error.response.data.error?.message || 'APIエラーが発生しました';
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error('サーバーに接続できませんでした');
      } else {
        throw new Error('リクエストの送信に失敗しました');
      }
    }
  );

  return client;
};

/**
 * フォーマット情報の型定義
 */
export interface Format {
  format_id: string;
  format_prefix: string;
  file_type: 'maiml' | 'xml';
  description: string;
  subfolder_count: number;
  file_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * フォーマットファイル情報の型定義
 */
export interface FormatFile {
  file_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: 'maiml' | 'xml';
  created_at: string;
  updated_at: string;
}

/**
 * フォーマットフォルダ情報の型定義
 */
export interface FormatFolder {
  subfolder_id: string;
  subfolder_name: string;
  subfolder_path: string;
  file_count: number;
  created_at: string;
}

/**
 * フォーマット一覧レスポンスの型定義
 */
export interface FormatListResponse {
  formats: Format[];
}

/**
 * フォーマットファイル一覧レスポンスの型定義
 */
export interface FormatFileListResponse {
  format_id: string;
  format_prefix: string;
  file_type: 'maiml' | 'xml';
  current_path: string;
  folders: FormatFolder[];
  files: FormatFile[];
}

/**
 * フォーマット一覧を取得
 * GET /api/v1/formats
 * 
 * @param fileType ファイル種別フィルタ（all, maiml, xml）
 * @returns フォーマット一覧
 */
export const getFormats = async (
  fileType: 'all' | 'maiml' | 'xml' = 'all'
): Promise<ApiResponse<FormatListResponse>> => {
  const client = createApiClient();
  
  try {
    console.log('📋 [formatApiService] フォーマット一覧取得');
    
    const response = await client.get<ApiResponse<FormatListResponse>>(
      '/api/v1/formats',
      { params: { file_type: fileType } }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [formatApiService] フォーマット一覧取得エラー:', error);
    throw error;
  }
};

/**
 * フォーマットファイル一覧を取得
 * GET /api/v1/formats/:formatId/files
 * 
 * @param formatId フォーマットID
 * @param subfolderId サブフォルダID（省略時はルート）
 * @returns フォーマットファイル・フォルダ一覧
 */
export const getFormatFiles = async (
  formatId: string,
  subfolderId?: string
): Promise<ApiResponse<FormatFileListResponse>> => {
  const client = createApiClient();
  
  try {
    console.log('📁 [formatApiService] フォーマットファイル一覧取得', { formatId, subfolderId });
    
    const response = await client.get<ApiResponse<FormatFileListResponse>>(
      `/api/v1/formats/${formatId}/files`,
      { params: subfolderId ? { subfolder_id: subfolderId } : {} }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [formatApiService] フォーマットファイル一覧取得エラー:', error);
    throw error;
  }
};

/**
 * フォーマット一覧を取得（モック版）
 * 実際のAPIが未実装の場合に使用
 */
export const getFormatsMock = async (
  fileType: 'all' | 'maiml' | 'xml' = 'all'
): Promise<ApiResponse<FormatListResponse>> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('📋 [formatApiService] フォーマット一覧取得（モック）');
  
  // モックデータ
  const allFormats: Format[] = [
    {
      format_id: 'format-1',
      format_prefix: 'chemistry',
      file_type: 'maiml',
      description: '化学実験用ワークフロー',
      subfolder_count: 2,
      file_count: 5,
      created_at: '2026-01-20T10:00:00Z',
      updated_at: '2026-01-23T14:00:00Z'
    },
    {
      format_id: 'format-2',
      format_prefix: 'materials',
      file_type: 'xml',
      description: '材料テンプレート',
      subfolder_count: 1,
      file_count: 3,
      created_at: '2026-01-20T11:00:00Z',
      updated_at: '2026-01-22T15:00:00Z'
    },
    {
      format_id: 'format-3',
      format_prefix: 'biology',
      file_type: 'maiml',
      description: '生物学実験用ワークフロー',
      subfolder_count: 0,
      file_count: 2,
      created_at: '2026-01-21T09:00:00Z',
      updated_at: '2026-01-23T13:00:00Z'
    }
  ];
  
  // ファイルタイプでフィルタリング
  const filteredFormats = fileType === 'all' 
    ? allFormats 
    : allFormats.filter(f => f.file_type === fileType);
  
  return {
    success: true,
    data: {
      formats: filteredFormats
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
};

/**
 * フォーマットファイル一覧を取得（モック版）
 * 実際のAPIが未実装の場合に使用
 */
export const getFormatFilesMock = async (
  formatId: string,
  subfolderId?: string
): Promise<ApiResponse<FormatFileListResponse>> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('📁 [formatApiService] フォーマットファイル一覧取得（モック）', { formatId, subfolderId });
  
  // モックデータ
  return {
    success: true,
    data: {
      format_id: formatId,
      format_prefix: 'chemistry',
      file_type: 'maiml',
      current_path: subfolderId ? 'chemistry/synthesis' : 'chemistry',
      folders: subfolderId ? [] : [
        {
          subfolder_id: 'subfolder-1',
          subfolder_name: 'synthesis',
          subfolder_path: 'chemistry/synthesis',
          file_count: 3,
          created_at: '2026-01-20T10:00:00Z'
        },
        {
          subfolder_id: 'subfolder-2',
          subfolder_name: 'analysis',
          subfolder_path: 'chemistry/analysis',
          file_count: 2,
          created_at: '2026-01-20T11:00:00Z'
        }
      ],
      files: [
        {
          file_id: 'file-1',
          file_name: 'workflow.maiml',
          file_path: 'org_maiml_lab_001/formats/chemistry/workflow.maiml',
          file_size: 12345,
          file_type: 'maiml',
          created_at: '2026-01-20T10:00:00Z',
          updated_at: '2026-01-23T14:00:00Z'
        }
      ]
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
};