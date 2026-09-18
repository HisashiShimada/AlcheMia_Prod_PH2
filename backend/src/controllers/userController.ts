/**
 * ユーザー管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { AppError } from '../enums/errorCodes';
import { v4 as uuidv4 } from 'uuid';

/**
 * User一覧取得
 * 
 * GET /api/v1/systemManagement/user
 */
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== getUsers API called ===');
    console.log('Query:', req.query);
    console.log('req.user:', req.user);

    // 組織IDを取得（req.user.organizationId）
    const organizationId = req.user?.organizationId;
    console.log('Extracted organizationId:', organizationId);

    // クエリパラメータを取得
    const { search, is_active, role_cd, sort_by, sort_order } = req.query;

    // フィルター構築
    const filters: any = {};
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }
    if (role_cd) {
      filters.roleCd = String(role_cd);
    }
    if (sort_by) {
      filters.sortBy = String(sort_by) as 'user_id' | 'user_name' | 'update_at';
    }
    if (sort_order) {
      filters.sortOrder = String(sort_order) as 'asc' | 'desc';
    }

    // サービス層でデータ取得
    const users = await userService.getUsers(String(organizationId), filters);
    console.log('Retrieved users:', users.length, 'records');

    // レスポンスデータをcamelCaseに変換
    const responseData = users.map((user) => ({
      userId: user.user_id,
      userName: user.user_name,
      mailAddress: user.mail_address,
      organizationGroupCds: user.organization_group_cds,
      roleCd: user.role_cd,
      roleName: user.role_name,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      namespaceUri: user.namespace_uri ?? null,
      createAt: user.create_at,
      updateAt: user.update_at,
    }));

    // 成功レスポンス
    res.json({
      success: true,
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    next(error);
  }
}

/**
 * User ID指定で1件取得
 * 
 * GET /api/v1/systemManagement/user/:userId
 */
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const { userId } = req.params;

    // サービス層でデータ取得
    const user = await userService.getUserById(String(organizationId), userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // レスポンスデータをcamelCaseに変換
    const responseData = {
      userId: user.user_id,
      userName: user.user_name,
      mailAddress: user.mail_address,
      organizationGroupCds: user.organization_group_cds,
      roleCd: user.role_cd,
      roleName: user.role_name,
      isActive: user.is_active,
      namespaceUri: user.namespace_uri ?? null,
      createAt: user.create_at,
      updateAt: user.update_at,
    };

    // 成功レスポンス
    res.json({
      success: true,
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    next(error);
  }
}

/**
 * Userを新規作成
 * 
 * POST /api/v1/systemManagement/user
 */
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('=== createUser API called ===');
    console.log('Request body:', req.body);

    // バリデーションはミドルウェアで処理済み
    const organizationId = req.user?.organizationId;
    const currentUserId = req.user?.userId;

    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    const user = await userService.createUser(String(organizationId), req.body, String(currentUserId), lang);

    // レスポンスデータをcamelCaseに変換
    const responseData = {
      userId: user.user_id,
      userName: user.user_name,
      mailAddress: user.mail_address,
      organizationGroupCds: user.organization_group_cds,
      roleCd: user.role_cd,
      roleName: user.role_name,
      isActive: user.is_active,
      createAt: user.create_at,
      updateAt: user.update_at,
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'ユーザーを作成しました',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof AppError) {
      const statusCode = error.code === 'USER_ALREADY_EXISTS' ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
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
 * Userを更新
 * 
 * PUT /api/v1/systemManagement/user/:userId
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserId = req.user?.userId;
    const { userId } = req.params;

    const user = await userService.updateUser(
      String(organizationId),
      userId,
      req.body,
      String(currentUserId)
    );

    // レスポンスデータをcamelCaseに変換
    const responseData = {
      userId: user.user_id,
      userName: user.user_name,
      mailAddress: user.mail_address,
      organizationGroupCds: user.organization_group_cds,
      roleCd: user.role_cd,
      roleName: user.role_name,
      isActive: user.is_active,
      createAt: user.create_at,
      updateAt: user.update_at,
    };

    res.json({
      success: true,
      data: responseData,
      message: 'ユーザー情報を更新しました',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error instanceof AppError && error.code === 'USER_NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: { code: error.code, message: error.message },
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
 * Userのアクティブ状態を更新
 * 
 * PATCH /api/v1/systemManagement/user/:userId/status
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserId = req.user?.userId;
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await userService.updateUserStatus(
      String(organizationId),
      userId,
      isActive,
      String(currentUserId)
    );

    // レスポンスデータをcamelCaseに変換
    const responseData = {
      userId: user.user_id,
      isActive: user.is_active,
    };

    res.json({
      success: true,
      data: responseData,
      message: 'ユーザーのアクティブ状態を更新しました',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    
    if (error instanceof AppError && error.code === 'USER_NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: { code: error.code, message: error.message },
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
 * UserCSVダウンロード
 * 
 * GET /api/v1/systemManagement/user/download-csv
 * 
 * クエリパラメータ:
 * - search: 検索テキスト
 * - is_active: アクティブ状態フィルタ
 * - role_cd: ロールCDフィルタ
 */
export async function downloadUsersCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    // クエリパラメータを取得
    const { search, is_active, role_cd, ids } = req.query;

    // フィルター構築
    const filters: any = {};
    if (search) {
      filters.search = String(search);
    }
    if (is_active !== undefined) {
      filters.isActive = is_active === 'true' || is_active === '1';
    }
    if (role_cd) {
      filters.roleCd = String(role_cd);
    }

    console.log('=== CSV Download - User ===');
    console.log('Organization ID:', organizationId);
    console.log('Filters:', filters);

    // フィルタ適用してデータ取得
    const users = await userService.getUsers(String(organizationId), filters);

    // IDリストによるフィルタリング
    const idList = ids ? String(ids).split(',').filter(Boolean) : [];
    const filtered = idList.length > 0
      ? users.filter((u: any) => idList.includes(String(u.user_id)))
      : users;

    console.log('Filtered users count:', filtered.length);

    // CSVデータ生成（Service層の関数を使用）
    const csv = userService.generateCSV(filtered);

    // タイムスタンプ付きファイル名を生成 (yyyyMMddhhmmss)
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '')
      .slice(0, 14);
    const filename = `users_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM付きUTF-8
  } catch (error) {
    console.error('Download users CSV error:', error);
    next(error);
  }
}

/**
 * UserCSVアップロード
 * 
 * POST /api/v1/systemManagement/user/upload-csv
 */
export async function uploadUsersCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserId = req.user?.userId;

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
    const result = await userService.uploadUsersFromCSV(String(organizationId), csvContent, String(currentUserId), lang);

    // バリデーションエラーのチェック（HTTPステータス200でもエラーの場合がある）
    if (result.failureCount > 0 && result.errors.length > 0) {
      // エラーがある場合はメッセージを表示
      const errorMessage = result.errors[0].message;
      console.error('CSV validation error:', errorMessage);
      res.json({
        success: true,
        data: result,
        message: errorMessage,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    // 成功時はログ出力のみ
    console.log(`CSV upload successful: ${result.successCount} records created`);
    res.json({
      success: true,
      data: result,
      message: `${result.successCount}件のユーザーを登録しました`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Upload users CSV error:', error);
    next(error);
  }
}
