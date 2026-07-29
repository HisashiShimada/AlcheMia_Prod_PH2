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
 * 名前空間（Prefix）新規登録
 * POST /api/v1/namespaces
 *
 * @body { prefix, uri, displayName?, description?, departmentCd? }
 */
export async function createNamespace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix, uri, displayName, description, departmentCd, scopeKey, isGlobal } = req.body as {
      prefix: string;
      uri: string;
      displayName?: string;
      description?: string;
      departmentCd?: string;
      scopeKey?: string;
      isGlobal?: boolean;
    };

    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.body.organizationId as string | undefined);
    const userId =
      ((req as any).userId as string | undefined) ||
      (req.body.userId as string | undefined) ||
      'system';

    if (!organizationId || !prefix || !uri) {
      res.status(400).json({ error: 'organizationId・prefix・uri は必須です' });
      return;
    }

    const namespaceId = await namespaceTermRepository.createNamespace({
      organizationId,
      prefix,
      uri,
      userId,
      scopeKey,
      description,
    });

    res.status(201).json({ namespaceId, prefix, uri });
  } catch (error) {
    next(error);
  }
}

/**
 * 名前空間（Prefix）一覧取得
 * GET /api/v1/namespaces
 */
export async function getNamespaces(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId は必須です' });
      return;
    }

    const scopeKey = req.query.scopeKey as string | undefined;

    if (scopeKey) {
      // scopeKey 指定時はユーザー個人の名前空間を返す
      const namespaces = await namespaceTermRepository.findNamespacesByScopeKey(
        organizationId,
        scopeKey
      );
      res.json({ namespaces });
      return;
    }

    const namespaces = await namespaceTermRepository.findNamespacesByOrganization(organizationId);
    res.json({ namespaces });
  } catch (error) {
    next(error);
  }
}

/**
 * 名前空間（Prefix）削除
 * DELETE /api/v1/namespaces/:prefix
 */
export async function deleteNamespace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix } = req.params;
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId は必須です' });
      return;
    }

    const count = await namespaceTermRepository.removeNamespace(organizationId, prefix);
    if (count === 0) {
      res.status(404).json({ error: `prefix "${prefix}" の名前空間が見つかりません` });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

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
 * 名前空間宣言一覧取得（prefix + uri）
 * GET /api/v1/namespaces/declarations
 *
 * @remarks
 * MAIML XMLビュー表示・保存前の xmlns 注入に使用する。
 * namespace テーブルから is_active = true のレコードを返す。
 */
export async function getDeclarations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId は必須です' });
      return;
    }

    const uri = await namespaceTermRepository.findDeclarationsByOrganization(organizationId);

    res.json({ uri: uri ?? null });
  } catch (error) {
    next(error);
  }
}

/**
 * プロジェクトスコープで絞り込んだ名前空間宣言一覧取得
 * GET /api/v1/namespaces/declarations?projectId=xxx
 *
 * @description
 *   projectId から project.organization_group_cd を取得し、
 *   global_flg=TRUE の名前空間 + scope_key が一致する名前空間を返す。
 *   organization_group_cd が NULL の場合は全件返す（制限なし）。
 */
export async function getDeclarationsByProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId =
      ((req as any).organizationId as string | undefined) ||
      (req.query.organizationId as string | undefined);

    if (!organizationId) {
      res.status(401).json({ success: false, error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const projectId = req.query.projectId as string | undefined;
    if (!projectId) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'projectId は必須です' } });
      return;
    }

    // projectId から organization_group_cd を取得
    const pool = (await import('../database/db')).getPool();
    const projectRow = await pool.query(
      'SELECT organization_group_cd FROM project WHERE project_id = $1 AND organization_id = $2',
      [projectId, organizationId]
    );
    if (projectRow.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'E6001', message: 'プロジェクトが見つかりません' } });
      return;
    }

    const orgGroupCd: string | null = projectRow.rows[0].organization_group_cd ?? null;

    const declarations = await namespaceTermRepository.findDeclarationsByProjectScope(
      organizationId,
      orgGroupCd
    );

    res.json(declarations);
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
