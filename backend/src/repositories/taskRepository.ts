/**
 * TaskRepository
 * 
 * project_task、project_task_detailテーブルへのデータアクセス層
 */

import { PoolClient } from 'pg';
import { TaskInput } from '../types/instruction';
import { TaskFilters, MethodTaskRecord } from '../types/task';
import { loadSqlFile } from '../sql/loader';
import { getPool } from '../database/db';

/**
 * TaskRepositoryクラス
 */
export class TaskRepository {
  /**
   * タスクをUPSERT（INSERT ... ON CONFLICT UPDATE）
   * 
   * @param tasks - タスク入力データの配列
   * @param projectId - プロジェクトID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param client - トランザクション用のPoolClient（必須）
   */
  async upsertTasks(
    tasks: TaskInput[],
    projectId: string,
    organizationId: string,
    client: PoolClient
  ): Promise<void> {
    // 空配列の場合は何もしない
    if (tasks.length === 0) {
      return;
    }

    // 一括UPSERT用のVALUES句を構築
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    for (const task of tasks) {
      // trialCountのデフォルト値は1
      const attemptsCount = task.trialCount ?? 1;

      // パラメータを追加
      values.push(
        organizationId,             // $1, $5, $9...
        projectId,                  // $2, $6, $10...
        task.methodId,              // $3, $7, $11...
        task.experimentCondition,   // $4, $8, $12...
        attemptsCount               // $5, $9, $13... (attempts_count)
      );

      // プレースホルダーを作成 ($1, $2, $3, $4, $5)
      const placeholders = [];
      for (let i = 0; i < 5; i++) {
        placeholders.push(`$${paramIndex++}`);
      }
      valuePlaceholders.push(`(${placeholders.join(', ')})`);
    }

    // Parameterized Query（SQLインジェクション対策）
    // INSERT ... ON CONFLICT UPDATE（UPSERT）
    const query = `
      INSERT INTO project_task (
        organization_id,
        project_id,
        method_id,
        experiment_condition,
        attempts_count
      )
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (organization_id, project_id, method_id)
      DO UPDATE SET
        experiment_condition = EXCLUDED.experiment_condition,
        attempts_count = EXCLUDED.attempts_count
    `;

    await client.query(query, values);
  }

  /**
   * タスク詳細レコードを一括作成
   * 
   * @param tasks - タスク入力データの配列
   * @param projectId - プロジェクトID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param client - トランザクション用のPoolClient（必須）
   */
  async createTaskDetails(
    tasks: TaskInput[],
    projectId: string,
    organizationId: string,
    client: PoolClient
  ): Promise<void> {
    // 空配列の場合は何もしない
    if (tasks.length === 0) {
      return;
    }

    // 一括INSERT用のVALUES句を構築
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    for (const task of tasks) {
      // trialCountのデフォルト値は1
      const trialCount = task.trialCount ?? 1;

      // 試行回数分のレコードを生成
      for (let taskNo = 1; taskNo <= trialCount; taskNo++) {
        // パラメータを追加
        values.push(
          organizationId,             // $1, $5, $9...
          projectId,                  // $2, $6, $10...
          task.methodId,              // $3, $7, $11...
          taskNo,                     // $4, $8, $12... (task_no: 1から連番)
          0                           // $5, $9, $13... (task_status: 0固定)
        );

        // プレースホルダーを作成 ($1, $2, $3, $4, $5)
        const placeholders = [];
        for (let i = 0; i < 5; i++) {
          placeholders.push(`$${paramIndex++}`);
        }
        valuePlaceholders.push(`(${placeholders.join(', ')})`);
      }
    }

    // Parameterized Query（SQLインジェクション対策）
    // organization_idフィルタ必須（マルチテナント分離）
    const query = `
      INSERT INTO project_task_detail (
        organization_id,
        project_id,
        method_id,
        task_no,
        task_status
      )
      VALUES ${valuePlaceholders.join(', ')}
    `;

    await client.query(query, values);
  }

  /**
   * プロジェクト内のメソッドとタスク詳細を取得
   * 
   * @param projectId - プロジェクトID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param filters - フィルタ条件（methodId, status, assignUserId, sortBy, order）
   * @returns メソッドとタスク詳細のレコード配列
   */
  async findMethodsAndTasksByProject(
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
      const sortColumn = this.mapSortFieldToColumn(filters.sortBy);
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

  /**
   * ソートフィールドをデータベースカラムにマッピング
   * 
   * @param sortField - ソートフィールド
   * @returns データベースカラム名
   */
  private mapSortFieldToColumn(sortField: string): string {
    const mapping: Record<string, string> = {
      task_no: 'ptd.task_no',
      created_at: 'ptd.experiment_start_at',
      updated_at: 'ptd.reviewed_at',
      status: 'ptd.task_status',
    };

    return mapping[sortField] || 'ptd.task_no';
  }
}
