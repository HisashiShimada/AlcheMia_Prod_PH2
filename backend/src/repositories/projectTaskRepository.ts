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
import { loadSqlFile } from '../sql/loader';

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
 * 実行中のタスクが存在するかチェック（チェックイン前の確認用）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 実行中のタスクが存在する場合true
 */
export async function hasRunningTasks(
  organizationId: string,
  projectId: string
): Promise<boolean> {
  const pool = getPool();
  
  const query = `
    SELECT EXISTS(
      SELECT 1 
      FROM project_task_detail
      WHERE organization_id = $1 AND project_id = $2 AND task_status = 1
    ) as has_running_tasks
  `;
  
  const result = await pool.query<{ has_running_tasks: boolean }>(query, [organizationId, projectId]);
  return result.rows[0].has_running_tasks;
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
    // 外部SQLファイルを読み込み
    const query = await loadSqlFile('tasks/findByProjectMethodTaskNo.sql');
    
    const params = [projectId, methodId, taskNo, organizationId];

    const pool = getPool();
    const result = await pool.query(query, params);

    // レコードが存在しない場合はnullを返却
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as TaskWithProject;
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
    // 外部SQLファイルを読み込む
    const baseSql = await loadSqlFile('tasks/listMethodsAndTasksByProject.sql');

    // パラメータ配列（$1: projectId, $2: organizationId）
    const params: any[] = [projectId, organizationId];
    let paramIndex = 3;

    // 動的WHERE句を構築
    const whereClauses: string[] = [];

    if (filters.methodId) {
      whereClauses.push(`AND pt.method_id = $${paramIndex}`);
      params.push(filters.methodId);
      paramIndex++;
    }

    if (filters.status !== undefined) {
      whereClauses.push(`AND ptd.task_status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.assignUserId) {
      whereClauses.push(`AND ptd.experiment_user_id = $${paramIndex}`);
      params.push(filters.assignUserId);
      paramIndex++;
    }

    // 動的ORDER BY句を構築
    let orderByClause = '';
    if (filters.sortBy) {
      const sortColumn = mapSortFieldToColumn(filters.sortBy);
      const sortOrder = filters.order?.toUpperCase() || 'ASC';
      orderByClause = `, ${sortColumn} ${sortOrder}`;
    }

    // SQLを組み立て（WHERE句とORDER BY句を動的に追加）
    let finalSql = baseSql;

    // WHERE句に動的フィルタを追加
    if (whereClauses.length > 0) {
      // 既存のWHERE句の後に追加
      finalSql = finalSql.replace(
        /WHERE pt\.project_id = \$1\s+AND pt\.organization_id = \$2/,
        `WHERE pt.project_id = $1\n  AND pt.organization_id = $2\n  ${whereClauses.join('\n  ')}`
      );
    }

    // ORDER BY句に動的ソートを追加
    if (orderByClause) {
      // 既存のORDER BY句を見つけて、動的ソートを挿入
      finalSql = finalSql.replace(
        /ORDER BY\s+pt\.experiment_order ASC,/,
        `ORDER BY\n  pt.experiment_order ASC${orderByClause},`
      );
    }

    // クエリを実行
    const pool = getPool();
    const result = await pool.query(finalSql, params);

    return result.rows as MethodTaskRecord[];
}

function mapSortFieldToColumn(sortField: string): string {
    const mapping: Record<string, string> = {
      task_no: 'ptd.task_no',
      created_at: 'ptd.experiment_start_at',
      updated_at: 'ptd.reviewed_at',
      status: 'ptd.task_status',
    };

    return mapping[sortField] || 'ptd.task_no';
  }
