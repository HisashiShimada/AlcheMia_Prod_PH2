/**
 * 統合テスト 6.3.4: 権限エラーテスト（403 Forbidden）
 * 
 * @description
 * 権限エラーのシナリオをテスト:
 * 1. 権限のないロール（data_admin）でのリクエスト
 * 2. 権限のないロール（provider）でのリクエスト
 * 3. 権限のないロール（mi_engineer）でのリクエスト
 * 4. ロールが指定されていないユーザー
 * 5. 空のロール配列
 * 
 * Task: 6.3.4
 * Requirements: 2, 10, 13, 14
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

describe('統合テスト 6.3.4: 権限エラーテスト（403 Forbidden）', () => {
  let app: Express;
  let mockPool: any;

  const testProjectId = '123e4567-e89b-12d3-a456-426614174002';
  const testOrganizationId = 'org_test_001';

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
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('Step 1 & 2: 権限のないロール（data_admin）でのリクエスト', () => {
    it('data_adminロールのユーザーが承認依頼を送信した場合、403 Forbiddenを返すこと', async () => {
      // Arrange: 認証は成功するが、ロールがdata_admin
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-data-admin-001',
          userName: 'データ管理者',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: 'data_admin', // 権限のないロール
        },
      });

      // Act: data_adminロールでリクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token-data-admin')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード403
      expect(response.status).toBe(403);

      // Assert: エラーレスポンスの基本構造
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: エラーコードとメッセージ
      expect(response.body.error.code).toMatch(/PERMISSION|FORBIDDEN|INSUFFICIENT/i);
      expect(response.body.error.message).toMatch(/権限|許可|forbidden|permission/i);

      // Assert: JwtService.verifyは呼ばれること（認証は成功）
      expect(JwtService.prototype.verify).toHaveBeenCalledWith('valid-token-data-admin');

      // Assert: データベースクエリは実行されないこと（権限チェックで失敗）
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Step 3 & 4: 権限のないロール（provider）でのリクエスト', () => {
    it('providerロールのユーザーが承認依頼を送信した場合、403 Forbiddenを返すこと', async () => {
      // Arrange: 認証は成功するが、ロールがprovider
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-provider-001',
          userName: 'プロバイダー',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: 'provider', // 権限のないロール
        },
      });

      // Act: providerロールでリクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token-provider')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: 'プロバイダーからのコメント' });

      // Assert: ステータスコード403
      expect(response.status).toBe(403);

      // Assert: エラーレスポンスの構造
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: 権限エラーを示すコードとメッセージ
      expect(response.body.error.code).toMatch(/PERMISSION|FORBIDDEN|INSUFFICIENT/i);
      expect(response.body.error.message).toMatch(/権限|許可|forbidden|permission/i);

      // Assert: データベースアクセスなし
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Step 5 & 6: 権限のないロール（mi_engineer）でのリクエスト', () => {
    it('mi_engineerロールのユーザーが承認依頼を送信した場合、403 Forbiddenを返すこと', async () => {
      // Arrange: 認証は成功するが、ロールがmi_engineer
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-mi-engineer-001',
          userName: 'MIエンジニア',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: 'mi_engineer', // 権限のないロール
        },
      });

      // Act: mi_engineerロールでリクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token-mi-engineer')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: 'MIエンジニアからのコメント' });

      // Assert: ステータスコード403
      expect(response.status).toBe(403);

      // Assert: エラーレスポンス形式
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/PERMISSION|FORBIDDEN|INSUFFICIENT/i);
      expect(response.body.error.message).toMatch(/権限|許可|forbidden|permission/i);

      // Assert: データベースアクセスなし
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Step 7 & 8: ロールが指定されていないユーザー', () => {
    it('ロールがnullの場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: 認証は成功するが、roleがnull（認証情報として不完全）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-no-role-001',
          userName: 'ロールなしユーザー',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: null, // ロール未指定 = 認証情報不完全
        },
      });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token-no-role')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: 'ロールなし' });

      // Assert: ステータスコード401（認証情報不完全）
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/AUTH|UNAUTHORIZED|INVALID/i);

      // Assert: データベースアクセスなし
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('ロールがundefinedの場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: 認証は成功するが、roleがundefined（認証情報として不完全）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-undefined-role-001',
          userName: 'ロールundefinedユーザー',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: undefined, // ロール未指定 = 認証情報不完全
        },
      });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token-undefined-role')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: 'ロールundefined' });

      // Assert: ステータスコード401（認証情報不完全）
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/AUTH|UNAUTHORIZED|INVALID/i);

      // Assert: データベースアクセスなし
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Step 9 & 10: 空のロール配列', () => {
    it('ロールが空文字列の場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: 認証は成功するが、roleが空文字列（認証情報として不完全）
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-empty-role-001',
          userName: '空ロールユーザー',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: '', // 空のロール = 認証情報不完全
        },
      });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token-empty-role')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: '空ロール' });

      // Assert: ステータスコード401（認証情報不完全）
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/AUTH|UNAUTHORIZED|INVALID/i);

      // Assert: データベースアクセスなし
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Step 11 & 12: REFACTOR - エラーレスポンス形式の一貫性', () => {
    it('すべてのエラーが統一されたレスポンス形式を持つこと（403と401）', async () => {
      const testCases = [
        {
          name: 'data_admin',
          role: 'data_admin',
          expectedStatus: 403, // 権限エラー
        },
        {
          name: 'provider',
          role: 'provider',
          expectedStatus: 403, // 権限エラー
        },
        {
          name: 'mi_engineer',
          role: 'mi_engineer',
          expectedStatus: 403, // 権限エラー
        },
        {
          name: 'null role',
          role: null,
          expectedStatus: 401, // 認証エラー
        },
        {
          name: 'empty role',
          role: '',
          expectedStatus: 401, // 認証エラー
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        jest.clearAllMocks();
        (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            userId: `user-${testCase.name}-001`,
            userName: testCase.name,
            organizationId: testOrganizationId,
            organizationPrefix: 'test_org',
            role: testCase.role,
          },
        });

        // Act
        const response = await request(app)
          .post(`/api/v1/projects/${testProjectId}/approval-request`)
          .set('Authorization', 'Bearer valid-token')
          .set('X-Organization-Id', testOrganizationId)
          .send({ comment: 'テスト' });

        // Assert: 期待されるステータスコードを返すこと
        expect(response.status).toBe(testCase.expectedStatus);

        // Assert: レスポンス形式が統一されていること
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: expect.any(String),
            message: expect.any(String),
          },
          meta: {
            timestamp: expect.any(String),
          },
        });

        // Assert: success は必ず false
        expect(response.body.success).toBe(false);

        // Assert: error.code は空でないこと
        expect(response.body.error.code).toBeTruthy();
        expect(response.body.error.code.length).toBeGreaterThan(0);

        // Assert: error.message は空でないこと
        expect(response.body.error.message).toBeTruthy();
        expect(response.body.error.message.length).toBeGreaterThan(0);

        // Assert: meta.timestamp はISO 8601形式
        expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // Assert: データベースクエリは実行されないこと
        expect(mockPool.query).not.toHaveBeenCalled();
      }
    });

    it('403エラーレスポンスに不要なフィールドが含まれないこと', async () => {
      // Arrange
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          userId: 'user-test',
          userName: 'テスト',
          organizationId: testOrganizationId,
          organizationPrefix: 'test_org',
          role: 'data_admin',
        },
      });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer valid-token')
        .set('X-Organization-Id', testOrganizationId)
        .send({ comment: 'テスト' });

      // Assert: ステータスコード403
      expect(response.status).toBe(403);

      // Assert: dataフィールドは含まれないこと（エラー時はdataなし）
      expect(response.body.data).toBeUndefined();

      // Assert: 必須フィールドのみ存在すること
      const responseKeys = Object.keys(response.body);
      expect(responseKeys).toContain('success');
      expect(responseKeys).toContain('error');
      expect(responseKeys).toContain('meta');
      expect(responseKeys.length).toBeLessThanOrEqual(3);
    });
  });
});