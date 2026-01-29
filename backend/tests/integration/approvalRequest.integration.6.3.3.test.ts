/**
 * 統合テスト 6.3.3: 認証エラーテスト（401 Unauthorized）
 * 
 * @description
 * 認証エラーのシナリオをテスト:
 * 1. JWTトークンなし - Authorization headerがない
 * 2. 無効なJWTトークン - トークンの形式が不正
 * 3. 期限切れJWTトークン - トークンの有効期限が切れている
 * 
 * Task: 6.3.3
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

describe('統合テスト 6.3.3: 認証エラーテスト（401 Unauthorized）', () => {
  let app: Express;
  let mockPool: any;

  const testProjectId = '123e4567-e89b-12d3-a456-426614174002';

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

  describe('Step 1 & 2: JWTトークンなしのリクエスト', () => {
    it('Authorizationヘッダーがない場合、401 Unauthorizedを返すこと', async () => {
      // Act: Authorizationヘッダーなしでリクエスト送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

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
      expect(response.body.error.code).toMatch(/AUTH|UNAUTHORIZED|TOKEN/i);
      expect(response.body.error.message).toBeTruthy();

      // Assert: JwtServiceは呼ばれないこと（認証前に失敗）
      expect(JwtService.prototype.verify).not.toHaveBeenCalled();

      // Assert: データベースクエリは実行されないこと
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('Authorizationヘッダーが空文字の場合、401 Unauthorizedを返すこと', async () => {
      // Act: 空のAuthorizationヘッダーでリクエスト
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', '')
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toMatch(/AUTH|UNAUTHORIZED|TOKEN/i);

      // Assert: データベースクエリは実行されないこと
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('Authorizationヘッダーに"Bearer "プレフィックスがない場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: JwtService.verifyが呼ばれないか、失敗を返すようにモック
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'トークンの形式が不正です',
        },
      });

      // Act: Bearer プレフィックスなしでトークン送信
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'invalid-token-without-bearer')
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/AUTH|UNAUTHORIZED|TOKEN/i);
    });
  });

  describe('Step 3 & 4: 無効なJWTトークンのリクエスト', () => {
    it('形式が不正なトークンの場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: JwtService.verifyが失敗を返すようにモック
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'トークンの形式が不正です',
        },
      });

      // Act: 無効なトークンでリクエスト
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer invalid-malformed-token')
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: expect.stringMatching(/AUTH|TOKEN|INVALID/i),
          message: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: JwtService.verifyが呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith('invalid-malformed-token');

      // Assert: データベースクエリは実行されないこと（認証失敗のため）
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('署名が改ざんされたトークンの場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: JwtService.verifyが改ざんエラーを返すようにモック
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_TAMPERED',
          message: 'トークンの署名が不正です',
        },
      });

      // Act: 改ざんされたトークンでリクエスト
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer tampered.token.signature')
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/AUTH|TOKEN|TAMPERED|INVALID/i);

      // Assert: データベースアクセスなし
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Step 5 & 6: 期限切れJWTトークンのリクエスト', () => {
    it('期限切れトークンの場合、401 Unauthorizedを返すこと', async () => {
      // Arrange: JwtService.verifyが期限切れエラーを返すようにモック
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています',
        },
      });

      // Act: 期限切れトークンでリクエスト
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer expired-token-2025-12-31')
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: expect.stringMatching(/AUTH|TOKEN|EXPIRED/i),
          message: expect.stringMatching(/期限|expired/i),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Assert: JwtService.verifyが呼ばれたこと
      expect(JwtService.prototype.verify).toHaveBeenCalledWith('expired-token-2025-12-31');

      // Assert: データベースクエリは実行されないこと
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('トークンの有効期限が未来日付でも検証が失敗した場合、401を返すこと', async () => {
      // Arrange: 予期しない検証エラー
      (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_VERIFICATION_FAILED',
          message: 'トークンの検証に失敗しました',
        },
      });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .set('Authorization', 'Bearer some-invalid-token')
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

      // Assert: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBeTruthy();
    });
  });

  describe('Step 7: REFACTORの検証 - エラーレスポンス形式の一貫性', () => {
    it('すべての401エラーが同じレスポンス形式を持つこと', async () => {
      const testCases = [
        {
          name: 'トークンなし',
          headers: {},
          mockSetup: () => {},
        },
        {
          name: '無効なトークン',
          headers: { Authorization: 'Bearer invalid-token' },
          mockSetup: () => {
            (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
              success: false,
              error: { code: 'AUTH_TOKEN_INVALID', message: '無効なトークン' },
            });
          },
        },
        {
          name: '期限切れトークン',
          headers: { Authorization: 'Bearer expired-token' },
          mockSetup: () => {
            (JwtService.prototype.verify as jest.Mock).mockResolvedValue({
              success: false,
              error: { code: 'AUTH_TOKEN_EXPIRED', message: '期限切れ' },
            });
          },
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        jest.clearAllMocks();
        testCase.mockSetup();

        // Act
        const response = await request(app)
          .post(`/api/v1/projects/${testProjectId}/approval-request`)
          .set(testCase.headers)
          .send({ comment: 'テストコメント' });

        // Assert: 全て401を返すこと
        expect(response.status).toBe(401);

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

    it('401エラーレスポンスに不要なフィールドが含まれないこと', async () => {
      // Act: トークンなしでリクエスト
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({ comment: 'テストコメント' });

      // Assert: ステータスコード401
      expect(response.status).toBe(401);

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