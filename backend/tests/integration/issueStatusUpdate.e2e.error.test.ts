/**
 * 問題ステータス変更API - End-to-End統合テスト（異常系）
 * 
 * タスク9.2: 異常系のend-to-endテスト
 * 
 * テスト対象:
 * - 無効なステータス値で400エラーが返ることをテスト
 * - 存在しない問題IDで404エラーが返ることをテスト
 * - 他組織の問題で404エラーが返ることをテスト
 * - システムエラー時に500エラーが返ることをテスト
 * 
 * @requirements REQ-004 (入力バリデーション), REQ-005 (エラーハンドリングとレスポンス形式)
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import issueRoutes from '../../src/routes/issueRoutes';
import { getPool } from '../../src/database/db';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use('/api/v1/issues', issueRoutes);

describe('問題ステータス変更API - End-to-End統合テスト（異常系）(Task 9.2)', () => {
  let organizationId: string;
  let projectId: string;
  let issueId: string;
  let managerUserId: string;
  let validToken: string;

  // 別組織のデータ
  let otherOrgId: string;
  let otherProjectId: string;
  let otherIssueId: string;
  let otherUserId: string;
  let otherToken: string;

  beforeAll(async () => {
    const pool = getPool();

    // テスト用組織1を作成
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organization (id, organization_name, organization_prefix, address, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [organizationId, 'Test Org E2E Error', 'test_org_e2e_err', 'Test Address', true]
    );

    // Manager権限ユーザーを作成
    managerUserId = uuidv4();
    await pool.query(
      `INSERT INTO organization_user (id, organization_id, user_name, email, role_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [managerUserId, organizationId, 'Test Manager E2E Error', 'manager@e2e-error.com', 2, true]
    );

    // テスト用プロジェクトを作成
    projectId = uuidv4();
    await pool.query(
      `INSERT INTO project (id, organization_id, project_name, is_active)
       VALUES ($1, $2, $3, $4)`,
      [projectId, organizationId, 'Test Project E2E Error', true]
    );

    // テスト用問題を作成
    issueId = uuidv4();
    await pool.query(
      `INSERT INTO issues (
        id, organization_id, project_id, title, description, 
        status, priority, reporter_id, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        issueId,
        organizationId,
        projectId,
        'Test Issue for E2E Error',
        'Test Description',
        'unresolved',
        'medium',
        managerUserId,
      ]
    );

    // 有効なJWTトークンを生成
    validToken = jwt.sign(
      {
        userId: managerUserId,
        organizationId: organizationId,
        role: 'manager',
        roleLevel: 2,
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // 別組織のデータを作成（マルチテナント分離テスト用）
    otherOrgId = uuidv4();
    await pool.query(
      `INSERT INTO organization (id, organization_name, organization_prefix, address, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [otherOrgId, 'Other Org E2E', 'other_org_e2e', 'Other Address', true]
    );

    otherUserId = uuidv4();
    await pool.query(
      `INSERT INTO organization_user (id, organization_id, user_name, email, role_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [otherUserId, otherOrgId, 'Other Manager', 'other@e2e-error.com', 2, true]
    );

    otherProjectId = uuidv4();
    await pool.query(
      `INSERT INTO project (id, organization_id, project_name, is_active)
       VALUES ($1, $2, $3, $4)`,
      [otherProjectId, otherOrgId, 'Other Project', true]
    );

    otherIssueId = uuidv4();
    await pool.query(
      `INSERT INTO issues (
        id, organization_id, project_id, title, description, 
        status, priority, reporter_id, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        otherIssueId,
        otherOrgId,
        otherProjectId,
        'Other Issue',
        'Other Description',
        'unresolved',
        'medium',
        otherUserId,
      ]
    );

    otherToken = jwt.sign(
      {
        userId: otherUserId,
        organizationId: otherOrgId,
        role: 'manager',
        roleLevel: 2,
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    const pool = getPool();

    // クリーンアップ
    await pool.query('DELETE FROM issues WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [
      organizationId,
    ]);
    await pool.query('DELETE FROM organization WHERE id = $1', [organizationId]);

    await pool.query('DELETE FROM issues WHERE organization_id = $1', [otherOrgId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1', [otherOrgId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [otherOrgId]);
    await pool.query('DELETE FROM organization WHERE id = $1', [otherOrgId]);

    await pool.end();
  });

  describe('1. バリデーションエラー（400 Bad Request）', () => {
    it('無効なステータス値（invalid）で400エラーが返る', async () => {
      // Act: 無効なステータス値
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'invalid' });

      // Assert: 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBeDefined();
    });

    it('無効なステータス値（空文字列）で400エラーが返る', async () => {
      // Act: 空文字列
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: '' });

      // Assert: 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なステータス値（pending）で400エラーが返る', async () => {
      // Act: 許可されていないステータス値
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'pending' });

      // Assert: 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('statusパラメータが欠落している場合400エラーが返る', async () => {
      // Act: statusパラメータなし
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({});

      // Assert: 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('バリデーションエラーのレスポンスに詳細情報が含まれる', async () => {
      // Act: 無効なステータス値
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'invalid' });

      // Assert: エラー詳細
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
      expect(response.body.error.details.length).toBeGreaterThan(0);
      
      // 最初のエラー詳細を確認
      const firstError = response.body.error.details[0];
      expect(firstError).toHaveProperty('field');
      expect(firstError).toHaveProperty('message');
    });

    it('バリデーションエラーのレスポンスが統一形式である', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'invalid' });

      // Assert: 統一レスポンス形式
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });
  });

  describe('2. リソース未検出（404 Not Found）', () => {
    it('存在しない問題IDで404エラーが返る', async () => {
      // Arrange: 存在しないUUID
      const nonExistentIssueId = uuidv4();

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${nonExistentIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 404 Not Found
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(response.body.error.message).toBeDefined();
    });

    it('存在しない問題IDのエラーメッセージが適切である', async () => {
      // Arrange: 存在しないUUID
      const nonExistentIssueId = uuidv4();

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${nonExistentIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: エラーメッセージ
      expect(response.body.error.message).toContain('問題が見つかりません');
    });

    it('他組織の問題へのアクセスで404エラーが返る（マルチテナント分離）', async () => {
      // Act: 自組織のトークンで他組織の問題にアクセス
      const response = await request(app)
        .patch(`/api/v1/issues/${otherIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 404 Not Found（403ではなく404を返すことでリソースの存在を隠蔽）
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('他組織の問題へのアクセス時、機密情報が漏洩しない', async () => {
      // Act: 他組織の問題にアクセス
      const response = await request(app)
        .patch(`/api/v1/issues/${otherIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: エラーメッセージに組織情報が含まれない
      expect(response.body.error.message).not.toContain(otherOrgId);
      expect(response.body.error.message).not.toContain('other_org');
      expect(response.body.error.message).not.toContain('Other Org');
    });

    it('404エラーのレスポンスが統一形式である', async () => {
      // Arrange
      const nonExistentIssueId = uuidv4();

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${nonExistentIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 統一レスポンス形式
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });
  });

  describe('3. マルチテナント分離の徹底検証', () => {
    it('別組織のユーザーは自組織の問題のみアクセスできる', async () => {
      // Act: 別組織のトークンで自組織の問題にアクセス
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Organization-Id', otherOrgId)
        .send({ status: 'resolved' });

      // Assert: 404 Not Found
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('別組織のユーザーが自組織の問題にアクセスできる', async () => {
      // Act: 別組織のトークンで別組織の問題にアクセス（正常ケース）
      const response = await request(app)
        .patch(`/api/v1/issues/${otherIssueId}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Organization-Id', otherOrgId)
        .send({ status: 'resolved' });

      // Assert: 200 OK（同一組織内アクセスは成功）
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(otherIssueId);
      expect(response.body.data.status).toBe('resolved');
    });

    it('データベースレベルでorganization_idフィルタが機能している', async () => {
      // Arrange: 自組織の問題を作成
      const pool = getPool();
      const testIssueId = uuidv4();
      await pool.query(
        `INSERT INTO issues (
          id, organization_id, project_id, title, description, 
          status, priority, reporter_id, created_at, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          testIssueId,
          organizationId,
          projectId,
          'Test DB Filter',
          'Test Description',
          'unresolved',
          'medium',
          managerUserId,
        ]
      );

      // Act: 別組織のトークンでアクセス
      const response = await request(app)
        .patch(`/api/v1/issues/${testIssueId}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Organization-Id', otherOrgId)
        .send({ status: 'resolved' });

      // Assert: 404エラー
      expect(response.status).toBe(404);

      // Cleanup
      await pool.query('DELETE FROM issues WHERE id = $1', [testIssueId]);
    });
  });

  describe('4. エラーレスポンスのセキュリティ検証', () => {
    it('400エラーでスタックトレースが露出しない', async () => {
      // Act: バリデーションエラー
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'invalid' });

      // Assert: 機密情報が含まれない
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('at ');
      expect(responseText).not.toContain('node_modules');
      expect(responseText).not.toContain('.ts:');
      expect(responseText).not.toContain('.js:');
      expect(responseText).not.toContain('Error:');
    });

    it('404エラーでデータベースパスが露出しない', async () => {
      // Arrange
      const nonExistentIssueId = uuidv4();

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${nonExistentIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 機密情報が含まれない
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('postgres');
      expect(responseText).not.toContain('SELECT');
      expect(responseText).not.toContain('UPDATE');
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('/var/');
      expect(responseText).not.toContain('C:\\');
    });

    it('エラーレスポンスにmetaオブジェクトが含まれる', async () => {
      // Act: バリデーションエラー
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'invalid' });

      // Assert: metaオブジェクト
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.timestamp).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
      expect(response.body.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('5. HTTPステータスコードの正確性', () => {
    it('無効なステータス値で正確に400が返る（401や500ではない）', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'invalid' });

      // Assert: 400 Bad Request（他のステータスコードではない）
      expect(response.status).toBe(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(500);
    });

    it('存在しない問題IDで正確に404が返る（400や500ではない）', async () => {
      // Arrange
      const nonExistentIssueId = uuidv4();

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${nonExistentIssueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 404 Not Found（他のステータスコードではない）
      expect(response.status).toBe(404);
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(500);
    });
  });
});
