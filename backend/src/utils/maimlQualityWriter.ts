/**
 * maimlQualityWriter.ts
 *
 * 品質評価データを MAiML <eventLog> に書き込むためのユーティリティ関数群。
 *
 * 提供する関数:
 *   - resolveTransitionToInstructionMap() - transition_id → instruction_id マッピング生成
 *   - resolveInstructionToResultsMap()    - instruction_id → results_id マッピング生成
 *   - buildQualityEvalLogEntries()        - 品質評価データ → EventLogJsonRecord[] 変換
 *   - removeUncertaintiesWrapper()        - <Uncertainties> ラッパー除去
 *
 * @module maimlQualityWriter
 * @version 1.0.0
 */

import type { EventLogJsonRecord } from './maimlDataWriter';
import type { ExperimentEvaluation } from '../repositories/experimentEvaluationRepository';
import type { ProjectOverallEvaluation } from '../types/projectOverallEvaluation';

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
// buildQualityEvalLogEntries
// ============================================================

/**
 * 品質評価データを buildEventLogXML() が受け取れる EventLogJsonRecord[] 形式に変換
 *
 * 変換方針:
 *   - project 全体評価は eventLog > log（id: quality_project_{projectId}）として出力
 *   - method / task / transition 評価は evalUnit ごとに log エントリとして出力
 *   - 評価値・コメントは property 要素（key: quality:*）として格納
 *   - resultsRef は instToResultsMap を通じて解決（解決できない場合は省略）
 *
 * @param evaluations     - experiment_evaluation テーブルの評価データ一覧
 * @param overallEval     - project_overall_evaluations テーブルの最新全体評価（null 可）
 * @param transToInstMap  - transition_id → instruction_id マッピング
 * @param instToResultsMap - instruction_id → results_id マッピング
 * @returns EventLogJsonRecord[]
 */
export function buildQualityEvalLogEntries(
  evaluations: ExperimentEvaluation[],
  overallEval: ProjectOverallEvaluation | null,
  transToInstMap: Map<string, string>,
  instToResultsMap: Map<string, string>
): EventLogJsonRecord[] {
  const entries: EventLogJsonRecord[] = [];

  // ── 全体評価（overallEval）→ log エントリ ─────────────────────────────
  if (overallEval) {
    const projectId = overallEval.project_id;
    const logId = `quality_project_${projectId}`;
    const traceId = `${logId}_trace`;
    const eventId = `${logId}_event`;

    const overallProperties: Record<string, unknown>[] = [];

    if (overallEval.overall_digital != null) {
      overallProperties.push({
        '@key': 'quality:overallDigital',
        '@xsi:type': 'stringType',
        value: { '#text': String(overallEval.overall_digital) },
      });
    }
    if (overallEval.overall_score != null) {
      overallProperties.push({
        '@key': 'quality:overallScore',
        '@xsi:type': 'doubleType',
        value: { '#text': String(overallEval.overall_score) },
      });
    }
    if (overallEval.overall_analog != null) {
      overallProperties.push({
        '@key': 'quality:overallAnalog',
        '@xsi:type': 'stringType',
        value: { '#text': String(overallEval.overall_analog) },
      });
    }
    if (overallEval.evaluated_at) {
      overallProperties.push({
        '@key': 'quality:evaluatedAt',
        '@xsi:type': 'stringType',
        value: { '#text': new Date(overallEval.evaluated_at).toISOString() },
      });
    }

    entries.push({
      eventLog: {
        log: {
          '@id': logId,
          '@ref': logId,
          trace: {
            '@id': traceId,
            '@ref': traceId,
            event: {
              '@id': eventId,
              '@ref': eventId,
              property: overallProperties,
            },
          },
        },
      },
    });
  }

  // ── 階層別評価（evaluations）→ evaluation_unit ごとに log エントリ ─────
  const unitGroupMap = new Map<string, ExperimentEvaluation[]>();
  for (const e of evaluations) {
    if (e.evaluation_unit === 'project') continue;
    if (!e.evaluation_value) continue;

    const groupKey = [
      e.evaluation_unit,
      e.method_id ?? '',
      e.task_no != null ? String(e.task_no) : '',
      e.transition_id ?? '',
    ].join('::');

    const group = unitGroupMap.get(groupKey) ?? [];
    group.push(e);
    unitGroupMap.set(groupKey, group);
  }

  for (const [groupKey, group] of unitGroupMap) {
    const firstEval = group[0];
    const safeSuffix = groupKey.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 64);
    const logId = `quality_${safeSuffix}`;
    const traceId = `${logId}_trace`;
    const eventId = `${logId}_event`;

    const transitionId = firstEval.transition_id;
    const instructionId = transitionId ? (transToInstMap.get(transitionId) ?? null) : null;
    const resultsId = instructionId ? (instToResultsMap.get(instructionId) ?? null) : null;
    const logRef = transitionId ?? instructionId ?? logId;

    const properties: Record<string, unknown>[] = [];

    properties.push({
      '@key': 'quality:evaluationUnit',
      '@xsi:type': 'stringType',
      value: { '#text': firstEval.evaluation_unit },
    });

    if (firstEval.method_id) {
      properties.push({
        '@key': 'quality:methodId',
        '@xsi:type': 'stringType',
        value: { '#text': firstEval.method_id },
      });
    }
    if (firstEval.task_no != null) {
      properties.push({
        '@key': 'quality:taskNo',
        '@xsi:type': 'intType',
        value: { '#text': String(firstEval.task_no) },
      });
    }
    if (transitionId) {
      properties.push({
        '@key': 'quality:transitionId',
        '@xsi:type': 'stringType',
        value: { '#text': transitionId },
      });
    }

    for (const e of group) {
      const keyPrefix = `quality:eval_${e.uncertainty_key.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      if (e.evaluation_value) {
        properties.push({
          '@key': `${keyPrefix}:value`,
          '@xsi:type': 'stringType',
          value: { '#text': e.evaluation_value },
        });
      }
      if (e.comment) {
        properties.push({
          '@key': `${keyPrefix}:comment`,
          '@xsi:type': 'stringType',
          value: { '#text': e.comment },
        });
      }
    }

    const eventObj: Record<string, unknown> = {
      '@id': eventId,
      '@ref': eventId,
      property: properties,
    };
    if (resultsId) {
      eventObj.resultsRef = { '@ref': resultsId };
    }

    entries.push({
      eventLog: {
        log: {
          '@id': logId,
          '@ref': logRef,
          trace: {
            '@id': traceId,
            '@ref': traceId,
            event: eventObj,
          },
        },
      },
    });
  }

  return entries;
}


/**
 * MAiML XML をパースして instruction_id → results_id マッピングを生成する
 *
 * <data> セクション内の <results id="..."> を列挙する。
 * results_id と同名の instruction_id が対応することを想定。
 *
 * @param maimlXml - MAiML XML 文字列
 * @returns instruction_id をキー、results_id を値とする Map
 */
export function resolveInstructionToResultsMap(maimlXml: string): Map<string, string> {
  const result = new Map<string, string>();

  const resultsPattern = /<results\s[^>]*id="([^"]+)"[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = resultsPattern.exec(maimlXml)) !== null) {
    const resultsId = match[1];
    result.set(resultsId, resultsId);
  }

  return result;
}

// ============================================================
// removeUncertaintiesWrapper
// ============================================================

/**
 * MAiML XML 文字列から <Uncertainties>...</Uncertainties> ラッパータグを除去し、
 * 内包する <Uncertainty> 要素を直接配置する
 *
 * 変換前:
 *   <Uncertainties>
 *     <Uncertainty .../>
 *   </Uncertainties>
 *
 * 変換後:
 *   <Uncertainty .../>
 *
 * <Uncertainties> タグが存在しない場合はそのまま返す。
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

  // ラッパー内の各行を正規化（先頭スペースを2スペースに統一）
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

