/**
 * experimentEvaluationRoutes フェーズ２ テスト
 *
 * 分類A：実験評価APIのルーティング確認（Phase2 新規追加）
 * - GET  /:projectId
 * - POST /
 * - POST /:projectId/export-to-maiml
 *
 * テスト戦略：
 *   supertest でルーターを直接マウントし、HTTPリクエストを送信する。
 *   authMiddleware / tenantIsolation / Controller はモックに置き換える。
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/experimentEvaluationRoutes';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'user-001', organizationId: 'org-001', organizationGroupCds: ['group-A'] };
    next();
  }),
}));

jest.mock('../../../src/middleware/tenantIsolation', () => ({
  tenantIsolation: jest.fn((req: any, _res: any, next: any) => {
    req.organizationId = 'org-001';
    next();
  }),
}));

jest.mock('../../../src/controllers/experimentEvaluationController', () => ({
  getByProject: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  saveEvaluations: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
  exportToMaiml: jest.fn((_req: any, res: any) => res.status(200).json({ success: true })),
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
describe('experimentEvaluationRoutes - Phase2 テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /:projectId
  // ==========================================================================
  describe('GET /:projectId', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/proj-001');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('異常系: projectId が空パスの場合は 404 を返すこと', async () => {
      // ルートが /:projectId のため空は別ルートとして処理される
      const res = await request(app).get('/');
      // POST / が存在するため GET / は 404
      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // POST /
  // ==========================================================================
  describe('POST /', () => {
    const validBody = {
      projectId: 'proj-001',
      evaluations: [
        {
          evaluationUnit: 'unit-001',
          nameSpaceId: 'ns-001',
          uncertaintyKey: 'uk-001',
          ucVersion: 1,
        },
      ],
    };

    test('正常系: 有効なボディで 200 を返すこと', async () => {
      const res = await request(app).post('/').send(validBody);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('異常系: projectId が欠落した場合 400 を返すこと', async () => {
      const { projectId: _omit, ...body } = validBody;
      const res = await request(app).post('/').send(body);
      expect(res.status).toBe(400);
    });

    test('異常系: evaluations が空配列の場合 400 を返すこと', async () => {
      const res = await request(app).post('/').send({ ...validBody, evaluations: [] });
      expect(res.status).toBe(400);
    });

    test('異常系: evaluations.ucVersion が 0 の場合 400 を返すこと', async () => {
      const res = await request(app).post('/').send({
        ...validBody,
        evaluations: [{ ...validBody.evaluations[0], ucVersion: 0 }],
      });
      expect(res.status).toBe(400);
    });

    test('異常系: evaluations.evaluationUnit が欠落した場合 400 を返すこと', async () => {
      const { evaluationUnit: _omit, ...evalWithoutUnit } = validBody.evaluations[0];
      const res = await request(app).post('/').send({
        ...validBody,
        evaluations: [evalWithoutUnit],
      });
      expect(res.status).toBe(400);
    });

    test('異常系: evaluations.nameSpaceId が欠落した場合 400 を返すこと', async () => {
      const { nameSpaceId: _omit, ...evalWithoutNs } = validBody.evaluations[0];
      const res = await request(app).post('/').send({
        ...validBody,
        evaluations: [evalWithoutNs],
      });
      expect(res.status).toBe(400);
    });

    test('異常系: evaluations.uncertaintyKey が欠落した場合 400 を返すこと', async () => {
      const { uncertaintyKey: _omit, ...evalWithoutKey } = validBody.evaluations[0];
      const res = await request(app).post('/').send({
        ...validBody,
        evaluations: [evalWithoutKey],
      });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // POST /:projectId/export-to-maiml
  // ==========================================================================
  describe('POST /:projectId/export-to-maiml', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).post('/proj-001/export-to-maiml');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('異常系: PATCH メソッドは 404 を返すこと', async () => {
      const res = await request(app).patch('/proj-001/export-to-maiml');
      expect(res.status).toBe(404);
    });
  });
});
