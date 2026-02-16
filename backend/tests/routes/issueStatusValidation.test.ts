/**
 * 問題ステータス変更バリデーションテスト
 * 
 * @description タスク1.1 - ステータス値のバリデーションルール検証
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

describe('Issue Status Validation - Task 1.1', () => {
  const validIssueId = '550e8400-e29b-41d4-a716-446655440001';

  describe('正常なステータス値', () => {
    test('status="unresolved"が受け入れられること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: 'unresolved' });

      // 認証後のレスポンス（400以外）が返ることを期待
      // 実際のデータベースエラーは500または404になる
      expect(response.status).not.toBe(400);
    });

    test('status="resolved"が受け入れられること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: 'resolved' });

      // 認証後のレスポンス（400以外）が返ることを期待
      expect(response.status).not.toBe(400);
    });
  });

  describe('不正なステータス値 - 400エラーを返すこと', () => {
    test('空文字列でバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    test('nullでバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: null });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toMatch(/VALIDATION/);
    });

    test('undefinedでバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('status');
    });

    test('不正な文字列"invalid"でバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('unresolved');
      expect(response.body.error.message).toContain('resolved');
    });

    test('数値でバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('オブジェクトでバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: { value: 'resolved' } });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('配列でバリデーションエラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: ['resolved'] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('エラーレスポンス形式の統一性', () => {
    test('バリデーションエラーレスポンスが統一形式であること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: 'invalid_status' });

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
      expect(typeof response.body.meta.timestamp).toBe('string');
      expect(typeof response.body.meta.requestId).toBe('string');
    });

    test('複数のバリデーションエラーがdetails配列に含まれること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
      
      if (response.body.error.details.length > 0) {
        const detail = response.body.error.details[0];
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('message');
      }
    });

    test('エラーメッセージに機密情報が含まれないこと', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${validIssueId}/status`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      
      const responseStr = JSON.stringify(response.body);
      
      // スタックトレースが含まれないこと
      expect(responseStr).not.toContain('at ');
      expect(responseStr).not.toContain('.ts:');
      expect(responseStr).not.toContain('Error:');
      
      // ファイルパスが含まれないこと
      expect(responseStr).not.toContain('/backend/');
      expect(responseStr).not.toContain('\\backend\\');
      expect(responseStr).not.toContain('src/');
      
      // データベース情報が含まれないこと
      expect(responseStr).not.toContain('postgres');
      expect(responseStr).not.toContain('SELECT');
      expect(responseStr).not.toContain('UPDATE');
    });
  });

  describe('ISSUE_STATUS_VALUES定数の使用確認', () => {
    test('許可される値が"unresolved"と"resolved"のみであること', async () => {
      // この値以外はすべて400エラーになるはず
      const invalidStatuses = [
        'pending',
        'in_progress',
        'closed',
        'reopened',
        'RESOLVED',
        'UNRESOLVED',
      ];

      for (const status of invalidStatuses) {
        const response = await request(app)
          .patch(`/api/v1/issues/${validIssueId}/status`)
          .send({ status });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('issueIdパラメータのバリデーション', () => {
    test('issueIdが空文字列の場合、404エラーが返ること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues//status')
        .send({ status: 'resolved' });

      expect(response.status).toBe(404);
    });

    test('issueIdが不正な形式の場合、バリデーションエラーまたは404が返ること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/invalid-id/status')
        .send({ status: 'resolved' });

      // バリデーションエラー(400)またはルートマッチせず(404)
      expect([400, 404]).toContain(response.status);
    });
  });
});
