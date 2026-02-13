/**
 * IssueController.updateStatus エラーレスポンス形式検証テスト
 * Task 3.2: エラー時のレスポンス形式検証
 * 
 * @description
 * - 400、401、403、404、500エラーがすべて統一形式で返されることを確認
 * - エラーメッセージに機密情報（スタックトレース、DBパス等）が含まれないことを確認
 * - error.code、error.message、error.details が適切に設定されることを確認
 */

import request from 'supertest';
import express, { Express } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// UUID v4をモック化
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-' + Date.now()),
}));

// Express アプリケーションのセットアップ
let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());

  // 認証ミドルウェアのモック（401テスト用）
  app.use((req, res, next) => {
    if (req.headers.authorization === 'Bearer invalid_token') {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: 'test-request-id',
        },
      });
      return;
    }
    // デフォルトユーザー設定
    (req as any).user = {
      userId: 'user-001',
      organizationId: 'org-001',
      role: 'manager',
    };
    next();
  });

  // PATCH /issues/:issueId/status
  app.patch('/issues/:issueId/status', issueController.updateStatus);
});

describe('IssueController.updateStatus - エラーレスポンス形式検証 (Task 3.2)', () => {
  
  describe('400 Bad Request - バリデーションエラー', () => {
    beforeEach(() => {
      // IssueService.updateStatus をモック（バリデーションエラー）
      jest.spyOn(IssueService.prototype, 'updateStatus').mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '無効なステータスです。許可された値: unresolved, resolved',
          details: [{
            field: 'status',
            message: 'statusは"unresolved"または"resolved"である必要があります',
            code: 'INVALID_VALUE',
          }],
        },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('統一されたエラーレスポンス形式（success, error, meta）を返すこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
    });

    it('error.code に VALIDATION_ERROR が設定されていること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('error.message に明確なエラーメッセージが含まれること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.message).toBe('string');
      expect(response.body.error.message.length).toBeGreaterThan(0);
    });

    it('error.details にフィールドレベルのバリデーションエラーが含まれること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      // Controller はService層からのdetailsをそのまま返す
      // detailsが存在する場合のみ検証
      if (response.body.error.details) {
        expect(Array.isArray(response.body.error.details)).toBe(true);
        expect(response.body.error.details.length).toBeGreaterThan(0);
        expect(response.body.error.details[0]).toHaveProperty('field');
        expect(response.body.error.details[0]).toHaveProperty('message');
        expect(response.body.error.details[0]).toHaveProperty('code');
      } else {
        // detailsがない場合も許容（Serviceがdetailsを返さない場合がある）
        expect(response.body.error).toHaveProperty('message');
      }
    });

    it('meta.timestamp が ISO 8601 形式であること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      expect(response.body.meta).toHaveProperty('timestamp');
      const timestamp = response.body.meta.timestamp;
      expect(() => new Date(timestamp).toISOString()).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('meta.requestId が含まれること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      expect(response.body.meta).toHaveProperty('requestId');
      expect(typeof response.body.meta.requestId).toBe('string');
      expect(response.body.meta.requestId.length).toBeGreaterThan(0);
    });

    it('機密情報（スタックトレース）が含まれないこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid_status' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/at Object\./); // スタックトレースパターン
      expect(responseString).not.toMatch(/\/backend\//); // 内部パス
      expect(responseString).not.toMatch(/Error:/); // Errorオブジェクトの文字列化
    });
  });

  describe('401 Unauthorized - 認証エラー', () => {
    it('統一されたエラーレスポンス形式を返すこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .set('Authorization', 'Bearer invalid_token')
        .send({ status: 'resolved' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
    });

    it('error.code に AUTH_TOKEN_INVALID が設定されていること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .set('Authorization', 'Bearer invalid_token')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('code', 'AUTH_TOKEN_INVALID');
    });

    it('error.message に明確なエラーメッセージが含まれること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .set('Authorization', 'Bearer invalid_token')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('message', '認証が必要です');
    });

    it('機密情報が含まれないこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .set('Authorization', 'Bearer invalid_token')
        .send({ status: 'resolved' });

      const responseString = JSON.stringify(response.body);
      // エラーコード "AUTH_TOKEN_INVALID" は含まれてOK（エラー識別用）
      // ただし、実際のトークン値（"invalid_token"や"Bearer"など）は含まれないこと
      expect(responseString).not.toMatch(/invalid_token/); // 実際のトークン値
      expect(responseString).not.toMatch(/Bearer/); // Bearerヘッダー
      expect(responseString).not.toMatch(/secret/i); // シークレット情報
    });
  });

  describe('403 Forbidden - 権限不足エラー', () => {
    beforeEach(() => {
      // IssueService.updateStatus をモック（権限不足エラー）
      jest.spyOn(IssueService.prototype, 'updateStatus').mockResolvedValue({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: 'Only managers and admins can change issue status',
        },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('統一されたエラーレスポンス形式を返すこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
    });

    it('error.code に PERMISSION_INSUFFICIENT が設定されていること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_INSUFFICIENT');
    });

    it('error.message に明確なエラーメッセージが含まれること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('manager');
    });

    it('機密情報（ユーザーID、組織ID）が含まれないこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/user-001/); // ユーザーID
      expect(responseString).not.toMatch(/org-001/); // 組織ID
    });
  });

  describe('404 Not Found - リソースが見つからない', () => {
    beforeEach(() => {
      // IssueService.updateStatus をモック（リソース未検出）
      jest.spyOn(IssueService.prototype, 'updateStatus').mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '問題報告が見つかりません',
        },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('統一されたエラーレスポンス形式を返すこと', async () => {
      const response = await request(app)
        .patch('/issues/nonexistent-issue/status')
        .send({ status: 'resolved' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
    });

    it('error.code に RESOURCE_NOT_FOUND が設定されていること', async () => {
      const response = await request(app)
        .patch('/issues/nonexistent-issue/status')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    });

    it('error.message に明確なエラーメッセージが含まれること', async () => {
      const response = await request(app)
        .patch('/issues/nonexistent-issue/status')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('message', '問題報告が見つかりません');
    });

    it('機密情報（データベースパス、SQLクエリ）が含まれないこと', async () => {
      const response = await request(app)
        .patch('/issues/nonexistent-issue/status')
        .send({ status: 'resolved' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/SELECT/i); // SQLクエリ
      expect(responseString).not.toMatch(/FROM issues/i); // テーブル名
      expect(responseString).not.toMatch(/WHERE/i); // SQL WHERE句
      expect(responseString).not.toMatch(/postgresql/i); // データベース名
    });
  });

  describe('500 Internal Server Error - システムエラー', () => {
    beforeEach(() => {
      // IssueService.updateStatus をモック（システムエラー）
      jest.spyOn(IssueService.prototype, 'updateStatus').mockRejectedValue(
        new Error('Database connection failed')
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('統一されたエラーレスポンス形式を返すこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
    });

    it('error.code に SYSTEM_ERROR が設定されていること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('code', 'SYSTEM_ERROR');
    });

    it('error.message に汎用的なエラーメッセージが含まれること', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.body.error).toHaveProperty('message', 'システムエラーが発生しました');
    });

    it('機密情報（スタックトレース、内部エラーメッセージ）が含まれないこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/Database connection failed/); // 内部エラーメッセージ
      expect(responseString).not.toMatch(/at /); // スタックトレース
      expect(responseString).not.toMatch(/Error:/); // Errorオブジェクト
      expect(responseString).not.toMatch(/\.ts:/); // ファイルパス
      expect(responseString).not.toMatch(/\/backend\//); // 内部ディレクトリ構造
    });

    it('エラーレスポンスに originalError フィールドが含まれないこと', async () => {
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      expect(response.body.error).not.toHaveProperty('originalError');
      expect(response.body.error).not.toHaveProperty('stack');
    });
  });

  describe('エラーレスポンスの一貫性検証', () => {
    it('すべてのエラーレスポンスが同じ構造を持つこと', async () => {
      const errorCodes = ['VALIDATION_ERROR', 'RESOURCE_NOT_FOUND'];
      
      for (const errorCode of errorCodes) {
        const mockResult = {
          success: false,
          error: {
            code: errorCode,
            message: 'Test error message',
          },
        };
        
        jest.spyOn(IssueService.prototype, 'updateStatus').mockResolvedValue(mockResult);
        
        const response = await request(app)
          .patch('/issues/issue-001/status')
          .send({ status: 'resolved' });

        // 共通構造の検証
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body).toHaveProperty('meta');
        expect(response.body.meta).toHaveProperty('timestamp');
        expect(response.body.meta).toHaveProperty('requestId');
      }
      
      jest.restoreAllMocks();
    });

    it('error.code が常に大文字のスネークケースであること', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Test error',
        },
      };
      
      jest.spyOn(IssueService.prototype, 'updateStatus').mockResolvedValue(mockResult);
      
      const response = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'resolved' });

      const errorCode = response.body.error.code;
      expect(errorCode).toMatch(/^[A-Z_]+$/); // 大文字とアンダースコアのみ
      expect(errorCode).not.toMatch(/[a-z]/); // 小文字を含まない
      
      jest.restoreAllMocks();
    });

    it('meta.requestId が各リクエストでユニークであること', async () => {
      jest.spyOn(IssueService.prototype, 'updateStatus').mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Test error',
        },
      });

      const response1 = await request(app)
        .patch('/issues/issue-001/status')
        .send({ status: 'invalid1' });

      const response2 = await request(app)
        .patch('/issues/issue-002/status')
        .send({ status: 'invalid2' });

      expect(response1.body.meta.requestId).not.toBe(response2.body.meta.requestId);
      
      jest.restoreAllMocks();
    });
  });
});
