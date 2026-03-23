/**
 * ProjectRepository
 * 
 * projectテーブルへのデータアクセス層
 * データベース操作規約に準拠した実装
 */

import { PoolClient } from 'pg';
import { getPool } from '../database/db';
import { Project } from '../types/database';
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * プロジェクトの基本データ型定義
 */
export interface ProjectRow {
  organization_id: string;
  project_id: string;
  project_name: string;
  project_status: number;
}

/**
 * ユーザー名データ型定義
 */
export interface UserNameRow {
  user_name: string;
}

/**
 * プロジェクトをInsert
 * 
 * @param data Insertするプロジェクトデータ（テーブル型Object）
 * @returns Insertされたプロジェクト
 */
export async function insert(
  data: Project
): Promise<Project> {
  const pool = getPool();
  
  // データからカラム名と値を抽出（undefinedは除外）
  const columns = Object.keys(data).filter(key => data[key as keyof Project] !== undefined);
  const values = columns.map(col => data[col as keyof Project]);
  
  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  
  // SQLクエリを構築（Parameterized Query使用、SQLインジェクション対策）
  const query = `
    INSERT INTO project (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0] as Project;
}

/**
 * プロジェクトをUpdate
 * 
 * @param data 更新するプロジェクトデータ（テーブル型Object）
 * @returns 更新されたプロジェクト
 */
export async function update(
  data: Project
): Promise<Project> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（project_id と organization_id）
  const whereColumns = ['project_id', 'organization_id'];
  const whereValues = whereColumns.map(col => data[col as keyof Project]);
  
  // 更新するカラム（WHERE句で使用するカラムとupdate_atを除外）
  // 注: update_atはSQLで自動的にCURRENT_TIMESTAMPが設定されるため除外
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && key !== 'update_at' && data[key as keyof Project] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col as keyof Project]);
  
  // SET句を構築 (project_name = $1, project_status = $2, ...)
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築 (project_id = $N AND organization_id = $N+1)
  const whereClauseStr = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築（Parameterized Query使用、SQLインジェクション対策）
  // organization_idフィルタ必須（マルチテナント分離）
  const query = `
    UPDATE project
    SET ${setClause}, update_at = CURRENT_TIMESTAMP
    WHERE ${whereClauseStr}
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error(`No rows updated in project table`);
  }
  
  return result.rows[0] as Project;
}

/**
 * プロジェクトIDでプロジェクトを取得（Update前に使用）
 * 
 * @param projectId プロジェクトID
 * @param organizationId 組織ID（マルチテナント分離必須）
 * @returns プロジェクト情報、存在しない場合はnull
 */
export async function getById(
  projectId: string,
  organizationId: string
): Promise<Project | null> {
  const pool = getPool();
  
  // Parameterized Query使用（SQLインジェクション対策）
  // organization_idフィルタ必須（マルチテナント分離）
  const query = `
    SELECT * FROM project
    WHERE project_id = $1 AND organization_id = $2
  `;
  
  const result = await pool.query(query, [projectId, organizationId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Project;
}

/**
 * プロジェクトステータスを更新
 * 
 * @param projectId プロジェクトID
 * @param newStatus 新しいステータス値
 * @param organizationId 組織ID（マルチテナント分離必須）
 * @param userId 更新ユーザーID（updated_user_idに設定）
 * @param client トランザクション用のクライアント（オプション）
 * 
 * @remarks
 * このメソッドは後方互換性のために残されています。
 * 新しいコードでは、getById + update の組み合わせを使用してください。
 */
export async function updateStatus(
  projectId: string,
  newStatus: number,
  organizationId: string,
  userId: string,
  client?: PoolClient
): Promise<void> {
  // トランザクション引数がある場合はそれを使用、なければプールを使用
  const executor = client || getPool();
  
  // Parameterized Query使用（SQLインジェクション対策）
  // organization_idフィルタ必須（マルチテナント分離）
  const query = `
    UPDATE project
    SET 
      project_status = $1,
      update_at = CURRENT_TIMESTAMP,
      update_user_id = $2
    WHERE organization_id = $3
      AND project_id = $4
  `;
  
  await executor.query(query, [newStatus, userId, organizationId, projectId]);
}

/**
 * プロジェクトIDからプロジェクト詳細を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findByIdWithOrganization(
  organizationId: string,
  projectId: string
): Promise<ProjectRow | null> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.findByIdWithOrganization called ===');
  console.log('organizationId:', organizationId);
  console.log('projectId:', projectId);
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('projects/findByIdWithOrg.sql');
  
  console.log('Executing SQL query from file: projects/findByIdWithOrg.sql');
  console.log('With params:', [organizationId, projectId]);
  
  try {
    const result = await pgp.oneOrNone<ProjectRow>(sqlQuery, [organizationId, projectId]);
    console.log('Query executed successfully, result:', result ? 'found' : 'not found');
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * プロジェクト名からプロジェクトIDを取得
 * 
 * @param organizationId 組織ID
 * @param projectName プロジェクト名
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findProjectIdByName(
  organizationId: string,
  projectName: string
): Promise<ProjectRow | null> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.findProjectIdByName called ===');
  console.log('organizationId:', organizationId);
  console.log('projectName:', projectName);
  
  // 外部SQLファイルを読み込み（新規作成のfindIdByName.sqlを使用）
  const sqlQuery = await loadSqlFile('projects/findIdByName.sql');
  
  console.log('Executing SQL query from file: projects/findIdByName.sql');
  console.log('With params:', [organizationId, projectName]);
  
  try {
    // findIdByName.sqlはorganizationId, projectNameの順
    const result = await pgp.oneOrNone<ProjectRow>(sqlQuery, [organizationId, projectName]);
    console.log('Query executed successfully, result:', result ? 'found' : 'not found');
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * プロジェクト名からプロジェクト全体情報を取得
 * 
 * @param organizationId 組織ID
 * @param projectName プロジェクト名
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findByName(
  organizationId: string,
  projectName: string
): Promise<Project | null> {
  const pool = getPool();
  
  const query = `
    SELECT * FROM project
    WHERE organization_id = $1
      AND project_name = $2
  `;
  
  const result = await pool.query(query, [organizationId, projectName]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Project;
}

/**
 * プロジェクトステータスを承認待ちに更新
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param projectStatus 新しいステータス（2: waiting_approval）
 * @param updateAt 更新日時
 * @param updateUserId 更新ユーザーID
 * @returns 更新された行数
 */
export async function updateApprovalStatus(
  organizationId: string,
  projectId: string,
  projectStatus: number,
  updateAt: string,
  updateUserId: string
): Promise<number> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.updateApprovalStatus called ===');
  console.log('organizationId:', organizationId);
  console.log('projectId:', projectId);
  console.log('projectStatus:', projectStatus);
  console.log('updateUserId:', updateUserId);
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('projects/updateApprovalStatus.sql');
  
  console.log('Executing SQL query from file: projects/updateApprovalStatus.sql');
  console.log('With params:', [projectStatus, updateAt, updateUserId, organizationId, projectId]);
  
  try {
    const result = await pgp.result(sqlQuery, [
      projectStatus,
      updateAt,
      updateUserId,
      organizationId,
      projectId
    ]);
    console.log('Query executed successfully, rows affected:', result.rowCount);
    return result.rowCount;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * ユーザーIDからユーザー名を取得
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns ユーザー名（見つからない場合はnull）
 */
export async function findUserNameById(
  organizationId: string,
  userId: string
): Promise<string | null> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.findUserNameById called ===');
  console.log('organizationId:', organizationId);
  console.log('userId:', userId);
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('projects/findUserName.sql');
  
  console.log('Executing SQL query from file: projects/findUserName.sql');
  console.log('With params:', [organizationId, userId]);
  
  try {
    const result = await pgp.oneOrNone<UserNameRow>(sqlQuery, [organizationId, userId]);
    console.log('Query executed successfully, result:', result ? 'found' : 'not found');
    return result ? result.user_name : null;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * プロジェクトに紐づくタスク一覧を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param status タスクステータスフィルタ（'all'の場合はフィルタなし）
 * @returns タスク一覧
 */
export async function findProjectTasks(
  organizationId: string,
  projectId: string,
  status?: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed'
): Promise<any[]> {
  const pool = getPool();
  
  // タスクステータスマップ（文字列 → 数値）
  const TASK_STATUS_MAP: { [key: string]: number } = {
    'pending': 0,
    'in_progress': 1,
    'review_waiting': 2,
    'completed': 3,
    'forced_terminated': 4,
  };
  
  let query = `
    SELECT
      ptd.organization_id,
      ptd.project_id,
      ptd.method_id,
      ptd.task_no,
      ptd.task_status,
      ptd.experiment_start_at,
      ptd.experiment_end_at,
      ptd.experiment_user_id,
      ou.user_name as experiment_user_name,
      ptd.reviewed_at,
      ptd.review_user_id,
      ru.user_name as review_user_name,
      pt_agg.min_experiment_order
    FROM project_task_detail ptd
    LEFT JOIN (
      SELECT
        organization_id,
        project_id,
        method_id,
        MIN(experiment_order) AS min_experiment_order
      FROM project_task
      GROUP BY organization_id, project_id, method_id
    ) pt_agg
      ON pt_agg.organization_id = ptd.organization_id
      AND pt_agg.project_id = ptd.project_id
      AND pt_agg.method_id = ptd.method_id
    LEFT JOIN organization_user ou
      ON ou.user_id = ptd.experiment_user_id
      AND ou.organization_id = ptd.organization_id
    LEFT JOIN organization_user ru
      ON ru.user_id = ptd.review_user_id
      AND ru.organization_id = ptd.organization_id
    WHERE ptd.organization_id = $1
      AND ptd.project_id = $2
  `;
  
  const params: any[] = [organizationId, projectId];
  
  // statusパラメータに応じてWHERE条件を追加
  if (status && status !== 'all') {
    const statusValue = TASK_STATUS_MAP[status];
    if (statusValue !== undefined) {
      query += ` AND ptd.task_status = $3`;
      params.push(statusValue);
    }
  }
  
  query += ` ORDER BY pt_agg.min_experiment_order ASC, ptd.task_no ASC`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * プロジェクトのタスク統計情報を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns タスク統計情報（ステータス別のタスク数）
 */
export async function countProjectTasksByStatus(
  organizationId: string,
  projectId: string
): Promise<any[]> {
  const pool = getPool();
  
  const query = `
    SELECT 
      task_status,
      COUNT(*) as count
    FROM project_task_detail
    WHERE organization_id = $1 AND project_id = $2
    GROUP BY task_status
  `;
  
  const result = await pool.query(query, [organizationId, projectId]);
  return result.rows;
}

/**
 * レビュー待ちタスクを一括完了に更新
 *
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 更新件数
 */
export async function completeReviewTasks(
  organizationId: string,
  projectId: string
): Promise<number> {
  const pool = getPool();

  // task_status = 2 (review_waiting) を 3 (completed) に更新
  const query = `
    UPDATE project_task_detail
    SET task_status = 3,
        update_at = CURRENT_TIMESTAMP
    WHERE organization_id = $1
      AND project_id = $2
      AND task_status = 2
  `;

  const result = await pool.query(query, [organizationId, projectId]);
  return result.rowCount ?? 0;
}

/**
 * プロジェクト情報を取得（IDと名前のみ）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findProjectBasicInfo(
  organizationId: string,
  projectId: string
): Promise<{ project_id: string; project_name: string } | null> {
  const pool = getPool();
  
  const query = `
    SELECT project_id, project_name
    FROM project
    WHERE organization_id = $1 AND project_id = $2
  `;
  
  const result = await pool.query(query, [organizationId, projectId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}
