/**
 * TaskService - データ整合性検証の単体テスト
 * 
 * タスク2.2: データ整合性検証ロジックの実装
 * - データベースから取得したメソッドIDの検証
 * - 不整合が見つかった場合は警告ログを出力
 * - エラーにはせず処理を継続（データを除外）
 */

import { TaskService } from '../../src/services/taskService';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { MethodTaskRecord } from '../../src/types/task';

// TaskRepositoryのモック
jest.mock('../../src/repositories/taskRepository');

// ログのモック
const mockWarn = jest.fn();
const mockError = jest.fn();

// Winstonロガーのモック
jest.mock('../../src/utils/logger', () => ({
  logger: {
    warn: (...args: any[]) => mockWarn(...args),
    error: (...args: any[]) => mockError(...args),
  },
}));

describe('TaskService - validateDataConsistency', () => {
  let taskService: TaskService;
  let mockTaskRepository: jest.Mocked<TaskRepository>;

  beforeEach(() => {
    // モックのクリア
    jest.clearAllMocks();
    mockWarn.mockClear();
    mockError.mockClear();

    // TaskRepositoryのモックインスタンス作成
    mockTaskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    
    // TaskServiceのインスタンス作成（モックRepositoryを注入）
    taskService = new TaskService(mockTaskRepository);
  });

  describe('データ整合性の検証', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';

    it('不正なmethod_idが含まれている場合、警告ログを出力する', async () => {
      // モックデータ：不正なmethod_idを含む
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'method-1',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: '', // 不正: 空文字列
          method_name: 'メソッド2',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        {
          method_id: 'invalid-uuid', // 不正: UUID形式ではない
          method_name: 'メソッド3',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'in_progress',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // 警告ログが出力されることを確認
      expect(mockWarn).toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('Data inconsistency detected'),
        expect.objectContaining({
          projectId,
          organizationId,
          invalidCount: expect.any(Number),
          totalCount: expect.any(Number),
        })
      );
    });

    it('不正なmethod_idのデータは除外され、正常なデータのみ処理される', async () => {
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6', // 正常: UUID形式
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: '', // 不正: 空文字列
          method_name: 'メソッド2（不正）',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        {
          method_id: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7', // 正常: UUID形式
          method_name: 'メソッド3',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'in_progress',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // 正常なデータ（メソッド1とメソッド3）のみが含まれることを確認
      expect(result).toHaveLength(2);
      expect(result[0].method_id).toBe('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6');
      expect(result[1].method_id).toBe('b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7');
      
      // 不正なメソッド2は除外される
      expect(result.find(m => m.method_name === 'メソッド2（不正）')).toBeUndefined();
    });

    it('すべてのmethod_idが正常な場合、警告ログは出力されない', async () => {
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
          method_name: 'メソッド2',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // 警告ログが出力されないことを確認
      expect(mockWarn).not.toHaveBeenCalled();
      
      // すべてのメソッドが含まれることを確認
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});
      expect(result).toHaveLength(2);
    });

    it('nullまたはundefinedのmethod_idは不正として扱う', async () => {
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: null as any, // 不正: null
          method_name: 'メソッド2（null）',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // 正常なデータ（メソッド1）のみが含まれることを確認
      expect(result).toHaveLength(1);
      expect(result[0].method_id).toBe('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6');
      
      // 警告ログが出力されることを確認
      expect(mockWarn).toHaveBeenCalled();
    });

    it('同じmethod_idで複数のタスクがある場合も正しく処理される', async () => {
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6', // 同じmethod_id
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-2',
          task_detail_no: 2,
          task_status: 'started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 50,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        {
          method_id: 'invalid-uuid', // 不正
          method_name: 'メソッド2（不正）',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'in_progress',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // メソッド1のグループに2つのタスクが含まれることを確認
      expect(result).toHaveLength(1);
      expect(result[0].method_id).toBe('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6');
      expect(result[0].tasks).toHaveLength(2);
      
      // 警告ログが出力されることを確認（不正なメソッド2）
      expect(mockWarn).toHaveBeenCalled();
    });
  });
});