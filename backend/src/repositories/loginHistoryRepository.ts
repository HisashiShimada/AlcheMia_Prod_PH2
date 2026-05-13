/**
 * ログイン履歴リポジトリ
 * login_historyテーブルからデータを取得・記録
 */

import { Pool } from 'pg';
import { loadSqlFile } from '../sql/loader';

/**
 * 最終ログイン情報の型
 */
export interface LastLogin {
  user_id: string;
  organization_id: string;
  login_at: Date;
}

/**
 * 最終二段階認証ログイン情報の型
 */
export interface LastTwoFactorAuthLogin {
  user_id: string;
  organization_id: string;
  login_at: Date;
}

/**
 * 最終成功ログイン情報を取得
 * 
 * @param pool - データベース接続プール
 * @param userId - ユーザーID（organization_user.user_id）
 * @param organizationId - 組織ID
 * @returns 最終ログイン情報（存在しない場合はnull）
 */
export async function getLastSuccessfulLogin(
  pool: Pool,
  userId: string,
  organizationId: string
): Promise<LastLogin | null> {
  const sqlQuery = await loadSqlFile('login_history/getLastSuccessfulLogin.sql');
  const result = await pool.query(sqlQuery, [userId, organizationId]);
  if (result.rows.length === 0) return null;
  return {
    user_id: result.rows[0].user_id,
    organization_id: result.rows[0].organization_id,
    login_at: new Date(result.rows[0].login_at),
  };
}

/**
 * ユーザー個別の最終二段階認証ログイン情報を取得
 * （新仕様: entry_execute_flg=trueのログインのみ）
 * 
 * @param pool - データベース接続プール
 * @param userId - ユーザーID（organization_user.user_id）
 * @param organizationId - 組織ID
 * @returns 最終二段階認証ログイン情報（存在しない場合はnull）
 */
export async function getLastTwoFactorAuthLogin(
  pool: Pool,
  userId: string,
  organizationId: string
): Promise<LastTwoFactorAuthLogin | null> {
  const sqlQuery = await loadSqlFile('login_history/getLastTwoFactorAuthLogin.sql');
  const result = await pool.query(sqlQuery, [userId, organizationId]);
  if (result.rows.length === 0) return null;
  return {
    user_id: result.rows[0].user_id,
    organization_id: result.rows[0].organization_id,
    login_at: new Date(result.rows[0].login_at),
  };
}

/**
 * ログイン履歴を記録
 * 
 * @param pool - データベース接続プール
 * @param userName - ユーザー名（organization_user.user_name）
 * @param organizationId - 組織ID
 * @param success - ログイン成功フラグ
 * @param failureReason - 失敗理由（失敗時のみ）
 * @param ipAddress - IPアドレス
 * @param userAgent - User-Agent
 * @param entryExecuteFlg - 二段階認証実行フラグ（true: 実施, false: 免除）デフォルト: false
 */
export async function recordLogin(
  pool: Pool,
  userName: string,
  organizationId: string,
  success: boolean,
  failureReason: string | null,
  ipAddress: string,
  userAgent: string,
  entryExecuteFlg: boolean = false
): Promise<void> {
  const sqlQuery = await loadSqlFile('login_history/recordLogin.sql');
  await pool.query(sqlQuery, [
    userName,
    organizationId,
    success,
    failureReason,
    ipAddress,
    userAgent,
    entryExecuteFlg,
  ]);
}
