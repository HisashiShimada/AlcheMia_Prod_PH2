/**
 * 進捗データ取得API - 型定義
 * 
 * @description 進捗データ取得APIで使用する型定義
 * Feature: progress-data-retrieval-api
 * Task: 1.2 型定義の整備
 */

/**
 * トランジションステータス
 * 
 * - not_started: 未開始
 * - in_progress: 進行中
 * - completed: 完了
 */
export type TransitionStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * トランジション進捗情報
 * 
 * @description 各トランジションの進捗状態を表す
 * @requirements Requirement 1: 進捗データ取得機能
 */
export interface TransitionProgress {
  /** トランジションID */
  transition_id: string;
  
  /** トランジション名 */
  transition_name: string;
  
  /** ステータス */
  status: TransitionStatus;
  
  /** 進捗率（0-100） */
  progress: number;
  
  /** 最終更新日時（ISO 8601形式）またはnull */
  last_updated: string | null;
  
  /** 実験記録データの有無 */
  has_data: boolean;
  
  /** 実験記録データ件数 */
  data_count: number;
}

/**
 * 全体進捗情報
 * 
 * @description タスク全体の進捗サマリー
 * @requirements Requirement 1: 進捗データ取得機能, Requirement 9: データ整合性
 */
export interface OverallProgress {
  /** 総トランジション数 */
  total_transitions: number;
  
  /** 完了済みトランジション数 */
  completed: number;
  
  /** 進行中トランジション数 */
  in_progress: number;
  
  /** 未開始トランジション数 */
  not_started: number;
  
  /** 全体進捗率（小数点第1位） */
  overall_percentage: number;
}

/**
 * 進捗データ（APIレスポンス用）
 * 
 * @description GET /api/v1/progress/:projectId/:methodId/:taskNo のレスポンスデータ
 * @requirements Requirement 1: 進捗データ取得機能, Requirement 5: データ取得とレスポンス生成
 */
export interface ProgressData {
  /** プロジェクトID */
  project_id: string;
  
  /** プロジェクト名 */
  project_name: string;
  
  /** メソッドID */
  method_id: string;
  
  /** メソッド名 */
  method_name: string;
  
  /** タスク連番 */
  task_no: number;
  
  /** タスク名 */
  task_name: string;
  
  /** トランジション進捗情報配列 */
  transitions: TransitionProgress[];
  
  /** 全体進捗情報 */
  overall_progress: OverallProgress;
}

/**
 * 進捗サービスエラー型
 * 
 * @description ProgressServiceで発生するエラーの種類
 * @requirements Requirement 6: エラーハンドリング
 */
export type ProgressServiceError =
  | { code: 'TASK_NOT_FOUND'; message: string }
  | { code: 'METHOD_NOT_FOUND'; message: string }
  | { code: 'MAIML_DOWNLOAD_FAILED'; message: string }
  | { code: 'MAIML_PARSE_FAILED'; message: string }
  | { code: 'DATABASE_ERROR'; message: string };

/**
 * Petri Netトランジション情報
 * 
 * @description MAIMLファイルから抽出されるトランジション情報
 * @requirements Requirement 4: MAIMLファイルとの連携
 */
export interface PetriNetTransition {
  /** トランジションID */
  id: string;
  
  /** トランジション名 */
  name: string;
}

/**
 * パース済みメソッド情報
 * 
 * @description MAIMLファイルから抽出されるメソッド構造
 * @requirements Requirement 4: MAIMLファイルとの連携
 */
export interface ParsedMethod {
  /** メソッドID */
  methodId: string;
  
  /** メソッド名 */
  methodName: string;
  
  /** Petri Net構造 */
  petriNet: {
    /** トランジション配列 */
    transitions: PetriNetTransition[];
  };
}

/**
 * タスク基本情報（Repository層で使用）
 * 
 * @description TaskRepositoryのgetTaskByProjectMethodTaskNoメソッドの返却型
 * @remarks
 * - task_name: project_task.task_name（メソッド名として使用）
 * - task_no: project_task_detail.task_no（タスク連番）
 * @requirements Requirement 1: 進捗データ取得機能
 */
export interface TaskWithProject {
  /** タスク名（project_task.task_name） */
  task_name: string;
  
  /** プロジェクトID */
  project_id: string;
  
  /** プロジェクト名 */
  project_name: string;
  
  /** メソッドID */
  method_id: string;
  
  /** タスク連番（project_task_detail.task_no） */
  task_no: number;
}

/**
 * 実験記録情報（Repository層で使用）
 * 
 * @description ExperimentRecordRepositoryのgetLatestRecordByTransitionメソッドの返却型
 * @requirements Requirement 1: 進捗データ取得機能
 */
export interface ExperimentRecord {
  /** 実験記録ID */
  record_id: string;
  
  /** ステータス */
  status: TransitionStatus;
  
  /** 進捗率（0-100） */
  progress: number;
  
  /** 更新日時 */
  update_at: Date;
}
