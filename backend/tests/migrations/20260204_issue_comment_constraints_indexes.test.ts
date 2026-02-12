/**
 * Tests for issue_comment table check constraints and indexes
 */

import { Pool } from 'pg';

describe('issue_comment table constraints and indexes', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'maiml_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Check Constraints', () => {
    describe('sequence_no > 0 constraint', () => {
      it('should reject sequence_no = 0', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test organization
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          // Insert test user
          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          // Insert test project
          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Insert test issue
          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Try to insert comment with sequence_no = 0
          await expect(
            client.query(
              `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
               VALUES ($1, $2, $3, 0, 'Test comment', $4, NOW(), $4, NOW(), $4, NOW())`,
              ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002']
            )
          ).rejects.toThrow();

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });

      it('should reject negative sequence_no', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test data (same as above)
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Try to insert comment with negative sequence_no
          await expect(
            client.query(
              `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
               VALUES ($1, $2, $3, -1, 'Test comment', $4, NOW(), $4, NOW(), $4, NOW())`,
              ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002']
            )
          ).rejects.toThrow();

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });

      it('should accept positive sequence_no', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test data
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Insert comment with positive sequence_no - should succeed
          const result = await client.query(
            `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 1, 'Test comment', $4, NOW(), $4, NOW(), $4, NOW())
             RETURNING sequence_no`,
            ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002']
          );

          expect(result.rows[0].sequence_no).toBe(1);

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });
    });

    describe('comment length constraint', () => {
      it('should reject empty comment', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test data
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Try to insert comment with empty string
          await expect(
            client.query(
              `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
               VALUES ($1, $2, $3, 1, '', $4, NOW(), $4, NOW(), $4, NOW())`,
              ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002']
            )
          ).rejects.toThrow();

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });

      it('should reject comment longer than 2000 characters', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test data
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Create a comment longer than 2000 characters
          const longComment = 'a'.repeat(2001);

          // Try to insert comment with 2001 characters
          await expect(
            client.query(
              `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
               VALUES ($1, $2, $3, 1, $5, $4, NOW(), $4, NOW(), $4, NOW())`,
              ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', longComment]
            )
          ).rejects.toThrow();

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });

      it('should accept comment with exactly 2000 characters', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test data
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Create a comment with exactly 2000 characters
          const maxComment = 'a'.repeat(2000);

          // Insert comment with 2000 characters - should succeed
          const result = await client.query(
            `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 1, $5, $4, NOW(), $4, NOW(), $4, NOW())
             RETURNING LENGTH(comment) as comment_length`,
            ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', maxComment]
          );

          expect(result.rows[0].comment_length).toBe(2000);

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });

      it('should accept valid comment (1-2000 characters)', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert test data
          await client.query(
            `INSERT INTO organization (id, organization_name, organization_prefix, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, 'Test Org', 'test_org', $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO organization_user (id, organization_id, user_name, password_hash, role_id, is_active, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test User', 'hash', 3, true, $1, NOW(), $1, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001']
          );

          await client.query(
            `INSERT INTO project (id, organization_id, project_name, description, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, 'Test Project', 'Description', $3, NOW(), $3, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
          );

          await client.query(
            `INSERT INTO issues (id, organization_id, project_id, title, description, status, priority, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 'Test Issue', 'Description', 'open', 'medium', $4, NOW(), $4, NOW())`,
            ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002']
          );

          // Insert comment with valid length - should succeed
          const result = await client.query(
            `INSERT INTO issue_comment (organization_id, project_id, issue_id, sequence_no, comment, author_id, commented_at, create_user_id, create_at, update_user_id, update_at)
             VALUES ($1, $2, $3, 1, 'This is a valid comment', $4, NOW(), $4, NOW(), $4, NOW())
             RETURNING comment`,
            ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002']
          );

          expect(result.rows[0].comment).toBe('This is a valid comment');

          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      });
    });
  });

  describe('Indexes', () => {
    it('should have composite index on (organization_id, issue_id, sequence_no)', async () => {
      const result = await pool.query(`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          a.attnum as column_position
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = 'issue_comment'
          AND i.relname LIKE '%organization_id%issue_id%sequence_no%'
        ORDER BY a.attnum
      `);

      // Should have index covering these three columns
      expect(result.rows.length).toBeGreaterThanOrEqual(3);
      
      const columnNames = result.rows.map(row => row.column_name);
      expect(columnNames).toContain('organization_id');
      expect(columnNames).toContain('issue_id');
      expect(columnNames).toContain('sequence_no');
    });

    it('should have index on (author_id, commented_at DESC)', async () => {
      const result = await pool.query(`
        SELECT
          i.relname as index_name,
          pg_get_indexdef(i.oid) as index_definition
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        WHERE t.relname = 'issue_comment'
          AND pg_get_indexdef(i.oid) LIKE '%author_id%'
          AND pg_get_indexdef(i.oid) LIKE '%commented_at%'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      
      const indexDef = result.rows[0].index_definition;
      expect(indexDef).toContain('author_id');
      expect(indexDef).toContain('commented_at');
      expect(indexDef).toMatch(/commented_at.*DESC/);
    });

    it('should use composite index for queries filtering by organization_id and issue_id', async () => {
      const client = await pool.connect();
      try {
        // Get query plan
        const result = await client.query(`
          EXPLAIN (FORMAT JSON)
          SELECT * FROM issue_comment
          WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001'
            AND issue_id = '550e8400-e29b-41d4-a716-446655440004'
          ORDER BY sequence_no
        `);

        const plan = JSON.stringify(result.rows[0]);
        
        // Should use index scan (not sequential scan)
        expect(plan).toMatch(/Index.*Scan/i);
      } finally {
        client.release();
      }
    });

    it('should use author index for queries filtering by author_id', async () => {
      const client = await pool.connect();
      try {
        // Get query plan
        const result = await client.query(`
          EXPLAIN (FORMAT JSON)
          SELECT * FROM issue_comment
          WHERE author_id = '550e8400-e29b-41d4-a716-446655440002'
          ORDER BY commented_at DESC
        `);

        const plan = JSON.stringify(result.rows[0]);
        
        // Should use index scan
        expect(plan).toMatch(/Index.*Scan/i);
      } finally {
        client.release();
      }
    });
  });
});