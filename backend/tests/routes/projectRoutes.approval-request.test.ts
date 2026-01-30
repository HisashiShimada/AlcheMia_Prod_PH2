/**
 * 承認依頼APIルーティングテスト
 * 
 * @description POST /api/v1/projects/:projectId/approval-request エンドポイントのルーティングとミドルウェアチェーンをテスト
 * @task 1.1 承認依頼エンドポイントのルーティング追加
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
import * as projectController from '../../src/controllers/projectController';

// モックの設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('../../src/controllers/projectController');

describe('POST /api/v1/projects/:projectId/approval-request', () => {
  let app: Express;

  beforeEach(() => {
    // Expressアプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    // モックのリセット
    jest.clearAllMocks();

    // ミドルウェアのモック設定（デフォルトで通過させる）
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_worker'
      };
      next();
    });

    (tenantIsolation as jest.Mock).mockImplementation((req, _res, next) => {
      req.organizationId = 'test-org-id';
      next();
    });

    // コントローラーのモック設定
    (projectController.requestApproval as jest.Mock) = jest.fn((_req, res) => {
      res.status(200).json({ success: true, data: {} });
    });
  });

  describe('ルーティング設定', () => {
    it('POST /api/v1/projects/:projectId/approval-request エンドポイントが存在する', async () => {
      const response = await request(app)
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/approval-request')
        .send({});

      // 404でないことを確認（ルートが存在する）
      expect(response.status).not.toBe(404);
    });

    it('authMiddleware が適用されている', async () => {
      await request(app)
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/approval-request')
        .send({});

      // authMiddleware が呼び出されたことを確認
      expect(authMiddleware).toHaveBeenCalled();
    });

    it('tenantIsolation ミドルウェアが適用されている', async () => {
      await request(app)
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/approval-request')
        .send({});

      // tenantIsolation が呼び出されたことを確認
      expect(tenantIsolation).toHaveBeenCalled();
    });

    it('ProjectController.requestApproval が呼び出される', async () => {
      await request(app)
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/approval-request')
        .send({});

      // コントローラーが呼び出されたことを確認
      expect(projectController.requestApproval).toHaveBeenCalled();
    });
  });

  describe('ミドルウェアチェーンの順序', () => {
    it('authMiddleware → tenantIsolation → controller の順で実行される', async () => {
      const callOrder: string[] = [];

      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        callOrder.push('auth');
        req.user = { userId: 'test-user-id', organizationId: 'test-org-id', role: 'experiment_worker' };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req, _res, next) => {
        callOrder.push('tenant');
        req.organizationId = 'test-org-id';
        next();
      });

      (projectController.requestApproval as jest.Mock) = jest.fn((_req, res) => {
        callOrder.push('controller');
        res.status(200).json({ success: true });
      });

      await request(app)
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/approval-request')
        .send({});

      // 実行順序を確認
      expect(callOrder).toEqual(['auth', 'tenant', 'controller']);
    });
  });
});