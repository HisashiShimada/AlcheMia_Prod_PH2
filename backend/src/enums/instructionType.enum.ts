/**
 * 指示タイプ定数
 *
 * InstructionGroup, InstructionConfirmationTab等で
 * 指示種別の比較・表示ラベルに使用する定数
 */
export const InstructionType = {
  /** プロジェクト指示（実験全体への作業指示） */
  PROJECT_INSTRUCTION: 'プロジェクト指示',
  /** 全体指示（プロジェクト指示の別称） */
  OVERALL_INSTRUCTION: '全体指示',
  /** タスク指示 */
  TASK_INSTRUCTION: 'タスク指示',
  /** タスク単位指示（タスク指示の別称） */
  TASK_UNIT_INSTRUCTION: 'タスク単位指示',
  /** メソッド単位指示 */
  METHOD_UNIT_INSTRUCTION: 'メソッド単位指示',
  /** トランジション単位指示 */
  TRANSITION_UNIT_INSTRUCTION: 'トランジション単位指示',
} as const;

export type InstructionTypeValue = typeof InstructionType[keyof typeof InstructionType];

/**
 * 指示タイプ別の空状態メッセージ
 *
 * InstructionGroup等で指示が存在しない場合の表示に使用する定数
 */
export const InstructionEmptyMessage: Partial<Record<InstructionTypeValue, string>> = {
  [InstructionType.PROJECT_INSTRUCTION]: '実験全体への作業指示がありません',
  [InstructionType.TASK_INSTRUCTION]: 'タスクへの作業指示がありません',
};
