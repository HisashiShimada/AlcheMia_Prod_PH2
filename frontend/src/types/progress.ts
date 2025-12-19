/**
 * 進捗確認関連の型定義
 */

/**
 * プロジェクトステータス
 */
export type ProjectStatus = 
  | 'planning'          // 計画中
  | 'pending'           // タスク実行待ち
  | 'in_progress'       // タスク実行中
  | 'review_waiting'    // タスク結果レビュー待ち
  | 'completed'         // プロジェクト完了
  | 'error';            // タスク異常終了

/**
 * ファイルデータ
 */
export interface FileData {
  maimlFileKey: string;
  fileName: string;
}

/**
 * チェックアウト状態
 */
export interface CheckoutStatus {
  isCheckedOut: boolean;
  checkoutBy?: string;
}

/**
 * プロジェクト基本情報（共通型定義）
 * プロジェクト管理画面と進捗確認画面の両方で使用
 */
export interface Project {
  id: string;
  name: string;
  folderName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  fileCount: number;
  totalSize: number;
  owner: string;
  department: string;
  members: string[];
  tags: string[];
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  // タスク情報（進捗確認画面用）
  completedTasks: number;
  totalTasks: number;
  // 追加情報（進捗確認画面用）
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
}

/**
 * プロジェクト進捗情報（進捗確認画面用）
 * @deprecated Project型を使用してください
 */
export interface ProjectProgress {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  department: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  isCheckedOut: boolean;
  completedTransitions: number;
  totalTransitions: number;
  lastUpdated: string;
}

/**
 * プロジェクト情報（詳細ダイアログ用）
 */
export interface ProjectInfo {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  owner: string;
  department?: string;
  status: ProjectStatus;
  methods: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * ファイル基本情報
 */
export interface FileInfo {
  fileName: string;
  maimlFileKey: string;
  organizationId: string;
  checkoutStatus?: CheckoutStatus;
}

/**
 * トランジション進捗状態
 */
export interface TransitionProgress {
  transitionId: string;
  transitionName?: string;
  progressStatus: string;
  progressPercentage?: number;
  assignedWorker?: string;
  startDate?: string;
  endDate?: string;
  latestStatus?: string;
}

/**
 * 進捗統計
 */
export interface ProgressStats {
  totalTransitions: number;
  completed: number;
  working: number;
  paused: number;
  notStarted: number;
  completionRate: number;
}

/**
 * タスクステータス
 */
export type TaskStatus = 
  | 'pending'          // 実行待ち
  | 'in_progress'      // 実行中
  | 'error'            // 異常終了
  | 'review_waiting'   // レビュー待ち
  | 'completed';       // 完了

/**
 * 作業詳細
 */
export interface WorkDetail {
  workId: string;
  taskName?: string;
  methodName?: string; // このタスクが属するメソッド名
  workStatus: TaskStatus;
  assignedWorkerId?: string;
  progressPercentage: number;
  stats: ProgressStats;
  transitionProgress: TransitionProgress[];
}

/**
 * ファイル詳細情報
 */
export interface FileDetails {
  projectInfo?: ProjectInfo;
  fileInfo: FileInfo;
  workDetails: WorkDetail[];
}

/**
 * Petri Netノードデータ
 */
export interface PlaceNode {
  id: string;
  type: 'place';
  data: {
    label: string;
    stereotype?: string;
  };
}

export interface TransitionNode {
  id: string;
  type: 'transition';
  data: {
    label: string;
    stereotype?: string;
  };
}

/**
 * Petri Netアーク
 */
export interface Arc {
  id: string;
  source: string;
  target: string;
}

/**
 * Petri Net構造データ
 */
export interface PetriNetData {
  places: PlaceNode[];
  transitions: TransitionNode[];
  arcs: Arc[];
}

/**
 * 実験記録データ
 */
export interface ExperimentRecord {
  transitionId: string;
  [key: string]: unknown;
}

export interface ExperimentRecordsData {
  materials?: ExperimentRecord[];
  conditions?: ExperimentRecord[];
  results?: ExperimentRecord[];
}
