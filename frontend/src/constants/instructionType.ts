/**
 * 指示タイプ定数
 *
 * InstructionGroup, InstructionConfirmationTab等で
 * 指示種別の比較・表示ラベルに使用する定数
 *
 * @remarks
 * バックエンド: backend/src/enums/instructionType.enum.ts と値を同期すること
 * 表示ラベルは多言語化対応のため t('instructionType.<value>') で表示すること
 */
export const InstructionType = {
  /** プロジェクト指示（実験全体への作業指示） */
  PROJECT_INSTRUCTION: 'project_instruction',
  /** 全体指示（プロジェクト指示の別称） */
  OVERALL_INSTRUCTION: 'overall_instruction',
  /** タスク指示 */
  TASK_INSTRUCTION: 'task_instruction',
  /** タスク単位指示（タスク指示の別称） */
  TASK_UNIT_INSTRUCTION: 'task_unit_instruction',
  /** メソッド単位指示 */
  METHOD_UNIT_INSTRUCTION: 'method_unit_instruction',
  /** トランジション単位指示 */
  TRANSITION_UNIT_INSTRUCTION: 'transition_unit_instruction',
} as const;

export type InstructionTypeValue = typeof InstructionType[keyof typeof InstructionType];

/**
 * 指示タイプ別の空状態メッセージ翻訳キー
 *
 * InstructionGroup等で指示が存在しない場合の表示に使用する定数
 * t() に渡す翻訳キーを返す
 */
export const InstructionEmptyMessageKey: Partial<Record<InstructionTypeValue, string>> = {
  [InstructionType.PROJECT_INSTRUCTION]: 'instructionType.emptyMessage.project_instruction',
  [InstructionType.TASK_INSTRUCTION]: 'instructionType.emptyMessage.task_instruction',
};
