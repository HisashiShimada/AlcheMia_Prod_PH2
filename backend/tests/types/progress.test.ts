/**
 * 進捗データ取得API - 型定義テスト
 * 
 * @description 型定義が正しくコンパイルされることを確認
 * Feature: progress-data-retrieval-api
 * Task: 1.2 型定義の整備
 */

import { describe, it, expect } from '@jest/globals';
import type {
  ProgressData,
  TransitionProgress,
  OverallProgress,
  ProgressServiceError,
  ParsedMethod,
  PetriNetTransition,
} from '../../src/types/progress';
import type { Result } from '../../src/types/service';

describe('Progress API Type Definitions', () => {
  describe('TransitionProgress型', () => {
    it('正しい構造のTransitionProgressオブジェクトを作成できる', () => {
      const transition: TransitionProgress = {
        transition_id: 't1',
        transition_name: '材料準備',
        status: 'not_started',
        progress: 0,
        last_updated: null,
        has_data: false,
        data_count: 0,
      };

      expect(transition.transition_id).toBe('t1');
      expect(transition.status).toBe('not_started');
      expect(transition.progress).toBe(0);
    });

    it('in_progressステータスを持つTransitionProgressを作成できる', () => {
      const transition: TransitionProgress = {
        transition_id: 't2',
        transition_name: '反応実験',
        status: 'in_progress',
        progress: 50,
        last_updated: '2026-02-16T09:00:00Z',
        has_data: true,
        data_count: 5,
      };

      expect(transition.status).toBe('in_progress');
      expect(transition.progress).toBe(50);
      expect(transition.has_data).toBe(true);
    });

    it('completedステータスを持つTransitionProgressを作成できる', () => {
      const transition: TransitionProgress = {
        transition_id: 't3',
        transition_name: '結果測定',
        status: 'completed',
        progress: 100,
        last_updated: '2026-02-16T10:00:00Z',
        has_data: true,
        data_count: 10,
      };

      expect(transition.status).toBe('completed');
      expect(transition.progress).toBe(100);
    });
  });

  describe('OverallProgress型', () => {
    it('正しい構造のOverallProgressオブジェクトを作成できる', () => {
      const overall: OverallProgress = {
        total_transitions: 10,
        completed: 3,
        in_progress: 2,
        not_started: 5,
        overall_percentage: 35.5,
      };

      expect(overall.total_transitions).toBe(10);
      expect(overall.overall_percentage).toBe(35.5);
    });

    it('全トランジションの合計が一致することを検証できる', () => {
      const overall: OverallProgress = {
        total_transitions: 10,
        completed: 3,
        in_progress: 2,
        not_started: 5,
        overall_percentage: 35.5,
      };

      const sum = overall.completed + overall.in_progress + overall.not_started;
      expect(sum).toBe(overall.total_transitions);
    });
  });

  describe('ProgressData型', () => {
    it('正しい構造のProgressDataオブジェクトを作成できる', () => {
      const progressData: ProgressData = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'サンプルプロジェクト',
        method_id: 'method_001',
        method_name: '合成実験',
        task_no: 1,
        task_name: 'タスク1',
        transitions: [
          {
            transition_id: 't1',
            transition_name: '材料準備',
            status: 'completed',
            progress: 100,
            last_updated: '2026-02-16T09:00:00Z',
            has_data: true,
            data_count: 3,
          },
        ],
        overall_progress: {
          total_transitions: 1,
          completed: 1,
          in_progress: 0,
          not_started: 0,
          overall_percentage: 100.0,
        },
      };

      expect(progressData.project_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(progressData.transitions).toHaveLength(1);
      expect(progressData.overall_progress.total_transitions).toBe(1);
    });

    it('複数トランジションを持つProgressDataを作成できる', () => {
      const progressData: ProgressData = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'サンプルプロジェクト',
        method_id: 'method_001',
        method_name: '合成実験',
        task_no: 1,
        task_name: 'タスク1',
        transitions: [
          {
            transition_id: 't1',
            transition_name: '材料準備',
            status: 'completed',
            progress: 100,
            last_updated: '2026-02-16T09:00:00Z',
            has_data: true,
            data_count: 3,
          },
          {
            transition_id: 't2',
            transition_name: '反応実験',
            status: 'in_progress',
            progress: 50,
            last_updated: '2026-02-16T10:00:00Z',
            has_data: true,
            data_count: 2,
          },
          {
            transition_id: 't3',
            transition_name: '結果測定',
            status: 'not_started',
            progress: 0,
            last_updated: null,
            has_data: false,
            data_count: 0,
          },
        ],
        overall_progress: {
          total_transitions: 3,
          completed: 1,
          in_progress: 1,
          not_started: 1,
          overall_percentage: 50.0,
        },
      };

      expect(progressData.transitions).toHaveLength(3);
      expect(progressData.overall_progress.total_transitions).toBe(3);
    });
  });

  describe('ProgressServiceError型', () => {
    it('TASK_NOT_FOUNDエラーを作成できる', () => {
      const error: ProgressServiceError = {
        code: 'TASK_NOT_FOUND',
        message: 'タスクが見つかりません',
      };

      expect(error.code).toBe('TASK_NOT_FOUND');
    });

    it('METHOD_NOT_FOUNDエラーを作成できる', () => {
      const error: ProgressServiceError = {
        code: 'METHOD_NOT_FOUND',
        message: 'メソッドが見つかりません',
      };

      expect(error.code).toBe('METHOD_NOT_FOUND');
    });

    it('MAIML_DOWNLOAD_FAILEDエラーを作成できる', () => {
      const error: ProgressServiceError = {
        code: 'MAIML_DOWNLOAD_FAILED',
        message: 'MAIMLファイルのダウンロードに失敗しました',
      };

      expect(error.code).toBe('MAIML_DOWNLOAD_FAILED');
    });

    it('MAIML_PARSE_FAILEDエラーを作成できる', () => {
      const error: ProgressServiceError = {
        code: 'MAIML_PARSE_FAILED',
        message: 'MAIMLファイルの解析に失敗しました',
      };

      expect(error.code).toBe('MAIML_PARSE_FAILED');
    });

    it('DATABASE_ERRORを作成できる', () => {
      const error: ProgressServiceError = {
        code: 'DATABASE_ERROR',
        message: 'データベースエラーが発生しました',
      };

      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('PetriNetTransition型', () => {
    it('正しい構造のPetriNetTransitionオブジェクトを作成できる', () => {
      const transition: PetriNetTransition = {
        id: 't1',
        name: '材料準備',
      };

      expect(transition.id).toBe('t1');
      expect(transition.name).toBe('材料準備');
    });
  });

  describe('ParsedMethod型', () => {
    it('正しい構造のParsedMethodオブジェクトを作成できる', () => {
      const method: ParsedMethod = {
        methodId: 'method_001',
        methodName: '合成実験',
        petriNet: {
          transitions: [
            { id: 't1', name: '材料準備' },
            { id: 't2', name: '反応実験' },
            { id: 't3', name: '結果測定' },
          ],
        },
      };

      expect(method.methodId).toBe('method_001');
      expect(method.petriNet.transitions).toHaveLength(3);
    });

    it('空のトランジション配列を持つParsedMethodを作成できる', () => {
      const method: ParsedMethod = {
        methodId: 'method_002',
        methodName: '分析実験',
        petriNet: {
          transitions: [],
        },
      };

      expect(method.petriNet.transitions).toHaveLength(0);
    });
  });

  describe('Result型との統合', () => {
    it('成功時のResult<ProgressData>を作成できる', () => {
      const result: Result<ProgressData, ProgressServiceError> = {
        success: true,
        data: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          project_name: 'サンプルプロジェクト',
          method_id: 'method_001',
          method_name: '合成実験',
          task_no: 1,
          task_name: 'タスク1',
          transitions: [],
          overall_progress: {
            total_transitions: 0,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            overall_percentage: 0.0,
          },
        },
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('失敗時のResult<ProgressData>を作成できる', () => {
      const result: Result<ProgressData, ProgressServiceError> = {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'タスクが見つかりません',
        },
      };

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });
  });

  describe('型制約の検証', () => {
    it('ステータスは3つの値のいずれかでなければならない', () => {
      const validStatuses: Array<TransitionProgress['status']> = [
        'not_started',
        'in_progress',
        'completed',
      ];

      validStatuses.forEach((status) => {
        const transition: TransitionProgress = {
          transition_id: 't1',
          transition_name: 'テスト',
          status,
          progress: 0,
          last_updated: null,
          has_data: false,
          data_count: 0,
        };

        expect(['not_started', 'in_progress', 'completed']).toContain(transition.status);
      });
    });

    it('progressは0-100の範囲の数値でなければならない', () => {
      const validProgressValues = [0, 25, 50, 75, 100];

      validProgressValues.forEach((progress) => {
        const transition: TransitionProgress = {
          transition_id: 't1',
          transition_name: 'テスト',
          status: 'in_progress',
          progress,
          last_updated: '2026-02-16T09:00:00Z',
          has_data: true,
          data_count: 1,
        };

        expect(transition.progress).toBeGreaterThanOrEqual(0);
        expect(transition.progress).toBeLessThanOrEqual(100);
      });
    });

    it('last_updatedはISO 8601形式の文字列またはnullでなければならない', () => {
      const transition1: TransitionProgress = {
        transition_id: 't1',
        transition_name: 'テスト',
        status: 'not_started',
        progress: 0,
        last_updated: null,
        has_data: false,
        data_count: 0,
      };

      const transition2: TransitionProgress = {
        transition_id: 't2',
        transition_name: 'テスト',
        status: 'in_progress',
        progress: 50,
        last_updated: '2026-02-16T09:00:00Z',
        has_data: true,
        data_count: 1,
      };

      expect(transition1.last_updated).toBeNull();
      expect(transition2.last_updated).toBe('2026-02-16T09:00:00Z');
    });
  });
});
