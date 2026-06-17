/**
 * namespace Controller
 *
 * 名前空間・用語管理のAPIエンドポイント処理
 *
 * @module namespaceController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as namespaceTermRepository from '../repositories/namespaceTermRepository';

/**
 * 用語新規登録
 * POST /api/v1/namespaces/terms
 *
 * @description prefix から namespace.id を解決し、namespace_term に INSERT する
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
      displayNameJa,
      displayNameEn,
      description,
      typeHint,
      unitHint,
    } = req.body as {
      prefix: string;
      localName: string;
      displayNameJa?: string;
      displayNameEn?: string;
      description?: string;
      typeHint?: string;
      unitHint?: string;
    };

    if (!prefix || !localName) {
      res.status(400).json({ error: 'prefix と localName は必須です' });
      return;
    }

    // prefix → namespace.id を解決
    const namespaceId = await namespaceTermRepository.findNamespaceIdByPrefix(prefix);
    if (!namespaceId) {
      res.status(404).json({ error: `prefix "${prefix}" に対応する名前空間が見つかりません` });
      return;
    }

    const created = await namespaceTermRepository.create({
      namespaceId,
      localName,
      displayNameJa,
      displayNameEn,
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
 * PUT /api/v1/namespaces/terms/:id
 */
export async function updateTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      localName,
      displayNameJa,
      displayNameEn,
      description,
      typeHint,
      unitHint,
    } = req.body as {
      localName?: string;
      displayNameJa?: string;
      displayNameEn?: string;
      description?: string;
      typeHint?: string;
      unitHint?: string;
    };

    const updated = await namespaceTermRepository.update(id, {
      localName,
      displayNameJa,
      displayNameEn,
      description,
      typeHint,
      unitHint,
    });

    if (!updated) {
      res.status(404).json({ error: `id "${id}" の用語が見つかりません` });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * 用語削除
 * DELETE /api/v1/namespaces/terms/:id
 */
export async function deleteTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const count = await namespaceTermRepository.remove(id);
    if (count === 0) {
      res.status(404).json({ error: `id "${id}" の用語が見つかりません` });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

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
