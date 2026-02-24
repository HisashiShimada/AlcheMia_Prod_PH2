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
import type {
  GetTaskRegistrationResponse,
  SaveTaskRegistrationRequest,
  SaveTaskRegistrationResponse
} from '@/types/taskRegistration';
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
