/**
 * 問題報告API マルチテナント分離検証テスト
 * 
 * このテストは、問題報告機能のマルチテナント分離が正しく機能することを検証します。
 * 
 * 検証項目:
 * - 異なる組織のデータにアクセスできないこと
 * - organization_idフィルタが全てのクエリに適用されていること
 * - クロステナントアクセスが403エラーになること
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';

describe('Issue API Multi-Tenant Isolation Tests', () => {
  let pool: any;
  
  // 組織A
  let orgAId: string;
  let orgAToken: string;
  let orgAUserId: string;
  let orgAProjectId: string;
  let orgAIssueId: string;
  
  // 組織B
  let orgBId: string;
  let orgBToken: string;
  let orgBUserId: string;
  let orgBProjectId: string;
  let orgBIssueId: string;

  beforeAll(async () => {
    pool = getPool();

    // 組織A作成
    const orgAResult = await pool.query(
      `INSERT INTO organizations (id, organization_name, organization_prefix)
       VALUES (gen_random_uuid(), 'Organization A', 'org_a')
       RETURNING id`
    );
    orgAId = orgAResult.rows[0].id;

    const userAResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'usera@test.com', 'User A', $1)
       RETURNING id`,
      [orgAId]
    );
    orgAUserId = userAResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'manager')`,
      [orgAUserId, orgAId]
    );

    const projectAResult = await pool.query(
      `INSERT INTO projects (id, organization_id, project_name, status)
       VALUES (gen_random_uuid(), $1, 'Project A', 'active')
       RETURNING id`,
      [orgAId]
    );
    orgAProjectId = projectAResult.rows[0].id;

    const issueAResult = await pool.query(
      `INSERT INTO issues (id, organization_id, project_id, reporter_id, title, description, issue_type, severity, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'Issue A', 'Description A', 'equipment_failure', 'high', 'open')
       RETURNING id`,
      [orgAId, orgAProjectId, orgAUserId]
    );
    orgAIssueId = issueAResult.rows[0].id;

    orgAToken = `maiml_session-test-orga_${Date.now()}`;
    await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, organization_id, role, expires_at)
       VALUES ($1, $2, $3, 'manager', NOW() + INTERVAL '1 hour')`,
      [orgAToken, orgAUserId, orgAId]
    );

    // 組織B作成
    const orgBResult = await pool.query(
      `INSERT INTO organizations (id, organization_name, organization_prefix)
       VALUES (gen_random_uuid(), 'Organization B', 'org_b')
       RETURNING id`
    );
    orgBId = orgBResult.rows[0].id;

    const userBResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'userb@test.com', 'User B', $1)
       RETURNING id`,
      [orgBId]
    );
    orgBUserId = userBResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'manager')`,
      [orgBUserId, orgBId]
    );

    const projectBResult = await pool.query(
      `INSERT INTO projects (id, organization_id, project_name, status)
       VALUES (gen_random_uuid(), $1, 'Project B', 'active')
       RETURNING id`,
      [orgBId]
    );
    orgBProjectId = projectBResult.rows[0].id;

    const issueBResult = await pool.query(
      `INSERT INTO issues (id, organization_id, project_id, reporter_id, title, description, issue_type, severity, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'Issue B', 'Description B', 'data_error', 'medium', 'open')
       RETURNING id`,
      [orgBId, orgBProjectId, orgBUserId]
    );
    orgBIssueId = issueBResult.rows[0].id;

    orgBToken = `maiml_session-test-orgb_${Date.now()}`;
    await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, organization_id, role, expires_at)
       VALUES ($1, $2, $3, 'manager', NOW() + INTERVAL '1 hour')`,
      [orgBToken, orgBUserId, orgBId]
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM user_sessions WHERE session_id IN ($1, $2)', [orgAToken, orgBToken]);
      await pool.query('DELETE FROM issues WHERE organization_id IN ($1, $2)', [orgAId, orgBId]);
      await pool.query('DELETE FROM projects WHERE organization_id IN ($1, $2)', [orgAId, orgBId]);
      await pool.query('DELETE FROM organization_users WHERE organization_id IN ($1, $2)', [orgAId, orgBId]);
      await pool.query('DELETE FROM users WHERE organization_id IN ($1, $2)', [orgAId, orgBId]);
      await pool.query('DELETE FROM organizations WHERE id IN ($1, $2)', [orgAId, orgBId]);
    }
  });

  describe('マルチテナント分離: GET /api/v1/issues', () => {
    it('組織Aのユーザーは組織Aのissuesのみ取得できる', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgAId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // 全てのissueが組織Aのものであることを確認
      response.body.data.forEach((issue: any) => {
        expect(issue.organizationId).toBe(orgAId);
      });
      
      // 組織Bのissueが含まれていないことを確認
      const orgBIssueFound = response.body.data.some((issue: any) => issue.id === orgBIssueId);
      expect(orgBIssueFound).toBe(false);
    });

    it('組織Bのユーザーは組織Bのissuesのみ取得できる', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('X-Organization-Id', orgBId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // 全てのissueが組織Bのものであることを確認
      response.body.data.forEach((issue: any) => {
        expect(issue.organizationId).toBe(orgBId);
      });
      
      // 組織Aのissueが含まれていないことを確認
      const orgAIssueFound = response.body.data.some((issue: any) => issue.id === orgAIssueId);
      expect(orgAIssueFound).toBe(false);
    });
  });

  describe('マルチテナント分離: GET /api/v1/issues/:issueId', () => {
    it('組織Aのユーザーは組織Bのissue詳細を取得できない（404）', async () => {
      const response = await request(app)
        .get(`/api/v1/issues/${orgBIssueId}`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgAId);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });

    it('組織Bのユーザーは組織Aのissue詳細を取得できない（404）', async () => {
      const response = await request(app)
        .get(`/api/v1/issues/${orgAIssueId}`)
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('X-Organization-Id', orgBId);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });
  });

  describe('マルチテナント分離: POST /api/v1/issues/:issueId/comments', () => {
    it('組織Aのユーザーは組織Bのissueにコメントできない（404）', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${orgBIssueId}/comments`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgAId)
        .send({
          comment: 'Test comment from Org A'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });

    it('組織Bのユーザーは組織Aのissueにコメントできない（404）', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${orgAIssueId}/comments`)
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('X-Organization-Id', orgBId)
        .send({
          comment: 'Test comment from Org B'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });
  });

  describe('マルチテナント分離: PATCH /api/v1/issues/:issueId/status', () => {
    it('組織Aのユーザーは組織Bのissueステータスを変更できない（404）', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${orgBIssueId}/status`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgAId)
        .send({
          status: 'resolved'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });

    it('組織Bのユーザーは組織Aのissueステータスを変更できない（404）', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${orgAIssueId}/status`)
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('X-Organization-Id', orgBId)
        .send({
          status: 'resolved'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });
  });

  describe('マルチテナント分離: POST /api/v1/issues', () => {
    it('組織Aのユーザーは組織Bのprojectに問題を報告できない（404）', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgAId)
        .send({
          projectId: orgBProjectId, // 組織Bのproject
          title: 'Cross-tenant issue',
          description: 'This should fail',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });

    it('組織Bのユーザーは組織Aのprojectに問題を報告できない（404）', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('X-Organization-Id', orgBId)
        .send({
          projectId: orgAProjectId, // 組織Aのproject
          title: 'Cross-tenant issue',
          description: 'This should fail',
          issueType: 'data_error',
          severity: 'medium'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });
  });

  describe('organization_idフィルタの検証', () => {
    it('DBクエリにorganization_idフィルタが適用されていることを確認（一覧取得）', async () => {
      // 組織Aで問題一覧取得
      const responseA = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgAId);

      expect(responseA.status).toBe(200);
      const issueCountA = responseA.body.data.length;

      // 組織Bで問題一覧取得
      const responseB = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('X-Organization-Id', orgBId);

      expect(responseB.status).toBe(200);
      const issueCountB = responseB.body.data.length;

      // 件数が異なることを確認（組織ごとに分離されている）
      expect(issueCountA).toBeGreaterThan(0);
      expect(issueCountB).toBeGreaterThan(0);
      
      // 両組織のissueが混在していないことを確認
      const allIssueIdsA = responseA.body.data.map((issue: any) => issue.id);
      const allIssueIdsB = responseB.body.data.map((issue: any) => issue.id);
      const intersection = allIssueIdsA.filter((id: string) => allIssueIdsB.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('X-Organization-Idヘッダーがない場合、エラーになる', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${orgAToken}`);
        // X-Organization-Idヘッダーなし

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('X-Organization-Idヘッダーとユーザーのorganization_idが一致しない場合、エラーになる', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Organization-Id', orgBId); // 異なる組織ID

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.stringContaining('PERMISSION')
        }
      });
    });
  });
});