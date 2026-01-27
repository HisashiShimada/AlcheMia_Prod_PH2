/**
 * ProjectService.clearProjectCache のテスト
 * 
 * Task 2.1: プロジェクト存在確認とキャッシュクリア機能の実装
 * Requirements: REQ-1, REQ-3, REQ-5
 * 
 * - プロジェクトの存在確認（organization_idフィルタ付き）
 * - プロジェクト詳細キャッシュのクリア
 * - ファイルリストキャッシュのクリア
 * - タスクリストキャッシュのクリア
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

// node-cacheのモック
const mockDel = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    del: (...args: any[]) => mockDel(...args),
    get: (...args: any[]) => mockGet(...args),
    set: (...args: any[]) => mockSet(...args),
  }));
});

describe('ProjectService.clearProjectCache', () => {
  let service: ProjectService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();

    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    // モック関数をクリア
    mockDel.mockClear();
    mockGet.mockClear();
    mockSet.mockClear();

    service = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockOrganizationId = 'org_maiml_lab_001';
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';

  describe('正常系', () => {
    it('プロジェクトが存在する場合、キャッシュをクリアする', async () => {
      // プロジェクト存在確認
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            project_id: mockProjectId,
            project_name: 'test_project',
          },
        ],
      });

      const result = await service.clearProjectCache(mockOrganizationId, mockProjectId);

      // プロジェクト存在確認クエリを実行
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT project_id'),
        [mockOrganizationId, mockProjectId]
      );

      // 3つのキャッシュキーを削除
      expect(mockDel).toHaveBeenCalledTimes(3);
      expect(mockDel).toHaveBeenCalledWith(`project:${mockOrganizationId}:${mockProjectId}:detail`);
      expect(mockDel).toHaveBeenCalledWith(`project:${mockOrganizationId}:${mockProjectId}:files`);
      expect(mockDel).toHaveBeenCalledWith(`project:${mockOrganizationId}:${mockProjectId}:tasks`);

      // 成功レスポンス
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        projectId: mockProjectId,
        clearedCaches: ['detail', 'files', 'tasks'],
      });
    });

    it('プロジェクトの存在を確認する', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: mockProjectId }],
      });

      await service.clearProjectCache(mockOrganizationId, mockProjectId);

      // organization_id と project_id でフィルタリング
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('WHERE');
      expect(callArgs[0]).toContain('organization_id');
      expect(callArgs[0]).toContain('project_id');
      expect(callArgs[1]).toEqual([mockOrganizationId, mockProjectId]);
    });
  });

  describe('エラーケース', () => {
    it('プロジェクトが存在しない場合、404エラーを返す', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.clearProjectCache(mockOrganizationId, mockProjectId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error!.message).toContain('プロジェクトが見つかりません');
      
      // キャッシュクリアは実行されない
      expect(mockDel).not.toHaveBeenCalled();
    });

    it('データベースエラー時、適切なエラーを返す', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      const result = await service.clearProjectCache(mockOrganizationId, mockProjectId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(result.error!.originalError).toBe(dbError);
      
      // キャッシュクリアは実行されない
      expect(mockDel).not.toHaveBeenCalled();
    });
  });

  describe('マルチテナント分離', () => {
    it('organization_idフィルタが必須である', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: mockProjectId }],
      });

      await service.clearProjectCache(mockOrganizationId, mockProjectId);

      // クエリにorganization_idが含まれる
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('organization_id');
      
      // パラメータにorganization_idが含まれる
      const params = mockQuery.mock.calls[0][1];
      expect(params[0]).toBe(mockOrganizationId);
    });

    it('異なる組織のプロジェクトはアクセスできない', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [], // 異なる組織ではプロジェクトが見つからない
      });

      const result = await service.clearProjectCache('org_another', mockProjectId);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('RESOURCE_NOT_FOUND');
      expect(mockDel).not.toHaveBeenCalled();
    });
  });

  describe('キャッシュキー構造', () => {
    it('正しいキャッシュキー形式を使用する', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: mockProjectId }],
      });

      await service.clearProjectCache(mockOrganizationId, mockProjectId);

      // キャッシュキーの形式を検証
      const detailKey = `project:${mockOrganizationId}:${mockProjectId}:detail`;
      const filesKey = `project:${mockOrganizationId}:${mockProjectId}:files`;
      const tasksKey = `project:${mockOrganizationId}:${mockProjectId}:tasks`;

      expect(mockDel).toHaveBeenCalledWith(detailKey);
      expect(mockDel).toHaveBeenCalledWith(filesKey);
      expect(mockDel).toHaveBeenCalledWith(tasksKey);
    });

    it('組織レベルキャッシュはクリアしない', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: mockProjectId }],
      });

      await service.clearProjectCache(mockOrganizationId, mockProjectId);

      // 組織レベルキャッシュ（project:{orgId}:list）は削除しない
      const orgListKey = `project:${mockOrganizationId}:list`;
      expect(mockDel).not.toHaveBeenCalledWith(orgListKey);
    });
  });

  describe('Parameterized Query', () => {
    it('SQLインジェクション対策としてパラメータを使用する', async () => {
      const maliciousOrgId = "'; DROP TABLE project; --";
      const maliciousProjectId = "'; DELETE FROM project; --";

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await service.clearProjectCache(maliciousOrgId, maliciousProjectId);

      // パラメータが使用されていることを確認
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toEqual([maliciousOrgId, maliciousProjectId]);
      
      // クエリ文字列に悪意のある文字列が直接埋め込まれていないことを確認
      expect(callArgs[0]).not.toContain('DROP TABLE');
      expect(callArgs[0]).not.toContain('DELETE FROM');
    });
  });
});
