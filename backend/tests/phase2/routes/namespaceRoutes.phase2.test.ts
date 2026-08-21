/**
 * namespaceRoutes フェーズ２ テスト
 *
 * 分類A：名前空間APIのルーティング確認（Phase2 新規追加）
 * - GET    /          名前空間一覧
 * - POST   /          名前空間作成
 * - PATCH  /:prefix   名前空間URI更新
 * - DELETE /:prefix   名前空間削除
 * - GET    /declarations
 * - GET    /terms
 * - POST   /terms
 * - PUT    /terms/:prefix/:localName
 * - DELETE /terms/:prefix/:localName
 * - PATCH  /terms/:prefix/:localName/active
 * - GET    /project-declarations
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/namespaceRoutes';

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

// namespaceValidation のバリデーション関数をすべてスキップ
jest.mock('../../../src/middleware/namespaceValidation', () => ({
  validateGetNamespaces: jest.fn((_req: any, _res: any, next: any) => next()),
  validateCreateNamespace: jest.fn((_req: any, _res: any, next: any) => next()),
  validateUpdateNamespace: jest.fn((_req: any, _res: any, next: any) => next()),
  validateDeleteNamespace: jest.fn((_req: any, _res: any, next: any) => next()),
  validateCreateTerm: jest.fn((_req: any, _res: any, next: any) => next()),
  validateUpdateTerm: jest.fn((_req: any, _res: any, next: any) => next()),
  validateDeleteTerm: jest.fn((_req: any, _res: any, next: any) => next()),
  validateToggleTermActive: jest.fn((_req: any, _res: any, next: any) => next()),
  validateGetTerms: jest.fn((_req: any, _res: any, next: any) => next()),
  validateGetDeclarationsByProject: jest.fn((_req: any, _res: any, next: any) => next()),
}));

jest.mock('../../../src/controllers/namespaceController', () => ({
  getNamespaces: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getNamespaces' })),
  createNamespace: jest.fn((_req: any, res: any) => res.status(201).json({ success: true, action: 'createNamespace' })),
  updateNamespace: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateNamespace' })),
  deleteNamespace: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'deleteNamespace' })),
  getDeclarations: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getDeclarations' })),
  getTerms: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getTerms' })),
  createTerm: jest.fn((_req: any, res: any) => res.status(201).json({ success: true, action: 'createTerm' })),
  updateTerm: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateTerm' })),
  deleteTerm: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'deleteTerm' })),
  toggleTermActive: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'toggleTermActive' })),
  getDeclarationsByProject: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getDeclarationsByProject' })),
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
describe('namespaceRoutes - Phase2 テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // 名前空間（Prefix）管理
  // ==========================================================================
  describe('GET / （名前空間一覧）', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getNamespaces');
    });
  });

  describe('POST / （名前空間作成）', () => {
    test('正常系: 201 を返すこと', async () => {
      const res = await request(app)
        .post('/')
        .send({ prefix: 'ex', uri: 'http://example.org/', displayName: 'Example' });
      expect(res.status).toBe(201);
      expect(res.body.action).toBe('createNamespace');
    });
  });

  describe('PATCH /:prefix （URI更新）', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/ex')
        .send({ uri: 'http://example.org/v2/' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateNamespace');
    });
  });

  describe('DELETE /:prefix （名前空間削除）', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).delete('/ex');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('deleteNamespace');
    });
  });

  // ==========================================================================
  // 名前空間宣言
  // ==========================================================================
  describe('GET /declarations', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/declarations');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getDeclarations');
    });
  });

  describe('GET /project-declarations', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/project-declarations?projectId=proj-001');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getDeclarationsByProject');
    });
  });

  // ==========================================================================
  // 用語管理
  // ==========================================================================
  describe('GET /terms', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/terms');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getTerms');
    });
  });

  describe('POST /terms', () => {
    test('正常系: 201 を返すこと', async () => {
      const res = await request(app)
        .post('/terms')
        .send({ prefix: 'ex', localName: 'temperature', displayName: '温度' });
      expect(res.status).toBe(201);
      expect(res.body.action).toBe('createTerm');
    });
  });

  describe('PUT /terms/:prefix/:localName', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app)
        .put('/terms/ex/temperature')
        .send({ displayName: '温度（更新後）' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateTerm');
    });
  });

  describe('DELETE /terms/:prefix/:localName', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).delete('/terms/ex/temperature');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('deleteTerm');
    });
  });

  describe('PATCH /terms/:prefix/:localName/active', () => {
    test('正常系: isActive=true で 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/terms/ex/temperature/active')
        .send({ isActive: true });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('toggleTermActive');
    });

    test('正常系: isActive=false で 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/terms/ex/temperature/active')
        .send({ isActive: false });
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // メソッド不一致確認
  // ==========================================================================
  describe('メソッド不一致', () => {
    test('GET /terms/:prefix/:localName は存在しないため 404 を返すこと', async () => {
      const res = await request(app).get('/terms/ex/temperature');
      // PUT/DELETE のみ定義されているため GET は 404
      expect(res.status).toBe(404);
    });
  });
});
