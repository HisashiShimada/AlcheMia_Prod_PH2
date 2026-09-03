/**
 * uncertaintyCriteria Controller
 *
 * 不確かさ基準管理のAPIエンドポイント処理
 *
 * @remarks
 * リクエストの受け取りとレスポンスの返却のみを担当する。
 * ビジネスロジックは uncertaintyCriteriaService に委譲する。
 * Repository の主キーは (organization_id, name_space_id, uncertainty_key, version) の複合キー。
 *
 * @module uncertaintyCriteriaController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as uncertaintyCriteriaService from '../services/uncertaintyCriteriaService';
import type { InsertNewVersionRequest } from '../services/uncertaintyCriteriaService';
import { findNamespaceIdByScopeKey } from '../repositories/namespaceTermRepository';

/**
 * 不確かさ基準一覧取得
 * GET /api/v1/uncertainty-criteria
 *
 * @remarks
 * クエリパラメータ `scopeKey` が指定された場合は、namespace テーブルで
 * scope_key → namespace_id に変換してからスコープ絞り込みを行う。
 * 省略時は全件取得（後方互換）。
 */
export async function getList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const scopeKey       = req.query.scopeKey as string | undefined;

    // scopeKey が指定された場合は namespace テーブルで namespace_id に変換する
    let nameSpaceId: string | null = null;
    if (scopeKey) {
      nameSpaceId = await findNamespaceIdByScopeKey(organizationId, scopeKey);
      // namespace_id が解決できない scopeKey の場合は全件返す（安全側に倒す）
    }

    const rows = await uncertaintyCriteriaService.getList(organizationId, nameSpaceId);
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
    const organizationId = (req as any).organizationId as string;

    const rows = await uncertaintyCriteriaService.getForSelector(organizationId);
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
    const organizationId = (req as any).organizationId as string;
    const { uncertaintyKey } = req.params;
    const version = parseInt(req.query.version as string, 10);

    const detail = await uncertaintyCriteriaService.getDetail(organizationId, uncertaintyKey, version);

    if (!detail) {
      res.status(404).json({ error: { code: 'E6001', message: 'Uncertainty criterion not found' } });
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
 */
export async function createNewVersion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const userId         = (req as any).user?.userId as string | undefined;

    const {
      nameSpaceId,
      uncertaintyKey,
      uncertaintyName,
      evaluationMethod,
      isInvalid,
      inheritanceUncertaintyKey,
      xsiType,
      units,
      scaleFactor,
      formatString,
      toleranceUpper,
      toleranceLower,
      description,
      qualitativeOptions,
    } = req.body;

    const insertRequest: InsertNewVersionRequest = {
      nameSpaceId,
      uncertaintyKey,
      uncertaintyName:           uncertaintyName ?? '',
      evaluationMethod:          Number(evaluationMethod),
      isInvalid:                 Boolean(isInvalid),
      inheritanceUncertaintyKey: inheritanceUncertaintyKey ?? null,
      xsiType:                   xsiType ?? null,
      units:                     units ?? null,
      scaleFactor:               scaleFactor ?? null,
      formatString:              formatString ?? null,
      toleranceUpper:            toleranceUpper !== undefined && toleranceUpper !== null ? Number(toleranceUpper) : null,
      toleranceLower:            toleranceLower !== undefined && toleranceLower !== null ? Number(toleranceLower) : null,
      description:               description ?? null,
      qualitativeOptions:        Array.isArray(qualitativeOptions) ? qualitativeOptions : [],
      createUserId:              userId ?? 'system',
    };

    const result = await uncertaintyCriteriaService.createNewVersion(organizationId, insertRequest);

    res.status(201).json({ version: result.version });
  } catch (error) {
    next(error);
  }
}
