/**
 * organizationGroupRoutes フェーズ２ テスト
 *
 * 分類A：組織グループAPIのルーティング確認（Phase2 新規追加）
 * - GET    /                        組織グループ一覧
 * - POST   /                        組織グループ作成
 * - GET    /ancestors               祖先グループCD一覧
 * - GET    /users                   組織内ユーザー一覧
 * - GET    /:groupCd/members        メンバー一覧
 * - PUT    /:groupCd/members        メンバー一括更新
 * - PUT    /:groupCd/chief          代表者変更
 * - GET    /:groupCd                組織グループ単件取得
 * - PUT    /:groupCd                組織グループ更新
 * - PATCH  /:groupCd/status         アクティブ状態更新
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/organizationGroupRoutes';

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

jest.mock('../../../src/controllers/organizationGroupController', () => ({
  getOrganizationGroups: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getOrganizationGroups' })),
  createOrganizationGroup: jest.fn((_req: any, res: any) => res.status(201).json({ success: true, action: 'createOrganizationGroup' })),
  getAncestorGroupCds: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getAncestorGroupCds' })),
  getOrgUsers: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getOrgUsers' })),
  getOrganizationGroupMembers: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getOrganizationGroupMembers' })),
  setOrganizationGroupMembers: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'setOrganizationGroupMembers' })),
  updateOrganizationGroupChief: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateOrganizationGroupChief' })),
  getOrganizationGroupById: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getOrganizationGroupById' })),
  updateOrganizationGroup: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateOrganizationGroup' })),
  updateOrganizationGroupStatus: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateOrganizationGroupStatus' })),
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
describe('organizationGroupRoutes - Phase2 テスト', () => {
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
      expect(res.body.action).toBe('getOrganizationGroups');
    });
  });

  // ==========================================================================
  // POST /
  // ==========================================================================
  describe('POST /', () => {
    test('正常系: 有効なボディで 201 を返すこと', async () => {
      const res = await request(app)
        .post('/')
        .send({ organization_group_cd: 'group-A', organization_group_name: 'グループA' });
      expect(res.status).toBe(201);
      expect(res.body.action).toBe('createOrganizationGroup');
    });

    test('異常系: organization_group_cd が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .post('/')
        .send({ organization_group_name: 'グループA' });
      expect(res.status).toBe(400);
    });

    test('異常系: organization_group_name が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .post('/')
        .send({ organization_group_cd: 'group-A' });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /ancestors（静的ルート - /:groupCd より前に定義される必要がある）
  // ==========================================================================
  describe('GET /ancestors', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/ancestors');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getAncestorGroupCds');
    });
  });

  // ==========================================================================
  // GET /users（静的ルート）
  // ==========================================================================
  describe('GET /users', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/users');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getOrgUsers');
    });
  });

  // ==========================================================================
  // GET /:groupCd/members
  // ==========================================================================
  describe('GET /:groupCd/members', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/group-A/members');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getOrganizationGroupMembers');
    });
  });

  // ==========================================================================
  // PUT /:groupCd/members
  // ==========================================================================
  describe('PUT /:groupCd/members', () => {
    test('正常系: userIds が配列で 200 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A/members')
        .send({ userIds: ['user-001', 'user-002'] });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('setOrganizationGroupMembers');
    });

    test('異常系: userIds が配列でない場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A/members')
        .send({ userIds: 'invalid' });
      expect(res.status).toBe(400);
    });

    test('正常系: userIds が空配列（全メンバー削除）で 200 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A/members')
        .send({ userIds: [] });
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // PUT /:groupCd/chief
  // ==========================================================================
  describe('PUT /:groupCd/chief', () => {
    test('正常系: chiefUserId が有効で 200 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A/chief')
        .send({ chiefUserId: 'user-001' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateOrganizationGroupChief');
    });

    test('異常系: chiefUserId が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A/chief')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:groupCd
  // ==========================================================================
  describe('GET /:groupCd', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/group-A');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getOrganizationGroupById');
    });
  });

  // ==========================================================================
  // PUT /:groupCd
  // ==========================================================================
  describe('PUT /:groupCd', () => {
    test('正常系: organization_group_name を指定して 200 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A')
        .send({ organization_group_name: '更新後グループA' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateOrganizationGroup');
    });

    test('異常系: organization_group_name が空文字列の場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/group-A')
        .send({ organization_group_name: '' });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:groupCd/status
  // ==========================================================================
  describe('PATCH /:groupCd/status', () => {
    test('正常系: isActive=true で 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/group-A/status')
        .send({ isActive: true });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateOrganizationGroupStatus');
    });

    test('正常系: isActive=false（無効化）で 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/group-A/status')
        .send({ isActive: false });
      expect(res.status).toBe(200);
    });

    test('異常系: isActive が boolean でない場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/group-A/status')
        .send({ isActive: 'yes' });
      expect(res.status).toBe(400);
    });

    test('異常系: isActive が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/group-A/status')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
