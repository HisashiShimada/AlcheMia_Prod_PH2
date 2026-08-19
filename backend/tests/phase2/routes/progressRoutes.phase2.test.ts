/**
 * progressRoutes フェーズ２ テスト
 *
 * 分類A：進捗確認APIのルーティング確認（Phase2 変更あり）
 * - GET   /projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
 * - PATCH /projects/:projectId/methods/:methodId/tasks/:taskNo/status
 * - GET   /projects/:projectId/worker-tasks
 * - PATCH /projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * - GET   /projects/:projectId/methods/:methodId/tasks/:taskNo/details
 * - GET   /projects/:projectId/work-details
 * - GET   /projects/:projectId/ng-tasks
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/progressRoutes';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'user-001', organizationId: 'org-001', organizationGroupCds: ['group-A'] };
    next();
  }),
}));

jest.mock('../../../src/middleware/permissionCheckMiddleware', () => ({
  checkPermission: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

jest.mock('../../../src/controllers/progressController', () => ({
  getProgressData: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getProgressData' })),
  updateTaskStatus: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateTaskStatus' })),
  getWorkerTasks: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getWorkerTasks' })),
  updateTransitionStatus: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateTransitionStatus' })),
  getWorkDetails: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getWorkDetails' })),
  getNgTasks: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getNgTasks' })),
}));

jest.mock('../../../src/controllers/projectController', () => ({
  getTaskDetail: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getTaskDetail' })),
}));

jest.mock('../../../src/utils/validators', () => ({
  validateParamString: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  validateParamInt: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ──────────────────────────────────────────────
// アプリセットアップ
// ──────────────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────
describe('progressRoutes - Phase2 テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
  // ==========================================================================
  describe('GET /projects/:projectId/methods/:methodId/tasks/:taskNo/transitions', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/methods/method-001/tasks/1/transitions');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getProgressData');
    });

    test('異常系: PATCH は 404 を返すこと', async () => {
      const res = await request(app).patch('/projects/proj-001/methods/method-001/tasks/1/transitions');
      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // PATCH /projects/:projectId/methods/:methodId/tasks/:taskNo/status
  // ==========================================================================
  describe('PATCH /projects/:projectId/methods/:methodId/tasks/:taskNo/status', () => {
    const validBody = {
      status: 'in_progress',
      currentUpdatedAt: '2026-08-19T00:00:00.000Z',
    };

    test('正常系: 有効なボディで 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send(validBody);
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateTaskStatus');
    });

    test('異常系: status が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send({ currentUpdatedAt: validBody.currentUpdatedAt });
      expect(res.status).toBe(400);
    });

    test('異常系: status が不正な列挙値の場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send({ ...validBody, status: 'invalid_status' });
      expect(res.status).toBe(400);
    });

    test('異常系: currentUpdatedAt が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send({ status: validBody.status });
      expect(res.status).toBe(400);
    });

    test('異常系: currentUpdatedAt が ISO8601 でない場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send({ ...validBody, currentUpdatedAt: '2026/08/19 00:00:00' });
      expect(res.status).toBe(400);
    });

    test('正常系: comment 付きで 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send({ ...validBody, comment: '作業中' });
      expect(res.status).toBe(200);
    });

    test('異常系: comment が 500 文字超の場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/tasks/1/status')
        .send({ ...validBody, comment: 'a'.repeat(501) });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /projects/:projectId/worker-tasks
  // ==========================================================================
  describe('GET /projects/:projectId/worker-tasks', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/worker-tasks');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getWorkerTasks');
    });

    test('正常系: status クエリ付きで 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/worker-tasks?status=in_progress');
      expect(res.status).toBe(200);
    });

    test('異常系: status が不正な値の場合 400 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/worker-tasks?status=invalid');
      expect(res.status).toBe(400);
    });

    test('正常系: sortBy + order クエリ付きで 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/worker-tasks?sortBy=task_no&order=asc');
      expect(res.status).toBe(200);
    });

    test('異常系: order が不正な値の場合 400 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/worker-tasks?order=invalid');
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /projects/:projectId/methods/:methodId/transitions/:transitionId/status
  // ==========================================================================
  describe('PATCH /projects/:projectId/methods/:methodId/transitions/:transitionId/status', () => {
    const validBody = {
      taskNo: 1,
      status: 3,
    };

    test('正常系: 有効なボディで 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/transitions/trans-001/status')
        .send(validBody);
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateTransitionStatus');
    });

    test('異常系: taskNo が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/transitions/trans-001/status')
        .send({ status: validBody.status });
      expect(res.status).toBe(400);
    });

    test('異常系: status が 7（範囲外）の場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/transitions/trans-001/status')
        .send({ ...validBody, status: 7 });
      expect(res.status).toBe(400);
    });

    test('異常系: status が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/transitions/trans-001/status')
        .send({ taskNo: validBody.taskNo });
      expect(res.status).toBe(400);
    });

    test('正常系: progressRate 付きで 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/transitions/trans-001/status')
        .send({ ...validBody, progressRate: 50 });
      expect(res.status).toBe(200);
    });

    test('異常系: comment が 2000 文字超の場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/projects/proj-001/methods/method-001/transitions/trans-001/status')
        .send({ ...validBody, comment: 'a'.repeat(2001) });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /projects/:projectId/methods/:methodId/tasks/:taskNo/details
  // ==========================================================================
  describe('GET /projects/:projectId/methods/:methodId/tasks/:taskNo/details', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/methods/method-001/tasks/1/details');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getTaskDetail');
    });
  });

  // ==========================================================================
  // GET /projects/:projectId/work-details
  // ==========================================================================
  describe('GET /projects/:projectId/work-details', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/work-details');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getWorkDetails');
    });
  });

  // ==========================================================================
  // GET /projects/:projectId/ng-tasks（Phase2 新規追加）
  // ==========================================================================
  describe('GET /projects/:projectId/ng-tasks', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/projects/proj-001/ng-tasks');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getNgTasks');
    });

    test('異常系: POST は 404 を返すこと', async () => {
      const res = await request(app).post('/projects/proj-001/ng-tasks');
      expect(res.status).toBe(404);
    });
  });
});
