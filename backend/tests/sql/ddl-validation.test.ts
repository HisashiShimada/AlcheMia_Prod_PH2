import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

describe('DDL Validation: instruction_acknowledged_history', () => {
  let pool: Pool;

  beforeAll(() => {
    // Use test database connection
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
    // Clean up any existing table
    await pool.query('DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE');
  });

  afterEach(async () => {
    // Clean up after each test
    await pool.query('DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE');
  });

  describe('Table Structure', () => {
    test('DDLファイルが存在し、実行可能であること', async () => {
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      
      expect(ddlContent).toBeTruthy();
      
      // DDLを実行
      await expect(pool.query(ddlContent)).resolves.not.toThrow();
    });

    test('必須カラムが存在すること', async () => {
      // DDL実行
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      await pool.query(ddlContent);

      // カラム情報取得
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'instruction_acknowledged_history'
        ORDER BY ordinal_position
      `);

      const columns = result.rows;
      const columnNames = columns.map(c => c.column_name);

      // 必須カラムの存在確認
      expect(columnNames).toContain('history_id');
      expect(columnNames).toContain('instruction_id');
      expect(columnNames).toContain('acknowledged_user_id');
      expect(columnNames).toContain('acknowledged_at');
      expect(columnNames).toContain('organization_id');
      expect(columnNames).toContain('created_at');

      // history_idの検証
      const historyId = columns.find(c => c.column_name === 'history_id');
      expect(historyId?.data_type).toBe('uuid');
      expect(historyId?.is_nullable).toBe('NO');

      // instruction_idの検証
      const instructionId = columns.find(c => c.column_name === 'instruction_id');
      expect(instructionId?.data_type).toBe('uuid');
      expect(instructionId?.is_nullable).toBe('NO');

      // acknowledged_user_idの検証
      const acknowledgedUserId = columns.find(c => c.column_name === 'acknowledged_user_id');
      expect(acknowledgedUserId?.data_type).toBe('uuid');
      expect(acknowledgedUserId?.is_nullable).toBe('NO');

      // acknowledged_atの検証（TIMESTAMP WITH TIME ZONE）
      const acknowledgedAt = columns.find(c => c.column_name === 'acknowledged_at');
      expect(acknowledgedAt?.data_type).toBe('timestamp with time zone');
      expect(acknowledgedAt?.is_nullable).toBe('NO');

      // organization_idの検証
      const organizationId = columns.find(c => c.column_name === 'organization_id');
      expect(organizationId?.data_type).toBe('uuid');
      expect(organizationId?.is_nullable).toBe('NO');

      // created_atの検証
      const createdAt = columns.find(c => c.column_name === 'created_at');
      expect(createdAt?.data_type).toBe('timestamp with time zone');
      expect(createdAt?.column_default).toContain('now()');
    });

    test('主キー制約が正しく設定されていること', async () => {
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      await pool.query(ddlContent);

      const result = await pool.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'instruction_acknowledged_history'::regclass
          AND i.indisprimary
      `);

      const pkColumns = result.rows.map(r => r.attname);
      
      // 主キーはhistory_idのみ
      expect(pkColumns).toEqual(['history_id']);
    });

    test('外部キー制約が設定されていること', async () => {
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      await pool.query(ddlContent);

      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'instruction_acknowledged_history'
      `);

      const fks = result.rows;

      // instruction_idの外部キー
      const instructionFk = fks.find(fk => fk.column_name === 'instruction_id');
      expect(instructionFk).toBeDefined();
      expect(instructionFk?.foreign_table_name).toBe('project_instruction');
      expect(instructionFk?.foreign_column_name).toBe('instruction_id');

      // organization_idの外部キー
      const organizationFk = fks.find(fk => fk.column_name === 'organization_id');
      expect(organizationFk).toBeDefined();
      expect(organizationFk?.foreign_table_name).toBe('organization');
      expect(organizationFk?.foreign_column_name).toBe('organization_id');
    });

    test('適切なインデックスが作成されていること', async () => {
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      await pool.query(ddlContent);

      const result = await pool.query(`
        SELECT
          i.relname AS index_name,
          a.attname AS column_name
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = 'instruction_acknowledged_history'
          AND NOT ix.indisprimary
        ORDER BY i.relname, a.attnum
      `);

      const indexes = result.rows;
      const indexNames = [...new Set(indexes.map(idx => idx.index_name))];

      // 必要なインデックス
      expect(indexNames).toEqual(
        expect.arrayContaining([
          'idx_instruction_ack_history_instruction',
          'idx_instruction_ack_history_org',
          'idx_instruction_ack_history_user',
        ])
      );

      // instruction_idインデックスの確認
      const instructionIndex = indexes.filter(idx => 
        idx.index_name === 'idx_instruction_ack_history_instruction'
      );
      expect(instructionIndex.map(idx => idx.column_name)).toContain('instruction_id');

      // organization_idインデックスの確認
      const orgIndex = indexes.filter(idx => 
        idx.index_name === 'idx_instruction_ack_history_org'
      );
      expect(orgIndex.map(idx => idx.column_name)).toContain('organization_id');

      // acknowledged_user_idインデックスの確認
      const userIndex = indexes.filter(idx => 
        idx.index_name === 'idx_instruction_ack_history_user'
      );
      expect(userIndex.map(idx => idx.column_name)).toContain('acknowledged_user_id');
    });
  });

  describe('Data Integrity', () => {
    test('DEFAULT値が正しく設定されていること', async () => {
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      await pool.query(ddlContent);

      // history_idがUUID自動生成されること
      const historyIdDefault = await pool.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'instruction_acknowledged_history'
          AND column_name = 'history_id'
      `);
      expect(historyIdDefault.rows[0].column_default).toContain('gen_random_uuid()');

      // created_atがNOW()デフォルトであること
      const createdAtDefault = await pool.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'instruction_acknowledged_history'
          AND column_name = 'created_at'
      `);
      expect(createdAtDefault.rows[0].column_default).toContain('now()');
    });

    test('NOT NULL制約が正しく設定されていること', async () => {
      const ddlPath = path.join(__dirname, '../../docs/design/db/ddl/instruction_acknowledged_history.sql');
      const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
      await pool.query(ddlContent);

      const result = await pool.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'instruction_acknowledged_history'
      `);

      const notNullColumns = result.rows.filter(r => r.is_nullable === 'NO').map(r => r.column_name);

      // NOT NULL必須カラム
      expect(notNullColumns).toContain('history_id');
      expect(notNullColumns).toContain('instruction_id');
      expect(notNullColumns).toContain('acknowledged_user_id');
      expect(notNullColumns).toContain('acknowledged_at');
      expect(notNullColumns).toContain('organization_id');
    });
  });
});