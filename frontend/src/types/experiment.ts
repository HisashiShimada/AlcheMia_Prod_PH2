/**
 * 実験記録関連の型定義
 */

/**
 * 実験ステータス
 */
export type ExperimentStatus = 
  | 'pending'         // 実行待ち
  | 'in_progress'     // 実行中
  | 'completed'       // 完了
  | 'error'           // 異常終了
  | 'review_waiting'; // レビュー待ち

/**
 * トランジションステータス
 */
export type TransitionStatus = 
  | 'not_started'    // 未着手
  | 'in_progress'    // 実行中
  | 'paused'         // 一時停止
  | 'completed'      // 完了
  | 'error';         // エラー

/**
 * 実験記録
 */
export interface ExperimentRecord {
  id: string;
  projectId: string;
  workerId: string;
  workerName?: string;
  maimlFileKey: string;
  status: ExperimentStatus;
  startedAt: string | null;
  completedAt: string | null;
  materials: MaterialRecord[];
  conditions: ConditionRecord[];
  results: ResultRecord[];
}

/**
 * 材料記録
 */
export interface MaterialRecord {
  id: string;
  name: string;
  placeId: string;
  placeName: string;
  amount?: number;
  unit?: string;
  purity?: string;
  supplier?: string;
  lotNumber?: string;
  notes?: string;
}

/**
 * 測定条件記録
 */
export interface ConditionRecord {
  id: string;
  name: string;
  placeId: string;
  placeName: string;
  value?: string;
  unit?: string;
  notes?: string;
}

/**
 * 結果記録
 */
export interface ResultRecord {
  id: string;
  name: string;
  placeId: string;
  placeName: string;
  value?: string;
  unit?: string;
  fileKey?: string;
  fileName?: string;
  notes?: string;
}

/**
 * トランジション進捗情報
 */
export interface TransitionProgress {
  transitionId: string;
  transitionName: string;
  latestStatus: TransitionStatus;
  progressStatus: string;
  lastUpdatedAt: string;
  completedCount?: number;
  totalCount?: number;
  errorMessage?: string;
}

/**
 * トランジション進捗サマリー
 */
export interface TransitionProgressSummary {
  totalTransitions: number;
  completed: number;
  inProgress: number;
  paused: number;
  notStarted: number;
  error: number;
  percentage: number;
}

/**
 * トランジション進捗レスポンス
 */
export interface TransitionStatusResponse {
  workerId: string;
  maimlFileKey: string;
  transitionStatus: TransitionProgress[];
  summary: TransitionProgressSummary;
}

/**
 * ペトリネット構造
 */
export interface PetriNetStructure {
  fileKey: string;
  isMultiMethod: boolean;
  methods: string[];
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
}

/**
 * Place（プレース）
 */
export interface Place {
  id: string;
  name: string;
  stereotype?: 'material' | 'condition' | 'result';
  template?: {
    id: string;
  };
  templateId?: string;
}

/**
 * Transition（トランジション）
 */
export interface Transition {
  id: string;
  name: string;
  methodId?: string;
  hasSubNet?: boolean;
}

/**
 * Arc（アーク）
 */
export interface Arc {
  id: string;
  source: string;
  target: string;
}

/**
 * 進捗記録フィルタ条件
 */
export interface ProgressFilterParams {
  search?: string;
  ownerFilter?: 'my_only' | 'all';
  checkoutFilter?: 'all' | 'checkedOut' | 'checkedIn';
  projectStatusFilter?: 'all' | ExperimentStatus;
  organizationGroupFilter?: string;
}

/**
 * 進捗記録（表示用）
 */
export interface ProgressRecord {
  key: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  organizationGroup: string;
  isCheckedOut: boolean;
  ownerEmail: string;
  ownerName: string;
  completedTasks: number;
  totalTasks: number;
}

/**
 * 実験記録取得レスポンス
 */
export interface ExperimentRecordsResponse {
  workId: string;
  data: {
    materials: MaterialRecord[];
    conditions: ConditionRecord[];
    results: ResultRecord[];
  };
  totalRecords: number;
}

/**
 * 実験記録作成リクエスト
 */
export interface CreateExperimentRecordRequest {
  projectId: string;
  workerId: string;
  maimlFileKey: string;
  materials: Partial<MaterialRecord>[];
  conditions: Partial<ConditionRecord>[];
  results: Partial<ResultRecord>[];
}

/**
 * 実験記録更新リクエスト
 */
export interface UpdateExperimentRecordRequest {
  recordId: string;
  status?: ExperimentStatus;
  materials?: Partial<MaterialRecord>[];
  conditions?: Partial<ConditionRecord>[];
  results?: Partial<ResultRecord>[];
}
