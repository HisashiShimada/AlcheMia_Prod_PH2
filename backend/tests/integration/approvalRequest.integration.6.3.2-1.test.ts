/**
 * 統合テスト 6.3.2-1: 最小限の統合テスト（controller直接呼び出し）
 * 
 * @description
 * - Express appなしでcontroller関数を直接呼び出し
 * - req, resオブジェクトをモックで作成
 * - ミドルウェアは使用しない
 * - 最もシンプルな正常系ケースのみ
 * 
 * Task: 6.3.2-1
 * Requirements: 1, 2
 */

import { Request, Response } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// Mock dependencies
jest.mock('../../src/services/projectService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123'),
}));

describe('統合テスト 6.3.2-1: controller直接呼び出し', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const testOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174001';
  const testProjectId = '123e4567-e89b-12d3-a456-426614174002'; // プレフィックスなしのUUID形式
  const testComment = '実験作業が完了しましたので承認をお願いします';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock response
    mockJson = jest.fn().mockReturnValue({} as Response);
    mockStatus = jest.fn().mockReturnValue({ json: mockJson } as any);
    
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Setup mock request
    mockReq = {
      user: {
        userId: testUserId,
        organizationId: testOrganizationId,
        role: 'experiment_worker',
      } as any,
      params: {
        projectId: testProjectId,
      },
      body: {
        comment: testComment,
      },
    };
  });

  describe('正常系: 承認依頼が成功すること', () => {
    it('controller関数が200レスポンスを返すこと', async () => {
      // Arrange: ProjectServiceのモック設定
      const mockServiceResult = {
        success: true,
        data: {
          project_id: testProjectId,
          project_name: 'テストプロジェクト',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: testUserId,
          comment: testComment,
          requested_at: '2026-01-28T21:00:00Z',
          notification_id: 'notif-123',
        },
      };

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act: controller関数を直接呼び出し
      await requestApproval(mockReq as Request, mockRes as Response);

      // Debug: 実際のレスポンスを確認して強制失敗
      const statusCode = mockStatus.mock.calls[0]?.[0];
      const responseBody = mockJson.mock.calls[0]?.[0];
      
      if (statusCode !== 200) {
        throw new Error(
          `Expected 200 but got ${statusCode}. ` +
          `Response: ${JSON.stringify(responseBody, null, 2)}`
        );
      }

      // Assert: ステータスコード200
      expect(mockStatus).toHaveBeenCalledWith(200);

      // Assert: レスポンスボディ
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockServiceResult.data,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'test-request-id-123',
        }),
      });

      // Assert: ProjectService.requestApprovalが正しく呼ばれたこと
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        testProjectId,
        testComment,
        testOrganizationId,
        testUserId
      );
    });
  });
});