/**
 * Tests for template_data table migration
 * テーブル作成、制約、インデックスの検証
 */

import { Pool } from 'pg';

describe('template_data table migration', () => {
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

  describe('Table Structure', () => {
    it('should have template_data table', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_data'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].table_name).toBe('template_data');
    });

    it('should have all required columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'template_data'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map(row => row.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('organization_id');
      expect(columns).toContain('project_id');
      expect(columns).toContain('method_id');
      expect(columns).toContain('task_no');
      expect(columns).toContain('place_id');
      expect(columns).toContain('template_type');
      expect(columns).toContain('template_id');
      expect(columns).toContain('data');
      expect(columns).toContain('status');
      expect(columns).toContain('comment');
      expect(columns).toContain('recorded_by');
      expect(columns).toContain('recorded_at');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should have correct data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'template_data'
      `);

      const dataTypes = result.rows.reduce((acc, row) => {
        acc[row.column_name] = row.udt_name;
        return acc;
      }, {} as Record<string, string>);

      expect(dataTypes.id).toBe('uuid');
      expect(dataTypes.organization_id).toBe('varchar');
      expect(dataTypes.project_id).toBe('uuid');
      expect(dataTypes.method_id).toBe('varchar');
      expect(dataTypes.task_no).toBe('int4');
      expect(dataTypes.place_id).toBe('varchar');
      expect(dataTypes.template_type).toBe('varchar');
      expect(dataTypes.template_id).toBe('varchar');
      expect(dataTypes.data).toBe('jsonb');
      expect(dataTypes.status).toBe('varchar');
      expect(dataTypes.comment).toBe('text');
      expect(dataTypes.recorded_by).toBe('uuid');
      expect(dataTypes.recorded_at).toBe('timestamp');
      expect(dataTypes.created_at).toBe('timestamp');
      expect(dataTypes.updated_at).toBe('timestamp');
    });

    it('should have NOT NULL constraints on required columns', async () => {
      const result = await pool.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'template_data'
          AND is_nullable = 'NO'
      `);

      const notNullColumns = result.rows.map(row => row.column_name);
      
      expect(notNullColumns).toContain('id');
      expect(notNullColumns).toContain('organization_id');
      expect(notNullColumns).toContain('project_id');
      expect(notNullColumns).toContain('method_id');
      expect(notNullColumns).toContain('task_no');
      expect(notNullColumns).toContain('place_id');
      expect(notNullColumns).toContain('template_type');
      expect(notNullColumns).toContain('template_id');
      expect(notNullColumns).toContain('data');
      expect(notNullColumns).toContain('recorded_by');
      expect(notNullColumns).toContain('recorded_at');
      expect(notNullColumns).toContain('created_at');
      expect(notNullColumns).toContain('updated_at');
    });
  });

  describe('Constraints', () => {
    it('should have primary key on id', async () => {
      const result = await pool.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'template_data'
          AND constraint_type = 'PRIMARY KEY'
      `);

      expect(result.rows.length).toBe(1);
    });

    it('should have unique constraint on (organization_id, project_id, method_id, task_no, place_id)', async () => {
      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'template_data'
          AND tc.constraint_type = 'UNIQUE'
        GROUP BY tc.constraint_name
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      
      const uniqueConstraint = result.rows.find(row => 
        row.columns.includes('organization_id') &&
        row.columns.includes('project_id') &&
        row.columns.includes('method_id') &&
        row.columns.includes('task_no') &&
        row.columns.includes('place_id')
      );
      
      expect(uniqueConstraint).toBeDefined();
    });

    it('should have CHECK constraint for template_type', async () => {
      const result = await pool.query(`
        SELECT
          constraint_name,
          check_clause
        FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name LIKE '%template_data%template_type%'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      
      const checkClause = result.rows[0].check_clause;
      expect(checkClause).toContain('material');
      expect(checkClause).toContain('condition');
      expect(checkClause).toContain('result');
    });

    it('should have CHECK constraint for status', async () => {
      const result = await pool.query(`
        SELECT
          constraint_name,
          check_clause
        FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name LIKE '%template_data%status%'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      
      const checkClause = result.rows[0].check_clause;
      expect(checkClause).toContain('initial');
      expect(checkClause).toContain('preparing');
      expect(checkClause).toContain('ready');
      expect(checkClause).toContain('running');
      expect(checkClause).toContain('paused');
      expect(checkClause).toContain('completed');
      expect(checkClause).toContain('error');
    });

    it('should reject invalid template_type', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orgId = '550e8400-e29b-41d4-a716-446655440001';
        const projectId = '550e8400-e29b-41d4-a716-446655440002';
        const userId = '550e8400-e29b-41d4-a716-446655440003';

        // Try to insert with invalid template_type
        await expect(
          client.query(
            `INSERT INTO template_data 
             (organization_id, project_id, method_id, task_no, place_id, 
              template_type, template_id, data, recorded_by, recorded_at)
             VALUES ($1, $2, 'method1', 1, 'place1', 'invalid_type', 'temp1', '{}', $3, NOW())`,
            [orgId, projectId, userId]
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should reject invalid status', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orgId = '550e8400-e29b-41d4-a716-446655440001';
        const projectId = '550e8400-e29b-41d4-a716-446655440002';
        const userId = '550e8400-e29b-41d4-a716-446655440003';

        // Try to insert with invalid status
        await expect(
          client.query(
            `INSERT INTO template_data 
             (organization_id, project_id, method_id, task_no, place_id, 
              template_type, template_id, data, status, recorded_by, recorded_at)
             VALUES ($1, $2, 'method1', 1, 'place1', 'material', 'temp1', '{}', 'invalid_status', $3, NOW())`,
            [orgId, projectId, userId]
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  describe('Indexes', () => {
    it('should have index on (organization_id, recorded_at)', async () => {
      const result = await pool.query(`
        SELECT
          i.relname as index_name,
          pg_get_indexdef(i.oid) as index_definition
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        WHERE t.relname = 'template_data'
          AND pg_get_indexdef(i.oid) LIKE '%organization_id%'
          AND pg_get_indexdef(i.oid) LIKE '%recorded_at%'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should have index on (project_id, task_no)', async () => {
      const result = await pool.query(`
        SELECT
          i.relname as index_name,
          pg_get_indexdef(i.oid) as index_definition
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        WHERE t.relname = 'template_data'
          AND pg_get_indexdef(i.oid) LIKE '%project_id%'
          AND pg_get_indexdef(i.oid) LIKE '%task_no%'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should have GIN index on data (JSONB) column', async () => {
      const result = await pool.query(`
        SELECT
          i.relname as index_name,
          am.amname as index_type,
          pg_get_indexdef(i.oid) as index_definition
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        WHERE t.relname = 'template_data'
          AND pg_get_indexdef(i.oid) LIKE '%data%'
          AND am.amname = 'gin'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Operations', () => {
    it('should insert and retrieve JSONB data correctly', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orgId = '550e8400-e29b-41d4-a716-446655440001';
        const projectId = '550e8400-e29b-41d4-a716-446655440002';
        const userId = '550e8400-e29b-41d4-a716-446655440003';

        const testData = {
          properties: [
            { name: 'temperature', value: '25', unit: 'C' },
            { name: 'pressure', value: '1.0', unit: 'atm' }
          ]
        };

        // Insert data
        const insertResult = await client.query(
          `INSERT INTO template_data 
           (organization_id, project_id, method_id, task_no, place_id, 
            template_type, template_id, data, recorded_by, recorded_at)
           VALUES ($1, $2, 'method1', 1, 'place1', 'material', 'temp1', $3, $4, NOW())
           RETURNING id, data`,
          [orgId, projectId, JSON.stringify(testData), userId]
        );

        expect(insertResult.rows[0].data).toEqual(testData);

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should enforce unique constraint on (organization_id, project_id, method_id, task_no, place_id)', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orgId = '550e8400-e29b-41d4-a716-446655440001';
        const projectId = '550e8400-e29b-41d4-a716-446655440002';
        const userId = '550e8400-e29b-41d4-a716-446655440003';

        // Insert first record
        await client.query(
          `INSERT INTO template_data 
           (organization_id, project_id, method_id, task_no, place_id, 
            template_type, template_id, data, recorded_by, recorded_at)
           VALUES ($1, $2, 'method1', 1, 'place1', 'material', 'temp1', '{}', $3, NOW())`,
          [orgId, projectId, userId]
        );

        // Try to insert duplicate (same unique key)
        await expect(
          client.query(
            `INSERT INTO template_data 
             (organization_id, project_id, method_id, task_no, place_id, 
              template_type, template_id, data, recorded_by, recorded_at)
             VALUES ($1, $2, 'method1', 1, 'place1', 'condition', 'temp2', '{}', $3, NOW())`,
            [orgId, projectId, userId]
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should allow different place_id with same other keys', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orgId = '550e8400-e29b-41d4-a716-446655440001';
        const projectId = '550e8400-e29b-41d4-a716-446655440002';
        const userId = '550e8400-e29b-41d4-a716-446655440003';

        // Insert first record
        await client.query(
          `INSERT INTO template_data 
           (organization_id, project_id, method_id, task_no, place_id, 
            template_type, template_id, data, recorded_by, recorded_at)
           VALUES ($1, $2, 'method1', 1, 'place1', 'material', 'temp1', '{}', $3, NOW())`,
          [orgId, projectId, userId]
        );

        // Insert second record with different place_id - should succeed
        const result = await client.query(
          `INSERT INTO template_data 
           (organization_id, project_id, method_id, task_no, place_id, 
            template_type, template_id, data, recorded_by, recorded_at)
           VALUES ($1, $2, 'method1', 1, 'place2', 'material', 'temp1', '{}', $3, NOW())
           RETURNING place_id`,
          [orgId, projectId, userId]
        );

        expect(result.rows[0].place_id).toBe('place2');

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });
});
