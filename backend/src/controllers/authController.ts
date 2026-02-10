import { Request, Response } from 'express';
import { getPool } from '../database/db';
import { PasswordService } from '../services/passwordService';
import { PinCodeService } from '../services/pinCodeService';
import { PinExemptionService } from '../services/pinExemptionService';
import { EmailService } from '../services/emailService';
import { JwtService } from '../services/jwtService';
import { RefreshTokenService } from '../services/refreshTokenService';
import { RolePermissionRepository } from '../repositories/rolePermissionRepository';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '../types/service';
import { logError } from '../utils/logger';
import { issueSessionTokens } from './authHelpers';
import * as loginHistoryRepository from '../repositories/loginHistoryRepository';

// Services that don't require pool
const emailService = new EmailService();
const jwtService = new JwtService();
const refreshTokenService = new RefreshTokenService();

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
    const { userId, password } = req.body;
    const organizationId = req.query.orgId as string | undefined;

    // 必須パラメータチェック
    if (!userId || !password) {
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

    // 2. ユーザー検索（ユーザーIDで検索）
    const userQuery = `
      SELECT 
        ou.user_id,
        ou.user_name,
        ou.mail_address,
        ou.role_cd,
        ou.organization_id,
        ou.is_active,
        ou.locked_until,
        ou.department_cd,
        o.corporation_id
      FROM organization_user ou
      LEFT JOIN organization o ON ou.organization_id = o.organization_id
      WHERE ou.user_id = $1 AND ou.organization_id = $2
    `;
    
    const userResult = await pool.query(userQuery, [userId, organizationId]);
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
          user_agent,
          create_user_id,
          create_at
        )
        VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      await pool.query(historyQuery, [
        userId,
        organizationId,
        false,
        'User not found',
        ipAddress,
        userAgent,
        'SYSTEM',
      ]);

      // ユーザーが存在しない場合も同じエラーメッセージ（情報漏洩防止）
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'ユーザーIDまたはパスワードが正しくありません',
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
          user_agent,
          create_user_id,
          create_at
        )
        VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      await pool.query(historyQuery, [
        user.user_name,
        user.organization_id,
        false,
        'Account disabled',
        ipAddress,
        userAgent,
        'SYSTEM',
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
      await loginHistoryRepository.recordLogin(
        pool,
        user.user_name,
        user.organization_id,
        false,
        'Invalid password',
        ipAddress,
        userAgent
      );

      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'ユーザーIDまたはパスワードが正しくありません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 4.5. PIN免除判定
    const pinExemptionService = new PinExemptionService(pool);
    const exemptionCheck = await pinExemptionService.isExemptionApplicable(
      user.user_name,
      user.organization_id
    );

    if (exemptionCheck.success && exemptionCheck.data.isExempt) {
      // 免除適用 - ログイン履歴を記録して直接トークン発行
      await loginHistoryRepository.recordLogin(
        pool,
        user.user_name,
        user.organization_id,
        true,
        null,
        ipAddress,
        userAgent,
        false  // entry_execute_flg: false（二段階認証未実施・免除）
      );

      console.log(`[INFO] PIN exemption applied: user_id=${user.user_id}, reason=${exemptionCheck.data.reason}`);

      // 共通ヘルパーでトークン発行
      await issueSessionTokens(pool, user, req, res, requestId, true);
      return;
    }

    // 免除非適用 - 通常のPINコード認証フロー
    const reason = exemptionCheck.success 
      ? exemptionCheck.data.reason 
      : 'check failed';
    console.log(`[INFO] PIN exemption not applied: user_id=${user.user_id}, reason=${reason}`);

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
        user_agent,
        create_user_id,
        create_at
      )
      VALUES ($1, $2, NOW(), $3, $4, $5, $1, CURRENT_TIMESTAMP)
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
 * 一時パスワード生成関数
 * 12文字、大小英数字+特殊文字
 */
function generateTempPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + special;

  let password = '';
  
  // 最低1文字ずつ各種類を含める
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // 残り8文字をランダムに
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // シャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * パスワードリセット要求エンドポイント（一時パスワード方式）
 * POST /api/v1/auth/reset-password-request
 */
export async function resetPasswordRequest(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // Initialize services with pool
  const passwordService = new PasswordService(pool);

  try {
    // 1. バリデーション
    const { email } = req.body;
    const organizationId = req.query.orgId as string | undefined;

    // 必須パラメータチェック
    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須パラメータが不足しています',
          details: [
            { field: 'email', message: 'メールアドレスは必須です', code: 'REQUIRED_FIELD' },
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
    if (email.length > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスは100文字以内である必要があります',
          details: [
            { field: 'email', message: 'メールアドレスは100文字以内です', code: 'MAX_LENGTH_EXCEEDED' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. ユーザー検索（メールアドレスで検索）
    const userQuery = `
      SELECT 
        user_id,
        user_name,
        mail_address,
        role_cd,
        organization_id
      FROM organization_user
      WHERE mail_address = $1 AND organization_id = $2
    `;
    
    const userResult = await pool.query(userQuery, [email, organizationId]);

    // 3. 一時パスワード発行（ユーザーが存在する場合のみ）
    let maskedEmail = 'use***@example.com'; // デフォルト値（情報漏洩防止）
    let tempPassword = ''; // 一時パスワード（開発環境で返却用）

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      maskedEmail = maskEmail(user.mail_address);

      // 一時パスワード生成
      tempPassword = generateTempPassword();

      // パスワードハッシュ化
      const hashResult = await passwordService.hash(tempPassword, user.role_cd);

      if (!hashResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: hashResult.error?.code || 'SYSTEM_ERROR',
            message: 'パスワードのハッシュ化に失敗しました',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // user_authenticationテーブルを更新（一時パスワードフラグをtrueに設定）
      const updateQuery = `
        UPDATE user_authentication
        SET password = $1,
            password_expires_at = NOW() + INTERVAL '24 hours',
            is_temporary_flg = true,
            update_at = NOW()
        WHERE user_id = $2 AND organization_id = $3
      `;
      
      await pool.query(updateQuery, [
        hashResult.data,
        user.user_id,
        user.organization_id,
      ]);

      // 4. メール送信（開発環境ではスキップ）
      if (process.env.NODE_ENV !== 'development') {
        const emailResult = await emailService.sendTempPassword(
          user.mail_address,
          tempPassword,
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

      // 開発環境の場合、コンソールに一時パスワードを出力（テスト・デバッグ用）
      if (process.env.NODE_ENV === 'development') {
        console.log(`[INFO] 一時パスワード: ${tempPassword} (user_id=${user.user_id})`);
      }
      
      console.log(`[INFO] 一時パスワード発行: user_id=${user.user_id}, expires_at=${new Date(Date.now() + 24*60*60*1000).toISOString()}`);
    }

    // 5. 成功レスポンス（ユーザーが存在しない場合も同じレスポンス - 情報漏洩防止）
    const responseData: any = {
      message: '一時パスワードをメールで送信しました',
      email: maskedEmail,
    };

    // 開発環境の場合のみ一時パスワードを含める（開発効率化のため）
    if (process.env.NODE_ENV === 'development' && userResult.rows.length > 0) {
      responseData.tempPassword = tempPassword;
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
 * ログアウト処理（認証ミドルウェアで保護済み）
 * - リフレッシュトークンをRedisから削除（無効化）
 * - クライアント側でtokenStorageをクリアする
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    // 1. Cookieからリフレッシュトークンを取得
    const refreshTokenValue = req.cookies?.refreshToken;

    // 2. リフレッシュトークンが存在する場合、Redisから無効化
    if (refreshTokenValue) {
      const decoded = jwtService.decode(refreshTokenValue);
      
      if (decoded && 'tokenId' in decoded) {
        // Redisからリフレッシュトークンを削除
        await refreshTokenService.revoke(decoded.tokenId, req.user!.userId);
      }
    }

    // 3. Cookieを削除
    res.clearCookie('refreshToken', {
      path: '/api/v1/auth',  // 修正: 設定時と同じパスを指定
    });

    // 4. 成功レスポンス
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
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
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

    // 2.6. パスワード期限と種別のチェック
    const authQuery = `
      SELECT is_temporary_flg, password_expires_at
      FROM user_authentication
      WHERE user_id = $1 AND organization_id = $2
    `;
    const authResult = await pool.query(authQuery, [userInfo.id, userInfo.organizationId]);
    
    let passwordChangeRequired = false;
    let isPasswordExpired = false;
    let isTemporaryPassword = false;

    if (authResult.rows.length > 0) {
      const authData = authResult.rows[0];
      isTemporaryPassword = authData.is_temporary_flg || false;
      
      const now = new Date();
      const expiresAt = authData.password_expires_at ? new Date(authData.password_expires_at) : null;
      
      if (expiresAt && now > expiresAt) {
        // パスワード期限切れ
        isPasswordExpired = true;
        passwordChangeRequired = true;
        console.log(`[WARN] パスワード期限切れ: user_id=${userInfo.id}, expired_at=${authData.password_expires_at}, is_temporary=${isTemporaryPassword}`);
      } else if (isTemporaryPassword) {
        // 一時パスワード（期限内）
        passwordChangeRequired = true;
        console.log(`[INFO] 一時パスワードでログイン: user_id=${userInfo.id}, expires_at=${authData.password_expires_at}`);
      }
      
      // 判定結果のログ出力
      console.log(`[INFO] ログイン判定: user_id=${userInfo.id}, requiresChange=${passwordChangeRequired}, expired=${isPasswordExpired}, temporary=${isTemporaryPassword}`);
    }

    // 3. req.sessionに部門CDと会社IDを保存
    if (req.session) {
      req.session.departmentCd = userInfo.departmentCd;
      req.session.corporationId = userInfo.corporationId || null;

      // 明示的にセッションを保存（非同期処理を待つ）
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logError('Failed to save session', err as Error, {
              userId: userInfo.id,
            });
            reject(err);
          } else {
            console.log('Session saved successfully with departmentCd:', req.session.departmentCd, 'corporationId:', req.session.corporationId);
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

    // 5. トークンペア生成（アクセストークン + リフレッシュトークン）
    const newSessionId = uuidv4();
    const tokenPairResult = await jwtService.generateTokenPair({
      userId: userInfo.id,
      organizationId: userInfo.organizationId,
      sessionId: newSessionId,
      permissions,
    });

    if (!tokenPairResult.success) {
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

    const { accessToken, refreshToken: refreshTokenValue } = tokenPairResult.data;

    // 6. リフレッシュトークンをRedisに保存
    // IPアドレスとUser-Agentを取得
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
      || req.ip 
      || req.socket.remoteAddress 
      || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const refreshPayload = jwtService.decode(refreshTokenValue);
    if (refreshPayload && 'tokenId' in refreshPayload) {
      await refreshTokenService.save(refreshPayload, ipAddress, userAgent);
    }

    // 7. セッション有効期限を計算（環境変数から動的に取得）
    const maxAge = jwtService.getRefreshTokenMaxAge(); // ミリ秒単位（Redis起動時: 30分、未起動時: 8時間）
    const nowTimestamp = Date.now();
    const expiresAtTimestamp = nowTimestamp + maxAge;
    const expiresAt = new Date(expiresAtTimestamp);

    // 8. ログイン履歴を記録（二段階認証実施）
    await loginHistoryRepository.recordLogin(
      pool,
      userInfo.username,
      userInfo.organizationId,
      true,
      null,
      ipAddress,
      userAgent,
      true  // entry_execute_flg: true（二段階認証実施）
    );

    // 9. PINコード削除（使用済み処理）
    await pinCodeService.delete(sessionToken);

    // 10. リフレッシュトークンをhttpOnly Cookieに設定
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue（HTTPS必須）
      sameSite: 'lax', // Cross-Origin対応のため'lax'（本番ではstrictも可）
      maxAge, // 環境変数と同期（Redis起動時: 30分、未起動時: 8時間）
      path: '/api/v1/auth',
    });

    // 10. 成功レスポンス（アクセストークンのみレスポンスボディで返す）
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
          token: accessToken,
          expiresAt: expiresAt.toISOString(),
        },
        // パスワード状態フラグ
        passwordChangeRequired,     // パスワード変更が必要か（一時パスワード or 期限切れ）
        isPasswordExpired,          // パスワードが期限切れか
        isTemporaryPassword,        // 一時パスワードか
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

/**
 * パスワード変更エンドポイント（認証済みユーザー用）
 * POST /api/v1/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // Initialize services with pool
  const passwordService = new PasswordService(pool);

  try {
    // 1. バリデーション
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId;

    // 必須パラメータチェック
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須パラメータが不足しています',
          details: [
            { field: 'currentPassword', message: '現在のパスワードは必須です', code: 'REQUIRED_FIELD' },
            { field: 'newPassword', message: '新しいパスワードは必須です', code: 'REQUIRED_FIELD' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 新しいパスワードのバリデーション
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '新しいパスワードは8文字以上である必要があります',
          details: [
            { field: 'newPassword', message: 'パスワードは8文字以上です', code: 'MIN_LENGTH' },
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. 現在のパスワードを検証
    const verifyResult = await passwordService.verify(
      userId,
      organizationId,
      currentPassword
    );

    if (!verifyResult.success || !verifyResult.data) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CURRENT_PASSWORD',
          message: '現在のパスワードが正しくありません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 3. ユーザーのrole_cdを取得
    const userQuery = `
      SELECT role_cd
      FROM organization_user
      WHERE user_id = $1 AND organization_id = $2
    `;
    const userResult = await pool.query(userQuery, [userId, organizationId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const roleCd = userResult.rows[0].role_cd;

    // 4. 新しいパスワードをハッシュ化
    const hashResult = await passwordService.hash(newPassword, roleCd as UserRole);

    if (!hashResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: hashResult.error?.code || 'SYSTEM_ERROR',
          message: 'パスワードのハッシュ化に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 5. パスワードを更新（password_expires_atをNULL、is_temporary_flgをfalseに設定）
    const updateQuery = `
      UPDATE user_authentication
      SET password = $1,
          password_expires_at = NULL,
          is_temporary_flg = false,
          update_at = NOW()
      WHERE user_id = $2 AND organization_id = $3
    `;
    
    await pool.query(updateQuery, [
      hashResult.data,
      userId,
      organizationId,
    ]);

    console.log(`[INFO] パスワード変更成功: user_id=${userId}`);

    // 6. 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'パスワードを変更しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Change password error', error as Error, {
      action: 'change_password',
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
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
 * トークン更新エンドポイント
 * POST /api/v1/auth/refresh
 * 
 * @description
 * リフレッシュトークンを使用してアクセストークンを更新
 * - リフレッシュトークンを検証
 * - 新しいトークンペアを生成
 * - 古いリフレッシュトークンを無効化（トークンローテーション）
 * - Redis未起動時はJWT検証のみで動作（開発環境用）
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();

  // IPアドレスとUser-Agentを取得
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    // 1. Cookieからリフレッシュトークンを取得
    const refreshTokenValue = req.cookies?.refreshToken;

    if (!refreshTokenValue) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: 'リフレッシュトークンが見つかりません。再度ログインしてください',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. リフレッシュトークンのJWT検証
    const verifyResult = await jwtService.verifyRefreshToken(refreshTokenValue);

    if (!verifyResult.success) {
      res.status(401).json({
        success: false,
        error: {
          code: verifyResult.error?.code || 'AUTH_TOKEN_INVALID',
          message: 
            verifyResult.error?.code === 'AUTH_TOKEN_EXPIRED'
              ? 'リフレッシュトークンの有効期限が切れています。再度ログインしてください'
              : 'リフレッシュトークンが不正です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const payload = verifyResult.data;

    // 3. Redisでリフレッシュトークンの存在確認（Redis起動時のみ）
    const existsResult = await refreshTokenService.exists(payload.tokenId);

    if (!existsResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'トークン検証に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Redis起動時：トークンが存在しない場合はエラー（無効化済み or 期限切れ）
    if (!existsResult.data) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'リフレッシュトークンが無効です。再度ログインしてください',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 4. ユーザー情報とロール情報、組織名を取得
    const userQuery = `
      SELECT 
        ou.user_id,
        ou.user_name,
        ou.mail_address,
        ou.role_cd,
        ou.organization_id,
        ou.is_active,
        ou.department_cd,
        r.initial_screen_function_cd,
        o.organization_name
      FROM organization_user ou
      JOIN role r ON ou.role_cd = r.role_cd AND ou.organization_id = r.organization_id
      LEFT JOIN organization o ON ou.organization_id = o.organization_id
      WHERE ou.user_id = $1 AND ou.organization_id = $2
    `;
    
    const userResult = await pool.query(userQuery, [payload.userId, payload.organizationId]);

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const user = userResult.rows[0];

    // 5. アカウント有効性チェック
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_DISABLED',
          message: 'アカウントが無効化されています',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 6. 権限情報を取得
    const rolePermissionRepository = new RolePermissionRepository();
    const permissions = await rolePermissionRepository.getPermissionsByRoleId(
      user.role_cd,
      user.organization_id
    );

    // 7. 新しいトークンペアを生成
    const newSessionId = uuidv4();
    const tokenPairResult = await jwtService.generateTokenPair({
      userId: user.user_id,
      organizationId: user.organization_id,
      sessionId: newSessionId,
      permissions,
    });

    if (!tokenPairResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_JWT_GENERATION_FAILED',
          message: 'トークン生成に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = tokenPairResult.data;

    // 8. 新しいリフレッシュトークンをRedisに保存
    const newRefreshPayload = jwtService.decode(newRefreshToken);
    if (newRefreshPayload && 'tokenId' in newRefreshPayload) {
      await refreshTokenService.save(newRefreshPayload, ipAddress, userAgent);
    }

    // 9. 古いリフレッシュトークンを無効化（トークンローテーション）
    await refreshTokenService.revoke(payload.tokenId, payload.userId);

    // 10. 新しいリフレッシュトークンをhttpOnly Cookieに設定
    const refreshMaxAge = jwtService.getRefreshTokenMaxAge(); // ミリ秒単位（環境変数から取得）
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue（HTTPS必須）
      sameSite: 'lax', // Cross-Origin対応のため'lax'（本番ではstrictも可）
      maxAge: refreshMaxAge, // 環境変数と同期（Redis起動時: 30分、未起動時: 8時間）
      path: '/api/v1/auth',
    });

    // 11. 成功レスポンス（アクセストークンのみ返す）
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: 900, // 15分（秒）- Redis起動時
        user: {
          id: user.user_id,
          username: user.user_name,
          email: user.mail_address,
          roleCd: user.role_cd,
          organizationId: user.organization_id,
          organizationName: user.organization_name || user.organization_id,
          departmentCd: user.department_cd,
          initialScreenFunctionCd: user.initial_screen_function_cd?.trim() || null,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Refresh token error', error as Error, {
      action: 'refresh_token',
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
