/**
 * 組織管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import * as organizationService from '../services/organizationService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { getCertificateFromStorage } from '../services/certificateService';

/**
 * Organization一覧取得
 * 
 * GET /api/v1/systemManagement/organization
 */
export async function getOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getOrganizations API called ===');
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
    const organizations = await organizationService.getOrganizations(filters);
    console.log('Retrieved organizations:', organizations.length, 'records');

    // 成功レスポンス
    res.json({
      success: true,
      data: organizations,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    next(error);
  }
}

/**
 * Organization ID指定で1件取得
 * 
 * GET /api/v1/systemManagement/organization/:organizationId
 */
export async function getOrganizationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.params;

    // サービス層でデータ取得
    const organization = await organizationService.getOrganizationById(organizationId);

    if (!organization) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
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
      data: organization,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get organization by ID error:', error);
    next(error);
  }
}

/**
 * Organizationを新規作成
 * 
 * POST /api/v1/systemManagement/organization
 */
export async function createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createOrganization API called ===');
    console.log('Request body:', req.body);

    // バリデーションはミドルウェアで処理済み
    const userId = req.user?.userId;
    const organization = await organizationService.createOrganization(req.body, String(userId));

    res.status(201).json({
      success: true,
      data: organization,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create organization error:', error);
    next(error);
  }
}

/**
 * Organizationを更新
 * 
 * PUT /api/v1/systemManagement/organization/:organizationId
 */
export async function updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { organizationId } = req.params;

    const organization = await organizationService.updateOrganization(
      organizationId,
      req.body,
      String(userId)
    );

    if (!organization) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
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
      data: organization,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update organization error:', error);
    next(error);
  }
}

/**
 * Organizationのアクティブ状態を更新
 * 
 * PATCH /api/v1/systemManagement/organization/:organizationId/status
 */
export async function updateOrganizationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { organizationId } = req.params;
    const { isActive } = req.body;

    const organization = await organizationService.updateOrganizationStatus(
      organizationId,
      isActive,
      String(userId)
    );

    if (!organization) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
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
      data: organization,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update organization status error:', error);
    next(error);
  }
}
/**
 * 組織のシステム管理者一覧を取得
 * 
 * GET /api/v1/provider/organization/:organizationId/system-admins
 */
export async function getSystemAdminsByOrganizationId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.params;

    // サービス層でデータ取得
    const systemAdmins = await organizationService.getSystemAdminsByOrganizationId(organizationId);

    // 成功レスポンス
    res.json({
      success: true,
      data: systemAdmins,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get system admins error:', error);
    next(error);
  }
}

/**
 * OrganizationCSVアップロード
 * 
 * POST /api/v1/provider/organization/upload-csv
 */
export async function uploadOrganizationCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const result = await organizationService.uploadOrganizationsCsv(csvContent, String(userId));

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
 * クライアント証明書をダウンロード
 * 
 * GET /api/v1/provider/organization/:organizationId/certificate
 */
export async function downloadCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.params;

    console.log('=== downloadCertificate API called ===');
    console.log('organizationId:', organizationId);

    // 証明書を取得
    const p12Buffer = await getCertificateFromStorage(organizationId);

    // ファイル名: {organizationId}.p12
    const filename = `${organizationId}.p12`;

    // レスポンスヘッダー設定
    res.setHeader('Content-Type', 'application/x-pkcs12');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', p12Buffer.length.toString());

    // バイナリデータを送信
    res.send(p12Buffer);
  } catch (error) {
    console.error('Download certificate error:', error);
    
    // 証明書が見つからない場合は404を返す
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: '証明書が見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }
    
    next(error);
  }
}

/**
 * 情報ダウンロード（全組織の統計情報CSV）
 * 
 * GET /api/v1/provider/organization/download-information-csv
 */
export async function downloadInformationCsv(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== downloadInformationCsv API called ===');

    // サービス層で統計情報を取得
    const rows = await organizationService.downloadOrganizationsInformation();

    console.log('Information CSV rows count:', rows.length);

    // タイムスタンプ付きファイル名を生成 (yyyyMMddhhmmss)
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '')
      .slice(0, 14);
    const filename = `information_${timestamp}.csv`;

    const csv = Papa.unparse(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download information CSV error:', error);
    next(error);
  }
}

/**
 * OrganizationCSVダウンロード
 * 
 * GET /api/v1/provider/organization/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - is_active: アクティブ状態フィルタ
 */
export async function downloadOrganizationCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // クエリパラメータを取得
    const { search, is_active, organization_cd, organization_display_name, corporation_name } = req.query;

    // フィルター構築
    const filters: any = {};
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }
    if (organization_cd) {
      filters.organizationCd = String(organization_cd);
    }
    if (organization_display_name) {
      filters.organizationDisplayName = String(organization_display_name);
    }
    if (corporation_name) {
      filters.corporationName = String(corporation_name);
    }

    console.log('=== CSV Download - Organization ===');
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const organizations = await organizationService.getOrganizations(filters);

    console.log('Filtered organizations count:', organizations.length);

    // 物理名ヘッダーでCSVデータ作成
    const csvData = organizations.map((o: any) => ({
      'organization_cd': o.organizationCd,
      'organization_display_name': o.organizationDisplayName,
      'organization_email': o.organizationEmail,
      'chief_user_name': o.chiefUserName,
      'chief_user_email': o.chiefUserId,
      'corporation_name': o.corporationName,
      'is_entry': o.isEntry,
      'use_deemed_progress': o.useDeemedProgress,
      'update_at': o.updatedAt,
      'is_active': o.isActive,
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
    const filename = `organizations_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Download organizations CSV error:', error);
    next(error);
  }
}
