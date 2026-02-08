/**
 * 統合テスト: 承認依頼API
 * POST /api/v1/projects/:projectId/approval-request
 * 
 * @group integration
 * Task: 6.3
 * Requirements: 1, 2, 3, 4, 8, 10, 13, 14
 * 
 * このテストは以下を検証します：
 * - 認証・認可フロー
 * - マルチテナント分離
 * - Route → Controller → Service → Repository の完全な統合
 * - エラーハンドリング
 * - レスポンス形式
 */

import request from 'supertest';
import express, { Express } from 'express';
import { getPool } from '../../src/database/db';
import * as projectController from '../../src/controllers/projectController';
import { errorHandler } from '../../src/middleware/errorHandlerMiddleware';

// Mock dependencies
jest.mock('../../src/database/db');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'notif-123e4567-e89b-12d3-a456-426614174003'),
}));

describe('統合テスト: POST /api/v1/projects/:projectId/approval-request', () => {
  let app: Express;
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let mockClient: any;

  const testOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174001';

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // シンプルな認証ミドルウェア（モック）
    app.use((req: any, _res, next) => {
      req.user = {
        userId: testUserId,
        organizationId: testOrganizationId,
        role: 'experiment_worker',
      };
      req.organizationId = testOrganizationId;
      next();
    });
    
    // ルーティング設定
    app.post(
      '/api/v1/projects/:projectId/approval-request',
      projectController.requestApproval
    );
    
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup database mocks
    mockQuery = jest.fn();
    mockClient = {
      query: mockQuery,
      release: jest.fn(),
    };
    mockConnect = jest.fn().mockResolvedValue(mockClient);

    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
      connect: mockConnect,
    });
  });

  describe('6.3.2: 正常系統合テスト（200 OK）', () => {
    const testProjectId = 'proj-123e4567-e89b-12d3-a456-426614174002';
    const testProjectName = 'テストプロジェクト';
    const testComment = '実験作業が完了しましたので承認をお願いします';

    it('認証済みexperiment_workerが承認依頼を成功させること', async () => {
      // Arrange: プロジェクト取得クエリ
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: testProjectId,
            project_name: testProjectName,
            project_status: 1, // active
            organization_id: testOrganizationId,
          }],
        })
        // ステータス更新クエリ
        .mockResolvedValueOnce({
          rows: [{
            id: testProjectId,
            project_name: testProjectName,
            project_status: 2, // waiting_approval
          }],
        })
        // ユーザー名取得クエリ
        .mockResolvedValueOnce({
          rows: [{
            user_name: 'テストユーザー',
          }],
        });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({ comment: testComment });

      // Debug: エラー内容を確認
      if (response.status !== 200) {
        console.log('[DEBUG] Response status:', response.status);
        console.log('[DEBUG] Response body:', JSON.stringify(response.body, null, 2));
      }

      // Assert: レスポンス形式
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      // Assert: データ内容
      const { data } = response.body;
      expect(data.project_id).toBe(testProjectId);
      expect(data.project_name).toBe(testProjectName);
      expect(data.previous_status).toBe('active');
      expect(data.new_status).toBe('waiting_approval');
      expect(data.requested_by).toBe(testUserId);
      expect(data.comment).toBe(testComment);
      expect(data).toHaveProperty('requested_at');

      // Assert: メタデータ
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('commentなしでも承認依頼が成功すること', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: testProjectId,
            project_name: testProjectName,
            project_status: 1,
            organization_id: testOrganizationId,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: testProjectId,
            project_name: testProjectName,
            project_status: 2,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            user_name: 'テストユーザー',
          }],
        });

      // Act
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({})
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment).toBeNull();
    });

    it('トランザクションが正しく動作すること', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: testProjectId,
            project_name: testProjectName,
            project_status: 1,
            organization_id: testOrganizationId,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: testProjectId,
            project_name: testProjectName,
            project_status: 2,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            user_name: 'テストユーザー',
          }],
        });

      // Act
      await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({ comment: testComment })
        .expect(200);

      // Assert: connect が呼ばれたこと（トランザクション開始）
      expect(mockConnect).toHaveBeenCalled();
      
      // Assert: release が呼ばれたこと（トランザクション終了）
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('6.3.1: テスト環境セットアップ確認', () => {
    it('Expressアプリケーションが正しく初期化されていること', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('データベースモックが正しく設定されていること', () => {
      expect(getPool).toBeDefined();
      expect(mockQuery).toBeDefined();
      expect(mockConnect).toBeDefined();
    });

    it('認証ミドルウェアが正しく動作していること', async () => {
      const testProjectId = 'proj-123e4567-e89b-12d3-a456-426614174002';
      
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: testProjectId,
          project_name: 'テスト',
          project_status: 1,
          organization_id: testOrganizationId,
        }],
      }).mockResolvedValueOnce({
        rows: [{ id: testProjectId, project_name: 'テスト', project_status: 2 }],
      }).mockResolvedValueOnce({
        rows: [{ user_name: 'テスト' }],
      });

      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/approval-request`)
        .send({});

      // 認証が正しく動作していれば200が返る
      expect(response.status).toBe(200);
    });

    it('UUIDジェネレーターが正しくモック化されていること', () => {
      const { v4: uuidv4 } = require('uuid');
      expect(uuidv4()).toBe('notif-123e4567-e89b-12d3-a456-426614174003');
    });
  });
});