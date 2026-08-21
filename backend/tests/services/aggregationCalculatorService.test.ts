/**
 * aggregationCalculatorService ユニットテスト
 *
 * @remarks
 * 設計書 §6.3 の算出例（サンプル7件・既定ルール）を正とした検証。
 * - メソッド別: 要確認 / 75.0
 * - タスク別:   不良   / 50.0
 * - トランジション別: 要確認 / 83.3
 */

import {
  calculateLevelSummaries,
  extractAttentionItems,
  applyTargetRollup,
  resolveNumericScore,
} from '../../src/services/aggregationCalculatorService';
import type { SubEvaluationRow } from '../../src/types/projectOverallEvaluation';
import type { AggregationRule, LevelSummary } from '../../src/types/aggregationRule';

/** 既定ルール（設計書の既定値と一致） */
const DEFAULT_RULE: AggregationRule = {
  rule_id:              'test-rule-001',
  organization_id:      'org-001',
  version:              1,
  is_active:            true,
  score_good:           100,
  score_caution:        50,
  score_bad:            0,
  target_rollup:        'WORST_CASE',
  level_status_rule:    'WORST_CASE',
  level_score_rule:     'MEAN',
  missing_handling:     'SEPARATE_COUNT',
  transition_hierarchy: 'MERGE',
  create_user_id:       null,
  create_at:            new Date('2026-08-01T00:00:00Z'),
  update_user_id:       null,
  update_at:            new Date('2026-08-01T00:00:00Z'),
};

/** テスト用評価行のビルダー */
function makeEvalRow(
  evaluation_unit: string,
  method_id: string | null,
  task_no: number | null,
  transition_id: string | null,
  evaluation_value: string | null
): SubEvaluationRow {
  return {
    evaluation_seq:   1,
    organization_id:  'org-001',
    project_id:       'proj-001',
    evaluation_scope: evaluation_unit,
    method_id,
    task_no,
    transition_id,
    evaluated_user_id: 'user-001',
    evaluated_at:     new Date('2026-08-17T00:00:00Z'),
    overall_digital:  evaluation_value as '良好' | '要確認' | '不良' | null,
    overall_analog:   null,
    create_user_id:   'user-001',
    create_at:        new Date('2026-08-17T00:00:00Z'),
    update_user_id:   null,
    update_at:        null,
    // aggregationCalculatorService 互換フィールド
    evaluation_unit,
    evaluation_value,
    comment:          null,
  };
}

/** 設計書サンプル7件（§6.3 算出例） */
const SAMPLE_7: SubEvaluationRow[] = [
  makeEvalRow('method',            'method_001', null, null,  '良好'),
  makeEvalRow('method',            'method_002', null, null,  '要確認'),
  makeEvalRow('task',              'method_001', 1,    null,  '良好'),
  makeEvalRow('task',              'method_001', 2,    null,  '不良'),
  makeEvalRow('transition_method', 'method_001', null, 'T001','良好'),
  makeEvalRow('transition_task',   'method_001', 1,    'T002','良好'),
  makeEvalRow('transition_task',   'method_001', 2,    'T003','要確認'),
];

// ─────────────────────────────────────────────────────────────────────────────

describe('aggregationCalculatorService', () => {

  describe('resolveNumericScore', () => {
    it('既定ルールで良好→100', () => expect(resolveNumericScore('良好', DEFAULT_RULE)).toBe(100));
    it('既定ルールで要確認→50', () => expect(resolveNumericScore('要確認', DEFAULT_RULE)).toBe(50));
    it('既定ルールで不良→0', () => expect(resolveNumericScore('不良', DEFAULT_RULE)).toBe(0));
    it('カスタムルールで要確認→70', () => {
      expect(resolveNumericScore('要確認', { ...DEFAULT_RULE, score_caution: 70 })).toBe(70);
    });
  });

  describe('applyTargetRollup', () => {
    it('WORST_CASE: 最悪値（不良）を採用する', () => {
      expect(applyTargetRollup(['良好', '不良', '要確認'], DEFAULT_RULE)).toBe('不良');
    });
    it('WORST_CASE: 全件良好なら良好', () => {
      expect(applyTargetRollup(['良好', '良好'], DEFAULT_RULE)).toBe('良好');
    });
    it('MAJORITY: 多数決 (良好2件 vs 不良1件) → 良好', () => {
      const rule = { ...DEFAULT_RULE, target_rollup: 'MAJORITY' as const };
      expect(applyTargetRollup(['良好', '良好', '不良'], rule)).toBe('良好');
    });
    it('MAJORITY: 同数タイは重大側（不良）へ寄せる', () => {
      const rule = { ...DEFAULT_RULE, target_rollup: 'MAJORITY' as const };
      expect(applyTargetRollup(['良好', '不良'], rule)).toBe('不良');
    });
    it('AVERAGE: 良好+不良 → 要確認', () => {
      const rule = { ...DEFAULT_RULE, target_rollup: 'AVERAGE' as const };
      expect(applyTargetRollup(['良好', '不良'], rule)).toBe('要確認');
    });
    it('全件 null（未評価）なら null', () => {
      expect(applyTargetRollup([null, null], DEFAULT_RULE)).toBeNull();
    });
  });

  describe('calculateLevelSummaries', () => {
    it('【テスト1】全件良好: 全階層 代表=良好, スコア=100', () => {
      const allGood = SAMPLE_7.map((e) => ({ ...e, evaluation_value: '良好' }));
      const summaries = calculateLevelSummaries(allGood, DEFAULT_RULE);
      for (const s of summaries) {
        expect(s.statusRepresentative).toBe('良好');
        expect(s.scoreAverage).toBe(100);
        expect(s.bad).toBe(0);
      }
    });

    it('【テスト2】設計書サンプル7件（既定ルール）', () => {
      const summaries = calculateLevelSummaries(SAMPLE_7, DEFAULT_RULE);
      const byLevel = Object.fromEntries(summaries.map((s: LevelSummary) => [s.level, s]));
      // メソッド別: N=2, 良好1, 要確認1 → 要確認 / 75
      expect(byLevel['method'].total).toBe(2);
      expect(byLevel['method'].statusRepresentative).toBe('要確認');
      expect(byLevel['method'].scoreAverage).toBe(75);
      // タスク別: N=2, 良好1, 不良1 → 不良 / 50
      expect(byLevel['task'].total).toBe(2);
      expect(byLevel['task'].statusRepresentative).toBe('不良');
      expect(byLevel['task'].scoreAverage).toBe(50);
      // トランジション別: N=3, 良好2, 要確認1 → 要確認 / ≈83.3
      expect(byLevel['transition'].total).toBe(3);
      expect(byLevel['transition'].statusRepresentative).toBe('要確認');
      expect(byLevel['transition'].scoreAverage).toBeCloseTo(83.3, 0);
    });

    it('【テスト5】未評価 SEPARATE_COUNT: 未評価が別カウント', () => {
      const rows = [
        makeEvalRow('method', 'method_001', null, null, '良好'),
        makeEvalRow('method', 'method_002', null, null, null),
      ];
      const summaries = calculateLevelSummaries(rows, DEFAULT_RULE);
      const method = summaries.find((s) => s.level === 'method')!;
      expect(method.total).toBe(2);
      expect(method.missing).toBe(1);
      expect(method.scoreAverage).toBe(100);
    });

    it('【テスト7】未評価 TREAT_AS_GOOD: 未評価を良好として集計', () => {
      const rule = { ...DEFAULT_RULE, missing_handling: 'TREAT_AS_GOOD' as const };
      const rows = [
        makeEvalRow('method', 'method_001', null, null, '不良'),
        makeEvalRow('method', 'method_002', null, null, null),
      ];
      const summaries = calculateLevelSummaries(rows, rule);
      const method = summaries.find((s) => s.level === 'method')!;
      expect(method.scoreAverage).toBe(50); // (0+100)/2
      expect(method.good).toBe(1);
    });

    it('【テスト8】スコア写像カスタマイズ（100/70/30）', () => {
      const rule = { ...DEFAULT_RULE, score_good: 100, score_caution: 70, score_bad: 30 };
      const rows = [
        makeEvalRow('method', 'method_001', null, null, '良好'),
        makeEvalRow('method', 'method_002', null, null, '不良'),
      ];
      const summaries = calculateLevelSummaries(rows, rule);
      const method = summaries.find((s) => s.level === 'method')!;
      expect(method.scoreAverage).toBe(65); // (100+30)/2
    });
  });

  describe('extractAttentionItems', () => {
    it('良好以外を抽出し、不良→要確認の順にソートする', () => {
      const rows = [
        makeEvalRow('method', 'method_001', null, null, '要確認'),
        makeEvalRow('method', 'method_002', null, null, '不良'),
        makeEvalRow('method', 'method_003', null, null, '良好'),
      ];
      const items = extractAttentionItems(rows);
      expect(items).toHaveLength(2);
      expect(items[0].severity).toBe('bad');
      expect(items[1].severity).toBe('caution');
    });

    it('project 単位の評価は含めない', () => {
      const rows = [
        makeEvalRow('project', null, null, null, '不良'),
        makeEvalRow('method', 'method_001', null, null, '不良'),
      ];
      const items = extractAttentionItems(rows);
      expect(items).toHaveLength(1);
      expect(items[0].evaluationUnit).toBe('method');
    });
  });
});

