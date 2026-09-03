'use client';

/**
 * MockExperimentInstructionSection.tsx
 * Phase 1-B モック: 実験指示タブ 定量評価4列の複数件対応確認
 */

import React, { useState } from 'react';
import { Alert, Button, Flex, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// ─── 型定義 ───────────────────────────────────────────────────

interface MockUncertaintyJudge {
  instructionKey: string;
  criteriaName?: string;
  toleranceLower: number | null;
  toleranceUpper: number | null;
  judgeResult: '良好' | '不良';
  recordedValue: number;
}

interface MockFlatRow {
  rowKey: string;
  methodId: string;
  methodName: string;
  taskNumber: number;
  transitionId: string;
  transitionName: string;
  templateName: string;
  propKey: string;
  propLabel: string;
  expected: number | null;
  actual: number | null;
  unit: string;
  uncertaintyJudges: MockUncertaintyJudge[];
}

// ─── モックデータ ──────────────────────────────────────────────

const MOCK_ROWS: MockFlatRow[] = [
  {
    rowKey: 'r1', methodId: 'method-001', methodName: '加熱処理メソッド',
    taskNumber: 1, transitionId: 'TR_A', transitionName: '混合条件',
    templateName: 'Condition-Mixing',
    propKey: 'ns1:Temperature', propLabel: 'Temperature',
    expected: 300, actual: 302.1, unit: '℃', uncertaintyJudges: [],
  },
  {
    rowKey: 'r2', methodId: 'method-001', methodName: '加熱処理メソッド',
    taskNumber: 1, transitionId: 'TR_A', transitionName: '混合条件',
    templateName: 'Condition-Mixing',
    propKey: 'ns1:Pressure', propLabel: 'Pressure',
    expected: 0.101, actual: 0.103, unit: 'MPa',
    uncertaintyJudges: [
      { instructionKey: 'key_bias', criteriaName: '系統誤差', toleranceLower: -0.005, toleranceUpper: 0.005, judgeResult: '良好', recordedValue: 0.002 },
    ],
  },
  {
    rowKey: 'r3', methodId: 'method-001', methodName: '加熱処理メソッド',
    taskNumber: 2, transitionId: 'TR_B', transitionName: '加熱条件',
    templateName: 'Condition-Heating',
    propKey: 'ns1:Concentration', propLabel: 'Concentration',
    expected: 1.5, actual: 1.48, unit: 'mol/L',
    uncertaintyJudges: [
      { instructionKey: 'key_bias',      criteriaName: '系統誤差',     toleranceLower: -0.1,  toleranceUpper: 0.1,  judgeResult: '良好', recordedValue: 0.05 },
      { instructionKey: 'key_precision', criteriaName: '繰り返し精度', toleranceLower: -0.05, toleranceUpper: 0.05, judgeResult: '良好', recordedValue: 0.03 },
    ],
  },
  {
    rowKey: 'r4', methodId: 'method-001', methodName: '加熱処理メソッド',
    taskNumber: 2, transitionId: 'TR_D', transitionName: '最終評価',
    templateName: 'Result-Yield',
    propKey: 'ns1:Voltage', propLabel: 'Voltage',
    expected: 5.0, actual: 5.08, unit: 'V',
    uncertaintyJudges: [
      { instructionKey: 'key_bias',      criteriaName: '系統誤差',         toleranceLower: -0.02, toleranceUpper: 0.02, judgeResult: '良好', recordedValue: 0.01  },
      { instructionKey: 'key_precision', criteriaName: '繰り返し精度',     toleranceLower: -0.01, toleranceUpper: 0.01, judgeResult: '不良', recordedValue: 0.015 },
      { instructionKey: 'key_combined',  criteriaName: '合成標準不確かさ', toleranceLower: -0.03, toleranceUpper: 0.03, judgeResult: '不良', recordedValue: 0.025 },
    ],
  },
];

// ─── 集約ロジック ──────────────────────────────────────────────

function aggregateJudgeResult(judges: MockUncertaintyJudge[]): '良好' | '不良' | null {
  if (judges.length === 0) return null;
  return judges.some((j) => j.judgeResult === '不良') ? '不良' : '良好';
}

// ─── 詳細ダイアログ ────────────────────────────────────────────

const JudgeDetailDialog: React.FC<{ open: boolean; onClose: () => void; row: MockFlatRow | null }> = ({ open, onClose, row }) => {
  if (!row) return null;
  const aggregated = aggregateJudgeResult(row.uncertaintyJudges);
  const cols: ColumnsType<MockUncertaintyJudge> = [
    { key: 'criteriaName', title: '基準名', dataIndex: 'criteriaName', ellipsis: true,
      render: (_: string, r: MockUncertaintyJudge) => <Text style={{ fontSize: 13 }}>{r.criteriaName ?? r.instructionKey}</Text> },
    { key: 'tolerance', title: '許容値', width: 150,
      render: (_: unknown, r: MockUncertaintyJudge) => (
        r.toleranceLower === null && r.toleranceUpper === null
          ? <Text type="secondary">—</Text>
          : <Text style={{ fontSize: 13 }}>{r.toleranceLower ?? '—'} ～ {r.toleranceUpper ?? '—'}</Text>
      ) },
    { key: 'judgeResult', title: '判定', dataIndex: 'judgeResult', width: 80,
      render: (v: '良好' | '不良') => <Tag color={v === '良好' ? 'success' : 'error'} style={{ fontSize: 12 }}>{v}</Tag> },
    { key: 'recordedValue', title: '記録値', dataIndex: 'recordedValue', width: 100, align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 13 }}>{v}</Text> },
  ];
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="不確かさ判定詳細" width={720}>
      {/* プロパティ情報欄 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
        {/* 上段: メソッド / タスク / トランジション / テンプレート */}
        <Flex align="center" gap={20} wrap="wrap" style={{ marginBottom: 10 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>メソッド</Text>
            <Text style={{ fontSize: 13 }}>{row.methodName || row.methodId}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>タスク</Text>
            <Text strong style={{ fontSize: 13 }}>#{row.taskNumber}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>トランジション</Text>
            <Text style={{ fontSize: 13 }}>{row.transitionName || row.transitionId}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>テンプレート</Text>
            <Text style={{ fontSize: 13 }}>{row.templateName}</Text>
          </div>
        </Flex>
        {/* 下段: Key / 想定値 / 実績値 / 総合評価 */}
        <Flex align="center" gap={20} wrap="wrap" style={{ paddingTop: 10, borderTop: '1px solid #ebebeb' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Key</Text>
            <Text strong style={{ fontSize: 14 }}>{row.propKey}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>想定値</Text>
            <Text style={{ fontSize: 14 }}>{row.expected ?? '—'} <Text type="secondary" style={{ fontSize: 12 }}>{row.unit}</Text></Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>実績値</Text>
            <Text style={{ fontSize: 14 }}>{row.actual ?? '—'} <Text type="secondary" style={{ fontSize: 12 }}>{row.unit}</Text></Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>総合評価</Text>
            {aggregated !== null
              ? <Tag color={aggregated === '良好' ? 'success' : 'error'} style={{ fontSize: 13, padding: '2px 10px', margin: 0 }}>{aggregated}</Tag>
              : <Text type="secondary" style={{ fontSize: 13 }}>—</Text>}
          </div>
        </Flex>
      </div>
      <Table dataSource={row.uncertaintyJudges} columns={cols} rowKey="instructionKey" size="small" pagination={false} />
    </Modal>
  );
};


// ─── メインセクション export ───────────────────────────────────

export default function MockExperimentInstructionSection() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<MockFlatRow | null>(null);
  const openDetail = (row: MockFlatRow) => { setDetailRow(row); setDetailOpen(true); };

  const columns: ColumnsType<MockFlatRow> = [
    { key: 'propKey', title: 'Key', dataIndex: 'propKey', width: 180, fixed: 'left' as const,
      render: (_: string, r: MockFlatRow) => <Tooltip title={r.propKey}><Text style={{ fontSize: 12 }}>{r.propLabel}</Text></Tooltip> },
    { key: 'expected', title: '想定値', dataIndex: 'expected', width: 90, align: 'right' as const,
      render: (v: number | null, r: MockFlatRow) => <Text style={{ fontSize: 12 }}>{v ?? '—'} {r.unit}</Text> },
    { key: 'actual', title: '実績値', dataIndex: 'actual', width: 90, align: 'right' as const,
      render: (v: number | null, r: MockFlatRow) => <Text style={{ fontSize: 12 }}>{v ?? '—'} {r.unit}</Text> },
    // 定量：基準名（既存動作そのまま）
    { key: 'quantitativeCriteriaName', title: <span style={{ whiteSpace: 'nowrap' }}>定量：基準名</span>, width: 180,
      render: (_: unknown, r: MockFlatRow) => {
        const j = r.uncertaintyJudges;
        if (!j.length) return <Text type="secondary">—</Text>;
        if (j.length === 1) return <Tooltip title={j[0].criteriaName}><Text style={{ fontSize: 12 }}>{j[0].criteriaName ?? j[0].instructionKey}</Text></Tooltip>;
        return <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={() => openDetail(r)}>不確かさ詳細 ({j.length}件)</Button>;
      } },
    // 定量：許容値（修正対象: 複数件→ボタン）
    { key: 'quantitativeTolerance', title: <span style={{ whiteSpace: 'nowrap' }}>定量：許容値</span>, width: 160,
      render: (_: unknown, r: MockFlatRow) => {
        const j = r.uncertaintyJudges;
        if (!j.length) return <Text type="secondary">—</Text>;
        if (j.length === 1) {
          if (j[0].toleranceLower === null && j[0].toleranceUpper === null) return <Text type="secondary">—</Text>;
          return <Text style={{ fontSize: 12 }}>{j[0].toleranceLower ?? '—'} ～ {j[0].toleranceUpper ?? '—'}</Text>;
        }
        return <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={() => openDetail(r)}>詳細 ({j.length}件)</Button>;
      } },
    // 定量：付与値（修正対象: 複数件→ボタン）
    { key: 'quantitativeRecordedValue', title: <span style={{ whiteSpace: 'nowrap' }}>定量：付与値</span>, width: 110, align: 'right' as const,
      render: (_: unknown, r: MockFlatRow) => {
        const j = r.uncertaintyJudges;
        if (!j.length) return <Text type="secondary">—</Text>;
        if (j.length === 1) return <Text style={{ fontSize: 12 }}>{j[0].recordedValue}</Text>;
        return <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={() => openDetail(r)}>詳細 ({j.length}件)</Button>;
      } },
    // 定量：判定結果（修正対象: 集約バッジ1個）
    { key: 'quantitativeJudgeResult', title: <span style={{ whiteSpace: 'nowrap' }}>定量：判定結果</span>, width: 150, align: 'center' as const,
      render: (_: unknown, r: MockFlatRow) => {
        const aggregated = aggregateJudgeResult(r.uncertaintyJudges);
        if (aggregated === null) return <Text type="secondary">—</Text>;
        return (
          <Flex align="center" justify="center" gap={4}>
            <Tag color={aggregated === '良好' ? 'success' : 'error'} style={{ margin: 0, fontSize: 11 }}>{aggregated}</Tag>
            {r.uncertaintyJudges.length > 1 && (
              <Button size="small" type="link" style={{ padding: 0, fontSize: 11 }} onClick={() => openDetail(r)}>
                ({r.uncertaintyJudges.length}件)
              </Button>
            )}
          </Flex>
        );
      } },
  ];

  return (
    <div>
      <Alert type="info" showIcon message="Phase 1-B 確認ポイント"
        description={
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
            <li>行1（未判定）: 定量4列すべて「—」</li>
            <li>行2（1件・良好）: テキスト直接表示、判定結果は「良好」バッジ</li>
            <li>行3（2件・全良好）: 基準名/許容値/付与値は「詳細(2件)」ボタン、判定結果は「良好」バッジ + (2件)ボタン</li>
            <li>行4（3件・一部不良）: 判定結果は「不良」バッジ（1件でも不良なら不良）+ (3件)ボタン</li>
            <li>ボタンクリックで詳細ダイアログが開くこと</li>
          </ul>
        }
        style={{ marginBottom: 16 }} />
      <Table dataSource={MOCK_ROWS} columns={columns} rowKey="rowKey" size="small" pagination={false} scroll={{ x: 'max-content' }} />
      <JudgeDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} row={detailRow} />
    </div>
  );
}

