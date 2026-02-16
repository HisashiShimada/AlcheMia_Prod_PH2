/**
 * IssueController.updateStatus - レスポンス形式検証
 * Task 3.1: 成功時のレスポンス形式検証
 * 
 * @description
 * - 200 OKレスポンスが統一形式（success、data、meta）で返されることを確認
 * - resolved時に resolvedBy、resolvedByName、resolvedAt が含まれることを確認
 * - unresolved時に resolvedBy、resolvedByName、resolvedAt が空文字列になることを確認
 * - meta.timestamp と meta.requestId が含まれることを確認
 */

import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// モック化
jest.mock('../../src/services/issueService');

// UUID v4を実際に生成するヘルパー
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    uuidCounter++;
    // UUID v4形式の文字列を生成（テスト用）
    const hex = uuidCounter.toString(16).padStart(12, '0');
    return `12345678-1234-4${hex.substring(0, 3)}-a${hex.substring(3, 6)}-${hex.substring(6, 12)}${uuidCounter.toString(16).padStart(6, '0')}`;
  }),
}));

describe('IssueController.updateStatus - Response Format (Task 3.1)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // レスポンスモックの設定
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // リクエストモックの基本設定
    mockRequest = {
      user: {
        userId: 'user_001',
        organizationId: 'org_001',
        role: 'manager',
      } as any,
      params: {
        issueId: 'issue_001',
      },
      body: {
        status: 'resolved',
      },
    };
  });

  describe('✅ 正常系: レスポンス形式の統一性', () => {
    it('should return 200 OK with unified response format (success, data, meta)', async () => {
      // Arrange: Serviceが成功を返す
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'resolved',
          resolvedBy: 'user_001',
          resolvedByName: 'テストユーザー',
          resolvedAt: '2026-02-13T06:15:00.000Z',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: 200ステータスコード
      expect(mockStatus).toHaveBeenCalledWith(200);

      // Assert: レスポンス形式
      expect(mockJson).toHaveBeenCalledTimes(1);
      const responseBody = mockJson.mock.calls[0][0];

      // success フィールドの検証
      expect(responseBody).toHaveProperty('success', true);

      // data フィールドの検証
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toMatchObject({
        id: 'issue_001',
        status: 'resolved',
        resolvedBy: 'user_001',
        resolvedByName: 'テストユーザー',
        resolvedAt: '2026-02-13T06:15:00.000Z',
        updatedAt: '2026-02-13T06:15:00.000Z',
      });

      // meta フィールドの検証
      expect(responseBody).toHaveProperty('meta');
      expect(responseBody.meta).toHaveProperty('timestamp');
      expect(responseBody.meta).toHaveProperty('requestId');

      // timestamp が ISO 8601 形式であることを確認
      expect(responseBody.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // requestId が UUID 形式であることを確認
      expect(responseBody.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('✅ 正常系: resolved時のフィールド検証', () => {
    it('should include resolvedBy, resolvedByName, resolvedAt when status is "resolved"', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'resolved',
          resolvedBy: 'user_001',
          resolvedByName: 'テストユーザー',
          resolvedAt: '2026-02-13T06:15:00.000Z',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      mockRequest.body = { status: 'resolved' };

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const responseBody = mockJson.mock.calls[0][0];

      expect(responseBody.data).toHaveProperty('resolvedBy');
      expect(responseBody.data.resolvedBy).toBe('user_001');

      expect(responseBody.data).toHaveProperty('resolvedByName');
      expect(responseBody.data.resolvedByName).toBe('テストユーザー');

      expect(responseBody.data).toHaveProperty('resolvedAt');
      expect(responseBody.data.resolvedAt).toBe('2026-02-13T06:15:00.000Z');
      expect(responseBody.data.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include non-empty resolvedBy, resolvedByName, resolvedAt for resolved status', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_002',
          status: 'resolved',
          resolvedBy: 'admin_001',
          resolvedByName: '管理者ユーザー',
          resolvedAt: '2026-02-13T07:30:00.000Z',
          updatedAt: '2026-02-13T07:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const responseBody = mockJson.mock.calls[0][0];

      expect(responseBody.data.resolvedBy).not.toBe('');
      expect(responseBody.data.resolvedByName).not.toBe('');
      expect(responseBody.data.resolvedAt).not.toBe('');
    });
  });

  describe('✅ 正常系: unresolved時のフィールド検証', () => {
    it('should return empty strings for resolvedBy, resolvedByName, resolvedAt when status is "unresolved"', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'unresolved',
          resolvedBy: '',
          resolvedByName: '',
          resolvedAt: '',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      mockRequest.body = { status: 'unresolved' };

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const responseBody = mockJson.mock.calls[0][0];

      expect(responseBody.data).toHaveProperty('resolvedBy', '');
      expect(responseBody.data).toHaveProperty('resolvedByName', '');
      expect(responseBody.data).toHaveProperty('resolvedAt', '');
    });

    it('should have exactly empty strings (not null or undefined) for unresolved status', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_003',
          status: 'unresolved',
          resolvedBy: '',
          resolvedByName: '',
          resolvedAt: '',
          updatedAt: '2026-02-13T08:00:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const responseBody = mockJson.mock.calls[0][0];

      // 空文字列であることを厳密にチェック
      expect(responseBody.data.resolvedBy).toBe('');
      expect(responseBody.data.resolvedBy).not.toBeNull();
      expect(responseBody.data.resolvedBy).not.toBeUndefined();

      expect(responseBody.data.resolvedByName).toBe('');
      expect(responseBody.data.resolvedByName).not.toBeNull();
      expect(responseBody.data.resolvedByName).not.toBeUndefined();

      expect(responseBody.data.resolvedAt).toBe('');
      expect(responseBody.data.resolvedAt).not.toBeNull();
      expect(responseBody.data.resolvedAt).not.toBeUndefined();
    });
  });

  describe('✅ 正常系: meta フィールドの検証', () => {
    it('should always include meta.timestamp in ISO 8601 format', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'resolved',
          resolvedBy: 'user_001',
          resolvedByName: 'テストユーザー',
          resolvedAt: '2026-02-13T06:15:00.000Z',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const responseBody = mockJson.mock.calls[0][0];

      expect(responseBody.meta).toHaveProperty('timestamp');
      expect(typeof responseBody.meta.timestamp).toBe('string');
      
      // ISO 8601 形式の検証
      const timestamp = new Date(responseBody.meta.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(responseBody.meta.timestamp);
    });

    it('should always include meta.requestId in UUID format', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'resolved',
          resolvedBy: 'user_001',
          resolvedByName: 'テストユーザー',
          resolvedAt: '2026-02-13T06:15:00.000Z',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const responseBody = mockJson.mock.calls[0][0];

      expect(responseBody.meta).toHaveProperty('requestId');
      expect(typeof responseBody.meta.requestId).toBe('string');
      
      // UUID v4 形式の検証
      expect(responseBody.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique requestId for each request', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'resolved',
          resolvedBy: 'user_001',
          resolvedByName: 'テストユーザー',
          resolvedAt: '2026-02-13T06:15:00.000Z',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act: 2回呼び出し
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );
      const firstRequestId = mockJson.mock.calls[0][0].meta.requestId;

      // レスポンスモックをリセット
      mockJson.mockClear();
      mockStatus.mockClear();

      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );
      const secondRequestId = mockJson.mock.calls[0][0].meta.requestId;

      // Assert: requestIdが異なることを確認
      expect(firstRequestId).not.toBe(secondRequestId);
    });
  });

  describe('✅ 正常系: レスポンスの完全性', () => {
    it('should include all required fields in success response', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'issue_001',
          status: 'resolved',
          resolvedBy: 'user_001',
          resolvedByName: 'テストユーザー',
          resolvedAt: '2026-02-13T06:15:00.000Z',
          updatedAt: '2026-02-13T06:15:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: すべての必須フィールドが含まれることを確認
      const responseBody = mockJson.mock.calls[0][0];

      expect(responseBody).toEqual({
        success: true,
        data: {
          id: expect.any(String),
          status: expect.stringMatching(/^(resolved|unresolved)$/),
          resolvedBy: expect.any(String),
          resolvedByName: expect.any(String),
          resolvedAt: expect.any(String),
          updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        },
        meta: {
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          requestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
        },
      });
    });
  });
});
