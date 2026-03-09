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
import { TaskDetailResponse, TaskDetailTransitionItem, TaskDetailStats } from '../types/api';

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

// ---------------------------------------------------------------------------
// タスクステータス数値 → 文字列 変換マップ
// ---------------------------------------------------------------------------
const TASK_STATUS_MAP: Record<number, string> = {
  0: 'pending',
  1: 'in_progress',
  2: 'failed',
  3: 'review_waiting',
  4: 'completed',
};

/**
 * タスクステータス数値を文字列に変換する
 * @param statusNum DB の task_status 数値
 * @returns 文字列ステータス（不明な値は 'pending' を返す）
 */
function toTaskStatusString(statusNum: number | null | undefined): string {
  if (statusNum === null || statusNum === undefined) return 'pending';
  return TASK_STATUS_MAP[statusNum] ?? 'pending';
}

// ---------------------------------------------------------------------------
// findTaskDetail - タスク詳細 + トランジション進捗 一括取得
// ---------------------------------------------------------------------------

/**
 * タスク詳細情報をトランジション進捗込みで取得
 *
 * @param organizationId 組織ID（マルチテナント分離）
 * @param projectId      プロジェクトID
 * @param methodId       メソッドID
 * @param taskNo         タスク連番
 * @param taskId         レスポンスに埋め込むタスクID文字列（"{projectId}__{methodId}__{taskNo}"）
 * @returns タスク詳細レスポンス、または null（タスクが存在しない場合）
 */
export async function findTaskDetail(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  taskId: string
): Promise<TaskDetailResponse | null> {
  const pool = getPool();

  // ── 1. タスク基本情報取得（集計付き）──────────────────────────────
  const detailSql = await loadSqlFile('tasks/findDetailByTaskId.sql');
  const detailResult = await pool.query(detailSql, [
    projectId,
    methodId,
    taskNo,
    organizationId,
  ]);

  if (detailResult.rows.length === 0) {
    return null;
  }

  const row = detailResult.rows[0];

  // ── 2. トランジション進捗個別レコード取得 ────────────────────────
  const transitionSql = await loadSqlFile('tasks/findTransitionsByTaskId.sql');
  const transitionResult = await pool.query(transitionSql, [
    projectId,
    methodId,
    taskNo,
    organizationId,
  ]);

  const transitionProgress: TaskDetailTransitionItem[] = transitionResult.rows.map(
    (t) => ({
      transitionId: t.transition_id as string,
      status:       t.status !== null ? Number(t.status) : null,
      progressRate: t.progress_rate !== null ? Number(t.progress_rate) : null,
      updatedAt:    t.update_at ? (t.update_at as Date).toISOString() : null,
    })
  );

  // ── 3. 統計情報を集計 ─────────────────────────────────────────────
  const totalTransitions   = Number(row.total_transitions)   ?? 0;
  const completedCount     = Number(row.completed_transitions) ?? 0;
  const inProgressCount    = Number(row.inprogress_transitions) ?? 0;
  const notStartedCount    = Number(row.notstarted_transitions) ?? 0;
  const avgProgressRate    = Number(row.avg_progress_rate)   ?? 0;

  const stats: TaskDetailStats = {
    totalTransitions,
    completed:          completedCount,
    inProgress:         inProgressCount,
    notStarted:         notStartedCount,
    progressPercentage: avgProgressRate,
  };

  // ── 4. レスポンス組み立て ──────────────────────────────────────────
  const response: TaskDetailResponse = {
    taskId,
    projectId:           row.project_id as string,
    projectName:         row.project_name as string,
    methodId:            row.method_id as string,
    experimentOrder:     Number(row.experiment_order),
    taskName:            row.task_name as string | null,
    taskNo:              Number(row.task_no),
    taskStatus:          toTaskStatusString(row.task_status as number | null),
    taskStatusNum:       row.task_status !== null ? Number(row.task_status) : null,
    experimentUserId:    row.experiment_user_id as string | null,
    experimentUserName:  row.experiment_user_name as string | null,
    experimentStartAt:   row.experiment_start_at
      ? (row.experiment_start_at as Date).toISOString()
      : null,
    experimentEndAt:     row.experiment_end_at
      ? (row.experiment_end_at as Date).toISOString()
      : null,
    reviewedAt:          row.reviewed_at
      ? (row.reviewed_at as Date).toISOString()
      : null,
    reviewUserId:        row.review_user_id as string | null,
    transitionProgress,
    stats,
    createdAt:           row.create_at
      ? (row.create_at as Date).toISOString()
      : null,
    updatedAt:           row.update_at
      ? (row.update_at as Date).toISOString()
      : null,
  };

  return response;

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
 * タスク詳細の一括INSERT（トランザクション内）
 * タスク登録保存時に新規レコードを作成する際に使用
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
    // 各タスクのtrialCount分のレコードを作成
    for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
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
