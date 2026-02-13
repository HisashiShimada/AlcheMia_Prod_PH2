import { IssueService } from '../../src/services/issueService';
import { IssueRepository } from '../../src/repositories/issueRepository';
import { Issue, NewIssue, IssueUpdateData, IssueListResponse } from '../../src/types/issue';
import { NotFoundError, ValidationError, AuthorizationError } from '../../src/utils/errorClasses';

// Mock the repository
jest.mock('../../src/repositories/issueRepository');

describe('IssueService', () => {
  let issueService: IssueService;
  let mockIssueRepository: jest.Mocked<IssueRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mocked repository instance
    mockIssueRepository = new IssueRepository() as jest.Mocked<IssueRepository>;
    issueService = new IssueService();
    
    // Replace the repository instance in service with mock
    (issueService as any).issueRepository = mockIssueRepository;
  });

  describe('createIssue', () => {
    const validNewIssue: NewIssue = {
      organizationId: 'org-123',
      projectId: 'proj-456',
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open'
    };

    it('should create an issue successfully', async () => {
      const createdIssue: Issue = {
        id: 'issue-001',
        ...validNewIssue,
        taskDetailId: null,
        assigneeId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockIssueRepository.create.mockResolvedValue(createdIssue);

      const result = await issueService.createIssue(validNewIssue);

      expect(result).toEqual(createdIssue);
      expect(mockIssueRepository.create).toHaveBeenCalledWith(validNewIssue);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidIssue = { ...validNewIssue, title: '' };

      await expect(issueService.createIssue(invalidIssue as NewIssue))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for title exceeding 200 characters', async () => {
      const invalidIssue = { ...validNewIssue, title: 'a'.repeat(201) };

      await expect(issueService.createIssue(invalidIssue))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid issueType', async () => {
      const invalidIssue = { ...validNewIssue, issueType: 'invalid' as any };

      await expect(issueService.createIssue(invalidIssue))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid severity', async () => {
      const invalidIssue = { ...validNewIssue, severity: 'invalid' as any };

      await expect(issueService.createIssue(invalidIssue))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getIssueById', () => {
    const mockIssue: Issue = {
      id: 'issue-001',
      organizationId: 'org-123',
      projectId: 'proj-456',
      taskDetailId: null,
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open',
      assigneeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should return issue by id', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      const result = await issueService.getIssueById('issue-001', 'org-123');

      expect(result).toEqual(mockIssue);
      expect(mockIssueRepository.findById).toHaveBeenCalledWith('issue-001', 'org-123');
    });

    it('should throw NotFoundError if issue not found', async () => {
      mockIssueRepository.findById.mockResolvedValue(null);

      await expect(issueService.getIssueById('non-existent', 'org-123'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('listIssues', () => {
    const mockIssues: Issue[] = [
      {
        id: 'issue-001',
        organizationId: 'org-123',
        projectId: 'proj-456',
        taskDetailId: null,
        reporterId: 'user-789',
        title: 'Test Issue 1',
        description: 'Description 1',
        issueType: 'bug',
        severity: 'high',
        status: 'open',
        assigneeId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    it('should return list of issues with pagination', async () => {
      const mockResult: IssueListResponse = {
        issues: mockIssues,
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockIssueRepository.findByOrganization.mockResolvedValue(mockResult);

      const result = await issueService.listIssues('org-123', {
        page: 1,
        limit: 20
      });

      expect(result).toEqual({
        items: mockIssues,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });
      expect(mockIssueRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        { page: 1, limit: 20 }
      );
    });

    it('should apply filters when provided', async () => {
      const mockResult: IssueListResponse = {
        issues: mockIssues,
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockIssueRepository.findByOrganization.mockResolvedValue(mockResult);

      const filters = {
        projectId: 'proj-456',
        status: 'open' as const,
        severity: 'high' as const,
        page: 1,
        limit: 20
      };

      await issueService.listIssues('org-123', filters);

      expect(mockIssueRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        filters
      );
    });
  });

  describe('updateIssue', () => {
    const mockIssue: Issue = {
      id: 'issue-001',
      organizationId: 'org-123',
      projectId: 'proj-456',
      taskDetailId: null,
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open',
      assigneeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should update issue successfully when user is reporter', async () => {
      const updateData: IssueUpdateData = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const updatedIssue = { ...mockIssue, ...updateData };

      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.update.mockResolvedValue(updatedIssue);

      const result = await issueService.updateIssue(
        'issue-001',
        'org-123',
        'user-789',
        updateData,
        false
      );

      expect(result).toEqual(updatedIssue);
      expect(mockIssueRepository.update).toHaveBeenCalledWith(
        'issue-001',
        'org-123',
        updateData
      );
    });

    it('should update issue successfully when user is admin', async () => {
      const updateData: IssueUpdateData = {
        title: 'Updated Title'
      };

      const updatedIssue = { ...mockIssue, ...updateData };

      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.update.mockResolvedValue(updatedIssue);

      const result = await issueService.updateIssue(
        'issue-001',
        'org-123',
        'admin-user',
        updateData,
        true
      );

      expect(result).toEqual(updatedIssue);
    });

    it('should throw NotFoundError if issue not found', async () => {
      mockIssueRepository.findById.mockResolvedValue(null);

      await expect(
        issueService.updateIssue('non-existent', 'org-123', 'user-789', {}, false)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user is not reporter or admin', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      await expect(
        issueService.updateIssue('issue-001', 'org-123', 'other-user', {}, false)
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw ValidationError for title exceeding 200 characters', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      await expect(
        issueService.updateIssue(
          'issue-001',
          'org-123',
          'user-789',
          { title: 'a'.repeat(201) },
          false
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid issueType', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      await expect(
        issueService.updateIssue(
          'issue-001',
          'org-123',
          'user-789',
          { issueType: 'invalid' as any },
          false
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateIssueStatus', () => {
    const mockIssue: Issue = {
      id: 'issue-001',
      organizationId: 'org-123',
      projectId: 'proj-456',
      taskDetailId: null,
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open',
      assigneeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should update status successfully', async () => {
      const updatedIssue = { ...mockIssue, status: 'in_progress' as const };

      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.updateStatus.mockResolvedValue(updatedIssue);

      const result = await issueService.updateIssueStatus(
        'issue-001',
        'org-123',
        'in_progress'
      );

      expect(result).toEqual(updatedIssue);
      expect(mockIssueRepository.updateStatus).toHaveBeenCalledWith(
        'issue-001',
        'org-123',
        'in_progress'
      );
    });

    it('should throw NotFoundError if issue not found', async () => {
      mockIssueRepository.findById.mockResolvedValue(null);

      await expect(
        issueService.updateIssueStatus('non-existent', 'org-123', 'in_progress')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid status', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      await expect(
        issueService.updateIssueStatus('issue-001', 'org-123', 'invalid' as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate status transition from open to closed', async () => {
      const openIssue = { ...mockIssue, status: 'open' as const };
      mockIssueRepository.findById.mockResolvedValue(openIssue);
      
      // Invalid transition from open to closed (should go through in_progress or resolved first)
      await expect(
        issueService.updateIssueStatus('issue-001', 'org-123', 'resolved')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('assignIssue', () => {
    const mockIssue: Issue = {
      id: 'issue-001',
      organizationId: 'org-123',
      projectId: 'proj-456',
      taskDetailId: null,
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open',
      assigneeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should assign issue successfully', async () => {
      const updatedIssue = { ...mockIssue, assigneeId: 'assignee-123' };

      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.updateAssignee.mockResolvedValue(updatedIssue);

      const result = await issueService.assignIssue(
        'issue-001',
        'org-123',
        'assignee-123'
      );

      expect(result).toEqual(updatedIssue);
      expect(mockIssueRepository.updateAssignee).toHaveBeenCalledWith(
        'issue-001',
        'org-123',
        'assignee-123'
      );
    });

    it('should unassign issue when assigneeId is null', async () => {
      const assignedIssue = { ...mockIssue, assigneeId: 'assignee-123' };
      const unassignedIssue = { ...mockIssue, assigneeId: null };

      mockIssueRepository.findById.mockResolvedValue(assignedIssue);
      mockIssueRepository.updateAssignee.mockResolvedValue(unassignedIssue);

      const result = await issueService.assignIssue(
        'issue-001',
        'org-123',
        null
      );

      expect(result).toEqual(unassignedIssue);
      expect(mockIssueRepository.updateAssignee).toHaveBeenCalledWith(
        'issue-001',
        'org-123',
        null
      );
    });

    it('should throw NotFoundError if issue not found', async () => {
      mockIssueRepository.findById.mockResolvedValue(null);

      await expect(
        issueService.assignIssue('non-existent', 'org-123', 'assignee-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteIssue', () => {
    const mockIssue: Issue = {
      id: 'issue-001',
      organizationId: 'org-123',
      projectId: 'proj-456',
      taskDetailId: null,
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open',
      assigneeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should delete issue successfully when user is reporter', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.delete.mockResolvedValue(true);

      await issueService.deleteIssue(
        'issue-001',
        'org-123',
        'user-789',
        false
      );

      expect(mockIssueRepository.delete).toHaveBeenCalledWith(
        'issue-001',
        'org-123'
      );
    });

    it('should delete issue successfully when user is admin', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.delete.mockResolvedValue(true);

      await issueService.deleteIssue(
        'issue-001',
        'org-123',
        'admin-user',
        true
      );

      expect(mockIssueRepository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError if issue not found', async () => {
      mockIssueRepository.findById.mockResolvedValue(null);

      await expect(
        issueService.deleteIssue('non-existent', 'org-123', 'user-789', false)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user is not reporter or admin', async () => {
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      await expect(
        issueService.deleteIssue('issue-001', 'org-123', 'other-user', false)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  // タスク 4.1: addComment - 入力バリデーションテスト
  describe('addComment - Input Validation', () => {
    const mockIssue: Issue = {
      id: 'issue-001',
      organizationId: 'org-123',
      projectId: 'proj-456',
      taskDetailId: null,
      reporterId: 'user-789',
      title: 'Test Issue',
      description: 'Test Description',
      issueType: 'bug',
      severity: 'high',
      status: 'open',
      assigneeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    beforeEach(() => {
      // 問題が存在する前提でモック設定
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
    });

    // 注: 空文字列チェックはController層で実施されるため、Service層のテストからは削除

    it('should reject comment exceeding 2000 characters', async () => {
      const longComment = 'a'.repeat(2001);
      
      const result = await issueService.addComment(
        'org-123',
        'issue-001',
        'user-123',
        longComment
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('2000');
    });

    it('should accept valid comment (1 character)', async () => {
      mockIssueRepository.addComment = jest.fn().mockResolvedValue({
        projectId: 'proj-456',
        issueId: 'issue-001',
        sequenceNo: 1,
        comment: 'a',
        authorId: 'user-123',
        authorName: 'Test User',
        commentedAt: new Date().toISOString()
      });

      const result = await issueService.addComment(
        'org-123',
        'issue-001',
        'user-123',
        'a'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should accept valid comment (2000 characters)', async () => {
      const maxLengthComment = 'a'.repeat(2000);
      
      mockIssueRepository.addComment = jest.fn().mockResolvedValue({
        projectId: 'proj-456',
        issueId: 'issue-001',
        sequenceNo: 1,
        comment: maxLengthComment,
        authorId: 'user-123',
        authorName: 'Test User',
        commentedAt: new Date().toISOString()
      });

      const result = await issueService.addComment(
        'org-123',
        'issue-001',
        'user-123',
        maxLengthComment
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return RESOURCE_NOT_FOUND when issue does not exist', async () => {
      mockIssueRepository.findById.mockResolvedValue(null);

      const result = await issueService.addComment(
        'org-123',
        'non-existent',
        'user-123',
        'Valid comment'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
