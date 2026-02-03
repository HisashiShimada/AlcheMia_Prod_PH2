/**
 * TaskService型定義
 * 
 * @description タスクステータス更新サービスの型定義
 * Task: 2.1 コントローラー層実装
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'forced_terminated';

export interface TaskStatusResponse {
  organizationId: string;
  projectId: string;
  projectName: string;
  methodId: string;
  taskNo: number;
  taskStatus: TaskStatus;
  experimentUserId: string | null;
  experimentUserName: string | null;
  experimentStartAt: string | null;
  experimentEndAt: string | null;
  updateAt: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    originalError?: Error;
  };
}

/**
 * updateTaskStatusのパラメータ
 */
export interface UpdateTaskStatusParams {
  organizationId: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  status: TaskStatus; // 文字列のステータス値
  currentUpdateAt: string;
  userId: string;
  role: string;
  comment?: string;
}
