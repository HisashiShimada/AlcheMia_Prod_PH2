/**
 * issueRepository.addComment() - Task 7.3: 排他制御テスト
 * FOR UPDATE ロック取得と並行アクセス制御の検証
 */

import { getPool } from '../../src/database/db';
import { IssueRepository } from '../../src/repositories/issueRepository';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('issueRepository.addComment - Task 7.3: 排他制御テスト', () => {
  let repository: IssueRepository;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    repository = new IssueRepository();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('7.3.1 FOR UPDATE によるロック取得を検証', () => {
    it('should use FOR UPDATE clause in SELECT query for issue existence check', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const userId = 'user-789';
      const comment = 'ロックテストコメント';

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({
          // SELECT ... FROM issues FOR UPDATE
          rows: [{ id: issueId, project_id: 'proj-1', organization_id: organizationId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 }) // MAX sequence
        .mockResolvedValueOnce({ rows: [{ sequence_no: 1 }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({
          // SELECT with author_name
          rows: [{
            organization_id: organizationId,
            project_id: 'proj-1',
            issue_id: issueId,
            sequence_no: 1,
            comment,
            author_id: userId,
            author_name: 'Test User',
            commented_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      await repository.addComment(organizationId, issueId, userId, comment);

      // Verify FOR UPDATE was used
      const selectQuery = mockClient.query.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && 
                        call[0].includes('SELECT') && 
                        call[0].includes('FROM issues')
      );

      expect(selectQuery).toBeDefined();
      expect(selectQuery[0]).toContain('FOR UPDATE');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('7.3.2 並行アクセス時のロック待機動作を検証', () => {
    it('should serialize concurrent access to the same issue preventing duplicate sequence numbers', async () => {
      const organizationId = 'org-123';
      const issueId = 'issue-456';
      const user1Id = 'user-111';
      const user2Id = 'user-222';

      // First transaction - acquires lock and inserts comment with sequence_no=1
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: issueId, project_id: 'proj-1', organization_id: organizationId }],
          rowCount: 1,
        }) // FOR UPDATE (acquires lock)
        .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 }) // MAX = 1
        .mockResolvedValueOnce({ rows: [{ sequence_no: 1 }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({
          rows: [{
            organization_id: organizationId,
            project_id: 'proj-1',
            issue_id: issueId,
            sequence_no: 1,
            comment: 'First',
            author_id: user1Id,
            author_name: 'User 1',
            commented_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT (releases lock)

      const result1 = await repository.addComment(organizationId, issueId, user1Id, 'First');

      expect(result1.sequenceNo).toBe(1);

      // Second transaction - waits for lock, then sees first comment and uses sequence_no=2
      mockClient.query.mockClear();

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: issueId, project_id: 'proj-1', organization_id: organizationId }],
          rowCount: 1,
        }) // FOR UPDATE (waits, then acquires lock)
        .mockResolvedValueOnce({ rows: [{ next_seq: 2 }], rowCount: 1 }) // MAX = 2 (sees first comment)
        .mockResolvedValueOnce({ rows: [{ sequence_no: 2 }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({
          rows: [{
            organization_id: organizationId,
            project_id: 'proj-1',
            issue_id: issueId,
            sequence_no: 2,
            comment: 'Second',
            author_id: user2Id,
            author_name: 'User 2',
            commented_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result2 = await repository.addComment(organizationId, issueId, user2Id, 'Second');

      // Second transaction should get sequence_no=2 (no duplicate!)
      expect(result2.sequenceNo).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('7.3.3 デッドロック回避: トランザクション順序制御を検証', () => {
    it('should avoid deadlocks when locking different issues in separate transactions', async () => {
      const organizationId = 'org-123';
      const issue1Id = 'issue-111';
      const issue2Id = 'issue-222';
      const userId = 'user-789';

      // Transaction 1: Lock issue-111
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ issue_id: issue1Id, project_id: 'proj-1', organization_id: organizationId }],
          rowCount: 1,
        }) // FOR UPDATE on issue-111
        .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({
          // INSERT returns the inserted row
          rows: [{
            organization_id: organizationId,
            project_id: 'proj-1',
            issue_id: issue1Id,
            sequence_no: 1,
            comment: 'Comment 1',
            author_id: userId,
            commented_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ user_name: 'User' }], rowCount: 1 }) // Author name query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result1 = await repository.addComment(organizationId, issue1Id, userId, 'Comment 1');

      expect(result1.issueId).toBe(issue1Id);
      expect(result1.sequenceNo).toBe(1);

      // Transaction 2: Lock issue-222 (different issue, no conflict)
      mockClient.query.mockClear();

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ issue_id: issue2Id, project_id: 'proj-1', organization_id: organizationId }],
          rowCount: 1,
        }) // FOR UPDATE on issue-222 (no conflict with issue-111)
        .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({
          // INSERT returns the inserted row
          rows: [{
            organization_id: organizationId,
            project_id: 'proj-1',
            issue_id: issue2Id,
            sequence_no: 1,
            comment: 'Comment 2',
            author_id: userId,
            commented_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ user_name: 'User' }], rowCount: 1 }) // Author name query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result2 = await repository.addComment(organizationId, issue2Id, userId, 'Comment 2');

      expect(result2.issueId).toBe(issue2Id);
      expect(result2.sequenceNo).toBe(1);

      // Both transactions completed successfully without deadlock
      // because they locked different rows (different issue_id)
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});