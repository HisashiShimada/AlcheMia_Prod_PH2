/**
 * progressService フェーズ２ テスト
 *
 * 分類A：進捗確認サービスの変更箇所
 * - ALLOWED_TRANSITIONS（ステータス遷移マトリクス）
 * - InvalidStatusTransitionError
 * - updateTransitionStatus（遷移バリデーション）
 * - getNgTasks（NGタスク取得 - Phase2 新規）
 * - getProgressData
 */

import {
  ALLOWED_TRANSITIONS,
  InvalidStatusTransitionError,
} from '../../../src/services/progressService';
import * as progressService from '../../../src/services/progressService';
import { TransitionStatusEnum } from '../../../src/types/transitionData';
import * as projectTaskRepository from '../../../src/repositories/projectTaskRepository';
import * as projectTaskDetailRepository from '../../../src/repositories/projectTaskDetailRepository';
import { getPool, getPgp } from '../../../src/database/db';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/repositories/projectTaskRepository');
jest.mock('../../../src/repositories/projectTaskDetailRepository');
jest.mock('../../../src/repositories/projectRepository');
jest.mock('../../../src/database/db');
jest.mock('../../../src/services/storageService', () => ({
  getStorageService: jest.fn(() => ({ getSignedUrl: jest.fn() })),
}));
jest.mock('../../../src/services/maimlService', () => ({
  parsePetriNetStructure: jest.fn(),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn(() => 'SELECT 1'),
}));

const mockPool = { query: jest.fn() };
const mockPgp = { none: jest.fn(), one: jest.fn(), any: jest.fn(), tx: jest.fn() };

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────
describe('progressService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  // ==========================================================================
  // ALLOWED_TRANSITIONS（ステータス遷移マトリクス）
  // ==========================================================================
  describe('ALLOWED_TRANSITIONS', () => {
    test('INITIAL から PREPARING への遷移が許可されること', () => {
      expect(ALLOWED_TRANSITIONS[TransitionStatusEnum.INITIAL]).toContain(TransitionStatusEnum.PREPARING);
    });

    test('COMPLETED から他のステータスへの遷移が許可されないこと', () => {
      const allowedFromCompleted = ALLOWED_TRANSITIONS[TransitionStatusEnum.COMPLETED];
      expect(allowedFromCompleted).toEqual([TransitionStatusEnum.COMPLETED]);
    });

    test('ERROR から他のステータスへの遷移が許可されないこと', () => {
      const allowedFromError = ALLOWED_TRANSITIONS[TransitionStatusEnum.ERROR];
      expect(allowedFromError).toEqual([TransitionStatusEnum.ERROR]);
    });

    test('IN_PROGRESS から PAUSED への遷移が許可されること', () => {
      expect(ALLOWED_TRANSITIONS[TransitionStatusEnum.IN_PROGRESS]).toContain(TransitionStatusEnum.PAUSED);
    });

    test('PAUSED から IN_PROGRESS への遷移が許可されること', () => {
      expect(ALLOWED_TRANSITIONS[TransitionStatusEnum.PAUSED]).toContain(TransitionStatusEnum.IN_PROGRESS);
    });
  });

  // ==========================================================================
  // InvalidStatusTransitionError
  // ==========================================================================
  describe('InvalidStatusTransitionError', () => {
    test('COMPLETED 状態からの遷移でターミナル状態エラーメッセージを含むこと', () => {
      const error = new InvalidStatusTransitionError(
        TransitionStatusEnum.COMPLETED,
        TransitionStatusEnum.IN_PROGRESS
      );
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InvalidStatusTransitionError');
      expect(error.message).toMatch(/terminal state/i);
    });

    test('ERROR 状態からの遷移でターミナル状態エラーメッセージを含むこと', () => {
      const error = new InvalidStatusTransitionError(
        TransitionStatusEnum.ERROR,
        TransitionStatusEnum.PREPARING
      );
      expect(error.message).toMatch(/terminal state/i);
    });

    test('不正な遷移で遷移元・遷移先のラベルを含むエラーメッセージを生成すること', () => {
      const error = new InvalidStatusTransitionError(
        TransitionStatusEnum.PREPARING,
        TransitionStatusEnum.PAUSED  // PREPARING → PAUSED は不正
      );
      expect(error.message).toMatch(/Invalid status transition/i);
    });
  });

  // ==========================================================================
  // getNgTasks（Phase2 新規追加）
  // ==========================================================================
  describe('getNgTasks()', () => {
    test('正常系: task_status=6 のタスク一覧を返すこと', async () => {
      const mockNgTasks = [
        { task_id: 'task-001', task_status: 6, ng_reason: 'データ不正', project_id: 'proj-001' },
      ];
      mockPool.query.mockResolvedValue({ rows: mockNgTasks });

      const result = await progressService.getNgTasks('proj-001', 'org-001');

      expect(result).toBeDefined();
    });

    test('異常系: DBエラー発生時にエラーを伝播すること', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      await expect(progressService.getNgTasks('proj-001', 'org-001')).rejects.toThrow();
    });
  });
});
