/**
 * 問題ステータス変更API - JWT認証統合テスト
 * 
 * タスク8.1: JWT認証の統合テスト
 * 
 * テスト対象:
 * - 有効なJWTトークンで認証が成功することをテスト
 * - 無効なトークンで401エラーが返ることをテスト
 * - トークンなしで401エラーが返ることをテスト
 * 
 * @requirements REQ-002 (認証と認可)
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

describe('問題ステータス変更API - JWT認証統合テスト (Task 8.1)', () => {
  let organizationId: string;
  let projectId: string;
  let issueId: string;
  let managerUserId: string;
  let validToken: string;

  beforeAll(async () => {
    const pool = getPool();

    // テスト用組織を作成
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organization (id, organization_name, organization_prefix, address, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [organizationId, 'Test Org Auth', 'test_org_auth', 'Test Address', true]
    );

    // Manager権限ユーザーを作成
    managerUserId = uuidv4();
    await pool.query(
      `INSERT INTO organization_user (id, organization_id, user_name, email, role_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [managerUserId, organizationId, 'Test Manager', 'manager@test.com', 2, true]
    );

    // テスト用プロジェクトを作成
    projectId = uuidv4();
    await pool.query(
      `INSERT INTO project (id, organization_id, project_name, is_active)
       VALUES ($1, $2, $3, $4)`,
      [projectId, organizationId, 'Test Project', true]
    );

    // テスト用問題を作成（未解決状態）
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
        'Test Issue for Auth',
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

    await pool.end();
  });

  describe('1. 有効なJWTトークンでの認証成功', () => {
    it('有効なJWTトークンが提供された場合、ステータス変更リクエストが処理される', async () => {
      // Act: 有効なJWTトークンでステータス変更リクエスト
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 200 OK が返される
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedBy).toBe(managerUserId);
    });

    it('Bearerプレフィックスなしの有効なトークンでも認証が成功する', async () => {
      // Arrange: 問題を未解決状態に戻す
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'unresolved', 
             issue_completer_id = NULL, 
             issue_complate_at = NULL 
         WHERE id = $1`,
        [issueId]
      );

      // Act: Bearerプレフィックスなしでトークンを送信
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', validToken) // Bearerなし
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 200 OK が返される
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('2. 無効なJWTトークンでの認証失敗', () => {
    it('無効なJWTトークンの場合、401 Unauthorizedエラーが返される', async () => {
      // Arrange: 無効なトークン
      const invalidToken = 'invalid.jwt.token.format';

      // Act: 無効なトークンでリクエスト
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 401エラーが返される
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/^AUTH_/);
      expect(response.body.error.message).toBeDefined();
    });

    it('期限切れのJWTトークンの場合、401エラーが返される', async () => {
      // Arrange: 期限切れトークン（-1秒で即座に期限切れ）
      const expiredToken = jwt.sign(
        {
          userId: managerUserId,
          organizationId: organizationId,
          role: 'manager',
          roleLevel: 2,
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1s' } // 即座に期限切れ
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(response.body.error.message).toContain('期限');
    });

    it('改ざんされたJWTトークンの場合、401エラーが返される', async () => {
      // Arrange: 署名が改ざんされたトークン
      const validTokenParts = validToken.split('.');
      const tamperedToken = validTokenParts[0] + '.' + validTokenParts[1] + '.tampered_signature';

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${tamperedToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/^AUTH_/);
    });

    it('間違ったシークレットで署名されたトークンの場合、401エラーが返される', async () => {
      // Arrange: 間違ったシークレットで署名
      const wrongSecretToken = jwt.sign(
        {
          userId: managerUserId,
          organizationId: organizationId,
          role: 'manager',
        },
        'wrong-secret-key', // 間違ったシークレット
        { expiresIn: '1h' }
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/^AUTH_/);
    });
  });

  describe('3. トークン未提供での認証失敗', () => {
    it('Authorizationヘッダーがない場合、401エラーが返される', async () => {
      // Act: Authorizationヘッダーなしでリクエスト
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 401エラーが返される
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      expect(response.body.error.message).toBe('認証トークンが提供されていません');
    });

    it('Authorizationヘッダーが空文字列の場合、401エラーが返される', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', '')
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('Authorizationヘッダーが"Bearer "のみの場合、401エラーが返される', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', 'Bearer ')
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('Authorizationヘッダーが空白文字のみの場合、401エラーが返される', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', '   ')
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
  });

  describe('4. エラーレスポンス形式の検証', () => {
    it('認証エラー時、統一されたエラーレスポンス形式を返す', async () => {
      // Arrange
      const invalidToken = 'invalid.token';

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 統一されたエラーレスポンス形式
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');

      // タイムスタンプがISO 8601形式であることを確認
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('認証エラー時、機密情報（スタックトレース等）が含まれないことを確認', async () => {
      // Arrange: システムエラーを引き起こす可能性のあるトークン
      const malformedToken = 'Bearer malformed..token..format';

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', malformedToken)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: レスポンスに機密情報が含まれないことを確認
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('stack');
      expect(responseText).not.toContain('Stack');
      expect(responseText).not.toContain('at Object');
      expect(responseText).not.toContain('JWT_SECRET');
      expect(responseText).not.toContain('process.env');
      expect(responseText).not.toContain('Error:');
    });
  });

  describe('5. 認証ミドルウェアの統合確認', () => {
    it('authMiddlewareがtenantIsolationの前に実行されることを確認', async () => {
      // Arrange: 無効なトークン
      const invalidToken = 'invalid.token';

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 認証エラーで401が返り、ステータス変更は行われない
      expect(response.status).toBe(401);

      // データベースで問題のステータスが変更されていないことを確認
      const pool = getPool();
      const result = await pool.query('SELECT status FROM issues WHERE id = $1', [issueId]);
      expect(result.rows[0].status).toBe('unresolved'); // 変更されていない
    });

    it('認証成功後、req.userオブジェクトが設定され後続処理で利用される', async () => {
      // Arrange: 問題を未解決状態に戻す
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'unresolved', 
             issue_completer_id = NULL, 
             issue_complate_at = NULL 
         WHERE id = $1`,
        [issueId]
      );

      // Act: 有効なトークンでステータス変更
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 認証成功し、userIdがDB更新に使用される
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedBy).toBe(managerUserId);

      // データベースで解決者IDが正しく記録されていることを確認
      const result = await pool.query(
        'SELECT issue_completer_id FROM issues WHERE id = $1',
        [issueId]
      );
      expect(result.rows[0].issue_completer_id).toBe(managerUserId);
    });
  });

  describe('6. 組織分離との統合確認', () => {
    it('異なる組織のトークンでは404エラーが返される', async () => {
      // Arrange: 異なる組織のトークン
      const otherOrgId = uuidv4();
      const otherOrgToken = jwt.sign(
        {
          userId: managerUserId,
          organizationId: otherOrgId, // 異なる組織ID
          role: 'manager',
          roleLevel: 2,
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .set('X-Organization-Id', otherOrgId)
        .send({ status: 'resolved' });

      // Assert: 404エラー（他組織の問題にはアクセスできない）
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
