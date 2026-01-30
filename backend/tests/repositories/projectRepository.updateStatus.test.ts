/**
 * ProjectRepository.updateStatus のユニットテスト
 * 
 * Task 4.1.2: updated_user_id パラメータのテストケース作成
 * Task 8.2: カラム名変更対応 (updated_by → updated_user_id)
 */

import { ProjectRepository } from '../../src/repositories/projectRepository';
import { getPool } from '../../src/database/db';

// モック設定
jest.mock('../../src/database/db');

describe('ProjectRepository.updateStatus', () => {
  let projectRepository: ProjectRepository;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    projectRepository = new ProjectRepository();

    // モッククエリ関数
    mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });

    // モックプール
    mockPool = {
      query: mockQuery,
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updated_user_id パラメータのテスト（Task 4.1, Task 8.2）', () => {
    it('should update project_status, updated_at, and updated_user_id', async () => {
      // Arrange
      const projectId = 'project-123';
      const newStatus = 2; // waiting_approval
      const organizationId = 'org-456';
      const userId = 'user-789';

      // Act
      await projectRepository.updateStatus(
        projectId,
        newStatus,
        organizationId,
        userId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(1);
      
      const [query, params] = mockQuery.mock.calls[0];
      
      // SQL クエリの検証
      expect(query).toContain('UPDATE project');
      expect(query).toContain('project_status = $1');
      expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
      expect(query).toContain('updated_user_id = $2');  // updated_user_id が含まれること（Task 8.2）
      expect(query).toContain('WHERE organization_id = $3');
      expect(query).toContain('AND project_id = $4');

      // パラメータの検証
      expect(params).toEqual([newStatus, userId, organizationId, projectId]);
    });

    it('should use organization_id filter for multi-tenant isolation', async () => {
      // Arrange
      const projectId = 'project-123';
      const newStatus = 2;
      const organizationId = 'org-456';
      const userId = 'user-789';

      // Act
      await projectRepository.updateStatus(
        projectId,
        newStatus,
        organizationId,
        userId
      );

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // organization_id フィルタが含まれること
      expect(query).toContain('WHERE organization_id = $3');
      expect(params[2]).toBe(organizationId);
    });

    it('should accept transaction client as optional parameter', async () => {
      // Arrange
      const projectId = 'project-123';
      const newStatus = 2;
      const organizationId = 'org-456';
      const userId = 'user-789';
      
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
      };

      // Act
      await projectRepository.updateStatus(
        projectId,
        newStatus,
        organizationId,
        userId,
        mockClient as any
      );

      // Assert
      // トランザクションクライアントが使用されること
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();  // プールは使用されない
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      // Arrange
      const projectId = 'project-123';
      const newStatus = 2;
      const organizationId = 'org-456';
      const userId = 'user-789';

      // Act
      await projectRepository.updateStatus(
        projectId,
        newStatus,
        organizationId,
        userId
      );

      // Assert
      const [query, params] = mockQuery.mock.calls[0];
      
      // プレースホルダー（$1, $2, $3, $4）が使用されていること
      expect(query).toMatch(/\$1/);
      expect(query).toMatch(/\$2/);
      expect(query).toMatch(/\$3/);
      expect(query).toMatch(/\$4/);
      
      // パラメータ配列が渡されていること
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBe(4);
    });
  });
});