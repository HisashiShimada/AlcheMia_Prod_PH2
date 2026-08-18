/**
 * experimentPlanService.ts
 * 実験計画 Service 層
 *
 * @remarks
 * ビジネスロジックを担当。Repository を呼び出してデータ操作を行う。
 */

import * as experimentPlanRepository from '../repositories/experimentPlanRepository';
import type { ExperimentPlan, ExperimentPlanValues } from '../types/database';
import type {
  ExperimentPlanDto,
  GetExperimentPlansResult,
  UpsertExperimentPlanInput,
} from '../types/api';

export type { ExperimentPlanDto, GetExperimentPlansResult, UpsertExperimentPlanInput };

// ──────────────────────────────────────────────
// Service メソッド
// ──────────────────────────────────────────────

/**
 * 指定メソッドの全タスク分の実験計画を取得
 */
export async function getExperimentPlans(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<GetExperimentPlansResult> {
  const rows = await experimentPlanRepository.findByMethod(
    organizationId,
    projectId,
    methodId
  );

  const plans: ExperimentPlanDto[] = rows.map((row) => ({
    taskNo: row.task_no,
    plannedValues: row.planned_values ?? {},
    createdAt: row.create_at,
    updatedAt: row.update_at,
  }));

  return { methodId, plans };
}

/**
 * 1タスク分の実験計画を保存（UPSERT）
 *
 * @remarks
 * task_no は 1 以上であること（バリデーションは Controller 層で実施）
 */
export async function upsertExperimentPlan(
  input: UpsertExperimentPlanInput
): Promise<{ taskNo: number; savedAt: Date }> {
  const data: ExperimentPlan = {
    organization_id: input.organizationId,
    project_id: input.projectId,
    method_id: input.methodId,
    task_no: input.taskNo,
    planned_values: input.plannedValues,
    create_user_id: input.userId,
    update_user_id: input.userId,
  };

  const saved = await experimentPlanRepository.upsert(data);

  return {
    taskNo: saved.task_no,
    savedAt: saved.update_at!,
  };
}

/**
 * 指定メソッドの全タスク分の実験計画を削除
 */
export async function deleteExperimentPlans(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<{ deletedCount: number }> {
  const deletedCount = await experimentPlanRepository.deleteByMethod(
    organizationId,
    projectId,
    methodId
  );

  return { deletedCount };
}
