/**
 * プロジェクト関連の型定義
 */

import { TaskStatusType } from '@/constants/codeMaster';

/**
 * プロジェクト
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
  department: string;
  departmentName?: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedTasks?: number;
  totalTasks?: number;
  maimlFileKey?: string | null;
  project_uuid?: string | null;
}

/**
 * タスクステータス（数値コード）
 * constants/codeMaster.ts の TaskStatus を使用すること
 * 0=実行待ち, 1=実行中, 2=レビュー待ち, 3=完了, 4=異常終了
 */
export type TaskStatus = TaskStatusType;

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
  
  // TaskResultsTable用の追加プロパティ
  workId?: string;              // taskIdのエイリアス
  taskName?: string;            // transitionNameのエイリアス
  methodName?: string;          // メソッド名
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
 * プロジェクト更新データ
 */
export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: number;
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
  projectStatusFilter?: 'all' | number;
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
  byStatus: Record<number, number>;
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
 * プロジェクト詳細レスポンス（フロントエンド用）
 */
export interface ProjectDetailResponse {
  project: Project;
}

/**
 * プロジェクト詳細APIレスポンス（バックエンドの実レスポンス形式）
 * API: GET /api/v1/projects/:projectId
 */
export interface ProjectDetailApiResponse {
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
 * プロジェクト作成リクエスト型
 * 使用箇所: services/projectApiService.ts
 */
export interface CreateProjectRequest {
  projectName: string;
  description?: string;
}

/**
 * プロジェクト作成レスポンス型
 * 使用箇所: services/projectApiService.ts
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
  projectId: string;
  projectName: string;
  projectCd?: string;
  projectStatus: number;
  useDeemedProgress?: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
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
  status: 2;
  update_at: string;
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
  progress_rate: string;
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
 * 実験作業者用タスク一覧レスポンス型
 * API: GET /api/v1/progress/projects/:projectId/worker-tasks
 */
export interface WorkerTasksResponse {
  project_id: string;
  project_name: string;
  methods: WorkerMethod[];
}

/**
 * タスクステータス更新レスポンス型
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
 */
export interface WorkerInstruction {
  id: string;
  project_id: string;
  project_name: string;
  method_id: string;
  method_name: string;
  transition_id: string;
  transition_name: string;
  task_no: string | null;
  instruction_content: string;
  priority: string;
  type: string;
  create_at: string;
  created_by: string;
  created_by_name: string;
  is_acknowledged: boolean;
}

/**
 * 指示確認データ型（バックエンドAPIレスポンス）
 */
export interface InstructionConfirmationData {
  instruction_id: string;
  is_acknowledged: boolean;
  acknowledged_at: string;
  acknowledged_user_id: string;
  acknowledged_user_name: string;
}

/**
 * プロジェクトファイル一覧レスポンス型（API用）
 * サービス層で使用するレスポンス型
 */
export interface ProjectFileListResponse {
  projectId: string;
  projectName: string;
  files: import('./file').ProjectFile[];
  subFolderFiles: Record<string, import('./file').ProjectFile[]>;
}

/**
 * 進捗情報の表示用型定義
 * ProgressMonitoring コンポーネントで使用
 */
export interface ProgressRecord {
  key: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  department: string;
  isCheckedOut: boolean;
  ownerEmail: string;
  ownerName: string;
  completedTasks: number;
  totalTasks: number;
  /** MAIMLファイルが登録済みか（project_uuid または maimlFileKey が存在する場合 true） */
  hasMaiml: boolean;
}

// ---------------------------------------------------------------------------
// ExperimentWorker / ProjectSelectionModal 用
// ---------------------------------------------------------------------------

/**
 * プロジェクト選択モーダルのテーブル行データ
 * ExperimentWorker/ProjectSelectionModal で使用
 */
export interface ProjectTableData {
  key: string;
  projectId: string;
  projectName: string;
  projectCd?: string;
  projectStatus: number;
  isCurrentlySelected: boolean;
}

/**
 * メソッド選択モーダルのテーブル行データ
 * ExperimentWorker/MethodSelectionModal で使用
 */
export interface MethodTableData {
  key: string;
  methodId: string;
  methodName: string;
  description: string;
  owner: string;
  isCurrentlySelected: boolean;
}

/**
 * プロジェクト作成データ
 * 移動元: components/project/CreateProjectModal.tsx
 */
export interface CreateProjectData {
  projectName: string;
  description: string;
  folderName: string;
  owner: string;
  department: string;
  organizationId: string;
  /** チームID（任意）。選択時はそのチームのメンバーのみアクセス可。未選択時は部署全員がアクセス可。 */
  teamId?: string;
}

/**
 * ファイルアップロードモード
 * 移動元: components/project/BulkUploadDialog.tsx
 */
export type UploadMode = 'single' | 'bulk' | 'folder';

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
 * アップロード状態
 * 移動元: components/project/BulkUploadDialog.tsx
 */
export interface UploadState {
  isUploading: boolean;
  progress: number;
  uploadedCount: number;
  totalCount: number;
  error: string | null;
}

/**
 * プロジェクトのファイルデータ（ルート + サブフォルダ）
 * 移動元: components/project/ProjectManagement.tsx
 */
export interface ProjectFilesData {
  root: import('./file').ProjectFile[];
  subFolderFiles: Record<string, import('./file').ProjectFile[]>;
}

