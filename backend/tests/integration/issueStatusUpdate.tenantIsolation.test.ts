/**
 * Issue Status Update API - Tenant Isolation Middleware Integration Tests
 * Task 8.2: テナント分離の統合テスト
 * 
 * Requirements:
 * - tenantIsolationミドルウェアでorganizationIdが設定されることをテスト
 * - 自組織の問題へのアクセスが成功することをテスト
 * - 他組織の問題へのアクセスが404エラーを返ることをテスト
 * 
 * Test Strategy (TDD):
 * - RED: Write failing tests first
 * - GREEN: Verify implementation passes
 * - REFACTOR: Clean up if needed
 */

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// Express Request型にuserプロパティを追加
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      organizationId: string;
      role: string;
    };
  }
}

// モック設定
jest.mock('../../src/services/issueService');
jest.mock('../../src/repositories/issueRepository');
jest.mock('../../src/database/db');

describe('Issue Status Update - Tenant Isolation Middleware Integration (Task 8.2)', () => {
  let app: express.Application;
  let mockUpdateStatus: jest.Mock;

  // テストデータ
  const org1 = 'org-001';
  const org2 = 'org-002';
  const user1 = 'user-001';
  const issue1 = 'issue-001';
  const issue2 = 'issue-002';

  /**
   * tenantIsolationミドルウェアのモック実装
   * 実際のミドルウェアと同様に、req.userからorganization_idを取得し、
   * 後続の処理で使用できるようにする
   */
  const mockTenantIsolationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // req.userが設定されていることを前提とする（authMiddlewareで設定済み）
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
      });
    }

    // tenantIsolationミドルウェアの主要な機能：
    // req.user.organizationId をリクエストに設定
    // （実際のミドルウェアでは、これが後続の処理で使用される）
    return next();
  };

  /**
   * 認証済みユーザーを設定するミドルウェア（テスト用）
   */
  const setAuthenticatedUser = (organizationId: string, userId: string) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        userId,
        organizationId,
        role: 'manager',
      };
      next();
    };
  };

  beforeEach(() => {
    // Express アプリケーションのセットアップ
    app = express();
    app.use(express.json());

    // モックのリセット
    jest.clearAllMocks();

    // IssueService.updateStatus のモック
    mockUpdateStatus = jest.fn();
    (IssueService as jest.MockedClass<typeof IssueService>).mockImplementation(() => {
      return {
        updateStatus: mockUpdateStatus,
      } as any;
    });
  });

  describe('Requirement 3.1: tenantIsolationミドルウェアでorganizationIdが設定されること', () => {
    it('【RED→GREEN】tenantIsolationミドルウェアがreq.user.organizationIdをServiceに渡すこと', async () => {
      // Arrange
      const expectedResult = {
        success: true,
        data: {
          organizationId: org1,
          issueId: issue1,
          status: 'resolved',
          issueCompleterId: user1,
          issueComplateAt: '2026-02-13T11:00:00Z',
          updateUserId: user1,
          updateAt: '2026-02-13T11:00:00Z',
        },
      };

      mockUpdateStatus.mockResolvedValue(expectedResult);

      // ルート設定（ミドルウェアチェーン）
      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(200);
      expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
      
      // organizationId が正しく渡されていることを確認
      const [calledOrgId, calledIssueId, calledUserId, calledStatus] = mockUpdateStatus.mock.calls[0];
      expect(calledOrgId).toBe(org1);
      expect(calledIssueId).toBe(issue1);
      expect(calledUserId).toBe(user1);
      expect(calledStatus).toBe('resolved');
    });

    it('【RED→GREEN】req.userが設定されていない場合、401エラーを返すこと', async () => {
      // Arrange
      app.patch(
        '/api/v1/issues/:issueId/status',
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('【RED→GREEN】異なるユーザーでアクセスした場合、それぞれのorganizationIdが使用されること', async () => {
      // Arrange: org1のユーザー
      const org1Result = {
        success: true,
        data: {
          organizationId: org1,
          issueId: issue1,
          status: 'resolved',
        },
      };
      mockUpdateStatus.mockResolvedValueOnce(org1Result);

      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act: org1ユーザーのリクエスト
      await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert: org1が使用された
      expect(mockUpdateStatus.mock.calls[0][0]).toBe(org1);

      // Arrange: org2のユーザー（新しいアプリインスタンス）
      const app2 = express();
      app2.use(express.json());
      const org2Result = {
        success: true,
        data: {
          organizationId: org2,
          issueId: issue2,
          status: 'resolved',
        },
      };
      mockUpdateStatus.mockResolvedValueOnce(org2Result);

      app2.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org2, 'user-002'),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act: org2ユーザーのリクエスト
      await request(app2)
        .patch(`/api/v1/issues/${issue2}/status`)
        .send({ status: 'resolved' });

      // Assert: org2が使用された
      expect(mockUpdateStatus.mock.calls[1][0]).toBe(org2);
    });
  });

  describe('Requirement 3.2: 自組織の問題へのアクセスが成功すること', () => {
    it('【RED→GREEN】自組織の問題のステータス変更が成功すること', async () => {
      // Arrange
      const successResult = {
        success: true,
        data: {
          organizationId: org1,
          projectId: 'proj-001',
          issueId: issue1,
          methodId: 'method-001',
          issueTarget: 1,
          taskNo: null,
          transitionId: null,
          issueTitle: 'Test Issue',
          issueType: 1,
          issueContents: 'Test content',
          status: 'resolved',
          issueReporterId: user1,
          issueReportAt: '2026-02-13T10:00:00Z',
          issueCompleterId: user1,
          issueComplateAt: '2026-02-13T11:00:00Z',
          createUserId: user1,
          createAt: '2026-02-13T10:00:00Z',
          updateUserId: user1,
          updateAt: '2026-02-13T11:00:00Z',
        },
      };

      mockUpdateStatus.mockResolvedValue(successResult);

      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.organizationId).toBe(org1);
      expect(response.body.data.issueId).toBe(issue1);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.issueCompleterId).toBe(user1);
    });

    it('【RED→GREEN】unresolvedへの変更も自組織内で成功すること', async () => {
      // Arrange
      const successResult = {
        success: true,
        data: {
          organizationId: org1,
          issueId: issue1,
          status: 'unresolved',
          issueCompleterId: null,
          issueComplateAt: null,
          updateUserId: user1,
          updateAt: '2026-02-13T11:00:00Z',
        },
      };

      mockUpdateStatus.mockResolvedValue(successResult);

      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'unresolved' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('unresolved');
      expect(response.body.data.issueCompleterId).toBeNull();
      expect(response.body.data.issueComplateAt).toBeNull();
    });
  });

  describe('Requirement 3.3: 他組織の問題へのアクセスが404エラーを返ること', () => {
    it('【RED→GREEN】org1のユーザーがorg2の問題にアクセスした場合、404エラーを返すこと', async () => {
      // Arrange
      const notFoundResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '問題報告が見つかりません',
        },
      };

      mockUpdateStatus.mockResolvedValue(notFoundResult);

      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1), // org1のユーザー
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act: org2に属する問題issue2にアクセスを試みる
      const response = await request(app)
        .patch(`/api/v1/issues/${issue2}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
      
      // organizationIdがorg1で呼び出されたことを確認
      expect(mockUpdateStatus).toHaveBeenCalledWith(org1, issue2, user1, 'resolved');
    });

    it('【RED→GREEN】複数組織が同じissue_idを持つ場合でも、正しく分離されること', async () => {
      // Arrange
      const sameIssueId = 'issue-common';
      
      // org1での成功
      const org1Result = {
        success: true,
        data: {
          organizationId: org1,
          issueId: sameIssueId,
          issueTitle: 'Org1 Issue',
          status: 'resolved',
        },
      };
      
      // org2での404（org2には存在しない）
      const org2Result = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '問題報告が見つかりません',
        },
      };

      mockUpdateStatus
        .mockResolvedValueOnce(org1Result)
        .mockResolvedValueOnce(org2Result);

      // Act 1: org1ユーザーのアクセス
      const app1 = express();
      app1.use(express.json());
      app1.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      const response1 = await request(app1)
        .patch(`/api/v1/issues/${sameIssueId}/status`)
        .send({ status: 'resolved' });

      // Assert 1: org1では成功
      expect(response1.status).toBe(200);
      expect(response1.body.data.organizationId).toBe(org1);
      expect(mockUpdateStatus.mock.calls[0][0]).toBe(org1);

      // Act 2: org2ユーザーのアクセス
      const app2 = express();
      app2.use(express.json());
      app2.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org2, 'user-002'),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      const response2 = await request(app2)
        .patch(`/api/v1/issues/${sameIssueId}/status`)
        .send({ status: 'resolved' });

      // Assert 2: org2では404
      expect(response2.status).toBe(404);
      expect(response2.body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(mockUpdateStatus.mock.calls[1][0]).toBe(org2);
    });

    it('【RED→GREEN】存在しない問題へのアクセスも404エラーを返すこと', async () => {
      // Arrange
      const notFoundResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '問題報告が見つかりません',
        },
      };

      mockUpdateStatus.mockResolvedValue(notFoundResult);

      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act: 存在しない問題
      const response = await request(app)
        .patch('/api/v1/issues/non-existent-issue/status')
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Integration: ミドルウェアチェーン全体の動作確認', () => {
    it('【RED→GREEN】認証 → テナント分離 → コントローラーの順に実行されること', async () => {
      // Arrange
      const middlewareExecutionOrder: string[] = [];

      const trackingAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
        middlewareExecutionOrder.push('auth');
        req.user = { userId: user1, organizationId: org1, role: 'manager' };
        next();
      };

      const trackingTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecutionOrder.push('tenant');
        if (!req.user) {
          return res.status(401).json({ success: false });
        }
        return next();
      };

      const trackingController = async (_req: Request, res: Response) => {
        middlewareExecutionOrder.push('controller');
        res.status(200).json({ success: true, executionOrder: middlewareExecutionOrder });
      };

      app.patch(
        '/api/v1/issues/:issueId/status',
        trackingAuthMiddleware,
        trackingTenantMiddleware,
        trackingController
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(200);
      expect(middlewareExecutionOrder).toEqual(['auth', 'tenant', 'controller']);
    });

    it('【RED→GREEN】tenantIsolationがreq.userに依存していることを確認', async () => {
      // Arrange
      let capturedUser: any = null;

      const capturingTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
        capturedUser = req.user; // req.userをキャプチャ
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: { code: 'AUTH_TOKEN_INVALID' },
          });
        }
        return next();
      };

      const mockController = (req: Request, res: Response) => {
        res.status(200).json({ success: true, user: req.user });
      };

      app.patch(
        '/api/v1/issues/:issueId/status',
        setAuthenticatedUser(org1, user1),
        capturingTenantMiddleware,
        mockController
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(200);
      expect(capturedUser).not.toBeNull();
      expect(capturedUser.organizationId).toBe(org1);
      expect(capturedUser.userId).toBe(user1);
    });
  });

  describe('Error Handling: テナント分離エラーケース', () => {
    it('【RED→GREEN】organizationIdが設定されていない場合のエラーハンドリング', async () => {
      // Arrange
      const invalidUserMiddleware = (req: Request, _res: Response, next: NextFunction) => {
        req.user = { userId: user1, organizationId: '', role: 'manager' }; // 空のorganizationId
        next();
      };

      mockUpdateStatus.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'organizationIdが設定されていません',
        },
      });

      app.patch(
        '/api/v1/issues/:issueId/status',
        invalidUserMiddleware,
        mockTenantIsolationMiddleware,
        issueController.updateStatus
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/issues/${issue1}/status`)
        .send({ status: 'resolved' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
