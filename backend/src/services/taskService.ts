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
import { getPool } from '../database/db';
import { logger } from '../utils/logger';

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
  [TaskStatusEnum.PENDING]: [TaskStatusEnum.IN_PROGRESS],
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
  const pool = getPool();
  let client;

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

    // データベース接続とトランザクション開始
    client = await pool.connect();
    await client.query('BEGIN');

    // SELECT FOR UPDATE - タスクを排他ロック（JOINでproject_nameとuser_nameを取得）
    const selectQuery = `
      SELECT 
        pt.organization_id,
        pt.project_id,
        p.project_name,
        pt.method_id,
        pt.task_no,
        pt.task_status,
        pt.update_at,
        pt.experiment_user_id,
        ou.user_name as experiment_user_name
      FROM project_task pt
      LEFT JOIN project p 
        ON p.project_id = pt.project_id 
        AND p.organization_id = pt.organization_id
      LEFT JOIN organization_user ou
        ON ou.user_id = pt.experiment_user_id
        AND ou.organization_id = pt.organization_id
      WHERE pt.organization_id = $1
        AND pt.project_id = $2
        AND pt.method_id = $3
        AND pt.task_no = $4
      FOR UPDATE
    `;

    const selectResult = await client.query(selectQuery, [
      params.organizationId,
      params.projectId,
      params.methodId,
      params.taskNo
    ]);

    // タスクが存在しない場合
    if (selectResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Task not found'
        }
      };
    }

    const currentTask = selectResult.rows[0];

    // マルチテナント分離: organization_idの一致を検証
    // system_admin以外は同じ組織のタスクのみアクセス可能
    // 403ではなく404を返すことで他組織のデータ存在を隠蔽
    if ( currentTask.organization_id !== params.organizationId) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Task not found'
        }
      };
    }

    // TaskStatus文字列を数値に変換
    const statusStringToNumber: Record<TaskStatus, number> = {
      'pending': TaskStatusEnum.PENDING,
      'in_progress': TaskStatusEnum.IN_PROGRESS,
      'completed': TaskStatusEnum.COMPLETED,
      'forced_terminated': TaskStatusEnum.FORCED_TERMINATED
    };

    const newStatusNum = statusStringToNumber[params.status];
    if (newStatusNum === undefined) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status value'
        }
      };
    }

    // ステータス遷移バリデーション
    const transitionResult = validateTransition(currentTask.task_status, newStatusNum);
    if (!transitionResult.isValid) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: transitionResult.error
      };
    }

    // // 権限チェック
    // const permissionResult = checkPermission(
    //   params.userId,
    //   params.role,
    //   currentTask.experiment_user_id,
    //   params.organizationId,
    //   currentTask.organization_id
    // );
    // if (!permissionResult.isValid) {
    //   await client.query('ROLLBACK');
    //   return {
    //     success: false,
    //     error: permissionResult.error
    //   };
    // }

    // 楽観的ロックチェック: UPDATE文にupdate_at条件を追加
    const updateQuery = `
      UPDATE project_task
      SET 
        task_status = $1,
        experiment_start_at = CASE 
          WHEN $1 = ${TaskStatusEnum.IN_PROGRESS} AND experiment_start_at IS NULL 
          THEN NOW() 
          ELSE experiment_start_at 
        END,
        experiment_end_at = CASE 
          WHEN $1 = ${TaskStatusEnum.COMPLETED} 
          THEN NOW() 
          ELSE experiment_end_at 
        END,
        update_at = NOW()
      WHERE organization_id = $2
        AND project_id = $3
        AND method_id = $4
        AND task_no = $5
        AND update_at = $6
      RETURNING 
        organization_id,
        project_id,
        method_id,
        task_no,
        task_status,
        experiment_user_id,
        experiment_start_at,
        experiment_end_at,
        update_at
    `;

    const updateResult = await client.query(updateQuery, [
      newStatusNum,  // 数値のステータスを使用
      params.organizationId,
      params.projectId,
      params.methodId,
      params.taskNo,
      params.currentUpdateAt
    ]);

    // 楽観的ロック失敗: update_atが一致せず更新できなかった
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: {
          code: 'CONCURRENT_UPDATE_DETECTED',
          message: 'Concurrent update detected. Please fetch the latest data and retry.'
        }
      };
    }

    // トランザクションコミット
    await client.query('COMMIT');

    const updatedTask = updateResult.rows[0];

    // レスポンス作成（TaskStatusResponseに変換）
    const statusMap: Record<number, TaskStatus> = {
      [TaskStatusEnum.PENDING]: 'pending',
      [TaskStatusEnum.IN_PROGRESS]: 'in_progress',
      [TaskStatusEnum.COMPLETED]: 'completed',
      [TaskStatusEnum.FORCED_TERMINATED]: 'forced_terminated'
    };

    return {
      success: true,
      data: {
        organizationId: updatedTask.organization_id,
        projectId: updatedTask.project_id,
        projectName: currentTask.project_name || '',
        methodId: updatedTask.method_id,
        taskNo: updatedTask.task_no,
        taskStatus: statusMap[updatedTask.task_status] || 'pending',
        experimentUserId: updatedTask.experiment_user_id,
        experimentUserName: currentTask.experiment_user_name || null,
        experimentStartAt: updatedTask.experiment_start_at,
        experimentEndAt: updatedTask.experiment_end_at,
        updateAt: updatedTask.update_at
      }
    };

  } catch (error) {
    // エラー発生時はロールバック
    if (client) {
      await client.query('ROLLBACK');
    }

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update task status',
        originalError: error as Error
      }
    };
  } finally {
    // 接続を必ずリリース
    if (client) {
      client.release();
    }
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

      // データ整合性検証（不正なデータを除外）
      const validRecords = this.validateDataConsistency(records, projectId, organizationId);

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

    // UUID形式の正規表現（すべてのバージョンを受け入れる: 8-4-4-4-12の形式）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const record of records) {
      // method_idの検証
      if (!record.method_id || 
          typeof record.method_id !== 'string' || 
          !uuidRegex.test(record.method_id)) {
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
   * 
   * @param record - DBから取得したレコード
   * @returns TaskSummary
   */
  private convertToTaskSummary(record: MethodTaskRecord): TaskSummary {
    return {
      task_id: record.task_detail_id!,
      task_no: record.task_detail_no!,
      task_status: record.task_status!,
      assign_user_id: record.assign_user_id,
      assign_user_name: record.assign_user_name,
      progress_rate: record.progress_rate,
      created_at: record.created_at ? record.created_at.toISOString() : '',
      updated_at: record.updated_at ? record.updated_at.toISOString() : '',
    };
  }
}
