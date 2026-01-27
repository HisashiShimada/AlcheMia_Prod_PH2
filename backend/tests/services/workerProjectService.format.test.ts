/**
 * WorkerProjectService データ変換・フォーマットのテスト
 * 
 * @description
 * Task 2.4: データ変換とフォーマットのテストケース
 * - snake_case → camelCase変換
 * - ISO 8601日付変換
 * - WorkerAccessibleProject型へのマッピング
 * - nullハンドリングとデフォルト値
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import { getPool } from '../../src/database/db';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

// モック
jest.mock('../../src/database/db');

describe('WorkerProjectService - データ変換とフォーマット (Task 2.4)', () => {
  let service: WorkerProjectService;
  let mockPool: any;

  beforeEach(() => {
    service = new WorkerProjectService();
    mockPool = {
      query: jest.fn(),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('snake_case → camelCase変換', () => {
    it('プロジェクトIDをproject_id → projectIdに変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test Project',
        description: 'Test Description',
        project_status: 'pending',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })  // SELECT query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // COUNT query

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0]).toHaveProperty('projectId');
      expect(result.items[0]).not.toHaveProperty('project_id');
      expect(result.items[0].projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('プロジェクト名をproject_name → projectNameに変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test Project Name',
        description: 'Test',
        project_status: 'in_progress',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0]).toHaveProperty('projectName');
      expect(result.items[0]).not.toHaveProperty('project_name');
      expect(result.items[0].projectName).toBe('Test Project Name');
    });

    it('プロジェクトステータスをproject_status → projectStatusに変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test',
        description: 'Test',
        project_status: 'review_waiting',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0]).toHaveProperty('projectStatus');
      expect(result.items[0]).not.toHaveProperty('project_status');
      expect(result.items[0].projectStatus).toBe('review_waiting');
    });

    it('作成日時をcreate_at → createdAtに変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test',
        description: 'Test',
        project_status: 'pending',
        create_at: '2024-01-01T12:30:45.123Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0]).toHaveProperty('createdAt');
      expect(result.items[0]).not.toHaveProperty('create_at');
    });

    it('更新日時をupdate_at → updatedAtに変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test',
        description: 'Test',
        project_status: 'pending',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T15:45:30.456Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0]).toHaveProperty('updatedAt');
      expect(result.items[0]).not.toHaveProperty('update_at');
    });
  });

  describe('ISO 8601日付変換', () => {
    it('作成日時をISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）に変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test',
        description: 'Test',
        project_status: 'pending',
        create_at: '2024-01-15T09:30:45.123Z',
        update_at: '2024-01-16T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.items[0].createdAt).toBe('2024-01-15T09:30:45.123Z');
    });

    it('更新日時をISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）に変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test',
        description: 'Test',
        project_status: 'pending',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-02-20T14:25:30.789Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.items[0].updatedAt).toBe('2024-02-20T14:25:30.789Z');
    });

    it('PostgreSQLのタイムスタンプ型を正しくISO 8601に変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test',
        description: 'Test',
        project_status: 'pending',
        create_at: new Date('2024-03-10T08:15:20.500Z'),
        update_at: new Date('2024-03-11T12:45:55.999Z'),
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0].createdAt).toBe('2024-03-10T08:15:20.500Z');
      expect(result.items[0].updatedAt).toBe('2024-03-11T12:45:55.999Z');
    });
  });

  describe('nullハンドリングとデフォルト値', () => {
    it('descriptionがnullの場合、空文字列に変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test Project',
        description: null,
        project_status: 'pending',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0].description).toBe('');
      expect(result.items[0].description).not.toBeNull();
    });

    it('descriptionがundefinedの場合、空文字列に変換する', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test Project',
        description: undefined,
        project_status: 'pending',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0].description).toBe('');
    });

    it('descriptionが空文字列の場合、そのまま空文字列を返す', async () => {
      // Arrange
      const mockProjects = [{
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        project_name: 'Test Project',
        description: '',
        project_status: 'pending',
        create_at: '2024-01-01T00:00:00.000Z',
        update_at: '2024-01-02T00:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items[0].description).toBe('');
    });
  });

  describe('WorkerAccessibleProject型へのマッピング', () => {
    it('すべての必須フィールドが正しくマッピングされる', async () => {
      // Arrange
      const mockProjects = [{
        project_id: 'abc123-def456-ghi789',
        project_name: 'Complete Project',
        description: 'Full description',
        project_status: 'in_progress',
        create_at: '2024-01-01T10:00:00.000Z',
        update_at: '2024-01-02T11:00:00.000Z',
      }];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      const project = result.items[0];
      expect(project).toMatchObject({
        projectId: 'abc123-def456-ghi789',
        projectName: 'Complete Project',
        description: 'Full description',
        projectStatus: 'in_progress',
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T11:00:00.000Z',
      });
    });

    it('複数プロジェクトが正しく変換される', async () => {
      // Arrange
      const mockProjects = [
        {
          project_id: 'project-1',
          project_name: 'Project 1',
          description: 'Description 1',
          project_status: 'pending',
          create_at: '2024-01-01T00:00:00.000Z',
          update_at: '2024-01-02T00:00:00.000Z',
        },
        {
          project_id: 'project-2',
          project_name: 'Project 2',
          description: null,
          project_status: 'in_progress',
          create_at: '2024-01-03T00:00:00.000Z',
          update_at: '2024-01-04T00:00:00.000Z',
        },
        {
          project_id: 'project-3',
          project_name: 'Project 3',
          description: 'Description 3',
          project_status: 'review_waiting',
          create_at: '2024-01-05T00:00:00.000Z',
          update_at: '2024-01-06T00:00:00.000Z',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      const result = await service.listWorkerAccessible(
        'user-123',
        'experiment_admin',
        'org-456',
        params
      );

      // Assert
      expect(result.items).toHaveLength(3);
      expect(result.items[0].projectId).toBe('project-1');
      expect(result.items[1].projectId).toBe('project-2');
      expect(result.items[1].description).toBe(''); // null → ''
      expect(result.items[2].projectId).toBe('project-3');
    });
  });
});