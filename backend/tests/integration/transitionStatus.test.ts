/**
 * トランジション状態更新API 統合テスト
 * 
 * 【注意】
 * このテストファイルは統合テスト環境の設定が複雑なため、
 * 実行は保留となっています。各層のユニットテストで動作は検証済みです。
 * 
 * テストシナリオ:
 * - 正常系: ステータス更新の完全なフロー
 * - 異常系: 各種エラーケースの検証
 */

import request from 'supertest';
import express from 'express';
import experimentRoutes from '../../src/routes/experimentRoutes';
import { auth } from '../../src/middleware/auth';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
import { getPool } from '../../src/database/db';

// テスト用アプリケーション
const app = express();
app.use(express.json());
app.use('/api/v1/experiments', experimentRoutes);

// モックデータ
const validOrganizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
const validUserId = 'user-001';
const validProjectId = 'project-001';
const validMethodId = 'method-001';
const validTransitionId = 'transition-001';

describe('トランジション状態更新API - 統合テスト', () => {
  let authToken: string;

  beforeAll(() => {
    // テスト用認証トークンを生成
    authToken = 'test-jwt-token';
  });

  afterEach(async () => {
    // 各テスト後にデータベースをクリーンアップ
    const pool = getPool();
    await pool.query('DELETE FROM transition_data WHERE organization_id = $1', [validOrganizationId]);
  });

  // =====================================================
  // 正常系テスト
  // =====================================================

  describe('正常系: ステータス更新フロー', () => {
    test('initial → preparing → ready → running → completed のフローが正しく動作する', async () => {
      // テストデータ作成
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      // Step 1: initial → preparing
      let response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('preparing');

      // Step 2: preparing → ready
      response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'ready' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ready');

      // Step 3: ready → running
      response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'running' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('running');

      // Step 4: running → completed
      response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.progress_rate).toBe(100); // 自動的に100%に設定
    });

    test('completedステータス時に進捗率が100%に自動設定される', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'running', 50, null, validUserId
      ]);

      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.data.progress_rate).toBe(100);
    });

    test('コメントが正しく保存される', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      const testComment = '準備作業を開始しました';
      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing', comment: testComment });

      expect(response.status).toBe(200);
      expect(response.body.data.comment).toBe(testComment);
    });

    test('タスク進捗率が再計算される', async () => {
      // 複数のトランジションを作成
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES 
          ($1, $2, $3, $4, 'transition-001', 'initial', 0, NULL, $5, NOW(), NOW()),
          ($1, $2, $3, $4, 'transition-002', 'initial', 0, NULL, $5, NOW(), NOW()),
          ($1, $2, $3, $4, 'transition-003', 'initial', 0, NULL, $5, NOW(), NOW())
      `, [validOrganizationId, validProjectId, validMethodId, 1, validUserId]);

      // 1つのトランジションをcompletedに更新
      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/transition-001/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);

      // タスク進捗率を確認（1/3 = 33.33%）
      const result = await pool.query(`
        SELECT progress_rate FROM project_task
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [validOrganizationId, validProjectId, validMethodId, 1]);

      expect(result.rows[0].progress_rate).toBeCloseTo(33.33, 1);
    });

    test('データベースにステータスが正しく更新される', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing' });

      // データベースから直接確認
      const result = await pool.query(`
        SELECT status FROM transition_data
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3
          AND task_no = $4 AND transition_id = $5
      `, [validOrganizationId, validProjectId, validMethodId, 1, validTransitionId]);

      expect(result.rows[0].status).toBe('preparing');
    });
  });

  // =====================================================
  // 異常系テスト（タスク9.2）
  // =====================================================

  describe('異常系: エラーケース', () => {
    test('存在しないprojectIdで404エラーが返る', async () => {
      const nonExistentProjectId = 'non-existent-project';

      const response = await request(app)
        .put(`/api/v1/experiments/projects/${nonExistentProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRANSITION_NOT_FOUND');
    });

    test('存在しないtransitionIdで404エラーが返る', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      const nonExistentTransitionId = 'non-existent-transition';
      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${nonExistentTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRANSITION_NOT_FOUND');
    });

    test('不正なステータス値（invalid）で400エラーが返る', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    test('不正なステータス遷移（completed → initial）で422エラーが返る', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'completed', 100, null, validUserId
      ]);

      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'initial' });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(response.body.error.message).toContain('completed');
      expect(response.body.error.message).toContain('initial');
    });

    test('アーカイブ済みプロジェクトで403エラーが返る', async () => {
      const pool = getPool();
      
      // アーカイブ済みプロジェクトを作成
      const archivedProjectId = 'archived-project-001';
      await pool.query(`
        INSERT INTO project (
          organization_id, project_id, project_name, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, 'アーカイブ済みプロジェクト', 'archived', $3, NOW(), NOW())
      `, [validOrganizationId, archivedProjectId, validUserId]);

      // トランジションデータを作成
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, archivedProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      const response = await request(app)
        .put(`/api/v1/experiments/projects/${archivedProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_ACTIVE');
      expect(response.body.error.message).toContain('archived');
    });

    test('異なるorganization_idのレコードにアクセスして403エラーが返る', async () => {
      const pool = getPool();
      const otherOrganizationId = 'other-org-id';

      // 別組織のトランジションデータを作成
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        otherOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      // 自組織のorganization_idでアクセス（マルチテナント分離により403）
      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId) // 異なるorganization_id
        .send({ status: 'preparing' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('コメント長超過（2001文字）で400エラーが返る', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      const longComment = 'a'.repeat(2001); // 2001文字
      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing', comment: longComment });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details[0].field).toBe('comment');
    });

    test('認証トークンなしで401エラーが返る', async () => {
      const pool = getPool();
      await pool.query(`
        INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate, comment, updated_by, updated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        validOrganizationId, validProjectId, validMethodId, 1, validTransitionId,
        'initial', 0, null, validUserId
      ]);

      const response = await request(app)
        .put(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/transitions/${validTransitionId}/status`)
        // Authorizationヘッダーなし
        .set('X-Organization-Id', validOrganizationId)
        .send({ status: 'preparing' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});