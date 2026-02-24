/**
 * project_taskテーブル専用Repository
 * 
 * @remarks
 * DB操作規約に準拠:
 * - insertメソッド: テーブル型Objectを受け取り、動的にSQLクエリを構築
 * - updateメソッド: テーブル型Objectを受け取り、動的にSQLクエリを構築
 * - Service層でupsertロジックを実装（既存レコード確認 → insert/update分岐）
 * 
 * DDL: docs/design/db/ddl/project_task.sql
 * 主キー: (organization_id, project_id, method_id)
 */

import { getPool } from '../database/db';
import { ProjectTask } from '../types/database';

/**
 * プロジェクト内のタスク一覧を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns タスク一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<ProjectTask[]> {
  const pool = getPool();
  
  const query = `
    SELECT *
    FROM project_task
    WHERE organization_id = $1 AND project_id = $2
    ORDER BY method_id ASC
  `;
  
  const result = await pool.query<ProjectTask>(query, [organizationId, projectId]);
  return result.rows;
}

/**
 * 特定のタスクを取得（主キーで検索）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @returns タスク（存在しない場合はnull）
 */
export async function findByPrimaryKey(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<ProjectTask | null> {
  const pool = getPool();
  
  const query = `
    SELECT *
    FROM project_task
    WHERE organization_id = $1 AND project_id = $2 AND method_id = $3
  `;
  
  const result = await pool.query<ProjectTask>(query, [organizationId, projectId, methodId]);
  return result.rows[0] || null;
}

/**
 * プロジェクト内のタスク数を取得（タスク登録状況確認用）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns タスク数
 */
export async function countByProject(
  organizationId: string,
  projectId: string
): Promise<number> {
  const pool = getPool();
  
  const query = `
    SELECT COUNT(*) as count
    FROM project_task
    WHERE organization_id = $1 AND project_id = $2
  `;
  
  const result = await pool.query<{ count: string }>(query, [organizationId, projectId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * タスクをInsert（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 
 * @param data タスクデータ（テーブル型Object）
 * @returns Insertされたタスク
 */
export async function insert(data: ProjectTask): Promise<ProjectTask> {
  const pool = getPool();
  
  // データからカラム名と値を抽出
  const columns = Object.keys(data).filter(key => data[key as keyof ProjectTask] !== undefined);
  const values = columns.map(col => data[col as keyof ProjectTask]);
  
  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  
  // SQLクエリを構築
  const query = `
    INSERT INTO project_task (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await pool.query<ProjectTask>(query, values);
  return result.rows[0];
}

/**
 * タスクをUpdate（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 
 * @param data 更新するタスクデータ（テーブル型Object）
 * @returns 更新されたタスク
 */
export async function update(data: ProjectTask): Promise<ProjectTask> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（主キー）
  const whereColumns = ['organization_id', 'project_id', 'method_id'];
  const whereValues = whereColumns.map(col => data[col as keyof ProjectTask]);
  
  // 更新するカラム（主キーを除外）
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && data[key as keyof ProjectTask] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col as keyof ProjectTask]);
  
  // SET句を構築 (experiment_order = $1, experiment_condition = $2, ...)
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築 (organization_id = $N AND project_id = $N+1 AND method_id = $N+2)
  const whereClause = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築
  const query = `
    UPDATE project_task
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query<ProjectTask>(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error(`No rows updated in project_task table`);
  }
  
  return result.rows[0];
}

/**
 * タスクを一括Insert（トランザクション処理で使用）
 * 
 * @param tasks タスクデータ配列
 * @returns Insertされたタスク数
 */
export async function bulkInsert(tasks: ProjectTask[]): Promise<number> {
  const pool = getPool();
  
  if (tasks.length === 0) {
    return 0;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertedCount = 0;
    
    for (const task of tasks) {
      // 各タスクをinsertメソッドで挿入
      const columns = Object.keys(task).filter(key => task[key as keyof ProjectTask] !== undefined);
      const values = columns.map(col => task[col as keyof ProjectTask]);
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const query = `
        INSERT INTO project_task (${columns.join(', ')})
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
