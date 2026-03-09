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

/**
 * 指示データの型定義（タスク登録タブから保存時に使用）
 */
export interface InstructionInsertData {
  methodId: string;
  content: string;
  priority: number;
  type: number;
  targetType: number;
  transitionId: string | null;
  taskNumber: number | null;
}

/**
 * 指示データの完全な型定義（findByProject用）
 */
export interface InstructionFullRow {
  instruction_id: string;
  organization_id: string;
  project_id: string;
  method_id: string;
  target_type: number;
  priority: number;
  type: number;
  task_no: number | null;
  transition_id: string | null;
  content: string;
  instruction_status: number;
  create_at: Date;
  create_user_id: string;
  update_at: Date;
  update_user_id: string;
}

/**
 * プロジェクトの全指示を取得（プロジェクト指示 + タスク指示）
 * バリデーション用に使用
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 指示一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<InstructionFullRow[]> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/findByProject.sql');
  
  try {
    const result = await pgp.any<InstructionFullRow>(
      sqlQuery,
      [organizationId, projectId]
    );
    return result;
  } catch (error) {
    console.error('Database query error in findByProject:', error);
    throw error;
  }
}

/**
 * プロジェクト名取得用の型定義
 */
interface ProjectNameRow {
  project_name: string;
}

/**
 * 指示数カウント用の型定義
 */
interface CountRow {
  count: string;
}

/**
 * 指示の一括挿入（トランザクション内）
 * タスク登録タブから指示を保存する際に使用
 * 
 * @param client PostgreSQLクライアント（トランザクション内）
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param instructions 指示データ配列
 */
export async function batchInsert(
  client: any,
  organizationId: string,
  projectId: string,
  userId: string,
  instructions: InstructionInsertData[]
): Promise<void> {
  const pgp = getPgp();
  
  // プロジェクト名を取得
  const projectNameQuery = await loadSqlFile('instructions/getProjectName.sql');
  const projectResult = await pgp.oneOrNone<ProjectNameRow>(
    projectNameQuery,
    [organizationId, projectId]
  );
  
  if (!projectResult) {
    throw new Error('Project not found');
  }
  
  const projectName = projectResult.project_name;
  
  // 既存の指示数を取得
  const countQuery = await loadSqlFile('instructions/getInstructionCount.sql');
  const countResult = await pgp.one<CountRow>(
    countQuery,
    [organizationId, projectId]
  );
  let nextNumber = parseInt(countResult.count) + 1;
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('instructions/batchInsert.sql');
  
  for (const instruction of instructions) {
    // {projectName}_{連番}形式でIDを生成（3桁0埋め）
    const instructionId = `${projectName}_${String(nextNumber).padStart(3, '0')}`;
    
    await client.query(sqlQuery, [
      organizationId,
      projectId,
      instructionId,
      instruction.methodId,
      instruction.targetType,
      instruction.priority,
      instruction.type,
      instruction.taskNumber,
      instruction.transitionId,
      instruction.content,
      userId,
      0, // instruction_status: 0（未送信）
      userId, // create_user_id
      userId // update_user_id
    ]);
    
    nextNumber++;
  }
}
