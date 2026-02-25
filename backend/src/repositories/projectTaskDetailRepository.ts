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

import { getPool } from '../database/db';
import { ProjectTaskDetail } from '../types/database';

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
