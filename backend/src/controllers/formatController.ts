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

    // デバッグログ
    console.log('[formatController] getFormats called:', {
      organizationId,
      departmentCd,
      sessionExists: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      fileType: req.query.file_type,
    });

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

export const formatController = {
  getFormats,
  getFormatFiles,
};
