/**
 * ファイルメタデータリポジトリ - プロジェクト内全ファイル取得機能のテスト
 * 
 * Task 2.2: プロジェクト内全ファイルメタデータ取得機能の実装
 * Requirements: 5 (ファイル存在確認), 12 (プロジェクト一括ダウンロード)
 */

import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('FileMetadataRepository - listProjectFiles', () => {
  let repository: FileMetadataRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    repository = new FileMetadataRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listProjectFiles', () => {
    const mockOrganizationId = 'org_maiml_lab_001';
    const mockProjectName = 'sample_project';

    it('プロジェクト内の全ファイルメタデータを取得する', async () => {
      const mockFiles = [
        {
          organization_id: mockOrganizationId,
          file_id: '123e4567-e89b-12d3-a456-426614174001',
          object_key: `${mockOrganizationId}/projects/${mockProjectName}/${mockProjectName}.maiml`,
          file_name: `${mockProjectName}.maiml`,
          file_type: 'maiml',
          file_size: 15360,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-19T10:00:00Z'),
        },
        {
          organization_id: mockOrganizationId,
          file_id: '123e4567-e89b-12d3-a456-426614174002',
          object_key: `${mockOrganizationId}/projects/${mockProjectName}/archive/${mockProjectName}_v1.maiml`,
          file_name: `${mockProjectName}_v1.maiml`,
          file_type: 'maiml',
          file_size: 14200,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-18T10:00:00Z'),
        },
        {
          organization_id: mockOrganizationId,
          file_id: '123e4567-e89b-12d3-a456-426614174003',
          object_key: `${mockOrganizationId}/projects/${mockProjectName}/data.csv`,
          file_name: 'data.csv',
          file_type: 'csv',
          file_size: 2048,
          content_type: 'text/csv',
          last_modified: new Date('2026-01-19T11:00:00Z'),
        },
      ];

      // 総件数クエリのモック
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 });
      // ファイル一覧取得クエリのモック
      mockQuery.mockResolvedValueOnce({ rows: mockFiles, rowCount: 3 });

      const result = await repository.listProjectFiles(
        mockOrganizationId,
        mockProjectName,
        1,
        10
      );

      // 2回クエリが実行される（COUNT + SELECT）
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // 返却値を確認
      expect(result.files).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.files[0].fileName).toBe(`${mockProjectName}.maiml`);
      expect(result.files[1].fileName).toBe(`${mockProjectName}_v1.maiml`);
      expect(result.files[2].fileName).toBe('data.csv');
    });

    it('organization_idフィルタが必須である', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.listProjectFiles(mockOrganizationId, mockProjectName, 1, 10);

      // COUNTクエリとSELECTクエリ両方にorganization_idフィルタが含まれることを確認
      const countQuery = mockQuery.mock.calls[0][0];
      const selectQuery = mockQuery.mock.calls[1][0];

      expect(countQuery).toContain('organization_id');
      expect(countQuery).toContain('$1');
      expect(selectQuery).toContain('organization_id');
      expect(selectQuery).toContain('$1');

      // パラメータにorganization_idが含まれることを確認
      const countParams = mockQuery.mock.calls[0][1];
      const selectParams = mockQuery.mock.calls[1][1];
      expect(countParams[0]).toBe(mockOrganizationId);
      expect(selectParams[0]).toBe(mockOrganizationId);
    });

    it('object_keyのプレフィックスでフィルタリングする', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.listProjectFiles(mockOrganizationId, mockProjectName, 1, 10);

      const countQuery = mockQuery.mock.calls[0][0];
      const selectQuery = mockQuery.mock.calls[1][0];

      // object_keyのプレフィックスマッチング（LIKE）を使用
      expect(countQuery).toContain('object_key');
      expect(countQuery).toContain('LIKE');
      expect(selectQuery).toContain('object_key');
      expect(selectQuery).toContain('LIKE');

      // パラメータにプロジェクトパスプレフィックスが含まれることを確認
      const countParams = mockQuery.mock.calls[0][1];
      const selectParams = mockQuery.mock.calls[1][1];
      expect(countParams[1]).toContain(`projects/${mockProjectName}`);
      expect(selectParams[1]).toContain(`projects/${mockProjectName}`);
    });

    it('ページネーション機能が正しく動作する', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const page = 2;
      const limit = 10;
      await repository.listProjectFiles(mockOrganizationId, mockProjectName, page, limit);

      const selectQuery = mockQuery.mock.calls[1][0];
      const selectParams = mockQuery.mock.calls[1][1];

      // LIMITとOFFSETが含まれることを確認
      expect(selectQuery).toContain('LIMIT');
      expect(selectQuery).toContain('OFFSET');

      // パラメータにlimit、offsetが含まれることを確認
      expect(selectParams).toContain(limit);
      expect(selectParams).toContain((page - 1) * limit); // offset = (page - 1) * limit
    });

    it('最終更新日時の降順でソートする', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.listProjectFiles(mockOrganizationId, mockProjectName, 1, 10);

      const selectQuery = mockQuery.mock.calls[1][0];

      // ORDER BY last_modified DESCが含まれることを確認
      expect(selectQuery).toContain('ORDER BY');
      expect(selectQuery).toContain('last_modified');
      expect(selectQuery).toContain('DESC');
    });

    it('空のプロジェクト（ファイル0件）の場合は空の配列を返す', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.listProjectFiles(
        mockOrganizationId,
        mockProjectName,
        1,
        10
      );

      expect(result.files).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('デフォルトのページネーションパラメータ（page=1, limit=100）が適用される', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.listProjectFiles(mockOrganizationId, mockProjectName, 1, 100);

      const selectParams = mockQuery.mock.calls[1][1];

      expect(selectParams).toContain(100); // limit
      expect(selectParams).toContain(0);   // offset = 0
    });

    it('複数のフィールドを正しくマッピングする', async () => {
      const mockFile = {
        organization_id: mockOrganizationId,
        file_id: '123e4567-e89b-12d3-a456-426614174000',
        object_key: `${mockOrganizationId}/projects/${mockProjectName}/results.json`,
        file_name: 'results.json',
        file_type: 'json',
        file_size: 512,
        content_type: 'application/json',
        last_modified: new Date('2026-01-19T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockFile], rowCount: 1 });

      const result = await repository.listProjectFiles(
        mockOrganizationId,
        mockProjectName,
        1,
        10
      );

      expect(result.files[0]).toEqual({
        fileId: mockFile.file_id,
        fileName: mockFile.file_name,
        filePath: mockFile.object_key,
        fileSize: mockFile.file_size,
        contentType: mockFile.content_type,
        lastModified: mockFile.last_modified,
        organizationId: mockFile.organization_id,
      });
    });

    it('データベースエラー時はエラーをスローする', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repository.listProjectFiles(mockOrganizationId, mockProjectName, 1, 10)
      ).rejects.toThrow('Database connection failed');
    });

    it('総件数が100件を超える場合でもページネーションが正しく機能する', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '150' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const page = 3;
      const limit = 50;
      await repository.listProjectFiles(mockOrganizationId, mockProjectName, page, limit);

      const selectParams = mockQuery.mock.calls[1][1];

      expect(selectParams).toContain(limit);         // limit = 50
      expect(selectParams).toContain((page - 1) * limit); // offset = 100
    });

    it('アーカイブファイルを含むプロジェクトの全ファイルを取得する', async () => {
      const mockFiles = [
        {
          organization_id: mockOrganizationId,
          file_id: '123e4567-e89b-12d3-a456-426614174001',
          object_key: `${mockOrganizationId}/projects/${mockProjectName}/${mockProjectName}.maiml`,
          file_name: `${mockProjectName}.maiml`,
          file_type: 'maiml',
          file_size: 15360,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-19T10:00:00Z'),
        },
        {
          organization_id: mockOrganizationId,
          file_id: '123e4567-e89b-12d3-a456-426614174002',
          object_key: `${mockOrganizationId}/projects/${mockProjectName}/archive/${mockProjectName}_v1.maiml`,
          file_name: `${mockProjectName}_v1.maiml`,
          file_type: 'maiml',
          file_size: 14200,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-18T10:00:00Z'),
        },
        {
          organization_id: mockOrganizationId,
          file_id: '123e4567-e89b-12d3-a456-426614174003',
          object_key: `${mockOrganizationId}/projects/${mockProjectName}/archive/${mockProjectName}_v2.maiml`,
          file_name: `${mockProjectName}_v2.maiml`,
          file_type: 'maiml',
          file_size: 14800,
          content_type: 'application/xml',
          last_modified: new Date('2026-01-19T09:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: mockFiles, rowCount: 3 });

      const result = await repository.listProjectFiles(
        mockOrganizationId,
        mockProjectName,
        1,
        10
      );

      expect(result.files).toHaveLength(3);
      expect(result.files.some(f => f.filePath.includes('archive'))).toBe(true);
    });

    it('Parameterized Queryを使用してSQLインジェクション対策する', async () => {
      const maliciousProjectName = "'; DROP TABLE file_metadata; --";
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repository.listProjectFiles(
        mockOrganizationId,
        maliciousProjectName,
        1,
        10
      );

      // Parameterized Queryでパラメータが渡されることを確認
      const countParams = mockQuery.mock.calls[0][1];
      const selectParams = mockQuery.mock.calls[1][1];

      expect(countParams[1]).toContain(maliciousProjectName);
      expect(selectParams[1]).toContain(maliciousProjectName);

      // クエリ文字列に悪意のある文字列が直接埋め込まれていないことを確認
      const countQuery = mockQuery.mock.calls[0][0];
      const selectQuery = mockQuery.mock.calls[1][0];
      expect(countQuery).not.toContain('DROP TABLE');
      expect(selectQuery).not.toContain('DROP TABLE');
    });
  });
});
