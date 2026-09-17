/**
 * ProjectService.requestApproval - 追加の機寁E��報チェチE��チE��チE
 * 
 * Task 5.2.4.2: 追加の機寁E��報検証チE��チE
 * Requirement: 12 (セキュリチE��とマルチテナント�E離)
 * 
 * 目皁E API key、秘寁E��、クレチE��シャル等�E追加機寁E��報が漏洩しなぁE��とを検証
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';
import { NotificationRepository } from '../../src/repositories/notificationRepository';
import { logger } from '../../src/utils/logger';

// モチE��設宁E
jest.mock('../../src/database/db');
jest.mock('../../src/repositories/notificationRepository');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-notification-id'),
}));

describe('ProjectService.requestApproval - 追加の機寁E��報チェチE��', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;
  let mockNotificationRepository: jest.Mocked<NotificationRepository>;

  // Winstonログのスパイ
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Winstonログのスパイを設宁E
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

    // console.logのスパイも設宁E
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    projectService = new ProjectService();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    mockNotificationRepository = {
      create: jest.fn(),
    } as any;

    (NotificationRepository as jest.Mock).mockImplementation(() => mockNotificationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  describe('5.2.4.2: API キーと秘寁E��の漏洩防止', () => {
    it('ログにAWS Access Keyが含まれなぁE��と', async () => {
      const projectData = {
        project_id: 'project-123',
        project_name: 'Test Project',
        project_status: 1,
        organization_id: 'org-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [projectData],
      });

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 })
        .mockResolvedValueOnce({ command: 'COMMIT' })
        .mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
        });

      mockNotificationRepository.create.mockResolvedValue(undefined);

      // AWS Access Keyを含むcomment
      const commentWithAwsKey = 'AWS Key: AKIAIOSFODNN7EXAMPLE';

      await projectService.requestApproval(
        'project-123',
        commentWithAwsKey,
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('AKIAIOSFODNN7EXAMPLE');
        expect(logMessage.toUpperCase()).not.toContain('AKIA'); // AWSキーの接頭辁E
      });
    });

    it('ログにAPI Keyが含まれなぁE��と', async () => {
      const projectData = {
        project_id: 'project-123',
        project_name: 'Test Project',
        project_status: 1,
        organization_id: 'org-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [projectData],
      });

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 })
        .mockResolvedValueOnce({ command: 'COMMIT' })
        .mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
        });

      mockNotificationRepository.create.mockResolvedValue(undefined);

      // 一般皁E��API Keyパターン
      const commentWithApiKey = 'API Key: sk_live_51234567890abcdef';

      await projectService.requestApproval(
        'project-123',
        commentWithApiKey,
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('sk_live_51234567890abcdef');
        expect(logMessage).not.toContain('sk_live_'); // Stripe等�E接頭辁E
      });
    });

    it('ログに秘寁E���E�Erivate Key�E�が含まれなぁE��と', async () => {
      const projectData = {
        project_id: 'project-123',
        project_name: 'Test Project',
        project_status: 1,
        organization_id: 'org-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [projectData],
      });

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 })
        .mockResolvedValueOnce({ command: 'COMMIT' })
        .mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
        });

      mockNotificationRepository.create.mockResolvedValue(undefined);

      // 秘寁E��を含むcomment
      const commentWithPrivateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAA\n-----END PRIVATE KEY-----';

      await projectService.requestApproval(
        'project-123',
        commentWithPrivateKey,
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('BEGIN PRIVATE KEY');
        expect(logMessage).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAA');
      });
    });
  });

  describe('5.2.4.2: チE�Eタベ�Eス接続情報の漏洩防止', () => {
    it('ログにチE�Eタベ�Eス接続文字�Eが含まれなぁE��と', async () => {
      const projectData = {
        project_id: 'project-123',
        project_name: 'Test Project',
        project_status: 1,
        organization_id: 'org-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [projectData],
      });

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 })
        .mockResolvedValueOnce({ command: 'COMMIT' })
        .mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
        });

      mockNotificationRepository.create.mockResolvedValue(undefined);

      // チE�Eタベ�Eス接続文字�Eを含むcomment
      const commentWithDbConnection = 'postgresql://user:password@localhost:5432/dbname';

      await projectService.requestApproval(
        'project-123',
        commentWithDbConnection,
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call);
        // 接続文字�E全体が含まれなぁE��と
        expect(logMessage).not.toContain('postgresql://user:password@');
        // パスワード部刁E��含まれなぁE��と
        expect(logMessage).not.toMatch(/:\w+@localhost/);
      });
    });

    it('ログにクレチE��シャル惁E��が含まれなぁE��と', async () => {
      const projectData = {
        project_id: 'project-123',
        project_name: 'Test Project',
        project_status: 1,
        organization_id: 'org-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [projectData],
      });

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 })
        .mockResolvedValueOnce({ command: 'COMMIT' })
        .mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
        });

      mockNotificationRepository.create.mockResolvedValue(undefined);

      // クレチE��シャル惁E��を含むcomment
      const commentWithCredentials = 'username: admin, password: secret123, token: abc';

      await projectService.requestApproval(
        'project-123',
        commentWithCredentials,
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call).toLowerCase();
        // パスワードフィールドが含まれなぁE��と
        if (logMessage.includes('password')) {
          expect(logMessage).not.toContain('secret123');
        }
      });
    });
  });

  describe('5.2.4.2: 機寁E��報パターンマッチング', () => {
    it('ログにクレジチE��カード番号が含まれなぁE��と', async () => {
      const projectData = {
        project_id: 'project-123',
        project_name: 'Test Project',
        project_status: 1,
        organization_id: 'org-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [projectData],
      });

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 })
        .mockResolvedValueOnce({ command: 'COMMIT' })
        .mockResolvedValueOnce({
          rows: [{ user_name: 'Test User' }],
        });

      mockNotificationRepository.create.mockResolvedValue(undefined);

      // クレジチE��カード番号を含むcomment
      const commentWithCreditCard = 'Card: 4532-1234-5678-9010';

      await projectService.requestApproval(
        'project-123',
        commentWithCreditCard,
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call);
        // クレジチE��カード番号パターン�E�E6桁E��E
        expect(logMessage).not.toMatch(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/);
        expect(logMessage).not.toContain('4532-1234-5678-9010');
      });
    });

    it('環墁E��数の機寁E��報が含まれなぁE��と', async () => {
      // 環墁E��数に機寁E��報を含むエラー�E�本来は発生すべきでなぁE��、テスト！E
      const errorWithEnvVar = new Error('Failed to connect: JWT_SECRET=my_secret_key_123');

      mockPool.query.mockRejectedValueOnce(errorWithEnvVar);

      await projectService.requestApproval(
        'project-123',
        'Test comment',
        'org-123',
        'user-123'
      );

      const allLogCalls = [
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      allLogCalls.forEach((call) => {
        const logMessage = JSON.stringify(call);
        // JWT_SECRET等�E環墁E��数値が含まれなぁE��と
        expect(logMessage).not.toContain('my_secret_key_123');
        // JWT_SECRETとぁE��キー名�E許容�E�値が含まれなぁE��と�E�E
      });
    });
  });
});
