/**
 * プロジェクトアクセス権限検証機能のテスト
 * 
 * Task 3.2: プロジェクトアクセス権限検証機能の実装
 * Requirements: 3 (プロジェクトアクセス権限の確認)
 */

import { ProjectAccessValidator } from '../../src/services/projectAccessValidator';
import { getPool } from '../../src/database/db';
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../../src/utils/errorClasses';

// モック
jest.mock('../../src/database/db');

describe('ProjectAccessValidator', () => {
  let validator: ProjectAccessValidator;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);

    validator = new ProjectAccessValidator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAccess', () => {
    const mockUserId = 'user_123';
    const mockProjectId = 'project_456';
    const mockOrganizationId = 'org_maiml_lab_001';

    describe('System Admin権限', () => {
      it('System Adminは全組織のプロジェクトにアクセス可能', async () => {
        // プロジェクト情報
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: mockOrganizationId,
              project_name: 'Sample Project',
            },
          ],
        });

        // ユーザー情報（System Admin）
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: 'org_system_admin',
              role_name: 'admin',
            },
          ],
        });

        const result = await validator.validateAccess(
          mockUserId,
          mockProjectId,
          mockOrganizationId
        );

        expect(result.hasAccess).toBe(true);
        expect(result.userRole).toBe('admin');
      });

      it('System Adminは異なる組織のプロジェクトにもアクセス可能', async () => {
        const differentOrgId = 'org_another_company';

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: differentOrgId,
              project_name: 'Other Org Project',
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: mockOrganizationId,
              role_name: 'admin',
            },
          ],
        });

        const result = await validator.validateAccess(
          mockUserId,
          mockProjectId,
          differentOrgId
        );

        expect(result.hasAccess).toBe(true);
        expect(result.userRole).toBe('admin');
      });
    });

    describe('Manager権限', () => {
      it('Managerは自組織のプロジェクトにアクセス可能', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: mockOrganizationId,
              project_name: 'Sample Project',
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: mockOrganizationId,
              role_name: 'manager',
            },
          ],
        });

        const result = await validator.validateAccess(
          mockUserId,
          mockProjectId,
          mockOrganizationId
        );

        expect(result.hasAccess).toBe(true);
        expect(result.userRole).toBe('manager');
      });

      it('Managerは他組織のプロジェクトにアクセス不可（AuthorizationError）', async () => {
        const otherOrgId = 'org_other_company';

        mockPool.query
          .mockResolvedValueOnce({
            rows: [
              {
                project_id: mockProjectId,
                organization_id: otherOrgId,
                project_name: 'Other Project',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                user_id: mockUserId,
                organization_id: mockOrganizationId,
                role_name: 'manager',
              },
            ],
          });

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, otherOrgId)
        ).rejects.toThrow(AuthorizationError);
      });
    });

    describe('Worker権限', () => {
      it('Workerは割り当てられたプロジェクトにアクセス可能', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: mockOrganizationId,
              project_name: 'Sample Project',
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: mockOrganizationId,
              role_name: 'worker',
            },
          ],
        });

        // プロジェクト割り当て確認
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              project_id: mockProjectId,
            },
          ],
        });

        const result = await validator.validateAccess(
          mockUserId,
          mockProjectId,
          mockOrganizationId
        );

        expect(result.hasAccess).toBe(true);
        expect(result.userRole).toBe('worker');
      });

      it('Workerは割り当てられていないプロジェクトにアクセス不可（AuthorizationError）', async () => {
        mockPool.query
          .mockResolvedValueOnce({
            rows: [
              {
                project_id: mockProjectId,
                organization_id: mockOrganizationId,
                project_name: 'Sample Project',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                user_id: mockUserId,
                organization_id: mockOrganizationId,
                role_name: 'worker',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [],
          });

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, mockOrganizationId)
        ).rejects.toThrow('このプロジェクトは割り当てられていません');
      });

      it('Workerは他組織のプロジェクトにアクセス不可（AuthorizationError）', async () => {
        const otherOrgId = 'org_other_company';

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: otherOrgId,
              project_name: 'Other Project',
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: mockOrganizationId,
              role_name: 'worker',
            },
          ],
        });

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, otherOrgId)
        ).rejects.toThrow(AuthorizationError);
      });
    });

    describe('エラーケース', () => {
      it('プロジェクトが存在しない場合はNotFoundError', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [],
        });

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, mockOrganizationId)
        ).rejects.toThrow(NotFoundError);
      });

      it('ユーザーが存在しない場合はNotFoundError', async () => {
        mockPool.query
          .mockResolvedValueOnce({
            rows: [
              {
                project_id: mockProjectId,
                organization_id: mockOrganizationId,
                project_name: 'Sample Project',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [],
          });

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, mockOrganizationId)
        ).rejects.toThrow(NotFoundError);
      });

      it('空のユーザーIDを拒否する', async () => {
        await expect(
          validator.validateAccess('', mockProjectId, mockOrganizationId)
        ).rejects.toThrow(ValidationError);

        await expect(
          validator.validateAccess('', mockProjectId, mockOrganizationId)
        ).rejects.toThrow('ユーザーIDが無効です');
      });

      it('空のプロジェクトIDを拒否する', async () => {
        await expect(
          validator.validateAccess(mockUserId, '', mockOrganizationId)
        ).rejects.toThrow(ValidationError);

        await expect(
          validator.validateAccess(mockUserId, '', mockOrganizationId)
        ).rejects.toThrow('プロジェクトIDが無効です');
      });

      it('空の組織IDを拒否する', async () => {
        await expect(
          validator.validateAccess(mockUserId, mockProjectId, '')
        ).rejects.toThrow(ValidationError);

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, '')
        ).rejects.toThrow('組織IDが無効です');
      });

      it('データベースエラー時は適切にハンドリング', async () => {
        mockPool.query.mockRejectedValueOnce(
          new Error('Database connection failed')
        );

        await expect(
          validator.validateAccess(mockUserId, mockProjectId, mockOrganizationId)
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('SQLクエリの検証', () => {
      it('プロジェクト取得クエリが正しいパラメータで実行される', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: mockOrganizationId,
              project_name: 'Sample Project',
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: mockOrganizationId,
              role_name: 'admin',
            },
          ],
        });

        await validator.validateAccess(
          mockUserId,
          mockProjectId,
          mockOrganizationId
        );

        // 最初のクエリ（プロジェクト取得）を確認
        expect(mockPool.query).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('SELECT'),
          expect.arrayContaining([mockProjectId, mockOrganizationId])
        );
      });

      it('ユーザー情報取得クエリが正しいパラメータで実行される', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              project_id: mockProjectId,
              organization_id: mockOrganizationId,
              project_name: 'Sample Project',
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              user_id: mockUserId,
              organization_id: mockOrganizationId,
              role_name: 'admin',
            },
          ],
        });

        await validator.validateAccess(
          mockUserId,
          mockProjectId,
          mockOrganizationId
        );

        // 2番目のクエリ（ユーザー情報取得）を確認
        expect(mockPool.query).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('SELECT'),
          expect.arrayContaining([mockUserId])
        );
      });
    });
  });
});
