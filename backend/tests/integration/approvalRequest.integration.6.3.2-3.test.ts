/**
 * 統合テスト 6.3.2-3: tenantIsolation追加
 * 
 * @description
 * - Express appを使用
 * - authMiddleware + tenantIsolationを追加
 * - req.organizationIdが正しく設定されることを確認
 * 
 * Task: 6.3.2-3
 * Requirements: 1, 2, 12, 13
 */

import request from 'supertest';
import express, { Express } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
import { ProjectService } from '../../src/services/projectService';
import { JwtService } from '../../src/services/jwtService';

// Mock dependencies
jest.mock('../../src/services/projectService');
jest.mock('../../src/services/jwtService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123'),
}));

describe('統合テスト 6.3.2-3: tenantIsolation追加', () => {
  let app: Express;

  const testOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174001';
  const testProjectId = '123e4567-e89b-12d3-a456-426614174002';
  const testComment = '実験作業が完了しましたので承認をお願いします';
  const validToken = 'valid-jwt-token-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app with authMiddleware + tenantIsolation
    app = express();
    app.use(express.json());
    
    // Add authMiddleware + tenantIsolation
    app.post('/api/v1/projects/:projectId/approval-request',
      authMiddleware,
      tenantIsolation,  // NEW: tenantIsolation追加
      requestApproval
    );

    // Mock ProjectService
    const mockServiceResult = {
      success: true,
      data: {
        project_id: testProjectId,
        project_name: 'テストプロジェクト',
        previous_status: 'active',
        new_status: 'waiting_approval',
        requested_by: testUserId,
        comment: testComment,
        requested_at: '2026-01-28T21:00:00Z',
        notification_id: 'notif-123',
      },
    };

    (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue(mockServiceResult);
  });

  describe('正常系: tenantIsolationが正しく動作すること', () => {
    it('req.organizationIdが正しく設定され承認依頼が成功すること', async () => {
      // Arrange: JwtService.verifyのモック設定（認証成功）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,  // organizationIdを含む
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: レスポンスボディ
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          project_id: testProjectId,
          new_status: 'waiting_approval',
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'test-request-id-123',
        }),
      });

      // Assert: JwtService.verifyが呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith(validToken);

      // Assert: ProjectService.requestApprovalが正しいorganizationIdで呼ばれたこと
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        testProjectId,
        testComment,
        testOrganizationId,  // tenantIsolationで設定されたorganizationId
        testUserId
      );
    });
  });

  describe('異常系: organizationIdが欠けている場合', () => {
    it('JWTにorganizationIdが含まれていない場合401を返すこと', async () => {
      // Arrange: JwtService.verifyのモック設定（organizationIdなし）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          // organizationIdが欠けている
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_ORGANIZATION_MISSING',
          message: '組織情報が見つかりません',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: ProjectService.requestApprovalが呼ばれていないこと
      expect(ProjectService.prototype.requestApproval).not.toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('organizationIdがnullの場合401を返すこと', async () => {
      // Arrange: JwtService.verifyのモック設定（organizationId = null）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: null,  // null
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_ORGANIZATION_MISSING',
          message: '組織情報が見つかりません',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('organizationIdが空文字列の場合401を返すこと', async () => {
      // Arrange: JwtService.verifyのモック設定（organizationId = ''）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: '',  // 空文字列
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_ORGANIZATION_MISSING',
          message: '組織情報が見つかりません',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });
});