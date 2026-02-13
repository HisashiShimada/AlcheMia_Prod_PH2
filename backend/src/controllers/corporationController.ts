/**
 * 会社管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import * as masterService from '../services/corporationService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

/**
 * Corporation一覧取得
 * 
 * GET /api/v1/master/corporation
 */
export async function getCorporation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getCorporation API called ===');
    console.log('Query:', req.query);

    // クエリパラメータを取得
    const { search, is_active, sort_by, sort_order } = req.query;

    // フィルター構築
    const filters: any = {};
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }
    if (sort_by) {
      filters.sortBy = String(sort_by);
    }
    if (sort_order) {
      filters.sortOrder = String(sort_order);
    }

    // サービス層でデータ取得
    const corporations = await masterService.getCorporation(filters);
    console.log('Retrieved corporations:', corporations.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: corporations,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get corporations error:', error);
    next(error);
  }
}

/**
 * Corporation ID指定で1件取得
 * 
 * GET /api/v1/master/corporation/:corporationId
 */
export async function getCorporationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { corporationId } = req.params;

    // サービス層でデータ取得（UUID）
    const corporation = await masterService.getCorporationById(corporationId);

    if (!corporation) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CORPORATION_NOT_FOUND',
          message: 'Corporation not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // 成功レスポンス
    res.json({
      success: true,
      data: corporation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get corporation by ID error:', error);
    next(error);
  }
}

/**
 * Corporationを新規作成
 * 
 * POST /api/v1/master/corporation
 */
export async function createCorporation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createCorporation API called ===');
    console.log('Request body:', req.body);

    // バリデーションはミドルウェアで処理済み
    const userId = req.user?.userId;
    const corporation = await masterService.createCorporation(req.body, String(userId));

    res.status(201).json({
      success: true,
      data: corporation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create corporation error:', error);
    next(error);
  }
}

/**
 * Corporationを更新
 * 
 * PUT /api/v1/master/corporation/:corporationId
 */
export async function updateCorporation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { corporationId } = req.params;
    const userId = req.user?.userId;

    const corporation = await masterService.updateCorporation(
      corporationId,
      req.body,
      String(userId)
    );

    if (!corporation) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CORPORATION_NOT_FOUND',
          message: 'Corporation not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    res.json({
      success: true,
      data: corporation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update corporation error:', error);
    next(error);
  }
}

/**
 * Corporationのアクティブ状態を更新
 * 
 * PATCH /api/v1/master/corporation/:corporationId/status
 */
export async function updateCorporationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { corporationId } = req.params;
    const { isActive } = req.body;
    const userId = req.user?.userId;

    const corporation = await masterService.updateCorporationStatus(
      corporationId,
      isActive,
      String(userId)
    );

    if (!corporation) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CORPORATION_NOT_FOUND',
          message: 'Corporation not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    res.json({
      success: true,
      data: corporation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update corporation status error:', error);
    next(error);
  }
}

/**
 * CorporationCSVアップロード
 * 
 * POST /api/v1/master/corporation/upload-csv
 */
export async function uploadCorporationCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'CSVファイルが必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const userId = req.user?.userId;
    const csvContent = req.file.buffer.toString('utf-8');
    const result = await masterService.uploadCorporationsCsv(csvContent, String(userId));

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Upload corporations CSV error:', error);
    next(error);
  }
}

/**
 * CorporationCSVダウンロード
 * 
 * GET /api/v1/master/corporation/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadCorporationCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // クエリパラメータを取得
    const { search, is_active } = req.query;

    // フィルター構築
    const filters: any = {};
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }

    console.log('=== CSV Download - Corporation ===');
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const corporations = await masterService.getCorporation(filters);

    console.log('Filtered corporations count:', corporations.length);

    // 物理名ヘッダーでCSVデータ作成
    const csvData = corporations.map((c: any) => ({
      'corporation_name': c.corporationName,
      'update_at': c.updatedAt,
      'is_active': c.isActive,
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    // タイムスタンプ付きファイル名を生成 (yyyyMMddhhmmss)
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '')
      .slice(0, 14);
    const filename = `corporations_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download corporations CSV error:', error);
    next(error);
  }
}
