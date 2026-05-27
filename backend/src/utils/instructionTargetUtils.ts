/**
 * 指示対象（instruction_target）の導出ユーティリティ
 *
 * project_instruction テーブルの instruction_target カラム削除に伴い、
 * method_id / task_no / transition_id から動的に指示対象を判定する。
 *
 * 判定ルール（カラムの値の有無による組み合わせ判定）:
 *   method_id あり + transition_id あり + task_no あり → SPECIFIC_TASK (3)
 *   method_id あり + transition_id あり + task_no なし → SPECIFIC_TRANSITION (2)
 *   method_id あり + transition_id なし               → SPECIFIC_METHOD (1)
 *   method_id なし                                    → ENTIRE_FILE (0)
 */

import {
  InstructionTargetEnum,
  InstructionTargetEnumType,
} from '../enums/codeMaster.enum';

export { InstructionTargetEnum };
export type { InstructionTargetEnumType };

/**
 * method_id / task_no / transition_id から instruction_target 値を導出する
 *
 * @param methodId - メソッドID（nullまたは空文字の場合はメソッド指定なし）
 * @param taskNo - タスク連番（nullの場合はタスク指定なし）
 * @param transitionId - トランジションID（nullまたは空文字の場合はトランジション指定なし）
 * @returns InstructionTargetEnumType (0=ファイル全体, 1=メソッド, 2=トランジション, 3=タスク)
 */
export function deriveInstructionTarget(
  methodId: string | null | undefined,
  taskNo: number | null | undefined,
  transitionId: string | null | undefined
): InstructionTargetEnumType {
  const hasMethod = methodId !== null && methodId !== undefined && methodId !== '';
  const hasTransition = transitionId !== null && transitionId !== undefined && transitionId !== '';
  const hasTask = taskNo !== null && taskNo !== undefined;

  // method_id・transition_id・task_no の全てに値がある → タスク指示
  if (hasMethod && hasTransition && hasTask) {
    return InstructionTargetEnum.SPECIFIC_TASK;
  }
  // method_id・transition_id に値がある（task_no は空） → トランジション指示
  if (hasMethod && hasTransition) {
    return InstructionTargetEnum.SPECIFIC_TRANSITION;
  }
  // method_id のみに値がある → メソッド指示
  if (hasMethod) {
    return InstructionTargetEnum.SPECIFIC_METHOD;
  }
  // いずれも空/NULL → ファイル全体指示
  return InstructionTargetEnum.ENTIRE_FILE;
}
