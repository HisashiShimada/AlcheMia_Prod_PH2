/**
 * Test: issue_comment外部キー制約のテスト
 * Purpose: 外部キー制約が正しく定義されていることを検証
 * Requirements: REQ-005
 */

import { Pool } from 'pg';

describe('issue_comment Foreign Key Constraints', () => {
  let pool: Pool;

  beforeAll(() => {
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

  describe('Foreign Key Definition Tests', () => {
    test('外部キー制約が3つ存在することを確認', async () => {
      const query = `
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
          AND table_name = 'issue_comment'
      `;
      const result = await pool.query(query);
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    test('organization テーブルへの外部キー制約が定義されている', async () => {
      const query = `
        SELECT kcu.column_name, ccu.table_name, rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'issue_comment'
          AND kcu.column_name = 'organization_id'
      `;
      const result = await pool.query(query);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].table_name).toBe('organization');
      expect(result.rows[0].delete_rule).toBe('CASCADE');
    });

    test('issues テーブルへの外部キー制約が定義されている', async () => {
      const query = `
        SELECT kcu.column_name, ccu.table_name, rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'issue_comment'
          AND kcu.column_name = 'issue_id'
      `;
      const result = await pool.query(query);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].table_name).toBe('issues');
      expect(result.rows[0].delete_rule).toBe('CASCADE');
    });

    test('organization_user テーブルへの外部キー制約(author_id)が定義されている', async () => {
      const query = `
        SELECT kcu.column_name, ccu.table_name, rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'issue_comment'
          AND kcu.column_name = 'author_id'
      `;
      const result = await pool.query(query);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].table_name).toBe('organization_user');
      expect(result.rows[0].delete_rule).toBe('CASCADE');
    });
  });
});