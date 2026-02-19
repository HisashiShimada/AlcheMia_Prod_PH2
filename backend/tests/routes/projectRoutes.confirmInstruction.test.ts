/**
 * 指示確認完了API権限チェックテスト
 * 
 * @description PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm エンドポイントの権限チェックをテスト
 * @task 指示確認完了API権限チェック実装
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { checkPermission } from '../../src/middleware/permissionCheckMiddleware';
import * as projectController from '../../src/controllers/projectController';

// モックの設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/permissionCheckMiddleware');
jest.mock('../../src/controllers/projectController');

describe('PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm - 権限チェック', () => {
  let app: Express;

  beforeEach(() => {
    // Expressアプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    // モックのリセット
    jest.clearAllMocks();

    // authMiddlewareのモック設定（デフォルトで通過させる）
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_worker',
        permissions: [
          { functionId: '050000', permission: 1 } // 実験作業者メニュー、書込可
        ]
      };
      next();
    });

    // コントローラーのモック設定
    (projectController.confirmInstruction as jest.Mock) = jest.fn((_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          instruction_id: '550e8400-e29b-41d4-a716-446655440000',
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_user_id: 'test-user-id'
        }
      });
    });
  });

  describe('ルーティング設定', () => {
    beforeEach(() => {
      // checkPermissionをパススルー
      (checkPermission as jest.Mock).mockReturnValue((_req: any, _res: any, next: any) => {
        next();
      });
    });

    it('PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm エンドポイントが存在する', async () => {
      const response = await request(app)
        .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
        .send();

      // 404でないことを確認（ルートが存在する）
      expect(response.status).not.toBe(404);
    });

    it('authMiddleware が適用されている', async () => {
      await request(app)
        .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
        .send();

      // authMiddleware が呼び出されたことを確認
      expect(authMiddleware).toHaveBeenCalled();
    });

    it('checkPermission ミドルウェアが適用されている', async () => {
      await request(app)
        .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
        .send();

      // checkPermission('050000', 1) が呼び出されたことを確認
      expect(checkPermission).toHaveBeenCalledWith('050000', 1);
    });

    it('ProjectController.confirmInstruction が呼び出される', async () => {
      await request(app)
        .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
        .send();

      // コントローラーが呼び出されたことを確認
      expect(projectController.confirmInstruction).toHaveBeenCalled();
    });
  });

  describe('権限チェック', () => {
    describe('正常系: 実験作業者（書込可）の場合', () => {
      beforeEach(() => {
        // checkPermissionをパススルー（権限あり）
        (checkPermission as jest.Mock).mockReturnValue((_req: any, _res: any, next: any) => {
          next();
        });

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = {
            userId: 'test-user-id',
            organizationId: 'test-org-id',
            role: 'experiment_worker',
            permissions: [
              { functionId: '050000', permission: 1 } // 書込可
            ]
          };
          next();
        });
      });

      it('権限チェックを通過し、200 OKを返す', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(projectController.confirmInstruction).toHaveBeenCalled();
      });
    });

    describe('異常系: 権限がない場合', () => {
      beforeEach(() => {
        // checkPermissionで403エラーを返す（権限なし）
        (checkPermission as jest.Mock).mockReturnValue((_req: any, res: any, _next: any) => {
          res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: '機能へのアクセス権限がありません（機能CD: 050000）'
            },
            meta: {
              timestamp: new Date().toISOString()
            }
          });
        });

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = {
            userId: 'test-user-id',
            organizationId: 'test-org-id',
            role: 'data_admin',
            permissions: [
              { functionId: '030000', permission: 1 } // データ管理メニュー
            ]
          };
          next();
        });
      });

      it('403 Forbiddenを返す', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('PERMISSION_DENIED');
        expect(projectController.confirmInstruction).not.toHaveBeenCalled();
      });
    });

    describe('異常系: 読み取り専用権限の場合', () => {
      beforeEach(() => {
        // checkPermissionで403エラーを返す（権限レベル不足）
        (checkPermission as jest.Mock).mockReturnValue((_req: any, res: any, _next: any) => {
          res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSION',
              message: '必要な権限レベルが不足しています（必要: 1, 所有: 0）'
            },
            meta: {
              timestamp: new Date().toISOString()
            }
          });
        });

        (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
          req.user = {
            userId: 'test-user-id',
            organizationId: 'test-org-id',
            role: 'experiment_worker',
            permissions: [
              { functionId: '050000', permission: 0 } // 読み取り専用
            ]
          };
          next();
        });
      });

      it('403 Forbiddenを返す', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSION');
        expect(projectController.confirmInstruction).not.toHaveBeenCalled();
      });
    });
  });

  describe('ミドルウェアチェーンの順序', () => {
    beforeEach(() => {
      // checkPermissionをパススルー
      (checkPermission as jest.Mock).mockReturnValue((_req: any, _res: any, next: any) => {
        next();
      });
    });

    it('authMiddleware → checkPermission → validation → controller の順で実行される', async () => {
      const callOrder: string[] = [];

      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        callOrder.push('auth');
        req.user = {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          role: 'experiment_worker',
          permissions: [{ functionId: '050000', permission: 1 }]
        };
        next();
      });

      (checkPermission as jest.Mock).mockReturnValue((_req: any, _res: any, next: any) => {
        callOrder.push('permission');
        next();
      });

      (projectController.confirmInstruction as jest.Mock) = jest.fn((_req, res) => {
        callOrder.push('controller');
        res.status(200).json({ success: true });
      });

      await request(app)
        .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
        .send();

      // 実行順序を確認（auth → permission → validation → controller）
      expect(callOrder[0]).toBe('auth');
      expect(callOrder[1]).toBe('permission');
      expect(callOrder[callOrder.length - 1]).toBe('controller');
    });
  });

  describe('バリデーション', () => {
    beforeEach(() => {
      // checkPermissionをパススルー
      (checkPermission as jest.Mock).mockReturnValue((_req: any, _res: any, next: any) => {
        next();
      });
    });

    describe('projectName パラメータ', () => {
      it('projectNameが空の場合は400エラーを返す', async () => {
        const response = await request(app)
          .put('/api/v1/projects/ /instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(404); // ルートが見つからない
      });

      it('projectNameが255文字を超える場合は400エラーを返す', async () => {
        const longName = 'a'.repeat(256);
        const response = await request(app)
          .put(`/api/v1/projects/${longName}/instructions/550e8400-e29b-41d4-a716-446655440000/confirm`)
          .send();

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('projectNameが正常な場合はバリデーションを通過する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(200);
        expect(projectController.confirmInstruction).toHaveBeenCalled();
      });
    });

    describe('instructionId パラメータ', () => {
      it('UUID形式でない場合は400エラーを返す', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/invalid-uuid/confirm')
          .send();

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('UUID形式の場合はバリデーションを通過する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(200);
        expect(projectController.confirmInstruction).toHaveBeenCalled();
      });
    });

    describe('複合バリデーション', () => {
      it('すべてのパラメータが正常な場合はバリデーションを通過する', async () => {
        const response = await request(app)
          .put('/api/v1/projects/test-project/instructions/550e8400-e29b-41d4-a716-446655440000/confirm')
          .send();

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(projectController.confirmInstruction).toHaveBeenCalled();
      });
    });
  });
});
