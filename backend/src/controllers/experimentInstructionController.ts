/**
 * 実験指示コントローラー
 *
 * @remarks
 * エンドポイント:
 *   GET  /api/v1/projects/:projectId/experiment-instructions
 *   GET  /api/v1/projects/:projectId/methods
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng
 *   GET  /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data  ※MAIMLパース実装まで暫定
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
// getPlanDialogData（MAIMLパース実装まで暫定）
// ──────────────────────────────────────────────

/** MAIML パース実装まで使用する暫定ダイアログデータ */
const MOCK_DIALOG_DATA: Record<string, object> = {
  'method_SampleSynthesis_a1b2c3d4': {
    transitions: [
      { id: 'transition-1781057805603', name: '混合' },
      { id: 'transition-1781057812456', name: '加熱' },
    ],
    templates: [
      {
        id: 'Condition-Template-Mixing',
        label: 'Condition-Template-Mixing',
        category: 'condition',
        fields: [
          { key: 'ns1:Temperature',   label: '温度',     type: 'number', units: '℃',  required: true },
          { key: 'ns1:Pressure',      label: '圧力',     type: 'number', units: 'atm'                },
          { key: 'ns1:StirringSpeed', label: '撹拌速度', type: 'number', units: 'rpm'                },
        ],
      },
      {
        id: 'Result-Template-Yield',
        label: 'Result-Template-Yield',
        category: 'result',
        fields: [
          { key: 'ns1:Yield',  label: '収率',   type: 'number', units: '%',  required: true },
          { key: 'ns1:Purity', label: '純度',   type: 'number', units: '%'                  },
        ],
      },
      {
        id: 'Condition-Template-Heating',
        label: 'Condition-Template-Heating',
        category: 'condition',
        fields: [
          { key: 'ns1:Temperature', label: '温度',     type: 'number', units: '℃',  required: true },
          { key: 'ns1:HeatingTime', label: '加熱時間', type: 'number', units: 'min'                 },
        ],
      },
    ],
    creatorRefs:    ['creator_001', 'creator_002', 'creator_003'],
    instrumentRefs: ['instrument_001', 'instrument_002'],
    ownerRefs:      ['owner_001', 'owner_002'],
  },
  'method_SampleSynthesis_e5f6a7b8': {
    transitions: [
      { id: 'transition-1781057819834', name: '遠心分離' },
    ],
    templates: [
      {
        id: 'Condition-Template-Centrifuge',
        label: 'Condition-Template-Centrifuge',
        category: 'condition',
        fields: [
          { key: 'ns1:RotationSpeed', label: '回転数',   type: 'number', units: 'rpm', required: true },
          { key: 'ns1:Duration',      label: '処理時間', type: 'number', units: 'min'                 },
        ],
      },
      {
        id: 'Material-Template-Solvent',
        label: 'Material-Template-Solvent',
        category: 'material',
        fields: [
          { key: 'ns1:SolventName', label: '溶媒', type: 'select', options: ['EtOH', 'MeOH', 'H2O', 'Acetone'] },
        ],
      },
    ],
    creatorRefs:    ['creator_001', 'creator_002'],
    instrumentRefs: ['instrument_003'],
    ownerRefs:      ['owner_001'],
  },
};

const DEFAULT_DIALOG_DATA = {
  transitions: [],
  templates: [],
  creatorRefs:    ['creator_001', 'creator_002'],
  instrumentRefs: ['instrument_001'],
  ownerRefs:      ['owner_001'],
};

/**
 * ExperimentPlanDialog 用データ取得（MAIMLパース実装まで暫定）
 * GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 *
 * @remarks
 * Phase 4 のチェックアウト処理拡張完了後、MAIML パース結果から取得するよう差し替える。
 */
export async function getPlanDialogData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const { projectId, methodId } = req.params;

    logger.info('[experimentInstruction] getPlanDialogData (暫定)', {
      organizationId,
      projectId,
      methodId,
    });

    const data = MOCK_DIALOG_DATA[methodId] ?? DEFAULT_DIALOG_DATA;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
