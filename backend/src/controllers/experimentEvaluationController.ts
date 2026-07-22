/**
 * experimentEvaluation Controller
 *
 * 実験評価APIエンドポイント処理
 *
 * @remarks
 * experiment_evaluation テーブルへの読み書きを提供する。
 * 承認処理ダイアログの Step1（定性評価保存）から呼び出される。
 *
 * @module experimentEvaluationController
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as experimentEvaluationRepository from '../repositories/experimentEvaluationRepository';
import type { UpsertEvaluationInput } from '../repositories/experimentEvaluationRepository';
import { getStorageService } from '../services/storageService';
import * as projectRepository from '../repositories/projectRepository';

/**
 * プロジェクトの評価結果一覧取得
 * GET /api/v1/experiment-evaluations/:projectId
 */
export async function getByProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const { projectId } = req.params;
    if (!projectId) {
      res.status(400).json({ error: { code: 'E1003', message: 'projectId は必須です' } });
      return;
    }

    const rows = await experimentEvaluationRepository.findByProject(organizationId, projectId);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * 評価結果を一括UPSERT（保存）
 * POST /api/v1/experiment-evaluations
 *
 * @remarks
 * リクエストボディ:
 * {
 *   projectId: string,
 *   evaluations: Array<{
 *     evaluationUnit: string,
 *     methodId?: string,
 *     taskNo?: number,
 *     transitionId?: string,
 *     nameSpaceId: string,
 *     uncertaintyKey: string,
 *     ucVersion: number,
 *     evaluationValue?: string,
 *     comment?: string,
 *     uncertaintyXml?: object,
 *   }>
 * }
 */
export async function saveEvaluations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    const userId = (req as any).userId as string | undefined;

    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const { projectId, evaluations } = req.body as {
      projectId: string;
      evaluations: Array<{
        evaluationUnit: string;
        methodId?: string;
        taskNo?: number;
        transitionId?: string;
        nameSpaceId: string;
        uncertaintyKey: string;
        ucVersion: number;
        evaluationValue?: string;
        comment?: string;
        uncertaintyXml?: Record<string, unknown>;
      }>;
    };

    if (!projectId) {
      res.status(400).json({ error: { code: 'E1003', message: 'projectId は必須です' } });
      return;
    }
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      res.status(400).json({ error: { code: 'E1003', message: 'evaluations は1件以上必要です' } });
      return;
    }

    const now = new Date();
    const inputs: UpsertEvaluationInput[] = evaluations.map((e) => ({
      organization_id: organizationId,
      project_id: projectId,
      evaluation_unit: e.evaluationUnit,
      method_id: e.methodId ?? null,
      task_no: e.taskNo ?? null,
      transition_id: e.transitionId ?? null,
      name_space_id: e.nameSpaceId,
      uncertainty_key: e.uncertaintyKey,
      uc_version: e.ucVersion,
      evaluation_value: e.evaluationValue ?? null,
      comment: e.comment ?? null,
      uncertainty_xml: e.uncertaintyXml ?? null,
      evaluated_by: userId ?? null,
      evaluated_at: now,
      user_id: userId ?? '',
    }));

    const saved = await experimentEvaluationRepository.upsertEvaluations(inputs);
    res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
}

/**
 * DBの評価データを MAiML ファイルへ一括書き込み（プロジェクト完了処理）
 * POST /api/v1/experiment-evaluations/:projectId/export-to-maiml
 *
 * @remarks
 * 処理フロー:
 *   1. experiment_evaluation テーブルから対象プロジェクトの全評価データを取得
 *   2. S3/Swift から既存の MAiML ファイルを読み込む
 *   3. 各評価レコードを <Uncertainty> タグ形式に変換して XML に追記/更新
 *   4. 更新済み XML を S3/Swift に保存（上書き）
 */
export async function exportToMaiml(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(401).json({ error: { code: 'E5013', message: '認証が必要です' } });
      return;
    }

    const { projectId } = req.params;
    if (!projectId) {
      res.status(400).json({ error: { code: 'E1003', message: 'projectId は必須です' } });
      return;
    }

    // 1. 評価データを全件取得
    const evaluations = await experimentEvaluationRepository.findByProject(organizationId, projectId);
    if (evaluations.length === 0) {
      // 評価データが0件でも正常終了（書き込み不要）
      res.json({ success: true, data: { written: 0, message: '評価データがないため書き込みをスキップしました' } });
      return;
    }

    // 2. プロジェクト情報からMAiMLファイルパスを解決
    //    projectId は project_name（VARCHAR）として使われるため findByName で検索する
    const project = await projectRepository.findByName(organizationId, projectId);
    if (!project) {
      res.status(404).json({ error: { code: 'E6001', message: 'プロジェクトが見つかりません' } });
      return;
    }
    const projectName = project.project_name;
    const maimlRelativePath = `projects/${projectName}/${projectName}.maiml`;

    // 3. MAiML ファイルを読み込む
    const storageService = getStorageService();
    let maimlBuffer: Buffer;
    try {
      maimlBuffer = await storageService.downloadFile(organizationId, maimlRelativePath);
    } catch (err) {
      res.status(404).json({ error: { code: 'E6002', message: 'MAiMLファイルが見つかりません' } });
      return;
    }

    let maimlXml = maimlBuffer.toString('utf-8');

    // 4. 評価データを <Uncertainty> タグに変換して XML に書き込む
    //    書き込み先: </maiml> の直前に <Uncertainties> セクションとして追記
    const uncertaintyTags = evaluations
      .filter((e) => e.evaluation_value)
      .map((e) => {
        const attrs: string = [
          `evaluationUnit="${e.evaluation_unit}"`,
          e.method_id     ? `methodId="${e.method_id}"`         : '',
          e.task_no       ? `taskNo="${e.task_no}"`             : '',
          e.transition_id ? `transitionId="${e.transition_id}"` : '',
          `nameSpaceId="${e.name_space_id}"`,
          `uncertaintyKey="${e.uncertainty_key}"`,
          `ucVersion="${e.uc_version}"`,
          `value="${e.evaluation_value}"`,
          e.evaluated_at  ? `evaluatedAt="${new Date(e.evaluated_at).toISOString()}"` : '',
        ].filter(Boolean).join(' ');

        const commentTag = e.comment
          ? `\n        <Comment>${escapeXml(e.comment)}</Comment>`
          : '';

        return `    <Uncertainty ${attrs}>${commentTag}\n    </Uncertainty>`;
      });

    if (uncertaintyTags.length > 0) {
      const uncertaintiesBlock = [
        '  <Uncertainties>',
        '    <!-- 評価処理によって書き込まれた定性評価データ -->',
        ...uncertaintyTags,
        '  </Uncertainties>',
      ].join('\n');

      // 既存の <Uncertainties> セクションがあれば置換、なければ </maiml> 直前に挿入
      if (/<Uncertainties[\s>]/i.test(maimlXml)) {
        maimlXml = maimlXml.replace(
          /<Uncertainties[\s\S]*?<\/Uncertainties>/i,
          uncertaintiesBlock
        );
      } else {
        maimlXml = maimlXml.replace(/<\/maiml>/i, `${uncertaintiesBlock}\n</maiml>`);
      }
    }

    // 5. 更新済み XML を保存（上書き）
    await storageService.uploadFile(
      organizationId,
      maimlRelativePath,
      Buffer.from(maimlXml, 'utf-8'),
      { contentType: 'application/xml' }
    );

    res.json({
      success: true,
      data: {
        written: uncertaintyTags.length,
        message: `${uncertaintyTags.length}件の評価データを MAiML ファイルに書き込みました`,
      },
    });
  } catch (error) {
    next(error);
  }
}

/** XML特殊文字エスケープ */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
