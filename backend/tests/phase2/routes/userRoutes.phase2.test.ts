/**
 * userRoutes フェーズ２ テスト
 *
 * 分類A：ユーザー管理APIのルーティング確認（Phase2 変更あり）
 * - GET    /user                  ユーザー一覧
 * - GET    /user/download-csv     CSVダウンロード
 * - POST   /user/upload-csv       CSVアップロード
 * - GET    /user/:userId          ユーザー単件取得
 * - POST   /user                  ユーザー新規作成
 * - PUT    /user/:userId          ユーザー更新
 * - PATCH  /user/:userId/status   アクティブ状態更新
 */

import express from 'express';
import request from 'supertest';
import router from '../../../src/routes/userRoutes';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'user-001@example.com', organizationId: 'org-001', organizationGroupCds: ['group-A'] };
    next();
  }),
}));

jest.mock('../../../src/controllers/userController', () => ({
  getUsers: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getUsers' })),
  downloadUsersCsv: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'downloadUsersCsv' })),
  uploadUsersCsv: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'uploadUsersCsv' })),
  getUserById: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'getUserById' })),
  createUser: jest.fn((_req: any, res: any) => res.status(201).json({ success: true, action: 'createUser' })),
  updateUser: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateUser' })),
  updateUserStatus: jest.fn((_req: any, res: any) => res.status(200).json({ success: true, action: 'updateUserStatus' })),
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
describe('userRoutes - Phase2 テスト', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /user
  // ==========================================================================
  describe('GET /user', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/user');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getUsers');
    });

    test('正常系: search クエリ付きで 200 を返すこと', async () => {
      const res = await request(app).get('/user?search=テスト');
      expect(res.status).toBe(200);
    });

    test('異常系: sort_by が不正な値の場合 400 を返すこと', async () => {
      const res = await request(app).get('/user?sort_by=invalid_field');
      expect(res.status).toBe(400);
    });

    test('異常系: sort_order が不正な値の場合 400 を返すこと', async () => {
      const res = await request(app).get('/user?sort_order=invalid');
      expect(res.status).toBe(400);
    });

    test('正常系: sort_by=user_name&sort_order=asc で 200 を返すこと', async () => {
      const res = await request(app).get('/user?sort_by=user_name&sort_order=asc');
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // GET /user/download-csv（静的ルート - /user/:userId より前に定義する必要がある）
  // ==========================================================================
  describe('GET /user/download-csv', () => {
    test('正常系: 200 を返すこと', async () => {
      const res = await request(app).get('/user/download-csv');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('downloadUsersCsv');
    });

    test('確認: /user/download-csv が /user/:userId に誤マッチしないこと', async () => {
      const res = await request(app).get('/user/download-csv');
      expect(res.body.action).toBe('downloadUsersCsv');
    });
  });

  // ==========================================================================
  // POST /user/upload-csv（静的ルート）
  // ==========================================================================
  describe('POST /user/upload-csv', () => {
    test('正常系: マルチパートフォームなしでも 200 を返すこと（コントローラーがモック）', async () => {
      const res = await request(app).post('/user/upload-csv');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('uploadUsersCsv');
    });
  });

  // ==========================================================================
  // GET /user/:userId
  // ==========================================================================
  describe('GET /user/:userId', () => {
    test('正常系: メールアドレス形式の userId で 200 を返すこと', async () => {
      const res = await request(app).get('/user/test%40example.com');
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('getUserById');
    });

    test('異常系: userId がメールアドレス形式でない場合 400 を返すこと', async () => {
      const res = await request(app).get('/user/not-an-email');
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // POST /user
  // ==========================================================================
  describe('POST /user', () => {
    const validBody = {
      userId: 'newuser@example.com',
      userName: '新規ユーザー',
      mailAddress: 'newuser@example.com',
      roleCd: 'researcher',
    };

    test('正常系: 有効なボディで 201 を返すこと', async () => {
      const res = await request(app).post('/user').send(validBody);
      expect(res.status).toBe(201);
      expect(res.body.action).toBe('createUser');
    });

    test('異常系: userId が欠落した場合 400 を返すこと', async () => {
      const { userId: _omit, ...body } = validBody;
      const res = await request(app).post('/user').send(body);
      expect(res.status).toBe(400);
    });

    test('異常系: userId がメールアドレス形式でない場合 400 を返すこと', async () => {
      const res = await request(app).post('/user').send({ ...validBody, userId: 'not-email' });
      expect(res.status).toBe(400);
    });

    test('異常系: userName が欠落した場合 400 を返すこと', async () => {
      const { userName: _omit, ...body } = validBody;
      const res = await request(app).post('/user').send(body);
      expect(res.status).toBe(400);
    });

    test('異常系: userName が 31 文字以上の場合 400 を返すこと', async () => {
      const res = await request(app).post('/user').send({ ...validBody, userName: 'a'.repeat(31) });
      expect(res.status).toBe(400);
    });

    test('異常系: mailAddress がメールアドレス形式でない場合 400 を返すこと', async () => {
      const res = await request(app).post('/user').send({ ...validBody, mailAddress: 'not-email' });
      expect(res.status).toBe(400);
    });

    test('異常系: roleCd が欠落した場合 400 を返すこと', async () => {
      const { roleCd: _omit, ...body } = validBody;
      const res = await request(app).post('/user').send(body);
      expect(res.status).toBe(400);
    });

    test('正常系: password 付きで 201 を返すこと', async () => {
      const res = await request(app).post('/user').send({ ...validBody, password: 'Password1!' });
      expect(res.status).toBe(201);
    });

    test('異常系: password が 7 文字以下の場合 400 を返すこと', async () => {
      const res = await request(app).post('/user').send({ ...validBody, password: 'Pass1!' });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // PUT /user/:userId
  // ==========================================================================
  describe('PUT /user/:userId', () => {
    test('正常系: 有効なボディで 200 を返すこと', async () => {
      const res = await request(app)
        .put('/user/test%40example.com')
        .send({ userName: '更新後ユーザー' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateUser');
    });

    test('異常系: userId がメールアドレス形式でない場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/user/not-an-email')
        .send({ userName: '更新後ユーザー' });
      expect(res.status).toBe(400);
    });

    test('異常系: userName が 31 文字以上の場合 400 を返すこと', async () => {
      const res = await request(app)
        .put('/user/test%40example.com')
        .send({ userName: 'a'.repeat(31) });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /user/:userId/status
  // ==========================================================================
  describe('PATCH /user/:userId/status', () => {
    test('正常系: isActive=true で 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/user/test%40example.com/status')
        .send({ isActive: true });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('updateUserStatus');
    });

    test('正常系: isActive=false で 200 を返すこと', async () => {
      const res = await request(app)
        .patch('/user/test%40example.com/status')
        .send({ isActive: false });
      expect(res.status).toBe(200);
    });

    test('異常系: isActive が欠落した場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/user/test%40example.com/status')
        .send({});
      expect(res.status).toBe(400);
    });

    test('異常系: isActive が boolean でない場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/user/test%40example.com/status')
        .send({ isActive: 'yes' });
      expect(res.status).toBe(400);
    });

    test('異常系: userId がメールアドレス形式でない場合 400 を返すこと', async () => {
      const res = await request(app)
        .patch('/user/not-an-email/status')
        .send({ isActive: true });
      expect(res.status).toBe(400);
    });
  });
});
