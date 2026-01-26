/**
 * FileMetadataRepository.executeBatch のテスト
 * 
 * Task 1.2: ファイルメタデータのバッチ更新機能の実装
 * Requirements: REQ-2, REQ-5
 * 
 * INSERT、UPDATE、DELETE（論理削除）操作をバッチ処理します。
 * - UNNESTを使用した効率的なバッチ実行
 * - トランザクション管理
 * - organization_id検証を各操作で実施
 */

import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('FileMetadataRepository.executeBatch', () => {
  let repository: FileMetadataRepository;
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    // トランザクション用のクライアントモック
    mockQuery = jest.fn();
    mockClient = {
      query: mockQuery,
      release: jest.fn(),
    };
    mockConnect = jest.fn().mockResolvedValue(mockClient);

    (getPool as jest.Mock).mockReturnValue({
      connect: mockConnect,
      query: mockQuery,
    });

    repository = new FileMetadataRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockOrganizationId = 'org_maiml_lab_001';
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';

  describe('INSERT操作', () => {
    it('新規ファイルを挿入する', async () => {
      const insertOps = [
        {
          type: 'INSERT' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/file1.csv`,
            fileName: 'file1.csv',
            fileType: 'csv',
            fileSize: 1024,
            contentType: 'text/csv',
            lastModified: new Date('2026-01-19T10:00:00Z'),
          },
        },
      ];

      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // INSERT
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await repository.executeBatch(insertOps);

      // トランザクション開始を確認
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      
      // INSERTクエリを確認
      const insertCall = mockClient.query.mock.calls.find((call: any[]) => 
        call[0].includes('INSERT INTO file_metadata')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[0]).toContain('INSERT INTO file_metadata');
      expect(insertCall[0]).toContain('organization_id');
      expect(insertCall[0]).toContain('project_id');

      // COMMIT確認
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('複数の新規ファイルを一括挿入する', async () => {
      const insertOps = [
        {
          type: 'INSERT' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/file1.csv`,
            fileName: 'file1.csv',
            fileType: 'csv',
            fileSize: 1024,
            contentType: 'text/csv',
            lastModified: new Date('2026-01-19T10:00:00Z'),
          },
        },
        {
          type: 'INSERT' as const,
          data: {
            fileId: '223e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/file2.json`,
            fileName: 'file2.json',
            fileType: 'json',
            fileSize: 512,
            contentType: 'application/json',
            lastModified: new Date('2026-01-19T11:00:00Z'),
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 2 }); // INSERT
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await repository.executeBatch(insertOps);

      // UNNESTを使用したバッチINSERTを確認
      const insertCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0].includes('UNNEST')
      );
      expect(insertCall).toBeDefined();
    });
  });

  describe('UPDATE操作', () => {
    it('既存ファイルを更新する', async () => {
      const updateOps = [
        {
          type: 'UPDATE' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            fileSize: 2048,
            lastModified: new Date('2026-01-19T12:00:00Z'),
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await repository.executeBatch(updateOps);

      const updateCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0].includes('UPDATE file_metadata')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('file_size');
      expect(updateCall[0]).toContain('last_modified');
      expect(updateCall[0]).toContain('updated_at');
    });

    it('複数ファイルを一括更新する', async () => {
      const updateOps = [
        {
          type: 'UPDATE' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            fileSize: 2048,
            lastModified: new Date('2026-01-19T12:00:00Z'),
          },
        },
        {
          type: 'UPDATE' as const,
          data: {
            fileId: '223e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            fileSize: 1024,
            lastModified: new Date('2026-01-19T12:30:00Z'),
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 2 }); // UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await repository.executeBatch(updateOps);

      const updateCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0].includes('UNNEST')
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('DELETE操作（論理削除）', () => {
    it('ファイルを論理削除する', async () => {
      const deleteOps = [
        {
          type: 'DELETE' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE (deleted_at)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await repository.executeBatch(deleteOps);

      const deleteCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0].includes('deleted_at')
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall[0]).toContain('UPDATE file_metadata');
      expect(deleteCall[0]).toContain('deleted_at = NOW()');
      expect(deleteCall[0]).not.toContain('DELETE FROM');
    });

    it('複数ファイルを一括論理削除する', async () => {
      const deleteOps = [
        {
          type: 'DELETE' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
          },
        },
        {
          type: 'DELETE' as const,
          data: {
            fileId: '223e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 2 }); // UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await repository.executeBatch(deleteOps);

      const deleteCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0].includes('UNNEST')
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe('混合操作', () => {
    it('INSERT、UPDATE、DELETEを同一トランザクションで実行する', async () => {
      const mixedOps = [
        {
          type: 'INSERT' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/new.csv`,
            fileName: 'new.csv',
            fileType: 'csv',
            fileSize: 1024,
            contentType: 'text/csv',
            lastModified: new Date('2026-01-19T10:00:00Z'),
          },
        },
        {
          type: 'UPDATE' as const,
          data: {
            fileId: '223e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            fileSize: 2048,
            lastModified: new Date('2026-01-19T11:00:00Z'),
          },
        },
        {
          type: 'DELETE' as const,
          data: {
            fileId: '323e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // DELETE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await repository.executeBatch(mixedOps);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      // INSERT, UPDATE, DELETE各1回
      expect(mockClient.query).toHaveBeenCalledTimes(5);
    });
  });

  describe('トランザクション管理', () => {
    it('エラー時にロールバックする', async () => {
      const insertOps = [
        {
          type: 'INSERT' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/file.csv`,
            fileName: 'file.csv',
            fileType: 'csv',
            fileSize: 1024,
            contentType: 'text/csv',
            lastModified: new Date('2026-01-19T10:00:00Z'),
          },
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(dbError); // INSERT fails
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(repository.executeBatch(insertOps)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('空の操作配列の場合は何もしない', async () => {
      await repository.executeBatch([]);

      expect(mockConnect).not.toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('マルチテナント分離', () => {
    it('すべての操作でorganization_idを検証する', async () => {
      const mixedOps = [
        {
          type: 'INSERT' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/file.csv`,
            fileName: 'file.csv',
            fileType: 'csv',
            fileSize: 1024,
            contentType: 'text/csv',
            lastModified: new Date('2026-01-19T10:00:00Z'),
          },
        },
        {
          type: 'UPDATE' as const,
          data: {
            fileId: '223e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            fileSize: 2048,
            lastModified: new Date('2026-01-19T11:00:00Z'),
          },
        },
        {
          type: 'DELETE' as const,
          data: {
            fileId: '323e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
          },
        },
      ];

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await repository.executeBatch(mixedOps);

      // すべてのクエリでorganization_idフィルタを確認
      const queries = mockClient.query.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('file_metadata')
      );

      queries.forEach((call: any[]) => {
        expect(call[0]).toContain('organization_id');
      });
    });
  });

  describe('Parameterized Query', () => {
    it('SQLインジェクション対策としてパラメータを使用する', async () => {
      const insertOps = [
        {
          type: 'INSERT' as const,
          data: {
            fileId: '123e4567-e89b-12d3-a456-426614174000',
            organizationId: mockOrganizationId,
            projectId: mockProjectId,
            bucketName: 'mmdpf-files',
            objectKey: `${mockOrganizationId}/projects/test/file.csv`,
            fileName: "'; DROP TABLE file_metadata; --",
            fileType: 'csv',
            fileSize: 1024,
            contentType: 'text/csv',
            lastModified: new Date('2026-01-19T10:00:00Z'),
          },
        },
      ];

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await repository.executeBatch(insertOps);

      const insertCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO file_metadata')
      );
      
      // パラメータが使用されていることを確認
      expect(insertCall[1]).toBeDefined();
      expect(Array.isArray(insertCall[1])).toBe(true);
      
      // クエリ文字列に悪意のある文字列が直接埋め込まれていないことを確認
      expect(insertCall[0]).not.toContain('DROP TABLE');
    });
  });
});
