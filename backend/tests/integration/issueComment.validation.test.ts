/**
 * 統合テスト: コメント投稿API - バリデーション
 * 
 * @description
 * - 入力バリデーションが正しく機能することを検証
 * - エラーレスポンス形式の統合テスト
 * - express-validatorとサービス層バリデーションの統合
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

describe('POST /api/v1/issues/:issueId/comments - バリデーション統合テスト', () => {
  let organizationId: string;
  let projectId: string;
  let issueId: string;
  let workerUserId: string;
  let validToken: string;
  
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
    
    // 有効なJWTトークンを生成
    validToken = jwt.sign(
      {
        userId: workerUserId,
        organizationId: organizationId,
        role: 'worker',
        roleLevel: 1
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });
  
  afterAll(async () => {
    const pool = getPool();
    
    // クリーンアップ
    await pool.query('DELETE FROM issue_comment WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM issues WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization WHERE id = $1', [organizationId]);
    
    await pool.end();
  });
  
  describe('コメント内容のバリデーション', () => {
    test('空のコメントで400 Bad Requestを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: ''
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/VALIDATION_/);
      expect(response.body.error.message).toContain('comment');
      
      // エラーレスポンス構造の検証
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });
    
    test('空白のみのコメントで400 Bad Requestを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: '   \n\t   '
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/VALIDATION_/);
    });
    
    test('2001文字のコメントで400 Bad Requestを返す', async () => {
      const longComment = 'a'.repeat(2001);
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: longComment
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/VALIDATION_/);
      expect(response.body.error.message).toContain('2000');
    });
    
    test('commentフィールドなしで400 Bad Requestを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('issueIdのバリデーション', () => {
    test('不正なUUID形式のissueIdで400 Bad Requestを返す', async () => {
      const invalidIssueId = 'not-a-valid-uuid';
      
      const response = await request(app)
        .post(`/api/v1/issues/${invalidIssueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Valid comment content'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/VALIDATION_/);
      expect(response.body.error.message).toContain('issueId');
    });
    
    test('数字のissueIdで400 Bad Requestを返す', async () => {
      const response = await request(app)
        .post('/api/v1/issues/12345/comments')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Valid comment content'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    test('空のissueIdで400 Bad Requestを返す', async () => {
      const response = await request(app)
        .post('/api/v1/issues/ /comments')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Valid comment content'
        });
      
      expect(response.status).toBe(404); // ルーティングマッチ失敗
    });
  });
  
  describe('エラーレスポンス構造の検証', () => {
    test('バリデーションエラーレスポンスが統一形式であることを確認', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: ''
        });
      
      // 統一レスポンス形式の検証
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
      
      // timestampがISO 8601形式であることを確認
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // エラーコードがVALIDATION_プレフィックスであることを確認
      expect(response.body.error.code).toMatch(/^VALIDATION_/);
    });
    
    test('複数のバリデーションエラーが詳細に報告されること', async () => {
      const response = await request(app)
        .post('/api/v1/issues/invalid-uuid/comments')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: ''
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      // エラーメッセージが適切に設定されていることを確認
      expect(response.body.error.message).toBeDefined();
      expect(typeof response.body.error.message).toBe('string');
    });
  });
  
  describe('正常系: バリデーション成功', () => {
    test('有効なリクエストで201 Createdを返す（バリデーションパス）', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'This is a valid comment that passes all validation'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.comment).toBe('This is a valid comment that passes all validation');
    });
    
    test('境界値（1文字）のコメントでバリデーション成功', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'a'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment).toBe('a');
    });
    
    test('境界値（2000文字）のコメントでバリデーション成功', async () => {
      const maxLengthComment = 'a'.repeat(2000);
      
      const response = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: maxLengthComment
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment).toBe(maxLengthComment);
      expect(response.body.data.comment.length).toBe(2000);
    });
  });
});