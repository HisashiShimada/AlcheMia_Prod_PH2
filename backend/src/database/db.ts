/**
 * Database connection pool
 * PostgreSQL接続プールの管理
 */

import { Pool } from 'pg';
import pgPromise from 'pg-promise';

let pool: Pool | null = null;
let pgp: pgPromise.IDatabase<any> | null = null;

/**
 * 必須の環境変数をチェックする
 * 
 * @param name - 環境変数名
 * @returns 環境変数の値
 * @throws Error - 環境変数が未設定の場合
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。\n` +
      `backend/.env ファイルを確認してください。\n\n` +
      `必須の環境変数:\n` +
      `  DB_HOST=<データベースホスト>\n` +
      `  DB_PORT=<ポート番号>\n` +
      `  DB_NAME=<データベース名>\n` +
      `  DB_USER=<ユーザー名>\n` +
      `  DB_PASSWORD=<パスワード>\n`
    );
  }
  return value;
}

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

  // configパラメータがある場合はそれを使用（テスト環境用）
  // ない場合は環境変数を必須とする
  const host = config?.host || requireEnv('DB_HOST');
  const port = config?.port || parseInt(requireEnv('DB_PORT'), 10);
  const database = config?.database || requireEnv('DB_NAME');
  const user = config?.user || requireEnv('DB_USER');
  const dbPassword = config?.password || process.env.DB_PASSWORD || '';
  
  pool = new Pool({
    host,
    port,
    database,
    user,
    password: dbPassword.trim() !== '' ? dbPassword : undefined,
    max: config?.max || 20, // 最大接続数
    idleTimeoutMillis: config?.idleTimeoutMillis || 30000, // 30秒
    connectionTimeoutMillis: config?.connectionTimeoutMillis || 2000, // 2秒
  });
  
  console.log('=== Database Connection Config ===');
  console.log('Host:', host);
  console.log('Port:', port);
  console.log('Database:', database);
  console.log('User:', user);
  console.log('Password set:', !!dbPassword && dbPassword.trim() !== '');

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
  pgp = null;
}

/**
 * pg-promiseインスタンスを取得
 * 
 * @returns pg-promise IDatabase インスタンス
 */
export function getPgp(): pgPromise.IDatabase<any> {
  if (!pgp) {
    // Poolがなければ初期化
    if (!pool) {
      initializePool();
    }
    
    // pg-promiseインスタンスを作成（Poolの接続情報を使用）
    const pgpLib = pgPromise();
    const config = pool!.options;
    
    pgp = pgpLib({
      host: config.host as string,
      port: config.port as number,
      database: config.database as string,
      user: config.user as string,
      password: config.password as string | undefined,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis ?? undefined,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? undefined,
    });
  }
  return pgp!;
}
