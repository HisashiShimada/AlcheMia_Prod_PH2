/**
 * code_master テーブルに登録されているコード値のENUM定義
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
 * プロジェクトステータスのEnum定義
 *
 * code_division = 'project_status'
 */
export const ProjectStatusEnum = {
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

export type ProjectStatusEnumType = typeof ProjectStatusEnum[keyof typeof ProjectStatusEnum];

// ============================================================
// checkout_status: プロジェクトチェックアウト状態
// ============================================================

/**
 * チェックアウトステータスのEnum定義
 *
 * code_division = 'checkout_status'
 */
export const CheckoutStatusEnum = {
  /** チェックイン中（未チェックアウト） */
  CHECKED_IN: 0,
  /** チェックアウト済 */
  CHECKED_OUT: 1,
} as const;

export type CheckoutStatusEnumType = typeof CheckoutStatusEnum[keyof typeof CheckoutStatusEnum];

// ============================================================
// task_status: タスク進捗ステータス
// NOTE: TaskStatusEnum は taskService.ts にも定義済み。
//       将来的にここへ集約予定。参照箇所は taskService.ts を使用。
// ============================================================

/**
 * タスクステータスのEnum定義
 *
 * code_division = 'task_status'
 */
export const TaskStatusEnum = {
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

export type TaskStatusEnumType = typeof TaskStatusEnum[keyof typeof TaskStatusEnum];

// ============================================================
// instruction_status: 指示送信ステータス
// ============================================================

/**
 * 指示ステータスのEnum定義
 *
 * code_division = 'instruction_status'
 */
export const InstructionStatusEnum = {
  /** 未送信 */
  UNSENT: 0,
  /** 送信済 */
  SENT: 1,
} as const;

export type InstructionStatusEnumType = typeof InstructionStatusEnum[keyof typeof InstructionStatusEnum];

// ============================================================
// instruction_priority: 実験指示の優先度
// ============================================================

/**
 * 指示優先度のEnum定義
 *
 * code_division = 'instruction_priority'
 */
export const InstructionPriorityEnum = {
  /** 低 */
  LOW: 0,
  /** 通常 */
  NORMAL: 1,
  /** 中 */
  MEDIUM: 2,
  /** 高 */
  HIGH: 3,
} as const;

export type InstructionPriorityEnumType = typeof InstructionPriorityEnum[keyof typeof InstructionPriorityEnum];

// ============================================================
// instruction_type: 実験指示タイプ（数値コード）
// NOTE: 文字列ラベル用の InstructionType（enums/instructionType.enum.ts）とは別物。
// ============================================================

/**
 * 指示タイプ（数値コード）のEnum定義
 *
 * code_division = 'instruction_type'
 * ※文字列ラベル用の InstructionType（enums/instructionType.enum.ts）とは別物
 */
export const InstructionTypeEnum = {
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

export type InstructionTypeEnumType = typeof InstructionTypeEnum[keyof typeof InstructionTypeEnum];

// ============================================================
// issue_type: 問題タイプ
// ============================================================

/**
 * 問題タイプのEnum定義
 *
 * code_division = 'issue_type'
 */
export const IssueTypeEnum = {
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

export type IssueTypeEnumType = typeof IssueTypeEnum[keyof typeof IssueTypeEnum];

// ============================================================
// experiment_condition: 繰り返し実験条件
// ============================================================

/**
 * 実験条件のEnum定義
 *
 * code_division = 'experiment_condition'
 */
export const ExperimentConditionEnum = {
  /** 全て同一条件で実行 */
  SAME_CONDITIONS: 0,
  /** 実験条件（個別条件） */
  INDIVIDUAL_CONDITIONS: 1,
} as const;

export type ExperimentConditionEnumType = typeof ExperimentConditionEnum[keyof typeof ExperimentConditionEnum];
