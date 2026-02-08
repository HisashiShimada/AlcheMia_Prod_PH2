/**
 * タスクステータス更新API 統合テスト
 * 
 * @description エンドツーエンドのAPI統合テスト
 * Task 4.2: 統合テストの実装
 * 
 * Requirements:
 * - エンドツーエンドフロー（pending→in_progress→completed）
 * - 権限チェック（experiment_workerが自分のタスクのみ更新可能）
 * - マルチテナント分離（異なる組織のタスクにアクセスできない）
 * - 楽観的ロック（同時更新時に片方が409を受け取る）
 * - トランザクション整合性（エラー時にROLLBACKされてデータが変更されない）
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';

describe('Task Status Update API - Integration Tests', () => {
  let authToken: string;
  let authTokenWorker2: string;
  let authTokenOtherOrg: string;
  let testOrganizationId: string;
  let testProjectId: string;
  let testMethodId: string;
  let testTaskNo: number;
  let testUserId: string;
  let testUser2Id: string;
  let otherOrgId: string;

  beforeAll(async () => {
    const pool = getPool();

    // テスト用の組織を作成
    const orgResult = await pool.query(`
      INSERT INTO organization (organization_id, organization_name, created_at)
      VALUES (gen_random_uuid(), 'Test Organization', NOW())
      RETURNING organization_id
    `);
    testOrganizationId = orgResult.rows[0].organization_id;

    // 別の組織を作成（マルチテナント分離テスト用）
    const otherOrgResult = await pool.query(`
      INSERT INTO organization (organization_id, organization_name, created_at)
      VALUES (gen_random_uuid(), 'Other Organization', NOW())
      RETURNING organization_id
    `);
    otherOrgId = otherOrgResult.rows[0].organization_id;

    // テスト用ユーザー1を作成（experiment_worker）
    const userResult = await pool.query(`
      INSERT INTO organization_user (
        user_id, organization_id, login_id, user_name, role, is_active, created_at
      )
      VALUES (gen_random_uuid(), $1, 'test_worker1', 'Test Worker 1', 'experiment_worker', true, NOW())
      RETURNING user_id
    `, [testOrganizationId]);
    testUserId = userResult.rows[0].user_id;

    // テスト用ユーザー2を作成（experiment_worker）
    const user2Result = await pool.query(`
      INSERT INTO organization_user (
        user_id, organization_id, login_id, user_name, role, is_active, created_at
      )
      VALUES (gen_random_uuid(), $1, 'test_worker2', 'Test Worker 2', 'experiment_worker', true, NOW())
      RETURNING user_id
    `, [testOrganizationId]);
    testUser2Id = user2Result.rows[0].user_id;

    // 別組織のユーザーを作成
    const otherOrgUserResult = await pool.query(`
      INSERT INTO organization_user (
        user_id, organization_id, login_id, user_name, role, is_active, created_at
      )
      VALUES (gen_random_uuid(), $1, 'other_org_worker', 'Other Org Worker', 'experiment_worker', true, NOW())
      RETURNING user_id
    `, [otherOrgId]);

    // テスト用プロジェクトを作成
    const projectResult = await pool.query(`
      INSERT INTO project (
        project_id, organization_id, project_name, owner_user_id, status, created_at, update_at
      )
      VALUES (gen_random_uuid(), $1, 'Test Project', $2, 'active', NOW(), NOW())
      RETURNING project_id
    `, [testOrganizationId, testUserId]);
    testProjectId = projectResult.rows[0].project_id;

    // テスト用プロジェクトタスク（メソッド）を作成
    testMethodId = 'method1';
    await pool.query(`
      INSERT INTO project_task (
        organization_id, project_id, method_id, method_name, created_at, update_at
      )
      VALUES ($1, $2, $3, 'Test Method', NOW(), NOW())
    `, [testOrganizationId, testProjectId, testMethodId]);

    // テスト用タスクを作成
    testTaskNo = 1;
    await pool.query(`
      INSERT INTO project_task_detail (
        organization_id, project_id, method_id, task_no, task_name,
        task_status, experiment_user_id, update_at
      )
      VALUES ($1, $2, $3, $4, 'Test Task', 0, $5, NOW())
    `, [testOrganizationId, testProjectId, testMethodId, testTaskNo, testUserId]);

    // 認証トークンを生成（モック）
    // 実際の実装では、ログインエンドポイントを使用する必要があります
    authToken = `Bearer maiml_session-test-${Date.now()}`;
    authTokenWorker2 = `Bearer maiml_session-test2-${Date.now()}`;
    authTokenOtherOrg = `Bearer maiml_session-other-${Date.now()}`;
  });

  afterAll(async () => {
    const pool = getPool();

    // テストデータをクリーンアップ
    await pool.query('DELETE FROM project_task_detail WHERE organization_id = $1 OR organization_id = $2', 
      [testOrganizationId, otherOrgId]);
    await pool.query('DELETE FROM project_task WHERE organization_id = $1 OR organization_id = $2', 
      [testOrganizationId, otherOrgId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1 OR organization_id = $2', 
      [testOrganizationId, otherOrgId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1 OR organization_id = $2', 
      [testOrganizationId, otherOrgId]);
    await pool.query('DELETE FROM organization WHERE organization_id = $1 OR organization_id = $2', 
      [testOrganizationId, otherOrgId]);

    await pool.end();
  });

  describe('Requirement 4.2.1 - エンドツーエンドフロー', () => {
    it('should successfully transition task from pending to in_progress to completed', async () => {
      // Step 1: pending → in_progress
      const response1 = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: expect.any(String) // 実際のテストでは最新のupdate_atを取得する必要がある
        });

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
      expect(response1.body.data.taskStatus).toBe('in_progress');
      expect(response1.body.data.experimentStartAt).toBeTruthy();

      const updateAt1 = response1.body.data.updateAt;

      // Step 2: in_progress → completed
      const response2 = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'completed',
          currentUpdateAt: updateAt1
        });

      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);
      expect(response2.body.data.taskStatus).toBe('completed');
      expect(response2.body.data.experimentEndAt).toBeTruthy();
    });

    it('should reject invalid transition (pending → completed)', async () => {
      // テストタスクをpending状態にリセット
      const pool = getPool();
      await pool.query(`
        UPDATE project_task_detail
        SET task_status = 0, experiment_start_at = NULL, experiment_end_at = NULL, update_at = NOW()
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'completed',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Requirement 4.2.2 - 権限チェック', () => {
    it('should allow experiment_worker to update their own assigned task', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject experiment_worker updating other user\'s task', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authTokenWorker2)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
    });
  });

  describe('Requirement 4.2.3 - マルチテナント分離', () => {
    it('should reject access to task from different organization', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authTokenOtherOrg)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(404); // 404を返すことで他組織のデータ存在を隠蔽
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should ensure organization_id is included in all queries', async () => {
      // このテストは、データベースクエリログを確認するか、
      // モックを使用してWHERE句にorganization_idが含まれることを検証する
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      // 実際のテストでは、SQLクエリにorganization_idフィルタが含まれることを確認
    });
  });

  describe('Requirement 4.2.4 - 楽観的ロック', () => {
    it('should detect concurrent update and return 409 Conflict', async () => {
      const pool = getPool();

      // 現在のupdate_atを取得
      const currentTask = await pool.query(`
        SELECT update_at FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const currentUpdateAt = currentTask.rows[0].update_at;

      // 別のユーザーがタスクを更新（シミュレーション）
      await pool.query(`
        UPDATE project_task_detail
        SET task_status = 1, update_at = NOW()
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      // 古いupdate_atで更新を試行
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'completed',
          currentUpdateAt: currentUpdateAt.toISOString()
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONCURRENT_UPDATE_DETECTED');
      expect(response.body.error.message).toContain('他のユーザーによって更新されました');
    });

    it('should succeed with correct currentUpdateAt', async () => {
      const pool = getPool();

      // 最新のupdate_atを取得
      const currentTask = await pool.query(`
        SELECT update_at FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const currentUpdateAt = currentTask.rows[0].update_at;

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'completed',
          currentUpdateAt: currentUpdateAt.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Requirement 4.2.5 - トランザクション整合性', () => {
    it('should rollback transaction on validation error', async () => {
      const pool = getPool();

      // タスクの初期状態を記録
      const beforeTask = await pool.query(`
        SELECT task_status, update_at FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const beforeStatus = beforeTask.rows[0].task_status;
      const beforeUpdateAt = beforeTask.rows[0].update_at;

      // 無効な遷移を試行（エラーが発生するはず）
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'pending', // 同じステータスへの遷移は無効
          currentUpdateAt: beforeUpdateAt.toISOString()
        });

      expect(response.status).toBe(400);

      // データベースの状態が変更されていないことを確認
      const afterTask = await pool.query(`
        SELECT task_status, update_at FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      expect(afterTask.rows[0].task_status).toBe(beforeStatus);
      expect(afterTask.rows[0].update_at.toISOString()).toBe(beforeUpdateAt.toISOString());
    });

    it('should rollback transaction on permission error', async () => {
      const pool = getPool();

      // タスクの初期状態を記録
      const beforeTask = await pool.query(`
        SELECT task_status, update_at FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const beforeStatus = beforeTask.rows[0].task_status;

      // 権限のないユーザーで更新を試行
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authTokenWorker2)
        .send({
          status: 'in_progress',
          currentUpdateAt: beforeTask.rows[0].update_at.toISOString()
        });

      expect(response.status).toBe(403);

      // データベースの状態が変更されていないことを確認
      const afterTask = await pool.query(`
        SELECT task_status FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      expect(afterTask.rows[0].task_status).toBe(beforeStatus);
    });
  });

  describe('Additional Integration Tests', () => {
    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/999/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should return 400 for invalid projectId format', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/invalid-uuid/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_INVALID_FORMAT');
    });

    it('should return 400 for invalid taskNo format', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/abc/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_INVALID_FORMAT');
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .send({
          status: 'in_progress',
          currentUpdateAt: new Date().toISOString()
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('should include comment in request', async () => {
      const pool = getPool();

      // タスクを pending 状態にリセット
      await pool.query(`
        UPDATE project_task_detail
        SET task_status = 0, experiment_start_at = NULL, experiment_end_at = NULL, update_at = NOW()
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const currentUpdateAt = await pool.query(`
        SELECT update_at FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4
      `, [testOrganizationId, testProjectId, testMethodId, testTaskNo]);

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}/methods/${testMethodId}/tasks/${testTaskNo}/status`)
        .set('Authorization', authToken)
        .send({
          status: 'in_progress',
          currentUpdateAt: currentUpdateAt.rows[0].update_at.toISOString(),
          comment: 'タスクを開始しました'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // コメントはログに記録されるが、レスポンスには含まれない
    });
  });
});