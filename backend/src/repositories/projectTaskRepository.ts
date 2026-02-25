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
import type { TaskWithProject } from '../types/progress';
import type { MethodTaskRecord, TaskFilters } from '../types/task';

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

/**
 * プロジェクト、メソッド、タスク番号でタスク基本情報を取得（進捗管理用）
 * 
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @param taskNo タスク番号
 * @param organizationId 組織ID
 * @returns タスク基本情報（プロジェクト名を含む）
 */
export async function getTaskByProjectMethodTaskNo(
  projectId: string,
  methodId: string,
  taskNo: number,
  organizationId: string
): Promise<TaskWithProject | null> {
  const pool = getPool();
  
  const query = `
    SELECT 
      ptd.task_detail_id as task_id,
      COALESCE(ptd.task_name, 'Task ' || ptd.task_no) as task_name,
      pt.project_id,
      p.project_name,
      pt.method_id,
      ptd.task_no
    FROM project_task_detail ptd
    INNER JOIN project_task pt 
      ON ptd.organization_id = pt.organization_id
      AND ptd.project_id = pt.project_id
      AND ptd.method_id = pt.method_id
    INNER JOIN project p
      ON pt.organization_id = p.organization_id
      AND pt.project_id = p.project_id
    WHERE ptd.organization_id = $1
      AND ptd.project_id = $2
      AND ptd.method_id = $3
      AND ptd.task_no = $4
  `;
  
  const result = await pool.query<TaskWithProject>(query, [
    organizationId,
    projectId,
    methodId,
    taskNo
  ]);
  
  return result.rows[0] || null;
}

/**
 * プロジェクト内のメソッドとタスクを取得（実験作業者用タスク一覧）
 * 
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @param filters フィルタ条件
 * @returns メソッドとタスクのレコード配列
 */
export async function findMethodsAndTasksByProject(
  projectId: string,
  organizationId: string,
  filters: TaskFilters
): Promise<MethodTaskRecord[]> {
  const pool = getPool();
  
  let query = `
    SELECT 
      pt.method_id,
      pt.method_name,
      pt.experiment_order,
      ptd.task_detail_id,
      ptd.task_no as task_detail_no,
      ptd.task_status,
      ptd.assign_user_id,
      u.user_name as assign_user_name,
      ptd.progress_rate,
      ptd.create_at as created_at,
      ptd.update_at as updated_at
    FROM project_task pt
    LEFT JOIN project_task_detail ptd
      ON pt.organization_id = ptd.organization_id
      AND pt.project_id = ptd.project_id
      AND pt.method_id = ptd.method_id
    LEFT JOIN users u
      ON ptd.assign_user_id = u.user_id
      AND ptd.organization_id = u.organization_id
    WHERE pt.organization_id = $1
      AND pt.project_id = $2
  `;
  
  const params: any[] = [organizationId, projectId];
  let paramIndex = 3;
  
  // フィルター条件の追加
  if (filters.methodId) {
    query += ` AND pt.method_id = $${paramIndex}`;
    params.push(filters.methodId);
    paramIndex++;
  }
  
  if (filters.status !== undefined) {
    query += ` AND ptd.task_status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  
  if (filters.assignUserId) {
    query += ` AND ptd.assign_user_id = $${paramIndex}`;
    params.push(filters.assignUserId);
    paramIndex++;
  }
  
  // ソート順の追加
  const sortBy = filters.sortBy || 'experiment_order';
  const order = filters.order || 'asc';
  
  if (sortBy === 'task_no') {
    query += ` ORDER BY pt.experiment_order ${order.toUpperCase()}, ptd.task_no ${order.toUpperCase()}`;
  } else if (sortBy === 'created_at' || sortBy === 'updated_at' || sortBy === 'status') {
    query += ` ORDER BY pt.experiment_order ASC, ptd.${sortBy} ${order.toUpperCase()} NULLS LAST`;
  } else {
    query += ` ORDER BY pt.experiment_order ${order.toUpperCase()}, ptd.task_no ASC`;
  }
  
  const result = await pool.query<MethodTaskRecord>(query, params);
  return result.rows;
}
