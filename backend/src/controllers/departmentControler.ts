/**
 * 部署管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as masterService from '../services/departmentService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

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

    // 組織IDを取得（req.user.organizationId）
    const organizationId = req.user?.organizationId;
    console.log('Extracted organizationId:', organizationId);

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
    const userId = req.user?.userId;

    const department = await masterService.createDepartment(String(organizationId), req.body, String(userId));

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
    const userId = req.user?.userId;
    const { departmentCd } = req.params;

    const department = await masterService.updateDepartment(
      String(organizationId),
      departmentCd,
      req.body,
      String(userId)
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
    const userId = req.user?.userId;
    const { departmentCd } = req.params;
    const { isActive } = req.body;

    const department = await masterService.updateDepartmentStatus(
      String(organizationId),
      departmentCd,
      isActive,
      String(userId)
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
    const userId = req.user?.userId;

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
    const result = await masterService.uploadDepartmentsCsv(String(organizationId), csvContent, String(userId));

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