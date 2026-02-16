/**
 * 問題ステータス変更API - End-to-End統合テスト（正常系）
 * 
 * タスク9.1: 正常系のend-to-endテスト
 * 
 * テスト対象:
 * - unresolved → resolved への変更が成功することをテスト
 * - resolved → unresolved への変更が成功することをテスト
 * - resolvedByにユーザーID、resolvedByNameにユーザー名が設定されることをテスト
 * - unresolvedに変更後、resolvedBy、resolvedByName、resolvedAtが空文字列になることをテスト
 * 
 * @requirements REQ-001 (問題ステータス変更機能)
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

describe('問題ステータス変更API - End-to-End統合テスト（正常系）(Task 9.1)', () => {
  let organizationId: string;
  let projectId: string;
  let issueId: string;
  let managerUserId: string;
  let managerUserName: string;
  let validToken: string;

  beforeAll(async () => {
    const pool = getPool();

    // テスト用組織を作成
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organization (id, organization_name, organization_prefix, address, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [organizationId, 'Test Org E2E', 'test_org_e2e', 'Test Address', true]
    );

    // Manager権限ユーザーを作成
    managerUserId = uuidv4();
    managerUserName = 'Test Manager E2E';
    await pool.query(
      `INSERT INTO organization_user (id, organization_id, user_name, email, role_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [managerUserId, organizationId, managerUserName, 'manager@e2e.com', 2, true]
    );

    // テスト用プロジェクトを作成
    projectId = uuidv4();
    await pool.query(
      `INSERT INTO project (id, organization_id, project_name, is_active)
       VALUES ($1, $2, $3, $4)`,
      [projectId, organizationId, 'Test Project E2E', true]
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
        'Test Issue for E2E',
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

  describe('1. unresolved → resolved への変更', () => {
    beforeEach(async () => {
      // 各テスト前に問題を未解決状態に戻す
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'unresolved', 
             issue_completer_id = NULL, 
             issue_complate_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [issueId]
      );
    });

    it('未解決の問題を解決済みに変更できる', async () => {
      // Act: unresolvedからresolvedへ変更
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 200 OK が返される
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // データが正しく返される
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(issueId);
      expect(response.body.data.status).toBe('resolved');
    });

    it('resolvedに変更すると、resolvedByにユーザーIDが設定される', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: resolvedByにユーザーIDが設定される
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedBy).toBe(managerUserId);
      expect(response.body.data.resolvedBy).not.toBe('');
      expect(typeof response.body.data.resolvedBy).toBe('string');
    });

    it('resolvedに変更すると、resolvedByNameにユーザー名が設定される', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: resolvedByNameにユーザー名が設定される
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedByName).toBe(managerUserName);
      expect(response.body.data.resolvedByName).not.toBe('');
      expect(typeof response.body.data.resolvedByName).toBe('string');
    });

    it('resolvedに変更すると、resolvedAtに解決日時が設定される', async () => {
      // Arrange: 変更前の時刻を記録
      const beforeTime = new Date();

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: resolvedAtに日時が設定される
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedAt).toBeDefined();
      expect(response.body.data.resolvedAt).not.toBe('');

      // ISO 8601形式であることを確認
      expect(response.body.data.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // 現在時刻付近であることを確認
      const resolvedAt = new Date(response.body.data.resolvedAt);
      const afterTime = new Date();
      expect(resolvedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resolvedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('resolvedに変更後、データベースに正しく保存される', async () => {
      // Act: ステータス変更
      await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: データベースから直接確認
      const pool = getPool();
      const result = await pool.query(
        `SELECT status, issue_completer_id, issue_complate_at 
         FROM issues 
         WHERE id = $1 AND organization_id = $2`,
        [issueId, organizationId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('resolved');
      expect(result.rows[0].issue_completer_id).toBe(managerUserId);
      expect(result.rows[0].issue_complate_at).not.toBeNull();
      expect(result.rows[0].issue_complate_at).toBeInstanceOf(Date);
    });
  });

  describe('2. resolved → unresolved への変更', () => {
    beforeEach(async () => {
      // 各テスト前に問題を解決済み状態にする
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'resolved', 
             issue_completer_id = $1, 
             issue_complate_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [managerUserId, issueId]
      );
    });

    it('解決済みの問題を未解決に戻せる', async () => {
      // Act: resolvedからunresolvedへ変更
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      // Assert: 200 OK が返される
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // ステータスがunresolvedになる
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(issueId);
      expect(response.body.data.status).toBe('unresolved');
    });

    it('unresolvedに変更すると、resolvedByが空文字列になる', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      // Assert: resolvedByが空文字列（nullやundefinedではない）
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedBy).toBe('');
      expect(response.body.data.resolvedBy).not.toBeNull();
      expect(response.body.data.resolvedBy).not.toBeUndefined();
    });

    it('unresolvedに変更すると、resolvedByNameが空文字列になる', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      // Assert: resolvedByNameが空文字列（nullやundefinedではない）
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedByName).toBe('');
      expect(response.body.data.resolvedByName).not.toBeNull();
      expect(response.body.data.resolvedByName).not.toBeUndefined();
    });

    it('unresolvedに変更すると、resolvedAtが空文字列になる', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      // Assert: resolvedAtが空文字列（nullやundefinedではない）
      expect(response.status).toBe(200);
      expect(response.body.data.resolvedAt).toBe('');
      expect(response.body.data.resolvedAt).not.toBeNull();
      expect(response.body.data.resolvedAt).not.toBeUndefined();
    });

    it('unresolvedに変更後、データベースでフィールドがNULLになる', async () => {
      // Act: ステータス変更
      await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      // Assert: データベースから直接確認
      const pool = getPool();
      const result = await pool.query(
        `SELECT status, issue_completer_id, issue_complate_at 
         FROM issues 
         WHERE id = $1 AND organization_id = $2`,
        [issueId, organizationId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('unresolved');
      expect(result.rows[0].issue_completer_id).toBeNull();
      expect(result.rows[0].issue_complate_at).toBeNull();
    });
  });

  describe('3. 双方向ステータス変更（往復テスト）', () => {
    it('unresolved → resolved → unresolved → resolved の順で変更できる', async () => {
      // Step 1: unresolved → resolved
      let response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedBy).toBe(managerUserId);
      expect(response.body.data.resolvedByName).toBe(managerUserName);
      expect(response.body.data.resolvedAt).not.toBe('');

      // Step 2: resolved → unresolved
      response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('unresolved');
      expect(response.body.data.resolvedBy).toBe('');
      expect(response.body.data.resolvedByName).toBe('');
      expect(response.body.data.resolvedAt).toBe('');

      // Step 3: unresolved → resolved (再度)
      response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedBy).toBe(managerUserId);
      expect(response.body.data.resolvedByName).toBe(managerUserName);
      expect(response.body.data.resolvedAt).not.toBe('');

      // Step 4: resolved → unresolved (再度)
      response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('unresolved');
      expect(response.body.data.resolvedBy).toBe('');
      expect(response.body.data.resolvedByName).toBe('');
      expect(response.body.data.resolvedAt).toBe('');
    });
  });

  describe('4. レスポンス形式の詳細検証', () => {
    beforeEach(async () => {
      // 各テスト前に問題を未解決状態に戻す
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'unresolved', 
             issue_completer_id = NULL, 
             issue_complate_at = NULL
         WHERE id = $1`,
        [issueId]
      );
    });

    it('成功レスポンスに必須フィールドがすべて含まれる', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 統一レスポンス形式
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      // dataオブジェクトの必須フィールド
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('resolvedBy');
      expect(response.body.data).toHaveProperty('resolvedByName');
      expect(response.body.data).toHaveProperty('resolvedAt');
      expect(response.body.data).toHaveProperty('updatedAt');

      // metaオブジェクトの必須フィールド
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('metaオブジェクトのtimestampがISO 8601形式である', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: ISO 8601形式
      expect(response.body.meta.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('metaオブジェクトのrequestIdがUUID形式である', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: UUID v4形式
      expect(response.body.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('updatedAtが更新される', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: updatedAtが設定される
      expect(response.body.data.updatedAt).toBeDefined();
      expect(response.body.data.updatedAt).not.toBe('');
      expect(response.body.data.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('5. 同一ステータスへの変更（冪等性）', () => {
    it('unresolvedからunresolvedへの変更でもエラーにならない', async () => {
      // Arrange: 問題を未解決状態にする
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'unresolved', 
             issue_completer_id = NULL, 
             issue_complate_at = NULL
         WHERE id = $1`,
        [issueId]
      );

      // Act: unresolved → unresolved
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'unresolved' });

      // Assert: 成功する（冪等性）
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('unresolved');
      expect(response.body.data.resolvedBy).toBe('');
      expect(response.body.data.resolvedByName).toBe('');
      expect(response.body.data.resolvedAt).toBe('');
    });

    it('resolvedからresolvedへの変更でもエラーにならない', async () => {
      // Arrange: 問題を解決済み状態にする
      const pool = getPool();
      await pool.query(
        `UPDATE issues 
         SET status = 'resolved', 
             issue_completer_id = $1, 
             issue_complate_at = NOW()
         WHERE id = $2`,
        [managerUserId, issueId]
      );

      // Act: resolved → resolved
      const response = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Organization-Id', organizationId)
        .send({ status: 'resolved' });

      // Assert: 成功する（冪等性）
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedBy).toBe(managerUserId);
      expect(response.body.data.resolvedByName).toBe(managerUserName);
      expect(response.body.data.resolvedAt).not.toBe('');
    });
  });
});
