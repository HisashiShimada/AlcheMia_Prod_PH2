/**
 * taskRegistration.ts
 * タスク登録に関する型定義
 */

/**
 * メソッド情報の型
 */
export interface MethodInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

/**
 * タスク登録項目（API）
 */
export interface TaskRegistrationItem {
  methodId: string;
  experimentCondition: number;
  trialCount: number;
  experimentOrder: number;
}

/**
 * タスク登録情報取得APIのレスポンス
 */
export interface GetTaskRegistrationResponse {
  tasks: TaskRegistrationItem[];
  isCheckoutLocked: boolean;
  isMaimlRegistered: boolean;
}

/**
 * 実験条件オプションの型
 */
export interface ExperimentConditionOption {
  value: number;
  label: string;
}

/**
 * タスク詳細の型（UI用）
 */
export interface TaskDetail {
  id: number;
  methodId: string;
  experimentCondition: number; // 0: 全て同一条件, 1: 実験ごとに条件変更
  trialCount: number;
  experimentOrder?: number; // 実験順序
  taskNumberOptions: number[]; // 指示入力部用のタスク番号リスト
}

/**
 * タスク登録データの保存形式（UI用）
 */
export interface TaskRegistrationData {
  projectId: string;
  projectName: string;
  tasks: TaskDetail[];
  savedAt: string;
}

/**
 * タスク登録保存項目（API）
 */
export interface SaveTaskRegistrationItem {
  methodId: string;
  experimentCondition: number;
  trialCount: number;
}

/**
 * タスク登録保存APIのリクエスト
 */
export interface SaveTaskRegistrationRequest {
  tasks: SaveTaskRegistrationItem[];
}

/**
 * タスク登録保存APIのレスポンス
 */
export interface SaveTaskRegistrationResponse {
  success: boolean;
  message: string;
}
