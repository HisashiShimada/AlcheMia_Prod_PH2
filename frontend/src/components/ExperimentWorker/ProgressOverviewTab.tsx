'use client';

/**
 * 全体進捗タブ
 *
 * 全タスク × トランジション の行テーブルを表示する。
 * タスクNo / ステータス でフィルタリング可能。
 * 「作業へ」ボタンで作業記録タブに遷移、「詳細確認」ボタンで作業記録タブを読取専用で表示。
 *
 * フェーズA: ExperimentWorkerMenu から渡された progressRows を表示する（APIデータ接続はフェーズBで実施）。
 *
 * レイアウト切り替え（暫定モック）:
 *   classic  : 既存テーブル（記録有無列）
 *   pattern-a: Mat/Cond/Res を独立3列（横1行バー + 数値）+ サマリーカード
 *   pattern-b: タスク単位 Collapse 展開 + 行内3本バー + サマリーカード
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
  MinusCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 行レコード */
export interface ProgressRow {
  /** テーブルのキー（`${taskNo}-${transitionId}` 等の一意な値） */
  rowKey: string;
  taskNo: number;
  methodId: string;
  transitionId: string;
  /** ステータス文字列（バックエンドの数値→文字列変換済み） */
  status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'issue';
  /** 記録済みプロパティが1件以上ある場合 true */
  hasRecord: boolean;
  /** Material 入力進捗（フェーズB実装前はオプション） */
  materialRecorded?: number;
  materialTotal?: number;
  /** Condition 入力進捗 */
  conditionRecorded?: number;
  conditionTotal?: number;
  /** Result 入力進捗 */
  resultRecorded?: number;
  resultTotal?: number;
  /** 問題報告数 */
  issueCount?: number;
}

export type ProgressLayout = 'classic' | 'pattern-a' | 'pattern-b';

interface ProgressOverviewTabProps {
  rows: ProgressRow[];
  /** 「作業へ」ボタン押下時: 作業記録タブに遷移し、指定タスク+トランジションを表示 */
  onGoToWork: (taskNo: number, transitionId: string) => void;
  /** 「詳細確認」ボタン押下時: 作業記録タブを読取専用で表示 */
  onViewDetail: (taskNo: number, transitionId: string) => void;
  /** 初期レイアウト（省略時: 'classic'） */
  defaultLayout?: ProgressLayout;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ステータス設定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_CONFIG: Record<ProgressRow['status'], { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: '未着手',   color: 'default',    icon: <MinusCircleOutlined       style={{ color: '#bfbfbf' }} /> },
  in_progress: { label: '作業中',   color: 'processing', icon: null },
  on_hold:     { label: '一時停止', color: 'warning',    icon: <PauseCircleOutlined       style={{ color: '#faad14' }} /> },
  completed:   { label: '完了',     color: 'success',    icon: <CheckCircleOutlined       style={{ color: '#52c41a' }} /> },
  issue:       { label: '問題あり', color: 'error',      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 共通サブコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Material / Condition / Result 3本プログレスバー */
const TripleProgress: React.FC<{ r: ProgressRow; barWidth?: number }> = ({ r, barWidth = 90 }) => {
  const items = [
    { label: 'Mat',  color: '#1677ff', recorded: r.materialRecorded  ?? 0, total: r.materialTotal  ?? 0 },
    { label: 'Cond', color: '#52c41a', recorded: r.conditionRecorded ?? 0, total: r.conditionTotal ?? 0 },
    { label: 'Res',  color: '#fa8c16', recorded: r.resultRecorded    ?? 0, total: r.resultTotal    ?? 0 },
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

/** サマリーカード */
const SummaryCard: React.FC<{ rows: ProgressRow[] }> = ({ rows }) => {
  const stats = useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce<Record<ProgressRow['status'], number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, { not_started: 0, in_progress: 0, on_hold: 0, completed: 0, issue: 0 });
    const completedPct = total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);
    const taskNos = [...new Set(rows.map((r) => r.taskNo))];
    const completedTasks = taskNos.filter((no) =>
      rows.filter((r) => r.taskNo === no).every((r) => r.status === 'completed')
    ).length;
    const issueCount = rows.reduce((sum, r) => sum + (r.issueCount ?? 0), 0);
    return { total, byStatus, completedPct, taskCount: taskNos.length, completedTasks, issueCount };
  }, [rows]);

  return (
    <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 16px' }}>
      <Flex align="center" gap={16} wrap="wrap">
        <div style={{ flex: '0 0 220px' }}>
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
        {stats.issueCount > 0 && (
          <>
            <div style={{ width: 1, height: 48, background: '#f0f0f0', flexShrink: 0 }} />
            <Statistic title={<Text type="secondary" style={{ fontSize: 11, color: '#ff4d4f' }}>問題報告</Text>} value={stats.issueCount} suffix="件" valueStyle={{ fontSize: 18, color: '#ff4d4f' }} prefix={<ExclamationCircleOutlined />} />
          </>
        )}
      </Flex>
    </Card>
  );
};

/** フィルタバー */
const FilterBar: React.FC<{
  rows: ProgressRow[];
  filterTaskNo: number | null;
  filterStatus: ProgressRow['status'] | null;
  filteredCount: number;
  onTaskNoChange: (v: number | null) => void;
  onStatusChange: (v: ProgressRow['status'] | null) => void;
}> = ({ rows, filterTaskNo, filterStatus, filteredCount, onTaskNoChange, onStatusChange }) => {
  const taskNos = useMemo(() => [...new Set(rows.map((r) => r.taskNo))].sort((a, b) => a - b), [rows]);
  return (
    <Flex gap={8} align="center" style={{ padding: '4px 0 10px' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>フィルタ:</Text>
      <Select allowClear size="small" placeholder="タスクNo" style={{ width: 100 }} value={filterTaskNo} onChange={(v) => onTaskNoChange(v ?? null)} options={taskNos.map((n) => ({ label: `#${n}`, value: n }))} />
      <Select allowClear size="small" placeholder="ステータス" style={{ width: 120 }} value={filterStatus} onChange={(v) => onStatusChange((v as ProgressRow['status']) ?? null)}
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
// メインコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ProgressOverviewTab({
  rows,
  onGoToWork,
  onViewDetail,
  defaultLayout = 'classic',
}: ProgressOverviewTabProps) {
  const [layout, setLayout] = useState<ProgressLayout>(defaultLayout);
  const [filterTaskNo, setFilterTaskNo]     = useState<number | null>(null);
  const [filterStatus, setFilterStatus]     = useState<ProgressRow['status'] | null>(null);

  const taskNos = useMemo(() => [...new Set(rows.map((r) => r.taskNo))].sort((a, b) => a - b), [rows]);

  const filteredRows = useMemo(
    () => rows.filter((r) => {
      if (filterTaskNo !== null && r.taskNo !== filterTaskNo) return false;
      if (filterStatus  !== null && r.status  !== filterStatus)  return false;
      return true;
    }),
    [rows, filterTaskNo, filterStatus]
  );

  // ── 操作列 ─────────────────────────────────────────
  const renderAction = (_: unknown, r: ProgressRow) => {
    if (r.status === 'completed' || r.status === 'issue')
      return <Button size="small" onClick={() => onViewDetail(r.taskNo, r.transitionId)}>詳細確認</Button>;
    if (r.status === 'in_progress')
      return <Button type="primary" size="small" onClick={() => onGoToWork(r.taskNo, r.transitionId)}>作業へ</Button>;
    return <Text type="secondary">—</Text>;
  };

  // ── ステータスタグ ───────────────────────────────────
  const renderStatus = (v: ProgressRow['status']) => {
    const cfg = STATUS_CONFIG[v] ?? { label: v, color: 'default', icon: null };
    return (
      <Flex align="center" gap={4} justify="center">
        {cfg.icon}
        <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
      </Flex>
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // classic: 既存テーブル
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const classicColumns: ColumnsType<ProgressRow> = [
    {
      title: 'タスクNo', dataIndex: 'taskNo', width: 90, align: 'center',
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: 'メソッドID', dataIndex: 'methodId', width: 160, ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v}</Text></Tooltip>,
    },
    {
      title: 'トランジションID', dataIndex: 'transitionId', width: 160, ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v}</Text></Tooltip>,
    },
    {
      title: 'ステータス', dataIndex: 'status', width: 110, align: 'center',
      render: (v: ProgressRow['status']) => {
        const cfg = STATUS_CONFIG[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '記録', dataIndex: 'hasRecord', width: 80, align: 'center',
      render: (v: boolean) => v ? <Tag color="green" icon={<CheckOutlined />}>あり</Tag> : <Text type="secondary">—</Text>,
    },
    { title: '操作', width: 100, align: 'center', render: renderAction },
  ];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // pattern-a: Mat/Cond/Res を独立3列
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const patternAColumns: ColumnsType<ProgressRow> = [
    {
      title: 'タスクNo', dataIndex: 'taskNo', width: 80, align: 'center',
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: 'メソッドID', dataIndex: 'methodId', width: 150, ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v.slice(-8)}</Text></Tooltip>,
    },
    {
      title: 'トランジションID', dataIndex: 'transitionId', width: 150, ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v.slice(-16)}</Text></Tooltip>,
    },
    { title: 'ステータス', dataIndex: 'status', width: 110, align: 'center', render: renderStatus },
    {
      title: 'Material', width: 130, align: 'center',
      render: (_: unknown, r: ProgressRow) => {
        const rec = r.materialRecorded ?? 0, tot = r.materialTotal ?? 0;
        return tot === 0 ? <Text type="secondary">—</Text> : (
          <Flex align="center" gap={4}>
            <Progress percent={Math.round((rec / tot) * 100)} size="small" strokeColor="#1677ff" showInfo={false} style={{ flex: 1, margin: 0 }} />
            <Text style={{ fontSize: 10, minWidth: 30 }}>{rec}/{tot}</Text>
          </Flex>
        );
      },
    },
    {
      title: 'Condition', width: 130, align: 'center',
      render: (_: unknown, r: ProgressRow) => {
        const rec = r.conditionRecorded ?? 0, tot = r.conditionTotal ?? 0;
        return tot === 0 ? <Text type="secondary">—</Text> : (
          <Flex align="center" gap={4}>
            <Progress percent={Math.round((rec / tot) * 100)} size="small" strokeColor="#52c41a" showInfo={false} style={{ flex: 1, margin: 0 }} />
            <Text style={{ fontSize: 10, minWidth: 30 }}>{rec}/{tot}</Text>
          </Flex>
        );
      },
    },
    {
      title: 'Result', width: 130, align: 'center',
      render: (_: unknown, r: ProgressRow) => {
        const rec = r.resultRecorded ?? 0, tot = r.resultTotal ?? 0;
        return tot === 0 ? <Text type="secondary">—</Text> : (
          <Flex align="center" gap={4}>
            <Progress percent={Math.round((rec / tot) * 100)} size="small" strokeColor="#fa8c16" showInfo={false} style={{ flex: 1, margin: 0 }} />
            <Text style={{ fontSize: 10, minWidth: 30 }}>{rec}/{tot}</Text>
          </Flex>
        );
      },
    },
    {
      title: '問題', dataIndex: 'issueCount', width: 60, align: 'center',
      render: (v: number | undefined) => (v ?? 0) > 0 ? <Badge count={v} size="small" style={{ backgroundColor: '#ff4d4f' }} /> : <Text type="secondary">—</Text>,
    },
    { title: '操作', width: 100, align: 'center', render: renderAction },
  ];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // pattern-b: タスク単位 Collapse
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const taskGroups = useMemo(() =>
    taskNos.map((no) => {
      const groupRows = rows.filter((r) => r.taskNo === no);
      const completedCount = groupRows.filter((r) => r.status === 'completed').length;
      const pct = Math.round((completedCount / groupRows.length) * 100);
      let overallStatus: ProgressRow['status'] = 'not_started';
      if (groupRows.every((r) => r.status === 'completed')) overallStatus = 'completed';
      else if (groupRows.some((r) => r.status === 'issue')) overallStatus = 'issue';
      else if (groupRows.some((r) => r.status === 'in_progress')) overallStatus = 'in_progress';
      return { taskNo: no, rows: groupRows, completedCount, pct, overallStatus };
    }),
    [rows, taskNos]
  );

  const collapseItems = useMemo(() =>
    taskGroups.map((group) => {
      const cfg = STATUS_CONFIG[group.overallStatus];
      // フィルタ適用
      const visibleRows = group.rows.filter((r) => {
        if (filterStatus !== null && r.status !== filterStatus) return false;
        return true;
      });
      if (visibleRows.length === 0) return null;
      return {
        key: String(group.taskNo),
        label: (
          <Flex align="center" gap={12}>
            <Text strong style={{ minWidth: 72 }}>タスク #{group.taskNo}</Text>
            <Flex align="center" gap={4}>{cfg.icon}<Tag color={cfg.color} style={{ margin: 0, fontSize: 12 }}>{cfg.label}</Tag></Flex>
            <Flex align="center" gap={8} style={{ flex: 1 }}>
              <Progress percent={group.pct} size="small" showInfo={false} style={{ flex: 1, maxWidth: 160, margin: 0 }} strokeColor={group.pct === 100 ? '#52c41a' : '#1677ff'} />
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{group.completedCount}/{group.rows.length} 完了</Text>
            </Flex>
            {group.rows.some((r) => (r.issueCount ?? 0) > 0) && (
              <Badge count={group.rows.reduce((s, r) => s + (r.issueCount ?? 0), 0)} size="small" style={{ backgroundColor: '#ff4d4f' }} />
            )}
          </Flex>
        ),
        children: (
          <div style={{ overflowX: 'auto' }}>
            {visibleRows.map((r) => {
              const rcfg = STATUS_CONFIG[r.status];
              return (
                <Flex key={r.rowKey} align="flex-start" gap={12}
                  style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: r.status === 'issue' ? '#fff2f0' : 'transparent' }}
                >
                  <Flex align="center" gap={4} style={{ minWidth: 90, paddingTop: 2 }}>
                    {rcfg.icon}
                    <Tag color={rcfg.color} style={{ margin: 0, fontSize: 11 }}>{rcfg.label}</Tag>
                  </Flex>
                  <Flex vertical gap={2} style={{ minWidth: 150 }}>
                    <Tooltip title={r.methodId}><Text code style={{ fontSize: 10 }}>{r.methodId.slice(-8)}</Text></Tooltip>
                    <Tooltip title={r.transitionId}><Text code style={{ fontSize: 10 }}>{r.transitionId.slice(-16)}</Text></Tooltip>
                  </Flex>
                  <div style={{ flex: 1, maxWidth: 240 }}>
                    <TripleProgress r={r} barWidth={80} />
                  </div>
                  {(r.issueCount ?? 0) > 0
                    ? <Badge count={r.issueCount} size="small" style={{ backgroundColor: '#ff4d4f', marginTop: 2 }} />
                    : <div style={{ width: 20 }} />
                  }
                  <div style={{ marginLeft: 'auto', paddingTop: 2 }}>
                    {renderAction(undefined, r)}
                  </div>
                </Flex>
              );
            })}
          </div>
        ),
      };
    }).filter(Boolean) as NonNullable<ReturnType<typeof taskGroups.map>[number]>[],
    [taskGroups, filterStatus] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // レンダリング
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* レイアウト切り替え（暫定） */}
      <Flex gap={8} align="center" style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>表示:</Text>
        <Segmented
          size="small"
          value={layout}
          onChange={(v) => setLayout(v as ProgressLayout)}
          options={[
            { label: 'クラシック', value: 'classic'   },
            { label: 'パターンA（3列）',  value: 'pattern-a' },
            { label: 'パターンB（折りたたみ）', value: 'pattern-b' },
          ]}
        />
      </Flex>

      {/* サマリーカード (A/B のみ) */}
      {(layout === 'pattern-a' || layout === 'pattern-b') && <SummaryCard rows={rows} />}

      {/* フィルタバー */}
      <FilterBar
        rows={rows}
        filterTaskNo={filterTaskNo}
        filterStatus={filterStatus}
        filteredCount={layout === 'pattern-b' ? collapseItems.length : filteredRows.length}
        onTaskNoChange={setFilterTaskNo}
        onStatusChange={setFilterStatus}
      />

      {/* 本体 */}
      {layout === 'classic' && (
        <Table<ProgressRow>
          dataSource={filteredRows}
          columns={classicColumns}
          rowKey="rowKey"
          size="small"
          pagination={false}
          bordered
          scroll={{ y: 'calc(100vh - 400px)' }}
          locale={{ emptyText: 'データがありません' }}
        />
      )}

      {layout === 'pattern-a' && (
        <Table<ProgressRow>
          dataSource={filteredRows}
          columns={patternAColumns}
          rowKey="rowKey"
          size="small"
          pagination={false}
          bordered
          scroll={{ y: 'calc(100vh - 480px)' }}
          locale={{ emptyText: 'データがありません' }}
        />
      )}

      {layout === 'pattern-b' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Collapse
            defaultActiveKey={taskNos.map(String)}
            items={collapseItems}
            size="small"
            style={{ background: 'transparent' }}
          />
        </div>
      )}
    </Flex>
  );
}
