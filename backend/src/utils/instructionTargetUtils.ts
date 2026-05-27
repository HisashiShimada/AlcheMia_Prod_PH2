/**
 * 指示対象（instruction_target）の導出ユーティリティ
 *
 * project_instruction テーブルの instruction_target カラム削除に伴い、
 * method_id / task_no / transition_id から動的に指示対象を判定する。
 *
 * 判定ルール（指示送信ボタン処理と同一）:
 *   task_no が非NULL・非空         → 3: タスク
 *   transition_id が非NULL・非空  → 2: トランジション
 *   method_id が非NULL・非空      → 1: メソッド
 *   いずれも空/NULL               → 0: ファイル全体
 */

/**
 * 指示対象値の定数
 */
export const INSTRUCTION_TARGET = {
  /** ファイル全体（プロジェクト指示） */
  FILE: 0,
  /** メソッド単位 */
  METHOD: 1,
  /** トランジション単位 */
  TRANSITION: 2,
  /** タスク単位 */
  TASK: 3,
} as const;

export type InstructionTargetValue = typeof INSTRUCTION_TARGET[keyof typeof INSTRUCTION_TARGET];

/**
 * method_id / task_no / transition_id から instruction_target 値を導出する
 *
 * @param methodId - メソッドID（nullまたは空文字の場合はメソッド指定なし）
 * @param taskNo - タスク連番（nullの場合はタスク指定なし）
 * @param transitionId - トランジションID（nullまたは空文字の場合はトランジション指定なし）
 * @returns 0=ファイル全体, 1=メソッド, 2=トランジション, 3=タスク
 */
export function deriveInstructionTarget(
  methodId: string | null | undefined,
  taskNo: number | null | undefined,
  transitionId: string | null | undefined
): InstructionTargetValue {
  // task_no が存在する（non-null）→ タスク指示
  if (taskNo !== null && taskNo !== undefined) {
    return INSTRUCTION_TARGET.TASK;
  }
  // transition_id が非空文字列 → トランジション指示
  if (transitionId && transitionId !== '') {
    return INSTRUCTION_TARGET.TRANSITION;
  }
  // method_id が非空文字列 → メソッド指示
  if (methodId && methodId !== '') {
    return INSTRUCTION_TARGET.METHOD;
  }
  // いずれも空/NULL → ファイル全体指示
  return INSTRUCTION_TARGET.FILE;
}
