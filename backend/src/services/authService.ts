import { Pool } from 'pg';
import { Request, Response } from 'express';
import type { Result, UserRole } from '../types/service';
import { PasswordService } from './passwordService';
import { PinCodeService } from './pinCodeService';
import { PinExemptionService } from './pinExemptionService';
import { JwtService } from './jwtService';
import { EmailService } from './emailService';
import { RefreshTokenService } from './refreshTokenService';
import { TokenBlacklistService } from './tokenBlacklistService';
import { OrganizationUserRepository } from '../repositories/organizationUserRepository';
import { UserAuthenticationRepository } from '../repositories/userAuthenticationRepository';
import { RolePermissionRepository } from '../repositories/rolePermissionRepository';
import { PasswordResetTokenRepository } from '../repositories/passwordResetTokenRepository';
import { getInitialScreenFunctionCd } from '../repositories/roleRepository';
import * as loginHistoryRepository from '../repositories/loginHistoryRepository';
import { issueSessionTokens } from '../controllers/authHelpers';
import { maskEmail } from '../utils/emailUtils';
import { generateTempPassword } from '../utils/passwordUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * 認証ビジネスロジックを担当するサービス
 */
export class AuthService {
  private pool: Pool;
  private passwordService: PasswordService;
  private pinCodeService: PinCodeService;
  private pinExemptionService: PinExemptionService;
  private jwtService: JwtService;
  private emailService: EmailService;
  private refreshTokenService: RefreshTokenService;
  private organizationUserRepository: OrganizationUserRepository;
  private userAuthenticationRepository: UserAuthenticationRepository;
  private rolePermissionRepository: RolePermissionRepository;

  constructor(pool: Pool) {
    this.pool = pool;
    this.passwordService = new PasswordService(pool);
    // 本番環境、または EMAIL_ENABLED=true の場合は EmailService を渡してメール送信を有効にする
    const emailEnabled =
      process.env.NODE_ENV === 'production' ||
      process.env.EMAIL_ENABLED === 'true';
    this.pinCodeService = new PinCodeService(
      pool,
      emailEnabled ? new EmailService() : undefined
    );
    this.pinExemptionService = new PinExemptionService(pool);
    this.jwtService = new JwtService();
    this.emailService = new EmailService();
    this.refreshTokenService = new RefreshTokenService();
    this.organizationUserRepository = new OrganizationUserRepository();
    this.userAuthenticationRepository = new UserAuthenticationRepository();
    this.rolePermissionRepository = new RolePermissionRepository();
  }

  /**
   * ログイン処理
   */
  async processLogin(params: {
    userId: string;
    password: string;
    organizationId: string;
    ipAddress: string;
    userAgent: string;
    req: Request;
    res: Response;
    requestId: string;
  }): Promise<Result<any>> {
    const { userId, password, organizationId, ipAddress, userAgent, req, res, requestId } = params;

    try {
      // 1. ユーザー検索
      const userResult = await this.organizationUserRepository.findByUserId(
        this.pool,
        userId,
        organizationId
      );
      console.log(userId, organizationId);
      console.log(userResult);

      if (!userResult.success) {
        // ユーザー不存在 - ログイン履歴に記録
        await loginHistoryRepository.recordLogin(
          this.pool,
          userId,
          organizationId,
          false,
          'User not found',
          ipAddress,
          userAgent
        );

        return {
          success: false,
          error: {
            code: 'E5001',
            message: 'ユーザーIDまたはパスワードが正しくありません',
          },
        };
      }

      const user = userResult.data;
      console.log(user.role_cd);

      // 2. アカウント有効性チェック
      if (!user.is_active) {
        await loginHistoryRepository.recordLogin(
          this.pool,
          user.user_id,
          user.organization_id,
          false,
          'Account disabled',
          ipAddress,
          userAgent
        );

        return {
          success: false,
          error: {
            code: 'E5006',
            message: 'アカウントが無効化されています。管理者にお問い合わせください',
          },
        };
      }

      // 3. パスワード検証
      const passwordResult = await this.passwordService.verify(
        user.user_id,
        user.organization_id,
        password
      );

      console.log(passwordResult);

      if (!passwordResult.success || !passwordResult.data) {
        await loginHistoryRepository.recordLogin(
          this.pool,
          user.user_id,
          user.organization_id,
          false,
          'Invalid password',
          ipAddress,
          userAgent
        );

        return {
          success: false,
          error: {
            code: 'E5001',
            message: 'ユーザーIDまたはパスワードが正しくありません',
          },
        };
      }

      // 4. PIN免除判定
      const exemptionCheck = await this.pinExemptionService.isExemptionApplicable(
        user.user_id,
        user.organization_id
      );

      console.log(exemptionCheck);

      if (exemptionCheck.success && exemptionCheck.data.isExempt) {
        console.log(user.user_name, user.organization_id, ipAddress, userAgent);
        // 免除適用 - ログイン履歴を記録して直接トークン発行
        await loginHistoryRepository.recordLogin(
          this.pool,
          user.user_id,
          user.organization_id,
          true,
          null,
          ipAddress,
          userAgent,
          false  // entry_execute_flg: false（二段階認証未実施・免除）
        );

        console.log(`[INFO] PIN exemption applied: user_id=${user.user_id}, reason=${exemptionCheck.data.reason}`);

        // 共通ヘルパーでトークン発行
        const userDataForToken = {
          ...user,
          department_cd: user.department_cd ?? '',
          corporation_id: user.corporation_id ?? undefined,
        };
        await issueSessionTokens(this.pool, userDataForToken, req, res, requestId, true);
        
        return {
          success: true,
          data: { skipPinVerification: true },
        };
      }

      // 5. PINコード生成と仮セッショントークン作成＋メール送信
      const sessionToken = `temp_session-${uuidv4()}_${Date.now()}`;
      
      const pinSendResult = await this.pinCodeService.generateAndSendPin(
        user.user_id,
        user.organization_id,
        sessionToken,
        user.mail_address,
        user.user_name
      );

      if (!pinSendResult.success) {
        return {
          success: false,
          error: pinSendResult.error,
        };
      }

      // 6. ログイン成功履歴記録
      await loginHistoryRepository.recordLogin(
        this.pool,
        user.user_id,
        user.organization_id,
        true,
        null,
        ipAddress,
        userAgent
      );

      // 7. 成功レスポンス
      const responseData: any = {
        sessionToken,
        message: 'PINコードをメールで送信しました',
        email: pinSendResult.data.maskedEmail,
        expiresIn: 300, // 5分（秒）
      };

      // EMAIL_ENABLED=false かつ非本番環境の場合のみPINコードをレスポンスに含める（開発用）
      const emailEnabled =
        process.env.NODE_ENV === 'production' ||
        process.env.EMAIL_ENABLED === 'true';
      if (!emailEnabled) {
        responseData.pinCode = pinSendResult.data.pinCode;
        responseData.devMode = true;
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * パスワードリセット要求処理
   */
  async processPasswordResetRequest(params: {
    email: string;
    organizationId: string;
  }): Promise<Result<any>> {
    const { email, organizationId } = params;

    try {
      // 1. ユーザー検索
      const userResult = await this.organizationUserRepository.findByEmail(
        this.pool,
        email,
        organizationId
      );

      // 2. 一時パスワード発行（ユーザーが存在する場合のみ）
      let maskedEmailResult = 'use***@example.com';
      let tempPassword = '';

      console.log(userResult.success);

      if (userResult.success) {
        const user = userResult.data;
        maskedEmailResult = maskEmail(user.mail_address);

        // 一時パスワード生成
        tempPassword = generateTempPassword();

        // パスワードハッシュ化
        const hashResult = await this.passwordService.hash(tempPassword, user.role_cd);

        if (!hashResult.success) {
          return {
            success: false,
            error: {
              code: hashResult.error?.code || 'E4001',
              message: 'パスワードのハッシュ化に失敗しました',
            },
          };
        }

        // user_authenticationテーブルを更新
        await this.userAuthenticationRepository.updateAsTemporary(
          this.pool,
          user.user_id,
          user.organization_id,
          hashResult.data
        );

        // 本番環境、または EMAIL_ENABLED=true の場合はメール送信
        const emailEnabled =
          process.env.NODE_ENV === 'production' ||
          process.env.EMAIL_ENABLED === 'true';

        if (emailEnabled) {
          const emailResult = await this.emailService.sendTempPassword(
            user.mail_address,
            tempPassword,
            user.user_name
          );

          if (!emailResult.success) {
            return {
              success: false,
              error: {
                code: 'SYSTEM_EMAIL_SEND_FAILED',
                message: 'メール送信に失敗しました。しばらく待ってから再試行してください',
              },
            };
          }
        } else {
          // EMAIL_ENABLED=false の場合はコンソールに一時パスワードを出力
          console.log(`[INFO] 一時パスワード: ${tempPassword} (user_id=${user.user_id})`);
        }
        
        console.log(`[INFO] 一時パスワード発行: user_id=${user.user_id}`);
      }

      // 3. 成功レスポンス（ユーザーが存在しない場合も同じレスポンス - 情報漏洩防止）
      const responseData: any = {
        message: '一時パスワードをメールで送信しました',
        email: maskedEmailResult,
      };

      // EMAIL_ENABLED=false かつ非本番環境の場合のみ一時パスワードをレスポンスに含める（開発用）
      const emailEnabledForResponse =
        process.env.NODE_ENV === 'production' ||
        process.env.EMAIL_ENABLED === 'true';
      if (!emailEnabledForResponse && userResult.success) {
        responseData.tempPassword = tempPassword;
        responseData.devMode = true;
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * パスワード変更処理
   */
  async processChangePassword(params: {
    userId: string;
    organizationId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<Result<void>> {
    const { userId, organizationId, currentPassword, newPassword } = params;

    try {
      // 1. 現在のパスワードを検証
      const verifyResult = await this.passwordService.verify(
        userId,
        organizationId,
        currentPassword
      );

      if (!verifyResult.success || !verifyResult.data) {
        return {
          success: false,
          error: {
            code: 'AUTH_INVALID_CURRENT_PASSWORD',
            message: '現在のパスワードが正しくありません',
          },
        };
      }

      // 2. ユーザーのrole_cdを取得
      const userResult = await this.organizationUserRepository.findByUserId(
        this.pool,
        userId,
        organizationId
      );

      if (!userResult.success) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      const roleCd = userResult.data.role_cd;

      // 3. 新しいパスワードをハッシュ化
      const hashResult = await this.passwordService.hash(newPassword, roleCd as UserRole);

      if (!hashResult.success) {
        return {
          success: false,
          error: {
            code: hashResult.error?.code || 'E4001',
            message: 'パスワードのハッシュ化に失敗しました',
          },
        };
      }

      // 4. パスワードを更新
      await this.userAuthenticationRepository.clearPasswordExpiry(
        this.pool,
        userId,
        organizationId,
        hashResult.data
      );

      console.log(`[INFO] パスワード変更成功: user_id=${userId}`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * PINコード検証処理
   */
  async processVerifyPin(params: {
    pinCode: string;
    sessionToken: string;
    req: Request;
    res: Response;
    ipAddress: string;
    userAgent: string;
  }): Promise<Result<any>> {
    const { pinCode, sessionToken, req, res, ipAddress, userAgent } = params;

    try {
      // 1. PINコード検証（ユーザー情報を含む）
      const verifyResult = await this.pinCodeService.verify(pinCode, sessionToken);

      if (!verifyResult.success) {
        // PINコード不正の場合、試行回数をインクリメント
        if (verifyResult.error?.code === 'AUTH_PIN_INVALID') {
          await this.pinCodeService.incrementAttempts(sessionToken);
        }
        
        return {
          success: false,
          error: verifyResult.error,
        };
      }

      const userInfo = verifyResult.data;

      // 2. roleテーブルから初期画面機能CDを取得
      const initialScreenFunctionCd = await getInitialScreenFunctionCd(
        userInfo.organizationId,
        userInfo.roleCd
      );
      userInfo.initialScreenFunctionCd = initialScreenFunctionCd ?? '';

      // 3. パスワード期限と種別のチェック
      const authResult = await this.userAuthenticationRepository.getPasswordStatus(
        this.pool,
        userInfo.id,
        userInfo.organizationId
      );
      
      let passwordChangeRequired = false;
      let isPasswordExpired = false;
      let isTemporaryPassword = false;

      if (authResult.success) {
        const authData = authResult.data;
        isTemporaryPassword = authData.is_temporary_flg || false;
        
        const now = new Date();
        const expiresAt = authData.password_expires_at ? new Date(authData.password_expires_at) : null;
        
        if (expiresAt && now > expiresAt) {
          isPasswordExpired = true;
          passwordChangeRequired = true;
          console.log(`[WARN] パスワード期限切れ: user_id=${userInfo.id}`);
        } else if (isTemporaryPassword) {
          passwordChangeRequired = true;
          console.log(`[INFO] 一時パスワードでログイン: user_id=${userInfo.id}`);
        }
      }

      // 4. req.sessionに部門CDと会社IDを保存
      if (req.session) {
        req.session.departmentCd = userInfo.departmentCd;
        req.session.corporationId = userInfo.corporationId || null;

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

      // 5. 権限情報を取得
      const permissions = await this.rolePermissionRepository.getPermissionsByRoleId(
        userInfo.roleCd,
        userInfo.organizationId
      );

      // 6. トークンペア生成
      const newTokenId = uuidv4();
      const tokenPairResult = await this.jwtService.generateTokenPair({
        userId: userInfo.id,
        organizationId: userInfo.organizationId,
        sessionId: newTokenId,  // 後方互換性のため
        tokenId: newTokenId,     // アクセストークンとリフレッシュトークンで共通
        permissions,
      });

      if (!tokenPairResult.success) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_JWT_GENERATION_FAILED',
            message: 'セッション生成に失敗しました',
          },
        };
      }

      const { accessToken, refreshToken: refreshTokenValue } = tokenPairResult.data;

      // 7. リフレッシュトークンをRedisに保存（userName, emailを含める）
      const refreshPayload = this.jwtService.decode(refreshTokenValue);
      if (refreshPayload && 'tokenId' in refreshPayload) {
        await this.refreshTokenService.save(
          refreshPayload,
          ipAddress,
          userAgent,
          userInfo.username,
          userInfo.email
        );
      }

      // 8. セッション有効期限を計算
      const maxAge = this.jwtService.getRefreshTokenMaxAge();
      const expiresAtTimestamp = Date.now() + maxAge;
      const expiresAt = new Date(expiresAtTimestamp);

      // 9. ログイン履歴を記録（二段階認証実施）
      await loginHistoryRepository.recordLogin(
        this.pool,
        userInfo.id,
        userInfo.organizationId,
        true,
        null,
        ipAddress,
        userAgent,
        true  // entry_execute_flg: true（二段階認証実施）
      );

      // 10. PINコード削除（使用済み処理）
      await this.pinCodeService.delete(sessionToken);

      // 11. リフレッシュトークンをhttpOnly Cookieに設定
      res.cookie('refreshToken', refreshTokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge,
        path: '/api/v1',
      });

      // 12. 成功レスポンス
      return {
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
          passwordChangeRequired,
          isPasswordExpired,
          isTemporaryPassword,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * トークン更新処理
   */
  async processRefreshToken(params: {
    refreshTokenValue: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<Result<any>> {
    const { refreshTokenValue, ipAddress, userAgent } = params;

    try {
      // 1. リフレッシュトークンのJWT検証
      const verifyResult = await this.jwtService.verifyRefreshToken(refreshTokenValue);

      if (!verifyResult.success) {
        return {
          success: false,
          error: verifyResult.error,
        };
      }

      const payload = verifyResult.data;

      // 2. Redisでリフレッシュトークンの存在確認
      const existsResult = await this.refreshTokenService.exists(payload.tokenId);

      if (!existsResult.success) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_REDIS_ERROR',
            message: 'トークン検証に失敗しました',
          },
        };
      }

      if (!existsResult.data) {
        return {
          success: false,
          error: {
            code: 'E5002',
            message: 'リフレッシュトークンが無効です。再度ログインしてください',
          },
        };
      }

      // 3. ユーザー情報とロール情報を取得
      const userResult = await this.organizationUserRepository.findByUserIdWithRole(
        this.pool,
        payload.userId,
        payload.organizationId
      );

      if (!userResult.success) {
        return {
          success: false,
          error: {
            code: 'AUTH_USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      const user = userResult.data;

      // initial_screen_function_cdを取得
      const initialScreenFunctionCd = await getInitialScreenFunctionCd(
        user.organization_id,
        user.role_cd
      );

      // 4. アカウント有効性チェック
      if (!user.is_active) {
        return {
          success: false,
          error: {
            code: 'E5006',
            message: 'アカウントが無効化されています',
          },
        };
      }

      // 5. 権限情報を取得
      const permissions = await this.rolePermissionRepository.getPermissionsByRoleId(
        user.role_cd,
        user.organization_id
      );

      // 6. 新しいトークンペアを生成
      const newTokenId = uuidv4();
      const tokenPairResult = await this.jwtService.generateTokenPair({
        userId: user.user_id,
        organizationId: user.organization_id,
        sessionId: newTokenId,  // 後方互換性のため
        tokenId: newTokenId,     // アクセストークンとリフレッシュトークンで共通
        permissions,
      });

      if (!tokenPairResult.success) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_JWT_GENERATION_FAILED',
            message: 'トークン生成に失敗しました',
          },
        };
      }

      const { accessToken, refreshToken: newRefreshToken } = tokenPairResult.data;

      // 7. 新しいリフレッシュトークンをRedisに保存（userName, emailを含める）
      const newRefreshPayload = this.jwtService.decode(newRefreshToken);
      if (newRefreshPayload && 'tokenId' in newRefreshPayload) {
        await this.refreshTokenService.save(
          newRefreshPayload,
          ipAddress,
          userAgent,
          user.user_name,
          user.mail_address
        );
      }

      // 8. 古いリフレッシュトークンを無効化（トークンローテーション）
      await this.refreshTokenService.revoke(payload.tokenId, payload.userId);

      // 9. 成功レスポンス
      return {
        success: true,
        data: {
          accessToken,
          newRefreshToken,
          refreshMaxAge: this.jwtService.getRefreshTokenMaxAge(),
          expiresIn: 900, // 15分（秒）
          user: {
            id: user.user_id,
            username: user.user_name,
            email: user.mail_address,
            roleName: user.role_name?.trim() || user.role_cd,
            roleCd: user.role_cd,
            organizationId: user.organization_id,
            organizationName: user.organization_display_name?.trim() || user.organization_id,
            displayName: user.user_name,
            departmentCd: user.department_cd || '',
            initialScreenFunctionCd: initialScreenFunctionCd,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * ログアウト処理
   */
  async processLogout(params: {
    refreshTokenValue: string | undefined;
    userId: string;
  }): Promise<Result<void>> {
    const { refreshTokenValue, userId } = params;

    try {
      // 1. リフレッシュトークンが存在する場合、Redisから無効化
      if (refreshTokenValue) {
        const decoded = this.jwtService.decode(refreshTokenValue);
        
        if (decoded && 'tokenId' in decoded) {
          // Redisからリフレッシュトークンを削除
          await this.refreshTokenService.revoke(decoded.tokenId, userId);

          // アクセストークンをブラックリストに追加
          const blacklistService = new TokenBlacklistService();
          await blacklistService.add(decoded.tokenId);
        }
      }

      console.log(`[INFO] ログアウト成功: user_id=${userId}`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * PINコード再送信処理
   */
  async processResendPin(params: {
    sessionToken: string;
    organizationId: string;
  }): Promise<Result<any>> {
    const { sessionToken, organizationId } = params;

    try {
      // 1. セッショントークンからユーザー情報を取得
      const userInfoResult = await this.organizationUserRepository.findBySessionToken(
        this.pool,
        sessionToken,
        organizationId
      );

      if (!userInfoResult.success) {
        return {
          success: false,
          error: {
            code: 'E5002',
            message: 'セッショントークンが不正です',
          },
        };
      }

      const userInfo = userInfoResult.data;

      // 2. 既存のPINコード削除
      await this.pinCodeService.delete(sessionToken);

      // 3. 新しいPINコード生成＋メール送信
      const pinSendResult = await this.pinCodeService.generateAndSendPin(
        userInfo.user_id,
        userInfo.organization_id,
        sessionToken,
        userInfo.mail_address,
        userInfo.user_name
      );

      if (!pinSendResult.success) {
        return {
          success: false,
          error: pinSendResult.error,
        };
      }

      console.log(`[INFO] PINコード再送信: user_id=${userInfo.user_id}`);

      // 4. 成功レスポンス
      return {
        success: true,
        data: {
          message: 'PINコードを再送信しました',
          email: pinSendResult.data.maskedEmail,
          expiresIn: 300, // 5分（秒）
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }

  /**
   * パスワードリセット実行処理（トークンベース）
   */
  async processResetPassword(params: {
    resetToken: string;
    newPassword: string;
  }): Promise<Result<void>> {
    const { resetToken, newPassword } = params;

    try {
      // 1. リセットトークン検証
      const passwordResetTokenRepository = new PasswordResetTokenRepository();
      const tokenResult = await passwordResetTokenRepository.findByToken(this.pool, resetToken);

      if (!tokenResult.success) {
        return {
          success: false,
          error: {
            code: 'AUTH_RESET_TOKEN_INVALID',
            message: 'Invalid or expired reset token',
          },
        };
      }

      const tokenData = tokenResult.data;

      // 2. 有効期限チェック
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      if (now > expiresAt) {
        return {
          success: false,
          error: {
            code: 'AUTH_RESET_TOKEN_EXPIRED',
            message: 'Reset token has expired',
          },
        };
      }

      // 3. 使用済みチェック
      if (tokenData.is_used) {
        return {
          success: false,
          error: {
            code: 'AUTH_RESET_TOKEN_USED',
            message: 'Reset token has already been used',
          },
        };
      }

      // 4. パスワードハッシュ化
      const hashResult = await this.passwordService.hash(newPassword, tokenData.role_cd as UserRole);

      if (!hashResult.success) {
        return {
          success: false,
          error: {
            code: hashResult.error?.code || 'E4001',
            message: hashResult.error?.message || 'Failed to hash password',
          },
        };
      }

      // 5. パスワード更新
      const updateResult = await this.passwordService.update(
        tokenData.user_id,
        tokenData.organization_id,
        hashResult.data
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: {
            code: updateResult.error?.code || 'SYSTEM_DATABASE_ERROR',
            message: updateResult.error?.message || 'Failed to update password',
          },
        };
      }

      // 6. リセットトークン削除
      await passwordResetTokenRepository.deleteByToken(this.pool, resetToken);

      console.log(`[INFO] パスワードリセット成功: user_id=${tokenData.user_id}`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4001',
          message: 'システムエラーが発生しました',
        },
      };
    }
  }
}
