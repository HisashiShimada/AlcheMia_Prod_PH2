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
  organizationGroup: string;
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
  organizationGroup: string;
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
  organizationGroup?: string;
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 全体進捗タブ（ProgressOverviewTab）用型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 全体進捗テーブルの行レコード */
export interface ProgressRow {
  /** テーブルのキー（`${taskNo}-${transitionId}` 等の一意な値） */
  rowKey: string;
  taskNo: number;
  methodId: string;
  /** メソッド名（未設定時は methodId をフォールバック表示） */
  methodName?: string;
  transitionId: string;
  /** トランジション名（未設定時は transitionId をフォールバック表示） */
  transitionName?: string;
  /** ステータス文字列（バックエンドの数値→文字列変換済み） */
  status: 'not_started' | 'preparing' | 'ready' | 'in_progress' | 'on_hold' | 'completed' | 'issue';
  /** 記録済みプロパティが1件以上ある場合 true */
  hasRecord: boolean;
  /** Material 入力進捗 */
  materialRecorded?: number;
  materialTotal?: number;
  /** Condition 入力進捗 */
  conditionRecorded?: number;
  conditionTotal?: number;
  /** Result 入力進捗 */
  resultRecorded?: number;
  resultTotal?: number;
  /** 問題報告数 */
  issueCount?: number;
  /** 表示順序・推奨実行順序（省略時は 0 として扱う） */
  order?: number;
  /**
   * 前提となるトランジションIDの配列。
   * これらが全て completed になるまでこのトランジションは開始不可。
   * 空配列または省略時は依存なし（いつでも開始可能）。
   *
   * @example [] // 依存なし
   * @example ['TR_A', 'TR_B'] // TR_A と TR_B 両方完了後のみ開始可能
   */
  prerequisiteTransitionIds?: string[];
}

/** ProgressOverviewTab コンポーネントの Props */
export interface ProgressOverviewTabProps {
  rows: ProgressRow[];
  /** 「作業へ」ボタン押下時: 作業記録タブに遷移し、指定タスク+トランジションを表示 */
  onGoToWork: (taskNo: number, transitionId: string) => void;
  /** 「詳細確認」ボタン押下時: 作業記録タブを読取専用で表示 */
  onViewDetail: (taskNo: number, transitionId: string) => void;
  /**
   * 「開始」ボタン押下時: 未着手トランジションの作業を開始する。
   * 作業中のトランジションが存在する場合は確認ダイアログを経由してステータスを切り替える。
   * methodId を含めることでバックエンドAPIへの正確なルーティングを可能にする。
   * 省略時は onGoToWork にフォールバック。
   */
  onStartWork?: (taskNo: number, transitionId: string, methodId: string) => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// トランジション進捗API（fetchTransitionStatus）用型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * トランジション進捗レスポンス項目
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
 */
export interface TransitionStatusItem {
  transitionId: string;
  transitionName: string;
  progressStatus: string;
  latestStatus: string;
  progressPercentage: number;
  /** MAIMLから取得した Material 定義数 */
  materialCount?: number;
  /** DBから取得した Material 実績数 */
  materialActualCount?: number;
  /** MAIMLから取得した Condition 定義数 */
  conditionCount?: number;
  /** DBから取得した Condition 実績数 */
  conditionActualCount?: number;
  /** MAIMLから取得した Result 定義数 */
  resultCount?: number;
  /** DBから取得した Result 実績数 */
  resultActualCount?: number;
  /**
   * このトランジションの前提となるトランジションIDの配列
   * PetriNet のアーク構造から算出。空配列の場合は前提なし（即時開始可能）
   */
  prerequisiteTransitionIds?: string[];
}

/** fetchTransitionStatus のレスポンス型 */
export interface FetchTransitionStatusResponse {
  success: true;
  data: {
    transitionStatus: TransitionStatusItem[];
  };
}
