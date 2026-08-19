/**
 * Worker Instructions API - Integration Tests
 * 
 * Task 4.2: 統合テストの実装
 * - 認証ミドルウェアとの統合テスト
 * - 実験作業者が自分の指示のみ取得できることの検証
 * - 実験管理者・システム管理者が全指示を取得できることの検証
 * - フィルタリング条件の動作確認
 * - マルチテナント分離の検証
 * - レスポンス形式とデータ構造の検証
 * - パフォーマンステスト
 * 
 * Requirements: REQ-1, REQ-2, REQ-3, REQ-4, REQ-6, REQ-7
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import projectRoutes from '../../src/routes/projectRoutes';
import { getPool } from '../../src/database/db';

const app = express();
app.use(express.json());
app.use('/api/v1/projects', projectRoutes);

describe('Worker Instructions API - Integration Tests', () => {
  let pool: any;
  let testOrganizationId: string;
  let testProjectId: string;
  let testProjectName: string;
  let testWorkerId: string;
  let testAdminId: string;
  let testInstructionId1: string;
  let testInstructionId2: string;
  let workerToken: string;
  let adminToken: string;
  let otherOrgId: string;

  beforeAll(async () => {
    pool = getPool();
    
    // テストデータのセットアップ
    testOrganizationId = uuidv4();
    testProjectId = uuidv4();
    testProjectName = 'test_project_integration';
    testWorkerId = uuidv4();
    testAdminId = uuidv4();
    testInstructionId1 = uuidv4();
    testInstructionId2 = uuidv4();
    otherOrgId = uuidv4();

    // 組織データ作成
    await pool.query(
      `INSERT INTO organization (organization_id, organization_name, organization_prefix) 
       VALUES ($1, $2, $3)`,
      [testOrganizationId, 'Test Org', 'test_org']
    );

    await pool.query(
      `INSERT INTO organization (organization_id, organization_name, organization_prefix) 
       VALUES ($1, $2, $3)`,
      [otherOrgId, 'Other Org', 'other_org']
    );

    // ユーザー作成
    await pool.query(
      `INSERT INTO organization_user (user_id, organization_id, user_name, mail_address) 
       VALUES ($1, $2, $3, $4)`,
      [testWorkerId, testOrganizationId, 'Test Worker', 'worker@test.com']
    );

    await pool.query(
      `INSERT INTO organization_user (user_id, organization_id, user_name, mail_address) 
       VALUES ($1, $2, $3, $4)`,
      [testAdminId, testOrganizationId, 'Test Admin', 'admin@test.com']
    );

    // ユーザー認証情報作成
    await pool.query(
      `INSERT INTO user_authentication (user_id, organization_id, login_id, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5)`,
      [testWorkerId, testOrganizationId, 'worker', 'hash', 'experiment_worker']
    );

    await pool.query(
      `INSERT INTO user_authentication (user_id, organization_id, login_id, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5)`,
      [testAdminId, testOrganizationId, 'admin', 'hash', 'experiment_admin']
    );

    // プロジェクト作成
    await pool.query(
      `INSERT INTO project (project_id, organization_id, project_name, project_status, checkout_status, create_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [testProjectId, testOrganizationId, testProjectName, 1, 0]
    );

    // プロジェクトタスク作成（Workerに割り当て）
    await pool.query(
      `INSERT INTO project_task (task_id, organization_id, project_id, assign_user_id, method_id, task_no) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), testOrganizationId, testProjectId, testWorkerId, 'method1', 1]
    );

    // 指示作成（Workerに割り当てられたタスクに紐づく）
    await pool.query(
      `INSERT INTO project_instruction (organization_id, project_id, experiment_instruction_id, method_id, transition_id, task_no, instructions, create_user_id, create_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        testOrganizationId,
        testProjectId,
        testInstructionId1,
        'method1',
        'transition1',
        1,
        'Test instruction for worker',
        testAdminId,
      ]
    );

    // 指示作成（Workerに割り当てられていないタスク）
    await pool.query(
      `INSERT INTO project_instruction (organization_id, project_id, experiment_instruction_id, method_id, transition_id, task_no, instructions, create_user_id, create_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        testOrganizationId,
        testProjectId,
        testInstructionId2,
        'method2',
        'transition2',
        2,
        'Test instruction not assigned to worker',
        testAdminId,
      ]
    );

    // JWTトークン生成（モック）
    const jwt = require('jsonwebtoken');
    workerToken = jwt.sign(
      {
        userId: testWorkerId,
        organizationId: testOrganizationId,
        role: 'experiment_worker',
        sessionId: 'session1',
      },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      {
        userId: testAdminId,
        organizationId: testOrganizationId,
        role: 'experiment_admin',
        sessionId: 'session2',
      },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await pool.query('DELETE FROM instruction_acknowledged_history WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM project_instruction WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM project_task WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM user_authentication WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM organization WHERE organization_id IN ($1, $2)', [testOrganizationId, otherOrgId]);
  });

  describe('1. 認証ミドルウェアとの統合', () => {
    test('認証トークンなしでアクセスすると401エラーを返す', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    test('無効なトークンでアクセスすると401エラーを返す', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('有効なトークンでアクセスすると200を返す', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('2. ロールベースアクセス制御', () => {
    test('実験作業者は自分に割り当てられた指示のみ取得できる', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1); // 1つの指示のみ
      expect(response.body.data[0].id).toBe(testInstructionId1);
      expect(response.body.data[0].task_no).toBe(1);
    });

    test('実験管理者は全ての指示を取得できる', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2); // 全ての指示
    });
  });

  describe('3. フィルタリング機能', () => {
    test('projectIdでフィルタリングできる', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .query({ projectId: testProjectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((item: any) => item.project_id === testProjectId)).toBe(true);
    });

    test('存在しないprojectIdでフィルタリングすると空配列を返す', async () => {
      const nonExistentProjectId = uuidv4();
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .query({ projectId: nonExistentProjectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('4. マルチテナント分離', () => {
    test('異なる組織のユーザーはデータにアクセスできない', async () => {
      const otherOrgUserId = uuidv4();
      
      // 他組織のユーザー作成
      await pool.query(
        `INSERT INTO organization_user (user_id, organization_id, user_name, mail_address) 
         VALUES ($1, $2, $3, $4)`,
        [otherOrgUserId, otherOrgId, 'Other User', 'other@test.com']
      );

      await pool.query(
        `INSERT INTO user_authentication (user_id, organization_id, login_id, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        [otherOrgUserId, otherOrgId, 'other', 'hash', 'experiment_admin']
      );

      const jwt = require('jsonwebtoken');
      const otherOrgToken = jwt.sign(
        {
          userId: otherOrgUserId,
          organizationId: otherOrgId,
          role: 'experiment_admin',
          sessionId: 'session3',
        },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');

      // クリーンアップ
      await pool.query('DELETE FROM user_authentication WHERE user_id = $1', [otherOrgUserId]);
      await pool.query('DELETE FROM organization_user WHERE user_id = $1', [otherOrgUserId]);
    });
  });

  describe('5. レスポンス形式とデータ構造', () => {
    test('成功レスポンスが統一された形式である', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // レスポンス形式の検証
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.success).toBe(true);
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    test('指示データが必要なフィールドを全て含む', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      
      const instruction = response.body.data[0];
      
      // 必須フィールドの検証
      expect(instruction).toHaveProperty('id');
      expect(instruction).toHaveProperty('project_id');
      expect(instruction).toHaveProperty('project_name');
      expect(instruction).toHaveProperty('method_id');
      expect(instruction).toHaveProperty('method_name');
      expect(instruction).toHaveProperty('transition_id');
      expect(instruction).toHaveProperty('transition_name');
      expect(instruction).toHaveProperty('task_no');
      expect(instruction).toHaveProperty('instruction_content');
      expect(instruction).toHaveProperty('create_at');
      expect(instruction).toHaveProperty('created_by');
      expect(instruction).toHaveProperty('created_by_name');
      expect(instruction).toHaveProperty('is_acknowledged');
    });

    test('日時データがISO8601形式である', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const instruction = response.body.data[0];
      
      // ISO8601形式の検証
      expect(instruction.create_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    test('エラーレスポンスが統一された形式である', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/nonexistent_project/worker-instructions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('6. エラーハンドリング', () => {
    test('不正なprojectNameでアクセスすると400エラーを返す', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid!project/worker-instructions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('projectNameが空の場合は400エラーを返す', async () => {
      const response = await request(app)
        .get('/api/v1/projects/ /worker-instructions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('7. パフォーマンステスト', () => {
    test('100件の指示を5秒以内に取得できる', async () => {
      // 100件の指示を作成
      const instructionIds: string[] = [];
      const insertPromises: Promise<any>[] = [];

      for (let i = 0; i < 100; i++) {
        const instructionId = uuidv4();
        instructionIds.push(instructionId);
        
        insertPromises.push(
          pool.query(
            `INSERT INTO project_instruction (organization_id, project_id, experiment_instruction_id, method_id, transition_id, task_no, instructions, create_user_id, create_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              testOrganizationId,
              testProjectId,
              instructionId,
              `method${i}`,
              `transition${i}`,
              i + 3,
              `Performance test instruction ${i}`,
              testAdminId,
            ]
          )
        );
      }

      await Promise.all(insertPromises);

      // パフォーマンステスト実行
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/worker-instructions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 5秒以内（5000ms）であることを検証
      expect(duration).toBeLessThan(5000);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(100);

      // クリーンアップ
      await pool.query(
        'DELETE FROM project_instruction WHERE id = ANY($1::uuid[])',
        [instructionIds]
      );
    }, 10000); // テストタイムアウトを10秒に設定
  });
});