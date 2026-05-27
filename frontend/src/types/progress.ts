/**
 * 進捗確認関連の型定義
 */

import {
  ProjectStatusType,
  TaskStatusType,
} from '@/constants/codeMaster';

/**
 * プロジェクトステータス（数値コード）
 * constants/codeMaster.ts の ProjectStatus を使用すること
 * 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=レビュー待ち, 4=完了, 5=異常終了
 */
export type ProjectStatus = ProjectStatusType;

/**
 * ファイルデータ
 */
export interface FileData {
  maimlFileKey: string;
  fileName: string;
  projectId: string;
}

/**
 * チェックアウト状態情報（UI表示用）
 * ※ constants/codeMaster.ts の CheckoutStatus（数値定数）とは別物
 */
export interface CheckoutStatusInfo {
  isCheckedOut: boolean;
  checkoutBy?: string;
}

/** @deprecated CheckoutStatusInfo を使用してください */
export type CheckoutStatus = CheckoutStatusInfo;

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
  // MAIMLファイル情報（progress.ts ではオプション）
  maimlFileKey?: string | null;
  project_uuid?: string | null;
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
 * タスクステータス（数値コード）
 * constants/codeMaster.ts の TaskStatus を使用すること
 * 0=実行待ち, 1=実行中, 2=レビュー待ち, 3=完了, 4=異常終了
 */
export type TaskStatus = TaskStatusType;

/**
 * 作業詳細
 */
export interface WorkDetail {
  workId: string;
  taskNo: number;          // タスク連番（タスクNo）（project_task.experiment_order）
  methodName?: string;     // このタスクが属するメソッド名
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
 * Method情報（複数メソッド対応）
 */
export interface MethodData {
  methodId: string;
  methodName?: string;
  places: PlaceNode[];
  transitions: TransitionNode[];
  arcs: Arc[];
}

/**
 * Petri Net構造データ
 */
export interface PetriNetData {
  fileKey?: string;
  isMultiMethod?: boolean;
  methods?: MethodData[];
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
