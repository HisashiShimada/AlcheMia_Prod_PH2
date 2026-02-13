/**
 * IssueService.updateStatus メソッドの単体テスト
 * 
 * テスト対象: IssueService.updateStatus
 * 目的: ステータス変換ロジック、バリデーション、エラーハンドリングの検証
 * 要件: Requirements 1, 4
 */

import { IssueService } from '../../src/services/issueService';
import { IssueRepository } from '../../src/repositories/issueRepository';
import { Issue } from '../../src/types/issue';
import { ValidationError, NotFoundError } from '../../src/utils/errorClasses';

// IssueRepositoryをモック化
jest.mock('../../src/repositories/issueRepository');

describe('IssueService.updateStatus', () => {
  let issueService: IssueService;
  let mockIssueRepository: jest.Mocked<IssueRepository>;

  // テスト用データ
  const testOrganizationId = 'test_org_001';
  const testIssueId = 'test_issue_001';
  const testUserId = 'test_user_001';

  const mockIssue: Issue = {
    organizationId: testOrganizationId,
    projectId: 'test_project_001',
    issueId: testIssueId,
    methodId: 'test_method_001',
    issueTarget: 2,
    taskNo: 1,
    transitionId: null,
    issueTitle: 'Test Issue',
    issueType: 1,
    issueContents: 'Test contents',
    status: 'unresolved',
    issueReporterId: 'reporter_001',
    issueReportAt: '2026-02-13T10:00:00Z',
    issueCompleterId: null,
    issueComplateAt: null,
    createUserId: 'creator_001',
    createAt: '2026-02-13T10:00:00Z',
    updateUserId: 'creator_001',
    updateAt: '2026-02-13T10:00:00Z',
  };

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // IssueServiceのインスタンスを作成
    issueService = new IssueService();
    mockIssueRepository = (issueService as any).issueRepository as jest.Mocked<IssueRepository>;
  });

  describe('ステータス変換ロジック', () => {
    it('should convert "resolved" status to number 1', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      const resolvedIssue: Issue = {
        ...mockIssue,
        status: 'resolved',
        issueCompleterId: testUserId,
        issueComplateAt: '2026-02-13T11:00:00Z',
      };
      mockIssueRepository.updateStatus.mockResolvedValue(resolvedIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockIssueRepository.updateStatus).toHaveBeenCalledWith(
        testIssueId,
        testOrganizationId,
        testUserId,
        1  // "resolved" → 1
      );
    });

    it('should convert "unresolved" status to number 0', async () => {
      // Arrange
      const resolvedIssue: Issue = {
        ...mockIssue,
        status: 'resolved',
        issueCompleterId: testUserId,
        issueComplateAt: '2026-02-13T11:00:00Z',
      };
      mockIssueRepository.findById.mockResolvedValue(resolvedIssue);
      
      const unresolvedIssue: Issue = {
        ...mockIssue,
        status: 'unresolved',
        issueCompleterId: null,
        issueComplateAt: null,
      };
      mockIssueRepository.updateStatus.mockResolvedValue(unresolvedIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'unresolved'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockIssueRepository.updateStatus).toHaveBeenCalledWith(
        testIssueId,
        testOrganizationId,
        testUserId,
        0  // "unresolved" → 0
      );
    });
  });

  describe('バリデーション', () => {
    it('should return validation error for invalid status value', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'invalid_status' as any
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('無効なステータス');
      expect(result.error?.originalError).toBeInstanceOf(ValidationError);
      
      // Repository.updateStatusは呼ばれないはず
      expect(mockIssueRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return validation error for empty string status', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        '' as any
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockIssueRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return validation error for null status', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        null as any
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockIssueRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return validation error for undefined status', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        undefined as any
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockIssueRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('問題存在確認', () => {
    it('should return not found error when issue does not exist', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(null);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('問題報告が見つかりません');
      expect(result.error?.originalError).toBeInstanceOf(NotFoundError);
      
      // Repository.updateStatusは呼ばれないはず
      expect(mockIssueRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should call findById with correct parameters', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.updateStatus.mockResolvedValue({
        ...mockIssue,
        status: 'resolved',
      });

      // Act
      await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(mockIssueRepository.findById).toHaveBeenCalledWith(
        testIssueId,
        testOrganizationId
      );
      expect(mockIssueRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('ステータス更新成功', () => {
    it('should successfully update status to resolved', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      const resolvedIssue: Issue = {
        ...mockIssue,
        status: 'resolved',
        issueCompleterId: testUserId,
        issueComplateAt: '2026-02-13T11:00:00Z',
        updateUserId: testUserId,
        updateAt: '2026-02-13T11:00:00Z',
      };
      mockIssueRepository.updateStatus.mockResolvedValue(resolvedIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('resolved');
      expect(result.data?.issueCompleterId).toBe(testUserId);
      expect(result.data?.issueComplateAt).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should successfully update status to unresolved', async () => {
      // Arrange
      const resolvedIssue: Issue = {
        ...mockIssue,
        status: 'resolved',
        issueCompleterId: 'previous_user',
        issueComplateAt: '2026-02-13T10:30:00Z',
      };
      mockIssueRepository.findById.mockResolvedValue(resolvedIssue);
      
      const unresolvedIssue: Issue = {
        ...mockIssue,
        status: 'unresolved',
        issueCompleterId: null,
        issueComplateAt: null,
        updateUserId: testUserId,
        updateAt: '2026-02-13T11:00:00Z',
      };
      mockIssueRepository.updateStatus.mockResolvedValue(unresolvedIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'unresolved'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('unresolved');
      expect(result.data?.issueCompleterId).toBeNull();
      expect(result.data?.issueComplateAt).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should return updated issue data in ServiceResult', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      const updatedIssue: Issue = {
        ...mockIssue,
        status: 'resolved',
        issueCompleterId: testUserId,
        issueComplateAt: '2026-02-13T11:00:00Z',
        updateUserId: testUserId,
        updateAt: '2026-02-13T11:00:00Z',
      };
      mockIssueRepository.updateStatus.mockResolvedValue(updatedIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedIssue);
    });
  });

  describe('updateStatus後の問題確認', () => {
    it('should return not found error when updateStatus returns null', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.updateStatus.mockResolvedValue(null);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('ステータスの更新に失敗しました');
    });
  });

  describe('システムエラーハンドリング', () => {
    it('should return system error when repository throws unexpected error', async () => {
      // Arrange
      const systemError = new Error('Database connection failed');
      mockIssueRepository.findById.mockRejectedValue(systemError);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SYSTEM_ERROR');
      expect(result.error?.message).toBe('システムエラーが発生しました');
      expect(result.error?.originalError).toBe(systemError);
    });

    it('should return system error when updateStatus throws error', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      const dbError = new Error('UPDATE query failed');
      mockIssueRepository.updateStatus.mockRejectedValue(dbError);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SYSTEM_ERROR');
      expect(result.error?.message).toBe('システムエラーが発生しました');
      expect(result.error?.originalError).toBe(dbError);
    });
  });

  describe('パラメータ検証', () => {
    it('should handle all valid parameters correctly', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.updateStatus.mockResolvedValue({
        ...mockIssue,
        status: 'resolved',
      });

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockIssueRepository.findById).toHaveBeenCalledWith(
        testIssueId,
        testOrganizationId
      );
      expect(mockIssueRepository.updateStatus).toHaveBeenCalledWith(
        testIssueId,
        testOrganizationId,
        testUserId,
        1
      );
    });
  });

  describe('ServiceResult形式', () => {
    it('should return ServiceResult with success=true on successful update', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);
      mockIssueRepository.updateStatus.mockResolvedValue({
        ...mockIssue,
        status: 'resolved',
      });

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
      expect(result.error).toBeUndefined();
    });

    it('should return ServiceResult with success=false on error', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(null);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'resolved'
      );

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
      expect(result.error).toHaveProperty('originalError');
      expect(result.data).toBeUndefined();
    });

    it('should include error details in ServiceResult on validation error', async () => {
      // Arrange
      mockIssueRepository.findById.mockResolvedValue(mockIssue);

      // Act
      const result = await issueService.updateStatus(
        testOrganizationId,
        testIssueId,
        testUserId,
        'invalid' as any
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBeDefined();
      expect(result.error?.originalError).toBeInstanceOf(ValidationError);
    });
  });
});
