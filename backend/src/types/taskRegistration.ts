/**
 * Task Registration Types
 * 
 * タスク登録API用の型定義
 * 
 * @module taskRegistration
 * @version 1.0.0
 * @date 2026-02-20
 */

/**
 * タスク登録データ（単一タスク）
 */
export interface TaskRegistrationData {
  methodId: string;
  experimentCondition: number;
  trialCount: number;
  experimentOrder: number;
  workerLinkedFlg: boolean;
}

/**
 * 実験条件オプション
 */
export interface ExperimentConditionOption {
  value: number;
  label: string;
}

/**
 * タスク登録取得レスポンス
 */
export interface GetTaskRegistrationResponse {
  tasks: TaskRegistrationData[];
  isCheckoutLocked: boolean;
  isMaimlRegistered: boolean;
}

/**
 * タスク登録保存リクエスト
 */
export interface SaveTaskRegistrationRequest {
  tasks: {
    methodId: string;
    experimentCondition: number;
    trialCount: number;
    experimentOrder: number; // タスク登録タブ上の作業順序
    workerLinkedFlg?: boolean; // 作業者連携済フラグ（オプション、デフォルト: false）
  }[];
  /**
   * 指示リスト（オプション）
   * タスク登録タブから追加された指示を一括保存する際に使用
   */
  instructions?: {
    methodId: string;
    content: string;
    priority: number;
    type: number;
    targetType: number;
    transitionId: string | null;
    taskNumber: number | null;
  }[];
}

/**
 * タスク登録保存レスポンス
 */
export interface SaveTaskRegistrationResponse {
  success: boolean;
  message: string;
}
