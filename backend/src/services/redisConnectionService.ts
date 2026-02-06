/**
 * Redis接続管理サービス
 * 
 * @description 
 * - Redis接続の初期化と管理
 * - 開発環境でのフォールバック動作（Redis未起動でもサーバー起動可能）
 * - 本番環境ではRedis必須
 */

import { createClient, RedisClientType } from 'redis';
import { logError } from '../utils/logger';

/**
 * Redis接続管理サービスクラス
 */
export class RedisConnectionService {
  private static client: RedisClientType | null = null;
  private static isAvailable: boolean = false;
  private static isDevelopment: boolean = process.env.NODE_ENV !== 'production';

  /**
   * Redis接続を初期化
   * 
   * @description
   * - 開発環境: Redis未起動でも警告を出して続行
   * - 本番環境: Redis未起動時はエラーを投げる
   */
  static async initialize(): Promise<void> {
    try {
      // Redis接続設定
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');

      console.log(`🔌 Redis接続試行中: ${redisHost}:${redisPort}`);

      // Redisクライアント作成
      this.client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          connectTimeout: 5000,  // 5秒でタイムアウト
          reconnectStrategy: false,  // 自動再接続を無効化（エラーの繰り返しを防ぐ）
        },
      });

      // エラーハンドラー設定（接続失敗時のログ出力を抑制）
      this.client.on('error', () => {
        // エラーは catch ブロックで処理するため、ここでは何もしない
      });

      // 接続
      await this.client.connect();

      // Ping確認（redis-cli ping と同等）
      const pingResult = await this.client.ping();
      if (pingResult === 'PONG') {
        this.isAvailable = true;
        console.log('✅ Redis接続成功');
      } else {
        throw new Error('Redis ping failed');
      }

    } catch (error) {
      this.isAvailable = false;

      // 接続失敗時にクライアントをクリーンアップ（エラーハンドラーを停止）
      if (this.client) {
        try {
          await this.client.disconnect();
        } catch (disconnectError) {
          // 切断エラーは無視
        }
        this.client = null;
      }

      if (this.isDevelopment) {
        // 開発環境: 警告を出して続行
        console.warn('');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('⚠️  Redis未起動: フォールバック動作で起動');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('');
        console.warn('以下の機能が無効化されています:');
        console.warn('  - リフレッシュトークンの管理');
        console.warn('  - 30分アイドルタイムアウト');
        console.warn('  - トークンの即座の無効化');
        console.warn('');
        console.warn('JWT検証のみで認証されます。');
        console.warn('トークン有効期限: 8時間（開発環境用の長い有効期限）');
        console.warn('');
        console.warn('完全な機能をテストするにはRedisを起動してください:');
        console.warn('  docker run -d -p 6379:6379 redis:7-alpine');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('');
      } else {
        // 本番環境: エラーを投げる
        console.error('❌ Redis接続失敗: 本番環境ではRedis必須');
        logError('Redis connection failed in production', error as Error, {
          action: 'redis_initialization',
        });
        throw new Error('Redis connection required in production environment');
      }
    }
  }

  /**
   * Redisクライアントインスタンスを取得
   * 
   * @returns Redisクライアント（未接続の場合はnull）
   */
  static getClient(): RedisClientType | null {
    return this.client;
  }

  /**
   * Redis接続状態を取得
   * 
   * @returns true: Redis接続済み, false: Redis未接続
   */
  static isRedisAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Redis接続を切断
   * 
   * @description サーバーシャットダウン時に呼び出す
   */
  static async disconnect(): Promise<void> {
    if (this.client && this.isAvailable) {
      try {
        await this.client.quit();
        console.log('✅ Redis接続を切断しました');
      } catch (error) {
        console.error('⚠️  Redis切断エラー:', (error as Error).message);
      }
      this.client = null;
      this.isAvailable = false;
    }
  }

  /**
   * 開発環境かどうかを取得
   * 
   * @returns true: 開発環境, false: 本番環境
   */
  static isDevelopmentEnvironment(): boolean {
    return this.isDevelopment;
  }
}
