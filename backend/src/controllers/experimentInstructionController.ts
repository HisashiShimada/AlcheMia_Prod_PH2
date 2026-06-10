/**
 * 実験指示コントローラー（モックデータ返却）
 *
 * @remarks
 * 現時点はモックデータを直接返却する。
 * 後日 Repository/Service 層を実装した後、モックデータを実DB取得に差し替える。
 *
 * エンドポイント:
 *   GET  /api/v1/projects/:projectId/experiment-instructions
 *   GET  /api/v1/projects/:projectId/methods
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ──────────────────────────────────────────────
// モックデータ定数
// ──────────────────────────────────────────────

const MOCK_METHODS = [
  { id: 'method_SampleSynthesis_a1b2c3d4', name: '合成プロセスA' },
  { id: 'method_SampleSynthesis_e5f6a7b8', name: '分離プロセスB' },
];

const MOCK_INSTRUCTIONS = [
  // ── タスク1（完了済み）── method_SampleSynthesis_a1b2c3d4
  {
    methodId: 'method_SampleSynthesis_a1b2c3d4',
    methodName: '合成プロセスA',
    taskNumber: 1,
    taskStatus: '05', // COMPLETED
    transitionId: 'transition-1781057805603',
    transitionName: '混合',
    templateName: 'Condition-Template-Mixing',
    properties: [
      { key: 'ns1:Temperature',   label: '温度',     xsiType: 'FloatValue',   expected: 25.0,   actual: 24.8,   unit: '℃'  },
      { key: 'ns1:Pressure',      label: '圧力',     xsiType: 'FloatValue',   expected: 1.013,  actual: 1.02,   unit: 'atm' },
      { key: 'ns1:StirringSpeed', label: '撹拌速度', xsiType: 'IntegerValue', expected: 300,    actual: 295,    unit: 'rpm' },
    ],
  },
  {
    methodId: 'method_SampleSynthesis_a1b2c3d4',
    methodName: '合成プロセスA',
    taskNumber: 1,
    taskStatus: '05',
    transitionId: 'transition-1781057805603',
    transitionName: '混合',
    templateName: 'Result-Template-Yield',
    properties: [
      { key: 'ns1:Yield',  label: '収率',  xsiType: 'FloatValue', expected: 90.0, actual: 88.5, unit: '%' },
      { key: 'ns1:Purity', label: '純度',  xsiType: 'FloatValue', expected: 99.5, actual: 99.1, unit: '%' },
    ],
  },
  {
    methodId: 'method_SampleSynthesis_a1b2c3d4',
    methodName: '合成プロセスA',
    taskNumber: 1,
    taskStatus: '05',
    transitionId: 'transition-1781057812047',
    transitionName: '加熱',
    templateName: 'Condition-Template-Heating',
    properties: [
      { key: 'ns1:Temperature', label: '温度',     xsiType: 'FloatValue',   expected: 80.0, actual: 79.5, unit: '℃'  },
      { key: 'ns1:HeatingTime', label: '加熱時間', xsiType: 'IntegerValue', expected: 30,   actual: 31,   unit: 'min' },
    ],
  },
  // ── タスク2（レビュー待ち）── method_SampleSynthesis_a1b2c3d4
  {
    methodId: 'method_SampleSynthesis_a1b2c3d4',
    methodName: '合成プロセスA',
    taskNumber: 2,
    taskStatus: '04', // REVIEW_WAITING
    transitionId: 'transition-1781057805603',
    transitionName: '混合',
    templateName: 'Condition-Template-Mixing',
    properties: [
      { key: 'ns1:Temperature',   label: '温度',     xsiType: 'FloatValue',   expected: 25.0,  actual: 25.3,  unit: '℃'  },
      { key: 'ns1:Pressure',      label: '圧力',     xsiType: 'FloatValue',   expected: 1.013, actual: 0.98,  unit: 'atm' },
      { key: 'ns1:StirringSpeed', label: '撹拌速度', xsiType: 'IntegerValue', expected: 300,   actual: 310,   unit: 'rpm' },
    ],
  },
  {
    methodId: 'method_SampleSynthesis_a1b2c3d4',
    methodName: '合成プロセスA',
    taskNumber: 2,
    taskStatus: '04',
    transitionId: 'transition-1781057805603',
    transitionName: '混合',
    templateName: 'Result-Template-Yield',
    properties: [
      { key: 'ns1:Yield',  label: '収率', xsiType: 'FloatValue', expected: 90.0, actual: 91.2, unit: '%' },
      { key: 'ns1:Purity', label: '純度', xsiType: 'FloatValue', expected: 99.5, actual: 99.6, unit: '%' },
    ],
  },
  // ── タスク3（実行中）── method_SampleSynthesis_e5f6a7b8
  {
    methodId: 'method_SampleSynthesis_e5f6a7b8',
    methodName: '分離プロセスB',
    taskNumber: 3,
    taskStatus: '02', // IN_PROGRESS
    transitionId: 'transition-1781057819834',
    transitionName: '遠心分離',
    templateName: 'Condition-Template-Centrifuge',
    properties: [
      { key: 'ns1:RotationSpeed', label: '回転数',     xsiType: 'IntegerValue', expected: 3000,   actual: null,   unit: 'rpm' },
      { key: 'ns1:Duration',      label: '処理時間',   xsiType: 'IntegerValue', expected: 10,     actual: null,   unit: 'min' },
    ],
  },
  {
    methodId: 'method_SampleSynthesis_e5f6a7b8',
    methodName: '分離プロセスB',
    taskNumber: 3,
    taskStatus: '02',
    transitionId: 'transition-1781057819834',
    transitionName: '遠心分離',
    templateName: 'Material-Template-Solvent',
    properties: [
      { key: 'ns1:SolventName', label: '溶媒', xsiType: 'StringValue', expected: 'EtOH', actual: null, unit: '' },
    ],
  },
];

// ──────────────────────────────────────────────
// ハンドラ
// ──────────────────────────────────────────────

/**
 * 実験指示一覧取得
 * GET /api/v1/projects/:projectId/experiment-instructions
 *
 * @remarks モックデータを返却。後日 template_data テーブルから取得するよう差し替える。
 */
export async function getExperimentInstructions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;

    logger.info('[experimentInstruction] getExperimentInstructions (mock)', { projectId });

    res.json({
      success: true,
      data: MOCK_INSTRUCTIONS,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * プロジェクトのメソッドID一覧取得
 * GET /api/v1/projects/:projectId/methods
 *
 * @remarks モックデータを返却。後日 MAIML/project_task テーブルから取得するよう差し替える。
 */
export async function getProjectMethods(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;

    logger.info('[experimentInstruction] getProjectMethods (mock)', { projectId });

    res.json({
      success: true,
      data: MOCK_METHODS,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * タスク承認
 * PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve
 *
 * @remarks 現時点は成功レスポンスのみ返却（DB更新なし）。後日 Service 層を実装して差し替える。
 */
export async function approveTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, methodId, taskNumber } = req.params;

    logger.info('[experimentInstruction] approveTask (mock)', { projectId, methodId, taskNumber });

    res.json({
      success: true,
      message: `タスク #${taskNumber} を承認しました（モック）`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * タスク NG 記録
 * PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng
 *
 * @remarks 現時点は成功レスポンスのみ返却（DB更新なし）。後日 Service 層を実装して差し替える。
 */
export async function recordNg(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, methodId, taskNumber } = req.params;
    const { ngReason } = req.body as { ngReason?: string };

    if (!ngReason || ngReason.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'E1003', message: 'NG理由は必須です' },
      });
      return;
    }

    logger.info('[experimentInstruction] recordNg (mock)', { projectId, methodId, taskNumber, ngReason });

    res.json({
      success: true,
      message: `タスク #${taskNumber} の NG を記録しました（モック）`,
    });
  } catch (error) {
    next(error);
  }
}
