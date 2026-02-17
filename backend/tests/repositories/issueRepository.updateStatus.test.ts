/**
 * IssueRepository.updateStatus メソッドの単体テスト
 * Task 2.1: ステータス変更時のフィールド更新ロジック検証
 * 
 * Requirements:
 * - resolved時に issue_completer_id、issue_complate_at、update_at が正しく設定されること
 * - unresolved時に issue_completer_id、issue_complate_at がNULLクリアされること
 * - update_user_id が常に現在のユーザーIDに更新されること
 */

import { IssueRepository } from '../../src/repositories/issueRepository';
import { getPool } from '../../src/database/db';
import { Issue } from '../../src/types/issue';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('IssueRepository.updateStatus', () => {
  let repository: IssueRepository;
  let mockQuery: jest.Mock;

  const testOrgId = 'org-123';
  const testUserId1 = 'user-123';
  const testUserId2 = 'user-456';
  const testIssueId = 'issue-123';

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

  describe('resolved時のフィールド更新', () => {
    it('statusが"resolved"に設定され、issue_completer_idとissue_complate_atが設定されること', async () => {
      // Arrange
      const updatedIssue: Issue = {
        organizationId: testOrgId,
        projectId: 'proj-123',
        issueId: testIssueId,
        methodId: 'method-001',
        issueTarget: 1,
        taskNo: null,
        transitionId: null,
        issueTitle: 'Test Issue',
        issueType: 1,
        issueContents: 'Test contents',
        status: 'resolved', // resolved状態
        issueReporterId: testUserId1,
        issueReportAt: '2026-02-13T10:00:00Z',
        issueCompleterId: testUserId2, // 解決者が設定される
        issueComplateAt: '2026-02-13T11:00:00Z', // 解決日時が設定される
        createUserId: testUserId1,
        createAt: '2026-02-13T10:00:00Z',
        updateUserId: testUserId2, // 更新者が設定される
        updateAt: '2026-02-13T11:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedIssue] });

      // Act
      const result = await repository.updateStatus(
        testIssueId,
        testOrgId,
        testUserId2,
        1 // resolved
      );

      // Assert
      expect(result).toEqual(updatedIssue);
      expect(result!.status).toBe('resolved');
      expect(result!.issueCompleterId).toBe(testUserId2);
      expect(result!.issueComplateAt).not.toBeNull();
      expect(result!.updateUserId).toBe(testUserId2);

      // SQLクエリの検証
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('UPDATE issues');
      expect(query).toContain('SET status = $1');
      expect(query).toContain('issue_completer_id = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN $2');
      expect(query).toContain('issue_complate_at = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN CURRENT_TIMESTAMP');
      expect(query).toContain('update_user_id = $2');
      expect(query).toContain('WHERE issue_id = $3 AND organization_id = $4');

      // パラメータの検証
      const params = mockQuery.mock.calls[0][1];
      expect(params[0]).toBe(1); // statusNumber
      expect(params[1]).toBe(testUserId2); // userId
      expect(params[2]).toBe(testIssueId); // issueId
      expect(params[3]).toBe(testOrgId); // organizationId
    });

    it('update_atがCURRENT_TIMESTAMPで更新されること', async () => {
      // Arrange
      const updatedIssue: Issue = {
        organizationId: testOrgId,
        projectId: 'proj-123',
        issueId: testIssueId,
        methodId: 'method-001',
        issueTarget: 1,
        taskNo: null,
        transitionId: null,
        issueTitle: 'Test Issue',
        issueType: 1,
        issueContents: 'Test',
        status: 'resolved',
        issueReporterId: testUserId1,
        issueReportAt: '2026-02-13T10:00:00Z',
        issueCompleterId: testUserId2,
        issueComplateAt: '2026-02-13T11:00:00Z',
        createUserId: testUserId1,
        createAt: '2026-02-13T10:00:00Z',
        updateUserId: testUserId2,
        updateAt: '2026-02-13T11:00:00Z', // 新しいタイムスタンプ
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedIssue] });

      // Act
      const result = await repository.updateStatus(
        testIssueId,
        testOrgId,
        testUserId2,
        1
      );

      // Assert
      expect(result).not.toBeNull();
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('update_at = CURRENT_TIMESTAMP');
    });
  });

  describe('unresolved時のフィールド更新', () => {
    it('statusが"unresolved"に設定され、issue_completer_idとissue_complate_atがNULLになること', async () => {
      // Arrange
      const updatedIssue: Issue = {
        organizationId: testOrgId,
        projectId: 'proj-123',
        issueId: testIssueId,
        methodId: 'method-001',
        issueTarget: 1,
        taskNo: null,
        transitionId: null,
        issueTitle: 'Test Issue',
        issueType: 1,
        issueContents: 'Test',
        status: 'unresolved', // unresolved状態
        issueReporterId: testUserId1,
        issueReportAt: '2026-02-13T10:00:00Z',
        issueCompleterId: null, // NULLにクリアされる
        issueComplateAt: null, // NULLにクリアされる
        createUserId: testUserId1,
        createAt: '2026-02-13T10:00:00Z',
        updateUserId: testUserId1,
        updateAt: '2026-02-13T12:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedIssue] });

      // Act
      const result = await repository.updateStatus(
        testIssueId,
        testOrgId,
        testUserId1,
        0 // unresolved
      );

      // Assert
      expect(result).toEqual(updatedIssue);
      expect(result!.status).toBe('unresolved');
      expect(result!.issueCompleterId).toBeNull();
      expect(result!.issueComplateAt).toBeNull();
      expect(result!.updateUserId).toBe(testUserId1);

      // パラメータの検証
      const params = mockQuery.mock.calls[0][1];
      expect(params[0]).toBe(0); // statusNumber = 0 (unresolved)
      expect(params[1]).toBe(testUserId1); // userId
    });

    it('update_user_idが指定されたユーザーIDに更新されること', async () => {
      // Arrange
      const updatedIssue: Issue = {
        organizationId: testOrgId,
        projectId: 'proj-123',
        issueId: testIssueId,
        methodId: 'method-001',
        issueTarget: 1,
        taskNo: null,
        transitionId: null,
        issueTitle: 'Test Issue',
        issueType: 1,
        issueContents: 'Test',
        status: 'unresolved',
        issueReporterId: testUserId1,
        issueReportAt: '2026-02-13T10:00:00Z',
        issueCompleterId: null,
        issueComplateAt: null,
        createUserId: testUserId1,
        createAt: '2026-02-13T10:00:00Z',
        updateUserId: testUserId1, // testUserId1に変更
        updateAt: '2026-02-13T12:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedIssue] });

      // Act
      const result = await repository.updateStatus(
        testIssueId,
        testOrgId,
        testUserId1,
        0
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.updateUserId).toBe(testUserId1);
    });
  });

  describe('マルチテナント分離', () => {
    it('organization_idフィルタが必ず含まれること', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.updateStatus(testIssueId, testOrgId, testUserId1, 1);

      // Assert
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('WHERE issue_id = $3 AND organization_id = $4');
      
      const params = mockQuery.mock.calls[0][1];
      expect(params[3]).toBe(testOrgId); // organization_idが4番目のパラメータ
    });

    it('他組織の問題は更新されない（nullが返る）', async () => {
      // Arrange: 空の結果（問題が見つからない）
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.updateStatus(
        testIssueId,
        testOrgId,
        testUserId1,
        1
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('存在しない問題IDでnullを返すこと', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.updateStatus(
        'non_existent_issue',
        testOrgId,
        testUserId1,
        1
      );

      // Assert
      expect(result).toBeNull();
    });

    it('CASE文が正しく構築されていること（resolved時）', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{}] });

      // Act
      await repository.updateStatus(testIssueId, testOrgId, testUserId2, 1);

      // Assert
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('issue_completer_id = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN $2 ELSE issue_completer_id END');
      expect(query).toContain('issue_complate_at = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN CURRENT_TIMESTAMP ELSE issue_complate_at END');
    });

    it('Parameterized Queriesが使用されていること（SQLインジェクション対策）', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.updateStatus(testIssueId, testOrgId, testUserId1, 1);

      // Assert
      const query = mockQuery.mock.calls[0][0];
      // プレースホルダー（$1, $2, $3, $4）が使用されていること
      expect(query).toMatch(/\$1/);
      expect(query).toMatch(/\$2/);
      expect(query).toMatch(/\$3/);
      expect(query).toMatch(/\$4/);
      
      // パラメータが配列で渡されていること
      const params = mockQuery.mock.calls[0][1];
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBe(4);
    });
  });
});
