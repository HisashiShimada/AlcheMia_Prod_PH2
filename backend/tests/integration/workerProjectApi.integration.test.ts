/**
 * Worker Project API Integration Tests
 * 
 * TDD: Task 5.3 - API統合テスト
 * Requirements: 1, 3, 5, 6, 7
 * 
 * Tests the complete flow including:
 * - Authentication (401)
 * - Authorization (403)
 * - Worker role filtering
 * - Status filtering
 * - Pagination
 * - Multi-tenant isolation
 */

import request from 'supertest';
import express, { Express } from 'express';
import { getPool } from '../../src/database/db';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';

// Mock dependencies
jest.mock('../../src/database/db');
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id'),
}));

describe('GET /api/v1/projects/worker-accessible - Integration Tests', () => {
  let app: Express;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test 1: 認証なしで401エラー', () => {
    it('should return 401 when no authentication token is provided', async () => {
      // Arrange: Mock auth middleware to not set req.user
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication token is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      expect(response.body.error.message).toBe('Authentication token is required');
    });

    it('should return 401 when authentication token is invalid', async () => {
      // Arrange: Mock auth middleware to reject invalid token
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid authentication token',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('Test 2: 権限なしロールで403エラー', () => {
    it('should return 403 when user has data_admin role', async () => {
      // Arrange: Mock auth with data_admin role (not allowed)
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-data-admin',
          organizationId: 'org-123',
          role: 'data_admin',
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 403 when user has provider role', async () => {
      // Arrange: Mock auth with provider role (not allowed)
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-provider',
          organizationId: 'org-123',
          role: 'provider',
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
    });
  });

  describe('Test 3: experiment_workerで自分のプロジェクトのみ取得', () => {
    it('should return only projects with assigned tasks for experiment_worker', async () => {
      // Arrange: Mock auth with experiment_worker role
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-123',
          organizationId: 'org-123',
          role: 'experiment_worker',
        };
        next();
      });

      // Mock database response: worker has tasks in 2 projects
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-1',
              project_name: 'Project A',
              description: 'Description A',
              project_status: 'in_progress',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
            {
              project_id: 'proj-2',
              project_name: 'Project B',
              description: 'Description B',
              project_status: 'pending',
              create_at: '2026-01-22T11:00:00Z',
              update_at: '2026-01-26T16:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
        });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({
        projectId: 'proj-1',
        projectName: 'Project A',
        description: 'Description A',
        projectStatus: 'in_progress',
        createdAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-25T15:30:00.000Z',
      });

      // Verify query includes INNER JOIN with project_task_detail
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN project_task_detail'),
        expect.arrayContaining(['org-123', 'worker-123'])
      );
    });

    it('should return empty array when worker has no assigned tasks', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-no-tasks',
          organizationId: 'org-123',
          role: 'experiment_worker',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.totalItems).toBe(0);
    });

    it('should allow experiment_admin to access all projects', async () => {
      // Arrange: Mock auth with experiment_admin role
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          organizationId: 'org-123',
          role: 'experiment_admin',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-1',
              project_name: 'All Project 1',
              description: '',
              project_status: 'in_progress',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
            {
              project_id: 'proj-2',
              project_name: 'All Project 2',
              description: '',
              project_status: 'pending',
              create_at: '2026-01-21T10:00:00Z',
              update_at: '2026-01-26T15:30:00Z',
            },
            {
              project_id: 'proj-3',
              project_name: 'All Project 3',
              description: '',
              project_status: 'review_waiting',
              create_at: '2026-01-22T10:00:00Z',
              update_at: '2026-01-27T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.totalItems).toBe(3);

      // Verify query does NOT include INNER JOIN for admin
      expect(mockQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('INNER JOIN project_task_detail'),
        expect.arrayContaining(['org-123'])
      );
    });

    it('should allow system_admin to access all projects', async () => {
      // Arrange: Mock auth with system_admin role
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'sysadmin-123',
          organizationId: 'org-123',
          role: 'system_admin',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-1',
              project_name: 'System Project',
              description: 'System managed',
              project_status: 'in_progress',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Test 4: statusフィルタでpendingのみ取得', () => {
    beforeEach(() => {
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-123',
          organizationId: 'org-123',
          role: 'experiment_worker',
        };
        next();
      });
    });

    it('should filter projects by status=pending', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-pending',
              project_name: 'Pending Project',
              description: '',
              project_status: 'pending',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?status=pending')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].projectStatus).toBe('pending');

      // Verify query includes status filter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("project_status = 'pending'"),
        expect.any(Array)
      );
    });

    it('should filter projects by status=in_progress', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-inprogress',
              project_name: 'In Progress Project',
              description: '',
              project_status: 'in_progress',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?status=in_progress')
        .expect(200);

      // Assert
      expect(response.body.data[0].projectStatus).toBe('in_progress');
    });

    it('should filter projects by status=review_waiting', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-review',
              project_name: 'Review Waiting Project',
              description: '',
              project_status: 'review_waiting',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?status=review_waiting')
        .expect(200);

      // Assert
      expect(response.body.data[0].projectStatus).toBe('review_waiting');
    });

    it('should return 400 for invalid status value', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?status=invalid_status')
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('status');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return all statuses when status parameter is not provided', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-1',
              project_name: 'Project 1',
              description: '',
              project_status: 'pending',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
            {
              project_id: 'proj-2',
              project_name: 'Project 2',
              description: '',
              project_status: 'in_progress',
              create_at: '2026-01-21T10:00:00Z',
              update_at: '2026-01-26T15:30:00Z',
            },
            {
              project_id: 'proj-3',
              project_name: 'Project 3',
              description: '',
              project_status: 'review_waiting',
              create_at: '2026-01-22T10:00:00Z',
              update_at: '2026-01-27T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(3);
      const statuses = response.body.data.map((p: any) => p.projectStatus);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('review_waiting');
    });
  });

  describe('Test 5: ページネーションで正しい件数取得', () => {
    beforeEach(() => {
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-123',
          organizationId: 'org-123',
          role: 'experiment_worker',
        };
        next();
      });
    });

    it('should return first page with default limit (20)', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 20 }, (_, i) => ({
        project_id: `proj-${i + 1}`,
        project_name: `Project ${i + 1}`,
        description: '',
        project_status: 'in_progress',
        create_at: '2026-01-20T10:00:00Z',
        update_at: '2026-01-25T15:30:00Z',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(20);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        totalItems: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });

      // Verify LIMIT and OFFSET
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([20, 0])
      );
    });

    it('should return second page with limit 10', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 10 }, (_, i) => ({
        project_id: `proj-${i + 11}`,
        project_name: `Project ${i + 11}`,
        description: '',
        project_status: 'in_progress',
        create_at: '2026-01-20T10:00:00Z',
        update_at: '2026-01-25T15:30:00Z',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?page=2&limit=10')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        totalItems: 30,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });

      // Verify OFFSET is calculated correctly
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET'),
        expect.arrayContaining([10, 10]) // limit=10, offset=10 (page 2)
      );
    });

    it('should return last page with hasNext=false', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 5 }, (_, i) => ({
        project_id: `proj-${i + 21}`,
        project_name: `Project ${i + 21}`,
        description: '',
        project_status: 'in_progress',
        create_at: '2026-01-20T10:00:00Z',
        update_at: '2026-01-25T15:30:00Z',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '25' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?page=3&limit=10')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        page: 3,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should return 400 for invalid page parameter', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?page=0')
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('page');
    });

    it('should return 400 for invalid limit parameter', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?limit=101')
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('limit');
    });

    it('should handle empty result set correctly', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('Test 6: マルチテナント分離（他組織のデータが混在しない）', () => {
    it('should only return projects from user organization (org-123)', async () => {
      // Arrange: User from org-123
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-org123',
          organizationId: 'org-123',
          role: 'experiment_worker',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-org123-1',
              project_name: 'Org 123 Project',
              description: '',
              project_status: 'in_progress',
              create_at: '2026-01-20T10:00:00Z',
              update_at: '2026-01-25T15:30:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);

      // Verify organization_id filter is applied
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('organization_id = $1'),
        expect.arrayContaining(['org-123'])
      );
    });

    it('should not return projects from other organizations', async () => {
      // Arrange: User from org-456
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-org456',
          organizationId: 'org-456',
          role: 'experiment_worker',
        };
        next();
      });

      // Mock: org-456 has no projects
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(0);

      // Verify organization_id filter is applied with org-456
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('organization_id = $1'),
        expect.arrayContaining(['org-456'])
      );
    });

    it('should enforce organization_id filter in INNER JOIN for workers', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-123',
          organizationId: 'org-test',
          role: 'experiment_worker',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // Assert: Both project and project_task_detail have organization_id filter
      const sqlQuery = mockQuery.mock.calls[0][0];
      expect(sqlQuery).toContain('p.organization_id = $1');
      expect(sqlQuery).toContain('ptd.organization_id = $1');
    });

    it('should reject request without organization_id', async () => {
      // Arrange: Mock auth without organizationId
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_ORGANIZATION_MISSING',
            message: 'Organization ID is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_ORGANIZATION_MISSING');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('Integration: Combined Filters', () => {
    beforeEach(() => {
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'worker-123',
          organizationId: 'org-123',
          role: 'experiment_worker',
        };
        next();
      });
    });

    it('should handle status filter + pagination together', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 10 }, (_, i) => ({
        project_id: `proj-${i + 1}`,
        project_name: `Pending Project ${i + 1}`,
        description: '',
        project_status: 'pending',
        create_at: '2026-01-20T10:00:00Z',
        update_at: '2026-01-25T15:30:00Z',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '25' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?status=pending&page=1&limit=10')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(10);
      expect(response.body.data.every((p: any) => p.projectStatus === 'pending')).toBe(true);
      expect(response.body.pagination.totalItems).toBe(25);

      // Verify both filters are applied
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("project_status = 'pending'"),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 0])
      );
    });

    it('should handle all query parameters together', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 5 }, (_, i) => ({
        project_id: `proj-${i + 1}`,
        project_name: `Pending Project ${i + 1}`,
        description: '',
        project_status: 'pending',
        create_at: '2026-01-20T10:00:00Z',
        update_at: '2026-01-25T15:30:00Z',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] });

      // Act
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible?status=pending&page=2&limit=5&sort_by=project_name&order=asc')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        totalItems: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });

      // Verify all filters are applied
      const sqlQuery = mockQuery.mock.calls[0][0];
      expect(sqlQuery).toContain("project_status = 'pending'");
      expect(sqlQuery).toContain('ORDER BY');
      expect(sqlQuery).toContain('LIMIT');
      expect(sqlQuery).toContain('OFFSET');
    });
  });
});
