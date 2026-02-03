/**
 * ロール管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as masterService from '../services/roleService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

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
 * ロールCD指定で1件取得
 * 
 * GET /api/v1/master/role/:roleId
 */
export async function getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

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

/**
 * ロール新規追加
 * 
 * POST /api/v1/master/role
 */
export async function createRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('=== createRole API called ===');
    console.log('Body:', req.body);

    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { role, roleName, initialScreenFunctionName, isActive } = req.body;

    // バリデーション
    if (!role || !roleName) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'ロールCDとロール名は必須です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // サービス層で作成
    await masterService.createRole(
      String(organizationId),
      {
        roleId: role,
        roleName,
        initialScreenFunctionName: initialScreenFunctionName || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      String(userId)
    );

    // 成功レスポンス
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create role error:', error);
    next(error);
  }
}

/**
 * ロール更新
 * 
 * PUT /api/v1/master/role/:roleId
 */
export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('=== updateRole API called ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);

    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { roleId } = req.params;
    const { roleName, initialScreenFunctionName, isActive } = req.body;

    // サービス層で更新
    await masterService.updateRole(
      String(organizationId),
      roleId,
      {
        roleName,
        initialScreenFunctionName,
        isActive,
      },
      String(userId)
    );

    // 成功レスポンス
    res.json({
      success: true,
      message: 'Role updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update role error:', error);
    next(error);
  }
}

/**
 * ロールの権限を更新
 * 
 * PUT /api/v1/master/role/:roleId/permissions
 */
export async function updateRolePermissions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('=== updateRolePermissions API called ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);

    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { roleId } = req.params;
    const { functionName, functionWritePermissions } = req.body;

    // バリデーション
    // functionNameが空文字列の場合は全権限削除として許容
    if (functionName === undefined || functionName === null) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FUNCTION_NAME',
          message: 'functionName is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // サービス層で更新
    await masterService.updateRolePermissions(
      String(organizationId),
      roleId,
      functionName,
      functionWritePermissions || '',
      String(userId)
    );

    // 成功レスポンス
    res.json({
      success: true,
      message: 'Role permissions updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    next(error);
  }
}

/**
 * ロールのステータスを更新
 * 
 * PATCH /api/v1/master/role/:roleId/status
 */
export async function updateRoleStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('=== updateRoleStatus API called ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);

    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { roleId } = req.params;
    const { isActive } = req.body;

    // バリデーション
    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IS_ACTIVE',
          message: 'isActive must be a boolean',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // サービス層で更新
    await masterService.updateRole(
      String(organizationId),
      roleId,
      { isActive },
      String(userId)
    );

    // 成功レスポンス
    res.json({
      success: true,
      message: 'Role status updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update role status error:', error);
    next(error);
  }
}
