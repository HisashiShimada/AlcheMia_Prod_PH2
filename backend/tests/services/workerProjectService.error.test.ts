/**
 * WorkerProjectService エラーハンドリングとロギングのテスト
 * 
 * @description
 * データベースエラー、クエリタイムアウト、エラーロギングのテスト
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import { getPool } from '../../src/database/db';
import { logger } from '../../src/utils/logger';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

// モック
jest.mock('../../src/database/db');
jest.mock('../../src/utils/logger');

describe('WorkerProjectService - エラーハンドリングとロギング', () => {
  let service: WorkerProjectService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new WorkerProjectService();
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // ロガーのモックをクリア
    jest.clearAllMocks();
  });

  describe('データベースエラーハンドリング', () => {
    it('データベース接続エラー時にDatabaseErrorをスローする', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act & Assert
      await expect(
        service.listWorkerAccessible(
          'user-123',
          'experiment_worker',
          'org-456',
          params
        )
      ).rejects.toThrow('データベースエラーが発生しました');
    });

    it('データベースエラー時にエラーログを記録する', async () => {
      // Arrange
      const dbError = new Error('Deadlock detected');
      mockQuery.mockRejectedValueOnce(dbError);

      const userId = 'user-123';
      const organizationId = 'org-456';
      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      try {
        await service.listWorkerAccessible(
          userId,
          'experiment_worker',
          organizationId,
          params
        );
      } catch (error) {
        // エラーが発生することを期待
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Worker project list query failed',
        expect.objectContaining({
          userId,
          organizationId,
          role: 'experiment_worker',
          params: expect.any(Object),
          error: expect.stringContaining('Deadlock detected'),
          stack: expect.any(String),
        })
      );
    });

    it('SELECT クエリエラー時にDatabaseErrorをスローする', async () => {
      // Arrange
      const selectError = new Error('Syntax error in SQL query');
      mockQuery.mockRejectedValueOnce(selectError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act & Assert
      await expect(
        service.listWorkerAccessible(
          'user-123',
          'experiment_admin',
          'org-456',
          params
        )
      ).rejects.toThrow('データベースエラーが発生しました');
    });

    it('COUNT クエリエラー時にDatabaseErrorをスローする', async () => {
      // Arrange
      // 1回目のクエリ（SELECT）は成功
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            project_id: 'proj-1',
            project_name: 'Test Project',
            description: 'Description',
            project_status: 'pending',
            create_at: new Date('2026-01-01'),
            update_at: new Date('2026-01-15'),
          },
        ],
      });

      // 2回目のクエリ（COUNT）は失敗
      const countError = new Error('Table does not exist');
      mockQuery.mockRejectedValueOnce(countError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act & Assert
      await expect(
        service.listWorkerAccessible(
          'user-123',
          'experiment_worker',
          'org-456',
          params
        )
      ).rejects.toThrow('データベースエラーが発生しました');
    });
  });

  describe('クエリタイムアウトハンドリング', () => {
    it('クエリタイムアウト時に適切なエラーをスローする', async () => {
      // Arrange
      const timeoutError = new Error('Query execution timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockQuery.mockRejectedValueOnce(timeoutError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act & Assert
      await expect(
        service.listWorkerAccessible(
          'user-123',
          'experiment_worker',
          'org-456',
          params
        )
      ).rejects.toThrow('クエリがタイムアウトしました');
    });

    it('タイムアウト時に詳細なエラーログを記録する', async () => {
      // Arrange
      const timeoutError = new Error('Statement timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockQuery.mockRejectedValueOnce(timeoutError);

      const userId = 'user-789';
      const organizationId = 'org-abc';
      const params: ListWorkerProjectsParams = {
        page: 5,
        limit: 50,
        status: 'in_progress',
        sortBy: 'project_name',
        order: 'asc',
      };

      // Act
      try {
        await service.listWorkerAccessible(
          userId,
          'experiment_admin',
          organizationId,
          params
        );
      } catch (error) {
        // エラーが発生することを期待
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Worker project list query failed',
        expect.objectContaining({
          userId,
          organizationId,
          role: 'experiment_admin',
          params: expect.objectContaining({
            page: 5,
            limit: 50,
            status: 'in_progress',
          }),
          error: expect.stringContaining('timeout'),
        })
      );
    });
  });

  describe('エラーログの詳細情報', () => {
    it('エラーログにuserId, organizationId, role, paramsを含める', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      const userId = 'user-detailed-1';
      const organizationId = 'org-detailed-2';
      const role = 'system_admin';
      const params: ListWorkerProjectsParams = {
        page: 3,
        limit: 10,
        status: 'review_waiting',
        sortBy: 'update_at',
        order: 'desc',
      };

      // Act
      try {
        await service.listWorkerAccessible(userId, role, organizationId, params);
      } catch (error) {
        // エラーが発生することを期待
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Worker project list query failed',
        expect.objectContaining({
          userId: 'user-detailed-1',
          organizationId: 'org-detailed-2',
          role: 'system_admin',
          params: expect.objectContaining({
            page: 3,
            limit: 10,
            status: 'review_waiting',
            sortBy: 'update_at',
            order: 'desc',
          }),
        })
      );
    });

    it('エラーログにエラーメッセージとスタックトレースを含める', async () => {
      // Arrange
      const dbError = new Error('Unique constraint violation');
      dbError.stack = 'Error stack trace here';
      mockQuery.mockRejectedValueOnce(dbError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      try {
        await service.listWorkerAccessible(
          'user-stack',
          'experiment_worker',
          'org-stack',
          params
        );
      } catch (error) {
        // エラーが発生することを期待
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Worker project list query failed',
        expect.objectContaining({
          error: 'Unique constraint violation',
          stack: expect.stringContaining('Error stack trace'),
        })
      );
    });

    it('元のエラーオブジェクトをログに含める', async () => {
      // Arrange
      const dbError = new Error('Original database error');
      (dbError as any).code = 'ECONNREFUSED';
      (dbError as any).detail = 'Connection refused by server';
      mockQuery.mockRejectedValueOnce(dbError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      try {
        await service.listWorkerAccessible(
          'user-original',
          'experiment_worker',
          'org-original',
          params
        );
      } catch (error) {
        // エラーが発生することを期待
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Worker project list query failed',
        expect.objectContaining({
          originalError: expect.objectContaining({
            message: 'Original database error',
            code: 'ECONNREFUSED',
          }),
        })
      );
    });
  });

  describe('エラーの再スロー', () => {
    it('DatabaseErrorをスローし、元のエラー情報を保持する', async () => {
      // Arrange
      const originalError = new Error('Connection lost');
      (originalError as any).code = 'ECONNRESET';
      mockQuery.mockRejectedValueOnce(originalError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act & Assert
      try {
        await service.listWorkerAccessible(
          'user-rethrow',
          'experiment_worker',
          'org-rethrow',
          params
        );
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('データベースエラー');
        expect(error.originalError).toBeDefined();
        expect(error.originalError.code).toBe('ECONNRESET');
      }
    });

    it('タイムアウトエラーの場合、特別なエラーメッセージをスローする', async () => {
      // Arrange
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockQuery.mockRejectedValueOnce(timeoutError);

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act & Assert
      try {
        await service.listWorkerAccessible(
          'user-timeout',
          'experiment_worker',
          'org-timeout',
          params
        );
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBe('クエリがタイムアウトしました');
        expect(error.originalError).toBeDefined();
      }
    });
  });

  describe('正常系でのロギング', () => {
    it('正常に完了した場合はエラーログを記録しない', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              project_id: 'proj-success',
              project_name: 'Success Project',
              description: 'Description',
              project_status: 'pending',
              create_at: new Date('2026-01-01'),
              update_at: new Date('2026-01-15'),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
        });

      const params: ListWorkerProjectsParams = {
        page: 1,
        limit: 20,
        sortBy: 'create_at',
        order: 'desc',
      };

      // Act
      await service.listWorkerAccessible(
        'user-success',
        'experiment_worker',
        'org-success',
        params
      );

      // Assert
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});