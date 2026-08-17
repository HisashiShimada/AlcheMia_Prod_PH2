/**
 * experimentEvaluation Controller
 *
 * 実験評価APIエンドポイント処理
 *
 * @remarks
 * リクエストの受け取りとレスポンスの返却のみを担当する。
 * ビジネスロジックは experimentEvaluationService に委譲する。
 *
 * @module experimentEvaluationController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as experimentEvaluationService from '../services/experimentEvaluationService';
import type { EvaluationInput } from '../services/experimentEvaluationService';

/**
 * プロジェクトの評価結果一覧取得
 * GET /api/v1/experiment-evaluations/:projectId
 */
export async function getByProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const { projectId } = req.params;

    const rows = await experimentEvaluationService.getByProject(organizationId, projectId);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * 評価結果を一括UPSERT（保存）
 * POST /api/v1/experiment-evaluations
 *
 * @remarks
 * リクエストボディ:
 * {
 *   projectId: string,
 *   evaluations: EvaluationInput[]
 * }
 */
export async function saveEvaluations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const userId = (req as any).userId as string | undefined;
    const { projectId, evaluations } = req.body as {
      projectId: string;
      evaluations: EvaluationInput[];
    };

    const saved = await experimentEvaluationService.saveEvaluations(
      organizationId,
      userId,
      projectId,
      evaluations
    );
    res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
}

