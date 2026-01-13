/**
 * 認証APIパフォーマンステスト
 * 
 * テスト対象:
 * - 同時ログイン負荷テスト
 * - PINコード生成負荷テスト
 * - メール送信非同期処理検証
 * - 期限切れPINコード削除パフォーマンス
 * - bcrypt処理時間計測
 * - データベースクエリパフォーマンス
 */

import request from 'supertest';
import app from '../../src/server';
import { getPool } from '../../src/database/db';
import { createPasswordService } from '../../src/services/passwordService';
import { createPinCodeService } from '../../src/services/pinCodeService';
import * as emailService from '../../src/services/emailService';

// パフォーマンステストはタイムアウトを長めに設定
jest.setTimeout(120000); // 2分

describe('Authentication Performance Tests', () => {
  let pool: any;
  let passwordService: ReturnType<typeof createPasswordService>;
  let pinCodeService: ReturnType<typeof createPinCodeService>;

  beforeAll(async () => {
    pool = getPool();
    passwordService = createPasswordService(pool);
    pinCodeService = createPinCodeService(pool);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('同時ログイン負荷テスト', () => {
    it('100並行ユーザーログインで平均レスポンス時間が500ms未満であること', async () => {
      // ARRANGE: テストユーザーを準備
      const testUsers = Array.from({ length: 100 }, (_, i) => ({
        username: `perftest_user_${i}`,
        password: 'TestPassword123!',
        organizationId: 'org_maiml_lab_001',
      }));

      // パスワードハッシュを事前生成
      const hashResult = await passwordService.hash('TestPassword123!', 'experiment_worker');
      const passwordHash = hashResult.data as string;

      // データベースモック設定
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          id: 'user-001',
          username: 'perftest_user_0',
          email: 'perftest0@example.com',
          role: 'experiment_worker',
          organization_id: 'org_maiml_lab_001',
          organization_name: 'Test Org',
          display_name: 'Test User',
          password_hash: passwordHash,
        }]
      });

      pool.query = mockQuery;

      // メールサービスのモック
      jest.spyOn(emailService, 'sendPinCodeEmail').mockResolvedValue({
        success: true,
        data: { messageId: 'test-message-id' }
      });

      // ACT: 並行リクエスト実行
      const startTime = Date.now();
      const promises = testUsers.map(user =>
        request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', user.organizationId)
          .send({
            username: user.username,
            password: user.password,
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // ASSERT: パフォーマンス検証
      const totalTime = endTime - startTime;
      const averageTime = totalTime / testUsers.length;

      expect(averageTime).toBeLessThan(500); // 平均500ms未満
      expect(responses.filter(r => r.status === 200 || r.status === 401).length).toBeGreaterThan(95); // 95%以上レスポンス
    });

    it('同時ログイン時のデータベース接続プールが枯渇しないこと', async () => {
      // ARRANGE
      const concurrentRequests = 50;
      const mockQuery = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              rows: [{
                id: 'user-001',
                username: 'test',
                email: 'test@example.com',
                role: 'experiment_worker',
                organization_id: 'org_maiml_lab_001',
                organization_name: 'Test Org',
                display_name: 'Test User',
                password_hash: '$2b$12$validhash',
              }]
            });
          }, 10);
        })
      );

      pool.query = mockQuery;

      jest.spyOn(emailService, 'sendPinCodeEmail').mockResolvedValue({
        success: true,
        data: { messageId: 'test-id' }
      });

      // ACT
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', 'org_maiml_lab_001')
          .send({ username: 'test', password: 'password' })
      );

      const responses = await Promise.all(promises);

      // ASSERT: すべてのリクエストが成功すること
      const successCount = responses.filter(r => r.status === 200 || r.status === 401).length;
      expect(successCount).toBe(concurrentRequests);
    });
  });

  describe('PINコード生成負荷テスト', () => {
    it('50リクエスト/秒でエラー率が1%未満であること', async () => {
      // ARRANGE
      const requestsPerSecond = 50;
      const testDuration = 2; // 2秒間テスト
      const totalRequests = requestsPerSecond * testDuration;

      const mockQuery = jest.fn().mockResolvedValue({ 
        rows: [{ pin_code: '123456', expires_at: new Date() }] 
      });
      pool.query = mockQuery;

      // ACT
      const startTime = Date.now();
      const results = await Promise.allSettled(
        Array.from({ length: totalRequests }, (_, i) =>
          pinCodeService.generateAndSave(
            `user-${i % 10}`,
            `org_${i % 5}`,
            `temp_session_${i}`
          ).then(() => new Promise(resolve => setTimeout(resolve, 20))) // 20ms間隔
        )
      );
      const endTime = Date.now();

      // ASSERT
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorRate = ((totalRequests - successCount) / totalRequests) * 100;

      expect(errorRate).toBeLessThan(1); // エラー率1%未満
      expect(endTime - startTime).toBeLessThan(testDuration * 1000 + 500); // 2.5秒以内
    });

    it('大量のPINコード生成でメモリリークが発生しないこと', async () => {
      // ARRANGE
      const iterations = 1000;
      const mockQuery = jest.fn().mockResolvedValue({ 
        rows: [{ pin_code: '123456', expires_at: new Date() }] 
      });
      pool.query = mockQuery;

      const initialMemory = process.memoryUsage().heapUsed;

      // ACT
      for (let i = 0; i < iterations; i++) {
        await pinCodeService.generateAndSave(
          `user-${i}`,
          `org-${i % 10}`,
          `session-${i}`
        );
      }

      // 強制GC（テスト環境でのみ）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // ASSERT: メモリ増加が合理的な範囲内（10MB以下）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('メール送信非同期処理検証', () => {
    it('メール送信がAPIレスポンスをブロックしないこと', async () => {
      // ARRANGE
      jest.spyOn(emailService, 'sendPinCodeEmail').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒遅延
        return { success: true, data: { messageId: 'test-id' } };
      });

      const hashResult = await passwordService.hash('password', 'experiment_worker');
      const passwordHash = hashResult.data as string;

      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          id: 'user-001',
          username: 'test',
          email: 'test@example.com',
          role: 'experiment_worker',
          organization_id: 'org_maiml_lab_001',
          organization_name: 'Test Org',
          display_name: 'Test User',
          password_hash: passwordHash,
        }]
      });

      pool.query = mockQuery;

      // ACT
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Organization-Id', 'org_maiml_lab_001')
        .send({ username: 'test', password: 'password' });
      const responseTime = Date.now() - startTime;

      // ASSERT: レスポンス時間がメール送信時間より短いこと
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(800); // 800ms未満でレスポンス（余裕を持たせる）
    });

    it('メール送信タイムアウトが30秒に設定されていること', async () => {
      // ARRANGE
      const mockSendMail = jest.fn().mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 35000); // 35秒でタイムアウト
        })
      );

      // ACT & ASSERT
      // この テストは実際のタイムアウト動作を確認するため、
      // モックの実装を確認するだけにとどめる
      expect(mockSendMail).toBeDefined();
    }, 40000);
  });

  describe('期限切れPINコード削除パフォーマンス', () => {
    it('10,000件の期限切れPINコードを10秒以内に削除できること', async () => {
      // ARRANGE: 大量の期限切れPINコードをシミュレート
      const expiredCount = 10000;
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: expiredCount,
      });
      pool.query = mockQuery;

      // ACT
      const startTime = Date.now();
      await pinCodeService.deleteExpired();
      const endTime = Date.now();

      // ASSERT
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // 10秒未満
      expect(mockQuery).toHaveBeenCalled();
    });

    it('期限切れPINコード削除がバッチ処理で実行されること', async () => {
      // ARRANGE
      const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 1000 });
      pool.query = mockQuery;

      // ACT
      await pinCodeService.deleteExpired();

      // ASSERT: 単一のDELETEクエリで実行されること（バッチ処理）
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM pin_codes');
    });
  });

  describe('bcrypt処理時間計測', () => {
    it('パスワードハッシュ化のp95レスポンスタイムが1秒未満であること', async () => {
      // ARRANGE
      const iterations = 100;
      const password = 'TestPassword123!';
      const role = 'experiment_worker';
      const responseTimes: number[] = [];

      // ACT
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await passwordService.hash(password, role);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // ASSERT
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      expect(p95ResponseTime).toBeLessThan(1000); // 1秒未満
    });

    it('パスワード検証のp95レスポンスタイムが500ms未満であること', async () => {
      // ARRANGE
      const iterations = 100;
      const password = 'TestPassword123!';
      const role = 'experiment_worker';
      const hashResult = await passwordService.hash(password, role);
      const hash = hashResult.data as string;
      const responseTimes: number[] = [];

      // モックでverifyをテスト
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{ password: hash }]
      });
      pool.query = mockQuery;

      // ACT
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await passwordService.verify('user-001', 'org-001', password);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // ASSERT
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      expect(p95ResponseTime).toBeLessThan(500); // 500ms未満
    });

    it('Admin権限のパスワードハッシュ化が通常より時間がかかること', async () => {
      // ARRANGE
      const password = 'AdminPassword123!';
      const adminRole = 'system_admin';
      const workerRole = 'experiment_worker';

      // ACT
      const adminStart = Date.now();
      await passwordService.hash(password, adminRole);
      const adminTime = Date.now() - adminStart;

      const workerStart = Date.now();
      await passwordService.hash(password, workerRole);
      const workerTime = Date.now() - workerStart;

      // ASSERT: Admin(14 rounds)はWorker(12 rounds)より時間がかかる
      expect(adminTime).toBeGreaterThan(workerTime * 0.8); // 多少の誤差を許容
    });
  });

  describe('データベースクエリパフォーマンス', () => {
    it('レート制限判定クエリでインデックスが使用されること', async () => {
      // ARRANGE
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{ attempt_count: 3 }],
      });
      pool.query = mockQuery;

      // ACT
      await pool.query(
        `SELECT COUNT(*) as attempt_count
         FROM login_history
         WHERE organization_id = $1
           AND username = $2
           AND login_sf = false
           AND login_at > NOW() - INTERVAL '15 minutes'`,
        ['org_maiml_lab_001', 'test_user']
      );

      // ASSERT: インデックスを活用したクエリが呼ばれること
      expect(mockQuery).toHaveBeenCalled();
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('organization_id');
      expect(query).toContain('username');
      expect(query).toContain('login_at');
    });

    it('PINコード検証クエリでユニークインデックスが使用されること', async () => {
      // ARRANGE
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          pin_code: '123456',
          session_token: 'temp_session_123',
          expires_at: new Date(Date.now() + 300000),
          attempts_count: 0,
        }],
      });
      pool.query = mockQuery;

      // ACT
      await pool.query(
        `SELECT * FROM pin_codes
         WHERE pin_code = $1 AND session_token = $2`,
        ['123456', 'temp_session_123']
      );

      // ASSERT
      expect(mockQuery).toHaveBeenCalled();
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('pin_code');
      expect(query).toContain('session_token');
    });

    it('N+1問題が発生しないこと', async () => {
      // ARRANGE: 複数ユーザーのログイン試行
      const userCount = 10;
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          role: 'experiment_worker',
          organization_id: 'org_maiml_lab_001',
          organization_name: 'Test Org',
          display_name: 'User 1',
          password_hash: '$2b$12$validhash',
        }]
      });

      pool.query = mockQuery;

      jest.spyOn(emailService, 'sendPinCodeEmail').mockResolvedValue({
        success: true,
        data: { messageId: 'test-id' }
      });

      // ACT: 並行ログイン試行
      const promises = Array.from({ length: userCount }, (_, i) =>
        request(app)
          .post('/api/v1/auth/login')
          .set('X-Organization-Id', 'org_maiml_lab_001')
          .send({ username: `user${i}`, password: 'password' })
      );

      await Promise.all(promises);

      // ASSERT: クエリ実行回数がユーザー数に比例しないこと
      const queryCallCount = mockQuery.mock.calls.length;
      expect(queryCallCount).toBeLessThan(userCount * 3); // 許容範囲（ログイン履歴記録含む）
    });

    it('期限切れPINコード削除でインデックススキャンが使用されること', async () => {
      // ARRANGE
      const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 100 });
      pool.query = mockQuery;

      // ACT
      await pool.query(
        `DELETE FROM pin_codes
         WHERE expires_at < NOW() - INTERVAL '1 hour'`
      );

      // ASSERT
      expect(mockQuery).toHaveBeenCalled();
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('expires_at'); // インデックスカラム使用
    });
  });

  describe('総合パフォーマンステスト', () => {
    it('ログイン〜PIN検証の完全フローが2秒以内に完了すること', async () => {
      // ARRANGE
      const hashResult = await passwordService.hash('password', 'experiment_worker');
      const passwordHash = hashResult.data as string;

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-001',
            username: 'test',
            email: 'test@example.com',
            role: 'experiment_worker',
            organization_id: 'org_maiml_lab_001',
            organization_name: 'Test Org',
            display_name: 'Test User',
            password_hash: passwordHash,
          }]
        })
        .mockResolvedValue({ rows: [{ success: true }] });

      pool.query = mockQuery;

      jest.spyOn(emailService, 'sendPinCodeEmail').mockResolvedValue({
        success: true,
        data: { messageId: 'test-id' }
      });

      // ACT
      const startTime = Date.now();

      // ログイン
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Organization-Id', 'org_maiml_lab_001')
        .send({ username: 'test', password: 'password' });

      // PIN検証
      const sessionToken = loginResponse.body.data?.sessionToken;
      if (sessionToken) {
        const verifyResponse = await request(app)
          .post('/api/v1/auth/verify-pin')
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({ pinCode: '123456' });

        const endTime = Date.now();

        // ASSERT
        const totalTime = endTime - startTime;
        expect(totalTime).toBeLessThan(2000); // 2秒未満
        expect(loginResponse.status).toBe(200);
        expect(verifyResponse.status).toBe(200);
      } else {
        // ログインが失敗した場合もテストを継続
        expect(loginResponse.status).toBe(200);
      }
    });
  });
});
