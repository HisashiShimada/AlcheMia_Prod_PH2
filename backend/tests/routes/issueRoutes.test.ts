/**
 * 問題報告ルートテスト
 * 
 * @description issueRoutes.tsのルーティング設定をテスト
 * Task: 4.2 ルート定義のテスト
 */

import request from 'supertest';
import express from 'express';
import issueRoutes from '../../src/routes/issueRoutes';

// Expressアプリケーションのセットアップ
const app = express();
app.use(express.json());
app.use('/api/v1/issues', issueRoutes);

describe('Issue Routes', () => {
  describe('POST /api/v1/issues', () => {
    test('問題報告エンドポイントが存在すること', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .send({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          methodId: 'method_001',
          issueType: 'material_shortage',
          targetType: 'transition',
          taskNo: 1,
          transitionId: 'transition_001',
          title: 'テスト問題',
          description: 'テスト説明'
        });

      // 認証エラー（401）またはその他のエラーが返ることを期待
      // エンドポイントが存在しない場合は404が返る
      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/v1/issues/:issueId/comments', () => {
    test('コメント投稿エンドポイントが存在すること', async () => {
      const response = await request(app)
        .post('/api/v1/issues/770e8400-e29b-41d4-a716-446655440002/comments')
        .send({
          comment: 'テストコメント'
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/v1/issues', () => {
    test('問題一覧取得エンドポイントが存在すること', async () => {
      const response = await request(app)
        .get('/api/v1/issues');

      expect(response.status).not.toBe(404);
    });

    test('クエリパラメータを受け付けること', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'unresolved',
          page: 1,
          limit: 20
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/v1/issues/:issueId', () => {
    test('問題詳細取得エンドポイントが存在すること', async () => {
      const response = await request(app)
        .get('/api/v1/issues/770e8400-e29b-41d4-a716-446655440002');

      expect(response.status).not.toBe(404);
    });
  });

  describe('PATCH /api/v1/issues/:issueId/status', () => {
    test('ステータス変更エンドポイントが存在すること', async () => {
      const response = await request(app)
        .patch('/api/v1/issues/770e8400-e29b-41d4-a716-446655440002/status')
        .send({
          status: 'resolved'
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe('ルーティング設定', () => {
    test('ベースパス /api/v1/issues が正しく設定されていること', async () => {
      const response = await request(app).get('/api/v1/issues');
      // 404以外が返れば、ルートが登録されている
      expect(response.status).not.toBe(404);
    });

    test('存在しないエンドポイントは404を返すこと', async () => {
      const response = await request(app).get('/api/v1/issues/invalid/endpoint');
      expect(response.status).toBe(404);
    });
  });
});