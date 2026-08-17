/**
 * aggregationCalculatorService.ts
 *
 * 階層別サマリー算出ロジック（集計エンジン中核）
 *
 * @remarks
 * 設計書 §6 の二段集約アルゴリズムを実装する。
 * - 第1段：対象単位ロールアップ（多基準の代表値決定）
 * - 第2段：階層集計（階層代表ステータス・スコア決定）
 *
 * @module aggregationCalculatorService
 * @version 1.0.0
 */

import type { ExperimentEvaluationRow } from '../repositories/experimentEvaluationRepository';
import type {
  AggregationRule,
  LevelSummary,
  AttentionItem,
  AggregationSnapshot,
} from '../types/aggregationRule';

// ─────────────────────────────────────────────────────────────────────────────
// 内部ユーティリティ型
// ─────────────────────────────────────────────────────────────────────────────

/** 評価値の型ガード用リテラル */
type EvalValue = '良好' | '要確認' | '不良';

/** 対象単位キー */
interface TargetKey {
  unit: 'method' | 'task' | 'transition';
  methodId: string | null;
  taskNo: number | null;
  transitionId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 評価値写像ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

const VALID_EVAL_VALUES = new Set<string>(['良好', '要確認', '不良']);

/** 評価値が有効な三値かどうかを検証する */
function isValidEvalValue(v: string | null | undefined): v is EvalValue {
  return v != null && VALID_EVAL_VALUES.has(v);
}

/** 評価値を重大度（順序尺度）に変換する: 良好=0, 要確認=1, 不良=2 */
function toSeverity(v: EvalValue): number {
  switch (v) {
    case '良好':   return 0;
    case '要確認': return 1;
    case '不良':   return 2;
  }
}

/** 重大度を評価値に逆変換する */
function fromSeverity(s: number): EvalValue {
  switch (s) {
    case 0:  return '良好';
    case 1:  return '要確認';
    default: return '不良';
  }
}

/**
 * 評価値を数値スコアに写像する
 *
 * @param v    - 評価値
 * @param rule - 集約ルール
 */
export function resolveNumericScore(v: EvalValue, rule: AggregationRule): number {
  switch (v) {
    case '良好':   return rule.score_good;
    case '要確認': return rule.score_caution;
    case '不良':   return rule.score_bad;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 対象キー生成
// ─────────────────────────────────────────────────────────────────────────────

/** evaluation_unit からロールアップ後の階層種別を決定する */
function resolveLevel(
  evaluationUnit: string,
  _transitionHierarchy: AggregationRule['transition_hierarchy']
): 'method' | 'task' | 'transition' | null {
  switch (evaluationUnit) {
    case 'method':            return 'method';
    case 'task':              return 'task';
    case 'transition_method':
    case 'transition_task':   return 'transition';
    default:                  return null;
  }
}

/** 対象単位のユニークキー文字列を生成する */
function makeTargetKeyString(key: TargetKey): string {
  return `${key.unit}::${key.methodId ?? ''}::${key.taskNo ?? ''}::${key.transitionId ?? ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 第1段：多基準ロールアップ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 多基準ロールアップ: 同一対象に複数評価基準がある場合の代表値を決定する
 *
 * @param values - 同一対象の評価値リスト（null = 未評価）
 * @param rule   - 集約ルール
 * @returns 代表評価値（全件 null の場合は null）
 */
export function applyTargetRollup(
  values: Array<EvalValue | null>,
  rule: AggregationRule
): EvalValue | null {
  const valid = values.filter(isValidEvalValue);
  if (valid.length === 0) return null;

  switch (rule.target_rollup) {
    case 'WORST_CASE': {
      const maxSev = Math.max(...valid.map(toSeverity));
      return fromSeverity(maxSev);
    }
    case 'MAJORITY': {
      const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
      for (const v of valid) counts[toSeverity(v)]++;
      const maxCount = Math.max(...Object.values(counts));
      const candidates = Object.entries(counts)
        .filter(([, c]) => c === maxCount)
        .map(([sev]) => Number(sev));
      return fromSeverity(Math.max(...candidates));
    }
    case 'AVERAGE': {
      const avg = valid.map(toSeverity).reduce((a, b) => a + b, 0) / valid.length;
      return fromSeverity(Math.round(avg));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 第2段：階層集計
// ─────────────────────────────────────────────────────────────────────────────

/** 階層集計: 対象代表値リストから LevelSummary を算出する */
function calcLevelSummary(
  level: LevelSummary['level'],
  reps: Array<EvalValue | null>,
  rule: AggregationRule
): LevelSummary {
  const missing = reps.filter((v) => v === null).length;
  let scoringReps: EvalValue[];

  if (rule.missing_handling === 'TREAT_AS_GOOD') {
    scoringReps = reps.map((v) => (v === null ? '良好' : v));
  } else {
    scoringReps = reps.filter(isValidEvalValue);
  }

  const good    = scoringReps.filter((v) => v === '良好').length;
  const caution = scoringReps.filter((v) => v === '要確認').length;
  const bad     = scoringReps.filter((v) => v === '不良').length;
  const total   = reps.length;

  let statusRepresentative: LevelSummary['statusRepresentative'] = null;
  if (scoringReps.length > 0) {
    if (rule.level_status_rule === 'WORST_CASE') {
      const maxSev = Math.max(...scoringReps.map(toSeverity));
      statusRepresentative = fromSeverity(maxSev);
    } else {
      const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
      for (const v of scoringReps) counts[toSeverity(v)]++;
      const maxCount = Math.max(...Object.values(counts));
      const candidates = Object.entries(counts)
        .filter(([, c]) => c === maxCount)
        .map(([sev]) => Number(sev));
      statusRepresentative = fromSeverity(Math.max(...candidates));
    }
  }

  let scoreAverage: number | null = null;
  if (scoringReps.length > 0) {
    if (rule.level_score_rule === 'MEAN') {
      const sum = scoringReps.reduce((acc, v) => acc + resolveNumericScore(v, rule), 0);
      scoreAverage = Math.round((sum / scoringReps.length) * 10) / 10;
    } else {
      scoreAverage = Math.min(...scoringReps.map((v) => resolveNumericScore(v, rule)));
    }
  }

  return { level, total, good, caution, bad, missing, statusRepresentative, scoreAverage };
}

// ─────────────────────────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 階層別サマリーを算出する（メイン関数）
 *
 * @param evaluations - findByProject() で取得した下位評価データ
 * @param rule        - 適用する集約ルール
 * @returns 階層別サマリー配列
 */
export function calculateLevelSummaries(
  evaluations: ExperimentEvaluationRow[],
  rule: AggregationRule
): LevelSummary[] {
  const targets = evaluations.filter(
    (e) => resolveLevel(e.evaluation_unit, rule.transition_hierarchy) !== null
  );

  // 第1段: 対象単位ごとにグループ化して代表値を決定
  const groupMap = new Map<
    string,
    { key: TargetKey; values: Array<EvalValue | null> }
  >();

  for (const e of targets) {
    const level = resolveLevel(e.evaluation_unit, rule.transition_hierarchy)!;
    const key: TargetKey = {
      unit:         level,
      methodId:     e.method_id,
      taskNo:       e.task_no,
      transitionId: e.transition_id,
    };
    const keyStr = makeTargetKeyString(key);
    if (!groupMap.has(keyStr)) {
      groupMap.set(keyStr, { key, values: [] });
    }
    const evalVal = isValidEvalValue(e.evaluation_value) ? e.evaluation_value : null;
    groupMap.get(keyStr)!.values.push(evalVal);
  }

  // ロールアップ → 第2段: 階層別集計
  const levelMap: Record<string, Array<EvalValue | null>> = {
    method: [], task: [], transition: [],
  };
  for (const { key, values } of groupMap.values()) {
    levelMap[key.unit].push(applyTargetRollup(values, rule));
  }

  const ORDER: LevelSummary['level'][] = ['method', 'task', 'transition'];
  return ORDER
    .filter((lvl) => levelMap[lvl].length > 0)
    .map((lvl) => calcLevelSummary(lvl, levelMap[lvl], rule));
}

/**
 * 要注意項目を抽出する（良好以外の評価を severity 降順でソート）
 *
 * @param evaluations - findByProject() で取得した下位評価データ
 * @returns 要注意項目リスト（不良 → 要確認 順）
 */
export function extractAttentionItems(
  evaluations: ExperimentEvaluationRow[]
): AttentionItem[] {
  const items: AttentionItem[] = evaluations
    .filter(
      (e) =>
        e.evaluation_unit !== 'project' &&
        (e.evaluation_value === '不良' || e.evaluation_value === '要確認')
    )
    .map((e) => ({
      evaluationUnit:  e.evaluation_unit,
      methodId:        e.method_id,
      taskNo:          e.task_no,
      transitionId:    e.transition_id,
      evaluationValue: e.evaluation_value as '不良' | '要確認',
      comment:         e.comment,
      severity:        (e.evaluation_value === '不良' ? 'bad' : 'caution') as 'bad' | 'caution',
    }));

  items.sort((a, b) => {
    const order = { bad: 0, caution: 1 } as const;
    return order[a.severity] - order[b.severity];
  });

  return items;
}

/**
 * 集計断面スナップショットを生成する（全体評価登録時に使用）
 *
 * @param evaluations - 集計入力となった下位評価データ
 * @param rule        - 適用ルール
 * @returns AggregationSnapshot
 */
export function buildAggregationSnapshot(
  evaluations: ExperimentEvaluationRow[],
  rule: AggregationRule
): AggregationSnapshot {
  return {
    levels:            calculateLevelSummaries(evaluations, rule),
    sourceEvaluations: evaluations,
    attentionItems:    extractAttentionItems(evaluations),
  };
}
