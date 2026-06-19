/**
 * departmentUnit Controller
 *
 * 部署ユニット（チーム）管理のAPIエンドポイント処理
 *
 * @module departmentUnitController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as departmentUnitRepository from '../repositories/departmentUnitRepository';

/**
 * 部署ユニット（チーム）を新規作成
 * POST /api/v1/department-units
 */
export async function createDepartmentUnit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      (req as any).organizationId as string | undefined;

    const {
      departmentCd,
      unitName,
      layer,
      description,
    } = req.body as {
      departmentCd?: string;
      unitName: string;
      layer?: number;
      description?: string;
    };

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId が取得できません' });
      return;
    }

    if (!unitName || !unitName.trim()) {
      res.status(400).json({ error: 'unitName は必須です' });
      return;
    }

    const created = await departmentUnitRepository.create({
      organizationId,
      departmentCd,
      unitName: unitName.trim(),
      layer: layer ?? 1,
      description,
      createUserId: (req as any).userId as string | undefined,
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

/**
 * 組織の部署ユニット一覧を取得
 * GET /api/v1/department-units
 */
export async function getDepartmentUnits(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      (req as any).organizationId as string | undefined;

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId が取得できません' });
      return;
    }

    const units = await departmentUnitRepository.findAllByOrganization(organizationId);
    res.json(units);
  } catch (error) {
    next(error);
  }
}

/**
 * 指定ユニットのメンバー一覧を取得
 * GET /api/v1/department-units/:id/members
 */
export async function getMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      (req as any).organizationId as string | undefined;
    const { id } = req.params;

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId が取得できません' });
      return;
    }

    const members = await departmentUnitRepository.findMembersByUnitId(organizationId, id);
    res.json(members);
  } catch (error) {
    next(error);
  }
}

/**
 * 組織内のユーザー一覧を取得（メンバー選択用）
 * GET /api/v1/department-units/users
 */
export async function getOrgUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      (req as any).organizationId as string | undefined;

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId が取得できません' });
      return;
    }

    const users = await departmentUnitRepository.findUsersByOrganization(organizationId);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

/**
 * 指定ユニットのメンバーを一括更新
 * PUT /api/v1/department-units/:id/members
 */
export async function updateMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      (req as any).organizationId as string | undefined;
    const { id } = req.params;
    const { userIds } = req.body as { userIds: string[] };

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId が取得できません' });
      return;
    }

    if (!Array.isArray(userIds)) {
      res.status(400).json({ error: 'userIds は配列である必要があります' });
      return;
    }

    await departmentUnitRepository.updateMembers(organizationId, id, userIds);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
