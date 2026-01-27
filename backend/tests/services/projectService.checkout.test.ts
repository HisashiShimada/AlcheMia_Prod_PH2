/**
 * ProjectService チェックアウト/チェックイン機能 ユニットテスト
 * 
 * Task 4.1, 4.2, 4.3: チェックアウト/チェックイン/状態照会機能のテスト
 * Requirements: FR-1.1, FR-1.2, FR-2.1, FR-3.1, NFR-2
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベースプールをモック
jest.mock('../../src/database/db');

describe('ProjectService - Checkout/Checkin', () => {
  let projectService: ProjectService;
  let mockClient: any;
  let mockPool: any;

  const organizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
  const projectId = 'b1234567-89ab-cdef-0123-456789abcdef';
  const userId1 = 'user-001';
  const userId2 = 'user-002';

  beforeEach(() => {
    // クライアントモックの作成
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // プールモックの作成
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkout - Task 4.1', () => {
    it('should successfully checkout a project (AC-1.1.1, AC-1.1.2)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 1, // 計画中以外
        checkout_status: 0, // チェックイン中
        owner_user_id: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ has_instruction: true }] }) // instruction確認
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.isCheckedOut).toBe(true);
      expect(result.data?.checkedOutBy).toBe(userId1);
      expect(result.data?.projectId).toBe(projectId);

      // トランザクション確認
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject checkout when project_status = 0 (AC-1.1.5)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 0, // 計画中
        checkout_status: 0,
        owner_user_id: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROJECT_STATUS_INVALID');
      expect(result.error?.message).toContain('計画中');

      // ロールバック確認
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject checkout when project_instruction does not exist (AC-1.1.6)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 1,
        checkout_status: 0,
        owner_user_id: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ has_instruction: false }] }) // instruction確認
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROJECT_INSTRUCTION_NOT_FOUND');
      expect(result.error?.message).toContain('指示が登録されていません');

      // ロールバック確認
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return 409 when another user has checked out (AC-1.2.1)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 1,
        checkout_status: 1, // 既にチェックアウト中
        owner_user_id: userId2, // 別ユーザー
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ has_instruction: true }] }) // instruction確認
        .mockResolvedValueOnce({ rows: [{ user_name: 'User 2' }] }) // ユーザー名取得
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROJECT_ALREADY_CHECKED_OUT');
      expect(result.error?.message).toContain('他のユーザー');
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details.checkedOutBy).toBeTruthy();

      // ロールバック確認
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should be idempotent for same user checkout (AC-1.2.3)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 1,
        checkout_status: 1, // 既にチェックアウト中
        owner_user_id: userId1, // 同一ユーザー
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ has_instruction: true }] }) // instruction確認
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.isCheckedOut).toBe(true);
      expect(result.data?.checkedOutBy).toBe(userId1);

      // コミット確認
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should use SELECT FOR UPDATE for exclusive lock', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 1,
        checkout_status: 0,
        owner_user_id: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ has_instruction: true }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      const selectCall = mockClient.query.mock.calls[1];
      const selectQuery = selectCall[0];
      expect(selectQuery).toContain('FOR UPDATE');
    });

    it('should enforce multi-tenant isolation with organization_id (AC-1.1.4)', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE - 別組織なので見つからない
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');

      // organization_idがパラメータに含まれているか確認
      const selectCall = mockClient.query.mock.calls[1];
      const params = selectCall[1];
      expect(params).toContain(organizationId);
    });

    it('should return 404 when project not found', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await projectService.checkout(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('checkin - Task 4.2', () => {
    it('should successfully checkin a project (AC-2.1.1, AC-2.1.2)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 1, // チェックアウト中
        owner_user_id: userId1,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // タスク実行中確認
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.isCheckedOut).toBe(false);
      expect(result.data?.checkedOutBy).toBeNull();
      expect(result.data?.checkedOutAt).toBeNull();

      // トランザクション確認
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject checkin when tasks are running (AC-2.1.5)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 1,
        owner_user_id: userId1,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // タスク実行中: 3件
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TASK_IN_PROGRESS');
      expect(result.error?.message).toContain('実行中のタスク');
      expect(result.error?.details.runningTasksCount).toBe(3);

      // ロールバック確認
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should be idempotent for already checked in project (AC-2.1.4)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 0, // 既にチェックイン済み
        owner_user_id: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // タスク実行中確認
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.isCheckedOut).toBe(false);
      expect(result.data?.checkedOutBy).toBeNull();

      // コミット確認（UPDATEはスキップされる）
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should use SELECT FOR UPDATE for exclusive lock', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 1,
        owner_user_id: userId1,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockProject] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      const selectCall = mockClient.query.mock.calls[1];
      const selectQuery = selectCall[0];
      expect(selectQuery).toContain('FOR UPDATE');
    });

    it('should enforce multi-tenant isolation with organization_id', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');

      // organization_idがパラメータに含まれているか確認
      const selectCall = mockClient.query.mock.calls[1];
      const params = selectCall[1];
      expect(params).toContain(organizationId);
    });

    it('should return 404 when project not found', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Act
      const result = await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await projectService.checkin(organizationId, projectId, userId1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getCheckoutStatus - Task 4.3', () => {
    it('should return checkout status when project is checked out (AC-3.1.1, AC-3.1.2)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 1, // チェックアウト中
        owner_user_id: userId1,
        owner_user_name: 'Test User',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      // Act
      const result = await projectService.getCheckoutStatus(organizationId, projectId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.projectId).toBe(projectId);
      expect(result.data?.projectName).toBe('Test Project');
      expect(result.data?.isCheckedOut).toBe(true);
      expect(result.data?.checkedOutBy).toBe(userId1);
      expect(result.data?.checkedOutAt).toBeDefined();
    });

    it('should return null values when project is checked in (AC-3.1.3)', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 0, // チェックイン中
        owner_user_id: null,
        owner_user_name: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      // Act
      const result = await projectService.getCheckoutStatus(organizationId, projectId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.isCheckedOut).toBe(false);
      expect(result.data?.checkedOutBy).toBeNull();
      expect(result.data?.checkedOutAt).toBeNull();
    });

    it('should return 404 when project not found', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await projectService.getCheckoutStatus(organizationId, projectId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('プロジェクトが見つかりません');
    });

    it('should enforce multi-tenant isolation with organization_id', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.getCheckoutStatus(organizationId, projectId);

      // Assert
      const queryCall = mockPool.query.mock.calls[0];
      const params = queryCall[1];
      expect(params).toContain(organizationId);
      expect(params).toContain(projectId);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await projectService.getCheckoutStatus(organizationId, projectId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
    });

    it('should use LEFT JOIN to get owner user name', async () => {
      // Arrange
      const mockProject = {
        project_id: projectId,
        project_name: 'Test Project',
        checkout_status: 1,
        owner_user_id: userId1,
        owner_user_name: 'John Doe',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      // Act
      await projectService.getCheckoutStatus(organizationId, projectId);

      // Assert
      const queryCall = mockPool.query.mock.calls[0];
      const query = queryCall[0].toLowerCase();
      expect(query).toContain('left join');
      expect(query).toContain('organization_user');
    });
  });
});
