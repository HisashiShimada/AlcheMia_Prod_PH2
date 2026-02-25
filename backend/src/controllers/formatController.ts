import { Request, Response, NextFunction } from 'express';
import { formatService } from '../services/formatService';

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
        code: 'SYSTEM_ERROR',
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
    
    // エラーメッセージに応じてステータスコードを設定
    const errorMessage = (error as Error).message;
    let statusCode = 500;
    let errorCode = 'SYSTEM_ERROR';

    if (errorMessage.includes('英数字とアンダースコア')) {
      statusCode = 400;
      errorCode = 'INVALID_FOLDER_NAME';
    } else if (errorMessage.includes('1〜255文字')) {
      statusCode = 400;
      errorCode = 'INVALID_FOLDER_NAME_LENGTH';
    } else if (errorMessage.includes('既に存在')) {
      statusCode = 409;
      errorCode = 'FOLDER_ALREADY_EXISTS';
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
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
    
    // エラーメッセージに応じてステータスコードを設定
    const errorMessage = (error as Error).message;
    let statusCode = 500;
    let errorCode = 'SYSTEM_ERROR';

    if (errorMessage.includes('英数字') || errorMessage.includes('アンダースコア') || errorMessage.includes('ハイフン')) {
      statusCode = 400;
      errorCode = 'INVALID_SUBFOLDER_NAME';
    } else if (errorMessage.includes('1〜255文字')) {
      statusCode = 400;
      errorCode = 'INVALID_SUBFOLDER_NAME_LENGTH';
    } else if (errorMessage.includes('既に存在')) {
      statusCode = 409;
      errorCode = 'FOLDER_ALREADY_EXISTS';
    } else if (errorMessage.includes('親フォルダが存在しません')) {
      statusCode = 404;
      errorCode = 'PARENT_FOLDER_NOT_FOUND';
    } else if (errorMessage.includes('フォーマット名が指定されていません')) {
      statusCode = 400;
      errorCode = 'FORMAT_NAME_REQUIRED';
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
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
    const { fileName } = req.body;
    
    // 型アサーション（ミドルウェアで検証済みと想定）
    const organizationId = req.user!.organizationId;
    const departmentCd = req.session!.departmentCd!;

    console.log('[formatController] createFormatFile called:', {
      organizationId,
      departmentCd,
      folderName,
      fileName,
      sessionExists: !!req.session,
    });

    // サービスを呼び出してファイルを作成
    const result = await formatService.createFormatFile(
      organizationId,
      departmentCd,
      folderName,
      fileName
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
    
    // エラーメッセージに応じてステータスコードを設定
    const errorMessage = (error as Error).message;
    let statusCode = 500;
    let errorCode = 'SYSTEM_ERROR';

    if (errorMessage.includes('既に存在')) {
      statusCode = 409;
      errorCode = 'FILE_ALREADY_EXISTS';
    } else if (errorMessage.includes('フォルダが見つかりません')) {
      statusCode = 404;
      errorCode = 'FOLDER_NOT_FOUND';
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
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
};
