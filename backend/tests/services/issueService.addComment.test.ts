/**
 * Issue Service - addComment Method Tests
 * 
 * Tests for POST /api/v1/issues/:issueId/comments
 * Requirements: REQ-001, REQ-002, REQ-006, REQ-009
 */

import { IssueService } from '../../src/services/issueService';
import { IssueRepository } from '../../src/repositories/issueRepository';
import { IssueCommentResponse } from '../../src/types/issueComment';

// Mock the repository
jest.mock('../../src/repositories/issueRepository');

describe('IssueService.addComment', () => {
  let issueService: IssueService;
  let mockAddComment: jest.Mock;

  const mockOrganizationId = '11111111-1111-1111-1111-111111111111';
  const mockUserId = '22222222-2222-2222-2222-222222222222';
  const mockIssueId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock for addComment method
    mockAddComment = jest.fn();
    
    // Mock IssueRepository
    (IssueRepository as jest.Mock).mockImplementation(() => ({
      addComment: mockAddComment,
      findById: jest.fn().mockResolvedValue({ id: mockIssueId }),
    }));
    
    issueService = new IssueService();
  });

  describe('8.1 Validation - Normal Cases', () => {
    it('should return success with ServiceResult when comment is valid', async () => {
      // Arrange
      const validComment = 'This is a valid comment';
      const mockResponse: IssueCommentResponse = {
        projectId: '44444444-4444-4444-4444-444444444444',
        issueId: mockIssueId,
        sequenceNo: 1,
        comment: validComment,
        authorId: mockUserId,
        authorName: 'Test User',
        commentedAt: '2026-02-04T12:00:00Z',
      };

      mockAddComment.mockResolvedValue(mockResponse);

      // Act
      const result = await issueService.addComment(
        mockOrganizationId,
        mockIssueId,
        mockUserId,
        validComment
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return response with all required fields', async () => {
      // Arrange
      const validComment = 'Complete test comment';
      const mockCommentedAt = '2026-02-04T12:00:00Z';
      const mockResponse: IssueCommentResponse = {
        projectId: '44444444-4444-4444-4444-444444444444',
        issueId: mockIssueId,
        sequenceNo: 2,
        comment: validComment,
        authorId: mockUserId,
        authorName: 'John Doe',
        commentedAt: mockCommentedAt,
      };

      mockAddComment.mockResolvedValue(mockResponse);

      // Act
      const result = await issueService.addComment(
        mockOrganizationId,
        mockIssueId,
        mockUserId,
        validComment
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify all required fields are present
      if (result.data) {
        expect(result.data.projectId).toBe('44444444-4444-4444-4444-444444444444');
        expect(result.data.issueId).toBe(mockIssueId);
        expect(result.data.sequenceNo).toBe(2);
        expect(result.data.comment).toBe(validComment);
        expect(result.data.authorId).toBe(mockUserId);
        expect(result.data.authorName).toBe('John Doe');
        expect(result.data.commentedAt).toEqual(mockCommentedAt);
      }
    });

    it('should call repository with correct parameters', async () => {
      // Arrange
      const validComment = 'Test repository call';
      const mockResponse: IssueCommentResponse = {
        projectId: '44444444-4444-4444-4444-444444444444',
        issueId: mockIssueId,
        sequenceNo: 1,
        comment: validComment,
        authorId: mockUserId,
        authorName: 'Test User',
        commentedAt: new Date().toISOString(),
      };

      mockAddComment.mockResolvedValue(mockResponse);

      // Act
      await issueService.addComment(
        mockOrganizationId,
        mockIssueId,
        mockUserId,
        validComment
      );

      // Assert
      expect(mockAddComment).toHaveBeenCalledWith(
        mockOrganizationId,
        mockIssueId,
        mockUserId,
        validComment
      );
      expect(mockAddComment).toHaveBeenCalledTimes(1);
    });

    it('should accept comment with maximum allowed length (2000 characters)', async () => {
      // Arrange
      const maxLengthComment = 'a'.repeat(2000);
      const mockResponse: IssueCommentResponse = {
        projectId: '44444444-4444-4444-4444-444444444444',
        issueId: mockIssueId,
        sequenceNo: 1,
        comment: maxLengthComment,
        authorId: mockUserId,
        authorName: 'Test User',
        commentedAt: new Date().toISOString(),
      };

      mockAddComment.mockResolvedValue(mockResponse);

      // Act
      const result = await issueService.addComment(
        mockOrganizationId,
        mockIssueId,
        mockUserId,
        maxLengthComment
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.comment).toBe(maxLengthComment);
    });

    it('should accept comment with single character', async () => {
      // Arrange
      const minLengthComment = 'a';
      const mockResponse: IssueCommentResponse = {
        projectId: '44444444-4444-4444-4444-444444444444',
        issueId: mockIssueId,
        sequenceNo: 1,
        comment: minLengthComment,
        authorId: mockUserId,
        authorName: 'Test User',
        commentedAt: new Date().toISOString(),
      };

      mockAddComment.mockResolvedValue(mockResponse);

      // Act
      const result = await issueService.addComment(
        mockOrganizationId,
        mockIssueId,
        mockUserId,
        minLengthComment
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.comment).toBe(minLengthComment);
    });
  });
});