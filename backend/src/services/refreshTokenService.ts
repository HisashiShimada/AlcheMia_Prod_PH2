/**
 * リフレッシュトークン管理サービス
 * 
 * @description
 * - Redisでリフレッシュトークンを管理
 * - 30分アイドルタイムアウト（rolling更新）
 * - トークンローテーション（セキュリティ強化）
 * - Redis未起動時のフォールバック動作
 */

import type { 
  RefreshTokenPayload, 
  StoredRefreshToken,
  Result,
  ServiceError 
} from '../types/auth';
import { RedisConnectionService } from './redisConnectionService';
import { logError } from '../utils/logger';

/**
 * リフレッシュトークン管理サービスクラス
 */
export class RefreshTokenService {
  private readonly keyPrefix = 'mmdpf:refresh_token:';
  private readonly userTokensPrefix = 'mmdpf:refresh_token:user:';

  /**
   * リフレッシュトークンをRedisに保存
   * 
   * @param payload - リフレッシュトークンペイロード
   * @param ipAddress - IPアドレス（オプション）
   * @param userAgent - User-Agent（オプション）
   * @returns 保存結果
   */
  async save(
    payload: RefreshTokenPayload,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Result<void, ServiceError>> {
    // Redis未起動時はスキップ（開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: リフレッシュトークン保存をスキップ');
      return { success: true, data: undefined };
    }

    try {
      const client = RedisConnectionService.getClient();
      if (!client) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_REDIS_ERROR',
            message: 'Redis client is not available'
          }
        };
      }

      // Redis保存用データ構築
      const storedData: StoredRefreshToken = {
        userId: payload.userId,
        organizationId: payload.organizationId,
        sessionId: payload.sessionId,
        tokenId: payload.tokenId,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
        ipAddress,
        userAgent
      };

      // TTL計算（有効期限まで）
      const now = Math.floor(Date.now() / 1000);
      const ttl = payload.exp - now;

      if (ttl <= 0) {
        return {
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token has already expired'
          }
        };
      }

      // Redisに保存（TTL付き）
      const key = `${this.keyPrefix}${payload.tokenId}`;
      await client.setEx(key, ttl, JSON.stringify(storedData));

      // ユーザーごとのトークンセットに追加（将来の強制ログアウト用）
      const userKey = `${this.userTokensPrefix}${payload.userId}`;
      await client.sAdd(userKey, payload.tokenId);
      await client.expire(userKey, ttl);

      return { success: true, data: undefined };
    } catch (error) {
      logError('Failed to save refresh token to Redis', error as Error, {
        action: 'save_refresh_token',
        tokenId: payload.tokenId,
        userId: payload.userId,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to save refresh token',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * リフレッシュトークンをRedisから取得
   * 
   * @param tokenId - トークンID
   * @returns 保存されたリフレッシュトークンデータ
   */
  async get(tokenId: string): Promise<Result<StoredRefreshToken | null, ServiceError>> {
    // Redis未起動時は常に有効とみなす（JWT検証のみ、開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: JWT検証のみで認証');
      // フォールバックデータを返す（検証スキップ）
      return {
        success: true,
        data: null  // nullを返してJWT検証のみで通す
      };
    }

    try {
      const client = RedisConnectionService.getClient();
      if (!client) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_REDIS_ERROR',
            message: 'Redis client is not available'
          }
        };
      }

      // Redisから取得
      const key = `${this.keyPrefix}${tokenId}`;
      const data = await client.get(key);

      if (!data) {
        // トークンが存在しない or 期限切れで自動削除済み
        return {
          success: true,
          data: null
        };
      }

      const storedToken: StoredRefreshToken = JSON.parse(data);
      return {
        success: true,
        data: storedToken
      };
    } catch (error) {
      logError('Failed to get refresh token from Redis', error as Error, {
        action: 'get_refresh_token',
        tokenId,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to get refresh token',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * リフレッシュトークンをRedisから削除（無効化）
   * 
   * @param tokenId - トークンID
   * @param userId - ユーザーID
   * @returns 削除結果
   */
  async revoke(tokenId: string, userId: string): Promise<Result<void, ServiceError>> {
    // Redis未起動時はスキップ（開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: リフレッシュトークン削除をスキップ');
      return { success: true, data: undefined };
    }

    try {
      const client = RedisConnectionService.getClient();
      if (!client) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_REDIS_ERROR',
            message: 'Redis client is not available'
          }
        };
      }

      // Redisから削除
      const key = `${this.keyPrefix}${tokenId}`;
      await client.del(key);

      // ユーザーごとのトークンセットからも削除
      const userKey = `${this.userTokensPrefix}${userId}`;
      await client.sRem(userKey, tokenId);

      return { success: true, data: undefined };
    } catch (error) {
      logError('Failed to revoke refresh token', error as Error, {
        action: 'revoke_refresh_token',
        tokenId,
        userId,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to revoke refresh token',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * ユーザーの全リフレッシュトークンを無効化
   * 
   * @param userId - ユーザーID
   * @returns 削除結果
   * 
   * @description 将来の強制ログアウト機能用
   */
  async revokeAllForUser(userId: string): Promise<Result<void, ServiceError>> {
    // Redis未起動時はスキップ（開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: 全トークン削除をスキップ');
      return { success: true, data: undefined };
    }

    try {
      const client = RedisConnectionService.getClient();
      if (!client) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_REDIS_ERROR',
            message: 'Redis client is not available'
          }
        };
      }

      // ユーザーのトークンIDセットを取得
      const userKey = `${this.userTokensPrefix}${userId}`;
      const tokenIds = await client.sMembers(userKey);

      // 各トークンを削除
      for (const tokenId of tokenIds) {
        const key = `${this.keyPrefix}${tokenId}`;
        await client.del(key);
      }

      // ユーザーのトークンセットも削除
      await client.del(userKey);

      return { success: true, data: undefined };
    } catch (error) {
      logError('Failed to revoke all refresh tokens for user', error as Error, {
        action: 'revoke_all_refresh_tokens',
        userId,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to revoke all refresh tokens',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * リフレッシュトークンの存在確認
   * 
   * @param tokenId - トークンID
   * @returns true: 存在する, false: 存在しない
   */
  async exists(tokenId: string): Promise<Result<boolean, ServiceError>> {
    // Redis未起動時は常に存在するとみなす（JWT検証のみ、開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      return {
        success: true,
        data: true  // 常にtrueを返す（JWT検証のみで通す）
      };
    }

    try {
      const client = RedisConnectionService.getClient();
      if (!client) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_REDIS_ERROR',
            message: 'Redis client is not available'
          }
        };
      }

      const key = `${this.keyPrefix}${tokenId}`;
      const exists = await client.exists(key);

      return {
        success: true,
        data: exists === 1
      };
    } catch (error) {
      logError('Failed to check refresh token existence', error as Error, {
        action: 'check_refresh_token_exists',
        tokenId,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to check token existence',
          originalError: error as Error
        }
      };
    }
  }
}
