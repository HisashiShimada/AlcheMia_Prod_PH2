/**
 * 統合テスト 6.3.2-2: authMiddleware追加
 * 
 * @description
 * - Express appを使用
 * - authMiddlewareを追加
 * - tenantIsolationはまだ追加しない
 * - JWT検証が正しく動作することを確認
 * 
 * Task: 6.3.2-2
 * Requirements: 1, 2, 13
 */

import request from 'supertest';
import express, { Express } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { ProjectService } from '../../src/services/projectService';
import { JwtService } from '../../src/services/jwtService';

// Mock dependencies
jest.mock('../../src/services/projectService');
jest.mock('../../src/services/jwtService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123'),
}));

describe('統合テスト 6.3.2-2: authMiddleware追加', () => {
  let app: Express;

  const testOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174001';
  const testProjectId = '123e4567-e89b-12d3-a456-426614174002';
  const testComment = '実験作業が完了しましたので承認をお願いします';
  const validToken = 'valid-jwt-token-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app with authMiddleware
    app = express();
    app.use(express.json());
    
    // Add authMiddleware only (no tenantIsolation yet)
    app.post('/api/v1/projects/:projectId/approval-request', 
      authMiddleware,
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

  describe('正常系: JWT認証が成功すること', () => {
    it('有効なトークンで承認依頼が成功すること', async () => {
      // Arrange: JwtService.verifyのモック設定（認証成功）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
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

      // Assert: ProjectService.requestApprovalが正しく呼ばれたこと
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        testProjectId,
        testComment,
        testOrganizationId,
        testUserId
      );
    });

    it('Bearerスキーム付きトークンが正しく処理されること', async () => {
      // Arrange: JwtService.verifyのモック設定（認証成功）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信（Bearerスキーム付き）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: JwtService.verifyが正しいトークンで呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith(validToken);
    });
  });

  describe('異常系: JWT認証が失敗すること', () => {
    it('トークンが提供されていない場合に401を返すこと', async () => {
      // Act: リクエスト送信（Authorizationヘッダーなし）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: '認証トークンが提供されていません',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: JwtService.verifyが呼ばれていないこと
      expect(JwtService.prototype.verify).not.toHaveBeenCalled();

      // Assert: ProjectService.requestApprovalが呼ばれていないこと
      expect(ProjectService.prototype.requestApproval).not.toHaveBeenCalled();
    });

    it('空のトークンが提供された場合に401を返すこと', async () => {
      // Act: リクエスト送信（空のトークン）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', '')
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: '認証トークンが提供されていません',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('無効なトークンが提供された場合に401を返すこと', async () => {
      // Arrange: JwtService.verifyのモック設定（認証失敗）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'トークンが無効です',
        },
      });

      // Act: リクエスト送信（無効なトークン）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer invalid-token`)
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'トークンが無効です',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: JwtService.verifyが呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith('invalid-token');

      // Assert: ProjectService.requestApprovalが呼ばれていないこと
      expect(ProjectService.prototype.requestApproval).not.toHaveBeenCalled();
    });

    it('期限切れトークンが提供された場合に401を返すこと', async () => {
      // Arrange: JwtService.verifyのモック設定（期限切れ）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています',
        },
      });

      // Act: リクエスト送信（期限切れトークン）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `Bearer expired-token`)
        .send({ comment: testComment });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('エッジケース', () => {
    it('Bearerスキームが小文字の場合も正しく処理されること', async () => {
      // Arrange: JwtService.verifyのモック設定（認証成功）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信（bearerスキーム小文字）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `bearer ${validToken}`)
        .send({ comment: testComment });

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: JwtService.verifyが正しいトークンで呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith(validToken);
    });

    it('トークンの前後にスペースがある場合も正しく処理されること', async () => {
      // Arrange: JwtService.verifyのモック設定（認証成功）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: testUserId,
          organizationId: testOrganizationId,
          role: 'experiment_worker',
        },
      });

      // Act: リクエスト送信（スペース付きトークン）
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', `  Bearer  ${validToken}  `)
        .send({ comment: testComment });

      // Assert: ステータスコード200
      expect(response.status).toBe(200);

      // Assert: JwtService.verifyが正しいトークンで呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith(validToken);
    });
  });
});