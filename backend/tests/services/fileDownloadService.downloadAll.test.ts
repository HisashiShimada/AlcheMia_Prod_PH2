/**
 * プロジェクト一括ダウンロード機能のテスト
 * 
 * Task 3.3: プロジェクト一括ダウンロード用署名付きURLリスト生成機能の実装
 * Requirements: 1, 4, 8, 12
 */

import { FileDownloadService } from '../../src/services/fileDownloadService';
import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';
import { getStorageService } from '../../src/services/storageService';
import { ProjectAccessValidator } from '../../src/services/projectAccessValidator';
import { logBulkDownloadHistory } from '../../src/utils/downloadLogger';

// モック
jest.mock('../../src/repositories/fileMetadataRepository');
jest.mock('../../src/services/storageService');
jest.mock('../../src/services/projectAccessValidator');
jest.mock('../../src/utils/downloadLogger');

describe('FileDownloadService - downloadAllFiles', () => {
  let service: FileDownloadService;
  let mockRepository: jest.Mocked<FileMetadataRepository>;
  let mockStorageService: any;
  let mockAccessValidator: jest.Mocked<ProjectAccessValidator>;

  beforeEach(() => {
    mockRepository = new FileMetadataRepository() as jest.Mocked<FileMetadataRepository>;
    mockStorageService = {
      getSignedUrl: jest.fn(),
    };
    mockAccessValidator = new ProjectAccessValidator() as jest.Mocked<ProjectAccessValidator>;

    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);

    service = new FileDownloadService(
      mockRepository,
      mockAccessValidator
    );

    jest.clearAllMocks();
  });

  describe('正常系', () => {
    const mockUserId = 'user_123';
    const mockProjectId = 'project_456';
    const mockOrganizationId = 'org_maiml_lab_001';
    const mockOrganizationPrefix = 'maiml_lab_001';

    it('プロジェクト内全ファイルの署名付きURLリストを生成する', async () => {
      // プロジェクトアクセス権限検証
      mockAccessValidator.validateAccess.mockResolvedValue({
        hasAccess: true,
        userRole: 'manager',
        projectId: mockProjectId,
        organizationId: mockOrganizationId,
      });

      // ファイルメタデータ一覧
      const mockFiles = [
        {
          fileId: 'file_1',
          fileName: 'project.maiml',
          filePath: 'org_maiml_lab_001/projects/test_project/project.maiml',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2024-01-01'),
          organizationId: mockOrganizationId,
        },
        {
          fileId: 'file_2',
          fileName: 'project_v1.maiml',
          filePath: 'org_maiml_lab_001/projects/test_project/archive/project_v1.maiml',
          fileSize: 2048,
          contentType: 'application/xml',
          lastModified: new Date('2024-01-02'),
          organizationId: mockOrganizationId,
        },
        {
          fileId: 'file_3',
          fileName: 'data.csv',
          filePath: 'org_maiml_lab_001/projects/test_project/attachments/data.csv',
          fileSize: 512,
          contentType: 'text/csv',
          lastModified: new Date('2024-01-03'),
          organizationId: mockOrganizationId,
        },
      ];

      mockRepository.listProjectFiles.mockResolvedValue({
        files: mockFiles,
        totalCount: 3,
      });

      // 署名付きURL生成
      mockStorageService.getSignedUrl
        .mockResolvedValueOnce('https://s3.example.com/signed-url-1')
        .mockResolvedValueOnce('https://s3.example.com/signed-url-2')
        .mockResolvedValueOnce('https://s3.example.com/signed-url-3');

      const result = await service.downloadAllFiles(
        mockUserId,
        mockProjectId,
        mockOrganizationId,
        mockOrganizationPrefix,
        1,
        20
      );

      // 結果の検証
      expect(result.files).toHaveLength(3);
      expect(result.totalFiles).toBe(3);
      expect(result.totalSize).toBe(3584); // 1024 + 2048 + 512
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);

      // ファイルURLの検証
      expect(result.files[0].fileName).toBe('project.maiml');
      expect(result.files[0].downloadUrl).toBe('https://s3.example.com/signed-url-1');
      expect(result.files[0].fileSize).toBe(1024);
      expect(result.files[0].contentType).toBe('application/xml');

      // プロジェクトアクセス権限検証が呼ばれたことを確認
      expect(mockAccessValidator.validateAccess).toHaveBeenCalledWith(
        mockUserId,
        mockProjectId,
        mockOrganizationId
      );

      // ファイル一覧取得が呼ばれたことを確認
      expect(mockRepository.listProjectFiles).toHaveBeenCalledWith(
        mockOrganizationId,
        mockProjectId,
        1,
        20
      );

      // 署名付きURL生成が3回呼ばれたことを確認
      expect(mockStorageService.getSignedUrl).toHaveBeenCalledTimes(3);

      // 一括ダウンロード履歴ログが記録されたことを確認
      expect(logBulkDownloadHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrganizationId,
          projectId: mockProjectId,
          fileCount: 3,
          totalSize: 3584,
        })
      );
    });

    it('空のプロジェクトの場合は空のリストを返す', async () => {
      mockAccessValidator.validateAccess.mockResolvedValue({
        hasAccess: true,
        userRole: 'manager',
        projectId: mockProjectId,
        organizationId: mockOrganizationId,
      });

      mockRepository.listProjectFiles.mockResolvedValue({
        files: [],
        totalCount: 0,
      });

      const result = await service.downloadAllFiles(
        mockUserId,
        mockProjectId,
        mockOrganizationId,
        mockOrganizationPrefix,
        1,
        20
      );

      expect(result.files).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.totalPages).toBe(0);

      // 署名付きURL生成が呼ばれないことを確認
      expect(mockStorageService.getSignedUrl).not.toHaveBeenCalled();
    });

    it('ページネーションが正しく機能する', async () => {
      mockAccessValidator.validateAccess.mockResolvedValue({
        hasAccess: true,
        userRole: 'manager',
        projectId: mockProjectId,
        organizationId: mockOrganizationId,
      });

      const mockFiles = Array.from({ length: 10 }, (_, i) => ({
        fileId: `file_${i + 1}`,
        fileName: `file_${i + 1}.txt`,
        filePath: `org_maiml_lab_001/projects/test_project/file_${i + 1}.txt`,
        fileSize: 100,
        contentType: 'text/plain',
        lastModified: new Date(),
        organizationId: mockOrganizationId,
      }));

      mockRepository.listProjectFiles.mockResolvedValue({
        files: mockFiles,
        totalCount: 50,
      });

      mockStorageService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const result = await service.downloadAllFiles(
        mockUserId,
        mockProjectId,
        mockOrganizationId,
        mockOrganizationPrefix,
        2,
        10
      );

      expect(result.files).toHaveLength(10);
      expect(result.totalFiles).toBe(50);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5); // Math.ceil(50 / 10) = 5

      expect(mockRepository.listProjectFiles).toHaveBeenCalledWith(
        mockOrganizationId,
        mockProjectId,
        2,
        10
      );
    });

    it('複数のファイルタイプ（MAIML、アーカイブ、添付）を正しく処理する', async () => {
      mockAccessValidator.validateAccess.mockResolvedValue({
        hasAccess: true,
        userRole: 'manager',
        projectId: mockProjectId,
        organizationId: mockOrganizationId,
      });

      const mockFiles = [
        {
          fileId: 'file_current',
          fileName: 'current.maiml',
          filePath: 'org_maiml_lab_001/projects/test/current.maiml',
          fileSize: 1000,
          contentType: 'application/xml',
          lastModified: new Date(),
          organizationId: mockOrganizationId,
        },
        {
          fileId: 'file_archive',
          fileName: 'archive_v1.maiml',
          filePath: 'org_maiml_lab_001/projects/test/archive/archive_v1.maiml',
          fileSize: 2000,
          contentType: 'application/xml',
          lastModified: new Date(),
          organizationId: mockOrganizationId,
        },
        {
          fileId: 'file_attachment',
          fileName: 'attachment.pdf',
          filePath: 'org_maiml_lab_001/projects/test/attachments/attachment.pdf',
          fileSize: 3000,
          contentType: 'application/pdf',
          lastModified: new Date(),
          organizationId: mockOrganizationId,
        },
      ];

      mockRepository.listProjectFiles.mockResolvedValue({
        files: mockFiles,
        totalCount: 3,
      });

      mockStorageService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const result = await service.downloadAllFiles(
        mockUserId,
        mockProjectId,
        mockOrganizationId,
        mockOrganizationPrefix,
        1,
        20
      );

      expect(result.files).toHaveLength(3);
      expect(result.totalSize).toBe(6000);

      // 各ファイルタイプが含まれることを確認
      const fileNames = result.files.map(f => f.fileName);
      expect(fileNames).toContain('current.maiml');
      expect(fileNames).toContain('archive_v1.maiml');
      expect(fileNames).toContain('attachment.pdf');
    });
  });

  describe('異常系', () => {
    const mockUserId = 'user_123';
    const mockProjectId = 'project_456';
    const mockOrganizationId = 'org_maiml_lab_001';
    const mockOrganizationPrefix = 'maiml_lab_001';

    it('プロジェクトアクセス権限がない場合はエラーをスロー', async () => {
      mockAccessValidator.validateAccess.mockRejectedValue(
        new Error('このプロジェクトへのアクセス権限がありません')
      );

      await expect(
        service.downloadAllFiles(
          mockUserId,
          mockProjectId,
          mockOrganizationId,
          mockOrganizationPrefix,
          1,
          20
        )
      ).rejects.toThrow('このプロジェクトへのアクセス権限がありません');

      // ファイル一覧取得が呼ばれないことを確認
      expect(mockRepository.listProjectFiles).not.toHaveBeenCalled();
    });

    it('署名付きURL生成に失敗した場合はエラーをスロー', async () => {
      mockAccessValidator.validateAccess.mockResolvedValue({
        hasAccess: true,
        userRole: 'manager',
        projectId: mockProjectId,
        organizationId: mockOrganizationId,
      });

      mockRepository.listProjectFiles.mockResolvedValue({
        files: [
          {
            fileId: 'file_1',
            fileName: 'file.txt',
            filePath: 'org_maiml_lab_001/projects/test/file.txt',
            fileSize: 100,
            contentType: 'text/plain',
            lastModified: new Date(),
            organizationId: mockOrganizationId,
          },
        ],
        totalCount: 1,
      });

      mockStorageService.getSignedUrl.mockRejectedValue(
        new Error('Failed to generate signed URL')
      );

      await expect(
        service.downloadAllFiles(
          mockUserId,
          mockProjectId,
          mockOrganizationId,
          mockOrganizationPrefix,
          1,
          20
        )
      ).rejects.toThrow('Failed to generate signed URL');
    });

    it('無効なページ番号を拒否する', async () => {
      await expect(
        service.downloadAllFiles(
          mockUserId,
          mockProjectId,
          mockOrganizationId,
          mockOrganizationPrefix,
          0, // 無効なページ番号
          20
        )
      ).rejects.toThrow();
    });

    it('無効なlimit値を拒否する', async () => {
      await expect(
        service.downloadAllFiles(
          mockUserId,
          mockProjectId,
          mockOrganizationId,
          mockOrganizationPrefix,
          1,
          0 // 無効なlimit
        )
      ).rejects.toThrow();
    });

    it('limit値が最大値を超える場合はエラーをスロー', async () => {
      await expect(
        service.downloadAllFiles(
          mockUserId,
          mockProjectId,
          mockOrganizationId,
          mockOrganizationPrefix,
          1,
          101 // 最大値(100)を超える
        )
      ).rejects.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    const mockUserId = 'user_123';
    const mockProjectId = 'project_456';
    const mockOrganizationId = 'org_maiml_lab_001';
    const mockOrganizationPrefix = 'maiml_lab_001';

    it('100件のファイルを効率的に処理する', async () => {
      mockAccessValidator.validateAccess.mockResolvedValue({
        hasAccess: true,
        userRole: 'manager',
        projectId: mockProjectId,
        organizationId: mockOrganizationId,
      });

      const mockFiles = Array.from({ length: 100 }, (_, i) => ({
        fileId: `file_${i + 1}`,
        fileName: `file_${i + 1}.txt`,
        filePath: `org_maiml_lab_001/projects/test/file_${i + 1}.txt`,
        fileSize: 100,
        contentType: 'text/plain',
        lastModified: new Date(),
        organizationId: mockOrganizationId,
      }));

      mockRepository.listProjectFiles.mockResolvedValue({
        files: mockFiles,
        totalCount: 100,
      });

      mockStorageService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const startTime = Date.now();

      const result = await service.downloadAllFiles(
        mockUserId,
        mockProjectId,
        mockOrganizationId,
        mockOrganizationPrefix,
        1,
        100
      );

      const duration = Date.now() - startTime;

      expect(result.files).toHaveLength(100);
      expect(result.totalFiles).toBe(100);
      expect(mockStorageService.getSignedUrl).toHaveBeenCalledTimes(100);

      // パフォーマンス要件: 5秒以内（モック環境では余裕を持って達成）
      expect(duration).toBeLessThan(5000);
    });
  });
});
