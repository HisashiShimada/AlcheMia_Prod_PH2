import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/db';

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
        // login_historyテーブルから失敗回数を取得
        // キーに組織IDとユーザー名が含まれていることを想定
        console.log(key)
        const [organizationId, userName] = key.split('_');
        console.log(organizationId)
        console.log(userName)
        console.log(windowStart)
        
        // インデックス idx_login_history_rate_limit (login_at, login_sf) を利用
        const query = `
          SELECT COUNT(*) as count 
          FROM login_history 
          WHERE login_at > $1 
          AND login_sf != 'success'
          AND user_name = $2 
          AND organization_id = $3
        `;
        const result = await pool.query(query, [windowStart, userName, organizationId]);
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
  // keyGenerator: (req) => `${req.headers['x-organization-id']}-${req.body.username}`,
  // TODO: クライアント証明書を導入するまでの仮実装
  keyGenerator: (req) => `${req.body.organizationId}_${req.body.username}`,
  errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
});

/** PINコード検証エンドポイント用レート制限（3回/5分） */
export const pinVerifyRateLimit = rateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5分
  maxAttempts: 3,
  keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
  errorCode: 'AUTH_PIN_MAX_ATTEMPTS',
  message: 'PIN検証の試行回数が上限に達しました。再度ログインしてください。',
  useTable: 'pin_codes',
  attemptsColumn: 'attempts_count',
});

/** PINコード再送信エンドポイント用レート制限（3回/15分） */
export const pinResendRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分
  maxAttempts: 3,
  keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
  errorCode: 'AUTH_RESEND_LIMIT_EXCEEDED',
  message: 'PIN再送信の回数が上限に達しました。15分後に再試行してください。',
  useTable: 'pin_codes',
  countColumn: 'created_at',
});

/** パスワードリセット要求エンドポイント用レート制限（3回/15分） */
export const passwordResetRequestRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分
  maxAttempts: 3,
  keyGenerator: (req) => req.headers['x-organization-id'] as string || '',
  errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  message: 'パスワードリセット要求の回数が上限に達しました。15分後に再試行してください。',
});
