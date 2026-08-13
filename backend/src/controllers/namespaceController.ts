/**
 * namespace Controller
 *
 * 名前空間・用語管理のAPIエンドポイント処理
 *
 * @remarks
 * - Controller は Service 層のみを呼び出す。Repository への直接参照は禁止。
 * - リクエストパラメータの検証は namespaceValidation.ts のミドルウェアで実施済み。
 *   Controller 内にバリデーションロジックを記述しない。
 *
 * @module namespaceController
 * @version 4.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as namespaceService from '../services/namespaceService';

/**
 * 名前空間（Prefix）新規登録
 * POST /api/v1/namespaces
 */
export async function createNamespace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix, uri, description, scopeKey: bodyScopeKey } = req.body as {
      prefix: string;
      uri: string;
      description?: string;
      scopeKey?: string;
    };

    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    // scopeKey の優先順位:
    //   1. リクエストボディの scopeKey（NamespaceMain から選択中ノードキーとして渡される）
    //   2. JWT に含まれる organizationGroupCds の先頭（フォールバック）
    const organizationGroupCds = req.user!.organizationGroupCds ?? [];
    const scopeKey = bodyScopeKey ?? organizationGroupCds[0] ?? undefined;

    const result = await namespaceService.createNamespace({
      organizationId,
      prefix,
      uri,
      userId,
      scopeKey,
      description,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * 名前空間（Prefix の URI）更新
 * PATCH /api/v1/namespaces/:prefix
 */
export async function updateNamespace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const prefix = decodeURIComponent(req.params.prefix);
    const { uri } = req.body as { uri: string };

    const result = await namespaceService.updateNamespace({ organizationId, prefix, uri });
    if (!result) {
      res.status(404).json({ success: false, error: { code: 'E6001', message: 'Namespace not found' } });
      return;
    }
    res.json(result);
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
    const organizationId = (req as any).organizationId as string;
    const scopeKey = req.query.scopeKey as string | undefined;

    if (scopeKey) {
      const namespaces = await namespaceService.getNamespacesByScopeKey(organizationId, scopeKey);
      res.json({ namespaces });
      return;
    }

    const namespaces = await namespaceService.getNamespaces(organizationId);
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
    const organizationId = (req as any).organizationId as string;

    const count = await namespaceService.deleteNamespace(organizationId, prefix);
    if (count === 0) {
      res.status(404).json({ error: `Namespace with prefix "${prefix}" not found` });
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
 */
export async function createTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix, localName, displayName, description, typeHint, unitHint } = req.body as {
      prefix: string;
      localName: string;
      displayName?: string;
      description?: string;
      typeHint?: string;
      unitHint?: string;
    };

    const organizationId = (req as any).organizationId as string;

    const created = await namespaceService.createTerm({
      organizationId,
      prefix,
      localName,
      displayName,
      description,
      typeHint,
      unitHint,
    });

    if (!created) {
      res.status(404).json({ error: `Namespace with prefix "${prefix}" not found` });
      return;
    }

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
    const organizationId = (req as any).organizationId as string;

    const { displayName, description, typeHint, unitHint } = req.body as {
      displayName?: string;
      description?: string;
      typeHint?: string;
      unitHint?: string;
    };

    const updated = await namespaceService.updateTerm(organizationId, prefix, localName, {
      displayName,
      description,
      typeHint,
      unitHint,
    });

    if (!updated) {
      res.status(404).json({ error: `Term "${prefix}:${localName}" not found` });
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
    const organizationId = (req as any).organizationId as string;

    const count = await namespaceService.deleteTerm(organizationId, prefix, localName);
    if (count === 0) {
      res.status(404).json({ error: `Term "${prefix}:${localName}" not found` });
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
 * @remarks MAIML XMLビュー表示・保存前の xmlns 注入に使用する。
 */
export async function getDeclarations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const uri = await namespaceService.getDeclarations(organizationId);
    res.json({ uri: uri ?? null });
  } catch (error) {
    next(error);
  }
}

/**
 * プロジェクトスコープで絞り込んだ名前空間宣言一覧取得
 * GET /api/v1/namespaces/project-declarations?projectId=xxx
 */
export async function getDeclarationsByProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const projectId = req.query.projectId as string;

    const declarations = await namespaceService.getDeclarationsByProject(
      organizationId,
      projectId
    );

    if (!declarations) {
      res
        .status(404)
        .json({ success: false, error: { code: 'E6001', message: 'Project not found' } });
      return;
    }

    res.json(declarations);
  } catch (error) {
    next(error);
  }
}

/**
 * 用語一覧取得
 * GET /api/v1/namespaces/terms
 *
 * @query scopeKey - 指定した場合、そのスコープ + global_flg=TRUE の用語のみ返す
 */
export async function getTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    const scopeKey = req.query.scopeKey as string | undefined;

    const globalFlg = req.query.globalFlg === 'true';

    if (organizationId && globalFlg) {
      const terms = await namespaceService.getTermsGlobal(organizationId);
      res.json(terms);
      return;
    }

    if (organizationId && scopeKey) {
      const terms = await namespaceService.getTermsByScopeKey(organizationId, scopeKey);
      res.json(terms);
      return;
    }

    const terms = await namespaceService.getTerms(organizationId);
    res.json(terms);
  } catch (error) {
    next(error);
  }
}

/**
 * 用語のアクティブ/非アクティブ切替
 * PATCH /api/v1/namespaces/terms/:prefix/:localName/active
 *
 * @body { isActive: boolean }
 */
export async function toggleTermActive(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prefix, localName } = req.params as { prefix: string; localName: string };
    const { isActive } = req.body as { isActive: boolean };
    const organizationId = (req as any).organizationId as string;

    const updated = await namespaceService.toggleTermActive(
      organizationId,
      prefix,
      localName,
      isActive
    );

    if (!updated) {
      res.status(404).json({ error: 'Term not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}
