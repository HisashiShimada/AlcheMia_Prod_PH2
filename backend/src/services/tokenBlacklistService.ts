/**
 * アクセストークンブラックリストサービス
 * 
 * @description
 * - セッション強制終了時にアクセストークンをブラックリストに追加
 * - authMiddlewareで検証時にブラックリストをチェック
 * - 定期的なクリーンアップジョブで期限切れトークンを削除
 * - クリーンアップ周期: TOKEN_BLACKLIST_CLEANUP_INTERVAL環境変数
 * - 削除対象: JWT_REFRESH_TOKEN_EXPIRES_IN秒以上経過したトークン
 */

import type { Result, ServiceError } from '../types/auth';
import { RedisConnectionService } from './redisConnectionService';
import { logError } from '../utils/logger';

/**
 * アクセストークンブラックリストサービスクラス
 */
export class TokenBlacklistService {
  private readonly keyPrefix = 'blacklist:access:';

  /**
   * トークンをブラックリストに追加
   * 
   * @param tokenId - トークンID（アクセストークンとリフレッシュトークンで共通）
   * @returns 追加結果
   */
  async add(tokenId: string): Promise<Result<void, ServiceError>> {
    // Redis未起動時はスキップ（開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: ブラックリスト追加をスキップ');
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

      // 現在時刻（UNIXタイムスタンプ）
      const now = Math.floor(Date.now() / 1000);

      // Redisに保存（タイムスタンプ付き、TTLなし）
      const key = `${this.keyPrefix}${tokenId}`;
      await client.set(key, now.toString());

      console.log(`[INFO] Token added to blacklist: ${tokenId}`);

      return { success: true, data: undefined };
    } catch (error) {
      logError('Failed to add token to blacklist', error as Error, {
        action: 'add_to_blacklist',
        tokenId
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to add token to blacklist',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * トークンがブラックリストに登録されているかチェック
   * 
   * @param tokenId - トークンID
   * @returns ブラックリスト登録済みの場合true
   */
  async isBlacklisted(tokenId: string): Promise<Result<boolean, ServiceError>> {
    // Redis未起動時は常にfalseを返す（JWT検証のみ、開発環境のみ）
    if (!RedisConnectionService.isRedisAvailable()) {
      return { success: true, data: false };
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

      // Redisから存在確認
      const key = `${this.keyPrefix}${tokenId}`;
      const exists = await client.exists(key);

      return {
        success: true,
        data: exists === 1
      };
    } catch (error) {
      logError('Failed to check blacklist', error as Error, {
        action: 'check_blacklist',
        tokenId
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to check blacklist',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * 期限切れトークンをクリーンアップ
   * JWT_REFRESH_TOKEN_EXPIRES_IN秒以上経過したトークンを削除
   * 
   * @returns 削除したトークン数
   */
  async cleanup(): Promise<Result<number, ServiceError>> {
    // Redis未起動時はスキップ
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: ブラックリストクリーンアップをスキップ');
      return { success: true, data: 0 };
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

      // 現在時刻
      const now = Math.floor(Date.now() / 1000);

      // JWT_REFRESH_TOKEN_EXPIRES_IN環境変数から有効期限を取得
      const expiryThreshold = parseInt(
        process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '1800',
        10
      );

      // 削除対象となる時刻（現在時刻 - 有効期限）
      const cutoffTime = now - expiryThreshold;

      // すべてのブラックリストキーを取得
      const pattern = `${this.keyPrefix}*`;
      let deletedCount = 0;
      let cursor = 0;

      do {
        const result = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });

        cursor = result.cursor;
        const keys = result.keys;

        // 各キーのタイムスタンプをチェック
        for (const key of keys) {
          try {
            const timestamp = await client.get(key);

            // JWT_REFRESH_TOKEN_EXPIRES_IN秒以上経過していれば削除
            if (timestamp && parseInt(timestamp, 10) < cutoffTime) {
              // トークンIDを抽出（プレフィックスを除去）
              const tokenId = key.replace(this.keyPrefix, '');
              const addedAt = new Date(parseInt(timestamp, 10) * 1000).toISOString();
              
              await client.del(key);
              deletedCount++;
              
              // 詳細ログを出力
              console.log(
                `[INFO] Blacklist cleanup: Removed token ${tokenId} ` +
                `(added at ${addedAt}, expired after ${expiryThreshold}s)`
              );
            }
          } catch (error) {
            logError('Failed to process blacklist key during cleanup', error as Error, {
              action: 'cleanup_blacklist',
              key
            });
            // エラーが発生しても続行
          }
        }
      } while (cursor !== 0);

      if (deletedCount > 0) {
        console.log(`[INFO] Blacklist cleanup: ${deletedCount} tokens removed`);
      }

      return {
        success: true,
        data: deletedCount
      };
    } catch (error) {
      logError('Failed to cleanup blacklist', error as Error, {
        action: 'cleanup_blacklist'
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to cleanup blacklist',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * ブラックリストからトークンを手動削除（オプション）
   * 
   * @param tokenId - トークンID
   * @returns 削除結果
   */
  async remove(tokenId: string): Promise<Result<void, ServiceError>> {
    // Redis未起動時はスキップ
    if (!RedisConnectionService.isRedisAvailable()) {
      console.warn('⚠️  Redis未起動: ブラックリスト削除をスキップ');
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

      console.log(`[INFO] Token removed from blacklist: ${tokenId}`);

      return { success: true, data: undefined };
    } catch (error) {
      logError('Failed to remove token from blacklist', error as Error, {
        action: 'remove_from_blacklist',
        tokenId
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_REDIS_ERROR',
          message: 'Failed to remove token from blacklist',
          originalError: error as Error
        }
      };
    }
  }
}
