/**
 * ProjectService.requestApproval - Task 3.4.1 のテスト
 * ユーザー名取得機能
 * 
 * Requirements: 9, 11
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// モック設定
jest.mock('../../src/database/db');

describe('ProjectService.requestApproval - Task 3.4.1: ユーザー名取得', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let mockRelease: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();

    // モッククエリ関数
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockConnect = jest.fn();

    // モッククライアント（トランザクション用）
    mockClient = {
      query: mockQuery,
      release: mockRelease,
    };

    // モックプール
    mockPool = {
      query: jest.fn(), // プロジェクト取得用（トランザクション外）
      connect: mockConnect,
    };

    mockConnect.mockResolvedValue(mockClient);
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系: ユーザー名を取得する', () => {
    it('should retrieve user name from organization_user table', async () => {
      const projectId = 'test-project-id';
      const comment = 'テストコメント';
      const organizationId = 'test-org-id';
      const userId = 'test-user-id';
      const userName = 'テストユーザー';

      // プロジェクト存在確認のモック（トランザクション外）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'テストプロジェクト',
            project_status: 1, // active
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のモック設定
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE project
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT notification
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        // ユーザー名取得クエリ（トランザクション後）
        .mockResolvedValueOnce({
          rows: [
            {
              user_name: userName,
            },
          ],
        });

      // 実行
      const result = await projectService.requestApproval(
        projectId,
        comment,
        organizationId,
        userId
      );

      // デバッグ用: エラー詳細を出力
      if (!result.success) {
        console.error('Error:', result.error);
      }

      // 検証: 成功すること
      expect(result.success).toBe(true);

      // 検証: ユーザー名取得クエリが実行されること
      const userNameQuery = mockQuery.mock.calls.find((call: any[]) =>
        call[0] && typeof call[0] === 'string' && call[0].includes('SELECT user_name')
      );
      expect(userNameQuery).toBeDefined();
      expect(userNameQuery![0]).toContain('FROM organization_user');
      expect(userNameQuery![0]).toContain('WHERE organization_id = $1 AND user_id = $2');
      expect(userNameQuery![1]).toEqual([organizationId, userId]);

      // 検証: レスポンスデータに requested_by_name が含まれること
      expect(result.data).toBeDefined();
      expect(result.data.requested_by_name).toBe(userName);
    });

    it('should handle case when user name is not found (fallback to userId)', async () => {
      const projectId = 'test-project-id';
      const comment = null;
      const organizationId = 'test-org-id';
      const userId = 'test-user-id';

      // プロジェクト存在確認のモック
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'テストプロジェクト',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション内のモック設定
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT notification
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        // ユーザー名取得クエリ（空の結果）
        .mockResolvedValueOnce({
          rows: [],
        });

      // 実行
      const result = await projectService.requestApproval(
        projectId,
        comment,
        organizationId,
        userId
      );

      // デバッグ用: エラー詳細を出力
      if (!result.success) {
        console.error('Error:', result.error);
      }

      // 検証: 成功すること
      expect(result.success).toBe(true);

      // 検証: ユーザー名が見つからない場合は userId をフォールバック
      expect(result.data.requested_by_name).toBe(userId);
    });
  });
});
