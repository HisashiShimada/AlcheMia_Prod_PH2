/**
 * ファイルダウンロードサービスのテスト
 * 
 * Task 3.1: 単一ファイルダウンロード用署名付きURL生成機能の実装
 * Requirements: 1 (署名付きURL), 2 (セキュリティ), 4 (ファイル種別), 5 (存在確認), 8 (パフォーマンス), 11 (マルチテナント)
 */

import { FileDownloadService } from '../../src/services/fileDownloadService';
import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getStorageService } from '../../src/services/storageService';
import { logDownloadHistory } from '../../src/utils/downloadLogger';

// モック
jest.mock('../../src/repositories/fileMetadataRepository');
jest.mock('../../src/services/storageService');
jest.mock('../../src/utils/downloadLogger');

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let mockRepository: jest.Mocked<FileMetadataRepository>;
  let mockStorageService: any;

  beforeEach(() => {
    mockRepository = new FileMetadataRepository() as jest.Mocked<FileMetadataRepository>;
    mockStorageService = {
      getSignedUrl: jest.fn(),
    };

    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);

    service = new FileDownloadService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadFile', () => {
    const mockOrganizationPrefix = 'org_maiml_lab_001';
    const mockProjectName = 'sample_project';
    const mockFileName = 'sample_project.maiml';
    const mockUserId = 'user_123';

    it('署名付きURLを正常に生成する', async () => {
      const mockMetadata = {
        fileId: 'file_123',
        fileName: mockFileName,
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/${mockFileName}`,
        fileSize: 15360,
        contentType: 'application/xml',
        lastModified: new Date('2026-01-19T10:00:00Z'),
        organizationId: mockOrganizationPrefix,
      };

      const mockSignedUrl = 'https://s3.amazonaws.com/bucket/file?signature=xyz';

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.getSignedUrl.mockResolvedValue(mockSignedUrl);

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.signedUrl).toBe(mockSignedUrl);
      expect(result.data?.fileName).toBe(mockFileName);
      expect(result.data?.fileSize).toBe(15360);
      expect(result.data?.expiresInSeconds).toBe(3600);
    });

    it('ファイル名をサニタイゼーションする', async () => {
      const maliciousFileName = '../../../etc/passwd';

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(null);

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        maliciousFileName,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('ファイルが見つかりません');
    });

    it('ファイルが存在しない場合はエラーを返す', async () => {
      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(null);

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('ファイルが見つかりません');
    });

    it('storageService.getSignedUrl()に正しいパラメータを渡す', async () => {
      const mockMetadata = {
        fileId: 'file_123',
        fileName: mockFileName,
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/${mockFileName}`,
        fileSize: 15360,
        contentType: 'application/xml',
        lastModified: new Date('2026-01-19T10:00:00Z'),
        organizationId: mockOrganizationPrefix,
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
        mockOrganizationPrefix,
        mockMetadata.filePath,
        3600
      );
    });

    it('ダウンロード履歴をログに記録する', async () => {
      const mockMetadata = {
        fileId: 'file_123',
        fileName: mockFileName,
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/${mockFileName}`,
        fileSize: 15360,
        contentType: 'application/xml',
        lastModified: new Date('2026-01-19T10:00:00Z'),
        organizationId: mockOrganizationPrefix,
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(logDownloadHistory).toHaveBeenCalledWith({
        userId: mockUserId,
        organizationId: mockOrganizationPrefix,
        projectId: mockProjectName,
        fileName: mockFileName,
      });
    });

    it('URLエンコードされたファイル名をデコードして処理する', async () => {
      const encodedFileName = encodeURIComponent('テストファイル.maiml');

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue({
        fileId: 'file_123',
        fileName: 'テストファイル.maiml',
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/テストファイル.maiml`,
        fileSize: 1024,
        contentType: 'application/xml',
        lastModified: new Date(),
        organizationId: mockOrganizationPrefix,
      });

      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        encodedFileName,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockRepository.getFileMetadata).toHaveBeenCalledWith(
        mockOrganizationPrefix,
        mockProjectName,
        'テストファイル.maiml'
      );
    });

    it('organization_prefixを含まないファイルパスを拒否する', async () => {
      const mockMetadata = {
        fileId: 'file_123',
        fileName: mockFileName,
        filePath: `projects/${mockProjectName}/${mockFileName}`,
        fileSize: 15360,
        contentType: 'application/xml',
        lastModified: new Date('2026-01-19T10:00:00Z'),
        organizationId: mockOrganizationPrefix,
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('不正なファイルパス');
    });

    it('複数のファイル種別（MAIML、CSV、JSON）をサポートする', async () => {
      const fileTypes = [
        { fileName: 'experiment.maiml', contentType: 'application/xml' },
        { fileName: 'data.csv', contentType: 'text/csv' },
        { fileName: 'results.json', contentType: 'application/json' },
      ];

      for (const fileType of fileTypes) {
        mockRepository.getFileMetadata = jest.fn().mockResolvedValue({
          fileId: 'file_123',
          fileName: fileType.fileName,
          filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/${fileType.fileName}`,
          fileSize: 1024,
          contentType: fileType.contentType,
          lastModified: new Date(),
          organizationId: mockOrganizationPrefix,
        });

        mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

        const result = await service.downloadFile(
          mockOrganizationPrefix,
          mockProjectName,
          fileType.fileName,
          mockUserId
        );

        expect(result.success).toBe(true);
        expect(result.data?.contentType).toBe(fileType.contentType);
      }
    });

    it('アーカイブファイルのダウンロードをサポートする', async () => {
      const archiveFileName = 'sample_project_v1.maiml';
      const mockMetadata = {
        fileId: 'file_archive_123',
        fileName: archiveFileName,
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/archive/${archiveFileName}`,
        fileSize: 14200,
        contentType: 'application/xml',
        lastModified: new Date('2026-01-18T10:00:00Z'),
        organizationId: mockOrganizationPrefix,
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        archiveFileName,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.filePath).toContain('archive');
    });

    it('storageServiceエラー時はStorageErrorを返す', async () => {
      const mockMetadata = {
        fileId: 'file_123',
        fileName: mockFileName,
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/${mockFileName}`,
        fileSize: 15360,
        contentType: 'application/xml',
        lastModified: new Date(),
        organizationId: mockOrganizationPrefix,
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.getSignedUrl.mockRejectedValue(new Error('S3 connection failed'));

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
      expect(result.error?.message).toContain('ファイルダウンロードに失敗');
    });

    it('有効期限が正しく設定される（3600秒）', async () => {
      const mockMetadata = {
        fileId: 'file_123',
        fileName: mockFileName,
        filePath: `${mockOrganizationPrefix}/projects/${mockProjectName}/${mockFileName}`,
        fileSize: 15360,
        contentType: 'application/xml',
        lastModified: new Date(),
        organizationId: mockOrganizationPrefix,
      };

      mockRepository.getFileMetadata = jest.fn().mockResolvedValue(mockMetadata);
      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        mockFileName,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.expiresInSeconds).toBe(3600);
      expect(result.data?.expiresAt).toBeInstanceOf(Date);

      const now = new Date();
      const expiresAt = result.data!.expiresAt;
      const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000;
      expect(diffSeconds).toBeGreaterThan(3590);
      expect(diffSeconds).toBeLessThan(3610);
    });

    it('空のファイル名を拒否する', async () => {
      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        '',
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('非常に長いファイル名を拒否する', async () => {
      const longFileName = 'a'.repeat(300) + '.maiml';

      const result = await service.downloadFile(
        mockOrganizationPrefix,
        mockProjectName,
        longFileName,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
