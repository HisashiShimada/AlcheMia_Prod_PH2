import { Request, Response, NextFunction } from 'express';
import { formatService } from '../services/formatService';
import { AppError, E1005, E1008, E5015 } from '../enums/errorCodes';
import { getMessage } from '../utils/messages';

/** AppError のエラーコードから HTTP ステータスコードを導出する */
function statusFromCode(code: string): number {
  if (code.startsWith('E1') || code === 'E1009') return 400;
  if (code.startsWith('E5')) return code === 'E5012' || code === 'E5015' ? 403 : 401;
  if (code === 'E6002' || code === 'E6003' || code === 'E6004') return 404;
  if (code === 'E6005' || code === 'E6006') return 409;
  if (code === 'E7001') return 409;
  if (code.startsWith('E6')) return 404;
  if (code.startsWith('E7')) return 400;
  return 500;
}

/**
 * AppError に statusCode を付与して next に渡すヘルパー
 * errorHandlerMiddleware は err.statusCode を参照するため必要
 */
function nextWithStatus(error: unknown, next: NextFunction): void {
  if (error instanceof AppError) {
    (error as any).statusCode = statusFromCode(error.code);
  }
  next(error);
}

/**
 * ユーザーが指定した組織グループに所属しているか検証する
 * 所属していない場合は E5015 をスローする
 */
function assertBelongsToOrganizationGroup(
  req: Request,
  organizationGroupCd: string
): void {
  const userGroupCds = req.user!.organizationGroupCds ?? [];
  if (!userGroupCds.includes(organizationGroupCd)) {
    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];
    throw new AppError(E5015, getMessage(lang, 'organizationGroup.accessDenied'));
  }
}

/**
 * リクエストから organizationGroupCd を解決する
 * クエリパラメータ or ボディに指定があればそれを使用し、
 * 未指定の場合はユーザーの所属グループ先頭要素にフォールバックする
 */
function resolveOrganizationGroupCd(req: Request, source: 'query' | 'body' = 'query'): string {
  const raw = source === 'query'
    ? req.query.organizationGroupCd
    : req.body.organizationGroupCd;
  const fromRequest = typeof raw === 'string' && raw.length > 0 ? raw : undefined;
  const cd = fromRequest ?? req.user!.organizationGroupCds?.[0] ?? 'default';
  // 指定があった場合のみ所属チェック（フォールバック値はユーザー自身のものなのでチェック不要）
  if (fromRequest) {
    assertBelongsToOrganizationGroup(req, cd);
  }
  return cd;
}

/**
 * フォーマット一覧取得
 * GET /api/v1/formats
 */
export async function getFormats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. ユーザー情報から組織IDを取得（authMiddlewareで検証済み）
    const organizationId = req.user!.organizationId!;
    // 2. クエリパラメータ or フォールバックで組織グループCDを解決
    const organizationGroupCd = resolveOrganizationGroupCd(req, 'query');

    // 3. S3からフォーマットフォルダ一覧を取得
    const folders = await formatService.getFormatFolders(
      organizationId,
      organizationGroupCd
    );

    res.json({
      success: true,
      data: {
        folders,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  } catch (error) {
    console.error('[formatController] getFormats error:', error);
    nextWithStatus(error, next);
  }
}

/**
 * フォーマットファイル一覧取得
 */
async function getFormatFiles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { folderName } = req.params;
    const { path: subPath } = req.query;
    const organizationId = req.user!.organizationId!;
    const organizationGroupCd = resolveOrganizationGroupCd(req, 'query');

    const files = await formatService.getFormatFiles(
      organizationId,
      organizationGroupCd,
      folderName,
      typeof subPath === 'string' ? subPath : undefined
    );

    res.json({
      success: true,
      data: {
        files,
      },
    });
  } catch (error) {
    console.error('[formatController] getFormatFiles error:', error);
    nextWithStatus(error, next);
  }
}

/**
 * フォーマットフォルダ作成（部門直下）
 * POST /api/v1/formats/folders
 */
async function createFormatFolder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { folderName } = req.body;
    const organizationId = req.user!.organizationId!;
    const organizationGroupCd = resolveOrganizationGroupCd(req, 'body');

    const result = await formatService.createFormatFolder(
      organizationId,
      organizationGroupCd,
      folderName
    );

    res.status(201).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  } catch (error) {
    console.error('[formatController] createFormatFolder error:', error);
    nextWithStatus(error, next);
  }
}

/**
 * フォーマット内サブフォルダ作成
 * POST /api/v1/formats/subfolders
 */
async function createFormatSubfolder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { formatName, subfolderName, parentPath } = req.body;
    const organizationId = req.user!.organizationId!;
    const organizationGroupCd = resolveOrganizationGroupCd(req, 'body');

    const result = await formatService.createFormatSubfolder(
      organizationId,
      organizationGroupCd,
      formatName,
      subfolderName,
      parentPath
    );

    res.status(201).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  } catch (error) {
    console.error('[formatController] createFormatSubfolder error:', error);
    nextWithStatus(error, next);
  }
}

/**
 * フォーマットファイル作成
 * POST /api/v1/formats/:folderName/files
 */
async function createFormatFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { folderName } = req.params;
    const { fileName, currentPath } = req.body;
    const organizationId = req.user!.organizationId;
    const organizationGroupCd = resolveOrganizationGroupCd(req, 'body');

    console.log('[formatController] createFormatFile called:', {
      organizationId,
      organizationGroupCd,
      folderName,
      fileName,
      currentPath,
      sessionExists: !!req.session,
    });

    const result = await formatService.createFormatFile(
      organizationId,
      organizationGroupCd,
      folderName,
      fileName,
      currentPath,
      req.user!.userId
    );

    res.status(201).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  } catch (error) {
    console.error('[formatController] createFormatFile error:', error);
    nextWithStatus(error, next);
  }
}

/**
 * フォーマットファイル更新
 * PUT /api/v1/formats/files
 */
async function updateFormatFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { filePath, content } = req.body;
    const organizationId = req.user!.organizationId!;

    console.log('[formatController] updateFormatFile called:', {
      organizationId,
      filePath,
      contentLength: content?.length,
    });

    // バリデーション（AppError で throw → nextWithStatus → errorHandlerMiddleware）
    if (!filePath || typeof filePath !== 'string') {
      throw new AppError(E1005, 'ファイルパスが不正です');
    }

    if (!content || typeof content !== 'string') {
      throw new AppError(E1008, 'ファイル内容が不正です');
    }

    const result = await formatService.updateFormatFile(
      organizationId,
      filePath,
      content,
      req.user!.userId
    );

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  } catch (error) {
    console.error('[formatController] updateFormatFile error:', error);
    nextWithStatus(error, next);
  }
}

export const formatController = {
  getFormats,
  getFormatFiles,
  createFormatFolder,
  createFormatSubfolder,
  createFormatFile,
  updateFormatFile,
};
