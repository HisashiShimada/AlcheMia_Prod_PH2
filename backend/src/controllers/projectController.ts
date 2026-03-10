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
import type { CreateProjectRequest, MethodTaskItem, MethodTasksResponse, MethodTasksStatistics, TaskProgressStats, TaskDetailResponse,MaimlPublishRequest,MaimlPublishResponse } from '../types/api';
import * as projectTaskDetailRepository from '../repositories/projectTaskDetailRepository';
import * as maimlIngestService from '../services/maimlIngestService'

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
    
    // 型定義を適用
    const requestBody = req.body as CreateProjectRequest;
    const { projectName, description } = requestBody;

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
 * タスク詳細取得エンドポイント
 * GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/details
 *
 * @description
 *   projectName / methodId / taskNo パラメータからタスクを特定し、
 *   タスク基本情報 + トランジション進捗一覧 + 統計情報を返す。
 * @note バリデーションはルート定義のミドルウェアで処理済み
 */
export async function getTaskDetail(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId } = req.user!;
    const { projectName, methodId, taskNo: taskNoStr } = req.params;

    // taskNo を数値に変換（バリデーション済み前提だが念のため）
    const taskNo = parseInt(taskNoStr, 10);
    if (isNaN(taskNo) || taskNo < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_TASK_NO_INVALID',
          message: 'taskNo は1以上の整数である必要があります。',
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    // ── projectName → projectId 解決 ──────────────────────────────
    const { getPool } = require('../database/db');
    const pool = getPool();
    const projectResult = await pool.query(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_name = $2',
      [organizationId, projectName]
    );

    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません。',
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    const projectId: string = projectResult.rows[0].project_id;

    // taskId 文字列はレスポンスへの埋め込み用（フロントエンドで識別子として利用可能）
    const taskId = `${projectId}__${methodId}__${taskNo}`;

    // ── Repository 呼び出し ──────────────────────────────────────────
    const taskDetail: TaskDetailResponse | null =
      await projectTaskDetailRepository.findTaskDetail(
        organizationId,
        projectId,
        methodId,
        taskNo,
        taskId
      );

    if (!taskDetail) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '指定されたタスクが見つかりません。',
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    // ── 成功レスポンス ───────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: taskDetail,
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    logError('getTaskDetail error', error as Error, {
      action: 'task_get_detail',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      methodId: req.params.methodId,
      taskNo: req.params.taskNo,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました。',
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * レビュー待ちタスクを一括完了に更新
 * POST /api/v1/projects/:projectName/tasks/complete-review
 */
export async function completeReviewTasks(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { projectName } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: '認証が必要です' },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    const result = await projectService.completeReviewTasks(organizationId, projectName);

    if (!result.success) {
      const statusCode = result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: result.error,
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
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
 * GET /api/v1/projects/:projectName/maiml
 * 
 * @description プロジェクトの最新MAIMLファイルをXML形式で取得する（プロジェクト管理画面で使用）
 * @note フロントエンドProjectMaimlContext用エンドポイント
 * Requirements: REQ-1, REQ-2, REQ-4, REQ-5, REQ-7
 */
export async function getProjectMaiml(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    console.log('[DEBUG] getProjectMaiml - Start', { requestId, params: req.params });
    
    // バリデーションはミドルウェアで処理済み
    const { organizationId } = req.user!;
    const { projectName } = req.params;
    
    console.log('[DEBUG] getProjectMaiml - Auth OK', { organizationId, projectName });

    // Service層呼び出し（projectNameを直接渡す）
    const result = await projectService.getProjectMaiml(organizationId, projectName);
    
    console.log('[DEBUG] getProjectMaiml - Service result', { 
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
    console.log('[DEBUG] getProjectMaiml - Success response');
    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    console.error('[DEBUG] getProjectMaiml - Exception caught', error);
    logError('Project getProjectMaiml error', error as Error, {
      action: 'project_getProjectMaiml',
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
 * プロジェクトチェックアウトエンドポイント
 * POST /api/v1/projects/:projectName/checkout
 * 
 * Task 2.1: チェックアウトハンドラの実装（projectName受け取りに変更）
 * Requirements: FR-1.1, FR-1.2, NFR-2
 */
export async function checkout(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId, userId } = req.user!;
    const { projectName } = req.params;

    console.log('[DEBUG] checkout - Start', { requestId, projectName, organizationId, userId });

    // Service層呼び出し（projectNameを渡す、Repository層でprojectIdを取得）
    const result = await projectService.checkout(organizationId, projectName, userId);

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
      projectName: req.params.projectName,
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
 * プロジェクトチェックイン
 * POST /api/v1/projects/:projectName/checkin
 */
export async function checkin(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId, userId } = req.user!;
    const { projectName } = req.params;

    console.log('[projectController.checkin] Request received:', {
      projectName,
      organizationId,
      userId,
    });

    // Service層を呼び出してチェックイン処理
    const result = await projectService.checkin(
      organizationId,
      projectName,
      userId
    );

    console.log('[projectController.checkin] Checkin successful:', result);

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
      projectName: req.params.projectName,
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
 * メソッド別タスク一覧＋進捗情報取得エンドポイント
 * GET /api/v1/projects/:projectId/methods/:methodId/tasks
 *
 * @description 指定プロジェクト・メソッドに紐づくタスク一覧を進捗集計付きで取得する。
 *              実験管理者の進捗確認タブ（WorkProgressDetailDialog）で使用する。
 * @note バリデーションはルート定義のミドルウェアで処理済み
 */
export async function getMethodTasks(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId } = req.user!;
    const { projectId, methodId } = req.params;
    const statusFilter = (req.query.status as string) || 'all';

    // プロジェクト存在確認（マルチテナント分離）
    const { getPool } = require('../database/db');
    const pool = getPool();
    const projectCheckResult = await pool.query(
      'SELECT project_id FROM project WHERE project_id = $1 AND organization_id = $2',
      [projectId, organizationId]
    );

    if (projectCheckResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    // SQLファイルを使ってタスク一覧取得
    const { loadSqlFile } = require('../sql/loader');
    const sql = await loadSqlFile('tasks/findByProjectMethod.sql');
    const queryResult = await pool.query(sql, [projectId, methodId, organizationId]);
    const rows = queryResult.rows;

    // タスクステータス数値 → 文字列変換
    const statusMap: Record<number, string> = {
      0: 'pending',
      1: 'in_progress',
      2: 'failed',
      3: 'review_waiting',
      4: 'completed',
    };

    // statusフィルタのマッピング（クエリパラメータ → DB数値）
    const statusFilterMap: Record<string, number | null> = {
      all: null,
      pending: 0,
      in_progress: 1,
      failed: 2,
      review_waiting: 3,
      completed: 4,
    };

    // DBロウをAPIレスポンス型に変換
    let tasks: MethodTaskItem[] = rows.map((row: any) => {
      const taskStatusNum: number | null =
        row.task_status !== null && row.task_status !== undefined
          ? Number(row.task_status)
          : null;
      const taskStatusStr = taskStatusNum !== null ? (statusMap[taskStatusNum] ?? 'pending') : 'pending';

      const totalTransitions = Number(row.total_transitions) || 0;
      const completedTransitions = Number(row.completed_transitions) || 0;
      const inprogressTransitions = Number(row.inprogress_transitions) || 0;
      const notstartedTransitions = Number(row.notstarted_transitions) || 0;
      const avgProgressRate = Number(row.avg_progress_rate) || 0;

      const progress: TaskProgressStats = {
        total_transitions: totalTransitions,
        completed: completedTransitions,
        in_progress: inprogressTransitions,
        not_started: notstartedTransitions,
        progress_percentage:
          totalTransitions > 0
            ? Math.round(avgProgressRate * 10) / 10
            : 0,
      };

      return {
        experiment_order: Number(row.experiment_order),
        task_name: row.task_name ?? null,
        task_no: row.task_no !== null && row.task_no !== undefined ? Number(row.task_no) : null,
        task_status: taskStatusStr,
        task_status_num: taskStatusNum,
        experiment_user_id: row.experiment_user_id ?? null,
        experiment_user_name: row.experiment_user_name ?? null,
        experiment_start_at: row.experiment_start_at
          ? new Date(row.experiment_start_at).toISOString()
          : null,
        experiment_end_at: row.experiment_end_at
          ? new Date(row.experiment_end_at).toISOString()
          : null,
        progress,
        created_at: row.create_at ? new Date(row.create_at).toISOString() : null,
        updated_at: row.update_at ? new Date(row.update_at).toISOString() : null,
      } satisfies MethodTaskItem;
    });

    // statusフィルタの適用（task_noがNULLのレコードはproject_task_detailが未作成のため除外しない）
    if (statusFilter !== 'all' && statusFilterMap[statusFilter] !== undefined) {
      const targetStatusNum = statusFilterMap[statusFilter];
      tasks = tasks.filter((t) => t.task_status_num === targetStatusNum);
    }

    // 統計サマリー計算
    const statistics: MethodTasksStatistics = {
      total: tasks.length,
      pending: tasks.filter((t) => t.task_status === 'pending').length,
      in_progress: tasks.filter((t) => t.task_status === 'in_progress').length,
      completed: tasks.filter((t) => t.task_status === 'completed').length,
      failed: tasks.filter((t) => t.task_status === 'failed').length,
      overall_progress:
        tasks.length > 0
          ? parseFloat(
              (
                tasks.reduce((sum, t) => sum + t.progress.progress_percentage, 0) /
                tasks.length
              ).toFixed(1)
            )
          : 0,
    };

    const responseData: MethodTasksResponse = {
      project_id: projectId,
      method_id: methodId,
      tasks,
      statistics,
    };

    res.status(200).json({
      success: true,
      data: responseData,
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    logError('Project getMethodTasks error', error as Error, {
      action: 'project_getMethodTasks',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
      methodId: req.params.methodId,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました',
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * MaiML 公開エンドポイント
 * POST /api/v1/projects/:projectName/publish
 *
 * @description
 * プロジェクト詳細画面の「公開」ボタン押下時に呼び出す。
 * projectName から最新 MaiML ファイルパスを取得し、maimlIngestService で
 * KV・プレビューを DB に保存して即時公開する。
 *
 * @roles experiment_admin（書込可）
 * 仕様: docs/MaiML_OpenData_Pipeline/spec.md §3.1
 */
export async function publish(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    const { organizationId } = req.user!;
    const { projectName } = req.params;
    const body = req.body as MaimlPublishRequest;

    // 1. projectName から最新 MaiML ファイルパスを取得
    const maimlResult = await projectService.getProjectMaiml(organizationId, projectName);
    if (!maimlResult.success || !maimlResult.data?.filePath) {
      const statusCode = maimlResult.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: maimlResult.error?.code ?? 'RESOURCE_NOT_FOUND',
          message: maimlResult.error?.message ?? 'MaiML ファイルが見つかりません',
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }
    const fileUri = maimlResult.data.filePath;

    // 2. maimlIngestService で公開処理（KV 抽出・プレビュー生成・DB 保存）
    const ingestResult = await maimlIngestService.publishMaiml(organizationId, fileUri, {
      template_only:         body.template_only         ?? false,
      store_raw_series:      body.store_raw_series       ?? false,
      keep_raw_on_unpublish: body.keep_raw_on_unpublish  ?? false,
      retention_until:       body.retention              ?? null,
    });

    const response: MaimlPublishResponse = {
      registryId: String(ingestResult.asset_id),
      projectName,
      status: 'published',
      requestedAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: {
        ...response,
        doc_name:           ingestResult.doc_name,
        condition_kv_count: ingestResult.condition_kv_count,
        material_kv_count:  ingestResult.material_kv_count,
        preview_count:      ingestResult.preview_count,
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    logError('MaiML publish error', error as Error, {
      action: 'maiml_publish',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      requestId,
    });
    res.status(500).json({
      success: false,
      error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * MaiML 非公開エンドポイント
 * POST /api/v1/projects/:projectName/unpublish
 *
 * @description
 * プロジェクト詳細画面の「非公開」ボタン押下時に呼び出す。
 * 公開済みアセットに紐づく KV・プレビュー・生データを削除する。
 * mode=keep_meta（デフォルト）: 代表メタ（maiml_asset）は残す
 * mode=full_delete: maiml_asset ごと完全削除
 *
 * @roles experiment_admin（書込可）
 * 仕様: docs/MaiML_OpenData_Pipeline/spec.md §3.2
 */
export async function unpublish(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId } = req.user!;
    const { projectName } = req.params;
    const { mode = 'keep_meta' } = req.body as { mode?: 'keep_meta' | 'full_delete' };

    // projectName から公開ステータスを取得して asset_id を特定
    const projectService = new ProjectService();
    const maimlResult = await projectService.getProjectMaiml(organizationId, projectName);
    if (!maimlResult.success || !maimlResult.data?.filePath) {
      res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'MaiML ファイルが見つかりません' },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }
    const fileUri = maimlResult.data.filePath;

    const statusData = await maimlIngestService.getPublishStatus(organizationId, fileUri);
    if (!statusData.is_published || !statusData.asset_id) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_PUBLISHED', message: 'このプロジェクトは公開されていません' },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    await maimlIngestService.unpublishMaiml(organizationId, statusData.asset_id, mode);

    res.status(200).json({
      success: true,
      data: { projectName, mode, unpublishedAt: new Date().toISOString() },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    logError('MaiML unpublish error', error as Error, {
      action: 'maiml_unpublish',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      requestId,
    });
    res.status(500).json({
      success: false,
      error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * MaiML 公開ステータス取得エンドポイント
 * GET /api/v1/projects/:projectName/publish-status
 *
 * @description プロジェクトの公開状態を確認する
 * @roles experiment_admin（読取専用）
 */
export async function getPublishStatus(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId } = req.user!;
    const { projectName } = req.params;

    const projectService = new ProjectService();
    const maimlResult = await projectService.getProjectMaiml(organizationId, projectName);
    if (!maimlResult.success || !maimlResult.data?.filePath) {
      res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'MaiML ファイルが見つかりません' },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    const status = await maimlIngestService.getPublishStatus(organizationId, maimlResult.data.filePath);
    res.status(200).json({
      success: true,
      data: status,
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    logError('MaiML getPublishStatus error', error as Error, {
      action: 'maiml_getPublishStatus',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      requestId,
    });
    res.status(500).json({
      success: false,
      error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * 指示確認エンドポイント
 * POST /api/v1/instructions/:instructionId/confirm
 */
export async function confirmInstruction(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();

  try {
    // バリデーションはミドルウェアで処理済み
    const { organizationId, userId, role } = req.user as any;
    const { projectName, instructionId } = req.params;

    // Service層呼び出し（projectNameからprojectId取得もService層で実施）
    const result = await projectService.confirmInstruction(
      instructionId,
      projectName,
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
