/**
 * DB接続（非公開バッチ専用）
 *
 * backend/src/ には依存せず、このバッチ内で完結する独立実装。
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.env を読み込む
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 環境変数から pg.Pool を生成して返す
 */
export function createPool(): Pool {
  const host     = process.env.DB_HOST;
  const port     = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user     = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  const missing: string[] = [];
  if (!host)     missing.push('DB_HOST');
  if (!port)     missing.push('DB_PORT');
  if (!database) missing.push('DB_NAME');
  if (!user)     missing.push('DB_USER');

  if (missing.length > 0) {
    throw new Error(
      `必須の環境変数が設定されていません: ${missing.join(', ')}\n` +
      `backend/.env を確認してください。`,
    );
  }

  return new Pool({
    host,
    port:     parseInt(port!, 10),
    database: database!,
    user:     user!,
    password: password?.trim() !== '' ? password : undefined,
    max:      5,
    idleTimeoutMillis:    30_000,
    connectionTimeoutMillis: 5_000,
  });
}
