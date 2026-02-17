/**
 * TransitionDataRepository.getLatestRecordByTransition Unit Tests
 * 
 * getLatestRecordByTransitionメソッドのユニットテスト（タスク3.1）
 */

import {
  TransitionDataRepository,
  DatabaseError
} from '../../src/repositories/transitionDataRepository';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('TransitionDataRepository.getLatestRecordByTransition', () => {
  let repository: TransitionDataRepository;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // モックのセットアップ
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);

    repository = new TransitionDataRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const organizationId = 'org-123';
  const projectId = 'proj-456';
  const methodId = 'method-789';
  const taskNo = 1;
  const transitionId = 'trans-001';

  describe('正常系', () => {
    test('最新の実験記録が見つかった場合、データを返す', async () => {
      // Arrange
      const expectedRow = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: methodId,
        task_no: taskNo,
        transition_id: transitionId,
        status: 'running',
        progress_rate: 75,
        comment: 'Work in progress',
        updated_by: 'user-123',
        updated_at: new Date('2026-02-16T09:00:00Z'),
        created_at: new Date('2026-02-16T08:00:00Z')
      };

      mockQuery.mockResolvedValue({
        rows: [expectedRow]
      });

      // Act
      const result = await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).toEqual(expectedRow);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      
      // クエリ構造の確認
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('SELECT');
      expect(query).toContain('FROM transition_data');
      expect(query).toContain('WHERE organization_id = $1');
      expect(query).toContain('ORDER BY updated_at DESC');
      expect(query).toContain('LIMIT 1');
      
      // Parameterized Queryのパラメータ確認
      expect(params).toEqual([
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      ]);
    });

    test('実験記録が存在しない場合、nullを返す', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: []
      });

      // Act
      const result = await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('複数のレコードが存在する場合、最新のもの（updated_at DESC）のみ返す', async () => {
      // Arrange
      const latestRow = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: methodId,
        task_no: taskNo,
        transition_id: transitionId,
        status: 'completed',
        progress_rate: 100,
        comment: 'Completed',
        updated_by: 'user-123',
        updated_at: new Date('2026-02-16T10:00:00Z'), // 最新
        created_at: new Date('2026-02-16T08:00:00Z')
      };

      // ORDER BY updated_at DESC LIMIT 1により、最新のレコードのみが返される
      mockQuery.mockResolvedValue({
        rows: [latestRow]
      });

      // Act
      const result = await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).toEqual(latestRow);
      expect(result?.updated_at).toEqual(new Date('2026-02-16T10:00:00Z'));
      
      // LIMIT 1が使用されていることを確認
      const [query] = mockQuery.mock.calls[0];
      expect(query).toContain('LIMIT 1');
    });
  });

  describe('異常系', () => {
    test('データベースエラーが発生した場合、DatabaseErrorをスローする', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.getLatestRecordByTransition(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId
        )
      ).rejects.toThrow(DatabaseError);

      await expect(
        repository.getLatestRecordByTransition(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId
        )
      ).rejects.toThrow('Database error occurred while getting latest transition record');
    });
  });

  describe('セキュリティ（マルチテナント分離）', () => {
    test('organization_idフィルタが必須であることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('WHERE organization_id = $1');
      expect(params[0]).toBe(organizationId);
    });

    test('Parameterized Queryを使用していることを確認（SQLインジェクション対策）', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // プレースホルダー($1, $2, etc.)が使用されていることを確認
      expect(query).toMatch(/\$\d+/);
      
      // パラメータ配列が渡されていることを確認
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBe(5);
      
      // 値が直接SQL文に埋め込まれていないことを確認
      expect(query).not.toContain(organizationId);
      expect(query).not.toContain(projectId);
      expect(query).not.toContain(transitionId);
    });
  });

  describe('データ整合性', () => {
    test('返却されるデータに必須フィールドが含まれることを確認', async () => {
      // Arrange
      const expectedRow = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: methodId,
        task_no: taskNo,
        transition_id: transitionId,
        status: 'completed',
        progress_rate: 100,
        comment: 'Done',
        updated_by: 'user-123',
        updated_at: new Date('2026-02-16T09:00:00Z'),
        created_at: new Date('2026-02-16T08:00:00Z')
      };

      mockQuery.mockResolvedValue({
        rows: [expectedRow]
      });

      // Act
      const result = await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress_rate');
      expect(result).toHaveProperty('updated_at');
      expect(result).toHaveProperty('created_at');
    });

    test('SELECT句に必要なカラムが含まれていることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      const [query] = mockQuery.mock.calls[0];
      
      // 必須カラムがSELECT句に含まれていることを確認
      expect(query).toContain('status');
      expect(query).toContain('progress_rate');
      expect(query).toContain('updated_at');
      expect(query).toContain('created_at');
      expect(query).toContain('updated_by');
    });
  });
});
