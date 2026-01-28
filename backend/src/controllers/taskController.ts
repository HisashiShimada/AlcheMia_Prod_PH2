/**
 * タスク管理コントローラー
 * 
 * @description タスクステータス更新などのリクエストハンドリング
 * Task: 2.1, 2.2 コントローラー層実装
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { updateTaskStatus as updateTaskStatusService } from '../services/taskService';
import { TaskStatus } from '../types/taskService.types';
import { logger } from '../utils/logger';

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
    // express-validatorのバリデーション結果をチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      
      // バリデーションエラーのログ記録
      logger.error('Task status update validation failed', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: firstError.msg,
        requestId,
      });
      
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.msg,
          details: errors.array().map(err => ({
            field: err.type === 'field' ? (err as any).path : 'unknown',
            message: err.msg,
            code: 'INVALID_VALUE',
          })),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 1. 認証チェック
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 2. パラメータ抽出
    const { projectId, methodId, taskNo } = req.params;
    const { status, currentUpdateAt, comment } = req.body;
    const { organizationId, userId, role } = req.user;

    // 3. UUID形式バリデーション（projectId）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      // バリデーションエラーのログ記録
      logger.error('Task status update validation failed', {
        errorCode: 'VALIDATION_INVALID_FORMAT',
        errorMessage: 'projectIdはUUID形式である必要があります',
        requestId,
      });
      
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'projectIdはUUID形式である必要があります',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 4. taskNo数値バリデーション
    const taskNoNum = parseInt(taskNo, 10);
    if (isNaN(taskNoNum) || taskNoNum < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'taskNoは1以上の数値である必要があります',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 5. サービス層呼び出し
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

    // 6. エラーハンドリング
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

    // 7. 成功レスポンス
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
    // 8. 予期しないエラーのハンドリング
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