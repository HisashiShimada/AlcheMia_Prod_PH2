/**
 * ProgressController
 * 
 * 進捗データ取得APIのコントローラー
 * Task 5.1: getProgressDataメソッドの実装
 * 
 * 責務:
 * - HTTPリクエストのバリデーション（projectId, methodId, taskNo）
 * - ProgressServiceの呼び出しとエラーハンドリング
 * - 統一レスポンス形式への変換（success, data, meta）
 * - HTTPステータスコードの設定（200, 400, 401, 403, 404, 500）
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ProgressService } from '../services/progressService';

import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { TaskService } from '../services/taskService';
import { updateTaskStatus as updateTaskStatusService } from '../services/taskService';
import { TaskStatus } from '../types/taskService.types';
import { TaskFilters } from '../types/task';
import { getPool, getPgp } from '../database/db';
import { logger } from '../utils/logger';
import { TransitionDataUpdate } from '../types/transitionData';
import { loadSqlFile } from '../sql/loader';

/**
 * エラーコードからHTTPステータスコードへのマッピング
 */
function getHttpStatusFromErrorCode(errorCode: string): number {
  const statusMap: Record<string, number> = {
    'VALIDATION_ERROR': 400,
    'AUTH_TOKEN_MISSING': 401,
    'AUTH_TOKEN_INVALID': 401,
    'PERMISSION_DENIED': 403,
    'TASK_NOT_FOUND': 404,
    'METHOD_NOT_FOUND': 404,
    'MAIML_DOWNLOAD_FAILED': 500,
    'MAIML_PARSE_FAILED': 500,
    'DATABASE_ERROR': 500,
    'SYSTEM_ERROR': 500
  };

  return statusMap[errorCode] || 500;
}

/**
 * 進捗データ取得API
 * 
 * GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions
 * 
 * Requirements:
 * - Requirement 1: 進捗データ取得機能
 * - Requirement 6: エラーハンドリング
 * - Requirement 10: API仕様準拠
 */
export async function getProgressData(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    // レスポンスヘッダーの設定
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Request-Id', requestId);

    // パラメータの取得（バリデーションミドルウェアで検証済み）
    const { projectName, methodId, taskNo: taskNoStr } = req.params;
    const { organizationId } = req.user!;
    const taskNo = parseInt(taskNoStr, 10);

    logger.info('Progress data request received', {
      projectName,
      methodId,
      taskNo,
      organizationId,
      requestId
    });

    // Step 1: プロジェクト名からプロジェクトIDを取得
    const pgp = getPgp();
    const projectQuery = await loadSqlFile('projects/findByName.sql');
    const project = await pgp.oneOrNone(projectQuery, [projectName, organizationId]);

    if (!project) {
      logger.warn('Project not found', {
        projectName,
        organizationId,
        requestId
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        },
        meta: {
          timestamp,
          requestId
        }
      });
      return;
    }

    const projectId = project.project_id;

    // Step 2: ProgressServiceの呼び出し
    
    const transitionDataRepository = new TransitionDataRepository();
    const progressService = new ProgressService(transitionDataRepository);
    const result = await progressService.getProgressData(
      projectId,
      methodId,
      taskNo,
      organizationId
    );

    // 成功時のレスポンス
    if (result.success) {
      logger.info('Progress data retrieved successfully', {
        projectName,
        projectId,
        methodId,
        taskNo,
        transitionsCount: result.data.transitions.length,
        requestId
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          timestamp,
          requestId
        }
      });
      return;
    }

    // エラー時のレスポンス
    const errorCode = result.error.code;
    const statusCode = getHttpStatusFromErrorCode(errorCode);

    logger.error('Progress data retrieval failed', {
      errorCode,
      message: result.error.message,
      projectName,
      projectId,
      methodId,
      taskNo,
      requestId
    });

    res.status(statusCode).json({
      success: false,
      error: result.error,
      meta: {
        timestamp,
        requestId
      }
    });

  } catch (error) {
    // 予期しない例外のハンドリング
    logger.error('Unexpected error in getProgressData', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました'
      },
      meta: {
        timestamp,
        requestId
      }
    });
  }
}

/**
 * トランジションステータス更新API
 * 
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 * 
 * @description プロジェクト名、メソッドID、トランジションIDでトランジションを特定してステータスを更新
 * @note 旧エンドポイント（PUT /api/v1/experiments/...）から移動
 * @requirements API #6: トランジションステータス更新API（api_progress_monitoring.md）
 * @roles experiment_worker（書込可）
 */
export async function updateTransitionStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // リクエストパラメータとボディの抽出
    const { projectName, methodId, transitionId } = req.params;
    const { taskNo: _taskNo, status, progressRate, comment: _comment } = req.body;

    // 認証・認可情報の取得
    const organizationId = req.user?.organizationId;
    const updatedBy = req.user?.userId;

    // 必須パラメータの検証
    if (!organizationId) {
      const error: any = new Error('Organization ID is required');
      error.name = 'ValidationError';
      throw error;
    }

    if (!updatedBy) {
      const error: any = new Error('User authentication required');
      error.name = 'AuthenticationError';
      throw error;
    }

    // プロジェクト名からプロジェクトIDとステータスを取得
    const pool = getPool();
    const projectQuery = `
      SELECT project_id, project_name, project_status
      FROM project
      WHERE project_name = $1 AND organization_id = $2
    `;
    const projectResult = await pool.query(projectQuery, [projectName, organizationId]);

    if (projectResult.rowCount === 0) {
      const error: any = new Error('Project not found');
      error.name = 'ProjectNotFoundError';
      throw error;
    }

    const project = projectResult.rows[0];
    const projectId = project.project_id;

    // プロジェクトステータスが編集可能かチェック
    // 1: pending (タスク実行待ち), 2: in_progress (タスク実行中)
    const editableStatuses = [1, 2];
    const projectStatus = Number(project.project_status); // 文字列から数値に変換
    if (!editableStatuses.includes(projectStatus)) {
      const error: any = new Error('Project is not editable');
      error.name = 'ProjectNotEditableError';
      throw error;
    }

    // ステータス更新パラメータの作成
    const updateData: TransitionDataUpdate = {
      status,
      updated_by: updatedBy,
      ...(progressRate !== undefined && { progress_rate: progressRate }),
    };

    // サービス層を呼び出してステータス更新（commentをイベントログ用に渡す）
    const transitionDataRepository = new TransitionDataRepository();
    const progressService = new ProgressService(transitionDataRepository);
    
    const updatedTransitionData = await progressService.updateTransitionStatus(
      organizationId,
      projectId,
      methodId,
      transitionId,
      updateData,
      _comment ?? null
    );

    // 成功レスポンスを返す
    res.status(200).json({
      success: true,
      data: {
        transitionId: transitionId,
        taskNo: _taskNo,
        methodId: methodId,
        projectName: projectName,
        status: updatedTransitionData.status,
        progressRate: updatedTransitionData.progress_rate,
        comment: _comment || null,
        updatedBy: updatedBy,
        updatedAt: updatedTransitionData.updated_at
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
      },
    });
  } catch (error) {
    // エラーハンドリングミドルウェアに委譲
    next(error);
  }
}

/**
 * タスク一覧取得（実験作業者用）ハンドラー
 * 
 * GET /api/v1/progress/projects/:projectName/worker-tasks
 * 
 * @description プロジェクト内の全タスクをメソッド単位でグループ化して取得
 * API: api_progress_monitoring.md - API #4
 * @roles experiment_worker (読取専用)
 */
export async function getWorkerTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  try {
    // バリデーションはhandleValidationErrorsミドルウェアで処理済み
    const { organizationId } = req.user!;
    const { projectName } = req.params;

    // オプションクエリパラメータの抽出
    const filters: TaskFilters = {
      methodId: req.query.methodId as string | undefined,
      status: req.query.status as any,
      assignUserId: req.query.assignedTo as string | undefined,
      sortBy: req.query.sortBy as any,
      order: req.query.order as any,
    };

    // INFO: API呼び出し開始ログ
    logger.info('ProgressController.getWorkerTasks - Start', {
      action: 'get_worker_tasks',
      projectName,
      organizationId,
      filters,
      requestId,
    });

    const pgp = getPgp();

    // ステップ1: プロジェクト名からプロジェクトIDを取得
    const projectQuery = await loadSqlFile('projects/findByName.sql');
    const project = await pgp.oneOrNone(projectQuery, [projectName, organizationId]);

    if (!project) {
      logger.warn('ProgressController.getWorkerTasks - Project not found', {
        action: 'get_worker_tasks',
        projectName,
        organizationId,
        requestId,
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Project not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const projectId = project.project_id;

    // ステップ2: TaskServiceを使用してタスク一覧を取得
    
    const taskService = new TaskService();
    const methodGroups = await taskService.getTasksGroupedByMethod(
      projectId,
      organizationId,
      filters
    );

    // レスポンス作成
    const responseData = {
      project_id: projectId,
      project_name: projectName,
      methods: methodGroups,
    };

    // INFO: API呼び出し完了ログ
    const responseTime = Date.now() - startTime;
    const totalTasks = methodGroups.reduce((sum, group) => sum + group.tasks.length, 0);
    
    logger.info('ProgressController.getWorkerTasks - Success', {
      action: 'get_worker_tasks',
      projectName,
      organizationId,
      result: {
        methodCount: methodGroups.length,
        taskCount: totalTasks,
        responseTimeMs: responseTime,
      },
      requestId,
    });

    // 統一レスポンス形式で返却
    res.json({
      success: true,
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    // ERROR: データベースエラーまたは予期しない例外
    const responseTime = Date.now() - startTime;
    logger.error('ProgressController.getWorkerTasks - Error', {
      action: 'get_worker_tasks',
      projectName: req.params.projectName,
      organizationId: req.user?.organizationId,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    // エラーハンドリングミドルウェアに委譲
    next(error);
  }
}

/**
 * タスクステータス更新API
 * 
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status
 * 
 * @description プロジェクト名、メソッドID、タスク連番でタスクを特定してステータスを更新
 * @requirements API #5: タスクステータス更新API（新エンドポイント）
 */
export async function updateTaskStatus(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    // パラメータの取得（バリデーションミドルウェアで検証済み）
    const { projectName, methodId, taskNo: taskNoStr } = req.params;
    const { status, currentUpdatedAt, comment } = req.body;
    const { organizationId, userId } = req.user!;
    const taskNo = parseInt(taskNoStr, 10);

    logger.info('Task status update request received', {
      projectName,
      methodId,
      taskNo,
      status,
      organizationId,
      userId,
      requestId
    });

    // Step 1: プロジェクト名からプロジェクトIDと編集可能ステータスを取得
    const pgp = getPgp();
    const projectQuery = await loadSqlFile('projects/findByName.sql');
    const project = await pgp.oneOrNone(projectQuery, [projectName, organizationId]);

    if (!project) {
      logger.warn('Project not found', {
        projectName,
        organizationId,
        requestId
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        },
        meta: {
          timestamp,
          requestId
        }
      });
      return;
    }

    const projectId = project.project_id;

    // Step 2: プロジェクトステータスが編集可能かチェック
    // 1: pending (タスク実行待ち), 2: in_progress (タスク実行中)
    const editableStatuses = [1, 2];
    const projectStatus = Number(project.project_status); // 文字列から数値に変換
    if (!editableStatuses.includes(projectStatus)) {
      logger.warn('Project is not in editable status', {
        projectName,
        projectId,
        projectStatus: project.project_status,
        projectStatusType: typeof project.project_status,
        requestId
      });

      res.status(409).json({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: 'プロジェクトステータスが編集可能な状態ではありません'
        },
        meta: {
          timestamp,
          requestId
        }
      });
      return;
    }

    // Step 3: タスクステータス更新サービスを呼び出し
    const result = await updateTaskStatusService(
      organizationId,
      projectId,
      methodId,
      taskNo,
      userId,
      status as TaskStatus,
      currentUpdatedAt,
      comment
    );

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error!.code;
      
      // エラーコードからHTTPステータスコードへマッピング
      const statusCodeMap: Record<string, number> = {
        'VALIDATION_ERROR': 400,
        'VALIDATION_INVALID_FORMAT': 400,
        'VALIDATION_INVALID_STATUS': 400,
        'VALIDATION_REQUIRED_FIELD': 400,
        'INVALID_STATUS_TRANSITION': 400,
        'AUTH_TOKEN_INVALID': 401,
        'PERMISSION_INSUFFICIENT': 403,
        'RESOURCE_NOT_FOUND': 404,
        'CONCURRENT_UPDATE_DETECTED': 409,
        'SYSTEM_DATABASE_ERROR': 500,
        'DATABASE_ERROR': 500,
        'NOT_IMPLEMENTED': 501,
      };
      
      const statusCode = statusCodeMap[errorCode] || 500;

      logger.error('Task status update failed', {
        errorCode,
        message: result.error!.message,
        projectName,
        methodId,
        taskNo,
        requestId
      });

      res.status(statusCode).json({
        success: false,
        error: {
          code: result.error!.code,
          message: result.error!.message,
          details: result.error!.details
        },
        meta: {
          timestamp,
          requestId
        }
      });
      return;
    }

    // 成功レスポンス
    logger.info('Task status updated successfully', {
      projectName,
      methodId,
      taskNo,
      status,
      organizationId,
      userId,
      requestId
    });

    res.status(200).json({
      success: true,
      data: {
        task_no: result.data!.taskNo,
        project_name: result.data!.projectName,
        method_id: result.data!.methodId,
        previous_status: null, // taskServiceからは取得できないため、必要に応じて別途取得
        new_status: result.data!.taskStatus,
        updated_by: result.data!.experimentUserId,
        updated_by_name: result.data!.experimentUserName,
        updated_at: result.data!.updateAt,
        comment: comment || null
      },
      meta: {
        timestamp,
        requestId
      }
    });

  } catch (error) {
    // 予期しない例外のハンドリング
    logger.error('Unexpected error in updateTaskStatus', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました'
      },
      meta: {
        timestamp,
        requestId
      }
    });
  }
}
