/**
 * experimentInstructionService.ts
 * 実験指示 Service 層
 *
 * @remarks
 * - getExperimentInstructions: experiment_instruction_detail を主軸として
 *   ネスト形式（methods → tasks → templates → fields）で返す
 * - getProjectMethods: project_task の distinct method_id 一覧を返す
 * - approveTask: task_status=2（レビュー待ち）→ 3（完了）に更新
 * - recordNg: task_status=2（レビュー待ち）→ 5（NG）に更新
 */

import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { logger } from '../utils/logger';
import { TemplateDataRepository } from '../repositories/templateDataRepository';
import type { TemplateDataRow, PropertySet } from '../repositories/templateDataRepository';
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
  UncertaintyJudgeSummary,
  CorrectRecordItem,
  CorrectRecordResult,
} from '../types/api';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { getStorageService } from './storageService';
import { MaimlWriterService } from './maimlWriterService';
import { EventLogRepository } from '../repositories/eventLogRepository';
import { ReviewTypeEnum, TaskStatusEnum } from '../enums/codeMaster.enum';
import * as projectRepository from '../repositories/projectRepository';
import * as uncertaintyCriteriaRepository from '../repositories/uncertaintyCriteriaRepository';
import { ExperimentUncertaintyJudgeRepository } from '../repositories/experimentUncertaintyJudgeRepository';
import * as experimentInstructionDetailRepository from '../repositories/experimentInstructionDetailRepository';
import type { Template, Property } from '../types/maiml-unified';
import { toJSTIsoString } from '../utils/dateUtils';

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
  UncertaintyJudgeSummary,
  CorrectRecordItem,
  CorrectRecordResult,
};

// ──────────────────────────────────────────────
// Service メソッド
// ──────────────────────────────────────────────

/**
 * 実験指示一覧を取得（ネスト形式）
 *
 * @remarks
 * experiment_instruction_detail を主軸として
 * methods → tasks → templates → fields のネスト構造を構築する。
 *
 * 各フィールドの値は experiment_instruction_detail のカラムから直接取得する：
 *   - key / xsi_type / expected_value / actual_value
 *   - transition_id / transition_name / template_id / template_name
 *   - uncertainty_key / uncertainty_assigned_value（定性評価）
 *
 * タスクステータス等は project_task_detail から補完する。
 * 定量評価（experiment_uncertainty_judge）は将来対応。
 */
export async function getExperimentInstructions(
  organizationId: string,
  projectId: string
): Promise<ExperimentInstructionsResult> {
  logger.info('[experimentInstructionService] getExperimentInstructions', {
    organizationId,
    projectId,
  });

  // experiment_instruction_detail と project_task_detail を並行取得
  const [instructionDetails, taskDetails] = await Promise.all([
    experimentInstructionDetailRepository.findByProject(organizationId, projectId),
    projectTaskDetailRepo.findByProject(organizationId, projectId),
  ]);

  // task_detail を (methodId, taskNo) をキーにした Map に変換
  const taskDetailMap = new Map<string, ProjectTaskDetail>();
  for (const td of taskDetails) {
    taskDetailMap.set(`${td.method_id}__${td.task_no}`, td);
  }

  // uncertainty_key → criteriaName のマップ（定性評価で使用）
  const criteriaNameMap = new Map<string, string>();

  // experiment_uncertainty_judge から最新判定を全件取得（定量評価）
  // キー: `${methodId}__${taskNo}__${templateId}__${propertyKey}` → UncertaintyJudgeSummary[]
  const judgeMap = new Map<string, UncertaintyJudgeSummary[]>();

  try {
    const allUncertaintyKeys = new Set<string>();
    const allMethodIds = new Set(instructionDetails.map((d) => d.method_id));
    const judgeRepo = new ExperimentUncertaintyJudgeRepository();

    for (const methodId of allMethodIds) {
      const judgeRows = await judgeRepo.findAllByProject(organizationId, projectId, methodId);
      for (const jr of judgeRows) {
        const key = `${methodId}__${jr.taskNo}__${jr.templateId}__${jr.propertyKey}`;
        if (!judgeMap.has(key)) judgeMap.set(key, []);
        judgeMap.get(key)!.push({
          instructionKey: jr.uncertaintyKey,
          toleranceUpper: jr.toleranceUpper,
          toleranceLower: jr.toleranceLower,
          judgeResult:    jr.judgeResult,
          recordedValue:  jr.recordedValue,
        });
        allUncertaintyKeys.add(jr.uncertaintyKey);
      }
    }

    // 定性評価の uncertaintyKey も criteriaName 解決対象に追加
    for (const detail of instructionDetails) {
      if (detail.uncertainty_key) allUncertaintyKeys.add(detail.uncertainty_key);
    }

    // uncertainty_criteria から criteriaName を一括取得
    if (allUncertaintyKeys.size > 0) {
      const criteriaRows = await uncertaintyCriteriaRepository.findByKeys(
        organizationId,
        Array.from(allUncertaintyKeys)
      );
      for (const cr of criteriaRows) {
        if (cr.uncertainty_name) criteriaNameMap.set(cr.key, cr.uncertainty_name);
      }
      // criteriaName を judgeMap の各エントリに反映
      for (const [, judges] of judgeMap) {
        for (const j of judges) {
          const name = criteriaNameMap.get(j.instructionKey);
          if (name) (j as UncertaintyJudgeSummary & { criteriaName?: string }).criteriaName = name;
        }
      }
    }
  } catch (e) {
    logger.warn('[experimentInstructionService] judge/criteria 情報取得失敗（スキップ）', { error: String(e) });
  }

  // instructionDetails を methodId → taskNo → templateId → details[] にグループ化
  const methodMap = new Map<string, Map<number, Map<string, typeof instructionDetails[0][]>>>();
  for (const detail of instructionDetails) {
    if (!detail.template_id) continue; // template_id が null の旧データはスキップ
    if (!methodMap.has(detail.method_id)) methodMap.set(detail.method_id, new Map());
    const taskMap = methodMap.get(detail.method_id)!;
    if (!taskMap.has(detail.task_no)) taskMap.set(detail.task_no, new Map());
    const templateMap = taskMap.get(detail.task_no)!;
    if (!templateMap.has(detail.template_id)) templateMap.set(detail.template_id, []);
    templateMap.get(detail.template_id)!.push(detail);
  }

  // ネスト形式に変換
  const methods: InstructionMethod[] = [];
  for (const [methodId, taskMap] of methodMap) {
    const tasks: InstructionTask[] = [];
    for (const [taskNo, templateMap] of taskMap) {
      const td = taskDetailMap.get(`${methodId}__${taskNo}`);
      const templates: InstructionTemplate[] = [];

      for (const [templateId, details] of templateMap) {
        const firstDetail = details[0];
        const fields: InstructionField[] = details.map((detail) => {
          const qualitativeCriteriaName = detail.uncertainty_key
            ? (criteriaNameMap.get(detail.uncertainty_key) ?? detail.uncertainty_key)
            : null;

          // 定量評価: (methodId, taskNo, templateId, propKey) でマップ検索
          const judgeKey = `${methodId}__${taskNo}__${templateId}__${detail.prop_key}`;
          const judges = judgeMap.get(judgeKey);

          return {
            key:          detail.prop_key,
            label:        detail.prop_key,
            xsiType:      detail.xsi_type ?? null,
            plannedValue: detail.expected_value ?? null,
            actualValue:  detail.actual_value ?? null,
            unit:         null,
            ...(judges && judges.length > 0 ? { uncertaintyJudges: judges } : {}),
            qualitativeCriteriaName,
            qualitativeAssignedValue: detail.uncertainty_assigned_value ?? null,
          };
        });

        templates.push({
          templateId,
          templateName:   firstDetail.template_name ?? null,
          templateType:   'condition',
          placeId:        firstDetail.place_id ?? null,
          transitionId:   firstDetail.transition_id ?? null,
          transitionName: firstDetail.transition_name ?? firstDetail.transition_id ?? null,
          fields,
        });
      }

      tasks.push({
        taskNo,
        taskStatus:       td?.task_status ?? null,
        reviewedAt:       td?.reviewed_at ? toJSTIsoString(td.reviewed_at) : null,
        reviewUserId:     td?.review_user_id ?? null,
        reviewResult:     td?.review_result ?? null,
        templates,
        experimentUserId: td?.experiment_user_id ?? null,
        experimentEndAt:  td?.experiment_end_at ? toJSTIsoString(td.experiment_end_at) : null,
      });
    }
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
  const sqlQuery = await loadSqlFile('project_tasks/findDistinctMethodIds.sql');
  const result = await pool.query<{ method_id: string }>(sqlQuery, [organizationId, projectId]);

  return result.rows.map((r) => ({ id: r.method_id }));
}

/**
 * タスクを承認する
 *
 * @remarks
 * - project_task_detail を task_status=3（completed）に更新する
 * - maiml_event_log に承認ログを記録し、MAIML XML にも書き込む
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

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await projectTaskDetailRepo.approveTask(
      organizationId,
      projectId,
      methodId,
      taskNo,
      reviewUserId
    );

    if (!updated) {
      await client.query('ROLLBACK');
      return null;
    }

    // プロジェクト名を取得（event_log ID 命名に使用）
    const project = await projectRepository.findByIdFull(organizationId, projectId);
    const projectName = project?.project_name ?? projectId;

    const eventLogRepo = new EventLogRepository();
    await eventLogRepo.insertTaskReviewLog(
      organizationId,
      projectId,
      methodId,
      taskNo,
      ReviewTypeEnum.APPROVED,
      null,
      reviewUserId,
      projectName,
      client
    );

    await client.query('COMMIT');

    // MAIML XML への書き込み（non-fatal: 失敗してもレスポンスはブロックしない）
    try {
      const maimlWriterService = new MaimlWriterService();
      await maimlWriterService.writeEventLogOnly(organizationId, projectId, projectName);
    } catch (writeError) {
      logger.warn('[experimentInstructionService] approveTask: MAIML write failed (non-fatal)', {
        error: String(writeError),
      });
    }

    return {
      taskStatus: updated.task_status ?? null,
      reviewedAt: updated.reviewed_at ? toJSTIsoString(updated.reviewed_at) : null,
      reviewUserId: updated.review_user_id ?? null,
      reviewResult: updated.review_result ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
 * @param template  - MAIML の Template オブジェクト
 * @param category  - テンプレートカテゴリ ('material' | 'condition' | 'result')
 * @param ucNameMap - uncertainty_key → uncertainty_name の Map（DB から取得）
 * @returns TemplateDef
 */
function convertTemplate(
  template: Template,
  category: 'material' | 'condition' | 'result',
  ucNameMap: Map<string, string> = new Map()
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

    // MAIMLの property.uncertainty[] を defaultUncertainties に変換
    // Content.xsiType が文字列系（String/Enum含む）なら定性評価、それ以外は定量評価として扱う
    let defaultUncertainties: TemplateField['defaultUncertainties'];
    if (prop.uncertainty && prop.uncertainty.length > 0) {
      defaultUncertainties = prop.uncertainty.map((uc) => {
        const isQualitative =
          typeof uc.xsiType === 'string' &&
          (uc.xsiType.toLowerCase().includes('string') ||
            uc.xsiType.toLowerCase().includes('enum'));
        const rawValue = uc.value;
        const numericValue =
          typeof rawValue === 'number'
            ? rawValue
            : typeof rawValue === 'string' && rawValue.trim() !== '' && !isNaN(Number(rawValue))
              ? Number(rawValue)
              : undefined;
        return {
          criteriaKey: uc.key,
          // DB の uncertainty_name を優先し、なければ key にフォールバック
          criteriaName: ucNameMap.get(uc.key) ?? uc.key,
          evalType: isQualitative ? ('qualitative' as const) : ('quantitative' as const),
          // MAIML の uncertainty.description をそのまま渡す
          ...(uc.description !== undefined && uc.description !== null
            ? { description: uc.description }
            : {}),
          ...(isQualitative
            ? { qualitativeValue: typeof rawValue === 'string' ? rawValue : undefined }
            : { ucValue: numericValue }),
          unit: uc.units,
        };
      });
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
      // MAIMLテンプレートに設定されたデフォルト不確かさ
      ...(defaultUncertainties !== undefined ? { defaultUncertainties } : {}),
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
 * @param seen      - 追加済み id の Set（呼び出し元で管理し共有する）
 * @param result    - 追加先の TemplateDef[]
 * @param templates - MAIML の Template[]
 * @param category  - カテゴリ
 * @param ucNameMap - uncertainty_key → uncertainty_name の Map（DB から取得）
 */
function mergeTemplates(
  seen: Set<string>,
  result: TemplateDef[],
  templates: Template[],
  category: 'material' | 'condition' | 'result',
  ucNameMap: Map<string, string> = new Map()
): void {
  for (const tmpl of templates) {
    if (!seen.has(tmpl.id)) {
      seen.add(tmpl.id);
      result.push(convertTemplate(tmpl, category, ucNameMap));
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

  // 4.5. テンプレート内の uncertainty.key を全収集し、DB から uncertainty_name を一括取得
  const allUcKeys = new Set<string>();
  const allTemplates = [
    ...(method.materialTemplates ?? []),
    ...(method.conditionTemplates ?? []),
    ...(method.resultTemplates ?? []),
    ...(method.program ?? []).flatMap((p) => [
      ...(p.materialTemplates ?? []),
      ...(p.conditionTemplates ?? []),
      ...(p.resultTemplates ?? []),
    ]),
  ];
  for (const tmpl of allTemplates) {
    for (const prop of tmpl.properties ?? []) {
      for (const uc of prop.uncertainty ?? []) {
        if (uc.key) allUcKeys.add(uc.key);
      }
    }
  }

  // DB から uncertainty_name を一括取得して Map を構築
  const ucNameMap = new Map<string, string>();
  if (allUcKeys.size > 0) {
    try {
      const ucRows = await uncertaintyCriteriaRepository.findByKeys(
        organizationId,
        Array.from(allUcKeys)
      );
      for (const row of ucRows) {
        if (row.uncertainty_name) {
          ucNameMap.set(row.key, row.uncertainty_name);
        }
      }
    } catch (e) {
      logger.warn(
        '[experimentInstructionService] uncertainty_criteria DB lookup 失敗（スキップ）',
        { error: String(e) }
      );
    }
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

  // 7. Ref 選択肢を抽出（value: id, label: name || id）
  const creatorRefs = (document.creators ?? [])
    .filter((c) => Boolean(c.id))
    .map((c) => ({ value: c.id, label: c.name || c.id }));
  const instrumentRefs = (document.instruments ?? [])
    .filter((i) => Boolean(i.id))
    .map((i) => ({ value: i.id, label: i.name || i.id }));
  const ownerRefs = (document.owners ?? [])
    .filter((o) => Boolean(o.id))
    .map((o) => ({ value: o.id, label: o.name || o.id }));

  // 8. Conditionテンプレートから基本情報の初期値を抽出
  // 注意事項キー（Alchemia:SupervisorDirectiveXxx）が存在する場合に設定する
  const NOTE_KEYS = new Set([
    'Alchemia:SupervisorDirectiveCaution',
    'Alchemia:SupervisorDirectiveOperationNote',
    'Alchemia:SupervisorDirectiveCheckItem',
    'Alchemia:SupervisorDirectiveProhibitedAction',
    'Alchemia:SupervisorDirectiveOtherNotes',
  ]);

  const defaultBasicInfo: PlanDialogData['defaultBasicInfo'] = {};
  const defaultNotes: Array<{ type: string; content: string }> = [];

  for (const tmpl of templates) {
    if (tmpl.category !== 'condition') continue;
    for (const field of tmpl.fields) {
      if (field.defaultValue == null) continue;
      const val = String(field.defaultValue).trim();
      if (!val) continue;

      if (NOTE_KEYS.has(field.key)) {
        defaultNotes.push({ type: field.key, content: val });
      }
    }
  }

  if (defaultNotes.length > 0) {
    defaultBasicInfo.notes = defaultNotes;
  }

  // 9. MAIML data層からインスタンスを抽出する
  // data.results[].materials / conditions / results を変換して dataInstances に格納
  const dataInstances: PlanDialogData['dataInstances'] = [];
  const maimlData = parser.getTypedMaiml().data;
  if (maimlData) {
    for (const resultsItem of maimlData.results ?? []) {
      for (const mat of resultsItem.materials ?? []) {
        dataInstances.push({
          instanceId: mat.id,
          templateRef: mat.ref ?? '',
          category: 'material',
          name: mat.name,
          properties: (mat.properties ?? []).map((p: Property) => ({
            key: p.key,
            value: p.value !== undefined ? p.value : null,
            ...(p.units !== undefined ? { units: p.units } : {}),
          })),
        });
      }
      for (const cond of resultsItem.conditions ?? []) {
        dataInstances.push({
          instanceId: cond.id,
          templateRef: cond.ref ?? '',
          category: 'condition',
          name: cond.name,
          properties: (cond.properties ?? []).map((p: Property) => ({
            key: p.key,
            value: p.value !== undefined ? p.value : null,
            ...(p.units !== undefined ? { units: p.units } : {}),
          })),
        });
      }
      for (const res of resultsItem.results ?? []) {
        dataInstances.push({
          instanceId: res.id,
          templateRef: res.ref ?? '',
          category: 'result',
          name: res.name,
          properties: (res.properties ?? []).map((p: Property) => ({
            key: p.key,
            value: p.value !== undefined ? p.value : null,
            ...(p.units !== undefined ? { units: p.units } : {}),
          })),
        });
      }
    }
  }

  logger.info('[experimentInstructionService] getPlanDialogDataFromMaiml 完了', {
    organizationId,
    projectId,
    methodId,
    transitionCount: transitions.length,
    templateCount: templates.length,
    hasDefaultBasicInfo: Object.keys(defaultBasicInfo).length > 0,
    dataInstanceCount: dataInstances.length,
  });

  return {
    transitions,
    templates,
    creatorRefs,
    instrumentRefs,
    ownerRefs,
    ...(dataInstances.length > 0 ? { dataInstances } : {}),
    ...(Object.keys(defaultBasicInfo).length > 0 ? { defaultBasicInfo } : {}),
  };
}

/**
 * タスクを NG 記録する
 *
 * @remarks
 * - project_task_detail を task_status=5（ng）に更新する
 * - maiml_event_log に NG ログを記録し、MAIML XML にも書き込む
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

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await projectTaskDetailRepo.recordNg(
      organizationId,
      projectId,
      methodId,
      taskNo,
      reviewUserId,
      ngReason
    );

    if (!updated) {
      await client.query('ROLLBACK');
      return null;
    }

    // プロジェクト名を取得（event_log ID 命名に使用）
    const project = await projectRepository.findByIdFull(organizationId, projectId);
    const projectName = project?.project_name ?? projectId;

    const eventLogRepo = new EventLogRepository();
    await eventLogRepo.insertTaskReviewLog(
      organizationId,
      projectId,
      methodId,
      taskNo,
      ReviewTypeEnum.NG,
      ngReason,
      reviewUserId,
      projectName,
      client
    );

    await client.query('COMMIT');

    // MAIML XML への書き込み（non-fatal）
    try {
      const maimlWriterService = new MaimlWriterService();
      await maimlWriterService.writeEventLogOnly(organizationId, projectId, projectName);
    } catch (writeError) {
      logger.warn('[experimentInstructionService] recordNg: MAIML write failed (non-fatal)', {
        error: String(writeError),
      });
    }

    return {
      taskStatus: updated.task_status ?? null,
      reviewedAt: updated.reviewed_at ? toJSTIsoString(updated.reviewed_at) : null,
      reviewUserId: updated.review_user_id ?? null,
      reviewResult: updated.review_result ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ──────────────────────────────────────────────
// correctRecord
// 実験指示タブからの記録値（実績値）訂正
// ──────────────────────────────────────────────

/**
 * 記録値（実績値）を訂正する
 *
 * @remarks
 * - task_status=2（review_waiting）のタスクのみ訂正可能
 * - ステータスは変更しない（task_status=2 を維持）
 * - template_data を更新し、maiml_event_log に訂正ログを記録する
 * - MAIML XML にも書き込む（data + eventLog 両方）
 *
 * @throws 409 - task_status が 2 でない場合
 */
export async function correctRecord(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  records: CorrectRecordItem[],
  correctedByUserId: string
): Promise<CorrectRecordResult> {
  logger.info('[experimentInstructionService] correctRecord', {
    organizationId,
    projectId,
    methodId,
    taskNo,
    recordCount: records.length,
  });

  // task_status=2（review_waiting）チェック
  const taskDetail = await projectTaskDetailRepo.findByPrimaryKey(
    organizationId,
    projectId,
    methodId,
    taskNo
  );
  if (!taskDetail || Number(taskDetail.task_status) !== TaskStatusEnum.REVIEW_WAITING) {
    const err: any = new Error('訂正対象タスクがレビュー待ち状態（task_status=2）ではありません');
    err.statusCode = 409;
    err.code = 'TASK_NOT_REVIEW_WAITING';
    throw err;
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const templateDataRepo = new TemplateDataRepository();
    const corrections: Array<{
      instanceUuid: string;
      propKey: string;
      beforeValue: unknown;
      afterValue: unknown;
    }> = [];

    for (const record of records) {
      // 訂正前の値を取得（Repository 経由）
      const beforeRow = await templateDataRepo.findByPlaceId(
        organizationId, projectId, methodId, taskNo, record.placeId, client
      );
      const beforePropertySet = beforeRow?.property_set;

      // template_data を更新（instanceUuid は upsert 内で既存値を維持）
      const updatedPropertySet: PropertySet = {
        templateId: record.data.templateId,
        templateType: record.data.templateType,
        properties: record.data.properties as Property[],
      };
      const recordParam = {
        placeId: record.placeId,
        propertySet: updatedPropertySet,
        updateUserId: correctedByUserId,
      };
      await templateDataRepo.upsert(organizationId, projectId, methodId, taskNo, recordParam, client);

      // 訂正後の値を取得（upsert 後の property_set、Repository 経由）
      const afterRow = await templateDataRepo.findByPlaceId(
        organizationId, projectId, methodId, taskNo, record.placeId, client
      );
      const afterPropertySet = afterRow?.property_set;
      const instanceUuid = afterPropertySet?.instanceUuid ?? record.placeId;

      // property 単位で before/after を比較し変更があれば記録
      const beforeProps = (beforePropertySet?.properties ?? []) as Property[];
      const afterProps = (afterPropertySet?.properties ?? []) as Property[];

      for (const afterProp of afterProps) {
        const propKey = afterProp.key;
        const beforeProp = beforeProps.find((p) => p.key === propKey);
        const beforeValue = beforeProp?.value ?? null;
        const afterValue = afterProp?.value ?? null;

        if (String(beforeValue) !== String(afterValue)) {
          corrections.push({ instanceUuid, propKey, beforeValue, afterValue });
        }

        // experiment_instruction_detail の actual_value を更新する（transitionId が指定されている場合のみ）
        if (record.transitionId) {
          const actualValue = afterValue != null ? String(afterValue) : null;
          await experimentInstructionDetailRepository.updateActualOnly({
            organizationId,
            projectId,
            methodId,
            taskNo,
            transitionId: record.transitionId,
            templateId:   record.data.templateId,
            propKey,
            actualValue,
            updateUserId: correctedByUserId,
          });
        }
      }
    }

    // 変更がある場合のみ event_log を記録
    if (corrections.length > 0) {
      const project = await projectRepository.findByIdFull(organizationId, projectId);
      const projectName = project?.project_name ?? projectId;

      const eventLogRepo = new EventLogRepository();
      await eventLogRepo.insertRecordCorrectionLog(
        organizationId,
        projectId,
        methodId,
        taskNo,
        corrections,
        correctedByUserId,
        projectName,
        client
      );
    }

    await client.query('COMMIT');

    // MAIML XML への書き込み（data + eventLog 両方、non-fatal）
    try {
      const project = await projectRepository.findByIdFull(organizationId, projectId);
      const projectName = project?.project_name ?? projectId;
      const maimlWriterService = new MaimlWriterService();
      await maimlWriterService.writeDataAndEventLog(organizationId, projectId, projectName);
    } catch (writeError) {
      logger.warn('[experimentInstructionService] correctRecord: MAIML write failed (non-fatal)', {
        error: String(writeError),
      });
    }

    return { corrected: records.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

