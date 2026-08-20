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
 * 指示データ（保存用）
 * タスク登録タブから一括保存する際に使用
 */
export interface InstructionInsertData {
  methodId: string | null;
  content: string;
  targetType: number;
  transitionId: string | null;
  taskNumber: number | null;
  /** MAIMLのpropertyタグキー（指示種別） */
  instructionKey: string;
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
  instructions?: InstructionInsertData[];
}

/**
 * タスク登録保存レスポンス
 */
export interface SaveTaskRegistrationResponse {
  success: boolean;
  message: string;
}
