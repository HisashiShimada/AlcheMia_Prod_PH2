/**
 * WorkerProject型定義のテスト
 * 
 * @description Task 2.1: WorkerProjectServiceインターフェース定義のテスト
 */

import { describe, test, expect } from '@jest/globals';
import type {
  UserRole,
  WorkerAccessibleProject,
  ListWorkerProjectsParams,
  WorkerProjectListResult,
  WorkerProjectService
} from '../../src/types/workerProject';
import type { ProjectStatus } from '../../src/types/project';

describe('WorkerProject型定義', () => {
  describe('WorkerAccessibleProject', () => {
    test('必須プロパティが定義されている', () => {
      const project: WorkerAccessibleProject = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        projectName: 'テストプロジェクト',
        description: 'プロジェクトの説明',
        projectStatus: 'pending',
        createdAt: '2026-01-27T10:00:00.000Z',
        updatedAt: '2026-01-27T11:00:00.000Z'
      };

      expect(project.projectId).toBeDefined();
      expect(project.projectName).toBeDefined();
      expect(project.description).toBeDefined();
      expect(project.projectStatus).toBeDefined();
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    test('projectIdはUUID形式の文字列', () => {
      const project: WorkerAccessibleProject = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        projectName: 'テスト',
        description: '',
        projectStatus: 'pending',
        createdAt: '2026-01-27T10:00:00.000Z',
        updatedAt: '2026-01-27T11:00:00.000Z'
      };

      expect(typeof project.projectId).toBe('string');
      expect(project.projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test('projectStatusは許可された値のみ', () => {
      const validStatuses: ProjectStatus[] = ['pending', 'in_progress', 'review_waiting'];
      
      validStatuses.forEach(status => {
        const project: WorkerAccessibleProject = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          projectName: 'テスト',
          description: '',
          projectStatus: status,
          createdAt: '2026-01-27T10:00:00.000Z',
          updatedAt: '2026-01-27T11:00:00.000Z'
        };

        expect(['pending', 'in_progress', 'review_waiting']).toContain(project.projectStatus);
      });
    });

    test('日時はISO 8601形式の文字列', () => {
      const project: WorkerAccessibleProject = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        projectName: 'テスト',
        description: '',
        projectStatus: 'pending',
        createdAt: '2026-01-27T10:00:00.000Z',
        updatedAt: '2026-01-27T11:00:00.000Z'
      };

      expect(typeof project.createdAt).toBe('string');
      expect(typeof project.updatedAt).toBe('string');
      expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(project.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('ListWorkerProjectsParams', () => {
    test('必須プロパティが定義されている', () => {
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc'
      };

      expect(params.page).toBeDefined();
      expect(params.limit).toBeDefined();
      expect(params.sortBy).toBeDefined();
      expect(params.order).toBeDefined();
    });

    test('pageは1以上の整数', () => {
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc'
      };

      expect(params.page).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(params.page)).toBe(true);
    });

    test('limitは1-100の範囲', () => {
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc'
      };

      expect(params.limit).toBeGreaterThanOrEqual(1);
      expect(params.limit).toBeLessThanOrEqual(100);
    });

    test('statusはオプショナルで許可された値のみ', () => {
      const validStatuses: Array<'pending' | 'in_progress' | 'review_waiting'> = [
        'pending',
        'in_progress',
        'review_waiting'
      ];

      validStatuses.forEach(status => {
        const params: ListWorkerProjectsParams = {
          page: 1,
          limit: 20,
          status,
          sortBy: 'create_at',
          order: 'desc'
        };

        expect(['pending', 'in_progress', 'review_waiting']).toContain(params.status);
      });
    });

    test('sortByは許可された値のみ', () => {
      const validSortFields: Array<'create_at' | 'project_name' | 'update_at'> = [
        'create_at',
        'project_name',
        'update_at'
      ];

      validSortFields.forEach(sortBy => {
        const params: ListWorkerProjectsParams = {
          page: 1,
          limit: 20,
          sortBy,
          order: 'desc'
        };

        expect(['create_at', 'project_name', 'update_at']).toContain(params.sortBy);
      });
    });

    test('orderは"asc"または"desc"のみ', () => {
      const validOrders: Array<'asc' | 'desc'> = ['asc', 'desc'];

      validOrders.forEach(order => {
        const params: ListWorkerProjectsParams = {
          page: 1,
          limit: 20,
          sortBy: 'create_at',
          order
        };

        expect(['asc', 'desc']).toContain(params.order);
      });
    });
  });

  describe('WorkerProjectListResult', () => {
    test('必須プロパティが定義されている', () => {
      const result: WorkerProjectListResult = {
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };

      expect(result.items).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBeDefined();
      expect(result.pagination.limit).toBeDefined();
      expect(result.pagination.totalItems).toBeDefined();
      expect(result.pagination.totalPages).toBeDefined();
      expect(result.pagination.hasNext).toBeDefined();
      expect(result.pagination.hasPrev).toBeDefined();
    });

    test('itemsは WorkerAccessibleProject の配列', () => {
      const result: WorkerProjectListResult = {
        items: [
          {
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            projectName: 'プロジェクト1',
            description: '説明1',
            projectStatus: 'pending',
            createdAt: '2026-01-27T10:00:00.000Z',
            updatedAt: '2026-01-27T11:00:00.000Z'
          },
          {
            projectId: '223e4567-e89b-12d3-a456-426614174001',
            projectName: 'プロジェクト2',
            description: '説明2',
            projectStatus: 'in_progress',
            createdAt: '2026-01-27T10:00:00.000Z',
            updatedAt: '2026-01-27T11:00:00.000Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);
      expect(result.items[0].projectId).toBeDefined();
    });

    test('paginationの計算が正しい', () => {
      const result: WorkerProjectListResult = {
        items: [],
        pagination: {
          page: 2,
          limit: 20,
          totalItems: 50,
          totalPages: 3,
          hasNext: true,
          hasPrev: true
        }
      };

      expect(result.pagination.totalPages).toBe(Math.ceil(result.pagination.totalItems / result.pagination.limit));
      expect(result.pagination.hasNext).toBe(result.pagination.page < result.pagination.totalPages);
      expect(result.pagination.hasPrev).toBe(result.pagination.page > 1);
    });
  });

  describe('WorkerProjectService インターフェース', () => {
    test('listWorkerAccessibleメソッドのシグネチャが正しい', async () => {
      // モックサービスを作成してインターフェース準拠を確認
      const mockService: WorkerProjectService = {
        listWorkerAccessible: async (
          _userId: string,
          _role: UserRole,
          _organizationId: string,
          params: ListWorkerProjectsParams
        ): Promise<WorkerProjectListResult> => {
          return {
            items: [],
            pagination: {
              page: params.page,
              limit: params.limit,
              totalItems: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          };
        }
      };

      const result = await mockService.listWorkerAccessible(
        '123e4567-e89b-12d3-a456-426614174000',
        'experiment_worker',
        '223e4567-e89b-12d3-a456-426614174001',
        {
          page: 1,
          limit: 20,
          sortBy: 'create_at',
          order: 'desc'
        }
      );

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.pagination).toBeDefined();
    });

    test('異なるロールで呼び出し可能', async () => {
      const mockService: WorkerProjectService = {
        listWorkerAccessible: async (
          _userId: string,
          _role: UserRole,
          _organizationId: string,
          _params: ListWorkerProjectsParams
        ): Promise<WorkerProjectListResult> => {
          return {
            items: [],
            pagination: {
              page: 1,
              limit: 20,
              totalItems: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          };
        }
      };

      const roles: UserRole[] = ['experiment_worker', 'experiment_admin', 'system_admin'];

      for (const role of roles) {
        const result = await mockService.listWorkerAccessible(
          '123e4567-e89b-12d3-a456-426614174000',
          role,
          '223e4567-e89b-12d3-a456-426614174001',
          {
            page: 1,
            limit: 20,
            sortBy: 'create_at',
            order: 'desc'
          }
        );

        expect(result).toBeDefined();
      }
    });
  });
});