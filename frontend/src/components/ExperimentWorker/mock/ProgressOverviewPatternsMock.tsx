'use client';

/**
 * 全体進捗タブ 情報拡充案 モック（パターンA～E）
 * テンプレート入力状況を Material / Condition / Result の3本プログレスバーで表示
 */

import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Collapse,
  Flex,
  Progress,
  Segmented,
  Select,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type RowStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'issue';

interface ProgressRow {
  rowKey: string;
  taskNo: number;
  methodId: string;
  transitionId: string;
  status: RowStatus;
  hasRecord: boolean;
  /** Material: 記録済み / 総プロパティ数 */
  materialRecorded: number;
  materialTotal: number;
  /** Condition: 記録済み / 総プロパティ数 */
  conditionRecorded: number;
  conditionTotal: number;
  /** Result: 記録済み / 総プロパティ数 */
  resultRecorded: number;
  resultTotal: number;
  /** 問題報告数 */
  issueCount: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// モックデータ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_ROWS: ProgressRow[] = [
  // タスク#1 (全完了)
  { rowKey: '1-tr001', taskNo: 1, methodId: 'method_SampleSynthesis_a1b2c3d4', transitionId: 'transition-1781057805603', status: 'completed',   hasRecord: true,  materialRecorded: 2, materialTotal: 2, conditionRecorded: 2, conditionTotal: 2, resultRecorded: 1, resultTotal: 1, issueCount: 0 },
  { rowKey: '1-tr002', taskNo: 1, methodId: 'method_SampleSynthesis_a1b2c3d4', transitionId: 'transition-1781057812047', status: 'completed',   hasRecord: true,  materialRecorded: 0, materialTotal: 0, conditionRecorded: 2, conditionTotal: 2, resultRecorded: 0, resultTotal: 0, issueCount: 0 },
  { rowKey: '1-tr003', taskNo: 1, methodId: 'method_SampleSynthesis_e5f6a7b8', transitionId: 'transition-1781057819834', status: 'completed',   hasRecord: true,  materialRecorded: 1, materialTotal: 1, conditionRecorded: 0, conditionTotal: 0, resultRecorded: 2, resultTotal: 2, issueCount: 0 },
  // タスク#2 (作業中)
  { rowKey: '2-tr001', taskNo: 2, methodId: 'method_SampleSynthesis_a1b2c3d4', transitionId: 'transition-1781057805603', status: 'in_progress', hasRecord: true,  materialRecorded: 1, materialTotal: 2, conditionRecorded: 0, conditionTotal: 2, resultRecorded: 0, resultTotal: 1, issueCount: 0 },
  { rowKey: '2-tr002', taskNo: 2, methodId: 'method_SampleSynthesis_a1b2c3d4', transitionId: 'transition-1781057812047', status: 'not_started', hasRecord: false, materialRecorded: 0, materialTotal: 0, conditionRecorded: 0, conditionTotal: 2, resultRecorded: 0, resultTotal: 0, issueCount: 0 },
  { rowKey: '2-tr003', taskNo: 2, methodId: 'method_SampleSynthesis_e5f6a7b8', transitionId: 'transition-1781057819834', status: 'not_started', hasRecord: false, materialRecorded: 0, materialTotal: 1, conditionRecorded: 0, conditionTotal: 0, resultRecorded: 0, resultTotal: 2, issueCount: 0 },
  // タスク#3 (問題あり)
  { rowKey: '3-tr001', taskNo: 3, methodId: 'method_SampleSynthesis_a1b2c3d4', transitionId: 'transition-1781057805603', status: 'issue',       hasRecord: true,  materialRecorded: 1, materialTotal: 2, conditionRecorded: 1, conditionTotal: 2, resultRecorded: 0, resultTotal: 1, issueCount: 2 },
  { rowKey: '3-tr002', taskNo: 3, methodId: 'method_SampleSynthesis_a1b2c3d4', transitionId: 'transition-1781057812047', status: 'not_started', hasRecord: false, materialRecorded: 0, materialTotal: 0, conditionRecorded: 0, conditionTotal: 2, resultRecorded: 0, resultTotal: 0, issueCount: 0 },
  { rowKey: '3-tr003', taskNo: 3, methodId: 'method_SampleSynthesis_e5f6a7b8', transitionId: 'transition-1781057819834', status: 'not_started', hasRecord: false, materialRecorded: 0, materialTotal: 1, conditionRecorded: 0, conditionTotal: 0, resultRecorded: 0, resultTotal: 2, issueCount: 0 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ステータス設定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_CFG: Record<RowStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: '未着手',   color: 'default',    icon: <MinusCircleOutlined    style={{ color: '#bfbfbf' }} /> },
  in_progress: { label: '作業中',   color: 'processing', icon: <LoadingOutlined        style={{ color: '#1677ff' }} /> },
  on_hold:     { label: '一時停止', color: 'warning',    icon: <PauseCircleOutlined    style={{ color: '#faad14' }} /> },
  completed:   { label: '完了',     color: 'success',    icon: <CheckCircleOutlined    style={{ color: '#52c41a' }} /> },
  issue:       { label: '問題あり', color: 'error',      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 共通: 3本プログレスバーセル
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface TripleProgressProps {
  r: ProgressRow;
  barWidth?: number;
}

const TripleProgress: React.FC<TripleProgressProps> = ({ r, barWidth = 100 }) => {
  const items = [
    { label: 'Mat',  color: '#1677ff', recorded: r.materialRecorded,  total: r.materialTotal  },
    { label: 'Cond', color: '#52c41a', recorded: r.conditionRecorded, total: r.conditionTotal },
    { label: 'Res',  color: '#fa8c16', recorded: r.resultRecorded,    total: r.resultTotal    },
  ];
  return (
    <Flex vertical gap={3}>
      {items.map(({ label, color, recorded, total }) => (
        <Flex key={label} align="center" gap={4}>
          <Text style={{ fontSize: 10, color, fontWeight: 600, minWidth: 28 }}>{label}</Text>
          {total === 0 ? (
            <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
          ) : (
            <>
              <Progress
                percent={Math.round((recorded / total) * 100)}
                size="small"
                strokeColor={color}
                showInfo={false}
                style={{ flex: 1, maxWidth: barWidth, margin: 0 }}
              />
              <Text style={{ fontSize: 10, color: '#595959', minWidth: 32, textAlign: 'right' }}>
                {recorded}/{total}
              </Text>
            </>
          )}
        </Flex>
      ))}
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// サマリーカード（全パターン共通）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SummaryCard: React.FC<{ rows: ProgressRow[] }> = ({ rows }) => {
  const stats = useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce<Record<RowStatus, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, { not_started: 0, in_progress: 0, on_hold: 0, completed: 0, issue: 0 });
    const completedPct = total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);
    const taskNos = [...new Set(rows.map((r) => r.taskNo))];
    const completedTasks = taskNos.filter((no) =>
      rows.filter((r) => r.taskNo === no).every((r) => r.status === 'completed')
    ).length;
    const issueCount = rows.reduce((sum, r) => sum + r.issueCount, 0);
    return { total, byStatus, completedPct, taskCount: taskNos.length, completedTasks, issueCount };
  }, [rows]);

  return (
    <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 16px' }}>
      <Flex align="center" gap={16} wrap="wrap">
        <div style={{ flex: '0 0 240px' }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: 13 }}>全体進捗</Text>
            <Text strong style={{ fontSize: 16, color: stats.completedPct === 100 ? '#52c41a' : '#1677ff' }}>
              {stats.completedPct}%
            </Text>
          </Flex>
          <Progress percent={stats.completedPct} showInfo={false} strokeColor={stats.completedPct === 100 ? '#52c41a' : '#1677ff'} size="small" />
          <Text type="secondary" style={{ fontSize: 11 }}>タスク {stats.completedTasks}/{stats.taskCount} 完了</Text>
        </div>
        <div style={{ width: 1, height: 48, background: '#f0f0f0', flexShrink: 0 }} />
        <Flex gap={16} wrap="wrap">
          <Statistic title={<Text type="secondary" style={{ fontSize: 11 }}>未着手</Text>}   value={stats.byStatus.not_started} suffix="件" valueStyle={{ fontSize: 18, color: '#595959' }} />
          <Statistic title={<Text type="secondary" style={{ fontSize: 11 }}>作業中</Text>}   value={stats.byStatus.in_progress} suffix="件" valueStyle={{ fontSize: 18, color: '#1677ff' }} />
          <Statistic title={<Text type="secondary" style={{ fontSize: 11 }}>完了</Text>}     value={stats.byStatus.completed}   suffix="件" valueStyle={{ fontSize: 18, color: '#52c41a' }} />
          {stats.byStatus.issue > 0 && (
            <Statistic title={<Text type="secondary" style={{ fontSize: 11 }}>問題あり</Text>} value={stats.byStatus.issue} suffix="件" valueStyle={{ fontSize: 18, color: '#ff4d4f' }} />
          )}
        </Flex>
        <div style={{ width: 1, height: 48, background: '#f0f0f0', flexShrink: 0 }} />
        <Flex gap={12}>
          <Statistic title={<Text type="secondary" style={{ fontSize: 11 }}>総トランジション</Text>} value={stats.total} suffix="件" valueStyle={{ fontSize: 18 }} />
          {stats.issueCount > 0 && (
            <Statistic title={<Text type="secondary" style={{ fontSize: 11, color: '#ff4d4f' }}>問題報告</Text>} value={stats.issueCount} suffix="件" valueStyle={{ fontSize: 18, color: '#ff4d4f' }} prefix={<ExclamationCircleOutlined />} />
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// フィルタバー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface FilterBarProps {
  rows: ProgressRow[];
  filterTaskNo: number | null;
  filterStatus: RowStatus | null;
  filteredCount: number;
  onTaskNoChange: (v: number | null) => void;
  onStatusChange: (v: RowStatus | null) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ rows, filterTaskNo, filterStatus, filteredCount, onTaskNoChange, onStatusChange }) => {
  const taskNos = useMemo(() => [...new Set(rows.map((r) => r.taskNo))].sort((a, b) => a - b), [rows]);
  return (
    <Flex gap={8} align="center" style={{ padding: '4px 0 10px' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>フィルタ:</Text>
      <Select allowClear size="small" placeholder="タスクNo" style={{ width: 100 }} value={filterTaskNo} onChange={(v) => onTaskNoChange(v ?? null)} options={taskNos.map((n) => ({ label: `#${n}`, value: n }))} />
      <Select allowClear size="small" placeholder="ステータス" style={{ width: 120 }} value={filterStatus} onChange={(v) => onStatusChange((v as RowStatus) ?? null)}
        options={[
          { label: '未着手',   value: 'not_started' },
          { label: '作業中',   value: 'in_progress' },
          { label: '一時停止', value: 'on_hold'     },
          { label: '完了',     value: 'completed'   },
          { label: '問題あり', value: 'issue'       },
        ]}
      />
      <Text type="secondary" style={{ fontSize: 11 }}>{filteredCount}/{rows.length} 件</Text>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 操作ボタン
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ActionCell: React.FC<{ row: ProgressRow }> = ({ row }) => {
  if (row.status === 'completed' || row.status === 'issue') return <Button size="small">詳細確認</Button>;
  if (row.status === 'in_progress') return <Button type="primary" size="small">作業へ</Button>;
  return <Text type="secondary">—</Text>;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 共通: メソッドID短縮表示
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const shortMethodId = (id: string) => id.slice(-8);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 共通: テーブル列定義（パターンA/D/E で使い回し）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const colTaskNo: ColumnsType<ProgressRow>[number] = {
  title: 'タスクNo', dataIndex: 'taskNo', width: 80, align: 'center',
  render: (v: number) => <Text strong>#{v}</Text>,
};

const colMethodId: ColumnsType<ProgressRow>[number] = {
  title: 'メソッドID', dataIndex: 'methodId', width: 120, ellipsis: { showTitle: false },
  render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{shortMethodId(v)}</Text></Tooltip>,
};

const colTransitionId: ColumnsType<ProgressRow>[number] = {
  title: 'トランジションID', dataIndex: 'transitionId', ellipsis: { showTitle: false },
  render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v.slice(-16)}</Text></Tooltip>,
};

const colStatus: ColumnsType<ProgressRow>[number] = {
  title: 'ステータス', dataIndex: 'status', width: 110, align: 'center',
  render: (v: RowStatus) => {
    const cfg = STATUS_CFG[v];
    return <Flex align="center" gap={4} justify="center">{cfg.icon}<Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag></Flex>;
  },
};

const colIssue: ColumnsType<ProgressRow>[number] = {
  title: '問題', dataIndex: 'issueCount', width: 60, align: 'center',
  render: (v: number) => v > 0 ? <Badge count={v} size="small" style={{ backgroundColor: '#ff4d4f' }} /> : <Text type="secondary">—</Text>,
};

const colAction: ColumnsType<ProgressRow>[number] = {
  title: '操作', width: 90, align: 'center',
  render: (_: unknown, r: ProgressRow) => <ActionCell row={r} />,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// テーブル共通コンテナ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PatternTableProps {
  rows: ProgressRow[];
  columns: ColumnsType<ProgressRow>;
  filterTaskNo: number | null;
  filterStatus: RowStatus | null;
  filteredCount: number;
  onTaskNoChange: (v: number | null) => void;
  onStatusChange: (v: RowStatus | null) => void;
}

const PatternTable: React.FC<PatternTableProps> = ({ rows, columns, filterTaskNo, filterStatus, filteredCount, onTaskNoChange, onStatusChange }) => (
  <Flex vertical style={{ height: '100%' }}>
    <SummaryCard rows={MOCK_ROWS} />
    <FilterBar rows={MOCK_ROWS} filterTaskNo={filterTaskNo} filterStatus={filterStatus} filteredCount={filteredCount} onTaskNoChange={onTaskNoChange} onStatusChange={onStatusChange} />
    <Table<ProgressRow>
      dataSource={rows}
      columns={columns}
      rowKey="rowKey"
      size="small"
      pagination={false}
      bordered
      scroll={{ y: 'calc(100vh - 520px)' }}
      locale={{ emptyText: 'データがありません' }}
    />
  </Flex>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// パターンA: タスクNo / メソッドID / トランジションID / ステータス
//           / Material進捗 / Condition進捗 / Result進捗 / 問題 / 操作
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PatternA: React.FC = () => {
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<RowStatus | null>(null);

  const filteredRows = useMemo(() =>
    MOCK_ROWS.filter((r) => {
      if (filterTaskNo !== null && r.taskNo !== filterTaskNo) return false;
      if (filterStatus !== null && r.status !== filterStatus) return false;
      return true;
    }),
    [filterTaskNo, filterStatus]
  );

  const columns: ColumnsType<ProgressRow> = [
    colTaskNo,
    colMethodId,
    colTransitionId,
    colStatus,
    {
      title: 'Material', width: 140, align: 'center',
      render: (_: unknown, r: ProgressRow) => r.materialTotal === 0 ? <Text type="secondary">—</Text> : (
        <Flex align="center" gap={4}>
          <Progress percent={Math.round((r.materialRecorded / r.materialTotal) * 100)} size="small" strokeColor="#1677ff" showInfo={false} style={{ flex: 1, margin: 0 }} />
          <Text style={{ fontSize: 10, minWidth: 30 }}>{r.materialRecorded}/{r.materialTotal}</Text>
        </Flex>
      ),
    },
    {
      title: 'Condition', width: 140, align: 'center',
      render: (_: unknown, r: ProgressRow) => r.conditionTotal === 0 ? <Text type="secondary">—</Text> : (
        <Flex align="center" gap={4}>
          <Progress percent={Math.round((r.conditionRecorded / r.conditionTotal) * 100)} size="small" strokeColor="#52c41a" showInfo={false} style={{ flex: 1, margin: 0 }} />
          <Text style={{ fontSize: 10, minWidth: 30 }}>{r.conditionRecorded}/{r.conditionTotal}</Text>
        </Flex>
      ),
    },
    {
      title: 'Result', width: 140, align: 'center',
      render: (_: unknown, r: ProgressRow) => r.resultTotal === 0 ? <Text type="secondary">—</Text> : (
        <Flex align="center" gap={4}>
          <Progress percent={Math.round((r.resultRecorded / r.resultTotal) * 100)} size="small" strokeColor="#fa8c16" showInfo={false} style={{ flex: 1, margin: 0 }} />
          <Text style={{ fontSize: 10, minWidth: 30 }}>{r.resultRecorded}/{r.resultTotal}</Text>
        </Flex>
      ),
    },
    colIssue,
    colAction,
  ];

  return <PatternTable rows={filteredRows} columns={columns} filterTaskNo={filterTaskNo} filterStatus={filterStatus} filteredCount={filteredRows.length} onTaskNoChange={setFilterTaskNo} onStatusChange={setFilterStatus} />;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// パターンB: サマリー + タスク単位で Collapse 展開
//           各行に 3本プログレスバーをインライン表示
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface TaskGroup {
  taskNo: number;
  rows: ProgressRow[];
  completedCount: number;
  totalCount: number;
  pct: number;
  overallStatus: RowStatus;
}

const PatternB: React.FC = () => {
  const taskGroups = useMemo((): TaskGroup[] => {
    const taskNos = [...new Set(MOCK_ROWS.map((r) => r.taskNo))].sort((a, b) => a - b);
    return taskNos.map((no) => {
      const rows = MOCK_ROWS.filter((r) => r.taskNo === no);
      const completedCount = rows.filter((r) => r.status === 'completed').length;
      const pct = Math.round((completedCount / rows.length) * 100);
      let overallStatus: RowStatus = 'not_started';
      if (rows.every((r) => r.status === 'completed')) overallStatus = 'completed';
      else if (rows.some((r) => r.status === 'issue')) overallStatus = 'issue';
      else if (rows.some((r) => r.status === 'in_progress')) overallStatus = 'in_progress';
      return { taskNo: no, rows, completedCount, totalCount: rows.length, pct, overallStatus };
    });
  }, []);

  const collapseItems = taskGroups.map((group) => {
    const cfg = STATUS_CFG[group.overallStatus];
    return {
      key: String(group.taskNo),
      label: (
        <Flex align="center" gap={12}>
          <Text strong style={{ minWidth: 72 }}>タスク #{group.taskNo}</Text>
          <Flex align="center" gap={4}>{cfg.icon}<Tag color={cfg.color} style={{ margin: 0, fontSize: 12 }}>{cfg.label}</Tag></Flex>
          <Flex align="center" gap={8} style={{ flex: 1 }}>
            <Progress percent={group.pct} size="small" showInfo={false} style={{ flex: 1, maxWidth: 160, margin: 0 }} strokeColor={group.pct === 100 ? '#52c41a' : '#1677ff'} />
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{group.completedCount}/{group.totalCount} 完了</Text>
          </Flex>
          {group.rows.some((r) => r.issueCount > 0) && (
            <Badge count={group.rows.reduce((s, r) => s + r.issueCount, 0)} size="small" style={{ backgroundColor: '#ff4d4f' }} />
          )}
        </Flex>
      ),
      children: (
        <div style={{ overflowX: 'auto' }}>
          {group.rows.map((r) => {
            const rcfg = STATUS_CFG[r.status];
            return (
              <Flex key={r.rowKey} align="flex-start" gap={12} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: r.status === 'issue' ? '#fff2f0' : 'transparent' }}>
                {/* ステータス */}
                <Flex align="center" gap={4} style={{ minWidth: 90, paddingTop: 2 }}>
                  {rcfg.icon}
                  <Tag color={rcfg.color} style={{ margin: 0, fontSize: 11 }}>{rcfg.label}</Tag>
                </Flex>
                {/* メソッドID + トランジションID */}
                <Flex vertical gap={2} style={{ minWidth: 150 }}>
                  <Tooltip title={r.methodId}>
                    <Text code style={{ fontSize: 10 }}>{shortMethodId(r.methodId)}</Text>
                  </Tooltip>
                  <Tooltip title={r.transitionId}>
                    <Text code style={{ fontSize: 10 }}>{r.transitionId.slice(-16)}</Text>
                  </Tooltip>
                </Flex>
                {/* 3本プログレスバー */}
                <div style={{ flex: 1, maxWidth: 240 }}>
                  <TripleProgress r={r} barWidth={80} />
                </div>
                {/* 問題 */}
                {r.issueCount > 0 ? (
                  <Badge count={r.issueCount} size="small" style={{ backgroundColor: '#ff4d4f', marginTop: 2 }} />
                ) : (
                  <div style={{ width: 20 }} />
                )}
                {/* 操作 */}
                <div style={{ marginLeft: 'auto', paddingTop: 2 }}>
                  <ActionCell row={r} />
                </div>
              </Flex>
            );
          })}
        </div>
      ),
    };
  });

  return (
    <Flex vertical style={{ height: '100%' }}>
      <SummaryCard rows={MOCK_ROWS} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Collapse defaultActiveKey={taskGroups.map((g) => String(g.taskNo))} items={collapseItems} size="small" style={{ background: 'transparent' }} />
      </div>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// パターンC: サマリー + 既存テーブルそのまま（シンプル強化）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PatternC: React.FC = () => {
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<RowStatus | null>(null);

  const filteredRows = useMemo(() =>
    MOCK_ROWS.filter((r) => {
      if (filterTaskNo !== null && r.taskNo !== filterTaskNo) return false;
      if (filterStatus !== null && r.status !== filterStatus) return false;
      return true;
    }),
    [filterTaskNo, filterStatus]
  );

  const columns: ColumnsType<ProgressRow> = [
    colTaskNo,
    colTransitionId,
    colStatus,
    {
      title: '記録', dataIndex: 'hasRecord', width: 70, align: 'center',
      render: (v: boolean) => v ? <Tag color="green" icon={<CheckOutlined />}>あり</Tag> : <Text type="secondary">—</Text>,
    },
    colAction,
  ];

  return <PatternTable rows={filteredRows} columns={columns} filterTaskNo={filterTaskNo} filterStatus={filterStatus} filteredCount={filteredRows.length} onTaskNoChange={setFilterTaskNo} onStatusChange={setFilterStatus} />;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// パターンD: タスクNo / メソッドID / トランジションID / ステータス
//           / 3本プログレスバー（縦積み） / 問題 / 操作
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PatternD: React.FC = () => {
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<RowStatus | null>(null);

  const filteredRows = useMemo(() =>
    MOCK_ROWS.filter((r) => {
      if (filterTaskNo !== null && r.taskNo !== filterTaskNo) return false;
      if (filterStatus !== null && r.status !== filterStatus) return false;
      return true;
    }),
    [filterTaskNo, filterStatus]
  );

  const columns: ColumnsType<ProgressRow> = [
    colTaskNo,
    colMethodId,
    colTransitionId,
    colStatus,
    {
      title: '入力状況', width: 200,
      render: (_: unknown, r: ProgressRow) => <TripleProgress r={r} barWidth={90} />,
    },
    colIssue,
    colAction,
  ];

  return <PatternTable rows={filteredRows} columns={columns} filterTaskNo={filterTaskNo} filterStatus={filterStatus} filteredCount={filteredRows.length} onTaskNoChange={setFilterTaskNo} onStatusChange={setFilterStatus} />;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// パターンE: タスクNo / メソッドID / トランジションID / ステータス
//           / 3本プログレスバー（コンパクト・横並び） / 問題 / 操作
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PatternE: React.FC = () => {
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<RowStatus | null>(null);

  const filteredRows = useMemo(() =>
    MOCK_ROWS.filter((r) => {
      if (filterTaskNo !== null && r.taskNo !== filterTaskNo) return false;
      if (filterStatus !== null && r.status !== filterStatus) return false;
      return true;
    }),
    [filterTaskNo, filterStatus]
  );

  const columns: ColumnsType<ProgressRow> = [
    colTaskNo,
    colMethodId,
    colTransitionId,
    colStatus,
    {
      // Mat / Cond / Res をそれぞれ小さなカラムとして横並び
      title: 'Material', width: 110, align: 'center',
      render: (_: unknown, r: ProgressRow) => r.materialTotal === 0 ? <Text type="secondary" style={{ fontSize: 11 }}>—</Text> : (
        <Flex vertical align="center" gap={1}>
          <Progress percent={Math.round((r.materialRecorded / r.materialTotal) * 100)} size="small" strokeColor="#1677ff" showInfo={false} style={{ width: 80, margin: 0 }} />
          <Text style={{ fontSize: 10, color: '#595959' }}>{r.materialRecorded}/{r.materialTotal}</Text>
        </Flex>
      ),
    },
    {
      title: 'Condition', width: 110, align: 'center',
      render: (_: unknown, r: ProgressRow) => r.conditionTotal === 0 ? <Text type="secondary" style={{ fontSize: 11 }}>—</Text> : (
        <Flex vertical align="center" gap={1}>
          <Progress percent={Math.round((r.conditionRecorded / r.conditionTotal) * 100)} size="small" strokeColor="#52c41a" showInfo={false} style={{ width: 80, margin: 0 }} />
          <Text style={{ fontSize: 10, color: '#595959' }}>{r.conditionRecorded}/{r.conditionTotal}</Text>
        </Flex>
      ),
    },
    {
      title: 'Result', width: 110, align: 'center',
      render: (_: unknown, r: ProgressRow) => r.resultTotal === 0 ? <Text type="secondary" style={{ fontSize: 11 }}>—</Text> : (
        <Flex vertical align="center" gap={1}>
          <Progress percent={Math.round((r.resultRecorded / r.resultTotal) * 100)} size="small" strokeColor="#fa8c16" showInfo={false} style={{ width: 80, margin: 0 }} />
          <Text style={{ fontSize: 10, color: '#595959' }}>{r.resultRecorded}/{r.resultTotal}</Text>
        </Flex>
      ),
    },
    colIssue,
    colAction,
  ];

  return <PatternTable rows={filteredRows} columns={columns} filterTaskNo={filterTaskNo} filterStatus={filterStatus} filteredCount={filteredRows.length} onTaskNoChange={setFilterTaskNo} onStatusChange={setFilterStatus} />;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ルートコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type Pattern = 'A' | 'B' | 'C' | 'D' | 'E';

export default function ProgressOverviewPatternsMock() {
  const [pattern, setPattern] = useState<Pattern>('A');

  const PATTERN_DESC: Record<Pattern, string> = {
    A: '📊 Mat/Cond/Res を独立列（横1行プログレスバー）',
    B: '📋 タスク単位で折りたたみ + 行内に3本バー縦積み',
    C: '✅ サマリー追加のみ。既存テーブルはそのまま',
    D: '🔢 3本バーを縦積みで1セル（入力状況列）',
    E: '🗜️ Mat/Cond/Res を独立列（縦にバー+数値）',
  };

  return (
    <Flex vertical style={{ padding: 16, height: '100%' }}>
      <Flex align="center" gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>全体進捗タブ レイアウト比較</Title>
        <Segmented
          value={pattern}
          onChange={(v) => setPattern(v as Pattern)}
          options={[
            { label: 'A（3列横並び）',      value: 'A' },
            { label: 'B（タスク折りたたみ）', value: 'B' },
            { label: 'C（サマリーのみ）',     value: 'C' },
            { label: 'D（3本縦積み1列）',    value: 'D' },
            { label: 'E（3列縦バー）',       value: 'E' },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>{PATTERN_DESC[pattern]}</Text>
      </Flex>
      <div style={{ flex: 1, minHeight: 0 }}>
        {pattern === 'A' && <PatternA />}
        {pattern === 'B' && <PatternB />}
        {pattern === 'C' && <PatternC />}
        {pattern === 'D' && <PatternD />}
        {pattern === 'E' && <PatternE />}
      </div>
    </Flex>
  );
}
