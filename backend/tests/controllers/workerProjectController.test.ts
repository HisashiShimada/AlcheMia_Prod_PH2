/**
 * WorkerProjectController Unit Tests
 *
 * Updated to reflect that validation is done in middleware layer.
 */

import { Request, Response, NextFunction } from 'express';
import { WorkerProjectController } from '../../src/controllers/workerProjectController';
import { WorkerProjectService } from '../../src/services/workerProjectService';

jest.mock('../../src/services/workerProjectService');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-request-id-123') }));

describe('WorkerProjectController', () => {
  let controller: WorkerProjectController;
  let mockService: jest.Mocked<WorkerProjectService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const defaultMockResult = {
    items: [],
    pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = new WorkerProjectService() as jest.Mocked<WorkerProjectService>;
    controller = new WorkerProjectController(mockService);

    mockReq = {
      user: {
        userId: 'user-123',
        role: 'experiment_worker',
        organizationId: 'org-456',
        organizationGroupCds: ['group-A'],
      } as any,
      query: {},
      headers: { 'x-request-id': 'req-789' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('listWorkerAccessible', () => {
    describe('service call', () => {
      test('calls service with correct parameters', async () => {
        mockReq.query = { page: '2', limit: '10', status: '1', sort_by: 'project_name', order: 'asc' };
        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(defaultMockResult);

        await controller.listWorkerAccessible(mockReq as Request, mockRes as Response, mockNext);

        expect(mockService.listWorkerAccessible).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          ['group-A'],
          { page: 2, limit: 10, status: '1', sortBy: 'project_name', order: 'asc' }
        );
      });

      test('uses default values when query params are absent', async () => {
        mockReq.query = {};
        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(defaultMockResult);

        await controller.listWorkerAccessible(mockReq as Request, mockRes as Response, mockNext);

        expect(mockService.listWorkerAccessible).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          ['group-A'],
          { page: 1, limit: 20, status: undefined, sortBy: 'create_at', order: 'desc' }
        );
      });

      test('returns 200 with data on success', async () => {
        const mockResult = {
          items: [{ projectId: 'proj-1', projectName: 'Test', description: '', projectStatus: 2, useDeemedProgress: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }],
          pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1, hasNext: false, hasPrev: false },
        };
        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(mockResult);

        await controller.listWorkerAccessible(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockResult.items,
          pagination: mockResult.pagination,
          meta: { timestamp: expect.any(String), requestId: 'req-789' },
        });
      });
    });

    describe('error handling', () => {
      test('rethrows error from service', async () => {
        const dbError = new Error('Database connection failed');
        mockService.listWorkerAccessible = jest.fn().mockRejectedValue(dbError);

        await expect(
          controller.listWorkerAccessible(mockReq as Request, mockRes as Response, mockNext)
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('organizationGroupCds from req.user', () => {
      test('uses empty array when organizationGroupCds is undefined', async () => {
        mockReq.user = { userId: 'user-123', organizationId: 'org-456' } as any;
        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(defaultMockResult);

        await controller.listWorkerAccessible(mockReq as Request, mockRes as Response, mockNext);

        expect(mockService.listWorkerAccessible).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          [],
          expect.any(Object)
        );
      });

      test('passes organizationGroupCds from JWT', async () => {
        mockReq.user = { userId: 'user-123', organizationId: 'org-456', organizationGroupCds: ['grp-1', 'grp-2'] } as any;
        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(defaultMockResult);

        await controller.listWorkerAccessible(mockReq as Request, mockRes as Response, mockNext);

        expect(mockService.listWorkerAccessible).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          ['grp-1', 'grp-2'],
          expect.any(Object)
        );
      });
    });
  });
});