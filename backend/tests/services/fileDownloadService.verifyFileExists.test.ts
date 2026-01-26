/**
 * FileDownloadService.verifyFileExists() ユニットテスト
 * 
 * Task 3.4: ファイル存在確認機能
 * Requirements: 5
 */

import { FileDownloadService } from '../../src/services/fileDownloadService';
import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getStorageService } from '../../src/services/storageService';
import { NotFoundError, StorageError } from '../../src/utils/errorClasses';

jest.mock('../../src/repositories/fileMetadataRepository');
jest.mock('../../src/services/storageService');
jest.mock('../../src/services/projectAccessValidator');
jest.mock('../../src/utils/downloadLogger', () => ({
  logDownloadHistory: jest.fn(),
  logBulkDownloadHistory: jest.fn(),
}));

describe('FileDownloadService.verifyFileExists()', () => {
  let service: FileDownloadService;
  let mockRepository: jest.Mocked<FileMetadataRepository>;
  let mockStorageService: any;

  const organizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
  const organizationPrefix = 'maiml_lab_001';
  const projectId = 'b1234567-89ab-cdef-0123-456789abcdef';
  const fileName = 'test_file.maiml';

  beforeEach(() => {
    jest.clearAllMocks();

    // FileMetadataRepositoryのモック
    mockRepository = new FileMetadataRepository() as jest.Mocked<FileMetadataRepository>;

    // StorageServiceのモック
    mockStorageService = {
      fileExists: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);

    service = new FileDownloadService(mockRepository);
  });

  describe('正常系', () => {
    it('ファイルメタデータとストレージ上のファイルが両方存在する場合、ファイルメタデータを返す', async () => {
      const mockMetadata = {
        fileName,
        filePath: `projects/${projectId}/${fileName}`,
        fileSize: 1024,
        contentType: 'application/xml',
        lastModified: new Date('2024-01-01'),
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.fileExists.mockResolvedValue(true);

      const result = await service.verifyFileExists(
        organizationId,
        organizationPrefix,
        projectId,
        fileName
      );

      expect(result).toEqual(mockMetadata);
      expect(mockRepository.getFileMetadata).toHaveBeenCalledWith(
        organizationId,
        projectId,
        fileName
      );
      expect(mockStorageService.fileExists).toHaveBeenCalledWith(
        organizationPrefix,
        mockMetadata.filePath
      );
    });

    it('ファイル名にパストラバーサルパターンが含まれていてもサニタイズされる', async () => {
      const maliciousFileName = '../../../etc/passwd';
      const sanitizedFileName = 'etcpasswd';

      const mockMetadata = {
        fileName: sanitizedFileName,
        filePath: `projects/${projectId}/${sanitizedFileName}`,
        fileSize: 1024,
        contentType: 'text/plain',
        lastModified: new Date('2024-01-01'),
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.fileExists.mockResolvedValue(true);

      const result = await service.verifyFileExists(
        organizationId,
        organizationPrefix,
        projectId,
        maliciousFileName
      );

      expect(result).toEqual(mockMetadata);
      expect(mockRepository.getFileMetadata).toHaveBeenCalledWith(
        organizationId,
        projectId,
        sanitizedFileName
      );
    });
  });

  describe('異常系: ファイルメタデータが存在しない', () => {
    it('file_metadataテーブルにレコードがない場合、NotFoundErrorをスロー', async () => {
      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(null);

      await expect(
        service.verifyFileExists(
          organizationId,
          organizationPrefix,
          projectId,
          fileName
        )
      ).rejects.toThrow(NotFoundError);

      await expect(
        service.verifyFileExists(
          organizationId,
          organizationPrefix,
          projectId,
          fileName
        )
      ).rejects.toThrow(`ファイルメタデータが見つかりません: ${fileName}`);

      expect(mockStorageService.fileExists).not.toHaveBeenCalled();
    });
  });

  describe('異常系: ストレージ上にファイルが存在しない', () => {
    it('file_metadataにはレコードがあるがS3/Swift上にファイルがない場合、StorageErrorをスロー', async () => {
      const mockMetadata = {
        fileName,
        filePath: `projects/${projectId}/${fileName}`,
        fileSize: 1024,
        contentType: 'application/xml',
        lastModified: new Date('2024-01-01'),
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.fileExists.mockResolvedValue(false);

      await expect(
        service.verifyFileExists(
          organizationId,
          organizationPrefix,
          projectId,
          fileName
        )
      ).rejects.toThrow(StorageError);

      await expect(
        service.verifyFileExists(
          organizationId,
          organizationPrefix,
          projectId,
          fileName
        )
      ).rejects.toThrow(
        `ファイルメタデータは存在しますが、ストレージ上にファイルが見つかりません: ${fileName}`
      );

      expect(mockRepository.getFileMetadata).toHaveBeenCalledWith(
        organizationId,
        projectId,
        fileName
      );
      expect(mockStorageService.fileExists).toHaveBeenCalledWith(
        organizationPrefix,
        mockMetadata.filePath
      );
    });

    it('データ整合性エラーの詳細メッセージを含む', async () => {
      const mockMetadata = {
        fileName: 'important_data.csv',
        filePath: `projects/${projectId}/important_data.csv`,
        fileSize: 2048,
        contentType: 'text/csv',
        lastModified: new Date('2024-01-01'),
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.fileExists.mockResolvedValue(false);

      await expect(
        service.verifyFileExists(
          organizationId,
          organizationPrefix,
          projectId,
          'important_data.csv'
        )
      ).rejects.toThrow(
        'ファイルメタデータは存在しますが、ストレージ上にファイルが見つかりません: important_data.csv'
      );
    });
  });

  describe('エッジケース', () => {
    it('空のファイル名の場合、サニタイズ後にメタデータ検索が実行される', async () => {
      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(null);

      await expect(
        service.verifyFileExists(
          organizationId,
          organizationPrefix,
          projectId,
          ''
        )
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.getFileMetadata).toHaveBeenCalledWith(
        organizationId,
        projectId,
        '' // サニタイズされた結果
      );
    });

    it('特殊文字を含むファイル名が正しく処理される', async () => {
      const specialFileName = 'test file (1).maiml';

      const mockMetadata = {
        fileName: specialFileName,
        filePath: `projects/${projectId}/${specialFileName}`,
        fileSize: 1024,
        contentType: 'application/xml',
        lastModified: new Date('2024-01-01'),
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.fileExists.mockResolvedValue(true);

      const result = await service.verifyFileExists(
        organizationId,
        organizationPrefix,
        projectId,
        specialFileName
      );

      expect(result).toEqual(mockMetadata);
    });
  });

  describe('統合: downloadFile()での使用', () => {
    it('downloadFile()がverifyFileExists()を呼び出してファイル存在を確認する', async () => {
      const mockMetadata = {
        fileName,
        filePath: `projects/${projectId}/${fileName}`,
        fileSize: 1024,
        contentType: 'application/xml',
        lastModified: new Date('2024-01-01'),
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.example.com');

      // ProjectAccessValidatorのモック（常に成功）
      const mockAccessValidator = {
        validateAccess: jest.fn().mockResolvedValue(undefined),
      };
      service = new FileDownloadService(mockRepository, mockAccessValidator as any);

      await service.downloadFile(
        'user_123',
        projectId,
        organizationId,
        organizationPrefix,
        fileName
      );

      // verifyFileExists()が内部で呼び出されたことを確認
      expect(mockRepository.getFileMetadata).toHaveBeenCalledWith(
        organizationId,
        projectId,
        fileName
      );
      expect(mockStorageService.fileExists).toHaveBeenCalledWith(
        organizationPrefix,
        mockMetadata.filePath
      );
    });
  });
});
