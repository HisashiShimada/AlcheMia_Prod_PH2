/**
 * IssueController
 * 
 * @description 問題報告機能のリクエスト処理
 * Task 4.1: Controller層実装
 */

import { Request, Response } from 'express';
import { IssueService } from '../services/issueService';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';

/**
 * 問題作成エンドポイント
 * POST /api/v1/issues
 */
export async function create(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const issueService = new IssueService();

  try {
    const { organizationId, userId } = req.user!;
    const { projectId, methodId, issueType, targetType, taskNo, transitionId, title, description } = req.body;

    // Service層呼び出し
    const result = await issueService.create(organizationId, userId, {
      projectId,
      methodId,
      issueType,
      targetType,
      taskNo,
      transitionId,
      title,
      description,
    });

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      } else if (errorCode.startsWith('BUSINESS_')) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: result.error?.message || 'エラーが発生しました',
          details: result.error?.details,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 成功レスポンス（201 Created）
    res.status(201).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Issue create error', error as Error, {
      action: 'issue_create',
      organizationId: req.user?.organizationId,
      requestId,
    });

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
 * 問題一覧取得エンドポイント
 * GET /api/v1/issues
 */
export async function list(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const issueService = new IssueService();

  try {
    const { organizationId } = req.user!;

    // クエリパラメータの取得（API設計書に準拠）
    const filters = {
      projectId: req.query.projectId as string,
      methodId: req.query.methodId as string,
      taskNo: parseInt(req.query.taskNo as string, 10),
      transitionId: req.query.transitionId as string,
      status: req.query.status as string | undefined,
      issueType: req.query.issueType as string | undefined,
    };

    // Service層呼び出し（フィルタのみ渡す）
    const result = await issueService.list(organizationId, filters);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: result.error?.message || 'エラーが発生しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 成功レスポンス（ページネーションなし）
    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Issue list error', error as Error, {
      action: 'issue_list',
      organizationId: req.user?.organizationId,
      requestId,
    });

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
 * 問題詳細取得エンドポイント
 * GET /api/v1/issues/:issueId
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const issueService = new IssueService();

  try {
    // 認証チェック
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

    const { organizationId } = req.user;
    const { issueId } = req.params;

    // UUID形式バリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(issueId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'issueIdはUUID形式である必要があります',
          details: [{
            field: 'issueId',
            message: 'UUID形式が必要です',
            code: 'INVALID_FORMAT',
          }],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Service層呼び出し
    const result = await issueService.getById(organizationId, issueId);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: result.error?.message || 'エラーが発生しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Issue getById error', error as Error, {
      action: 'issue_getById',
      organizationId: req.user?.organizationId,
      issueId: req.params.issueId,
      requestId,
    });

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
 * 問題ステータス更新エンドポイント
 * PATCH /api/v1/issues/:issueId/status
 */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const issueService = new IssueService();

  try {
    const { organizationId, userId } = req.user!;
    const { issueId } = req.params;
    const { status } = req.body;

    // Service層呼び出し
    const result = await issueService.updateStatus(organizationId, issueId, userId, status);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      } else if (errorCode === 'PERMISSION_INSUFFICIENT') {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: result.error?.message || 'エラーが発生しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Issue updateStatus error', error as Error, {
      action: 'issue_updateStatus',
      organizationId: req.user?.organizationId,
      issueId: req.params.issueId,
      requestId,
    });

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
 * コメント追加エンドポイント
 * POST /api/v1/issues/:issueId/comments
 */
export async function addComment(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const issueService = new IssueService();

  try {
    const { organizationId, userId } = req.user!;
    const { issueId } = req.params;
    const { comment } = req.body;

    // Service層呼び出し
    const result = await issueService.addComment(organizationId, issueId, userId, comment);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: result.error?.message || 'エラーが発生しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 成功レスポンス（201 Created）
    res.status(201).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Issue addComment error', error as Error, {
      action: 'issue_addComment',
      organizationId: req.user?.organizationId,
      issueId: req.params.issueId,
      requestId,
    });

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