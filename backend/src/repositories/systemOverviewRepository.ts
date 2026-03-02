/**
 * システム概要リポジトリ
 * システム概要画面に必要な統計情報をDBから取得する
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * ユーザー統計の型定義
 */
export interface UserStats {
  total: number;
  active: number;
}

/**
 * プロジェクト統計の型定義
 */
export interface ProjectStats {
  total: number;
  planning: number;
  in_progress: number;
  completed: number;
}

/**
 * ログイン統計の型定義
 */
export interface LoginStats {
  total: number;
  success: number;
  failed: number;
}

/**
 * ストレージ統計の型定義
 */
export interface StorageStats {
  total_files: string; // PostgreSQL COUNT() は文字列で返る場合があるため string
  total_bytes: string; // PostgreSQL SUM() は文字列で返る場合があるため string
}

/**
 * ユーザー統計を取得
 * organization_userテーブルの総数・アクティブ数
 *
 * @param organizationId 組織ID
 * @returns ユーザー統計
 */
export async function getUserStats(organizationId: string): Promise<UserStats> {
  const pgp = getPgp();
  const query = await loadSqlFile('system_overview/getUserStats.sql');
  return await pgp.one<UserStats>(query, [organizationId]);
}

/**
 * プロジェクト統計を取得
 * projectテーブルの総数
 *
 * @param organizationId 組織ID
 * @returns プロジェクト統計
 */
export async function getProjectStats(organizationId: string): Promise<ProjectStats> {
  const pgp = getPgp();
  const query = await loadSqlFile('system_overview/getProjectStats.sql');
  return await pgp.one<ProjectStats>(query, [organizationId]);
}

/**
 * ログイン統計を取得（過去7日間）
 * login_historyテーブルの総数・成功・失敗
 *
 * @param organizationId 組織ID
 * @returns ログイン統計
 */
export async function getLoginStats(organizationId: string): Promise<LoginStats> {
  const pgp = getPgp();
  const query = await loadSqlFile('system_overview/getLoginStats.sql');
  return await pgp.one<LoginStats>(query, [organizationId]);
}

/**
 * ストレージ統計を取得
 * file_metadataテーブルの総ファイル数・合計バイト数
 *
 * @param organizationId 組織ID
 * @returns ストレージ統計
 */
export async function getStorageStats(organizationId: string): Promise<StorageStats> {
  const pgp = getPgp();
  const query = await loadSqlFile('system_overview/getStorageStats.sql');
  return await pgp.one<StorageStats>(query, [organizationId]);
}
