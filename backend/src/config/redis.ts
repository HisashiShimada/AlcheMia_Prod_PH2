/**
 * Redis 接続設定
 *
 * @description
 *   - セッション管理用: getRedisClient() / isRedisAvailable()
 *     express-session の RedisStore（node-redis クライアント）で使用。
 *   - bullmq 用: createBullRedisConnection()
 *     bullmq の Queue / Worker で使用する IORedis クライアントを生成する。
 *     bullmq は IORedis（ioredis パッケージ）を要求するため別インスタンスで管理する。
 *     maxRetriesPerRequest: null は bullmq の推奨設定。
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §9.2
 */

import { RedisConnectionService } from '../services/redisConnectionService';
import { Redis as IORedis } from 'ioredis';

// ============================================================
// セッション管理用（既存 / sessionMiddleware.ts から利用）
// ============================================================

/**
 * セッション管理用 Redis クライアントを返す
 * RedisConnectionService の初期化後に利用可能
 */
export function getRedisClient() {
  return RedisConnectionService.getClient();
}

/**
 * Redis が利用可能かどうかを返す
 */
export function isRedisAvailable(): boolean {
  return RedisConnectionService.isRedisAvailable();
}

// ============================================================
// bullmq 用（Queue / Worker から利用）
// ============================================================

/**
 * bullmq 用 IORedis 接続を生成する
 *
 * @returns IORedis インスタンス（lazyConnect: true）
 */
export function createBullRedisConnection(): IORedis {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);

  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = process.env.REDIS_TLS === 'true' ? {} : undefined;

  const client = new IORedis({
    host,
    port,
    password,                   // REDIS_PASSWORDが設定されている場合のみ使用
    tls,                        // REDIS_TLS=true の場合はTLS接続（ElastiCache等）
    maxRetriesPerRequest: null, // bullmq 推奨設定（必須）
    enableReadyCheck:     false,
    lazyConnect:          true,
  });

  client.on('error', (err) => {
    // キュー/ワーカー起動前の接続エラーはログに記録して続行
    // サーバー本体は Redis 未起動でも起動できる
    console.warn('[bullmq Redis] 接続エラー:', err.message);
  });

  return client;
}
