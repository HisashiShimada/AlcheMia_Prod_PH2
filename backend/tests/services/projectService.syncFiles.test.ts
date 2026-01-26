/**
 * ProjectService.syncFiles のテスト
 * 
 * Task 2.2: ファイル同期処理の実装（Three-way merge）
 * Requirements: REQ-2, REQ-4, REQ-5
 * 
 * - S3からファイルリストを取得
 * - データベースから現在のfile_metadataを取得
 * - 新規ファイル、更新ファイル、削除ファイルを検出
 * - バッチ操作の構築と実行
 * - エラーハンドリング
 */

import { ProjectService } from '../../src/services/projectService';
import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getStorageService } from '../../src/services/storageService';

// モック
jest.mock('../../src/repositories/fileMetadataRepository');
jest.mock('../../src/services/storageService');
jest.mock('../../src/database/db');
jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

describe('ProjectService.syncFiles', () => {
  let service: ProjectService;
  let mockFileMetadataRepo: jest.Mocked<FileMetadataRepository>;
  let mockStorageService: any;

  const mockOrganizationId = 'maiml_lab_001';
  const mockOrganizationPrefix = 'org_maiml_lab_001';
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const mockProjectName = 'sample_project';
  const mockBucketName = 'mmdpf-files';

  beforeEach(() => {
    // FileMetadataRepositoryのモック
    mockFileMetadataRepo = {
      getByProject: jest.fn(),
      executeBatch: jest.fn(),
    } as any;

    (FileMetadataRepository as jest.MockedClass<typeof FileMetadataRepository>).mockImplementation(
      () => mockFileMetadataRepo
    );

    // StorageServiceのモック
    mockStorageService = {
      listFiles: jest.fn(),
      getBucketName: jest.fn().mockReturnValue(mockBucketName),
    };

    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);

    service = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('新規ファイルのみの場合、INSERT操作を実行する', async () => {
      // S3ファイル（新規ファイル）
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          size: 1024,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      // データベースファイル（空）
      const dbFiles: any[] = [];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      const result = await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      // S3からファイルリストを取得
      expect(mockStorageService.listFiles).toHaveBeenCalledWith(
        mockOrganizationPrefix,
        `projects/${mockProjectName}/`
      );

      // DBからファイルメタデータを取得
      expect(mockFileMetadataRepo.getByProject).toHaveBeenCalledWith(
        mockOrganizationId,
        mockProjectId
      );

      // INSERT操作のみ実行
      expect(mockFileMetadataRepo.executeBatch).toHaveBeenCalledTimes(1);
      const batchOps = mockFileMetadataRepo.executeBatch.mock.calls[0][0];
      expect(batchOps).toHaveLength(1);
      expect(batchOps[0].type).toBe('INSERT');
      if (batchOps[0].type === 'INSERT') {
        expect(batchOps[0].data.fileName).toBe('file1.maiml');
      }

      // サマリー確認
      expect(result).toEqual({
        addedCount: 1,
        updatedCount: 0,
        deletedCount: 0,
      });
    });

    it('更新ファイルのみの場合、UPDATE操作を実行する', async () => {
      const fileId = '123e4567-e89b-12d3-a456-426614174000';

      // S3ファイル（サイズと更新日時が変更）
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          size: 2048,
          lastModified: new Date('2026-01-19T11:00:00Z'),
        },
      ];

      // データベースファイル（古い状態）
      const dbFiles = [
        {
          fileId,
          organizationId: mockOrganizationId,
          projectId: mockProjectId,
          bucketName: mockBucketName,
          objectKey: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          fileName: 'file1.maiml',
          fileType: 'maiml',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2026-01-19T10:00:00Z'),
          createdAt: new Date('2026-01-19T09:00:00Z'),
          updatedAt: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      const result = await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      // UPDATE操作のみ実行
      const batchOps = mockFileMetadataRepo.executeBatch.mock.calls[0][0];
      expect(batchOps).toHaveLength(1);
      expect(batchOps[0].type).toBe('UPDATE');
      if (batchOps[0].type === 'UPDATE') {
        expect(batchOps[0].data.fileId).toBe(fileId);
        expect(batchOps[0].data.fileSize).toBe(2048);
      }

      // サマリー確認
      expect(result).toEqual({
        addedCount: 0,
        updatedCount: 1,
        deletedCount: 0,
      });
    });

    it('削除ファイルのみの場合、DELETE操作を実行する', async () => {
      const fileId = '123e4567-e89b-12d3-a456-426614174000';

      // S3ファイル（空）
      const s3Files: any[] = [];

      // データベースファイル（削除対象）
      const dbFiles = [
        {
          fileId,
          organizationId: mockOrganizationId,
          projectId: mockProjectId,
          bucketName: mockBucketName,
          objectKey: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          fileName: 'file1.maiml',
          fileType: 'maiml',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2026-01-19T10:00:00Z'),
          createdAt: new Date('2026-01-19T09:00:00Z'),
          updatedAt: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      const result = await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      // DELETE操作のみ実行
      const batchOps = mockFileMetadataRepo.executeBatch.mock.calls[0][0];
      expect(batchOps).toHaveLength(1);
      expect(batchOps[0].type).toBe('DELETE');
      expect(batchOps[0].data.fileId).toBe(fileId);

      // サマリー確認
      expect(result).toEqual({
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 1,
      });
    });

    it('混在ケース: 新規、更新、削除が同時に発生する', async () => {
      const existingFileId = '123e4567-e89b-12d3-a456-426614174000';
      const deletedFileId = '123e4567-e89b-12d3-a456-426614174001';

      // S3ファイル
      const s3Files = [
        // 新規ファイル
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/new_file.maiml`,
          size: 512,
          lastModified: new Date('2026-01-19T12:00:00Z'),
        },
        // 既存ファイル（更新）
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/existing_file.maiml`,
          size: 2048,
          lastModified: new Date('2026-01-19T11:00:00Z'),
        },
      ];

      // データベースファイル
      const dbFiles = [
        // 既存ファイル（更新対象）
        {
          fileId: existingFileId,
          organizationId: mockOrganizationId,
          projectId: mockProjectId,
          bucketName: mockBucketName,
          objectKey: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/existing_file.maiml`,
          fileName: 'existing_file.maiml',
          fileType: 'maiml',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2026-01-19T10:00:00Z'),
          createdAt: new Date('2026-01-19T09:00:00Z'),
          updatedAt: new Date('2026-01-19T10:00:00Z'),
        },
        // 削除対象ファイル
        {
          fileId: deletedFileId,
          organizationId: mockOrganizationId,
          projectId: mockProjectId,
          bucketName: mockBucketName,
          objectKey: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/deleted_file.maiml`,
          fileName: 'deleted_file.maiml',
          fileType: 'maiml',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2026-01-19T10:00:00Z'),
          createdAt: new Date('2026-01-19T09:00:00Z'),
          updatedAt: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      const result = await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      // INSERT, UPDATE, DELETE操作が混在
      const batchOps = mockFileMetadataRepo.executeBatch.mock.calls[0][0];
      expect(batchOps).toHaveLength(3);

      const insertOps = batchOps.filter((op) => op.type === 'INSERT');
      const updateOps = batchOps.filter((op) => op.type === 'UPDATE');
      const deleteOps = batchOps.filter((op) => op.type === 'DELETE');

      expect(insertOps).toHaveLength(1);
      expect(updateOps).toHaveLength(1);
      expect(deleteOps).toHaveLength(1);

      // サマリー確認
      expect(result).toEqual({
        addedCount: 1,
        updatedCount: 1,
        deletedCount: 1,
      });
    });

    it('変更がない場合、バッチ操作を実行しない', async () => {
      const fileId = '123e4567-e89b-12d3-a456-426614174000';

      // S3ファイル
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          size: 1024,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      // データベースファイル（同一状態）
      const dbFiles = [
        {
          fileId,
          organizationId: mockOrganizationId,
          projectId: mockProjectId,
          bucketName: mockBucketName,
          objectKey: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          fileName: 'file1.maiml',
          fileType: 'maiml',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2026-01-19T10:00:00Z'),
          createdAt: new Date('2026-01-19T09:00:00Z'),
          updatedAt: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);

      const result = await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      // バッチ操作は実行されない
      expect(mockFileMetadataRepo.executeBatch).not.toHaveBeenCalled();

      // サマリーは全て0
      expect(result).toEqual({
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      });
    });
  });

  describe('エラーケース', () => {
    it('S3エラー時、適切なエラーを返す', async () => {
      const s3Error = new Error('S3 connection failed');
      mockStorageService.listFiles.mockRejectedValue(s3Error);

      await expect(
        service.syncFiles(
          mockOrganizationId,
          mockOrganizationPrefix,
          mockProjectId,
          mockProjectName
        )
      ).rejects.toThrow('S3 connection failed');

      // DBアクセスは実行されない
      expect(mockFileMetadataRepo.getByProject).not.toHaveBeenCalled();
      expect(mockFileMetadataRepo.executeBatch).not.toHaveBeenCalled();
    });

    it('DBエラー時、適切なエラーを返す', async () => {
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          size: 1024,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(s3Files);

      const dbError = new Error('Database connection failed');
      mockFileMetadataRepo.getByProject.mockRejectedValue(dbError);

      await expect(
        service.syncFiles(
          mockOrganizationId,
          mockOrganizationPrefix,
          mockProjectId,
          mockProjectName
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('バッチ実行エラー時、適切なエラーを返す', async () => {
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file1.maiml`,
          size: 1024,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
      ];
      const dbFiles: any[] = [];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);

      const batchError = new Error('Batch execution failed');
      mockFileMetadataRepo.executeBatch.mockRejectedValue(batchError);

      await expect(
        service.syncFiles(
          mockOrganizationId,
          mockOrganizationPrefix,
          mockProjectId,
          mockProjectName
        )
      ).rejects.toThrow('Batch execution failed');
    });
  });

  describe('ファイル名抽出', () => {
    it('パスからファイル名を正しく抽出する', async () => {
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/subfolder/file.maiml`,
          size: 1024,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
      ];
      const dbFiles: any[] = [];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      const batchOps = mockFileMetadataRepo.executeBatch.mock.calls[0][0];
      if (batchOps[0].type === 'INSERT') {
        expect(batchOps[0].data.fileName).toBe('file.maiml');
      }
    });
  });

  describe('ファイルタイプ判定', () => {
    it('拡張子からファイルタイプを正しく判定する', async () => {
      const s3Files = [
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file.maiml`,
          size: 1024,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
        {
          key: `org_${mockOrganizationPrefix}/projects/${mockProjectName}/file.xml`,
          size: 512,
          lastModified: new Date('2026-01-19T10:00:00Z'),
        },
      ];
      const dbFiles: any[] = [];

      mockStorageService.listFiles.mockResolvedValue(s3Files);
      mockFileMetadataRepo.getByProject.mockResolvedValue(dbFiles);
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      await service.syncFiles(
        mockOrganizationId,
        mockOrganizationPrefix,
        mockProjectId,
        mockProjectName
      );

      const batchOps = mockFileMetadataRepo.executeBatch.mock.calls[0][0];
      expect(batchOps).toHaveLength(2);
      if (batchOps[0].type === 'INSERT') {
        expect(batchOps[0].data.fileType).toBe('maiml');
      }
      if (batchOps[1] && batchOps[1].type === 'INSERT') {
        expect(batchOps[1].data.fileType).toBe('xml');
      }
    });
  });
});
