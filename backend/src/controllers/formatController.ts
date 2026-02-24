import { Request, Response, NextFunction } from 'express';
import { formatService } from '../services/formatService';
import { FileTypeFilter } from '../types/format';

/**
 * フォーマット一覧取得
 * GET /api/v1/formats
 */
export async function getFormats(req: Request, res: Response): Promise<void> {
  try {
    // 1. ユーザー情報から組織IDを取得（authMiddlewareで検証済み）
    const organizationId = req.user!.organizationId;

    // 2. セッションから部門CDを取得
    const departmentCd = req.session?.departmentCd;

    // 3. department_cdの検証
    if (!departmentCd) {
      res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'セッションが無効です。再ログインしてください。',
        },
      });
      return;
    }

    // 4. クエリパラメータ取得
    const fileType = (req.query.file_type as FileTypeFilter) || 'all';

    // 5. S3からフォーマットフォルダ一覧を取得
    const folders = await formatService.getFormatFolders(
      organizationId,
      departmentCd,
      fileType
    );

    // 6. レスポンス返却
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
    const organizationId = req.user?.organizationId;
    const departmentCd = req.session?.departmentCd;

    console.log('[formatController] getFormatFiles called:', {
      organizationId,
      departmentCd,
      folderName,
      subPath,
      sessionExists: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
    });

    // organizationIdの検証
    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: '認証が必要です',
      });
      return;
    }

    // departmentCdの検証
    if (!departmentCd) {
      res.status(400).json({
        success: false,
        message: '部門コードが見つかりません',
      });
      return;
    }

    // folderNameの検証
    if (!folderName || typeof folderName !== 'string') {
      res.status(400).json({
        success: false,
        message: 'フォルダ名が無効です',
      });
      return;
    }

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
    const organizationId = req.user?.organizationId;
    const departmentCd = req.session?.departmentCd;

    console.log('[formatController] createFormatFolder called:', {
      organizationId,
      departmentCd,
      folderName,
      sessionExists: !!req.session,
    });

    // organizationIdの検証
    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // departmentCdの検証
    if (!departmentCd) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: '部門コードが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // folderNameの検証
    if (!folderName || typeof folderName !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FOLDER_NAME',
          message: 'フォルダ名が無効です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

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
    const organizationId = req.user?.organizationId;
    const departmentCd = req.session?.departmentCd;

    console.log('[formatController] createFormatSubfolder called:', {
      organizationId,
      departmentCd,
      formatName,
      subfolderName,
      parentPath,
      sessionExists: !!req.session,
    });

    // organizationIdの検証
    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // departmentCdの検証
    if (!departmentCd) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: '部門コードが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // formatNameの検証
    if (!formatName || typeof formatName !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT_NAME',
          message: 'フォーマット名が無効です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // subfolderNameの検証
    if (!subfolderName || typeof subfolderName !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SUBFOLDER_NAME',
          message: 'サブフォルダ名が無効です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

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
    const { fileName, fileType, templateType, description } = req.body;
    const organizationId = req.user?.organizationId;
    const departmentCd = req.session?.departmentCd;

    console.log('[formatController] createFormatFile called:', {
      organizationId,
      departmentCd,
      folderName,
      fileName,
      fileType,
      templateType,
      description,
      sessionExists: !!req.session,
    });

    // organizationIdの検証
    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // departmentCdの検証
    if (!departmentCd) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: '部門コードが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // fileNameの検証
    if (!fileName || typeof fileName !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_NAME',
          message: 'ファイル名が無効です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // ファイル名の長さチェック
    if (fileName.length < 1 || fileName.length > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_NAME_LENGTH',
          message: 'ファイル名は1〜100文字で入力してください',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // fileTypeの検証
    if (!fileType || !['xml', 'maiml'].includes(fileType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'ファイルタイプが無効です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // XMLファイルの場合、templateTypeが必須
    if (fileType === 'xml' && !templateType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TEMPLATE_TYPE_REQUIRED',
          message: 'XMLファイルの場合、テンプレートタイプが必須です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // templateTypeの検証（XMLの場合）
    if (fileType === 'xml' && !['material', 'condition', 'result'].includes(templateType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_TYPE',
          message: 'テンプレートタイプが無効です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // descriptionの長さチェック（オプション）
    if (description && description.length > 500) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DESCRIPTION_TOO_LONG',
          message: '概要は500文字以内で入力してください',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    // サービスを呼び出してファイルを作成
    const result = await formatService.createFormatFile(
      organizationId,
      departmentCd,
      folderName,
      fileName,
      fileType,
      templateType,
      description
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
