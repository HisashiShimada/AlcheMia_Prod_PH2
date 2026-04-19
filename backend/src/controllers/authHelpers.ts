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
  corporation_id?: string;              // 会社ID（オプション）
  organization_display_name?: string;   // 組織表示名（オプション）
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

  // 1. ユーザー情報と組織名、会社IDを取得（organization, corporationテーブルをJOIN）
  const userInfoQuery = `
    SELECT 
      ou.user_id,
      ou.user_name,
      ou.mail_address,
      ou.role_cd,
      ou.organization_id,
      ou.department_cd,
      o.organization_display_name,
      o.corporation_id
    FROM organization_user ou
    LEFT JOIN organization o ON ou.organization_id = o.organization_id
    WHERE ou.user_id = $1 AND ou.organization_id = $2
  `;
  const userInfoResult = await pool.query(userInfoQuery, [user.user_id, user.organization_id]);
  
  // 組織名と会社IDを取得（存在しない場合はデフォルト値）
  const organizationName = userInfoResult.rows.length > 0 && userInfoResult.rows[0].organization_display_name
    ? userInfoResult.rows[0].organization_display_name
    : user.organization_id;
  
  const corporationId = userInfoResult.rows.length > 0 
    ? userInfoResult.rows[0].corporation_id || null
    : null;

  // 2. roleテーブルから初期画面機能CDとロール名を取得
  const roleQuery = `
    SELECT initial_screen_function_cd, role_name
    FROM role
    WHERE organization_id = $1 AND role_cd = $2
  `;
  const roleResult = await pool.query(roleQuery, [user.organization_id, user.role_cd]);
  
  const initialScreenFunctionCd = roleResult.rows.length > 0 
    ? roleResult.rows[0].initial_screen_function_cd?.trim() || null
    : null;
  
  const roleName = roleResult.rows.length > 0 
    ? roleResult.rows[0].role_name?.trim() || user.role_cd
    : user.role_cd;

  // 3. パスワード期限と種別のチェック
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

  // 4. 権限情報取得
  const rolePermissionRepository = new RolePermissionRepository();
  const permissions = await rolePermissionRepository.getPermissionsByRoleId(
    user.role_cd,
    user.organization_id
  );

  // 5. トークンペア生成（departmentCd と corporationId を JWT に含める）
  const newTokenId = uuidv4();
  const tokenPairResult = await jwtService.generateTokenPair({
    userId: user.user_id,
    organizationId: user.organization_id,
    corporationId: corporationId || undefined,
    sessionId: newTokenId,
    tokenId: newTokenId,
    permissions,
    departmentCd: user.department_cd || undefined,
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

  // 7. リフレッシュトークンをRedisに保存（userName, emailを含める）
  const refreshPayload = jwtService.decode(refreshTokenValue);
  if (refreshPayload && 'tokenId' in refreshPayload) {
    await refreshTokenService.save(
      refreshPayload,
      ipAddress,
      userAgent,
      user.user_name,
      user.mail_address
    );
  }

  // 8. セッション有効期限を計算（環境変数から動的に取得）
  const maxAge = jwtService.getRefreshTokenMaxAge(); // ミリ秒単位
  const expiresAt = new Date(Date.now() + maxAge);

  // 9. リフレッシュトークンをhttpOnly Cookieに設定
  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge, // 環境変数と同期（Redis起動時: 30分、未起動時: 8時間）
    path: '/',
  });

  // 10. 成功レスポンス
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.user_id,
        username: user.user_name,
        email: user.mail_address,
        roleName: roleName,
        roleCd: user.role_cd,
        organizationId: user.organization_id,
        organizationName: organizationName,
        displayName: user.user_name,
        departmentCd: user.department_cd,
        initialScreenFunctionCd: initialScreenFunctionCd,
        permissions: permissions,  // 権限情報を追加（メニューアクセス制御用）
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
