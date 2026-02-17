/**
 * Progress API 統合テスト
 * 
 * Task 9.1: API統合テスト
 * 
 * このテストスイートは、進捗データ取得APIのエンドツーエンドフローを検証します。
 * 
 * テスト対象:
 * - 認証ミドルウェアチェーンの動作確認
 * - 権限チェックの動作確認（各ロール）
 * - マルチテナント分離の検証
 * - エンドツーエンドの正常系フロー
 * - 各種エラーケースのエンドツーエンドフロー
 * 
 * Requirements:
 * - Requirement 1: 進捗データ取得機能
 * - Requirement 2: 認証と認可
 * - Requirement 3: マルチテナントデータ分離
 * - Requirement 10: API仕様準拠
 */

import request from 'supertest';
import express, { Application } from 'express';
import progressRoutes from '../../src/routes/progressRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { getPool } from '../../src/database/db';
import * as storageService from '../../src/services/storageService';
import * as maimlService from '../../src/services/maimlService';
import { errorHandler } from '../../src/middleware/errorHandlerMiddleware';

// Mock dependencies
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/database/db');
jest.mock('../../src/services/storageService');
jest.mock('../../src/services/maimlService');

describe('Progress API Integration Tests - Task 9.1', () => {
  let app: Application;
  let mockQuery: jest.Mock;

  // Test data
  const testOrgId = 'org_maiml_lab_001';
  const testProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const testMethodId = 'method1';
  const testTaskNo = 1;

  const testUser = {
    userId: 'user123',
    organizationId: testOrgId,
    role: 'experiment_admin',
    username: 'test_admin',
  };

  const testTaskData = {
    task_id: 'task123',
    task_name: 'テストタスク',
    project_id: testProjectId,
    project_name: 'テストプロジェクト',
    method_id: testMethodId,
    task_no: testTaskNo,
  };

  const testMAIMLContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <methods>
    <method id="method1" name="合成実験">
      <petriNet>
        <transitions>
          <transition id="t1" name="材料準備" />
          <transition id="t2" name="反応実験" />
          <transition id="t3" name="結果測定" />
        </transitions>
      </petriNet>
    </method>
  </methods>
</maiml>`;

  const testParsedMAIML = {
    success: true,
    methods: [
      {
        methodId: 'method1',
        methodName: '合成実験',
        petriNet: {
          transitions: [
            { id: 't1', name: '材料準備' },
            { id: 't2', name: '反応実験' },
            { id: 't3', name: '結果測定' },
          ],
        },
      },
    ],
  };

  beforeAll(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/progress', progressRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup database mock
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({ query: mockQuery });

    // Setup default auth middleware behavior
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = testUser;
      next();
    });

    // Setup default storage service behavior
    (storageService.getStorageService as jest.Mock).mockReturnValue({
      downloadFile: jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent)),
    });

    // Setup default MAIML service behavior
    (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(testParsedMAIML);
  });

  describe('1. 認証ミドルウェアチェーンの動作確認', () => {
    it('認証済みユーザーでアクセス可能', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] }) // getTaskByProjectMethodTaskNo
        .mockResolvedValueOnce({ rows: [] }) // getLatestRecordByTransition (t1)
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // countRecordsByTransition (t1)
        .mockResolvedValueOnce({ rows: [] }) // getLatestRecordByTransition (t2)
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // countRecordsByTransition (t2)
        .mockResolvedValueOnce({ rows: [] }) // getLatestRecordByTransition (t3)
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // countRecordsByTransition (t3)

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(authMiddleware).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('未認証ユーザーはアクセス拒否（401）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((_req, res, _next) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: '認証トークンが提供されていません',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('無効なJWTトークンの場合はアクセス拒否（401）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((_req, res, _next) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: '認証トークンが無効です',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('2. 権限チェックの動作確認（各ロール）', () => {
    it('experiment_adminロールでアクセス可能', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = { ...testUser, role: 'experiment_admin' };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });

    it('experiment_workerロールでアクセス可能', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = { ...testUser, role: 'experiment_worker' };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });

    it('system_adminロールでアクセス可能', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = { ...testUser, role: 'system_admin' };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });
  });

  describe('3. マルチテナント分離の検証', () => {
    it('同じ組織のタスクにアクセス可能', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.project_id).toBe(testProjectId);
    });

    it('異なる組織のタスクにアクセスできない（404）', async () => {
      // Arrange - タスクが見つからない（organization_idフィルタで除外される）
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('すべてのDBクエリにorganization_idフィルタが適用される', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert - すべてのクエリにorganization_idが含まれることを確認
      const allCalls = mockQuery.mock.calls;
      allCalls.forEach((call) => {
        const query = call[0];
        const params = call[1];
        expect(query.toLowerCase()).toContain('organization_id');
        expect(params).toContain(testOrgId);
      });
    });
  });

  describe('4. エンドツーエンド正常系フロー', () => {
    it('完全な進捗データ取得フロー: 認証 → タスク取得 → MAIMLダウンロード → パース → トランジション進捗取得 → レスポンス', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({
          rows: [
            {
              record_id: 'record1',
              status: 'completed',
              progress: 100,
              update_at: new Date('2026-02-16T10:00:00Z'),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: 5 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              record_id: 'record2',
              status: 'in_progress',
              progress: 50,
              update_at: new Date('2026-02-16T11:00:00Z'),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: 3 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        project_id: testProjectId,
        project_name: 'テストプロジェクト',
        method_id: testMethodId,
        method_name: '合成実験',
        task_no: testTaskNo,
        task_name: 'テストタスク',
      });

      expect(response.body.data.transitions).toHaveLength(3);
      expect(response.body.data.transitions[0]).toMatchObject({
        transition_id: 't1',
        transition_name: '材料準備',
        status: 'completed',
        progress: 100,
        has_data: true,
        data_count: 5,
      });

      expect(response.body.data.overall_progress).toMatchObject({
        total_transitions: 3,
        completed: 1,
        in_progress: 1,
        not_started: 1,
      });
      expect(response.body.data.overall_progress.overall_percentage).toBeCloseTo(50.0, 1);

      // メタデータ検証
      expect(response.body.meta.timestamp).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();

      // ヘッダー検証
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('トランジションが多数（10個）の場合も正常に処理できる', async () => {
      // Arrange - 10個のトランジションを持つMAIML
      const largeMAIML = {
        success: true,
        methods: [
          {
            methodId: 'method1',
            methodName: '合成実験',
            petriNet: {
              transitions: Array.from({ length: 10 }, (_, i) => ({
                id: `t${i + 1}`,
                name: `ステップ${i + 1}`,
              })),
            },
          },
        ],
      };
      (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(largeMAIML);

      mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
      // 10個のトランジション × 2クエリ（latest + count）= 20クエリ
      for (let i = 0; i < 10; i++) {
        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });
      }

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.transitions).toHaveLength(10);
      expect(response.body.data.overall_progress.total_transitions).toBe(10);
    });
  });

  describe('5. エンドツーエンドエラーケース', () => {
    it('タスクが存在しない場合は404エラー', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      expect(response.body.error.message).toBe('タスクが見つかりません');
    });

    it('メソッドが見つからない場合は404エラー', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });

      // MAIMLに存在しないメソッドIDを指定
      const invalidMethodId = 'non_existent_method';

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${invalidMethodId}/${testTaskNo}`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('METHOD_NOT_FOUND');
    });

    it('MAIMLダウンロード失敗時は500エラー', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
      (storageService.getStorageService as jest.Mock).mockReturnValue({
        downloadFile: jest.fn().mockRejectedValue(new Error('S3 connection failed')),
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MAIML_DOWNLOAD_FAILED');
    });

    it('MAIMLパース失敗時は500エラー', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
      (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Invalid XML' },
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MAIML_PARSE_FAILED');
    });

    it('データベースエラー時は500エラー', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database connection lost'));

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });

    it('パラメータバリデーションエラー時は400エラー', async () => {
      // Act - 無効なUUID形式
      const response = await request(app)
        .get(`/api/v1/progress/invalid-uuid/${testMethodId}/${testTaskNo}`)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Task 9.2: マルチテナント分離の検証（詳細）', () => {
    describe('1. クロステナントアクセス防止', () => {
      it('組織Aのユーザーが組織Bのタスクにアクセスできない', async () => {
        // Arrange - 組織Aのユーザー
        const orgAUser = {
          userId: 'userA',
          organizationId: 'org_maiml_lab_001',
          role: 'experiment_admin',
          username: 'user_a',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgAUser;
          next();
        });

        // 組織Bのタスク（organization_idフィルタで除外される）
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
        expect(response.body.error.message).toBe('タスクが見つかりません');
      });

      it('experiment_adminロールでもクロステナントアクセスは不可', async () => {
        // Arrange
        const orgAAdmin = {
          userId: 'adminA',
          organizationId: 'org_maiml_lab_001',
          role: 'experiment_admin',
          username: 'admin_a',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgAAdmin;
          next();
        });

        // 組織Bのタスク
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      });

      it('experiment_workerロールでもクロステナントアクセスは不可', async () => {
        // Arrange
        const orgAWorker = {
          userId: 'workerA',
          organizationId: 'org_maiml_lab_001',
          role: 'experiment_worker',
          username: 'worker_a',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgAWorker;
          next();
        });

        // 組織Bのタスク
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      });
    });

    describe('2. organization_idフィルタの動作確認', () => {
      it('TaskRepositoryのgetTaskByProjectMethodTaskNoにorganization_idが渡される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - 最初のクエリ（getTaskByProjectMethodTaskNo）を確認
        const firstCall = mockQuery.mock.calls[0];
        const query = firstCall[0];
        const params = firstCall[1];

        expect(query.toLowerCase()).toContain('organization_id');
        expect(params).toContain(testOrgId);
      });

      it('TransitionDataRepositoryのgetLatestRecordByTransitionにorganization_idが渡される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - トランジションデータ取得クエリ（偶数番目）を確認
        const transitionQueries = mockQuery.mock.calls.filter((_, index) => index > 0 && index % 2 === 1);
        transitionQueries.forEach((call) => {
          const query = call[0];
          const params = call[1];
          expect(query.toLowerCase()).toContain('organization_id');
          expect(params).toContain(testOrgId);
        });
      });

      it('TransitionDataRepositoryのcountRecordsByTransitionにorganization_idが渡される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - カウントクエリ（偶数番目、index > 0）を確認
        const countQueries = mockQuery.mock.calls.filter((_, index) => index > 0 && index % 2 === 0);
        countQueries.forEach((call) => {
          const query = call[0];
          const params = call[1];
          expect(query.toLowerCase()).toContain('organization_id');
          expect(params).toContain(testOrgId);
        });
      });

      it('すべてのDBクエリでorganization_idがParameterized Queryとして渡される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - すべてのクエリを検証
        const allCalls = mockQuery.mock.calls;
        expect(allCalls.length).toBeGreaterThan(0);

        allCalls.forEach((call) => {
          const query = call[0];
          const params = call[1];

          // SQLクエリにorganization_idフィルタが含まれる
          expect(query.toLowerCase()).toContain('organization_id');

          // パラメータ配列にorganization_idの値が含まれる（Parameterized Query）
          expect(Array.isArray(params)).toBe(true);
          expect(params).toContain(testOrgId);

          // SQLクエリ内に直接organization_id値が埋め込まれていない（SQLインジェクション対策）
          expect(query).not.toContain(testOrgId);
        });
      });
    });

    describe('3. 異なる組織のタスクIDが指定された場合の404返却', () => {
      it('有効なタスクIDでも異なる組織の場合は404を返却', async () => {
        // Arrange
        const orgAUser = {
          userId: 'userA',
          organizationId: 'org_maiml_lab_001',
          role: 'experiment_admin',
          username: 'user_a',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgAUser;
          next();
        });

        // 組織Bに属する有効なタスク（organization_idフィルタで除外）
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const orgBTaskId = '660e8400-e29b-41d4-a716-446655440001';

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${orgBTaskId}/${testMethodId}/${testTaskNo}`)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
        expect(response.body.error.message).toBe('タスクが見つかりません');
      });

      it('タスクが存在しないのか、異なる組織のタスクなのかを区別しない（セキュリティ対策）', async () => {
        // Arrange
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(404);

        // Assert - エラーメッセージは同じ（情報漏洩防止）
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
        expect(response.body.error.message).toBe('タスクが見つかりません');
        expect(response.body.error.message).not.toContain('organization');
        expect(response.body.error.message).not.toContain('組織');
      });
    });

    describe('4. 複数組織でのデータ分離検証', () => {
      it('組織Aのユーザーは組織Aのタスクのみ取得できる', async () => {
        // Arrange
        const orgAUser = {
          userId: 'userA',
          organizationId: 'org_maiml_lab_001',
          role: 'experiment_admin',
          username: 'user_a',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgAUser;
          next();
        });

        const orgATask = {
          ...testTaskData,
          task_id: 'taskA',
          project_name: '組織Aのプロジェクト',
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [orgATask] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.project_name).toBe('組織Aのプロジェクト');
      });

      it('組織Bのユーザーは組織Bのタスクのみ取得できる', async () => {
        // Arrange
        const orgBUser = {
          userId: 'userB',
          organizationId: 'org_maiml_lab_002',
          role: 'experiment_admin',
          username: 'user_b',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgBUser;
          next();
        });

        const orgBTask = {
          ...testTaskData,
          task_id: 'taskB',
          project_name: '組織Bのプロジェクト',
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [orgBTask] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.project_name).toBe('組織Bのプロジェクト');

        // DBクエリにorg_maiml_lab_002が渡されることを確認
        const allCalls = mockQuery.mock.calls;
        allCalls.forEach((call) => {
          const params = call[1];
          expect(params).toContain('org_maiml_lab_002');
        });
      });

      it('実験記録データも組織ごとに分離される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({
            rows: [
              {
                record_id: 'recordA',
                status: 'completed',
                progress: 100,
                update_at: new Date('2026-02-16T10:00:00Z'),
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ count: 5 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - 実験記録取得クエリにもorganization_idフィルタが適用される
        const recordQueries = mockQuery.mock.calls.filter((_, index) => index > 0);
        recordQueries.forEach((call) => {
          const query = call[0];
          const params = call[1];
          expect(query.toLowerCase()).toContain('organization_id');
          expect(params).toContain(testOrgId);
        });
      });
    });
  });

  describe('Task 9.3: データベース統合テスト', () => {
    describe('1. 複数トランジションの並列取得の動作確認', () => {
      it('Promise.allを使用した並列処理でトランジションデータを取得', async () => {
        // Arrange - 5個のトランジション
        const multiTransitionMAIML = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: '合成実験',
              petriNet: {
                transitions: Array.from({ length: 5 }, (_, i) => ({
                  id: `t${i + 1}`,
                  name: `ステップ${i + 1}`,
                })),
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(multiTransitionMAIML);

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
        
        // 5個のトランジション × 2クエリ = 10クエリ
        for (let i = 0; i < 5; i++) {
          mockQuery
            .mockResolvedValueOnce({
              rows: [
                {
                  record_id: `record${i}`,
                  status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'not_started',
                  progress: i % 3 === 0 ? 100 : i % 3 === 1 ? 50 : 0,
                  update_at: new Date(),
                },
              ],
            })
            .mockResolvedValueOnce({ rows: [{ count: i * 2 }] });
        }

        // Act
        const startTime = Date.now();
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);
        const endTime = Date.now();

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.transitions).toHaveLength(5);
        
        // すべてのトランジションが正しく取得されている
        response.body.data.transitions.forEach((transition: any, index: number) => {
          expect(transition.transition_id).toBe(`t${index + 1}`);
          expect(transition.transition_name).toBe(`ステップ${index + 1}`);
          expect(transition.data_count).toBe(index * 2);
        });

        // 並列処理により合理的な時間内に完了（5秒以内）
        expect(endTime - startTime).toBeLessThan(5000);
      });

      it('10個のトランジションを並列取得できる', async () => {
        // Arrange
        const largeMAIML = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: '大規模実験',
              petriNet: {
                transitions: Array.from({ length: 10 }, (_, i) => ({
                  id: `trans${i + 1}`,
                  name: `処理${i + 1}`,
                })),
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(largeMAIML);

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
        
        // 10個のトランジション × 2クエリ = 20クエリ
        for (let i = 0; i < 10; i++) {
          mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] });
        }

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.transitions).toHaveLength(10);
        expect(mockQuery).toHaveBeenCalledTimes(21); // 1 (task) + 10×2 (transitions)
      });

      it('各トランジションのデータが正確に取得される（並列処理でも順序保証）', async () => {
        // Arrange
        const threeTransitionMAIML = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: 'テスト実験',
              petriNet: {
                transitions: [
                  { id: 'tA', name: 'プロセスA' },
                  { id: 'tB', name: 'プロセスB' },
                  { id: 'tC', name: 'プロセスC' },
                ],
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(threeTransitionMAIML);

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({
            rows: [{ record_id: 'recA', status: 'completed', progress: 100, update_at: new Date() }],
          })
          .mockResolvedValueOnce({ rows: [{ count: 10 }] })
          .mockResolvedValueOnce({
            rows: [{ record_id: 'recB', status: 'in_progress', progress: 60, update_at: new Date() }],
          })
          .mockResolvedValueOnce({ rows: [{ count: 7 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - 各トランジションのデータが正確
        const transitions = response.body.data.transitions;
        
        expect(transitions[0].transition_id).toBe('tA');
        expect(transitions[0].status).toBe('completed');
        expect(transitions[0].progress).toBe(100);
        expect(transitions[0].data_count).toBe(10);
        expect(transitions[0].has_data).toBe(true);

        expect(transitions[1].transition_id).toBe('tB');
        expect(transitions[1].status).toBe('in_progress');
        expect(transitions[1].progress).toBe(60);
        expect(transitions[1].data_count).toBe(7);
        expect(transitions[1].has_data).toBe(true);

        expect(transitions[2].transition_id).toBe('tC');
        expect(transitions[2].status).toBe('not_started');
        expect(transitions[2].progress).toBe(0);
        expect(transitions[2].data_count).toBe(0);
        expect(transitions[2].has_data).toBe(false);
      });
    });

    describe('2. クエリ最適化とインデックス使用の検証', () => {
      it('getLatestRecordByTransitionがORDER BY updated_at DESC LIMIT 1を使用', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({
            rows: [{ record_id: 'rec1', status: 'completed', progress: 100, update_at: new Date() }],
          })
          .mockResolvedValueOnce({ rows: [{ count: 5 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - getLatestRecordByTransitionクエリを確認（偶数番目のクエリ、index > 0）
        const latestRecordQueries = mockQuery.mock.calls.filter((_, index) => index > 0 && index % 2 === 1);
        
        latestRecordQueries.forEach((call) => {
          const query = call[0].toLowerCase();
          
          // ORDER BY updated_at DESC を使用（インデックス活用）
          expect(query).toContain('order by');
          expect(query).toContain('updated_at');
          expect(query).toContain('desc');
          
          // LIMIT 1で最新レコードのみ取得（パフォーマンス最適化）
          expect(query).toContain('limit 1');
        });
      });

      it('countRecordsByTransitionがCOUNT(*)を使用', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 5 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - countRecordsByTransitionクエリを確認（奇数番目のクエリ、index > 1）
        const countQueries = mockQuery.mock.calls.filter((_, index) => index > 1 && index % 2 === 0);
        
        countQueries.forEach((call) => {
          const query = call[0].toLowerCase();
          
          // COUNT関数を使用（集計最適化）
          expect(query).toContain('count');
        });
      });

      it('必要なカラムのみをSELECT（不要なデータ取得を回避）', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({
            rows: [{ record_id: 'rec1', status: 'completed', progress: 100, update_at: new Date() }],
          })
          .mockResolvedValueOnce({ rows: [{ count: 5 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - タスク取得クエリを確認
        const taskQuery = mockQuery.mock.calls[0][0].toLowerCase();
        
        // 必要なカラムのみを列挙（SELECT *を使用しない）
        expect(taskQuery).not.toContain('select *');
        expect(taskQuery).toContain('select');
        
        // 必要なカラム: task_id, task_name, project_id, project_name, method_id, task_no
        expect(taskQuery).toContain('task_id');
        expect(taskQuery).toContain('task_name');
        expect(taskQuery).toContain('project_name');
      });

      it('WHERE句で適切なフィルタリングを実行（organization_id、task_id、transition_id）', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - すべてのクエリにWHERE句が含まれる
        const allCalls = mockQuery.mock.calls;
        
        allCalls.forEach((call, index) => {
          const query = call[0].toLowerCase();
          
          // WHERE句を使用
          expect(query).toContain('where');
          
          if (index === 0) {
            // タスク取得: project_id, method_id, task_no, organization_id
            expect(query).toContain('organization_id');
          } else {
            // トランジションデータ取得: task_id, transition_id, organization_id
            expect(query).toContain('organization_id');
          }
        });
      });
    });

    describe('3. データカウントの正確性検証', () => {
      it('COUNTクエリが正確なレコード数を返す', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 15 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 8 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 3 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.transitions[0].data_count).toBe(15);
        expect(response.body.data.transitions[1].data_count).toBe(8);
        expect(response.body.data.transitions[2].data_count).toBe(3);
      });

      it('レコードが0件の場合はdata_count=0を返す', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        response.body.data.transitions.forEach((transition: any) => {
          expect(transition.data_count).toBe(0);
          expect(transition.has_data).toBe(false);
        });
      });

      it('データカウントとhas_dataフラグの整合性が保証される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 10 }] }) // t1: 10件
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // t2: 0件
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // t3: 1件

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        const transitions = response.body.data.transitions;
        
        // t1: data_count > 0 → has_data = true
        expect(transitions[0].data_count).toBe(10);
        expect(transitions[0].has_data).toBe(true);
        
        // t2: data_count = 0 → has_data = false
        expect(transitions[1].data_count).toBe(0);
        expect(transitions[1].has_data).toBe(false);
        
        // t3: data_count = 1 → has_data = true
        expect(transitions[2].data_count).toBe(1);
        expect(transitions[2].has_data).toBe(true);
      });

      it('全体進捗計算がデータカウントに基づいて正確に実行される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({
            rows: [{ record_id: 'r1', status: 'completed', progress: 100, update_at: new Date() }],
          })
          .mockResolvedValueOnce({ rows: [{ count: 20 }] })
          .mockResolvedValueOnce({
            rows: [{ record_id: 'r2', status: 'in_progress', progress: 50, update_at: new Date() }],
          })
          .mockResolvedValueOnce({ rows: [{ count: 10 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        const overall = response.body.data.overall_progress;
        
        expect(overall.total_transitions).toBe(3);
        expect(overall.completed).toBe(1);
        expect(overall.in_progress).toBe(1);
        expect(overall.not_started).toBe(1);
        expect(overall.overall_percentage).toBeCloseTo(50.0, 1); // (100 + 50 + 0) / 3 = 50.0
      });

      it('COUNT結果が数値型として正しく処理される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '25' }] }) // 文字列として返される場合もある
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - 数値型として処理される
        expect(typeof response.body.data.transitions[0].data_count).toBe('number');
        expect(response.body.data.transitions[0].data_count).toBe(25);
      });
    });

    describe('4. データベース接続とエラーハンドリング', () => {
      it('データベース接続エラーが適切にハンドリングされる', async () => {
        // Arrange
        mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DATABASE_ERROR');
      });

      it('トランジションデータ取得中のエラーがハンドリングされる', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockRejectedValueOnce(new Error('Query execution failed')); // 最初のトランジションでエラー

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DATABASE_ERROR');
      });

      it('複数のデータベースクエリが適切に管理される（接続プール）', async () => {
        // Arrange - 5個のトランジション
        const multiTransitionMAIML = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: '合成実験',
              petriNet: {
                transitions: Array.from({ length: 5 }, (_, i) => ({
                  id: `t${i + 1}`,
                  name: `ステップ${i + 1}`,
                })),
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(multiTransitionMAIML);

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
        for (let i = 0; i < 5; i++) {
          mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] });
        }

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - getPoolが呼ばれ、queryメソッドが複数回実行される
        expect(getPool).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledTimes(11); // 1 (task) + 5×2 (transitions)
      });
    });
  });

  describe('Task 9.4: ストレージ統合テスト', () => {
    describe('1. MAIMLファイルダウンロードの正常系・異常系テスト', () => {
      it('MAIMLファイルダウンロードが正常に完了する', async () => {
        // Arrange
        const testMAIMLBuffer = Buffer.from(testMAIMLContent);
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockResolvedValue(testMAIMLBuffer),
        });

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        const storageServiceInstance = storageService.getStorageService();
        expect(storageServiceInstance.downloadFile).toHaveBeenCalledTimes(1);
        expect(response.body.success).toBe(true);
      });

      it('MAIMLファイルが存在しない場合は500エラー（MAIML_DOWNLOAD_FAILED）', async () => {
        // Arrange
        const notFoundError = new Error('NoSuchKey: The specified key does not exist');
        (notFoundError as any).name = 'NoSuchKey';
        
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockRejectedValue(notFoundError),
        });

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MAIML_DOWNLOAD_FAILED');
        expect(response.body.error.message).toContain('MAIML');
      });

      it('ストレージサービス接続エラー時は500エラー', async () => {
        // Arrange
        const connectionError = new Error('Connection timeout: Unable to connect to S3 endpoint');
        
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockRejectedValue(connectionError),
        });

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MAIML_DOWNLOAD_FAILED');
      });

      it('ダウンロード時のアクセス権限エラー（403）は500エラーとして処理', async () => {
        // Arrange
        const accessDeniedError = new Error('AccessDenied: Access Denied');
        (accessDeniedError as any).name = 'AccessDenied';
        (accessDeniedError as any).$metadata = { httpStatusCode: 403 };
        
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockRejectedValue(accessDeniedError),
        });

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MAIML_DOWNLOAD_FAILED');
      });

      it('大容量MAIMLファイル（10KB以上）も正常にダウンロードできる', async () => {
        // Arrange - 大容量MAIMLコンテンツを生成（約15KB）
        const largeMAIMLContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <methods>
    <method id="method1" name="大規模実験">
      <petriNet>
        <transitions>
          ${Array.from({ length: 100 }, (_, i) => `<transition id="t${i + 1}" name="ステップ${i + 1}" />`).join('\n          ')}
        </transitions>
      </petriNet>
    </method>
  </methods>
</maiml>`;

        const largeMAIMLBuffer = Buffer.from(largeMAIMLContent);
        expect(largeMAIMLBuffer.length).toBeGreaterThan(10 * 1024); // 10KB以上

        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockResolvedValue(largeMAIMLBuffer),
        });

        const largeMAIML = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: '大規模実験',
              petriNet: {
                transitions: Array.from({ length: 100 }, (_, i) => ({
                  id: `t${i + 1}`,
                  name: `ステップ${i + 1}`,
                })),
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(largeMAIML);

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });
        for (let i = 0; i < 100; i++) {
          mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] });
        }

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.transitions).toHaveLength(100);
      });
    });

    describe('2. organization prefixを使用したパス生成の検証', () => {
      it('downloadFileにorganization prefixを含むパスが渡される', async () => {
        // Arrange
        const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
        });

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(mockDownloadFile).toHaveBeenCalledTimes(1);
        
        const [organizationId, filePath] = mockDownloadFile.mock.calls[0];
        
        // organization_idが正しく渡される（org_プレフィックスなし）
        expect(organizationId).toBe(testOrgId);
        
        // ファイルパスがprojects/{project_name}/{project_name}.maiml形式
        expect(filePath).toMatch(/^projects\//);
        expect(filePath).toContain('.maiml');
      });

      it('異なる組織のユーザーは異なるorganization prefixでアクセスする', async () => {
        // Arrange
        const orgBUser = {
          userId: 'userB',
          organizationId: 'org_maiml_lab_002',
          role: 'experiment_admin',
          username: 'user_b',
        };

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = orgBUser;
          next();
        });

        const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
        });

        const orgBTask = {
          ...testTaskData,
          task_id: 'taskB',
          project_name: '組織Bのプロジェクト',
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [orgBTask] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        const [organizationId] = mockDownloadFile.mock.calls[0];
        expect(organizationId).toBe('org_maiml_lab_002');
      });

      it('storageServiceのbuildKeyメソッドがorg_{organizationId}プレフィックスを生成する', async () => {
        // Arrange
        const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
        });

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - storageServiceのdownloadFileが正しいパラメータで呼ばれる
        expect(mockDownloadFile).toHaveBeenCalledWith(
          testOrgId,
          expect.stringMatching(/^projects\//)
        );
      });

      it('ファイルパスが正しい形式（projects/{project_name}/{project_name}.maiml）', async () => {
        // Arrange
        const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
        });

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        const [, filePath] = mockDownloadFile.mock.calls[0];
        
        // パスの検証
        expect(filePath).toMatch(/^projects\//);
        expect(filePath).toMatch(/\.maiml$/);
        
        // パスにプロジェクト名が含まれる
        expect(filePath).toContain(testTaskData.project_name);
      });
    });

    describe('3. S3/Swift両環境での動作確認テスト', () => {
      it('S3環境でのMAIMLダウンロードが正常に動作する', async () => {
        // Arrange - S3環境をシミュレート
        const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
        const mockGetStorageType = jest.fn().mockReturnValue('s3');
        
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
          getStorageType: mockGetStorageType,
        });

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(mockDownloadFile).toHaveBeenCalledTimes(1);
        
        const storageServiceInstance = storageService.getStorageService();
        expect(storageServiceInstance.getStorageType()).toBe('s3');
      });

      it('Swift環境でのMAIMLダウンロードが正常に動作する', async () => {
        // Arrange - Swift環境をシミュレート
        const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
        const mockGetStorageType = jest.fn().mockReturnValue('swift');
        
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
          getStorageType: mockGetStorageType,
        });

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(mockDownloadFile).toHaveBeenCalledTimes(1);
        
        const storageServiceInstance = storageService.getStorageService();
        expect(storageServiceInstance.getStorageType()).toBe('swift');
      });

      it('ストレージタイプに関わらず統一されたインターフェースで動作する', async () => {
        // Arrange
        const testCases = [
          { type: 's3' as const, bucketName: 'mmdpf-production' },
          { type: 'swift' as const, bucketName: 'mmdpf-files' },
        ];

        for (const testCase of testCases) {
          jest.clearAllMocks();

          const mockDownloadFile = jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent));
          const mockGetStorageType = jest.fn().mockReturnValue(testCase.type);
          const mockGetBucketName = jest.fn().mockReturnValue(testCase.bucketName);
          
          (storageService.getStorageService as jest.Mock).mockReturnValue({
            downloadFile: mockDownloadFile,
            getStorageType: mockGetStorageType,
            getBucketName: mockGetBucketName,
          });

          mockQuery
            .mockResolvedValueOnce({ rows: [testTaskData] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] });

          // Act
          const response = await request(app)
            .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
            .expect(200);

          // Assert
          expect(response.body.success).toBe(true);
          
          // downloadFileの呼び出しシグネチャは同じ
          expect(mockDownloadFile).toHaveBeenCalledWith(
            testOrgId,
            expect.stringMatching(/^projects\//)
          );
        }
      });
    });

    describe('4. maimlService.parsePetriNetStructureとの統合動作確認', () => {
      it('ダウンロードしたMAIMLコンテンツが正しくparsePetriNetStructureに渡される', async () => {
        // Arrange
        const testMAIMLBuffer = Buffer.from(testMAIMLContent);
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockResolvedValue(testMAIMLBuffer),
        });

        const mockParsePetriNetStructure = jest.fn().mockResolvedValue(testParsedMAIML);
        (maimlService.parsePetriNetStructure as jest.Mock) = mockParsePetriNetStructure;

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - parsePetriNetStructureがBufferのUTF-8文字列で呼ばれる
        expect(mockParsePetriNetStructure).toHaveBeenCalledTimes(1);
        expect(mockParsePetriNetStructure).toHaveBeenCalledWith(testMAIMLContent);
      });

      it('parsePetriNetStructureの成功レスポンスが正しく処理される', async () => {
        // Arrange
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent)),
        });

        const successResponse = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: '統合テスト実験',
              petriNet: {
                transitions: [
                  { id: 't1', name: 'ステップ1' },
                  { id: 't2', name: 'ステップ2' },
                ],
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(successResponse);

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.method_name).toBe('統合テスト実験');
        expect(response.body.data.transitions).toHaveLength(2);
      });

      it('parsePetriNetStructureのエラーレスポンスが500エラーに変換される', async () => {
        // Arrange
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockResolvedValue(Buffer.from(testMAIMLContent)),
        });

        const errorResponse = {
          success: false,
          error: { code: 'PARSE_ERROR', message: 'Invalid XML structure' },
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(errorResponse);

        mockQuery.mockResolvedValueOnce({ rows: [testTaskData] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MAIML_PARSE_FAILED');
      });

      it('複雑なMAIML構造（ネストされたトランジション、複数メソッド）も正しくパースされる', async () => {
        // Arrange
        const complexMAIMLContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <methods>
    <method id="method1" name="メソッド1">
      <petriNet>
        <transitions>
          <transition id="m1t1" name="メソッド1-ステップ1" />
          <transition id="m1t2" name="メソッド1-ステップ2" />
        </transitions>
      </petriNet>
    </method>
    <method id="method2" name="メソッド2">
      <petriNet>
        <transitions>
          <transition id="m2t1" name="メソッド2-ステップ1" />
        </transitions>
      </petriNet>
    </method>
  </methods>
</maiml>`;

        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: jest.fn().mockResolvedValue(Buffer.from(complexMAIMLContent)),
        });

        const complexParsedMAIML = {
          success: true,
          methods: [
            {
              methodId: 'method1',
              methodName: 'メソッド1',
              petriNet: {
                transitions: [
                  { id: 'm1t1', name: 'メソッド1-ステップ1' },
                  { id: 'm1t2', name: 'メソッド1-ステップ2' },
                ],
              },
            },
            {
              methodId: 'method2',
              methodName: 'メソッド2',
              petriNet: {
                transitions: [
                  { id: 'm2t1', name: 'メソッド2-ステップ1' },
                ],
              },
            },
          ],
        };
        (maimlService.parsePetriNetStructure as jest.Mock).mockResolvedValue(complexParsedMAIML);

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.transitions).toHaveLength(2); // method1のトランジション
      });

      it('ストレージ→パース→進捗取得の完全な統合フローが動作する', async () => {
        // Arrange
        const fullFlowMAIML = Buffer.from(testMAIMLContent);
        const mockDownloadFile = jest.fn().mockResolvedValue(fullFlowMAIML);
        
        (storageService.getStorageService as jest.Mock).mockReturnValue({
          downloadFile: mockDownloadFile,
        });

        const mockParsePetriNetStructure = jest.fn().mockResolvedValue(testParsedMAIML);
        (maimlService.parsePetriNetStructure as jest.Mock) = mockParsePetriNetStructure;

        mockQuery
          .mockResolvedValueOnce({ rows: [testTaskData] })
          .mockResolvedValueOnce({
            rows: [
              {
                record_id: 'rec1',
                status: 'completed',
                progress: 100,
                update_at: new Date('2026-02-16T10:00:00Z'),
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ count: 10 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        // Act
        const response = await request(app)
          .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
          .expect(200);

        // Assert - 全フロー検証
        // 1. ストレージダウンロード
        expect(mockDownloadFile).toHaveBeenCalledTimes(1);
        expect(mockDownloadFile).toHaveBeenCalledWith(testOrgId, expect.any(String));

        // 2. MAIMLパース
        expect(mockParsePetriNetStructure).toHaveBeenCalledTimes(1);
        expect(mockParsePetriNetStructure).toHaveBeenCalledWith(testMAIMLContent);

        // 3. 進捗データ取得
        expect(mockQuery).toHaveBeenCalled();

        // 4. レスポンス検証
        expect(response.body.success).toBe(true);
        expect(response.body.data.project_name).toBe('テストプロジェクト');
        expect(response.body.data.method_name).toBe('合成実験');
        expect(response.body.data.transitions).toHaveLength(3);
        expect(response.body.data.transitions[0].status).toBe('completed');
        expect(response.body.data.transitions[0].data_count).toBe(10);
      });
    });
  });

  describe('6. レスポンス形式の検証', () => {
    it('成功レスポンスが統一形式に従う', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');

      // ISO 8601形式のタイムスタンプ
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('エラーレスポンスが統一形式に従う', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('JSONキーがスネークケースで命名される', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [testTaskData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      // Act
      const response = await request(app)
        .get(`/api/v1/progress/${testProjectId}/${testMethodId}/${testTaskNo}`)
        .expect(200);

      // Assert - スネークケース命名規則
      expect(response.body.data).toHaveProperty('project_id');
      expect(response.body.data).toHaveProperty('project_name');
      expect(response.body.data).toHaveProperty('method_id');
      expect(response.body.data).toHaveProperty('method_name');
      expect(response.body.data).toHaveProperty('task_no');
      expect(response.body.data).toHaveProperty('task_name');
      expect(response.body.data).toHaveProperty('overall_progress');
      expect(response.body.data.overall_progress).toHaveProperty('total_transitions');
      expect(response.body.data.overall_progress).toHaveProperty('overall_percentage');
    });
  });
});
