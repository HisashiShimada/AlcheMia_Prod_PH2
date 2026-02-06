/**
 * TransitionData型のテスト
 * 
 * テスト対象:
 * - TransitionData型の構造
 * - ステータス値のバリデーション
 */

import { TransitionData, Status, isValidStatus } from '../../src/types/transitionData';

describe('TransitionData Type Tests', () => {
  describe('TransitionData型の構造検証', () => {
    test('有効なTransitionDataオブジェクトを作成できる', () => {
      const validTransitionData: TransitionData = {
        transition_id: 'T001',
        transition_name: 'サンプル準備',
        status: 'initial',
        comment: ''
      };

      expect(validTransitionData).toBeDefined();
      expect(validTransitionData.transition_id).toBe('T001');
      expect(validTransitionData.transition_name).toBe('サンプル準備');
      expect(validTransitionData.status).toBe('initial');
      expect(validTransitionData.comment).toBe('');
    });

    test('statusフィールドは必須である', () => {
      // TypeScriptの型チェックにより、statusなしではコンパイルエラーとなる
      // このテストは型の存在を確認する
      const data: TransitionData = {
        transition_id: 'T001',
        transition_name: 'サンプル準備',
        status: 'preparing',
        comment: ''
      };

      expect(data.status).toBeDefined();
    });

    test('commentフィールドは必須である', () => {
      const data: TransitionData = {
        transition_id: 'T001',
        transition_name: 'サンプル準備',
        status: 'completed',
        comment: 'テストコメント'
      };

      expect(data.comment).toBeDefined();
    });
  });

  describe('Status型の検証', () => {
    test('有効なステータス値を受け入れる', () => {
      const validStatuses: Status[] = [
        'initial',
        'preparing',
        'ready',
        'running',
        'paused',
        'completed',
        'error'
      ];

      validStatuses.forEach(status => {
        const data: TransitionData = {
          transition_id: 'T001',
          transition_name: 'テスト',
          status: status,
          comment: ''
        };
        expect(data.status).toBe(status);
      });
    });
  });

  describe('isValidStatus関数の検証', () => {
    describe('有効なステータス値', () => {
      test('initialを有効と判定する', () => {
        expect(isValidStatus('initial')).toBe(true);
      });

      test('preparingを有効と判定する', () => {
        expect(isValidStatus('preparing')).toBe(true);
      });

      test('readyを有効と判定する', () => {
        expect(isValidStatus('ready')).toBe(true);
      });

      test('runningを有効と判定する', () => {
        expect(isValidStatus('running')).toBe(true);
      });

      test('pausedを有効と判定する', () => {
        expect(isValidStatus('paused')).toBe(true);
      });

      test('completedを有効と判定する', () => {
        expect(isValidStatus('completed')).toBe(true);
      });

      test('errorを有効と判定する', () => {
        expect(isValidStatus('error')).toBe(true);
      });
    });

    describe('無効なステータス値', () => {
      test('空文字列を無効と判定する', () => {
        expect(isValidStatus('')).toBe(false);
      });

      test('未定義の文字列を無効と判定する', () => {
        expect(isValidStatus('invalid_status')).toBe(false);
      });

      test('旧ステータス値（not_started）を無効と判定する', () => {
        expect(isValidStatus('not_started')).toBe(false);
      });

      test('旧ステータス値（in_progress）を無効と判定する', () => {
        expect(isValidStatus('in_progress')).toBe(false);
      });

      test('旧ステータス値（skipped）を無効と判定する', () => {
        expect(isValidStatus('skipped')).toBe(false);
      });

      test('nullを無効と判定する', () => {
        expect(isValidStatus(null as any)).toBe(false);
      });

      test('undefinedを無効と判定する', () => {
        expect(isValidStatus(undefined as any)).toBe(false);
      });

      test('数値を無効と判定する', () => {
        expect(isValidStatus(123 as any)).toBe(false);
      });

      test('オブジェクトを無効と判定する', () => {
        expect(isValidStatus({} as any)).toBe(false);
      });

      test('配列を無効と判定する', () => {
        expect(isValidStatus([] as any)).toBe(false);
      });

      test('大文字小文字が異なる値を無効と判定する', () => {
        expect(isValidStatus('INITIAL')).toBe(false);
        expect(isValidStatus('Preparing')).toBe(false);
        expect(isValidStatus('COMPLETED')).toBe(false);
      });

      test('スペース付きの値を無効と判定する', () => {
        expect(isValidStatus(' initial')).toBe(false);
        expect(isValidStatus('initial ')).toBe(false);
        expect(isValidStatus(' initial ')).toBe(false);
      });
    });

    describe('型ガード機能の検証', () => {
      test('有効な値の場合、型ガードとして機能する', () => {
        const value: string = 'completed';
        
        if (isValidStatus(value)) {
          // この条件分岐内では、valueはStatus型として扱われる
          const status: Status = value;
          expect(status).toBe('completed');
        }
      });

      test('無効な値の場合、型ガードがfalseを返す', () => {
        const value: string = 'invalid';
        
        if (!isValidStatus(value)) {
          // この条件分岐内では、valueは通常のstring型のまま
          expect(value).toBe('invalid');
        }
      });
    });
  });
});