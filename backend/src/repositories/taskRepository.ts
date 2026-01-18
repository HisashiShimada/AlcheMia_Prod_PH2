/**
 * TaskRepository
 * 
 * project_task、project_task_detailテーブルへのデータアクセス層
 */

import { PoolClient } from 'pg';
import { TaskInput } from '../types/instruction';

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
}
