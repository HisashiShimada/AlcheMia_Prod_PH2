/**
 * experimentPlanController.ts
 * 実験計画 Controller 層
 *
 * @remarks
 * エンドポイント:
 *   GET    /api/v1/projects/:projectId/experiment-plans?methodId=xxx
 *   PUT    /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo
 *   DELETE /api/v1/projects/:projectId/experiment-plans/:methodId
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import * as experimentPlanService from '../services/experimentPlanService';
import type { ExperimentPlanValues } from '../types/database';
import type { TemplateDef } from '../types/api';

// ──────────────────────────────────────────────
// ハンドラ
// ──────────────────────────────────────────────

/**
 * 指定メソッドの全タスク分の実験計画を取得
 * GET /api/v1/projects/:projectId/experiment-plans?methodId=xxx
 */
export async function getExperimentPlans(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const { projectId } = req.params;
    const { methodId } = req.query as { methodId?: string };

    logger.info('[experimentPlan] getExperimentPlans', {
      organizationId,
      projectId,
      methodId,
    });

    const result = await experimentPlanService.getExperimentPlans(
      organizationId,
      projectId,
      methodId as string
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 1タスク分の実験計画を保存（UPSERT）
 * PUT /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo
 */
export async function upsertExperimentPlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId, userId } = req.user!;
    const { projectId, methodId, taskNo: taskNoStr } = req.params;
    const body = req.body as { plannedValues?: ExperimentPlanValues; templates?: TemplateDef[]; transitions?: Array<{ id: string; name: string }> };

    logger.info('[experimentPlan] upsertExperimentPlan', {
      organizationId,
      projectId,
      methodId,
      taskNo: taskNoStr,
    });

    const taskNo = parseInt(taskNoStr, 10);

    const result = await experimentPlanService.upsertExperimentPlan({
      organizationId,
      projectId,
      methodId,
      taskNo,
      plannedValues: body.plannedValues!,
      userId,
      templates: body.templates,
      transitions: body.transitions,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 指定メソッドの全タスク分の実験計画を削除
 * DELETE /api/v1/projects/:projectId/experiment-plans/:methodId
 */
export async function deleteExperimentPlans(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const { projectId, methodId } = req.params;

    logger.info('[experimentPlan] deleteExperimentPlans', {
      organizationId,
      projectId,
      methodId,
    });

    const result = await experimentPlanService.deleteExperimentPlans(
      organizationId,
      projectId,
      methodId
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
