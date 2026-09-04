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
      const { userId, organizationId } = req.user!;
      const organizationGroupCds = req.user!.organizationGroupCds ?? [];

      // バリデーション済みパラメータを直接使用
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const status = req.query.status as '1' | '2' | '3' | undefined;
      const sortBy = (req.query.sort_by as string) || 'create_at';
      const order = (req.query.order as string) || 'desc';

      // Service層の呼び出し
      const result = await this.workerProjectService.listWorkerAccessible(
        userId,
        organizationId,
        organizationGroupCds,
        {
          page,
          limit,
          status,
          sortBy: sortBy as 'create_at' | 'project_name' | 'update_at',
          order: order as 'asc' | 'desc',
        }
      );

      // 成功レスポンス
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
      // エラーハンドリング
      logger.error('Worker project list error', {
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        requestId,
        query: req.query,
        error: error.message,
        stack: error.stack,
      });

      // エラーハンドリングミドルウェアに委譲
      throw error;
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