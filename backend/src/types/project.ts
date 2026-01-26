/**
 * プロジェクト関連の型定義（フロントエンドと共通）
 */

/**
 * プロジェクトステータス
 */
export type ProjectStatus = 
  | 'planning'        // 0: プロジェクト計画中
  | 'pending'         // 1: タスク実行待ち
  | 'in_progress'     // 2: タスク実行中
  | 'review_waiting'  // 3: タスク結果レビュー待ち
  | 'completed'       // 4: プロジェクト完了
  | 'error';          // 5: タスク異常終了

/**
 * プロジェクト（APIレスポンス用）
 */
export interface Project {
  id: string;
  name: string;
  folderName: string;
  description: string;
  status: ProjectStatus;
  fileCount: number;
  totalSize: number;
  owner: string;
  ownerName?: string;
  ownerEmail?: string;
  department: string;
  members: string[];
  tags: string[];
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedTasks?: number;
  totalTasks?: number;
  tasks?: Task[];
}

/**
 * タスクステータス
 */
export type TaskStatus = 
  | 'pending'         // 0: 実行待ち
  | 'in_progress'     // 1: 実行中
  | 'error'           // 2: 異常終了
  | 'review_waiting'  // 3: レビュー待ち
  | 'completed';      // 4: 完了

/**
 * タスク
 */
export interface Task {
  taskId: string;
  workerId: string;
  workerName: string;
  transitionId: string;
  transitionName: string;
  workStatus: TaskStatus;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progress: number;
  errorMessage?: string;
}

/**
 * ページネーション情報
 */
export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * プロジェクト一覧レスポンス
 */
export interface ProjectListResponse {
  projects: Project[];
  pagination: Pagination;
}

/**
 * プロジェクトステータスマッピング（DB数値 → 文字列）
 */
export const PROJECT_STATUS_MAP: Record<number, ProjectStatus> = {
  0: 'planning',
  1: 'pending',
  2: 'in_progress',
  3: 'review_waiting',
  4: 'completed',
  5: 'error'
};

/**
 * タスクステータスマッピング（DB数値 → 文字列）
 */
export const TASK_STATUS_MAP: Record<number, TaskStatus> = {
  0: 'pending',
  1: 'in_progress',
  2: 'error',
  3: 'review_waiting',
  4: 'completed'
};

/**
 * タスク統計情報
 */
export interface TaskStatistics {
  /** 総タスク数 */
  total: number;
  
  /** 実行待ちタスク数 */
  pending: number;
  
  /** 実行中タスク数 */
  inProgress: number;
  
  /** 完了タスク数 */
  completed: number;
  
  /** 異常終了タスク数 */
  failed: number;
}

/**
 * タスク一覧レスポンス
 */
export interface TaskListResponse {
  tasks: Task[];
  statistics: TaskStatistics;
}
