/**
 * 権限チェックミドルウェア
 * 
 * @description
 * JWTトークンに含まれる権限情報（function_cd、permission）を使用して
 * APIルートレベルで権限チェックを行うミドルウェア
 * 
 * @requirements
 * - authMiddlewareが先に実行され、req.userが設定されていること
 * - JwtPayloadにpermissions配列が含まれていること
 * 
 * @example
 * ```typescript
 * router.put(
 *   '/path',
 *   authMiddleware,
 *   checkPermission('050000', 1),  // 実験作業者メニュー、書き込み権限
 *   controller.action
 * );
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { Permission } from '../types/auth';

/**
 * 権限ペアの型定義
 * 
 * @description
 * 機能CD（function_cd）と権限レベル（permission）のペア
 * checkPermissionPairs関数で使用
 */
export interface PermissionPair {
  functionId: string;
  permission: number;
}

/**
 * 指定された機能へのアクセス権限をチェックするミドルウェア
 * 
 * @param requiredFunctionId - 必要な機能CD（function_cd）
 * @param requiredPermission - 必要な権限レベル（0=読み取り専用, 1=書き込み可（読み取り含む））
 * @returns ミドルウェア関数
 * 
 * @description
 * - authMiddlewareで設定されたreq.userから権限情報を取得
 * - 指定された機能CDと権限レベルをチェック
 * - 権限がない、または不足している場合は403エラーを返却
 * 
 * @throws 401 - 認証が必要（req.userが存在しない）
 * @throws 403 - 権限不足（機能CDがない、または権限レベルが不足）
 */
export function checkPermission(
  requiredFunctionId: string,
  requiredPermission: number = 1
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 権限配列から該当機能を検索
    const userPermission = req.user!.permissions.find(
      (p: Permission) => p.functionId === requiredFunctionId
    );

    // 権限が存在しない場合
    if (!userPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'E5012',
          message: `機能へのアクセス権限がありません（機能CD: ${requiredFunctionId}）`
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 権限レベルが不足している場合
    if (userPermission.permission < requiredPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'E5015',
          message: `必要な権限レベルが不足しています（必要: ${requiredPermission}, 所有: ${userPermission.permission}）`
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 権限チェックOK - 次のミドルウェアへ
    next();
  };
}

/**
 * 複数の(functionId, permission)ペアのいずれかをチェック（OR条件）
 * 
 * @param permissionPairs - チェック対象の権限ペア配列
 * @returns ミドルウェア関数
 * 
 * @description
 * - 各ペアに対して異なる権限レベルを指定可能
 * - いずれか1つのペアにマッチすれば権限チェックOK
 * - 全てのペアにマッチしない場合は403エラーを返却
 * 
 * @example
 * ```typescript
 * // (050000, 1) OR (040000, 0) のいずれかがあればOK
 * router.put(
 *   '/path',
 *   authMiddleware,
 *   checkPermissionPairs([
 *     { functionId: '050000', permission: 1 },  // 実験作業者メニュー、書き込み権限
 *     { functionId: '040000', permission: 0 }   // 実験管理者メニュー、読み取り専用
 *   ]),
 *   controller.action
 * );
 * ```
 * 
 * @throws 401 - 認証が必要（req.userが存在しない）
 * @throws 403 - 権限不足（全てのペアに対して権限がない）
 */
export function checkPermissionPairs(
  permissionPairs: PermissionPair[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // いずれかのペアにマッチするかチェック
    const hasPermission = permissionPairs.some(pair => {
      const userPermission = req.user!.permissions.find(
        (p: Permission) => p.functionId === pair.functionId
      );
      return userPermission && userPermission.permission >= pair.permission;
    });

    if (!hasPermission) {
      // エラーメッセージ用のペア表記を作成
      const pairDescriptions = permissionPairs.map(
        p => `(機能CD: ${p.functionId}, 権限レベル: ${p.permission})`
      ).join(' OR ');
      
      res.status(403).json({
        success: false,
        error: {
          code: 'E5012',
          message: `必要な権限がありません（必要な権限: ${pairDescriptions}）`
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 権限チェックOK - 次のミドルウェアへ
    next();
  };
}

/**
 * 複数の機能CDのいずれかへのアクセス権限をチェック（OR条件）
 * 
 * @param functionIds - チェック対象の機能CD配列
 * @param requiredPermission - 必要な権限レベル
 * @returns ミドルウェア関数
 * 
 * @description
 * - 複数の機能CDのうち、いずれか1つでも権限があればアクセスを許可
 * - 全ての機能CDに対して権限がない場合は403エラーを返却
 * 
 * @example
 * ```typescript
 * // 実験管理者メニューまたは実験作業者メニューのいずれかがあればOK
 * router.get(
 *   '/path',
 *   authMiddleware,
 *   checkAnyPermission(['040000', '050000'], 1),
 *   controller.action
 * );
 * ```
 * 
 * @throws 401 - 認証が必要（req.userが存在しない）
 * @throws 403 - 権限不足（全ての機能CDに対して権限がない）
 */
export function checkAnyPermission(
  functionIds: string[],
  requiredPermission: number = 1
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // いずれかの機能CDに対して権限があるかチェック
    const hasPermission = functionIds.some(functionId => {
      const userPermission = req.user!.permissions.find(
        (p: Permission) => p.functionId === functionId
      );
      return userPermission && userPermission.permission >= requiredPermission;
    });

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'E5012',
          message: `必要な権限がありません（機能CD: ${functionIds.join(', ')}）`
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 権限チェックOK - 次のミドルウェアへ
    next();
  };
}
