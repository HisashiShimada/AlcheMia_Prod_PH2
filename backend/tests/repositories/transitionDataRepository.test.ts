/**
 * TransitionDataRepository Unit Tests
 * 
 * transition_dataリポジトリのユニットテスト
 */

import {
  TransitionDataRepository,
  TransitionNotFoundError,
  DatabaseError,
  TransitionDataUpdate
} from '../../src/repositories/transitionDataRepository';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('TransitionDataRepository', () => {
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

  describe('findByTransitionId', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';
    const methodId = 'method-789';
    const taskNo = 1;
    const transitionId = 'trans-001';

    test('正常系: トランジションが見つかった場合、データを返す', async () => {
      // Arrange
      const expectedRow = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: methodId,
        task_no: taskNo,
        transition_id: transitionId,
        status: 'initial',
        progress_rate: 0,
        comment: 'Test comment',
        updated_by: 'user-123',
        updated_at: new Date('2026-02-03T10:00:00Z'),
        created_at: new Date('2026-02-03T09:00:00Z')
      };

      mockQuery.mockResolvedValue({
        rows: [expectedRow]
      });

      // Act
      const result = await repository.findByTransitionId(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).toEqual(expectedRow);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      
      // Parameterized Queryの使用を確認
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('SELECT');
      expect(query).toContain('FROM transition_data');
      expect(query).toContain('WHERE organization_id = $1');
      expect(params).toEqual([organizationId, projectId, methodId, taskNo, transitionId]);
    });

    test('正常系: トランジションが存在しない場合、nullを返す', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: []
      });

      // Act
      const result = await repository.findByTransitionId(
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

    test('異常系: データベースエラーが発生した場合、DatabaseErrorをスローする', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.findByTransitionId(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId
        )
      ).rejects.toThrow(DatabaseError);

      await expect(
        repository.findByTransitionId(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId
        )
      ).rejects.toThrow('Database error occurred while finding transition');
    });

    test('セキュリティ: organization_idフィルタが必須であることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.findByTransitionId(
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

  describe('getLatestRecordByTransition', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';
    const methodId = 'method-789';
    const taskNo = 1;
    const transitionId = 'trans-001';

    test('正常系: 最新のトランジションレコードを取得できる', async () => {
      // Arrange
      const expectedRow = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: methodId,
        task_no: taskNo,
        transition_id: transitionId,
        status: 'running',
        progress_rate: 75,
        comment: 'Latest record',
        updated_by: 'user-123',
        updated_at: new Date('2026-02-03T12:00:00Z'),
        created_at: new Date('2026-02-03T09:00:00Z')
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
      
      // ORDER BY updated_at DESC LIMIT 1 の確認
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('ORDER BY updated_at DESC');
      expect(query).toContain('LIMIT 1');
      expect(params).toEqual([organizationId, projectId, methodId, taskNo, transitionId]);
    });

    test('正常系: レコードが存在しない場合、nullを返す', async () => {
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
    });

    test('異常系: データベースエラーが発生した場合、DatabaseErrorをスローする', async () => {
      // Arrange
      const dbError = new Error('Query timeout');
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
    });
  });

  describe('countRecordsByTransition', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';
    const methodId = 'method-789';
    const taskNo = 1;
    const transitionId = 'trans-001';

    test('正常系: トランジションのレコード数を取得できる', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      // Act
      const result = await repository.countRecordsByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      
      // COUNT文の確認
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('SELECT COUNT(*)');
      expect(query).toContain('FROM transition_data');
      expect(query).toContain('WHERE organization_id = $1');
      expect(params).toEqual([organizationId, projectId, methodId, taskNo, transitionId]);
    });

    test('正常系: レコードが0件の場合、0を返す', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: [{ count: '0' }]
      });

      // Act
      const result = await repository.countRecordsByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(result).toBe(0);
    });

    test('異常系: データベースエラーが発生した場合、DatabaseErrorをスローする', async () => {
      // Arrange
      const dbError = new Error('Connection lost');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.countRecordsByTransition(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId
        )
      ).rejects.toThrow(DatabaseError);

      await expect(
        repository.countRecordsByTransition(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId
        )
      ).rejects.toThrow('Database error occurred while counting transition records');
    });

    test('セキュリティ: organization_idフィルタが必須であることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: [{ count: '3' }]
      });

      // Act
      await repository.countRecordsByTransition(
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

    test('セキュリティ: Parameterized Queryを使用していることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: [{ count: '2' }]
      });

      // Act
      await repository.countRecordsByTransition(
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
      
      // 値が直接SQL文に埋め込まれていないことを確認（SQLインジェクション対策）
      expect(query).not.toContain(organizationId);
      expect(query).not.toContain(projectId);
      expect(query).not.toContain(transitionId);
    });

    test('データ整合性: 数値型で結果を返すことを確認', async () => {
      // Arrange - PostgreSQLはCOUNTの結果を文字列で返す
      mockQuery.mockResolvedValue({
        rows: [{ count: '42' }]
      });

      // Act
      const result = await repository.countRecordsByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      );

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });
  });
});

  describe('updateStatus', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';
    const methodId = 'method-789';
    const taskNo = 1;
    const transitionId = 'trans-001';

      const updateData: TransitionDataUpdate = {
        status: 'running',
        progress_rate: 50,
        updated_by: 'test-user-id'
      };

    test('正常系: ステータス更新が成功した場合、更新後のデータを返す', async () => {
      // Arrange
      const expectedRow = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: methodId,
        task_no: taskNo,
        transition_id: transitionId,
        status: 'running',
        progress_rate: 50,
        comment: 'Work in progress',
        updated_by: 'user-123',
        updated_at: new Date('2026-02-03T11:00:00Z'),
        created_at: new Date('2026-02-03T09:00:00Z')
      };

      mockQuery.mockResolvedValue({
        rows: [expectedRow]
      });

      // Act
      const result = await repository.updateStatus(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
        updateData
      );

      // Assert
      expect(result).toEqual(expectedRow);
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // UPDATE文とRETURNINGの確認
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('UPDATE transition_data');
      expect(query).toContain('SET');
      expect(query).toContain('status = $1');
      expect(query).toContain('progress_rate = $2');
      expect(query).toContain('updated_by = $3');
      expect(query).toContain('WHERE organization_id = $4');
      expect(query).toContain('RETURNING');
      
      // Parameterized Queryのパラメータ順序確認
      expect(params).toEqual([
        updateData.status,
        updateData.progress_rate,
        updateData.updated_by,
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      ]);
    });

    test('異常系: トランジションが存在しない場合、TransitionNotFoundErrorをスローする', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: []
      });

      // Act & Assert
      await expect(
        repository.updateStatus(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          updateData
        )
      ).rejects.toThrow(TransitionNotFoundError);

      await expect(
        repository.updateStatus(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          updateData
        )
      ).rejects.toThrow(/Transition not found/);
    });

    test('異常系: データベースエラーが発生した場合、DatabaseErrorをスローする', async () => {
      // Arrange
      const dbError = new Error('Constraint violation');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.updateStatus(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          updateData
        )
      ).rejects.toThrow(DatabaseError);

      await expect(
        repository.updateStatus(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          updateData
        )
      ).rejects.toThrow('Database error occurred while updating transition status');
    });

    test('セキュリティ: organization_idフィルタが必須であることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: [{
          organization_id: organizationId,
          project_id: projectId,
          method_id: methodId,
          task_no: taskNo,
          transition_id: transitionId,
          status: 'running',
          progress_rate: 50,
          comment: '',
          updated_by: 'user-123',
          updated_at: new Date(),
          created_at: new Date()
        }]
      });

      // Act
      await repository.updateStatus(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
        updateData
      );

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('WHERE organization_id = $4');
      expect(params[3]).toBe(organizationId);
    });

    test('セキュリティ: Parameterized Queryを使用していることを確認', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: [{
          organization_id: organizationId,
          project_id: projectId,
          method_id: methodId,
          task_no: taskNo,
          transition_id: transitionId,
          status: 'running',
          progress_rate: 50,
          comment: '',
          updated_by: 'user-123',
          updated_at: new Date(),
          created_at: new Date()
        }]
      });

      // Act
      await repository.updateStatus(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
        updateData
      );

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // プレースホルダー($1, $2, etc.)が使用されていることを確認
      expect(query).toMatch(/\$\d+/);
      
      // パラメータ配列が渡されていることを確認
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBeGreaterThan(0);
      
      // 値が直接SQL文に埋め込まれていないことを確認（SQLインジェクション対策）
      expect(query).not.toContain(updateData.status);
      expect(query).not.toContain(organizationId);
    });
  });
});