/**
 * ロギングユーティリティ
 *
 * Winston を使用した構造化ロギング機能を提供し、以下をサポート：
 * - ログレベル管理（error, warn, info, debug）
 * - 環境別出力切り替え
 *   - production: コンソール出力 + ファイル出力（DailyRotateFile）
 *   - development: コンソール出力（カラー付き整形）
 *   - test: 出力抑制（ENABLE_TEST_LOGS 設定時のみ出力）
 * - 認証関連のログ記録
 * - エラーログ記録
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

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

// ログ出力先ディレクトリ（backend/logs/）
const LOG_DIR = path.resolve(__dirname, '../../logs');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV === 'development' || isTest;

/**
 * 共通のログフォーマット（JSON）
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 開発環境向けのカラー付き整形フォーマット
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * トランスポートの構築
 */
function buildTransports(): winston.transport[] {
  // test 環境かつ ENABLE_TEST_LOGS 未設定の場合は Silent transport で抑制
  if (isTest && !process.env.ENABLE_TEST_LOGS) {
    return [new winston.transports.Console({ silent: true })];
  }

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isDevelopment ? devFormat : jsonFormat,
    }),
  ];

  // 本番環境のみファイル出力を追加
  if (isProduction) {
    // エラーログ専用（error レベルのみ）
    const errorRotateOptions: DailyRotateFile.DailyRotateFileTransportOptions = {
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      zippedArchive: true,
      format: jsonFormat,
    };
    transports.push(new DailyRotateFile(errorRotateOptions));

    // 全レベル統合ログ
    const combinedRotateOptions: DailyRotateFile.DailyRotateFileTransportOptions = {
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      zippedArchive: true,
      format: jsonFormat,
    };
    transports.push(new DailyRotateFile(combinedRotateOptions));
  }

  return transports;
}

/**
 * Winston ロガーインスタンス（内部使用）
 */
const winstonLogger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  transports: buildTransports(),
});

/**
 * ベースロガー（公開 API）
 */
class Logger {
  /**
   * エラーログ
   */
  error(message: string, context?: LogContext): void {
    winstonLogger.error(message, context);
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: LogContext): void {
    winstonLogger.warn(message, context);
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: LogContext): void {
    winstonLogger.info(message, context);
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: LogContext): void {
    winstonLogger.debug(message, context);
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
 *
 * - error が Error インスタンスでない場合（AWS SDK エラー等の unknown スロー含む）も
 *   安全に処理するため、内部で Error へ正規化する。
 * - winston.format.errors({ stack: true }) を活かすため、
 *   正規化した error オブジェクト本体も第2引数として渡す。
 */
export function logError(
  message: string,
  error: unknown,
  context?: LogContext
): void {
  // Error インスタンスでない場合は安全に Error へ変換する
  const errorObj: Error =
    error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

  // winston.format.errors({ stack: true }) はメタデータオブジェクトに
  // Error インスタンスが含まれている場合にスタックトレースを展開する。
  // errorObj を直接渡すことでスタックトレースを確実に出力する。
  winstonLogger.error(message, {
    ...context,
    errorMessage: errorObj.message,
    errorStack: errorObj.stack,
    errorName: errorObj.name,
    // AWS SDK 等の独自プロパティ（$metadata, code 等）も保持する
    ...(error !== errorObj && {
      originalErrorType: typeof error,
      originalErrorValue: String(error),
    }),
    error: errorObj,
  });
}

/**
 * APIリクエスト情報のログ記録
 * タスク3.2: 監査ログとアプリケーションログの実装
 */
export interface ApiRequestLog {
  requestId: string;
  userId?: string;
  organizationId?: string;
  method: string;
  path: string;
  query?: any;
  body?: any;
  ipAddress?: string;
  userAgent?: string;
}

export function logApiRequest(request: ApiRequestLog): void {
  logger.info('API request received', {
    action: 'api_request',
    ...request,
  });
}

/**
 * APIレスポンス情報のログ記録
 * タスク3.2: 監査ログとアプリケーションログの実装
 */
export interface ApiResponseLog {
  requestId: string;
  statusCode: number;
  duration: number;
  errorCode?: string;
}

export function logApiResponse(response: ApiResponseLog): void {
  const { requestId, statusCode, duration, errorCode } = response;

  // ステータスコードとパフォーマンスに基づいてログレベルを決定
  if (statusCode >= 500) {
    logger.error('API response - server error', {
      action: 'api_response',
      requestId,
      statusCode,
      duration,
      errorCode,
    });
  } else if (statusCode >= 400) {
    logger.warn('API response - client error', {
      action: 'api_response',
      requestId,
      statusCode,
      duration,
      errorCode,
    });
  } else if (duration > 1000) {
    logger.warn('API response - slow request', {
      action: 'api_response',
      requestId,
      statusCode,
      duration,
    });
  } else {
    logger.info('API response success', {
      action: 'api_response',
      requestId,
      statusCode,
      duration,
    });
  }
}
