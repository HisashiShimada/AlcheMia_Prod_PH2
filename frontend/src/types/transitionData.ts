/**
 * Transition Data型定義（フロントエンド）
 * 
 * トランジション（実験ステップ）のデータ構造を定義します。
 * バックエンドの型定義と同期しています。
 */

/**
 * トランジションのステータス
 * 
 * - initial: 初期状態（未開始）
 * - preparing: 準備中
 * - ready: 準備完了
 * - running: 実行中
 * - paused: 一時停止
 * - completed: 完了
 * - error: エラー発生
 */
export type Status = 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

/**
 * トランジションデータの構造
 */
export interface TransitionData {
  /** トランジションID */
  transition_id: string;
  
  /** トランジション名 */
  transition_name: string;
  
  /** ステータス */
  status: Status;
  
  /** コメント */
  comment: string;
}

/**
 * 有効なステータス値のセット
 */
const VALID_STATUSES: ReadonlySet<string> = new Set<Status>([
  'initial',
  'preparing',
  'ready',
  'running',
  'paused',
  'completed',
  'error'
]);

/**
 * 値が有効なStatusかどうかを検証する型ガード関数
 * 
 * @param value - 検証する値
 * @returns 有効なStatusの場合true、それ以外はfalse
 * 
 * @example
 * const status = 'completed';
 * if (isValidStatus(status)) {
 *   // statusはStatus型として扱える
 *   console.log('有効なステータス:', status);
 * }
 */
export function isValidStatus(value: any): value is Status {
  return typeof value === 'string' && VALID_STATUSES.has(value);
}