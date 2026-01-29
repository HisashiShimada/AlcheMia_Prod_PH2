/**
 * NotificationRepository Unit Tests
 * 
 * 通知リポジトリのユニットテスト
 */

import { NotificationRepository } from '../../src/repositories/notificationRepository';
import { getPool } from '../../src/database/db';
import { CreateNotificationInput, NotificationType, RelatedEntityType } from '../../src/types/notification';

// モック設定
jest.mock('../../src/database/db');

// テスト用のUUID生成ヘルパー（uuidモジュールの代わり）
const generateTestUUID = () => '12345678-1234-1234-1234-123456789012';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // プールとクライアントのモック
    mockClient = {
      query: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    repository = new NotificationRepository();
  });

  describe('create', () => {
    it('通知レコードを作成できること（トランザクションなし）', async () => {
      // Arrange
      const notificationInput: CreateNotificationInput = {
        notification_id: generateTestUUID(),
        organization_id: 'org-123',
        notification_type: NotificationType.APPROVAL_REQUEST,
        target_user_id: null,
        related_entity_type: RelatedEntityType.PROJECT,
        related_entity_id: 'project-456',
        title: '承認依頼: テストプロジェクト',
        message: '実験作業が完了しました。承認をお願いします。',
        is_read: false,
        created_by: 'user-789',
      };

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await repository.create(notificationInput);

      // Assert
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_notification'),
        [
          notificationInput.notification_id,
          notificationInput.organization_id,
          notificationInput.notification_type,
          notificationInput.target_user_id,
          notificationInput.related_entity_type,
          notificationInput.related_entity_id,
          notificationInput.title,
          notificationInput.message,
          notificationInput.is_read,
          notificationInput.created_by,
        ]
      );
    });

    it('通知レコードを作成できること（トランザクションあり）', async () => {
      // Arrange
      const notificationInput: CreateNotificationInput = {
        notification_id: `${generateTestUUID()}-2`,
        organization_id: 'org-123',
        notification_type: NotificationType.APPROVAL_REQUEST,
        target_user_id: 'admin-999',
        related_entity_type: RelatedEntityType.PROJECT,
        related_entity_id: 'project-456',
        title: '承認依頼: テストプロジェクト',
        message: 'コメント付きの承認依頼です。',
        is_read: false,
        created_by: 'user-789',
      };

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await repository.create(notificationInput, mockClient);

      // Assert
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_notification'),
        [
          notificationInput.notification_id,
          notificationInput.organization_id,
          notificationInput.notification_type,
          notificationInput.target_user_id,
          notificationInput.related_entity_type,
          notificationInput.related_entity_id,
          notificationInput.title,
          notificationInput.message,
          notificationInput.is_read,
          notificationInput.created_by,
        ]
      );
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('organization_idフィルタが適用されていること', async () => {
      // Arrange
      const notificationInput: CreateNotificationInput = {
        notification_id: `${generateTestUUID()}-3`,
        organization_id: 'org-specific-123',
        notification_type: NotificationType.APPROVAL_REQUEST,
        related_entity_type: RelatedEntityType.PROJECT,
        related_entity_id: 'project-456',
        title: '承認依頼: テストプロジェクト',
        message: 'テストメッセージ',
        is_read: false,
        created_by: 'user-789',
      };

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await repository.create(notificationInput);

      // Assert
      const calledQuery = mockPool.query.mock.calls[0][0];
      const calledParams = mockPool.query.mock.calls[0][1];
      
      expect(calledQuery).toContain('organization_id');
      expect(calledParams).toContain('org-specific-123');
    });

    it('Parameterized Queryを使用していること', async () => {
      // Arrange
      const notificationInput: CreateNotificationInput = {
        notification_id: `${generateTestUUID()}-4`,
        organization_id: 'org-123',
        notification_type: NotificationType.APPROVAL_REQUEST,
        related_entity_type: RelatedEntityType.PROJECT,
        related_entity_id: 'project-456',
        title: '承認依頼: テストプロジェクト',
        message: 'テストメッセージ',
        is_read: false,
        created_by: 'user-789',
      };

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await repository.create(notificationInput);

      // Assert
      const calledQuery = mockPool.query.mock.calls[0][0];
      
      // $1, $2, ... のプレースホルダーが使用されていることを確認
      expect(calledQuery).toMatch(/\$\d+/);
      
      // 文字列連結ではないことを確認（VALUES句にプレースホルダーがある）
      expect(calledQuery).toContain('VALUES');
      expect(calledQuery).toMatch(/VALUES\s*\(/);
    });
  });
});