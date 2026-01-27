/**
 * ProjectService.getProjectFiles Tests
 * 
 * TDD: Task 2.1 - Service Layer Tests
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';
import { getStorageService } from '../../src/services/storageService';

jest.mock('../../src/database/db');
jest.mock('../../src/services/storageService');

describe('ProjectService.getProjectFiles', () => {
  let projectService: ProjectService;
  let mockQuery: jest.Mock;
  let mockListFiles: jest.Mock;
  let mockGetSignedUrl: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();
    mockQuery = jest.fn();
    mockListFiles = jest.fn();
    mockGetSignedUrl = jest.fn();

    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    (getStorageService as jest.Mock).mockReturnValue({
      listFiles: mockListFiles,
      getSignedUrl: mockGetSignedUrl,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('プロジェクトが存在する場合、ファイル一覧を返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = 'proj-456';
      const organizationPrefix = 'test_org';
      const includeArchive = false;

      // プロジェクト存在確認のモック
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_name: 'Test Project' }],
      });

      // S3ファイルリストのモック
      mockListFiles.mockResolvedValueOnce([
        {
          key: 'org_test_org/projects/Test Project/test.maiml',
          size: 1024,
          lastModified: new Date('2024-01-01T00:00:00Z'),
        },
      ]);

      // 署名付きURLのモック
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

      // Act
      const result = await projectService.getProjectFiles(
        organizationId,
        projectId,
        organizationPrefix,
        includeArchive
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.files).toHaveLength(1);
      expect(result.data?.files[0].name).toBe('test.maiml');
      expect(result.data?.files[0].signedUrl).toBe('https://signed-url.example.com');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId, projectId]
      );
    });

    it('include_archive=true の場合、アーカイブファイルも取得する', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = 'proj-456';
      const organizationPrefix = 'test_org';
      const includeArchive = true;

      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_name: 'Test Project' }],
      });

      // 現在のファイル
      mockListFiles.mockResolvedValueOnce([
        {
          key: 'org_test_org/projects/Test Project/test.maiml',
          size: 1024,
          lastModified: new Date('2024-01-01T00:00:00Z'),
        },
      ]);

      // アーカイブファイル
      mockListFiles.mockResolvedValueOnce([
        {
          key: 'org_test_org/projects/Test Project/archive/test_v1.maiml',
          size: 512,
          lastModified: new Date('2023-12-01T00:00:00Z'),
        },
      ]);

      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

      // Act
      const result = await projectService.getProjectFiles(
        organizationId,
        projectId,
        organizationPrefix,
        includeArchive
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.files).toHaveLength(1);
      expect(result.data?.archiveFiles).toHaveLength(1);
      expect(result.data?.archiveFiles[0].version).toBe(1);
      expect(mockListFiles).toHaveBeenCalledTimes(2);
    });

    it('S3エラー時は空配列を返す（グレースフル処理）', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = 'proj-456';
      const organizationPrefix = 'test_org';
      const includeArchive = false;

      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_name: 'Test Project' }],
      });

      // S3エラーをシミュレート
      mockListFiles.mockRejectedValueOnce(new Error('S3 Error'));

      // Act
      const result = await projectService.getProjectFiles(
        organizationId,
        projectId,
        organizationPrefix,
        includeArchive
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.files).toEqual([]);
      expect(result.data?.archiveFiles).toEqual([]);
    });
  });

  describe('異常系', () => {
    it('プロジェクトが存在しない場合、RESOURCE_NOT_FOUNDエラーを返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = 'proj-456';
      const organizationPrefix = 'test_org';
      const includeArchive = false;

      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await projectService.getProjectFiles(
        organizationId,
        projectId,
        organizationPrefix,
        includeArchive
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('プロジェクトが見つかりません');
    });

    it('データベースエラー時、SYSTEM_DATABASE_ERRORを返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = 'proj-456';
      const organizationPrefix = 'test_org';
      const includeArchive = false;

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Act
      const result = await projectService.getProjectFiles(
        organizationId,
        projectId,
        organizationPrefix,
        includeArchive
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
    });
  });
});