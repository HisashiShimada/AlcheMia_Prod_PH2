/**
 * projectController.create テスト
 * 
 * Task 2.1-2.4: Controller層のテスト
 */

import { Request, Response } from 'express';
import { create } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// モック
jest.mock('../../src/services/projectService');
jest.mock('../../src/utils/logger');

describe('projectController.create', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      body: {},
      user: {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_admin',
        departmentId: 'test-dept-id',
      },
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('認証チェック', () => {
    it('req.userが存在しない場合401を返す', async () => {
      mockReq.user = undefined;

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
          }),
        })
      );
    });
  });

  describe('バリデーション', () => {
    it('projectNameが未指定の場合400を返す', async () => {
      mockReq.body = {
        description: 'Test description',
      };

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_REQUIRED_FIELD',
          }),
        })
      );
    });

    it('projectNameが255文字を超える場合400を返す', async () => {
      mockReq.body = {
        projectName: 'a'.repeat(256),
      };

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_STRING_LENGTH',
          }),
        })
      );
    });

    it('projectNameに制御文字が含まれる場合400を返す', async () => {
      mockReq.body = {
        projectName: 'Test\x00Project',
      };

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
          }),
        })
      );
    });

    it('descriptionが1000文字を超える場合400を返す', async () => {
      mockReq.body = {
        projectName: 'Test Project',
        description: 'a'.repeat(1001),
      };

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_STRING_TOO_LONG',
          }),
        })
      );
    });
  });

  describe('Service層呼び出し', () => {
    it('Service層が成功した場合201を返す', async () => {
      mockReq.body = {
        projectName: 'Test Project',
        description: 'Test description',
      };

      const mockProjectData = {
        organizationId: 'test-org-id',
        projectId: 'test-project-id',
        projectName: 'Test Project',
        description: 'Test description',
        departmentId: 'test-dept-id',
        ownerUserId: 'test-user-id',
        projectStatus: 0,
        projectStatusName: 'プロジェクト計画中',
        projectMaimlFlg: false,
        checkoutStatus: 0,
        checkoutStatusName: 'チェックイン中',
        createAt: '2026-01-15T00:00:00.000Z',
      };

      (ProjectService.prototype.create as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProjectData,
      });

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProjectData,
        })
      );
    });

    it('Service層でDUPLICATE_PROJECT_NAMEエラーの場合409を返す', async () => {
      mockReq.body = {
        projectName: 'Existing Project',
      };

      (ProjectService.prototype.create as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'BUSINESS_DUPLICATE_PROJECT_NAME',
          message: 'プロジェクト名が既に存在します',
        },
      });

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BUSINESS_DUPLICATE_PROJECT_NAME',
          }),
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('予期しないエラーが発生した場合500を返す', async () => {
      mockReq.body = {
        projectName: 'Test Project',
      };

      (ProjectService.prototype.create as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await create(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR',
          }),
        })
      );
    });
  });
});
