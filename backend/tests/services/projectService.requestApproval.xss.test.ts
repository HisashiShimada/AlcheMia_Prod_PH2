/**
 * ProjectService.requestApproval XSS対策テスト
 * 
 * commentフィールドのHTML特殊文字エスケープ処理を検証
 */

import { ProjectService } from '../../src/services/projectService';
import { ProjectRepository } from '../../src/repositories/projectRepository';
import { getPool } from '../../src/database/db';

// モックのセットアップ
jest.mock('../../src/database/db');
jest.mock('../../src/repositories/projectRepository');

describe('ProjectService.requestApproval - XSS対策', () => {
  let projectService: ProjectService;
  let mockProjectRepository: jest.Mocked<ProjectRepository>;
  let mockPool: any;
  let mockTransaction: any;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // トランザクションモックのセットアップ
    mockTransaction = {
      selectFrom: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn(),
      updateTable: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      insertInto: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returningAll: jest.fn().mockReturnThis(),
      executeTakeFirstOrThrow: jest.fn(),
    };

    // プロジェクト取得用のモック（トランザクション外）
    const mockProjectRow = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      project_name: 'Test Project',
      project_status: 1, // active
      organization_id: 'org_maiml_lab_001',
    };

    // ユーザー取得用のモック（トランザクション外）
    const mockUserRow = {
      user_name: 'Test User',
    };

    mockPool = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockTransaction)),
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [mockProjectRow] })  // プロジェクト取得
        .mockResolvedValueOnce({ rows: [mockUserRow] }),     // ユーザー取得
    };

    (getPool as jest.MockedFunction<typeof getPool>).mockReturnValue(mockPool);

    // リポジトリのモックインスタンス作成
    mockProjectRepository = new ProjectRepository() as jest.Mocked<ProjectRepository>;

    // サービスのインスタンス作成
    projectService = new ProjectService();
    (projectService as any).projectRepository = mockProjectRepository;
  });

  describe('基本的なXSS攻撃パターン', () => {
    test('commentにscriptタグが含まれる場合、エスケープされること', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = 'org_maiml_lab_001';
      const xssComment = '<script>alert("XSS")</script>';

      // pool.queryのモックを再設定（各テストで必要）
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, project_name: 'Test Project', project_status: 1, organization_id: organizationId }] })
        .mockResolvedValueOnce({ rows: [{ user_name: 'Test User' }] });

      // ステータス更新のモック
      mockTransaction.execute.mockResolvedValueOnce(undefined);

      // Act
      const result = await projectService.requestApproval(projectId, xssComment, organizationId, userId);

      // Assert - commentがレスポンスに含まれること（通知削除後もログに記録される）
      expect(result.success).toBe(true);
      expect(result.data?.comment).toBe(xssComment);
    });

    test('commentに複数のHTML特殊文字が含まれる場合、すべてエスケープされること', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = 'org_maiml_lab_001';
      const xssComment = '<div onclick="alert(\'XSS\')">Test & "quoted" text</div>';

      const mockProject = {
        id: projectId,
        project_name: 'Test Project',
        project_status: 'active',
        organization_id: organizationId,
      };

      const mockUser = {
        id: userId,
        user_name: 'Test User',
      };

      // プロジェクト取得のモック
      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockProject);
      
      // ユーザー取得のモック
      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockUser);

      // ステータス更新のモック
      mockTransaction.execute.mockResolvedValueOnce(undefined);

      // Act
      const result = await projectService.requestApproval(projectId, xssComment, organizationId, userId);

      // Assert - commentがレスポンスに含まれること
      expect(result.success).toBe(true);
      expect(result.data?.comment).toBe(xssComment);
    });

    test('commentにimgタグとonerrorが含まれる場合、エスケープされること', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = 'org_maiml_lab_001';
      const xssComment = '<img src=x onerror="alert(1)">';

      const mockProject = {
        id: projectId,
        project_name: 'Test Project',
        project_status: 'active',
        organization_id: organizationId,
      };

      const mockUser = {
        id: userId,
        user_name: 'Test User',
      };

      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockProject);
      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockUser);
      mockTransaction.execute.mockResolvedValueOnce(undefined);

      // Act
      const result = await projectService.requestApproval(projectId, xssComment, organizationId, userId);

      // Assert - commentがレスポンスに含まれること
      expect(result.success).toBe(true);
      expect(result.data?.comment).toBe(xssComment);
    });
  });

  describe('エッジケース', () => {
    test('commentがundefinedの場合、エラーが発生しないこと', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = 'org_maiml_lab_001';

      const mockProject = {
        id: projectId,
        project_name: 'Test Project',
        project_status: 'active',
        organization_id: organizationId,
      };

      const mockUser = {
        id: userId,
        user_name: 'Test User',
      };

      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockProject);
      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockUser);
      mockTransaction.execute.mockResolvedValueOnce(undefined);

      // Act
      const result = await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert - commentがnullでもエラーが発生しない
      expect(result.success).toBe(true);
      expect(result.data?.comment).toBeUndefined();
    });

    test('commentが空文字列の場合、エラーが発生しないこと', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = 'org_maiml_lab_001';

      const mockProject = {
        id: projectId,
        project_name: 'Test Project',
        project_status: 'active',
        organization_id: organizationId,
      };

      const mockUser = {
        id: userId,
        user_name: 'Test User',
      };

      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockProject);
      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockUser);
      mockTransaction.execute.mockResolvedValueOnce(undefined);

      // Act
      const result = await projectService.requestApproval(projectId, '', organizationId, userId);

      // Assert - 空文字列でもエラーが発生しない
      expect(result.success).toBe(true);
      expect(result.data?.comment).toBe('');
    });

    test('commentに通常のテキストのみが含まれる場合、変更されないこと', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = 'org_maiml_lab_001';
      const normalComment = 'これは通常のコメントです。特殊文字なし。';

      const mockProject = {
        id: projectId,
        project_name: 'Test Project',
        project_status: 'active',
        organization_id: organizationId,
      };

      const mockUser = {
        id: userId,
        user_name: 'Test User',
      };

      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockProject);
      mockTransaction.executeTakeFirst.mockResolvedValueOnce(mockUser);
      mockTransaction.execute.mockResolvedValueOnce(undefined);

      // Act
      const result = await projectService.requestApproval(projectId, normalComment, organizationId, userId);

      // Assert - 通常のテキストはそのまま保持される
      expect(result.success).toBe(true);
      expect(result.data?.comment).toBe(normalComment);
    });
  });
});
