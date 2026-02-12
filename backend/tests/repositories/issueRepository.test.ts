/**
 * IssueRepository テストスイート
 * 
 * TDD: RED → GREEN → REFACTOR
 */

import { IssueRepository } from '../../src/repositories/issueRepository';
import { getPool } from '../../src/database/db';
import {
  Issue,
  NewIssue,
  IssueUpdateData,
  IssueQueryParams,
} from '../../src/types/issue';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('IssueRepository', () => {
  let repository: IssueRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });
    repository = new IssueRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('新しい問題を作成できる', async () => {
      // Arrange
      const newIssue: NewIssue = {
        organizationId: 'org-123',
        projectId: 'proj-123',
        issueId: 'issue-123',
        methodId: 'method-001',
        issueTarget: 3, // トランジション
        taskNo: 1,
        transitionId: 'transition-001',
        issueTitle: 'テストバグ',
        issueContents: 'これはテストの問題です',
        issueType: 1, // material_shortage
        issueReporterId: 'user-123',
      };

      const expectedIssue: Issue = {
        organizationId: newIssue.organizationId,
        projectId: newIssue.projectId,
        issueId: newIssue.issueId,
        methodId: newIssue.methodId || null,
        issueTarget: newIssue.issueTarget,
        taskNo: newIssue.taskNo || null,
        transitionId: newIssue.transitionId || null,
        issueTitle: newIssue.issueTitle,
        issueType: newIssue.issueType,
        issueContents: newIssue.issueContents,
        status: 'unresolved',
        issueReporterId: newIssue.issueReporterId,
        issueReportAt: '2026-02-04T10:00:00Z',
        issueCompleterId: null,
        issueComplateAt: null,
        createUserId: newIssue.issueReporterId,
        createAt: '2026-02-04T10:00:00Z',
        updateUserId: newIssue.issueReporterId,
        updateAt: '2026-02-04T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [expectedIssue] });

      // Act
      const result = await repository.create(newIssue);

      // Assert
      expect(result).toEqual(expectedIssue);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO issues');
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id');
      expect(mockQuery.mock.calls[0][1]).toContain('org-123');
    });

    it('taskNoがnullでも作成できる（プロジェクト全体の問題）', async () => {
      // Arrange
      const newIssue: NewIssue = {
        organizationId: 'org-123',
        projectId: 'proj-123',
        issueId: 'issue-124',
        methodId: null,
        issueTarget: 1, // プロジェクト全体
        taskNo: null,
        transitionId: null,
        issueTitle: 'テスト質問',
        issueContents: 'これは質問です',
        issueType: 2, // equipment_failure
        issueReporterId: 'user-123',
      };

      const expectedIssue: Issue = {
        organizationId: newIssue.organizationId,
        projectId: newIssue.projectId,
        issueId: newIssue.issueId,
        methodId: null,
        issueTarget: newIssue.issueTarget,
        taskNo: null,
        transitionId: null,
        issueTitle: newIssue.issueTitle,
        issueType: newIssue.issueType,
        issueContents: newIssue.issueContents,
        status: 'unresolved',
        issueReporterId: newIssue.issueReporterId,
        issueReportAt: '2026-02-04T10:00:00Z',
        issueCompleterId: null,
        issueComplateAt: null,
        createUserId: newIssue.issueReporterId,
        createAt: '2026-02-04T10:00:00Z',
        updateUserId: newIssue.issueReporterId,
        updateAt: '2026-02-04T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [expectedIssue] });

      // Act
      const result = await repository.create(newIssue);

      // Assert
      expect(result).toEqual(expectedIssue);
      expect(result.taskNo).toBeNull();
    });
  });

  describe('findById()', () => {
    it('IDと組織IDで問題を取得できる', async () => {
      // Arrange
      const issueId = 'issue-123';
      const organizationId = 'org-123';

      const expectedIssue: Issue = {
        organizationId,
        projectId: 'proj-123',
        issueId: issueId,
        methodId: 'method-001',
        issueTarget: 3,
        taskNo: 1,
        transitionId: 'transition-001',
        issueTitle: 'テストバグ',
        issueType: 1,
        issueContents: 'これはテストの問題です',
        status: 'unresolved',
        issueReporterId: 'user-123',
        issueReportAt: '2026-02-04T10:00:00Z',
        issueCompleterId: null,
        issueComplateAt: null,
        createUserId: 'user-123',
        createAt: '2026-02-04T10:00:00Z',
        updateUserId: 'user-123',
        updateAt: '2026-02-04T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [expectedIssue] });

      // Act
      const result = await repository.findById(issueId, organizationId);

      // Assert
      expect(result).toEqual(expectedIssue);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('WHERE issue_id = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('AND organization_id = $2');
    });

    it('問題が見つからない場合はnullを返す', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.findById('not-exist', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('異なる組織の問題は取得できない', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.findById('issue-123', 'other-org');

      // Assert
      expect(result).toBeNull();
      expect(mockQuery.mock.calls[0][1]).toContain('other-org');
    });
  });

  describe('findByOrganization()', () => {
    it('組織の全問題を取得できる', async () => {
      // Arrange
      const organizationId = 'org-123';
      const issues: Issue[] = [
        {
          organizationId,
          projectId: 'proj-123',
          issueId: 'issue-1',
          methodId: 'method-001',
          issueTarget: 1,
          taskNo: null,
          transitionId: null,
          issueTitle: '問題1',
          issueType: 1,
          issueContents: '説明1',
          status: 'unresolved',
          issueReporterId: 'user-123',
          issueReportAt: '2026-02-04T10:00:00Z',
          issueCompleterId: null,
          issueComplateAt: null,
          createUserId: 'user-123',
          createAt: '2026-02-04T10:00:00Z',
          updateUserId: 'user-123',
          updateAt: '2026-02-04T10:00:00Z',
        },
        {
          organizationId,
          projectId: 'proj-124',
          issueId: 'issue-2',
          methodId: 'method-002',
          issueTarget: 2,
          taskNo: 1,
          transitionId: null,
          issueTitle: '問題2',
          issueType: 2,
          issueContents: '説明2',
          status: 'unresolved',
          issueReporterId: 'user-124',
          issueReportAt: '2026-02-04T11:00:00Z',
          issueCompleterId: null,
          issueComplateAt: null,
          createUserId: 'user-124',
          createAt: '2026-02-04T11:00:00Z',
          updateUserId: 'user-124',
          updateAt: '2026-02-04T11:00:00Z',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: issues });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      // Act
      const result = await repository.findByOrganization(organizationId, {});

      // Assert
      expect(result.issues).toEqual(issues);
      expect(result.pagination.totalItems).toBe(2);
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id = $1');
    });

    it('ステータスでフィルタできる', async () => {
      // Arrange
      const params: IssueQueryParams = {
        status: 'open',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await repository.findByOrganization('org-123', params);

      // Assert
      expect(mockQuery.mock.calls[0][0]).toContain('status = $');
      expect(mockQuery.mock.calls[0][1]).toContain('open');
    });

    it('重要度でフィルタできる', async () => {
      // Arrange
      const params: IssueQueryParams = {
        severity: 'critical',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await repository.findByOrganization('org-123', params);

      // Assert
      expect(mockQuery.mock.calls[0][0]).toContain('severity = $');
      expect(mockQuery.mock.calls[0][1]).toContain('critical');
    });

    it('ソートとページネーションが機能する', async () => {
      // Arrange
      const params: IssueQueryParams = {
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        order: 'desc',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '25' }] });

      // Act
      const result = await repository.findByOrganization('org-123', params);

      // Assert
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
      expect(mockQuery.mock.calls[0][0]).toContain('LIMIT $');
      expect(mockQuery.mock.calls[0][0]).toContain('OFFSET $');
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('findByProject()', () => {
    it('プロジェクトの全問題を取得できる', async () => {
      // Arrange
      const projectId = 'proj-123';
      const organizationId = 'org-123';

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await repository.findByProject(projectId, organizationId, {});

      // Assert
      expect(mockQuery.mock.calls[0][0]).toContain('project_id = $2');
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id = $1');
      expect(mockQuery.mock.calls[0][1][0]).toBe(organizationId);
      expect(mockQuery.mock.calls[0][1][1]).toBe(projectId);
    });
  });

  describe('update()', () => {
    it('問題情報を更新できる', async () => {
      // Arrange
      const issueId = 'issue-123';
      const organizationId = 'org-123';
      const updateData: IssueUpdateData = {
        title: '更新されたタイトル',
        description: '更新された説明',
        severity: 'critical',
      };

      const updatedIssue: Issue = {
        organizationId,
        projectId: 'proj-123',
        issueId: issueId,
        methodId: 'method-001',
        issueTarget: 2,
        taskNo: 1,
        transitionId: null,
        issueTitle: updateData.title!,
        issueType: 1,
        issueContents: updateData.description!,
        status: 'open',
        issueReporterId: 'user-123',
        issueReportAt: '2026-02-04T10:00:00Z',
        issueCompleterId: null,
        issueComplateAt: null,
        createUserId: 'user-123',
        createAt: '2026-02-04T10:00:00Z',
        updateUserId: 'user-123',
        updateAt: '2026-02-04T11:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedIssue] });

      // Act
      const result = await repository.update(issueId, organizationId, updateData);

      // Assert
      expect(result).toEqual(updatedIssue);
      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE issues');
      expect(mockQuery.mock.calls[0][0]).toContain('WHERE issue_id = $');
      expect(mockQuery.mock.calls[0][0]).toContain('AND organization_id = $');
    });

    it('部分的な更新ができる', async () => {
      // Arrange
      const updateData: IssueUpdateData = {
        status: 'resolved',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{}] });

      // Act
      await repository.update('issue-123', 'org-123', updateData);

      // Assert
      expect(mockQuery.mock.calls[0][0]).toContain('status = $');
      expect(mockQuery.mock.calls[0][0]).not.toContain('title = $');
    });

    it('問題が見つからない場合はnullを返す', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.update('not-exist', 'org-123', {});

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateStatus()', () => {
    it('ステータスを更新できる', async () => {
      // Arrange
      const issueId = 'issue-123';
      const organizationId = 'org-123';
      const newStatus = 'resolved';

      mockQuery.mockResolvedValueOnce({ rows: [{ status: newStatus }] });

      // Act
      const result = await repository.updateStatus(issueId, organizationId, newStatus);

      // Assert
      expect(result).toEqual({ status: newStatus });
      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE issues');
      expect(mockQuery.mock.calls[0][0]).toContain('SET status = $1');
      expect(mockQuery.mock.calls[0][1][0]).toBe(newStatus);
    });
  });

  describe('updateAssignee()', () => {
    it('担当者を割り当てできる', async () => {
      // Arrange
      const issueId = 'issue-123';
      const organizationId = 'org-123';
      const assigneeId = 'user-456';

      mockQuery.mockResolvedValueOnce({ rows: [{ assigneeId }] });

      // Act
      const result = await repository.updateAssignee(issueId, organizationId, assigneeId);

      // Assert
      expect(result).toEqual({ assigneeId });
      expect(mockQuery.mock.calls[0][0]).toContain('SET assignee_id = $1');
    });

    it('担当者を解除できる（nullを設定）', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ assigneeId: null }] });

      // Act
      const result = await repository.updateAssignee('issue-123', 'org-123', null);

      // Assert
      expect(result).toEqual({ assigneeId: null });
      expect(mockQuery.mock.calls[0][1][0]).toBeNull();
    });
  });

  describe('delete()', () => {
    it('問題を削除できる', async () => {
      // Arrange
      const issueId = 'issue-123';
      const organizationId = 'org-123';

      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      // Act
      const result = await repository.delete(issueId, organizationId);

      // Assert
      expect(result).toBe(true);
      expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM issues');
      expect(mockQuery.mock.calls[0][0]).toContain('WHERE issue_id = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('AND organization_id = $2');
    });

    it('問題が見つからない場合はfalseを返す', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      // Act
      const result = await repository.delete('not-exist', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('セキュリティ - organization_idフィルタ', () => {
    it('すべてのクエリにorganization_idフィルタが含まれる', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act & Assert - findById
      await repository.findById('id', 'org-123');
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id');

      // Act & Assert - findByOrganization
      mockQuery.mockClear();
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      await repository.findByOrganization('org-123', {});
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id');

      // Act & Assert - update
      mockQuery.mockClear();
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.update('id', 'org-123', {});
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id');

      // Act & Assert - delete
      mockQuery.mockClear();
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await repository.delete('id', 'org-123');
      expect(mockQuery.mock.calls[0][0]).toContain('organization_id');
    });
  });
});