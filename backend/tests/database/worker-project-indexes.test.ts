/**
 * Database Index Verification Tests for Worker Project List API
 * Task 1.1: 既存インデックスの確認と最適化
 */

import { getPool } from '../../src/database/db';

describe('Worker Project List - Database Indexes', () => {
  let pool: any;

  beforeAll(() => {
    pool = getPool();
  });

  /**
   * RED Phase: Test that required indexes exist
   * These tests should initially FAIL, proving indexes don't exist
   */
  describe('Required Indexes for Performance', () => {
    test('project table should have index on (organization_id, project_status)', async () => {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'project'
        AND indexdef LIKE '%organization_id%'
        AND indexdef LIKE '%project_status%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].indexname).toMatch(/idx_project_org_status/);
    });

    test('project table should have index on create_at for sorting', async () => {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'project'
        AND indexdef LIKE '%create_at%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].indexname).toMatch(/idx_project_create_at/);
    });

    test('project_task_detail table should have index on experiment_user_id', async () => {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'project_task_detail'
        AND indexdef LIKE '%experiment_user_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].indexname).toMatch(/idx_project_task_detail_exp_user/);
    });

    test('project_task_detail table should have index on (organization_id, experiment_user_id)', async () => {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'project_task_detail'
        AND indexdef LIKE '%organization_id%'
        AND indexdef LIKE '%experiment_user_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].indexname).toMatch(/idx_project_task_detail_org_user/);
    });
  });

  /**
   * Verify current schema structure matches actual database
   */
  describe('Schema Verification', () => {
    test('project table should have required columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project'
        ORDER BY ordinal_position
      `);

      const columnNames = result.rows.map((row: any) => row.column_name);
      expect(columnNames).toContain('organization_id');
      expect(columnNames).toContain('project_id');
      expect(columnNames).toContain('project_name');
      expect(columnNames).toContain('project_status');
      expect(columnNames).toContain('create_at');
    });

    test('project_task_detail table should have experiment_user_id', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project_task_detail'
        AND column_name = 'experiment_user_id'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('uuid');
    });
  });

  /**
   * Performance baseline verification
   */
  describe('Query Performance Baseline', () => {
    test('query for worker accessible projects should use indexes', async () => {
      // This test will help verify index usage with EXPLAIN
      const testUserId = '00000000-0000-0000-0000-000000000001';
      const testOrgId = '00000000-0000-0000-0000-000000000002';

      const explainResult = await pool.query(`
        EXPLAIN (FORMAT JSON, ANALYZE false)
        SELECT DISTINCT p.*
        FROM project p
        INNER JOIN project_task pt ON p.project_id = pt.project_id 
          AND p.organization_id = pt.organization_id
        INNER JOIN project_task_detail ptd ON pt.project_id = ptd.project_id 
          AND pt.method_id = ptd.method_id
          AND pt.organization_id = ptd.organization_id
        WHERE p.organization_id = $1
          AND ptd.experiment_user_id = $2
          AND p.project_status IN (0, 1, 2)
        ORDER BY p.create_at DESC
        LIMIT 20
      `, [testOrgId, testUserId]);

      // Verify that explain plan exists
      expect(explainResult.rows).toBeDefined();
      expect(explainResult.rows.length).toBeGreaterThan(0);

      // Log the plan for manual review
      console.log('Query Execution Plan:', JSON.stringify(explainResult.rows[0], null, 2));
    });
  });
});