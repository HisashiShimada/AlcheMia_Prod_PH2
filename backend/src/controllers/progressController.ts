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
