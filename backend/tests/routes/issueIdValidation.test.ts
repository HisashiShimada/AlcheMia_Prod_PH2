/**
 * 問題ID (issueId) パラメータバリデーションテスト
 * 
 * @description タスク1.2 - issueIdパラメータのバリデーション検証
 * Requirements: REQ-004 (入力バリデーション)
 */

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import issueRoutes from '../../src/routes/issueRoutes';

// Expressアプリケーションのセットアップ
const app = express();
app.use(express.json());

// 認証ミドルウェアのモック
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.user = {
    userId: 'test-user-id',
    organizationId: 'test-org-id',
    sessionId: 'test-session-id',
    permissions: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  next();
});

app.use('/api/v1/issues', issueRoutes);

describe('Issue ID Parameter Validation - Task 1.2', () => {
  const validIssueId = 'issue-001';
  const validStatus = { status: 'resolved' };

  describe('正常なissueId形式', () => {
    test('文字列形式のissueIdが受け入れられること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send(validStatus);

      // バリデーションエラー(400)ではないことを確認
      // 実際のレスポンスは404または500（データベースエラー）になる
      expect(response.status).not.toBe(400);
    });

    test('ハイフン区切りのissueIdが受け入れられること', async () => {
      const hyphenatedId = 'issue-12345-test';
      const response = await request(app)
        .patch(`/api/v1/issues/${hyphenatedId}/status`)
        .send(validStatus);

      expect(response.status).not.toBe(400);
    });

    test('アンダースコア区切りのissueIdが受け入れられること', async () => {
      const underscoreId = 'issue_001_test';
      const response = await request(app)
        .patch(`/api/v1/issues/${underscoreId}/status`)
        .send(validStatus);

      expect(response.status).not.toBe(400);
    });

    test('50文字のissueIdが受け入れられること', async () => {
      const maxLengthId = 'a'.repeat(50);
      const response = await request(app)
        .patch(`/api/v1/issues/${maxLengthId}/status`)
        .send(validStatus);

      expect(response.status).not.toBe(400);
    });
  });

  describe('不正なissueId形式 - 400エラーを返すこと', () => {
    test('issueIdが空文字列の場合、404エラーが返ること', async () => {
      // 空文字列の場合、Expressルーティングがマッチせず404になる
      const response = await request(app)
        .patch('/api/v1/issues//status')
        .send(validStatus);

      expect(response.status).toBe(404);
    });

    test('issueIdが51文字以上の場合、400バリデーションエラーが返ること', async () => {
      const tooLongId = 'a'.repeat(51);
      const response = await request(app)
        .patch(`/api/v1/issues/${tooLongId}/status`)
        .send(validStatus);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('issueId');
    });

    test('issueIdが100文字の場合、400エラーが返ること', async () => {
      const veryLongId = 'a'.repeat(100);
      const response = await request(app)
        .patch(`/api/v1/issues/${veryLongId}/status`)
        .send(validStatus);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('エラーメッセージの明確性', () => {
    test('issueIdバリデーションエラーのメッセージに"issueId"が含まれること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/invalid-id/status')
        .send(validStatus);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('issueId');
      // エラーメッセージに"comment"が含まれないこと（バグ修正の確認）
      expect(response.body.error.message).not.toContain('comment');
    });

    test('エラーメッセージがUUID形式であることを示すこと', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/abc123/status')
        .send(validStatus);

      expect(response.status).toBe(400);
      const errorMessage = response.body.error.message.toLowerCase();
      expect(errorMessage).toMatch(/uuid|形式/);
    });

    test('バリデーションエラーの詳細にfield名が含まれること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/invalid/status')
        .send(validStatus);

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('details');
      
      if (Array.isArray(response.body.error.details) && response.body.error.details.length > 0) {
        const issueIdError = response.body.error.details.find(
          (detail: any) => detail.field === 'issueId'
        );
        expect(issueIdError).toBeDefined();
        expect(issueIdError.message).toBeTruthy();
      }
    });
  });

  describe('エラーレスポンス形式の統一性', () => {
    test('issueIdバリデーションエラーが統一されたレスポンス形式であること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/not-a-uuid/status')
        .send(validStatus);

      expect(response.status).toBe(400);
      
      // 統一されたレスポンス形式
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');

      // errorオブジェクトの構造
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');

      // metaオブジェクトの構造
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    test('複数のバリデーションエラー（statusとissueIdの両方が不正）が返ること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/invalid-id/status')
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
      
      // 少なくとも1つのエラーが含まれること
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe('セキュリティ: エラーメッセージに機密情報が含まれないこと', () => {
    test('不正なissueIdでのエラーに内部情報が含まれないこと', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/../../../etc/passwd/status')
        .send(validStatus);

      const responseStr = JSON.stringify(response.body);
      
      // スタックトレースが含まれないこと
      expect(responseStr).not.toContain('at ');
      expect(responseStr).not.toContain('.ts:');
      
      // ファイルパスが含まれないこと
      expect(responseStr).not.toContain('/backend/');
      expect(responseStr).not.toContain('\\backend\\');
      
      // データベース情報が含まれないこと
      expect(responseStr).not.toContain('postgres');
      expect(responseStr).not.toContain('SELECT');
    });
  });

  describe('境界値テスト', () => {
    test('issueIdが1文字の場合、400エラーが返ること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/a/status')
        .send(validStatus);

      expect(response.status).toBe(400);
    });

    test('issueIdが非常に長い場合、400エラーが返ること', async () => {
      const longId = 'a'.repeat(500);
      const response = await request(app)
        .patch(`/api/v1/issues/${longId}/status`)
        .send(validStatus);

      expect(response.status).toBe(400);
    });

    test('issueIdに空白が含まれる場合、400またはルートマッチせずエラーが返ること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/test id/status')
        .send(validStatus);

      // 400 (バリデーション) または 404 (ルートマッチ失敗)
      expect([400, 404]).toContain(response.status);
    });
  });
});
