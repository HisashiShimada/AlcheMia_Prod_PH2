/**
 * projectOverallEvaluationController.ts
 *
 * プロジェクト全体評価 API エンドポイント処理
 *
 * @module projectOverallEvaluationController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as projectOverallEvaluationService from '../services/projectOverallEvaluationService';
import type { CreateProjectOverallEvaluationInput } from '../types/projectOverallEvaluation';

/**
 * プロジェクトの全体評価一覧取得（最新順）
 * GET /api/v1/project-overall-evaluations/:projectId
 */
export async function getByProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const { projectId } = req.params;

    const rows = await projectOverallEvaluationService.getByProject(organizationId, projectId);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * 階層別サマリーのプレビュー取得（未登録の動的算出）
 * GET /api/v1/project-overall-evaluations/:projectId/summary
 */
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const { projectId } = req.params;

    const result = await projectOverallEvaluationService.getSummaryPreview(
      organizationId,
      projectId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'E8001') {
      res.status(404).json({ error: { code: 'E8001', message: err.message } });
      return;
    }
    next(error);
  }
}

/**
 * 全体評価を登録（断面を凍結して保存）
 * POST /api/v1/project-overall-evaluations
 */
export async function createOverallEvaluation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const userId = (req as any).userId as string | undefined;
    const input = req.body as CreateProjectOverallEvaluationInput;

    const record = await projectOverallEvaluationService.createOverallEvaluation(
      organizationId,
      userId ?? null,
      input
    );
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'E8001') {
      res.status(404).json({ error: { code: 'E8001', message: err.message } });
      return;
    }
    next(error);
  }
}
