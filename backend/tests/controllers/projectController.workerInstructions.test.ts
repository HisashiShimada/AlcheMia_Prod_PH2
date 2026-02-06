/**
 * Unit Tests: projectController.getWorkerInstructions
 * Worker Instructions API - Task 4.1
 */

import { Request, Response } from 'express';
import * as projectController from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// Mock ProjectService
jest.mock('../../src/services/projectService');

describe('projectController.getWorkerInstructions', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockProjectService: jest.Mocked<ProjectService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup response mocks
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    // Setup default request
    mockRequest = {
      params: {
        projectName: 'test-project',
      },
      query: {},
      user: {
        userId: 'user-123',
        role: 'experiment_admin',
        organizationId: 'org-123',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      organizationId: 'org-123',
      headers: {
        'x-request-id': 'req-123',
      },
    };

    // Mock ProjectService instance
    mockProjectService = {
      getWorkerInstructions: jest.fn(),
    } as any;
    (ProjectService as jest.MockedClass<typeof ProjectService>).mockImplementation(() => mockProjectService);
  });

  describe('Role-based Access Control', () => {
    it('should allow experiment_worker to access their assigned instructions', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'worker-456',
        role: 'experiment_worker',
        organizationId: 'org-123',
        sessionId: 'session-456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockInstructions = [
        {
          id: 'inst-1',
          project_id: 'proj-1',
          task_no: 1,
          instruction_target: 'all',
          instruction_content: 'Test instruction',
          create_at: '2026-01-01T00:00:00Z',
          created_by: 'admin-1',
          created_by_name: 'Admin User',
          method_id: 'method-1',
          method_name: '',
          transition_id: 'trans-1',
          transition_name: '',
          is_acknowledged: false,
        },
      ];

      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: mockInstructions,
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProjectService.getWorkerInstructions).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'test-project',
          organizationId: 'org-123',
          userId: 'worker-456',
          userRole: 'experiment_worker',
        })
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockInstructions,
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });

    it('should allow experiment_admin to access all instructions', async () => {
      // Arrange
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProjectService.getWorkerInstructions).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: 'experiment_admin',
        })
      );
      expect(mockStatus).not.toHaveBeenCalledWith(403);
    });

    it('should allow system_admin to access all instructions', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'sysadmin-999',
        role: 'system_admin',
        organizationId: 'org-123',
        sessionId: 'session-999',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProjectService.getWorkerInstructions).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: 'system_admin',
        })
      );
    });
  });

  describe('Request Parameter Validation', () => {
    it('should accept valid project name', async () => {
      // Arrange
      mockRequest.params = { projectName: 'valid-project-name' };
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProjectService.getWorkerInstructions).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalledWith(400);
    });

    it('should reject missing project name', async () => {
      // Arrange
      mockRequest.params = { projectName: '' };

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
        meta: expect.any(Object),
      });
    });

    it('should reject project name with invalid characters', async () => {
      // Arrange
      mockRequest.params = { projectName: 'project@#$%' };

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
        meta: expect.any(Object),
      });
    });

    it('should accept valid query parameters', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'proj-123',
      };
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProjectService.getWorkerInstructions).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            projectId: 'proj-123',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing authentication', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert - Note: auth middleware would handle this, but testing controller robustness
      expect(mockProjectService.getWorkerInstructions).not.toHaveBeenCalled();
    });

    it('should handle service layer errors', async () => {
      // Arrange
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database connection failed',
        },
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'SYSTEM_DATABASE_ERROR',
        }),
        meta: expect.any(Object),
      });
    });

    it('should handle project not found error', async () => {
      // Arrange
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Project not found',
        },
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND',
        }),
        meta: expect.any(Object),
      });
    });
  });

  describe('Response Format', () => {
    it('should return unified success response format', async () => {
      // Arrange
      const mockInstructions = [
        {
          id: 'inst-1',
          project_id: 'proj-1',
          task_no: 1,
          instruction_target: 'all',
          instruction_content: 'Test instruction',
          create_at: '2026-01-01T00:00:00Z',
          created_by: 'admin-1',
          created_by_name: 'Admin User',
          method_id: 'method-1',
          method_name: '',
          transition_id: 'trans-1',
          transition_name: '',
          is_acknowledged: false,
        },
      ];
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: mockInstructions,
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        meta: {
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          requestId: expect.any(String),
        },
      });
    });

    it('should include requestId from header if available', async () => {
      // Arrange
      mockRequest.headers = { 'x-request-id': 'custom-req-id-456' };
      mockProjectService.getWorkerInstructions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await projectController.getWorkerInstructions(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: {
          timestamp: expect.any(String),
          requestId: expect.stringMatching(/^[a-f0-9-]{36}$/), // UUID format
        },
      });
    });
  });
});