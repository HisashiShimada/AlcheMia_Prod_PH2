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
  PlanDialogData,
  TemplateDef,
  TemplateField,
} from '../types/api';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { getStorageService } from './storageService';
import * as projectRepository from '../repositories/projectRepository';
import type { Template } from '../types/maiml-unified';

export type {
  InstructionField,
  InstructionTemplate,
  InstructionTask,
  InstructionMethod,
  ExperimentInstructionsResult,
  ProjectMethod,
  TaskReviewResult,
  PlanDialogData,
  TemplateDef,
  TemplateField,
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

// ──────────────────────────────────────────────
// getPlanDialogDataFromMaiml
// ExperimentPlanDialog 用データを MAIML から生成する
// ──────────────────────────────────────────────

/**
 * Property.xsiType からフィールドの入力タイプを判定する
 *
 * @param xsiType - MAIML の property xsiType 文字列（例: 'doubleType', 'stringEnumType'）
 * @returns 'number' | 'select' | 'text'
 */
function detectFieldType(xsiType: string | undefined): 'text' | 'number' | 'select' {
  if (!xsiType) return 'text';
  if (xsiType === 'stringEnumType') return 'select';
  const numericTypes = [
    'intType', 'longType', 'shortType', 'byteType',
    'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
    'floatType', 'doubleType', 'decimalType',
    'intListType', 'longListType', 'shortListType', 'byteListType',
    'unsignedIntListType', 'unsignedLongListType', 'unsignedShortListType', 'unsignedByteListType',
    'floatListType', 'doubleListType', 'decimalListType',
  ];
  if (numericTypes.includes(xsiType)) return 'number';
  return 'text';
}

/**
 * MAIML Template から TemplateDef に変換する
 *
 * @param template - MAIML の Template オブジェクト
 * @param category - テンプレートカテゴリ ('material' | 'condition' | 'result')
 * @returns TemplateDef
 */
function convertTemplate(
  template: Template,
  category: 'material' | 'condition' | 'result'
): TemplateDef {
  // template.placeRefs（MAIMLの placeRef タグ）から PlaceID 一覧を抽出する
  // PlaceRef extends Reference → ref フィールドが参照先の PlaceID（id は Reference自身のID）
  const placeIds: string[] = (template.placeRefs ?? [])
    .map((ref) => ref.ref ?? ref.id)
    .filter((id): id is string => Boolean(id));
  // ① properties を fields に変換
  const fields: TemplateField[] = (template.properties ?? []).map((prop) => {
    const fieldType = detectFieldType(prop.xsiType);

    // select 型の場合、value を文字列分割して選択肢リストとして扱う
    let options: string[] | undefined;
    if (fieldType === 'select' && prop.value != null) {
      options = String(prop.value)
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    return {
      key: prop.key,
      label: prop.description ?? prop.key,
      type: fieldType,
      units: prop.units,
      required: false,
      ...(options !== undefined ? { options } : {}),
      // select 型以外で value が設定されている場合はデフォルト値として設定
      // select 型は value が選択肢リストを表すため defaultValue には使用しない
      ...(fieldType !== 'select' && prop.value !== undefined && prop.value !== null
        ? { defaultValue: prop.value }
        : {}),
      // 元の xsi:type 文字列を保持（フロントエンドでの表示用）
      ...(prop.xsiType !== undefined && prop.xsiType !== null
        ? { xsiType: prop.xsiType }
        : {}),
    };
  });

  // ② contents を fields に追加（contentStringListType 等の複数行入力フィールド）
  if (template.contents && Array.isArray(template.contents)) {
    for (const content of template.contents) {
      const fieldType = detectFieldType(content.xsiType);
      fields.push({
        key: content.key ?? `content_${fields.length}`,
        label: content.description ?? content.key ?? 'Content',
        type: fieldType,
        units: content.units,
        required: false,
        ...(content.xsiType !== undefined && content.xsiType !== null
          ? { xsiType: content.xsiType }
          : {}),
      });
    }
  }

  // ③ insertion を fields に追加（ファイル挿入が必要なことを示す情報表示フィールド）
  if (template.insertion) {
    fields.push({
      key: 'insertion',
      label: 'Insertion',
      type: 'text',
      units: undefined,
      required: false,
      xsiType: 'insertion',
    });
  }

  return {
    id: template.id,
    label: template.name ?? template.id,
    category,
    fields,
    placeIds,
  };
}

/**
 * テンプレート配列を TemplateDef[] に変換し、重複 id を除去してマージする
 *
 * @param seen - 追加済み id の Set（呼び出し元で管理し共有する）
 * @param result - 追加先の TemplateDef[]
 * @param templates - MAIML の Template[]
 * @param category - カテゴリ
 */
function mergeTemplates(
  seen: Set<string>,
  result: TemplateDef[],
  templates: Template[],
  category: 'material' | 'condition' | 'result'
): void {
  for (const tmpl of templates) {
    if (!seen.has(tmpl.id)) {
      seen.add(tmpl.id);
      result.push(convertTemplate(tmpl, category));
    }
  }
}

/**
 * ExperimentPlanDialog 用データを MAIML ファイルから取得する
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 * @param methodId       - メソッドID
 * @returns PlanDialogData
 *
 * @throws E6002 - MAIMLファイルが見つからない場合
 * @throws E6001 - 指定メソッドIDがMAIMLに存在しない場合
 */
export async function getPlanDialogDataFromMaiml(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<PlanDialogData> {
  logger.info('[experimentInstructionService] getPlanDialogDataFromMaiml', {
    organizationId,
    projectId,
    methodId,
  });

  // 1. プロジェクト名を取得（maimlPathResolver のフォールバック用）
  const nameRow = await projectRepository.findNameAndUuidById(organizationId, projectId);
  if (!nameRow) {
    const err = new Error(`Project not found: ${projectId}`);
    (err as any).code = 'E6001';
    throw err;
  }

  // 2. MAIMLファイルパスを解決してコンテンツを取得
  const filePath = await resolveMaimlFilePath(organizationId, projectId, nameRow.project_name);
  const storageService = getStorageService();

  let maimlContent: string;
  try {
    const buffer = await storageService.downloadFile(organizationId, filePath);
    maimlContent = buffer.toString('utf-8');
  } catch (e) {
    logger.warn('[experimentInstructionService] MAIMLファイル取得失敗', {
      organizationId,
      projectId,
      filePath,
      error: String(e),
    });
    const err = new Error(`MAIML file not found for project ${projectId}`);
    (err as any).code = 'E6002';
    throw err;
  }

  // 3. MAIMLをパース
  const parser = new MaimlParserTyped(maimlContent);
  const protocol = parser.getProtocol();
  const document = parser.getDocument();

  // 4. 対象メソッドを特定
  const method = (protocol.methods ?? []).find((m) => m.id === methodId);
  if (!method) {
    logger.warn('[experimentInstructionService] メソッドが見つかりません', {
      organizationId,
      projectId,
      methodId,
      availableMethods: (protocol.methods ?? []).map((m) => m.id),
    });
    const err = new Error(`Method not found: ${methodId}`);
    (err as any).code = 'E6001';
    throw err;
  }

  // 5. トランジション一覧を抽出（method.pnml.transitions）
  // Arc の target がトランジション → source（Place）を辿り、
  // その Place に流入する Arc の source がトランジションであれば prerequisite とする
  const pnmlArcs = method.pnml?.arcs ?? [];
  const pnmlTransitionIds = new Set(
    (method.pnml?.transitions ?? []).map((t) => t.id)
  );

  /**
   * 指定トランジションの直前に実行すべきトランジションIDを求める。
   *
   * Petri Net の流れ:
   *   Transition(先行) → Place(中間) → Transition(後続)
   *
   * つまり:
   *   1. 後続 Transition に流入する Arc を探す（target === targetTransitionId）
   *      → その Arc の source が「中間 Place」
   *   2. 中間 Place に流入する Arc を探す（target === 中間 Place ID）
   *      → その Arc の source がトランジションなら prerequisite
   */
  function calcPrerequisiteTransitionIds(targetTransitionId: string): string[] {
    const prereqIds: string[] = [];
    // 後続 Transition に流入する Arc → 中間 Place を特定
    const incomingArcs = pnmlArcs.filter((arc) => arc.target === targetTransitionId);
    for (const arc of incomingArcs) {
      const intermediatePlace = arc.source;
      // 中間 Place に流入する Arc → 先行ノードを特定
      const precedingArcs = pnmlArcs.filter((a) => a.target === intermediatePlace);
      for (const pArc of precedingArcs) {
        if (pnmlTransitionIds.has(pArc.source)) {
          prereqIds.push(pArc.source);
        }
      }
    }
    return prereqIds;
  }

  /**
   * 指定トランジションに流入する Place ID を求める（入力Place）。
   *
   * Petri Net の流れ:
   *   Place → Arc（target: transitionId） → Transition
   *
   * つまり:
   *   Arc.target === transitionId の Arc の source（Place）を収集する
   * このPlaceに紐づくテンプレートがそのトランジションの入力テンプレートとなる（入力可能）
   */
  function calcInputPlaceIds(targetTransitionId: string): string[] {
    return pnmlArcs
      .filter((arc) => arc.target === targetTransitionId && !pnmlTransitionIds.has(arc.source))
      .map((arc) => arc.source);
  }

  /**
   * 指定トランジションから流出する Place ID を求める（出力Place）。
   *
   * Petri Net の流れ:
   *   Transition → Arc（source: transitionId） → Place
   *
   * つまり:
   *   Arc.source === transitionId の Arc の target（Place）を収集する
   * このPlaceに紐づくテンプレートが出力テンプレートとなる（表示するがdisabled）
   */
  function calcOutputPlaceIds(sourceTransitionId: string): string[] {
    return pnmlArcs
      .filter((arc) => arc.source === sourceTransitionId && !pnmlTransitionIds.has(arc.target))
      .map((arc) => arc.target);
  }

  const transitions = (method.pnml?.transitions ?? []).map((t) => ({
    id: t.id,
    name: t.name ?? t.id,
    prerequisiteTransitionIds: calcPrerequisiteTransitionIds(t.id),
    inputPlaceIds: calcInputPlaceIds(t.id),
    outputPlaceIds: calcOutputPlaceIds(t.id),
  }));

  // 6. テンプレートを収集（メソッドレベル + program[] 配下の両方）
  const seenTemplateIds = new Set<string>();
  const templates: TemplateDef[] = [];

  // メソッドレベルのテンプレート
  mergeTemplates(seenTemplateIds, templates, method.materialTemplates ?? [], 'material');
  mergeTemplates(seenTemplateIds, templates, method.conditionTemplates ?? [], 'condition');
  mergeTemplates(seenTemplateIds, templates, method.resultTemplates ?? [], 'result');

  // program[] 配下のテンプレート
  for (const prog of method.program ?? []) {
    mergeTemplates(seenTemplateIds, templates, prog.materialTemplates ?? [], 'material');
    mergeTemplates(seenTemplateIds, templates, prog.conditionTemplates ?? [], 'condition');
    mergeTemplates(seenTemplateIds, templates, prog.resultTemplates ?? [], 'result');
  }

  // 7. Ref 選択肢を抽出（document の id を使用）
  const creatorRefs = (document.creators ?? []).map((c) => c.id).filter(Boolean);
  const instrumentRefs = (document.instruments ?? []).map((i) => i.id).filter(Boolean);
  const ownerRefs = (document.owners ?? []).map((o) => o.id).filter(Boolean);

  // 8. Conditionテンプレートから基本情報の初期値を抽出
  // mgr-instruction:requiredCreatorUUID / requiredInstrumentUUID / requiredOwnerUUID
  // および注意事項キー（Alchemia:SupervisorDirectiveXxx 等）が存在する場合に設定する
  const NOTE_KEYS = new Set([
    'Alchemia:SupervisorDirectiveCaution',
    'Alchemia:SupervisorDirectiveOperationNote',
    'Alchemia:SupervisorDirectiveCheckItem',
    'Alchemia:SupervisorDirectiveProhibitedAction',
    'Alchemia:SupervisorDirectiveOtherNotes',
    // 旧キーも後方互換のため認識する（読み取りのみ）
    'mgr-instruction:caution',
    'mgr-instruction:operationNote',
    'mgr-instruction:checkItem',
    'mgr-instruction:prohibitedAction',
    'mgr-instruction:OtherNotes',
  ]);

  const defaultBasicInfo: PlanDialogData['defaultBasicInfo'] = {};
  const defaultNotes: Array<{ type: string; content: string }> = [];

  for (const tmpl of templates) {
    if (tmpl.category !== 'condition') continue;
    for (const field of tmpl.fields) {
      if (field.defaultValue == null) continue;
      const val = String(field.defaultValue).trim();
      if (!val) continue;

      if (field.key === 'mgr-instruction:requiredCreatorUUID' && !defaultBasicInfo.creatorRefs) {
        defaultBasicInfo.creatorRefs = val.split(/[\s,]+/).filter(Boolean);
      } else if (field.key === 'mgr-instruction:requiredInstrumentUUID' && !defaultBasicInfo.instrumentRefs) {
        defaultBasicInfo.instrumentRefs = val.split(/[\s,]+/).filter(Boolean);
      } else if (field.key === 'mgr-instruction:requiredOwnerUUID' && !defaultBasicInfo.ownerRefs) {
        defaultBasicInfo.ownerRefs = val.split(/[\s,]+/).filter(Boolean);
      } else if (NOTE_KEYS.has(field.key)) {
        defaultNotes.push({ type: field.key, content: val });
      }
    }
  }

  if (defaultNotes.length > 0) {
    defaultBasicInfo.notes = defaultNotes;
  }

  logger.info('[experimentInstructionService] getPlanDialogDataFromMaiml 完了', {
    organizationId,
    projectId,
    methodId,
    transitionCount: transitions.length,
    templateCount: templates.length,
    hasDefaultBasicInfo: Object.keys(defaultBasicInfo).length > 0,
  });

  return {
    transitions,
    templates,
    creatorRefs,
    instrumentRefs,
    ownerRefs,
    ...(Object.keys(defaultBasicInfo).length > 0 ? { defaultBasicInfo } : {}),
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
