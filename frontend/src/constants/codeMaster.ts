/**
 * code_master テーブルに登録されているコード値の定数定義
 *
 * @remarks
 * すべてのコード区分（code_division）に対応する定数をこのファイルで一元管理する。
 * 参照元: backend/src/sql/queries/codeMaster/insertInitialData.sql
 *
 * ルール:
 * - コード値（数値）を直接コードに記述することを禁止する
 * - 必ずここで定義した定数を import して使用すること
 */

// ============================================================
// project_status: プロジェクト進捗ステータス
// ============================================================

/**
 * プロジェクトステータス定数
 *
 * code_division = 'project_status'
 */
export const ProjectStatus = {
  /** プロジェクト計画中 */
  PLANNING: 0,
  /** タスク実行待ち */
  TASK_PENDING: 1,
  /** タスク実行中 */
  TASK_IN_PROGRESS: 2,
  /** タスク結果レビュー待ち */
  REVIEW_WAITING: 3,
  /** プロジェクト完了 */
  COMPLETED: 4,
  /** タスク異常終了 */
  ERROR: 5,
} as const;

export type ProjectStatusType = typeof ProjectStatus[keyof typeof ProjectStatus];

// ============================================================
// checkout_status: プロジェクトチェックアウト状態
// ============================================================

/**
 * チェックアウトステータス定数
 *
 * code_division = 'checkout_status'
 */
export const CheckoutStatus = {
  /** チェックイン中（未チェックアウト） */
  CHECKED_IN: 0,
  /** チェックアウト済 */
  CHECKED_OUT: 1,
} as const;

export type CheckoutStatusType = typeof CheckoutStatus[keyof typeof CheckoutStatus];

// ============================================================
// task_status: タスク進捗ステータス
// ============================================================

/**
 * タスクステータス定数
 *
 * code_division = 'task_status'
 */
export const TaskStatus = {
  /** 実行待ち */
  PENDING: 0,
  /** 実行中 */
  IN_PROGRESS: 1,
  /** レビュー待ち（承認依頼後） */
  REVIEW_WAITING: 2,
  /** 完了 */
  COMPLETED: 3,
  /** 異常終了 */
  FORCED_TERMINATED: 4,
  /** NG（再作業）- Manager がレビューで否認 */
  REVIEW_NG: 5,
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// ============================================================
// instruction_status: 指示送信ステータス
// ============================================================

/**
 * 指示ステータス定数
 *
 * code_division = 'instruction_status'
 */
export const InstructionStatus = {
  /** 未送信 */
  UNSENT: 0,
  /** 送信済 */
  SENT: 1,
} as const;

export type InstructionStatusType = typeof InstructionStatus[keyof typeof InstructionStatus];

// ============================================================
// instruction_priority: 実験指示の優先度
// ============================================================

/**
 * 指示優先度定数
 *
 * code_division = 'instruction_priority'
 */
export const InstructionPriority = {
  /** 低 */
  LOW: 0,
  /** 通常 */
  NORMAL: 1,
  /** 中 */
  MEDIUM: 2,
  /** 高 */
  HIGH: 3,
} as const;

export type InstructionPriorityType = typeof InstructionPriority[keyof typeof InstructionPriority];

// ============================================================
// instruction_type: 実験指示タイプ（数値コード）
// NOTE: 文字列ラベル用の InstructionType（constants/instructionType.ts）とは別物。
// ============================================================

/**
 * 指示タイプ（数値コード）定数
 *
 * code_division = 'instruction_type'
 * ※文字列ラベル用の InstructionType（constants/instructionType.ts）とは別物
 */
export const InstructionTypeCode = {
  /** 一般 */
  GENERAL: 0,
  /** セットアップ */
  SETUP: 1,
  /** 測定 */
  MEASUREMENT: 2,
  /** 安全 */
  SAFETY: 3,
  /** 清掃 */
  CLEANING: 4,
} as const;

export type InstructionTypeCodeType = typeof InstructionTypeCode[keyof typeof InstructionTypeCode];

// ============================================================
// issue_type: 問題タイプ
// ============================================================

/**
 * 問題タイプ定数
 *
 * code_division = 'issue_type'
 */
export const IssueType = {
  /** 材料不足 */
  MATERIAL_SHORTAGE: 0,
  /** 機器故障 */
  EQUIPMENT_FAILURE: 1,
  /** 手順不明確 */
  UNCLEAR_PROCEDURE: 2,
  /** 安全性の懸念 */
  SAFETY_CONCERN: 3,
  /** 品質問題 */
  QUALITY_ISSUE: 4,
  /** 時間制約 */
  TIME_CONSTRAINT: 5,
  /** その他 */
  OTHER: 6,
} as const;

export type IssueTypeType = typeof IssueType[keyof typeof IssueType];

// ============================================================
// experiment_condition: 繰り返し実験条件
// ============================================================

/**
 * 実験条件定数
 *
 * code_division = 'experiment_condition'
 */
export const ExperimentCondition = {
  /** 全て同一条件で実行 */
  SAME_CONDITIONS: 0,
  /** 実験条件（個別条件） */
  INDIVIDUAL_CONDITIONS: 1,
} as const;

export type ExperimentConditionType = typeof ExperimentCondition[keyof typeof ExperimentCondition];

// ============================================================
// instruction_target: 実験指示の対象タイプ
// ============================================================

/**
 * 指示対象タイプ定数
 *
 * code_division = 'instruction_target'
 * code_value: 0=ファイル全体, 1=特定タスク, 2=特定トランジション
 */
export const InstructionTarget = {
  /** ファイル全体 */
  FILE: 0,
  /** 特定タスク */
  TASK: 1,
  /** 特定トランジション */
  TRANSITION: 2,
} as const;

export type InstructionTargetType = typeof InstructionTarget[keyof typeof InstructionTarget];

// ============================================================
// transition_status: トランジション進捗ステータス（数値）
// NOTE: バックエンドの TransitionStatusEnum に対応
// ============================================================

/**
 * トランジションステータス定数
 *
 * @remarks
 * backend/src/types/transitionData.ts の TransitionStatusEnum に対応
 * 1: 初期状態, 2: 準備中, 3: 準備完了, 4: 実行中, 5: 一時停止, 6: 完了, 7: エラー
 */
export const TransitionStatusCode = {
  /** 初期状態（未開始） */
  INITIAL: 1,
  /** 準備状態 */
  PREPARING: 2,
  /** 準備完了状態 */
  READY: 3,
  /** 動作状態（実行中） */
  IN_PROGRESS: 4,
  /** 休止状態（一時停止） */
  PAUSED: 5,
  /** 終状態（完了） */
  COMPLETED: 6,
  /** 異常終了状態 */
  ERROR: 7,
} as const;

export type TransitionStatusCodeType = typeof TransitionStatusCode[keyof typeof TransitionStatusCode];
