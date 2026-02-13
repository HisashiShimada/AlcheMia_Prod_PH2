/**
 * Integration Test: Issue Comment POST API - Multi-tenant Isolation
 * 
 * Tests multi-tenant data isolation to ensure:
 * - Non-existent issue IDs return 404 Not Found
 * - Cross-tenant access returns 404 Not Found
 * - Only same-organization issues are accessible
 * 
 * Requirements: REQ-004
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';
import { v4 as uuidv4 } from 'uuid';

describe('POST /api/v1/issues/:issueId/comments - Multi-tenant Isolation', () => {
  let pool: any;
  
  // Organization 1 (current user's organization)
  const org1Id = uuidv4();
  const org1ProjectId = uuidv4();
  const org1IssueId = uuidv4();
  const org1UserId = uuidv4();
  let org1Token: string;
  
  // Organization 2 (different organization)
  const org2Id = uuidv4();
  const org2ProjectId = uuidv4();
  const org2IssueId = uuidv4();
  const org2UserId = uuidv4();

  beforeAll(async () => {
    pool = getPool();
    
    // Create Organization 1
    await pool.query(`
      INSERT INTO organization (id, organization_name, organization_prefix, organization_type, is_active)
      VALUES ($1, 'Org1', 'org1', 'research', true)
    `, [org1Id]);
    
    // Create Organization 2
    await pool.query(`
      INSERT INTO organization (id, organization_name, organization_prefix, organization_type, is_active)
      VALUES ($1, 'Org2', 'org2', 'research', true)
    `, [org2Id]);
    
    // Create User 1 (Organization 1)
    await pool.query(`
      INSERT INTO organization_user (id, organization_id, user_name, email, password_hash, role_id, is_active)
      VALUES ($1, $2, 'worker1', 'worker1@org1.com', '$2b$12$test', 1, true)
    `, [org1UserId, org1Id]);
    
    // Create User 2 (Organization 2)
    await pool.query(`
      INSERT INTO organization_user (id, organization_id, user_name, email, password_hash, role_id, is_active)
      VALUES ($1, $2, 'worker2', 'worker2@org2.com', '$2b$12$test', 1, true)
    `, [org2UserId, org2Id]);
    
    // Create Project 1 (Organization 1)
    await pool.query(`
      INSERT INTO project (id, organization_id, project_name, description, status, create_user_id, update_user_id)
      VALUES ($1, $2, 'Project1', 'Test Project 1', 'active', $3, $3)
    `, [org1ProjectId, org1Id, org1UserId]);
    
    // Create Project 2 (Organization 2)
    await pool.query(`
      INSERT INTO project (id, organization_id, project_name, description, status, create_user_id, update_user_id)
      VALUES ($1, $2, 'Project2', 'Test Project 2', 'active', $3, $3)
    `, [org2ProjectId, org2Id, org2UserId]);
    
    // Create Issue 1 (Organization 1)
    await pool.query(`
      INSERT INTO issues (id, organization_id, project_id, issue_title, issue_description, status, priority, reporter_id, create_user_id, update_user_id)
      VALUES ($1, $2, $3, 'Issue 1', 'Test Issue 1', 'open', 'medium', $4, $4, $4)
    `, [org1IssueId, org1Id, org1ProjectId, org1UserId]);
    
    // Create Issue 2 (Organization 2)
    await pool.query(`
      INSERT INTO issues (id, organization_id, project_id, issue_title, issue_description, status, priority, reporter_id, create_user_id, update_user_id)
      VALUES ($1, $2, $3, 'Issue 2', 'Test Issue 2', 'open', 'medium', $4, $4, $4)
    `, [org2IssueId, org2Id, org2ProjectId, org2UserId]);
    
    // Generate JWT token for User 1
    const jwtPayload = {
      userId: org1UserId,
      organizationId: org1Id,
      role: 'worker'
    };
    const jwt = require('jsonwebtoken');
    org1Token = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM issue_comment WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM issues WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM project WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM organization_user WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM organization WHERE id IN ($1, $2)', [org1Id, org2Id]);
    
    await pool.end();
  });

  describe('REQ-004: Multi-tenant data isolation', () => {
    test('should return 404 Not Found for non-existent issue ID', async () => {
      const nonExistentIssueId = uuidv4();
      
      const response = await request(app)
        .post(`/api/v1/issues/${nonExistentIssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org1Id)
        .send({
          comment: 'Test comment'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: expect.stringContaining('Issue not found')
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should return 404 Not Found when accessing other organization\'s issue', async () => {
      // User from Org1 tries to access Org2's issue
      const response = await request(app)
        .post(`/api/v1/issues/${org2IssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org1Id)
        .send({
          comment: 'Attempting cross-tenant access'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: expect.stringContaining('Issue not found')
        }
      });
      
      // Verify that the comment was NOT created in the database
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM issue_comment WHERE issue_id = $1',
        [org2IssueId]
      );
      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    test('should successfully create comment for own organization\'s issue', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${org1IssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org1Id)
        .send({
          comment: 'Comment for same organization issue'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          projectId: org1ProjectId,
          issueId: org1IssueId,
          sequenceNo: 1,
          comment: 'Comment for same organization issue',
          authorId: org1UserId,
          authorName: 'worker1',
          commentedAt: expect.any(String)
        }
      });
      
      // Verify that the comment was created in the correct organization
      const result = await pool.query(
        'SELECT organization_id FROM issue_comment WHERE issue_id = $1 AND sequence_no = $2',
        [org1IssueId, 1]
      );
      expect(result.rows[0].organization_id).toBe(org1Id);
    });

    test('should ensure organization_id filter is applied in all queries', async () => {
      // Create a comment for Org1's issue
      await request(app)
        .post(`/api/v1/issues/${org1IssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org1Id)
        .send({
          comment: 'First comment'
        });

      // Try to access with wrong organization_id header (security test)
      const response = await request(app)
        .post(`/api/v1/issues/${org1IssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org2Id) // Wrong organization ID
        .send({
          comment: 'Should fail'
        });

      // Should fail because JWT contains org1Id but header contains org2Id
      // The tenantIsolation middleware should reject this
      expect([401, 403, 404]).toContain(response.status);
    });

    test('should maintain data isolation with multiple comments', async () => {
      // Create multiple comments for Org1's issue
      await request(app)
        .post(`/api/v1/issues/${org1IssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org1Id)
        .send({ comment: 'Comment 1' });

      await request(app)
        .post(`/api/v1/issues/${org1IssueId}/comments`)
        .set('Authorization', `Bearer ${org1Token}`)
        .set('X-Organization-Id', org1Id)
        .send({ comment: 'Comment 2' });

      // Verify all comments belong to org1
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM issue_comment WHERE issue_id = $1 AND organization_id = $2',
        [org1IssueId, org1Id]
      );
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(2);

      // Verify no comments exist for org2
      const org2Result = await pool.query(
        'SELECT COUNT(*) as count FROM issue_comment WHERE organization_id = $1',
        [org2Id]
      );
      expect(parseInt(org2Result.rows[0].count)).toBe(0);
    });
  });
});