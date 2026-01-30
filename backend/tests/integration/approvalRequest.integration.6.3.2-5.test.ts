/**
 * 統合テスト 6.3.2-5: 3つの正常系テスト完成
 * 
 * @description
 * 元のタスク6.3.2の3つのテストケースを全て実装:
 * 1. 認証済みexperiment_workerが承認依頼を成功させること
 * 2. commentなしでも承認依頼が成功すること
 * 3. トランザクションが正しく動作すること
 * 
 * Task: 6.3.2-5
 * Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14
 */

import request from 'supertest';
import express, { Express } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
import { JwtService } from '../../src/services/jwtService';
import { getPool } from '../../src/database/db';

// Mock dependencies
jest.mock('../../src/services/jwtService');
jest.mock('../../src/database/db');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-notification-123'),
}));

describe('統合テスト 6.3.2-5: 3つの正常系テスト完成', () => {
  let app: Express;
  let mockPool: any;
  let mockClient: any;

  const testOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174001';
  const testProjectId = '123e4567-e89b-12d3-a456-426614174002';
  const testComment = '実験作業が完了しましたので承認をお願いします';
  const validToken = 'valid-jwt-token-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app with full middleware chain
    app = express();
    app.use(express.json());
    
    // Add full middleware chain: auth + tenantIsolation
    app.post('/api/v1/projects/:projectId/approval-request',
      authMiddleware,
      tenantIsolation,
      requestApproval
    );

    // Setup database mocks
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('正常系テスト1: 認証済みexperiment_workerが承認依頼を成功させること', () => {
    it('experiment_workerロールのユーザーがcommentありで承認依頼できること', async () => {
      // Arrange: JwtService mock
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
          role: 'experiment_worker',  // experiment_workerロール
        },
      });

      // Arrange: Database mocks
      // 1. pool.query: プロジェクト存在確認
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          project_status: 1,  // 1 = active
          organization_id: testOrganizationId,
        }],
      });

      // 2. client.query('BEGIN'): トランザクション開始
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // 3. client.query: プロジェクトステータス更新
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          project_status: 'waiting_approval',
          updated_at: '2026-01-28T21:00:00Z',
        }],
      });

      // 4. client.query: 通知レコード挿入
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          notification_id: 'test-notification-id-456',
          notification_type: 'approval_request',
          title: '承認依頼: テストプロジェクト',
        }],
      });

      // 5. client.query: ユーザー名取得
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: testUserId,
          user_name: 'テストユーザー',
        }],
      });

      // 6. client.query('COMMIT'): トランザクションコミット
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Act: リクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: レスポンスボディの基本構造
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: testUserId,
          requested_by_name: expect.any(String),
          comment: testComment,  // commentが含まれること
          notification_id: expect.any(String),
          requested_at: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: JwtService.verifyが呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith(validToken);

      // Assert: client.queryが正しい回数呼ばれたこと
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');

      // Assert: clientがreleaseされたこと
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('正常系テスト2: commentなしでも承認依頼が成功すること', () => {
    it('commentフィールドを省略してもデフォルトメッセージで承認依頼できること', async () => {
      // Arrange: JwtService mock
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
          role: 'experiment_worker',
        },
      });

      // Arrange: Database mocks
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          project_status: 1,  // active
          organization_id: testOrganizationId,
        }],
      });

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          project_status: 'waiting_approval',
          updated_at: '2026-01-28T21:00:00Z',
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          notification_id: 'test-notification-id-789',
          notification_type: 'approval_request',
          title: '承認依頼: テストプロジェクト',
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: testUserId,
          user_name: 'テストユーザー',
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act: commentなしでリクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});  // commentフィールドを省略

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: レスポンスボディ
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          project_id: testProjectId,
          new_status: 'waiting_approval',
          // commentがnullまたはデフォルトメッセージであること
          comment: expect.anything(),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: commentがundefinedでないこと（何らかの値がある）
      expect(response.body.data.comment).toBeDefined();
    });
  });

  describe('正常系テスト3: トランザクションが正しく動作すること', () => {
    it('複数のDB操作がトランザクション内で実行され、正しくコミットされること', async () => {
      // Arrange: JwtService mock
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
          role: 'experiment_admin',  // 管理者ロール
        },
      });

      // Arrange: Database mocks
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'トランザクションテストプロジェクト',
          project_status: 1,
          organization_id: testOrganizationId,
        }],
      });

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'トランザクションテストプロジェクト',
          project_status: 'waiting_approval',
          updated_at: '2026-01-28T21:00:00Z',
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          notification_id: 'test-notification-id-101',
          notification_type: 'approval_request',
          title: '承認依頼: トランザクションテストプロジェクト',
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: testUserId,
          user_name: 'テスト管理者',
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: 'トランザクションテスト用コメント' });

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: トランザクションの開始とコミットが呼ばれたこと
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Assert: トランザクション内で複数のDB操作が実行されたこと
      // BEGIN, UPDATE project, INSERT notification, SELECT user, COMMIT = 5回
      expect(mockClient.query).toHaveBeenCalledTimes(5);

      // Assert: client.releaseが呼ばれたこと（接続が解放される）
      expect(mockClient.release).toHaveBeenCalled();

      // Assert: レスポンスに必要なデータが全て含まれること
      expect(response.body.data).toEqual(expect.objectContaining({
        project_id: testProjectId,
        previous_status: 'active',
        new_status: 'waiting_approval',
        notification_id: expect.any(String),
      }));
    });
  });
});