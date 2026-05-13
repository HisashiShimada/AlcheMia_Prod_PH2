import { useEffect, useRef, useCallback } from 'react';
import { getPublishStatus } from '@/services/projectApiService';
import type { PublishStatusResponse } from '@/types/project';

/** ポーリング間隔（ms） */
const POLL_INTERVAL_MS = 3_000;
/** タイムアウト（ms）: 5分 */
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

/** ポーリングを継続するステータス */
const POLLING_STATUSES = new Set(['pending', 'running']);

export interface UsePublishStatusPollerOptions {
  /** ポーリング対象のプロジェクト名 */
  projectName: string;
  /**
   * ジョブが完了（done / error）またはタイムアウトした時のコールバック
   * @param status 最後に取得したステータス情報
   */
  onComplete: (status: PublishStatusResponse) => void;
  /**
   * ポーリング中にエラーが発生した時のコールバック（省略可）
   * @param err エラーオブジェクト
   */
  onError?: (err: unknown) => void;
}

/**
 * MaiML 公開/非公開ジョブのステータスをポーリングするカスタムフック
 *
 * @description
 *   `start()` を呼び出すとポーリングを開始する。
 *   - ジョブステータスが `pending` / `running` の間は 3秒ごとに API を呼び出す。
 *   - `done` / `error` になったら自動停止し `onComplete` を呼ぶ。
 *   - 5分経過してもポーリング継続中の場合は自動停止し `onComplete` を呼ぶ。
 *   - コンポーネントアンマウント時に自動クリーンアップする。
 *
 * @example
 * ```tsx
 * const { start, stop, isPolling } = usePublishStatusPoller({
 *   projectName,
 *   onComplete: (status) => {
 *     if (status.status === 'done') message.success('公開が完了しました');
 *     else message.error(status.error_message ?? '公開に失敗しました');
 *     refreshProjectStatus();
 *   },
 * });
 *
 * // 公開ダイアログ成功後に呼び出す
 * const handlePublishSuccess = () => start();
 * ```
 */
export function usePublishStatusPoller({
  projectName,
  onComplete,
  onError,
}: UsePublishStatusPollerOptions) {
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const isPollingRef = useRef(false);

  /** ポーリングを停止してタイマーをクリーンアップ */
  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  /** ポーリングを開始する */
  const start = useCallback(() => {
    // 多重起動防止
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    // 3秒ごとに API を呼ぶ
    intervalRef.current = setInterval(async () => {
      try {
        const status = await getPublishStatus(projectName);

        // 完了または失敗ならポーリング停止
        if (!POLLING_STATUSES.has(status.status ?? '')) {
          stop();
          onComplete(status);
        }
      } catch (err) {
        stop();
        onError?.(err);
      }
    }, POLL_INTERVAL_MS);

    // タイムアウト: 5分後に強制停止
    timeoutRef.current = setTimeout(async () => {
      stop();
      try {
        // タイムアウト時に最後のステータスを取得して通知
        const status = await getPublishStatus(projectName);
        onComplete(status);
      } catch (err) {
        onError?.(err);
      }
    }, POLL_TIMEOUT_MS);
  }, [projectName, onComplete, onError, stop]);

  // アンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop };
}
