/**
 * WorkerProjectController
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクト一覧取得のリクエスト処理
 * Task 3.1: Controller層実装
 * 
 * @module controllers/workerProjectController
 */

import { Request, Response, NextFunction } from 'express';
import { WorkerProjectService } from '../services/workerProjectService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import type { ProjectStatus } from '../types/workerProject';

/**
 * 実験作業者用プロジェクトコントローラー
 * 
 * @class WorkerProjectController
 */
export class WorkerProjectController {
  private workerProjectService: WorkerProjectService;

  /**
   * コンストラクタ
   * 
   * @param {WorkerProjectService} service - 実験作業者用プロジェクトサービス（DI用）
   */
  constructor(service?: WorkerProjectService) {
    this.workerProjectService = service || new WorkerProjectService();
  }

  /**
   * 実験作業者がアクセス可能なプロジェクト一覧取得エンドポイント
   * GET /api/v1/projects/worker-accessible
   * 
   * Task 3.1: Controller層実装
   * 
   * @param {Request} req - Expressリクエスト
   * @param {Response} res - Expressレスポンス
   * @param {NextFunction} next - Express next関数
   * @returns {Promise<void>}
   */
  async listWorkerAccessible(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    try {
      const { userId, role, organizationId } = req.user!;

      // 2. クエリパラメータの取得とバリデーション
      const pageStr = (req.query.page as string) || '1';
      const limitStr = (req.query.limit as string) || '20';
      const status = req.query.status as 'pending' | 'in_progress' | 'review_waiting' | undefined;
      const sortBy = (req.query.sort_by as string) || 'create_at';
      const order = (req.query.order as string) || 'desc';

      // バリデーション: page
      const page = parseInt(pageStr, 10);
      if (isNaN(page) || page < 1 || !Number.isInteger(page)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ページ番号は1以上の整数である必要があります',
            details: [
              {
                field: 'page',
                message: 'ページ番号は正の整数です',
                code: 'INVALID_VALUE',
              },
            ],
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // バリデーション: limit
      const limit = parseInt(limitStr, 10);
      if (isNaN(limit) || limit < 1 || limit > 100 || !Number.isInteger(limit)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'limitは1から100の範囲内の整数である必要があります',
            details: [
              {
                field: 'limit',
                message: 'limitは1から100の範囲です',
                code: 'OUT_OF_RANGE',
              },
            ],
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // バリデーション: status
      const allowedStatus: ProjectStatus[] = ['pending', 'in_progress', 'review_waiting'];
      if (status && !allowedStatus.includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: "statusは'pending', 'in_progress', 'review_waiting'のいずれかを指定してください",
            details: [
              {
                field: 'status',
                message: `許可された値: ${allowedStatus.join(', ')}`,
                code: 'INVALID_VALUE',
              },
            ],
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // バリデーション: sort_by
      const allowedSortBy = ['create_at', 'project_name', 'update_at'];
      if (!allowedSortBy.includes(sortBy)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: "sort_byは'create_at', 'project_name', 'update_at'のいずれかを指定してください",
            details: [
              {
                field: 'sort_by',
                message: `許可された値: ${allowedSortBy.join(', ')}`,
                code: 'INVALID_VALUE',
              },
            ],
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // バリデーション: order
      const allowedOrder = ['asc', 'desc'];
      if (!allowedOrder.includes(order)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: "orderは'asc'または'desc'を指定してください",
            details: [
              {
                field: 'order',
                message: `許可された値: ${allowedOrder.join(', ')}`,
                code: 'INVALID_VALUE',
              },
            ],
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // 3. Service層の呼び出し
      const result = await this.workerProjectService.listWorkerAccessible(
        userId,
        role,
        organizationId,
        {
          page,
          limit,
          status,
          sortBy: sortBy as 'create_at' | 'project_name' | 'update_at',
          order: order as 'asc' | 'desc',
        }
      );

      // 4. 成功レスポンス
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    } catch (error: any) {
      // 5. エラーハンドリング
      logger.error('Worker project list error', {
        userId: req.user?.userId,
        role: req.user?.role,
        organizationId: req.user?.organizationId,
        requestId,
        query: req.query,
        error: error.message,
        stack: error.stack,
      });

      // エラー種別に応じたステータスコード
      let statusCode = 500;
      let errorCode = 'SYSTEM_ERROR';
      let errorMessage = 'システムエラーが発生しました';

      if (error.name === 'DatabaseError') {
        statusCode = 500;
        errorCode = 'SYSTEM_DATABASE_ERROR';
        errorMessage = 'データベースエラーが発生しました';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }
  }
}

/**
 * コントローラーインスタンスの作成
 */
const workerProjectController = new WorkerProjectController();

/**
 * エンドポイントハンドラーのエクスポート
 */
export const listWorkerAccessible = workerProjectController.listWorkerAccessible.bind(
  workerProjectController
);