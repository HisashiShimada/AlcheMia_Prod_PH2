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
import type {
  CreateNamespaceInput,
  UpdateNamespaceInput,
  CreateTermInput,
  UpdateTermInput,
} from '../services/namespaceService';
import type {
  CreateNamespaceBody,
  UpdateNamespaceBody,
  CreateTermBody,
  UpdateTermBody,
  ToggleTermActiveBody,
  TermActiveParams,
  ToggleNamespaceActiveBody,
  SharePrefixesBody,
} from '../types/api';

/**
 * URI自動生成候補を返す
 * GET /api/v1/namespaces/suggested-uri
 */
export async function getSuggestedUri(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const scopeKey = req.query.scopeKey as string | undefined;

    const uri = await namespaceService.getSuggestedUri(organizationId, userId, scopeKey);
    res.json({ uri });
  } catch (error) {
    next(error);
  }
}

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
    const { prefix, uri, description, scopeKey: bodyScopeKey } = req.body as CreateNamespaceBody;

    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    // scopeKey の優先順位:
    //   1. リクエストボディの scopeKey（NamespaceMain から選択中ノードキーとして渡される）
    //   2. JWT に含まれる organizationGroupCds の先頭（フォールバック）
    const organizationGroupCds = req.user!.organizationGroupCds ?? [];
    const scopeKey = bodyScopeKey ?? organizationGroupCds[0] ?? undefined;

    const createNamespaceInput: CreateNamespaceInput = {
      organizationId,
      prefix,
      uri,
      userId,
      scopeKey,
      description,
    };
    const result = await namespaceService.createNamespace(createNamespaceInput);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * 名前空間（prefix / description）更新
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
    const { newPrefix, description } = req.body as UpdateNamespaceBody;

    const updateNamespaceInput: UpdateNamespaceInput = {
      organizationId,
      prefix,
      newPrefix,
      description,
    };
    const result = await namespaceService.updateNamespace(updateNamespaceInput);
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
 *
 * クエリパラメータ:
 *   scopeKey      - namespace.scope_key でフィルタ（省略時は全件）
 *   scopeKeys     - カンマ区切りの複数 scopeKey（company ノード選択時などに使用）
 *   withAncestors - "true" の場合、scopeKey とその祖先グループのデータを取得
 *                   （組織グループノード選択時に使用）
 */
export async function getNamespaces(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string;
    const scopeKey = req.query.scopeKey as string | undefined;
    const withAncestors = req.query.withAncestors === 'true';

    // scopeKeys: カンマ区切り or 配列形式（?scopeKeys=a,b,c または ?scopeKeys[]=a&scopeKeys[]=b）
    const rawScopeKeys = req.query.scopeKeys;
    const scopeKeys: string[] = rawScopeKeys
      ? (Array.isArray(rawScopeKeys)
          ? (rawScopeKeys as string[])
          : (rawScopeKeys as string).split(',').filter(Boolean))
      : [];

    if (scopeKeys.length > 0) {
      // 複数 scopeKey が指定されている場合（company ノード選択時など）
      const namespaces = await namespaceService.getNamespacesByScopeKeys(organizationId, scopeKeys);
      res.json({ namespaces });
      return;
    }

    if (scopeKey) {
      // withAncestors=true のとき → 選択グループ＋祖先グループのPrefixを返す
      if (withAncestors) {
        const namespaces = await namespaceService.getNamespacesByScopeKeyWithAncestors(organizationId, scopeKey);
        res.json({ namespaces });
        return;
      }
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
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];

    const count = await namespaceService.deleteNamespace(organizationId, prefix, lang);
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
    const { prefix, localName, displayName, description, typeHint, unitHint, createDirectiveTerm, scopeKey } = req.body as CreateTermBody;

    const organizationId = (req as any).organizationId as string;
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];

    const createTermInput: CreateTermInput = {
      organizationId,
      prefix,
      localName,
      displayName,
      description,
      typeHint,
      unitHint,
      createDirectiveTerm,
      scopeKey,
    };
    const created = await namespaceService.createTerm(createTermInput, lang);

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
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];

    const { displayName, description, typeHint, unitHint } = req.body as UpdateTermBody;

    const updateTermInput: UpdateTermInput = {
      displayName,
      description,
      typeHint,
      unitHint,
    };
    const updated = await namespaceService.updateTerm(organizationId, prefix, localName, updateTermInput, lang);

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
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];

    const count = await namespaceService.deleteTerm(organizationId, prefix, localName, lang);
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
 * クエリパラメータ:
 *   scopeKey      - 指定した場合、そのスコープの用語のみ返す
 *   scopeKeys     - カンマ区切りの複数 scopeKey（company ノード選択時などに使用）
 *   withAncestors - "true" の場合、scopeKey とその祖先グループの用語を取得
 *                   （組織グループノード選択時に使用）
 */
export async function getTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const scopeKey = req.query.scopeKey as string | undefined;
    const withAncestors = req.query.withAncestors === 'true';

    // scopeKeys: カンマ区切り or 配列形式（?scopeKeys=a,b,c または ?scopeKeys[]=a&scopeKeys[]=b）
    const rawScopeKeys = req.query.scopeKeys;
    const scopeKeys: string[] = rawScopeKeys
      ? (Array.isArray(rawScopeKeys)
          ? (rawScopeKeys as string[])
          : (rawScopeKeys as string).split(',').filter(Boolean))
      : [];

    if (scopeKeys.length > 0) {
      // 複数 scopeKey が指定されている場合（company ノード選択時など）
      const terms = await namespaceService.getTermsByScopeKeys(organizationId, scopeKeys);
      res.json(terms);
      return;
    }

    if (scopeKey) {
      // withAncestors=true のとき → 選択グループ＋祖先グループの用語を返す
      if (withAncestors) {
        const terms = await namespaceService.getTermsByScopeKeyWithAncestors(organizationId, scopeKey);
        res.json(terms);
        return;
      }
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
    const { prefix, localName } = req.params as unknown as TermActiveParams;
    const { isActive } = req.body as ToggleTermActiveBody;
    const organizationId = (req as any).organizationId as string;
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];

    const updated = await namespaceService.toggleTermActive(
      organizationId,
      prefix,
      localName,
      isActive,
      lang
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

// ─── グローバル名前空間宣言（ファイルサーバ管理）────────────────────────────────

/**
 * グローバル名前空間宣言一覧取得
 * GET /api/v1/namespaces/global-declarations
 *
 * @remarks ファイルサーバ（system/namespaces/global-declarations.csv）から読み込む。
 */
export async function getGlobalDeclarations(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const declarations = await namespaceService.getGlobalDeclarationEntries();
    res.json({ declarations });
  } catch (error) {
    next(error);
  }
}

/**
 * グローバル名前空間宣言インポート
 * POST /api/v1/namespaces/global-declarations/import
 *
 * @remarks
 * multipart/form-data で CSV ファイルを受け取り、ファイルサーバへ上書き保存する。
 * req.file は multer (memoryStorage) によってセットされる。
 */
export async function importGlobalDeclarations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'CSVファイルが必要です' } });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');

    try {
      const result = await namespaceService.importGlobalDeclarationsCsv(csvContent);
      res.json({ success: true, count: result.count });
    } catch (serviceError: any) {
      res.status(400).json({ success: false, error: { code: 'E1004', message: serviceError.message } });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Prefix の非アクティブ化（or アクティブ化）
 * PATCH /api/v1/namespaces/:prefix/active
 */
export async function toggleNamespaceActive(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { prefix } = req.params;
    const { isActive } = req.body as ToggleNamespaceActiveBody;

    await namespaceService.toggleNamespaceActive(organizationId, prefix, isActive);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * グローバル名前空間宣言エクスポート
 * GET /api/v1/namespaces/global-declarations/export
 *
 * @remarks ファイルサーバから CSV を読み込み、ダウンロードレスポンスとして返す。
 */
export async function exportGlobalDeclarations(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const csvContent = await namespaceService.exportGlobalDeclarationsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="global-declarations.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * 選択した Prefix を指定スコープへ共有（コピー）する
 * POST /api/v1/namespaces/prefixes/share
 *
 * @remarks
 * リクエストボディ:
 *   { targetScopeKey: string; prefixes: string[] }
 */
export async function sharePrefixes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const { targetScopeKey, prefixes } = req.body as SharePrefixesBody;

    const copiedPrefixes = await namespaceService.sharePrefixesToScope(
      organizationId,
      targetScopeKey,
      userId,
      prefixes
    );

    res.json({ success: true, copiedPrefixes });
  } catch (error) {
    next(error);
  }
}
