/**
 * uncertaintyCriteria Controller
 *
 * 不確かさ基準管理のAPIエンドポイント処理
 *
 * @remarks
 * Repository の主キーは (organization_id, name_space_id, uncertainty_key, version) の複合キー。
 *
 * @module uncertaintyCriteriaController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as uncertaintyCriteriaRepository from '../repositories/uncertaintyCriteriaRepository';

/**
 * 不確かさ基準一覧取得
 * GET /api/v1/uncertainty-criteria
 *
 * @remarks organizationId はミドルウェアまたはクエリパラメータから取得する
 */
export async function getList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;

    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const rows = await uncertaintyCriteriaRepository.findAllByOrganization(organizationId);

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

/**
 * 不確かさ基準セレクター用一覧取得
 * GET /api/v1/uncertainty-criteria/for-selector
 *
 * @remarks
 * 有効（is_Invalid = FALSE）なレコードのみ返す。
 * 定性評価の選択肢（intuition_selector）も含む。
 * UncertaintyCriteriaSelectorModal から呼び出す。
 */
export async function getForSelector(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;

    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const rows = await uncertaintyCriteriaRepository.findForSelector(organizationId);

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

/**
 * 不確かさ基準詳細取得
 * GET /api/v1/uncertainty-criteria/:uncertaintyKey?version=:version
 *
 * @remarks
 * uncertainty_key + version で1件取得。定性評価の場合は intuition_selector も含む。
 */
export async function getDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;

    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const { uncertaintyKey } = req.params;
    const versionParam = req.query.version as string | undefined;

    if (!uncertaintyKey) {
      res.status(400).json({ error: { code: 'E1003', message: 'uncertaintyKey は必須です' } });
      return;
    }
    if (!versionParam || isNaN(Number(versionParam))) {
      res.status(400).json({ error: { code: 'E1003', message: 'version（整数）は必須です' } });
      return;
    }

    const version = parseInt(versionParam, 10);
    const detail = await uncertaintyCriteriaRepository.findByKey(organizationId, uncertaintyKey, version);

    if (!detail) {
      res.status(404).json({ error: { code: 'E6001', message: '不確かさ基準が見つかりません' } });
      return;
    }

    res.json(detail);
  } catch (error) {
    next(error);
  }
}

/**
 * 不確かさ基準 新バージョン保存
 * POST /api/v1/uncertainty-criteria
 *
 * @remarks
 * 同一 (organization_id, name_space_id, uncertainty_key) の最大 version + 1 で
 * uncertainty_criteria に新規 INSERT する。
 * 定性評価の場合は intuition_selector にも選択肢を INSERT する。
 *
 * リクエストボディ:
 *   nameSpaceId, uncertaintyKey, uncertaintyName,
 *   evaluationMethod, isInvalid,
 *   inheritanceUncertaintyKey (optional),
 *   xsiType (optional), units (optional), formatString (optional),
 *   description (optional),
 *   qualitativeOptions: [{ displayOrder, value, displayColor, isDefault }]
 */
export async function createNewVersion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    const userId         = (req as any).user?.userId as string | undefined;

    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const {
      nameSpaceId,
      uncertaintyKey,
      uncertaintyName,
      evaluationMethod,
      isInvalid,
      inheritanceUncertaintyKey,
      xsiType,
      units,
      formatString,
      description,
      qualitativeOptions,
    } = req.body;

    // ── バリデーション ──
    if (!nameSpaceId || !uncertaintyKey) {
      res.status(400).json({ error: { code: 'E1003', message: 'nameSpaceId・uncertaintyKey は必須です' } });
      return;
    }
    if (evaluationMethod === undefined || evaluationMethod === null) {
      res.status(400).json({ error: { code: 'E1003', message: 'evaluationMethod は必須です' } });
      return;
    }

    const result = await uncertaintyCriteriaRepository.insertNewVersion(organizationId, {
      nameSpaceId,
      uncertaintyKey,
      uncertaintyName:           uncertaintyName ?? '',
      evaluationMethod:          Number(evaluationMethod),
      isInvalid:                 Boolean(isInvalid),
      inheritanceUncertaintyKey: inheritanceUncertaintyKey ?? null,
      xsiType:                   xsiType ?? null,
      units:                     units ?? null,
      formatString:              formatString ?? null,
      description:               description ?? null,
      qualitativeOptions:        Array.isArray(qualitativeOptions) ? qualitativeOptions : [],
      createUserId:              userId ?? 'system',
    });

    res.status(201).json({ version: result.version });
  } catch (error) {
    next(error);
  }
}
