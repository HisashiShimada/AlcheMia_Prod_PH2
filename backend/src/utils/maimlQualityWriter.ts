/**
 * maimlQualityWriter.ts
 *
 * 品質評価データを MAiML <eventLog> に書き込むためのユーティリティ関数群。
 *
 * 提供する関数:
 *   - resolveTransitionToInstructionMap() - transition_id → instruction_id マッピング生成
 *   - resolveTransitionToProgramMap()     - transition_id → program_id マッピング生成
 *   - buildQualityEvalLogEntries()        - 品質評価データ → EventLogJsonRecord[] 変換
 *   - removeUncertaintiesWrapper()        - <Uncertainties> ラッパー除去
 *
 * @module maimlQualityWriter
 * @version 2.0.0
 */

import type { EventLogJsonRecord } from './maimlDataWriter';
import type { SubEvaluationRow } from '../types/projectOverallEvaluation';
import type { ProjectOverallEvaluation } from '../types/projectOverallEvaluation';
import { SubEvaluationScopeValues } from '../enums/aggregationRule.enum';

// ============================================================
// 定数
// ============================================================

/** Quality 評価フェーズ名（eventlog_structure.md 2-1 準拠） */
const QUALITY_PHASE = 'Quality_evaluation' as const;

// ============================================================
// resolveTransitionToInstructionMap
// ============================================================

/**
 * MAiML XML をパースして transition_id → instruction_id マッピングを生成する
 *
 * MAiML の構造: <protocol> → <method> → <program> → <instruction> → <transitionRef ref="..."/>
 * transitionRef の ref 属性値が transition_id に対応する。
 *
 * @param maimlXml - MAiML XML 文字列
 * @returns transition_id をキー、instruction_id を値とする Map
 */
export function resolveTransitionToInstructionMap(maimlXml: string): Map<string, string> {
  const result = new Map<string, string>();

  const instructionPattern = /<instruction\s[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/instruction>/gi;
  let instMatch: RegExpExecArray | null;

  while ((instMatch = instructionPattern.exec(maimlXml)) !== null) {
    const instructionId = instMatch[1];
    const instructionBody = instMatch[2];

    const transitionRefPattern = /<transitionRef\s[^>]*ref="([^"]+)"[^>]*\/?>/gi;
    let trefMatch: RegExpExecArray | null;

    while ((trefMatch = transitionRefPattern.exec(instructionBody)) !== null) {
      const transitionId = trefMatch[1];
      if (!result.has(transitionId)) {
        result.set(transitionId, instructionId);
      }
    }
  }

  return result;
}

// ============================================================
// resolveTransitionToProgramMap
// ============================================================

/**
 * MAiML XML をパースして transition_id → program_id マッピングを生成する
 *
 * MAiML の構造:
 *   <method> → <program id="..."> → <instruction> → <transitionRef ref="..."/>
 * program の id 属性値が trace/@ref に使用する programId に対応する。
 *
 * @param maimlXml - MAiML XML 文字列
 * @returns transition_id をキー、program_id を値とする Map
 */
export function resolveTransitionToProgramMap(maimlXml: string): Map<string, string> {
  const result = new Map<string, string>();

  // <program id="..."> ブロックを抽出
  const programPattern = /<program\s[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/program>/gi;
  let progMatch: RegExpExecArray | null;

  while ((progMatch = programPattern.exec(maimlXml)) !== null) {
    const programId = progMatch[1];
    const programBody = progMatch[2];

    // program 内の instruction → transitionRef を辿る
    const instructionPattern = /<instruction\s[^>]*>([\s\S]*?)<\/instruction>/gi;
    let instMatch: RegExpExecArray | null;

    while ((instMatch = instructionPattern.exec(programBody)) !== null) {
      const instructionBody = instMatch[1];

      const transitionRefPattern = /<transitionRef\s[^>]*ref="([^"]+)"[^>]*\/?>/gi;
      let trefMatch: RegExpExecArray | null;

      while ((trefMatch = transitionRefPattern.exec(instructionBody)) !== null) {
        const transitionId = trefMatch[1];
        if (!result.has(transitionId)) {
          result.set(transitionId, programId);
        }
      }
    }
  }

  return result;
}

// ============================================================
// buildQualityEvalLogEntries
// ============================================================

/**
 * 品質評価データを buildEventLogXML() が受け取れる EventLogJsonRecord[] 形式に変換
 *
 * スコープ別の eventLog 階層構造:
 *   - MAIML_PROJECT（全体評価）: eventLog 直下 property + ownerRef
 *   - METHOD:                   log 直下 property + ownerRef
 *   - TASK:                     log > trace（@taskno）直下 property + ownerRef
 *   - TRANSITION_METHOD:        log > trace > event 直下 property + ownerRef + resultsRef
 *   - TRANSITION_TASK:          log > trace > event 直下 property（taskNo追加）+ ownerRef + resultsRef
 *
 * 記載項目（全スコープ共通）:
 *   - time:timestamp              — 評価日時（XES 標準キー）
 *   - Alchemia:evaluationDigital  — 評価値（デジタル）
 *   - Alchemia:evaluationAnalog   — 評価（アナログ）
 * 全体評価のみ追加:
 *   - Alchemia:evaluationScore    — 評価スコア
 * TASK / TRANSITION_TASK のみ追加:
 *   - Alchemia:evaluationTaskNo   — タスク番号
 *
 * @param evaluations     - project_overall_evaluations の下位評価データ一覧
 * @param overallEval     - project_overall_evaluations の最新全体評価（null 可）
 * @param transToInstMap  - transition_id → instruction_id マッピング
 * @param transToProgMap  - transition_id → program_id マッピング
 * @param projectId       - プロジェクトID（ID 採番に使用）
 * @returns EventLogJsonRecord[]
 */
export function buildQualityEvalLogEntries(
  evaluations: SubEvaluationRow[],
  overallEval: ProjectOverallEvaluation | null,
  transToInstMap: Map<string, string>,
  transToProgMap: Map<string, string>,
  projectId: string
): EventLogJsonRecord[] {
  const entries: EventLogJsonRecord[] = [];
  let seq = 1;

  // ── 全体評価（MAIML_PROJECT）→ eventLog 直下 property + ownerRef ────────
  if (overallEval) {
    const idPrefix = `${projectId}${QUALITY_PHASE}_${seq}`;
    const properties = buildEvaluationProperties(
      overallEval.evaluated_at,
      overallEval.overall_digital,
      overallEval.overall_analog,
      null,
      overallEval.overall_score
    );
    const ownerRef = buildOwnerRefObject(
      `ownerRef_${idPrefix}`,
      overallEval.evaluated_user_id
    );
    const eventLogEntry: Record<string, unknown> = { property: properties };
    if (ownerRef) eventLogEntry['ownerRef'] = ownerRef;
    const overallEntry: EventLogJsonRecord = { eventLog: eventLogEntry };
    entries.push(overallEntry);
    seq++;
  }

  // ── 下位評価（METHOD / TASK / TRANSITION_METHOD / TRANSITION_TASK）────────
  for (const e of evaluations) {
    // 評価値・コメントが両方未設定のレコードはスキップ
    if (!e.overall_digital && !e.overall_analog) continue;

    const idPrefix = `${projectId}${QUALITY_PHASE}_${seq}`;
    const scope = e.evaluation_scope;

    if (scope === SubEvaluationScopeValues.METHOD) {
      entries.push(buildMethodEntry(e, idPrefix));
    } else if (scope === SubEvaluationScopeValues.TASK) {
      entries.push(buildTaskEntry(e, idPrefix));
    } else if (
      scope === SubEvaluationScopeValues.TRANSITION_METHOD ||
      scope === SubEvaluationScopeValues.TRANSITION_TASK
    ) {
      const programId = e.transition_id
        ? (transToProgMap.get(e.transition_id) ?? e.transition_id)
        : null;
      const instructionId = e.transition_id
        ? (transToInstMap.get(e.transition_id) ?? e.transition_id)
        : null;
      const taskNo = scope === SubEvaluationScopeValues.TRANSITION_TASK ? e.task_no : null;
      entries.push(
        buildTransitionEntry(e, idPrefix, programId, instructionId, taskNo)
      );
    }

    seq++;
  }

  return entries;
}

// ============================================================
// 内部ヘルパー: エントリ生成
// ============================================================

/**
 * METHOD 評価エントリ生成
 * 構造: eventLog > log 直下 property + ownerRef
 */
function buildMethodEntry(
  e: SubEvaluationRow,
  idPrefix: string
): EventLogJsonRecord {
  const logId = `log_${idPrefix}`;
  const properties = buildEvaluationProperties(
    e.evaluated_at,
    e.overall_digital,
    e.overall_analog,
    null
  );
  const ownerRef = buildOwnerRefObject(`ownerRef_${idPrefix}`, e.evaluated_user_id);

  const logObj: Record<string, unknown> = {
    '@id':    logId,
    '@ref':   e.method_id ?? logId,
    property: properties,
  };
  if (ownerRef) logObj['ownerRef'] = ownerRef;

  return { eventLog: { log: logObj } };
}

/**
 * TASK 評価エントリ生成
 * 構造: eventLog > log > trace（@taskno）直下 property + ownerRef
 */
function buildTaskEntry(
  e: SubEvaluationRow,
  idPrefix: string
): EventLogJsonRecord {
  const logId   = `log_${idPrefix}`;
  const traceId = `trace_${idPrefix}`;
  const taskNo  = e.task_no;

  const properties = buildEvaluationProperties(
    e.evaluated_at,
    e.overall_digital,
    e.overall_analog,
    taskNo
  );
  const ownerRef = buildOwnerRefObject(`ownerRef_${idPrefix}`, e.evaluated_user_id);

  const traceObj: Record<string, unknown> = {
    '@id':    traceId,
    '@ref':   traceId,
    property: properties,
  };
  if (taskNo != null) traceObj['@taskno'] = String(taskNo);
  if (ownerRef) traceObj['ownerRef'] = ownerRef;

  return {
    eventLog: {
      log: {
        '@id':  logId,
        '@ref': e.method_id ?? logId,
        trace:  traceObj,
      },
    },
  };
}
/**
 * TRANSITION_METHOD / TRANSITION_TASK 評価エントリ生成
 * 構造: eventLog > log > trace > event 直下 property + ownerRef + resultsRef
 */
function buildTransitionEntry(
  e: SubEvaluationRow,
  idPrefix: string,
  programId: string | null,
  instructionId: string | null,
  taskNo: number | null
): EventLogJsonRecord {
  const logId   = `log_${idPrefix}`;
  const traceId = `trace_${idPrefix}`;
  const eventId = `event_${idPrefix}`;

  const properties = buildEvaluationProperties(
    e.evaluated_at,
    e.overall_digital,
    e.overall_analog,
    taskNo
  );
  const ownerRef = buildOwnerRefObject(`ownerRef_${idPrefix}`, e.evaluated_user_id);

  // resultsRef: data 層の results ID（buildDataXML の命名規則: results_{method_id}_{task_no}）
  const resultsId = e.method_id
    ? `results_${e.method_id}_${e.task_no ?? 'null'}`
    : null;

  const eventObj: Record<string, unknown> = {
    '@id':    eventId,
    '@ref':   instructionId ?? eventId,
    property: properties,
  };
  if (resultsId) eventObj['resultsRef'] = { '@ref': resultsId };
  if (ownerRef)  eventObj['ownerRef']   = ownerRef;

  return {
    eventLog: {
      log: {
        '@id':  logId,
        '@ref': e.method_id ?? logId,
        trace: {
          '@id':  traceId,
          '@ref': programId ?? traceId,
          event:  eventObj,
        },
      },
    },
  };
}

// ============================================================
// 内部ヘルパー: property 配列生成
// ============================================================

/**
 * 評価共通 property 配列を生成する
 * buildPropertiesXML() 期待形式（#text 直接）に統一。
 * 値が null / undefined の場合はそのプロパティをスキップする。
 */
function buildEvaluationProperties(
  evaluatedAt: Date | null | undefined,
  digital: string | null | undefined,
  analog: string | null | undefined,
  taskNo: number | null | undefined,
  score?: number | null
): Record<string, unknown>[] {
  const properties: Record<string, unknown>[] = [];

  if (evaluatedAt != null) {
    const timestampProp = { '@key': 'Alchemia:timestamp', '@xsi:type': 'dateTimeType', '#text': new Date(evaluatedAt).toISOString() };
    properties.push(timestampProp);
  }
  if (digital != null) {
    const digitalProp = { '@key': 'Alchemia:evaluationDigital', '@xsi:type': 'stringType', '#text': String(digital) };
    properties.push(digitalProp);
  }
  if (score != null) {
    const scoreProp = { '@key': 'Alchemia:evaluationScore', '@xsi:type': 'doubleType', '#text': String(score) };
    properties.push(scoreProp);
  }
  if (analog != null) {
    const analogProp = { '@key': 'Alchemia:evaluationAnalog', '@xsi:type': 'stringType', '#text': String(analog) };
    properties.push(analogProp);
  }
  if (taskNo != null) {
    const taskNoProp = { '@key': 'Alchemia:evaluationTaskNo', '@xsi:type': 'intType', '#text': taskNo };
    properties.push(taskNoProp);
  }

  return properties;
}

// ============================================================
// 内部ヘルパー: ownerRef オブジェクト生成
// ============================================================

/**
 * ownerRef オブジェクトを生成する
 * evaluatedUserId が null / undefined の場合は null を返す（ownerRef 省略）。
 * userId の "@" は "_" に置換（既存の指示系 ownerRef と同じ規則）。
 */
function buildOwnerRefObject(
  id: string,
  evaluatedUserId: string | null | undefined
): Record<string, unknown> | null {
  if (!evaluatedUserId) return null;
  const ownerRefObj = {
    '@id':  id,
    '@ref': evaluatedUserId.replace('@', '_'),
  };
  return ownerRefObj;
}

// ============================================================
// removeUncertaintiesWrapper
// ============================================================

/**
 * MAiML XML 文字列から <Uncertainties>...</Uncertainties> ラッパータグを除去し、
 * 内包する <Uncertainty> 要素を直接配置する
 *
 * @param maimlXml - 変換前の MAiML XML 文字列
 * @returns 変換後の MAiML XML 文字列
 */
export function removeUncertaintiesWrapper(maimlXml: string): string {
  if (!/<Uncertainties[\s>]/i.test(maimlXml)) {
    return maimlXml;
  }

  const wrapperMatch = maimlXml.match(/<Uncertainties[^>]*>([\s\S]*?)<\/Uncertainties>/i);
  if (!wrapperMatch) {
    return maimlXml;
  }

  const innerContent = wrapperMatch[1];

  const normalizedContent = innerContent
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      return trimmed ? `  ${trimmed}` : '';
    })
    .filter((line, idx, arr) => {
      if (idx === 0 || idx === arr.length - 1) return line.trim() !== '';
      return true;
    })
    .join('\n');

  return maimlXml.replace(/<Uncertainties[^>]*>[\s\S]*?<\/Uncertainties>/i, normalizedContent);
}
