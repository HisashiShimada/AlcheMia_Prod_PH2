/**
 * 問題報告API統合テスト
 * 
 * このテストは、問題報告機能のエンドツーエンドの動作を検証します。
 * 
 * テスト対象:
 * - POST /api/v1/issues - 問題報告作成
 * - POST /api/v1/issues/:issueId/comments - コメント投稿
 * - GET /api/v1/issues - 問題一覧取得
 * - GET /api/v1/issues/:issueId - 問題詳細取得
 * - PATCH /api/v1/issues/:issueId/status - ステータス変更
 * 
 * セキュリティ検証:
 * - 認証必須
 * - マルチテナント分離
 * - 権限チェック
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';

describe('Issue API Integration Tests', () => {
  let pool: any;
  let workerToken: string;
  let managerToken: string;
  let workerUserId: string;
  let managerUserId: string;
  let organizationId: string;
  let projectId: string;
  let taskDetailId: string;
  let createdIssueId: string;

  beforeAll(async () => {
    pool = getPool();

    // テスト用組織作成
    const orgResult = await pool.query(
      `INSERT INTO organizations (id, organization_name, organization_prefix)
       VALUES (gen_random_uuid(), 'Test Org for Issues', 'test_org_issues')
       RETURNING id`
    );
    organizationId = orgResult.rows[0].id;

    // Workerユーザー作成
    const workerResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'worker@test.com', 'Test Worker', $1)
       RETURNING id`,
      [organizationId]
    );
    workerUserId = workerResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'worker')`,
      [workerUserId, organizationId]
    );

    // Managerユーザー作成
    const managerResult = await pool.query(
      `INSERT INTO users (id, email, display_name, organization_id)
       VALUES (gen_random_uuid(), 'manager@test.com', 'Test Manager', $1)
       RETURNING id`,
      [organizationId]
    );
    managerUserId = managerResult.rows[0].id;

    await pool.query(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, 'manager')`,
      [managerUserId, organizationId]
    );

    // テスト用プロジェクト作成
    const projectResult = await pool.query(
      `INSERT INTO projects (id, organization_id, project_name, status)
       VALUES (gen_random_uuid(), $1, 'Test Project for Issues', 'active')
       RETURNING id`,
      [organizationId]
    );
    projectId = projectResult.rows[0].id;

    // テスト用タスク詳細作成
    const taskResult = await pool.query(
      `INSERT INTO project_tasks (id, organization_id, project_id, task_name, status)
       VALUES (gen_random_uuid(), $1, $2, 'Test Task', 'in_progress')
       RETURNING id`,
      [organizationId, projectId]
    );
    const taskId = taskResult.rows[0].id;

    const taskDetailResult = await pool.query(
      `INSERT INTO project_task_details (id, organization_id, task_id, detail_name)
       VALUES (gen_random_uuid(), $1, $2, 'Test Task Detail')
       RETURNING id`,
      [organizationId, taskId]
    );
    taskDetailId = taskDetailResult.rows[0].id;

    // JWTトークン生成
    workerToken = `maiml_session-test-worker_${Date.now()}`;
    managerToken = `maiml_session-test-manager_${Date.now()}`;

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
    // クリーンアップ
    if (pool) {
      await pool.query('DELETE FROM user_sessions WHERE session_id IN ($1, $2)', [workerToken, managerToken]);
      await pool.query('DELETE FROM project_task_details WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM project_tasks WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM projects WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM organization_users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    }
  });

  describe('POST /api/v1/issues', () => {
    it('正常系: Worker権限で問題報告作成成功', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          taskDetailId,
          title: 'テスト問題',
          description: 'これはテスト用の問題報告です',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          organizationId,
          projectId,
          taskDetailId,
          reporterId: workerUserId,
          title: 'テスト問題',
          description: 'これはテスト用の問題報告です',
          issueType: 'equipment_failure',
          severity: 'high',
          status: 'open',
          assigneeId: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      });

      createdIssueId = response.body.data.id;
    });

    it('異常系: 認証なしで401エラー', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'テスト問題',
          description: 'これはテスト用の問題報告です',
          issueType: 'equipment_failure',
          severity: 'high'
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      });
    });

    it('異常系: 不正なprojectIdで404エラー', async () => {
      const invalidProjectId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId: invalidProjectId,
          title: 'テスト問題',
          description: 'これはテスト用の問題報告です',
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

    it('異常系: バリデーションエラー（必須項目欠如）', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId
          // title, description, issueType, severity が欠如
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('異常系: バリデーションエラー（不正なissueType）', async () => {
      const response = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: 'テスト問題',
          description: 'これはテスト用の問題報告です',
          issueType: 'invalid_type', // 不正な値
          severity: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });
  });

  describe('POST /api/v1/issues/:issueId/comments', () => {
    it('正常系: Worker権限でコメント投稿成功', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${createdIssueId}/comments`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'これはテストコメントです'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          issueId: createdIssueId,
          userId: workerUserId,
          comment: 'これはテストコメントです',
          createdAt: expect.any(String)
        }
      });
    });

    it('異常系: 存在しないissueIdで404エラー', async () => {
      const invalidIssueId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/v1/issues/${invalidIssueId}/comments`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'これはテストコメントです'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });

    it('異常系: 他組織のissueIdで404エラー', async () => {
      // 別組織のissueを作成
      const otherOrgResult = await pool.query(
        `INSERT INTO organizations (id, organization_name, organization_prefix)
         VALUES (gen_random_uuid(), 'Other Org', 'other_org')
         RETURNING id`
      );
      const otherOrgId = otherOrgResult.rows[0].id;

      const otherUserResult = await pool.query(
        `INSERT INTO users (id, email, display_name, organization_id)
         VALUES (gen_random_uuid(), 'other@test.com', 'Other User', $1)
         RETURNING id`,
        [otherOrgId]
      );
      const otherUserId = otherUserResult.rows[0].id;

      const otherProjectResult = await pool.query(
        `INSERT INTO projects (id, organization_id, project_name, status)
         VALUES (gen_random_uuid(), $1, 'Other Project', 'active')
         RETURNING id`,
        [otherOrgId]
      );
      const otherProjectId = otherProjectResult.rows[0].id;

      const otherIssueResult = await pool.query(
        `INSERT INTO issues (id, organization_id, project_id, reporter_id, title, description, issue_type, severity, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'Other Issue', 'Description', 'equipment_failure', 'medium', 'open')
         RETURNING id`,
        [otherOrgId, otherProjectId, otherUserId]
      );
      const otherIssueId = otherIssueResult.rows[0].id;

      const response = await request(app)
        .post(`/api/v1/issues/${otherIssueId}/comments`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'これはテストコメントです'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });

      // クリーンアップ
      await pool.query('DELETE FROM issues WHERE id = $1', [otherIssueId]);
      await pool.query('DELETE FROM projects WHERE id = $1', [otherProjectId]);
      await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [otherOrgId]);
    });
  });

  describe('GET /api/v1/issues', () => {
    it('正常系: フィルタなしで一覧取得', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: createdIssueId,
            title: 'テスト問題',
            status: 'open'
          })
        ]),
        pagination: {
          page: 1,
          limit: expect.any(Number),
          totalItems: expect.any(Number),
          totalPages: expect.any(Number)
        }
      });
    });

    it('正常系: フィルタリング動作確認（status=open）', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({ status: 'open' })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((issue: any) => {
        expect(issue.status).toBe('open');
      });
    });

    it('正常系: フィルタリング動作確認（projectId）', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({ projectId })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((issue: any) => {
        expect(issue.projectId).toBe(projectId);
      });
    });

    it('正常系: ページネーション動作確認', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        pagination: {
          page: 1,
          limit: 5,
          totalItems: expect.any(Number),
          totalPages: expect.any(Number)
        }
      });
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('正常系: ソート動作確認（created_at降順）', async () => {
      // 追加の問題を作成
      await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          projectId,
          title: '2つ目の問題',
          description: '説明',
          issueType: 'data_error',
          severity: 'medium'
        });

      const response = await request(app)
        .get('/api/v1/issues')
        .query({ sortBy: 'created_at', order: 'desc' })
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // 日付が降順にソートされていることを確認
      const dates = response.body.data.map((issue: any) => new Date(issue.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });
  });

  describe('GET /api/v1/issues/:issueId', () => {
    it('正常系: 問題詳細取得', async () => {
      const response = await request(app)
        .get(`/api/v1/issues/${createdIssueId}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdIssueId,
          organizationId,
          projectId,
          title: 'テスト問題',
          description: 'これはテスト用の問題報告です',
          issueType: 'equipment_failure',
          severity: 'high',
          status: 'open'
        }
      });
    });

    it('異常系: 存在しないissueIdで404エラー', async () => {
      const invalidIssueId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/issues/${invalidIssueId}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND'
        }
      });
    });
  });

  describe('PATCH /api/v1/issues/:issueId/status', () => {
    it('正常系: Manager権限でステータス変更成功', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${createdIssueId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          status: 'in_progress'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdIssueId,
          status: 'in_progress'
        }
      });
    });

    it('異常系: Worker権限で403エラー', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${createdIssueId}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          status: 'resolved'
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT'
        }
      });
    });

    it('異常系: 無効なstatusで400エラー', async () => {
      const response = await request(app)
        .patch(`/api/v1/issues/${createdIssueId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('異常系: 存在しないissueIdで404エラー', async () => {
      const invalidIssueId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .patch(`/api/v1/issues/${invalidIssueId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Organization-Id', organizationId)
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
});