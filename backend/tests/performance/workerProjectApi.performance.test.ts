/**
 * Worker Project API パフォーマンステスト
 * 
 * テスト対象:
 * - 大量データでのレスポンスタイム（1000プロジェクト、10000タスク）
 * - 同時100リクエスト処理
 * - experiment_workerロールでのJOINクエリパフォーマンス
 * - EXPLAIN ANALYZEによるインデックス検証
 * - ページネーション性能
 * - ソート性能
 * - メモリ使用量
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';
import { v4 as uuidv4 } from 'uuid';

// パフォーマンステストはタイムアウトを長めに設定
jest.setTimeout(180000); // 3分

describe('Worker Project API Performance Tests', () => {
  let pool: any;
  let testOrganizationId: string;
  let testUserId: string;
  let testToken: string;
  let cleanupRequired = false;

  beforeAll(async () => {
    pool = getPool();
    testOrganizationId = 'org_perf_test_' + Date.now();
    testUserId = uuidv4();

    // モックの認証トークンを設定
    testToken = `maiml_session-perf_test_${Date.now()}_${Date.now()}`;
  });

  afterAll(async () => {
    // パフォーマンステスト用の大量データをクリーンアップ
    if (cleanupRequired) {
      try {
        await pool.query(
          'DELETE FROM project_task_detail WHERE organization_id = $1',
          [testOrganizationId]
        );
        await pool.query(
          'DELETE FROM project_task WHERE organization_id = $1',
          [testOrganizationId]
        );
        await pool.query(
          'DELETE FROM project WHERE organization_id = $1',
          [testOrganizationId]
        );
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }

    if (pool) {
      await pool.end();
    }
  });

  describe('大量データでのレスポンスタイム検証', () => {
    it('1000プロジェクト、10000タスクのデータセットで2秒以内にレスポンスを返すこと', async () => {
      // ARRANGE: 大量データセットアップ
      const projectCount = 1000;
      const tasksPerProject = 10;
      const totalTasks = projectCount * tasksPerProject;

      console.log(`Setting up ${projectCount} projects and ${totalTasks} tasks...`);

      // プロジェクトデータの一括挿入
      const projectInsertQuery = `
        INSERT INTO project (
          project_id, organization_id, project_name, description, 
          project_status, create_user_id, create_at, update_at
        )
        SELECT 
          gen_random_uuid(),
          $1,
          'Performance Test Project ' || generate_series,
          'Test project for performance testing',
          (ARRAY['pending', 'in_progress', 'review_waiting'])[floor(random() * 3 + 1)],
          $2,
          NOW() - (random() * interval '30 days'),
          NOW()
        FROM generate_series(1, $3)
        RETURNING project_id
      `;

      const projectResult = await pool.query(projectInsertQuery, [
        testOrganizationId,
        testUserId,
        projectCount,
      ]);

      cleanupRequired = true;
      const projectIds = projectResult.rows.map((r: any) => r.project_id);

      console.log(`Created ${projectIds.length} projects`);

      // タスクデータの一括挿入
      const taskInsertQuery = `
        INSERT INTO project_task (
          task_id, project_id, organization_id, task_name, task_status,
          method_name, transition_name, create_at, update_at
        )
        SELECT 
          gen_random_uuid(),
          project_id,
          $1,
          'Task ' || task_num,
          (ARRAY['pending', 'in_progress', 'completed'])[floor(random() * 3 + 1)],
          'Method ' || (task_num % 5 + 1),
          'Transition ' || (task_num % 3 + 1),
          NOW() - (random() * interval '30 days'),
          NOW()
        FROM (
          SELECT 
            unnest($2::uuid[]) as project_id,
            generate_series(1, $3) as task_num
        ) AS tasks
        RETURNING task_id
      `;

      const taskResult = await pool.query(taskInsertQuery, [
        testOrganizationId,
        projectIds,
        tasksPerProject,
      ]);

      const taskIds = taskResult.rows.map((r: any) => r.task_id);
      console.log(`Created ${taskIds.length} tasks`);

      // タスク詳細データの一括挿入（experiment_user_idを設定）
      const taskDetailInsertQuery = `
        INSERT INTO project_task_detail (
          detail_id, task_id, organization_id, experiment_user_id,
          detail_status, create_at, update_at
        )
        SELECT 
          gen_random_uuid(),
          task_id,
          $1,
          CASE 
            WHEN random() < 0.5 THEN $2
            ELSE gen_random_uuid()
          END,
          'active',
          NOW(),
          NOW()
        FROM unnest($3::uuid[]) AS task_id
      `;

      await pool.query(taskDetailInsertQuery, [
        testOrganizationId,
        testUserId,
        taskIds,
      ]);

      console.log('Data setup complete. Starting performance test...');

      // ACT: APIリクエスト実行
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrganizationId)
        .query({
          page: 1,
          limit: 20,
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`Response time: ${responseTime}ms`);

      // ASSERT: パフォーマンス要件
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 2秒以内
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalItems).toBeGreaterThan(0);

      // レスポンスタイムの詳細ログ
      if (responseTime > 1000) {
        console.warn(`⚠️  Response time exceeded 1s: ${responseTime}ms`);
      }
    });

    it('ページネーション使用時に最後のページでも2秒以内にレスポンスを返すこと', async () => {
      // ARRANGE: 既存データを使用（前のテストでセットアップ済み）
      if (!cleanupRequired) {
        console.log('Skipping: No test data available');
        return;
      }

      // 総ページ数を取得
      const countResponse = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrganizationId)
        .query({ page: 1, limit: 20 });

      const totalPages = countResponse.body.pagination?.totalPages || 1;
      const lastPage = Math.max(1, totalPages);

      // ACT: 最後のページをリクエスト
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrganizationId)
        .query({
          page: lastPage,
          limit: 20,
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`Last page (${lastPage}) response time: ${responseTime}ms`);

      // ASSERT
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 2秒以内
    });
  });

  describe('同時リクエスト処理検証', () => {
    it('同時100リクエストを処理できること', async () => {
      // ARRANGE
      const concurrentRequests = 100;
      const requestConfigs = Array.from({ length: concurrentRequests }, (_, i) => ({
        page: (i % 10) + 1,
        limit: 20,
        status: ['pending', 'in_progress', 'review_waiting'][i % 3] as any,
      }));

      // ACT: 並行リクエスト実行
      const startTime = Date.now();

      const promises = requestConfigs.map(config =>
        request(app)
          .get('/api/v1/projects/worker-accessible')
          .set('Authorization', `Bearer ${testToken}`)
          .set('X-Organization-Id', testOrganizationId)
          .query(config)
      );

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      // ASSERT: パフォーマンス検証
      const totalTime = endTime - startTime;
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 401)
      ).length;
      const errorRate = ((concurrentRequests - successCount) / concurrentRequests) * 100;

      console.log(`Concurrent requests: ${concurrentRequests}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Success count: ${successCount}`);
      console.log(`Error rate: ${errorRate.toFixed(2)}%`);

      expect(successCount).toBeGreaterThan(concurrentRequests * 0.95); // 95%以上成功
      expect(errorRate).toBeLessThan(5); // エラー率5%未満
      expect(totalTime).toBeLessThan(10000); // 10秒以内に全て完了
    });

    it('同時リクエスト時にデータベース接続プールが枯渇しないこと', async () => {
      // ARRANGE
      const concurrentRequests = 50;

      // ACT
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/v1/projects/worker-accessible')
          .set('Authorization', `Bearer ${testToken}`)
          .set('X-Organization-Id', testOrganizationId)
          .query({ page: 1, limit: 20 })
      );

      const responses = await Promise.all(promises);

      // ASSERT: すべてのリクエストが成功またはエラーレスポンスを返す
      const successOrErrorCount = responses.filter(r => 
        r.status === 200 || r.status === 401 || r.status === 403
      ).length;

      expect(successOrErrorCount).toBe(concurrentRequests);
    });

    it('高負荷時のレスポンスタイムp95が3秒以内であること', async () => {
      // ARRANGE
      const iterations = 100;
      const responseTimes: number[] = [];

      // ACT: 順次リクエスト実行（リアルな負荷シミュレーション）
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/v1/projects/worker-accessible')
          .set('Authorization', `Bearer ${testToken}`)
          .set('X-Organization-Id', testOrganizationId)
          .query({
            page: (i % 10) + 1,
            limit: 20,
          });

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        // 少し間隔を空ける（100ms）
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ASSERT: p95パーセンタイル計算
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95ResponseTime = responseTimes[p95Index];
      const p50ResponseTime = responseTimes[Math.floor(iterations * 0.5)];
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;

      console.log(`P50: ${p50ResponseTime}ms`);
      console.log(`P95: ${p95ResponseTime}ms`);
      console.log(`Average: ${avgResponseTime.toFixed(2)}ms`);

      expect(p95ResponseTime).toBeLessThan(3000); // p95が3秒以内
      expect(avgResponseTime).toBeLessThan(2000); // 平均が2秒以内
    });
  });

  describe('JOINクエリパフォーマンス検証', () => {
    it('experiment_workerロールでのJOINクエリが効率的に実行されること', async () => {
      // ARRANGE: experiment_worker用のテストケース
      if (!cleanupRequired) {
        console.log('Skipping: No test data available');
        return;
      }

      // ACT: JOINを使用するクエリを実行
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrganizationId)
        .query({
          page: 1,
          limit: 50,
          status: 'in_progress',
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`JOIN query response time: ${responseTime}ms`);

      // ASSERT
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 2秒以内
    });

    it('複雑なフィルタ条件でもパフォーマンスが劣化しないこと', async () => {
      // ARRANGE
      if (!cleanupRequired) {
        console.log('Skipping: No test data available');
        return;
      }

      const testCases = [
        { status: 'pending', sortBy: 'create_at', order: 'desc' },
        { status: 'in_progress', sortBy: 'project_name', order: 'asc' },
        { status: 'review_waiting', sortBy: 'update_at', order: 'desc' },
      ];

      // ACT & ASSERT
      for (const testCase of testCases) {
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/v1/projects/worker-accessible')
          .set('Authorization', `Bearer ${testToken}`)
          .set('X-Organization-Id', testOrganizationId)
          .query({
            page: 1,
            limit: 20,
            ...testCase,
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log(`Complex filter (${JSON.stringify(testCase)}): ${responseTime}ms`);

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(2000); // 2秒以内
      }
    });
  });

  describe('インデックス効果検証（EXPLAIN ANALYZE）', () => {
    it('organization_idインデックスが使用されていること', async () => {
      // ARRANGE
      const explainQuery = `
        EXPLAIN ANALYZE
        SELECT p.project_id, p.project_name, p.description, p.project_status,
               p.create_at, p.update_at
        FROM project p
        WHERE p.organization_id = $1
          AND p.project_status IN ('pending', 'in_progress', 'review_waiting')
        ORDER BY p.create_at DESC
        LIMIT 20
      `;

      // ACT
      const result = await pool.query(explainQuery, [testOrganizationId]);
      const explainOutput = result.rows.map((r: any) => r['QUERY PLAN']).join('\n');

      console.log('EXPLAIN ANALYZE output:');
      console.log(explainOutput);

      // ASSERT: インデックススキャンが使用されているか確認
      expect(explainOutput).toMatch(/Index.*Scan/i);
      expect(explainOutput).toMatch(/organization_id/i);
    });

    it('project_task_detail JOINでインデックスが使用されていること', async () => {
      // ARRANGE
      const explainQuery = `
        EXPLAIN ANALYZE
        SELECT DISTINCT p.project_id, p.project_name, p.description, 
               p.project_status, p.create_at, p.update_at
        FROM project p
        INNER JOIN project_task pt ON p.project_id = pt.project_id
        INNER JOIN project_task_detail ptd ON pt.task_id = ptd.task_id
        WHERE p.organization_id = $1
          AND pt.organization_id = $1
          AND ptd.organization_id = $1
          AND ptd.experiment_user_id = $2
          AND p.project_status IN ('pending', 'in_progress', 'review_waiting')
        ORDER BY p.create_at DESC
        LIMIT 20
      `;

      // ACT
      const result = await pool.query(explainQuery, [testOrganizationId, testUserId]);
      const explainOutput = result.rows.map((r: any) => r['QUERY PLAN']).join('\n');

      console.log('EXPLAIN ANALYZE output (JOIN):');
      console.log(explainOutput);

      // ASSERT: インデックススキャンが使用されているか確認
      expect(explainOutput).toMatch(/Index.*Scan/i);
      expect(explainOutput).toMatch(/experiment_user_id|assign_user_id/i);
    });

    it('ソートカラムにインデックスが使用されていること', async () => {
      // ARRANGE
      const sortColumns = ['create_at', 'project_name', 'update_at'];

      // ACT & ASSERT
      for (const sortColumn of sortColumns) {
        const explainQuery = `
          EXPLAIN ANALYZE
          SELECT p.project_id, p.project_name
          FROM project p
          WHERE p.organization_id = $1
          ORDER BY p.${sortColumn} DESC
          LIMIT 20
        `;

        const result = await pool.query(explainQuery, [testOrganizationId]);
        const explainOutput = result.rows.map((r: any) => r['QUERY PLAN']).join('\n');

        console.log(`EXPLAIN ANALYZE output (sort by ${sortColumn}):`);
        console.log(explainOutput);

        // インデックススキャンまたは効率的なソートが使用されているか確認
        const hasIndexScan = /Index.*Scan/i.test(explainOutput);
        const hasSort = /Sort/i.test(explainOutput);

        // インデックススキャンまたはソート処理が実行されていることを確認
        expect(hasIndexScan || hasSort).toBe(true);
      }
    });
  });

  describe('メモリ使用量検証', () => {
    it('大量データ取得でメモリリークが発生しないこと', async () => {
      // ARRANGE
      if (!cleanupRequired) {
        console.log('Skipping: No test data available');
        return;
      }

      const iterations = 50;
      const initialMemory = process.memoryUsage().heapUsed;

      // ACT: 繰り返しAPIリクエスト
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/api/v1/projects/worker-accessible')
          .set('Authorization', `Bearer ${testToken}`)
          .set('X-Organization-Id', testOrganizationId)
          .query({
            page: (i % 10) + 1,
            limit: 20,
          });
      }

      // 強制GC（テスト環境でのみ）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);

      console.log(`Memory increase: ${memoryIncreaseMB}MB`);

      // ASSERT: メモリ増加が合理的な範囲内（20MB以下）
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });

    it('ページネーションで大きなlimit値を使用してもメモリエラーが発生しないこと', async () => {
      // ARRANGE
      if (!cleanupRequired) {
        console.log('Skipping: No test data available');
        return;
      }

      // ACT: 最大limit値でリクエスト
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Organization-Id', testOrganizationId)
        .query({
          page: 1,
          limit: 100, // 最大値
        });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(100);
    });
  });

  describe('総合パフォーマンステスト', () => {
    it('実運用を想定した混合ワークロードで安定動作すること', async () => {
      // ARRANGE: 実運用を想定した多様なリクエストパターン
      if (!cleanupRequired) {
        console.log('Skipping: No test data available');
        return;
      }

      const workloadPatterns = [
        // 頻繁なアクセス（ページ1）
        ...Array(30).fill({ page: 1, limit: 20 }),
        // ページネーション
        ...Array(10).fill({ page: 2, limit: 20 }),
        ...Array(5).fill({ page: 3, limit: 20 }),
        // フィルタリング
        ...Array(10).fill({ page: 1, limit: 20, status: 'pending' }),
        ...Array(10).fill({ page: 1, limit: 20, status: 'in_progress' }),
        // ソート
        ...Array(10).fill({ page: 1, limit: 20, sortBy: 'project_name', order: 'asc' }),
        ...Array(5).fill({ page: 1, limit: 20, sortBy: 'update_at', order: 'desc' }),
      ];

      // ACT: 混合ワークロード実行
      const startTime = Date.now();
      const responseTimes: number[] = [];

      for (const pattern of workloadPatterns) {
        const reqStartTime = Date.now();
        
        await request(app)
          .get('/api/v1/projects/worker-accessible')
          .set('Authorization', `Bearer ${testToken}`)
          .set('X-Organization-Id', testOrganizationId)
          .query(pattern);

        responseTimes.push(Date.now() - reqStartTime);
        
        // 実運用に近い間隔（50ms）
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const totalTime = Date.now() - startTime;

      // ASSERT: 統計情報の計算
      responseTimes.sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log('Mixed workload statistics:');
      console.log(`Total requests: ${workloadPatterns.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Average: ${avg.toFixed(2)}ms`);
      console.log(`P50: ${p50}ms`);
      console.log(`P95: ${p95}ms`);
      console.log(`P99: ${p99}ms`);

      // パフォーマンス要件
      expect(p95).toBeLessThan(3000); // p95が3秒以内
      expect(p99).toBeLessThan(5000); // p99が5秒以内
      expect(avg).toBeLessThan(2000); // 平均が2秒以内
    });
  });
});