/**
 * ExperimentController ユニットテスト
 * 
 * @description 実験管理関連のリクエスト処理テスト
 */

import { Request, Response, NextFunction } from 'express';
import { updateTransitionStatus } from '../../src/controllers/experimentController';
import * as experimentDataService from '../../src/services/experimentDataService';
import { TransitionData } from '../../src/types/transitionData';
import { InvalidStatusTransitionError } from '../../src/services/experimentDataService';

// experimentDataServiceをモック
jest.mock('../../src/services/experimentDataService');

// uuidをモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123')
}));

describe('ExperimentController', () => {
  describe('updateTransitionStatus', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Setup response mocks
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      mockRequest = {
        params: {
          projectId: 'test-project-id',
          methodId: 'test-method-id',
          transitionId: 'test-transition-id',
        },
        body: {
          status: 'running',
          comment: 'Test comment',
        },
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          role: 'experiment_worker',
          sessionId: 'session123',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400
        }
      };

      // organizationIdをrequestオブジェクトに追加（ミドルウェアで設定される）
      (mockRequest as any).organizationId = 'test-org-id';

      mockResponse = {
        status: statusMock,
        json: jsonMock,
      };

      mockNext = jest.fn();
    });

    describe('Success Cases', () => {
      it('should return 200 OK with updated transition data', async () => {
        // Arrange
        const mockUpdatedData: TransitionData = {
          organization_id: 'test-org-id',
          project_id: 'test-project-id',
          method_id: 'test-method-id',
          task_no: 1,
          transition_id: 'test-transition-id',
          status: 'running',
          progress_rate: 50,
          updated_by: 'test-user-id',
          updated_at: new Date(),
          created_at: new Date(),
        };

        (experimentDataService.updateStatus as jest.Mock).mockResolvedValue(mockUpdatedData);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(experimentDataService.updateStatus).toHaveBeenCalledWith(
          'test-org-id',
          'test-project-id',
          'test-method-id',
          'test-transition-id',
          {
            status: 'running',
            updated_by: 'test-user-id',
          }
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          data: mockUpdatedData,
          meta: {
            timestamp: expect.any(String),
            requestId: expect.any(String),
          },
        });
      });

      it('should handle status update with optional comment', async () => {
        // Arrange
        mockRequest.body = {
          status: 'completed',
          comment: 'Work completed successfully',
        };

        const mockUpdatedData: TransitionData = {
          organization_id: 'test-org-id',
          project_id: 'test-project-id',
          method_id: 'test-method-id',
          task_no: 1,
          transition_id: 'test-transition-id',
          status: 'completed',
          progress_rate: 100,
          updated_by: 'test-user-id',
          updated_at: new Date(),
          created_at: new Date(),
        };

        (experimentDataService.updateStatus as jest.Mock).mockResolvedValue(mockUpdatedData);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(experimentDataService.updateStatus).toHaveBeenCalledWith(
          'test-org-id',
          'test-project-id',
          'test-method-id',
          'test-transition-id',
          {
            status: 'completed',
            updated_by: 'test-user-id',
          }
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalled();
      });
    });

    describe('Error Cases', () => {
      it('should return 404 Not Found when transition does not exist', async () => {
        // Arrange
        const error: any = new Error('Transition not found');
        error.name = 'TransitionNotFoundError';
        (experimentDataService.updateStatus as jest.Mock).mockRejectedValue(error);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should return 422 Unprocessable Entity for invalid status transition', async () => {
        // Arrange
        const error = new InvalidStatusTransitionError('completed', 'initial');
        (experimentDataService.updateStatus as jest.Mock).mockRejectedValue(error);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should return 500 Internal Server Error for unexpected errors', async () => {
        // Arrange
        const error = new Error('Database connection failed');
        (experimentDataService.updateStatus as jest.Mock).mockRejectedValue(error);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should handle missing organization_id', async () => {
        // Arrange
        delete (mockRequest as any).organizationId;

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(experimentDataService.updateStatus).not.toHaveBeenCalled();
      });

      it('should handle missing user information', async () => {
        // Arrange
        delete mockRequest.user;

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(experimentDataService.updateStatus).not.toHaveBeenCalled();
      });
    });
  });
});