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
 * タスク詳細の型
 */
export interface TaskDetail {
  id: number;
  methodId: string;
  experimentCondition: 0 | 1; // 0: 全て同一条件, 1: 実験ごとに条件変更
  trialCount: number;
  taskNumberOptions: number[]; // 指示入力部用のタスク番号リスト
}

/**
 * タスク登録データの保存形式
 */
export interface TaskRegistrationData {
  projectId: string;
  projectName: string;
  tasks: TaskDetail[];
  savedAt: string;
}
