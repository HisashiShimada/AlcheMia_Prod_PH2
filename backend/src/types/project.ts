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
  owner: string;
  ownerName?: string;
  ownerEmail?: string;
  /** 組織階層グループCD */
  organizationGroup: string;
  /** 組織階層グループ名 */
  organizationGroupName?: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedTasks?: number;
  totalTasks?: number;
  maimlFileKey?: string | null;
  project_uuid?: string | null;
  /** ログインユーザーが編集可能かどうか（直接所属グループのプロジェクト or SystemAdmin） */
  isEditable?: boolean;
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

// ============================================================
// ProjectService で使用するオプション・結果型
// ============================================================

/**
 * プロジェクト一覧取得オプション
 *
 * @remarks
 * ProjectService.list() の引数として使用
 */
export interface ListOptions {
  includeCompleted: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
  /** ユーザーが直接所属する組織グループCDの配列 */
  organizationGroupCds?: string[];
  /** ユーザーのロールCD（'ROLE002' = SystemAdmin） */
  roleCd?: string;
  /** ログインユーザーID（非アクティブチームへの権限判定に使用） */
  userId?: string;
}

/**
 * サービス結果ラッパー
 *
 * @typeParam T - 成功時のデータ型
 */
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
 * チェックアウト状態情報
 *
 * @remarks
 * ProjectService.checkout / checkin / getCheckoutStatus で使用
 */
export interface ProjectCheckoutInfo {
  projectId: string;
  projectName: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
}

/**
 * 指示確認レスポンスデータ
 */
export interface InstructionConfirmationData {
  instruction_id: string;
  is_acknowledged: boolean;
  acknowledged_at: string;
  acknowledged_user_id: string;
  acknowledged_user_name: string;
}

/**
 * プロジェクトステータス → 文字列マッピング
 *
 * @remarks
 * code_master の project_status コード値と一致
 * ProgressService.getWorkDetails() 等で共通利用
 */
export const PROJECT_STATUS_STRING_MAP: Record<number, 'planning' | 'pending' | 'in_progress' | 'review_waiting' | 'completed' | 'error' | 'review_rejected'> = {
  0: 'planning',
  1: 'pending',
  2: 'in_progress',
  3: 'review_waiting',
  4: 'completed',
  5: 'error',
  6: 'review_rejected',
};
