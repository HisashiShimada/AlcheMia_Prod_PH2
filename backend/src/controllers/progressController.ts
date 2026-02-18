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

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ProgressService } from '../services/progressService';
import { TaskRepository } from '../repositories/taskRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { updateTaskStatus as updateTaskStatusService } from '../services/taskService';
import { TaskStatus } from '../types/taskService.types';
import { getPool } from '../database/db';
import { logger } from '../utils/logger';

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
 * GET /api/v1/progress/:projectId/:methodId/:taskNo
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
    const { projectId, methodId, taskNo: taskNoStr } = req.params;
    const { organizationId } = req.user!;
    const taskNo = parseInt(taskNoStr, 10);

    logger.info('Progress data request received', {
      projectId,
      methodId,
      taskNo,
      organizationId,
      requestId
    });

    // ProgressServiceの呼び出し
    const taskRepository = new TaskRepository();
    const transitionDataRepository = new TransitionDataRepository();
    const progressService = new ProgressService(taskRepository, transitionDataRepository);
    const result = await progressService.getProgressData(
      projectId,
      methodId,
      taskNo,
      organizationId
    );

    // 成功時のレスポンス
    if (result.success) {
      logger.info('Progress data retrieved successfully', {
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
    const pool = getPool();
    const projectQuery = `
      SELECT project_id, project_name, project_status
      FROM project
      WHERE project_name = $1 AND organization_id = $2
    `;
    const projectResult = await pool.query(projectQuery, [projectName, organizationId]);

    if (projectResult.rowCount === 0) {
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

    const project = projectResult.rows[0];
    const projectId = project.project_id;

    // Step 2: プロジェクトステータスが編集可能かチェック
    const editableStatuses = ['draft', 'active'];
    if (!editableStatuses.includes(project.project_status)) {
      logger.warn('Project is not in editable status', {
        projectName,
        projectId,
        projectStatus: project.project_status,
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
