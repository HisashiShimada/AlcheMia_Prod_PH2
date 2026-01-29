/**
 * ProjectService.requestApproval ユニットテスト
 * 
 * @description 承認依頼ビジネスロジックのテスト
 * Task: 3.1 プロジェクト存在確認とステータス検証
 * Requirements: 3, 4, 10
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベースプールをモック
jest.mock('../../src/database/db');

describe('ProjectService.requestApproval - Task 3.1: プロジェクト存在確認とステータス検証', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let mockRelease: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockConnect = jest.fn();

    // モッククライアント（トランザクション用）
    mockClient = {
      query: mockQuery,
      release: mockRelease,
    };

    // モックプール
    mockPool = {
      query: jest.fn(), // プロジェクト取得用（トランザクション外）
      connect: mockConnect,
    };

    mockConnect.mockResolvedValue(mockClient);
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 3: プロジェクト存在確認', () => {
    it('should return RESOURCE_NOT_FOUND error when project does not exist', async () => {
      // Arrange
      const projectId = 'non-existent-project-id';
      const organizationId = 'org-uuid-123';
      const userId = 'user-uuid-456';
      const comment = 'Test comment';

      // プロジェクトが存在しない（空の結果）
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        comment,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('プロジェクト');
      expect(result.error?.message).toContain('見つかりません');

      // organization_idフィルタが適用されていることを確認
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([organizationId, projectId])
      );
    });

    it('should query project with organization_id filter (マルチテナント分離)', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('organization_id'),
        expect.arrayContaining([organizationId, projectId])
      );
    });
  });

  describe('Requirement 4: プロジェクトステータス検証', () => {
    it('should accept request when project_status is "active"', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';
      const comment = 'Test comment';

      // プロジェクトが存在し、ステータスが active (1)（トランザクション外）
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

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE project
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        // ユーザー名取得クエリ（トランザクション後）
        .mockResolvedValueOnce({
          rows: [
            {
              user_name: 'テストユーザー',
            },
          ],
        });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        comment,
        organizationId,
        userId
      );

      // Assert
      // ステータスが active の場合、エラーが返らないことを確認
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.project_id).toBe(projectId);
    });

    it('should return BUSINESS_STATUS_INVALID error when project_status is "draft" (0)', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 0, // draft
          },
        ],
      });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('BUSINESS_STATUS_INVALID');
      expect(result.error?.message).toContain('ステータス');
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details.currentStatus).toBe('draft');
      expect(result.error?.details.requiredStatus).toBe('active');
    });

    it('should return specific error message when project_status is "waiting_approval" (2)', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 2, // waiting_approval
          },
        ],
      });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('BUSINESS_STATUS_INVALID');
      expect(result.error?.message).toContain('既に承認依頼が送信されています');
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details.currentStatus).toBe('waiting_approval');
    });

    it('should return BUSINESS_STATUS_INVALID error when project_status is "approved" (3)', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 3, // approved
          },
        ],
      });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BUSINESS_STATUS_INVALID');
      expect(result.error?.details.currentStatus).toBe('approved');
    });

    it('should return BUSINESS_STATUS_INVALID error when project_status is "archived" (4)', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 4, // archived
          },
        ],
      });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BUSINESS_STATUS_INVALID');
      expect(result.error?.details.currentStatus).toBe('archived');
    });
  });

  describe('Requirement 10: エラーハンドリング', () => {
    it('should return SYSTEM_DATABASE_ERROR when database query fails', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(result.error?.message).toContain('データベースエラー');
      expect(result.error?.originalError).toBe(dbError);
    });
  });
});