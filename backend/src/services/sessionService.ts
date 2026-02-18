/**
 * セッション管理サービス
 * 
 * @description
 * - アクティブセッションの一覧取得
 * - セッション強制終了
 * - マルチテナント分離対応
 */

import type { Result, ServiceError, SessionInfo } from '../types/auth';
import { RefreshTokenService } from './refreshTokenService';
import { logError } from '../utils/logger';

/**
 * セッション管理サービスクラス
 */
export class SessionService {
  private refreshTokenService: RefreshTokenService;

  constructor() {
    this.refreshTokenService = new RefreshTokenService();
  }

  /**
   * アクティブセッション一覧を取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param currentUserId - 現在のユーザーID（現在のセッション判定用）
   * @param currentTokenId - 現在のリフレッシュトークンID（現在のセッション判定用）
   * @returns セッション情報の配列
   */
  async listActiveSessions(
    organizationId: string,
    currentUserId: string,
    currentTokenId?: string
  ): Promise<Result<SessionInfo[], ServiceError>> {
    try {
      // 1. Redisから全アクティブトークンを取得
      const tokensResult = await this.refreshTokenService.getAllActiveTokens();

      if (!tokensResult.success) {
        return {
          success: false,
          error: tokensResult.error
        };
      }

      // 2. organizationIdでフィルタリング（マルチテナント分離）
      const filteredTokens = tokensResult.data.filter(
        token => token.organizationId === organizationId
      );

      // 3. セッション情報を構築
      const now = Math.floor(Date.now() / 1000);
      const sessions: SessionInfo[] = filteredTokens.map(token => {
        // セッション継続時間を計算（秒単位）
        const durationSeconds = now - token.issuedAt;
        const durationMinutes = Math.floor(durationSeconds / 60);

        // "1日2時間30分" 形式にフォーマット
        const sessionDuration = this.formatDuration(durationSeconds);

        // ログイン時刻をISO 8601形式に変換
        const loginTime = new Date(token.issuedAt * 1000).toISOString();
        
        // lastActivityは現在はログイン時刻と同じ（将来的に更新可能）
        const lastActivity = loginTime;

        // 現在のトークンかどうかを判定（tokenIdベース）
        // currentTokenIdが指定されている場合はtokenIdで判定、なければuserIdで判定（後方互換性）
        const isCurrentUser = currentTokenId 
          ? token.tokenId === currentTokenId
          : token.userId === currentUserId;

        return {
          tokenId: token.tokenId,
          userId: token.userId,
          userName: token.userName || 'Unknown',
          email: token.email || 'unknown@example.com',
          sessionDuration,
          durationMinutes,
          loginTime,
          lastActivity,
          ipAddress: token.ipAddress || 'Unknown',
          userAgent: token.userAgent || 'Unknown',
          isCurrentUser
        };
      });

      // 4. ログイン時刻の降順でソート（最新が先頭）
      sessions.sort((a, b) => {
        return new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime();
      });

      return {
        success: true,
        data: sessions
      };
    } catch (error) {
      logError('Failed to list active sessions', error as Error, {
        action: 'list_active_sessions',
        organizationId
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'セッション一覧の取得に失敗しました',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * セッションを強制終了
   * 
   * @param tokenId - トークンID
   * @param currentUserId - 現在のユーザーID（自分自身のセッション終了を防止）
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param currentTokenId - 現在のリフレッシュトークンID（現在のセッション判定用）
   * @returns 終了結果
   */
  async terminateSession(
    tokenId: string,
    currentUserId: string,
    organizationId: string,
    currentTokenId?: string
  ): Promise<Result<void, ServiceError>> {
    try {
      // 1. トークン情報を取得
      const tokenResult = await this.refreshTokenService.get(tokenId);

      if (!tokenResult.success) {
        return {
          success: false,
          error: tokenResult.error
        };
      }

      if (!tokenResult.data) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'セッションが見つかりません'
          }
        };
      }

      const token = tokenResult.data;

      // 2. organization_idの検証（マルチテナント分離）
      if (token.organizationId !== organizationId) {
        logError('Attempt to terminate session from different organization', new Error('Organization mismatch'), {
          action: 'terminate_session',
          requestOrganizationId: organizationId,
          tokenOrganizationId: token.organizationId,
          tokenId
        });

        return {
          success: false,
          error: {
            code: 'PERMISSION_INSUFFICIENT',
            message: 'このセッションを終了する権限がありません'
          }
        };
      }

      // 3. 現在のセッション終了を防止（tokenIdベース）
      // currentTokenIdが指定されている場合はtokenIdで判定、なければuserIdで判定（後方互換性）
      const isCurrentSession = currentTokenId 
        ? token.tokenId === currentTokenId
        : token.userId === currentUserId;

      if (isCurrentSession) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '現在使用中のセッションは終了できません'
          }
        };
      }

      // 4. Redisからトークンを削除（セッション無効化）
      const revokeResult = await this.refreshTokenService.revoke(tokenId, token.userId);

      if (!revokeResult.success) {
        return {
          success: false,
          error: revokeResult.error
        };
      }

      console.log(`[INFO] セッション強制終了: tokenId=${tokenId}, userId=${token.userId}, by=${currentUserId}`);

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      logError('Failed to terminate session', error as Error, {
        action: 'terminate_session',
        tokenId,
        currentUserId,
        organizationId
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'セッションの終了に失敗しました',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * セッション継続時間を人間が読みやすい形式にフォーマット
   * 
   * @param seconds - 秒数
   * @returns "1日2時間30分" のような形式の文字列
   * @private
   */
  private formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days}日`);
    }
    if (hours > 0) {
      parts.push(`${hours}時間`);
    }
    if (minutes > 0 || parts.length === 0) {
      parts.push(`${minutes}分`);
    }

    return parts.join('');
  }
}
