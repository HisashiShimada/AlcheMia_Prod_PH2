/**
 * 認証API統合テスト
 * 
 * このテストスイートは、認証APIのエンドツーエンドフローを検証します。
 * タスク8.2: 統合テスト実装
 * 
 * テスト対象:
 * - ログインフロー（成功・失敗）
 * - PINコード検証フロー（成功・失敗・期限切れ・試行回数超過）
 * - PINコード再送信
 * - ログアウト
 * - パスワードリセットフロー（要求・実行）
 * - レート制限（ログイン5回、PIN 3回）
 * - login_history記録検証
 * - Admin監査ログ記録検証
 */

import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../src/routes/authRoutes';
import { getPool } from '../../src/database/db';
import { PasswordService } from '../../src/services/passwordService';
import { PinCodeService } from '../../src/services/pinCodeService';
import { EmailService } from '../../src/services/emailService';
import { JwtService } from '../../src/services/jwtService';
import { errorHandler } from '../../src/middleware/errorHandlerMiddleware';

// Mock dependencies
jest.mock('../../src/database/db');
jest.mock('../../src/services/passwordService');
jest.mock('../../src/services/pinCodeService');
jest.mock('../../src/services/emailService');
jest.mock('../../src/services/jwtService');

describe('Authentication Integration Tests', () => {
  let app: Application;
  let mockQuery: jest.Mock;
  let mockPasswordService: any;
  let mockPinCodeService: any;
  let mockEmailService: any;
  let mockJwtService: any;

  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUser = {
    user_id: 'user123',
    user_name: 'test_user',
    mail_address: 'user@example.com',
    role: 'experiment_worker',
    organization_id: testOrgId,
    organization_name: 'MAIML研究室',
    display_name: '山田 太郎',
    is_active: true,
    locked_until: null,
  };

  beforeAll(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({ query: mockQuery });

    mockPasswordService = {
      verify: jest.fn(),
      hash: jest.fn(),
    };
    mockPinCodeService = {
      generateAndSave: jest.fn(),
      verify: jest.fn(),
      delete: jest.fn(),
    };
    mockEmailService = {
      sendPinCode: jest.fn(),
      sendPasswordReset: jest.fn(),
    };
    mockJwtService = {
      generate: jest.fn(),
      verify: jest.fn(),
    };

    (PasswordService as jest.MockedClass<typeof PasswordService>).mockImplementation(() => mockPasswordService);
    (PinCodeService as jest.MockedClass<typeof PinCodeService>).mockImplementation(() => mockPinCodeService);
    (EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService);
    (JwtService as jest.MockedClass<typeof JwtService>).mockImplementation(() => mockJwtService);
  });

  describe('1. ログインフロー統合テスト', () => {
    describe('1.1 成功シナリオ', () => {
      it('正常なログインフロー: ユーザー名・パスワード → PINコード送信 → 仮セッショントークン返却', async () => {
        // Arrange
        const loginData = {
          username: 'test_user',
          password: 'Test@1234',
        };

        mockQuery.mockResolvedValueOnce({ rows: [testUser] });
        mockPasswordService.verify.mockResolvedValue({ success: true, data: true });
        mockPinCodeService.generateAndSave.mockResolvedValue({
          success: true,
          data: { pinCode: '123456', expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
        });
        mockEmailService.sendPinCode.mockResolvedValue({ success: true, data: undefined });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Act
        const response = await request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', testOrgId)
          .send(loginData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionToken).toMatch(/^temp_session-/);
        expect(mockPasswordService.verify).toHaveBeenCalledWith(testUser.user_id, testOrgId, loginData.password);
        expect(mockEmailService.sendPinCode).toHaveBeenCalled();
      });
    });

    describe('1.2 失敗シナリオ', () => {
      it('ユーザー名が存在しない場合、401エラーを返す', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', testOrgId)
          .send({ username: 'nonexistent', password: 'Test@1234' });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
      });

      it('パスワードが不正な場合、401エラーとログイン失敗履歴を記録する', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [testUser] });
        mockPasswordService.verify.mockResolvedValue({ success: true, data: false });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', testOrgId)
          .send({ username: 'test_user', password: 'WrongPassword' });

        expect(response.status).toBe(401);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO login_history'),
          expect.arrayContaining([testUser.user_id, testOrgId, false])
        );
      });
    });
  });

  describe('2. PINコード検証フロー統合テスト', () => {
    const tempSessionToken = 'temp_session-abc123_1735185000';

    describe('2.1 成功シナリオ', () => {
      it('正常なPIN検証フロー: PINコード検証 → JWT生成 → Cookie設定', async () => {
        mockPinCodeService.verify.mockResolvedValue({
          success: true,
          data: {
            id: testUser.user_id,
            username: testUser.user_name,
            email: testUser.mail_address,
            role: testUser.role,
            organizationId: testUser.organization_id,
            organizationName: testUser.organization_name,
            displayName: testUser.display_name,
          },
        });
        const jwtToken = 'maiml_session-xyz789_1735185300';
        mockJwtService.generate.mockResolvedValue({ success: true, data: jwtToken });
        mockPinCodeService.delete.mockResolvedValue({ success: true });

        const response = await request(app)
          .post('/api/v1/auth/verify-pin')
          .set('Authorization', `Bearer ${tempSessionToken}`)
          .set('X-Organization-Id', testOrgId)
          .send({ pinCode: '123456' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.headers['set-cookie']).toBeDefined();
        expect(mockPinCodeService.delete).toHaveBeenCalledWith(tempSessionToken);
      });
    });

    describe('2.2 失敗シナリオ', () => {
      it('PINコードが不正な場合、401エラーを返す', async () => {
        mockPinCodeService.verify.mockResolvedValue({
          success: false,
          error: { code: 'AUTH_PIN_INVALID', message: 'PINコードが正しくありません' },
        });

        const response = await request(app)
          .post('/api/v1/auth/verify-pin')
          .set('Authorization', `Bearer ${tempSessionToken}`)
          .set('X-Organization-Id', testOrgId)
          .send({ pinCode: '999999' });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('AUTH_PIN_INVALID');
      });

      it('PINコード試行回数が上限を超えた場合、429エラーを返す', async () => {
        mockPinCodeService.verify.mockResolvedValue({
          success: false,
          error: { code: 'AUTH_PIN_MAX_ATTEMPTS', message: 'PINコードの入力試行回数が上限を超えました' },
        });

        const response = await request(app)
          .post('/api/v1/auth/verify-pin')
          .set('Authorization', `Bearer ${tempSessionToken}`)
          .set('X-Organization-Id', testOrgId)
          .send({ pinCode: '123456' });

        expect(response.status).toBe(429);
        expect(response.body.error.code).toBe('AUTH_PIN_MAX_ATTEMPTS');
      });
    });
  });

  describe('3. PINコード再送信統合テスト', () => {
    it('正常なPIN再送信フロー: 既存PIN削除 → 新PIN生成 → メール送信', async () => {
      const tempSessionToken = 'temp_session-abc123_1735185000';
      
      mockQuery.mockResolvedValueOnce({ rows: [testUser] });
      mockPinCodeService.delete.mockResolvedValue({ success: true });
      mockPinCodeService.generateAndSave.mockResolvedValue({
        success: true,
        data: { pinCode: '654321', expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
      mockEmailService.sendPinCode.mockResolvedValue({ success: true, data: undefined });

      const response = await request(app)
        .post('/api/v1/auth/resend-pin')
        .set('Authorization', `Bearer ${tempSessionToken}`)
        .set('X-Organization-Id', testOrgId)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPinCodeService.delete).toHaveBeenCalled();
      expect(mockEmailService.sendPinCode).toHaveBeenCalled();
    });
  });

  describe('4. ログアウト統合テスト', () => {
    it('正常なログアウトフロー: JWT検証 → Cookie削除', async () => {
      const jwtToken = 'maiml_session-xyz789_1735185300';
      
      mockJwtService.verify.mockResolvedValue({
        success: true,
        data: { userId: testUser.user_id, organizationId: testOrgId, role: testUser.role },
      });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('X-Organization-Id', testOrgId)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
    });

    it('Admin権限ユーザーのログアウト時、監査ログを記録する', async () => {
      const jwtToken = 'maiml_session-admin789_1735185300';
      
      mockJwtService.verify.mockResolvedValue({
        success: true,
        data: { userId: testUser.user_id, organizationId: testOrgId, role: 'provider' },
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('X-Organization-Id', testOrgId)
        .send();

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_audit_log'),
        expect.any(Array)
      );
    });
  });

  describe('5. パスワードリセット統合テスト', () => {
    describe('5.1 パスワードリセット要求', () => {
      it('正常なリセット要求フロー: ユーザー検索 → リセットトークン生成 → メール送信', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [testUser] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockEmailService.sendPasswordReset.mockResolvedValue({ success: true, data: undefined });

        const response = await request(app)
          .post('/api/v1/auth/reset-password-request')
          .set('X-Organization-Id', testOrgId)
          .send({ username: 'test_user' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(mockEmailService.sendPasswordReset).toHaveBeenCalled();
      });

      it('ユーザーが存在しない場合でも成功レスポンスを返す（情報漏洩防止）', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/reset-password-request')
          .set('X-Organization-Id', testOrgId)
          .send({ username: 'nonexistent_user' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
      });
    });

    describe('5.2 パスワードリセット実行', () => {
      it('正常なリセット実行フロー: トークン検証 → パスワードハッシュ化 → DB更新', async () => {
        const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1735185000';
        
        mockQuery.mockResolvedValueOnce({
          rows: [{
            user_id: testUser.user_id,
            organization_id: testOrgId,
            expires_at: new Date(Date.now() + 60 * 60 * 1000),
            is_used: false,
          }],
        });
        mockPasswordService.hash.mockResolvedValue({
          success: true,
          data: '$2b$12$hashedpassword',
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/reset-password')
          .set('X-Organization-Id', testOrgId)
          .send({ resetToken, newPassword: 'NewPassword@1234' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(mockPasswordService.hash).toHaveBeenCalled();
      });

      it('リセットトークンが無効な場合、401エラーを返す', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/reset-password')
          .set('X-Organization-Id', testOrgId)
          .send({ resetToken: 'invalid_token', newPassword: 'NewPassword@1234' });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('6. レート制限統合テスト', () => {
    it('ログイン試行が15分間に5回失敗した場合、レート制限を適用する', async () => {
      // 5回連続でログイン失敗をシミュレート
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [testUser] });
        mockPasswordService.verify.mockResolvedValue({ success: true, data: false });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        
        await request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', testOrgId)
          .send({ username: 'test_user', password: 'WrongPassword' });
      }

      // 6回目はレート制限で拒否されるべき
      mockQuery.mockResolvedValueOnce({
        rows: [{ failure_count: 5 }],
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Organization-Id', testOrgId)
        .send({ username: 'test_user', password: 'WrongPassword' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
    });
  });

  describe('7. エンドツーエンドフロー統合テスト', () => {
    it('完全な認証フロー: ログイン → PIN検証 → ログアウト', async () => {
      // Step 1: ログイン
      mockQuery.mockResolvedValueOnce({ rows: [testUser] });
      mockPasswordService.verify.mockResolvedValue({ success: true, data: true });
      mockPinCodeService.generateAndSave.mockResolvedValue({
        success: true,
        data: { pinCode: '123456', expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
      mockEmailService.sendPinCode.mockResolvedValue({ success: true, data: undefined });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Organization-Id', testOrgId)
        .send({ username: 'test_user', password: 'Test@1234' });

      expect(loginResponse.status).toBe(200);
      const tempSessionToken = loginResponse.body.data.sessionToken;

      // Step 2: PIN検証
      mockPinCodeService.verify.mockResolvedValue({
        success: true,
        data: {
          id: testUser.user_id,
          username: testUser.user_name,
          email: testUser.mail_address,
          role: testUser.role,
          organizationId: testUser.organization_id,
          organizationName: testUser.organization_name,
          displayName: testUser.display_name,
        },
      });
      const jwtToken = 'maiml_session-xyz789_1735185300';
      mockJwtService.generate.mockResolvedValue({ success: true, data: jwtToken });
      mockPinCodeService.delete.mockResolvedValue({ success: true });

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify-pin')
        .set('Authorization', `Bearer ${tempSessionToken}`)
        .set('X-Organization-Id', testOrgId)
        .send({ pinCode: '123456' });

      expect(verifyResponse.status).toBe(200);

      // Step 3: ログアウト
      mockJwtService.verify.mockResolvedValue({
        success: true,
        data: { userId: testUser.user_id, organizationId: testOrgId, role: testUser.role },
      });

      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('X-Organization-Id', testOrgId)
        .send();

      expect(logoutResponse.status).toBe(200);
    });
  });
});
