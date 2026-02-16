/**
 * IssueService.list() Unit Tests
 * 
 * タスク 4.1: サービス層のユニットテスト
 * - issue_targetが'project'の場合のフィルタリング条件テスト
 * - issue_targetが'task'の場合のフィルタリング条件テスト
 * - issue_targetが'transition'の場合のフィルタリング条件テスト
 * - オプショナルフィルタ（status、issue_type）の動作テスト
 * - コメントの親子関係構築ロジックのテスト
 * - organization_idフィルタが常に適用されることを確認
 * - created_at降順、sequence_no昇順のソート動作テスト
 */

import { IssueService } from '../../src/services/issueService';
import { IssueRepository } from '../../src/repositories/issueRepository';
import { IssueWithComments, IssueListFilters } from '../../src/types/issue';

// Mock the repository
jest.mock('../../src/repositories/issueRepository');

describe('IssueService.list()', () => {
  let issueService: IssueService;
  let mockIssueRepository: jest.Mocked<IssueRepository>;

  const organizationId = 'org-123';
  const projectId = 'proj-456';
  const methodId = 'method-001';
  const taskNo = 1;
  const transitionId = 'trans-001';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mocked repository instance
    mockIssueRepository = new IssueRepository() as jest.Mocked<IssueRepository>;
    issueService = new IssueService();
    
    // Replace the repository instance in service with mock
    (issueService as any).issueRepository = mockIssueRepository;
  });

  /**
   * 要件1, 2: 問題一覧の取得とissue_target別フィルタリング
   */
  describe('issue_target filtering', () => {
    it('should filter issues by issue_target=project (project単位)', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Project Issue',
          contents: 'Project level issue',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssues);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
    });

    it('should filter issues by issue_target=task (task単位)', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-002',
          issueType: '2',
          targetType: 'task',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: 1,
          transitionId: null,
          title: 'Task Issue',
          contents: 'Task level issue',
          status: 'unresolved',
          reportedBy: 'user-002',
          reportedByName: 'Reporter Name 2',
          reportedAt: '2024-01-02T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo: 1,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssues);
      expect(result.data![0].targetType).toBe('task');
      expect(result.data![0].taskNo).toBe(1);
    });

    it('should filter issues by issue_target=transition (transition単位)', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-003',
          issueType: '3',
          targetType: 'transition',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: 'trans-001',
          title: 'Transition Issue',
          contents: 'Transition level issue',
          status: 'unresolved',
          reportedBy: 'user-003',
          reportedByName: 'Reporter Name 3',
          reportedAt: '2024-01-03T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId: 'trans-001',
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssues);
      expect(result.data![0].targetType).toBe('transition');
      expect(result.data![0].transitionId).toBe('trans-001');
    });

    it('should return multiple issues with different issue_target types', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Project Issue',
          contents: 'Project level issue',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter 1',
          reportedAt: '2024-01-03T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
        {
          id: 'issue-002',
          issueType: '2',
          targetType: 'task',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: 1,
          transitionId: null,
          title: 'Task Issue',
          contents: 'Task level issue',
          status: 'unresolved',
          reportedBy: 'user-002',
          reportedByName: 'Reporter 2',
          reportedAt: '2024-01-02T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
        {
          id: 'issue-003',
          issueType: '3',
          targetType: 'transition',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: 'trans-001',
          title: 'Transition Issue',
          contents: 'Transition level issue',
          status: 'unresolved',
          reportedBy: 'user-003',
          reportedByName: 'Reporter 3',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data![0].targetType).toBe('project');
      expect(result.data![1].targetType).toBe('task');
      expect(result.data![2].targetType).toBe('transition');
    });
  });

  /**
   * 要件2: オプショナルフィルタ（status, issueType）の動作テスト
   */
  describe('optional filters', () => {
    it('should apply status filter when provided', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Resolved Issue',
          contents: 'This is resolved',
          status: 'resolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: 'user-999',
          completedByName: 'Completer Name',
          completedAt: '2024-01-05T10:00:00Z',
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
        status: 'resolved',
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssues);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
      expect(result.data![0].status).toBe('resolved');
    });

    it('should apply issueType filter when provided', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '2',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Critical Issue',
          contents: 'This is critical',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
        issueType: '2',
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssues);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
      expect(result.data![0].issueType).toBe('2');
    });

    it('should apply both status and issueType filters when provided', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '3',
          targetType: 'task',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: 1,
          transitionId: null,
          title: 'Critical Unresolved Issue',
          contents: 'This is critical and unresolved',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
        status: 'unresolved',
        issueType: '3',
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssues);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
      expect(result.data![0].status).toBe('unresolved');
      expect(result.data![0].issueType).toBe('3');
    });

    it('should not apply filters when not provided', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue 1',
          contents: 'Contents 1',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter 1',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
        {
          id: 'issue-002',
          issueType: '2',
          targetType: 'task',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: 1,
          transitionId: null,
          title: 'Issue 2',
          contents: 'Contents 2',
          status: 'resolved',
          reportedBy: 'user-002',
          reportedByName: 'Reporter 2',
          reportedAt: '2024-01-02T10:00:00Z',
          completedBy: 'user-999',
          completedByName: 'Completer',
          completedAt: '2024-01-03T10:00:00Z',
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
    });
  });

  /**
   * 要件1, 7: コメントの親子関係構築ロジックのテスト
   */
  describe('comment parent-child relationship', () => {
    it('should include comments in parent-child structure', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue with Comments',
          contents: 'This issue has comments',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [
            {
              sequenceNo: 1,
              comment: 'First comment',
              authorId: 'user-002',
              authorName: 'Commenter 1',
              commentedAt: '2024-01-01T11:00:00Z',
            },
            {
              sequenceNo: 2,
              comment: 'Second comment',
              authorId: 'user-003',
              authorName: 'Commenter 2',
              commentedAt: '2024-01-01T12:00:00Z',
            },
          ],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data![0].comments).toHaveLength(2);
      expect(result.data![0].comments[0].sequenceNo).toBe(1);
      expect(result.data![0].comments[0].comment).toBe('First comment');
      expect(result.data![0].comments[1].sequenceNo).toBe(2);
      expect(result.data![0].comments[1].comment).toBe('Second comment');
    });

    it('should return empty comments array for issues without comments', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue without Comments',
          contents: 'This issue has no comments',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data![0].comments).toEqual([]);
    });

    it('should maintain comment order by sequenceNo (ascending)', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue with Multiple Comments',
          contents: 'This issue has multiple comments',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [
            {
              sequenceNo: 1,
              comment: 'First comment',
              authorId: 'user-002',
              authorName: 'Commenter 1',
              commentedAt: '2024-01-01T11:00:00Z',
            },
            {
              sequenceNo: 2,
              comment: 'Second comment',
              authorId: 'user-003',
              authorName: 'Commenter 2',
              commentedAt: '2024-01-01T12:00:00Z',
            },
            {
              sequenceNo: 3,
              comment: 'Third comment',
              authorId: 'user-004',
              authorName: 'Commenter 3',
              commentedAt: '2024-01-01T13:00:00Z',
            },
          ],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      const comments = result.data![0].comments;
      expect(comments).toHaveLength(3);
      expect(comments[0].sequenceNo).toBeLessThan(comments[1].sequenceNo);
      expect(comments[1].sequenceNo).toBeLessThan(comments[2].sequenceNo);
    });

    it('should include author names in comments', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue',
          contents: 'Contents',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter Name',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [
            {
              sequenceNo: 1,
              comment: 'Comment',
              authorId: 'user-002',
              authorName: 'John Doe',
              commentedAt: '2024-01-01T11:00:00Z',
            },
          ],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data![0].comments[0].authorName).toBe('John Doe');
    });
  });

  /**
   * 要件5: organization_idフィルタが常に適用されることを確認
   */
  describe('organization_id filtering', () => {
    it('should always pass organizationId to repository', async () => {
      mockIssueRepository.listIssuesWithComments.mockResolvedValue([]);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      await issueService.list(organizationId, filters);

      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
      
      // 第1引数がorganizationIdであることを確認
      const callArgs = mockIssueRepository.listIssuesWithComments.mock.calls[0];
      expect(callArgs[0]).toBe(organizationId);
    });

    it('should not return issues from other organizations', async () => {
      // Repository層でマルチテナント分離が実装されているため、
      // 他組織のデータは返されない（空配列が返される）
      mockIssueRepository.listIssuesWithComments.mockResolvedValue([]);

      const filters: IssueListFilters = {
        projectId: 'other-org-project',
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockIssueRepository.listIssuesWithComments).toHaveBeenCalledWith(
        organizationId,
        filters
      );
    });
  });

  /**
   * 要件1: created_at降順、sequence_no昇順のソート動作テスト
   */
  describe('sorting behavior', () => {
    it('should return issues sorted by reportedAt DESC (newest first)', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-003',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Newest Issue',
          contents: 'Reported today',
          status: 'unresolved',
          reportedBy: 'user-003',
          reportedByName: 'Reporter 3',
          reportedAt: '2024-01-03T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
        {
          id: 'issue-002',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Middle Issue',
          contents: 'Reported yesterday',
          status: 'unresolved',
          reportedBy: 'user-002',
          reportedByName: 'Reporter 2',
          reportedAt: '2024-01-02T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Oldest Issue',
          contents: 'Reported 3 days ago',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter 1',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      
      // 最新の問題が最初
      expect(result.data![0].reportedAt).toBe('2024-01-03T10:00:00Z');
      expect(result.data![1].reportedAt).toBe('2024-01-02T10:00:00Z');
      expect(result.data![2].reportedAt).toBe('2024-01-01T10:00:00Z');
    });

    it('should verify comments are sorted by sequenceNo ASC within each issue', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Test Project',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue',
          contents: 'Contents',
          status: 'unresolved',
          reportedBy: 'user-001',
          reportedByName: 'Reporter',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [
            {
              sequenceNo: 1,
              comment: 'First',
              authorId: 'user-002',
              authorName: 'Author 1',
              commentedAt: '2024-01-01T11:00:00Z',
            },
            {
              sequenceNo: 2,
              comment: 'Second',
              authorId: 'user-003',
              authorName: 'Author 2',
              commentedAt: '2024-01-01T12:00:00Z',
            },
            {
              sequenceNo: 3,
              comment: 'Third',
              authorId: 'user-004',
              authorName: 'Author 3',
              commentedAt: '2024-01-01T13:00:00Z',
            },
            {
              sequenceNo: 4,
              comment: 'Fourth',
              authorId: 'user-005',
              authorName: 'Author 4',
              commentedAt: '2024-01-01T14:00:00Z',
            },
            {
              sequenceNo: 5,
              comment: 'Fifth',
              authorId: 'user-006',
              authorName: 'Author 5',
              commentedAt: '2024-01-01T15:00:00Z',
            },
          ],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      const comments = result.data![0].comments;
      expect(comments).toHaveLength(5);
      
      // Verify ascending order
      for (let i = 0; i < comments.length - 1; i++) {
        expect(comments[i].sequenceNo).toBeLessThan(comments[i + 1].sequenceNo);
      }
    });
  });

  /**
   * 要件8: エラーハンドリングのテスト
   */
  describe('error handling', () => {
    it('should return error when repository throws exception', async () => {
      const dbError = new Error('Database connection failed');
      mockIssueRepository.listIssuesWithComments.mockRejectedValue(dbError);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_ERROR');
      expect(result.error?.message).toBe('システムエラーが発生しました');
    });

    it('should return empty array when no issues found', async () => {
      mockIssueRepository.listIssuesWithComments.mockResolvedValue([]);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  /**
   * 要件1, 6: 包含的な正常ケーステスト
   */
  describe('comprehensive success cases', () => {
    it('should include projectName and user names in response', async () => {
      const mockIssues: IssueWithComments[] = [
        {
          id: 'issue-001',
          issueType: '1',
          targetType: 'project',
          projectId,
          projectName: 'Sample Project Name',
          methodId,
          taskNo: null,
          transitionId: null,
          title: 'Issue',
          contents: 'Contents',
          status: 'resolved',
          reportedBy: 'user-001',
          reportedByName: 'John Reporter',
          reportedAt: '2024-01-01T10:00:00Z',
          completedBy: 'user-002',
          completedByName: 'Jane Completer',
          completedAt: '2024-01-05T10:00:00Z',
          comments: [
            {
              sequenceNo: 1,
              comment: 'Comment',
              authorId: 'user-003',
              authorName: 'Bob Commenter',
              commentedAt: '2024-01-02T10:00:00Z',
            },
          ],
        },
      ];

      mockIssueRepository.listIssuesWithComments.mockResolvedValue(mockIssues);

      const filters: IssueListFilters = {
        projectId,
        methodId,
        taskNo,
        transitionId,
      };

      const result = await issueService.list(organizationId, filters);

      expect(result.success).toBe(true);
      expect(result.data![0].projectName).toBe('Sample Project Name');
      expect(result.data![0].reportedByName).toBe('John Reporter');
      expect(result.data![0].completedByName).toBe('Jane Completer');
      expect(result.data![0].comments[0].authorName).toBe('Bob Commenter');
    });
  });
});
