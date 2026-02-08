/**
 * 統合テスト 6.3.2-4: DBモック完成
 * 
 * @description
 * - Express appを使用
 * - authMiddleware + tenantIsolationを追加
 * - データベースクエリモックを完全に設定
 * - トランザクション処理のモック
 * - 1つの完全な正常系ケース
 * 
 * Task: 6.3.2-4
 * Requirements: 1, 2, 3, 5, 6, 7, 12, 13
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
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('統合テスト 6.3.2-4: permissionCheck追加とDBモック完成', () => {
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

    // Mock JwtService
    (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        userId: testUserId,
        organizationId: testOrganizationId,
        role: 'experiment_worker',
      },
    });
  });

  describe('正常系: 完全なフローが動作すること', () => {
    it('permissionCheckを含む全ミドルウェアチェーンとDBモックが正しく動作すること', async () => {
      // Arrange: Database mocks
      // 1. pool.query: プロジェクト存在確認
      // NOTE: project_statusはDBでINTEGERで格納される（0=draft, 1=active, 2=waiting_approval, 3=approved, 4=archived）
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          project_status: 1,  // 1 = active（数値で指定する必要がある）
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

      // Debug: Log actual response if not 200
      if (response.status !== 200) {
        console.log('Actual status:', response.status);
        console.log('Actual body:', JSON.stringify(response.body, null, 2));
      }

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: レスポンスボディ
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: testUserId,
          requested_by_name: expect.any(String),  // ユーザー名またはユーザーID
          comment: testComment,
          notification_id: expect.any(String),  // UUIDは動的に生成される
          requested_at: expect.any(String),  // タイムスタンプは動的に生成される
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: JwtService.verifyが呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith(validToken);

      // Assert: pool.query (プロジェクト取得) が呼ばれたこと
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // Assert: client.query が正しい回数呼ばれたこと
      // BEGIN, UPDATE, INSERT, COMMIT, SELECT user_name = 5回
      expect(mockClient.query).toHaveBeenCalledTimes(5);

      // Assert: トランザクション開始
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');

      // Assert: トランザクションコミット (4番目)
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');

      // Assert: clientがreleaseされたこと
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});