/**
 * ロギングユーティリティ
 * 
 * 構造化ロギング機能を提供し、以下をサポート：
 * - ログレベル管理（error, warn, info, debug）
 * - 認証関連のログ記録
 * - エラーログ記録
 */

interface LogContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * ログレベル
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * ベースロガー
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  /**
   * フォーマット済みログメッセージを出力
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // テスト環境では出力を抑制（オプション）
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_LOGS) {
      return;
    }

    // コンソールに出力
    const logString = JSON.stringify(logEntry, null, this.isDevelopment ? 2 : 0);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(logString);
        }
        break;
    }
  }

  /**
   * エラーログ
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
}

// シングルトンインスタンス
export const logger = new Logger();

/**
 * ログイン成功ログを記録
 */
export function logLogin(
  userId: string,
  organizationId: string,
  username: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logger.info('User login successful', {
    action: 'login',
    userId,
    organizationId,
    username,
    ipAddress,
    userAgent,
  });
}

/**
 * ログアウトログを記録
 */
export function logLogout(
  userId: string,
  organizationId: string,
  username: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logger.info('User logout', {
    action: 'logout',
    userId,
    organizationId,
    username,
    ipAddress,
    userAgent,
  });
}

/**
 * パスワードリセットログを記録
 */
export function logPasswordReset(
  userId: string,
  organizationId: string,
  username: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logger.info('Password reset completed', {
    action: 'password_reset',
    userId,
    organizationId,
    username,
    ipAddress,
    userAgent,
  });
}

/**
 * エラーログを記録（詳細情報付き）
 */
export function logError(
  message: string,
  error: Error,
  context?: LogContext
): void {
  logger.error(message, {
    ...context,
    errorMessage: error.message,
    errorStack: error.stack,
    errorName: error.name,
  });
}
