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
import * as qualityEvaluationMaimlService from '../services/qualityEvaluationMaimlService';
import type {
  CreateProjectOverallEvaluationInput,
  SaveSubEvaluationsInput,
} from '../types/projectOverallEvaluation';

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

/**
 * 品質評価データを MAiML ファイルの <eventLog> に書き込む
 * POST /api/v1/project-overall-evaluations/:projectId/export-to-maiml
 */
export async function exportToMaiml(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const { projectId } = req.params;

    const result = await qualityEvaluationMaimlService.exportQualityEvaluationToMaiml(
      organizationId,
      projectId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'E6001') {
      res.status(404).json({ error: { code: 'E6001', message: err.message } });
      return;
    }
    next(error);
  }
}

/**
 * プロジェクトの下位評価一覧取得
 * GET /api/v1/project-overall-evaluations/:projectId/sub-evaluations
 */
export async function getSubEvaluations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const { projectId } = req.params;

    const rows = await projectOverallEvaluationService.getSubEvaluationsByProject(
      organizationId,
      projectId
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * 下位評価を一括保存
 * POST /api/v1/project-overall-evaluations/:projectId/sub-evaluations
 */
export async function saveSubEvaluations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const userId = (req as any).userId as string | undefined;
    const { projectId } = req.params;
    const input = req.body as SaveSubEvaluationsInput;

    const saved = await projectOverallEvaluationService.saveSubEvaluations(
      organizationId,
      userId ?? null,
      projectId,
      input.evaluations
    );
    res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
}
