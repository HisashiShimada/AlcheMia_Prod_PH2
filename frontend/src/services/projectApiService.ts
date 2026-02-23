/**
 * プロジェクト管理API通信サービス
 * 
 * Task 4.1: ファイル一覧・タスク一覧API通信関数の実装
 * Requirements: 4, 9
 */

import { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import type { ProjectFile } from '@/types/file';
import type { Task, TaskStatistics, Project } from '@/types/project';

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
 * 実験作業者用プロジェクト型
 * APIレスポンス: GET /api/v1/projects/worker-accessible
 */
export interface WorkerProject {
  projectId: string;           // プロジェクトID（UUID）
  projectName: string;         // プロジェクト名
  projectCd?: string;          // プロジェクトCD（APIレスポンスに含まれない場合がある）
  projectStatus: string;       // プロジェクトステータス（"in_progress", "review_waiting", "approved"）
  description: string;         // プロジェクトの説明
  createdAt: string;           // 作成日時（ISO 8601）
  updatedAt: string;           // 更新日時（ISO 8601）
}

/**
 * 実験作業者用プロジェクト一覧レスポンス型
 */
export interface WorkerProjectListResponse {
  projects: WorkerProject[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * 承認依頼レスポンス型
 */
export interface ApprovalRequestResponse {
  project_id: string;
  project_name: string;
  status: 2;  // 承認待ち
  update_at: string;
}

/**
 * 実験作業者用タスク一覧レスポンス型
 * API: GET /api/v1/progress/projects/:projectName/worker-tasks
 */
export interface WorkerTasksResponse {
  project_id: string;
  project_name: string;
  methods: WorkerMethod[];
}

/**
 * 実験作業者用メソッド型
 */
export interface WorkerMethod {
  method_id: string;
  method_name: string;
  experiment_order: number;
  tasks: WorkerTask[];
}

/**
 * 実験作業者用タスク型
 */
export interface WorkerTask {
  task_no: number;
  task_status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'forced_terminated';
  experiment_user_id: string;
  experiment_user_name: string;
  created_at: string;
  updated_at: string;
  progress: number;
  progress_rate: string;  // APIレスポンスでは文字列型（例: "50.0000000000000000"）
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

/**
 * 実験作業者がアクセス可能なプロジェクト一覧を取得
 * GET /api/v1/projects/worker-accessible
 * 
 * @param page ページ番号（デフォルト: 1）
 * @param limit 1ページあたりの件数（デフォルト: 100）
 * @param status ステータスフィルタ（省略可）
 * @param sortBy ソート項目（デフォルト: 'project_name'）
 * @param order ソート順（デフォルト: 'asc'）
 * @returns 実験作業者用プロジェクト一覧とページネーション情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 全プロジェクトを取得
 * const result = await getWorkerAccessibleProjects();
 * console.log(result.data.projects);
 * 
 * // 作業中プロジェクトのみ取得
 * const activeProjects = await getWorkerAccessibleProjects(1, 100, '1');
 * ```
 */
export const getWorkerAccessibleProjects = async (
  page: number = 1,
  limit: number = 100,
  status?: '1' | '2' | '3',
  sortBy: 'create_at' | 'project_name' | 'update_at' = 'project_name',
  order: 'asc' | 'desc' = 'asc'
): Promise<ApiResponse<WorkerProjectListResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getWorkerAccessibleProjects - Start', { page, limit, status, sortBy, order });
    
    const params: Record<string, string | number> = { 
      page, 
      limit,
      sort_by: sortBy,
      order
    };
    
    if (status) {
      params.status = status;
    }
    
    const response = await client.get<{
      success: boolean;
      data: WorkerProject[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/projects/worker-accessible', { params });

    console.log('[DEBUG] getWorkerAccessibleProjects - Success', {
      projectCount: response.data.data.length,
      totalItems: response.data.pagination.totalItems
    });
    
    return {
      success: response.data.success,
      data: {
        projects: response.data.data,
        pagination: response.data.pagination
      },
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] getWorkerAccessibleProjects - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data
    });
    throw error;
  }
};

/**
 * 承認依頼を送信
 * PATCH /api/v1/projects/:projectName/approval-request
 * 
 * @param projectName プロジェクト名
 * @param comment コメント（任意、最大1000文字）
 * @returns 更新されたプロジェクト情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // コメントなしで承認依頼
 * await requestApproval('sample_project');
 * 
 * // コメント付きで承認依頼
 * await requestApproval('sample_project', '実験作業が完了しました。ご確認をお願いします。');
 * ```
 */
export const requestApproval = async (
  projectName: string,
  comment?: string
): Promise<ApiResponse<ApprovalRequestResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] requestApproval - Start', { projectName, hasComment: !!comment });
    
    const requestBody: { comment?: string } = {};
    if (comment) {
      requestBody.comment = comment;
    }
    
    const response = await client.patch<{
      success: boolean;
      data: ApprovalRequestResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/approval-request`, requestBody);

    console.log('[DEBUG] requestApproval - Success', {
      projectId: response.data.data.project_id,
      status: response.data.data.status
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] requestApproval - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};

/**
 * 実験作業者用タスク一覧を取得
 * GET /api/v1/progress/projects/:projectName/worker-tasks
 * 
 * @param projectName プロジェクト名
 * @param filters フィルター条件（オプション）
 * @returns タスク一覧（メソッド単位でグループ化）
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 全タスクを取得
 * const result = await getWorkerTasks('sample_project');
 * console.log(result.data.methods); // メソッド配列
 * 
 * // ステータスフィルタ付きで取得
 * const inProgressTasks = await getWorkerTasks('sample_project', { status: 'in_progress' });
 * ```
 */
export const getWorkerTasks = async (
  projectName: string,
  filters?: {
    status?: string;
    assignedTo?: string;
    sortBy?: 'task_no' | 'created_at' | 'updated_at' | 'status';
    order?: 'asc' | 'desc';
  }
): Promise<ApiResponse<WorkerTasksResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getWorkerTasks - Start', { projectName, filters });
    
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.order) params.order = filters.order;
    
    const response = await client.get<{
      success: boolean;
      data: WorkerTasksResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/progress/projects/${encodeURIComponent(projectName)}/worker-tasks`, {
      params
    });

    console.log('[DEBUG] getWorkerTasks - Success', {
      methodCount: response.data.data.methods.length,
      totalTasks: response.data.data.methods.reduce((sum, m) => sum + m.tasks.length, 0)
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] getWorkerTasks - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};
