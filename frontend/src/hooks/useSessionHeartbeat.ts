/**
 * useSessionHeartbeat カスタムフック
 *
 * 編集画面のセッション維持のためのハートビートを送信する。
 * 一定間隔で POST /api/v1/auth/heartbeat を呼び出し、
 * セッションタイムアウトを防ぐ。
 *
 * @param intervalMs - ハートビート間隔（ミリ秒）。デフォルト 5分（300,000ms）
 */
'use client';

import { useEffect, useRef } from 'react';
import { createApiClient } from '@/utils/authUtils';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5分

export function useSessionHeartbeat(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const apiClient = createApiClient();

    const sendHeartbeat = async () => {
      try {
        await apiClient.post('/auth/heartbeat');
        console.log('[useSessionHeartbeat] ハートビート送信成功');
      } catch (error) {
        // ハートビート失敗は警告のみ（セッション切れの場合は authUtils のインターセプターが処理）
        console.warn('[useSessionHeartbeat] ハートビート送信失敗:', error);
      }
    };

    // 即時送信（マウント時に一度）
    sendHeartbeat();

    // 定期送信
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMs]);
}
