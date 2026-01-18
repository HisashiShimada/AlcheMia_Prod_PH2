/**
 * projectRoutes.ts テスト
 * 
 * Task 1.1: POST /api/v1/projects エンドポイントのテスト
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import * as projectController from '../../src/controllers/projectController';

// モック設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/controllers/projectController');

describe('POST /api/v1/projects', () => {
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
        role: 'experiment_admin',
        departmentId: 'test-dept-id',
      };
      next();
    });
  });

  describe('バリデーション', () => {
    it('projectNameが必須であることを検証する', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          description: 'Test description',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toContain('VALIDATION');
    });

    it('projectNameが1-255文字の範囲内であることを検証する', async () => {
      // 256文字のprojectName
      const longName = 'a'.repeat(256);

      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          projectName: longName,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toContain('VALIDATION');
    });

    it('descriptionが1000文字以内であることを検証する', async () => {
      // 1001文字のdescription
      const longDescription = 'a'.repeat(1001);

      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          projectName: 'Test Project',
          description: longDescription,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toContain('VALIDATION');
    });

    it('有効なリクエストボディでcontrollerを呼び出す', async () => {
      // Controller createメソッドのモック
      (projectController.create as jest.Mock).mockImplementation(
        (req, res) => {
          res.status(201).json({
            success: true,
            data: {
              projectId: 'test-project-id',
              projectName: 'Test Project',
            },
          });
        }
      );

      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          projectName: 'Test Project',
          description: 'Test description',
        });

      expect(response.status).toBe(201);
      expect(projectController.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('認証', () => {
    it('authMiddlewareが適用されていることを確認する', async () => {
      await request(app)
        .post('/api/v1/projects')
        .send({
          projectName: 'Test Project',
        });

      expect(authMiddleware).toHaveBeenCalled();
    });
  });
});
