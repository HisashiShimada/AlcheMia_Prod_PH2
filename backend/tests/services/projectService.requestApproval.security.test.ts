/**
 * ProjectService.requestApproval - セキュリティテスト（organization_idフィルタ確認）
 * 
 * Task 5.2.1: 全DBクエリのorganization_idフィルタ確認
 * Requirements: 12
 * 
 * このテストスイートでは、requestApprovalメソッド内のすべてのDBクエリが
 * organization_idフィルタを正しく適用しているかを検証します。
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// モック設定
jest.mock('../../src/database/db');

describe('ProjectService.requestApproval - Security (organization_id filter)', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // ProjectServiceインスタンス作成
    projectService = new ProjectService();

    // モッククライアント作成
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // モックプール作成
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    // トランザクション制御のモック
    mockClient.query.mockImplementation((query: string) => {
      if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
        return Promise.resolve();
      }
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. プロジェクト取得クエリのorganization_idフィルタ', () => {
    it('プロジェクト取得時にorganization_idフィルタが適用されること', async () => {
      // Arrange
      const projectId = 'project-123';
      const organizationId = 'org-456';
      const userId = 'user-789';

      // プロジェクト取得クエリのモック（organization_idフィルタあり）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1, // active
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリモック
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [{ user_name: 'Test User' }] }); // ユーザー名取得

      // Act
      await projectService.requestApproval(projectId, 'test comment', organizationId, userId);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND project_id = $2'),
        [organizationId, projectId]
      );
    });

    it('異なるorganization_idではプロジェクトが取得できないこと', async () => {
      // Arrange
      const projectId = 'project-123';
      const wrongOrgId = 'org-999';
      const userId = 'user-789';

      // プロジェクトが見つからない（organization_idフィルタにより）
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const result = await projectService.requestApproval(projectId, null, wrongOrgId, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toBe('プロジェクトが見つかりません');
    });
  });

  describe('2. プロジェクトステータス更新のorganization_idフィルタ', () => {
    it('ステータス更新時にorganization_idフィルタが適用されること', async () => {
      // Arrange
      const projectId = 'project-123';
      const organizationId = 'org-456';
      const userId = 'user-789';

      // プロジェクト取得クエリのモック
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1, // active
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリモック
      let updateQueryCalled = false;
      let updateQueryParams: any[] = [];

      mockClient.query.mockImplementation((query: string, params?: any[]) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        
        if (query.includes('UPDATE project')) {
          updateQueryCalled = true;
          updateQueryParams = params || [];
          return Promise.resolve({ rows: [] });
        }
        
        // ユーザー名取得
        if (query.includes('FROM organization_user')) {
          return Promise.resolve({ rows: [{ user_name: 'Test User' }] });
        }
        
        return Promise.resolve({ rows: [] });
      });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      expect(updateQueryCalled).toBe(true);
      expect(updateQueryParams).toContain(organizationId);
      expect(updateQueryParams).toContain(projectId);
    });
  });

  describe('3. ユーザー名取得のorganization_idフィルタ', () => {
    it('ユーザー名取得時にorganization_idフィルタが適用されること', async () => {
      // Arrange
      const projectId = 'project-123';
      const organizationId = 'org-456';
      const userId = 'user-789';

      // プロジェクト取得クエリのモック
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1, // active
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリモック
      let userQueryCalled = false;
      let userQueryParams: any[] = [];

      mockClient.query.mockImplementation((query: string, params?: any[]) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        
        if (query.includes('UPDATE project')) {
          return Promise.resolve({ rows: [] });
        }
        
        if (query.includes('FROM organization_user') && query.includes('WHERE organization_id = $1 AND user_id = $2')) {
          userQueryCalled = true;
          userQueryParams = params || [];
          return Promise.resolve({ rows: [{ user_name: 'Test User' }] });
        }
        
        return Promise.resolve({ rows: [] });
      });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      expect(userQueryCalled).toBe(true);
      expect(userQueryParams).toEqual([organizationId, userId]);
    });
  });

  describe('5. 統合テスト: すべてのクエリでorganization_idフィルタが適用されること', () => {
    it('requestApproval全体でorganization_id分離が維持されること', async () => {
      // Arrange
      const projectId = 'project-123';
      const organizationId = 'org-456';
      const userId = 'user-789';
      const comment = 'Approval request test';

      const queriesWithOrgId: string[] = [];

      // プロジェクト取得クエリのモック
      mockPool.query.mockImplementation((_query: string, params?: any[]) => {
        if (params && params[0] === organizationId) {
          queriesWithOrgId.push('pool.query');
        }
        return Promise.resolve({
          rows: [
            {
              project_id: projectId,
              project_name: 'Test Project',
              project_status: 1,
              organization_id: organizationId,
            },
          ],
        });
      });

      // トランザクション内のクエリモック
      mockClient.query.mockImplementation((query: string, params?: any[]) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        
        if (params && params.includes(organizationId)) {
          queriesWithOrgId.push('client.query');
        }
        
        if (query.includes('FROM organization_user')) {
          return Promise.resolve({ rows: [{ user_name: 'Test User' }] });
        }
        
        return Promise.resolve({ rows: [] });
      });

      // Act
      const result = await projectService.requestApproval(projectId, comment, organizationId, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(queriesWithOrgId.length).toBeGreaterThanOrEqual(2); // 最低2つのクエリでorganization_id使用
      expect(queriesWithOrgId).toContain('pool.query'); // プロジェクト取得
      expect(queriesWithOrgId).toContain('client.query'); // UPDATE/ユーザー取得
    });
  });
});