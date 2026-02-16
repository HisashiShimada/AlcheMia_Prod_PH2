/**
 * Performance Tests for Issue Service
 * 
 * Tests ensure that:
 * - 100 issues with comments can be retrieved within 1 second
 * - Only 2 database queries are executed (avoiding N+1 problem)
 * - Memory usage is efficient
 */

import { Pool } from 'pg';
import { listIssuesWithComments } from '../../src/services/issueService';
import { IssueTarget } from '../../src/types/issue';

// Mock database pool
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
  })),
}));

import { getPool } from '../../src/database/db';

describe('Issue Service Performance Tests', () => {
  let mockQuery: jest.Mock;
  const mockOrganizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
  const mockProjectId = 'proj-123';
  const mockMethodId = 'method-001';
  const mockTaskNo = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });
  });

  describe('Query Efficiency', () => {
    it('should execute exactly 2 database queries (avoiding N+1 problem)', async () => {
      // Mock Query 1: Issues list
      const mockIssues = Array.from({ length: 10 }, (_, i) => ({
        issue_id: `issue-${i + 1}`,
        project_id: mockProjectId,
        method_id: mockMethodId,
        task_no: mockTaskNo,
        transition_id: `transition-${i + 1}`,
        issue_type: 'quality',
        issue_target: 'task' as IssueTarget,
        status: 'open',
        title: `Issue ${i + 1}`,
        description: `Description ${i + 1}`,
        reporter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_name: 'Test Project',
        reporter_user_name: 'Test User',
      }));

      // Mock Query 2: Comments for all issues
      const mockComments = Array.from({ length: 50 }, (_, i) => ({
        comment_id: `comment-${i + 1}`,
        issue_id: `issue-${(i % 10) + 1}`,
        sequence_no: Math.floor(i / 10) + 1,
        comment_text: `Comment ${i + 1}`,
        commenter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        commenter_user_name: 'Test User',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockIssues })
        .mockResolvedValueOnce({ rows: mockComments });

      await listIssuesWithComments(
        mockOrganizationId,
        {
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
        }
      );

      // Verify exactly 2 queries were executed
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle 100 issues with 500 comments efficiently', async () => {
      // Generate 100 mock issues
      const mockIssues = Array.from({ length: 100 }, (_, i) => ({
        issue_id: `issue-${i + 1}`,
        project_id: mockProjectId,
        method_id: mockMethodId,
        task_no: mockTaskNo,
        transition_id: `transition-${i + 1}`,
        issue_type: 'quality',
        issue_target: 'task' as IssueTarget,
        status: 'open',
        title: `Issue ${i + 1}`,
        description: `Description ${i + 1}`,
        reporter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_name: 'Test Project',
        reporter_user_name: 'Test User',
      }));

      // Generate 500 mock comments (5 per issue on average)
      const mockComments = Array.from({ length: 500 }, (_, i) => ({
        comment_id: `comment-${i + 1}`,
        issue_id: `issue-${(i % 100) + 1}`,
        sequence_no: Math.floor(i / 100) + 1,
        comment_text: `Comment ${i + 1}`,
        commenter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        commenter_user_name: 'Test User',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockIssues })
        .mockResolvedValueOnce({ rows: mockComments });

      const startTime = Date.now();

      const result = await listIssuesWithComments(
        mockOrganizationId,
        {
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
        }
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify performance requirements
      expect(result.length).toBe(100);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify all comments are properly associated
      const totalComments = result.reduce((sum, issue) => sum + issue.comments.length, 0);
      expect(totalComments).toBe(500);

      // Verify exactly 2 queries were executed (no N+1 problem)
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Efficiency', () => {
    it('should process large datasets without excessive memory usage', async () => {
      // Generate large dataset
      const mockIssues = Array.from({ length: 100 }, (_, i) => ({
        issue_id: `issue-${i + 1}`,
        project_id: mockProjectId,
        method_id: mockMethodId,
        task_no: mockTaskNo,
        transition_id: `transition-${i + 1}`,
        issue_type: 'quality',
        issue_target: 'task' as IssueTarget,
        status: 'open',
        title: `Issue ${i + 1}`.repeat(10), // Make title larger
        description: `Description ${i + 1}`.repeat(50), // Make description larger
        reporter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_name: 'Test Project',
        reporter_user_name: 'Test User',
      }));

      const mockComments = Array.from({ length: 500 }, (_, i) => ({
        comment_id: `comment-${i + 1}`,
        issue_id: `issue-${(i % 100) + 1}`,
        sequence_no: Math.floor(i / 100) + 1,
        comment_text: `Comment ${i + 1}`.repeat(20), // Make comment larger
        commenter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        commenter_user_name: 'Test User',
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: mockIssues })
        .mockResolvedValueOnce({ rows: mockComments });

      // Monitor memory usage
      const memBefore = process.memoryUsage().heapUsed;

      const result = await listIssuesWithComments(
        mockOrganizationId,
        {
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
        }
      );

      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = (memAfter - memBefore) / 1024 / 1024; // Convert to MB

      // Verify memory usage is reasonable (less than 100MB for this dataset)
      expect(memDelta).toBeLessThan(100);
      expect(result.length).toBe(100);
    });
  });

  describe('Index Utilization', () => {
    it('should use indexes for organization_id, project_id, and status filters', async () => {
      const mockIssues = [
        {
          issue_id: 'issue-1',
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          transition_id: 'transition-1',
          issue_type: 'quality',
          issue_target: 'task' as IssueTarget,
          status: 'open',
          title: 'Test Issue',
          description: 'Test Description',
          reporter_user_id: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          project_name: 'Test Project',
          reporter_user_name: 'Test User',
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockIssues })
        .mockResolvedValueOnce({ rows: [] });

      await listIssuesWithComments(
        mockOrganizationId,
        {
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          status: 'open',
        }
      );

      // Verify the query includes proper WHERE clauses that can use indexes
      const issueQuery = mockQuery.mock.calls[0][0];
      expect(issueQuery).toContain('organization_id = $1');
      expect(issueQuery).toContain('project_id = $2');
      expect(issueQuery).toContain('status = $');
      expect(issueQuery).toContain('ORDER BY i.created_at DESC');
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const mockIssues = Array.from({ length: 10 }, (_, i) => ({
        issue_id: `issue-${i + 1}`,
        project_id: mockProjectId,
        method_id: mockMethodId,
        task_no: mockTaskNo,
        transition_id: `transition-${i + 1}`,
        issue_type: 'quality',
        issue_target: 'task' as IssueTarget,
        status: 'open',
        title: `Issue ${i + 1}`,
        description: `Description ${i + 1}`,
        reporter_user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_name: 'Test Project',
        reporter_user_name: 'Test User',
      }));

      mockQuery
        .mockResolvedValue({ rows: mockIssues })
        .mockResolvedValue({ rows: [] });

      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        listIssuesWithComments(
          mockOrganizationId,
          {
            project_id: mockProjectId,
            method_id: mockMethodId,
            task_no: mockTaskNo,
          }
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // All requests should complete successfully
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.length).toBe(10);
      });

      // Should handle concurrent requests efficiently (not 10x slower)
      expect(executionTime).toBeLessThan(2000);
    });
  });
});