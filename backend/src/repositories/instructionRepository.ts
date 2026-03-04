/**
 * Instruction（指示）リポジトリ
 * データベースアクセス層
 */

import { PoolClient } from 'pg';
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * Instructionのデータ型定義
 * findById.sql で取得するカラムに対応
 */
export interface InstructionRow {
  instruction_id: string;
  project_id: string;
  organization_id: string;
  /** メソッドID */
  method_id: string | null;
  /** 指示対象: 1=ファイル全体、2=タスク、3=トランジション */
  instruction_target: number | null;
  /** タスク連番 */
  task_no: number | null;
  /** トランジションID */
  transition_id: string | null;
}

/**
 * 確認履歴のデータ型定義
 */
export interface AcknowledgedHistoryRow {
  acknowledged_at: Date;
}

/**
 * タスク割り当てのデータ型定義
 */
export interface TaskAssignmentRow {
  task_id: string;
}

/**
 * ユーザー名のデータ型定義
 */
export interface UserNameRow {
  user_name: string;
}

/**
 * 指示の存在確認
 * 
 * @param instructionId 指示ID
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @returns Instruction（見つからない場合はnull）
 */
export async function findById(
  instructionId: string,
  projectId: string,
  organizationId: string
): Promise<InstructionRow | null> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/findById.sql');
  
  try {
    const result = await pgp.oneOrNone<InstructionRow>(
      sqlQuery,
      [instructionId, projectId, organizationId]
    );
    return result;
  } catch (error) {
    console.error('Database query error in findById:', error);
    throw error;
  }
}

/**
 * 既確認チェック
 * 
 * @param instructionId 指示ID
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @returns 確認履歴（見つからない場合はnull）
 */
export async function checkAcknowledged(
  instructionId: string,
  projectId: string,
  organizationId: string
): Promise<AcknowledgedHistoryRow | null> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/checkAcknowledged.sql');
  
  try {
    const result = await pgp.oneOrNone<AcknowledgedHistoryRow>(
      sqlQuery,
      [instructionId, projectId, organizationId]
    );
    return result;
  } catch (error) {
    console.error('Database query error in checkAcknowledged:', error);
    throw error;
  }
}

/**
 * 権限チェック（experiment_worker用）
 * 
 * @param instructionId 指示ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param organizationId 組織ID
 * @returns タスク割り当て（見つからない場合は空配列）
 */
export async function checkWorkerAssignment(
  instructionId: string,
  projectId: string,
  userId: string,
  organizationId: string
): Promise<TaskAssignmentRow[]> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/checkWorkerAssignment.sql');
  
  try {
    const result = await pgp.any<TaskAssignmentRow>(
      sqlQuery,
      [instructionId, projectId, userId, organizationId]
    );
    return result;
  } catch (error) {
    console.error('Database query error in checkWorkerAssignment:', error);
    throw error;
  }
}

/**
 * 確認履歴の挿入
 * 
 * @param instructionId 指示ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param organizationId 組織ID
 * @returns 挿入された確認履歴
 */
export async function insertAcknowledged(
  instructionId: string,
  projectId: string,
  userId: string,
  organizationId: string
): Promise<AcknowledgedHistoryRow> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/insertAcknowledged.sql');
  
  try {
    const result = await pgp.one<AcknowledgedHistoryRow>(
      sqlQuery,
      [instructionId, projectId, userId, organizationId]
    );
    return result;
  } catch (error) {
    console.error('Database query error in insertAcknowledged:', error);
    throw error;
  }
}

/**
 * 確認履歴の挿入（PoolClient版 - トランザクション内で使用）
 *
 * @param instructionId 指示ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param organizationId 組織ID
 * @param client トランザクション用のPoolClient
 * @returns 挿入された確認履歴
 */
export async function insertAcknowledgedWithClient(
  instructionId: string,
  projectId: string,
  userId: string,
  organizationId: string,
  client: PoolClient
): Promise<AcknowledgedHistoryRow> {
  const sqlQuery = await loadSqlFile('instructions/insertAcknowledged.sql');

  try {
    const result = await client.query<AcknowledgedHistoryRow>(
      sqlQuery,
      [instructionId, projectId, userId, organizationId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database query error in insertAcknowledgedWithClient:', error);
    throw error;
  }
}

/**
 * ユーザー名の取得（user_authenticationテーブル使用）
 * 
 * @param userId ユーザーID
 * @param organizationId 組織ID
 * @returns ユーザー名（見つからない場合はnull）
 */
export async function findUserNameFromAuth(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/findUserName.sql');
  
  try {
    const result = await pgp.oneOrNone<UserNameRow>(
      sqlQuery,
      [userId, organizationId]
    );
    return result ? result.user_name : null;
  } catch (error) {
    console.error('Database query error in findUserNameFromAuth:', error);
    throw error;
  }
}
