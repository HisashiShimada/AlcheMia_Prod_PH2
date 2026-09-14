/**
 * ロール管理コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import * as masterService from '../services/roleService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { getNowJST } from '../utils/dateUtils';
import { getLang } from '../utils/messages';

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
 * ロールCSVダウンロード
 * 
 * GET /api/v1/master/role/download-csv
 */
export async function downloadRoleCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '組織IDが取得できません',
        },
      });
      return;
    }

    // フィルター条件を取得
    const { searchText, roleNameFilter } = req.query;

    // ロール一覧と権限情報を取得
    const roles = await masterService.getRoles(String(organizationId));

    // フィルター処理
    let filteredRoles = roles;

    // ロール名フィルター
    if (roleNameFilter && typeof roleNameFilter === 'string') {
      filteredRoles = filteredRoles.filter(
        (role) => role.roleName === roleNameFilter
      );
    }

    // 検索テキストフィルター（機能名に対して）
    if (searchText && typeof searchText === 'string') {
      const searchLower = searchText.toLowerCase();
      filteredRoles = filteredRoles.filter((role) =>
        role.functionName.toLowerCase().includes(searchLower)
      );
    }

    // CSV形式に変換（1ロール=複数行、機能ごとに行を分ける）
    const csvData = filteredRoles.flatMap((role) => {
      // 日時フォーマットを共通化
      const formattedDate = role.updatedAt
        ? new Date(role.updatedAt)
            .toLocaleString('ja-JP', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
            .replace(/\//g, '/')
        : '';

      // 機能がない場合は1行だけ出力
      if (!role.functions || role.functions.length === 0) {
        return [{
          role_cd: role.roleId,
          role_name: role.roleName,
          function_cd: '',
          permission: '',
          initial_screen_function_cd: role.initialScreenFunctionName || '',
          is_active: role.isActive,
          update_at: formattedDate,
        }];
      }
      
      // 機能ごとに行を作成
      return role.functions.map((func) => ({
        role_cd: role.roleId,
        role_name: role.roleName,
        function_cd: func.name,           // 各機能の名前
        permission: func.icon,             // 各機能のアイコン（Ⓦ or Ⓡ）
        initial_screen_function_cd: role.initialScreenFunctionName || '',
        is_active: role.isActive,
        update_at: formattedDate,
      }));
    });

    // CSV文字列生成
    const csv = Papa.unparse(csvData, {
      header: true,
      columns: [
        'role_cd',
        'role_name',
        'function_cd',
        'permission',
        'initial_screen_function_cd',
        'is_active',
        'update_at',
      ],
    });

    // UTF-8 BOM付きで返す
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    // ファイル名生成（role_yyyyMMddhhmmss.csv）
    const timestamp = getNowJST();
    const filename = `role_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvWithBom);
  } catch (error) {
    console.error('ロールCSVダウンロードエラー:', error);
    next(error);
  }
}

/**
 * ロールCSVアップロード
 * 
 * POST /api/v1/master/role/upload-csv
 */
export async function uploadRoleCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;

    if (!organizationId || !userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '組織IDまたはユーザーIDが取得できません',
        },
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'CSVファイルがアップロードされていません',
        },
      });
      return;
    }

    // CSVファイルを文字列として読み込み
    const csvContent = req.file.buffer.toString('utf-8');

    // サービス層でアップロード処理
    const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];
    await masterService.uploadRolesCsv(String(organizationId), String(userId), csvContent, lang);

    res.status(200).json({
      success: true,
      data: {
        message: 'ロールCSVのアップロードが完了しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('ロールCSVアップロードエラー:', error);
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

    // バリデーションはミドルウェアで処理済み
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { role, roleName, initialScreenFunctionName, isActive } = req.body;

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
    const lang = getLang(req);

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
      String(userId),
      lang
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
