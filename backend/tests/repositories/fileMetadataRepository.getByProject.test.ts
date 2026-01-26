/**
 * FileMetadataRepository.getByProject のテスト
 * 
 * Task 1.1: file_metadataテーブルアクセス機能の実装
 * Requirements: REQ-2, REQ-5
 * 
 * プロジェクト配下の全ファイルメタデータを取得する機能をテストします。
 * - organization_idとproject_idでフィルタリング
 * - deleted_atがNULLのレコードのみ取得（論理削除されていないファイル）
 */

import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('FileMetadataRepository.getByProject', () => {
  let repository: FileMetadataRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // モックのリセット
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    repository = new FileMetadataRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockOrganizationId = 'org_maiml_lab_001';
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';

  describe('正常系', () => {
    it('プロジェクト配下の全ファイルメタデータを取得する', async () => {
      const mockFiles = [
        {
          file_id: '123e4567-e89b-12d3-a456-426614174000',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          bucket_name: 'mmdpf-files',
          object_key: `${mockOrganizationId}/projects/sample_project/sample_project.maiml`,
          file_name: 'sample_project.maiml',
          file_type: 'maiml',
          file_size: 15360,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-19T10:00:00Z'),
          created_at: new Date('2026-01-19T09:00:00Z'),
          updated_at: new Date('2026-01-19T10:00:00Z'),
          deleted_at: null,
        },
        {
          file_id: '223e4567-e89b-12d3-a456-426614174000',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          bucket_name: 'mmdpf-files',
          object_key: `${mockOrganizationId}/projects/sample_project/data.csv`,
          file_name: 'data.csv',
          file_type: 'csv',
          file_size: 2048,
          content_type: 'text/csv',
          last_modified: new Date('2026-01-19T11:00:00Z'),
          created_at: new Date('2026-01-19T09:30:00Z'),
          updated_at: new Date('2026-01-19T11:00:00Z'),
          deleted_at: null,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockFiles, rowCount: 2 });

      const result = await repository.getByProject(mockOrganizationId, mockProjectId);

      // クエリが呼ばれたことを確認
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // 返却値を確認
      expect(result).toHaveLength(2);
      expect(result[0].fileId).toBe(mockFiles[0].file_id);
      expect(result[0].fileName).toBe('sample_project.maiml');
      expect(result[1].fileId).toBe(mockFiles[1].file_id);
      expect(result[1].fileName).toBe('data.csv');
    });

    it('ファイルが存在しない場合は空配列を返す', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.getByProject(mockOrganizationId, mockProjectId);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('マルチテナント分離', () => {
    it('organization_idフィルタが必須である', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getByProject(mockOrganizationId, mockProjectId);

      // クエリにorganization_idフィルタが含まれることを確認
      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('organization_id');
      expect(query).toContain('$1'); // Parameterized Query

      const params = callArgs[1];
      expect(params[0]).toBe(mockOrganizationId);
    });

    it('project_idフィルタが必須である', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getByProject(mockOrganizationId, mockProjectId);

      // クエリにproject_idフィルタが含まれることを確認
      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('project_id');
      expect(query).toContain('$2'); // 2番目のパラメータ

      const params = callArgs[1];
      expect(params[1]).toBe(mockProjectId);
    });

    it('Parameterized Queryを使用してSQLインジェクションを防ぐ', async () => {
      const maliciousProjectId = "'; DROP TABLE file_metadata; --";
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getByProject(mockOrganizationId, maliciousProjectId);

      // Parameterized Queryでパラメータが渡されることを確認
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toContain(maliciousProjectId);

      // クエリ文字列に悪意のある文字列が直接埋め込まれていないことを確認
      const query = callArgs[0];
      expect(query).not.toContain('DROP TABLE');
    });
  });

  describe('論理削除対応', () => {
    it('deleted_atがNULLのレコードのみ取得する', async () => {
      const mockFiles = [
        {
          file_id: '123e4567-e89b-12d3-a456-426614174000',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          bucket_name: 'mmdpf-files',
          object_key: `${mockOrganizationId}/projects/sample_project/active.maiml`,
          file_name: 'active.maiml',
          file_type: 'maiml',
          file_size: 15360,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-19T10:00:00Z'),
          created_at: new Date('2026-01-19T09:00:00Z'),
          updated_at: new Date('2026-01-19T10:00:00Z'),
          deleted_at: null, // 削除されていない
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockFiles, rowCount: 1 });

      await repository.getByProject(mockOrganizationId, mockProjectId);

      // クエリにdeleted_at IS NULLフィルタが含まれることを確認
      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('deleted_at IS NULL');
    });

    it('論理削除されたファイルは除外される', async () => {
      // deleted_at IS NULLフィルタにより、論理削除されたファイルは返されない
      const mockActiveFiles = [
        {
          file_id: '123e4567-e89b-12d3-a456-426614174000',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          bucket_name: 'mmdpf-files',
          object_key: `${mockOrganizationId}/projects/sample_project/active.maiml`,
          file_name: 'active.maiml',
          file_type: 'maiml',
          file_size: 15360,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-19T10:00:00Z'),
          created_at: new Date('2026-01-19T09:00:00Z'),
          updated_at: new Date('2026-01-19T10:00:00Z'),
          deleted_at: null,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockActiveFiles, rowCount: 1 });

      const result = await repository.getByProject(mockOrganizationId, mockProjectId);

      // deleted_atがnullのファイルのみ返される
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('active.maiml');
    });
  });

  describe('フィールドマッピング', () => {
    it('データベースのスネークケースをキャメルケースに変換する', async () => {
      const mockFile = {
        file_id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: mockOrganizationId,
        project_id: mockProjectId,
        bucket_name: 'mmdpf-files',
        object_key: `${mockOrganizationId}/projects/sample_project/test.maiml`,
        file_name: 'test.maiml',
        file_type: 'maiml',
        file_size: 1024,
        content_type: 'application/xml',
        last_modified: new Date('2026-01-19T10:00:00Z'),
        created_at: new Date('2026-01-19T09:00:00Z'),
        updated_at: new Date('2026-01-19T10:00:00Z'),
        deleted_at: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockFile], rowCount: 1 });

      const result = await repository.getByProject(mockOrganizationId, mockProjectId);

      expect(result[0]).toEqual({
        fileId: mockFile.file_id,
        organizationId: mockFile.organization_id,
        projectId: mockFile.project_id,
        bucketName: mockFile.bucket_name,
        objectKey: mockFile.object_key,
        fileName: mockFile.file_name,
        fileType: mockFile.file_type,
        fileSize: mockFile.file_size,
        contentType: mockFile.content_type,
        lastModified: mockFile.last_modified,
        createdAt: mockFile.created_at,
        updatedAt: mockFile.updated_at,
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー時はエラーをスローする', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repository.getByProject(mockOrganizationId, mockProjectId)
      ).rejects.toThrow('Database connection failed');
    });

    it('SQLシンタックスエラー時はエラーをスローする', async () => {
      const sqlError = new Error('syntax error at or near "WHERE"');
      mockQuery.mockRejectedValueOnce(sqlError);

      await expect(
        repository.getByProject(mockOrganizationId, mockProjectId)
      ).rejects.toThrow('syntax error');
    });
  });

  describe('パフォーマンス', () => {
    it('大量のファイル（100件）を処理できる', async () => {
      const mockFiles = Array.from({ length: 100 }, (_, i) => ({
        file_id: `${i}23e4567-e89b-12d3-a456-426614174000`,
        organization_id: mockOrganizationId,
        project_id: mockProjectId,
        bucket_name: 'mmdpf-files',
        object_key: `${mockOrganizationId}/projects/sample_project/file${i}.csv`,
        file_name: `file${i}.csv`,
        file_type: 'csv',
        file_size: 1024 * i,
        content_type: 'text/csv',
        last_modified: new Date('2026-01-19T10:00:00Z'),
        created_at: new Date('2026-01-19T09:00:00Z'),
        updated_at: new Date('2026-01-19T10:00:00Z'),
        deleted_at: null,
      }));

      mockQuery.mockResolvedValueOnce({ rows: mockFiles, rowCount: 100 });

      const result = await repository.getByProject(mockOrganizationId, mockProjectId);

      expect(result).toHaveLength(100);
      expect(result[0].fileName).toBe('file0.csv');
      expect(result[99].fileName).toBe('file99.csv');
    });
  });
});
