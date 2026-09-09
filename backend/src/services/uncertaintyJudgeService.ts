/**
 * UncertaintyJudgeService
 *
 * WorkRecordPanel での Uncertainty Value 保存時の判定オーケストレーション。
 * uncertainty_criteria から tolerance を取得 → judgeUncertainty 実行 → INSERT
 *
 * @module uncertaintyJudgeService
 */

import { findForSelector } from '../repositories/uncertaintyCriteriaRepository';
import {
  ExperimentUncertaintyJudgeRepository,
  InsertUncertaintyJudgeRequest,
  ExperimentUncertaintyJudgeRow,
} from '../repositories/experimentUncertaintyJudgeRepository';
import { judgeUncertainty } from '../utils/uncertaintyJudge';

/**
 * 不確かさ判定実行リクエストの1件分
 */
export interface UncertaintyValueInput {
  /** プロパティKey（template_data の property key） */
  propertyKey: string;
  /** Template ID（MAIMLの template.id） */
  templateId: string;
  /** 不確かさ基準Key */
  uncertaintyKey: string;
  /** 作業者が入力した不確かさ値 */
  value: number;
}

/**
 * 不確かさ判定実行結果の1件分（API レスポンス用）
 */
export interface UncertaintyJudgeResult {
  propertyKey: string;
  templateId: string;
  uncertaintyKey: string;
  recordedValue: number;
  judgeResult: '良好' | '不良';
  toleranceUpper: number | null;
  toleranceLower: number | null;
}

/**
 * プロジェクトの判定結果サマリーを取得する
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns 総件数・良好件数・不良件数・良好率・不良率
 */
export async function getJudgeSummaryByProject(
  organizationId: string,
  projectId: string
): Promise<{ total: number; good: number; bad: number; goodRate: number; badRate: number }> {
  const repo = new ExperimentUncertaintyJudgeRepository();
  const counts = await repo.findSummaryByProject(organizationId, projectId);
  const total = counts.total;
  const goodRate = total > 0 ? Math.round((counts.good / total) * 1000) / 10 : 0;
  const badRate  = total > 0 ? Math.round((counts.bad  / total) * 1000) / 10 : 0;
  return {
    total,
    good:     counts.good,
    bad:      counts.bad,
    goodRate,
    badRate,
  };
}

/**
 * 不確かさ判定を実行して結果を保存する
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param methodId - メソッドID
 * @param taskNo - タスク番号
 * @param transitionId - トランジションID（is_recorded と紐づける）
 * @param uncertaintyValues - 判定対象の入力値一覧
 * @param createdBy - 記録者ユーザID
 * @returns 判定結果一覧（tolerance が未設定の場合はスキップ）
 */
export async function runJudge(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  transitionId: string,
  uncertaintyValues: UncertaintyValueInput[],
  createdBy: string
): Promise<UncertaintyJudgeResult[]> {
  if (uncertaintyValues.length === 0) return [];

  // 使用する不確かさ基準の一覧を取得（最新有効バージョン）
  const allCriteria = await findForSelector(organizationId);

  const repo = new ExperimentUncertaintyJudgeRepository();
  const results: UncertaintyJudgeResult[] = [];

  for (const input of uncertaintyValues) {
    // uncertainty_key に対応する基準を探す（最新有効 = findForSelector の先頭）
    const criteria = allCriteria.find(
      (c) => c.uncertaintyKey === input.uncertaintyKey
    );

    // tolerance が設定されていない場合は判定スキップ
    if (
      !criteria ||
      criteria.toleranceUpper === null ||
      criteria.toleranceUpper === undefined ||
      criteria.toleranceLower === null ||
      criteria.toleranceLower === undefined
    ) {
      continue;
    }

    const judgeResultValue = judgeUncertainty(
      input.value,
      criteria.toleranceUpper,
      criteria.toleranceLower
    );

    const insertReq: InsertUncertaintyJudgeRequest = {
      organizationId,
      projectId,
      methodId,
      taskNo,
      transitionId,
      templateId:         input.templateId,
      propertyKey:        input.propertyKey,
      uncertaintyKey:     input.uncertaintyKey,
      uncertaintyVersion: criteria.version,
      toleranceUpper:     criteria.toleranceUpper,
      toleranceLower:     criteria.toleranceLower,
      recordedValue:      input.value,
      judgeResult:        judgeResultValue,
      createUserId:       createdBy,
    };

    await repo.insert(insertReq);

    results.push({
      propertyKey:    input.propertyKey,
      templateId:     input.templateId,
      uncertaintyKey: input.uncertaintyKey,
      recordedValue:  input.value,
      judgeResult:    judgeResultValue,
      toleranceUpper: criteria.toleranceUpper,
      toleranceLower: criteria.toleranceLower,
    });
  }

  return results;
}
