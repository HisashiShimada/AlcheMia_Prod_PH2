/**
 * ConflictErrorクラスのユニットテスト
 * 
 * タスク5.1.1: ConflictErrorクラスのテスト作成（RED）
 * Requirements: 10, 14
 */

import { 
  ConflictError, 
  formatErrorResponse, 
  getHttpStatusFromError 
} from '../../src/utils/errorClasses';

describe('ConflictError', () => {
  describe('コンストラクタ', () => {
    test('デフォルトメッセージでConflictErrorを作成できる', () => {
      const error = new ConflictError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.name).toBe('ConflictError');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Resource conflict');
    });

    test('カスタムメッセージでConflictErrorを作成できる', () => {
      const customMessage = 'プロジェクトは既に承認依頼中です';
      const error = new ConflictError(customMessage);
      
      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    test('日本語メッセージでConflictErrorを作成できる', () => {
      const japaneseMessage = '既に承認依頼が送信されています';
      const error = new ConflictError(japaneseMessage);
      
      expect(error.message).toBe(japaneseMessage);
    });

    test('detailsフィールド付きでConflictErrorを作成できる', () => {
      const message = 'ステータス競合が発生しました';
      const details = [
        { field: 'project_status', current: 'waiting_approval', expected: 'active' }
      ];
      const error = new ConflictError(message, details);
      
      expect(error.message).toBe(message);
      expect(error.details).toEqual(details);
    });

    test('detailsなしでConflictErrorを作成できる', () => {
      const error = new ConflictError('競合エラー');
      
      expect(error.details).toBeUndefined();
    });
  });

  describe('formatErrorResponse', () => {
    test('ConflictErrorを統一レスポンス形式に変換できる', () => {
      const error = new ConflictError('プロジェクトは既に承認依頼中です');
      const requestId = 'req_123';
      
      const response = formatErrorResponse(error, requestId);
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('CONFLICT');
      expect(response.error.message).toBe('プロジェクトは既に承認依頼中です');
      expect(response.meta.requestId).toBe(requestId);
      expect(response.meta.timestamp).toBeDefined();
    });

    test('ConflictErrorのdetailsをレスポンスに含められる', () => {
      const details = [
        { field: 'project_status', current: 'waiting_approval' }
      ];
      const error = new ConflictError('ステータス競合', details);
      
      const response = formatErrorResponse(error);
      
      expect(response.error.details).toEqual(details);
    });

    test('requestIdなしでConflictErrorを変換できる', () => {
      const error = new ConflictError('競合エラー');
      
      const response = formatErrorResponse(error);
      
      expect(response.meta.requestId).toBeUndefined();
      expect(response.meta.timestamp).toBeDefined();
    });
  });

  describe('getHttpStatusFromError', () => {
    test('ConflictErrorから409ステータスコードを取得できる', () => {
      const error = new ConflictError('競合エラー');
      
      const statusCode = getHttpStatusFromError(error);
      
      expect(statusCode).toBe(409);
    });

    test('detailsありConflictErrorから409ステータスコードを取得できる', () => {
      const error = new ConflictError('競合エラー', [{ field: 'status' }]);
      
      const statusCode = getHttpStatusFromError(error);
      
      expect(statusCode).toBe(409);
    });
  });

  describe('エラーメッセージの日本語対応', () => {
    test('承認依頼関連の日本語メッセージを正しく処理できる', () => {
      const messages = [
        '既に承認依頼が送信されています',
        'プロジェクトは既に承認済みです',
        'このプロジェクトは編集中のため承認依頼できません',
        'アーカイブ済みプロジェクトには承認依頼できません'
      ];

      messages.forEach(message => {
        const error = new ConflictError(message);
        expect(error.message).toBe(message);
        
        const response = formatErrorResponse(error);
        expect(response.error.message).toBe(message);
      });
    });
  });
});