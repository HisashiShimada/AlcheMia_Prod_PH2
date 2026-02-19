/**
 * ProjectController
 * 
 * @description プロジェクト一覧取得のリクエスト処理
 * Task: 2.1, 2.2, 2.3 Controller層実装
 */

import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';

/**
 * プロジェクト作成エンドポイント
 * POST /api/v1/projects
 * 
 * Task 2.1-2.4: Controller層実装
 */
export async function create(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId, userId } = req.user!;
    const departmentId = null; // req.session?.department_id || null; ToDo プルリク#38待ち
    const { projectName, description } = req.body;

    // 権限チェック（Workerは403）
    if ((req.user as any).role === 'experiment_worker') {
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: '権限が不足しています',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Task 2.3: Service層呼び出し
    const result = await projectService.create(organizationId, userId, departmentId, {
      projectName,
      description,
    });

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'BUSINESS_DUPLICATE_PROJECT_NAME') {
        statusCode = 409;
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
    // Task 2.4: エラーハンドリングとロギング
    logError('Project create error', error as Error, {
      action: 'project_create',
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
 * プロジェクトタスク一覧取得エンドポイント
 * GET /api/v1/projects/:projectName/tasks
 * 
 * Task 3.2: Controller層実装
 */
export async function getProjectTasks(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    console.log('[DEBUG] getProjectTasks - Start', { requestId, params: req.params, query: req.query });
    
    const { organizationId } = req.user!;
    const { projectName } = req.params;
    
    console.log('[DEBUG] getProjectTasks - Auth OK', { organizationId, projectName });

    // projectNameからprojectIdを取得
    const { getPool } = require('../database/db');
    const pool = getPool();
    const projectQuery = 'SELECT project_id FROM project WHERE organization_id = $1 AND project_name = $2';
    const projectResult = await pool.query(projectQuery, [organizationId, projectName]);
    
    if (projectResult.rows.length === 0) {
      console.log('[DEBUG] getProjectTasks - Project not found', { projectName });
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }
    
    const projectId = projectResult.rows[0].project_id;
    console.log('[DEBUG] getProjectTasks - Project ID resolved', { projectName, projectId });

    const status = (req.query.status as string) || 'all';

    // Service層呼び出し
    const result = await projectService.getProjectTasks(
      organizationId,
      projectId,
      status as 'all' | 'pending' | 'in_progress' | 'completed' | 'failed'
    );

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
    logError('Project getProjectTasks error', error as Error, {
      action: 'project_getProjectTasks',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
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
 * プロジェクトMAIML取得エンドポイント
 * GET /api/v1/projects/:projectId/maiml
 * 
 * Task 1.1 (P): projectRoutesにMAIML取得エンドポイントを追加
 * Requirements: REQ-1, REQ-2, REQ-4, REQ-5, REQ-7
 */
export async function getProjectMaiml(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    // バリデーションはミドルウェアで処理済み
    const { organizationId } = req.user!;
    const { projectId } = req.params;

    // Service層呼び出し
    const result = await projectService.getProjectMaiml(organizationId, projectId);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode === 'FILE_NOT_FOUND') {
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
    logError('Project getProjectMaiml error', error as Error, {
      action: 'project_getProjectMaiml',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
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
 * プロジェクト詳細取得エンドポイント
 * GET /api/v1/projects/:projectId
 * 
 * Task 2.1: Controller層実装
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId } = req.user!;
    const { projectId } = req.params;

    // Service層呼び出し
    const result = await projectService.getById(organizationId, projectId);

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
    logError('Project getById error', error as Error, {
      action: 'project_getById',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
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
 * プロジェクトチェックアウトエンドポイント
 * POST /api/v1/projects/:projectId/checkout
 * 
 * Task 2.1: チェックアウトハンドラの実装
 * Requirements: FR-1.1, FR-1.2, NFR-2
 */
export async function checkout(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId, userId } = req.user!;
    const { projectId } = req.params;

    // Service層呼び出し
    const result = await projectService.checkout(organizationId, projectId, userId);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      // ステータスコードマッピング
      if (errorCode === 'PROJECT_ALREADY_CHECKED_OUT') {
        statusCode = 409;
      } else if (errorCode === 'PROJECT_STATUS_INVALID' || errorCode === 'PROJECT_INSTRUCTION_NOT_FOUND') {
        statusCode = 400;
      } else if (errorCode === 'PERMISSION_INSUFFICIENT') {
        statusCode = 403;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      } else if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
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
    logError('Project checkout error', error as Error, {
      action: 'project_checkout',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
      userId: req.user?.userId,
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
 * プロジェクトチェックインエンドポイント
 * POST /api/v1/projects/:projectId/checkin
 * 
 * Task 2.2: チェックインハンドラの実装
 * Requirements: FR-2.1, NFR-2
 */
export async function checkin(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId, userId } = req.user!;
    const { projectId } = req.params;

    // Service層呼び出し
    const result = await projectService.checkin(organizationId, projectId, userId);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      // ステータスコードマッピング
      if (errorCode === 'TASK_IN_PROGRESS') {
        statusCode = 400;
      } else if (errorCode === 'PERMISSION_INSUFFICIENT') {
        statusCode = 403;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      } else if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
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
    logError('Project checkin error', error as Error, {
      action: 'project_checkin',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
      userId: req.user?.userId,
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
 * プロジェクトチェックアウト状態取得エンドポイント
 * GET /api/v1/projects/:projectId/checkout-status
 * 
 * Task 2.3: チェックアウト状態照会ハンドラの実装
 * Requirements: FR-3.1, NFR-2
 */
export async function getCheckoutStatus(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId } = req.user!;
    const { projectId } = req.params;

    // Service層呼び出し
    const result = await projectService.getCheckoutStatus(organizationId, projectId);

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      // ステータスコードマッピング
      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode === 'PERMISSION_INSUFFICIENT') {
        statusCode = 403;
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
    logError('Project getCheckoutStatus error', error as Error, {
      action: 'project_getCheckoutStatus',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
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
 * プロジェクトファイル一覧取得エンドポイント
 * GET /api/v1/projects/:projectId/files
 * 
 * Task 2.2: Controller層実装
 */
export async function getProjectFiles(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    console.log('[DEBUG] getProjectFiles - Start', { requestId, params: req.params, query: req.query });
    
    const { organizationId } = req.user!;
    const { projectName } = req.params;
    
    console.log('[DEBUG] getProjectFiles - Auth OK', { organizationId, projectName, userId: req.user!.userId });

    // projectNameからprojectIdを取得
    const { getPool } = require('../database/db');
    const pool = getPool();
    const projectQuery = 'SELECT project_id FROM project WHERE organization_id = $1 AND project_name = $2';
    const projectResult = await pool.query(projectQuery, [organizationId, projectName]);
    
    if (projectResult.rows.length === 0) {
      console.log('[DEBUG] getProjectFiles - Project not found', { projectName });
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }
    
    const projectId = projectResult.rows[0].project_id;
    console.log('[DEBUG] getProjectFiles - Project ID resolved', { projectName, projectId });

    // Service層呼び出し（archiveファイルは常に取得）
    console.log('[DEBUG] getProjectFiles - Calling service...');
    const result = await projectService.getProjectFiles(
      organizationId,
      projectId
    );
    
    console.log('[DEBUG] getProjectFiles - Service result', { 
      success: result.success, 
      hasData: !!result.data,
      errorCode: result.error?.code 
    });

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
    console.log('[DEBUG] getProjectFiles - Success response', { 
      filesCount: result.data?.files?.length || 0,
      archiveFilesCount: result.data?.archiveFiles?.length || 0
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
    console.error('[DEBUG] getProjectFiles - Exception caught', error);
    logError('Project getProjectFiles error', error as Error, {
      action: 'project_getProjectFiles',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
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
 * プロジェクト一覧取得エンドポイント
 * GET /api/v1/projects
 */
export async function list(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    console.log('一覧取得－開始');
    
    const { organizationId } = req.user!;

    // クエリパラメータの取得
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const includeCompleted = req.query.include_completed === 'true';
    const sortBy = (req.query.sort_by as string) || 'create_at';
    const order = (req.query.order as string) || 'desc';

    // Service層の呼び出し
    const result = await projectService.list(organizationId, {
      page,
      limit,
      includeCompleted,
      sortBy,
      order: order as 'asc' | 'desc',
    });
    console.log('Service層呼び出し' + result.success);

    // 4. エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      const statusCode = errorCode === 'SYSTEM_DATABASE_ERROR' ? 500 : 400;

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

    // 5. 成功レスポンス
    if (!result.data) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'データの取得に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data.projects,
      pagination: result.data.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Project list error', error as Error, {
      action: 'project_list',
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
 * 承認依頼エンドポイント
 * PATCH /api/v1/projects/:projectName/approval-request
 * 
 * @description 実験作業者が実験作業完了後に実験管理者へ承認依頼を送信
 * @note バリデーションはルート定義のミドルウェアで処理済み
 * Requirements: 1, 4, 10, 14
 */
export async function requestApproval(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    // バリデーションはミドルウェアで処理済み
    const { organizationId, userId } = req.user!;
    const { projectName } = req.params;
    const { comment } = req.body;

    // projectNameからprojectIdを取得（リポジトリ層を使用）
    const projectRepository = require('../repositories/projectRepository');
    const project = await projectRepository.findProjectIdByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }
    
    const projectId = project.project_id;

    // Service層呼び出し（commentがundefinedの場合はnullに変換）
    const result = await projectService.requestApproval(
      projectId,
      comment || null,
      organizationId,
      userId
    );

    // エラーハンドリング（ビジネスロジックエラーのみ）
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('BUSINESS_')) {
        statusCode = 409;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
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
    logError('Project requestApproval error', error as Error, {
      action: 'project_requestApproval',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
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
 * 作業指示一覧取得エンドポイント
 * GET /api/v1/projects/:projectName/worker-instructions
 * 
 * @description プロジェクトに関連する作業指示一覧を取得する
 * @note バリデーションはミドルウェアで処理済み（バックエンド規約準拠）
 * Requirements: REQ-1, REQ-3, REQ-5
 */
export async function getWorkerInstructions(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    // バリデーションはミドルウェアで処理済み
    const { organizationId, userId } = req.user!;
    const role = (req.user as any).role;
    const { projectName } = req.params;

    // クエリパラメータの取得
    const filters: any = {};
    if (req.query.projectId) {
      filters.projectId = req.query.projectId as string;
    }

    // Service層呼び出し
    const result = await projectService.getWorkerInstructions({
      projectName,
      organizationId,
      userId,
      userRole: role,
      filters,
    });

    // Task 3.1: エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      } else if (errorCode === 'PERMISSION_INSUFFICIENT') {
        statusCode = 403;
      } else if (errorCode.startsWith('SYSTEM_DATABASE_ERROR')) {
        statusCode = 500;
      }

      // Task 3.1: エラーログ記録
      logError('Worker instructions service error', result.error?.originalError || new Error(result.error?.message), {
        action: 'worker_instructions_list',
        organizationId,
        userId,
        projectName,
        errorCode,
        requestId,
      });

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
    // Task 3.1: 予期しないエラーのログ記録
    logError('Worker instructions list error', error as Error, {
      action: 'worker_instructions_list',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
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
 * 指示確認完了エンドポイント (API 2.14)
 * PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm
 * 
 * @description 実験作業者が指示を確認済みとしてマークする
 * @note instructionConfirmationServiceからprojectServiceに統合
 * @note バリデーションはミドルウェアで処理済み
 * Requirements: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
 */
export async function confirmInstruction(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    // バリデーションはミドルウェアで処理済み
    const { organizationId, userId, role } = req.user as any;
    const { instructionId } = req.params;

    // Service層呼び出し（projectServiceに統合済み）
    const result = await projectService.confirmInstruction(
      instructionId,
      userId,
      organizationId,
      role
    );

    // エラーハンドリング
    if (!result.success) {
      const errorCode = result.error?.code || 'SYSTEM_ERROR';
      let statusCode = 500;

      // ステータスコードマッピング
      if (errorCode === 'RESOURCE_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode === 'BUSINESS_ALREADY_ACKNOWLEDGED') {
        statusCode = 400;
      } else if (errorCode === 'PERMISSION_INSUFFICIENT') {
        statusCode = 403;
      } else if (errorCode.startsWith('VALIDATION_')) {
        statusCode = 400;
      } else if (errorCode === 'SYSTEM_DATABASE_ERROR') {
        statusCode = 500;
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

    // 成功レスポンス（200 OK）
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
    logError('Instruction confirmation error', error as Error, {
      action: 'instruction_confirmation',
      organizationId: req.user?.organizationId,
      instructionId: req.params.instructionId,
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
