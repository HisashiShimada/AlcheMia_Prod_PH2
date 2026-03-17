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
 * 主キー: (organization_id, project_id, method_id, experiment_order)
 */

import { getPool, getPgp } from '../database/db';
import { ProjectTask } from '../types/database';
import type { TaskWithProject } from '../types/progress';
import type { MethodTaskRecord, TaskFilters } from '../types/task';
import { loadSqlFile } from '../sql/loader';
import type { ITask } from 'pg-promise';

/**
 * プロジェクト内のタスク一覧を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns タスク一覧（experiment_order順）
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
    ORDER BY experiment_order ASC
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
 * 未完了タスクが存在するかチェック（チェックイン前の確認用）
 * task_status が 3 (completed) または 4 (error) 以外のタスクをチェック
 * 
 * チェックイン可能条件: すべてのタスクが task_status = 3 または 4
 * チェックイン不可条件: task_status = 0, 1, 2 のタスクが1つでも存在
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 未完了タスクが存在する場合true
 */
export async function hasIncompleteTasks(
  organizationId: string,
  projectId: string
): Promise<boolean> {
  const pool = getPool();
  
  const query = `
    SELECT EXISTS(
      SELECT 1 
      FROM project_task_detail
      WHERE organization_id = $1 
        AND project_id = $2 
        AND task_status NOT IN (3, 4)
    ) as has_incomplete_tasks
  `;
  
  const result = await pool.query<{ has_incomplete_tasks: boolean }>(
    query, 
    [organizationId, projectId]
  );
  return result.rows[0].has_incomplete_tasks;
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
  const whereColumns = ['organization_id', 'project_id', 'method_id', 'experiment_order'];
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

/**
 * タスクデータの型定義（バッチUPSERT用）
 */
export interface TaskUpsertData {
  methodId: string;
  experimentOrder: number;
  experimentCondition: number;
  trialCount: number;
}

/**
 * タスクデータの型定義（バッチINSERT用）
 * TaskUpsertDataを拡張してworkerLinkedFlgを追加
 */
export interface TaskInsertData {
  methodId: string;
  experimentOrder: number;
  experimentCondition: number;
  trialCount: number;
  workerLinkedFlg: boolean;
}

/**
 * worker_linked_flgの値で絞り込んでタスクを削除（トランザクション内）
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param workerLinkedFlg 削除対象のworker_linked_flg値
 */
export async function deleteByProjectAndWorkerLinkedFlg(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  workerLinkedFlg: boolean
): Promise<void> {
  const query = `
    DELETE FROM project_task
    WHERE organization_id = $1 
      AND project_id = $2 
      AND worker_linked_flg = $3
  `;
  
  await t.none(query, [organizationId, projectId, workerLinkedFlg]);
}

/**
 * タスクの一括INSERT（トランザクション内）
 * タスク登録保存時に使用（削除→INSERT方式）
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param tasks タスクデータ配列
 */
export async function batchInsertTasks(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: TaskInsertData[]
): Promise<void> {
  const now = new Date();
  
  for (const task of tasks) {
    // TaskInsertDataをProjectTask型に変換
    const projectTask: ProjectTask = {
      organization_id: organizationId,
      project_id: projectId,
      method_id: task.methodId,
      experiment_order: task.experimentOrder,
      experiment_condition: task.experimentCondition,
      attempts_count: task.trialCount,
      worker_linked_flg: task.workerLinkedFlg,
      create_user_id: userId,
      create_at: now,
      update_user_id: userId,
      update_at: now
    };
    
    // 動的にINSERTクエリを構築（DB操作規約に準拠）
    const columns = Object.keys(projectTask);
    const values = columns.map(col => projectTask[col as keyof ProjectTask]);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    
    const query = `
      INSERT INTO project_task (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    
    await t.none(query, values);
  }
}

/**
 * プロジェクト内の全タスクのworker_linked_flgを更新（トランザクション内）
 * チェックアウト時に使用
 * 
 * @param client pg PoolClient（トランザクション用）
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param workerLinkedFlg 設定する値（通常はtrue）
 * @param userId 更新ユーザーID
 * @returns 更新件数
 */
export async function updateWorkerLinkedFlgByProject(
  client: any,
  organizationId: string,
  projectId: string,
  workerLinkedFlg: boolean,
  userId: string
): Promise<number> {
  const query = `
    UPDATE project_task
    SET 
      worker_linked_flg = $1,
      update_user_id = $2,
      update_at = CURRENT_TIMESTAMP
    WHERE organization_id = $3 
      AND project_id = $4
  `;
  
  const result = await client.query(query, [
    workerLinkedFlg,
    userId,
    organizationId,
    projectId
  ]);
  
  return result.rowCount || 0;
}

/**
 * プロジェクト内の指定ステータスのタスクを一括でステータス更新する
 * @param client pg-promise トランザクションクライアント
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param fromStatus 変更元ステータス
 * @param toStatus 変更先ステータス
 * @param userId 更新者ユーザーID
 * @returns 更新件数
 */
export async function bulkUpdateTaskStatusByProject(
  client: any,
  organizationId: string,
  projectId: string,
  fromStatus: number,
  toStatus: number,
  userId: string
): Promise<number> {
  const query = `
    UPDATE project_task_detail
    SET
      task_status = $1,
      update_user_id = $2,
      update_at = CURRENT_TIMESTAMP
    WHERE organization_id = $3
      AND project_id = $4
      AND task_status = $5
  `;

  const result = await client.query(query, [
    toStatus,
    userId,
    organizationId,
    projectId,
    fromStatus,
  ]);

  return result.rowCount || 0;
}
