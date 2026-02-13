import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';
import jwt from 'jsonwebtoken';

describe('GET /api/v1/issues - Issue List Integration Tests', () => {
  const pool = getPool();
  let authToken: string;
  let organizationId: string;
  let projectId: string;

  // Helper function to generate JWT token
  const generateToken = (userId: string, orgId: string, role: string): string => {
    const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';
    const timestamp = Date.now();
    const token = `maiml_session-${userId}_${timestamp}`;
    
    return jwt.sign(
      {
        token,
        userId,
        organizationId: orgId,
        role,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );
  };

  beforeAll(async () => {
    // 組織とユーザーをセットアップ
    const orgResult = await pool.query(
      `INSERT INTO organization (organization_name, organization_prefix)
       VALUES ($1, $2) RETURNING organization_id`,
      ['Test Org', 'test_org']
    );
    organizationId = orgResult.rows[0].organization_id;

    const userResult = await pool.query(
      `INSERT INTO organization_user (organization_id, user_name, email, role)
       VALUES ($1, $2, $3, $4) RETURNING user_id`,
      [organizationId, 'Test Worker', 'worker@test.com', 'worker']
    );
    const userId = userResult.rows[0].user_id;

    // プロジェクトを作成
    const projectResult = await pool.query(
      `INSERT INTO projects (organization_id, project_name, description, status)
       VALUES ($1, $2, $3, $4) RETURNING project_id`,
      [organizationId, 'Test Project', 'Test Description', 'active']
    );
    projectId = projectResult.rows[0].project_id;

    // JWTトークンを生成
    authToken = generateToken(userId, organizationId, 'worker');
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await pool.query('DELETE FROM issue_comment WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM issue WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM projects WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization WHERE organization_id = $1', [organizationId]);
  });

  describe('5.1 Authentication & Authorization Tests', () => {
    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('should return 401 when invalid authentication token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', 'Bearer invalid_token')
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 when Worker role accesses the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 200 when Manager role accesses the endpoint', async () => {
      const managerToken = generateToken('manager-id', organizationId, 'manager');

      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 200 when Admin role accesses the endpoint', async () => {
      const adminToken = generateToken('admin-id', organizationId, 'admin');

      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('5.2 Validation Tests', () => {
    it('should return 400 when project_id parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
      expect(response.body.error.details.length).toBeGreaterThan(0);
      
      const projectIdError = response.body.error.details.find(
        (detail: any) => detail.field === 'project_id'
      );
      expect(projectIdError).toBeDefined();
      expect(projectIdError.message).toContain('project_id');
    });

    it('should return 400 when method_id parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const methodIdError = response.body.error.details.find(
        (detail: any) => detail.field === 'method_id'
      );
      expect(methodIdError).toBeDefined();
      expect(methodIdError.message).toContain('method_id');
    });

    it('should return 400 when task_no parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const taskNoError = response.body.error.details.find(
        (detail: any) => detail.field === 'task_no'
      );
      expect(taskNoError).toBeDefined();
      expect(taskNoError.message).toContain('task_no');
    });

    it('should return 400 when transition_id parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const transitionIdError = response.body.error.details.find(
        (detail: any) => detail.field === 'transition_id'
      );
      expect(transitionIdError).toBeDefined();
      expect(transitionIdError.message).toContain('transition_id');
    });

    it('should return 400 when all required parameters are missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
      expect(response.body.error.details.length).toBe(4); // All 4 required params
    });

    it('should return 400 when project_id is not a valid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: 'invalid-uuid',
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const projectIdError = response.body.error.details.find(
        (detail: any) => detail.field === 'project_id'
      );
      expect(projectIdError).toBeDefined();
      expect(projectIdError.message).toContain('UUID');
    });

    it('should return 400 when task_no is not a positive integer (zero)', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '0',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const taskNoError = response.body.error.details.find(
        (detail: any) => detail.field === 'task_no'
      );
      expect(taskNoError).toBeDefined();
    });

    it('should return 400 when task_no is negative', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '-1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const taskNoError = response.body.error.details.find(
        (detail: any) => detail.field === 'task_no'
      );
      expect(taskNoError).toBeDefined();
    });

    it('should return 400 when task_no is not a number', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: 'abc',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const taskNoError = response.body.error.details.find(
        (detail: any) => detail.field === 'task_no'
      );
      expect(taskNoError).toBeDefined();
    });

    it('should return 400 when method_id is an empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: '',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const methodIdError = response.body.error.details.find(
        (detail: any) => detail.field === 'method_id'
      );
      expect(methodIdError).toBeDefined();
      expect(methodIdError.message).toContain('空');
    });

    it('should return 400 when transition_id is an empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const transitionIdError = response.body.error.details.find(
        (detail: any) => detail.field === 'transition_id'
      );
      expect(transitionIdError).toBeDefined();
      expect(transitionIdError.message).toContain('空');
    });

    it('should include error details with field, message, and code properties', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: 'invalid-uuid',
          method_id: '',
          task_no: 'abc',
          transition_id: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
      expect(response.body.error.details.length).toBeGreaterThan(0);

      // すべてのエラー詳細が必須プロパティを持つことを確認
      response.body.error.details.forEach((detail: any) => {
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('message');
        expect(detail).toHaveProperty('code');
        expect(typeof detail.field).toBe('string');
        expect(typeof detail.message).toBe('string');
        expect(typeof detail.code).toBe('string');
      });
    });

    it('should return validation errors for optional status parameter with invalid value', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
          status: 'invalid_status',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const statusError = response.body.error.details.find(
        (detail: any) => detail.field === 'status'
      );
      expect(statusError).toBeDefined();
    });

    it('should return validation errors for optional issue_type parameter with invalid value', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
          issue_type: 'invalid_type',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const issueTypeError = response.body.error.details.find(
        (detail: any) => detail.field === 'issue_type'
      );
      expect(issueTypeError).toBeDefined();
    });
  });

  describe('5.3 Multi-tenant Isolation Tests', () => {
    let otherOrgId: string;
    let otherProjectId: string;
    let testIssueId: string;

    beforeAll(async () => {
      // 別組織を作成
      const otherOrgResult = await pool.query(
        `INSERT INTO organization (organization_name, organization_prefix)
         VALUES ($1, $2) RETURNING organization_id`,
        ['Other Org', 'other_org']
      );
      otherOrgId = otherOrgResult.rows[0].organization_id;

      // 別組織のユーザーを作成
      const otherUserResult = await pool.query(
        `INSERT INTO organization_user (organization_id, user_name, email, role)
         VALUES ($1, $2, $3, $4) RETURNING user_id`,
        [otherOrgId, 'Other User', 'other@test.com', 'worker']
      );
      const otherUserId = otherUserResult.rows[0].user_id;

      // 別組織のプロジェクトを作成
      const otherProjectResult = await pool.query(
        `INSERT INTO projects (organization_id, project_name, description, status)
         VALUES ($1, $2, $3, $4) RETURNING project_id`,
        [otherOrgId, 'Other Project', 'Other Description', 'active']
      );
      otherProjectId = otherProjectResult.rows[0].project_id;

      // 自組織のプロジェクトに問題を作成
      const issueResult = await pool.query(
        `INSERT INTO issue (
          organization_id, project_id, method_id, task_no, transition_id,
          issue_target, issue_type, title, description, status, reported_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING issue_id`,
        [
          organizationId, projectId, 'method1', 1, 'transition1',
          'transition', 'technical', 'Test Issue', 'Test Description',
          'open', 'user-id'
        ]
      );
      testIssueId = issueResult.rows[0].issue_id;

      // 別組織のプロジェクトにも問題を作成
      await pool.query(
        `INSERT INTO issue (
          organization_id, project_id, method_id, task_no, transition_id,
          issue_target, issue_type, title, description, status, reported_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          otherOrgId, otherProjectId, 'method1', 1, 'transition1',
          'transition', 'technical', 'Other Issue', 'Other Description',
          'open', otherUserId
        ]
      );
    });

    afterAll(async () => {
      // 別組織のテストデータをクリーンアップ
      await pool.query('DELETE FROM issue WHERE organization_id = $1', [otherOrgId]);
      await pool.query('DELETE FROM projects WHERE organization_id = $1', [otherOrgId]);
      await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [otherOrgId]);
      await pool.query('DELETE FROM organization WHERE organization_id = $1', [otherOrgId]);
    });

    it('should return empty array when project does not exist', async () => {
      const nonExistentProjectId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: nonExistentProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should return empty array when accessing another organization\'s project', async () => {
      // 他組織のプロジェクトIDを使用してアクセス
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: otherProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should return only issues from own organization', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .query({
          project_id: projectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // 自組織の問題のみが返されることを確認
      response.body.data.forEach((issue: any) => {
        expect(issue.organization_id).toBe(organizationId);
        expect(issue.project_id).toBe(projectId);
        // 他組織のプロジェクトIDでないことを確認
        expect(issue.project_id).not.toBe(otherProjectId);
      });

      // 自組織の問題が含まれることを確認
      const foundIssue = response.body.data.find(
        (issue: any) => issue.issue_id === testIssueId
      );
      expect(foundIssue).toBeDefined();
    });

    it('should verify organization_id filter is always applied', async () => {
      // 複数回リクエストして、常に自組織のデータのみが返されることを確認
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/v1/issues')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', organizationId)
          .query({
            project_id: projectId,
            method_id: 'method1',
            task_no: '1',
            transition_id: 'transition1',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // すべての問題が自組織のものであることを確認
        response.body.data.forEach((issue: any) => {
          expect(issue.organization_id).toBe(organizationId);
        });
      }
    });
  });

  // ============================================================
  // Task 5.4: 正常系の統合テスト
  // ============================================================
  describe('5.4 Happy Path Integration Tests', () => {
    let testToken: string;
    let testOrgId: string;
    let testProjectId: string;
    let testUserId: string;
    let testIssue1Id: string;
    let testIssue2Id: string;

    beforeAll(async () => {
      // テストデータのセットアップ
      testOrgId = '123e4567-e89b-12d3-a456-426614174000';
      testProjectId = '123e4567-e89b-12d3-a456-426614174001';
      testUserId = '123e4567-e89b-12d3-a456-426614174002';

      // テスト用組織、ユーザー、プロジェクトを作成
      await pool.query(
        'INSERT INTO organization (organization_id, organization_name, organization_prefix) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [testOrgId, 'Test Organization', 'test_org_544']
      );

      await pool.query(
        'INSERT INTO organization_user (user_id, organization_id, user_name, email, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [testUserId, testOrgId, 'Test Worker', 'worker544@test.com', 'worker']
      );

      await pool.query(
        `INSERT INTO projects (project_id, organization_id, project_name, description, status) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [testProjectId, testOrgId, 'Test Project', 'Test Description', 'active']
      );

      // 2つのテスト問題を作成（異なるステータスとタイプで）
      const issue1Result = await pool.query(
        `INSERT INTO issue (organization_id, project_id, method_id, task_no, transition_id, 
          issue_target, issue_type, status, title, description, reported_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '2 hours')
         RETURNING issue_id`,
        [
          testOrgId,
          testProjectId,
          'method1',
          1,
          'transition1',
          'transition',
          'data_error',
          'open',
          'Test Issue 1',
          'Test Description 1',
          testUserId,
        ]
      );
      testIssue1Id = issue1Result.rows[0].issue_id;

      const issue2Result = await pool.query(
        `INSERT INTO issue (organization_id, project_id, method_id, task_no, transition_id,
          issue_target, issue_type, status, title, description, reported_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '1 hour')
         RETURNING issue_id`,
        [
          testOrgId,
          testProjectId,
          'method1',
          1,
          'transition1',
          'transition',
          'procedure_issue',
          'resolved',
          'Test Issue 2',
          'Test Description 2',
          testUserId,
        ]
      );
      testIssue2Id = issue2Result.rows[0].issue_id;

      // Issue 1にコメントを追加（sequence_noでソート確認用）
      await pool.query(
        `INSERT INTO issue_comment (organization_id, issue_id, sequence_no, comment, posted_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '30 minutes')`,
        [testOrgId, testIssue1Id, 2, 'Second comment', testUserId]
      );

      await pool.query(
        `INSERT INTO issue_comment (organization_id, issue_id, sequence_no, comment, posted_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 hour')`,
        [testOrgId, testIssue1Id, 1, 'First comment', testUserId]
      );

      await pool.query(
        `INSERT INTO issue_comment (organization_id, issue_id, sequence_no, comment, posted_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '15 minutes')`,
        [testOrgId, testIssue1Id, 3, 'Third comment', testUserId]
      );

      // Issue 2にもコメントを追加
      await pool.query(
        `INSERT INTO issue_comment (organization_id, issue_id, sequence_no, comment, posted_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '20 minutes')`,
        [testOrgId, testIssue2Id, 1, 'Comment for issue 2', testUserId]
      );

      // JWTトークンを生成
      const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';
      const timestamp = Date.now();
      const token = `maiml_session-${testUserId}_${timestamp}`;
      
      testToken = jwt.sign(
        {
          token,
          userId: testUserId,
          organizationId: testOrgId,
          role: 'worker',
        },
        jwtSecret,
        { expiresIn: '1h' }
      );
    });

    afterAll(async () => {
      // テストデータのクリーンアップ
      await pool.query('DELETE FROM issue_comment WHERE organization_id = $1', [testOrgId]);
      await pool.query('DELETE FROM issue WHERE organization_id = $1', [testOrgId]);
      await pool.query('DELETE FROM projects WHERE organization_id = $1', [testOrgId]);
      await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [testOrgId]);
      await pool.query('DELETE FROM organization WHERE organization_id = $1', [testOrgId]);
    });

    it('正常なリクエストで問題一覧とコメントが返されることを確認', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // 各問題にコメントが含まれていることを確認
      const issue1 = response.body.data.find((i: any) => i.issue_id === testIssue1Id);
      const issue2 = response.body.data.find((i: any) => i.issue_id === testIssue2Id);

      expect(issue1).toBeDefined();
      expect(Array.isArray(issue1.comments)).toBe(true);
      expect(issue1.comments.length).toBe(3);

      expect(issue2).toBeDefined();
      expect(Array.isArray(issue2.comments)).toBe(true);
      expect(issue2.comments.length).toBe(1);
    });

    it('statusフィルタが正しく動作することを確認', async () => {
      // status: 'open' でフィルタ
      const openResponse = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
          status: 'open',
        });

      expect(openResponse.status).toBe(200);
      expect(openResponse.body.success).toBe(true);
      expect(openResponse.body.data.length).toBe(1);
      expect(openResponse.body.data[0].status).toBe('open');

      // status: 'resolved' でフィルタ
      const resolvedResponse = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
          status: 'resolved',
        });

      expect(resolvedResponse.status).toBe(200);
      expect(resolvedResponse.body.success).toBe(true);
      expect(resolvedResponse.body.data.length).toBe(1);
      expect(resolvedResponse.body.data[0].status).toBe('resolved');
    });

    it('issue_typeフィルタが正しく動作することを確認', async () => {
      // issue_type: 'data_error' でフィルタ
      const dataErrorResponse = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
          issue_type: 'data_error',
        });

      expect(dataErrorResponse.status).toBe(200);
      expect(dataErrorResponse.body.success).toBe(true);
      expect(dataErrorResponse.body.data.length).toBe(1);
      expect(dataErrorResponse.body.data[0].issue_type).toBe('data_error');

      // issue_type: 'procedure_issue' でフィルタ
      const procedureResponse = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
          issue_type: 'procedure_issue',
        });

      expect(procedureResponse.status).toBe(200);
      expect(procedureResponse.body.success).toBe(true);
      expect(procedureResponse.body.data.length).toBe(1);
      expect(procedureResponse.body.data[0].issue_type).toBe('procedure_issue');
    });

    it('プロジェクト名、報告者名、投稿者名が含まれることを確認', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const issue = response.body.data[0];

      // プロジェクト名が含まれることを確認
      expect(issue.project_name).toBe('Test Project');

      // 報告者名が含まれることを確認
      expect(issue.reporter_name).toBe('Test Worker');

      // コメントに投稿者名が含まれることを確認
      if (issue.comments && issue.comments.length > 0) {
        expect(issue.comments[0].commenter_name).toBe('Test Worker');
      }
    });

    it('コメントがsequence_no昇順でソートされることを確認', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const issue1 = response.body.data.find((i: any) => i.issue_id === testIssue1Id);
      expect(issue1).toBeDefined();
      expect(issue1.comments.length).toBe(3);

      // sequence_no が 1, 2, 3 の順になっていることを確認
      expect(issue1.comments[0].sequence_no).toBe(1);
      expect(issue1.comments[0].comment).toBe('First comment');

      expect(issue1.comments[1].sequence_no).toBe(2);
      expect(issue1.comments[1].comment).toBe('Second comment');

      expect(issue1.comments[2].sequence_no).toBe(3);
      expect(issue1.comments[2].comment).toBe('Third comment');
    });

    it('問題がcreated_at降順でソートされることを確認', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrgId)
        .query({
          project_id: testProjectId,
          method_id: 'method1',
          task_no: '1',
          transition_id: 'transition1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);

      // 最初の問題がIssue 2（新しい方）であることを確認
      expect(response.body.data[0].issue_id).toBe(testIssue2Id);
      expect(response.body.data[0].title).toBe('Test Issue 2');

      // 2番目の問題がIssue 1（古い方）であることを確認
      expect(response.body.data[1].issue_id).toBe(testIssue1Id);
      expect(response.body.data[1].title).toBe('Test Issue 1');

      // created_atが降順であることを確認
      const createdAt1 = new Date(response.body.data[0].created_at);
      const createdAt2 = new Date(response.body.data[1].created_at);
      expect(createdAt1.getTime()).toBeGreaterThan(createdAt2.getTime());
    });
  });
});
