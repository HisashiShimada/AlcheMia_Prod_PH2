/**
 * システム概要コントローラー
 *
 * GET /api/v1/systemManagement/system-overview
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSystemOverview } from '../services/systemOverviewService';
import { logError } from '../utils/logger';

/**
 * システム概要統計取得
 *
 * GET /api/v1/systemManagement/system-overview
 */
export async function getOverview(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const organizationId = req.organizationId!;

    const data = await getSystemOverview(organizationId);

    res.status(200).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    logError('System overview fetch failed', error as Error, {
      action: 'get_system_overview',
      organizationId: req.organizationId,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'E4001',
        message: 'システム概要情報の取得に失敗しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
