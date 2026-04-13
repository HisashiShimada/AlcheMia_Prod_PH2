/**
 * マスタ管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import * as masterService from '../services/masterService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { getPgp } from '../database/db';

/**
 * organization テーブルから corporationId を取得する。
 * セッションキャッシュは使用せず、毎回 DB から最新値を取得する。
 * （セッションに null がキャッシュされると表示切替が効かなくなるバグを防ぐため）
 *
 * @param req - Express リクエスト
 * @param organizationId - ログインユーザーの組織ID
 * @returns corporationId（法人に属さない場合は null）
 */
async function getCorporationId(_req: Request, organizationId: string): Promise<string | null> {
  const pgp = getPgp();
  const result = await pgp.oneOrNone<{ corporation_id: string | null }>(
    'SELECT corporation_id FROM organization WHERE organization_id = $1',
    [organizationId]
  );
  return result?.corporation_id ?? null;
}

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
    
    // バリデーションはミドルウェアで処理済み
    // 組織IDを取得（req.user.organizationId）
    const organizationId = req.user?.organizationId;
    const corporationId = await getCorporationId(req, String(organizationId));
    
    console.log('Organization ID:', organizationId);
    console.log('Corporation ID:', corporationId);
    console.log('req.organizationId:', (req as any).organizationId);

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

    // サービス層でデータ取得（フィルタ対応版を使用）
    console.log('Calling masterService.getCreatorMastersWithFilters with:', { organizationId, corporationId, filters });
    const creators = await masterService.getCreatorMastersWithFilters(String(organizationId), corporationId, filters);
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
    // バリデーションはミドルウェアで処理済み
    // 組織IDを取得（req.user.organizationId）
    const organizationId = req.user?.organizationId;

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
 * GET /master/instrument
 */
export async function getInstruments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getInstruments API called ===');
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    
    // 組織IDとcorporation IDを取得
    const organizationId = req.user?.organizationId;
    const corporationId = await getCorporationId(req, String(organizationId));
    
    console.log('Organization ID:', organizationId);
    console.log('Corporation ID:', corporationId);

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

    // サービス層でデータ取得（フィルタ対応版を使用）
    console.log('Calling masterService.getInstrumentMastersWithFilters with:', { organizationId, corporationId, filters });
    const instruments = await masterService.getInstrumentMastersWithFilters(String(organizationId), corporationId, filters);
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
 * GET /master/instrument/:instrumentId
 */
export async function getInstrumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

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
    
    // 組織IDとcorporation IDを取得
    const organizationId = req.user?.organizationId;
    const corporationId = await getCorporationId(req, String(organizationId));
    
    console.log('Organization ID:', organizationId);
    console.log('Corporation ID:', corporationId);

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

    // サービス層でデータ取得（フィルタ対応版を使用）
    console.log('Calling masterService.getVendorMastersWithFilters with:', { organizationId, corporationId, filters });
    const vendors = await masterService.getVendorMastersWithFilters(String(organizationId), corporationId, filters);
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
 * POST /master/instrument
 */
export async function createInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createInstrument API called ===');
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers);
    
    // バリデーションはミドルウェアで処理済み
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));

    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const instrument = await masterService.createInstrumentMaster(String(organizationId), req.body, String(userId), corporationId, lang);

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
 * PUT /master/instrument/:instrumentId
 */
export async function updateInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));
    const { instrumentId } = req.params;

    const instrument = await masterService.updateInstrumentMaster(
      String(organizationId),
      instrumentId,
      req.body,
      String(userId),
      corporationId
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
 * PATCH /master/instrument/:instrumentId/status
 */
export async function updateInstrumentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));
    const { instrumentId } = req.params;
    const { isActive } = req.body;

    const instrument = await masterService.updateInstrumentStatus(
      String(organizationId),
      instrumentId,
      isActive,
      String(userId),
      corporationId
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
    // バリデーションはミドルウェアで処理済み
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));

    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const vendor = await masterService.createVendorMaster(String(organizationId), req.body, String(userId), corporationId, lang);

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
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));
    const { vendorId } = req.params;

    const vendor = await masterService.updateVendorMaster(
      String(organizationId),
      vendorId,
      req.body,
      String(userId),
      corporationId
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
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));
    const { vendorId } = req.params;
    const { isActive } = req.body;

    const vendor = await masterService.updateVendorStatus(
      String(organizationId),
      vendorId,
      isActive,
      String(userId),
      corporationId
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
    
    // バリデーションはミドルウェアで処理済み
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));

    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const creator = await masterService.createCreatorMaster(String(organizationId), req.body, String(userId), corporationId, lang);

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
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));
    const { creatorId } = req.params;

    const creator = await masterService.updateCreatorMaster(
      String(organizationId),
      creatorId,
      req.body,
      String(userId),
      corporationId
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
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));
    const { creatorId } = req.params;
    const { isActive } = req.body;

    const creator = await masterService.updateCreatorStatus(
      String(organizationId),
      creatorId,
      isActive,
      String(userId),
      corporationId
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
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));

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
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const result = await masterService.uploadCreatorsCsv(String(organizationId), csvContent, String(userId), corporationId);

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

    // セッションからcorporationIdを取得
    const corporationId = await getCorporationId(req, String(organizationId));

    console.log('=== CSV Download - Creator ===');
    console.log('Organization ID:', organizationId);
    console.log('Corporation ID:', corporationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const creators = await masterService.getCreatorMastersWithFilters(String(organizationId), corporationId, filters);

    console.log('Filtered creators count:', creators.length);

    // CSVヘッダーを物理名に変更
    const csvData = creators.map((c: any) => ({
      'creator_id': c.creatorId,
      'creator_name': c.creatorName,
      'creator_description': c.creatorDescription,
      'creator_annotation': c.creatorAnnotation,
      'vendor_name': c.vendorName,
      'instrument_name': c.instrumentName,
      'is_active': c.isActive,
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    // ファイル名を master_creator_yyyyMMddhhssmm.csv 形式に変更
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
    const filename = `master_creator_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download creators CSV error:', error);
    next(error);
  }
}

/**
 * InstrumentマスタCSVアップロード
 * 
 * POST /master/instrument/upload-csv
 */
export async function uploadInstrumentsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));

    const csvContent = req.file.buffer.toString('utf-8');
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const result = await masterService.uploadInstrumentsCsv(String(organizationId), csvContent, String(userId), corporationId);

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
 * GET /master/instrument/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - display_scope: 表示切替（all/own）
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadInstrumentsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

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

    // セッションからcorporationIdを取得
    const corporationId = await getCorporationId(req, String(organizationId));

    console.log('=== CSV Download - Instrument ===');
    console.log('Organization ID:', organizationId);
    console.log('Corporation ID:', corporationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const instruments = await masterService.getInstrumentMastersWithFilters(String(organizationId), corporationId, filters);

    console.log('Filtered instruments count:', instruments.length);

    // CSVヘッダーを物理名に変更
    const csvData = instruments.map((i: any) => ({
      'instrument_id': i.instrumentId,
      'instrument_name': i.instrumentName,
      'instrument_description': i.instrumentDescription,
      'instrument_annotation': i.instrumentAnnotation,
      'is_active': i.isActive,
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    // ファイル名を master_instrument_yyyyMMddhhssmm.csv 形式に変更
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
    const filename = `master_instrument_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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

    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const corporationId = await getCorporationId(req, String(organizationId));

    const csvContent = req.file.buffer.toString('utf-8');
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const result = await masterService.uploadVendorsCsv(String(organizationId), csvContent, String(userId), corporationId);

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

    // セッションからcorporationIdを取得
    const corporationId = await getCorporationId(req, String(organizationId));

    console.log('=== CSV Download - Vendor ===');
    console.log('Organization ID:', organizationId);
    console.log('Corporation ID:', corporationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const vendors = await masterService.getVendorMastersWithFilters(String(organizationId), corporationId, filters);

    console.log('Filtered vendors count:', vendors.length);

    // CSVヘッダーを物理名に変更
    const csvData = vendors.map((v: any) => ({
      'vendor_id': v.vendorId,
      'vendor_name': v.vendorName,
      'vendor_description': v.vendorDescription,
      'vendor_annotation': v.vendorAnnotation,
      'is_active': v.isActive,
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    // ファイル名を master_vendor_yyyyMMddhhssmm.csv 形式に変更
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
    const filename = `master_vendor_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download vendors CSV error:', error);
    next(error);
  }
}

// =============================================================
// Attributeマスタ関連コントローラー
// =============================================================

/**
 * Attributeマスタ一覧取得
 *
 * GET /api/v1/master/attribute
 */
export async function getAttributes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    const { search, is_active, apply_department_filter } = req.query;
    const filters: any = {};
    if (search) filters.search = String(search);
    if (is_active !== undefined) filters.isActive = is_active === 'true' || is_active === '1';

    // apply_department_filter=true の場合のみ部署フィルタを適用
    // ログインユーザーの部署コードでフィルタリング（マスタ管理画面では使用しない）
    if (apply_department_filter === 'true') {
      const departmentCd = req.session?.departmentCd;
      if (departmentCd) {
        filters.departmentCd = departmentCd;
      }
    }

    const attributes = await masterService.getAttributeMastersWithFilters(String(organizationId), filters);

    res.json({
      success: true,
      data: attributes,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get attributes error:', error);
    next(error);
  }
}

/**
 * Attribute主キー指定取得
 *
 * GET /api/v1/master/attribute/:attributeId
 * ※ attributeId は "attributeName__attributeValue" 形式（URLエンコード済み）
 */
export async function getAttributeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { attributeId } = req.params;
    // attributeId は "name__value" 形式でエンコードされているのでデコードして分割
    const decoded = decodeURIComponent(attributeId);
    const separatorIdx = decoded.indexOf('__');
    const attributeName = separatorIdx >= 0 ? decoded.substring(0, separatorIdx) : decoded;
    const attributeValue = separatorIdx >= 0 ? decoded.substring(separatorIdx + 2) : '';

    const attribute = await masterService.getAttributeById(String(organizationId), attributeName, attributeValue);

    if (!attribute) {
      res.status(404).json({ success: false, error: { code: 'E6001', message: 'Attributeマスタが見つかりません' } });
      return;
    }

    res.json({ success: true, data: attribute });
  } catch (error) {
    console.error('Get attribute by id error:', error);
    next(error);
  }
}

/**
 * Attributeマスタ新規作成
 *
 * POST /api/v1/master/attribute
 */
export async function createAttribute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const lang = req.headers['accept-language']?.startsWith('en') ? 'en' : 'ja';

    const { attributeName, attributeValue, attributeRemark, departmentCd, isActive } = req.body;

    if (!attributeName) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'attribute_name は必須です' } });
      return;
    }

    const attribute = await masterService.createAttributeMaster(
      String(organizationId),
      { attributeName, attributeValue, attributeRemark, departmentCd, isActive },
      String(userId),
      lang
    );

    res.status(201).json({
      success: true,
      data: attribute,
      meta: { timestamp: new Date().toISOString(), requestId: req.headers['x-request-id'] || uuidv4() },
    });
  } catch (error: any) {
    if (error.statusCode === 409) {
      res.status(409).json({ success: false, error: { code: error.code || 'E7001', message: error.message } });
      return;
    }
    console.error('Create attribute error:', error);
    next(error);
  }
}

/**
 * Attributeマスタ更新
 *
 * PUT /api/v1/master/attribute/:attributeId
 * ※ attributeId は URLエンコードされた attributeName
 *    attributeValue はリクエストボディから取得（PKの一部）
 */
export async function updateAttribute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { attributeId } = req.params;
    // attributeId はURLエンコードされた attributeName
    const attributeName = decodeURIComponent(attributeId);
    const { attributeValue, attributeRemark, departmentCd, isActive } = req.body;

    const attribute = await masterService.updateAttributeMaster(
      String(organizationId),
      attributeName,
      { attributeValue, attributeRemark, departmentCd, isActive },
      String(userId)
    );

    if (!attribute) {
      res.status(404).json({ success: false, error: { code: 'E6001', message: 'Attributeマスタが見つかりません' } });
      return;
    }

    res.json({ success: true, data: attribute });
  } catch (error) {
    console.error('Update attribute error:', error);
    next(error);
  }
}

/**
 * Attributeマスタ ステータス更新
 *
 * PATCH /api/v1/master/attribute/:attributeId/status
 * ※ attributeId は "attributeName__attributeValue" 形式（URLエンコード済み）
 */
export async function updateAttributeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { attributeId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'isActive は必須です' } });
      return;
    }

    // attributeId は "attributeName__attributeValue" 形式
    // Expressがルートパラメータを自動でURLデコードするため、二重デコード不要
    const attribute = await masterService.updateAttributeStatus(
      String(organizationId),
      attributeId,
      Boolean(isActive),
      String(userId)
    );

    if (!attribute) {
      res.status(404).json({ success: false, error: { code: 'E6001', message: 'Attributeマスタが見つかりません' } });
      return;
    }

    res.json({ success: true, data: attribute });
  } catch (error) {
    console.error('Update attribute status error:', error);
    next(error);
  }
}

/**
 * AttributeマスタCSVダウンロード
 *
 * GET /api/v1/master/attribute/download-csv
 */
export async function downloadAttributesCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { search, is_active } = req.query;

    const filters: any = {};
    if (search) filters.search = String(search);
    if (is_active !== undefined) filters.isActive = is_active === 'true' || is_active === '1';

    const attributes = await masterService.getAttributeMastersWithFilters(String(organizationId), filters);

    const csvData = attributes.map((a: any) => ({
      'attribute_name': a.attributeName,
      'attribute_value': a.attributeValue,
      'attribute_remark': a.attributeRemark,
      'department_cd': a.departmentCd,
      'is_active': a.isActive,
    }));

    const csv = Papa.unparse(csvData, { header: true });

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `master_attribute_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download attributes CSV error:', error);
    next(error);
  }
}

/**
 * AttributeマスタCSVアップロード
 *
 * POST /api/v1/master/attribute/upload-csv
 */
export async function uploadAttributesCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;

    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'CSVファイルが必要です' } });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const result = await masterService.uploadAttributesCsv(String(organizationId), csvContent, String(userId));

    if (result.errors.length > 0) {
      res.status(400).json({ success: false, data: result });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('CSV内に重複した')) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: error.message } });
      return;
    }
    console.error('Upload attributes CSV error:', error);
    next(error);
  }
}
