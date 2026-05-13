/**
 * ConsoleLogger
 *
 * ブラウザのコンソールログをキャプチャし、バックエンドへ送信するユーティリティ。
 * ログには [E5001] 形式のエラーコードが含まれることで、障害調査を効率化する。
 *
 * @example
 * ```typescript
 * // アプリ起動時にキャプチャ開始（layout.tsx 等）
 * import consoleLogger from '@/utils/consoleLogger';
 * consoleLogger.startCapture();
 *
 * // エラー発生時に送信
 * await consoleLogger.sendLogsToBackend(userId);
 * ```
 */

import axios from 'axios';
import type { LogEntry } from '@/types/common';

/** バッファの最大件数（古いエントリを削除） */
const MAX_LOGS = 500;

/** バックエンドAPIエンドポイント */
const LOGS_API_URL = '/api/v1/logs/frontend';

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private isCapturing = false;

  /** オリジナルの console メソッドを退避 */
  private readonly originalConsole = {
    log:   console.log.bind(console),
    info:  console.info.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
  };

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * コンソールログのキャプチャを開始する
   * 二重起動を防ぐため、既にキャプチャ中の場合は何もしない
   */
  startCapture(): void {
    if (this.isCapturing) return;
    this.isCapturing = true;

    (['log', 'info', 'warn', 'error'] as const).forEach((level) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (console as any)[level] = (...args: unknown[]) => {
        this.captureLog(level, args);
        this.originalConsole[level](...args);
      };
    });
  }

  /**
   * コンソールログのキャプチャを停止し、オリジナルの console を復元する
   */
  stopCapture(): void {
    if (!this.isCapturing) return;
    console.log   = this.originalConsole.log;
    console.info  = this.originalConsole.info;
    console.warn  = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    this.isCapturing = false;
  }

  /**
   * ログを内部バッファに保存する（プライベート）
   */
  private captureLog(level: LogEntry['level'], args: unknown[]): void {
    try {
      const message = args
        .map((arg) => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };

      // error レベルの場合はスタックトレースを取得
      if (level === 'error' && args[0] instanceof Error) {
        entry.stackTrace = (args[0] as Error).stack;
      }

      this.logs.push(entry);

      // バッファが上限を超えた場合は古いエントリを削除
      if (this.logs.length > MAX_LOGS) {
        this.logs.shift();
      }
    } catch {
      // キャプチャ中のエラーは無視（無限ループを防ぐ）
    }
  }

  /** 現在のログバッファを返す */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /** ログバッファをクリアする */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * バックエンドにログを送信する
   *
   * @param userId - 送信するユーザーID（省略可）
   * @returns 送信結果
   */
  async sendLogsToBackend(userId?: string): Promise<{ success: boolean; count?: number }> {
    if (this.logs.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const res = await axios.post(
        LOGS_API_URL,
        {
          logs: this.logs,
          sessionId: this.sessionId,
          userId,
        },
        { withCredentials: true }
      );

      const count: number = res.data?.count ?? this.logs.length;
      this.originalConsole.log(`✅ [ConsoleLogger] ログ送信成功: ${count}件`);
      return { success: true, count };
    } catch (error) {
      this.originalConsole.error('❌ [ConsoleLogger] ログ送信エラー:', error);
      return { success: false };
    }
  }

  /**
   * ログの集計情報を返す
   */
  getStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
  } {
    return {
      total: this.logs.length,
      byLevel: {
        log:   this.logs.filter((l) => l.level === 'log').length,
        info:  this.logs.filter((l) => l.level === 'info').length,
        warn:  this.logs.filter((l) => l.level === 'warn').length,
        error: this.logs.filter((l) => l.level === 'error').length,
      },
    };
  }
}

/** シングルトンインスタンス */
const consoleLogger = new ConsoleLogger();
export default consoleLogger;
