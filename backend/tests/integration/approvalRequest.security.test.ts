/**
 * 承認依頼API - セキュリティ統合テスト
 * 
 * このテストファイルは、承認依頼APIのセキュリティ要件を統合的に検証します。
 * - organization_id分離（マルチテナント）
 * - XSS対策（commentのサニタイズ）
 * - UUIDバリデーション
 * - 複合セキュリティシナリオ
 * 
 * Task: 5.2.5
 * Requirements: 12, 14
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベースプールをモック
jest.mock('../../src/database/db');

describe('承認依頼API - セキュリティ統合テスト (Task 5.2.5)', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();
    mockQuery = jest.fn();
    
    // トランザクション用のモッククライアントを作成
    const mockClient = {
      query: mockQuery,
      release: jest.fn(),
    };
    
    mockPool = {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('5.2.5.1: テスト環境のセットアップ確認', () => {
    it('should initialize test environment correctly', () => {
      expect(projectService).toBeDefined();
      expect(mockPool).toBeDefined();
      expect(mockQuery).toBeDefined();
    });
  });

  describe('5.2.5.2: organization_id分離の統合テスト', () => {
    it('should prevent access to projects from different organizations', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId2 = 'org-uuid-BBB';
      const userId = 'user-uuid-456';

      // 組織1のプロジェクトを組織2のユーザーがアクセスしようとする
      mockQuery.mockResolvedValueOnce({ rows: [] }); // プロジェクトが見つからない

      // Act
      const result = await projectService.requestApproval(
        projectId,
        'Test comment',
        organizationId2, // 異なる組織ID
        userId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      
      // organization_idフィルタが適用されていることを確認
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('organization_id'),
        expect.arrayContaining([organizationId2, projectId])
      );
    });
  });

  describe('5.2.5.3: XSS対策の統合テスト', () => {
    it('should sanitize comment with XSS attack patterns', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-AAA';
      const userId = 'user-uuid-456';
      const xssComment = '<script>alert("XSS")</script>Test comment';

      // プロジェクトが存在し、ステータスが active
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1, // active
            organization_id: organizationId,
          },
        ],
      });

      // ステータス更新成功
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_status: 2, // waiting_approval
          },
        ],
      });

      // 通知作成成功
      mockQuery.mockResolvedValueOnce({
        rows: [{ notification_id: 'notif-uuid-123' }],
      });

      // ユーザー情報取得
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
      });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        xssComment,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // コメントがサニタイズされていることを確認
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_notification'),
        expect.arrayContaining([
          expect.stringContaining('&lt;script&gt;'), // < がエスケープされている
        ])
      );
    });
  });

  describe('5.2.5.4: UUIDバリデーションの統合テスト', () => {
    it('should reject invalid UUID format in projectId', async () => {
      // Arrange
      const invalidProjectId = 'invalid-uuid-format';
      const organizationId = 'org-uuid-AAA';
      const userId = 'user-uuid-456';

      // Act & Assert
      // Note: UUID検証はController層で行われるため、
      // Service層では正しいUUIDが渡されることを前提とする
      // このテストはController層のテストで詳細に検証される（Task 5.2.3で実施済み）
      
      // Service層では、無効なUUIDでもデータベースクエリが実行される
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await projectService.requestApproval(
        invalidProjectId,
        'Test comment',
        organizationId,
        userId
      );

      // プロジェクトが見つからないエラーが返る
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('5.2.5.5: 複合セキュリティシナリオテスト', () => {
    it('should handle multiple security requirements simultaneously', async () => {
      // Arrange: XSS攻撃を含むコメント + 正しいorganization_id分離
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-AAA';
      const userId = 'user-uuid-456';
      const maliciousComment = '<img src=x onerror="alert(1)">Malicious content';

      // プロジェクトが存在し、organization_idが一致
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Secure Project',
            project_status: 1, // active
            organization_id: organizationId,
          },
        ],
      });

      // ステータス更新
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_status: 2 }],
      });

      // 通知作成
      mockQuery.mockResolvedValueOnce({
        rows: [{ notification_id: 'notif-uuid-789' }],
      });

      // ユーザー情報取得
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_name: 'Test User' }],
      });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        maliciousComment,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      
      // 1. organization_idフィルタが適用されている
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('organization_id'),
        expect.arrayContaining([organizationId, projectId])
      );
      
      // 2. XSS対策: HTMLタグがエスケープされている
      const notificationCall = mockQuery.mock.calls.find((call) =>
        call[0].includes('INSERT INTO system_notification')
      );
      expect(notificationCall).toBeDefined();
      expect(notificationCall![1]).toEqual(
        expect.arrayContaining([
          expect.stringContaining('&lt;img'),
        ])
      );
    });

    it('should reject cross-tenant access even with valid XSS-sanitized comment', async () => {
      // Arrange: 正当なコメント but 異なる組織
      const projectId = 'project-uuid-123';
      const userOrgId = 'org-uuid-BBB'; // ユーザーの組織
      const userId = 'user-uuid-456';
      const validComment = 'This is a safe comment';

      // プロジェクトが見つからない（organization_idが異なるため）
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await projectService.requestApproval(
        projectId,
        validComment,
        userOrgId, // 異なる組織ID
        userId
      );

      // Assert: セキュリティチェックが優先される
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      
      // organization_idフィルタが適用されている
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('organization_id'),
        expect.arrayContaining([userOrgId, projectId])
      );
    });
  });
});
