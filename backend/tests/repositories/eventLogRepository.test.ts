/**
 * EventLogRepositoryのユニットテスト
 * 
 * maiml_event_logテーブルへのイベント記録操作のテストを実施します。
 */

import { PoolClient } from 'pg';
import { EventLogRepository, EventLogData } from '../../src/repositories/eventLogRepository';
import { getPool, initializePool, closePool, resetPool } from '../../src/database/db';

describe('EventLogRepository', () => {
  let client: PoolClient;
  let repository: EventLogRepository;

  // テストデータ
  const testOrganizationId = 'test-org-001';
  const testProjectId = '12345678-1234-1234-1234-123456789abc';
  const testUserId = 'test-user-001';

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
    await setupTestData(client, testOrganizationId, testProjectId);
    
    repository = new EventLogRepository();
  });

  afterAll(async () => {
    // トランザクションをロールバック（テストデータをクリーンアップ）
    await client.query('ROLLBACK');
    client.release();
    await closePool();
    resetPool();
  });

  beforeEach(async () => {
    // 各テストの前にイベントログをクリーンアップ
    await client.query(
      'DELETE FROM maiml_event_log WHERE organization_id = $1',
      [testOrganizationId]
    );
  });

  describe('logEvent', () => {
    it('should log event with auto-incremented sequence_no', async () => {
      // Arrange
      const eventData: EventLogData = {
        event_type: 'transition_status_update',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'transition-001',
        status: 'running',
        progress_rate: 50,
        comment: 'Test comment',
        updated_by: testUserId,
        timestamp: new Date(),
      };

      // Act
      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData,
        client
      );

      // Assert
      const result = await client.query(
        `SELECT sequence_no, log
         FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2
         ORDER BY sequence_no`,
        [testOrganizationId, testProjectId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].sequence_no).toBe(1);
      expect(result.rows[0].log).toMatchObject({
        event_type: 'transition_status_update',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'transition-001',
        status: 'running',
        progress_rate: 50,
        comment: 'Test comment',
        updated_by: testUserId,
      });
    });

    it('should increment sequence_no for multiple events', async () => {
      // Arrange
      const eventData1: EventLogData = {
        event_type: 'transition_status_update',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'transition-001',
        status: 'running',
        updated_by: testUserId,
        timestamp: new Date(),
      };

      const eventData2: EventLogData = {
        event_type: 'template_data_saved',
        method_id: 'method-001',
        task_no: 1,
        place_id: 'place-001',
        updated_by: testUserId,
        timestamp: new Date(),
      };

      // Act
      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData1,
        client
      );

      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData2,
        client
      );

      // Assert
      const result = await client.query(
        `SELECT sequence_no, log
         FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2
         ORDER BY sequence_no`,
        [testOrganizationId, testProjectId]
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].sequence_no).toBe(1);
      expect(result.rows[1].sequence_no).toBe(2);
    });

    it('should save event data in JSONB format', async () => {
      // Arrange
      const eventData: EventLogData = {
        event_type: 'transition_status_update',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'transition-001',
        status: 'completed',
        progress_rate: 100,
        comment: null,
        updated_by: testUserId,
        timestamp: new Date('2026-02-17T10:00:00Z'),
      };

      // Act
      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData,
        client
      );

      // Assert
      const result = await client.query(
        `SELECT log
         FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2`,
        [testOrganizationId, testProjectId]
      );

      expect(result.rows).toHaveLength(1);
      
      const log = result.rows[0].log;
      expect(log.event_type).toBe('transition_status_update');
      expect(log.method_id).toBe('method-001');
      expect(log.task_no).toBe(1);
      expect(log.transition_id).toBe('transition-001');
      expect(log.status).toBe('completed');
      expect(log.progress_rate).toBe(100);
      expect(log.comment).toBeNull();
      expect(log.updated_by).toBe(testUserId);
      expect(log.timestamp).toBeTruthy();
    });

    it('should execute within transaction', async () => {
      // Arrange
      const eventData: EventLogData = {
        event_type: 'transition_status_update',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'transition-001',
        status: 'running',
        updated_by: testUserId,
        timestamp: new Date(),
      };

      // Act
      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData,
        client
      );

      // ロールバック前に確認
      const resultBeforeRollback = await client.query(
        `SELECT COUNT(*) FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2`,
        [testOrganizationId, testProjectId]
      );
      expect(Number(resultBeforeRollback.rows[0].count)).toBe(1);

      // トランザクションロールバック
      await client.query('ROLLBACK');

      // 新しいトランザクション開始
      await client.query('BEGIN');

      // Assert - ロールバック後にデータが存在しないことを確認
      const resultAfterRollback = await client.query(
        `SELECT COUNT(*) FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2`,
        [testOrganizationId, testProjectId]
      );
      expect(Number(resultAfterRollback.rows[0].count)).toBe(0);
    });

    it('should handle optional fields correctly', async () => {
      // Arrange - transition_idやplace_idが未指定のケース
      const eventData: EventLogData = {
        event_type: 'template_data_saved',
        method_id: 'method-001',
        task_no: 1,
        place_id: 'place-001',
        updated_by: testUserId,
        timestamp: new Date(),
        // transition_id, status, progress_rate, commentは未指定
      };

      // Act
      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData,
        client
      );

      // Assert
      const result = await client.query(
        `SELECT log
         FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2`,
        [testOrganizationId, testProjectId]
      );

      expect(result.rows).toHaveLength(1);
      
      const log = result.rows[0].log;
      expect(log.event_type).toBe('template_data_saved');
      expect(log.place_id).toBe('place-001');
      expect(log.transition_id).toBeUndefined();
      expect(log.status).toBeUndefined();
      expect(log.progress_rate).toBeUndefined();
      expect(log.comment).toBeUndefined();
    });

    it('should isolate sequence_no by organization and project', async () => {
      // Arrange
      const otherProjectId = '87654321-4321-4321-4321-cba987654321';
      
      const eventData1: EventLogData = {
        event_type: 'transition_status_update',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'transition-001',
        status: 'running',
        updated_by: testUserId,
        timestamp: new Date(),
      };

      const eventData2: EventLogData = {
        event_type: 'transition_status_update',
        method_id: 'method-002',
        task_no: 1,
        transition_id: 'transition-002',
        status: 'ready',
        updated_by: testUserId,
        timestamp: new Date(),
      };

      // Act - プロジェクト1に2件
      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData1,
        client
      );

      await repository.logEvent(
        testOrganizationId,
        testProjectId,
        eventData1,
        client
      );

      // プロジェクト2に1件
      await repository.logEvent(
        testOrganizationId,
        otherProjectId,
        eventData2,
        client
      );

      // Assert - プロジェクト1はsequence_no=1,2
      const result1 = await client.query(
        `SELECT sequence_no
         FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2
         ORDER BY sequence_no`,
        [testOrganizationId, testProjectId]
      );
      expect(result1.rows).toHaveLength(2);
      expect(result1.rows[0].sequence_no).toBe(1);
      expect(result1.rows[1].sequence_no).toBe(2);

      // プロジェクト2はsequence_no=1（独立して採番）
      const result2 = await client.query(
        `SELECT sequence_no
         FROM maiml_event_log
         WHERE organization_id = $1 AND project_id = $2
         ORDER BY sequence_no`,
        [testOrganizationId, otherProjectId]
      );
      expect(result2.rows).toHaveLength(1);
      expect(result2.rows[0].sequence_no).toBe(1);
    });
  });
});

/**
 * テストデータのセットアップ
 */
async function setupTestData(
  client: PoolClient,
  organizationId: string,
  projectId: string
): Promise<void> {
  // organizationテーブルにテストデータを挿入
  await client.query(`
    INSERT INTO organization (organization_id, organization_name, created_at, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id) DO NOTHING
  `, [organizationId, 'Test Organization']);

  // projectsテーブルにテストデータを挿入
  await client.query(`
    INSERT INTO projects (id, organization_id, project_name, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id, id) DO NOTHING
  `, [projectId, organizationId, 'Test Project', 'active']);
}
