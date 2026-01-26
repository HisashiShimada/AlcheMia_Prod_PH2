/**
 * ProjectController.getProjectFiles Tests
 * 
 * TDD: Task 2.2 - Controller Layer Tests
 */

import { Request, Response } from 'express';
import * as projectController from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

jest.mock('../../src/services/projectService');
jest.mock('../../src/database/db');
jest.mock('../../src/utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('ProjectController.getProjectFiles', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      params: { projectId: '123e4567-e89b-12d3-a456-426614174000' },
      query: {},
      user: {
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'experiment_admin',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('ファイル一覧を正常に返す', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ organization_name: 'test org' }],
      });

      const mockServiceResult = {
        success: true,
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          projectName: 'Test Project',
          files: [
            {
              id: 'file-1',
              name: 'test.maiml',
              size: 1024,
              signedUrl: 'https://signed-url.example.com',
            },
          ],
          archiveFiles: [],
        },
      };

      ProjectService.prototype.getProjectFiles = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            projectName: 'Test Project',
            files: expect.arrayContaining([
              expect.objectContaining({
                id: 'file-1',
                name: 'test.maiml',
              }),
            ]),
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('include_archive=true の場合、アーカイブファイルも取得する', async () => {
      // Arrange
      mockRequest.query = { include_archive: 'true' };

      mockQuery.mockResolvedValueOnce({
        rows: [{ organization_name: 'test org' }],
      });

      const mockServiceResult = {
        success: true,
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          projectName: 'Test Project',
          files: [{ id: 'file-1', name: 'test.maiml' }],
          archiveFiles: [{ id: 'archive-1', name: 'test_v1.maiml', version: 1 }],
        },
      };

      ProjectService.prototype.getProjectFiles = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            archiveFiles: expect.arrayContaining([
              expect.objectContaining({
                id: 'archive-1',
                name: 'test_v1.maiml',
                version: 1,
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('異常系', () => {
    it('認証エラー時、401を返す', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
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

    it('projectIdがUUID形式でない場合、400を返す', async () => {
      // Arrange
      mockRequest.params = { projectId: 'invalid-uuid' };

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: expect.stringContaining('UUID形式'),
          }),
        })
      );
    });

    it('プロジェクトが存在しない場合、404を返す', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ organization_name: 'test org' }],
      });

      const mockServiceResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      };

      ProjectService.prototype.getProjectFiles = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
          }),
        })
      );
    });

    it('組織情報が見つからない場合、404を返す', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
            message: expect.stringContaining('組織情報'),
          }),
        })
      );
    });

    it('システムエラー時、500を返す', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Act
      await projectController.getProjectFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
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
    });
  });
});