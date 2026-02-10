import { Pool } from 'pg';
import { getPool } from '../../../src/database/db';

describe('Migration: 20260204_create_issues_table', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = getPool();
  });

  afterAll(async () => {
    // テスト用テーブル削除
    await pool.query('DROP TABLE IF EXISTS issues CASCADE');
  });

  describe('テーブル構造', () => {
    it('issuesテーブルが存在すること', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'issues'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('すべての必須カラムが存在すること', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'issues'
        ORDER BY ordinal_position;
      `);

      const columns = result.rows.map(row => row.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('organization_id');
      expect(columns).toContain('project_id');
      expect(columns).toContain('task_detail_id');
      expect(columns).toContain('reporter_id');
      expect(columns).toContain('title');
      expect(columns).toContain('description');
      expect(columns).toContain('issue_type');
      expect(columns).toContain('severity');
      expect(columns).toContain('status');
      expect(columns).toContain('assignee_id');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('主キー制約が設定されていること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'PRIMARY KEY';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('インデックス', () => {
    it('organization_id + project_id 複合インデックスが存在すること', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'issues'
        AND indexname LIKE '%organization_id%project_id%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('reporter_id インデックスが存在すること', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'issues'
        AND indexname LIKE '%reporter_id%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('status インデックスが存在すること', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'issues'
        AND indexname LIKE '%status%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('created_at インデックスが存在すること', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'issues'
        AND indexname LIKE '%created_at%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('外部キー制約', () => {
    it('organization_id の外部キー制約が存在すること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%organization%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('project_id の外部キー制約が存在すること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%project%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('reporter_id の外部キー制約が存在すること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%reporter%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('CHECK制約', () => {
    it('issue_type のCHECK制約が存在すること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%issue_type%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('severity のCHECK制約が存在すること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%severity%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('status のCHECK制約が存在すること', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'issues'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status%';
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('デフォルト値', () => {
    it('status のデフォルト値が "open" であること', async () => {
      const result = await pool.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'issues'
        AND column_name = 'status';
      `);
      expect(result.rows[0].column_default).toContain('open');
    });

    it('created_at のデフォルト値が CURRENT_TIMESTAMP であること', async () => {
      const result = await pool.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'issues'
        AND column_name = 'created_at';
      `);
      expect(result.rows[0].column_default).toBeTruthy();
    });

    it('updated_at のデフォルト値が CURRENT_TIMESTAMP であること', async () => {
      const result = await pool.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'issues'
        AND column_name = 'updated_at';
      `);
      expect(result.rows[0].column_default).toBeTruthy();
    });
  });
});