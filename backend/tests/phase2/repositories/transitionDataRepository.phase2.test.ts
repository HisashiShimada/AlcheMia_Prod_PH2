/**
 * TransitionDataRepository フェーズ２ テスト
 *
 * 分類A：既存機能への影響箇所 回帰テスト
 * 対象変更: フェーズ２で insert() に work_order・prerequisite_transition_ids を追加
 *
 * @description
 * - insert() に workOrder（実行順序）・prerequisiteTransitionIds（前提トランジションID配列）が追加された
 * - 既存メソッド（findByTransitionId・updateStatus）への影響がないことを確認する
 */

import {
  TransitionDataRepository,
  TransitionDataUpdate,
  DatabaseError,
  TransitionNotFoundError,
} from '../../../src/repositories/transitionDataRepository';
import { getPgp } from '../../../src/database/db';

// データベース接続のモック
jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('TransitionDataRepository - Phase2 回帰テスト', () => {
  let repository: TransitionDataRepository;
  let mockPgp: { oneOrNone: jest.Mock; one: jest.Mock; any: jest.Mock };
  let mockClient: { query: jest.Mock };

  beforeEach(() => {
    mockPgp = {
      oneOrNone: jest.fn(),
      one: jest.fn(),
      any: jest.fn(),
    };
    mockClient = { query: jest.fn() };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
    repository = new TransitionDataRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // insert() - フェーズ２追加パラメータのテスト
  // ─────────────────────────────────────────────

  describe('insert()', () => {
    const baseArgs = {
      organizationId: 'org-001',
      projectId: 'proj-001',
      methodId: 'method-001',
      taskNo: 1,
      transitionId: 'trans-001',
      userId: 'user-001',
    };

    test('workOrder・prerequisiteTransitionIds を含む正しいパラメータで client.query が呼ばれること', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.insert(
        baseArgs.organizationId,
        baseArgs.projectId,
        baseArgs.methodId,
        baseArgs.taskNo,
        baseArgs.transitionId,
        baseArgs.userId,
        mockClient as any,
        3,                         // workOrder
        ['trans-000', 'trans-pre'] // prerequisiteTransitionIds
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const calledParams = mockClient.query.mock.calls[0][1];

      // work_order の値を確認（インデックス7）
      expect(calledParams[7]).toBe(3);
      // prerequisite_transition_ids の値を確認（インデックス8）
      expect(calledParams[8]).toEqual(['trans-000', 'trans-pre']);
    });

    test('デフォルト引数（workOrder=0, prerequisiteTransitionIds=[]）でも動作すること', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.insert(
        baseArgs.organizationId,
        baseArgs.projectId,
        baseArgs.methodId,
        baseArgs.taskNo,
        baseArgs.transitionId,
        baseArgs.userId,
        mockClient as any
        // workOrder・prerequisiteTransitionIds は省略（デフォルト値を使用）
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const calledParams = mockClient.query.mock.calls[0][1];

      // work_order のデフォルト値
      expect(calledParams[7]).toBe(0);
      // prerequisite_transition_ids のデフォルト値
      expect(calledParams[8]).toEqual([]);
    });

    test('INSERT パラメータの全体構成が正しいこと（11項目）', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.insert(
        baseArgs.organizationId,
        baseArgs.projectId,
        baseArgs.methodId,
        baseArgs.taskNo,
        baseArgs.transitionId,
        baseArgs.userId,
        mockClient as any,
        2,
        ['trans-req-1']
      );

      const calledParams = mockClient.query.mock.calls[0][1];
      expect(calledParams).toHaveLength(11);
      expect(calledParams[0]).toBe('org-001');       // organization_id
      expect(calledParams[1]).toBe('proj-001');      // project_id
      expect(calledParams[2]).toBe('method-001');    // method_id
      expect(calledParams[3]).toBe(1);               // task_no
      expect(calledParams[4]).toBe('trans-001');     // transition_id
      expect(calledParams[5]).toBe(0);               // status: 初期値0
      expect(calledParams[6]).toBe(0);               // progress_rate: 初期値0
      expect(calledParams[7]).toBe(2);               // work_order
      expect(calledParams[8]).toEqual(['trans-req-1']); // prerequisite_transition_ids
      expect(calledParams[9]).toBe('user-001');      // create_user_id
      expect(calledParams[10]).toBe('user-001');     // update_user_id
    });

    test('DB エラー時に DatabaseError をスローすること', async () => {
      mockClient.query.mockRejectedValue(new Error('DB connection failed'));

      await expect(
        repository.insert(
          baseArgs.organizationId,
          baseArgs.projectId,
          baseArgs.methodId,
          baseArgs.taskNo,
          baseArgs.transitionId,
          baseArgs.userId,
          mockClient as any
        )
      ).rejects.toThrow(DatabaseError);
    });
  });

  // ─────────────────────────────────────────────
  // findByTransitionId() - 既存メソッドへの影響確認
  // ─────────────────────────────────────────────

  describe('findByTransitionId()', () => {
    test('正常系: トランジションが見つかった場合、データを返すこと', async () => {
      const expectedRow = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'trans-001',
        status: 0,
        progress_rate: 0,
        update_user_id: 'user-001',
        update_at: new Date(),
        create_at: new Date(),
      };
      mockPgp.oneOrNone.mockResolvedValue(expectedRow);

      const result = await repository.findByTransitionId(
        'org-001', 'proj-001', 'method-001', 1, 'trans-001'
      );

      expect(result).toEqual(expectedRow);
      expect(mockPgp.oneOrNone).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', 'proj-001', 'method-001', 1, 'trans-001']
      );
    });

    test('トランジションが存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await repository.findByTransitionId(
        'org-001', 'proj-001', 'method-001', 1, 'non-existent'
      );

      expect(result).toBeNull();
    });

    test('DB エラー時に DatabaseError をスローすること', async () => {
      mockPgp.oneOrNone.mockRejectedValue(new Error('DB error'));

      await expect(
        repository.findByTransitionId('org-001', 'proj-001', 'method-001', 1, 'trans-001')
      ).rejects.toThrow(DatabaseError);
    });
  });

  // ─────────────────────────────────────────────
  // updateStatus() - 既存メソッドへの影響確認
  // ─────────────────────────────────────────────

  describe('updateStatus()', () => {
    const updateData: TransitionDataUpdate = {
      status: 1,
      progress_rate: 50,
      updated_by: 'user-001',
    };

    test('正常系: ステータスを更新し、更新後のデータを返すこと', async () => {
      const expectedRow = {
        organization_id: 'org-001',
        status: 1,
        progress_rate: 50,
      };
      mockPgp.oneOrNone.mockResolvedValue(expectedRow);

      const result = await repository.updateStatus(
        'org-001', 'proj-001', 'method-001', 1, 'trans-001', updateData
      );

      expect(result).toEqual(expectedRow);
    });

    test('トランジションが見つからない場合、TransitionNotFoundError をスローすること', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      await expect(
        repository.updateStatus('org-001', 'proj-001', 'method-001', 1, 'non-existent', updateData)
      ).rejects.toThrow(TransitionNotFoundError);
    });

    test('DB エラー時に DatabaseError をスローすること', async () => {
      mockPgp.oneOrNone.mockRejectedValue(new Error('DB error'));

      await expect(
        repository.updateStatus('org-001', 'proj-001', 'method-001', 1, 'trans-001', updateData)
      ).rejects.toThrow(DatabaseError);
    });
  });
});
