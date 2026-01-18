/**
 * InstructionService
 * 
 * 指示送信（タスク作成）のビジネスロジックとトランザクション管理
 */

import { PoolClient } from 'pg';
import { getPool } from '../database/db';
import { ProjectRepository } from '../repositories/projectRepository';
import { InstructionRepository } from '../repositories/instructionRepository';
import { TaskRepository } from '../repositories/taskRepository';
import {
  CreateInstructionInput,
  InstructionCreationSummary,
} from '../types/instruction';

/**
 * InstructionServiceクラス
 */
export class InstructionService {
  constructor(
    private projectRepo: ProjectRepository,
    private instructionRepo: InstructionRepository,
    private taskRepo: TaskRepository
  ) {}

  /**
   * 指示とタスクを作成
   * 
   * @param projectId - プロジェクトID
   * @param data - 指示とタスクのデータ
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param userId - 指示作成ユーザーID
   * @returns 作成サマリー
   * @throws Error - プロジェクトが存在しない、ステータスが不正、DB操作失敗
   */
  async createInstruction(
    projectId: string,
    data: CreateInstructionInput,
    organizationId: string,
    userId: string
  ): Promise<InstructionCreationSummary> {
    // 1. プロジェクト存在確認（トランザクション開始前）
    const project = await this.projectRepo.findById(projectId, organizationId);

    if (!project) {
      throw new Error('Project not found');
    }

    // 2. プロジェクトステータス確認（project_status = 0のみ許可）
    if (project.project_status !== 0) {
      throw new Error('Project status must be 0');
    }

    // 3. トランザクション開始
    const pool = getPool();
    const client: PoolClient = await pool.connect();

    try {
      // BEGIN TRANSACTION
      await client.query('BEGIN');

      // 4. 指示レコード作成
      await this.instructionRepo.createInstructions(
        data.instructions,
        projectId,
        organizationId,
        userId,
        client
      );

      // 5. タスクレコードをUPSERT
      await this.taskRepo.upsertTasks(
        data.tasks,
        projectId,
        organizationId,
        client
      );

      // 6. タスク詳細レコード作成
      await this.taskRepo.createTaskDetails(
        data.tasks,
        projectId,
        organizationId,
        client
      );

      // 7. プロジェクトステータスを更新（0 → 1: タスク実行待ち）
      await this.projectRepo.updateStatus(
        projectId,
        1,
        organizationId,
        client
      );

      // COMMIT
      await client.query('COMMIT');

      // 8. 作成サマリーを返却
      return {
        totalTasks: data.tasks.length,
        createdTasks: data.tasks.length,
      };
    } catch (error) {
      // エラー時はROLLBACK
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // クライアントをリリース
      client.release();
    }
  }
}
