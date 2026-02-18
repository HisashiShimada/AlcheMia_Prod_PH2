/**
 * 実験データAPI用エラークラスのテスト
 * 
 * タスク6.1: カスタムエラークラスの定義
 * Requirements: 7 (エラーハンドリングとレスポンス)
 * Feature: experiment-data-save-api
 */

import {
  ProjectNotEditableError,
  TaskNotFoundError,
  InvalidStatusTransitionError,
  formatErrorResponse,
  getHttpStatusFromError,
} from '../../src/utils/errorClasses';

describe('Experiment Data API Error Classes', () => {
  describe('ProjectNotEditableError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new ProjectNotEditableError('プロジェクトは編集できません');
      
      expect(error.name).toBe('ProjectNotEditableError');
      expect(error.message).toBe('プロジェクトは編集できません');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('PROJECT_NOT_EDITABLE');
    });

    it('デフォルトメッセージを持つ', () => {
      const error = new ProjectNotEditableError();
      
      expect(error.message).toBe('プロジェクトが編集可能な状態ではありません');
    });

    it('プロジェクトIDを保持できる', () => {
      const error = new ProjectNotEditableError(
        'プロジェクトは編集できません',
        'proj_123'
      );
      
      expect(error.projectId).toBe('proj_123');
    });

    it('プロジェクトステータスを保持できる', () => {
      const error = new ProjectNotEditableError(
        'プロジェクトは編集できません',
        'proj_123',
        'archived'
      );
      
      expect(error.currentStatus).toBe('archived');
    });

    it('Error クラスを継承している', () => {
      const error = new ProjectNotEditableError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('TaskNotFoundError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new TaskNotFoundError('タスクが見つかりません');
      
      expect(error.name).toBe('TaskNotFoundError');
      expect(error.message).toBe('タスクが見つかりません');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('TASK_NOT_FOUND');
    });

    it('デフォルトメッセージを持つ', () => {
      const error = new TaskNotFoundError();
      
      expect(error.message).toBe('指定されたタスクが見つかりません');
    });

    it('タスク番号を保持できる', () => {
      const error = new TaskNotFoundError('タスクが見つかりません', 5);
      
      expect(error.taskNo).toBe(5);
    });

    it('プロジェクトIDを保持できる', () => {
      const error = new TaskNotFoundError('タスクが見つかりません', 5, 'proj_123');
      
      expect(error.projectId).toBe('proj_123');
    });

    it('Error クラスを継承している', () => {
      const error = new TaskNotFoundError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('InvalidStatusTransitionError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new InvalidStatusTransitionError('不正なステータス遷移です');
      
      expect(error.name).toBe('InvalidStatusTransitionError');
      expect(error.message).toBe('不正なステータス遷移です');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('デフォルトメッセージを持つ', () => {
      const error = new InvalidStatusTransitionError();
      
      expect(error.message).toBe('不正なステータス遷移です');
    });

    it('現在のステータスを保持できる', () => {
      const error = new InvalidStatusTransitionError(
        '不正な遷移',
        'completed',
        'running'
      );
      
      expect(error.currentStatus).toBe('completed');
      expect(error.targetStatus).toBe('running');
    });

    it('Error クラスを継承している', () => {
      const error = new InvalidStatusTransitionError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('formatErrorResponse with new error classes', () => {
    it('ProjectNotEditableError を正しくフォーマットする', () => {
      const error = new ProjectNotEditableError(
        'プロジェクトはアーカイブ済みです',
        'proj_123',
        'archived'
      );
      const response = formatErrorResponse(error, 'req_001');
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'PROJECT_NOT_EDITABLE',
          message: 'プロジェクトはアーカイブ済みです',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req_001',
        },
      });
    });

    it('TaskNotFoundError を正しくフォーマットする', () => {
      const error = new TaskNotFoundError('タスク5が見つかりません', 5, 'proj_123');
      const response = formatErrorResponse(error, 'req_002');
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'タスク5が見つかりません',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req_002',
        },
      });
    });

    it('InvalidStatusTransitionError を正しくフォーマットする', () => {
      const error = new InvalidStatusTransitionError(
        'completedからrunningへの遷移は許可されていません',
        'completed',
        'running'
      );
      const response = formatErrorResponse(error, 'req_003');
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: 'completedからrunningへの遷移は許可されていません',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req_003',
        },
      });
    });
  });

  describe('getHttpStatusFromError with new error classes', () => {
    it('ProjectNotEditableError から 403 を返す', () => {
      const error = new ProjectNotEditableError();
      expect(getHttpStatusFromError(error)).toBe(403);
    });

    it('TaskNotFoundError から 404 を返す', () => {
      const error = new TaskNotFoundError();
      expect(getHttpStatusFromError(error)).toBe(404);
    });

    it('InvalidStatusTransitionError から 422 を返す', () => {
      const error = new InvalidStatusTransitionError();
      expect(getHttpStatusFromError(error)).toBe(422);
    });
  });
});
