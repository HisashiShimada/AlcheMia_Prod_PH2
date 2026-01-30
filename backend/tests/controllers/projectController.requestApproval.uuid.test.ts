/**
 * ProjectController.requestApproval UUID Validation Tests
 * 
 * @description UUID検証の強化テスト
 * Task: 5.2.3 UUIDバリデーションの強化
 * Requirements: 14
 * 
 * TDD Phase: RED - 不正なUUID形式のテストを作成
 */

import { Request, Response } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// モック設定
jest.mock('../../src/services/projectService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id'),
}));
jest.mock('../../src/utils/logger', () => ({
  logError: jest.fn(),
}));

describe('ProjectController.requestApproval - UUID Validation (Task 5.2.3)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: {
        organizationId: 'org-123',
        userId: 'user-123',
        role: 'experiment_worker',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      params: {
        projectId: '', // テストケースごとに設定
      },
      body: {
        comment: 'テストコメント',
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('不正なUUID形式の検証', () => {
    test('短すぎるUUIDを拒否する（32文字未満）', async () => {
      // Arrange
      mockRequest.params = { projectId: '123e4567-e89b-12d3-a456-42661417' }; // 31文字（最後の4文字不足）

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'projectIdはUUID形式である必要があります',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'projectId',
                code: 'INVALID_FORMAT',
              }),
            ]),
          }),
        })
      );
      expect(ProjectService).not.toHaveBeenCalled();
    });

    test('長すぎるUUIDを拒否する（36文字超過）', async () => {
      // Arrange
      mockRequest.params = { projectId: '123e4567-e89b-12d3-a456-426614174000-extra' }; // 余分な文字

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'projectIdはUUID形式である必要があります',
          }),
        })
      );
      expect(ProjectService).not.toHaveBeenCalled();
    });

    test('無効な文字を含むUUIDを拒否する（G文字）', async () => {
      // Arrange
      mockRequest.params = { projectId: '123e4567-e89b-12d3-a456-42661417400g' }; // 'g'は16進数ではない

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'projectIdはUUID形式である必要があります',
          }),
        })
      );
      expect(ProjectService).not.toHaveBeenCalled();
    });

    test('ハイフンの位置が間違っているUUIDを拒否する', async () => {
      // Arrange
      mockRequest.params = { projectId: '123e4567e89b-12d3-a456-426614174000' }; // 最初のハイフンが欠落

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
          }),
        })
      );
      expect(ProjectService).not.toHaveBeenCalled();
    });

    test('空文字列のUUIDを拒否する', async () => {
      // Arrange
      mockRequest.params = { projectId: '' };

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
          }),
        })
      );
      expect(ProjectService).not.toHaveBeenCalled();
    });

    test('スペースを含むUUIDを拒否する', async () => {
      // Arrange
      mockRequest.params = { projectId: '123e4567 e89b 12d3 a456 426614174000' }; // スペース含む

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
          }),
        })
      );
      expect(ProjectService).not.toHaveBeenCalled();
    });
  });

  describe('正常なUUID形式の検証（既存の機能確認）', () => {
    test('小文字のUUIDを受け入れる', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { projectId: validUuid };

      const mockProjectService = {
        requestApproval: jest.fn().mockResolvedValue({
          success: true,
          data: {
            project_id: validUuid,
            new_status: 'waiting_approval',
          },
        }),
      };
      (ProjectService as jest.Mock).mockImplementation(() => mockProjectService);

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockProjectService.requestApproval).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    test('大文字のUUIDを受け入れる', async () => {
      // Arrange
      const validUuid = '123E4567-E89B-12D3-A456-426614174000';
      mockRequest.params = { projectId: validUuid };

      const mockProjectService = {
        requestApproval: jest.fn().mockResolvedValue({
          success: true,
          data: {
            project_id: validUuid,
            new_status: 'waiting_approval',
          },
        }),
      };
      (ProjectService as jest.Mock).mockImplementation(() => mockProjectService);

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockProjectService.requestApproval).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    test('混在ケースのUUIDを受け入れる', async () => {
      // Arrange
      const validUuid = '123e4567-E89B-12d3-A456-426614174000';
      mockRequest.params = { projectId: validUuid };

      const mockProjectService = {
        requestApproval: jest.fn().mockResolvedValue({
          success: true,
          data: {
            project_id: validUuid,
            new_status: 'waiting_approval',
          },
        }),
      };
      (ProjectService as jest.Mock).mockImplementation(() => mockProjectService);

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockProjectService.requestApproval).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });
});