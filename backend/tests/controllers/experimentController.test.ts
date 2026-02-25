/**
 * ExperimentController ユニットテスト
 * 
 * @description 実験管理関連のリクエスト処理テスト
 */

import { Request, Response, NextFunction } from 'express';
import { updateTransitionStatus, saveBatchData, getTemplateData } from '../../src/controllers/experimentController';
import * as experimentDataService from '../../src/services/experimentDataService';
import { TransitionData } from '../../src/types/transitionData';
import { ProjectNotEditableError, TaskNotFoundError, GetTemplateDataResult } from '../../src/services/experimentDataService';

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
      } as any;

      // userオブジェクトを追加
      (mockRequest as any).user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_worker',
        sessionId: 'session123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
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
        const mockUpdatedData = {
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
        } as unknown as TransitionData;

        ((experimentDataService as any).updateStatus as jest.Mock).mockResolvedValue(mockUpdatedData);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect((experimentDataService as any).updateStatus).toHaveBeenCalledWith(
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

        const mockUpdatedData = {
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
        } as unknown as TransitionData;

        ((experimentDataService as any).updateStatus as jest.Mock).mockResolvedValue(mockUpdatedData);

        // Act
        await updateTransitionStatus(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect((experimentDataService as any).updateStatus).toHaveBeenCalledWith(
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
        ((experimentDataService as any).updateStatus as jest.Mock).mockRejectedValue(error);

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
        const error: any = new Error('Cannot transition from completed to initial');
        error.name = 'InvalidStatusTransitionError';
        ((experimentDataService as any).updateStatus as jest.Mock).mockRejectedValue(error);

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
        ((experimentDataService as any).updateStatus as jest.Mock).mockRejectedValue(error);

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
        expect((experimentDataService as any).updateStatus).not.toHaveBeenCalled();
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
        expect((experimentDataService as any).updateStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('saveBatchData', () => {
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
          projectName: 'test-project-id',
          methodId: 'test-method-id',
          taskNo: '1',
        },
        body: {
          records: [
            {
              placeId: 'place-1',
              templateType: 'material',
              templateId: 'material-template-1',
              data: { name: 'Test Material', weight: 100 },
              status: 'ready',
              comment: 'Test comment',
            },
            {
              placeId: 'place-2',
              templateType: 'condition',
              templateId: 'condition-template-1',
              data: { temperature: 25, humidity: 50 },
            },
          ],
        },
      } as any;

      // userオブジェクトを追加
      (mockRequest as any).user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_worker',
        sessionId: 'session123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
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
      it('should return 201 Created with saved records', async () => {
        // Arrange
        const mockSavedRecords = [
          {
            id: 'record-1',
            projectId: 'test-project-id',
            methodId: 'test-method-id',
            taskNo: 1,
            placeId: 'place-1',
            templateType: 'material',
            templateId: 'material-template-1',
            data: { name: 'Test Material', weight: 100 },
            status: 'ready',
            comment: 'Test comment',
            recordedBy: 'test-user-id',
            recordedAt: new Date().toISOString(),
            organizationId: 'test-org-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'record-2',
            projectId: 'test-project-id',
            methodId: 'test-method-id',
            taskNo: 1,
            placeId: 'place-2',
            templateType: 'condition',
            templateId: 'condition-template-1',
            data: { temperature: 25, humidity: 50 },
            recordedBy: 'test-user-id',
            recordedAt: new Date().toISOString(),
            organizationId: 'test-org-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        (experimentDataService.saveBatchData as jest.Mock).mockResolvedValue(mockSavedRecords);

        // Act
        await saveBatchData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(experimentDataService.saveBatchData).toHaveBeenCalledWith(
          'test-org-id',
          'test-project-id',
          'test-method-id',
          1,
          mockRequest.body.records,
          'test-user-id'
        );

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          data: {
            saved: 2,
            records: mockSavedRecords,
          },
          meta: {
            timestamp: expect.any(String),
            requestId: expect.any(String),
          },
        });
      });

      it('should handle single record save', async () => {
        // Arrange
        mockRequest.body = {
          records: [
            {
              placeId: 'place-1',
              templateType: 'result',
              templateId: 'result-template-1',
              data: { value: 42 },
            },
          ],
        };

        const mockSavedRecords = [
          {
            id: 'record-1',
            projectId: 'test-project-id',
            methodId: 'test-method-id',
            taskNo: 1,
            placeId: 'place-1',
            templateType: 'result',
            templateId: 'result-template-1',
            data: { value: 42 },
            recordedBy: 'test-user-id',
            recordedAt: new Date().toISOString(),
            organizationId: 'test-org-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        (experimentDataService.saveBatchData as jest.Mock).mockResolvedValue(mockSavedRecords);

        // Act
        await saveBatchData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          data: {
            saved: 1,
            records: mockSavedRecords,
          },
          meta: expect.any(Object),
        });
      });
    });

    describe('Error Cases', () => {
      it('should handle project not editable error', async () => {
        // Arrange
        const error = new ProjectNotEditableError('archived');
        (experimentDataService.saveBatchData as jest.Mock).mockRejectedValue(error);

        // Act
        await saveBatchData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should handle task not found error', async () => {
        // Arrange
        const error = new TaskNotFoundError(1);
        (experimentDataService.saveBatchData as jest.Mock).mockRejectedValue(error);

        // Act
        await saveBatchData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should handle database error', async () => {
        // Arrange
        const error = new Error('Database connection failed');
        (experimentDataService.saveBatchData as jest.Mock).mockRejectedValue(error);

        // Act
        await saveBatchData(
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
        await saveBatchData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(experimentDataService.saveBatchData).not.toHaveBeenCalled();
      });

      it('should handle missing user information', async () => {
        // Arrange
        delete mockRequest.user;

        // Act
        await saveBatchData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(experimentDataService.saveBatchData).not.toHaveBeenCalled();
      });
    });
  });

  describe('getTemplateData', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    const mockResult: GetTemplateDataResult = {
      projectName: 'test-project',
      methodId: 'method-1',
      taskNo: 1,
      transitionId: 'transition-1',
      adjacentPlaceIds: ['place-in-1', 'place-out-1'],
      templates: [
        {
          placeId: 'place-in-1',
          templateType: 'material',
          templateId: 'template-mat-1',
          data: { name: 'Sample Material', weight: 10 },
          recordedBy: 'test-user-id',
          recordedAt: '2026-02-25T00:00:00.000Z',
        },
        {
          placeId: 'place-out-1',
          templateType: 'result',
          templateId: 'template-res-1',
          data: { value: 42 },
          recordedBy: 'test-user-id',
          recordedAt: '2026-02-25T01:00:00.000Z',
        },
      ],
      totalCount: 2,
    };

    beforeEach(() => {
      jest.clearAllMocks();

      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      mockRequest = {
        params: {
          projectName: 'test-project',
          methodId: 'method-1',
          taskNo: '1',
        },
        query: {
          transitionId: 'transition-1',
        },
      } as any;

      (mockRequest as any).organizationId = 'test-org-id';
      (mockRequest as any).user = {
        userId: 'test-user-id',
        role: 'experiment_worker',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      mockResponse = {
        status: statusMock,
        json: jsonMock,
      };

      mockNext = jest.fn();
    });

    describe('Success Cases', () => {
      it('should return 200 with adjacent place template data', async () => {
        // Arrange
        (experimentDataService.getTemplateData as jest.Mock).mockResolvedValue(mockResult);

        // Act
        await getTemplateData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(experimentDataService.getTemplateData).toHaveBeenCalledWith(
          'test-org-id',
          'test-project',
          'method-1',
          1,
          'transition-1'
        );
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          data: mockResult,
          meta: {
            timestamp: expect.any(String),
            requestId: expect.any(String),
          },
        });
      });

      it('should return 200 with empty templates when no records exist', async () => {
        // Arrange
        const emptyResult: GetTemplateDataResult = {
          ...mockResult,
          templates: [],
          totalCount: 0,
        };
        (experimentDataService.getTemplateData as jest.Mock).mockResolvedValue(emptyResult);

        // Act
        await getTemplateData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({ totalCount: 0, templates: [] }),
          })
        );
      });
    });

    describe('Error Cases', () => {
      it('should call next with error when project is not found', async () => {
        // Arrange
        const error: any = new Error('Project not found: test-project');
        error.name = 'ProjectNotFoundError';
        (experimentDataService.getTemplateData as jest.Mock).mockRejectedValue(error);

        // Act
        await getTemplateData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should call next with error when transition is not found in MaiML', async () => {
        // Arrange
        const error: any = new Error("Transition 'transition-1' not found in MaiML method 'method-1'");
        error.name = 'TransitionNotFoundError';
        (experimentDataService.getTemplateData as jest.Mock).mockRejectedValue(error);

        // Act
        await getTemplateData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should call next with error when MaiML file is not found', async () => {
        // Arrange
        const error: any = new Error('MaiML file not found');
        error.name = 'MaimlNotFoundError';
        (experimentDataService.getTemplateData as jest.Mock).mockRejectedValue(error);

        // Act
        await getTemplateData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should call next with error on database failure', async () => {
        // Arrange
        const error = new Error('Database connection failed');
        (experimentDataService.getTemplateData as jest.Mock).mockRejectedValue(error);

        // Act
        await getTemplateData(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });
  });
});
