/**
 * 指示対象（instruction_target）の導出ユーティリティ
 *
 * project_instruction テーブルの instruction_target カラム削除に伴い、
 * method_id / task_no / transition_id から動的に指示対象を判定する。
 *
 * 判定ルール（カラムの値の有無による組み合わせ判定）:
 *   method_id あり + transition_id あり + task_no あり → 3: タスク
 *   method_id あり + transition_id あり + task_no なし → 2: トランジション
 *   method_id あり + transition_id なし               → 1: メソッド
 *   method_id なし                                    → 0: ファイル全体
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
  const hasMethod = methodId !== null && methodId !== undefined && methodId !== '';
  const hasTransition = transitionId !== null && transitionId !== undefined && transitionId !== '';
  const hasTask = taskNo !== null && taskNo !== undefined;

  // method_id・transition_id・task_no の全てに値がある → タスク指示
  if (hasMethod && hasTransition && hasTask) {
    return INSTRUCTION_TARGET.TASK;
  }
  // method_id・transition_id に値がある（task_no は空） → トランジション指示
  if (hasMethod && hasTransition) {
    return INSTRUCTION_TARGET.TRANSITION;
  }
  // method_id のみに値がある → メソッド指示
  if (hasMethod) {
    return INSTRUCTION_TARGET.METHOD;
  }
  // いずれも空/NULL → ファイル全体指示
  return INSTRUCTION_TARGET.FILE;
}
