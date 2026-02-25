/**
 * 組織統計情報コントローラー
 * リクエスト処理とレスポンス返却
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as organizationStatisticsService from '../services/organizationStatisticsService';

/**
 * 組織統計情報取得
 *
 * GET /api/v1/systemManagement/organization/statistics
 */
export async function getOrganizationStatistics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // JWTミドルウェアで設定されたorganizationIdを取得
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '組織IDが取得できません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4(),
        },
      });
      return;
    }

    const statistics = await organizationStatisticsService.getOrganizationStatistics(
      organizationId
    );

    res.json({
      success: true,
      data: statistics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    console.error('Get organization statistics error:', error);
    next(error);
  }
}
