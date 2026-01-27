/**
 * マスタ管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as masterService from '../services/masterService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

/**
 * Creatorマスタ一覧取得
 * 
 * GET /api/v1/master/creator
 */
export async function getCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getCreators API called ===');
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    
    // バリデーションエラーチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // 組織IDを取得（X-Organization-Idヘッダーまたはreq.user.organizationId）
    const organizationId = req.headers['x-organization-id'] as string || req.user?.organizationId;
    
    console.log('Organization ID:', organizationId);
    console.log('req.organizationId:', (req as any).organizationId);
    console.log('req.headers["x-organization-id"]:', req.headers['x-organization-id']);

    if (!organizationId) {
      console.log('ERROR: Organization ID not found');
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // クエリパラメータを取得
    const { display_scope, search, is_active } = req.query;

    // フィルター構築
    const filters: any = {};
    if (display_scope) {
      filters.displayScope = String(display_scope);
    }
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }

    // サービス層でデータ取得
    console.log('Calling masterService.getCreatorMasters with:', { organizationId, filters });
    const creators = await masterService.getCreatorMasters(String(organizationId), filters);
    console.log('Retrieved creators:', creators.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: creators,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get creators error:', error);
    next(error);
  }
}

/**
 * Creator ID指定で1件取得
 * 
 * GET /api/v1/master/creator/:creatorId
 */
export async function getCreatorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // バリデーションエラーチェック
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
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // 組織IDを取得（X-Organization-Idヘッダーまたはreq.user.organizationId）
    const organizationId = req.headers['x-organization-id'] as string || req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const { creatorId } = req.params;

    // サービス層でデータ取得
    const creator = await masterService.getCreatorById(String(organizationId), creatorId);

    if (!creator) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CREATOR_NOT_FOUND',
          message: 'Creator not found',
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
      data: creator,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get creator by ID error:', error);
    next(error);
  }
}

/**
 * Instrumentマスタ一覧取得
 * 
 * GET /api/v1/master/instrument
 */
export async function getInstruments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getInstruments API called ===');
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    
    // 組織IDを取得（X-Organization-Idヘッダーまたはreq.user.organizationId）
    const organizationId = req.headers['x-organization-id'] as string || req.user?.organizationId;
    
    console.log('Organization ID:', organizationId);
    
    if (!organizationId) {
      console.log('ERROR: Organization ID not found');
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // サービス層でデータ取得
    const instruments = await masterService.getInstrumentMasters(String(organizationId));
    console.log('Retrieved instruments:', instruments.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: instruments,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get instruments error:', error);
    next(error);
  }
}

/**
 * Instrument ID指定で1件取得
 * 
 * GET /api/v1/master/instrument/:instrumentId
 */
export async function getInstrumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const { instrumentId } = req.params;

    // サービス層でデータ取得
    const instrument = await masterService.getInstrumentById(String(organizationId), instrumentId);

    if (!instrument) {
      res.status(404).json({
        success: false,
        error: {
          code: 'INSTRUMENT_NOT_FOUND',
          message: 'Instrument not found',
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
      data: instrument,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get instrument by ID error:', error);
    next(error);
  }
}

/**
 * Vendorマスタ一覧取得
 * 
 * GET /api/v1/master/vendor
 */
export async function getVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getVendors API called ===');
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    
    // 組織IDを取得（X-Organization-Idヘッダーまたはreq.user.organizationId）
    const organizationId = req.headers['x-organization-id'] as string || req.user?.organizationId;
    
    console.log('Organization ID:', organizationId);
    
    if (!organizationId) {
      console.log('ERROR: Organization ID not found');
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // サービス層でデータ取得
    const vendors = await masterService.getVendorMasters(String(organizationId));
    console.log('Retrieved vendors:', vendors.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: vendors,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    next(error);
  }
}

/**
 * Vendor ID指定で1件取得
 * 
 * GET /api/v1/master/vendor/:vendorId
 */
export async function getVendorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const { vendorId } = req.params;

    // サービス層でデータ取得
    const vendor = await masterService.getVendorById(String(organizationId), vendorId);

    if (!vendor) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
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
      data: vendor,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get vendor by ID error:', error);
    next(error);
  }
}

/**
 * Instrumentマスタを新規作成
 * 
 * POST /api/v1/master/instrument
 */
export async function createInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createInstrument API called ===');
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const instrument = await masterService.createInstrumentMaster(String(organizationId), req.body);

    res.status(201).json({
      success: true,
      data: instrument,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create instrument error:', error);
    next(error);
  }
}

/**
 * Instrumentマスタを更新
 * 
 * PUT /api/v1/master/instrument/:instrumentId
 */
export async function updateInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { instrumentId } = req.params;

    const instrument = await masterService.updateInstrumentMaster(
      String(organizationId),
      instrumentId,
      req.body
    );

    if (!instrument) {
      res.status(404).json({
        success: false,
        error: {
          code: 'INSTRUMENT_NOT_FOUND',
          message: 'Instrument not found',
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
      data: instrument,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update instrument error:', error);
    next(error);
  }
}

/**
 * Instrumentマスタのアクティブ状態を更新
 * 
 * PATCH /api/v1/master/instrument/:instrumentId/status
 */
export async function updateInstrumentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { instrumentId } = req.params;
    const { isActive } = req.body;

    const instrument = await masterService.updateInstrumentStatus(
      String(organizationId),
      instrumentId,
      isActive
    );

    if (!instrument) {
      res.status(404).json({
        success: false,
        error: {
          code: 'INSTRUMENT_NOT_FOUND',
          message: 'Instrument not found',
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
      data: instrument,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update instrument status error:', error);
    next(error);
  }
}

/**
 * Vendorマスタを新規作成
 * 
 * POST /api/v1/master/vendor
 */
export async function createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const vendor = await masterService.createVendorMaster(String(organizationId), req.body);

    res.status(201).json({
      success: true,
      data: vendor,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    next(error);
  }
}

/**
 * Vendorマスタを更新
 * 
 * PUT /api/v1/master/vendor/:vendorId
 */
export async function updateVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { vendorId } = req.params;

    const vendor = await masterService.updateVendorMaster(
      String(organizationId),
      vendorId,
      req.body
    );

    if (!vendor) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
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
      data: vendor,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    next(error);
  }
}

/**
 * Vendorマスタのアクティブ状態を更新
 * 
 * PATCH /api/v1/master/vendor/:vendorId/status
 */
export async function updateVendorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { vendorId } = req.params;
    const { isActive } = req.body;

    const vendor = await masterService.updateVendorStatus(
      String(organizationId),
      vendorId,
      isActive
    );

    if (!vendor) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
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
      data: vendor,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update vendor status error:', error);
    next(error);
  }
}

/**
 * Creatorマスタを新規作成
 * 
 * POST /api/v1/master/creator
 */
export async function createCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createCreator API called ===');
    console.log('Request body:', req.body);
    
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
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const creator = await masterService.createCreatorMaster(String(organizationId), req.body);

    res.status(201).json({
      success: true,
      data: creator,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create creator error:', error);
    next(error);
  }
}

/**
 * Creatorマスタを更新
 * 
 * PUT /api/v1/master/creator/:creatorId
 */
export async function updateCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { creatorId } = req.params;

    const creator = await masterService.updateCreatorMaster(
      String(organizationId),
      creatorId,
      req.body
    );

    if (!creator) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CREATOR_NOT_FOUND',
          message: 'Creator not found',
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
      data: creator,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update creator error:', error);
    next(error);
  }
}

/**
 * Creatorマスタのアクティブ状態を更新
 * 
 * PATCH /api/v1/master/creator/:creatorId/status
 */
export async function updateCreatorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { creatorId } = req.params;
    const { isActive } = req.body;

    const creator = await masterService.updateCreatorStatus(
      String(organizationId),
      creatorId,
      isActive
    );

    if (!creator) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CREATOR_NOT_FOUND',
          message: 'Creator not found',
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
      data: creator,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update creator status error:', error);
    next(error);
  }
}

/**
 * CreatorマスタCSVアップロード
 * 
 * POST /api/v1/master/creator/upload-csv
 */
export async function uploadCreatorsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

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

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await masterService.uploadCreatorsCsv(String(organizationId), csvContent);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Upload creators CSV error:', error);
    next(error);
  }
}

/**
 * CreatorマスタCSVダウンロード
 * 
 * GET /api/v1/master/creator/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - display_scope: 表示切替（all/own）
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadCreatorsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // クエリパラメータを取得
    const { display_scope, search, is_active } = req.query;

    // フィルター構築
    const filters: any = {};
    if (display_scope) {
      filters.displayScope = String(display_scope);
    }
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }

    console.log('=== CSV Download - Creator ===');
    console.log('Organization ID:', organizationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const creators = await masterService.getCreatorMasters(String(organizationId), filters);

    console.log('Filtered creators count:', creators.length);

    const csvData = creators.map((c: any) => ({
      'CreatorID': c.creatorId,
      'Creator名称': c.creatorName,
      'Creator説明': c.creatorDescription,
      'Creatorアノテーション': c.creatorAnnotation,
      'Vendor名称': c.vendorName,
      'Instrument名称': c.instrumentName,
      '状態': c.isActive ? 'アクティブ' : '非アクティブ',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="creators.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download creators CSV error:', error);
    next(error);
  }
}

/**
 * InstrumentマスタCSVアップロード
 * 
 * POST /api/v1/master/instrument/upload-csv
 */
export async function uploadInstrumentsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

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

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await masterService.uploadInstrumentsCsv(String(organizationId), csvContent);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Upload instruments CSV error:', error);
    next(error);
  }
}

/**
 * InstrumentマスタCSVダウンロード
 * 
 * GET /api/v1/master/instrument/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - display_scope: 表示切替（all/own）
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadInstrumentsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // クエリパラメータを取得
    const { display_scope, search, is_active } = req.query;

    // フィルター構築
    const filters: any = {};
    if (display_scope) {
      filters.displayScope = String(display_scope);
    }
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }

    console.log('=== CSV Download - Instrument ===');
    console.log('Organization ID:', organizationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const instruments = await masterService.getInstrumentMastersWithFilters(String(organizationId), filters);

    console.log('Filtered instruments count:', instruments.length);

    const csvData = instruments.map((i: any) => ({
      '実験装置ID': i.instrumentId,
      '実験装置名称': i.instrumentName,
      '説明': i.instrumentDescription,
      'アノテーション': i.instrumentAnnotation,
      '状態': i.isActive ? 'アクティブ' : '非アクティブ',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="instruments.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download instruments CSV error:', error);
    next(error);
  }
}

/**
 * VendorマスタCSVアップロード
 * 
 * POST /api/v1/master/vendor/upload-csv
 */
export async function uploadVendorsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

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

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await masterService.uploadVendorsCsv(String(organizationId), csvContent);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Upload vendors CSV error:', error);
    next(error);
  }
}

/**
 * VendorマスタCSVダウンロード
 * 
 * GET /api/v1/master/vendor/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - display_scope: 表示切替（all/own）
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadVendorsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // クエリパラメータを取得
    const { display_scope, search, is_active } = req.query;

    // フィルター構築
    const filters: any = {};
    if (display_scope) {
      filters.displayScope = String(display_scope);
    }
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }

    console.log('=== CSV Download - Vendor ===');
    console.log('Organization ID:', organizationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const vendors = await masterService.getVendorMastersWithFilters(String(organizationId), filters);

    console.log('Filtered vendors count:', vendors.length);

    const csvData = vendors.map((v: any) => ({
      '実験装置VendorID': v.vendorId,
      '実験装置Vendor名称': v.vendorName,
      '説明': v.vendorDescription,
      'アノテーション': v.vendorAnnotation,
      '状態': v.isActive ? 'アクティブ' : '非アクティブ',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vendors.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download vendors CSV error:', error);
    next(error);
  }
}

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
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const corporation = await masterService.createCorporation(req.body);

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

    const corporation = await masterService.updateCorporation(
      corporationId,
      req.body
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

    const corporation = await masterService.updateCorporationStatus(
      corporationId,
      isActive
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

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await masterService.uploadCorporationsCsv(csvContent);

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

    const csvData = corporations.map((c: any) => ({
      '会社ID': c.corporationId,
      '会社名': c.corporationName,
      '更新日時': c.updatedAt,
      '状態': c.isActive ? 'アクティブ' : '非アクティブ',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="corporations.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download corporations CSV error:', error);
    next(error);
  }
}

/**
 * Department一覧取得
 * 
 * GET /api/v1/master/department
 */
export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getDepartments API called ===');
    console.log('Query:', req.query);
    console.log('req.user:', req.user);
    console.log('req.headers:', req.headers);

    // X-Organization-Idヘッダーまたはreq.user.organizationIdから取得
    const organizationId = req.headers['x-organization-id'] as string || req.user?.organizationId;
    console.log('Extracted organizationId:', organizationId);

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

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
    const departments = await masterService.getDepartments(String(organizationId), filters);
    console.log('Retrieved departments:', departments.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: departments,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get departments error:', error);
    next(error);
  }
}

/**
 * Department CD指定で1件取得
 * 
 * GET /api/v1/master/department/:departmentCd
 */
export async function getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const { departmentCd } = req.params;

    // サービス層でデータ取得
    const department = await masterService.getDepartmentById(String(organizationId), departmentCd);

    if (!department) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Department not found',
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
      data: department,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get department by ID error:', error);
    next(error);
  }
}

/**
 * Departmentを新規作成
 * 
 * POST /api/v1/master/department
 */
export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createDepartment API called ===');
    console.log('Request body:', req.body);

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
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const department = await masterService.createDepartment(String(organizationId), req.body);

    res.status(201).json({
      success: true,
      data: department,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create department error:', error);
    next(error);
  }
}

/**
 * Departmentを更新
 * 
 * PUT /api/v1/master/department/:departmentCd
 */
export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { departmentCd } = req.params;

    const department = await masterService.updateDepartment(
      String(organizationId),
      departmentCd,
      req.body
    );

    if (!department) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Department not found',
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
      data: department,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update department error:', error);
    next(error);
  }
}

/**
 * Departmentのアクティブ状態を更新
 * 
 * PATCH /api/v1/master/department/:departmentCd/status
 */
export async function updateDepartmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { departmentCd } = req.params;
    const { isActive } = req.body;

    const department = await masterService.updateDepartmentStatus(
      String(organizationId),
      departmentCd,
      isActive
    );

    if (!department) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Department not found',
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
      data: department,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update department status error:', error);
    next(error);
  }
}

/**
 * DepartmentCSVアップロード
 * 
 * POST /api/v1/master/department/upload-csv
 */
export async function uploadDepartmentCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

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

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await masterService.uploadDepartmentsCsv(String(organizationId), csvContent);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Upload departments CSV error:', error);
    next(error);
  }
}

/**
 * DepartmentCSVダウンロード
 * 
 * GET /api/v1/master/department/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadDepartmentCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

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

    console.log('=== CSV Download - Department ===');
    console.log('Organization ID:', organizationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const departments = await masterService.getDepartments(String(organizationId), filters);

    console.log('Filtered departments count:', departments.length);

    const csvData = departments.map((d: any) => ({
      '部署CD': d.departmentCd,
      '部署名': d.departmentName,
      '更新日時': d.updatedAt,
      '状態': d.isActive ? 'アクティブ' : '非アクティブ',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="departments.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download departments CSV error:', error);
    next(error);
  }
}

/**
 * ロール一覧取得
 * 
 * GET /api/v1/master/role
 */
export async function getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getRoles API called ===');
    console.log('Query:', req.query);
    console.log('req.user:', req.user);
    console.log('req.headers:', req.headers);

    const organizationId = req.user?.organizationId;
    console.log('Extracted organizationId from req.user:', organizationId);

    if (!organizationId) {
      console.log('ERROR: Organization ID not found in req.user');
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // サービス層でデータ取得
    const roles = await masterService.getRoles(String(organizationId));
    console.log('Retrieved roles:', roles.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: roles,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get roles error:', error);
    next(error);
  }
}

/**
 * ロールID指定で1件取得
 * 
 * GET /api/v1/master/role/:roleId
 */
export async function getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const { roleId } = req.params;

    // サービス層でデータ取得
    const role = await masterService.getRoleById(String(organizationId), roleId);

    if (!role) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'Role not found',
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
      data: role,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    next(error);
  }
}
