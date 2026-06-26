/**
 * experimentInstructionService.ts
 * 実験指示 Service 層
 *
 * @remarks
 * - getExperimentInstructions: template_data + project_task_detail を結合し
 *   ネスト形式（methods → tasks → templates）で返す
 * - getProjectMethods: project_task の distinct method_id 一覧を返す
 * - approveTask: task_status=2（レビュー待ち）→ 3（完了）に更新
 * - recordNg: task_status=2（レビュー待ち）→ 5（NG）に更新
 */

import { getPool } from '../database/db';
import { logger } from '../utils/logger';
import { TemplateDataRepository } from '../repositories/templateDataRepository';
import type { TemplateDataRow } from '../repositories/templateDataRepository';
import * as projectTaskDetailRepo from '../repositories/projectTaskDetailRepository';
import type { ProjectTaskDetail } from '../types/database';
import type {
  InstructionField,
  InstructionTemplate,
  InstructionTask,
  InstructionMethod,
  ExperimentInstructionsResult,
  ProjectMethod,
  TaskReviewResult,
} from '../types/api';

export type {
  InstructionField,
  InstructionTemplate,
  InstructionTask,
  InstructionMethod,
  ExperimentInstructionsResult,
  ProjectMethod,
  TaskReviewResult,
};

// ──────────────────────────────────────────────
// 内部ユーティリティ
// ──────────────────────────────────────────────

/** property の content.value を安全に取り出す */
function extractActualValue(prop: any): string | null {
  if (!prop || !prop.content) return null;
  const content = prop.content;
  if (typeof content === 'object') {
    return content.value != null ? String(content.value) : null;
  }
  return null;
}

/** property の units を安全に取り出す */
function extractUnit(prop: any): string | null {
  if (!prop || !prop.content) return null;
  return prop.content.units ?? null;
}

/** property の xsiType を安全に取り出す */
function extractXsiType(prop: any): string | null {
  if (!prop || !prop.content) return null;
  return prop.content.xsiType ?? null;
}

/** property の displayName/label を取り出す */
function extractLabel(prop: any, fallbackKey: string): string {
  return prop?.displayName ?? prop?.label ?? fallbackKey;
}

/**
 * TemplateDataRow の property_set から InstructionField[] に変換
 */
function buildFields(row: TemplateDataRow): InstructionField[] {
  const ps = row.property_set;
  if (!ps || !Array.isArray(ps.properties)) return [];

  return ps.properties.map((prop: any) => ({
    key: prop.key ?? '',
    label: extractLabel(prop, prop.key ?? ''),
    xsiType: extractXsiType(prop),
    plannedValue: null, // Phase 5 で experiment_plan と結合して埋める
    actualValue: extractActualValue(prop),
    unit: extractUnit(prop),
  }));
}

// ──────────────────────────────────────────────
// Service メソッド
// ──────────────────────────────────────────────

const templateDataRepo = new TemplateDataRepository();

/**
 * 実験指示一覧を取得（ネスト形式）
 *
 * @remarks
 * template_data と project_task_detail を取得し、
 * methods → tasks → templates のネスト構造に変換して返す。
 * plannedValue は現時点では null（Phase 5 で experiment_plan と結合する）。
 */
export async function getExperimentInstructions(
  organizationId: string,
  projectId: string
): Promise<ExperimentInstructionsResult> {
  logger.info('[experimentInstructionService] getExperimentInstructions', {
    organizationId,
    projectId,
  });

  // template_data（実績値）と project_task_detail（ステータス）を並行取得
  const [templateRows, taskDetails] = await Promise.all([
    templateDataRepo.findByProject(organizationId, projectId),
    projectTaskDetailRepo.findByProject(organizationId, projectId),
  ]);

  // task_detail を (methodId, taskNo) をキーにした Map に変換
  const taskDetailMap = new Map<string, ProjectTaskDetail>();
  for (const td of taskDetails) {
    taskDetailMap.set(`${td.method_id}__${td.task_no}`, td);
  }

  // templateRows を methodId → taskNo → rows[] にグループ化
  const methodMap = new Map<string, Map<number, TemplateDataRow[]>>();
  for (const row of templateRows) {
    if (!methodMap.has(row.method_id)) {
      methodMap.set(row.method_id, new Map());
    }
    const taskMap = methodMap.get(row.method_id)!;
    if (!taskMap.has(row.task_no)) {
      taskMap.set(row.task_no, []);
    }
    taskMap.get(row.task_no)!.push(row);
  }

  // ネスト形式に変換
  const methods: InstructionMethod[] = [];
  for (const [methodId, taskMap] of methodMap) {
    const tasks: InstructionTask[] = [];
    for (const [taskNo, rows] of taskMap) {
      const td = taskDetailMap.get(`${methodId}__${taskNo}`);
      const templates: InstructionTemplate[] = rows.map((row) => ({
        templateId: row.place_id,
        templateName: row.property_set?.templateName ?? null,
        templateType: row.property_set?.templateType ?? 'condition',
        fields: buildFields(row),
      }));
      tasks.push({
        taskNo,
        taskStatus: td?.task_status ?? null,
        reviewedAt: td?.reviewed_at ? td.reviewed_at.toISOString() : null,
        reviewUserId: td?.review_user_id ?? null,
        reviewResult: td?.review_result ?? null,
        templates,
      });
    }
    // taskNo 昇順
    tasks.sort((a, b) => a.taskNo - b.taskNo);
    methods.push({ methodId, tasks });
  }

  return { methods };
}

/**
 * プロジェクトのメソッドID一覧を取得
 */
export async function getProjectMethods(
  organizationId: string,
  projectId: string
): Promise<ProjectMethod[]> {
  logger.info('[experimentInstructionService] getProjectMethods', {
    organizationId,
    projectId,
  });

  const pool = getPool();
  const result = await pool.query<{ method_id: string }>(
    `SELECT DISTINCT method_id
     FROM project_task
     WHERE organization_id = $1
       AND project_id      = $2
     ORDER BY method_id`,
    [organizationId, projectId]
  );

  return result.rows.map((r) => ({ id: r.method_id }));
}

/**
 * タスクを承認する
 *
 * @returns 更新後のレビュー情報。対象タスクが存在しない・ステータス不一致の場合は null
 */
export async function approveTask(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  reviewUserId: string
): Promise<TaskReviewResult | null> {
  logger.info('[experimentInstructionService] approveTask', {
    organizationId,
    projectId,
    methodId,
    taskNo,
  });

  const updated = await projectTaskDetailRepo.approveTask(
    organizationId,
    projectId,
    methodId,
    taskNo,
    reviewUserId
  );

  if (!updated) return null;

  return {
    taskStatus: updated.task_status ?? null,
    reviewedAt: updated.reviewed_at ? updated.reviewed_at.toISOString() : null,
    reviewUserId: updated.review_user_id ?? null,
    reviewResult: updated.review_result ?? null,
  };
}

/**
 * タスクを NG 記録する
 *
 * @returns 更新後のレビュー情報。対象タスクが存在しない・ステータス不一致の場合は null
 */
export async function recordNg(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  reviewUserId: string,
  ngReason: string
): Promise<TaskReviewResult | null> {
  logger.info('[experimentInstructionService] recordNg', {
    organizationId,
    projectId,
    methodId,
    taskNo,
  });

  const updated = await projectTaskDetailRepo.recordNg(
    organizationId,
    projectId,
    methodId,
    taskNo,
    reviewUserId,
    ngReason
  );

  if (!updated) return null;

  return {
    taskStatus: updated.task_status ?? null,
    reviewedAt: updated.reviewed_at ? updated.reviewed_at.toISOString() : null,
    reviewUserId: updated.review_user_id ?? null,
    reviewResult: updated.review_result ?? null,
  };
}
