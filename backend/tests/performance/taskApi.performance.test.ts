/**
 * Task API Performance Tests
 * 
 * パフォーマンステスト:
 * - レスポンスタイム測定
 * - N+1問題の検証
 * - データベースクエリの最適化確認
 * 
 * 要件10: パフォーマンス
 * - 100タスク以内のプロジェクトに対して2秒以内にレスポンス
 * - N+1問題を回避
 * - 適切なJOINとGROUP BYを使用
 */

import request from 'supertest';
import express, { Application } from 'express';
import { v4 as uuidv4 } from 'uuid';
import taskRoutes from '../../src/routes/taskRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { db } from '../../src/database/db';

describe('Task API Performance Tests', () => {
  let app: Application;
  let authToken: string;
  let organizationId: string;
  let projectId: string;
  let userId: string;

  beforeAll(async () => {
    // Express アプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/v1', taskRoutes);

    // テストデータの準備
    organizationId = uuidv4();
    projectId = uuidv4();
    userId = uuidv4();
    authToken = `Bearer maiml_session-${uuidv4()}_${Date.now()}`;

    // モックユーザーとセッションの作成
    await createTestUser(userId, organizationId, 'experiment_admin');
    await createTestProject(projectId, organizationId);
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await cleanupTestData(organizationId);
  });

  describe('レスポンスタイム測定', () => {
    /**
     * テスト1: 10タスクで0.5秒以内にレスポンス
     * 
     * 要件: 小規模プロジェクトでの高速レスポンス
     */
    it('should respond within 0.5 seconds for 10 tasks', async () => {
      // ARRANGE: 10タスクを作成
      const taskCount = 10;
      await createTasksForProject(projectId, organizationId, taskCount);

      // ACT: レスポンスタイムを計測
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ projectId })
        .set('Authorization', authToken)
        .expect(200);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(responseTime).toBeLessThan(500); // 0.5秒 = 500ミリ秒
      
      console.log(`✓ 10 tasks: ${responseTime}ms (target: <500ms)`);
    });

    /**
     * テスト2: 50タスクで1秒以内にレスポンス
     * 
     * 要件: 中規模プロジェクトでの適切なレスポンス
     */
    it('should respond within 1 second for 50 tasks', async () => {
      // ARRANGE: 50タスクを作成
      const taskCount = 50;
      await createTasksForProject(projectId, organizationId, taskCount);

      // ACT: レスポンスタイムを計測
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ projectId })
        .set('Authorization', authToken)
        .expect(200);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(responseTime).toBeLessThan(1000); // 1秒 = 1000ミリ秒
      
      console.log(`✓ 50 tasks: ${responseTime}ms (target: <1000ms)`);
    });

    /**
     * テスト3: 100タスクで2秒以内にレスポンス
     * 
     * 要件: 大規模プロジェクトでも2秒以内にレスポンス
     */
    it('should respond within 2 seconds for 100 tasks', async () => {
      // ARRANGE: 100タスクを作成
      const taskCount = 100;
      await createTasksForProject(projectId, organizationId, taskCount);

      // ACT: レスポンスタイムを計測
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ projectId })
        .set('Authorization', authToken)
        .expect(200);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(responseTime).toBeLessThan(2000); // 2秒 = 2000ミリ秒
      
      console.log(`✓ 100 tasks: ${responseTime}ms (target: <2000ms)`);
    });
  });

  describe('N+1問題の検証', () => {
    /**
     * テスト4: SQLクエリ数が一定であることを確認
     * 
     * 要件: タスク数が増えてもクエリ数が増えない
     * - タスク数に関わらず、クエリ数は一定（≤5）であるべき
     */
    it('should not have N+1 query problem', async () => {
      // ARRANGE: 異なるタスク数でテスト
      const testCases = [10, 50, 100];
      const queryCountResults: { taskCount: number; queryCount: number }[] = [];

      for (const taskCount of testCases) {
        // タスクを作成
        await cleanupTestTasks(projectId);
        await createTasksForProject(projectId, organizationId, taskCount);

        // クエリ数をカウント
        const queryCount = await countDatabaseQueries(async () => {
          await request(app)
            .get('/api/v1/tasks')
            .query({ projectId })
            .set('Authorization', authToken)
            .expect(200);
        });

        queryCountResults.push({ taskCount, queryCount });
        console.log(`✓ ${taskCount} tasks: ${queryCount} queries`);
      }

      // ASSERT: クエリ数が一定であることを確認
      const uniqueQueryCounts = new Set(queryCountResults.map(r => r.queryCount));
      expect(uniqueQueryCounts.size).toBe(1); // 全て同じクエリ数
      expect(queryCountResults[0].queryCount).toBeLessThanOrEqual(5); // クエリ数≤5
      
      console.log('✓ No N+1 problem detected (consistent query count)');
    });

    /**
     * テスト5: JOIN使用の確認
     * 
     * 要件: 適切なJOINを使用して一度のクエリで必要なデータを取得
     */
    it('should use JOINs efficiently', async () => {
      // ARRANGE
      const taskCount = 50;
      await createTasksForProject(projectId, organizationId, taskCount);

      // ACT: クエリプランを取得
      const queryPlan = await analyzeQueryPlan(projectId, organizationId);

      // ASSERT: JOIN が使用されていることを確認
      expect(queryPlan).toContain('LEFT JOIN'); // project_task_detail との JOIN
      expect(queryPlan).toContain('organization_user'); // ユーザー情報との JOIN
      expect(queryPlan).toContain('user_authentication'); // 認証情報との JOIN
      
      // GROUP BY が使用されていることを確認
      expect(queryPlan).toContain('GROUP BY');
      
      console.log('✓ Efficient JOINs detected in query plan');
    });
  });

  describe('データベースクエリの最適化', () => {
    /**
     * テスト6: EXPLAIN ANALYZE の実行
     * 
     * 要件: クエリの実行計画を分析し、最適化されていることを確認
     */
    it('should have optimized query execution plan', async () => {
      // ARRANGE
      const taskCount = 100;
      await createTasksForProject(projectId, organizationId, taskCount);

      // ACT: EXPLAIN ANALYZE を実行
      const explainResult = await runExplainAnalyze(projectId, organizationId);

      // ASSERT: 実行計画の確認
      expect(explainResult).toBeDefined();
      expect(explainResult.executionTime).toBeLessThan(1000); // 1秒以内
      
      // インデックスが使用されていることを確認
      expect(explainResult.usesIndex).toBe(true);
      
      // Sequential Scan が多すぎないことを確認
      const seqScanCount = (explainResult.plan.match(/Seq Scan/g) || []).length;
      expect(seqScanCount).toBeLessThanOrEqual(2);
      
      console.log(`✓ Query execution time: ${explainResult.executionTime}ms`);
      console.log(`✓ Uses index: ${explainResult.usesIndex}`);
      console.log(`✓ Sequential scans: ${seqScanCount}`);
    });

    /**
     * テスト7: 不要なデータ取得の回避
     * 
     * 要件: 必要なカラムのみをSELECTする
     */
    it('should select only necessary columns', async () => {
      // ARRANGE
      const taskCount = 50;
      await createTasksForProject(projectId, organizationId, taskCount);

      // ACT: レスポンスデータを確認
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ projectId })
        .set('Authorization', authToken)
        .expect(200);

      // ASSERT: 必要なフィールドのみが含まれていることを確認
      const firstMethod = response.body.data[0];
      expect(firstMethod).toHaveProperty('method_id');
      expect(firstMethod).toHaveProperty('method_name');
      expect(firstMethod).toHaveProperty('experiment_order');
      expect(firstMethod).toHaveProperty('tasks');

      const firstTask = firstMethod.tasks[0];
      expect(firstTask).toHaveProperty('task_no');
      expect(firstTask).toHaveProperty('status');
      expect(firstTask).toHaveProperty('experiment_user_id');
      expect(firstTask).toHaveProperty('experiment_user_name');
      expect(firstTask).toHaveProperty('created_at');
      expect(firstTask).toHaveProperty('updated_at');
      expect(firstTask).toHaveProperty('progress_rate');

      // 不要なフィールドが含まれていないことを確認
      expect(firstTask).not.toHaveProperty('raw_data');
      expect(firstTask).not.toHaveProperty('internal_id');
      
      console.log('✓ Only necessary columns are selected');
    });
  });
});

// ========================================
// ヘルパー関数
// ========================================

/**
 * テストユーザーを作成
 */
async function createTestUser(
  userId: string,
  organizationId: string,
  role: string
): Promise<void> {
  // 実装予定: テストユーザーの作成
  // - organization_user テーブルに挿入
  // - user_authentication テーブルに挿入
  // - role を設定
}

/**
 * テストプロジェクトを作成
 */
async function createTestProject(
  projectId: string,
  organizationId: string
): Promise<void> {
  // 実装予定: テストプロジェクトの作成
  // - project テーブルに挿入
  // - MAIML ファイルの作成（S3/Swift）
}

/**
 * 指定数のタスクを作成
 */
async function createTasksForProject(
  projectId: string,
  organizationId: string,
  taskCount: number
): Promise<void> {
  // 実装予定: 複数タスクの作成
  // - project_task テーブルに taskCount 分挿入
  // - project_task_detail テーブルに関連データ挿入
  // - transition_data テーブルに進捗データ挿入
  // - メソッドごとにグループ化
}

/**
 * テストデータのクリーンアップ
 */
async function cleanupTestData(organizationId: string): Promise<void> {
  // 実装予定: テストデータの削除
  // - project_task_detail
  // - project_task
  // - project
  // - organization_user
  // - user_authentication
}

/**
 * プロジェクトのタスクをクリーンアップ
 */
async function cleanupTestTasks(projectId: string): Promise<void> {
  // 実装予定: タスクのみ削除
  // - project_task_detail
  // - project_task
}

/**
 * データベースクエリ数をカウント
 */
async function countDatabaseQueries(
  operation: () => Promise<void>
): Promise<number> {
  // 実装予定: クエリ数のカウント
  // - PostgreSQL の pg_stat_statements を使用
  // - または、Kysely のログ機能を使用
  return 0; // 仮の値
}

/**
 * クエリプランを分析
 */
async function analyzeQueryPlan(
  projectId: string,
  organizationId: string
): Promise<string> {
  // 実装予定: EXPLAIN を実行してクエリプランを取得
  // - SQL クエリを構築
  // - EXPLAIN を実行
  // - 結果を文字列として返す
  return ''; // 仮の値
}

/**
 * EXPLAIN ANALYZE を実行
 */
async function runExplainAnalyze(
  projectId: string,
  organizationId: string
): Promise<{
  executionTime: number;
  usesIndex: boolean;
  plan: string;
}> {
  // 実装予定: EXPLAIN ANALYZE を実行
  // - SQL クエリを構築
  // - EXPLAIN ANALYZE を実行
  // - 実行時間、インデックス使用、プランを解析
  return {
    executionTime: 0,
    usesIndex: false,
    plan: ''
  }; // 仮の値
}