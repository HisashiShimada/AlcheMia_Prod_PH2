/**
 * taskRoutes.ts テスト
 * 
 * Task 1.1: PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status
 * タスクステータス更新エンドポイントのテスト
 */

import request from 'supertest';
import express, { Express } from 'express';
import taskRoutes from '../../src/routes/taskRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import * as taskController from '../../src/controllers/taskController';

// 実際のコントローラー実装を保存
const actualTaskController = jest.requireActual('../../src/controllers/taskController');

// モック設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/controllers/taskController');

describe('PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', taskRoutes);
    jest.clearAllMocks();

    // authMiddlewareのモック（デフォルトで認証成功）
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_worker',
        departmentId: 'test-dept-id',
      };
      next();
    });

    // デフォルトでは実際のコントローラー実装を使用（バリデーションエラーハンドリング）
    (taskController.updateStatus as jest.Mock).mockImplementation(
      actualTaskController.updateStatus
    );
  });

  describe('ルート定義', () => {
    it('PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status エンドポイントが定義されている', async () => {
      // Controller updateStatusメソッドのモック
      (taskController.updateStatus as jest.Mock).mockImplementation(
        (_req, res) => {
          res.status(200).json({
            success: true,
            data: {
              taskStatus: 'in_progress',
            },
          });
        }
      );

      const response = await request(app)
        .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
        .send({
          status: 'in_progress',
          currentUpdateAt: '2026-01-28T00:00:00Z',
        });

      expect(response.status).not.toBe(404);
    });

    it('authMiddlewareが適用されている', async () => {
      await request(app)
        .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
        .send({
          status: 'in_progress',
          currentUpdateAt: '2026-01-28T00:00:00Z',
        });

      expect(authMiddleware).toHaveBeenCalled();
    });
  });

  describe('パラメータバリデーション', () => {
    describe('projectId', () => {
      it('UUID形式であることを検証する', async () => {
        // バリデーションエラーのテストなのでモックを削除
        (taskController.updateStatus as jest.Mock).mockClear();
        
        const response = await request(app)
          .put('/api/v1/projects/invalid-uuid/methods/method1/tasks/1/status')
          .send({
            status: 'in_progress',
            currentUpdateAt: '2026-01-28T00:00:00Z',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });
    });

    describe('taskNo', () => {
      it('数値であることを検証する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/abc/status')
          .send({
            status: 'in_progress',
            currentUpdateAt: '2026-01-28T00:00:00Z',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });

      it('1以上の整数であることを検証する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/0/status')
          .send({
            status: 'in_progress',
            currentUpdateAt: '2026-01-28T00:00:00Z',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });
    });
  });

  describe('リクエストボディバリデーション', () => {
    describe('status', () => {
      it('statusが必須であることを検証する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
          .send({
            currentUpdateAt: '2026-01-28T00:00:00Z',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });

      it('statusが許可された値であることを検証する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
          .send({
            status: 'invalid_status',
            currentUpdateAt: '2026-01-28T00:00:00Z',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });

      it('pending, in_progress, completed, forced_terminatedを許可する', async () => {
        (taskController.updateStatus as jest.Mock).mockImplementation(
          (_req, res) => {
            res.status(200).json({ success: true, data: {} });
          }
        );

        const validStatuses = ['pending', 'in_progress', 'completed', 'forced_terminated'];

        for (const status of validStatuses) {
          const response = await request(app)
            .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
            .send({
              status,
              currentUpdateAt: '2026-01-28T00:00:00Z',
            });

          expect(response.status).not.toBe(400);
        }
      });
    });

    describe('currentUpdateAt', () => {
      it('currentUpdateAtが必須であることを検証する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
          .send({
            status: 'in_progress',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });

      it('ISO8601形式であることを検証する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
          .send({
            status: 'in_progress',
            currentUpdateAt: 'invalid-date',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });
    });

    describe('comment', () => {
      it('commentはオプショナルである', async () => {
        (taskController.updateStatus as jest.Mock).mockImplementation(
          (_req, res) => {
            res.status(200).json({ success: true, data: {} });
          }
        );

        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
          .send({
            status: 'in_progress',
            currentUpdateAt: '2026-01-28T00:00:00Z',
          });

        expect(response.status).toBe(200);
      });

      it('commentが500文字以内であることを検証する', async () => {
        const longComment = 'a'.repeat(501);

        const response = await request(app)
          .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
          .send({
            status: 'in_progress',
            currentUpdateAt: '2026-01-28T00:00:00Z',
            comment: longComment,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toContain('VALIDATION');
      });
    });
  });

  describe('有効なリクエスト', () => {
    it('有効なリクエストでcontrollerを呼び出す', async () => {
      (taskController.updateStatus as jest.Mock).mockImplementation(
        (_req, res) => {
          res.status(200).json({
            success: true,
            data: {
              taskStatus: 'in_progress',
              updateAt: '2026-01-28T00:00:00Z',
            },
          });
        }
      );

      const response = await request(app)
        .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/1/status')
        .send({
          status: 'in_progress',
          currentUpdateAt: '2026-01-28T00:00:00Z',
          comment: 'タスクを開始しました',
        });

      expect(response.status).toBe(200);
      expect(taskController.updateStatus).toHaveBeenCalledTimes(1);
    });
  });
});