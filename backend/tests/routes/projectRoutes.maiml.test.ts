/**
 * projectRoutes - MAIML取得エンドポイントテスト
 * 
 * Task 1.1: GET /api/v1/projects/:projectId/maiml エンドポイントのテスト
 * Requirements: REQ-8 (入力バリデーション)
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
import * as projectController from '../../src/controllers/projectController';

// モック設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('../../src/controllers/projectController');

describe('GET /api/v1/projects/:projectId/maiml', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);
    jest.clearAllMocks();

    // authMiddlewareのモック（デフォルトで認証成功）
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      req.user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_worker',
      };
      next();
    });

    // tenantIsolationのモック
    (tenantIsolation as jest.Mock).mockImplementation((req, res, next) => {
      next();
    });
  });

  describe('バリデーション', () => {
    it('projectIdがUUID形式でない場合、400エラーを返す', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-uuid/maiml');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('UUID');
    });

    it('有効なUUID形式のprojectIdでcontrollerを呼び出す', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      // Controller getProjectMaimlメソッドのモック
      (projectController.getProjectMaiml as jest.Mock).mockImplementation(
        (req, res) => {
          res.status(200).json({
            success: true,
            data: {
              file_id: 'test-file-id',
              project_id: validUuid,
              content: '<MAIML></MAIML>',
            },
          });
        }
      );

      const response = await request(app)
        .get(`/api/v1/projects/${validUuid}/maiml`);

      expect(response.status).toBe(200);
      expect(projectController.getProjectMaiml).toHaveBeenCalledTimes(1);
    });
  });

  describe('ミドルウェアチェーン', () => {
    it('authMiddlewareが適用されていることを確認する', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      (projectController.getProjectMaiml as jest.Mock).mockImplementation(
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );

      await request(app)
        .get(`/api/v1/projects/${validUuid}/maiml`);

      expect(authMiddleware).toHaveBeenCalled();
    });

    it('tenantIsolationミドルウェアが適用されていることを確認する', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      (projectController.getProjectMaiml as jest.Mock).mockImplementation(
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );

      await request(app)
        .get(`/api/v1/projects/${validUuid}/maiml`);

      expect(tenantIsolation).toHaveBeenCalled();
    });
  });
});
