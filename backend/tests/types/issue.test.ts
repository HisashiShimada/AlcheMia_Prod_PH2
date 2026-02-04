/**
 * Issue型定義のテスト
 * 
 * 型定義が正しく機能し、期待される構造を持つことを検証します。
 */

import {
  Issue,
  IssueType,
  IssueSeverity,
  IssueStatus,
  NewIssue,
  IssueUpdateData,
  IssueQueryParams,
  ISSUE_TYPE_VALUES,
  ISSUE_SEVERITY_VALUES,
  ISSUE_STATUS_VALUES,
} from '../../src/types/issue';

describe('Issue Type Definitions', () => {
  describe('IssueType', () => {
    it('should accept valid issue types', () => {
      const validTypes: IssueType[] = [
        'bug',
        'feature_request',
        'question',
        'improvement',
        'other',
      ];

      validTypes.forEach((type) => {
        const issueType: IssueType = type;
        expect(issueType).toBe(type);
      });
    });

    it('should have all valid values in ISSUE_TYPE_VALUES', () => {
      expect(ISSUE_TYPE_VALUES).toEqual([
        'bug',
        'feature_request',
        'question',
        'improvement',
        'other',
      ]);
    });
  });

  describe('IssueSeverity', () => {
    it('should accept valid severity levels', () => {
      const validSeverities: IssueSeverity[] = [
        'critical',
        'high',
        'medium',
        'low',
      ];

      validSeverities.forEach((severity) => {
        const issueSeverity: IssueSeverity = severity;
        expect(issueSeverity).toBe(severity);
      });
    });

    it('should have all valid values in ISSUE_SEVERITY_VALUES', () => {
      expect(ISSUE_SEVERITY_VALUES).toEqual([
        'critical',
        'high',
        'medium',
        'low',
      ]);
    });
  });

  describe('IssueStatus', () => {
    it('should accept valid status values', () => {
      const validStatuses: IssueStatus[] = [
        'open',
        'in_progress',
        'resolved',
        'closed',
        'rejected',
      ];

      validStatuses.forEach((status) => {
        const issueStatus: IssueStatus = status;
        expect(issueStatus).toBe(status);
      });
    });

    it('should have all valid values in ISSUE_STATUS_VALUES', () => {
      expect(ISSUE_STATUS_VALUES).toEqual([
        'open',
        'in_progress',
        'resolved',
        'closed',
        'rejected',
      ]);
    });
  });

  describe('Issue', () => {
    it('should have correct structure for Issue type', () => {
      const issue: Issue = {
        id: 'issue-uuid-123',
        organizationId: 'org-uuid-456',
        projectId: 'project-uuid-789',
        taskDetailId: 'task-detail-uuid-101',
        reporterId: 'reporter-uuid-202',
        title: 'Test Issue',
        description: 'This is a test issue description',
        issueType: 'bug',
        severity: 'high',
        status: 'open',
        assigneeId: 'assignee-uuid-303',
        createdAt: '2026-02-04T10:00:00Z',
        updatedAt: '2026-02-04T10:00:00Z',
      };

      expect(issue.id).toBe('issue-uuid-123');
      expect(issue.organizationId).toBe('org-uuid-456');
      expect(issue.projectId).toBe('project-uuid-789');
      expect(issue.taskDetailId).toBe('task-detail-uuid-101');
      expect(issue.reporterId).toBe('reporter-uuid-202');
      expect(issue.title).toBe('Test Issue');
      expect(issue.issueType).toBe('bug');
      expect(issue.severity).toBe('high');
      expect(issue.status).toBe('open');
    });

    it('should allow null for optional fields', () => {
      const issue: Issue = {
        id: 'issue-uuid-123',
        organizationId: 'org-uuid-456',
        projectId: 'project-uuid-789',
        taskDetailId: null,
        reporterId: 'reporter-uuid-202',
        title: 'Test Issue',
        description: 'This is a test issue description',
        issueType: 'question',
        severity: 'low',
        status: 'open',
        assigneeId: null,
        createdAt: '2026-02-04T10:00:00Z',
        updatedAt: '2026-02-04T10:00:00Z',
      };

      expect(issue.taskDetailId).toBeNull();
      expect(issue.assigneeId).toBeNull();
    });
  });

  describe('NewIssue', () => {
    it('should have correct structure for NewIssue type', () => {
      const newIssue: NewIssue = {
        organizationId: 'org-uuid-456',
        projectId: 'project-uuid-789',
        taskDetailId: 'task-detail-uuid-101',
        reporterId: 'reporter-uuid-202',
        title: 'New Issue',
        description: 'Description for new issue',
        issueType: 'feature_request',
        severity: 'medium',
        status: 'open',
      };

      expect(newIssue.organizationId).toBe('org-uuid-456');
      expect(newIssue.projectId).toBe('project-uuid-789');
      expect(newIssue.title).toBe('New Issue');
    });

    it('should allow optional fields to be undefined', () => {
      const newIssue: NewIssue = {
        organizationId: 'org-uuid-456',
        projectId: 'project-uuid-789',
        reporterId: 'reporter-uuid-202',
        title: 'New Issue',
        description: 'Description for new issue',
        issueType: 'bug',
        severity: 'critical',
        status: 'open',
      };

      expect(newIssue.taskDetailId).toBeUndefined();
      expect(newIssue.assigneeId).toBeUndefined();
    });
  });

  describe('IssueUpdateData', () => {
    it('should allow partial updates', () => {
      const updateData: IssueUpdateData = {
        title: 'Updated Title',
        status: 'in_progress',
      };

      expect(updateData.title).toBe('Updated Title');
      expect(updateData.status).toBe('in_progress');
      expect(updateData.description).toBeUndefined();
    });

    it('should allow updating only assigneeId', () => {
      const updateData: IssueUpdateData = {
        assigneeId: 'new-assignee-uuid',
      };

      expect(updateData.assigneeId).toBe('new-assignee-uuid');
    });

    it('should allow setting assigneeId to null', () => {
      const updateData: IssueUpdateData = {
        assigneeId: null,
      };

      expect(updateData.assigneeId).toBeNull();
    });
  });

  describe('IssueQueryParams', () => {
    it('should allow filtering by all optional parameters', () => {
      const queryParams: IssueQueryParams = {
        projectId: 'project-uuid-789',
        taskDetailId: 'task-detail-uuid-101',
        reporterId: 'reporter-uuid-202',
        assigneeId: 'assignee-uuid-303',
        issueType: 'bug',
        severity: 'high',
        status: 'open',
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'desc',
      };

      expect(queryParams.projectId).toBe('project-uuid-789');
      expect(queryParams.issueType).toBe('bug');
      expect(queryParams.page).toBe(1);
    });

    it('should allow empty query parameters', () => {
      const queryParams: IssueQueryParams = {};

      expect(Object.keys(queryParams).length).toBe(0);
    });

    it('should allow sortBy with valid values', () => {
      const sortByOptions: Array<IssueQueryParams['sortBy']> = [
        'createdAt',
        'updatedAt',
        'severity',
        'status',
      ];

      sortByOptions.forEach((sortBy) => {
        const queryParams: IssueQueryParams = { sortBy };
        expect(queryParams.sortBy).toBe(sortBy);
      });
    });
  });
});