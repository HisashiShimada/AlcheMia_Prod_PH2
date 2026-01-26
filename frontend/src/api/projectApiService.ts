/**
 * プロジェクト管理API通信サービス
 * 
 * Task 4.1: ファイル一覧・タスク一覧API通信関数の実装
 * Requirements: 4, 9
 */

import axios, { AxiosError } from 'axios';
import type { ProjectFile } from '@/types/file';
import type { Task, TaskStatistics } from '@/types/project';

// API Base URL（環境変数から取得、デフォルトは相対パス）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * ファイル一覧レスポンス型
 */
export interface FileListResponse {
  projectId: string;
  projectName: string;
  files: ProjectFile[];
  archiveFiles: ProjectFile[];
}

/**
 * タスク一覧レスポンス型
 */
export interface TaskListResponse {
  projectId: string;
  projectName: string;
  tasks: Task[];
  statistics: TaskStatistics;
}

/**
 * APIエラーレスポンス型
 */
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Axiosインスタンスの作成
 * - 認証トークンを自動付与（Cookie経由）
 * - タイムアウト設定: 30秒
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30秒
    withCredentials: true, // Cookie送信を有効化（JWT + Session Hybrid認証）
  });

  // リクエストインターセプター
  client.interceptors.request.use(
    (config) => {
      // 認証トークン（Cookie経由で自動送信）
      // JWT + Session Hybrid認証により、組織IDは自動的にセッションから取得される
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // レスポンスインターセプター（エラーハンドリング）
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorResponse>) => {
      // エラーレスポンスの整形
      if (error.response?.data) {
        const apiError = error.response.data;
        // 安全にmessageにアクセス（オプショナルチェーン）
        const errorMessage = apiError.error?.message || 'APIエラーが発生しました';
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
 * プロジェクトに紐づくファイル一覧を取得
 * 
 * @param projectName プロジェクト名
 * @param includeArchive アーカイブファイルを含めるかどうか（デフォルト: false）
 * @returns ファイル一覧とプロジェクト情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 現在のファイルのみ取得
 * const files = await getProjectFiles('sample_project');
 * 
 * // アーカイブファイルも含めて取得
 * const allFiles = await getProjectFiles('sample_project', true);
 * ```
 */
export const getProjectFiles = async (
  projectName: string,
  includeArchive: boolean = false
): Promise<FileListResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectFiles - Frontend call start', { projectName, includeArchive });
    
    const response = await client.get<{
      success: true;
      data: FileListResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/files`, {
      params: {
        include_archive: includeArchive,
      },
    });

    console.log('[DEBUG] getProjectFiles - Response received', {
      status: response.status,
      hasData: !!response.data,
      dataStructure: response.data ? Object.keys(response.data) : []
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] getProjectFiles - Error caught', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};

/**
 * プロジェクトに紐づくタスク一覧と統計情報を取得
 * 
 * @param projectName プロジェクト名
 * @param status タスクステータスフィルタ（デフォルト: 'all'）
 * @returns タスク一覧、統計情報、プロジェクト情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 全タスクを取得
 * const allTasks = await getProjectTasks('sample_project');
 * 
 * // 実行待ちタスクのみ取得
 * const pendingTasks = await getProjectTasks('sample_project', 'pending');
 * 
 * // 実行中タスクのみ取得
 * const inProgressTasks = await getProjectTasks('sample_project', 'in_progress');
 * ```
 */
export const getProjectTasks = async (
  projectName: string,
  status: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' = 'all'
): Promise<TaskListResponse> => {
  const client = createApiClient();

  try {
    const response = await client.get<{
      success: true;
      data: TaskListResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/tasks`, {
      params: {
        status,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('タスク一覧取得APIエラー:', error);
    throw error;
  }
};

/**
 * プロジェクトファイルとタスク情報を同時に取得（最適化された呼び出し）
 * 
 * @param projectName プロジェクト名
 * @param includeArchive アーカイブファイルを含めるかどうか
 * @param taskStatus タスクステータスフィルタ
 * @returns ファイル一覧とタスク一覧
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const { files, tasks } = await getProjectData('sample_project');
 * console.log(`ファイル数: ${files.files.length}, タスク数: ${tasks.tasks.length}`);
 * ```
 */
export const getProjectData = async (
  projectName: string,
  includeArchive: boolean = false,
  taskStatus: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' = 'all'
): Promise<{
  files: FileListResponse;
  tasks: TaskListResponse;
}> => {
  try {
    // 並列実行で両方のAPIを呼び出し
    const [files, tasks] = await Promise.all([
      getProjectFiles(projectName, includeArchive),
      getProjectTasks(projectName, taskStatus),
    ]);

    return { files, tasks };
  } catch (error) {
    console.error('プロジェクトデータ取得エラー:', error);
    throw error;
  }
};