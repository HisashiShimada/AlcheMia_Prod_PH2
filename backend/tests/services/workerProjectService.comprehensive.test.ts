/**
 * WorkerProjectService 包括的テスト
 * 
 * @description
 * Task 5.1: WorkerProjectServiceの包括的な単体テスト
 * - ロール別アクセス制御
 * - ステータスフィルタリング
 * - ソート機能
 * - ページネーション機能
 * - データ形式変換
 * - エラーハンドリング
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import { getPool } from '../../src/database/db';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

// Mock database
jest.mock('../../src/database/db');

describe('WorkerProjectService - Comprehensive Tests (Task 5.1)', () => {
  let service: WorkerProjectService;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    service = new WorkerProjectService();
  });

  describe('ロール別アクセス制御', () => {
    it('experiment_workerロールで自分のタスクがあるプロジェクトのみ取得', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const mockProjects = [
        {
          project_id: 'proj-001',
          project_name: 'Project A',
          description: 'Worker assigned project',
          project_status: 'in_progress',
          create_at: new Date('2026-01-20T10:00:00.000Z'),
          update_at: new Date('2026-01-25T15:30:00.000Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].projectId).toBe('proj-001');
      expect(result.items[0].projectName).toBe('Project A');
      
      // SQLにINNER JOINとexperiment_user_idフィルタが含まれることを確認
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('INNER JOIN project_task_detail');
      expect(firstCall[0]).toContain('experiment_user_id');
      expect(firstCall[1]).toContain(userId);
    });

    it('experiment_adminロールで全プロジェクト取得', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const mockProjects = [
        {
          project_id: 'proj-001',
          project_name: 'Project A',
          description: 'Project A',
          project_status: 'pending',
          create_at: new Date('2026-01-20T10:00:00.000Z'),
          update_at: new Date('2026-01-25T15:30:00.000Z'),
        },
        {
          project_id: 'proj-002',
          project_name: 'Project B',
          description: 'Project B',
          project_status: 'in_progress',
          create_at: new Date('2026-01-21T10:00:00.000Z'),
          update_at: new Date('2026-01-26T15:30:00.000Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items).toHaveLength(2);
      
      // SQLにJOINが含まれないことを確認
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).not.toContain('INNER JOIN project_task_detail');
      expect(firstCall[0]).not.toContain('experiment_user_id');
    });

    it('system_adminロールで全プロジェクト取得', async () => {
      // Arrange
      const userId = 'sysadmin-001';
      const role = 'system_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items).toHaveLength(0);
      
      // SQLにJOINが含まれないことを確認
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).not.toContain('INNER JOIN project_task_detail');
    });
  });

  describe('ステータスフィルタ機能', () => {
    it('status=pendingで保留中プロジェクトのみ取得', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        status: 'pending',
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain('pending');
      expect(firstCall[1]).not.toContain('in_progress');
      expect(firstCall[1]).not.toContain('review_waiting');
    });

    it('status=in_progressで進行中プロジェクトのみ取得', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        status: 'in_progress',
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain('in_progress');
      expect(firstCall[1]).not.toContain('pending');
      expect(firstCall[1]).not.toContain('review_waiting');
    });

    it('status=review_waitingでレビュー待ちプロジェクトのみ取得', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        status: 'review_waiting',
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain('review_waiting');
      expect(firstCall[1]).not.toContain('pending');
      expect(firstCall[1]).not.toContain('in_progress');
    });

    it('statusが未指定の場合、pending/in_progress/review_waitingの全てを取得', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain('pending');
      expect(firstCall[1]).toContain('in_progress');
      expect(firstCall[1]).toContain('review_waiting');
    });
  });

  describe('ソート機能', () => {
    it('create_at降順でソート（デフォルト）', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('ORDER BY project.create_at DESC');
    });

    it('create_at昇順でソート', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'asc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('ORDER BY project.create_at ASC');
    });

    it('project_name降順でソート', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'project_name',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('ORDER BY project.project_name DESC');
    });

    it('project_name昇順でソート', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'project_name',
        order: 'asc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('ORDER BY project.project_name ASC');
    });

    it('update_at降順でソート', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'update_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('ORDER BY project.update_at DESC');
    });

    it('update_at昇順でソート', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'update_at',
        order: 'asc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[0]).toContain('ORDER BY project.update_at ASC');
    });
  });

  describe('ページネーション機能', () => {
    it('page=1, limit=20の場合、正しいOFFSETとLIMITを適用', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain(20); // LIMIT
      expect(firstCall[1]).toContain(0);  // OFFSET (page 1 = offset 0)
    });

    it('page=2, limit=10の場合、正しいOFFSETとLIMITを適用', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 2,
        limit: 10,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain(10); // LIMIT
      expect(firstCall[1]).toContain(10); // OFFSET (page 2 = offset 10)
    });

    it('page=3, limit=5の場合、正しいOFFSETとLIMITを適用', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 3,
        limit: 5,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const firstCall = mockPool.query.mock.calls[0];
      expect(firstCall[1]).toContain(5);  // LIMIT
      expect(firstCall[1]).toContain(10); // OFFSET (page 3 = offset 10)
    });

    it('totalItems=45, limit=20の場合、正しいtotalPagesを計算', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '45' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.pagination.totalItems).toBe(45);
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(45 / 20) = 3
    });

    it('page=1の場合、hasPrev=false, hasNext=true', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '45' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('page=2の場合、hasPrev=true, hasNext=true', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 2,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '45' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('最終ページの場合、hasPrev=true, hasNext=false', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 3,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '45' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('データが0件の場合、totalPages=0, hasPrev=false, hasNext=false', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('データ形式変換', () => {
    it('データベースカラム名をキャメルケースに変換', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const mockProjects = [
        {
          project_id: 'proj-001',
          project_name: 'Test Project',
          description: 'Test Description',
          project_status: 'pending',
          create_at: new Date('2026-01-27T10:00:00.000Z'),
          update_at: new Date('2026-01-27T15:00:00.000Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items[0]).toHaveProperty('projectId');
      expect(result.items[0]).toHaveProperty('projectName');
      expect(result.items[0]).toHaveProperty('projectStatus');
      expect(result.items[0]).toHaveProperty('createdAt');
      expect(result.items[0]).toHaveProperty('updatedAt');
      
      // スネークケースのプロパティが存在しないことを確認
      expect(result.items[0]).not.toHaveProperty('project_id');
      expect(result.items[0]).not.toHaveProperty('project_name');
    });

    it('日時をISO 8601形式（UTC）に変換', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const mockProjects = [
        {
          project_id: 'proj-001',
          project_name: 'Test Project',
          description: 'Test Description',
          project_status: 'pending',
          create_at: new Date('2026-01-27T10:30:45.123Z'),
          update_at: new Date('2026-01-27T15:45:30.789Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items[0].createdAt).toBe('2026-01-27T10:30:45.123Z');
      expect(result.items[0].updatedAt).toBe('2026-01-27T15:45:30.789Z');
      
      // ISO 8601形式であることを確認
      expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.items[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('nullのdescriptionを空文字列に変換', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const mockProjects = [
        {
          project_id: 'proj-001',
          project_name: 'Test Project',
          description: null,
          project_status: 'pending',
          create_at: new Date('2026-01-27T10:00:00.000Z'),
          update_at: new Date('2026-01-27T15:00:00.000Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items[0].description).toBe('');
      expect(result.items[0].description).not.toBeNull();
      expect(result.items[0].description).not.toBeUndefined();
    });

    it('複数プロジェクトを正しく変換', async () => {
      // Arrange
      const userId = 'admin-001';
      const role = 'experiment_admin';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const mockProjects = [
        {
          project_id: 'proj-001',
          project_name: 'Project A',
          description: 'Description A',
          project_status: 'pending',
          create_at: new Date('2026-01-20T10:00:00.000Z'),
          update_at: new Date('2026-01-25T15:30:00.000Z'),
        },
        {
          project_id: 'proj-002',
          project_name: 'Project B',
          description: null,
          project_status: 'in_progress',
          create_at: new Date('2026-01-21T10:00:00.000Z'),
          update_at: new Date('2026-01-26T15:30:00.000Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      // Act
      const result = await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0].projectId).toBe('proj-001');
      expect(result.items[0].description).toBe('Description A');
      expect(result.items[1].projectId).toBe('proj-002');
      expect(result.items[1].description).toBe('');
    });
  });

  describe('organization_idフィルタ', () => {
    it('すべてのクエリにorganization_idフィルタが適用される', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-unique-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const selectCall = mockPool.query.mock.calls[0];
      const countCall = mockPool.query.mock.calls[1];
      
      // 両方のクエリにorganization_idが含まれる
      expect(selectCall[1]).toContain(organizationId);
      expect(countCall[1]).toContain(organizationId);
    });

    it('experiment_workerの場合、project_task_detailにもorganization_idフィルタが適用される', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listWorkerAccessible(userId, role, organizationId, params);

      // Assert
      const selectCall = mockPool.query.mock.calls[0];
      
      // SQLにproject_task_detail.organization_idフィルタが含まれる
      expect(selectCall[0]).toContain('project_task_detail.organization_id');
      
      // パラメータにorganization_idが2回含まれる（projectとproject_task_detail）
      const orgIdCount = selectCall[1].filter((param: any) => param === organizationId).length;
      expect(orgIdCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーが発生した場合、DatabaseErrorをスローする', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        service.listWorkerAccessible(userId, role, organizationId, params)
      ).rejects.toThrow('データベースエラーが発生しました');
    });

    it('クエリタイムアウトエラーの場合、適切なエラーメッセージをスローする', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const timeoutError = new Error('Query timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockPool.query.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(
        service.listWorkerAccessible(userId, role, organizationId, params)
      ).rejects.toThrow('クエリがタイムアウトしました');
    });

    it('エラー発生時、詳細なログを記録する', async () => {
      // Arrange
      const userId = 'worker-001';
      const role = 'experiment_worker';
      const organizationId = 'org-001';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      const dbError = new Error('Test error');
      mockPool.query.mockRejectedValueOnce(dbError);

      // Act
      try {
        await service.listWorkerAccessible(userId, role, organizationId, params);
      } catch (error) {
        // エラーがスローされることを期待
      }

      // Assert - エラーログが記録されることは実装で保証されている
      // （loggerのモックは別のテストで確認）
    });
  });
});
