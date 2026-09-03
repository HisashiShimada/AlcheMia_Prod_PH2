/**
 * experimentPlanService.ts
 * 実験計画 Service 層
 */

import { getPool } from '../database/db';
import * as experimentPlanRepository from '../repositories/experimentPlanRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import * as experimentInstructionDetailRepository from '../repositories/experimentInstructionDetailRepository';
import { logger } from '../utils/logger';
import type { ExperimentPlan, ExperimentPlanValues } from '../types/database';
import type {
  ExperimentPlanDto,
  GetExperimentPlansResult,
  UpsertExperimentPlanInput,
  TemplateDef,
} from '../types/api';

export type { ExperimentPlanDto, GetExperimentPlansResult, UpsertExperimentPlanInput };

const RESERVED_KEYS = new Set(['__task__', '__meta__', '__uncertainty__']);

function buildInstructionDetailRows(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  plannedValues: ExperimentPlanValues,
  templates: TemplateDef[],
  userId: string
): Array<{
  organizationId: string; projectId: string; methodId: string; taskNo: number;
  transitionId: string; templateName: string; propKey: string;
  xsiType: string | null; expectedValue: string | null; userId: string;
}> {
  const fieldKeyMap = new Map<string, { templateName: string; xsiType: string | null }>();
  for (const tmpl of templates) {
    for (const field of tmpl.fields) {
      const xsiType = field.xsiType ?? null;
      fieldKeyMap.set(`${tmpl.id}_${field.key}`, { templateName: tmpl.label, xsiType });
      if (!fieldKeyMap.has(field.key)) {
        fieldKeyMap.set(field.key, { templateName: tmpl.label, xsiType });
      }
    }
  }

  const rows: ReturnType<typeof buildInstructionDetailRows> = [];

  for (const [transitionId, fieldMap] of Object.entries(plannedValues)) {
    if (transitionId === '__meta__') continue;
    if (!fieldMap || typeof fieldMap !== 'object') continue;

    for (const [fieldKey, value] of Object.entries(fieldMap as Record<string, unknown>)) {
      if (RESERVED_KEYS.has(fieldKey)) continue;
      if (value === null || value === undefined) continue;
      if (typeof value !== 'string' && typeof value !== 'number') continue;

      const meta = fieldKeyMap.get(fieldKey);
      if (!meta) continue;

      const propKey = fieldKey.includes('_')
        ? fieldKey.slice(fieldKey.indexOf('_') + 1)
        : fieldKey;

      rows.push({
        organizationId, projectId, methodId, taskNo, transitionId,
        templateName: meta.templateName, propKey,
        xsiType: meta.xsiType, expectedValue: String(value), userId,
      });
    }
  }

  return rows;
}


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
 * input.templates が指定されている場合は、planned_values を展開して
 * experiment_instruction_detail にも UPSERT する。
 */
export async function upsertExperimentPlan(
  input: UpsertExperimentPlanInput
): Promise<{ taskNo: number; savedAt: Date }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. experiment_plan テーブルへ UPSERT（既存処理）
    const planData: ExperimentPlan = {
      organization_id: input.organizationId,
      project_id: input.projectId,
      method_id: input.methodId,
      task_no: input.taskNo,
      planned_values: input.plannedValues,
      create_user_id: input.userId,
      update_user_id: input.userId,
    };
    const saved = await experimentPlanRepository.upsert(planData);

    // 2. experiment_instruction_detail テーブルへ UPSERT（新規追加）
    if (input.templates && input.templates.length > 0) {
      try {
        const detailRows = buildInstructionDetailRows(
          input.organizationId,
          input.projectId,
          input.methodId,
          input.taskNo,
          input.plannedValues,
          input.templates,
          input.userId
        );
        if (detailRows.length > 0) {
          await experimentInstructionDetailRepository.upsertFromPlan(client, detailRows);
          logger.info('[experimentPlanService] instruction_detail upsert 完了', {
            organizationId: input.organizationId,
            projectId: input.projectId,
            methodId: input.methodId,
            taskNo: input.taskNo,
            rowCount: detailRows.length,
          });
        }
      } catch (detailErr) {
        // instruction_detail の upsert 失敗は主処理に影響させない（ログのみ）
        logger.warn('[experimentPlanService] instruction_detail upsert 失敗（スキップ）', {
          error: String(detailErr),
          organizationId: input.organizationId,
        });
      }
    }

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

    await client.query('COMMIT');
    return { taskNo: saved.task_no, savedAt: saved.update_at! };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
