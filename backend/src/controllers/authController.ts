import { Request, Response } from 'express';
import { getPool } from '../database/db';
import { AuthService } from '../services/authService';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';
import { maskEmail } from '../utils/emailUtils';

/**
 * ログインエンドポイント
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();
  const authService = new AuthService(pool);

  // IPアドレスとUser-Agentを取得
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { userId, password } = req.body;
    const organizationId = (req.headers['x-organization-id'] || req.query.orgId) as string;

    const result = await authService.processLogin({
      userId,
      password,
      organizationId,
      ipAddress,
      userAgent,
      req,
      res,
      requestId,
    });
    
    if (!result.success) {
      // エラーコードに応じてステータスコードを設定
      const statusCode = result.error?.code === 'AUTH_ACCOUNT_DISABLED' ? 403 : 401;
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // skipPinVerificationがtrueの場合、issueSessionTokensが既にレスポンスを返しているのでreturn
    if (result.data.skipPinVerification) {
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
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
 * パスワードリセット要求エンドポイント（一時パスワード方式）
 * POST /api/v1/auth/reset-password-request
 */
export async function resetPasswordRequest(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();
  const authService = new AuthService(pool);

  try {
    const { email } = req.body;
    const organizationId = (req.headers['x-organization-id'] || req.query.orgId) as string;

    const result = await authService.processPasswordResetRequest({
      email,
      organizationId,
    });
    
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
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
  const pool = getPool();
  const requestId = uuidv4();
  const authService = new AuthService(pool);

  try {
    const refreshTokenValue = req.cookies?.refreshToken;
    const userId = req.user!.userId;

    const result = await authService.processLogout({
      refreshTokenValue,
      userId,
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Cookieを削除
    res.clearCookie('refreshToken', {
      path: '/api/v1/auth',
    });

    // 成功レスポンス
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
  const authService = new AuthService(pool);

  try {
    const authHeader = req.headers.authorization as string;
    const organizationId = (req.headers['x-organization-id'] || req.query.orgId) as string;

    // Authorizationヘッダーからトークン抽出
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    const sessionToken = tokenMatch![1];

    const result = await authService.processResendPin({
      sessionToken,
      organizationId,
    });

    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      const statusCode = errorCode === 'SYSTEM_EMAIL_SEND_FAILED' ? 500 
        : errorCode === 'AUTH_TOKEN_INVALID' ? 401 
        : 500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
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
  const authService = new AuthService(pool);

  try {
    const { resetToken, newPassword } = req.body;

    const result = await authService.processResetPassword({
      resetToken,
      newPassword,
    });

    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      const statusCode = 
        errorCode === 'AUTH_RESET_TOKEN_INVALID' ? 400 :
        errorCode === 'AUTH_RESET_TOKEN_EXPIRED' ? 400 :
        errorCode === 'AUTH_RESET_TOKEN_USED' ? 400 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

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
 * PINコード検証エンドポイント
 * POST /api/v1/auth/verify-pin
 */
export async function verifyPin(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();
  const authService = new AuthService(pool);

  // IPアドレスとUser-Agentを取得
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { pinCode } = req.body;
    const authHeader = req.headers.authorization as string;
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    const sessionToken = tokenMatch![1];

    const result = await authService.processVerifyPin({
      pinCode,
      sessionToken,
      req,
      res,
      ipAddress,
      userAgent,
    });
    
    if (!result.success) {
      const errorCode = result.error?.code || 'AUTH_PIN_INVALID';
      const statusCode = errorCode === 'AUTH_PIN_MAX_ATTEMPTS' ? 429 : 401;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
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
  const authService = new AuthService(pool);

  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId;

    const result = await authService.processChangePassword({
      userId,
      organizationId,
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      const statusCode = result.error?.code === 'AUTH_INVALID_CURRENT_PASSWORD' ? 401 
        : result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 
        : 500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

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
  const authService = new AuthService(pool);

  // IPアドレスとUser-Agentを取得
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
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

    const result = await authService.processRefreshToken({
      refreshTokenValue,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      const errorCode = result.error?.code || 'AUTH_TOKEN_INVALID';
      const statusCode = 
        errorCode === 'SYSTEM_REDIS_ERROR' ? 500 :
        errorCode === 'AUTH_ACCOUNT_DISABLED' ? 403 :
        errorCode === 'SYSTEM_JWT_GENERATION_FAILED' ? 500 :
        401;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 新しいリフレッシュトークンをhttpOnly Cookieに設定
    res.cookie('refreshToken', result.data.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.data.refreshMaxAge,
      path: '/api/v1/auth',
    });

    // 成功レスポンス（アクセストークンのみ返す）
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.data.accessToken,
        expiresIn: result.data.expiresIn,
        user: result.data.user,
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
