/**
 * API監査ログテスト
 * タスク3.2: 監査ログとアプリケーションログの実装
 */

import { logApiRequest, logApiResponse } from '../../src/utils/logger';

describe('API Audit Logging (Task 3.2)', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // テスト環境でもログ出力を有効にする
    originalNodeEnv = process.env.NODE_ENV;
    process.env.ENABLE_TEST_LOGS = 'true';
    
    // console出力をキャプチャ
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    
    // 環境変数を元に戻す
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    }
    delete process.env.ENABLE_TEST_LOGS;
  });

  describe('logApiRequest', () => {
    it('APIリクエスト情報をログ記録する', () => {
      const requestId = 'req-123';
      const userId = 'user-456';
      const organizationId = 'org-789';
      const method = 'GET';
      const path = '/api/v1/projects/test-project/worker-instructions';
      const query = { taskNo: '1' };

      logApiRequest({
        requestId,
        userId,
        organizationId,
        method,
        path,
        query,
      });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logCall = consoleInfoSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('info');
      expect(logData.message).toContain('API request');
      expect(logData.requestId).toBe(requestId);
      expect(logData.userId).toBe(userId);
      expect(logData.organizationId).toBe(organizationId);
      expect(logData.method).toBe(method);
      expect(logData.path).toBe(path);
      expect(logData.query).toEqual(query);
      expect(logData.timestamp).toBeDefined();
    });

    it('IPアドレスとUserAgentを含める', () => {
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      logApiRequest({
        requestId: 'req-123',
        userId: 'user-456',
        organizationId: 'org-789',
        method: 'GET',
        path: '/api/test',
        ipAddress,
        userAgent,
      });

      const logCall = consoleInfoSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.ipAddress).toBe(ipAddress);
      expect(logData.userAgent).toBe(userAgent);
    });
  });

  describe('logApiResponse', () => {
    it('APIレスポンス情報をログ記録する（成功時）', () => {
      const requestId = 'req-123';
      const statusCode = 200;
      const duration = 125;

      logApiResponse({
        requestId,
        statusCode,
        duration,
      });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logCall = consoleInfoSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('info');
      expect(logData.message).toContain('API response');
      expect(logData.requestId).toBe(requestId);
      expect(logData.statusCode).toBe(statusCode);
      expect(logData.duration).toBe(duration);
      expect(logData.timestamp).toBeDefined();
    });

    it('エラーレスポンス（4xx, 5xx）を警告ログとして記録する', () => {
      logApiResponse({
        requestId: 'req-123',
        statusCode: 400,
        duration: 50,
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      let logData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(logData.level).toBe('warn');

      consoleWarnSpy.mockClear();

      logApiResponse({
        requestId: 'req-456',
        statusCode: 500,
        duration: 100,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      logData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logData.level).toBe('error');
    });

    it('処理時間が長い場合（>1000ms）を警告ログとして記録する', () => {
      logApiResponse({
        requestId: 'req-123',
        statusCode: 200,
        duration: 1500,
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('warn');
      expect(logData.message).toContain('slow');
    });
  });
});