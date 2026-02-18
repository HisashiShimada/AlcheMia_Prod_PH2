/**
 * ExperimentController
 * 
 * @description 実験管理関連のリクエスト処理
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as experimentDataService from '../services/experimentDataService';
import { TemplateDataRecord } from '../repositories/templateDataRepository';

/**
 * @deprecated このエンドポイントは progressRoutes.ts に移動しました
 * 
 * トランジションの状態を更新する（廃止予定）
 * 
 * 旧エンドポイント: PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * 新エンドポイント: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 * 
 * 移動先: progressController.updateTransitionStatus
 * 移動日: 2026-02-18
 * 参照: docs/20260218_1730_トランジションステータス更新API移動_PLAN.md
 * API仕様: docs/design/api/api_progress_monitoring.md - API #6
 * 
 * @route PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * @group Experiments - 実験管理（廃止予定）
 * @security JWT
 */
export const updateTransitionStatus = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // この関数は使用されていません。progressController.updateTransitionStatusを使用してください。
  res.status(410).json({
    success: false,
    error: {
      code: 'ENDPOINT_DEPRECATED',
      message: 'このエンドポイントは廃止されました。新しいエンドポイントを使用してください。',
      details: {
        deprecated_endpoint: 'PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status',
        new_endpoint: 'PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status',
        migration_guide: 'docs/20260218_1730_トランジションステータス更新API移動_PLAN.md'
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
    },
  });
};

/**
 * 実験データ一括保存
 * 
 * @route POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
 * @group Experiments - 実験管理
 * @param {string} projectId.path.required - プロジェクトID (UUID)
 * @param {string} methodId.path.required - メソッドID
 * @param {number} taskNo.path.required - タスク番号
 * @param {TemplateDataRecord[]} records.body.required - 保存するレコード配列
 * @returns {Object} 201 - 保存されたレコード情報
 * @returns {Error} 400 - バリデーションエラー
 * @returns {Error} 403 - プロジェクトが編集不可
 * @returns {Error} 404 - タスクが見つからない
 * @returns {Error} 500 - サーバーエラー
 * @security JWT
 */
export const saveBatchData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // パスパラメータの抽出
    const { projectId, methodId, taskNo } = req.params;
    const taskNoNum = parseInt(taskNo, 10);

    // リクエストボディの抽出
    const { records } = req.body as { records: TemplateDataRecord[] };

    // 認証・認可情報の取得
    const organizationId = (req as any).organizationId;
    const recordedBy = req.user?.userId || (req.user as any)?.id;

    // 必須パラメータの検証
    if (!organizationId) {
      const error: any = new Error('Organization ID is required');
      error.name = 'ValidationError';
      throw error;
    }

    if (!recordedBy) {
      const error: any = new Error('User authentication required');
      error.name = 'AuthenticationError';
      throw error;
    }

    // サービス層を呼び出して一括保存
    const savedRecords = await experimentDataService.saveBatchData(
      organizationId,
      projectId,
      methodId,
      taskNoNum,
      records,
      recordedBy
    );

    // 成功レスポンスを返す（201 Created）
    res.status(201).json({
      success: true,
      data: {
        saved: savedRecords.length,
        records: savedRecords,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
      },
    });
  } catch (error) {
    // エラーハンドリングミドルウェアに委譲
    next(error);
  }
};
