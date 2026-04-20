/**
 * プロジェクト関連の型定義（フロントエンドと共通）
 */

/**
 * プロジェクト（APIレスポンス用）
 */
export interface Project {
  id: string;
  name: string;
  folderName: string;
  description: string;
  status: number; // プロジェクトステータス（数値コード: 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了）
  statusName?: string; // code_masterから取得したステータス名（日本語）
  fileCount: number;
  totalSize: number;
  owner: string;
  ownerName?: string;
  ownerEmail?: string;
  department: string;
  departmentName?: string; // 部署名（日本語）
  members: string[];
  tags: string[];
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedTasks?: number;
  totalTasks?: number;
  maimlFileKey?: string | null;
  tasks?: Task[];
}

/**
 * タスクステータス
 */
export type TaskStatus = 
  | 'pending'           // 0: 実行待ち
  | 'in_progress'       // 1: 実行中
  | 'review_waiting'    // 2: レビュー待ち
  | 'completed'         // 3: 完了
  | 'forced_terminated'; // 4: 強制終了（異常終了）

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
 * タスクステータスマッピング（DB数値 → 文字列）
 */
export const TASK_STATUS_MAP: Record<number, TaskStatus> = {
  0: 'pending',
  1: 'in_progress',
  2: 'review_waiting',
  3: 'completed',
  4: 'forced_terminated'
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
