/**
 * code_master Controller
 * 
 * コードマスター関連のHTTPリクエストを処理
 * 
 * @module codeMasterController
 * @version 1.0.0
 * @date 2026-02-20
 */

import { Request, Response } from 'express';
import * as codeMasterService from '../services/codeMasterService';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';

/**
 * Selectオプション取得
 * 
 * GET /api/v1/code-master/:codeDivision/options
 * 
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @note バリデーションはミドルウェアで処理済み
 */
export async function getSelectOptions(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // バリデーションはミドルウェアで処理済み
    const { codeDivision } = req.params;
    const { organizationId } = req.user!;

    const options = await codeMasterService.getSelectOptions(organizationId, codeDivision);

    res.status(200).json({
      success: true,
      data: {
        codeDivision,
        options,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Failed to get code master select options', error as Error, {
      action: 'code_master_get_options',
      organizationId: req.user?.organizationId,
      codeDivision: req.params.codeDivision,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * 複数Selectオプション一括取得
 * 
 * POST /api/v1/code-master/options/bulk
 * 
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @note バリデーションはミドルウェアで処理済み
 */
export async function getMultipleSelectOptions(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // バリデーションはミドルウェアで処理済み
    const { codeDivisions } = req.body;
    const { organizationId } = req.user!;

    const options = await codeMasterService.getMultipleSelectOptions(
      organizationId,
      codeDivisions
    );

    res.status(200).json({
      success: true,
      data: options,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('Failed to get multiple code master select options', error as Error, {
      action: 'code_master_get_multiple_options',
      organizationId: req.user?.organizationId,
      codeDivisions: req.body.codeDivisions,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
