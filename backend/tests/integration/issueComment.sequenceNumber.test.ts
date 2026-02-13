/**
 * Integration Test: Issue Comment POST API - Sequence Number Verification
 * 
 * Tests sequence number generation and independence to ensure:
 * - Multiple comments on the same issue get sequential numbers (1, 2, 3...)
 * - Sequence numbers are independent between different issues
 * - Sequence numbers persist correctly in database
 * 
 * Requirements: REQ-001, REQ-005
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import issueRoutes from '../../src/routes/issueRoutes';
import { getPool } from '../../src/database/db';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use('/api/v1/issues', issueRoutes);

describe('POST /api/v1/issues/:issueId/comments - Sequence Number Integration', () => {
  let pool: any;
  
  const organizationId = uuidv4();
  const projectId = uuidv4();
  const issue1Id = uuidv4();
  const issue2Id = uuidv4();
  const userId = uuidv4();
  let authToken: string;

  beforeAll(async () => {
    pool = getPool();
    
    // Create Organization
    await pool.query(`
      INSERT INTO organization (id, organization_name, organization_prefix, organization_type, is_active)
      VALUES ($1, 'Test Org', 'test_org', 'research', true)
    `, [organizationId]);
    
    // Create User (Worker role)
    await pool.query(`
      INSERT INTO organization_user (id, organization_id, user_name, email, password_hash, role_id, is_active)
      VALUES ($1, $2, 'worker', 'worker@test.com', '$2b$12$test', 1, true)
    `, [userId, organizationId]);
    
    // Create Project
    await pool.query(`
      INSERT INTO project (id, organization_id, project_name, description, status, create_user_id, update_user_id)
      VALUES ($1, $2, 'Test Project', 'Test Description', 'active', $3, $3)
    `, [projectId, organizationId, userId]);
    
    // Create Issue 1
    await pool.query(`
      INSERT INTO issues (id, organization_id, project_id, issue_title, issue_description, status, priority, reporter_id, create_user_id, update_user_id)
      VALUES ($1, $2, $3, 'Issue 1', 'Test Issue 1', 'open', 'medium', $4, $4, $4)
    `, [issue1Id, organizationId, projectId, userId]);
    
    // Create Issue 2
    await pool.query(`
      INSERT INTO issues (id, organization_id, project_id, issue_title, issue_description, status, priority, reporter_id, create_user_id, update_user_id)
      VALUES ($1, $2, $3, 'Issue 2', 'Test Issue 2', 'open', 'medium', $4, $4, $4)
    `, [issue2Id, organizationId, projectId, userId]);
    
    // Generate JWT token
    authToken = jwt.sign(
      {
        userId,
        organizationId,
        role: 'worker'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM issue_comment WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM issues WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM project WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization_user WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organization WHERE id = $1', [organizationId]);
    
    await pool.end();
  });

  describe('REQ-001, REQ-005: Sequence number generation', () => {
    test('should assign sequence_no=1 to first comment on an issue', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issue1Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'First comment on Issue 1'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sequenceNo).toBe(1);
      expect(response.body.data.issueId).toBe(issue1Id);
      expect(response.body.data.comment).toBe('First comment on Issue 1');
    });

    test('should assign sequence_no=2 to second comment on same issue', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issue1Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Second comment on Issue 1'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sequenceNo).toBe(2);
      expect(response.body.data.issueId).toBe(issue1Id);
    });

    test('should assign sequence_no=3 to third comment on same issue', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issue1Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Third comment on Issue 1'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sequenceNo).toBe(3);
      expect(response.body.data.issueId).toBe(issue1Id);
    });

    test('should verify all three comments have sequential numbers in database', async () => {
      const result = await pool.query(
        `SELECT sequence_no, comment 
         FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         ORDER BY sequence_no ASC`,
        [organizationId, issue1Id]
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].sequence_no).toBe(1);
      expect(result.rows[0].comment).toBe('First comment on Issue 1');
      expect(result.rows[1].sequence_no).toBe(2);
      expect(result.rows[1].comment).toBe('Second comment on Issue 1');
      expect(result.rows[2].sequence_no).toBe(3);
      expect(result.rows[2].comment).toBe('Third comment on Issue 1');
    });
  });

  describe('REQ-001, REQ-005: Sequence number independence', () => {
    test('should assign sequence_no=1 to first comment on different issue (Issue 2)', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issue2Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'First comment on Issue 2'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sequenceNo).toBe(1);
      expect(response.body.data.issueId).toBe(issue2Id);
      expect(response.body.data.comment).toBe('First comment on Issue 2');
    });

    test('should assign sequence_no=2 to second comment on Issue 2', async () => {
      const response = await request(app)
        .post(`/api/v1/issues/${issue2Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Second comment on Issue 2'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sequenceNo).toBe(2);
      expect(response.body.data.issueId).toBe(issue2Id);
    });

    test('should verify sequence numbers are independent between issues', async () => {
      // Verify Issue 1 still has sequence 1, 2, 3
      const issue1Result = await pool.query(
        `SELECT COUNT(*) as count, MAX(sequence_no) as max_seq 
         FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2`,
        [organizationId, issue1Id]
      );
      
      expect(parseInt(issue1Result.rows[0].count)).toBe(3);
      expect(issue1Result.rows[0].max_seq).toBe(3);

      // Verify Issue 2 has sequence 1, 2
      const issue2Result = await pool.query(
        `SELECT COUNT(*) as count, MAX(sequence_no) as max_seq 
         FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2`,
        [organizationId, issue2Id]
      );
      
      expect(parseInt(issue2Result.rows[0].count)).toBe(2);
      expect(issue2Result.rows[0].max_seq).toBe(2);
    });

    test('should continue sequence numbering correctly after adding more comments', async () => {
      // Add 4th comment to Issue 1
      const response1 = await request(app)
        .post(`/api/v1/issues/${issue1Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Fourth comment on Issue 1'
        });

      expect(response1.status).toBe(201);
      expect(response1.body.data.sequenceNo).toBe(4);

      // Add 3rd comment to Issue 2
      const response2 = await request(app)
        .post(`/api/v1/issues/${issue2Id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationId)
        .send({
          comment: 'Third comment on Issue 2'
        });

      expect(response2.status).toBe(201);
      expect(response2.body.data.sequenceNo).toBe(3);
    });

    test('should verify final sequence numbers in database', async () => {
      // Issue 1 should have 4 comments (sequence 1-4)
      const issue1Result = await pool.query(
        `SELECT sequence_no FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         ORDER BY sequence_no ASC`,
        [organizationId, issue1Id]
      );
      
      expect(issue1Result.rows).toHaveLength(4);
      expect(issue1Result.rows.map((r: any) => r.sequence_no)).toEqual([1, 2, 3, 4]);

      // Issue 2 should have 3 comments (sequence 1-3)
      const issue2Result = await pool.query(
        `SELECT sequence_no FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         ORDER BY sequence_no ASC`,
        [organizationId, issue2Id]
      );
      
      expect(issue2Result.rows).toHaveLength(3);
      expect(issue2Result.rows.map((r: any) => r.sequence_no)).toEqual([1, 2, 3]);
    });
  });

  describe('REQ-005: Sequence number data integrity', () => {
    test('should have no gaps in sequence numbers', async () => {
      // Check Issue 1: should be continuous 1, 2, 3, 4
      const issue1Result = await pool.query(
        `SELECT sequence_no FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         ORDER BY sequence_no ASC`,
        [organizationId, issue1Id]
      );
      
      for (let i = 0; i < issue1Result.rows.length; i++) {
        expect(issue1Result.rows[i].sequence_no).toBe(i + 1);
      }

      // Check Issue 2: should be continuous 1, 2, 3
      const issue2Result = await pool.query(
        `SELECT sequence_no FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         ORDER BY sequence_no ASC`,
        [organizationId, issue2Id]
      );
      
      for (let i = 0; i < issue2Result.rows.length; i++) {
        expect(issue2Result.rows[i].sequence_no).toBe(i + 1);
      }
    });

    test('should have no duplicate sequence numbers within same issue', async () => {
      // Check Issue 1
      const issue1Result = await pool.query(
        `SELECT sequence_no, COUNT(*) as count 
         FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         GROUP BY sequence_no 
         HAVING COUNT(*) > 1`,
        [organizationId, issue1Id]
      );
      
      expect(issue1Result.rows).toHaveLength(0); // No duplicates

      // Check Issue 2
      const issue2Result = await pool.query(
        `SELECT sequence_no, COUNT(*) as count 
         FROM issue_comment 
         WHERE organization_id = $1 AND issue_id = $2 
         GROUP BY sequence_no 
         HAVING COUNT(*) > 1`,
        [organizationId, issue2Id]
      );
      
      expect(issue2Result.rows).toHaveLength(0); // No duplicates
    });
  });
});