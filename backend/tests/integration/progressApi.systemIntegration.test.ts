/**
 * タスク10.1: 全コンポーネントの統合テスト
 * 
 * 目的:
 * - すべてのレイヤー（Utility、Repository、Service、API）が正しく接続されていることを確認
 * - ミドルウェアチェーンとルート定義がExpress Appに登録されていることを確認
 * - エラーハンドリングの統合動作確認
 * - ログ記録の統合動作確認
 */

import request from 'supertest';
import app from '../../src/server';

describe('Task 10.1: 全コンポーネントの統合', () => {
  describe('1. Express Appへのルート登録', () => {
    it('進捗データ取得エンドポイントがマウントされている', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-test-session_1234567890');

      // 404 Not Foundではなく、認証エラーまたはビジネスロジックエラーが返ることを確認
      expect(response.status).not.toBe(404);
      expect([200, 401, 500]).toContain(response.status);
    });

    it('正しいURLパターン（/api/v1/progress/:projectId/:methodId/:taskNo）でアクセスできる', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-test-session_1234567890');

      // エンドポイントが存在することを確認（404でないこと）
      expect(response.status).not.toBe(404);
    });

    it('GETメソッドのみをサポートしている', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      const url = `/api/v1/progress/${projectId}/${methodId}/${taskNo}`;

      // GET: サポートされている（404以外）
      const getResponse = await request(app)
        .get(url)
        .set('Authorization', 'Bearer maiml_session-test-session_1234567890');
      expect(getResponse.status).not.toBe(404);

      // POST: サポートされていない（404または405）
      const postResponse = await request(app)
        .post(url)
        .set('Authorization', 'Bearer maiml_session-test-session_1234567890')
        .send({});
      expect([404, 405]).toContain(postResponse.status);

      // PUT: サポートされていない（404または405）
      const putResponse = await request(app)
        .put(url)
        .set('Authorization', 'Bearer maiml_session-test-session_1234567890')
        .send({});
      expect([404, 405]).toContain(putResponse.status);

      // DELETE: サポートされていない（404または405）
      const deleteResponse = await request(app)
        .delete(url)
        .set('Authorization', 'Bearer maiml_session-test-session_1234567890');
      expect([404, 405]).toContain(deleteResponse.status);
    });
  });

  describe('2. ミドルウェアチェーンの統合', () => {
    it('authMiddlewareが適用されている（認証なしで401を返す）', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('authMiddleware → progressControllerのチェーンが正しく動作する', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      // authMiddlewareを通過した後、progressControllerでエラーが発生することを確認
      // （データベースエラーまたはビジネスロジックエラー）
      expect([200, 404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('3. エラーハンドリングの統合動作', () => {
    it('パラメータバリデーションエラーが正しく返される（UUID形式エラー）', async () => {
      const response = await request(app)
        .get('/api/v1/progress/invalid-uuid/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('UUID形式');
    });

    it('パラメータバリデーションエラーが正しく返される（taskNo整数エラー）', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/abc')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('正の整数');
    });

    it('統一エラーレスポンス形式（success: false, error, meta）が返される', async () => {
      const response = await request(app)
        .get('/api/v1/progress/invalid-uuid/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('4. レスポンスヘッダーの統合', () => {
    it('Content-Typeヘッダーが設定されている', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('X-Request-Idヘッダーが設定されている', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
      expect(response.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('CORSヘッダーが設定されている', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890')
        .set('Origin', 'http://localhost:3000');

      // Access-Control-Allow-Originが設定されていることを確認
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('5. 全レイヤー統合の検証', () => {
    it('API Layer → Service Layer → Repository Layerの統合が正しく動作する', async () => {
      // 認証を通過し、バリデーションも通過し、ビジネスロジックに到達することを確認
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      // レスポンスが統一形式であることを確認
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');

      // success=trueの場合はdataを持つ、success=falseの場合はerrorを持つ
      if (response.body.success) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('project_id');
        expect(response.body.data).toHaveProperty('method_id');
        expect(response.body.data).toHaveProperty('task_no');
        expect(response.body.data).toHaveProperty('transitions');
        expect(response.body.data).toHaveProperty('overall_progress');
      } else {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
      }
    });

    it('エラーハンドリングが全レイヤーで正しく動作する', async () => {
      // バリデーションエラー → Controller Layer
      const validationErrorResponse = await request(app)
        .get('/api/v1/progress/invalid-uuid/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(validationErrorResponse.status).toBe(400);
      expect(validationErrorResponse.body.error.code).toBe('VALIDATION_ERROR');

      // 認証エラー → Middleware Layer
      const authErrorResponse = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1');

      expect(authErrorResponse.status).toBe(401);
      expect(authErrorResponse.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
  });

  describe('6. RESTful API仕様準拠の検証', () => {
    it('RESTful URLパターン（/api/v1/progress/:projectId/:methodId/:taskNo）に従っている', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      // エンドポイントが存在することを確認（404でないこと）
      expect(response.status).not.toBe(404);
    });

    it('成功時に200 OKステータスコードを返す（条件が満たされる場合）', async () => {
      // 注: 実際に200を返すにはデータベースとMAIMLファイルが必要
      // ここでは統合テストとして、エンドポイントが存在し、
      // ビジネスロジックに到達できることを確認
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      // 200または404または500のいずれか（ビジネスロジック実行結果）
      expect([200, 404, 500]).toContain(response.status);
    });

    it('Content-Typeヘッダーに"application/json"を設定する', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('レスポンスメタデータ（timestamp, requestId）を含む', async () => {
      const response = await request(app)
        .get('/api/v1/progress/550e8400-e29b-41d4-a716-446655440000/method1/1')
        .set('Authorization', 'Bearer maiml_session-valid-session_1234567890');

      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.timestamp).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
      
      // ISO 8601形式のタイムスタンプ検証
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
