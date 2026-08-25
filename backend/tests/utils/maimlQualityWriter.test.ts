/**
 * maimlQualityWriter.test.ts
 *
 * maimlQualityWriter.ts のユニットテスト
 */

import {
  resolveTransitionToInstructionMap,
  resolveInstructionToResultsMap,
  buildQualityEvalLogEntries,
  removeUncertaintiesWrapper,
} from '../../src/utils/maimlQualityWriter';
import type { SubEvaluationRow } from '../../src/types/projectOverallEvaluation';
import type { ProjectOverallEvaluation } from '../../src/types/projectOverallEvaluation';

const SAMPLE_MAIML_XML = `<?xml version="1.0" encoding="utf-8"?>
<maiml version="1.0" xmlns="http://www.maiml.org/schemas">
  <document id="doc-001"><uuid>7066fe49-ea37-46af-942b-64a9280bda27</uuid></document>
  <protocol id="protocol-001">
    <uuid>38c8e79c-603d-4cc1-aed2-50b4470062a9</uuid>
    <method id="method-001">
      <uuid>42dd5831-1498-4a4e-99a6-658ee26002a5</uuid>
      <pnml id="pnml-001">
        <uuid>cc23e273-cce6-4a38-ae3d-23e1614f522f</uuid>
        <transition id="transition-001"><position x="200" y="100"/></transition>
        <transition id="transition-002"><position x="300" y="100"/></transition>
      </pnml>
      <program id="program-001">
        <uuid>88f2d18a-e287-475d-8a2f-4ae7b5cfb117</uuid>
        <instruction id="instruction-001">
          <uuid>01f835ab-b4be-4926-b766-c192b132d16e</uuid>
          <transitionRef id="tref-001" ref="transition-001"/>
        </instruction>
        <instruction id="instruction-002">
          <uuid>02f835ab-b4be-4926-b766-c192b132d16e</uuid>
          <transitionRef id="tref-002" ref="transition-002"/>
        </instruction>
      </program>
    </method>
  </protocol>
  <data id="dataID">
    <uuid>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</uuid>
    <results id="results-001"><uuid>11111111-2222-3333-4444-555555555555</uuid></results>
    <results id="results-002"><uuid>22222222-3333-4444-5555-666666666666</uuid></results>
  </data>
  <eventLog id="eventLogID">
    <uuid>99999999-aaaa-bbbb-cccc-dddddddddddd</uuid>
    <log id="log-001" ref="log-001">
      <uuid>ffffffff-0000-1111-2222-333333333333</uuid>
      <trace id="trace-001" ref="trace-001">
        <uuid>44444444-5555-6666-7777-888888888888</uuid>
        <event id="event-001" ref="event-001">
          <uuid>99999999-aaaa-bbbb-cccc-eeeeeeeeeeee</uuid>
        </event>
      </trace>
    </log>
  </eventLog>
</maiml>`;

const SAMPLE_WITH_UNCERTAINTIES = `<?xml version="1.0" encoding="utf-8"?>
<maiml version="1.0" xmlns="http://www.maiml.org/schemas">
  <document id="doc-001"><uuid>7066fe49-ea37-46af-942b-64a9280bda27</uuid></document>
  <Uncertainties>
    <Uncertainty evaluationUnit="project" nameSpaceId="ns-001" uncertaintyKey="uc-001" ucVersion="1" value="良好"/>
    <Uncertainty evaluationUnit="method" nameSpaceId="ns-001" uncertaintyKey="uc-001" ucVersion="1" value="要確認"/>
  </Uncertainties>
</maiml>`;

// ─────────────────────────────────────────────────────────────────────────────
// resolveTransitionToInstructionMap
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveTransitionToInstructionMap', () => {
  test('サンプル MAiML XML から transition_id → instruction_id マッピングを正しく生成する', () => {
    const map = resolveTransitionToInstructionMap(SAMPLE_MAIML_XML);
    expect(map.size).toBe(2);
    expect(map.get('transition-001')).toBe('instruction-001');
    expect(map.get('transition-002')).toBe('instruction-002');
  });

  test('instruction が存在しない XML では空の Map を返す', () => {
    const xml = '<maiml><protocol><method id="m1"><pnml><transition id="t1"/></pnml></method></protocol></maiml>';
    const map = resolveTransitionToInstructionMap(xml);
    expect(map.size).toBe(0);
  });

  test('同一 transition_id が複数 instruction で参照された場合、最初のものを採用する', () => {
    const xml = `<maiml>
      <instruction id="inst-001"><transitionRef ref="t-001"/></instruction>
      <instruction id="inst-002"><transitionRef ref="t-001"/></instruction>
    </maiml>`;
    const map = resolveTransitionToInstructionMap(xml);
    expect(map.get('t-001')).toBe('inst-001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveInstructionToResultsMap
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveInstructionToResultsMap', () => {
  test('サンプル MAiML XML から results_id マッピングを正しく生成する', () => {
    const map = resolveInstructionToResultsMap(SAMPLE_MAIML_XML);
    expect(map.size).toBe(2);
    expect(map.has('results-001')).toBe(true);
    expect(map.has('results-002')).toBe(true);
  });

  test('results 要素がない XML では空の Map を返す', () => {
    const xml = '<maiml><data id="d1"><uuid>xxx</uuid></data></maiml>';
    const map = resolveInstructionToResultsMap(xml);
    expect(map.size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildQualityEvalLogEntries
// ─────────────────────────────────────────────────────────────────────────────

describe('buildQualityEvalLogEntries', () => {
  const baseEvaluation: SubEvaluationRow = {
    evaluation_seq:    1,
    organization_id:  'org-001',
    project_id:       'proj-001',
    evaluation_scope: 'method',
    evaluation_unit:  'method',
    method_id:        'method-001',
    task_no:          null,
    transition_id:    'transition-001',
    evaluation_value: '良好',
    comment:          'テストコメント',
    overall_digital:  '良好',
    overall_analog:   'テストコメント',
    evaluated_user_id: 'user-001',
    evaluated_at:     new Date('2026-08-17T15:00:00Z'),
    create_user_id:   'user-001',
    create_at:        new Date('2026-08-17T15:00:00Z'),
    update_user_id:   null,
    update_at:        null,
  };

  const baseOverallEval: ProjectOverallEvaluation = {
    evaluation_seq:        1,
    organization_id:       'org-001',
    project_id:            'proj-001',
    evaluation_scope:      'MAIML_PROJECT',
    evaluated_user_id:     'user-001',
    evaluated_at:          new Date('2026-08-17T15:00:00Z'),
    overall_digital:       '良好',
    overall_score:         85,
    overall_analog:        'プロジェクト全体として品質良好',
    applied_rule_id:       'rule-001',
    applied_rule_version:  1,
    applied_rule_snapshot: {} as any,
    aggregation_snapshot:  {} as any,
    create_user_id:        'user-001',
    create_at:             new Date('2026-08-17T15:00:00Z'),
    update_user_id:        null,
    update_at:             new Date('2026-08-17T15:00:00Z'),
  };

  const transToInstMap = new Map([['transition-001', 'instruction-001']]);
  const instToResultsMap = new Map([['instruction-001', 'results-001']]);

  test('全体評価のみの場合、1件の log エントリを生成する', () => {
    const entries = buildQualityEvalLogEntries([], baseOverallEval, new Map(), new Map());
    expect(entries).toHaveLength(1);
    const entry = entries[0] as any;
    expect(entry.eventLog.log['@id']).toBe('quality_project_proj-001');
  });

  test('overallEval の各フィールドが property に含まれる', () => {
    const entries = buildQualityEvalLogEntries([], baseOverallEval, new Map(), new Map());
    const props: any[] = (entries[0] as any).eventLog.log.trace.event.property;
    const find = (key: string) => props.find((p: any) => p['@key'] === key);
    expect(find('quality:overallDigital')?.value['#text']).toBe('良好');
    expect(find('quality:overallScore')?.value['#text']).toBe('85');
    expect(find('quality:overallAnalog')?.value['#text']).toBe('プロジェクト全体として品質良好');
  });

  test('階層別評価データが EventLogJsonRecord[] に変換される', () => {
    const entries = buildQualityEvalLogEntries([baseEvaluation], null, transToInstMap, instToResultsMap);
    expect(entries).toHaveLength(1);
    const entry = entries[0] as any;
    expect(entry.eventLog.log['@id']).toContain('quality_');
    expect(entry.eventLog.log.trace.event.resultsRef?.['@ref']).toBe('results-001');
  });

  test('evaluation_value が未入力の評価は除外される', () => {
    const noVal: SubEvaluationRow = { ...baseEvaluation, evaluation_value: null };
    const entries = buildQualityEvalLogEntries([noVal], null, transToInstMap, instToResultsMap);
    expect(entries).toHaveLength(0);
  });

  test('evaluation_unit が project の評価は階層別 log から除外される', () => {
    const projEval: SubEvaluationRow = { ...baseEvaluation, evaluation_unit: 'project' };
    const entries = buildQualityEvalLogEntries([projEval], null, transToInstMap, instToResultsMap);
    expect(entries).toHaveLength(0);
  });

  test('全体評価と階層別評価の両方がある場合、合計2件のエントリが生成される', () => {
    const entries = buildQualityEvalLogEntries(
      [baseEvaluation], baseOverallEval, transToInstMap, instToResultsMap
    );
    expect(entries).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeUncertaintiesWrapper
// ─────────────────────────────────────────────────────────────────────────────

describe('removeUncertaintiesWrapper', () => {
  test('<Uncertainties> ラッパーを除去して <Uncertainty> を直置きにする', () => {
    const result = removeUncertaintiesWrapper(SAMPLE_WITH_UNCERTAINTIES);
    expect(result).not.toMatch(/<Uncertainties/i);
    expect(result).not.toMatch(/<\/Uncertainties>/i);
    expect(result).toMatch(/<Uncertainty/i);
    expect(result).toContain('evaluationUnit="project"');
    expect(result).toContain('evaluationUnit="method"');
  });

  test('<Uncertainties> が存在しない場合はそのまま返す', () => {
    const xml = '<maiml><document/></maiml>';
    expect(removeUncertaintiesWrapper(xml)).toBe(xml);
  });

  test('空の <Uncertainties> ラッパーを除去できる', () => {
    const xml = '<maiml><Uncertainties></Uncertainties></maiml>';
    const result = removeUncertaintiesWrapper(xml);
    expect(result).not.toMatch(/<Uncertainties/i);
  });
});

