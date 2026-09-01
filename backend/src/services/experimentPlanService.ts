/**
 * experimentPlanService.ts
 * 実験計画 Service 層
 *
 * @remarks
 * ビジネスロジックを担当。Repository を呼び出してデータ操作を行う。
 */

import * as experimentPlanRepository from '../repositories/experimentPlanRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { logger } from '../utils/logger';
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
 * 保存後、plannedValues.__meta__.transitionOrder に prerequisiteTransitionIds が含まれる場合は
 * transition_data.prerequisite_transition_ids を同期更新する。
 * これにより、チェックアウト時の updateStatusForCheckout.sql が正しく前提あり/なしを判定できる。
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

  // __meta__.transitionOrder から prerequisiteTransitionIds を抽出して
  // transition_data.prerequisite_transition_ids を同期更新する
  const meta = (input.plannedValues as Record<string, unknown>)['__meta__'];
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const metaObj = meta as Record<string, unknown>;
    if (Array.isArray(metaObj['transitionOrder'])) {
      const transitionDataRepository = new TransitionDataRepository();
      for (const item of metaObj['transitionOrder'] as Record<string, unknown>[]) {
        if (typeof item['id'] !== 'string') continue;
        const transitionId = item['id'] as string;
        const prerequisiteTransitionIds: string[] = Array.isArray(item['prerequisiteTransitionIds'])
          ? (item['prerequisiteTransitionIds'] as unknown[]).filter((v): v is string => typeof v === 'string')
          : [];
        try {
          await transitionDataRepository.updatePrerequisiteIds(
            input.organizationId,
            input.projectId,
            input.methodId,
            transitionId,
            prerequisiteTransitionIds,
            input.userId
          );
        } catch (err) {
          // transition_data が未登録（タスク未登録）の場合は UPDATE 0件で正常終了する。
          // それ以外のエラーはログに警告として残し、実験計画の保存処理は継続する。
          logger.warn('[experimentPlanService] transition_data prerequisite 同期失敗（続行）', {
            transitionId,
            error: String(err),
          });
        }
      }
    }
  }

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
