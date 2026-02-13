/**
 * 統合テスト: コメント投稿API - 認証・認可
 * 
 * @description
 * - JWT認証が正しく機能することを検証
 * - 権限チェックが正しく機能することを検証
 * - 統合レベルでのセキュリティ制御を検証
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

describe('POST /api/v1/issues/:issueId/comments - 認証・認可統合テスト', () => {
  let organizationId: string;
  let projectId: string;
  let issueId: string;
  let workerUserId: string;
  let viewerUserId: string;
  
  beforeAll(async () => {
    const pool = getPool();
    
    // テスト用組織を作成
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organization (id, organization_name, organization_prefix, address, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [organizationId, 'Test Org', 'test_org', 'Test Address', true]
    );
    
    // Worker権限ユーザーを作成
    workerUserId = uuidv4();
    await pool.query(
      `INSERT INTO organization_user (id, organization_id, user_name, email, role_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workerUserId, organizationId, 'Test Worker', 'worker@test.com', 1, true]
    );
    
    // Viewer権限ユーザー（Worker権限未満）を作成
    viewerUserId = uuidv4();
    await pool.query(
      `INSERT INTO organization_user (id, organization_id, user_name, email, role_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [viewerUserId, organizationId, 'Test Viewer', 'viewer@test.com', 0, true]
    );
    
    // テスト用プロジェクトを作成
    projectId = uuidv4();
    await pool.query(
      `INSERT INTO project (id, organization_id, project_name, is_active)
       VALUES ($1, $2, $3, $4)`,
      [projectId, organizationId, 'Test Project', true]
    );
    
    // テスト用問題を作成
    issueId = uuidv4();
    await pool.query(
      `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, reporter_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [issueId, organizationId, projectId, 'Test Issue', 'Test Description', 'open', 'medium', workerUserId]
    );
  });
  
  afterAll(async () => {
    const pool = getPool();
    
    // クリーンアップ（外部キー制約により自動削除されるが明示的に削除）
    await pool.query('DELETE FROM issue_comment WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM issues WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization WHERE id = $1', [organizationId]);
    
    await pool.end();
  });
  
  describe('認証エラー', () => {
    test('JWTトークンなしで401 Unauthorizedを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .send({
          comment: 'This should fail without authentication'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
    
    test('不正なJWTトークンで401 Unauthorizedを返す', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          comment: 'This should fail with invalid token'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/^AUTH_/);
    });
    
    test('期限切れJWTトークンで401 Unauthorizedを返す', async () => {
      // 期限切れトークンを生成（-1秒で即座に期限切れ）
      const expiredToken = jwt.sign(
        {
          userId: workerUserId,
          organizationId: organizationId,
          role: 'worker'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1s' }
      );
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          comment: 'This should fail with expired token'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_EXPIRED');
    });
  });
  
  describe('認可エラー', () => {
    test('Worker権限未満（Viewer）で403 Forbiddenを返す', async () => {
      // Viewer権限（role_level=0）のトークンを生成
      const viewerToken = jwt.sign(
        {
          userId: viewerUserId,
          organizationId: organizationId,
          role: 'viewer',
          roleLevel: 0
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'This should fail with insufficient permissions'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      expect(response.body.error.message).toContain('権限');
    });
    
    test('Worker権限で正常に投稿できる（権限チェック正常系）', async () => {
      // Worker権限（role_level=1）のトークンを生成
      const workerToken = jwt.sign(
        {
          userId: workerUserId,
          organizationId: organizationId,
          role: 'worker',
          roleLevel: 1
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${workerToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Worker権限でコメント投稿'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.comment).toBe('Worker権限でコメント投稿');
    });
  });
  
  describe('組織分離検証', () => {
    test('異なる組織のトークンで404 Not Foundを返す（組織分離）', async () => {
      const otherOrgId = uuidv4();
      
      // 異なる組織のトークンを生成
      const otherOrgToken = jwt.sign(
        {
          userId: workerUserId,
          organizationId: otherOrgId, // 異なる組織ID
          role: 'worker',
          roleLevel: 1
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .set('X-Organization-Id', otherOrgId)
        .send({
          comment: 'This should fail due to tenant isolation'
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});