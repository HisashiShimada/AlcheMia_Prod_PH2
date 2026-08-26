import { TransitionStatusEnum, TransitionStatus } from './transitionData';

export { TransitionStatusEnum, TransitionStatus };

/**
 * 進捗データ取得API - 型定義
 * 
 * @description 進捗データ取得APIで使用する型定義
 * Feature: progress-data-retrieval-api
 * Task: 1.2 型定義の整備
 */

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
  
  /** MAIMLファイルから取得したトランジションに紐づく材料の定義数 */
  material_count: number;
  
  /** DBから取得したトランジションに紐づく材料の実績数 */
  material_actual_count: number;
  
  /** MAIMLファイルから取得したトランジションに紐づく条件の定義数 */
  condition_count: number;
  
  /** DBから取得したトランジションに紐づく条件の実績数 */
  condition_actual_count: number;
  
  /** MAIMLファイルから取得したトランジションに紐づく結果の定義数 */
  result_count: number;
  
  /** DBから取得したトランジションに紐づく結果の実績数 */
  result_actual_count: number;

  /**
   * このトランジションの前提となるトランジションIDの配列
   * PetriNet のアーク構造から算出: 入力プレースに出力している他トランジションのID
   */
  prerequisite_transition_ids: string[];

  /** 記録済みフラグ（TRUE=記録済み、FALSE=未記録） */
  is_recorded: boolean;
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
 * @remarks maimlService.ts の parsePetriNetStructure() が返す構造に対応
 * @requirements Requirement 4: MAIMLファイルとの連携
 */
export interface PetriNetTransition {
  /** トランジションID */
  id: string;
  
  /** ノードタイプ */
  type: string;
  
  /** トランジションデータ */
  data: {
    /** トランジション表示名 */
    label: string;
    
    /** メソッドID */
    methodId: string;
    
    /** ステレオタイプ（省略可能） */
    stereotype?: string;
    
    /** 説明（省略可能） */
    description?: string;
    
    /** インストラクションID（省略可能） */
    instructionId?: string;
    
    /** プログラム（省略可能） */
    program?: string;
  };
}

/**
 * パース済みメソッド情報
 * 
 * @description MAIMLファイルから抽出されるメソッド構造
 * @remarks maimlService.ts の parsePetriNetStructure() が返す methods[] の要素に対応
 * @requirements Requirement 4: MAIMLファイルとの連携
 */
export interface ParsedMethod {
  /** メソッドID */
  methodId: string;
  
  /** メソッド名 */
  methodName: string;
  
  /** メソッドインデックス */
  methodIndex: number;
  
  /** トランジション配列 */
  transitions: PetriNetTransition[];
  
  /** プレース配列 */
  places: any[];
  
  /** アーク配列 */
  arcs: any[];
  
  /** メタデータ */
  metadata: {
    uuid?: string;
    name?: string;
    description?: string;
    pnmlId?: string;
    pnmlName?: string;
  };
  
  /** 統計情報 */
  statistics: {
    placeCount: number;
    transitionCount: number;
    arcCount: number;
  };
}

/**
 * タスク基本情報（Repository層で使用）
 * 
 * @description TaskRepositoryのgetTaskByProjectMethodTaskNoメソッドの返却型
 * @remarks
 * - task_no: project_task_detail.task_no（タスク連番）
 * @requirements Requirement 1: 進捗データ取得機能
 */
export interface TaskWithProject {
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
