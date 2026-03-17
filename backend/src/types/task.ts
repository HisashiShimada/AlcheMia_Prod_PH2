/**
 * Task型定義
 * 
 * @description タスク一覧取得APIの型定義
 * Feature: worker-task-list-api
 * Task: 1.2 TaskRepositoryインターフェースと実装の作成
 */

/**
 * タスクステータス
 */
export type TaskStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'review_waiting'
  | 'completed' 
  | 'forced_terminated';

/**
 * タスクソートフィールド
 */
export type TaskSortField = 
  | 'task_no' 
  | 'created_at' 
  | 'updated_at' 
  | 'status';

/**
 * タスクフィルタ条件
 */
export interface TaskFilters {
  /** メソッドID */
  methodId?: string;
  
  /** タスクステータス */
  status?: TaskStatus;
  
  /** 担当者ID */
  assignUserId?: string;
  
  /** ソート基準 */
  sortBy?: TaskSortField;
  
  /** ソート順序 */
  order?: 'asc' | 'desc';
}

/**
 * メソッドとタスク詳細のレコード（DBから取得）
 * 
 * project_taskとproject_task_detailをJOINした結果
 */
export interface MethodTaskRecord {
  // メソッド情報（project_task）
  method_id: string;
  method_name: string;
  experiment_order: number;
  
  // タスク詳細情報（project_task_detail）
  task_detail_id: string | null;
  task_detail_no: number | null;
  task_status: number | null;  // DBから返される値は数値（0, 1, 3, 4）
  assign_user_id: string | null;
  assign_user_name: string | null;
  progress_rate: number;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * タスクサマリー（APIレスポンス用）
 */
export interface TaskSummary {
  task_id: string;
  task_no: number;
  task_status: TaskStatus;
  assign_user_id: string | null;
  assign_user_name: string | null;
  progress_rate: number;
  created_at: string;
  updated_at: string;
}

/**
 * メソッドグループ（APIレスポンス用）
 */
export interface MethodGroup {
  method_id: string;
  method_name: string;
  experiment_order: number;
  tasks: TaskSummary[];
}