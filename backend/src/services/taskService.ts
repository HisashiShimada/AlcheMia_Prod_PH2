/**
 * タスクサービス
 * 
 * @description タスクステータス更新のビジネスロジック
 * Task: 2.1 コントローラー層実装（スタブ）
 * Task: 3.1 ステータス遷移バリデーター実装
 * Task: 3.2 権限チェックロジック実装
 */

import { TaskStatus, TaskStatusResponse, ServiceResult, UpdateTaskStatusParams } from '../types/taskService.types';
import { MethodGroup, TaskSummary, TaskFilters, MethodTaskRecord } from '../types/task';
import { TaskRepository } from '../repositories/taskRepository';
import { getPgp } from '../database/db';
import { logger } from '../utils/logger';
import { loadSqlFile } from '../sql/loader';

/**
 * タスクステータスのEnum定義（データベース値）
 * @description データベースのtask_statusカラムに対応する数値
 */
export const TaskStatusEnum = {
  PENDING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 3,
  FORCED_TERMINATED: 4
} as const;

/**
 * TaskStatusEnumの型定義
 */
export type TaskStatusEnumType = typeof TaskStatusEnum[keyof typeof TaskStatusEnum];

/**
 * 有効な状態遷移のマッピング
 * @description キー: 現在のステータス、値: 遷移可能なステータスの配列
 */
const VALID_TRANSITIONS: Record<number, number[]> = {
  [TaskStatusEnum.PENDING]: [TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.FORCED_TERMINATED],
  [TaskStatusEnum.IN_PROGRESS]: [TaskStatusEnum.COMPLETED, TaskStatusEnum.FORCED_TERMINATED],
  [TaskStatusEnum.COMPLETED]: [],
  [TaskStatusEnum.FORCED_TERMINATED]: []
};

/**
 * バリデーション結果の型
 */
export interface ValidationResult {
  isValid: boolean;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * バリデーション結果の型（互換性のため）
 */
export interface TransitionValidationResult extends ValidationResult {}

/**
 * ステータス遷移の妥当性を検証する
 * 
 * @param currentStatus 現在のステータス（数値）
 * @param newStatus 新しいステータス（数値）
 * @returns バリデーション結果
 */
export function validateTransition(
  currentStatus: number,
  newStatus: number
): TransitionValidationResult {
  // 同じステータスへの遷移は不可
  if (currentStatus === newStatus) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Invalid status transition: Cannot transition to the same status`
      }
    };
  }

  // 定義されていないステータスの場合
  const validTransitions = VALID_TRANSITIONS[currentStatus];
  if (!validTransitions) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Invalid status transition: Unknown current status ${currentStatus}`
      }
    };
  }

  // 許可された遷移かチェック
  if (!validTransitions.includes(newStatus)) {
    const statusNames: Record<number, string> = {
      [TaskStatusEnum.PENDING]: 'PENDING',
      [TaskStatusEnum.IN_PROGRESS]: 'IN_PROGRESS',
      [TaskStatusEnum.COMPLETED]: 'COMPLETED',
      [TaskStatusEnum.FORCED_TERMINATED]: 'FORCED_TERMINATED'
    };

    const currentName = statusNames[currentStatus] || 'UNKNOWN';
    const newName = statusNames[newStatus] || 'UNKNOWN';

    return {
      isValid: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Invalid status transition: Cannot transition from ${currentName} to ${newName}`
      }
    };
  }

  return { isValid: true };
}

// TODO role⇒roleCd
// /**
//  * ロールベースアクセス制御による権限チェック
//  * 
//  * @param userId リクエストユーザーのID
//  * @param role リクエストユーザーのロール
//  * @param experimentUserId タスクに割り当てられたユーザーID（nullの場合は未割り当て）
//  * @param userOrganizationId リクエストユーザーの組織ID
//  * @param taskOrganizationId タスクの組織ID
//  * @returns バリデーション結果
//  */
// export function checkPermission(
//   userId: string,
//   role: string,
//   experimentUserId: string | null,
//   userOrganizationId: string,
//   taskOrganizationId: string
// ): ValidationResult {
//   // system_admin: すべてのタスクにアクセス可能（クロステナントアクセス許可）
//   if (role === 'system_admin') {
//     return { isValid: true };
//   }

//   // experiment_admin: 組織内のすべてのタスクにアクセス可能
//   if (role === 'experiment_admin') {
//     if (userOrganizationId === taskOrganizationId) {
//       return { isValid: true };
//     }
//   }

//   // experiment_worker: 自分に割り当てられたタスクのみアクセス可能
//   if (role === 'experiment_worker') {
//     if (experimentUserId === userId && userOrganizationId === taskOrganizationId) {
//       return { isValid: true };
//     }

//     return {
//       isValid: false,
//       error: {
//         code: 'PERMISSION_INSUFFICIENT',
//         message: 'Permission denied: experiment_worker can only update tasks assigned to them'
//       }
//     };
//   }

  // // その他のロールはタスクステータス更新の権限なし
  // return {
  //   isValid: false,
  //   error: {
  //     code: 'PERMISSION_INSUFFICIENT',
  //     message: `Permission denied: Role '${role}' is not authorized to update task status`
  //   }
  // };
// }

/**
 * タスクステータスを更新する
 * 
 * @description タスクのステータスを更新し、関連するタイムスタンプを設定する（楽観的ロック制御付き）
 * Task 3.3: 楽観的ロック制御実装
 */
export async function updateTaskStatus(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  userId: string,
  status: TaskStatus,
  currentUpdateAt: string,
  comment?: string
): Promise<ServiceResult<TaskStatusResponse>> {
  // パラメータオブジェクトを作成
  const params: UpdateTaskStatusParams = {
    organizationId,
    projectId,
    methodId,
    taskNo,
    userId,
    status,
    currentUpdateAt,
    comment
  };

  try {
    // 入力バリデーション
    if (!params.currentUpdateAt) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'currentUpdateAt is required'
        }
      };
    }

    // ISO8601形式のバリデーション
    const dateTest = new Date(params.currentUpdateAt);
    if (isNaN(dateTest.getTime())) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'currentUpdateAt must be a valid ISO8601 date'
        }
      };
    }

    // TaskStatus文字列を数値に変換
    const statusStringToNumber: Record<TaskStatus, number> = {
      'not_started': TaskStatusEnum.PENDING,
      'in_progress': TaskStatusEnum.IN_PROGRESS,
      'completed': TaskStatusEnum.COMPLETED,
      'forced_terminated': TaskStatusEnum.FORCED_TERMINATED
    };

    const newStatusNum = statusStringToNumber[params.status];
    if (newStatusNum === undefined) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status value'
        }
      };
    }

    // pg-promiseインスタンスを取得してトランザクション実行
    const pgp = getPgp();
    
    // SQLファイルを事前に読み込み
    const selectQuery = await loadSqlFile('tasks/findByIdForUpdate.sql');
    const updateQuery = await loadSqlFile('tasks/updateStatus.sql');

    // トランザクション処理
    const result = await pgp.tx(async t => {
      // SELECT FOR UPDATE - タスクを排他ロック
      const currentTask = await t.oneOrNone(selectQuery, [
        params.organizationId,
        params.projectId,
        params.methodId,
        params.taskNo
      ]);

      // タスクが存在しない場合
      if (!currentTask) {
        throw {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Task not found'
        };
      }

      // マルチテナント分離: organization_idの一致を検証
      if (currentTask.organization_id !== params.organizationId) {
        throw {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Task not found'
        };
      }

      // ステータス遷移バリデーション
      const transitionResult = validateTransition(currentTask.task_status, newStatusNum);
      if (!transitionResult.isValid) {
        throw transitionResult.error;
      }

      // デバッグログ: 楽観的ロック用の比較値を出力
      logger.info('updateTaskStatus - Optimistic lock comparison', {
        currentUpdateAt_from_request: params.currentUpdateAt,
        currentUpdateAt_from_db: currentTask.update_at,
        currentUpdateAt_db_iso: currentTask.update_at ? new Date(currentTask.update_at).toISOString() : null,
        taskInfo: {
          organizationId: params.organizationId,
          projectId: params.projectId,
          methodId: params.methodId,
          taskNo: params.taskNo
        }
      });

      // UPDATE実行（楽観的ロックチェック含む）
      const updatedTask = await t.oneOrNone(updateQuery, [
        newStatusNum,
        params.organizationId,
        params.projectId,
        params.methodId,
        params.taskNo,
        params.currentUpdateAt,
        TaskStatusEnum.IN_PROGRESS,  // $7: CASE文用
        TaskStatusEnum.COMPLETED,    // $8: CASE文用
        params.userId                // $9: 実験作業者ID
      ]);

      // 楽観的ロック失敗: update_atが一致せず更新できなかった
      if (!updatedTask) {
        logger.error('updateTaskStatus - Optimistic lock failed', {
          currentUpdateAt_sent: params.currentUpdateAt,
          currentUpdateAt_in_db: currentTask.update_at,
          taskInfo: {
            organizationId: params.organizationId,
            projectId: params.projectId,
            methodId: params.methodId,
            taskNo: params.taskNo
          }
        });
        
        throw {
          code: 'CONCURRENT_UPDATE_DETECTED',
          message: 'Concurrent update detected. Please fetch the latest data and retry.'
        };
      }

      // 成功時のレスポンスデータを返す
      return {
        currentTask,
        updatedTask
      };
    });

    // レスポンス作成（TaskStatusResponseに変換）
    const statusMap: Record<number, TaskStatus> = {
      [TaskStatusEnum.PENDING]: 'not_started',
      [TaskStatusEnum.IN_PROGRESS]: 'in_progress',
      [TaskStatusEnum.COMPLETED]: 'completed',
      [TaskStatusEnum.FORCED_TERMINATED]: 'forced_terminated'
    };

    return {
      success: true,
      data: {
        organizationId: result.updatedTask.organization_id,
        projectId: result.updatedTask.project_id,
        projectName: result.currentTask.project_name || '',
        methodId: result.updatedTask.method_id,
        taskNo: result.updatedTask.task_no,
        taskStatus: statusMap[result.updatedTask.task_status] || 'pending',
        experimentUserId: result.updatedTask.experiment_user_id,
        experimentUserName: result.currentTask.experiment_user_name || null,
        experimentStartAt: result.updatedTask.experiment_start_at,
        experimentEndAt: result.updatedTask.experiment_end_at,
        updateAt: result.updatedTask.update_at
      }
    };

  } catch (error: any) {
    // pg-promiseのトランザクションエラーまたはカスタムエラー
    if (error.code) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update task status',
        originalError: error as Error
      }
    };
  }
}

/**
 * TaskServiceクラス（タスク一覧取得用）
 * 
 * タスクの取得、グループ化、変換を担当
 * Feature: worker-task-list-api
 */
export class TaskService {
  constructor(private taskRepository: TaskRepository) {}

  /**
   * プロジェクト内のタスクをメソッド単位でグループ化して取得
   * 
   * @param projectId - プロジェクトID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param filters - フィルタ条件
   * @returns メソッド単位にグループ化されたタスク一覧
   */
  async getTasksGroupedByMethod(
    projectId: string,
    organizationId: string,
    filters: TaskFilters
  ): Promise<MethodGroup[]> {
    const startTime = Date.now();

    // INFO: API呼び出し開始ログ
    logger.info('TaskService.getTasksGroupedByMethod - Start', {
      action: 'get_tasks_grouped_by_method',
      projectId,
      organizationId,
      filters: {
        methodId: filters.methodId,
        status: filters.status,
        assignUserId: filters.assignUserId,
        sortBy: filters.sortBy,
        order: filters.order,
      },
    });

    try {
      // TaskRepositoryからデータ取得
      const records = await this.taskRepository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // DEBUG: レコード数をログ出力
      logger.info('TaskService.getTasksGroupedByMethod - Records fetched', {
        action: 'get_tasks_grouped_by_method',
        projectId,
        organizationId,
        recordCount: records.length,
        sampleRecord: records.length > 0 ? records[0] : null,
      });

      // データ整合性検証（不正なデータを除外）
      const validRecords = this.validateDataConsistency(records, projectId, organizationId);

      // DEBUG: 検証後のレコード数をログ出力
      logger.info('TaskService.getTasksGroupedByMethod - After validation', {
        action: 'get_tasks_grouped_by_method',
        projectId,
        organizationId,
        validRecordCount: validRecords.length,
        invalidRecordCount: records.length - validRecords.length,
      });

      // method_id単位でグループ化
      const methodMap = new Map<string, MethodGroup>();

      for (const record of validRecords) {
        // タスクが存在しない場合はスキップ（メソッドのみのレコード）
        if (!record.task_detail_id) {
          // メソッド情報のみ保存（タスクなし）
          if (!methodMap.has(record.method_id)) {
            methodMap.set(record.method_id, {
              method_id: record.method_id,
              method_name: record.method_name,
              experiment_order: record.experiment_order,
              tasks: [],
            });
          }
          continue;
        }

        // メソッドグループがまだない場合は作成
        if (!methodMap.has(record.method_id)) {
          methodMap.set(record.method_id, {
            method_id: record.method_id,
            method_name: record.method_name,
            experiment_order: record.experiment_order,
            tasks: [],
          });
        }

        // タスクサマリーを作成して追加
        const methodGroup = methodMap.get(record.method_id)!;
        methodGroup.tasks.push(this.convertToTaskSummary(record));
      }

      // MethodGroupの配列に変換し、experiment_order順にソート
      const methodGroups = Array.from(methodMap.values());
      methodGroups.sort((a, b) => a.experiment_order - b.experiment_order);

      // タスク件数の集計
      const totalTasks = methodGroups.reduce((sum, group) => sum + group.tasks.length, 0);

      // INFO: API呼び出し完了ログ
      const responseTime = Date.now() - startTime;
      logger.info('TaskService.getTasksGroupedByMethod - Success', {
        action: 'get_tasks_grouped_by_method',
        projectId,
        organizationId,
        result: {
          methodCount: methodGroups.length,
          taskCount: totalTasks,
          responseTimeMs: responseTime,
        },
      });

      return methodGroups;
    } catch (error) {
      // ERROR: データベースエラーまたは予期しない例外
      const responseTime = Date.now() - startTime;
      logger.error('TaskService.getTasksGroupedByMethod - Error', {
        action: 'get_tasks_grouped_by_method',
        projectId,
        organizationId,
        responseTimeMs: responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
      });

      // エラーを再スロー（Controllerのエラーハンドリングで処理）
      throw error;
    }
  }

  /**
   * データ整合性を検証し、不正なデータを除外する
   * 
   * @param records - DBから取得したレコード配列
   * @param projectId - プロジェクトID（ログ記録用）
   * @param organizationId - 組織ID（ログ記録用）
   * @returns 検証済みのレコード配列
   */
  private validateDataConsistency(
    records: MethodTaskRecord[],
    projectId: string,
    organizationId: string
  ): MethodTaskRecord[] {
    const validRecords: MethodTaskRecord[] = [];
    const invalidRecords: MethodTaskRecord[] = [];

    for (const record of records) {
      // method_idの検証（character varying型なので文字列であればOK）
      if (!record.method_id || 
          typeof record.method_id !== 'string' ||
          record.method_id.trim() === '') {
        invalidRecords.push(record);
        continue;
      }

      // 検証済み
      validRecords.push(record);
    }

    // 不正なデータが見つかった場合、警告ログを出力
    if (invalidRecords.length > 0) {
      logger.warn('Data inconsistency detected: Invalid method_id found in project tasks', {
        projectId,
        organizationId,
        invalidCount: invalidRecords.length,
        totalCount: records.length,
        invalidMethodIds: invalidRecords.map(r => ({
          method_id: r.method_id,
          method_name: r.method_name,
          task_detail_id: r.task_detail_id,
        })),
      });
    }

    return validRecords;
  }

  /**
   * MethodTaskRecordをTaskSummaryに変換
   * 日時フィールドをISO 8601形式に変換
   * データベースの数値ステータスを文字列ステータスに変換
   * 
   * @param record - DBから取得したレコード
   * @returns TaskSummary
   */
  private convertToTaskSummary(record: MethodTaskRecord): TaskSummary {
    // データベースの数値ステータスを文字列ステータスに変換
    const statusMap: Record<number, TaskStatus> = {
      0: 'not_started',      // PENDING → not_started
      1: 'in_progress',      // IN_PROGRESS → in_progress
      3: 'completed',        // COMPLETED → completed
      4: 'forced_terminated' // FORCED_TERMINATED → forced_terminated
    };
    
    // デバッグログ: 受け取ったステータス値を出力
    logger.debug('convertToTaskSummary - status conversion', {
      task_detail_id: record.task_detail_id,
      task_status_raw: record.task_status,
      task_status_type: typeof record.task_status,
      task_status_is_null: record.task_status === null
    });
    
    // record.task_statusがnullの場合はデフォルト値を使用
    let taskStatus: TaskStatus = 'not_started';
    
    if (record.task_status !== null && record.task_status !== undefined) {
      if (typeof record.task_status === 'number') {
        // 数値の場合
        const mapped = statusMap[record.task_status];
        if (mapped) {
          taskStatus = mapped;
        } else {
          logger.warn('Unknown task_status value (number)', {
            task_detail_id: record.task_detail_id,
            task_status: record.task_status
          });
        }
      } else if (typeof record.task_status === 'string') {
        // 文字列の場合：数値文字列("0", "1", "3", "4")を数値に変換してマッピング
        const numericStatus = parseInt(record.task_status, 10);
        if (!isNaN(numericStatus)) {
          const mapped = statusMap[numericStatus];
          if (mapped) {
            taskStatus = mapped;
          } else {
            logger.warn('Unknown task_status value (string numeric)', {
              task_detail_id: record.task_detail_id,
              task_status: record.task_status,
              parsed_value: numericStatus
            });
          }
        } else {
          // 数値に変換できない文字列の場合はそのままTaskStatusとして使用
          taskStatus = record.task_status as TaskStatus;
        }
      }
    }
    
    // デバッグログ: 変換後のステータスを出力
    logger.debug('convertToTaskSummary - converted status', {
      task_detail_id: record.task_detail_id,
      converted_status: taskStatus
    });

    return {
      task_id: record.task_detail_id!,
      task_no: record.task_detail_no!,
      task_status: taskStatus,
      assign_user_id: record.assign_user_id,
      assign_user_name: record.assign_user_name,
      progress_rate: record.progress_rate,
      created_at: record.created_at ? record.created_at.toISOString() : '',
      updated_at: record.updated_at ? record.updated_at.toISOString() : '',
    };
  }
}
