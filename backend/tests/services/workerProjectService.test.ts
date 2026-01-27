/**
 * WorkerProjectService テスト
 * 
 * @description
 * 実験作業者用プロジェクト一覧取得サービスのテスト。
 * Task 2.2: ロール別クエリロジックの実装
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import { getPool } from '../../src/database/db';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

// Mock database
jest.mock('../../src/database/db');

describe('WorkerProjectService', () => {
  let service: WorkerProjectService;
  let mockPool: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database pool
    mockPool = {
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    service = new WorkerProjectService();
  });

  describe('listWorkerAccessible', () => {
    const baseParams: ListWorkerProjectsParams = {
      page: 1,
      limit: 20,
      sortBy: 'create_at',
      order: 'desc',
    };

    describe('Task 2.2: ロール別クエリロジックの実装', () => {
      it('experiment_workerロールの場合、project_task_detailテーブルとINNER JOINする', async () => {
        // Arrange
        const userId = 'user-123';
        const role = 'experiment_worker';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({
            rows: [
              {
                project_id: 'proj-1',
                project_name: 'Project 1',
                description: 'Description 1',
                project_status: 'pending',
                create_at: new Date('2026-01-27T10:00:00.000Z'),
                update_at: new Date('2026-01-27T11:00:00.000Z'),
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - experiment_workerの場合、SQLにINNER JOINが含まれる
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[0]).toContain('INNER JOIN project_task_detail');
      });

      it('experiment_workerロールの場合、experiment_user_idでフィルタリングする', async () => {
        // Arrange
        const userId = 'user-123';
        const role = 'experiment_worker';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - experiment_user_idがパラメータに含まれる
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[1]).toContain(userId);
      });

      it('experiment_adminロールの場合、JOINを使用しない', async () => {
        // Arrange
        const userId = 'admin-123';
        const role = 'experiment_admin';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - experiment_adminの場合、SQLにJOINが含まれない
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[0]).not.toContain('INNER JOIN project_task_detail');
      });

      it('system_adminロールの場合、JOINを使用しない', async () => {
        // Arrange
        const userId = 'sysadmin-123';
        const role = 'system_admin';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - system_adminの場合、SQLにJOINが含まれない
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[0]).not.toContain('INNER JOIN project_task_detail');
      });

      it('すべてのクエリにorganization_idフィルタを適用する', async () => {
        // Arrange
        const userId = 'user-123';
        const role = 'experiment_worker';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - organization_idがパラメータに含まれる
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[1]).toContain(organizationId);
      });

      it('experiment_workerの場合、project_task_detailにもorganization_idフィルタを適用する', async () => {
        // Arrange
        const userId = 'user-123';
        const role = 'experiment_worker';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - organization_idがパラメータに2回含まれる（projectとproject_task_detail両方）
        const firstCall = mockPool.query.mock.calls[0];
        const orgIdCount = firstCall[1].filter((param: any) => param === organizationId).length;
        expect(orgIdCount).toBe(2);
      });

      it('statusパラメータが指定された場合、指定されたステータスのみ取得する', async () => {
        // Arrange
        const userId = 'user-123';
        const role = 'experiment_worker';
        const organizationId = 'org-456';
        const params = { ...baseParams, status: 'pending' as const };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, params);

        // Assert - pendingがパラメータに含まれる
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[1]).toContain('pending');
      });

      it('statusパラメータが未指定の場合、pending/in_progress/review_waitingのみ取得する', async () => {
        // Arrange
        const userId = 'user-123';
        const role = 'experiment_worker';
        const organizationId = 'org-456';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        // Act
        await service.listWorkerAccessible(userId, role, organizationId, baseParams);

        // Assert - 3つのステータスがパラメータに含まれる
        const firstCall = mockPool.query.mock.calls[0];
        expect(firstCall[1]).toContain('pending');
        expect(firstCall[1]).toContain('in_progress');
        expect(firstCall[1]).toContain('review_waiting');
      });
    });
  });
});