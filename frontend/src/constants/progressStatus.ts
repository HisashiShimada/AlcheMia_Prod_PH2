/**
 * 進捗ステータス定数
 *
 * WorkProgressDetailDialog, PetriNetVisualization等で
 * ステータス比較・表示ラベルに使用する定数
 *
 * @remarks
 * バックエンド: backend/src/enums/progressStatus.enum.ts と値を同期すること
 * 表示ラベルは多言語化対応のため t('progressStatus.<value>') で表示すること
 */
export const ProgressStatus = {
  /** 未開始 */
  NOT_STARTED: 'not_started',
  /** 準備中 */
  PREPARING: 'preparing',
  /** 作業中 */
  IN_PROGRESS: 'in_progress',
  /** 休止中 */
  SUSPENDED: 'suspended',
  /** 異常中 */
  ABNORMAL: 'abnormal',
  /** 完了 */
  COMPLETED: 'completed',
} as const;

export type ProgressStatusValue = typeof ProgressStatus[keyof typeof ProgressStatus];
