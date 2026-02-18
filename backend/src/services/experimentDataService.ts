/**
 * ExperimentDataService
 * 
 * トランジション状態更新のビジネスロジックを提供します。
 */

import { TransitionDataRepository, TransitionDataRow } from '../repositories/transitionDataRepository';
import { TemplateDataRepository, TemplateDataRecord, TemplateDataRow } from '../repositories/templateDataRepository';
import { EventLogRepository } from '../repositories/eventLogRepository';
import { Status, TransitionData, TransitionDataUpdate } from '../types/transitionData';
import { getPool } from '../database/db';

/**
 * ステータス遷移マトリクス
 * 
 * 各ステータスから遷移可能なステータスのリスト
 */
export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  initial: ['preparing', 'completed', 'error'],
  preparing: ['ready', 'completed', 'error'],
  ready: ['ready', 'running', 'completed', 'error'], // readyは自己遷移可能
  running: ['paused', 'completed', 'error'],
  paused: ['running', 'completed', 'error'],
  completed: [], // 最終状態（変更不可）
  error: [] // 最終状態（変更不可）
};

/**
 * ステータス遷移エラー
 */
export class InvalidStatusTransitionError extends Error {
  constructor(fromStatus: Status, toStatus: Status) {
    // 最終状態からの遷移の場合
    if (fromStatus === 'completed' || fromStatus === 'error') {
      super(`Cannot change status from terminal state '${fromStatus}'. Terminal states (completed, error) cannot be changed.`);
    } else {
      super(`Invalid status transition from '${fromStatus}' to '${toStatus}'. Allowed transitions from '${fromStatus}': ${ALLOWED_TRANSITIONS[fromStatus].join(', ')}`);
    }
    this.name = 'InvalidStatusTransitionError';
  }
}

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
 * 実験データとトランジション状態管理のビジネスロジック
 */
export class ExperimentDataService {
  private transitionRepository: TransitionDataRepository;
  private templateRepository: TemplateDataRepository;
  private eventLogRepository: EventLogRepository;

  constructor(
    transitionRepository?: TransitionDataRepository,
    templateRepository?: TemplateDataRepository,
    eventLogRepository?: EventLogRepository
  ) {
    this.transitionRepository = transitionRepository || new TransitionDataRepository();
    this.templateRepository = templateRepository || new TemplateDataRepository();
    this.eventLogRepository = eventLogRepository || new EventLogRepository();
  }

  /**
   * ステータス遷移の妥当性を検証
   * 
   * @param fromStatus 現在のステータス
   * @param toStatus 新しいステータス
   * @throws InvalidStatusTransitionError 不正な遷移の場合
   */
  validateStatusTransition(fromStatus: Status, toStatus: Status): void {
    // 入力検証
    if (!fromStatus || !toStatus) {
      throw new Error('Source and target status are required');
    }

    // ステータスが定義されているか確認
    if (!(fromStatus in ALLOWED_TRANSITIONS)) {
      throw new Error(`Unknown status: ${fromStatus}`);
    }
    if (!(toStatus in ALLOWED_TRANSITIONS)) {
      throw new Error(`Unknown status: ${toStatus}`);
    }

    // 遷移可能なステータスのリストを取得
    const allowedTransitions = ALLOWED_TRANSITIONS[fromStatus];

    // 遷移が許可されているか確認
    if (!allowedTransitions.includes(toStatus)) {
      throw new InvalidStatusTransitionError(fromStatus, toStatus);
    }
  }

  /**
   * トランジションステータスを更新
   * 
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param transitionId トランジションID
   * @param update 更新内容
   * @returns 更新後のトランジションデータ
   */
  async updateStatus(
    organizationId: string,
    projectId: string,
    methodId: string,
    transitionId: string,
    update: TransitionDataUpdate
  ): Promise<TransitionData> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query('BEGIN');

      // 1. トランジションIDからmethod_idとtask_noを取得
      const findResult = await client.query(
        `SELECT method_id, task_no, status 
         FROM transition_data 
         WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND transition_id = $4`,
        [organizationId, projectId, methodId, transitionId]
      );

      if (findResult.rows.length === 0) {
        const error: any = new Error('Transition not found');
        error.name = 'TransitionNotFoundError';
        throw error;
      }

      const { method_id, task_no, status: currentStatus } = findResult.rows[0];

      // 2. ステータス遷移ルールの検証
      this.validateStatusTransition(currentStatus, update.status);

      // 3. completedステータス時は進捗率を100%に自動設定
      const finalProgressRate = update.status === 'completed' 
        ? 100 
        : (update.progress_rate ?? 0);

      const finalUpdate = {
        status: update.status,
        progress_rate: finalProgressRate,
        updated_by: update.updated_by
      };

      // 4. トランジションステータスを更新
      const updatedTransition: TransitionDataRow = await this.transitionRepository.updateStatus(
        organizationId,
        projectId,
        method_id,
        task_no,
        transitionId,
        finalUpdate
      );

      // 5. イベントログを記録
      await this.eventLogRepository.logEvent(
        organizationId,
        projectId,
        {
          event_type: 'transition_status_update',
          method_id: method_id,
          task_no: task_no,
          transition_id: transitionId,
          status: update.status,
          progress_rate: finalProgressRate,
          comment: updatedTransition.comment || undefined,
          updated_by: update.updated_by,
          timestamp: new Date()
        },
        client
      );

      // 6. タスク進捗率を再計算
      const countResult = await client.query(
        `SELECT COUNT(*) as count 
         FROM transition_data 
         WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
        [organizationId, projectId, method_id, task_no]
      );
      const transitionCount = parseInt(countResult.rows[0].count, 10);

      const sumResult = await client.query(
        `SELECT COALESCE(SUM(progress_rate), 0) as sum 
         FROM transition_data 
         WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
        [organizationId, projectId, method_id, task_no]
      );
      const progressSum = parseInt(sumResult.rows[0].sum, 10);

      const taskProgressRate = transitionCount > 0 ? Math.round(progressSum / transitionCount) : 0;

      await client.query(
        `UPDATE project_task 
         SET progress_rate = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE organization_id = $2 AND project_id = $3 AND method_id = $4 AND task_no = $5`,
        [taskProgressRate, organizationId, projectId, method_id, task_no]
      );

      // トランザクションコミット
      await client.query('COMMIT');

      return updatedTransition as unknown as TransitionData;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
 * トランジションステータスを更新する（関数版）
 */
export async function updateStatus(
  organizationId: string,
  projectId: string,
  methodId: string,
  transitionId: string,
  update: TransitionDataUpdate
): Promise<TransitionData> {
  const service = new ExperimentDataService();
  return service.updateStatus(organizationId, projectId, methodId, transitionId, update);
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
