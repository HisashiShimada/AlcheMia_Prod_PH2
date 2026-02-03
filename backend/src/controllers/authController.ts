import { Request, Response } from 'express';
import { getPool } from '../database/db';
import { PasswordService } from '../services/passwordService';
import { PinCodeService } from '../services/pinCodeService';
import { EmailService } from '../services/emailService';
import { JwtService } from '../services/jwtService';
import { RolePermissionRepository } from '../repositories/rolePermissionRepository';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '../types/service';
import { logError } from '../utils/logger';

// Services that don't require pool
const emailService = new EmailService();
const jwtService = new JwtService();

/**
 * マスキングされたメールアドレスを生成
 * 例: user@example.com -> use***@example.com
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 3) {
    return `${localPart.charAt(0)}***@${domain}`;
  }
  return `${localPart.substring(0, 3)}***@${domain}`;
}

/**
 * ログインエンドポイント
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // Initialize services with pool
  const passwordService = new PasswordService(pool);
  // 開発環境ではメール送信をスキップ
  const emailServiceForPin = process.env.NODE_ENV === 'development' ? undefined : emailService;
  const pinCodeService = new PinCodeService(pool, emailServiceForPin);

  // IPアドレスとUser-Agentを取得（ログイン履歴記録用）
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    // 1. バリデーション
    const { username, password } = req.body;
    const organizationId = req.query.orgId as string | undefined;

    // 必須パラメータチェック
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須パラメータが不足しています',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織IDヘッダーが必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. ユーザー検索
    const userQuery = `
      SELECT 
        user_id,
        user_name,
        mail_address,
        role_cd,
        organization_id,
        is_active,
        locked_until,
        department_cd
      FROM organization_user
      WHERE user_name = $1 AND organization_id = $2
    `;
    
    const userResult = await pool.query(userQuery, [username, organizationId]);
    console.log(userResult.rows.length)

    if (userResult.rows.length === 0) {
      // ユーザー不存在 - ログイン履歴に記録
      const historyQuery = `
        INSERT INTO login_history (
          user_name, 
          organization_id, 
          login_at, 
          login_sf, 
          failure_reason,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, NOW(), $3, $4, $5, $6)
      `;
      await pool.query(historyQuery, [
        username,
        organizationId,
        false,
        'User not found',
        ipAddress,
        userAgent,
      ]);

      // ユーザーが存在しない場合も同じエラーメッセージ（情報漏洩防止）
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'ユーザー名またはパスワードが正しくありません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const user = userResult.rows[0];
    console.log(user.role_cd)

    // 3. アカウント有効性チェック
    if (!user.is_active) {
      // アカウント無効 - ログイン履歴に記録
      const historyQuery = `
        INSERT INTO login_history (
          user_name, 
          organization_id, 
          login_at, 
          login_sf, 
          failure_reason,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, NOW(), $3, $4, $5, $6)
      `;
      await pool.query(historyQuery, [
        user.user_name,
        user.organization_id,
        false,
        'Account disabled',
        ipAddress,
        userAgent,
      ]);

      res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_DISABLED',
          message: 'アカウントが無効化されています。管理者にお問い合わせください',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 4. パスワード検証
    const passwordResult = await passwordService.verify(
      user.user_id,
      user.organization_id,
      password
    );

    if (!passwordResult.success || !passwordResult.data) {
      // パスワード不一致 - ログイン履歴に記録
      const historyQuery = `
        INSERT INTO login_history (
          user_name, 
          organization_id, 
          login_at, 
          login_sf, 
          failure_reason,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, NOW(), $3, $4, $5, $6)
      `;
      await pool.query(historyQuery, [
        user.user_name,
        user.organization_id,
        false,
        'Invalid password',
        ipAddress,
        userAgent,
      ]);

      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'ユーザー名またはパスワードが正しくありません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 5. PINコード生成と仮セッショントークン作成＋メール送信（共通処理）
    const sessionToken = `temp_session-${uuidv4()}_${Date.now()}`;
    
    const pinSendResult = await pinCodeService.generateAndSendPin(
      user.user_id,
      user.organization_id,
      sessionToken,
      user.mail_address,
      user.user_name
    );

    if (!pinSendResult.success) {
      const errorCode = pinSendResult.error?.code || 'SYSTEM_DATABASE_ERROR';
      const statusCode = errorCode === 'SYSTEM_EMAIL_SEND_FAILED' ? 500 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorCode === 'SYSTEM_EMAIL_SEND_FAILED'
            ? 'メール送信に失敗しました。しばらく待ってから再試行してください'
            : 'PINコード生成に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 6. ログイン成功履歴記録
    const successHistoryQuery = `
      INSERT INTO login_history (
        user_name, 
        organization_id, 
        login_at, 
        login_sf,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, NOW(), $3, $4, $5)
    `;
    await pool.query(successHistoryQuery, [
      user.user_name,
      user.organization_id,
      true,
      ipAddress,
      userAgent,
    ]);

    // 8. 成功レスポンス
    const responseData: any = {
      sessionToken,
      message: 'PINコードをメールで送信しました',
      email: pinSendResult.data.maskedEmail,
      expiresIn: 300, // 5分（秒）
    };

    // 開発環境の場合のみPINコードを含める（開発効率化のため）
    if (process.env.NODE_ENV === 'development') {
      responseData.pinCode = pinSendResult.data.pinCode;
      responseData.devMode = true;
    }

    res.status(200).json({
      success: true,
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Login error', error as Error, {
      action: 'login',
      organizationId: req.headers['x-organization-id'] as string,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * マスキングされたメールアドレスを生成（外部公開用）
 */
export function maskEmailPublic(email: string): string {
  return maskEmail(email);
}

/**
 * パスワードリセット要求エンドポイント
 * POST /api/v1/auth/reset-password-request
 */
export async function resetPasswordRequest(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  try {
    // 1. バリデーション
    const { username } = req.body;
    const organizationId = req.query.orgId as string | undefined;

    // 必須パラメータチェック
    if (!username) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須パラメータが不足しています',
          details: [
            { field: 'username', message: 'ユーザー名は必須です', code: 'REQUIRED_FIELD' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織IDヘッダーが必要です',
          details: [
            { field: 'X-Organization-Id', message: '組織IDヘッダーは必須です', code: 'REQUIRED_HEADER' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 入力値バリデーション
    if (username.length > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ユーザー名は100文字以内である必要があります',
          details: [
            { field: 'username', message: 'ユーザー名は100文字以内です', code: 'MAX_LENGTH_EXCEEDED' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. ユーザー検索
    const userQuery = `
      SELECT 
        user_id,
        user_name,
        mail_address,
        organization_id
      FROM organization_user
      WHERE user_name = $1 AND organization_id = $2
    `;
    
    const userResult = await pool.query(userQuery, [username, organizationId]);

    // 3. リセットトークン生成（ユーザーが存在する場合のみ）
    let maskedEmail = 'use***@example.com'; // デフォルト値（情報漏洩防止）

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      maskedEmail = maskEmail(user.mail_address);

      // リセットトークン生成: reset_{uuid}_{timestamp}
      const resetToken = `reset_${uuidv4()}_${Date.now()}`;

      // 4. メール送信
      const emailResult = await emailService.sendPasswordReset(
        user.mail_address,
        resetToken,
        user.user_name
      );

      if (!emailResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'SYSTEM_EMAIL_SEND_FAILED',
            message: 'メール送信に失敗しました。しばらく待ってから再試行してください',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }
    }

    // 5. 成功レスポンス（ユーザーが存在しない場合も同じレスポンス - 情報漏洩防止）
    res.status(200).json({
      success: true,
      data: {
        message: 'パスワードリセットのご案内をメールで送信しました',
        email: maskedEmail,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Reset password request error', error as Error, {
      action: 'reset_password_request',
      organizationId: req.headers['x-organization-id'] as string,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * ログアウトエンドポイント
 * POST /api/v1/auth/logout
 * 
 * @description
 * sessionStorage方式でのログアウト処理
 * - サーバー側では認証チェックのみ実施
 * - クライアント側でsessionStorageをクリアする
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    // 1. 認証チェック（authMiddlewareで設定されたreq.userを確認）
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. sessionStorage方式ではサーバー側で行う処理はない
    //    クライアント側でsessionStorageをクリアする

    // 3. 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'ログアウトしました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Logout error', error as Error, {
      action: 'logout',
      userId: req.user?.userId,
      organizationId: req.user?.organizationId,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * PINコード再送信エンドポイント
 * POST /api/v1/auth/resend-pin
 */
export async function resendPin(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // Initialize services with pool
  // 開発環境ではメール送信をスキップ
  const emailServiceForPin = process.env.NODE_ENV === 'development' ? undefined : emailService;
  const pinCodeService = new PinCodeService(pool, emailServiceForPin);

  try {
    // 1. バリデーション
    const authHeader = req.headers.authorization as string;
    const organizationId = req.query.orgId as string | undefined;

    // 必須ヘッダーチェック
    if (!authHeader) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Authorizationヘッダーが必要です',
          details: [
            { field: 'Authorization', message: 'Authorizationヘッダーは必須です', code: 'REQUIRED_HEADER' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織IDヘッダーが必要です',
          details: [
            { field: 'X-Organization-Id', message: '組織IDヘッダーは必須です', code: 'REQUIRED_HEADER' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Authorizationヘッダーからトークン抽出
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    if (!tokenMatch) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Authorizationヘッダーの形式が不正です',
          details: [
            { field: 'Authorization', message: 'Bearer スキームが必要です', code: 'INVALID_FORMAT' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const sessionToken = tokenMatch[1];

    // 2. pin_codesテーブルからユーザー情報を取得
    const userInfoQuery = `
      SELECT 
        pc.user_id,
        pc.organization_id,
        ou.user_name,
        ou.mail_address
      FROM pin_codes pc
      JOIN organization_user ou ON pc.user_id = ou.user_id AND pc.organization_id = ou.organization_id
      WHERE pc.session_token = $1 AND pc.organization_id = $2
    `;

    const userInfoResult = await pool.query(userInfoQuery, [sessionToken, organizationId]);

    if (userInfoResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'セッショントークンが不正です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const userInfo = userInfoResult.rows[0];

    // 3. 既存のPINコード削除
    await pinCodeService.delete(sessionToken);

    // 4. 新しいPINコード生成＋メール送信（共通処理）
    const pinSendResult = await pinCodeService.generateAndSendPin(
      userInfo.user_id,
      userInfo.organization_id,
      sessionToken,
      userInfo.mail_address,
      userInfo.user_name
    );

    if (!pinSendResult.success) {
      const errorCode = pinSendResult.error?.code || 'SYSTEM_DATABASE_ERROR';
      const statusCode = errorCode === 'SYSTEM_EMAIL_SEND_FAILED' ? 500 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorCode === 'SYSTEM_EMAIL_SEND_FAILED'
            ? 'メール送信に失敗しました。しばらく待ってから再試行してください'
            : 'PINコード生成に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 5. 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'PINコードを再送信しました',
        email: pinSendResult.data.maskedEmail,
        expiresIn: 300, // 5分（秒）
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Resend PIN error', error as Error, {
      action: 'resend_pin',
      organizationId: req.headers['x-organization-id'] as string,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * パスワードリセット実行エンドポイント
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // Initialize services with pool
  const passwordService = new PasswordService(pool);

  try {
    // 1. バリデーション
    const { resetToken, newPassword } = req.body;

    // 必須パラメータチェック
    if (!resetToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reset token is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (!newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // パスワード長チェック
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. リセットトークン検証
    const tokenQuery = `
      SELECT 
        user_id,
        organization_id,
        role_cd,
        expires_at,
        is_used
      FROM password_reset_tokens
      WHERE reset_token = $1
    `;

    const tokenResult = await pool.query(tokenQuery, [resetToken]);

    if (tokenResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'AUTH_RESET_TOKEN_INVALID',
          message: 'Invalid or expired reset token',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const tokenData = tokenResult.rows[0];

    // 有効期限チェック
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      res.status(400).json({
        success: false,
        error: {
          code: 'AUTH_RESET_TOKEN_EXPIRED',
          message: 'Reset token has expired',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 使用済みチェック
    if (tokenData.is_used) {
      res.status(400).json({
        success: false,
        error: {
          code: 'AUTH_RESET_TOKEN_USED',
          message: 'Reset token has already been used',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 3. パスワードハッシュ化
    const hashResult = await passwordService.hash(newPassword, tokenData.role_cd as UserRole);

    if (!hashResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: hashResult.error?.code || 'SYSTEM_ERROR',
          message: hashResult.error?.message || 'Failed to hash password',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 4. パスワード更新
    const updateResult = await passwordService.update(
      tokenData.user_id,
      tokenData.organization_id,
      hashResult.data
    );

    if (!updateResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: updateResult.error?.code || 'SYSTEM_DATABASE_ERROR',
          message: updateResult.error?.message || 'Failed to update password',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 5. リセットトークン削除
    const deleteQuery = `
      DELETE FROM password_reset_tokens
      WHERE reset_token = $1
    `;
    await pool.query(deleteQuery, [resetToken]);

    // 6. 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'Password has been successfully reset',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Reset password error', error as Error, {
      action: 'reset_password',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_DATABASE_ERROR',
        message: 'Database error occurred',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * PINコード検証エンドポイント
 * POST /api/v1/auth/verify-pin
 */
export async function verifyPin(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // Initialize services with pool
  const pinCodeService = new PinCodeService(pool);

  try {
    // 1. バリデーション
    const { pinCode } = req.body;
    const authHeader = req.headers.authorization as string;
    const organizationId = req.query.orgId as string | undefined;

    // 必須パラメータチェック
    if (!pinCode) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須パラメータが不足しています',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (!authHeader) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Authorizationヘッダーが必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織IDヘッダーが必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Authorizationヘッダーからトークン抽出
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    if (!tokenMatch) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Authorizationヘッダーの形式が不正です',
          details: [
            { field: 'Authorization', message: 'Bearer スキームが必要です', code: 'INVALID_FORMAT' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const sessionToken = tokenMatch[1];

    // 2. PINコード検証（ユーザー情報を含む）
    const verifyResult = await pinCodeService.verify(pinCode, sessionToken);

    if (!verifyResult.success) {
      // PINコード不正の場合、試行回数をインクリメント
      if (verifyResult.error?.code === 'AUTH_PIN_INVALID') {
        await pinCodeService.incrementAttempts(sessionToken);
      }
      
      // エラーコードに応じてHTTPステータスを設定
      const errorCode = verifyResult.error?.code || 'AUTH_PIN_INVALID';
      const statusCode = errorCode === 'AUTH_PIN_MAX_ATTEMPTS' ? 429 : 401;

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message:
            errorCode === 'AUTH_PIN_INVALID'
              ? 'PINコードが正しくありません'
              : errorCode === 'AUTH_PIN_EXPIRED'
              ? 'PINコードの有効期限が切れています'
              : errorCode === 'AUTH_PIN_MAX_ATTEMPTS'
              ? 'PINコードの入力試行回数が上限を超えました'
              : 'セッショントークンが不正です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const userInfo = verifyResult.data;

    // 2.5. roleテーブルから初期画面機能CDを取得
    const roleQuery = `
      SELECT initial_screen_function_cd
      FROM role
      WHERE organization_id = $1 AND role_cd = $2
    `;
    const roleResult = await pool.query(roleQuery, [userInfo.organizationId, userInfo.roleCd]);
    
    // 初期画面機能CDをユーザー情報に追加（取得できた値をそのまま設定）
    userInfo.initialScreenFunctionCd = roleResult.rows.length > 0 
      ? roleResult.rows[0].initial_screen_function_cd?.trim() || null
      : null;

    // 3. req.sessionに部門CDを保存
    if (req.session) {
      req.session.departmentCd = userInfo.departmentCd;

      // 明示的にセッションを保存（非同期処理を待つ）
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logError('Failed to save session', err as Error, {
              userId: userInfo.id,
            });
            reject(err);
          } else {
            console.log('Session saved successfully with departmentCd:', userInfo.departmentCd);
            resolve();
          }
        });
      });
    }

    // 4. roleCdとorganization_idに基づいて権限情報を取得
    const rolePermissionRepository = new RolePermissionRepository();
    const permissions = await rolePermissionRepository.getPermissionsByRoleId(
      userInfo.roleCd,
      userInfo.organizationId
    );

    // 5. JWT生成（権限情報を含める）
    const jwtResult = await jwtService.generate(
      {
        userId: userInfo.id,
        organizationId: userInfo.organizationId,
        sessionId: uuidv4(),
        permissions,
      }
    );

    if (!jwtResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_JWT_GENERATION_FAILED',
          message: 'セッション生成に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const jwtToken = jwtResult.data;

    // 6. セッション有効期限を計算（全ロール共通で30分）
    const maxAge = 30 * 60 * 1000; // 30分
    const nowTimestamp = Date.now();
    const expiresAtTimestamp = nowTimestamp + maxAge;
    const expiresAt = new Date(expiresAtTimestamp);

    // 7. PINコード削除（使用済み処理）
    await pinCodeService.delete(sessionToken);

    // 8. 成功レスポンス（JWTトークンをレスポンスボディで返す）
    // initial_screen_function_cdに基づいてフロントエンドで画面遷移を制御
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: userInfo.id,
          username: userInfo.username,
          email: userInfo.email,
          roleName: userInfo.roleName,
          roleCd: userInfo.roleCd,
          organizationId: userInfo.organizationId,
          organizationName: userInfo.organizationName,
          displayName: userInfo.displayName,
          departmentCd: userInfo.departmentCd,
          initialScreenFunctionCd: userInfo.initialScreenFunctionCd
        },
        session: {
          token: jwtToken,
          expiresAt: expiresAt.toISOString(),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Verify PIN error', error as Error, {
      action: 'verify_pin',
      organizationId: req.headers['x-organization-id'] as string,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
