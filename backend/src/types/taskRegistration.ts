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
  }[];
}

/**
 * タスク登録保存レスポンス
 */
export interface SaveTaskRegistrationResponse {
  success: boolean;
  message: string;
}
