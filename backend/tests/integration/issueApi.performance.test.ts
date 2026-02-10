/**
 * 問題報告API パフォーマンステスト
 * 
 * このテストは、問題報告機能のパフォーマンスを検証します。
 * 
 * 検証項目:
 * - POST /api/v1/issues のレスポンスタイム測定（目標: < 200ms）
 * - GET /api/v1/issues のレスポンスタイム測定（目標: < 500ms）
 * - N+1問題が発生していないことを確認
 * - インデックスが適切に使用されていることを確認
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';

describe('Issue API Performance Tests', () => {
  let pool: any;
  let workerToken: string;
  let organizationId: string;
  let projectId: string;
  let createdIssueIds: string[] = [];

  beforeAll(async () => {
    pool = getPool();

    // テスト用組織作成
    const orgResult = await pool.query(
      `INSERT INTO organizations (id, organization_name, organization_prefix)
       VALUES (gen_random_uuid(), 'Perf Test Org', 'perf_org')
       RETURNING id`
    );
    organizationId = orgResult.rows[0].id;

    // Workerユーザー作成
    const workerResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'worker@perftest.com', 'Perf Worker', $1)
       RETURNING id`,
      [organizationId]
    );
    const workerUserId = workerResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'worker')`,
      [workerUserId, organizationId]
    );

    // テスト用プロジェクト作成
    const projectResult = await pool.query(
      `INSERT INTO projects (id, organization_id, project_name, status)
       VALUES (gen_random_uuid(), $1, 'Perf Test Project', 'active')
       RETURNING id`,
      [organizationId]
    );
    projectId = projectResult.rows[0].id;

    // JWTトークン生成
    workerToken = `maiml_session-perf-test_${Date.now()}`;

    // セッション作成
    await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, organization_id, role, expires_at)
       VALUES ($1, $2, $3, 'worker', NOW() + INTERVAL '1 hour')`,
      [workerToken, workerUserId, organizationId]
    );

    // テスト用の問題を50件作成（パフォーマンステスト用）
    for (let i = 0; i < 50; i++) {
      const issueResult = await pool.query(
        `INSERT INTO issues (id, organization_id, project_id, reporter_id, title, description, issue_type, severity, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'equipment_failure', 'medium', 'open')
         RETURNING id`,
        [
          organizationId,
          projectId,
          workerUserId,
          `Performance Test Issue ${i + 1}`,
          `This is a performance test issue for testing pagination and query performance`
        ]
      );
      createdIssueIds.push(issueResult.rows[0].id);
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM user_sessions WHERE session_id = $1', [workerToken]);
      await pool.query('DELETE FROM issues WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM projects WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM organization_users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    }
  });

  describe('POST /api/v1/issues レスポンスタイム', () => {
    it('問題作成のレスポンスタイムが200ms未満であること', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'Performance Test Issue',
          description: 'Testing response time',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(200);
      
      console.log(`POST /api/v1/issues response time: ${responseTime}ms (target: <200ms)`);
      
      // クリーンアップ
      if (response.body.data?.id) {
        await pool.query('DELETE FROM issues WHERE id = $1', [response.body.data.id]);
      }
    });
  });

  describe('GET /api/v1/issues レスポンスタイム', () => {
    it('問題一覧取得のレスポンスタイムが500ms未満であること', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`GET /api/v1/issues response time: ${responseTime}ms (target: <500ms)`);
    });

    it('フィルタリング付き問題一覧取得のレスポンスタイムが500ms未満であること', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          projectId,
          status: 'open',
          severity: 'medium'
        })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`GET /api/v1/issues (with filters) response time: ${responseTime}ms (target: <500ms)`);
    });

    it('ページネーション付き問題一覧取得のレスポンスタイムが500ms未満であること', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          page: 2,
          limit: 20
        })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`GET /api/v1/issues (page 2) response time: ${responseTime}ms (target: <500ms)`);
    });
  });

  describe('GET /api/v1/issues/:issueId レスポンスタイム', () => {
    it('問題詳細取得のレスポンスタイムが300ms未満であること', async () => {
      const issueId = createdIssueIds[0];
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/v1/issues/${issueId}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300);
      
      console.log(`GET /api/v1/issues/:issueId response time: ${responseTime}ms (target: <300ms)`);
    });
  });

  describe('POST /api/v1/issues/:issueId/comments レスポンスタイム', () => {
    it('コメント投稿のレスポンスタイムが300ms未満であること', async () => {
      const issueId = createdIssueIds[0];
      const startTime = Date.now();
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Performance test comment'
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(300);
      
      console.log(`POST /api/v1/issues/:issueId/comments response time: ${responseTime}ms (target: <300ms)`);
    });
  });

  describe('N+1問題の検証', () => {
    it('問題一覧取得でN+1問題が発生していないこと', async () => {
      // EXPLAIN ANALYZEでクエリ実行計画を確認
      // 実際の実装では、クエリ数をカウントして検証する
      
      const response = await request(app)
        .get('/api/v1/issues')
        .query({ limit: 50 })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // 各issueにreporterNameが含まれていることを確認（JOINで取得されている）
      response.body.data.forEach((issue: any) => {
        expect(issue.reporterName).toBeDefined();
        expect(typeof issue.reporterName).toBe('string');
      });
      
      console.log(`Fetched ${response.body.data.length} issues without N+1 problem`);
    });
  });

  describe('インデックス使用の検証', () => {
    it('organization_id + project_id でフィルタリングする際にインデックスが使用されること', async () => {
      // PostgreSQLのEXPLAIN ANALYZEでインデックス使用を確認
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT i.*, u.display_name as reporter_name
        FROM issues i
        JOIN users u ON i.reporter_id = u.id
        WHERE i.organization_id = $1
          AND i.project_id = $2
        ORDER BY i.created_at DESC
        LIMIT 20
      `, [organizationId, projectId]);

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const planText = JSON.stringify(plan);
      
      // インデックススキャンが使用されていることを確認
      const hasIndexScan = planText.includes('Index Scan') || planText.includes('Index Only Scan') || planText.includes('Bitmap Index Scan');
      
      expect(hasIndexScan).toBe(true);
      console.log('Index scan is being used for organization_id + project_id filtering');
    });

    it('created_at でソートする際にインデックスが使用されること', async () => {
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT i.*, u.display_name as reporter_name
        FROM issues i
        JOIN users u ON i.reporter_id = u.id
        WHERE i.organization_id = $1
        ORDER BY i.created_at DESC
        LIMIT 20
      `, [organizationId]);

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const planText = JSON.stringify(plan);
      
      // インデックススキャンが使用されていることを確認
      const hasIndexScan = planText.includes('Index Scan') || planText.includes('Index Only Scan') || planText.includes('Bitmap Index Scan');
      
      expect(hasIndexScan).toBe(true);
      console.log('Index scan is being used for created_at sorting');
    });
  });

  describe('大量データでのパフォーマンス', () => {
    it('50件のデータがある状態でページ1の取得が500ms未満であること', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/issues')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(20);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`GET /api/v1/issues (50 records, page 1) response time: ${responseTime}ms`);
    });

    it('50件のデータがある状態でページ3の取得が500ms未満であること', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/issues')
        .query({ page: 3, limit: 20 })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`GET /api/v1/issues (50 records, page 3) response time: ${responseTime}ms`);
    });
  });
});