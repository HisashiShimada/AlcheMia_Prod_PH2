import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/db';
import { E5005, E5007, E5008 } from '../enums/errorCodes';

/**
 * レート制限設定インターフェース
 */
export interface RateLimitConfig {
  /** タイムウィンドウ（ミリ秒） */
  windowMs: number;
  /** 最大試行回数 */
  maxAttempts: number;
  /** キー生成関数（組織ID、ユーザー名、セッショントークンなど） */
  keyGenerator: (req: Request) => string;
  /** エラーコード */
  errorCode: string;
  /** エラーメッセージ */
  message: string;
  /** 使用するテーブル（デフォルト: login_history） */
  useTable?: 'login_history' | 'pin_codes';
  /** 試行回数カラム名（pin_codesテーブル用） */
  attemptsColumn?: string;
  /** カウント対象カラム名（デフォルト: created_at） */
  countColumn?: string;
}

/**
 * レート制限ミドルウェア
 * 
 * エンドポイント別にレート制限を適用し、試行回数超過時は429エラーを返す。
 * 
 * @param config レート制限設定
 * @returns Express middleware
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 開発環境ではレート制限をスキップ
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Rate Limit] Skipped in ${process.env.NODE_ENV || 'development'} environment for ${config.errorCode}`);
      next();
      return;
    }

    try {
      const key = config.keyGenerator(req);
      const pool = getPool();

      // キーが空の場合はスキップ
      if (!key) {
        next();
        return;
      }

      const useTable = config.useTable || 'login_history';
      const windowStart = new Date(Date.now() - config.windowMs);

      let currentAttempts = 0;

      if (useTable === 'pin_codes' && config.attemptsColumn) {
        // pin_codesテーブルから試行回数を取得
        const query = `
          SELECT ${config.attemptsColumn} 
          FROM pin_codes 
          WHERE session_token = $1 
          AND expires_at > NOW()
          LIMIT 1
        `;
        const result = await pool.query(query, [key]);

        if (result.rows.length > 0) {
          currentAttempts = parseInt(result.rows[0][config.attemptsColumn], 10);
        } else {
          // レコードが存在しない場合はスキップ
          next();
          return;
        }
      } else if (useTable === 'pin_codes' && config.countColumn) {
        // pin_codesテーブルから作成回数を取得（再送信用）
        const query = `
          SELECT COUNT(*) as count 
          FROM pin_codes 
          WHERE session_token = $1 
          AND ${config.countColumn} > $2
        `;
        const result = await pool.query(query, [key, windowStart]);
        currentAttempts = parseInt(result.rows[0].count, 10);
      } else {
        // login_historyテーブルから全試行回数を取得
        const organizationId = req.query.orgId as string | undefined;
        const userId = key.split('_')[1];
        
        // インデックス idx_login_history_query (organization_id, user_id, entry_execute_flg) を利用
        const query = `
          SELECT COUNT(*) as count 
          FROM login_history 
          WHERE login_at > $1 
          AND user_id = $2 
          AND organization_id = $3
        `;
        const result = await pool.query(query, [windowStart, userId, organizationId]);
        currentAttempts = parseInt(result.rows[0].count, 10);
      }

      // レート制限チェック
      if (currentAttempts >= config.maxAttempts) {
        const retryAfterSeconds = Math.ceil(config.windowMs / 1000);

        res.setHeader('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
          success: false,
          error: {
            code: config.errorCode,
            message: config.message,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: uuidv4(),
          },
        });
        return;
      }

      // レート制限内であれば次へ
      next();
    } catch (error) {
      // データベースエラーは次のミドルウェアに渡す
      next(error);
    }
  };
}

/**
 * 事前定義されたレート制限設定
 */

/** ログインエンドポイント用レート制限（5回/15分） */
export const loginRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分
  maxAttempts: 5,
  keyGenerator: (req) => `${req.query.orgId}_${req.body.userId}`,
  errorCode: E5007,
  message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
});

/** PINコード検証エンドポイント用レート制限（3回/5分） */
export const pinVerifyRateLimit = rateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5分
  maxAttempts: 3,
  keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
  errorCode: E5005,
  message: 'PIN検証の試行回数が上限に達しました。再度ログインしてください。',
  useTable: 'pin_codes',
  attemptsColumn: 'attempts_count',
});

/** PINコード再送信エンドポイント用レート制限（3回/15分） */
export const pinResendRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分
  maxAttempts: 3,
  keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
  errorCode: E5008,
  message: 'PIN再送信の回数が上限に達しました。15分後に再試行してください。',
  useTable: 'pin_codes',
  countColumn: 'created_at',
});

/** パスワードリセット要求エンドポイント用レート制限（3回/15分） */
export const passwordResetRequestRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分
  maxAttempts: 3,
  keyGenerator: (req) => req.query.orgId as string || '',
  errorCode: E5007,
  message: 'パスワードリセット要求の回数が上限に達しました。15分後に再試行してください。',
});
