/**
 * ProjectService.confirmInstruction ユニットテスト
 * 
 * @description 指示確認機能のビジネスロジックテスト
 * Task: 4.1 代替テスト - projectService.confirmInstructionのユニットテスト
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベースプールをモック
jest.mock('../../src/database/db');

// loggerをモック
jest.mock('../../src/utils/logger', () => ({
  logError: jest.fn(),
}));

describe('ProjectService - confirmInstruction', () => {
  let projectService: ProjectService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // 各テスト前にモックをリセット
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const organizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
  const instructionId = 'inst-123';
  const userId = 'user-456';
  const role = 'experiment_admin';

  describe('正常系', () => {
    it('should successfully confirm instruction', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockInsertResult = {
        history_id: 'hist-789',
        acknowledged_at: new Date('2026-02-01T02:00:00Z'),
      };

      const mockUser = {
        user_name: 'Test User',
      };

      // 1. 指示の存在確認
      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      
      // 2. 既確認チェック（未確認）
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // 3. 確認履歴の挿入
      mockQuery.mockResolvedValueOnce({ rows: [mockInsertResult] });
      
      // 4. ユーザー名の取得
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.instruction_id).toBe(instructionId);
      expect(result.data?.is_acknowledged).toBe(true);
      expect(result.data?.acknowledged_user_id).toBe(userId);
      expect(result.data?.acknowledged_user_name).toBe('Test User');
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it('should successfully confirm instruction for experiment_worker with assigned task', async () => {
      // Arrange
      const workerRole = 'experiment_worker';
      
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockTaskAssignment = {
        task_id: 'task-001',
      };

      const mockInsertResult = {
        history_id: 'hist-789',
        acknowledged_at: new Date('2026-02-01T02:00:00Z'),
      };

      const mockUser = {
        user_name: 'Worker User',
      };

      // 1. 指示の存在確認
      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      
      // 2. 既確認チェック（未確認）
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // 3. タスク割り当て確認（experiment_worker用）
      mockQuery.mockResolvedValueOnce({ rows: [mockTaskAssignment] });
      
      // 4. 確認履歴の挿入
      mockQuery.mockResolvedValueOnce({ rows: [mockInsertResult] });
      
      // 5. ユーザー名の取得
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        workerRole
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockQuery).toHaveBeenCalledTimes(5);
    });
  });

  describe('エラー系 - 指示が見つからない', () => {
    it('should return error when instruction does not exist', async () => {
      // Arrange
      // 指示の存在確認で空の結果
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toBe('指示が見つかりません');
    });
  });

  describe('エラー系 - 既に確認済み', () => {
    it('should return error when instruction is already acknowledged', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockExistingAcknowledgement = {
        history_id: 'hist-001',
        acknowledged_at: new Date('2026-01-31T10:00:00Z'),
      };

      // 1. 指示の存在確認
      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      
      // 2. 既確認チェック（既に確認済み）
      mockQuery.mockResolvedValueOnce({ rows: [mockExistingAcknowledgement] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('BUSINESS_ALREADY_ACKNOWLEDGED');
      expect(result.error?.message).toBe('この指示は既に確認済みです');
    });
  });

  describe('エラー系 - 権限不足（experiment_worker）', () => {
    it('should return error when experiment_worker tries to confirm unassigned task', async () => {
      // Arrange
      const workerRole = 'experiment_worker';
      
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      // 1. 指示の存在確認
      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      
      // 2. 既確認チェック（未確認）
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // 3. タスク割り当て確認（割り当てなし）
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        workerRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PERMISSION_INSUFFICIENT');
      expect(result.error?.message).toBe('自分に割り当てられていない指示は確認できません');
    });
  });

  describe('エラー系 - データベースエラー', () => {
    it('should return error when database query fails', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(result.error?.message).toBe('データベースエラーが発生しました');
    });
  });

  describe('セキュリティ - organization_idフィルタ', () => {
    it('should apply organization_id filter in all queries', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockInsertResult = {
        history_id: 'hist-789',
        acknowledged_at: new Date(),
      };

      const mockUser = {
        user_name: 'Test User',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInsertResult] });
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      // 各クエリでorganization_idがパラメータに含まれているか確認
      const calls = mockQuery.mock.calls;
      
      // 1. 指示の存在確認
      expect(calls[0][1]).toContain(organizationId);
      
      // 2. 既確認チェック
      expect(calls[1][1]).toContain(organizationId);
      
      // 3. 確認履歴の挿入
      expect(calls[2][1]).toContain(organizationId);
      
      // 4. ユーザー名の取得
      expect(calls[3][1]).toContain(organizationId);
    });
  });

  describe('セキュリティ - Parameterized Query', () => {
    it('should use parameterized queries for SQL injection protection', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ history_id: 'hist', acknowledged_at: new Date() }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ user_name: 'User' }] });

      // Act
      await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      const calls = mockQuery.mock.calls;
      
      calls.forEach((call) => {
        const query = call[0];
        const params = call[1];
        
        // プレースホルダー ($1, $2, ...) が使用されているか
        expect(query).toMatch(/\$\d+/);
        
        // パラメータ配列が存在するか
        expect(Array.isArray(params)).toBe(true);
        expect(params.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ユーザー名取得の堅牢性', () => {
    it('should handle missing user name gracefully', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockInsertResult = {
        history_id: 'hist-789',
        acknowledged_at: new Date('2026-02-01T02:00:00Z'),
      };

      // ユーザー名が空
      const mockUser = {
        user_name: undefined,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInsertResult] });
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.acknowledged_user_name).toBe(''); // 空文字列にフォールバック
    });

    it('should handle user not found gracefully', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockInsertResult = {
        history_id: 'hist-789',
        acknowledged_at: new Date('2026-02-01T02:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInsertResult] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // ユーザーが見つからない

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.acknowledged_user_name).toBe(''); // 空文字列にフォールバック
    });
  });

  describe('タイムスタンプ処理', () => {
    it('should use server-side timestamp (NOW())', async () => {
      // Arrange
      const mockInstruction = {
        instruction_id: instructionId,
        organization_id: organizationId,
      };

      const mockInsertResult = {
        history_id: 'hist-789',
        acknowledged_at: new Date('2026-02-01T02:00:00Z'),
      };

      const mockUser = {
        user_name: 'Test User',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockInstruction] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInsertResult] });
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await projectService.confirmInstruction(
        instructionId,
        userId,
        organizationId,
        role
      );

      // Assert
      // INSERT文でNOW()が使用されているか確認
      const insertCall = mockQuery.mock.calls[2];
      const insertQuery = insertCall[0];
      
      expect(insertQuery).toContain('NOW()');
      
      // レスポンスにタイムスタンプが含まれているか
      expect(result.data?.acknowledged_at).toBeDefined();
      expect(typeof result.data?.acknowledged_at).toBe('string');
      
      // ISO 8601形式か確認
      expect(result.data?.acknowledged_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});