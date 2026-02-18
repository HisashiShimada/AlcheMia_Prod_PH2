/**
 * ExperimentDataService
 * 
 * 実験データ管理のビジネスロジックを提供します。
 * 
 * @note トランジションステータス更新機能はprogressService.tsに移動しました（2026-02-18）
 */

import { TemplateDataRepository, TemplateDataRecord, TemplateDataRow } from '../repositories/templateDataRepository';
import { getPool } from '../database/db';

/**
 * プロジェクト編集不可エラー
 */
export class ProjectNotEditableError extends Error {
  constructor(projectStatus: string) {
    super(`Project is not editable. Current status: ${projectStatus}. Editable statuses are: draft, active, waiting_approval.`);
    this.name = 'ProjectNotEditableError';
  }
}

/**
 * タスク不存在エラー
 */
export class TaskNotFoundError extends Error {
  constructor(taskNo: number) {
    super(`Task not found: task_no=${taskNo}`);
    this.name = 'TaskNotFoundError';
  }
}

/**
 * ExperimentDataService
 * 
 * 実験データ管理のビジネスロジック
 */
export class ExperimentDataService {
  private templateRepository: TemplateDataRepository;

  constructor(
    templateRepository?: TemplateDataRepository
  ) {
    this.templateRepository = templateRepository || new TemplateDataRepository();
  }

  /**
   * 実験データを一括保存
   * 
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param taskNo タスク番号
   * @param records 保存するレコード配列
   * @param recordedBy 記録者のユーザーID
   * @returns 保存されたレコード配列
   */
  async saveBatchData(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    records: TemplateDataRecord[],
    recordedBy: string
  ): Promise<TemplateDataRow[]> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query('BEGIN');

      // 1. プロジェクトステータスを確認
      const projectResult = await client.query(
        `SELECT status FROM projects 
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, projectId]
      );

      if (projectResult.rows.length === 0) {
        const error: any = new Error('Project not found');
        error.name = 'ProjectNotFoundError';
        throw error;
      }

      const projectStatus = projectResult.rows[0].status;

      // 編集可能なステータスかチェック（draft, active, waiting_approval）
      const editableStatuses = ['draft', 'active', 'waiting_approval'];
      if (!editableStatuses.includes(projectStatus)) {
        throw new ProjectNotEditableError(projectStatus);
      }

      // 2. タスクが存在することを確認
      const taskResult = await client.query(
        `SELECT task_no FROM project_task 
         WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
        [organizationId, projectId, methodId, taskNo]
      );

      if (taskResult.rows.length === 0) {
        throw new TaskNotFoundError(taskNo);
      }

      // 3. records配列の各要素をUPSERT
      const savedRecords: TemplateDataRow[] = [];
      for (const record of records) {
        const savedRecord = await this.templateRepository.upsert(
          organizationId,
          projectId,
          methodId,
          taskNo,
          record,
          recordedBy,
          client
        );
        savedRecords.push(savedRecord);
      }

      // トランザクションコミット
      await client.query('COMMIT');

      return savedRecords;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * 実験データを一括保存する（関数版）
 */
export async function saveBatchData(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  records: TemplateDataRecord[],
  recordedBy: string
): Promise<TemplateDataRow[]> {
  const service = new ExperimentDataService();
  return service.saveBatchData(organizationId, projectId, methodId, taskNo, records, recordedBy);
}
