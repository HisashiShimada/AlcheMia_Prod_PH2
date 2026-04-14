import { Request, Response, NextFunction } from 'express';
import { formatService } from '../services/formatService';
import { AppError } from '../enums/errorCodes';

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
 * フォーマット一覧取得
 * GET /api/v1/formats
 */
export async function getFormats(req: Request, res: Response): Promise<void> {
  try {
    // 1. ユーザー情報から組織IDを取得（authMiddlewareで検証済み）
    const organizationId = req.user!.organizationId!;

    // 2. セッションから部門CDを取得
    const departmentCd = req.session!.departmentCd!;

    // 3. S3からフォーマットフォルダ一覧を取得
    const folders = await formatService.getFormatFolders(
      organizationId,
      departmentCd
    );

    // 5. レスポンス返却
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
    console.error('Error in getFormats:', error);

    // エラーハンドリング
    res.status(500).json({
      success: false,
      error: {
        code: 'E4001',
        message: 'フォーマット一覧の取得に失敗しました',
        details:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
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
    const departmentCd = req.session!.departmentCd!;

    // サービスを呼び出してファイル一覧を取得
    const files = await formatService.getFormatFiles(
      organizationId,
      departmentCd,
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
    next(error);
  }
}

/**
 * フォーマットフォルダ作成（部門直下）
 * POST /api/v1/formats/folders
 */
async function createFormatFolder(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const { folderName } = req.body;
    const organizationId = req.user!.organizationId!;
    const departmentCd = req.session!.departmentCd!;

    // サービスを呼び出してフォルダを作成
    const result = await formatService.createFormatFolder(
      organizationId,
      departmentCd,
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

    const appError = error instanceof AppError ? error : null;
    const errorCode = appError ? appError.code : 'E4001';
    const statusCode = appError ? statusFromCode(appError.code) : 500;
    const errorMessage = (error as Error).message;

    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  }
}

/**
 * フォーマット内サブフォルダ作成
 * POST /api/v1/formats/subfolders
 */
async function createFormatSubfolder(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const { formatName, subfolderName, parentPath } = req.body;
    const organizationId = req.user!.organizationId!;
    const departmentCd = req.session!.departmentCd!;

    // サービスを呼び出してサブフォルダを作成
    const result = await formatService.createFormatSubfolder(
      organizationId,
      departmentCd,
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

    const appError = error instanceof AppError ? error : null;
    const errorCode = appError ? appError.code : 'E4001';
    const statusCode = appError ? statusFromCode(appError.code) : 500;
    const errorMessage = (error as Error).message;

    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  }
}

/**
 * フォーマットファイル作成
 * POST /api/v1/formats/:folderName/files
 */
async function createFormatFile(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const { folderName } = req.params;
    const { fileName, currentPath } = req.body;
    
    // 型アサーション（ミドルウェアで検証済みと想定）
    const organizationId = req.user!.organizationId;
    const departmentCd = req.session!.departmentCd!;

    console.log('[formatController] createFormatFile called:', {
      organizationId,
      departmentCd,
      folderName,
      fileName,
      currentPath,
      sessionExists: !!req.session,
    });

    // サービスを呼び出してファイルを作成（userId を渡して file_metadata を自動登録）
    const result = await formatService.createFormatFile(
      organizationId,
      departmentCd,
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

    const appError = error instanceof AppError ? error : null;
    const errorCode = appError ? appError.code : 'E4001';
    const statusCode = appError ? statusFromCode(appError.code) : 500;
    const errorMessage = (error as Error).message;

    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
  }
}

/**
 * フォーマットファイル更新
 * PUT /api/v1/formats/files
 */
async function updateFormatFile(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const { filePath, content } = req.body;
    const organizationId = req.user!.organizationId!;

    console.log('[formatController] updateFormatFile called:', {
      organizationId,
      filePath,
      contentLength: content?.length,
    });

    // バリデーション
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'ファイルパスが不正です',
        },
      });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'E1008',
          message: 'ファイル内容が不正です',
        },
      });
      return;
    }

    // サービスを呼び出してファイルを更新（userId を渡して file_metadata を自動登録）
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

    const appError = error instanceof AppError ? error : null;
    const errorCode = appError ? appError.code : 'E4001';
    const statusCode = appError ? statusFromCode(appError.code) : 500;
    const errorMessage = (error as Error).message;

    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      },
    });
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
