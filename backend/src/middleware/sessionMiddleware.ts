import session from 'express-session';
import RedisStore from 'connect-redis';
import { getRedisClient, isRedisAvailable } from '../config/redis';

/**
 * express-sessionミドルウェアのセットアップ
 * 環境変数SESSION_STORE_TYPEでストアを切り替え
 * - memory: メモリストア（開発環境用）
 * - redis: Redisストア（本番環境用）
 */
export function setupSessionMiddleware() {
  const sessionSecret = process.env.SESSION_SECRET || 'maiml-session-secret-change-in-production';
  const storeType = process.env.SESSION_STORE_TYPE || 'memory';
  const maxAge = parseInt(process.env.SESSION_MAX_AGE || '86400000', 10); // デフォルト24時間

  // 共通のCookie設定
  const cookieOptions: session.CookieOptions = {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    maxAge,
    sameSite: 'strict',
    path: '/',
  };

  // 共通のセッション設定
  const baseConfig: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,  // アクティブなセッションの有効期限を延長
    cookie: cookieOptions,
    name: process.env.SESSION_COOKIE_NAME || 'mmdpf.sid',
  };

  // メモリストアモード
  if (storeType === 'memory') {
    console.log('🗄️  Session Store: MEMORY (development mode)');
    console.warn('⚠️  Sessions will be lost on server restart');
    return session(baseConfig);
  }

  // Redisストアモード
  console.log('🗄️  Session Store: REDIS (production mode)');
  
  const redisClient = getRedisClient();
  
  // Redis接続チェック
  if (!redisClient || !isRedisAvailable()) {
    console.warn('⚠️  Redis is not available. Falling back to MEMORY store.');
    console.warn('⚠️  Sessions will be lost on server restart');
    return session(baseConfig);
  }

  // Redis正常接続時
  console.log('✅ Redis connection established');
  
  return session({
    ...baseConfig,
    store: new RedisStore({
      client: redisClient,
      prefix: 'mmdpf:sess:',
      ttl: Math.floor(maxAge / 1000), // ミリ秒 → 秒
    }),
  });
}
