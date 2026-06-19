/**
 * departmentUnit 関連ルート
 *
 * @module departmentUnitRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import * as departmentUnitController from '../controllers/departmentUnitController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * 組織のユーザー一覧取得（メンバー選択用）
 * GET /api/v1/department-units/users
 *
 * @remarks /:id/members より前に定義する必要がある
 */
router.get(
  '/users',
  authMiddleware,
  departmentUnitController.getOrgUsers
);

/**
 * 部署ユニット一覧取得
 * GET /api/v1/department-units
 */
router.get(
  '/',
  authMiddleware,
  departmentUnitController.getDepartmentUnits
);

/**
 * 部署ユニット（チーム）新規作成
 * POST /api/v1/department-units
 */
router.post(
  '/',
  authMiddleware,
  departmentUnitController.createDepartmentUnit
);

/**
 * 指定ユニットのメンバー一覧取得
 * GET /api/v1/department-units/:id/members
 */
router.get(
  '/:id/members',
  authMiddleware,
  departmentUnitController.getMembers
);

/**
 * 指定ユニットのメンバーを一括更新
 * PUT /api/v1/department-units/:id/members
 */
router.put(
  '/:id/members',
  authMiddleware,
  departmentUnitController.updateMembers
);

export default router;
