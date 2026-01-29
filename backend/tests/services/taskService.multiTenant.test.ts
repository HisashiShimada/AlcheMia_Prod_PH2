/**
 * マルチテナント分離のテスト
 * 
 * @description タスク3.5: マルチテナント分離の徹底
 */

import { updateTaskStatus } from '../../src/services/taskService';
import { getPool } from '../../src/database/db';
import { UpdateTaskStatusParams } from '../../src/types/taskService.types';

// データベースプールのモック
jest.mock('../../src/database/db');

describe('taskService - マルチテナント分離', () => {
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockRelease: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockClient = {
      query: mockQuery,
      release: mockRelease
    };

    (getPool as jest.Mock).mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient)
    });

    jest.clearAllMocks();
  });

  describe('organization_idフィルタ必須化', () => {
    test('すべてのSQLクエリにorganization_idフィルタが含まれている', async () => {
      const params: UpdateTaskStatusParams = {
        organizationId: 'org-123',
        projectId: 'proj-456',
        methodId: 'method-789',
        taskNo: 1,
        status: 1, // IN_PROGRESS
        currentUpdateAt: new Date().toISOString(),
        userId: 'user-001',
        role: 'experiment_admin',
        comment: 'Test update'
      };

      // SELECT FOR UPDATEクエリのモック
      mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-123',
          project_id: 'proj-456',
          project_name: 'Test Project',
          method_id: 'method-789',
          task_no: 1,
          task_status: 0,
          update_at: new Date().toISOString(),
          experiment_user_id: 'user-001',
          experiment_user_name: 'Test User'
        }]
      });

      await updateTaskStatus(params);

      // SELECT FOR UPDATE文にorganization_idフィルタが含まれることを確認
      const selectCall = mockQuery.mock.calls.find(call => 
        call[0] && call[0].includes('SELECT') && call[0].includes('FOR UPDATE')
      );
      
      expect(selectCall).toBeDefined();
      expect(selectCall[0]).toContain('WHERE pt.organization_id = $1');
      expect(selectCall[1]).toContain(params.organizationId);
    });
  });

  describe('organization_id一致検証', () => {
    test('experiment_adminが異なる組織のタスクにアクセスした場合、404エラーを返す', async () => {
      const params: UpdateTaskStatusParams = {
        organizationId: 'org-123',
        projectId: 'proj-456',
        methodId: 'method-789',
        taskNo: 1,
        status: 1,
        currentUpdateAt: new Date().toISOString(),
        userId: 'admin-001',
        role: 'experiment_admin',
        comment: 'Test'
      };

      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // SELECT FOR UPDATE - 他組織のタスクが返される（本来あり得ないがテストのため）
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-999', // 異なる組織ID
          project_id: 'proj-456',
          project_name: 'Other Org Project',
          method_id: 'method-789',
          task_no: 1,
          task_status: 0,
          update_at: new Date().toISOString(),
          experiment_user_id: null,
          experiment_user_name: null
        }]
      });

      // ROLLBACK
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await updateTaskStatus(params);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND'); // 403ではなく404
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    test('experiment_workerが異なる組織のタスクにアクセスした場合、404エラーを返す', async () => {
      const params: UpdateTaskStatusParams = {
        organizationId: 'org-123',
        projectId: 'proj-456',
        methodId: 'method-789',
        taskNo: 1,
        status: 1,
        currentUpdateAt: new Date().toISOString(),
        userId: 'worker-001',
        role: 'experiment_worker',
        comment: 'Test'
      };

      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // SELECT FOR UPDATE - 他組織のタスクが返される
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-999', // 異なる組織ID
          project_id: 'proj-456',
          project_name: 'Other Org Project',
          method_id: 'method-789',
          task_no: 1,
          task_status: 0,
          update_at: new Date().toISOString(),
          experiment_user_id: 'worker-001',
          experiment_user_name: 'Test Worker'
        }]
      });

      // ROLLBACK
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await updateTaskStatus(params);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND'); // 403ではなく404
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    test('同じ組織のタスクの場合、権限チェックに進む', async () => {
      const params: UpdateTaskStatusParams = {
        organizationId: 'org-123',
        projectId: 'proj-456',
        methodId: 'method-789',
        taskNo: 1,
        status: 1,
        currentUpdateAt: new Date().toISOString(),
        userId: 'admin-001',
        role: 'experiment_admin',
        comment: 'Test'
      };

      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // SELECT FOR UPDATE - 同じ組織のタスク
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-123', // 同じ組織ID
          project_id: 'proj-456',
          project_name: 'Test Project',
          method_id: 'method-789',
          task_no: 1,
          task_status: 0,
          update_at: params.currentUpdateAt,
          experiment_user_id: null,
          experiment_user_name: null
        }]
      });

      // UPDATE
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-123',
          project_id: 'proj-456',
          method_id: 'method-789',
          task_no: 1,
          task_status: 1,
          experiment_user_id: null,
          experiment_start_at: new Date(),
          experiment_end_at: null,
          update_at: new Date()
        }]
      });

      // COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await updateTaskStatus(params);

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('system_adminのクロステナントアクセス', () => {
    test('system_adminは異なる組織のタスクにアクセス可能', async () => {
      const params: UpdateTaskStatusParams = {
        organizationId: 'org-123',
        projectId: 'proj-456',
        methodId: 'method-789',
        taskNo: 1,
        status: 1,
        currentUpdateAt: new Date().toISOString(),
        userId: 'sysadmin-001',
        role: 'system_admin', // system_admin
        comment: 'Test'
      };

      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // SELECT FOR UPDATE - 異なる組織のタスク
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-999', // 異なる組織ID
          project_id: 'proj-456',
          project_name: 'Other Org Project',
          method_id: 'method-789',
          task_no: 1,
          task_status: 0,
          update_at: params.currentUpdateAt,
          experiment_user_id: null,
          experiment_user_name: null
        }]
      });

      // UPDATE
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-999',
          project_id: 'proj-456',
          method_id: 'method-789',
          task_no: 1,
          task_status: 1,
          experiment_user_id: null,
          experiment_start_at: new Date(),
          experiment_end_at: null,
          update_at: new Date()
        }]
      });

      // COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await updateTaskStatus(params);

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('Parameterized Queries使用', () => {
    test('すべてのSQLクエリがParameterized Queriesを使用している', async () => {
      const params: UpdateTaskStatusParams = {
        organizationId: 'org-123',
        projectId: 'proj-456',
        methodId: 'method-789',
        taskNo: 1,
        status: 1,
        currentUpdateAt: new Date().toISOString(),
        userId: 'user-001',
        role: 'experiment_admin',
        comment: 'Test'
      };

      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // SELECT FOR UPDATE
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-123',
          project_id: 'proj-456',
          project_name: 'Test Project',
          method_id: 'method-789',
          task_no: 1,
          task_status: 0,
          update_at: params.currentUpdateAt,
          experiment_user_id: null,
          experiment_user_name: null
        }]
      });

      // UPDATE
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          organization_id: 'org-123',
          project_id: 'proj-456',
          method_id: 'method-789',
          task_no: 1,
          task_status: 1,
          experiment_user_id: null,
          experiment_start_at: new Date(),
          experiment_end_at: null,
          update_at: new Date()
        }]
      });

      // COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await updateTaskStatus(params);

      // SELECT FOR UPDATE
      const selectCall = mockQuery.mock.calls.find(call => 
        call[0] && call[0].includes('SELECT') && call[0].includes('FOR UPDATE')
      );
      expect(selectCall).toBeDefined();
      expect(selectCall[0]).toContain('$1'); // Parameterized
      expect(selectCall[0]).toContain('$2');
      expect(selectCall[0]).toContain('$3');
      expect(selectCall[0]).toContain('$4');
      expect(selectCall[0]).not.toContain(`'${params.organizationId}'`); // 文字列連結なし

      // UPDATE
      const updateCall = mockQuery.mock.calls.find(call => 
        call[0] && call[0].includes('UPDATE project_task')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('$1'); // Parameterized
      expect(updateCall[0]).toContain('$2');
      expect(updateCall[0]).toContain('$6');
      expect(updateCall[0]).not.toContain(`'${params.status}'`); // 文字列連結なし
    });
  });
});