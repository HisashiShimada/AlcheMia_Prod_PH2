/**
 * Worker Instructions API - エラーハンドリングテスト（簡易版）
 * タスク3.1: エラーハンドリングの実装
 */

import { Request, Response } from 'express';
import { getWorkerInstructions } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';
import * as logger from '../../src/utils/logger';

// モックの設定
jest.mock('../../src/services/projectService');
jest.mock('../../src/utils/logger');

describe('Worker Instructions API - Error Handling (Task 3.1)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('バリデーションエラー（400）', () => {
    it('projectNameが空の場合、400エラーを返す', async () => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-123',
        } as any,
        params: {
          projectName: '',
        },
        query: {},
        headers: {},
      };

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('projectName'),
          }),
        })
      );
    });

    it('projectNameに不正な文字が含まれる場合、400エラーを返す', async () => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-123',
        } as any,
        params: {
          projectName: 'invalid@project',
        },
        query: {},
        headers: {},
      };

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('不正な文字'),
          }),
        })
      );
    });

    it('taskNoが数値でない場合、400エラーを返す', async () => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-123',
        } as any,
        params: {
          projectName: 'test-project',
        },
        query: {
          taskNo: 'invalid',
        },
        headers: {},
      };

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('taskNo'),
          }),
        })
      );
    });

    it('isAcknowledgedが不正な値の場合、400エラーを返す', async () => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-123',
        } as any,
        params: {
          projectName: 'test-project',
        },
        query: {
          isAcknowledged: 'invalid',
        },
        headers: {},
      };

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('isAcknowledged'),
          }),
        })
      );
    });
  });

  describe('認証エラー（401）', () => {
    it('認証情報がない場合、401エラーを返す', async () => {
      mockRequest = {
        params: {
          projectName: 'test-project',
        },
        query: {},
        headers: {},
      };

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
            message: '認証が必要です',
          }),
        })
      );
    });
  });

  describe('システムエラー（500）', () => {
    it('Service層でエラーが発生した場合、500エラーを返す', async () => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-123',
        } as any,
        params: {
          projectName: 'test-project',
        },
        query: {},
        headers: {},
      };

      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(new Error('Database error'));

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR',
            message: 'システムエラーが発生しました',
          }),
        })
      );

      // ログが記録されることを確認
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  describe('エラーログ記録', () => {
    it('バリデーションエラー時にログが記録される', async () => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-123',
        } as any,
        params: {
          projectName: 'invalid@project',
        },
        query: {},
        headers: {},
      };

      await getWorkerInstructions(mockRequest as Request, mockResponse as Response);

      expect(logger.logError).toHaveBeenCalled();
      const callArgs = (logger.logError as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('validation error');
      expect(callArgs[2]).toMatchObject({
        action: 'worker_instructions_list',
        organizationId: 'org-123',
      });
    });
  });
});