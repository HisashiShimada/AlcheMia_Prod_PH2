/**
 * ProjectService.requestApproval - Task 3.2: トランザクション管理とステータス更新
 * 
 * @description 承認依頼時のトランザクション制御とステータス更新のテスト
 * Requirements: 5, 7, 11, 12
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベースプールをモック
jest.mock('../../src/database/db');

describe('ProjectService.requestApproval - Task 3.2: トランザクション管理とステータス更新', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let mockRelease: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();
    
    // モッククエリ関数
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

  describe('Requirement 7: トランザクション制御', () => {
    it('should begin transaction before updating project status', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';
      const comment = 'Test approval request';

      // プロジェクト取得（pool.query - トランザクション外）
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
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.requestApproval(
        projectId,
        comment,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // トランザクション開始を確認
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      
      // トランザクションコミットを確認
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback transaction when update fails', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得成功（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN成功
        .mockRejectedValueOnce(new Error('Update failed')); // UPDATE失敗

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      
      // ロールバックが呼ばれたことを確認
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      
      // クライアントがリリースされたことを確認
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should rollback transaction when notification insert fails', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE成功
        .mockRejectedValueOnce(new Error('Notification insert failed')); // INSERT失敗

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('Requirement 5: プロジェクトステータス更新', () => {
    it('should update project_status to 2 (waiting_approval)', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // UPDATE クエリが呼ばれたことを確認
      const updateCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE project')
      );
      expect(updateCall).toBeDefined();
      
      // project_status = 2 が設定されていることを確認
      expect(updateCall![0]).toContain('project_status');
      expect(updateCall![1]).toContain(2); // waiting_approval
    });

    it('should set updated_user_id to requesting user ID', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // UPDATE クエリでupdated_user_idが設定されていることを確認（Task 8.2）
      const updateCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE project')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![1]).toContain(userId);
    });

    it('should set updated_at to current timestamp', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // UPDATE クエリでupdated_atが設定されていることを確認
      const updateCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE project')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('update_at');
    });
  });

  describe('Requirement 12: セキュリティとマルチテナント分離', () => {
    it('should apply organization_id filter in UPDATE query', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // UPDATE クエリにorganization_idフィルタが含まれていることを確認
      const updateCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE project')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('organization_id');
      expect(updateCall![1]).toContain(organizationId);
    });

    it('should use Parameterized Query for UPDATE', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      // UPDATE クエリでプレースホルダ（$1, $2等）が使われていることを確認
      const updateCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE project')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toMatch(/\$\d/); // $1, $2 などのプレースホルダ
      expect(Array.isArray(updateCall![1])).toBe(true); // パラメータ配列
    });
  });

  describe('Requirement 11: パフォーマンスと最適化', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      // プロジェクト取得（pool.query）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のクエリ（client.query）
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const startTime = Date.now();
      await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );
      const endTime = Date.now();

      // Assert
      // モック環境では即座に完了するはずだが、構造的な問題がないことを確認
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});