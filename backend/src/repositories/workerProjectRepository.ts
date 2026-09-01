/**
 * WorkerProject（実験作業者用プロジェクト）リポジトリ
 * データベースアクセス層
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクトの取得に関するデータベース操作を提供します。
 * 
 * @module repositories/workerProjectRepository
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * WorkerAccessibleProjectのデータ型定義
 */
export interface WorkerAccessibleProjectRow {
  project_id: string; // character varying
  project_name: string;
  description: string | null;
  project_status: number;
  use_deemed_progress: boolean; // みなし進捗使用フラグ（organization.use_deemed_progress）
  create_at: Date;
  update_at: Date;
}

/**
 * WorkerProjectフィルター
 */
export interface WorkerProjectFilters {
  status?: '1' | '2' | '3'; // プロジェクトステータス（文字列）
  sortBy: 'create_at' | 'project_name' | 'update_at';
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
  /** ログインユーザーが閲覧可能なグループCDの配列。指定時はそのグループに属するプロジェクトのみ取得 */
  visibleGroupCds?: string[];
}

/**
 * 実験作業者がアクセス可能なプロジェクト一覧を取得
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @param filters 検索フィルター
 * @returns WorkerAccessibleProjectの配列
 */
export async function findWorkerAccessible(
  organizationId: string,
  userId: string,
  filters: WorkerProjectFilters
): Promise<WorkerAccessibleProjectRow[]> {
  const pgp = getPgp();
  
  console.log('=== workerProjectRepository.findWorkerAccessible called ===');
  console.log('organizationId:', organizationId);
  console.log('userId:', userId);
  console.log('filters:', filters);
  
  // 外部SQLファイルを読み込み
  let sqlQuery = await loadSqlFile('projects/findWorkerAccessible.sql');
  
  // パラメータ配列（userIdは使用しない - 組織内全プロジェクトを表示）
  const params: any[] = [organizationId, organizationId];
  
  // ステータスフィルタの構築
  let statusFilter = '';
  if (filters.status) {
    // 単一ステータス指定
    statusFilter = `AND project.project_status = ${parseInt(filters.status, 10)}`;
  } else {
    // デフォルト: ステータス 1, 2, 3（タスク実行待ち、実行中、レビュー待ち）
    statusFilter = 'AND project.project_status IN (1, 2, 3)';
  }

  // グループフィルタの構築
  let groupFilter = '';
  if (filters.visibleGroupCds && filters.visibleGroupCds.length > 0) {
    // ログインユーザーが閲覧可能なグループCDのプロジェクトのみ取得
    const paramIndex = params.length + 1;
    params.push(filters.visibleGroupCds);
    groupFilter = `AND project.organization_group_cd = ANY($${paramIndex}::text[])`;
  }
  
  // ソート列の決定
  const sortColumn = filters.sortBy === 'project_name' 
    ? 'project.project_name' 
    : `project.${filters.sortBy}`;
  
  const sortOrder = filters.order.toUpperCase();
  
  // 動的プレースホルダーを置換
  sqlQuery = sqlQuery
    .replace('{STATUS_FILTER}', statusFilter)
    .replace('{GROUP_FILTER}', groupFilter)
    .replace('{SORT_COLUMN}', sortColumn)
    .replace('{SORT_ORDER}', sortOrder)
    .replace('{LIMIT}', filters.limit.toString())
    .replace('{OFFSET}', filters.offset.toString());
  
  console.log('Executing SQL query from file: projects/findWorkerAccessible.sql');
  console.log('With params:', params);
  console.log('Status filter:', statusFilter);
  console.log('Group filter:', groupFilter);
  console.log('Sort:', sortColumn, sortOrder);
  console.log('Pagination:', `LIMIT ${filters.limit} OFFSET ${filters.offset}`);
  
  try {
    const result = await pgp.any<WorkerAccessibleProjectRow>(sqlQuery, params);
    console.log('Query executed successfully, rows:', result.length);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * 実験作業者がアクセス可能なプロジェクトの総件数を取得
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @param status プロジェクトステータス（オプション）
 * @param visibleGroupCds ログインユーザーが閲覧可能なグループCDの配列（オプション）
 * @returns 総件数
 */
export async function countWorkerAccessible(
  organizationId: string,
  userId: string,
  status?: '1' | '2' | '3',
  visibleGroupCds?: string[]
): Promise<number> {
  const pgp = getPgp();
  
  console.log('=== workerProjectRepository.countWorkerAccessible called ===');
  console.log('organizationId:', organizationId);
  console.log('userId:', userId);
  console.log('status:', status);
  console.log('visibleGroupCds:', visibleGroupCds);
  
  // 外部SQLファイルを読み込み
  let sqlQuery = await loadSqlFile('projects/countWorkerAccessible.sql');
  
  // パラメータ配列（userIdは使用しない - 組織内全プロジェクトを表示）
  const params: any[] = [organizationId, organizationId];
  
  // ステータスフィルタの構築
  let statusFilter = '';
  if (status) {
    // 単一ステータス指定
    statusFilter = `AND project.project_status = ${parseInt(status, 10)}`;
  } else {
    // デフォルト: ステータス 1, 2, 3（タスク実行待ち、実行中、レビュー待ち）
    statusFilter = 'AND project.project_status IN (1, 2, 3)';
  }

  // グループフィルタの構築
  let groupFilter = '';
  if (visibleGroupCds && visibleGroupCds.length > 0) {
    // ログインユーザーが閲覧可能なグループCDのプロジェクトのみ取得
    const paramIndex = params.length + 1;
    params.push(visibleGroupCds);
    groupFilter = `AND project.organization_group_cd = ANY($${paramIndex}::text[])`;
  }
  
  // 動的プレースホルダーを置換
  sqlQuery = sqlQuery
    .replace('{STATUS_FILTER}', statusFilter)
    .replace('{GROUP_FILTER}', groupFilter);
  
  console.log('Executing SQL query from file: projects/countWorkerAccessible.sql');
  console.log('With params:', params);
  console.log('Status filter:', statusFilter);
  console.log('Group filter:', groupFilter);
  
  try {
    const result = await pgp.one<{ count: string }>(sqlQuery, params);
    const count = parseInt(result.count, 10);
    console.log('Query executed successfully, count:', count);
    return count;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
