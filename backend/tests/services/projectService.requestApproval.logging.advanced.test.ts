/**
 * ProjectService.requestApproval - 霑ｽ蜉縺ｮ讖溷ｯ・ュ蝣ｱ繝√ぉ繝・け繝・せ繝・
 * 
 * Task 5.2.4.2: 霑ｽ蜉縺ｮ讖溷ｯ・ュ蝣ｱ讀懆ｨｼ繝・せ繝・
 * Requirement: 12 (繧ｻ繧ｭ繝･繝ｪ繝・ぅ縺ｨ繝槭Ν繝√ユ繝翫Φ繝亥・髮｢)
 * 
 * 逶ｮ逧・ API key縲∫ｧ伜ｯ・嵯縲√け繝ｬ繝・Φ繧ｷ繝｣繝ｫ遲峨・霑ｽ蜉讖溷ｯ・ュ蝣ｱ縺梧ｼ乗ｴｩ縺励↑縺・％縺ｨ繧呈､懆ｨｼ
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';
import { NotificationRepository } from '../../src/repositories/notificationRepository';
import winston from 'winston';

// 繝｢繝・け險ｭ螳・
jest.mock('../../src/database/db');
jest.mock('../../src/repositories/notificationRepository');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-notification-id'),
}));

describe('ProjectService.requestApproval - 霑ｽ蜉縺ｮ讖溷ｯ・ュ蝣ｱ繝√ぉ繝・け', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;
  let mockNotificationRepository: jest.Mocked<NotificationRepository>;

  // Winston繝ｭ繧ｰ縺ｮ繧ｹ繝代う
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Winston繝ｭ繧ｰ縺ｮ繧ｹ繝代う繧定ｨｭ螳・
    infoSpy = jest.spyOn(winston, 'info').mockImplementation();
    errorSpy = jest.spyOn(winston, 'error').mockImplementation();
    warnSpy = jest.spyOn(winston, 'warn').mockImplementation();
    debugSpy = jest.spyOn(winston, 'debug').mockImplementation();

    // console.log縺ｮ繧ｹ繝代う繧りｨｭ螳・
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

  describe('5.2.4.2: API 繧ｭ繝ｼ縺ｨ遘伜ｯ・嵯縺ｮ貍乗ｴｩ髦ｲ豁｢', () => {
    it('繝ｭ繧ｰ縺ｫAWS Access Key縺悟性縺ｾ繧後↑縺・％縺ｨ', async () => {
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

      // AWS Access Key繧貞性繧comment
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
        expect(logMessage.toUpperCase()).not.toContain('AKIA'); // AWS繧ｭ繝ｼ縺ｮ謗･鬆ｭ霎・
      });
    });

    it('繝ｭ繧ｰ縺ｫAPI Key縺悟性縺ｾ繧後↑縺・％縺ｨ', async () => {
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

      // 荳闊ｬ逧・↑API Key繝代ち繝ｼ繝ｳ
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
        expect(logMessage).not.toContain('sk_live_'); // Stripe遲峨・謗･鬆ｭ霎・
      });
    });

    it('繝ｭ繧ｰ縺ｫ遘伜ｯ・嵯・・rivate Key・峨′蜷ｫ縺ｾ繧後↑縺・％縺ｨ', async () => {
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

      // 遘伜ｯ・嵯繧貞性繧comment
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

  describe('5.2.4.2: 繝・・繧ｿ繝吶・繧ｹ謗･邯壽ュ蝣ｱ縺ｮ貍乗ｴｩ髦ｲ豁｢', () => {
    it('繝ｭ繧ｰ縺ｫ繝・・繧ｿ繝吶・繧ｹ謗･邯壽枚蟄怜・縺悟性縺ｾ繧後↑縺・％縺ｨ', async () => {
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

      // 繝・・繧ｿ繝吶・繧ｹ謗･邯壽枚蟄怜・繧貞性繧comment
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
        // 謗･邯壽枚蟄怜・蜈ｨ菴薙′蜷ｫ縺ｾ繧後↑縺・％縺ｨ
        expect(logMessage).not.toContain('postgresql://user:password@');
        // 繝代せ繝ｯ繝ｼ繝蛾Κ蛻・′蜷ｫ縺ｾ繧後↑縺・％縺ｨ
        expect(logMessage).not.toMatch(/:\w+@localhost/);
      });
    });

    it('繝ｭ繧ｰ縺ｫ繧ｯ繝ｬ繝・Φ繧ｷ繝｣繝ｫ諠・ｱ縺悟性縺ｾ繧後↑縺・％縺ｨ', async () => {
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

      // 繧ｯ繝ｬ繝・Φ繧ｷ繝｣繝ｫ諠・ｱ繧貞性繧comment
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
        // 繝代せ繝ｯ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨′蜷ｫ縺ｾ繧後↑縺・％縺ｨ
        if (logMessage.includes('password')) {
          expect(logMessage).not.toContain('secret123');
        }
      });
    });
  });

  describe('5.2.4.2: 讖溷ｯ・ュ蝣ｱ繝代ち繝ｼ繝ｳ繝槭ャ繝√Φ繧ｰ', () => {
    it('繝ｭ繧ｰ縺ｫ繧ｯ繝ｬ繧ｸ繝・ヨ繧ｫ繝ｼ繝臥分蜿ｷ縺悟性縺ｾ繧後↑縺・％縺ｨ', async () => {
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

      // 繧ｯ繝ｬ繧ｸ繝・ヨ繧ｫ繝ｼ繝臥分蜿ｷ繧貞性繧comment
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
        // 繧ｯ繝ｬ繧ｸ繝・ヨ繧ｫ繝ｼ繝臥分蜿ｷ繝代ち繝ｼ繝ｳ・・6譯・ｼ・
        expect(logMessage).not.toMatch(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/);
        expect(logMessage).not.toContain('4532-1234-5678-9010');
      });
    });

    it('迺ｰ蠅・､画焚縺ｮ讖溷ｯ・ュ蝣ｱ縺悟性縺ｾ繧後↑縺・％縺ｨ', async () => {
      // 迺ｰ蠅・､画焚縺ｫ讖溷ｯ・ュ蝣ｱ繧貞性繧繧ｨ繝ｩ繝ｼ・域悽譚･縺ｯ逋ｺ逕溘☆縺ｹ縺阪〒縺ｪ縺・′縲√ユ繧ｹ繝茨ｼ・
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
        // JWT_SECRET遲峨・迺ｰ蠅・､画焚蛟､縺悟性縺ｾ繧後↑縺・％縺ｨ
        expect(logMessage).not.toContain('my_secret_key_123');
        // JWT_SECRET縺ｨ縺・≧繧ｭ繝ｼ蜷阪・險ｱ螳ｹ・亥､縺悟性縺ｾ繧後↑縺・％縺ｨ・・
      });
    });
  });
});
