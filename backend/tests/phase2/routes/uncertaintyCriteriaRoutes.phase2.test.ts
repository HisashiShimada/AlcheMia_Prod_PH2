/**
 * uncertaintyCriteriaRoutes フェーズ２ テスト
 *
 * 分類A：不確かさ基準APIのルーティング確認（Phase2 新規追加）
 * - GET  /                不確かさ基準一覧
 * - GET  /for-selector    セレクター用一覧
 * - POST /                新バージョン保存
 * - GET  /:uncertaintyKey 詳細取得（?version=N）
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/uncertaintyCriteriaRoutes';

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

jest.mock('../../../src/controllers/uncertaintyCriteriaController', () => ({
  getList: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getList' })),
  getForSelector: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getForSelector' })),
  createNewVersion: jest.fn((_req: any, res: any) => res.status(201).json({ success: true, action: 'createNewVersion' })),
  getDetail: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getDetail' })),
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
describe('uncertaintyCriteriaRoutes - Phase2 テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /
  // ==========================================================================
  describe('GET /', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getList');
    });
  });

  // ==========================================================================
  // GET /for-selector（静的ルート - /:uncertaintyKey より前に定義される必要がある）
  // ==========================================================================
  describe('GET /for-selector', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/for-selector');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getForSelector');
    });

    test('確認: /for-selector が /:uncertaintyKey に誤マッチしないこと', async () => {
      // getForSelector が呼ばれること（getDetail ではない）
      const res = await request(app).get('/for-selector');
      expect(res.body.action).toBe('getForSelector');
    });
  });

  // ==========================================================================
  // POST /
  // ==========================================================================
  describe('POST /', () => {
    const validQuantitativeBody = {
      nameSpaceId: 'ns-001',
      uncertaintyKey: 'uk-001',
      evaluationMethod: 1,
    };

    const validQualitativeBody = {
      nameSpaceId: 'ns-001',
      uncertaintyKey: 'uk-002',
      evaluationMethod: 2,
      qualitativeOptions: ['低い', '中程度', '高い'],
    };

    test('正常系（定量）: evaluationMethod=1 で 201 を返すこと', async () => {
      const res = await request(app).post('/').send(validQuantitativeBody);
      expect(res.status).toBe(201);
      expect(res.body.action).toBe('createNewVersion');
    });

    test('正常系（定性）: evaluationMethod=2 + qualitativeOptions で 201 を返すこと', async () => {
      const res = await request(app).post('/').send(validQualitativeBody);
      expect(res.status).toBe(201);
    });

    test('異常系: nameSpaceId が欠落した場合 400 を返すこと', async () => {
      const { nameSpaceId: _omit, ...body } = validQuantitativeBody;
      const res = await request(app).post('/').send(body);
      expect(res.status).toBe(400);
    });

    test('異常系: uncertaintyKey が欠落した場合 400 を返すこと', async () => {
      const { uncertaintyKey: _omit, ...body } = validQuantitativeBody;
      const res = await request(app).post('/').send(body);
      expect(res.status).toBe(400);
    });

    test('異常系: evaluationMethod が欠落した場合 400 を返すこと', async () => {
      const { evaluationMethod: _omit, ...body } = validQuantitativeBody;
      const res = await request(app).post('/').send(body);
      expect(res.status).toBe(400);
    });

    test('異常系: evaluationMethod が 0（範囲外）の場合 400 を返すこと', async () => {
      const res = await request(app).post('/').send({ ...validQuantitativeBody, evaluationMethod: 0 });
      expect(res.status).toBe(400);
    });

    test('異常系: evaluationMethod が 3（範囲外）の場合 400 を返すこと', async () => {
      const res = await request(app).post('/').send({ ...validQuantitativeBody, evaluationMethod: 3 });
      expect(res.status).toBe(400);
    });

    test('異常系: qualitativeOptions が配列でない場合 400 を返すこと', async () => {
      const res = await request(app).post('/').send({
        ...validQualitativeBody,
        qualitativeOptions: '低い,中程度,高い',
      });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:uncertaintyKey
  // ==========================================================================
  describe('GET /:uncertaintyKey', () => {
    test('正常系: version クエリ付きで 200 を返すこと', async () => {
      const res = await request(app).get('/uk-001?version=1');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getDetail');
    });

    test('異常系: version クエリが欠落した場合 400 を返すこと', async () => {
      const res = await request(app).get('/uk-001');
      expect(res.status).toBe(400);
    });

    test('異常系: version が 0（1未満）の場合 400 を返すこと', async () => {
      const res = await request(app).get('/uk-001?version=0');
      expect(res.status).toBe(400);
    });

    test('異常系: version が整数でない場合 400 を返すこと', async () => {
      const res = await request(app).get('/uk-001?version=abc');
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // メソッド不一致
  // ==========================================================================
  describe('メソッド不一致', () => {
    test('DELETE / は存在しないため 404 を返すこと', async () => {
      const res = await request(app).delete('/');
      expect(res.status).toBe(404);
    });

    test('PUT /:uncertaintyKey は存在しないため 404 を返すこと', async () => {
      const res = await request(app).put('/uk-001');
      expect(res.status).toBe(404);
    });
  });
});
