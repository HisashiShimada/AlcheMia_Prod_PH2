/**
 * userController フェーズ２ テスト
 *
 * 分類A：ユーザー管理APIの動作確認（Phase2 変更箇所）
 * - 名前空間自動生成連携（createUser）
 * - getUsers / getUserById / createUser / updateUser / updateUserStatus
 * - downloadUsersCsv / uploadUsersCsv
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../../../src/services/userService';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  downloadUsersCsv,
  uploadUsersCsv,
} from '../../../src/controllers/userController';
// userService の実際のエクスポート名エイリアス
// generateCSV / uploadUsersFromCSV

jest.mock('../../../src/services/userService');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  organizationId?: string;
  userId?: string;
  organizationGroupCds?: string[];
  file?: any;
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    headers: {},
    user: {
      userId: overrides.userId ?? 'user-001',
      organizationId: overrides.organizationId ?? 'org-001',
      organizationGroupCds: overrides.organizationGroupCds ?? ['group-A'],
    },
    file: overrides.file,
  } as unknown as Request;
  (req as any).organizationId = overrides.organizationId ?? 'org-001';

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    setHeader: jest.fn(),
    attachment: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('userController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getUsers
  // ==========================================================================
  describe('getUsers()', () => {
    test('正常系: ユーザー一覧を返すこと', async () => {
      const users = [
        { user_id: 'user-001', user_name: 'テストユーザーA' },
        { user_id: 'user-002', user_name: 'テストユーザーB' },
      ];
      (userService.getUsers as jest.Mock).mockResolvedValue(users);

      const { req, res, next } = makeMocks();

      await getUsers(req, res, next);

      expect(userService.getUsers).toHaveBeenCalledWith('org-001');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: users })
      );
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (userService.getUsers as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks();

      await getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // getUserById
  // ==========================================================================
  describe('getUserById()', () => {
    test('正常系: ユーザー詳細を返すこと', async () => {
      const user = { user_id: 'user-001', user_name: 'テストユーザーA' };
      (userService.getUserById as jest.Mock).mockResolvedValue(user);

      const { req, res, next } = makeMocks({ params: { userId: 'user-001' } });

      await getUserById(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: user })
      );
    });

    test('異常系（404）: ユーザーが存在しない場合、404 を返すこと', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({ params: { userId: 'non-existent' } });

      await getUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // createUser（Phase2 変更箇所：名前空間自動生成連携）
  // ==========================================================================
  describe('createUser()', () => {
    test('正常系: ユーザーを新規作成し、名前空間も自動生成されること', async () => {
      const created = {
        user_id: 'user-new',
        user_name: '新規ユーザー',
        mail_address: 'new@example.com',
      };
      (userService.createUser as jest.Mock).mockResolvedValue(created);

      const { req, res, next } = makeMocks({
        body: {
          userName: '新規ユーザー',
          mailAddress: 'new@example.com',
          roleCd: 'researcher',
          organizationGroupCds: ['group-A'],
          password: 'Password123!',
        },
      });

      await createUser(req, res, next);

      expect(userService.createUser).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: created })
      );
    });

    test('正常系: organizationGroupCds が複数でも作成できること', async () => {
      const created = { user_id: 'user-new2', user_name: '新規ユーザー2' };
      (userService.createUser as jest.Mock).mockResolvedValue(created);

      const { req, res, next } = makeMocks({
        body: {
          userName: '新規ユーザー2',
          mailAddress: 'new2@example.com',
          roleCd: 'researcher',
          organizationGroupCds: ['group-A', 'group-B'],
          password: 'Password123!',
        },
      });

      await createUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('create error');
      (userService.createUser as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        body: {
          userName: 'エラーユーザー',
          mailAddress: 'error@example.com',
          roleCd: 'researcher',
        },
      });

      await createUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // updateUser
  // ==========================================================================
  describe('updateUser()', () => {
    test('正常系: ユーザー情報を更新し、結果を返すこと', async () => {
      const updated = { user_id: 'user-001', user_name: '更新後ユーザー' };
      (userService.updateUser as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { userId: 'user-001' },
        body: { userName: '更新後ユーザー', organizationGroupCds: ['group-A', 'group-B'] },
      });

      await updateUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: updated })
      );
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('update error');
      (userService.updateUser as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        params: { userId: 'user-001' },
        body: { userName: '更新後ユーザー' },
      });

      await updateUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // updateUserStatus
  // ==========================================================================
  describe('updateUserStatus()', () => {
    test('正常系（無効化）: ユーザーを無効化できること', async () => {
      const updated = { user_id: 'user-001', is_valid: false };
      (userService.updateUserStatus as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { userId: 'user-001' },
        body: { isValid: false },
      });

      await updateUserStatus(req, res, next);

      expect(userService.updateUserStatus).toHaveBeenCalledWith('org-001', 'user-001', false, 'user-001');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: updated })
      );
    });

    test('正常系（有効化）: ユーザーを有効化できること', async () => {
      const updated = { user_id: 'user-001', is_valid: true };
      (userService.updateUserStatus as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { userId: 'user-001' },
        body: { isValid: true },
      });

      await updateUserStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: updated })
      );
    });
  });

  // ==========================================================================
  // downloadUsersCsv
  // ==========================================================================
  describe('downloadUsersCsv()', () => {
    test('正常系: CSV ファイルをダウンロードできること', async () => {
      const csvContent = 'user_id,user_name\nuser-001,テストユーザーA';
      (userService.generateCSV as jest.Mock).mockResolvedValue(csvContent);

      const { req, res, next } = makeMocks();

      await downloadUsersCsv(req, res, next);

      expect(userService.generateCSV).toHaveBeenCalled();
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('csv error');
      (userService.generateCSV as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks();

      await downloadUsersCsv(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // uploadUsersCsv
  // ==========================================================================
  describe('uploadUsersCsv()', () => {
    test('正常系: CSV ファイルをアップロードし、結果を返すこと', async () => {
      const result = { created: 2, updated: 1, errors: [] };
      (userService.uploadUsersFromCSV as jest.Mock).mockResolvedValue(result);

      const mockFile = {
        buffer: Buffer.from('user_id,user_name\nuser-001,テストユーザーA'),
        originalname: 'users.csv',
        mimetype: 'text/csv',
      };

      const { req, res, next } = makeMocks({ file: mockFile });

      await uploadUsersCsv(req, res, next);

      expect(userService.uploadUsersFromCSV).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('異常系: ファイルが存在しない場合、400 を返すこと', async () => {
      const { req, res, next } = makeMocks();

      await uploadUsersCsv(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
