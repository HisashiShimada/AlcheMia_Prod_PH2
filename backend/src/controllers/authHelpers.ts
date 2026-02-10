/**
 * authController用のヘルパー関数
 * トークン発行などの共通処理を提供
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { JwtService } from '../services/jwtService';
import { RefreshTokenService } from '../services/refreshTokenService';
import { RolePermissionRepository } from '../repositories/rolePermissionRepository';
import { v4 as uuidv4 } from 'uuid';

const jwtService = new JwtService();
const refreshTokenService = new RefreshTokenService();

/**
 * ユーザー情報の型
 */
interface UserData {
  user_id: string;
  user_name: string;
  mail_address: string;
  role_cd: string;
  organization_id: string;
  department_cd: string;
}

/**
 * セッショントークン発行とレスポンス生成（共通処理）
 * 
 * @param pool - データベース接続プール
 * @param user - ユーザー情報
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @param requestId - リクエストID
 * @param pinExemptionApplied - PIN免除が適用されたか（オプション）
 */
export async function issueSessionTokens(
  pool: Pool,
  user: UserData,
  req: Request,
  res: Response,
  requestId: string,
  pinExemptionApplied = false
): Promise<void> {
  // IPアドレスとUser-Agentを取得
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // 1. roleテーブルから初期画面機能CDを取得
  const roleQuery = `
    SELECT initial_screen_function_cd
    FROM role
    WHERE organization_id = $1 AND role_cd = $2
  `;
  const roleResult = await pool.query(roleQuery, [user.organization_id, user.role_cd]);
  
  const initialScreenFunctionCd = roleResult.rows.length > 0 
    ? roleResult.rows[0].initial_screen_function_cd?.trim() || null
    : null;

  // 2. パスワード期限と種別のチェック
  const authQuery = `
    SELECT is_temporary_flg, password_expires_at
    FROM user_authentication
    WHERE user_id = $1 AND organization_id = $2
  `;
  const authResult = await pool.query(authQuery, [user.user_id, user.organization_id]);
  
  let passwordChangeRequired = false;
  let isPasswordExpired = false;
  let isTemporaryPassword = false;

  if (authResult.rows.length > 0) {
    const authData = authResult.rows[0];
    isTemporaryPassword = authData.is_temporary_flg || false;
    
    const now = new Date();
    const expiresAt = authData.password_expires_at ? new Date(authData.password_expires_at) : null;
    
    if (expiresAt && now > expiresAt) {
      isPasswordExpired = true;
      passwordChangeRequired = true;
    } else if (isTemporaryPassword) {
      passwordChangeRequired = true;
    }
  }

  // 3. req.sessionに部門CDを保存
  if (req.session) {
    req.session.departmentCd = user.department_cd;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // 4. 権限情報取得
  const rolePermissionRepository = new RolePermissionRepository();
  const permissions = await rolePermissionRepository.getPermissionsByRoleId(
    user.role_cd,
    user.organization_id
  );

  // 5. トークンペア生成
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
  const refreshPayload = jwtService.decode(refreshTokenValue);
  if (refreshPayload && 'tokenId' in refreshPayload) {
    await refreshTokenService.save(refreshPayload, ipAddress, userAgent);
  }

  // 7. セッション有効期限を計算
  const maxAge = 30 * 60 * 1000; // 30分
  const expiresAt = new Date(Date.now() + maxAge);

  // 8. リフレッシュトークンをhttpOnly Cookieに設定
  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000,
    path: '/api/v1/auth',
  });

  // 9. 成功レスポンス
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.user_id,
        username: user.user_name,
        email: user.mail_address,
        roleName: user.role_cd,
        roleCd: user.role_cd,
        organizationId: user.organization_id,
        organizationName: user.organization_id,
        displayName: user.user_name,
        departmentCd: user.department_cd,
        initialScreenFunctionCd: initialScreenFunctionCd,
      },
      session: {
        token: accessToken,
        expiresAt: expiresAt.toISOString(),
      },
      passwordChangeRequired,
      isPasswordExpired,
      isTemporaryPassword,
      ...(pinExemptionApplied && { pinExemptionApplied: true }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
