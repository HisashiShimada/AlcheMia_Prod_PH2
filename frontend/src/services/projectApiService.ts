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
} from '@/types/api';
import type { Task, TaskStatistics, Project } from '@/types/project';
import type {
  GetTaskRegistrationResponse,
  SaveTaskRegistrationRequest,
  SaveTaskRegistrationResponse
} from '@/types/taskRegistration';
import type {
  Instruction,
  TargetType,
  Priority,
  InstructionType
} from '@/types/experimentWorker';
import type {
  TaskRegistrationStatusResponse,
  SaveInstructionRequest,
  SaveInstructionResponse,
  UpdateInstructionRequest,
  UpdateInstructionResponse,
  DeleteInstructionResponse,
  SendInstructionsRequest,
  SendInstructionsResponse
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
  projectStatus: number;       // プロジェクトステータス（0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了）
  useDeemedProgress?: boolean; // みなし進捗使用フラグ（organization.use_deemed_progress）省略時はtrue
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
 * プロジェクト詳細レスポンス型
 * API: GET /api/v1/projects/:projectId
 */
export interface ProjectDetailResponse {
  project_id: string;
  project_name: string;
  description: string | null;
  project_status: string;
  is_checked_out: boolean;
  checked_out_by: string | null;
  checked_out_at: string | null;
  checked_out_user_name: string | null;
  create_at: string;
  update_at: string;
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
 * タスクステータス更新レスポンス型
 * API: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status
 */
export interface TaskStatusUpdateResponse {
  task_no: number;
  project_name: string;
  method_id: string;
  previous_status: string;
  new_status: string;
  updated_by: string;
  updated_by_name: string;
  updated_at: string;
  comment?: string;
}

/**
 * 作業指示型（バックエンドAPIレスポンス）
 * API: GET /api/v1/projects/:projectName/worker-instructions
 */
export interface WorkerInstruction {
  id: string;
  project_id: string;
  project_name: string;
  method_id: string;
  method_name: string;
  transition_id: string;
  transition_name: string;
  task_no: string | null; // タスク連番（文字列またはnull）
  instruction_target: string; // "1": file, "2": task, "3": transition
  instruction_content: string;
  priority: string; // "0": low, "1": normal, "2": medium, "3": high
  type: string; // "0": general, "1": setup, "2": measurement, "3": safety, "4": cleanup
  create_at: string;
  created_by: string;
  created_by_name: string;
  is_acknowledged: boolean;
}

/**
 * 指示確認データ型（バックエンドAPIレスポンス）
 * API: PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm
 */
export interface InstructionConfirmationData {
  instruction_id: string;
  is_acknowledged: boolean;
  acknowledged_at: string;
  acknowledged_user_id: string;
  acknowledged_user_name: string;
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
): Promise<ApiResponse<ProjectListResponse>> => {
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
 * タスク登録情報を取得
 * GET /api/v1/projects/:projectName/task-registration
 * 
 * @param projectName プロジェクト名
 * @returns タスク登録情報
 * @throws Error APIエラー時
 */
export const getTaskRegistration = async (
  projectName: string
): Promise<GetTaskRegistrationResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getTaskRegistration - Request', { projectName });
    
    const response = await client.get<{
      success: true;
      data: GetTaskRegistrationResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/task-registration`);

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
 * POST /api/v1/projects/:projectName/task-registration
 * 
 * @param projectName プロジェクト名
 * @param request タスク登録保存リクエスト
 * @returns 保存結果
 * @throws Error APIエラー時
 */
export const saveTaskRegistration = async (
  projectName: string,
  request: SaveTaskRegistrationRequest
): Promise<SaveTaskRegistrationResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] saveTaskRegistration - Request', { projectName, tasksCount: request.tasks.length });
    
    const response = await client.post<{
      success: true;
      data: SaveTaskRegistrationResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/task-registration`, request);

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
): Promise<ApiResponse<ProjectDetailResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectDetail - Start', { projectId });

    const response = await client.get<{
      success: boolean;
      data: ProjectDetailResponse;
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

/**
 * タスクステータスを更新
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status
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
  projectName: string,
  methodId: string,
  taskNo: string,
  status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'forced_terminated',
  comment?: string,
  currentUpdatedAt?: string
): Promise<ApiResponse<TaskStatusUpdateResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] updateTaskStatus - Start', {
      projectName,
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
      `/progress/projects/${encodeURIComponent(projectName)}/methods/${encodeURIComponent(methodId)}/tasks/${taskNo}/status`,
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
 * GET /api/v1/projects/:projectName/worker-instructions
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
  projectName: string,
  filters?: {
    projectId?: string;
  }
): Promise<ApiResponse<WorkerInstruction[]>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getWorkerInstructions - Start', { projectName, filters });
    
    const params: Record<string, string> = {};
    if (filters?.projectId) {
      params.projectId = filters.projectId;
    }
    
    const response = await client.get<{
      success: boolean;
      data: WorkerInstruction[];
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/worker-instructions`, {
      params
    });

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
 * PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm
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
  projectName: string,
  instructionId: string
): Promise<ApiResponse<InstructionConfirmationData>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] confirmInstruction - Start', { projectName, instructionId });
    
    const response = await client.put<{
      success: boolean;
      data: InstructionConfirmationData;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions/${instructionId}/confirm`);

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
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 *
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param transitionId トランジションID
 * @param request リクエストボディ（taskNo, status, progressRate, comment）
 * @returns 更新されたトランジション情報
 * @throws Error APIエラー時
 *
 * @example
 * ```typescript
 * await updateTransitionStatus('sample_project', 'method1', 't1', {
 *   taskNo: 1,
 *   status: 'running',
 *   progressRate: 50,
 *   comment: '実験を開始しました',
 * });
 * ```
 */
export const updateTransitionStatus = async (
  projectName: string,
  methodId: string,
  transitionId: string,
  request: UpdateTransitionStatusRequest
): Promise<ApiResponse<UpdateTransitionStatusResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] updateTransitionStatus - Start', {
      projectName,
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
      `/progress/projects/${encodeURIComponent(projectName)}/methods/${encodeURIComponent(methodId)}/transitions/${encodeURIComponent(transitionId)}/status`,
      request
    );

    console.log('[DEBUG] updateTransitionStatus - Success', {
      transitionId: response.data.data.transitionId,
      status: response.data.data.status,
      progressRate: response.data.data.progressRate,
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
 * バックエンドAPIレスポンス（WorkerInstruction）をフロントエンド型（Instruction）に変換
 * 
 * @param apiData バックエンドAPIレスポンス
 * @returns フロントエンド型の指示データ
 * 
 * @example
 * ```typescript
 * const apiInstruction: WorkerInstruction = { ... };
 * const instruction: Instruction = convertApiToInstruction(apiInstruction);
 * ```
 */
export function convertApiToInstruction(apiData: WorkerInstruction): Instruction {
  // instruction_target → targetType 変換マップ（文字列キー）
  const targetTypeMap: Record<string, TargetType> = {
    '1': 'file',       // プロジェクト指示
    '2': 'task',       // タスク指示
    '3': 'transition'  // トランジション指示
  };
  
  // priority → Priority 変換マップ（文字列キー）
  const priorityMap: Record<string, Priority> = {
    '0': 'low',
    '1': 'normal',
    '2': 'medium',
    '3': 'high'
  };
  
  // type → InstructionType 変換マップ（文字列キー）
  const instructionTypeMap: Record<string, InstructionType> = {
    '0': 'general',
    '1': 'setup',
    '2': 'measurement',
    '3': 'safety',
    '4': 'cleanup'
  };
  
  return {
    instructionId: apiData.id,
    targetType: targetTypeMap[apiData.instruction_target] || 'file',
    transitionId: apiData.transition_id || undefined,
    transitionName: apiData.transition_name || undefined,
    methodId: apiData.method_id || undefined,
    methodName: apiData.method_name || undefined,
    taskId: apiData.task_no ? `${apiData.project_id}-${apiData.method_id}-${apiData.task_no}` : undefined,
    taskName: apiData.task_no ? `Task ${apiData.task_no}` : undefined,
    content: apiData.instruction_content,
    priority: priorityMap[apiData.priority] || 'normal',
    instructionType: instructionTypeMap[apiData.type] || 'general',
    createdAt: apiData.create_at,
    updatedAt: null,
    createdBy: {
      userId: apiData.created_by,
      userName: apiData.created_by_name
    },
    isRead: apiData.is_acknowledged,
    // API仕様に基づく確認済みフラグ
    isAcknowledged: apiData.is_acknowledged,
    acknowledgedAt: undefined,
    acknowledgedBy: undefined,
    acknowledgedByName: undefined
  };
}



// ========================================
// 指示送信タブ用API関数
// ========================================

/**
 * 指示一覧を取得
 * GET /api/v1/projects/:projectName/instructions
 * 
 * @param projectName プロジェクト名
 * @returns 指示一覧
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const instructions = await getInstructions('sample_project');
 * console.log(`${instructions.length}件の指示を取得`);
 * ```
 */
export const getInstructions = async (
  projectName: string
): Promise<InstructionData[]> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getInstructions - Request', { projectName });
    
    const response = await client.get<{
      success: true;
      data: {
        instructions: InstructionData[];
      };
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions`);

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
 * タスク登録状況を取得（ボタン活性制御用）
 * GET /api/v1/projects/:projectName/instructions/status
 * 
 * @param projectName プロジェクト名
 * @returns タスク登録状況
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const status = await getTaskRegistrationStatus('sample_project');
 * if (status.canSendInstructions) {
 *   // 指示送信ボタンを活性化
 * }
 * ```
 */
/**
 * レビュー待ちタスクを一括完了に更新
 * POST /api/v1/projects/:projectName/tasks/complete-review
 *
 * @param projectName プロジェクト名
 * @returns 更新件数とメッセージ
 */
export const completeReviewTasks = async (
  projectName: string
): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
  const client = createApiClient();
  try {
    console.log('[DEBUG] completeReviewTasks - Request', { projectName });
    const response = await client.post<{
      success: boolean;
      data: { updatedCount: number; message: string };
    }>(`/projects/${encodeURIComponent(projectName)}/tasks/complete-review`);
    console.log('[DEBUG] completeReviewTasks - Success', {
      updatedCount: response.data.data.updatedCount,
    });
    return response.data as ApiResponse<{ updatedCount: number; message: string }>;
  } catch (error) {
    console.error('[DEBUG] completeReviewTasks - Error', { error });
    throw error;
  }
};

export const getTaskRegistrationStatus = async (
  projectName: string
): Promise<TaskRegistrationStatusResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getTaskRegistrationStatus - Request', { projectName });
    
    const response = await client.get<{
      success: true;
      data: TaskRegistrationStatusResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions/status`);

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
 * POST /api/v1/projects/:projectName/instructions
 * 
 * @param projectName プロジェクト名
 * @param request 指示保存リクエスト
 * @returns 指示保存結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * const result = await saveInstruction('sample_project', {
 *   methodId: 'method_001',
 *   transitionId: 'trans_001',
 *   taskNumber: 1,
 *   priority: 1,
 *   type: 0,
 *   content: '実験手順を実施してください'
 * });
 * console.log('Instruction ID:', result.instructionId);
 * ```
 */
export const saveInstruction = async (
  projectName: string,
  request: SaveInstructionRequest
): Promise<SaveInstructionResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] saveInstruction - Request', { projectName, request });
    
    const response = await client.post<{
      success: true;
      data: SaveInstructionResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions`, request);

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
 * PUT /api/v1/projects/:projectName/instructions/:instructionId
 * 
 * @param projectName プロジェクト名
 * @param instructionId 指示ID
 * @param request 指示更新リクエスト
 * @returns 指示更新結果
 * @throws Error APIエラー時（送信済の指示を更新しようとした場合はエラー）
 * 
 * @example
 * ```typescript
 * const result = await updateInstruction('sample_project', 'inst_001', {
 *   methodId: 'method_001',
 *   priority: 2,
 *   type: 0,
 *   content: '更新された指示内容'
 * });
 * ```
 */
export const updateInstruction = async (
  projectName: string,
  instructionId: string,
  request: UpdateInstructionRequest
): Promise<UpdateInstructionResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] updateInstruction - Request', { projectName, instructionId, request });
    
    const response = await client.put<{
      success: true;
      data: UpdateInstructionResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions/${encodeURIComponent(instructionId)}`, request);

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
 * DELETE /api/v1/projects/:projectName/instructions/:instructionId
 * 
 * @param projectName プロジェクト名
 * @param instructionId 指示ID
 * @returns 指示削除結果
 * @throws Error APIエラー時（送信済の指示を削除しようとした場合はエラー）
 * 
 * @example
 * ```typescript
 * const result = await deleteInstruction('sample_project', 'inst_001');
 * if (result.deleted) {
 *   console.log('指示を削除しました');
 * }
 * ```
 */
export const deleteInstruction = async (
  projectName: string,
  instructionId: string
): Promise<DeleteInstructionResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] deleteInstruction - Request', { projectName, instructionId });
    
    const response = await client.delete<{
      success: true;
      data: DeleteInstructionResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions/${encodeURIComponent(instructionId)}`);

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
 * POST /api/v1/projects/:projectName/instructions/send
 * 
 * @param projectName プロジェクト名
 * @param request 指示送信リクエスト（空のオブジェクト）
 * @returns 指示送信結果
 * @throws Error APIエラー時
 * 
 * @remarks
 * タスク作成は別途タスク登録タブで実施されるため、このAPIではタスク情報を送信しません。
 * 
 * @example
 * ```typescript
 * const result = await sendInstructions('sample_project', {});
 * console.log(`${result.sentInstructionsCount}件の指示を送信しました`);
 * ```
 */
export const sendInstructions = async (
  projectName: string,
  request: SendInstructionsRequest
): Promise<SendInstructionsResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] sendInstructions - Request', { projectName });
    
    const response = await client.post<{
      success: true;
      data: SendInstructionsResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/instructions/send`, request);

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

// ========================================
// チェックアウト関連API関数
// ========================================

/**
 * チェックアウトレスポンス型
 */
export interface CheckoutResponse {
  projectId: string;
  projectName: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
}

/**
 * プロジェクトをチェックアウト
 * POST /api/v1/projects/:projectName/checkout
 * 
 * @param projectName プロジェクト名
 * @returns チェックアウト結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await checkoutProject('sample_project');
 *   console.log('チェックアウト成功:', result.projectName);
 * } catch (error) {
 *   console.error('チェックアウト失敗:', error);
 * }
 * ```
 */
export const checkoutProject = async (
  projectName: string
): Promise<CheckoutResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] checkoutProject - Request', { projectName });
    
    const response = await client.post<{
      success: true;
      data: CheckoutResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/checkout`);

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
 * POST /api/v1/projects/:projectName/checkin
 * 
 * @param projectName プロジェクト名
 * @returns チェックイン結果
 * @throws Error APIエラー時
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await checkinProject('sample_project');
 *   console.log('チェックイン成功:', result.projectName);
 * } catch (error) {
 *   console.error('チェックイン失敗:', error);
 * }
 * ```
 */
export const checkinProject = async (
  projectName: string
): Promise<CheckoutResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] checkinProject - Request', { projectName });
    
    const response = await client.post<{
      success: true;
      data: CheckoutResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectName)}/checkin`);

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
 * POST /api/v1/projects/:projectName/publish
 *
 * @description
 * バックエンドは bullmq 非同期処理（202 Accepted）を返す。
 * リクエストボディなし（バックエンドは organizationId/projectName/userId のみ使用）。
 *
 * @param projectName プロジェクト名
 * @returns 公開ジョブ受付結果 (job_id, status: 'pending', message)
 * @throws Error APIエラー時
 */
export const publishProject = async (
  projectName: string
): Promise<ApiResponse<PublishJobResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] publishProject - Request', { projectName });

    const response = await client.post<{
      success: boolean;
      data: PublishJobResponse;
      meta: { timestamp: string; requestId: string };
    }>(`/projects/${encodeURIComponent(projectName)}/publish`);

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
 * MaiML 公開/非公開ジョブレスポンス型（publish/unpublish 共通）
 * バックエンドの PublishJobResponse に対応（202 Accepted）
 */
export interface PublishJobResponse {
  job_id: string | null;
  status: 'pending' | 'running' | 'done' | 'error' | null;
  message: string;
}

/**
 * MaiML 公開ステータスレスポンス型
 * バックエンドの PublishStatusResponse に対応
 */
export interface PublishStatusResponse {
  job_id: string | null;
  job_type: 'publish' | 'unpublish' | null;
  status: 'pending' | 'running' | 'done' | 'error' | null;
  asset_id: string | null;
  project_name: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
}

/**
 * プロジェクトの MaiML を非公開にする
 * POST /api/v1/projects/:projectName/unpublish
 *
 * @description
 * バックエンドは bullmq 非同期処理（202 Accepted）を返す。
 * リクエストボディは不要（バックエンドは organizationId/projectName/userId のみ使用）。
 *
 * @param projectName プロジェクト名
 * @returns 非公開ジョブ受付結果 (job_id, status: 'pending', message)
 * @throws Error APIエラー時
 */
export const unpublishProject = async (
  projectName: string
): Promise<ApiResponse<PublishJobResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] unpublishProject - Request', { projectName });

    const response = await client.post<{
      success: boolean;
      data: PublishJobResponse;
      meta: { timestamp: string; requestId: string };
    }>(`/projects/${encodeURIComponent(projectName)}/unpublish`);

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
 * GET /api/v1/projects/:projectName/publish-status
 *
 * @param projectName プロジェクト名
 * @returns 最新ジョブの公開状態
 * @throws Error APIエラー時（404: MAIMLファイルなし、500: システムエラー）
 */
export const getPublishStatus = async (
  projectName: string
): Promise<PublishStatusResponse> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getPublishStatus - Request', { projectName });

    const response = await client.get<{
      success: boolean;
      data: PublishStatusResponse;
      meta: { timestamp: string; requestId: string };
    }>(`/projects/${encodeURIComponent(projectName)}/publish-status`);

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
 * プロジェクトMAIMLレスポンス型
 */
export interface ProjectMaimlResponse {
  maimlContent: string;
  projectName: string;
  lastModified?: string;
}

/**
 * プロジェクトのMAIMLファイルを取得
 * GET /api/v1/projects/:projectName/maiml
 * 
 * @param projectName プロジェクト名
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
  projectName: string
): Promise<ApiResponse<ProjectMaimlResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectMaiml - Request', { projectName });
    
    const response = await client.get<ApiResponse<ProjectMaimlResponse>>(
      `/projects/${encodeURIComponent(projectName)}/maiml`
    );

    console.log('[DEBUG] getProjectMaiml - Success', {
      contentLength: response.data.data?.maimlContent?.length || 0,
      projectName: response.data.data?.projectName,
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

