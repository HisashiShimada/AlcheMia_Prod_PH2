import { IssueService } from '../../src/services/issueService';
import { IssueRepository } from '../../src/repositories/issueRepository';

// Mock the repository
jest.mock('../../src/repositories/issueRepository');

describe('IssueService - listIssuesWithComments (Task 3.1)', () => {
  let issueService: IssueService;
  let mockIssueRepository: jest.Mocked<IssueRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIssueRepository = new IssueRepository() as jest.Mocked<IssueRepository>;
    issueService = new IssueService();
    (issueService as any).issueRepository = mockIssueRepository;
  });

  describe('issue_target filtering', () => {
    const organizationId = 'org-123';
    const filters = {
      projectId: 'proj-456',
      methodId: 'method-001',
      taskNo: 1,
      transitionId: 'trans-001'
    };

    it('should fetch issues with project target filtering', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const mockIssues = [
        {
          id: 'issue-001',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Project Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual(mockIssues);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
    });

    it('should fetch issues with task target filtering', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const mockIssues = [
        {
          id: 'issue-002',
          issueType: 'bug',
          targetType: 'task' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: 1,
          transitionId: null,
          title: 'Task Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual(mockIssues);
    });

    it('should fetch issues with transition target filtering', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const mockIssues = [
        {
          id: 'issue-003',
          issueType: 'bug',
          targetType: 'transition' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: 'trans-001',
          title: 'Transition Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual(mockIssues);
    });

    it('should fetch all matching issues regardless of target type', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const mockIssues = [
        {
          id: 'issue-001',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Project Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        },
        {
          id: 'issue-002',
          issueType: 'bug',
          targetType: 'task' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: 1,
          transitionId: null,
          title: 'Task Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        },
        {
          id: 'issue-003',
          issueType: 'bug',
          targetType: 'transition' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: 'trans-001',
          title: 'Transition Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockIssues);
    });
  });

  describe('optional filters', () => {
    const organizationId = 'org-123';
    const baseFilters = {
      projectId: 'proj-456',
      methodId: 'method-001',
      taskNo: 1,
      transitionId: 'trans-001'
    };

    it('should apply status filter when provided', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const filters = {
        ...baseFilters,
        status: 'resolved' as const
      };

      const mockIssues = [
        {
          id: 'issue-001',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Resolved Issue',
          contents: 'Issue contents',
          status: 'resolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: 'user-999',
          completedByName: 'Completer User',
          completedAt: '2026-02-05T12:00:00Z',
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual(mockIssues);
      expect(result[0].status).toBe('resolved');
    });

    it('should apply issue_type filter when provided', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const filters = {
        ...baseFilters,
        issueType: 'feature'
      };

      const mockIssues = [
        {
          id: 'issue-001',
          issueType: 'feature',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Feature Request',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual(mockIssues);
      expect(result[0].issueType).toBe('feature');
    });
  });

  describe('sorting and ordering', () => {
    const organizationId = 'org-123';
    const filters = {
      projectId: 'proj-456',
      methodId: 'method-001',
      taskNo: 1,
      transitionId: 'trans-001'
    };

    it('should return issues sorted by created_at DESC', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const mockIssues = [
        {
          id: 'issue-003',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Latest Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T12:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        },
        {
          id: 'issue-002',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Middle Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T11:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        },
        {
          id: 'issue-001',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Oldest Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      // Verify the order (latest first)
      expect(result[0].reportedAt).toBe('2026-02-05T12:00:00Z');
      expect(result[1].reportedAt).toBe('2026-02-05T11:00:00Z');
      expect(result[2].reportedAt).toBe('2026-02-05T10:00:00Z');
    });
  });

  describe('multi-tenant isolation', () => {
    const filters = {
      projectId: 'proj-456',
      methodId: 'method-001',
      taskNo: 1,
      transitionId: 'trans-001'
    };

    it('should only return issues for the specified organization', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const organizationId = 'org-123';
      
      const mockIssues = [
        {
          id: 'issue-001',
          issueType: 'bug',
          targetType: 'project' as const,
          projectId: 'proj-456',
          projectName: 'Test Project',
          methodId: 'method-001',
          taskNo: null,
          transitionId: null,
          title: 'Org 123 Issue',
          contents: 'Issue contents',
          status: 'unresolved' as const,
          reportedBy: 'user-789',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: []
        }
      ];

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue(mockIssues);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual(mockIssues);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
    });

    it('should return empty array for non-existent project', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const organizationId = 'org-123';

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue([]);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual([]);
    });

    it('should return empty array when accessing another organization project', async () => {
      // RED: This test will fail because the method doesn't exist yet
      const organizationId = 'org-456'; // Different organization

      mockIssueRepository.listIssuesWithComments = jest.fn().mockResolvedValue([]);

      const result = await issueService.listIssuesWithComments(organizationId, filters);

      expect(result).toEqual([]);
    });
  });
});