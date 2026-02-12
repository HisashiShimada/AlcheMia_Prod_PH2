/**
 * プロジェクト関連の型定義
 */

/**
 * プロジェクトステータス
 */
export type ProjectStatus = 
  | 'planning'        // プロジェクト計画中
  | 'pending'         // タスク実行待ち
  | 'in_progress'     // タスク実行中
  | 'review_waiting'  // タスク結果レビュー待ち
  | 'completed'       // プロジェクト完了
  | 'error';          // タスク異常終了

/**
 * プロジェクト
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
  departmentName?: string;
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
  | 'pending'         // 実行待ち
  | 'in_progress'     // 実行中
  | 'error'           // 異常終了
  | 'review_waiting'  // レビュー待ち
  | 'completed';      // 完了

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
  
  // TaskResultsTable用の追加プロパティ（エイリアス・オプション）
  workId?: string;              // taskIdのエイリアス
  taskName?: string;            // transitionNameのエイリアス
  methodName?: string;          // メソッド名
  assignedWorker?: string;      // workerNameのエイリアス
  progressPercentage?: number;  // progressのエイリアス
  workCompletedAt?: string | null;    // 作業終了日
  reviewCompletedAt?: string | null;  // レビュー完了日
}

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

/**
 * プロジェクト作成データ
 */
export interface CreateProjectData {
  name: string;
  folderName: string;
  description: string;
  owner: string;
  department: string;
}

/**
 * プロジェクト更新データ
 */
export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  tags?: string[];
  members?: string[];
}

/**
 * プロジェクトフィルタ条件
 */
export interface ProjectFilterParams {
  search?: string;
  ownerFilter?: 'my_only' | 'all';
  checkoutFilter?: 'all' | 'checked_in' | 'checked_out';
  projectStatusFilter?: 'all' | ProjectStatus;
  departmentFilter?: string;
  showMaimlOnly?: boolean;
  sortBy?: 'name' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * プロジェクト統計情報
 */
export interface ProjectStats {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byDepartment: Record<string, number>;
  checkedOut: number;
  checkedIn: number;
}

/**
 * プロジェクト一覧レスポンス
 */
export interface ProjectListResponse {
  projects: Project[];
  stats?: ProjectStats;
}

/**
 * プロジェクト詳細レスポンス
 */
export interface ProjectDetailResponse {
  project: Project;
}

/**
 * プロジェクトチェックアウトリクエスト
 */
export interface CheckoutProjectRequest {
  projectId: string;
  userId: string;
}

/**
 * プロジェクトチェックアウトレスポンス
 */
export interface CheckoutProjectResponse {
  projectId: string;
  checkedOutBy: string;
  checkedOutAt: string;
}

/**
 * プロジェクト編集パラメータ
 */
export interface ProjectEditParams {
  projectId: string;
  projectName: string;
  projectOverview?: string;
  sourceS3Key: string;
}
