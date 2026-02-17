/**
 * ExperimentController
 * 
 * @description 実験管理関連のリクエスト処理
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as experimentDataService from '../services/experimentDataService';
import { TransitionDataUpdate } from '../types/transitionData';
import { TemplateDataRecord } from '../repositories/templateDataRepository';

/**
 * トランジションの状態を更新する
 * 
 * @route PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * @group Experiments - 実験管理
 * @param {string} projectId.path.required - プロジェクトID
 * @param {string} methodId.path.required - メソッドID
 * @param {string} transitionId.path.required - トランジションID
 * @param {string} status.body.required - 新しいステータス
 * @param {string} comment.body.optional - コメント（maiml_event_logに格納）
 * @returns {TransitionData} 200 - 更新されたトランジションデータ
 * @returns {Error} 404 - トランジションが見つからない
 * @returns {Error} 422 - 不正なステータス遷移
 * @returns {Error} 500 - サーバーエラー
 * @security JWT
 */
export const updateTransitionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // リクエストパラメータとボディの抽出
    const { projectId, methodId, transitionId } = req.params;
    const { taskNo: _taskNo, status, progressRate, comment: _comment } = req.body;

    // 認証・認可情報の取得
    const organizationId = (req as any).organizationId;
    const updatedBy = req.user?.userId || (req.user as any)?.id;

    // 必須パラメータの検証
    if (!organizationId) {
      const error: any = new Error('Organization ID is required');
      error.name = 'ValidationError';
      throw error;
    }

    if (!updatedBy) {
      const error: any = new Error('User authentication required');
      error.name = 'AuthenticationError';
      throw error;
    }

    // ステータス更新パラメータの作成
    const updateData: TransitionDataUpdate = {
      status,
      updated_by: updatedBy,
      ...(progressRate !== undefined && { progress_rate: progressRate }),
    };

    // TODO: _taskNo、_commentはmaiml_event_logテーブルに格納する処理を実装予定
    // 現在はリクエストボディから受け取るのみ（バリデーション済み）

    // サービス層を呼び出してステータス更新
    const updatedTransitionData = await experimentDataService.updateStatus(
      organizationId,
      projectId,
      methodId,
      transitionId,
      updateData
    );

    // 成功レスポンスを返す
    res.status(200).json({
      success: true,
      data: updatedTransitionData,
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
