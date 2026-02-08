/**
 * ProjectService.requestApproval - Task 3.3: 通知レコード�E生�Eと保孁E
 * 
 * @description 承認依頼時�E通知生�E・保存�EチE��チE
 * Requirements: 6, 7, 12
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';
import { NotificationType, RelatedEntityType } from '../../src/types/notification';

// チE�Eタベ�Eスプ�EルをモチE��
jest.mock('../../src/database/db');

describe('ProjectService.requestApproval - Task 3.3: 通知レコード�E生�Eと保孁E, () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let mockRelease: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();
    
    // モチE��クエリ関数
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockConnect = jest.fn();

    // モチE��クライアント（トランザクション用�E�E
    mockClient = {
      query: mockQuery,
      release: mockRelease,
    };

    // モチE��プ�Eル
    mockPool = {
      query: jest.fn(), // プロジェクト取得用�E�トランザクション外！E
      connect: mockConnect,
    };

    mockConnect.mockResolvedValue(mockClient);
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 6: 通知の生�Eと保孁E, () => {
    it('should generate UUID v4 notification_id', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';
      const projectName = 'Test Project';

      // プロジェクト取得！Eool.query�E�E
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: projectName,
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      // トランザクション冁E�Eクエリ�E�Elient.query�E�E
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await projectService.requestApproval(
        projectId,
        null,
        organizationId,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.notification_id).toBeDefined();
      
      // UUID v4形式�E検証�E�E-4-4-4-12の形式！E
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.data?.notification_id).toMatch(uuidRegex);
    });

    it('should set notification_type to "approval_request"', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(NotificationType.APPROVAL_REQUEST);
    });

    it('should generate title as "承認依頼: {プロジェクト名}"', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';
      const projectName = 'サンプルプロジェクチE;

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: projectName,
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(`承認依頼: ${projectName}`);
    });

    it('should set message to user comment when provided', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';
      const comment = 'すべての実験が完亁E��ました。ご確認お願いします、E;

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, comment, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(comment);
    });

    it('should set message to default when comment is not provided', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain('実験作業が完亁E��ました。承認をお願いします、E);
    });

    it('should set related_entity_type to "project"', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(RelatedEntityType.PROJECT);
    });

    it('should set related_entity_id to project_id', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(projectId);
    });

    it('should set is_read to false', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(false); // is_read = false
    });

    it('should set created_by to requesting user_id', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain(userId);
    });
  });

  describe('Requirement 12: セキュリチE��とマルチテナント�E離�E�通知�E�E, () => {
    it('should apply organization_id in notification INSERT', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toContain('organization_id');
      expect(insertCall![1]).toContain(organizationId);
    });

    it('should use Parameterized Query for notification INSERT', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      const insertCall = mockQuery.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO system_notification')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toMatch(/\$\d/); // $1, $2 などのプレースホルダ
      expect(Array.isArray(insertCall![1])).toBe(true); // パラメータ配�E
    });
  });

  describe('Requirement 7: トランザクション冁E��の通知作�E', () => {
    it('should create notification within the same transaction', async () => {
      // Arrange
      const projectId = 'project-uuid-123';
      const organizationId = 'org-uuid-456';
      const userId = 'user-uuid-789';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            project_id: projectId,
            project_name: 'Test Project',
            project_status: 1,
            organization_id: organizationId,
          },
        ],
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ notification_id: 'notif-uuid' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      await projectService.requestApproval(projectId, null, organizationId, userId);

      // Assert
      // BEGIN, UPDATE, INSERT, COMMIT の頁E��を確誁E
      expect(mockQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE project'), expect.any(Array));
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO system_notification'), expect.any(Array));
      expect(mockQuery).toHaveBeenNthCalledWith(4, 'COMMIT');
    });
  });
});
