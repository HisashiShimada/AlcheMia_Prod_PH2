/**
 * テナント分離ミドルウェア
 * 
 * @description
 * マルチテナント分離を実現するミドルウェア
 * - req.userからorganization_idを抽出
 * - req.organizationIdに格納
 * 
 * @note Task 1.1: 承認依頼API用の最小実装
 */

import { Request, Response, NextFunction } from 'express';

// Request型を拡張してorganizationIdプロパティを追加
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userId?: string;
    }
  }
}

/**
 * テナント分離ミドルウェア
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @param next - 次のミドルウェアを呼び出す関数
 */
export function tenantIsolation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // authMiddlewareで設定されたreq.userからorganizationIdを取得
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ORGANIZATION_MISSING',
          message: '組織情報が見つかりません'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // req.organizationIdに格納
    req.organizationId = req.user.organizationId;

    // req.userIdに格納（コントローラーでのログインユーザー識別に使用）
    req.userId = req.user.userId;

    // 次のミドルウェアへ
    next();
  } catch (error) {
    console.error('tenantIsolation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'E4001',
        message: 'システムエラーが発生しました'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
}