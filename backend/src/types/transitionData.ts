/**
 * Transition Data型定義
 * 
 * トランジション（実験ステップ）のデータ構造を定義します。
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
 * トランジションデータの完全な構造
 */
export interface TransitionData {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status: Status;
  progress_rate: number; // 0-100
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}

/**
 * 新規トランジションデータ作成用の型
 */
export interface NewTransitionData {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status?: Status; // オプショナル（デフォルト: 'initial'）
  progress_rate?: number; // オプショナル（デフォルト: 0）
  updated_by: string;
}

/**
 * トランジションデータ更新用の型
 */
export interface TransitionDataUpdate {
  status: Status;
  progress_rate?: number;
  updated_by: string;
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