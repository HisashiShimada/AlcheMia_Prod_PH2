/**
 * project_task_detailテーブル専用Repository
 * 
 * @remarks
 * DB操作規約に準拠:
 * - insertメソッド: テーブル型Objectを受け取り、動的にSQLクエリを構築
 * - updateメソッド: テーブル型Objectを受け取り、動的にSQLクエリを構築
 * 
 * DDL: docs/design/db/ddl/project_task_detail.sql
 * 主キー: (organization_id, project_id, method_id, task_no)
 */

import { getPool, getPgp } from '../database/db';
import { ProjectTaskDetail } from '../types/database';
import { loadSqlFile } from '../sql/loader';
import type { ITask } from 'pg-promise';

/**
 * プロジェクト内のタスク詳細一覧を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns タスク詳細一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<ProjectTaskDetail[]> {
  const pool = getPool();
  
  const query = `
    SELECT *
    FROM project_task_detail
    WHERE organization_id = $1 AND project_id = $2
    ORDER BY method_id ASC, task_no ASC
  `;
  
  const result = await pool.query<ProjectTaskDetail>(query, [organizationId, projectId]);
  return result.rows;
}

/**
 * 特定のタスク詳細を取得（主キーで検索）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @param taskNo タスク番号
 * @returns タスク詳細（存在しない場合はnull）
 */
export async function findByPrimaryKey(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<ProjectTaskDetail | null> {
  const pool = getPool();
  
  const query = `
    SELECT *
    FROM project_task_detail
    WHERE organization_id = $1 
      AND project_id = $2 
      AND method_id = $3 
      AND task_no = $4
  `;
  
  const result = await pool.query<ProjectTaskDetail>(
    query,
    [organizationId, projectId, methodId, taskNo]
  );
  
  return result.rows[0] || null;
}

/**
 * タスク詳細をInsert（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 
 * @param data タスク詳細データ（テーブル型Object）
 * @returns Insertされたタスク詳細
 */
export async function insert(data: ProjectTaskDetail): Promise<ProjectTaskDetail> {
  const pool = getPool();
  
  // データからカラム名と値を抽出
  const columns = Object.keys(data).filter(key => data[key as keyof ProjectTaskDetail] !== undefined);
  const values = columns.map(col => data[col as keyof ProjectTaskDetail]);
  
  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  
  // SQLクエリを構築
  const query = `
    INSERT INTO project_task_detail (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await pool.query<ProjectTaskDetail>(query, values);
  return result.rows[0];
}

/**
 * タスク詳細をUpdate（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 
 * @param data 更新するタスク詳細データ（テーブル型Object）
 * @returns 更新されたタスク詳細
 */
export async function update(data: ProjectTaskDetail): Promise<ProjectTaskDetail> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（主キー）
  const whereColumns = ['organization_id', 'project_id', 'method_id', 'task_no'];
  const whereValues = whereColumns.map(col => data[col as keyof ProjectTaskDetail]);
  
  // 更新するカラム（主キーを除外）
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && data[key as keyof ProjectTaskDetail] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col as keyof ProjectTaskDetail]);
  
  // SET句を構築
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築
  const whereClause = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築
  const query = `
    UPDATE project_task_detail
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query<ProjectTaskDetail>(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error(`No rows updated in project_task_detail table`);
  }
  
  return result.rows[0];
}

/**
 * タスク詳細を一括Insert（トランザクション処理で使用）
 * 
 * @param taskDetails タスク詳細データ配列
 * @returns Insertされたタスク詳細数
 */
export async function bulkInsert(taskDetails: ProjectTaskDetail[]): Promise<number> {
  const pool = getPool();
  
  if (taskDetails.length === 0) {
    return 0;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertedCount = 0;
    
    for (const detail of taskDetails) {
      // 各タスク詳細をinsertメソッドで挿入
      const columns = Object.keys(detail).filter(
        key => detail[key as keyof ProjectTaskDetail] !== undefined
      );
      const values = columns.map(col => detail[col as keyof ProjectTaskDetail]);
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const query = `
        INSERT INTO project_task_detail (${columns.join(', ')})
        VALUES (${placeholders})
      `;
      
      await client.query(query, values);
      insertedCount++;
    }
    
    await client.query('COMMIT');
    return insertedCount;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ========================================
// pg-promise対応メソッド（タスク登録保存用）
// ========================================

/**
 * タスク詳細データの型定義（バッチINSERT用）
 */
export interface TaskDetailInsertData {
  methodId: string;
  trialCount: number;
}

/**
 * 特定メソッドの最大task_noを取得（トランザクション内）
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @returns 最大task_no（レコードが存在しない場合は0）
 */
export async function findMaxTaskNoByMethod(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<number> {
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('project_task_detail/findMaxTaskNoByMethod.sql');
  
  const result = await t.oneOrNone<{ max_task_no: number }>(
    sqlQuery,
    [organizationId, projectId, methodId]
  );
  
  return result?.max_task_no ?? 0;
}

/**
 * プロジェクト単位でタスク詳細を削除（トランザクション内）
 * タスク登録保存時に既存レコードをクリアする際に使用
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 */
export async function deleteByProject(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string
): Promise<void> {
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('project_task_detail/deleteByProject.sql');
  
  await t.none(sqlQuery, [organizationId, projectId]);
}

/**
 * プロジェクト単位でタスク詳細を削除（特定ステータスのみ、トランザクション内）
 * タスク登録保存時に task_status=0（未着手）のレコードのみを削除する際に使用
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param taskStatus 削除対象のタスクステータス（0=未着手、1=実行中、2=レビュー待ち、3=完了、4=異常終了）
 */
export async function deleteByProjectAndStatus(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  taskStatus: number
): Promise<void> {
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('project_task_detail/deleteByProjectAndStatus.sql');
  
  await t.none(sqlQuery, [organizationId, projectId, taskStatus]);
}

/**
 * タスク詳細の一括INSERT（トランザクション内）
 * タスク登録保存時に新規レコードを作成する際に使用
 * 
 * @remarks
 * 既存レコードを保持し、新規レコードのtask_noは既存の最大値+1から採番する
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param tasks タスクデータ配列
 */
export async function batchInsert(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: TaskDetailInsertData[]
): Promise<void> {
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('project_task_detail/insert.sql');
  
  for (const task of tasks) {
    // 既存の最大task_noを取得
    const maxTaskNo = await findMaxTaskNoByMethod(
      t,
      organizationId,
      projectId,
      task.methodId
    );
    
    // 既存の最大値+1から採番
    const startTaskNo = maxTaskNo + 1;
    
    // 各タスクのtrialCount分のレコードを作成（連番で追加）
    for (let i = 0; i < task.trialCount; i++) {
      const taskNo = startTaskNo + i;
      
      await t.none(sqlQuery, [
        organizationId,
        projectId,
        task.methodId,
        taskNo,
        0, // task_status: 0（初期状態）
        userId, // create_user_id
        userId  // update_user_id
      ]);
    }
  }
}
