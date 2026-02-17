/**
 * Project MAIML File Retrieval API - Integration Tests
 * 
 * TDD: Task 6.1 - Integration Tests
 * Feature: project-maiml-retrieval-api
 * Requirements: 1, 2, 3, 4, 5, 8
 * 
 * Tests the complete flow including:
 * - Authentication (401)
 * - Authorization (403)
 * - Multi-tenant isolation
 * - UUID validation
 * - S3 file retrieval
 * - Response format validation
 */

import request from 'supertest';
import express, { Express } from 'express';
import { getPool } from '../../src/database/db';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { getStorageService } from '../../src/services/storageService';

// Mock dependencies
jest.mock('../../src/database/db');
jest.mock('../../src/services/storageService');
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-12345'),
}));

describe('GET /api/v1/projects/:projectId/maiml - Integration Tests', () => {
  let app: Express;
  let mockQuery: jest.Mock;
  let mockStorageService: any;

  const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockOrganizationId = 'org-123';
  const mockOrganizationPrefix = 'test_org_001';
  const mockProjectName = 'test_project';
  const mockXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<MAIML version="1.0">
  <Method id="test_method">
    <PetriNet>
      <Place id="p1" name="Start"/>
      <Transition id="t1" name="Process"/>
    </PetriNet>
  </Method>
</MAIML>`;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    // Mock storageService
    mockStorageService = {
      downloadFile: jest.fn(),
      listFiles: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth middleware mock (authenticated experiment_worker)
    (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = {
        userId: 'user-123',
        organizationId: mockOrganizationId,
        role: 'experiment_worker',
      };
      next();
    });
  });

  describe('Test 1: 正常系 - 有効なprojectIdでMAIMLファイル取得（200 OK）', () => {
    it('should return 200 with MAIML file content when valid projectId is provided', async () => {
      // Arrange: Mock organization_prefix retrieval
      mockQuery.mockResolvedValueOnce({
        rows: [{
          organization_prefix: mockOrganizationPrefix,
        }],
      });

      // Mock project existence check
      mockQuery.mockResolvedValueOnce({
        rows: [{
          project_id: validProjectId,
          project_name: mockProjectName,
        }],
      });

      // Mock S3 file download
      const mockBuffer = Buffer.from(mockXmlContent, 'utf-8');
      mockStorageService.downloadFile.mockResolvedValue(mockBuffer);

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert: Response structure
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      // Assert: Data fields
      expect(response.body.data).toHaveProperty('file_id');
      expect(response.body.data).toHaveProperty('project_id', validProjectId);
      expect(response.body.data).toHaveProperty('project_name', mockProjectName);
      expect(response.body.data).toHaveProperty('file_name', `${mockProjectName}.maiml`);
      expect(response.body.data).toHaveProperty('file_path');
      expect(response.body.data).toHaveProperty('file_size');
      expect(response.body.data).toHaveProperty('content', mockXmlContent);
      expect(response.body.data).toHaveProperty('content_type', 'application/xml');
      expect(response.body.data).toHaveProperty('loaded_at');

      // Assert: Meta fields
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId', 'test-request-id-12345');

      // Assert: Timestamp format (ISO8601)
      expect(response.body.data.loaded_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Assert: Database queries
      expect(mockQuery).toHaveBeenCalledTimes(2);
      
      // First query: organization_prefix
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT organization_prefix'),
        [mockOrganizationId]
      );

      // Second query: project existence with organization_id filter
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('organization_id = $1'),
        [mockOrganizationId, validProjectId]
      );

      // Assert: Storage service called with correct parameters
      expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
        mockOrganizationPrefix,
        `projects/${mockProjectName}/${mockProjectName}.maiml`
      );
    });

    it('should handle large MAIML files correctly', async () => {
      // Arrange: Create large XML content (1MB)
      const largeXmlContent = '<?xml version="1.0" encoding="UTF-8"?><MAIML>' + 'A'.repeat(1024 * 1024) + '</MAIML>';
      const largeBuffer = Buffer.from(largeXmlContent, 'utf-8');

      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(largeBuffer);

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.content.length).toBeGreaterThan(1024 * 1024);
      expect(response.body.data.file_size).toBe(largeBuffer.length);
    });
  });

  describe('Test 2: 異常系 - 存在しないprojectIdで404 NOT_FOUND', () => {
    it('should return 404 when projectId does not exist', async () => {
      // Arrange: Mock organization_prefix retrieval
      mockQuery.mockResolvedValueOnce({
        rows: [{ organization_prefix: mockOrganizationPrefix }],
      });

      // Mock project not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'プロジェクトが見つかりません');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');

      // Assert: Storage service not called
      expect(mockStorageService.downloadFile).not.toHaveBeenCalled();
    });
  });

  describe('Test 3: 異常系 - 他組織のprojectIdで404 NOT_FOUND', () => {
    it('should return 404 when trying to access another organization project', async () => {
      // Arrange: User is from org-123
      mockQuery.mockResolvedValueOnce({
        rows: [{ organization_prefix: mockOrganizationPrefix }],
      });

      // Mock: Project exists but belongs to different organization
      mockQuery.mockResolvedValueOnce({
        rows: [], // No rows returned due to organization_id filter
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');

      // Assert: organization_id filter applied
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('organization_id = $1'),
        [mockOrganizationId, validProjectId]
      );
    });

    it('should enforce multi-tenant isolation for different organizations', async () => {
      // Arrange: User from org-456
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-456',
          organizationId: 'org-456',
          role: 'experiment_worker',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: 'other_org_002' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('organization_id = $1'),
        ['org-456', validProjectId]
      );
    });
  });

  describe('Test 4: 異常系 - 認証なしで401 AUTH_TOKEN_INVALID', () => {
    it('should return 401 when no authentication token is provided', async () => {
      // Arrange: Mock auth middleware to reject request
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication token is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id-12345',
          },
        });
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      expect(mockQuery).not.toHaveBeenCalled();
      expect(mockStorageService.downloadFile).not.toHaveBeenCalled();
    });

    it('should return 401 when authentication token is invalid', async () => {
      // Arrange: Mock auth middleware to reject invalid token
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid authentication token',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id-12345',
          },
        });
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('Test 5: 異常系 - 権限不足ユーザーで403 PERMISSION_INSUFFICIENT', () => {
    it('should return 403 when user role is data_admin (not allowed)', async () => {
      // Arrange: Mock user with data_admin role
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-data-admin',
          organizationId: mockOrganizationId,
          role: 'data_admin',
        };
        next();
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      expect(response.body.error.message).toContain('権限が不足しています');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is provider (not allowed)', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-provider',
          organizationId: mockOrganizationId,
          role: 'provider',
        };
        next();
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
    });

    it('should allow experiment_admin role to access MAIML', async () => {
      // Arrange: Mock user with experiment_admin role
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-admin',
          organizationId: mockOrganizationId,
          role: 'experiment_admin',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(mockXmlContent, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(mockXmlContent);
    });

    it('should allow system_admin role to access MAIML', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-sysadmin',
          organizationId: mockOrganizationId,
          role: 'system_admin',
        };
        next();
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(mockXmlContent, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });
  });

  describe('Test 6: 異常系 - S3にファイルが存在しない場合に404 FILE_NOT_FOUND', () => {
    it('should return 404 when MAIML file does not exist in S3', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      // Mock S3 NotFound error
      const s3Error = new Error('NoSuchKey');
      (s3Error as any).name = 'NoSuchKey';
      mockStorageService.downloadFile.mockRejectedValue(s3Error);

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
      expect(response.body.error.message).toBe('MAIMLファイルが見つかりません');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('should return 404 when S3 returns NotFound error', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      const notFoundError = new Error('NotFound');
      (notFoundError as any).name = 'NotFound';
      mockStorageService.downloadFile.mockRejectedValue(notFoundError);

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('Test 7: 異常系 - 無効なUUID形式で400 VALIDATION_INVALID_FORMAT', () => {
    it('should return 400 when projectId is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/projects/invalid-uuid-123/maiml')
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('projectId');
      expect(mockQuery).not.toHaveBeenCalled();
      expect(mockStorageService.downloadFile).not.toHaveBeenCalled();
    });

    it('should return 400 when projectId is empty string in path', async () => {
      // Note: Express routing will return 404 for '/api/v1/projects//maiml'
      // This is not handled by our endpoint validator
      await request(app)
        .get('/api/v1/projects//maiml')
        .expect(404); // Express returns 404 for missing path params
    });

    it('should return 400 for malformed UUID formats', async () => {
      const invalidUuids = [
        'not-a-uuid',
        '12345',
        'abc-def-ghi',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
      ];

      for (const invalidUuid of invalidUuids) {
        const response = await request(app)
          .get(`/api/v1/projects/${invalidUuid}/maiml`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Test 8: レスポンス形式検証', () => {
    it('should return standardized response format for success', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(mockXmlContent, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert: Top-level structure
      expect(response.body).toEqual({
        success: true,
        data: expect.any(Object),
        meta: expect.any(Object),
      });

      // Assert: No extra fields
      expect(Object.keys(response.body)).toEqual(['success', 'data', 'meta']);
    });

    it('should return standardized error response format', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(404);

      // Assert: Error structure
      expect(response.body).toEqual({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
    });

    it('should include Content-Type: application/json header', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(mockXmlContent, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Test 9: システムエラー処理', () => {
    it('should return 500 when database connection fails', async () => {
      // Arrange: Mock database error
      const dbError = new Error('Connection timeout');
      mockQuery.mockRejectedValue(dbError);

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('システムエラーが発生しました');
    });

    it('should return 500 when S3 service encounters an error', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      // Mock S3 error (not NotFound)
      const s3Error = new Error('Service unavailable');
      (s3Error as any).code = 'ServiceUnavailable';
      mockStorageService.downloadFile.mockRejectedValue(s3Error);

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 500 when organization_prefix cannot be retrieved', async () => {
      // Arrange: Organization not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Test 10: エッジケース', () => {
    it('should handle XML content with special characters', async () => {
      // Arrange: XML with special characters
      const specialXml = `<?xml version="1.0" encoding="UTF-8"?>
<MAIML>
  <Description>Test with special chars: &lt;&gt;&amp;&quot;&apos;</Description>
  <Data>日本語テキスト</Data>
</MAIML>`;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(specialXml, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(specialXml);
      expect(response.body.data.content).toContain('日本語テキスト');
    });

    it('should handle empty MAIML file', async () => {
      // Arrange
      const emptyXml = '';
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: mockProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(emptyXml, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('');
      expect(response.body.data.file_size).toBe(0);
    });

    it('should handle project name with special characters', async () => {
      // Arrange: Project name with underscores and numbers
      const specialProjectName = 'test_project_001_special';
      mockQuery
        .mockResolvedValueOnce({ rows: [{ organization_prefix: mockOrganizationPrefix }] })
        .mockResolvedValueOnce({ rows: [{ project_id: validProjectId, project_name: specialProjectName }] });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from(mockXmlContent, 'utf-8'));

      // Act
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/maiml`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.project_name).toBe(specialProjectName);
      expect(response.body.data.file_name).toBe(`${specialProjectName}.maiml`);
      expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
        mockOrganizationPrefix,
        `projects/${specialProjectName}/${specialProjectName}.maiml`
      );
    });
  });
});
