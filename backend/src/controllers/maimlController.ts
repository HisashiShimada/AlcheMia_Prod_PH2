/**
 * MAIML編集コントローラー
 * 
 * @description MAIML編集、解析、バリデーション等のリクエストハンドラ
 * @reference Reference版: reference/backend/routes/editRoutes.js（コントローラー機能を含む）
 * @task Phase 6 Step 2: ルート・コントローラー実装
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as maimlService from '../services/maimlService';
import { JwtPayload } from '../types/auth';

/**
 * 共通エラーハンドラ
 */
function handleError(res: Response, error: unknown, defaultMessage: string): void {
  console.error(`[maimlController] ${defaultMessage}:`, error);
  
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  const statusCode = error instanceof Error && 'statusCode' in error 
    ? (error as any).statusCode 
    : 500;

  res.status(statusCode).json({
    success: false,
    error: {
      code: error instanceof Error && 'code' in error ? (error as any).code : 'INTERNAL_ERROR',
      message: errorMessage,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * バリデーションエラーチェック
 */
function checkValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return true;
  }
  return false;
}

/**
 * MAIMLファイル解析（基本）
 * POST /api/v1/maiml/parse
 */
export async function parse(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { content } = req.body;
    const result = await maimlService.parseMaiML(content);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIML解析エラー');
  }
}

/**
 * ペトリネット構造解析（複数method対応）
 * POST /api/v1/maiml/parse-petri-net-structure
 * 
 * @description Phase 4で実装した新しい解析API
 * - 複数methodの完全サポート
 * - method別のplace/transition/arc抽出
 * - ステレオタイプ自動抽出
 * - InstructionID紐付け
 * - 重複ID検証統合
 */
export async function parsePetriNetStructure(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { content } = req.body;

    console.log('🔍 [maimlController] ペトリネット構造解析リクエスト受信');

    // Phase 4で実装した新しい解析関数を使用
    const result = await maimlService.parsePetriNetStructure(content);

    console.log('✅ [maimlController] ペトリネット構造解析完了:', {
      isMultiMethod: result.isMultiMethod,
      methodCount: result.methods?.length || 0,
      totalPlaces: result.statistics?.placeCount || 0,
      totalTransitions: result.statistics?.transitionCount || 0,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        apiVersion: '2.0', // 新API
      },
    });
  } catch (error) {
    handleError(res, error, 'ペトリネット構造解析エラー');
  }
}

/**
 * MAIMLファイル保存
 * POST /api/v1/maiml/save
 */
export async function save(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { fileKey, content } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Organization ID not found',
        },
      });
      return;
    }

    const result = await maimlService.saveMaiML(fileKey, content, organizationId);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIML保存エラー');
  }
}

/**
 * MAIMLファイル読込
 * POST /api/v1/maiml/load
 */
export async function load(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { filePath } = req.body;
    const organizationId = (req as any).organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Organization ID not found',
        },
      });
      return;
    }

    const result = await maimlService.loadMaiML(filePath, organizationId);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIMLファイル読込エラー');
  }
}

/**
 * MAIMLファイル一覧取得
 * GET /api/v1/maiml/list
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { projectId } = req.query;
    const organizationId = (req as any).organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Organization ID not found',
        },
      });
      return;
    }

    const result = await maimlService.listMaiMLFiles(projectId as string, organizationId);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIMLファイル一覧取得エラー');
  }
}

/**
 * MAIMLバリデーション
 * POST /api/v1/maiml/validate
 */
export async function validate(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { content, fileKey, skipAnalysisSave = true } = req.body;
    const authUser = req.user as JwtPayload;
    const result = await maimlService.validateMaiML(authUser.organizationId, content, fileKey, skipAnalysisSave);

    res.json({
      success: true,
      data : {...result},
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIMLバリデーションエラー');
  }
}

/**
 * MAIML自動補正
 * POST /api/v1/maiml/correct
 * 
 * @note 優先度低（Phase 7で実装予定）
 */
export async function correct(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const { content } = req.body;
    const result = await maimlService.correctMaiML(content);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIML自動補正エラー');
  }
}

/**
 * 編集セッション開始
 * POST /api/v1/maiml/session/start
 */
export async function startSession(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const sessionData = req.body;
    const result = await maimlService.startEditSession(sessionData);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, '編集セッション開始エラー');
  }
}

/**
 * 編集セッション終了
 * POST /api/v1/maiml/session/end
 */
export async function endSession(req: Request, res: Response): Promise<void> {
  try {
    if (checkValidationErrors(req, res)) return;

    const sessionData = req.body;
    const result = await maimlService.endEditSession(sessionData);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, '編集セッション終了エラー');
  }
}

/**
 * ヘルスチェック
 * GET /api/v1/maiml/health
 */
export function health(_req: Request, res: Response): void {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      'maiml-parse',
      'maiml-save',
      'maiml-load',
      'maiml-list',
      'maiml-validate',
      'maiml-correct',
      'session-management',
    ],
  });
}