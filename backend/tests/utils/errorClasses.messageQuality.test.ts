/**
 * エラーメッセージの品質テスト
 * 
 * タスク6.2: エラーメッセージの多言語対応を確認する
 * Requirements: 7 (エラーハンドリング)
 * 
 * エラーメッセージが以下の要件を満たしているかを検証：
 * 1. 日本語で分かりやすい
 * 2. 機密情報が含まれていない
 * 3. ユーザーフレンドリー
 */

import {
  ProjectNotEditableError,
  TaskNotFoundError,
  InvalidStatusTransitionError,
  formatErrorResponse,
} from '../../src/utils/errorClasses';

describe('Error Message Quality Tests', () => {
  describe('ProjectNotEditableError', () => {
    it('デフォルトメッセージが日本語で分かりやすい', () => {
      const error = new ProjectNotEditableError();
      
      // 日本語であることを確認
      expect(error.message).toMatch(/^[ぁ-んァ-ヶー一-龯]+/);
      // ユーザーフレンドリーな表現
      expect(error.message).toContain('プロジェクト');
      expect(error.message).toContain('編集');
    });

    it('カスタムメッセージが設定可能', () => {
      const customMessage = 'このプロジェクトは現在編集できません。ステータスを確認してください。';
      const error = new ProjectNotEditableError(customMessage);
      
      expect(error.message).toBe(customMessage);
    });

    it('機密情報を含まない', () => {
      const error = new ProjectNotEditableError(
        'プロジェクトが編集可能な状態ではありません',
        'project-123',
        'archived'
      );
      
      // パスワード、トークン、内部パスなどの機密情報を含まないことを確認
      expect(error.message).not.toMatch(/password|token|secret|key|jwt/i);
      expect(error.message).not.toMatch(/\/[a-zA-Z0-9_/-]+\.(ts|js|env)/); // ファイルパス
      expect(error.message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/); // UUID
    });

    it('エラーレスポンスに適切な情報を含む', () => {
      const error = new ProjectNotEditableError(
        'プロジェクトが編集可能な状態ではありません',
        'project-123',
        'archived'
      );
      const response = formatErrorResponse(error, 'req-123');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('PROJECT_NOT_EDITABLE');
      expect(response.error.message).toContain('プロジェクト');
      expect(response.meta.timestamp).toBeDefined();
      expect(response.meta.requestId).toBe('req-123');
    });
  });

  describe('TaskNotFoundError', () => {
    it('デフォルトメッセージが日本語で分かりやすい', () => {
      const error = new TaskNotFoundError();
      
      // 日本語であることを確認
      expect(error.message).toMatch(/^[ぁ-んァ-ヶー一-龯]+/);
      // ユーザーフレンドリーな表現
      expect(error.message).toContain('タスク');
      expect(error.message).toContain('見つかりません');
    });

    it('カスタムメッセージが設定可能', () => {
      const customMessage = '指定されたタスク番号が存在しません。タスク一覧を確認してください。';
      const error = new TaskNotFoundError(customMessage);
      
      expect(error.message).toBe(customMessage);
    });

    it('機密情報を含まない', () => {
      const error = new TaskNotFoundError(
        '指定されたタスクが見つかりません',
        5,
        'project-123'
      );
      
      // 機密情報を含まないことを確認
      expect(error.message).not.toMatch(/password|token|secret|key|jwt/i);
      expect(error.message).not.toMatch(/\/[a-zA-Z0-9_/-]+\.(ts|js|env)/);
      expect(error.message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
    });

    it('エラーレスポンスに適切な情報を含む', () => {
      const error = new TaskNotFoundError(
        '指定されたタスクが見つかりません',
        5,
        'project-123'
      );
      const response = formatErrorResponse(error, 'req-456');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('TASK_NOT_FOUND');
      expect(response.error.message).toContain('タスク');
      expect(response.meta.timestamp).toBeDefined();
      expect(response.meta.requestId).toBe('req-456');
    });
  });

  describe('InvalidStatusTransitionError', () => {
    it('デフォルトメッセージが日本語で分かりやすい', () => {
      const error = new InvalidStatusTransitionError();
      
      // 日本語であることを確認
      expect(error.message).toMatch(/^[ぁ-んァ-ヶー一-龯]+/);
      // ユーザーフレンドリーな表現
      expect(error.message).toContain('ステータス');
      expect(error.message).toContain('遷移');
    });

    it('カスタムメッセージが設定可能', () => {
      const customMessage = 'このステータス遷移は許可されていません。現在のステータスを確認してください。';
      const error = new InvalidStatusTransitionError(customMessage);
      
      expect(error.message).toBe(customMessage);
    });

    it('機密情報を含まない', () => {
      const error = new InvalidStatusTransitionError(
        '不正なステータス遷移です',
        'completed',
        'running'
      );
      
      // 機密情報を含まないことを確認
      expect(error.message).not.toMatch(/password|token|secret|key|jwt/i);
      expect(error.message).not.toMatch(/\/[a-zA-Z0-9_/-]+\.(ts|js|env)/);
      expect(error.message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
    });

    it('エラーレスポンスに適切な情報を含む', () => {
      const error = new InvalidStatusTransitionError(
        '不正なステータス遷移です',
        'completed',
        'running'
      );
      const response = formatErrorResponse(error, 'req-789');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(response.error.message).toContain('ステータス');
      expect(response.meta.timestamp).toBeDefined();
      expect(response.meta.requestId).toBe('req-789');
    });
  });

  describe('エラーレスポンス形式の統一性', () => {
    it('すべての実験データAPIエラーが統一形式を使用する', () => {
      const errors = [
        new ProjectNotEditableError(),
        new TaskNotFoundError(),
        new InvalidStatusTransitionError(),
      ];

      errors.forEach((error) => {
        const response = formatErrorResponse(error);
        
        // 統一形式の検証
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
        expect(response).toHaveProperty('meta');
        expect(response.meta).toHaveProperty('timestamp');
      });
    });

    it('エラーレスポンスのタイムスタンプがISO 8601形式', () => {
      const error = new ProjectNotEditableError();
      const response = formatErrorResponse(error);
      
      // ISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）の検証
      expect(response.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('ユーザーフレンドリーなメッセージ', () => {
    it('ProjectNotEditableErrorは状況を説明している', () => {
      const error = new ProjectNotEditableError();
      
      // 何が問題なのかを説明している
      expect(error.message).toContain('編集');
      expect(error.message).toContain('状態');
    });

    it('TaskNotFoundErrorはリソースが存在しないことを明確にしている', () => {
      const error = new TaskNotFoundError();
      
      // リソースが見つからないことを明確に伝えている
      expect(error.message).toContain('見つかりません');
    });

    it('InvalidStatusTransitionErrorは遷移が許可されていないことを示している', () => {
      const error = new InvalidStatusTransitionError();
      
      // 遷移が不正であることを明確に伝えている
      expect(error.message).toContain('不正');
      expect(error.message).toContain('遷移');
    });
  });

  describe('機密情報の漏洩防止', () => {
    it('エラーレスポンスにスタックトレースが含まれない', () => {
      const error = new ProjectNotEditableError();
      const response = formatErrorResponse(error);
      
      // スタックトレースは含まれない（本番環境での機密情報漏洩防止）
      expect(JSON.stringify(response)).not.toContain('at Object');
      expect(JSON.stringify(response)).not.toContain('.ts:');
      expect(JSON.stringify(response)).not.toContain('.js:');
    });

    it('エラーメッセージにデータベース情報が含まれない', () => {
      const error = new TaskNotFoundError();
      
      // データベース関連の情報が含まれない
      expect(error.message).not.toMatch(/postgres|pg|database|table|column/i);
      expect(error.message).not.toContain('SELECT');
      expect(error.message).not.toContain('FROM');
    });

    it('エラーメッセージにファイルパスが含まれない', () => {
      const error = new InvalidStatusTransitionError();
      
      // ファイルパスが含まれない
      expect(error.message).not.toMatch(/\/backend\/|\/frontend\/|C:\\|D:\\/);
      expect(error.message).not.toMatch(/node_modules/);
    });
  });
});
