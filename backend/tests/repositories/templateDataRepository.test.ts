/**
 * TemplateDataRepository Unit Tests
 * 
 * TDD方式でTemplateDataRepositoryの機能をテストします
 */

import { TemplateDataRepository, TemplateDataRecord } from '../../src/repositories/templateDataRepository';
import { getPool, initializePool, closePool, resetPool } from '../../src/database/db';
import { PoolClient } from 'pg';

describe('TemplateDataRepository', () => {
  let repository: TemplateDataRepository;
  let client: PoolClient;

  // テストデータ
  const testOrganizationId = 'test_org_001';
  const testProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const testMethodId = 'method_001';
  const testTaskNo = 1;
  const testUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeAll(async () => {
    // テスト用のデータベース接続プールを初期化
    initializePool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'mmdpf_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || '',
    });

    const pool = getPool();
    client = await pool.connect();
    
    // トランザクション開始
    await client.query('BEGIN');
    
    // テストデータのセットアップ
    await setupTestData(client);
  });

  beforeEach(() => {
    repository = new TemplateDataRepository();
  });

  afterAll(async () => {
    // トランザクションをロールバック（テストデータをクリーンアップ）
    await client.query('ROLLBACK');
    client.release();
    await closePool();
    resetPool();
  });

  describe('upsert', () => {
    it('新規レコードの場合、INSERTされる', async () => {
      const record: TemplateDataRecord = {
        placeId: 'place_new_001',
        templateType: 'material',
        templateId: 'template_001',
        data: { property1: 'value1', property2: 123 },
        status: 'initial',
        comment: 'テストコメント',
      };

      const result = await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        record,
        testUserId,
        client
      );

      // 結果検証
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.organization_id).toBe(testOrganizationId);
      expect(result.project_id).toBe(testProjectId);
      expect(result.method_id).toBe(testMethodId);
      expect(result.task_no).toBe(testTaskNo);
      expect(result.place_id).toBe('place_new_001');
      expect(result.template_type).toBe('material');
      expect(result.template_id).toBe('template_001');
      expect(result.data).toEqual({ property1: 'value1', property2: 123 });
      expect(result.status).toBe('initial');
      expect(result.comment).toBe('テストコメント');
      expect(result.recorded_by).toBe(testUserId);
      expect(result.recorded_at).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('既存レコードの場合、UPDATEされる', async () => {
      // 最初にレコードを作成
      const initialRecord: TemplateDataRecord = {
        placeId: 'place_update_001',
        templateType: 'condition',
        templateId: 'template_002',
        data: { initialData: 'old' },
        status: 'preparing',
        comment: '初期コメント',
      };

      const inserted = await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        initialRecord,
        testUserId,
        client
      );

      // 同じ一意キーで更新
      const updatedRecord: TemplateDataRecord = {
        placeId: 'place_update_001',
        templateType: 'condition',
        templateId: 'template_003', // 変更
        data: { updatedData: 'new' }, // 変更
        status: 'ready', // 変更
        comment: '更新後コメント', // 変更
      };

      const updated = await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        updatedRecord,
        testUserId,
        client
      );

      // 結果検証（IDは変わらない、その他は更新される）
      expect(updated.id).toBe(inserted.id);
      expect(updated.template_id).toBe('template_003');
      expect(updated.data).toEqual({ updatedData: 'new' });
      expect(updated.status).toBe('ready');
      expect(updated.comment).toBe('更新後コメント');
      expect(updated.updated_at.getTime()).toBeGreaterThan(inserted.updated_at.getTime());
    });

    it('JSONB型のdataが正しく保存される', async () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        numbers: [1.5, 2.7, 3.9],
        boolean: true,
        null_value: null,
      };

      const record: TemplateDataRecord = {
        placeId: 'place_jsonb_001',
        templateType: 'result',
        templateId: 'template_004',
        data: complexData,
      };

      const result = await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        record,
        testUserId,
        client
      );

      // JSONB型として正しく保存・取得されることを確認
      expect(result.data).toEqual(complexData);
    });

    it('organization_idフィルタが正しく適用される', async () => {
      const record: TemplateDataRecord = {
        placeId: 'place_org_001',
        templateType: 'material',
        templateId: 'template_005',
        data: { test: 'data' },
      };

      // 異なるorganization_idで保存
      await repository.upsert(
        'other_org_001',
        testProjectId,
        testMethodId,
        testTaskNo,
        record,
        testUserId,
        client
      );

      // 元のorganization_idでは見つからないことを確認
      const found = await repository.findByTaskNo(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        client
      );

      const hasPlaceOrg001 = found.some(r => r.place_id === 'place_org_001');
      expect(hasPlaceOrg001).toBe(false);
    });
  });

  describe('findByTaskNo', () => {
    beforeEach(async () => {
      // テストデータを作成
      await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        {
          placeId: 'place_find_001',
          templateType: 'material',
          templateId: 'template_006',
          data: { find: 'test1' },
        },
        testUserId,
        client
      );

      await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        {
          placeId: 'place_find_002',
          templateType: 'condition',
          templateId: 'template_007',
          data: { find: 'test2' },
        },
        testUserId,
        client
      );
    });

    it('タスク番号で複数のレコードを取得できる', async () => {
      const results = await repository.findByTaskNo(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        client
      );

      expect(results.length).toBeGreaterThanOrEqual(2);
      
      const placeIds = results.map(r => r.place_id);
      expect(placeIds).toContain('place_find_001');
      expect(placeIds).toContain('place_find_002');
    });

    it('organization_idフィルタが正しく適用される', async () => {
      const results = await repository.findByTaskNo(
        'non_existent_org',
        testProjectId,
        testMethodId,
        testTaskNo,
        client
      );

      expect(results).toEqual([]);
    });

    it('該当するデータがない場合は空配列を返す', async () => {
      const results = await repository.findByTaskNo(
        testOrganizationId,
        testProjectId,
        testMethodId,
        9999, // 存在しないtaskNo
        client
      );

      expect(results).toEqual([]);
    });
  });

  describe('findByPlaceId', () => {
    beforeEach(async () => {
      // テストデータを作成
      await repository.upsert(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        {
          placeId: 'place_specific_001',
          templateType: 'result',
          templateId: 'template_008',
          data: { specific: 'data' },
        },
        testUserId,
        client
      );
    });

    it('プレースIDでレコードを取得できる', async () => {
      const result = await repository.findByPlaceId(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        'place_specific_001',
        client
      );

      expect(result).toBeDefined();
      expect(result?.place_id).toBe('place_specific_001');
      expect(result?.template_id).toBe('template_008');
      expect(result?.data).toEqual({ specific: 'data' });
    });

    it('該当するデータがない場合はnullを返す', async () => {
      const result = await repository.findByPlaceId(
        testOrganizationId,
        testProjectId,
        testMethodId,
        testTaskNo,
        'non_existent_place',
        client
      );

      expect(result).toBeNull();
    });

    it('organization_idフィルタが正しく適用される', async () => {
      const result = await repository.findByPlaceId(
        'other_org_002',
        testProjectId,
        testMethodId,
        testTaskNo,
        'place_specific_001',
        client
      );

      expect(result).toBeNull();
    });
  });
});

/**
 * テストデータのセットアップ
 */
async function setupTestData(client: PoolClient): Promise<void> {
  // organizationテーブルにテストデータを挿入
  await client.query(`
    INSERT INTO organization (organization_id, organization_name, created_at, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id) DO NOTHING
  `, ['test_org_001', 'Test Organization 1']);

  await client.query(`
    INSERT INTO organization (organization_id, organization_name, created_at, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id) DO NOTHING
  `, ['other_org_001', 'Other Organization 1']);

  await client.query(`
    INSERT INTO organization (organization_id, organization_name, created_at, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id) DO NOTHING
  `, ['other_org_002', 'Other Organization 2']);

  // projectsテーブルにテストデータを挿入
  await client.query(`
    INSERT INTO projects (id, organization_id, project_name, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id, id) DO NOTHING
  `, ['123e4567-e89b-12d3-a456-426614174000', 'test_org_001', 'Test Project', 'active']);

  // project_taskテーブルにテストデータを挿入
  await client.query(`
    INSERT INTO project_task (
      organization_id, project_id, method_id, task_no,
      task_name, status, progress_rate, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id, project_id, method_id, task_no) DO NOTHING
  `, [
    'test_org_001',
    '123e4567-e89b-12d3-a456-426614174000',
    'method_001',
    1,
    'Test Task',
    'in_progress',
    0
  ]);
}
