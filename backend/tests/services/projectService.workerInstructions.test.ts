/**
 * Unit Tests: projectService.getWorkerInstructions
 * Worker Instructions API - Task 4.1
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// Mock database
jest.mock('../../src/database/db');

describe('ProjectService.getWorkerInstructions', () => {
  let projectService: ProjectService;
  let mockQuery: jest.Mock;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };
    
    (getPool as jest.Mock).mockReturnValue(mockPool);
    projectService = new ProjectService();
  });

  describe('Database Query Construction', () => {
    it('should build query with organization_id filter (multi-tenant isolation)', async () => {
      // Arrange
      const projectName = 'test-project';
      const organizationId = 'org-123';
      const params = {
        projectName,
        organizationId,
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0];
      const sql = queryCall[0];
      const queryParams = queryCall[1];

      // organization_id should be in parameters
      expect(queryParams).toContain(organizationId);
      // SQL should filter by organization_id
      expect(sql).toContain('organization_id');
    });

    it('should filter by project name', async () => {
      // Arrange
      const projectName = 'specific-project';
      const params = {
        projectName,
        organizationId: 'org-123',
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const queryParams = queryCall[1];
      expect(queryParams).toContain(projectName);
    });

    it('should order by create_at DESC', async () => {
      // Arrange
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const sql = queryCall[0];
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('create_at DESC');
    });
  });

  describe('Experiment Worker Filtering', () => {
    it('should join with project_task for experiment_worker role', async () => {
      // Arrange
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'worker-789',
        userRole: 'experiment_worker',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const sql = queryCall[0];
      expect(sql).toContain('project_task');
    });

    it('should filter by assign_user_id for experiment_worker', async () => {
      // Arrange
      const workerId = 'worker-789';
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: workerId,
        userRole: 'experiment_worker',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const queryParams = queryCall[1];
      expect(queryParams).toContain(workerId);
    });

    it('should NOT join project_task for experiment_admin', async () => {
      // Arrange
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'admin-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const sql = queryCall[0];
      // For non-workers, should not have INNER JOIN on project_task
      expect(sql).not.toContain('INNER JOIN project_task');
    });
  });

  describe('Dynamic Filter Application', () => {
    it('should apply projectId filter when provided', async () => {
      // Arrange
      const projectId = 'proj-abc';
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {
          projectId,
        },
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await projectService.getWorkerInstructions(params);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const queryParams = queryCall[1];
      expect(queryParams).toContain(projectId);
    });
  });

  describe('Data Mapping and Return Value', () => {
    it('should return instructions with correct structure', async () => {
      // Arrange
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      const mockDbResult = [
        {
          id: 'inst-1',
          project_id: 'proj-1',
          project_name: 'test-project',
          method_id: 'method-1',
          transition_id: 'trans-1',
          task_no: 1,
          instruction_target: 'task',
          instructions: 'Test instruction',
          priority: 'high',
          type: 'normal',
          create_at: new Date('2026-01-01'),
          created_by: 'admin-1',
          created_by_name: 'Admin User',
          is_acknowledged: false,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockDbResult });

      // Act
      const result = await projectService.getWorkerInstructions(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      
      const instruction = result.data![0];
      expect(instruction.id).toBe('inst-1');
      expect(instruction.project_id).toBe('proj-1');
      expect(instruction.method_id).toBe('method-1');
      expect(instruction.method_name).toBe(''); // TODO: Task 2.2
      expect(instruction.transition_name).toBe(''); // TODO: Task 2.2
    });

    it('should return empty array when no instructions found', async () => {
      // Arrange
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await projectService.getWorkerInstructions(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const params = {
        projectName: 'test-project',
        organizationId: 'org-123',
        userId: 'user-456',
        userRole: 'experiment_admin',
        filters: {},
      };

      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);

      // Act
      const result = await projectService.getWorkerInstructions(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
    });
  });
});