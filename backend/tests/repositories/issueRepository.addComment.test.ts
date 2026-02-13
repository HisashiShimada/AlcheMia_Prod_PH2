/**
 * issueRepository.addComment() メソッドのテスト
 * Task 7.1-7.4: リポジトリ層テスト
 */

import { getPool } from '../../src/database/db';
import { IssueRepository } from '../../src/repositories/issueRepository';
import { NotFoundError } from '../../src/utils/errorClasses';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('issueRepository.addComment - リポジトリ層テスト', () => {
  let repository: IssueRepository;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    repository = new IssueRepository();
    // トランザクションクライアントのモック
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // コネクションプールのモック
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 7.1: トランザクション正常系テスト', () => {
    it('should successfully insert a comment within a transaction', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = 'テストコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });

      // Mock sequence number query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });

      // Mock INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: 'project-123',
          issue_id: issueId,
          sequence_no: 1,
          comment,
          author_id: userId,
          commented_at: new Date(),
        }],
        rowCount: 1,
      });

      // Mock author name query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
        rowCount: 1,
      });

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.addComment(organizationId, issueId, userId, comment);

      expect(result.issueId).toBe(issueId);
      expect(result.sequenceNo).toBe(1);
      expect(result.comment).toBe(comment);
      expect(result.authorId).toBe(userId);
      expect(result.authorName).toBe('Test User');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = 'テストコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });

      // Mock sequence number query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });

      // Mock INSERT failure
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repository.addComment(organizationId, issueId, userId, comment)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Task 7.2: シーケンス番号採番テスト', () => {
    it('should assign sequence_no=1 when no existing comments', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = '最初のコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });

      // Mock sequence number query (no existing comments)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });

      // Mock INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: 'project-123',
          issue_id: issueId,
          sequence_no: 1,
          comment,
          author_id: userId,
          commented_at: new Date(),
        }],
        rowCount: 1,
      });

      // Mock author name query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
        rowCount: 1,
      });

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.addComment(organizationId, issueId, userId, comment);

      expect(result.sequenceNo).toBe(1);
    });

    it('should assign MAX(sequence_no)+1 when existing comments', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = '2番目のコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });

      // Mock sequence number query (existing comment with sequence_no=1)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 2 }],
        rowCount: 1,
      });

      // Mock INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: 'project-123',
          issue_id: issueId,
          sequence_no: 2,
          comment,
          author_id: userId,
          commented_at: new Date(),
        }],
        rowCount: 1,
      });

      // Mock author name query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
        rowCount: 1,
      });

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.addComment(organizationId, issueId, userId, comment);

      expect(result.sequenceNo).toBe(2);
    });

    it('should assign sequential numbers for multiple comments', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';

      for (let i = 1; i <= 3; i++) {
        mockClient.query.mockClear();

        // Mock BEGIN
        mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Mock issue existence check
        mockClient.query.mockResolvedValueOnce({
          rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
          rowCount: 1,
        });

        // Mock sequence number query
        mockClient.query.mockResolvedValueOnce({
          rows: [{ next_seq: i }],
          rowCount: 1,
        });

        // Mock INSERT
        mockClient.query.mockResolvedValueOnce({
          rows: [{
            organization_id: organizationId,
            project_id: 'project-123',
            issue_id: issueId,
            sequence_no: i,
            comment: `コメント ${i}`,
            author_id: userId,
            commented_at: new Date(),
          }],
          rowCount: 1,
        });

        // Mock author name query
        mockClient.query.mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
          rowCount: 1,
        });

        // Mock COMMIT
        mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await repository.addComment(organizationId, issueId, userId, `コメント ${i}`);

        expect(result.sequenceNo).toBe(i);
      }
    });

    it('should maintain independent sequence numbers for different issues', async () => {
      const organizationId = 'org-123';
      const userId = 'user-789';
      const issue1Id = 'issue-111';
      const issue2Id = 'issue-222';

      // Issue 1 - First comment
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issue1Id, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: 'project-123',
          issue_id: issue1Id,
          sequence_no: 1,
          comment: 'Issue 1 のコメント',
          author_id: userId,
          commented_at: new Date(),
        }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result1 = await repository.addComment(organizationId, issue1Id, userId, 'Issue 1 のコメント');
      expect(result1.sequenceNo).toBe(1);

      // Issue 2 - First comment (should also be sequence_no=1)
      mockClient.query.mockClear();
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issue2Id, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: 'project-123',
          issue_id: issue2Id,
          sequence_no: 1,
          comment: 'Issue 2 のコメント',
          author_id: userId,
          commented_at: new Date(),
        }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result2 = await repository.addComment(organizationId, issue2Id, userId, 'Issue 2 のコメント');
      expect(result2.sequenceNo).toBe(1);
    });
  });

  describe('Task 7.3: 排他制御テスト', () => {
    it('should use FOR UPDATE clause in issue existence check query', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = 'ロックテストコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check with FOR UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });

      // Mock sequence number query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });

      // Mock INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: 'project-123',
          issue_id: issueId,
          sequence_no: 1,
          comment,
          author_id: userId,
          commented_at: new Date(),
        }],
        rowCount: 1,
      });

      // Mock author name query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
        rowCount: 1,
      });

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.addComment(organizationId, issueId, userId, comment);

      // Verify FOR UPDATE was used in the issue existence check
      const issueCheckCall = mockClient.query.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('FOR UPDATE')
      );

      expect(issueCheckCall).toBeDefined();
      expect(issueCheckCall[0]).toContain('FOR UPDATE');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Task 7.4: エラーケーステスト', () => {
    it('should throw NotFoundError when issue does not exist', async () => {
      const organizationId = 'org-123';
      const issueId = 'nonexistent-issue';
      const userId = 'user-789';
      const comment = 'テストコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check (no rows)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repository.addComment(organizationId, issueId, userId, comment)
      ).rejects.toThrow(NotFoundError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw NotFoundError for cross-tenant access', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = 'テストコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check (different organization_id - クエリ結果は空配列になる)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repository.addComment(organizationId, issueId, userId, comment)
      ).rejects.toThrow(NotFoundError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on database error', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = 'テストコメント';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Mock issue existence check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ issue_id: issueId, project_id: 'project-123', organization_id: organizationId }],
        rowCount: 1,
      });

      // Mock sequence number query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ next_seq: 1 }],
        rowCount: 1,
      });

      // Mock INSERT failure
      mockClient.query.mockRejectedValueOnce(new Error('Database connection error'));

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repository.addComment(organizationId, issueId, userId, comment)
      ).rejects.toThrow('Database connection error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});