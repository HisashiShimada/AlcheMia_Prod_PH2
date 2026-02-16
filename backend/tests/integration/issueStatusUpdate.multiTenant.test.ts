/**
 * Issue Status Update API - Multi-Tenant Isolation Integration Tests
 * Task 2.2: マルチテナント分離の徹底確認
 * 
 * Requirements:
 * - すべてのDBクエリに organization_id フィルタが含まれることを確認
 * - Parameterized Queriesが使用されていることを確認（SQLインジェクション対策）
 * - 他組織の問題へのアクセスが404エラーを返すことを確認
 * 
 * Test Strategy:
 * - RED: Write failing tests first
 * - GREEN: Verify existing implementation passes
 * - REFACTOR: Clean up if needed
 */

import { IssueRepository } from '../../src/repositories/issueRepository';
import { IssueService } from '../../src/services/issueService';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('Issue Status Update - Multi-Tenant Isolation (Task 2.2)', () => {
  let mockQuery: jest.Mock;

  const org1 = 'org-001';
  const org2 = 'org-002';
  const user1 = 'user-001';
  const issue1 = 'issue-001';
  const issue2 = 'issue-002';

  beforeEach(() => {
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 3.1: organization_id フィルタの必須化', () => {
    it('【RED→GREEN】findByIdクエリに organization_id フィルタが含まれること', async () => {
      // Arrange
      const repository = new IssueRepository();
      mockQuery.mockResolvedValueOnce({ rows: [] }); // 問題が見つからない

      // Act
      await repository.findById(issue1, org1);

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [query, params] = mockQuery.mock.calls[0];
      
      // organization_id フィルタが WHERE 句に含まれる
      expect(query).toContain('WHERE issue_id = $1 AND organization_id = $2');
      
      // パラメータに organization_id が含まれる
      expect(params[0]).toBe(issue1);
      expect(params[1]).toBe(org1);
    });

    it('【RED→GREEN】updateStatusクエリに organization_id フィルタが含まれること', async () => {
      // Arrange
      const repository = new IssueRepository();
      mockQuery.mockResolvedValueOnce({ rows: [] }); // 更新失敗

      // Act
      await repository.updateStatus(issue1, org1, user1, 1);

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [query, params] = mockQuery.mock.calls[0];
      
      // organization_id フィルタが WHERE 句に含まれる
      expect(query).toContain('WHERE issue_id = $3 AND organization_id = $4');
      
      // パラメータに organization_id が含まれる
      expect(params[2]).toBe(issue1);
      expect(params[3]).toBe(org1);
    });
  });

  describe('Requirement 3.2: Parameterized Queries の使用確認', () => {
    it('【RED→GREEN】findByIdがParameterized Queriesを使用していること', async () => {
      // Arrange
      const repository = new IssueRepository();
      
      // SQLインジェクション攻撃を試みる入力
      const maliciousIssueId = "issue'; DROP TABLE issues; --";
      const maliciousOrgId = "org' OR '1'='1";
      
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.findById(maliciousIssueId, maliciousOrgId);

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // プレースホルダーが使用されていること
      expect(query).toMatch(/\$1/);
      expect(query).toMatch(/\$2/);
      
      // パラメータが配列で渡されていること（文字列連結ではない）
      expect(Array.isArray(params)).toBe(true);
      expect(params[0]).toBe(maliciousIssueId);
      expect(params[1]).toBe(maliciousOrgId);
      
      // クエリに直接値が埋め込まれていないこと
      expect(query).not.toContain(maliciousIssueId);
      expect(query).not.toContain(maliciousOrgId);
    });

    it('【RED→GREEN】updateStatusがParameterized Queriesを使用していること', async () => {
      // Arrange
      const repository = new IssueRepository();
      
      // SQLインジェクション攻撃を試みる入力
      const maliciousUserId = "user'; UPDATE issues SET status = 1; --";
      
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.updateStatus(issue1, org1, maliciousUserId, 1);

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // プレースホルダーが使用されていること
      expect(query).toMatch(/\$1/);
      expect(query).toMatch(/\$2/);
      expect(query).toMatch(/\$3/);
      expect(query).toMatch(/\$4/);
      
      // パラメータが配列で渡されていること
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBe(4);
      expect(params[1]).toBe(maliciousUserId);
      
      // クエリに直接値が埋め込まれていないこと
      expect(query).not.toContain(maliciousUserId);
    });
  });

  describe('Requirement 3.3: クロスオーガニゼーションアクセスの防止', () => {
    it('【RED→GREEN】他組織の問題へのアクセス時、findByIdがnullを返すこと', async () => {
      // Arrange
      const repository = new IssueRepository();
      
      // org2に属する問題だが、org1でアクセスを試みる
      mockQuery.mockResolvedValueOnce({ rows: [] }); // 見つからない

      // Act
      const result = await repository.findById(issue2, org1);

      // Assert
      expect(result).toBeNull();
      
      // organization_id フィルタが適用されていることを確認
      const params = mockQuery.mock.calls[0][1];
      expect(params[1]).toBe(org1); // org1でフィルタリング
    });

    it('【RED→GREEN】他組織の問題の更新時、updateStatusがnullを返すこと', async () => {
      // Arrange
      const repository = new IssueRepository();
      
      // org2に属する問題だが、org1で更新を試みる
      mockQuery.mockResolvedValueOnce({ rows: [] }); // 更新失敗

      // Act
      const result = await repository.updateStatus(issue2, org1, user1, 1);

      // Assert
      expect(result).toBeNull();
      
      // organization_id フィルタが適用されていることを確認
      const params = mockQuery.mock.calls[0][1];
      expect(params[3]).toBe(org1); // org1でフィルタリング
    });

    it('【RED→GREEN】Service層: 他組織の問題へのアクセス時、NotFoundErrorとなること', async () => {
      // Arrange
      const service = new IssueService();
      
      // 問題が見つからない（他組織に属する）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // findById が null を返す
        .mockResolvedValueOnce({ rows: [] }); // updateStatus は呼ばれない

      // Act
      const result = await service.updateStatus(org1, issue2, user1, 'resolved');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('問題報告が見つかりません');
    });

  });

  describe('Requirement 3.4: 同一組織内のアクセスは成功すること', () => {
    it('【RED→GREEN】同一組織の問題へのアクセス時、findByIdが問題を返すこと', async () => {
      // Arrange
      const repository = new IssueRepository();
      
      const mockIssue = {
        organizationId: org1,
        projectId: 'proj-001',
        issueId: issue1,
        methodId: 'method-001',
        issueTarget: 1,
        taskNo: null,
        transitionId: null,
        issueTitle: 'Test Issue',
        issueType: 1,
        issueContents: 'Test',
        status: 'unresolved',
        issueReporterId: user1,
        issueReportAt: '2026-02-13T10:00:00Z',
        issueCompleterId: null,
        issueComplateAt: null,
        createUserId: user1,
        createAt: '2026-02-13T10:00:00Z',
        updateUserId: user1,
        updateAt: '2026-02-13T10:00:00Z',
      };
      
      mockQuery.mockResolvedValueOnce({ rows: [mockIssue] });

      // Act
      const result = await repository.findById(issue1, org1);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe(org1);
      expect(result?.issueId).toBe(issue1);
    });

    it('【RED→GREEN】同一組織の問題の更新時、updateStatusが成功すること', async () => {
      // Arrange
      const repository = new IssueRepository();
      
      const mockUpdatedIssue = {
        organizationId: org1,
        projectId: 'proj-001',
        issueId: issue1,
        methodId: 'method-001',
        issueTarget: 1,
        taskNo: null,
        transitionId: null,
        issueTitle: 'Test Issue',
        issueType: 1,
        issueContents: 'Test',
        status: 'resolved',
        issueReporterId: user1,
        issueReportAt: '2026-02-13T10:00:00Z',
        issueCompleterId: user1,
        issueComplateAt: '2026-02-13T11:00:00Z',
        createUserId: user1,
        createAt: '2026-02-13T10:00:00Z',
        updateUserId: user1,
        updateAt: '2026-02-13T11:00:00Z',
      };
      
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedIssue] });

      // Act
      const result = await repository.updateStatus(issue1, org1, user1, 1);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe(org1);
      expect(result?.status).toBe('resolved');
      expect(result?.issueCompleterId).toBe(user1);
    });
  });

  describe('Requirement 3.5: マルチテナント分離の網羅的検証', () => {
    it('【RED→GREEN】複数組織が同じissue_idを持つ場合でも、正しく分離されること', async () => {
      // Arrange
      const repository = new IssueRepository();
      const sameIssueId = 'issue-common';
      
      // org1 の問題
      const org1Issue = {
        organizationId: org1,
        projectId: 'proj-001',
        issueId: sameIssueId,
        issueTitle: 'Org1 Issue',
        status: 'unresolved',
      };
      
      mockQuery.mockResolvedValueOnce({ rows: [org1Issue] });

      // Act: org1 でアクセス
      const result1 = await repository.findById(sameIssueId, org1);

      // Assert
      expect(result1).not.toBeNull();
      expect(result1?.organizationId).toBe(org1);
      expect(result1?.issueTitle).toBe('Org1 Issue');
      
      // クエリパラメータを検証
      const params1 = mockQuery.mock.calls[0][1];
      expect(params1[1]).toBe(org1);

      // Arrange: org2 でアクセス
      mockQuery.mockResolvedValueOnce({ rows: [] }); // org2には存在しない

      // Act
      const result2 = await repository.findById(sameIssueId, org2);

      // Assert
      expect(result2).toBeNull();
      
      // クエリパラメータを検証
      const params2 = mockQuery.mock.calls[1][1];
      expect(params2[1]).toBe(org2);
    });

    it('【RED→GREEN】organization_id が WHERE 句の最後にあっても正しく機能すること', async () => {
      // Arrange
      const repository = new IssueRepository();
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.updateStatus(issue1, org1, user1, 1);

      // Assert
      const query = mockQuery.mock.calls[0][0];
      
      // WHERE 句の構造を確認
      expect(query).toContain('WHERE issue_id = $3 AND organization_id = $4');
      
      // organization_id が必ず AND 条件で結合されていること
      expect(query.toLowerCase()).toMatch(/where.*and.*organization_id/);
    });
  });

  describe('Security: SQLインジェクション攻撃の防止', () => {
    it('【RED→GREEN】organization_id にSQLインジェクションを試みても無効化されること', async () => {
      // Arrange
      const repository = new IssueRepository();
      const attackOrgId = "' OR '1'='1' --";
      
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.findById(issue1, attackOrgId);

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // パラメータとして渡されているため、SQLインジェクションは無効
      expect(params[1]).toBe(attackOrgId);
      expect(query).not.toContain("OR '1'='1'");
      expect(query).toContain('$2'); // プレースホルダー
    });

    it('【RED→GREEN】issue_id にSQLインジェクションを試みても無効化されること', async () => {
      // Arrange
      const repository = new IssueRepository();
      const attackIssueId = "issue-001'; DELETE FROM issues WHERE '1'='1";
      
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await repository.updateStatus(attackIssueId, org1, user1, 1);

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // パラメータとして渡されているため、SQLインジェクションは無効
      expect(params[2]).toBe(attackIssueId);
      expect(query).not.toContain('DELETE FROM');
      expect(query).toContain('$3'); // プレースホルダー
    });
  });
});
