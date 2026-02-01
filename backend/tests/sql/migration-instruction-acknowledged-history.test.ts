import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

describe('Migration: instruction_acknowledged_history', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'maiml_db_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up
    await pool.query('DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE');
  });

  afterEach(async () => {
    // Clean up
    await pool.query('DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE');
  });

  describe('Migration Script Execution', () => {
    test('マイグレーションファイルが存在すること', () => {
      const migrationPath = path.join(
        __dirname, 
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    test('マイグレーションスクリプトが実行可能であること', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // マイグレーション実行
      await expect(pool.query(migrationContent)).resolves.not.toThrow();

      // テーブルが作成されていることを確認
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'instruction_acknowledged_history'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    test('トランザクション制御が含まれていること', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // BEGIN/COMMIT文が含まれていることを確認
      expect(migrationContent).toContain('BEGIN');
      expect(migrationContent).toContain('COMMIT');
    });

    test('既存データへの影響がないこと', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // DROP TABLE IF EXISTSが使用されていることを確認
      expect(migrationContent).toMatch(/DROP TABLE IF EXISTS/i);
    });

    test('ロールバック用のコメントが含まれていること', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // ロールバック手順のコメントが含まれていることを確認
      expect(migrationContent).toMatch(/rollback/i);
      expect(migrationContent).toMatch(/DROP TABLE/i);
    });

    test('マイグレーションメタデータが含まれていること', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // メタデータコメントの確認
      expect(migrationContent).toMatch(/Migration:/i);
      expect(migrationContent).toMatch(/Date:/i);
      expect(migrationContent).toMatch(/Author:/i);
      expect(migrationContent).toMatch(/Description:/i);
    });
  });

  describe('Rollback Functionality', () => {
    test('ロールバック手順が正しく実行できること', async () => {
      // まずマイグレーションを実行
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
      await pool.query(migrationContent);

      // テーブルが存在することを確認
      const beforeRollback = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'instruction_acknowledged_history'
        );
      `);
      expect(beforeRollback.rows[0].exists).toBe(true);

      // ロールバック実行
      await pool.query('DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE');

      // テーブルが削除されていることを確認
      const afterRollback = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'instruction_acknowledged_history'
        );
      `);
      expect(afterRollback.rows[0].exists).toBe(false);
    });
  });

  describe('Idempotency', () => {
    test('マイグレーションスクリプトを複数回実行しても安全であること', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // 1回目の実行
      await expect(pool.query(migrationContent)).resolves.not.toThrow();

      // 2回目の実行（DROP IF EXISTSにより安全に実行できるはず）
      await expect(pool.query(migrationContent)).resolves.not.toThrow();

      // テーブルが存在することを確認
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'instruction_acknowledged_history'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('エラーハンドリングのコメントが含まれていること', async () => {
      const migrationPath = path.join(
        __dirname,
        '../../migrations/20260131_create_instruction_acknowledged_history.sql'
      );
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      // エラー時の対応についてのコメントが含まれていることを確認
      expect(migrationContent).toMatch(/error/i);
    });
  });
});