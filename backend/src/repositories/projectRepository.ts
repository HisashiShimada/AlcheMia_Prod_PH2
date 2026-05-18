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
  const sqlQuery = await loadSqlFile('projects/updateStatus.sql');
  await executor.query(sqlQuery, [newStatus, userId, organizationId, projectId]);
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
 * プロジェクトIDからプロジェクト全体情報を取得（checkout_status を含む全カラム）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findByIdFull(
  organizationId: string,
  projectId: string
): Promise<Project | null> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/findByIdFull.sql');
  return await pgp.oneOrNone<Project>(sqlQuery, [organizationId, projectId]);
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
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/findByName.sql');
  return await pgp.oneOrNone<Project>(sqlQuery, [organizationId, projectName]);
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

  // ベースSQLをファイルから読み込み（動的WHEREとORDER BYはRepository層で付加）
  let sqlQuery = await loadSqlFile('projects/findProjectTasks.sql');
  const params: any[] = [organizationId, projectId];

  // statusパラメータに応じてWHERE条件を追加
  if (status && status !== 'all') {
    const statusValue = TASK_STATUS_MAP[status];
    if (statusValue !== undefined) {
      sqlQuery += ` AND ptd.task_status = $3`;
      params.push(statusValue);
    }
  }

  sqlQuery += ` ORDER BY pt_agg.min_experiment_order ASC, ptd.task_no ASC`;

  const result = await pool.query(sqlQuery, params);
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
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/countTasksByStatus.sql');
  return await pgp.any(sqlQuery, [organizationId, projectId]);
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
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/completeReviewTasks.sql');
  const result = await pgp.result(sqlQuery, [organizationId, projectId]);
  return result.rowCount ?? 0;
}

/**
 * プロジェクトIDからプロジェクト名とUUIDを取得
 *
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns project_name と project_uuid（見つからない場合はnull）
 *
 * @remarks
 * SQLファイル: projects/findNameById.sql
 * progressService.ts の downloadAndParseMAIML() から使用
 */
export async function findNameAndUuidById(
  organizationId: string,
  projectId: string
): Promise<{ project_name: string; project_uuid: string | null } | null> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/findNameById.sql');
  return await pgp.oneOrNone<{ project_name: string; project_uuid: string | null }>(
    sqlQuery,
    [organizationId, projectId]
  );
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
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/findBasicInfo.sql');
  return await pgp.oneOrNone<{ project_id: string; project_name: string }>(sqlQuery, [organizationId, projectId]);
}

/**
 * プロジェクト情報を取得（削除前チェック用）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param client トランザクション用のクライアント
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findProjectForDelete(
  organizationId: string,
  projectId: string,
  client: PoolClient
): Promise<{ project_maiml_flg: boolean; project_name: string } | null> {
  const sqlQuery = await loadSqlFile('projects/findForDelete.sql');
  const result = await client.query(sqlQuery, [organizationId, projectId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * 関連テーブルのデータを削除（プロジェクト削除用）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param client トランザクション用のクライアント
 */
export async function deleteProjectRelatedData(
  organizationId: string,
  projectId: string,
  client: PoolClient
): Promise<void> {
  // 孫テーブル: project_task_detail
  await client.query(
    'DELETE FROM project_task_detail WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 孫テーブル: template_data
  await client.query(
    'DELETE FROM template_data WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 孫テーブル: transition_data
  await client.query(
    'DELETE FROM transition_data WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 孫テーブル: instruction_acknowledged_history
  await client.query(
    `DELETE FROM instruction_acknowledged_history 
     WHERE organization_id = $1 AND project_id = $2`,
    [organizationId, projectId]
  );

  // 子テーブル: project_task
  await client.query(
    'DELETE FROM project_task WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 子テーブル: project_instruction
  await client.query(
    'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 子テーブル: issue
  await client.query(
    'DELETE FROM issue WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 子テーブル: issue_comment
  await client.query(
    'DELETE FROM issue_comment WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );

  // 子テーブル: maiml_event_log
  await client.query(
    'DELETE FROM maiml_event_log WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );
}

/**
 * project_uuid をキーに project_maiml_flg を更新
 *
 * フォルダ削除等でMAIMLファイルが失われた場合に false にセットするために使用。
 * file_metadata.project_uuid と project.project_uuid を紐付けて特定する。
 *
 * @param organizationId 組織ID（マルチテナント分離必須）
 * @param projectUuid project.project_uuid の値
 * @param maimlFlg 設定する値（通常は false）
 */
export async function updateMaimlFlgByUuid(
  organizationId: string,
  projectUuid: string,
  maimlFlg: boolean
): Promise<void> {
  const pool = getPool();
  const sqlQuery = await loadSqlFile('projects/updateMaimlFlgByUuid.sql');
  await pool.query(sqlQuery, [maimlFlg, organizationId, projectUuid]);
}

/**
 * プロジェクトを削除
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param client トランザクション用のクライアント
 */
export async function deleteProject(
  organizationId: string,
  projectId: string,
  client: PoolClient
): Promise<void> {
  await client.query(
    'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
    [organizationId, projectId]
  );
}

// ============================================================
// Phase 1 追加メソッド: projectService.ts から移行
// ============================================================

/**
 * プロジェクト名の重複チェック
 *
 * @param organizationId 組織ID
 * @param projectName プロジェクト名
 * @param client トランザクション用のクライアント
 * @returns 重複している場合は true
 */
export async function existsByName(
  organizationId: string,
  projectName: string,
  client: PoolClient
): Promise<boolean> {
  const sqlQuery = await loadSqlFile('projects/existsByName.sql');
  const result = await client.query(sqlQuery, [organizationId, projectName]);
  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * プロジェクト一覧をユーザー名・部署名・タスク数・ファイル数と共に取得
 *
 * @param organizationId 組織ID
 * @param includeCompleted 完了済みを含むか
 * @param sortBy ソートカラム
 * @param order ソート順
 * @returns プロジェクト一覧
 */
export async function findAllWithDetails(
  organizationId: string,
  includeCompleted: boolean,
  sortBy: string = 'create_at',
  order: 'asc' | 'desc' = 'desc'
): Promise<any[]> {
  const pgp = getPgp();
  // ソートカラムはホワイトリストで検証（SQLインジェクション対策）
  const allowedSortColumns = ['create_at', 'update_at', 'project_name', 'project_status'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? `p.${sortBy}` : 'p.create_at';
  const safeSortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const sqlQuery = await loadSqlFile('projects/findAllWithDetails.sql');
  // ORDER BY はホワイトリスト検証済みの値を文字列結合で付加（SQLインジェクション対策済み）
  const sqlWithOrder = `${sqlQuery.trimEnd()}\nORDER BY ${safeSortBy} ${safeSortOrder}`;

  return await pgp.any(sqlWithOrder, [organizationId, includeCompleted]);
}

/**
 * プロジェクト総件数取得
 *
 * @param organizationId 組織ID
 * @param includeCompleted 完了済みを含むか
 * @returns 総件数
 */
export async function countAll(
  organizationId: string,
  includeCompleted: boolean
): Promise<number> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/countAll.sql');
  const result = await pgp.one<{ total: string }>(sqlQuery, [organizationId, includeCompleted]);
  return parseInt(result.total, 10);
}

/**
 * プロジェクト情報を排他ロック付きで取得（SELECT FOR UPDATE）
 * チェックアウト・チェックイン処理のトランザクション内で使用
 *
 * @param client トランザクション用のクライアント
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns プロジェクト情報（見つからない場合は null）
 */
export async function findForUpdate(
  client: PoolClient,
  organizationId: string,
  projectId: string
): Promise<{
  project_id: string;
  project_name: string;
  project_status: number;
  project_maiml_flg: boolean;
  checkout_status: number;
  owner_user_id: string;
} | null> {
  const sqlQuery = await loadSqlFile('projects/findForUpdate.sql');
  const result = await client.query(sqlQuery, [organizationId, projectId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * チェックアウト実行（checkout_status=1, project_status=1 に更新）
 *
 * @param client トランザクション用のクライアント
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId チェックアウトするユーザーID
 */
export async function updateCheckoutStatus(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const sqlQuery = await loadSqlFile('projects/updateCheckoutStatus.sql');
  await client.query(sqlQuery, [organizationId, projectId, userId]);
}

/**
 * チェックイン実行（checkout_status=0 に更新）
 *
 * @param client トランザクション用のクライアント
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 */
export async function updateCheckinStatus(
  client: PoolClient,
  organizationId: string,
  projectId: string
): Promise<void> {
  const sqlQuery = await loadSqlFile('projects/updateCheckinStatus.sql');
  await client.query(sqlQuery, [organizationId, projectId]);
}

/**
 * プロジェクト情報とオーナーユーザー名を結合して取得
 * チェックアウト状態照会で使用
 *
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns プロジェクト情報（見つからない場合は null）
 */
export async function findWithOwner(
  organizationId: string,
  projectId: string
): Promise<{
  project_id: string;
  project_name: string;
  checkout_status: number;
  owner_user_id: string;
  owner_user_name: string | null;
} | null> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/findWithOwner.sql');
  return await pgp.oneOrNone(sqlQuery, [organizationId, projectId]);
}

/**
 * チェックアウト保持者のユーザー名を取得
 * （checkout_status=1 の別ユーザーがいる場合の競合エラーメッセージ用）
 *
 * @param client トランザクション用のクライアント
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns ユーザー名（見つからない場合は null）
 */
export async function findCheckedOutUserName(
  client: PoolClient,
  organizationId: string,
  userId: string
): Promise<string | null> {
  const result = await client.query(
    'SELECT user_name FROM organization_user WHERE organization_id = $1 AND user_id = $2',
    [organizationId, userId]
  );
  return result.rows[0]?.user_name ?? null;
}

/**
 * プロジェクト詳細情報をオーナー名・部門名付きで取得
 *
 * progressService の getWorkDetails() から移行。
 *
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @returns プロジェクト行（見つからない場合は null）
 */
export async function findWithOwnerAndDept(
  projectId: string,
  organizationId: string
): Promise<{
  organization_id: string;
  project_id: string;
  project_name: string;
  description: string | null;
  department_cd: string | null;
  department_name: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  project_status: number;
  checkout_status: number | null;
  create_at: Date;
  update_at: Date;
} | null> {
  const pgp = getPgp();
  const sql = await loadSqlFile('projects/findWithOwnerAndDept.sql');
  return pgp.oneOrNone(sql, [projectId, organizationId]);
}

/**
 * project_uuid が他のプロジェクト（除外プロジェクト以外）に既に登録されているか確認
 *
 * @param organizationId 組織ID（マルチテナント分離必須）
 * @param projectUuid 確認する UUID
 * @param excludeProjectName 除外するプロジェクト名（アップロード先プロジェクト自身）
 * @returns 重複しているプロジェクト名（null = 重複なし）
 */
export async function findProjectNameByUuid(
  organizationId: string,
  projectUuid: string,
  excludeProjectName?: string
): Promise<string | null> {
  const pgp = getPgp();
  // SQLファイル: projects/findProjectNameByUuid.sql
  // excludeProjectName が undefined の場合は空文字で渡す（WHERE project_name != '' は実質スキップされない点に注意）
  // → 通常は excludeProjectName を必ず指定すること
  const sqlQuery = await loadSqlFile('projects/findProjectNameByUuid.sql');
  const result = await pgp.oneOrNone<{ project_name: string }>(
    sqlQuery,
    [organizationId, projectUuid, excludeProjectName ?? '']
  );
  return result?.project_name ?? null;
}
