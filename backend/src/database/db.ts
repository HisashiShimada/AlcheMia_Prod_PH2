/**
 * Database connection pool
 * PostgreSQL接続プールの管理
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * データベース接続プールを初期化
 * 
 * @param config - PostgreSQL接続設定（オプション）
 * @returns Pool インスタンス
 */
export function initializePool(config?: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: config?.host || process.env.DB_HOST || 'localhost',
    port: config?.port || parseInt(process.env.DB_PORT || '5432', 10),
    database: config?.database || process.env.DB_NAME || 'mmdpf_db',
    user: config?.user || process.env.DB_USER || 'postgres',
    password: config?.password || process.env.DB_PASSWORD || '',
    max: config?.max || 20, // 最大接続数
    idleTimeoutMillis: config?.idleTimeoutMillis || 30000, // 30秒
    connectionTimeoutMillis: config?.connectionTimeoutMillis || 2000, // 2秒
  });

  return pool;
}

/**
 * データベース接続プールを取得
 * 
 * @returns Pool インスタンス
 * @throws Error - プールが初期化されていない場合
 */
export function getPool(): Pool {
  if (!pool) {
    // 自動初期化（テスト環境やデフォルト設定用）
    return initializePool();
  }
  return pool;
}

/**
 * データベース接続プールを閉じる
 * 
 * アプリケーション終了時やテスト後のクリーンアップに使用
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * プールをリセット（主にテスト用）
 */
export function resetPool(): void {
  pool = null;
}
