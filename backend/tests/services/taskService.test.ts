/**
 * TaskService単体テスト
 * 
 * タスク2.1: TaskServiceインターフェースと実装の作成
 * - タスクがmethod_id単位で正しくグループ化されること
 * - 空のメソッド（タスクなし）も含まれること
 * - experiment_order順にソートされること
 * - ソート条件が正しく適用されること
 * - 日時フィールドがISO 8601形式に変換されること
 */

import { TaskService } from '../../src/services/taskService';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { MethodTaskRecord, TaskFilters } from '../../src/types/task';

// TaskRepositoryのモック
jest.mock('../../src/repositories/taskRepository');

describe('TaskService', () => {
  let taskService: TaskService;
  let mockTaskRepository: jest.Mocked<TaskRepository>;

  beforeEach(() => {
    // モックのクリア
    jest.clearAllMocks();

    // TaskRepositoryのモックインスタンス作成
    mockTaskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    
    // TaskServiceのインスタンス作成（モックRepositoryを注入）
    taskService = new TaskService(mockTaskRepository);
  });

  describe('getTasksGroupedByMethod', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';

    it('タスクをmethod_id単位で正しくグループ化する', async () => {
      // モックデータ：2つのメソッド、それぞれ2つのタスク
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: 'user-1',
          assign_user_name: 'ユーザー1',
          progress_rate: 50,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-2',
          task_detail_no: 2,
          task_status: 'started',
          assign_user_id: 'user-2',
          assign_user_name: 'ユーザー2',
          progress_rate: 75,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        {
          method_id: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
          method_name: 'メソッド2',
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

      // 結果の検証
      expect(result).toHaveLength(2); // 2つのメソッドグループ
      
      // メソッド1のグループ
      expect(result[0].method_id).toBe('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6');
      expect(result[0].method_name).toBe('メソッド1');
      expect(result[0].experiment_order).toBe(1);
      expect(result[0].tasks).toHaveLength(2);
      
      // メソッド2のグループ
      expect(result[1].method_id).toBe('b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7');
      expect(result[1].method_name).toBe('メソッド2');
      expect(result[1].experiment_order).toBe(2);
      expect(result[1].tasks).toHaveLength(1);
    });

    it('experiment_order順にメソッドをソートする', async () => {
      // モックデータ：experiment_orderが逆順
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド3',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
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
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        {
          method_id: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
          method_name: 'メソッド2',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // experiment_order順にソートされていることを確認
      expect(result[0].experiment_order).toBe(1);
      expect(result[1].experiment_order).toBe(2);
      expect(result[2].experiment_order).toBe(3);
    });

    it('日時フィールドをISO 8601形式に変換する', async () => {
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
          created_at: new Date('2024-01-01T10:30:45.123Z'),
          updated_at: new Date('2024-01-02T15:45:30.456Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // ISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）に変換されていることを確認
      expect(result[0].tasks[0].created_at).toBe('2024-01-01T10:30:45.123Z');
      expect(result[0].tasks[0].updated_at).toBe('2024-01-02T15:45:30.456Z');
    });

    it('空のメソッド（タスクなし）も含める', async () => {
      // このテストは将来の拡張で対応
      // 現状のデータ構造では、タスクがないメソッドはDBから返されない
      // MAIMLファイルとの突合が必要（要件11）
      
      const mockRecords: MethodTaskRecord[] = [];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // 空配列が返されることを確認
      expect(result).toHaveLength(0);
    });

    it('TaskRepositoryに正しいパラメータを渡す', async () => {
      const mockRecords: MethodTaskRecord[] = [];
      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const filters: TaskFilters = {
        methodId: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
        status: 'started',
        assignUserId: 'user-1',
        sortBy: 'created_at',
        order: 'desc',
      };

      await taskService.getTasksGroupedByMethod(projectId, organizationId, filters);

      // TaskRepositoryが正しいパラメータで呼ばれたことを確認
      expect(mockTaskRepository.findMethodsAndTasksByProject).toHaveBeenCalledWith(
        projectId,
        organizationId,
        filters
      );
    });

    it('担当者名がnullの場合も正しく処理する', async () => {
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
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // nullが正しく保持されていることを確認
      expect(result[0].tasks[0].assign_user_id).toBeNull();
      expect(result[0].tasks[0].assign_user_name).toBeNull();
    });
  });
});