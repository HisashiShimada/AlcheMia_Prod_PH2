/**
 * 進捗ステータス定数
 *
 * WorkProgressDetailDialog, PetriNetVisualization等で
 * ステータス比較・表示ラベルに使用する定数
 */
export const ProgressStatus = {
  /** 未開始 */
  NOT_STARTED: '未開始',
  /** 準備中 */
  PREPARING: '準備中',
  /** 作業中 */
  IN_PROGRESS: '作業中',
  /** 休止中 */
  SUSPENDED: '休止中',
  /** 異常中 */
  ABNORMAL: '異常中',
  /** 完了 */
  COMPLETED: '完了',
} as const;

export type ProgressStatusValue = typeof ProgressStatus[keyof typeof ProgressStatus];
