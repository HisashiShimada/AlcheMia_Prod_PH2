/**
 * uncertaintyCriteriaRoutes フェーズ２ テスト（拡張版）
 *
 * エクスポート / インポート エンドポイントのルーティング確認を追加
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
  getList:         jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getList' })),
  getForSelector:  jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getForSelector' })),
  createNewVersion:jest.fn((_req: any, res: any) => res.status(201).json({ success: true, action: 'createNewVersion' })),
  getDetail:       jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getDetail' })),
  exportCriteria:  jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'exportCriteria' })),
  importCriteria:  jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'importCriteria' })),
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
describe('uncertaintyCriteriaRoutes - エクスポート/インポート テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /export
  // ==========================================================================
  describe('GET /export', () => {
    test('正常系: uncertaintyKeys 指定で 200 を返すこと', async () => {
      const res = await request(app).get('/export?uncertaintyKeys=uk-001&format=xml');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('exportCriteria');
    });

    test('正常系: format=json で 200 を返すこと', async () => {
      const res = await request(app).get('/export?uncertaintyKeys=uk-001&format=json');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('exportCriteria');
    });

    test('異常系: uncertaintyKeys が欠落した場合 400 を返すこと', async () => {
      const res = await request(app).get('/export');
      expect(res.status).toBe(400);
    });

    test('異常系: format が xml/json 以外の場合 400 を返すこと', async () => {
      const res = await request(app).get('/export?uncertaintyKeys=uk-001&format=csv');
      expect(res.status).toBe(400);
    });

    test('確認: /export が /:uncertaintyKey に誤マッチしないこと', async () => {
      const res = await request(app).get('/export?uncertaintyKeys=uk-001');
      expect(res.body.action).toBe('exportCriteria');
    });
  });

  // ==========================================================================
  // POST /import
  // ==========================================================================
  describe('POST /import', () => {
    test('正常系: ファイル添付で 200 を返すこと', async () => {
      const res = await request(app)
        .post('/import')
        .attach('file', Buffer.from('uncertaintyKey,uncertaintyName,evaluationMethod\nuk-001,test,1'), 'test.csv')
        .field('format', 'csv')
        .field('nameSpaceId', 'ns-001');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('importCriteria');
    });
  });

  // ==========================================================================
  // ルート順序確認（静的ルートが動的ルートより優先されること）
  // ==========================================================================
  describe('ルート順序確認', () => {
    test('/export は /:uncertaintyKey より前に評価されること', async () => {
      const exportRes = await request(app).get('/export?uncertaintyKeys=uk-001');
      expect(exportRes.body.action).toBe('exportCriteria');

      const detailRes = await request(app).get('/some-key?version=1');
      expect(detailRes.body.action).toBe('getDetail');
    });
  });
});
