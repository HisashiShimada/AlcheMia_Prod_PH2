/**
 * experimentInstructionRoutes フェーズ２ テスト
 *
 * 分類A：実験指示・実験計画APIのルーティング確認（Phase2 新規追加）
 * 実験指示:
 *   GET  /:projectId/experiment-instructions
 *   GET  /:projectId/methods
 *   PUT  /:projectId/tasks/:methodId/:taskNo/approve
 *   PUT  /:projectId/tasks/:methodId/:taskNo/ng
 *   GET  /:projectId/methods/:methodId/plan-dialog-data
 * 実験計画:
 *   GET    /:projectId/experiment-plans
 *   PUT    /:projectId/experiment-plans/:methodId/:taskNo
 *   DELETE /:projectId/experiment-plans/:methodId
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/experimentInstructionRoutes';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'user-001', organizationId: 'org-001', organizationGroupCds: ['group-A'] };
    next();
  }),
}));

jest.mock('../../../src/controllers/experimentInstructionController', () => ({
  getExperimentInstructions: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  getProjectMethods: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  approveTask: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  recordNg: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  getPlanDialogData: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
}));

jest.mock('../../../src/controllers/experimentPlanController', () => ({
  getExperimentPlans: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  upsertExperimentPlan: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  deleteExperimentPlans: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
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
describe('experimentInstructionRoutes - Phase2 テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // 実験指示系
  // ==========================================================================
  describe('GET /:projectId/experiment-instructions', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/proj-001/experiment-instructions');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /:projectId/methods', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/proj-001/methods');
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /:projectId/tasks/:methodId/:taskNo/approve', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).put('/proj-001/tasks/method-001/1/approve');
      expect(res.status).toBe(200);
    });

    test('異常系: POST メソッドは 404 を返すこと', async () => {
      const res = await request(app).post('/proj-001/tasks/method-001/1/approve');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /:projectId/tasks/:methodId/:taskNo/ng', () => {
    test('正常系: ngReason が有効な場合 200 を返すこと', async () => {
      const res = await request(app)
        .put('/proj-001/tasks/method-001/1/ng')
        .send({ ngReason: 'データが不正です' });
      expect(res.status).toBe(200);
    });

    test('異常系: ngReason が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/proj-001/tasks/method-001/1/ng')
        .send({});
      expect(res.status).toBe(400);
    });

    test('異常系: ngReason が空文字列の場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/proj-001/tasks/method-001/1/ng')
        .send({ ngReason: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /:projectId/methods/:methodId/plan-dialog-data', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/proj-001/methods/method-001/plan-dialog-data');
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // 実験計画系
  // ==========================================================================
  describe('GET /:projectId/experiment-plans', () => {
    test('正常系: methodId クエリ付きで 200 を返すこと', async () => {
      const res = await request(app).get('/proj-001/experiment-plans?methodId=method-001');
      expect(res.status).toBe(200);
    });

    test('異常系: methodId クエリが欠落した場合 400 を返すこと', async () => {
      const res = await request(app).get('/proj-001/experiment-plans');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /:projectId/experiment-plans/:methodId/:taskNo', () => {
    test('正常系: plannedValues が有効な場合 200 を返すこと', async () => {
      const res = await request(app)
        .put('/proj-001/experiment-plans/method-001/1')
        .send({ plannedValues: { temperature: 25, pressure: 101.3 } });
      expect(res.status).toBe(200);
    });

    test('異常系: plannedValues が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/proj-001/experiment-plans/method-001/1')
        .send({});
      expect(res.status).toBe(400);
    });

    test('異常系: plannedValues が配列（オブジェクトでない）の場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/proj-001/experiment-plans/method-001/1')
        .send({ plannedValues: ['invalid'] });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /:projectId/experiment-plans/:methodId', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).delete('/proj-001/experiment-plans/method-001');
      expect(res.status).toBe(200);
    });

    test('異常系: GET メソッドへのアクセスはルートが別', async () => {
      // GET /:projectId/experiment-plans は別ルート
      const res = await request(app).get('/proj-001/experiment-plans?methodId=method-001');
      expect(res.status).toBe(200);
    });
  });
});
