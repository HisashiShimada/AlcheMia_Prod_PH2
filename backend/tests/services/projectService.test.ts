/**
 * ProjectService ユニットテスト
 * 
 * @description プロジェクト一覧取得のビジネスロジックテスト
 * Task: 1.1 データベースクエリ機能の実装
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

// データベースプールをモック
jest.mock('../../src/database/db');

// storageServiceをモック
jest.mock('../../src/services/storageService', () => ({
  getStorageService: jest.fn(),
}));

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // 各テスト前にモックをリセット
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery
    });

    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    const organizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
    const defaultOptions = {
      page: 1,
      limit: 20,
      includeCompleted: false
    };

    it('should retrieve project list with organization_id filter', async () => {
      // Arrange
      const mockProjects = [
        {
          organization_id: organizationId,
          project_id: 'b1234567-89ab-cdef-0123-456789abcdef',
          project_name: 'Sample Project',
          description: 'Test project',
          department_id: null,
          owner_user_id: 'd3456789-abcd-ef01-2345-6789abcdef01',
          project_status: 1,
          project_maiml_flg: true,
          checkout_status: 0,
          create_at: new Date('2026-01-05T10:30:00Z'),
          task_count: '3'
        }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects }) // プロジェクト一覧
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }); // 総件数

      // Act
      const result = await projectService.list(organizationId, defaultOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockQuery).toHaveBeenCalledTimes(2);
      
      // organization_idがパラメータに含まれているか確認
      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[1]).toContain(organizationId);
    });

    it('should exclude completed projects by default (project_status=4)', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await projectService.list(organizationId, defaultOptions);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const query = queryCall[0];
      
      // project_status != 4 のフィルタが含まれているか確認
      expect(query).toContain('project_status');
    });

    it('should include completed projects when includeCompleted=true', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await projectService.list(organizationId, {
        ...defaultOptions,
        includeCompleted: true
      });

      // Assert
      expect(mockQuery).toHaveBeenCalled();
      // includeCompleted=true の場合、フィルタ条件が変わる
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain(true);
    });

    it('should use parameterized queries for SQL injection protection', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await projectService.list(organizationId, defaultOptions);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const query = queryCall[0];
      const params = queryCall[1];

      // プレースホルダー ($1, $2, ...) が使用されているか
      expect(query).toMatch(/\$\d+/);
      // パラメータ配列が存在するか
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBeGreaterThan(0);
    });

    it('should LEFT JOIN with project_task_detail to get task count', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await projectService.list(organizationId, defaultOptions);

      // Assert
      const queryCall = mockQuery.mock.calls[0];
      const query = queryCall[0].toLowerCase();

      // LEFT JOINが含まれているか
      expect(query).toContain('left join');
      // project_task_detailテーブルが参照されているか
      expect(query).toContain('project_task_detail');
      // COUNTが含まれているか（タスク数集計）
      expect(query).toContain('count');
    });

    it('should return error when database query fails', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await projectService.list(organizationId, defaultOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
    });

    it('should calculate pagination correctly', async () => {
      // Arrange
      const mockProjects = [
        {
          organization_id: organizationId,
          project_id: 'proj1',
          project_name: 'Project 1',
          description: null,
          department_id: null,
          owner_user_id: 'user1',
          project_status: 1,
          project_maiml_flg: false,
          checkout_status: 0,
          create_at: new Date(),
          task_count: '0'
        }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: [{ total: '25' }] });

      // Act
      const result = await projectService.list(organizationId, {
        page: 2,
        limit: 10,
        includeCompleted: false
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.pagination).toEqual({
          page: 2,
          limit: 10,
          totalItems: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true
        });
      }
    });
  });

  describe('getProjectMaiml', () => {
    const organizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
    const organizationPrefix = 'maiml_lab_001';
    const projectId = 'b1234567-89ab-cdef-0123-456789abcdef';
    const projectName = 'Sample Project';
    
    let mockDownloadFile: jest.Mock;
    let mockGetFileMetadata: jest.Mock;
    let mockStorageService: any;
    
    beforeEach(() => {
      // storageServiceのモックをセットアップ
      mockDownloadFile = jest.fn();
      mockGetFileMetadata = jest.fn();
      
      mockStorageService = {
        downloadFile: mockDownloadFile,
        getFileMetadata: mockGetFileMetadata,
      };
      
      const { getStorageService } = require('../../src/services/storageService');
      (getStorageService as jest.Mock).mockReturnValue(mockStorageService);
    });

    it('should return RESOURCE_NOT_FOUND when organization does not exist', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] }); // organization_prefix取得

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toBe('組織情報が見つかりません');
    });

    it('should return RESOURCE_NOT_FOUND when project does not exist', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] }) // organization_prefix取得
        .mockResolvedValueOnce({ rows: [] }); // プロジェクト存在確認

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toBe('プロジェクトが見つかりません');
    });

    it('should retrieve organization_prefix from database', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[1]).toContain(organizationId);
      // organization_prefix取得クエリが実行されたことを確認
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should apply organization_id filter in database query', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      const secondCall = mockQuery.mock.calls[1];
      const params = secondCall[1];
      expect(params).toContain(organizationId);
      expect(params).toContain(projectId);
    });

    it('should use parameterized queries for SQL injection protection', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      const firstCall = mockQuery.mock.calls[0];
      const query1 = firstCall[0];
      const params1 = firstCall[1];

      // プレースホルダー使用確認
      expect(query1).toMatch(/\$\d+/);
      expect(Array.isArray(params1)).toBe(true);
    });

    it('should return INTERNAL_ERROR when database query fails', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(result.error?.message).toBe('データベースエラーが発生しました');
    });

    it('should return FILE_NOT_FOUND when S3 file does not exist', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, project_name: projectName }] });
      
      // S3ファイル不在エラーをシミュレート
      const notFoundError: any = new Error('NotFound');
      notFoundError.name = 'NotFound';
      notFoundError.$metadata = { httpStatusCode: 404 };
      mockDownloadFile.mockRejectedValueOnce(notFoundError);

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
      expect(result.error?.message).toBe('MAIMLファイルが見つかりません');
      expect(mockDownloadFile).toHaveBeenCalledWith(
        organizationPrefix,
        `projects/${projectName}/${projectName}.maiml`
      );
    });

    it('should return INTERNAL_ERROR when S3 connection fails', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, project_name: projectName }] });
      
      // S3接続エラーをシミュレート
      const connectionError = new Error('S3 connection timeout');
      mockDownloadFile.mockRejectedValueOnce(connectionError);

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_S3_ERROR');
      expect(result.error?.message).toBe('ファイル取得に失敗しました');
    });

    it('should return MAIMLFileData with ServiceResult on success', async () => {
      // Arrange
      const xmlContent = '<?xml version="1.0"?><MAIML><Method id="method1"></Method></MAIML>';
      const fileBuffer = Buffer.from(xmlContent, 'utf-8');
      const fileSize = fileBuffer.length;
      const fileKey = `org_${organizationPrefix}/projects/${projectName}/${projectName}.maiml`;
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, project_name: projectName }] });
      
      mockDownloadFile.mockResolvedValueOnce(fileBuffer);
      mockGetFileMetadata.mockResolvedValueOnce({
        key: fileKey,
        size: fileSize,
        lastModified: new Date('2026-02-17T00:00:00Z'),
      });

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.file_id).toBe(fileKey);
      expect(result.data?.project_id).toBe(projectId);
      expect(result.data?.project_name).toBe(projectName);
      expect(result.data?.file_name).toBe(`${projectName}.maiml`);
      expect(result.data?.file_path).toBe(`projects/${projectName}/${projectName}.maiml`);
      expect(result.data?.file_size).toBe(fileSize);
      expect(result.data?.content).toBe(xmlContent);
      expect(result.data?.content_type).toBe('application/xml');
      expect(result.data?.loaded_at).toBeDefined();
    });

    it('should correctly convert Buffer to UTF-8 string', async () => {
      // Arrange
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><MAIML><日本語テスト/></MAIML>';
      const fileBuffer = Buffer.from(xmlContent, 'utf-8');
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, project_name: projectName }] });
      
      mockDownloadFile.mockResolvedValueOnce(fileBuffer);
      mockGetFileMetadata.mockResolvedValueOnce({
        key: `org_${organizationPrefix}/projects/${projectName}/${projectName}.maiml`,
        size: fileBuffer.length,
        lastModified: new Date(),
      });

      // Act
      const result = await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(xmlContent);
      // UTF-8エンコーディングで日本語が正しく変換されることを確認
      expect(result.data?.content).toContain('日本語テスト');
    });

    it('should verify organization_id filter is applied in all queries', async () => {
      // Arrange
      const xmlContent = '<?xml version="1.0"?><MAIML></MAIML>';
      const fileBuffer = Buffer.from(xmlContent, 'utf-8');
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: organizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, project_name: projectName }] });
      
      mockDownloadFile.mockResolvedValueOnce(fileBuffer);
      mockGetFileMetadata.mockResolvedValueOnce({
        key: `org_${organizationPrefix}/projects/${projectName}/${projectName}.maiml`,
        size: fileBuffer.length,
        lastModified: new Date(),
      });

      // Act
      await projectService.getProjectMaiml(
        organizationId,
        projectId
      );

      // Assert
      // 全てのDBクエリにorganization_idフィルタが含まれることを確認
      expect(mockQuery).toHaveBeenCalledTimes(2);
      
      // 1つ目のクエリ（organization_prefix取得）
      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[1]).toContain(organizationId);
      
      // 2つ目のクエリ（プロジェクト取得）
      const secondCall = mockQuery.mock.calls[1];
      expect(secondCall[1]).toContain(organizationId);
      expect(secondCall[1]).toContain(projectId);
    });
  });
});
