/**
 * 問題報告API エラーハンドリング検証テスト
 * 
 * このテストは、問題報告機能のエラーハンドリングを検証します。
 * 
 * 検証項目:
 * - すべてのエラーケースで統一レスポンス形式が返却されること
 * - エラーメッセージに機密情報が含まれていないこと
 * - 適切なHTTPステータスコードが返却されること
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';

describe('Issue API Error Handling Tests', () => {
  let pool: any;
  let workerToken: string;
  let managerToken: string;
  let organizationId: string;
  let projectId: string;
  let issueId: string;

  beforeAll(async () => {
    pool = getPool();

    // テスト用組織作成
    const orgResult = await pool.query(
      `INSERT INTO organizations (id, organization_name, organization_prefix)
       VALUES (gen_random_uuid(), 'Error Test Org', 'error_org')
       RETURNING id`
    );
    organizationId = orgResult.rows[0].id;

    // Workerユーザー作成
    const workerResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'worker@errortest.com', 'Error Worker', $1)
       RETURNING id`,
      [organizationId]
    );
    const workerUserId = workerResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'worker')`,
      [workerUserId, organizationId]
    );

    // Managerユーザー作成
    const managerResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'manager@errortest.com', 'Error Manager', $1)
       RETURNING id`,
      [organizationId]
    );
    const managerUserId = managerResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'manager')`,
      [managerUserId, organizationId]
    );

    // テスト用プロジェクト作成
    const projectResult = await pool.query(
      `INSERT INTO projects (id, organization_id, project_name, status)
       VALUES (gen_random_uuid(), $1, 'Error Test Project', 'active')
       RETURNING id`,
      [organizationId]
    );
    projectId = projectResult.rows[0].id;

    // テスト用問題作成
    const issueResult = await pool.query(
      `INSERT INTO issues (id, organization_id, project_id, reporter_id, title, description, issue_type, severity, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'Test Issue', 'Test Description', 'equipment_failure', 'high', 'open')
       RETURNING id`,
      [organizationId, projectId, workerUserId]
    );
    issueId = issueResult.rows[0].id;

    // JWTトークン生成
    workerToken = `maiml_session-error-test-worker_${Date.now()}`;
    managerToken = `maiml_session-error-test-manager_${Date.now()}`;

    // セッション作成
    await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, organization_id, role, expires_at)
       VALUES ($1, $2, $3, 'worker', NOW() + INTERVAL '1 hour')`,
      [workerToken, workerUserId, organizationId]
    );

    await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, organization_id, role, expires_at)
       VALUES ($1, $2, $3, 'manager', NOW() + INTERVAL '1 hour')`,
      [managerToken, managerUserId, organizationId]
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM user_sessions WHERE session_id IN ($1, $2)', [workerToken, managerToken]);
      await pool.query('DELETE FROM issues WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM projects WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM organization_users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    }
  });

  describe('統一レスポンス形式の検証', () => {
    it('認証エラー（401）で統一レスポンス形式が返却されること', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('X-Organization-Id', organizationId);
        // Authorization ヘッダーなし

      expect(response.status).toBe(401);
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
      expect(response.body.data).toBeUndefined();
    });

    it('権限エラー（403）で統一レスポンス形式が返却されること', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          status: 'resolved'
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: expect.any(String)
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('リソース未検出（404）で統一レスポンス形式が返却されること', async () => {
      const invalidIssueId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/issues/${invalidIssueId}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: expect.any(String)
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('バリデーションエラー（400）で統一レスポンス形式が返却されること', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: '', // 空文字（バリデーションエラー）
          description: 'Test',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          details: expect.any(Array)
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('機密情報漏洩の防止', () => {
    it('エラーメッセージにデータベースエラー詳細が含まれていないこと', async () => {
      // 不正なUUID形式でDBエラーを引き起こす
      const response = await request(app)
        .get('/api/v1/issues/invalid-uuid')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(400);
      expect(response.body.error.message).not.toContain('pg');
      expect(response.body.error.message).not.toContain('postgres');
      expect(response.body.error.message).not.toContain('SELECT');
      expect(response.body.error.message).not.toContain('WHERE');
    });

    it('エラーメッセージにスタックトレースが含まれていないこと', async () => {
      const response = await request(app)
        .get(`/api/v1/issues/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(404);
      expect(response.body.error.message).not.toContain('at ');
      expect(response.body.error.message).not.toContain('.ts:');
      expect(response.body.error.message).not.toContain('Error:');
      expect(JSON.stringify(response.body)).not.toContain('stack');
    });

    it('エラーメッセージに内部ファイルパスが含まれていないこと', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId: '00000000-0000-0000-0000-000000000000',
          title: 'Test',
          description: 'Test',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).not.toContain('backend/');
      expect(response.body.error.message).not.toContain('src/');
      expect(response.body.error.message).not.toContain('services/');
    });

    it('エラーメッセージにorganization_idが含まれていないこと', async () => {
      const response = await request(app)
        .get(`/api/v1/issues/${issueId}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', '00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(403);
      expect(response.body.error.message).not.toContain(organizationId);
      expect(response.body.error.message).not.toContain('00000000-0000-0000-0000-000000000000');
    });
  });

  describe('HTTPステータスコードの検証', () => {
    it('認証なし → 401', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(401);
    });

    it('権限不足 → 403', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      expect(response.status).toBe(403);
    });

    it('リソース未検出 → 404', async () => {
      const response = await request(app)
        .get('/api/v1/issues/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(404);
    });

    it('バリデーションエラー → 400', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          // title, description, issueType, severity が欠如
        });

      expect(response.status).toBe(400);
    });

    it('成功（作成） → 201', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'Test Issue',
          description: 'Test Description',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(201);
      
      // クリーンアップ
      if (response.body.data?.id) {
        await pool.query('DELETE FROM issues WHERE id = $1', [response.body.data.id]);
      }
    });

    it('成功（取得） → 200', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
    });

    it('成功（更新） → 200', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
    });
  });

  describe('バリデーションエラーの詳細', () => {
    it('タイトル長すぎ（201文字以上）でバリデーションエラー', async () => {
      const longTitle = 'a'.repeat(201);

      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: longTitle,
          description: 'Test',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('説明長すぎ（2001文字以上）でバリデーションエラー', async () => {
      const longDescription = 'a'.repeat(2001);

      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'Test',
          description: longDescription,
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('不正なissueTypeでバリデーションエラー', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'Test',
          description: 'Test',
          issueType: 'invalid_type', // 不正な値
          severity: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('不正なseverityでバリデーションエラー', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'Test',
          description: 'Test',
          issueType: 'equipment_failure',
          severity: 'invalid_severity' // 不正な値
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('不正なstatusでバリデーションエラー', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          status: 'invalid_status' // 不正な値
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('エラーレスポンスのメタデータ', () => {
    it('エラーレスポンスにtimestampが含まれること', async () => {
      const response = await request(app)
        .get('/api/v1/issues/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(404);
      expect(response.body.meta.timestamp).toBeDefined();
      
      // ISO 8601形式であることを確認
      const timestamp = new Date(response.body.meta.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.meta.timestamp);
    });

    it('エラーレスポンスにrequestIdが含まれること', async () => {
      const response = await request(app)
        .get('/api/v1/issues/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(404);
      expect(response.body.meta.requestId).toBeDefined();
      expect(typeof response.body.meta.requestId).toBe('string');
      expect(response.body.meta.requestId.length).toBeGreaterThan(0);
    });

    it('連続するリクエストで異なるrequestIdが生成されること', async () => {
      const response1 = await request(app)
        .get('/api/v1/issues/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const response2 = await request(app)
        .get('/api/v1/issues/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response1.body.meta.requestId).not.toBe(response2.body.meta.requestId);
    });
  });
});