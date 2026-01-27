/**
 * ProjectController.getById ユニットテスト (TDD: RED phase)
 */

import { Request, Response } from 'express';
import * as projectController from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

jest.mock('../../src/services/projectService');
jest.mock('uuid', () => ({ v4: () => 'test-request-id-123' }));
jest.mock('../../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({
      rows: [{ organization_name: 'Test_Org' }]
    })
  }))
}));

describe('ProjectController.getById', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockRequest = {
      params: { projectId: 'b1234567-89ab-cdef-0123-456789abcdef' },
      headers: { 'x-organization-id': 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385' },
      user: {
        organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        userId: 'user_123',
        role: 'experiment_admin',
        sessionId: 'session_123',
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as any,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Task 2.1: should retrieve project details successfully', async () => {
    const mockServiceResult = {
      success: true,
      data: {
        project: { projectId: 'b1234567-89ab-cdef-0123-456789abcdef', projectName: 'Test' },
        files: [],
        tasks: [],
        summary: { totalFiles: 0, totalTasks: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0 }
      }
    };

    (ProjectService.prototype.getById as jest.Mock).mockResolvedValue(mockServiceResult);

    await projectController.getById(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockServiceResult.data,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String)
        })
      })
    );
  });

  it('Task 2.1: should return 404 when project not found', async () => {
    (ProjectService.prototype.getById as jest.Mock).mockResolvedValue({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: 'プロジェクトが見つかりません' }
    });

    await projectController.getById(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND'
        })
      })
    );
  });

  it('Task 2.1: should return 400 for invalid UUID', async () => {
    mockRequest.params = { projectId: 'invalid-uuid' };

    await projectController.getById(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_INVALID_FORMAT'
        })
      })
    );
  });
});
