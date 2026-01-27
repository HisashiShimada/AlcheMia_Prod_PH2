/**
 * プロジェクト管理API通信サービス
 * 
 * Task 4.1: ファイル一覧・タスク一覧API通信関数の実装
 * Requirements: 4, 9
 */

import axios, { AxiosError } from 'axios';
import type { ProjectFile } from '@/types/file';
import type { Task, TaskStatistics, Project } from '@/types/project';

// API Base URL（環境変数から取得、デフォルトは相対パス）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * プロジェクト一覧レスポンス型
 * バックエンドの実際のレスポンス構造に合わせる
 */
export interface ProjectListResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

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
 * プロジェクト作成リクエスト型
 */
export interface CreateProjectRequest {
  projectName: string;
  description?: string;
}

/**
 * プロジェクト作成レスポンス型
 */
export interface CreateProjectResponse {
  projectId: string;
  projectName: string;
  description: string;
  status: string;
  organizationId: string;
  departmentId: string;
  createdBy: string;
  createdAt: string;
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
 * セッショントークンを取得
 * Cookie優先（Cookie名: maiml_session）、なければLocalStorageから取得
 */
const getSessionToken = (): string | null => {
  // ブラウザ環境でない場合（SSR時）はnullを返す
  if (typeof window === 'undefined') {
    return null;
  }

  // Cookieから取得を試みる（Cookie名: maiml_session）
  const cookies = document.cookie.split(';');
  const sessionCookie = cookies.find(c => c.trim().startsWith('maiml_session='));
  if (sessionCookie) {
    return sessionCookie.split('=')[1];
  }
  
  // フォールバック: LocalStorageから取得
  try {
    return sessionStorage.getItem('sessionToken');
  } catch (error) {
    console.error('Failed to get sessionToken from localStorage:', error);
    return null;
  }
};

/**
 * Axiosインスタンスの作成
 * - 認証トークンを自動付与（Cookie or LocalStorage経由）
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
      // セッショントークンを取得
      const sessionToken = getSessionToken();

      // Authorizationヘッダーを追加
      if (sessionToken) {
        config.headers['Authorization'] = `Bearer ${sessionToken}`;
      }

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
 * プロジェクト一覧APIレスポンス型
 * バックエンドの実際のレスポンス: data に直接プロジェクト配列、paginationは別プロパティ
 */
interface ProjectListApiResponse {
  success: boolean;
  data: Project[];  // プロジェクト配列が直接
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * プロジェクト一覧を取得
 * GET /api/v1/projects
 * 
 * @param status プロジェクトステータスフィルタ（省略可）
 * @param page ページ番号（デフォルト: 1）
 * @param limit 1ページあたりの件数（デフォルト: 20）
 * @returns プロジェクト一覧とページネーション情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 全プロジェクトを取得
 * const result = await getProjects();
 * console.log(result.data.projects); // プロジェクト配列
 * 
 * // アクティブなプロジェクトのみ取得
 * const activeProjects = await getProjects('active');
 * ```
 */
export const getProjects = async (
  status?: 'active' | 'archived' | 'all',
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<ProjectListResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjects - Frontend call start', { status, page, limit });
    
    const params: Record<string, string | number> = { page, limit };
    if (status && status !== 'all') {
      params.status = status;
    }
    
    // バックエンドの実際のレスポンス型を使用
    const response = await client.get<ProjectListApiResponse>(
      '/projects',
      { params }
    );

    console.log('[DEBUG] getProjects - Response received', {
      status: response.status,
      projectCount: response.data.data.length,
      totalItems: response.data.pagination.totalItems,
      totalPages: response.data.pagination.totalPages,
      currentPage: response.data.pagination.page
    });
    
    // フロントエンドの期待する形式に変換
    return {
      success: response.data.success,
      data: {
        projects: response.data.data,
        pagination: response.data.pagination
      },
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] getProjects - Error caught', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};

/**
 * プロジェクトを作成
 * 
 * @param request プロジェクト作成リクエスト
 * @returns 作成されたプロジェクト情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const newProject = await createProject({
 *   projectName: 'My New Project',
 *   description: 'This is a sample project',
 * });
 * console.log('Created project:', newProject.projectId);
 * ```
 */
export const createProject = async (
  request: CreateProjectRequest
): Promise<CreateProjectResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] createProject - Request', { request });
    
    const response = await client.post<{
      success: true;
      data: CreateProjectResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/projects', request);

    console.log('[DEBUG] createProject - Success', {
      projectId: response.data.data.projectId,
      projectName: response.data.data.projectName,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] createProject - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
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