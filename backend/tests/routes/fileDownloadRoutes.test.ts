/**
 * ファイルダウンロードAPI 統合テスト
 * 
 * Task 4.1: GET /api/v1/projects/:projectId/files/:fileName/download
 * Task 4.2: GET /api/v1/projects/:projectId/files/download-all
 * Requirements: 7, 9, 11, 12
 */

import request from 'supertest';
import express, { Express } from 'express';
import fileDownloadRoutes from '../../src/routes/fileDownloadRoutes';
import { FileDownloadService } from '../../src/services/fileDownloadService';
import { JwtService } from '../../src/services/jwtService';

jest.mock('../../src/services/fileDownloadService');
jest.mock('../../src/repositories/fileMetadataRepository');
jest.mock('../../src/services/projectAccessValidator');
jest.mock('uuid', () => ({ v4: () => 'test-request-id-123' }));
jest.mock('../../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({
      rows: [{ organization_name: 'Test_Org' }]
    })
  }))
}));
jest.mock('../../src/services/jwtService', () => {
  return {
    JwtService: jest.fn().mockImplementation(() => ({
      generate: jest.fn().mockResolvedValue({
        success: true,
        data: 'mock-jwt-token-123'
      }),
      verify: jest.fn().mockResolvedValue({
        success: true,
        data: {
          userId: 'user_123',
          organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
          role: 'experiment_admin',
          sessionId: 'session_123',
        }
      })
    }))
  };
});

describe('ファイルダウンロードAPI - 統合テスト', () => {
  let app: Express;
  let validToken: string;
  const validProjectId = 'b1234567-89ab-cdef-0123-456789abcdef';
  const validFileName = 'test_file.maiml';

  beforeAll(async () => {
    // Express アプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', fileDownloadRoutes);

    // 有効なJWTトークンを生成
    const jwtService = new JwtService();
    const tokenResult = await jwtService.generate(
      {
        userId: 'user_123',
        organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        sessionId: 'session_123',
        role: 'experiment_admin',
      },
      'experiment_admin'
    );
    
    if (tokenResult.success && tokenResult.data) {
      validToken = tokenResult.data;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 4.1: GET /api/v1/projects/:projectId/files/:fileName/download', () => {
    describe('正常系', () => {
      it('認証済みユーザーが有効なファイルをダウンロードできる（200 OK）', async () => {
        const mockResult = {
          fileName: validFileName,
          downloadUrl: 'https://s3.example.com/signed-url-123',
          fileSize: 1024,
          contentType: 'application/xml',
          lastModified: new Date('2024-01-01'),
        };

        (FileDownloadService.prototype.downloadFile as jest.Mock).mockResolvedValue(mockResult);

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/${validFileName}/download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.fileName).toBe(mockResult.fileName);
        expect(response.body.data.downloadUrl).toBe(mockResult.downloadUrl);
        expect(response.body.data.fileSize).toBe(mockResult.fileSize);
        expect(response.body.data.contentType).toBe(mockResult.contentType);
        expect(response.body.data.lastModified).toBe('2024-01-01T00:00:00.000Z');
        expect(response.body.meta.requestId).toBe('test-request-id-123');
      });
    });

    describe('認証エラー（401）', () => {
      it('Authorizationヘッダーなしの場合は401エラー', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/${validFileName}/download`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      });
    });

    describe('バリデーションエラー（400）', () => {
      it('projectIdが無効なUUID形式の場合は400エラー', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/invalid-uuid/files/${validFileName}/download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_INVALID_FORMAT');
      });

      it('fileNameが空の場合は400エラー', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/ /download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_REQUIRED_FIELD');
      });

      it('パストラバーサル攻撃を検出する（400エラー）', async () => {
        (FileDownloadService.prototype.downloadFile as jest.Mock).mockRejectedValue(
          new Error('パストラバーサルパターンが検出されました')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/..%2F..%2Fetc%2Fpasswd/download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('権限エラー（403）', () => {
      it('プロジェクトへのアクセス権限がない場合は403エラー', async () => {
        (FileDownloadService.prototype.downloadFile as jest.Mock).mockRejectedValue(
          new Error('このプロジェクトへのアクセス権限がありません')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/${validFileName}/download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      });
    });

    describe('リソース未検出エラー（404）', () => {
      it('ファイルが存在しない場合は404エラー', async () => {
        (FileDownloadService.prototype.downloadFile as jest.Mock).mockRejectedValue(
          new Error('ファイルが見つかりません')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/nonexistent.txt/download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });

    describe('ストレージエラー（500）', () => {
      it('署名付きURL生成に失敗した場合は500エラー', async () => {
        (FileDownloadService.prototype.downloadFile as jest.Mock).mockRejectedValue(
          new Error('署名付きURLの生成に失敗しました')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/${validFileName}/download`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('STORAGE_ERROR');
      });
    });
  });

  describe('Task 4.2: GET /api/v1/projects/:projectId/files/download-all', () => {
    describe('正常系', () => {
      it('認証済みManagerがプロジェクト全ファイルをダウンロードできる（200 OK）', async () => {
        const mockResult = {
          files: [
            {
              fileName: 'file1.maiml',
              downloadUrl: 'https://s3.example.com/signed-url-1',
              fileSize: 1024,
              contentType: 'application/xml',
              lastModified: new Date('2024-01-01'),
            },
            {
              fileName: 'file2.maiml',
              downloadUrl: 'https://s3.example.com/signed-url-2',
              fileSize: 2048,
              contentType: 'application/xml',
              lastModified: new Date('2024-01-02'),
            },
          ],
          totalFiles: 2,
          totalSize: 3072,
          page: 1,
          limit: 20,
          totalPages: 1,
        };

        (FileDownloadService.prototype.downloadAllFiles as jest.Mock).mockResolvedValue(mockResult);

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.files).toHaveLength(2);
        expect(response.body.data.totalFiles).toBe(2);
        expect(response.body.data.totalSize).toBe(3072);
      });

      it('ページネーションパラメータが正しく処理される', async () => {
        const mockResult = {
          files: [],
          totalFiles: 100,
          totalSize: 102400,
          page: 2,
          limit: 50,
          totalPages: 2,
        };

        (FileDownloadService.prototype.downloadAllFiles as jest.Mock).mockResolvedValue(mockResult);

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all?page=2&limit=50`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.page).toBe(2);
        expect(response.body.data.limit).toBe(50);
      });

      it('空のプロジェクトの場合は空のリストを返す', async () => {
        const mockResult = {
          files: [],
          totalFiles: 0,
          totalSize: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        };

        (FileDownloadService.prototype.downloadAllFiles as jest.Mock).mockResolvedValue(mockResult);

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.files).toHaveLength(0);
        expect(response.body.data.totalFiles).toBe(0);
      });
    });

    describe('バリデーションエラー（400）', () => {
      it('projectIdが無効なUUID形式の場合は400エラー', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/invalid-uuid/files/download-all`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_INVALID_FORMAT');
      });

      it('無効なpage値（-1）の場合は400エラー', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all?page=-1`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('無効なlimit値（101）の場合は400エラー', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all?limit=101`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('権限エラー（403）', () => {
      it('プロジェクトへのアクセス権限がない場合は403エラー', async () => {
        (FileDownloadService.prototype.downloadAllFiles as jest.Mock).mockRejectedValue(
          new Error('このプロジェクトへのアクセス権限がありません')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      });
    });

    describe('リソース未検出エラー（404）', () => {
      it('プロジェクトが存在しない場合は404エラー', async () => {
        (FileDownloadService.prototype.downloadAllFiles as jest.Mock).mockRejectedValue(
          new Error('プロジェクトが見つかりません')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${validProjectId}/files/download-all`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });
  });

  describe('ミドルウェアチェーン検証', () => {
    it('authMiddlewareが正しく適用されている', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}/files/${validFileName}/download`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('バリデーションミドルウェアが正しく適用されている', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/not-a-uuid/files/${validFileName}/download`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });
  });
});
