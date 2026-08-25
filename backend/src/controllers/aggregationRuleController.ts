/**
 * aggregationRuleController.ts
 *
 * 集約ルール API エンドポイント処理
 *
 * @module aggregationRuleController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as aggregationRuleService from '../services/aggregationRuleService';
import type { CreateAggregationRuleInput } from '../types/aggregationRule';

/**
 * テナントの ACTIVE ルールを取得
 * GET /api/v1/aggregation-rules/active
 */
export async function getActive(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const rule = await aggregationRuleService.getActiveRule(organizationId);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

/**
 * テナントのルール履歴一覧を取得
 * GET /api/v1/aggregation-rules
 */
export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const rules = await aggregationRuleService.getAllRules(organizationId);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
}

/**
 * 新版の集約ルールを作成して ACTIVE に設定
 * POST /api/v1/aggregation-rules
 */
export async function createRule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const userId = (req as any).userId as string | undefined;
    const input = req.body as CreateAggregationRuleInput;

    const rule = await aggregationRuleService.createRule(organizationId, input, userId ?? null);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

/**
 * 登録済みデータに対するプレビュー算出
 * POST /api/v1/aggregation-rules/preview
 */
export async function previewSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const { projectId, previewRule } = req.body as {
      projectId: string;
      previewRule?: CreateAggregationRuleInput;
    };

    const result = await aggregationRuleService.previewSummary(
      organizationId,
      projectId,
      previewRule
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
