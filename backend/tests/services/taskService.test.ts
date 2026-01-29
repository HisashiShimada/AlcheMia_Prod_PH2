/**
 * タスクサービステスト
 * 
 * @description タスクサービスのユニットテスト（TDD方式）
 */

import { validateTransition, TaskStatusEnum, checkPermission } from '../../src/services/taskService';

describe('taskService', () => {
  describe('TaskStatusEnum', () => {
    it('should define correct status values', () => {
      expect(TaskStatusEnum.PENDING).toBe(0);
      expect(TaskStatusEnum.IN_PROGRESS).toBe(1);
      expect(TaskStatusEnum.COMPLETED).toBe(3);
      expect(TaskStatusEnum.FORCED_TERMINATED).toBe(4);
    });
  });

  describe('validateTransition', () => {
    describe('有効な状態遷移', () => {
      it('should allow PENDING to IN_PROGRESS transition', () => {
        const result = validateTransition(TaskStatusEnum.PENDING, TaskStatusEnum.IN_PROGRESS);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow IN_PROGRESS to COMPLETED transition', () => {
        const result = validateTransition(TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.COMPLETED);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow IN_PROGRESS to FORCED_TERMINATED transition', () => {
        const result = validateTransition(TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.FORCED_TERMINATED);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('無効な状態遷移', () => {
      it('should reject PENDING to COMPLETED transition', () => {
        const result = validateTransition(TaskStatusEnum.PENDING, TaskStatusEnum.COMPLETED);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
        expect(result.error?.message).toContain('Invalid status transition');
      });

      it('should reject PENDING to FORCED_TERMINATED transition', () => {
        const result = validateTransition(TaskStatusEnum.PENDING, TaskStatusEnum.FORCED_TERMINATED);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
      });

      it('should reject COMPLETED to IN_PROGRESS transition (backward)', () => {
        const result = validateTransition(TaskStatusEnum.COMPLETED, TaskStatusEnum.IN_PROGRESS);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
      });

      it('should reject COMPLETED to PENDING transition (backward)', () => {
        const result = validateTransition(TaskStatusEnum.COMPLETED, TaskStatusEnum.PENDING);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
      });

      it('should reject FORCED_TERMINATED to any status (terminal state)', () => {
        const result = validateTransition(TaskStatusEnum.FORCED_TERMINATED, TaskStatusEnum.IN_PROGRESS);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
      });

      it('should reject same status transition', () => {
        const result = validateTransition(TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.IN_PROGRESS);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
      });
    });

    describe('エッジケース', () => {
      it('should reject invalid status numbers', () => {
        const result = validateTransition(99, TaskStatusEnum.IN_PROGRESS);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
      });

      it('should provide descriptive error messages', () => {
        const result = validateTransition(TaskStatusEnum.PENDING, TaskStatusEnum.COMPLETED);
        expect(result.error?.message).toMatch(/PENDING.*COMPLETED/i);
      });
    });
  });

  describe('checkPermission', () => {
    describe('system_adminロール', () => {
      it('should allow system_admin to access any task in their organization', () => {
        const result = checkPermission(
          'user-1',
          'system_admin',
          'user-999', // 他のユーザーのタスク
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow system_admin to access tasks in any organization', () => {
        const result = checkPermission(
          'user-1',
          'system_admin',
          'user-999',
          'org-1',
          'org-2' // 異なる組織
        );
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('experiment_adminロール', () => {
      it('should allow experiment_admin to access any task in their organization', () => {
        const result = checkPermission(
          'user-1',
          'experiment_admin',
          'user-999', // 他のユーザーのタスク
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow experiment_admin to access their own task', () => {
        const result = checkPermission(
          'user-1',
          'experiment_admin',
          'user-1', // 自分のタスク
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('experiment_workerロール', () => {
      it('should allow experiment_worker to access their own assigned task', () => {
        const result = checkPermission(
          'user-1',
          'experiment_worker',
          'user-1', // 自分に割り当てられたタスク
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject experiment_worker accessing other user\'s task', () => {
        const result = checkPermission(
          'user-1',
          'experiment_worker',
          'user-999', // 他のユーザーのタスク
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('PERMISSION_INSUFFICIENT');
        expect(result.error?.message).toContain('experiment_worker');
        expect(result.error?.message).toContain('assigned');
      });

      it('should reject experiment_worker when experimentUserId is null', () => {
        const result = checkPermission(
          'user-1',
          'experiment_worker',
          null, // タスクに誰も割り当てられていない
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('PERMISSION_INSUFFICIENT');
      });
    });

    describe('その他のロール', () => {
      it('should reject unknown role', () => {
        const result = checkPermission(
          'user-1',
          'unknown_role',
          'user-1',
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('PERMISSION_INSUFFICIENT');
      });

      it('should reject data_admin role (not allowed to update task status)', () => {
        const result = checkPermission(
          'user-1',
          'data_admin',
          'user-1',
          'org-1',
          'org-1'
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('PERMISSION_INSUFFICIENT');
      });
    });

    describe('エラーメッセージ', () => {
      it('should provide descriptive error message for insufficient permission', () => {
        const result = checkPermission(
          'user-1',
          'experiment_worker',
          'user-999',
          'org-1',
          'org-1'
        );
        expect(result.error?.message).toMatch(/experiment_worker.*assigned/i);
      });
    });
  });
});