/**
 * 進捗確認関連の型定義
 */

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
  lastUpdated?: string;
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
  completionRate: number;
}

/**
 * 作業詳細
 */
export interface WorkDetail {
  workId: string;
  workStatus: 'in_progress' | 'paused' | 'completed';
  assignedWorkerId?: string;
  progressPercentage: number;
  stats: ProgressStats;
  transitionProgress: TransitionProgress[];
}

/**
 * ファイル詳細情報
 */
export interface FileDetails {
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
