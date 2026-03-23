/**
 * E2E テスト用 PostgreSQL 接続ヘルパー
 *
 * Given/Then ステップで DB を直接操作するために使用する。
 * 接続先は環境変数 E2E_DB_* で制御する（デフォルト値は開発用 Docker 環境を想定）。
 *
 * 使用方法:
 *   import { db, closeDb, cleanupTestOrganization } from '../db';
 *   await db.query('SELECT ...', [params]);
 *   await closeDb(); // After フックで必ず呼ぶ
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';

// ---------------------------------------------------------------------------
// 接続設定
// ---------------------------------------------------------------------------

const pool = new Pool({
  host:     process.env.E2E_DB_HOST     || '10.1.1.219',
  port:     Number(process.env.E2E_DB_PORT || 5432),
  database: process.env.E2E_DB_NAME     || 'maiml_db',
  user:     process.env.E2E_DB_USER     || 'maiml_user',
  password: process.env.E2E_DB_PASSWORD || 'maiml_user',
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * SQL クエリを実行する
 *
 * @param sql - SQL 文（プレースホルダ $1, $2, ... を使用）
 * @param params - バインドパラメータ
 * @returns QueryResult
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

/** pool インスタンスを直接返す（高度な操作が必要な場合に使用） */
export const db = { query };

// ---------------------------------------------------------------------------
// テストデータ クリーンアップ ヘルパー
// ---------------------------------------------------------------------------

/**
 * テスト用組織データを削除する
 *
 * organization_cd が一致するレコードを organization テーブルから削除する。
 * After フックで呼び出して DB を汚染しないようにする。
 *
 * @param organizationCd - 削除対象の組織CD
 */
// export async function cleanupTestOrganization(organizationCd: string): Promise<void> {
//   await pool.query(
//     'DELETE FROM organization WHERE organization_cd = $1',
//     [organizationCd]
//   );
// }

/**
 * テスト用ユーザーデータを削除する
 *
 * organization_user と user_authentication の両テーブルから削除する。
 * （DDL: docs/design/db/ddl/organization_user.sql, user_authentication.sql）
 *
 * @param userId - 削除対象のユーザーID
 */
// export async function cleanupTestUser(userId: string): Promise<void> {
//   // user_authentication（認証情報）を先に削除（FK参照がある場合に備えて）
//   await pool.query(
//     'DELETE FROM user_authentication WHERE user_id = $1',
//     [userId]
//   );
//   // organization_user（基本情報）を削除
//   await pool.query(
//     'DELETE FROM organization_user WHERE user_id = $1',
//     [userId]
//   );
// }

/**
 * DB 接続プールをクローズする
 *
 * テストスイート終了時（AfterAll フック）で必ず呼ぶこと。
 */
export async function closeDb(): Promise<void> {
  await pool.end();
}
