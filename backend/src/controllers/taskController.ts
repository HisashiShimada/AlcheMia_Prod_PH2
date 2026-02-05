/**
 * タスク管理コントローラー
 * 
 * @description タスクステータス更新などのリクエストハンドリング
 * Task: 2.1, 2.2 コントローラー層実装
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { updateTaskStatus as updateTaskStatusService, TaskService } from '../services/taskService';
import { TaskStatus } from '../types/taskService.types';
import { TaskFilters } from '../types/task';
import { TaskRepository } from '../repositories/taskRepository';
import { logger } from '../utils/logger';

// タスク一覧取得用のサービスインスタンス
const taskRepositoryInstance = new TaskRepository();
const taskServiceInstance = new TaskService(taskRepositoryInstance);

/**
 * エラーコードからHTTPステータスコードへのマッピング
 * 
 * @description サービス層のエラーコードを適切なHTTPステータスコードに変換
 * Task: 2.2 エラーハンドリング実装
 */
function mapErrorCodeToStatus(errorCode: string): number {
  const mapping: Record<string, number> = {
    // 4xx Client Errors
    'VALIDATION_INVALID_FORMAT': 400,
    'VALIDATION_INVALID_STATUS': 400,
    'VALIDATION_REQUIRED_FIELD': 400,
    'INVALID_STATUS_TRANSITION': 400,
    'AUTH_TOKEN_INVALID': 401,
    'PERMISSION_INSUFFICIENT': 403,
    'RESOURCE_NOT_FOUND': 404,
    'CONCURRENT_UPDATE_DETECTED': 409,
    
    // 5xx Server Errors
    'SYSTEM_DATABASE_ERROR': 500,
    'NOT_IMPLEMENTED': 501,
  };
  
  return mapping[errorCode] || 500;
}

/**
 * タスクステータス更新ハンドラー
 * 
 * @description タスクのステータスを更新する
 * Task: 2.1, 2.2 ステータス更新ハンドラーとロギングの実装
 */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // バリデーションはhandleValidationErrorsミドルウェアで処理済み
    // パラメータ抽出
    const { projectId, methodId, taskNo } = req.params;
    const { status, currentUpdateAt, comment } = req.body;
    const { organizationId, userId, role } = req.user!; // authミドルウェアで設定済み

    // バリデーション済みのため、直接数値変換
    const taskNoNum = parseInt(taskNo, 10);

    // サービス層呼び出し
    const result = await updateTaskStatusService(
      organizationId,
      projectId,
      methodId,
      taskNoNum,
      userId,
      role,
      status as TaskStatus,
      currentUpdateAt,
      comment
    );

    // エラーハンドリング
    if (!result.success) {
      const statusCode = mapErrorCodeToStatus(result.error!.code);
      
      // エラーログ記録
      logger.error('Task status update failed', {
        organizationId,
        userId,
        projectId,
        methodId,
        taskNo: taskNoNum,
        errorCode: result.error!.code,
        errorMessage: result.error!.message,
        requestId,
      });
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: result.error!.code,
          message: result.error!.message,
          details: result.error!.details,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 成功レスポンス
    // 成功ログ記録
    logger.info('Task status updated successfully', {
      organizationId,
      userId,
      projectId,
      methodId,
      taskNo: taskNoNum,
      status,
      ...(comment && { comment }),
      requestId,
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error) {
    // 予期しないエラーのハンドリング
    const err = error as Error;
    
    // 詳細なエラーログを記録（スタックトレース含む）
    logger.error('Task updateStatus unexpected error', {
      organizationId: req.user?.organizationId,
      userId: req.user?.userId,
      projectId: req.params.projectId,
      methodId: req.params.methodId,
      taskNo: parseInt(req.params.taskNo, 10),
      requestId,
      errorMessage: err.message,
      errorStack: err.stack,
    });
    
    // クライアントにはスタックトレースを含めない
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * タスク一覧取得ハンドラー
 * 
 * GET /api/v1/tasks
 * 
 * @description プロジェクト内の全タスクをメソッド単位でグループ化して取得
 * Feature: worker-task-list-api
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. バリデーション結果をチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      const error: any = new Error(firstError.msg);
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = errors.array().map(err => ({
        field: err.type === 'field' ? (err as any).path : 'unknown',
        message: err.msg,
        code: 'INVALID_VALUE',
      }));
      throw error;
    }

    // 2. organizationIdの検証（tenantIsolationミドルウェアから取得）
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      const error: any = new Error('Organization ID is required');
      error.statusCode = 401;
      throw error;
    }

    // 3. 必須パラメータ（projectId）の抽出
    const projectId = req.query.projectId as string;

    // 4. オプションパラメータの抽出
    const filters: TaskFilters = {
      methodId: req.query.methodId as string | undefined,
      status: req.query.status as any,
      assignUserId: req.query.assignUserId as string | undefined,
      sortBy: req.query.sortBy as any,
      order: req.query.order as any,
    };

    // 5. TaskServiceを呼び出してタスク一覧を取得
    const methodGroups = await taskServiceInstance.getTasksGroupedByMethod(
      projectId,
      organizationId,
      filters
    );

    // 6. requestIdを取得または生成
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // 7. 統一レスポンス形式で返却
    res.json({
      success: true,
      data: methodGroups,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    // 8. エラーハンドリングミドルウェアにスロー
    next(error);
  }
}
