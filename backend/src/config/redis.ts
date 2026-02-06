import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isRedisEnabled = false;

/**
 * Redisクライアントの初期化（SESSION_STORE_TYPE=redisの場合のみ）
 */
export async function initRedisClient(): Promise<RedisClientType | null> {
  const storeType = process.env.SESSION_STORE_TYPE || 'memory';
  
  if (storeType !== 'redis') {
    console.log('Redis is disabled (SESSION_STORE_TYPE=' + storeType + ')');
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed');
            return false; // 再接続停止
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // イベントリスナー
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isRedisEnabled = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
      isRedisEnabled = true;
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
    });

    // 接続
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.error('Redis initialization failed:', error);
    redisClient = null;
    isRedisEnabled = false;
    return null;
  }
}

/**
 * Redisが有効かチェック
 */
export function isRedisAvailable(): boolean {
  return isRedisEnabled && redisClient !== null && redisClient.isOpen;
}

/**
 * Redisクライアントの取得
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Redis接続のクローズ
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    isRedisEnabled = false;
    console.log('Redis Client Closed');
  }
}
