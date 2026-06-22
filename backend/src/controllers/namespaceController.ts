/**
 * namespace Controller
 *
 * 名前空間・用語管理のAPIエンドポイント処理
 *
 * @remarks
 * Repository の主キーは (organization_id, prefix, local_name) の複合キー。
 * URL パラメータは prefix と localName を使用する。
 *
 * @module namespaceController
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as namespaceTermRepository from '../repositories/namespaceTermRepository';

/**
 * 用語新規登録
 * POST /api/v1/namespaces/terms
 *
 * @body { organizationId, prefix, localName, displayName?, description?, typeHint?, unitHint? }
 */
export async function createTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      prefix,
      localName,
      displayName,
      description,
      typeHint,
      unitHint,
    } = req.body as {
      prefix: string;
      localName: string;
      displayName?: string;
      description?: string;
      typeHint?: string;
      unitHint?: string;
    };

    // organizationId はミドルウェアまたはリクエストボディから取得
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.body.organizationId as string | undefined);

    if (!organizationId || !prefix || !localName) {
      res.status(400).json({ error: 'organizationId・prefix・localName は必須です' });
      return;
    }

    // prefix に対応する namespace が存在するか確認
    const exists = await namespaceTermRepository.existsNamespace(organizationId, prefix);
    if (!exists) {
      res.status(404).json({ error: `prefix "${prefix}" に対応する名前空間が見つかりません` });
      return;
    }

    const created = await namespaceTermRepository.create({
      organizationId,
      prefix,
      localName,
      displayName,
      description,
      typeHint,
      unitHint,
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

/**
 * 用語更新
 * PUT /api/v1/namespaces/terms/:prefix/:localName
 */
export async function updateTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix, localName } = req.params;

    // organizationId はミドルウェアまたはクエリから取得
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId は必須です' });
      return;
    }

    const {
      displayName,
      description,
      typeHint,
      unitHint,
    } = req.body as {
      displayName?: string;
      description?: string;
      typeHint?: string;
      unitHint?: string;
    };

    const updated = await namespaceTermRepository.update(
      organizationId,
      prefix,
      localName,
      { displayName, description, typeHint, unitHint }
    );

    if (!updated) {
      res.status(404).json({ error: `"${prefix}:${localName}" の用語が見つかりません` });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * 用語削除
 * DELETE /api/v1/namespaces/terms/:prefix/:localName
 */
export async function deleteTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix, localName } = req.params;

    // organizationId はミドルウェアまたはクエリから取得
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId は必須です' });
      return;
    }

    const count = await namespaceTermRepository.remove(organizationId, prefix, localName);
    if (count === 0) {
      res.status(404).json({ error: `"${prefix}:${localName}" の用語が見つかりません` });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * 用語一覧取得
 * GET /api/v1/namespaces/terms
 */
export async function getTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 認証ミドルウェアがある場合は organizationId で絞り込み、なければ全件取得
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    const terms = organizationId
      ? await namespaceTermRepository.findAllByOrganization(organizationId)
      : await namespaceTermRepository.findAll();

    res.json(terms);
  } catch (error) {
    next(error);
  }
}
