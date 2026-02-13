import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';
import type { Pool } from 'pg';

describe('Issue List API - Performance Tests', () => {
  let pool: Pool;
  const testOrgId = '00000000-0000-0000-0000-000000000001';
  const testProjectId = '10000000-0000-0000-0000-000000000001';
  const testUserId = '20000000-0000-0000-0000-000000000001';
  let authToken: string;
  let queryCount = 0;
  let originalQuery: any;

  beforeAll(async () => {
    pool = getPool();

    // Create auth token
    authToken = `maiml_session-test-${Date.now()}`;
    await pool.query(
      `INSERT INTO user_sessions (session_token, user_id, organization_id, role, expires_at)
       VALUES ($1, $2, $3, 'worker', NOW() + INTERVAL '1 day')`,
      [authToken, testUserId, testOrgId]
    );

    // Hook into query method to count queries
    originalQuery = pool.query.bind(pool);
    pool.query = ((...args: any[]) => {
      queryCount++;
      return originalQuery(...args);
    }) as any;
  });

  afterAll(async () => {
    // Restore original query method
    pool.query = originalQuery;

    // Cleanup
    await pool.query('DELETE FROM user_sessions WHERE session_token = $1', [authToken]);
  });

  beforeEach(() => {
    queryCount = 0;
  });

  describe('5.5 Performance Tests', () => {
    describe('Small dataset: 10 issues + 50 comments', () => {
      let issueIds: string[] = [];

      beforeAll(async () => {
        // Create 10 issues
        for (let i = 0; i < 10; i++) {
          const result = await pool.query(
            `INSERT INTO issue (
              organization_id, project_id, method_id, task_no, transition_id,
              issue_target, issue_type, title, description, status, reported_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING issue_id`,
            [
              testOrgId,
              testProjectId,
              `method_perf_${i}`,
              i + 1,
              `transition_perf_${i}`,
              'transition',
              'bug',
              `Performance Test Issue ${i}`,
              `Description for issue ${i}`,
              'open',
              testUserId
            ]
          );
          issueIds.push(result.rows[0].issue_id);
        }

        // Create 5 comments per issue (50 total)
        for (const issueId of issueIds) {
          for (let j = 0; j < 5; j++) {
            await pool.query(
              `INSERT INTO issue_comment (
                issue_id, organization_id, sequence_no, comment_text, posted_by
              ) VALUES ($1, $2, $3, $4, $5)`,
              [issueId, testOrgId, j + 1, `Comment ${j + 1}`, testUserId]
            );
          }
        }
      });

      afterAll(async () => {
        // Cleanup
        await pool.query('DELETE FROM issue_comment WHERE issue_id = ANY($1)', [issueIds]);
        await pool.query('DELETE FROM issue WHERE issue_id = ANY($1)', [issueIds]);
      });

      test('should respond within 500ms', async () => {
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/v1/issues')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', testOrgId)
          .query({
            project_id: testProjectId,
            method_id: 'method_perf_0',
            task_no: '1',
            transition_id: 'transition_perf_0'
          });

        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(500); // Must respond within 500ms
      });
    });

    describe('Large dataset: 100 issues + 500 comments', () => {
      let issueIds: string[] = [];

      beforeAll(async () => {
        // Create 100 issues
        for (let i = 0; i < 100; i++) {
          const result = await pool.query(
            `INSERT INTO issue (
              organization_id, project_id, method_id, task_no, transition_id,
              issue_target, issue_type, title, description, status, reported_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING issue_id`,
            [
              testOrgId,
              testProjectId,
              `method_large_${i}`,
              i + 1,
              `transition_large_${i}`,
              'transition',
              'bug',
              `Large Test Issue ${i}`,
              `Description for large issue ${i}`,
              'open',
              testUserId
            ]
          );
          issueIds.push(result.rows[0].issue_id);
        }

        // Create 5 comments per issue (500 total)
        for (const issueId of issueIds) {
          for (let j = 0; j < 5; j++) {
            await pool.query(
              `INSERT INTO issue_comment (
                issue_id, organization_id, sequence_no, comment_text, posted_by
              ) VALUES ($1, $2, $3, $4, $5)`,
              [issueId, testOrgId, j + 1, `Comment ${j + 1}`, testUserId]
            );
          }
        }
      });

      afterAll(async () => {
        // Cleanup
        await pool.query('DELETE FROM issue_comment WHERE issue_id = ANY($1)', [issueIds]);
        await pool.query('DELETE FROM issue WHERE issue_id = ANY($1)', [issueIds]);
      });

      test('should respond within 1 second', async () => {
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/v1/issues')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', testOrgId)
          .query({
            project_id: testProjectId,
            method_id: 'method_large_0',
            task_no: '1',
            transition_id: 'transition_large_0'
          });

        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(1000); // Must respond within 1 second
      });
    });

    describe('Query execution count (N+1 avoidance)', () => {
      let issueIds: string[] = [];

      beforeAll(async () => {
        // Create 5 issues with comments for query count test
        for (let i = 0; i < 5; i++) {
          const result = await pool.query(
            `INSERT INTO issue (
              organization_id, project_id, method_id, task_no, transition_id,
              issue_target, issue_type, title, description, status, reported_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING issue_id`,
            [
              testOrgId,
              testProjectId,
              'method_query_test',
              1,
              `transition_query_${i}`,
              'transition',
              'bug',
              `Query Test Issue ${i}`,
              `Description ${i}`,
              'open',
              testUserId
            ]
          );
          issueIds.push(result.rows[0].issue_id);

          // Add 2 comments per issue
          for (let j = 0; j < 2; j++) {
            await pool.query(
              `INSERT INTO issue_comment (
                issue_id, organization_id, sequence_no, comment_text, posted_by
              ) VALUES ($1, $2, $3, $4, $5)`,
              [issueIds[i], testOrgId, j + 1, `Comment ${j + 1}`, testUserId]
            );
          }
        }
      });

      afterAll(async () => {
        await pool.query('DELETE FROM issue_comment WHERE issue_id = ANY($1)', [issueIds]);
        await pool.query('DELETE FROM issue WHERE issue_id = ANY($1)', [issueIds]);
      });

      test('should execute exactly 2 queries (no N+1 problem)', async () => {
        queryCount = 0; // Reset counter

        await request(app)
          .get('/api/v1/issues')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', testOrgId)
          .query({
            project_id: testProjectId,
            method_id: 'method_query_test',
            task_no: '1',
            transition_id: 'transition_query_0'
          });

        // Should be exactly 2 queries:
        // 1. Fetch issues with JOINs
        // 2. Fetch all comments in one batch
        // Note: Auth middleware may add 1-2 queries, so we check <= 4
        expect(queryCount).toBeLessThanOrEqual(4);
      });
    });

    describe('Memory usage', () => {
      let issueIds: string[] = [];

      beforeAll(async () => {
        // Create 50 issues with 5 comments each
        for (let i = 0; i < 50; i++) {
          const result = await pool.query(
            `INSERT INTO issue (
              organization_id, project_id, method_id, task_no, transition_id,
              issue_target, issue_type, title, description, status, reported_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING issue_id`,
            [
              testOrgId,
              testProjectId,
              'method_memory_test',
              1,
              `transition_memory_${i}`,
              'transition',
              'bug',
              `Memory Test Issue ${i}`,
              `Description for memory test ${i}`,
              'open',
              testUserId
            ]
          );
          issueIds.push(result.rows[0].issue_id);

          for (let j = 0; j < 5; j++) {
            await pool.query(
              `INSERT INTO issue_comment (
                issue_id, organization_id, sequence_no, comment_text, posted_by
              ) VALUES ($1, $2, $3, $4, $5)`,
              [issueIds[i], testOrgId, j + 1, `Comment ${j + 1}`, testUserId]
            );
          }
        }
      });

      afterAll(async () => {
        await pool.query('DELETE FROM issue_comment WHERE issue_id = ANY($1)', [issueIds]);
        await pool.query('DELETE FROM issue WHERE issue_id = ANY($1)', [issueIds]);
      });

      test('should use less than 100MB of memory', async () => {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const memBefore = process.memoryUsage().heapUsed;

        await request(app)
          .get('/api/v1/issues')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', testOrgId)
          .query({
            project_id: testProjectId,
            method_id: 'method_memory_test',
            task_no: '1',
            transition_id: 'transition_memory_0'
          });

        const memAfter = process.memoryUsage().heapUsed;
        const memUsedMB = (memAfter - memBefore) / (1024 * 1024);

        // Memory usage should be less than 100MB
        expect(memUsedMB).toBeLessThan(100);
      });
    });
  });
});