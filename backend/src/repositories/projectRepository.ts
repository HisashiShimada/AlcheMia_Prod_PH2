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
