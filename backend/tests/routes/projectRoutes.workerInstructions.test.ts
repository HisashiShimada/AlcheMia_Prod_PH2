/**
 * Worker Instructions API ルートテスト
 * 
 * @description
 * GET /api/v1/projects/:projectName/worker-instructions エンドポイントのテスト
 * Task 1.1: ルート定義の追加
 * Requirements: 1, 3
 */

import request from 'supertest';
import express, { Application } from 'express';
import { authMiddleware } from '../../src/middleware/authMiddleware';

// モック設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/controllers/projectController', () => ({
  getWorkerInstructions: jest.fn(),
}));

import projectRoutes from '../../src/routes/projectRoutes';
import * as projectController from '../../src/controllers/projectController';

describe('GET /api/v1/projects/:projectName/worker-instructions', () => {
  let app: Application;

  beforeEach(() => {
    // Expressアプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    // モックのリセット
    jest.clearAllMocks();
  });

  describe('認証チェック', () => {
    it('認証なしの場合、401エラーを返すこと', async () => {
      // authMiddlewareが401を返すようにモック
      (authMiddleware as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: '認証トークンが提供されていません',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
  });

  describe('ルーティング', () => {
    beforeEach(() => {
      // authMiddlewareが成功するようにモック
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'experiment_worker',
          sessionId: 'session-123',
        };
        next();
      });
    });

    it('GET /api/v1/projects/:projectName/worker-instructions がルーティングされること', async () => {
      // コントローラーをモック
      (projectController.getWorkerInstructions as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: [],
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'req-123',
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(projectController.getWorkerInstructions).toHaveBeenCalled();
    });

    it('authMiddlewareが適用されていること', async () => {
      (projectController.getWorkerInstructions as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(200).json({ success: true, data: [] });
      });

      await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .set('Authorization', 'Bearer test-token');

      expect(authMiddleware).toHaveBeenCalled();
    });

    it('projectController.getWorkerInstructionsが呼び出されること', async () => {
      (projectController.getWorkerInstructions as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(200).json({ success: true, data: [] });
      });

      await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .set('Authorization', 'Bearer test-token');

      expect(projectController.getWorkerInstructions).toHaveBeenCalledTimes(1);
    });
  });

  describe('パラメータ処理', () => {
    beforeEach(() => {
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'experiment_worker',
          sessionId: 'session-123',
        };
        next();
      });

      (projectController.getWorkerInstructions as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: [],
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'req-123',
          },
        });
      });
    });

    it('projectNameパラメータが正しく渡されること', async () => {
      await request(app)
        .get('/api/v1/projects/my-project/worker-instructions')
        .set('Authorization', 'Bearer test-token');

      const mockCall = (projectController.getWorkerInstructions as jest.Mock).mock.calls[0];
      const req = mockCall[0];
      expect(req.params.projectName).toBe('my-project');
    });

    it('クエリパラメータが正しく渡されること', async () => {
      await request(app)
        .get('/api/v1/projects/my-project/worker-instructions?projectId=proj-123&methodId=method-1')
        .set('Authorization', 'Bearer test-token');

      const mockCall = (projectController.getWorkerInstructions as jest.Mock).mock.calls[0];
      const req = mockCall[0];
      expect(req.query.projectId).toBe('proj-123');
      expect(req.query.methodId).toBe('method-1');
    });
  });
});