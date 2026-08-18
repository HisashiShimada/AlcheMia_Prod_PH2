/**
 * 実験指示コントローラー
 *
 * @remarks
 * エンドポイント:
 *   GET  /api/v1/projects/:projectId/experiment-instructions
 *   GET  /api/v1/projects/:projectId/methods
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng
 *   GET  /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import * as experimentInstructionService from '../services/experimentInstructionService';

// ──────────────────────────────────────────────
// ハンドラ
// ──────────────────────────────────────────────

/**
 * 実験指示一覧取得（ネスト形式）
 * GET /api/v1/projects/:projectId/experiment-instructions
 */
export async function getExperimentInstructions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const { projectId } = req.params;

    logger.info('[experimentInstruction] getExperimentInstructions', {
      organizationId,
      projectId,
    });

    const result = await experimentInstructionService.getExperimentInstructions(
      organizationId,
      projectId
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * プロジェクトのメソッドID一覧取得
 * GET /api/v1/projects/:projectId/methods
 */
export async function getProjectMethods(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const { projectId } = req.params;

    logger.info('[experimentInstruction] getProjectMethods', {
      organizationId,
      projectId,
    });

    const methods = await experimentInstructionService.getProjectMethods(
      organizationId,
      projectId
    );

    res.json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
}

/**
 * タスク承認
 * PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve
 */
export async function approveTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId, userId } = req.user!;
    const { projectId, methodId, taskNo: taskNoStr } = req.params;

    logger.info('[experimentInstruction] approveTask', {
      organizationId,
      projectId,
      methodId,
      taskNo: taskNoStr,
    });

    const taskNo = parseInt(taskNoStr, 10);

    const result = await experimentInstructionService.approveTask(
      organizationId,
      projectId,
      methodId,
      taskNo,
      userId
    );

    if (!result) {
      // task_status=4 でないか、レコードが存在しない
      res.status(409).json({
        success: false,
        error: {
          code: 'E7005',
          message: '対象タスクが承認可能な状態（レビュー待ち）ではありません',
        },
      });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * タスク NG 記録
 * PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng
 */
export async function recordNg(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId, userId } = req.user!;
    const { projectId, methodId, taskNo: taskNoStr } = req.params;
    const { ngReason } = req.body as { ngReason?: string };

    logger.info('[experimentInstruction] recordNg', {
      organizationId,
      projectId,
      methodId,
      taskNo: taskNoStr,
    });

    const taskNo = parseInt(taskNoStr, 10);

    const result = await experimentInstructionService.recordNg(
      organizationId,
      projectId,
      methodId,
      taskNo,
      userId,
      (ngReason ?? '').trim()
    );

    if (!result) {
      res.status(409).json({
        success: false,
        error: {
          code: 'E7005',
          message: '対象タスクが NG 記録可能な状態（レビュー待ち）ではありません',
        },
      });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────
// getPlanDialogData
// ──────────────────────────────────────────────

/**
 * ExperimentPlanDialog 用データ取得
 * GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 *
 * @remarks
 * MAIMLファイルをパースして、指定メソッドの
 * トランジション一覧・テンプレート定義・Ref選択肢を返す。
 *
 * - MAIMLファイルが存在しない場合: 404 (E6002)
 * - 指定メソッドIDがMAIMLに存在しない場合: 404 (E6001)
 */
export async function getPlanDialogData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const { projectId, methodId } = req.params;

    logger.info('[experimentInstruction] getPlanDialogData', {
      organizationId,
      projectId,
      methodId,
    });

    const data = await experimentInstructionService.getPlanDialogDataFromMaiml(
      organizationId,
      projectId,
      methodId
    );

    res.json({ success: true, data });
  } catch (error: any) {
    // E6001 / E6002 はハンドラで直接返す
    if (error?.code === 'E6002') {
      res.status(404).json({
        success: false,
        error: { code: 'E6002', message: error.message },
      });
      return;
    }
    if (error?.code === 'E6001') {
      res.status(404).json({
        success: false,
        error: { code: 'E6001', message: error.message },
      });
      return;
    }
    next(error);
  }
}
