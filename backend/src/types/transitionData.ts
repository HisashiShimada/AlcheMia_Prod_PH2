/**
 * Transition Data型定義
 * 
 * トランジション（実験ステップ）のデータ構造を定義します。
 */

/**
 * トランジションステータスのEnum定義
 * データベースのnumeric(2,0)型に対応
 * 
 * @remarks
 * データベース定義: docs/design/db/er_diagram.a5er
 * カラム: status numeric(2,0)
 */
export enum TransitionStatusEnum {
  /** 初期状態（未開始） */
  INITIAL = 1,
  
  /** 準備状態 */
  PREPARING = 2,
  
  /** 準備完了状態 */
  READY = 3,
  
  /** 動作状態 */
  IN_PROGRESS = 4,
  
  /** 休止状態 */
  PAUSED = 5,
  
  /** 終状態（完了） */
  COMPLETED = 6,
  
  /** 異常終了状態 */
  ERROR = 7
}

/**
 * TransitionStatusEnumの型定義
 */
export type TransitionStatus = typeof TransitionStatusEnum[keyof typeof TransitionStatusEnum];

/**
 * トランジションデータの完全な構造
 */
export interface TransitionData {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status: TransitionStatus; // 数値型（1-7）
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
  status?: TransitionStatus; // オプショナル（デフォルト: TransitionStatusEnum.INITIAL）
  progress_rate?: number; // オプショナル（デフォルト: 0）
  updated_by: string;
}

/**
 * トランジションデータ更新用の型
 */
export interface TransitionDataUpdate {
  status: TransitionStatus; // 数値型（1-7）
  progress_rate?: number;
  updated_by: string;
}

/**
 * 有効なステータス値のセット（数値型）
 */
const VALID_STATUSES: ReadonlySet<number> = new Set<TransitionStatus>([
  TransitionStatusEnum.INITIAL,
  TransitionStatusEnum.PREPARING,
  TransitionStatusEnum.READY,
  TransitionStatusEnum.IN_PROGRESS,
  TransitionStatusEnum.PAUSED,
  TransitionStatusEnum.COMPLETED,
  TransitionStatusEnum.ERROR
]);

/**
 * 値が有効なTransitionStatusかどうかを検証する型ガード関数
 * 
 * @param value - 検証する値
 * @returns 有効なTransitionStatusの場合true、それ以外はfalse
 * 
 * @example
 * const status = 5;
 * if (isValidTransitionStatus(status)) {
 *   // statusはTransitionStatus型として扱える
 *   console.log('有効なステータス:', status);
 * }
 */
export function isValidTransitionStatus(value: any): value is TransitionStatus {
  return typeof value === 'number' && VALID_STATUSES.has(value);
}

/**
 * ステータス値から日本語ラベルを取得
 * 
 * @param status - ステータス値（数値）
 * @returns 日本語ラベル
 * 
 * @example
 * const label = getTransitionStatusLabel(TransitionStatusEnum.COMPLETED);
 * console.log(label); // "終状態"
 */
export function getTransitionStatusLabel(status: TransitionStatus): string {
  const labels: Record<TransitionStatus, string> = {
    [TransitionStatusEnum.INITIAL]: '初期状態',
    [TransitionStatusEnum.PREPARING]: '準備状態',
    [TransitionStatusEnum.READY]: '準備完了状態',
    [TransitionStatusEnum.IN_PROGRESS]: '動作状態',
    [TransitionStatusEnum.PAUSED]: '休止状態',
    [TransitionStatusEnum.COMPLETED]: '終状態',
    [TransitionStatusEnum.ERROR]: '異常終了状態'
  };
  return labels[status] || '不明';
}

