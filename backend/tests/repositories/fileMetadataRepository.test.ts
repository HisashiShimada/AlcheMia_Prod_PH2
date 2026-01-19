/**
 * ファイルメタデータリポジトリのテスト
 * 
 * Task 2.1: 単一ファイルメタデータ取得機能の実装
 * Requirements: 5 (ファイル存在確認), 11 (マルチテナント対応とセキュリティ)
 */

import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('FileMetadataRepository', () => {
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

  describe('getFileMetadata', () => {
    const mockOrganizationId = 'org_maiml_lab_001';
    const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';
    const mockFileName = 'sample_project.maiml';

    it('ファイルメタデータを正常に取得する', async () => {
      const mockFileData = {
        organization_id: mockOrganizationId,
        file_id: '123e4567-e89b-12d3-a456-426614174000',
        bucket_name: 'mmdpf-files',
        object_key: `${mockOrganizationId}/projects/sample_project/sample_project.maiml`,
        file_name: mockFileName,
        file_type: 'maiml',
        file_size: 15360,
        content_type: 'application/xml',
        last_modified: new Date('2026-01-19T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockFileData], rowCount: 1 });

      const result = await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        mockFileName
      );

      // クエリが呼ばれたことを確認
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // クエリパラメータを確認
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('SELECT');
      expect(callArgs[0]).toContain('file_metadata');
      expect(callArgs[0]).toContain('organization_id');
      expect(callArgs[0]).toContain('file_name');

      // Parameterized Queryを使用していることを確認
      expect(callArgs[1]).toEqual([mockOrganizationId, mockFileName]);

      // 返却値を確認
      expect(result).not.toBeNull();
      expect(result?.fileId).toBe(mockFileData.file_id);
      expect(result?.fileName).toBe(mockFileName);
      expect(result?.fileSize).toBe(15360);
      expect(result?.contentType).toBe('application/xml');
      expect(result?.organizationId).toBe(mockOrganizationId);
    });

    it('ファイルが存在しない場合はnullを返す', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        'nonexistent.maiml'
      );

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('organization_idフィルタが必須である', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        mockFileName
      );

      // クエリにorganization_idフィルタが含まれることを確認
      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('organization_id');
      expect(query).toContain('$1'); // Parameterized Query

      const params = callArgs[1];
      expect(params[0]).toBe(mockOrganizationId);
    });

    it('file_nameでフィルタリングする', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        mockFileName
      );

      // クエリにfile_nameフィルタが含まれることを確認
      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('file_name');
      expect(query).toContain('$2'); // 2番目のパラメータ

      const params = callArgs[1];
      expect(params[1]).toBe(mockFileName);
    });

    it('LIMIT 1を使用して単一レコードのみ取得する', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        mockFileName
      );

      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('LIMIT 1');
    });

    it('複数のフィールドを正しくマッピングする', async () => {
      const mockFileData = {
        organization_id: mockOrganizationId,
        file_id: '123e4567-e89b-12d3-a456-426614174000',
        bucket_name: 'mmdpf-files',
        object_key: `${mockOrganizationId}/projects/sample_project/data.csv`,
        file_name: 'data.csv',
        file_type: 'csv',
        file_size: 2048,
        content_type: 'text/csv',
        last_modified: new Date('2026-01-19T11:30:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockFileData], rowCount: 1 });

      const result = await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        'data.csv'
      );

      expect(result).toEqual({
        fileId: mockFileData.file_id,
        fileName: mockFileData.file_name,
        filePath: mockFileData.object_key,
        fileSize: mockFileData.file_size,
        contentType: mockFileData.content_type,
        lastModified: mockFileData.last_modified,
        organizationId: mockFileData.organization_id,
      });
    });

    it('データベースエラー時はエラーをスローする', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repository.getFileMetadata(mockOrganizationId, mockProjectId, mockFileName)
      ).rejects.toThrow('Database connection failed');
    });

    it('SQLインジェクション対策としてParameterized Queryを使用する', async () => {
      const maliciousFileName = "'; DROP TABLE file_metadata; --";
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        maliciousFileName
      );

      // Parameterized Queryでパラメータが渡されることを確認
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toContain(maliciousFileName);

      // クエリ文字列に悪意のある文字列が直接埋め込まれていないことを確認
      const query = callArgs[0];
      expect(query).not.toContain('DROP TABLE');
    });

    it('アーカイブファイルのメタデータを取得する', async () => {
      const archiveFileName = 'sample_project_v1.maiml';
      const mockFileData = {
        organization_id: mockOrganizationId,
        file_id: '223e4567-e89b-12d3-a456-426614174000',
        bucket_name: 'mmdpf-files',
        object_key: `${mockOrganizationId}/projects/sample_project/archive/${archiveFileName}`,
        file_name: archiveFileName,
        file_type: 'maiml',
        file_size: 14200,
        content_type: 'application/xml',
        last_modified: new Date('2026-01-18T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockFileData], rowCount: 1 });

      const result = await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        archiveFileName
      );

      expect(result).not.toBeNull();
      expect(result?.fileName).toBe(archiveFileName);
      expect(result?.filePath).toContain('archive');
    });

    it('添付ファイル（CSV、JSON等）のメタデータを取得する', async () => {
      const attachmentFileName = 'results.json';
      const mockFileData = {
        organization_id: mockOrganizationId,
        file_id: '323e4567-e89b-12d3-a456-426614174000',
        bucket_name: 'mmdpf-files',
        object_key: `${mockOrganizationId}/projects/sample_project/${attachmentFileName}`,
        file_name: attachmentFileName,
        file_type: 'json',
        file_size: 512,
        content_type: 'application/json',
        last_modified: new Date('2026-01-19T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockFileData], rowCount: 1 });

      const result = await repository.getFileMetadata(
        mockOrganizationId,
        mockProjectId,
        attachmentFileName
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('application/json');
    });
  });
});
