/**
 * プロジェクト管理API通信サービス
 * 
 * Task 4.1: ファイル一覧・タスク一覧API通信関数の実装
 * Requirements: 4, 9
 */

import { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import type { ProjectFile } from '@/types/file';
import type {
  UpdateTransitionStatusRequest,
  UpdateTransitionStatusResponse,
  SaveTransitionCommentRequest,
  SaveTransitionCommentResponse,
  TransitionStateRecordsResult,
} from '@/types/api';
import type {
  Task,
  TaskStatistics,
  Project,
  CreateProjectRequest,
  CreateProjectResponse,
  WorkerProject,
  WorkerProjectListResponse,
  WorkerTasksResponse,
  WorkerMethod,
  WorkerTask,
  TaskStatusUpdateResponse,
  WorkerInstruction,
  InstructionConfirmationData,
  ApprovalRequestResponse,
  ProjectFileListResponse,
  ProjectDetailApiResponse,
  PublishStatusResponse,
  CheckoutResponse,
  PublishJobResponse,
  ProjectMaimlResponse,
  DeleteProjectResponse,
} from '@/types/project';
import type {
  TransitionStatusItem,
  FetchTransitionStatusResponse,
} from '@/types/progress';
import type {
  GetTaskRegistrationResponse,
  SaveTaskRegistrationRequest,
  SaveTaskRegistrationResponse
} from '@/types/taskRegistration';
import type {
  Instruction,
} from '@/types/experimentWorker';
import type {
  TaskRegistrationStatusResponse,
  SaveInstructionRequest,
  SaveInstructionResponse,
  UpdateInstructionRequest,
  UpdateInstructionResponse,
  DeleteInstructionResponse,
  SendInstructionsRequest,
  SendInstructionsResponse,
  ServiceApiResponse,
} from '@/types/api';
import type { InstructionData } from '@/types/instructionRegistration';

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
  subFolderFiles: Record<string, ProjectFile[]>;
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
 * APIエラーレスポンス型（内部用）
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
 * プロジェクト一覧を取得（全件）
 * GET /api/v1/projects
 *
 * @param status プロジェクトステータスフィルタ（省略可）
 * @returns プロジェクト一覧
 * @throws Error APIエラー時
 *
 * @example
 * ```typescript
 * // 全プロジェクトを取得
 * const result = await getProjects();
 * console.log(result.data.projects); // プロジェクト配列
 * ```
 */
export const getProjects = async (
  status?: 'active' | 'archived' | 'all'
): Promise<ServiceApiResponse<ProjectListResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjects - Frontend call start', { status });

    // include_completed=true を常に送信する（フロントエンド側でフィルタリングするため）
    const params: Record<string, string | boolean> = { include_completed: true };
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
 * プロジェクト名変更
 * PATCH /api/v1/projects/:projectId/rename
 *
 * @param projectId - プロジェクトID（UUID）
 * @param newProjectName - 変更後のプロジェクト名
 * @returns 変更後のプロジェクト名
 */
export const renameProject = async (
  projectId: string,
  newProjectName: string
): Promise<{ newProjectName: string }> => {
  const apiClient = createApiClient();

  try {
    const response = await apiClient.patch<{
      success: boolean;
      data: { newProjectName: string };
    }>(`/projects/${encodeURIComponent(projectId)}/rename`, { newProjectName });

    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] renameProject - Error', {
      projectId,
      newProjectName,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError<ApiErrorResponse>)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
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
 * @param projectId プロジェクトID（UUID）
 * @param includeArchive アーカイブファイルを含めるかどうか（デフォルト: false）
 * @returns ファイル一覧とプロジェクト情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 現在のファイルのみ取得
 * const files = await getProjectFiles('550e8400-e29b-41d4-a716-446655440000');
 * 
 * // アーカイブファイルも含めて取得
 * const allFiles = await getProjectFiles('550e8400-e29b-41d4-a716-446655440000', true);
 * ```
 */
export const getProjectFiles = async (
  projectId: string,
  includeArchive: boolean = false
): Promise<FileListResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectFiles - Frontend call start', { projectId, includeArchive });
    
    const response = await client.get<{
      success: true;
      data: FileListResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/files`, {
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
 * @param projectId プロジェクトID（UUID）
 * @param status タスクステータスフィルタ（デフォルト: 'all'）
 * @returns タスク一覧、統計情報、プロジェクト情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 全タスクを取得
 * const allTasks = await getProjectTasks('550e8400-e29b-41d4-a716-446655440000');
 * 
 * // 実行待ちタスクのみ取得
 * const pendingTasks = await getProjectTasks('550e8400-e29b-41d4-a716-446655440000', 'pending');
 * 
 * // 実行中タスクのみ取得
 * const inProgressTasks = await getProjectTasks('550e8400-e29b-41d4-a716-446655440000', 'in_progress');
 * ```
 */
export const getProjectTasks = async (
  projectId: string,
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
    }>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
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
 * @param projectId プロジェクトID（UUID）
 * @param includeArchive アーカイブファイルを含めるかどうか
 * @param taskStatus タスクステータスフィルタ
 * @returns ファイル一覧とタスク一覧
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const { files, tasks } = await getProjectData('550e8400-e29b-41d4-a716-446655440000');
 * console.log(`ファイル数: ${files.files.length}, タスク数: ${tasks.tasks.length}`);
 * ```
 */
export const getProjectData = async (
  projectId: string,
  includeArchive: boolean = false,
  taskStatus: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' = 'all'
): Promise<{
  files: FileListResponse;
  tasks: TaskListResponse;
}> => {
  try {
    // 並列実行で両方のAPIを呼び出し
    const [files, tasks] = await Promise.all([
      getProjectFiles(projectId, includeArchive),
      getProjectTasks(projectId, taskStatus),
    ]);

    return { files, tasks };
  } catch (error) {
    console.error('プロジェクトデータ取得エラー:', error);
    throw error;
  }
};

/**
 * タスク登録情報を取得
 * GET /api/v1/projects/:projectId/task-registration
 * 
 * @param projectId プロジェクトID（UUID）
 * @returns タスク登録情報
 * @throws Error APIエラー時
 */
export const getTaskRegistration = async (
  projectId: string
): Promise<GetTaskRegistrationResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getTaskRegistration - Request', { projectId });
    
    const response = await client.get<{
      success: true;
      data: GetTaskRegistrationResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/task-registration`);

    console.log('[DEBUG] getTaskRegistration - Success', {
      tasksCount: response.data.data.tasks.length,
      isCheckoutLocked: response.data.data.isCheckoutLocked,
      isMaimlRegistered: response.data.data.isMaimlRegistered,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] getTaskRegistration - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * タスク登録情報を保存
 * POST /api/v1/projects/:projectId/task-registration
 * 
 * @param projectId プロジェクトID（UUID）
 * @param request タスク登録保存リクエスト
 * @returns 保存結果
 * @throws Error APIエラー時
 */
export const saveTaskRegistration = async (
  projectId: string,
  request: SaveTaskRegistrationRequest
): Promise<SaveTaskRegistrationResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] saveTaskRegistration - Request', { projectId, tasksCount: request.tasks.length });
    
    const response = await client.post<{
      success: true;
      data: SaveTaskRegistrationResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/task-registration`, request);

    console.log('[DEBUG] saveTaskRegistration - Success', {
      message: response.data.data.message,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] saveTaskRegistration - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
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
): Promise<ServiceApiResponse<WorkerProjectListResponse>> => {
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
 * プロジェクト詳細を取得
 * GET /api/v1/projects/:projectId
 *
 * @param projectId プロジェクトID（UUID）
 * @returns プロジェクト詳細情報
 * @throws Error APIエラー時
 *
 * @example
 * ```typescript
 * const result = await getProjectDetail('550e8400-e29b-41d4-a716-446655440000');
 * console.log(result.data.project_status); // 'active'
 * ```
 */
export const getProjectDetail = async (
  projectId: string
): Promise<ServiceApiResponse<ProjectDetailApiResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectDetail - Start', { projectId });

    const response = await client.get<{
      success: boolean;
      data: ProjectDetailApiResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}`);

    console.log('[DEBUG] getProjectDetail - Success', {
      projectId: response.data.data.project_id,
      projectStatus: response.data.data.project_status,
    });

    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[DEBUG] getProjectDetail - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * 承認依頼を送信
 * PATCH /api/v1/projects/:projectId/approval-request
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
  projectId: string,
  comment?: string
): Promise<ServiceApiResponse<ApprovalRequestResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] requestApproval - Start', { projectId, hasComment: !!comment });
    
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
    }>(`/projects/${encodeURIComponent(projectId)}/approval-request`, requestBody);

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
 * GET /api/v1/progress/projects/:projectId/worker-tasks
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
  projectId: string,
  filters?: {
    status?: string;
    assignedTo?: string;
    sortBy?: 'task_no' | 'created_at' | 'updated_at' | 'status';
    order?: 'asc' | 'desc';
  }
): Promise<ServiceApiResponse<WorkerTasksResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getWorkerTasks - Start', { projectId, filters });
    
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
    }>(`/progress/projects/${encodeURIComponent(projectId)}/worker-tasks`, {
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

/**
 * タスクステータスを更新
 * PATCH /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/status
 * 
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param taskNo タスク連番（文字列）
 * @param status 新しいステータス
 * @param comment コメント（任意、最大500文字）
 * @param currentUpdatedAt 楽観的ロック用（任意）
 * @returns 更新されたタスク情報
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // タスクを作業中に更新
 * const result = await updateTaskStatus('sample_project', 'method1', '1', 'in_progress');
 * console.log(result.data.new_status); // 'in_progress'
 * 
 * // コメント付きで更新
 * await updateTaskStatus('sample_project', 'method1', '1', 'completed', '実験完了しました');
 * ```
 */
export const updateTaskStatus = async (
  projectId: string,
  methodId: string,
  taskNo: string,
  status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'forced_terminated',
  comment?: string,
  currentUpdatedAt?: string
): Promise<ServiceApiResponse<TaskStatusUpdateResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] updateTaskStatus - Start', {
      projectId,
      methodId,
      taskNo,
      status,
      hasComment: !!comment
    });
    
    const requestBody: {
      status: string;
      comment?: string;
      currentUpdatedAt?: string;
    } = { status };
    
    if (comment) {
      requestBody.comment = comment;
    }
    if (currentUpdatedAt) {
      requestBody.currentUpdatedAt = currentUpdatedAt;
    }
    
    const response = await client.patch<{
      success: boolean;
      data: TaskStatusUpdateResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(
      `/progress/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/tasks/${taskNo}/status`,
      requestBody
    );

    console.log('[DEBUG] updateTaskStatus - Success', {
      previousStatus: response.data.data.previous_status,
      newStatus: response.data.data.new_status,
      updatedAt: response.data.data.updated_at
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] updateTaskStatus - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};

/**
 * 作業指示一覧を取得
 * GET /api/v1/projects/:projectId/worker-instructions
 * 
 * @param projectName プロジェクト名
 * @param filters フィルター条件（オプション）
 * @returns 作業指示一覧
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 全指示を取得
 * const result = await getWorkerInstructions('sample_project');
 * console.log(result.data); // 指示配列
 * 
 * // プロジェクトIDでフィルタ
 * const filtered = await getWorkerInstructions('sample_project', { projectId: 'uuid' });
 * ```
 */
export const getWorkerInstructions = async (
  projectId: string
): Promise<ServiceApiResponse<WorkerInstruction[]>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getWorkerInstructions - Start', { projectId });
    
    const response = await client.get<{
      success: boolean;
      data: WorkerInstruction[];
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/worker-instructions`);

    console.log('[DEBUG] getWorkerInstructions - Success', {
      instructionCount: response.data.data.length
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] getWorkerInstructions - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};

/**
 * 指示を確認済みとしてマークする
 * PUT /api/v1/projects/:projectId/instructions/:instructionId/confirm
 * 
 * @param projectName プロジェクト名
 * @param instructionId 指示ID
 * @returns 確認結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * // 指示を確認
 * const result = await confirmInstruction('sample_project', 'instruction-id-123');
 * console.log(result.data.is_acknowledged); // true
 * ```
 */
export const confirmInstruction = async (
  projectId: string,
  instructionId: string
): Promise<ServiceApiResponse<InstructionConfirmationData>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] confirmInstruction - Start', { projectId, instructionId });
    
    const response = await client.put<{
      success: boolean;
      data: InstructionConfirmationData;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions/${instructionId}/confirm`);

    console.log('[DEBUG] confirmInstruction - Success', {
      instructionId: response.data.data.instruction_id,
      isAcknowledged: response.data.data.is_acknowledged
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta
    };
  } catch (error) {
    console.error('[DEBUG] confirmInstruction - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status
    });
    throw error;
  }
};

/**
 * トランジションステータスを更新
 * PATCH /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 *
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param transitionId トランジションID
 * @param request リクエストボディ（taskNo, status, comment）
 * @returns 更新されたトランジション情報
 * @throws Error APIエラー時
 *
 * @example
 * ```typescript
 * await updateTransitionStatus('sample_project', 'method1', 't1', {
 *   taskNo: 1,
 *   status: 'running',
 *   comment: '実験を開始しました',
 * });
 * ```
 */
export const updateTransitionStatus = async (
  projectId: string,
  methodId: string,
  transitionId: string,
  request: UpdateTransitionStatusRequest
): Promise<ServiceApiResponse<UpdateTransitionStatusResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] updateTransitionStatus - Start', {
      projectId,
      methodId,
      transitionId,
      taskNo: request.taskNo,
      status: request.status,
    });

    const response = await client.patch<{
      success: boolean;
      data: UpdateTransitionStatusResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(
      `/progress/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/transitions/${encodeURIComponent(transitionId)}/status`,
      request
    );

    console.log('[DEBUG] updateTransitionStatus - Success', {
      transitionId: response.data.data.transitionId,
      status: response.data.data.status,
      updatedAt: response.data.data.updatedAt,
    });

    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[DEBUG] updateTransitionStatus - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};


/**
 * トランジション状態遷移時刻を取得（状態記録ダイアログ初期値用）
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/state-records
 *
 * @param projectId    プロジェクトID
 * @param methodId     メソッドID
 * @param transitionId トランジションID
 * @returns 各状態の遷移時刻（未記録は null）
 * @throws Error APIエラー時
 *
 * @example
 * ```typescript
 * const records = await getTransitionStateRecords(projectId, methodId, transitionId);
 * console.log(records.preparingTime); // "2026-09-01T05:08:08+09:00" | null
 * ```
 */
export const getTransitionStateRecords = async (
  projectId: string,
  methodId: string,
  transitionId: string
): Promise<TransitionStateRecordsResult> => {
  const client = createApiClient();

  const response = await client.get<{
    success: boolean;
    data: TransitionStateRecordsResult;
    meta: {
      timestamp: string;
      requestId: string;
    };
  }>(
    `/progress/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/transitions/${encodeURIComponent(transitionId)}/state-records`
  );

  return response.data.data;
};


// ========================================
// 指示送信タブ用API関数
// ========================================

/**
 * 指示一覧を取得
 * GET /api/v1/projects/:projectId/instructions
 * 
 * @param projectId プロジェクトID（UUID）
 * @returns 指示一覧
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const instructions = await getInstructions('550e8400-e29b-41d4-a716-446655440000');
 * console.log(`${instructions.length}件の指示を取得`);
 * ```
 */
export const getInstructions = async (
  projectId: string
): Promise<InstructionData[]> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getInstructions - Request', { projectId });
    
    const response = await client.get<{
      success: true;
      data: {
        instructions: InstructionData[];
      };
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions`);

    console.log('[DEBUG] getInstructions - Success', {
      instructionsCount: response.data.data.instructions.length,
    });
    
    return response.data.data.instructions;
  } catch (error) {
    console.error('[DEBUG] getInstructions - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * レビュー待ちタスクを一括完了に更新
 * POST /api/v1/projects/:projectId/tasks/complete-review
 *
 * @param projectId プロジェクトID（UUID）
 * @returns 更新件数とメッセージ
 */
export const completeReviewTasks = async (
  projectId: string
): Promise<ServiceApiResponse<{ updatedCount: number; message: string }>> => {
  const client = createApiClient();
  try {
    console.log('[DEBUG] completeReviewTasks - Request', { projectId });
    const response = await client.post<{
      success: boolean;
      data: { updatedCount: number; message: string };
    }>(`/projects/${encodeURIComponent(projectId)}/tasks/complete-review`);
    console.log('[DEBUG] completeReviewTasks - Success', {
      updatedCount: response.data.data.updatedCount,
    });
    return response.data as ServiceApiResponse<{ updatedCount: number; message: string }>;
  } catch (error) {
    console.error('[DEBUG] completeReviewTasks - Error', { error });
    throw error;
  }
};

export const getTaskRegistrationStatus = async (
  projectId: string
): Promise<TaskRegistrationStatusResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getTaskRegistrationStatus - Request', { projectId });
    
    const response = await client.get<{
      success: true;
      data: TaskRegistrationStatusResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions/status`);

    console.log('[DEBUG] getTaskRegistrationStatus - Success', {
      hasRegisteredTasks: response.data.data.hasRegisteredTasks,
      taskCount: response.data.data.taskCount,
      canSendInstructions: response.data.data.canSendInstructions,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] getTaskRegistrationStatus - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * 指示を保存（未送信）
 * POST /api/v1/projects/:projectId/instructions
 * 
 * @param projectId プロジェクトID（UUID）
 * @param request 指示保存リクエスト
 * @returns 指示保存結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const result = await saveInstruction('550e8400-e29b-41d4-a716-446655440000', {
 *   methodId: 'method_001',
 *   transitionId: 'trans_001',
 *   taskNumber: 1,
 *   content: '実験手順を実施してください'
 * });
 * console.log('Instruction ID:', result.instructionId);
 * ```
 */
export const saveInstruction = async (
  projectId: string,
  request: SaveInstructionRequest
): Promise<SaveInstructionResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] saveInstruction - Request', { projectId, request });
    
    const response = await client.post<{
      success: true;
      data: SaveInstructionResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions`, request);

    console.log('[DEBUG] saveInstruction - Success', {
      instructionId: response.data.data.instructionId,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] saveInstruction - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * 指示を更新（未送信のみ）
 * PUT /api/v1/projects/:projectId/instructions/:instructionId
 * 
 * @param projectId プロジェクトID（UUID）
 * @param instructionId 指示ID
 * @param request 指示更新リクエスト
 * @returns 指示更新結果
 * @throws Error APIエラー時（送信済の指示を更新しようとした場合はエラー）
 * 
 * @example
 * ```typescript
 * const result = await updateInstruction('550e8400-e29b-41d4-a716-446655440000', 'inst_001', {
 *   methodId: 'method_001',
 *   content: '更新された指示内容'
 * });
 * ```
 */
export const updateInstruction = async (
  projectId: string,
  instructionId: string,
  request: UpdateInstructionRequest
): Promise<UpdateInstructionResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] updateInstruction - Request', { projectId, instructionId, request });
    
    const response = await client.put<{
      success: true;
      data: UpdateInstructionResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions/${encodeURIComponent(instructionId)}`, request);

    console.log('[DEBUG] updateInstruction - Success', {
      instructionId: response.data.data.instructionId,
      updated: response.data.data.updated,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] updateInstruction - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * 指示を削除（未送信のみ）
 * DELETE /api/v1/projects/:projectId/instructions/:instructionId
 * 
 * @param projectId プロジェクトID（UUID）
 * @param instructionId 指示ID
 * @returns 指示削除結果
 * @throws Error APIエラー時（送信済の指示を削除しようとした場合はエラー）
 * 
 * @example
 * ```typescript
 * const result = await deleteInstruction('550e8400-e29b-41d4-a716-446655440000', 'inst_001');
 * if (result.deleted) {
 *   console.log('指示を削除しました');
 * }
 * ```
 */
export const deleteInstruction = async (
  projectId: string,
  instructionId: string
): Promise<DeleteInstructionResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] deleteInstruction - Request', { projectId, instructionId });
    
    const response = await client.delete<{
      success: true;
      data: DeleteInstructionResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions/${encodeURIComponent(instructionId)}`);

    console.log('[DEBUG] deleteInstruction - Success', {
      deleted: response.data.data.deleted,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] deleteInstruction - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * 未送信指示を一括送信
 * POST /api/v1/projects/:projectId/instructions/send
 * 
 * @param projectId プロジェクトID（UUID）
 * @param request 指示送信リクエスト（空のオブジェクト）
 * @returns 指示送信結果
 * @throws Error APIエラー時
 * 
 * @remarks
 * タスク作成は別途タスク登録タブで実施されるため、このAPIではタスク情報を送信しません。
 * 
 * @example
 * ```typescript
 * const result = await sendInstructions('550e8400-e29b-41d4-a716-446655440000', {});
 * console.log(`${result.sentInstructionsCount}件の指示を送信しました`);
 * ```
 */
export const sendInstructions = async (
  projectId: string,
  request: SendInstructionsRequest
): Promise<SendInstructionsResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] sendInstructions - Request', { projectId });
    
    const response = await client.post<{
      success: true;
      data: SendInstructionsResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/instructions/send`, request);

    console.log('[DEBUG] sendInstructions - Success', {
      sentInstructionsCount: response.data.data.sentInstructionsCount,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] sendInstructions - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * トランジションコメントを保存
 * POST /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/comment
 *
 * @param projectId - プロジェクトID（UUID）
 * @param methodId - メソッドID
 * @param transitionId - コメント対象のトランジションID
 * @param request - コメント保存リクエスト（taskNo, comment）
 * @returns 保存結果
 * @throws Error APIエラー時
 *
 * @example
 * ```typescript
 * await saveTransitionComment(projectId, methodId, 'transition_t1', {
 *   taskNo: 1,
 *   comment: '温度が想定より0.2℃高かった。',
 * });
 * ```
 */
export const saveTransitionComment = async (
  projectId: string,
  methodId: string,
  transitionId: string,
  request: SaveTransitionCommentRequest
): Promise<ServiceApiResponse<SaveTransitionCommentResponse>> => {
  const client = createApiClient();

  try {
    const response = await client.post<{
      success: true;
      data: SaveTransitionCommentResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(
      `/progress/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/transitions/${encodeURIComponent(transitionId)}/comment`,
      request
    );

    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[DEBUG] saveTransitionComment - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

// ========================================
// チェックアウト関連API関数
// ========================================

/**
 * プロジェクトをチェックアウト
 * POST /api/v1/projects/:projectId/checkout
 * 
 * @param projectId プロジェクトID（UUID）
 * @returns チェックアウト結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await checkoutProject('550e8400-e29b-41d4-a716-446655440000');
 *   console.log('チェックアウト成功:', result.projectName);
 * } catch (error) {
 *   console.error('チェックアウト失敗:', error);
 * }
 * ```
 */
export const checkoutProject = async (
  projectId: string
): Promise<CheckoutResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] checkoutProject - Request', { projectId });
    
    const response = await client.post<{
      success: true;
      data: CheckoutResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/checkout`);

    console.log('[DEBUG] checkoutProject - Success', {
      projectId: response.data.data.projectId,
      projectName: response.data.data.projectName,
      isCheckedOut: response.data.data.isCheckedOut,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] checkoutProject - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError<ApiErrorResponse>)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * プロジェクトをチェックイン
 * POST /api/v1/projects/:projectId/checkin
 * 
 * @param projectId プロジェクトID（UUID）
 * @returns チェックイン結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await checkinProject('550e8400-e29b-41d4-a716-446655440000');
 *   console.log('チェックイン成功:', result.projectName);
 * } catch (error) {
 *   console.error('チェックイン失敗:', error);
 * }
 * ```
 */
export const checkinProject = async (
  projectId: string
): Promise<CheckoutResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] checkinProject - Request', { projectId });
    
    const response = await client.post<{
      success: true;
      data: CheckoutResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}/checkin`);

    console.log('[DEBUG] checkinProject - Success', {
      projectId: response.data.data.projectId,
      projectName: response.data.data.projectName,
      isCheckedOut: response.data.data.isCheckedOut,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] checkinProject - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError<ApiErrorResponse>)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

// ========================================
// MaiML 公開/非公開 API 関数
// ========================================

/**
 * プロジェクトの MaiML を公開する
 * POST /api/v1/projects/:projectId/publish
 *
 * @description
 * バックエンドは bullmq 非同期処理（202 Accepted）を返す。
 * リクエストボディなし（バックエンドは organizationId/projectId/userId のみ使用）。
 *
 * @param projectId プロジェクトID（UUID）
 * @returns 公開ジョブ受付結果 (job_id, status: 'pending', message)
 * @throws Error APIエラー時
 */
export const publishProject = async (
  projectId: string
): Promise<ServiceApiResponse<PublishJobResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] publishProject - Request', { projectId });

    const response = await client.post<{
      success: boolean;
      data: PublishJobResponse;
      meta: { timestamp: string; requestId: string };
    }>(`/projects/${encodeURIComponent(projectId)}/publish`);

    console.log('[DEBUG] publishProject - Success', {
      job_id: response.data.data.job_id,
      status: response.data.data.status,
      message: response.data.data.message,
    });

    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[DEBUG] publishProject - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * プロジェクトの MaiML を非公開にする
 * POST /api/v1/projects/:projectId/unpublish
 *
 * @description
 * バックエンドは bullmq 非同期処理（202 Accepted）を返す。
 * リクエストボディは不要（バックエンドは organizationId/projectId/userId のみ使用）。
 *
 * @param projectId プロジェクトID（UUID）
 * @returns 非公開ジョブ受付結果 (job_id, status: 'pending', message)
 * @throws Error APIエラー時
 */
export const unpublishProject = async (
  projectId: string
): Promise<ServiceApiResponse<PublishJobResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] unpublishProject - Request', { projectId });

    const response = await client.post<{
      success: boolean;
      data: PublishJobResponse;
      meta: { timestamp: string; requestId: string };
    }>(`/projects/${encodeURIComponent(projectId)}/unpublish`);

    console.log('[DEBUG] unpublishProject - Success', {
      job_id: response.data.data.job_id,
      status: response.data.data.status,
      message: response.data.data.message,
    });

    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[DEBUG] unpublishProject - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * プロジェクトの MaiML 公開ステータスを取得する
 * GET /api/v1/projects/:projectId/publish-status
 *
 * @param projectId プロジェクトID（UUID）
 * @returns 最新ジョブの公開状態
 * @throws Error APIエラー時（404: MAIMLファイルなし、500: システムエラー）
 */
export const getPublishStatus = async (
  projectId: string
): Promise<PublishStatusResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getPublishStatus - Request', { projectId });

    const response = await client.get<{
      success: boolean;
      data: PublishStatusResponse;
      meta: { timestamp: string; requestId: string };
    }>(`/projects/${encodeURIComponent(projectId)}/publish-status`);

    console.log('[DEBUG] getPublishStatus - Success', {
      job_type: response.data.data.job_type,
      status: response.data.data.status,
      job_id: response.data.data.job_id,
    });

    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] getPublishStatus - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

// ========================================
// MAIML関連API関数
// ========================================

/**
 * プロジェクトのMAIMLファイルを取得
 * GET /api/v1/projects/:projectId/maiml
 * 
 * @param projectId プロジェクトID（UUID）
 * @returns MAIMLファイルの内容（XML文字列）
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const maimlData = await getProjectMaiml('sample_project');
 * console.log('MAIML Content Length:', maimlData.maimlContent.length);
 * ```
 */
export const getProjectMaiml = async (
  projectId: string
): Promise<ServiceApiResponse<ProjectMaimlResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectMaiml - Request', { projectId });
    
    const response = await client.get<ServiceApiResponse<ProjectMaimlResponse>>(
      `/projects/${encodeURIComponent(projectId)}/maiml`
    );

    console.log('[DEBUG] getProjectMaiml - Success', {
      contentLength: response.data.data?.maimlContent?.length || 0,
      projectId,
    });
    
    return response.data;
  } catch (error) {
    console.error('[DEBUG] getProjectMaiml - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError<ApiErrorResponse>)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

// ========================================
// プロジェクト削除関連API関数
// ========================================

/**
 * プロジェクトを削除
 * DELETE /api/v1/projects/:projectId
 * 
 * @param projectId プロジェクトID（UUID）
 * @returns 削除結果（削除されたファイル数とメッセージ）
 * @throws Error APIエラー時
 * 
 * @remarks
 * - project_maiml_flg=falseの場合のみ削除可能
 * - DB + ストレージのファイルを全て削除
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await deleteProject('sample_project');
 *   console.log(`削除成功: ${result.deletedCount}ファイル`);
 * } catch (error) {
 *   console.error('削除失敗:', error);
 * }
 * ```
 */
export const deleteProject = async (
  projectId: string
): Promise<DeleteProjectResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] deleteProject - Request', { projectId });
    
    const response = await client.delete<{
      success: true;
      data: DeleteProjectResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}`);

    console.log('[DEBUG] deleteProject - Success', {
      deletedCount: response.data.data.deletedCount,
      message: response.data.data.message,
    });
    
    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] deleteProject - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError<ApiErrorResponse>)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

// ---------------------------------------------------------------------------
// トランジション進捗
// ---------------------------------------------------------------------------

/**
 * トランジション番号に対応するステータスラベル文字列を返す
 * バックエンドの数値ステータス → フロントエンドの表示文字列へのマッピング
 */
function getTransitionStatusLabel(status: number): string {
  const TRANSITION_STATUS_LABELS: Record<number, string> = {
    1: '初期状態',
    2: '準備状態',
    3: '準備完了状態',
    4: '動作状態',
    5: '休止状態',
    6: '終状態',
    7: '異常終了状態',
  };
  return TRANSITION_STATUS_LABELS[status] ?? '初期状態';
}

/**
 * トランジション進捗データを取得
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
 *
 * @description
 * バックエンドの進捗APIを呼び出す。
 * バックエンドレスポンス（snake_case・数値ステータス）を
 * フロントエンド期待形式（camelCase・文字列ステータス）に変換して返す。
 *
 * @param projectId - プロジェクトID
 * @param methodId  - メソッドID
 * @param taskNo    - タスク連番（1以上の整数）
 * @returns フロントエンド期待形式のトランジション進捗データ
 */
export const fetchTransitionStatus = async (
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<FetchTransitionStatusResponse> => {
  const client = createApiClient();

  console.log('🌐 [fetchTransitionStatus] 実API呼び出し:', {
    projectId,
    methodId,
    taskNo,
  });

  try {
    const response = await client.get<{
      success: boolean;
      data: {
        transitions: Array<{
          transition_id: string;
          transition_name: string;
          status: number;
          last_updated: string | null;
          material_count?: number;
          material_actual_count?: number;
          condition_count?: number;
          condition_actual_count?: number;
          result_count?: number;
          result_actual_count?: number;
          prerequisite_transition_ids?: string[];
          is_recorded?: boolean;
        }>;
      };
    }>(
      `/progress/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/tasks/${taskNo}/transitions`
    );

    const rawTransitions = response.data.data?.transitions ?? [];

    console.log('✅ [fetchTransitionStatus] APIレスポンス取得成功:', {
      success: response.data.success,
      transitionsCount: rawTransitions.length,
    });

    const transitionStatus: TransitionStatusItem[] = rawTransitions.map((t) => ({
      transitionId: t.transition_id,
      transitionName: t.transition_name,
      progressStatus: getTransitionStatusLabel(t.status),
      latestStatus: getTransitionStatusLabel(t.status),
      materialCount: t.material_count ?? 0,
      materialActualCount: t.material_actual_count ?? 0,
      conditionCount: t.condition_count ?? 0,
      conditionActualCount: t.condition_actual_count ?? 0,
      resultCount: t.result_count ?? 0,
      resultActualCount: t.result_actual_count ?? 0,
      prerequisiteTransitionIds: t.prerequisite_transition_ids ?? [],
      isRecorded: t.is_recorded ?? false,
    }));

    return {
      success: true,
      data: {
        transitionStatus,
      },
    };
  } catch (error) {
    console.error('[DEBUG] fetchTransitionStatus - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};

/**
 * NGタスク一覧取得
 *
 * GET /api/v1/progress/projects/:projectId/ng-tasks
 * task_status=6（NG）のタスク一覧を返す。NG理由モーダルで使用する。
 */
export interface NgTaskItem {
  taskNo: number;
  methodId: string;
  reviewResult: string;
  reviewedAt: string | null;
  reviewUserId: string | null;
}

export const getNgTasks = async (
  projectId: string
): Promise<NgTaskItem[]> => {
  const client = createApiClient();
  try {
    const response = await client.get<{
      success: boolean;
      data: { ngTasks: NgTaskItem[] };
    }>(`/progress/projects/${projectId}/ng-tasks`);
    return response.data.data.ngTasks;
  } catch (error) {
    console.error('[getNgTasks] エラー', {
      error,
      projectId,
    });
    throw error;
  }
};

/**
 * プロジェクト強制終了
 *
 * @description プロジェクトステータスを ERROR(5) に更新する
 */
export const forceTerminateProject = async (
  projectId: string
): Promise<{ projectId: string; projectStatus: number }> => {
  const client = createApiClient();
  try {
    const response = await client.post<{
      success: boolean;
      data: { projectId: string; projectStatus: number };
    }>(`/projects/${projectId}/force-terminate`);
    return response.data.data;
  } catch (error) {
    console.error('[forceTerminateProject] エラー', {
      error,
      projectId,
    });
    throw error;
  }
};

/**
 * プロジェクトのグループメンバー（Owner候補ユーザー）を取得
 *
 * @remarks
 * プロジェクトに紐づく組織グループのメンバー一覧を取得する。
 * DocumentEditDialog の Owner 選択用に使用する。
 * 内部でプロジェクト一覧からグループCDを取得し、グループメンバーを返す。
 *
 * @param projectId - 対象プロジェクトID
 * @returns ユーザー一覧（userId, userName）
 *   ※ userId は MAIML owner@id 仕様に合わせて `@` を `_` に変換済みの値を返す
 */
export const getProjectGroupMembers = async (
  projectId: string
): Promise<Array<{ userId: string; userName: string }>> => {
  try {
    console.log('👥 [projectApiService] プロジェクトグループメンバー取得:', projectId);

    // プロジェクト一覧からグループCDを取得
    const projectsResult = await getProjects('all');
    if (!projectsResult.success || !projectsResult.data) {
      console.warn('⚠️ [projectApiService] プロジェクト一覧取得失敗');
      return [];
    }

    const project = projectsResult.data.projects.find((p) => p.id === projectId);
    if (!project) {
      console.warn('⚠️ [projectApiService] 対象プロジェクトが見つかりません:', projectId);
      return [];
    }

    const groupCd = project.organizationGroup;
    if (!groupCd) {
      console.warn('⚠️ [projectApiService] プロジェクトにグループCDが設定されていません:', projectId);
      return [];
    }

    console.log('📂 [projectApiService] グループCD取得:', groupCd);

    // グループメンバー一覧を取得
    const client = createApiClient();
    const response = await client.get<{
      success: boolean;
      data: Array<{ user_id: string; user_name: string; mail_address?: string }>;
    }>(`/organization-groups/${encodeURIComponent(groupCd)}/members`);

    const members = (response.data?.data ?? []).map((u) => ({
      userId: u.user_id.replace(/@/g, '_'),
      userName: u.user_name,
    }));

    console.log('✅ [projectApiService] グループメンバー取得完了:', members.length, '名');
    return members;
  } catch (error) {
    console.error('❌ [projectApiService] プロジェクトグループメンバー取得エラー:', {
      error,
      projectId,
    });
    return [];
  }
};
