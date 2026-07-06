'use client';

/**
 * 全体進捗タブ（パターンA固定）
 *
 * 全タスク × トランジション の行テーブルを表示する。
 * Mat/Cond/Res を独立3列（横1行バー + 数値）+ サマリーカード。
 * タスクNo / ステータス でフィルタリング可能。
 * 「作業へ」ボタンで作業記録タブに遷移、「詳細確認」ボタンで作業記録タブを読取専用で表示。
 * 「開始」ボタンで未着手トランジションの作業を開始する（固定順序チェックあり）。
 * 作業中のトランジションが存在する場合は確認ダイアログを経由してステータスを切り替える。
 *
 * フェーズA: ExperimentWorkerMenu から渡された progressRows を表示する（APIデータ接続はフェーズBで実施）。
 */

import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Flex,
  Progress,
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
  ExclamationCircleOutlined,
  LockOutlined,
  MinusCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import type { ProgressRow, ProgressOverviewTabProps } from '@/types/progress';

export type { ProgressRow };

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ビジネスロジック
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 対象トランジションにアクセス可能かどうかを判定する。
 *
 * prerequisiteTransitionIds が空または未設定のトランジションは常にアクセス可能。
 * prerequisiteTransitionIds が設定されている場合、同一タスク内の
 * 全ての前提トランジションが completed の場合のみアクセス可能。
 *
 * @example
 *   // TR_D の prerequisiteTransitionIds = ['TR_A', 'TR_B', 'TR_C']
 *   // → TR_A, TR_B, TR_C が全て completed のときのみ TR_D にアクセス可能
 */
function canAccessTransition(target: ProgressRow, allRows: ProgressRow[]): boolean {
  const prereqs = target.prerequisiteTransitionIds;

  // 前提なし → いつでもアクセス可能
  if (!prereqs || prereqs.length === 0) return true;

  // 同一タスク内の全ての前提トランジションが completed であるか確認
  return prereqs.every((prereqId) => {
    const prereqRow = allRows.find(
      (r) => r.taskNo === target.taskNo && r.transitionId === prereqId
    );
    return prereqRow?.status === 'completed';
  });
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
// サマリーカード
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// フィルタバー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
    <Flex gap={8} align="center" style={{ padding: '4px 0 10px' }} wrap="wrap">
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
  onStartWork,
}: ProgressOverviewTabProps) {
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProgressRow['status'] | null>(null);

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
    if (r.status === 'completed' || r.status === 'issue') {
      return <Button size="small" onClick={() => onViewDetail(r.taskNo, r.transitionId)}>詳細確認</Button>;
    }
    if (r.status === 'in_progress') {
      return (
        <Button type="primary" size="small" onClick={() => onGoToWork(r.taskNo, r.transitionId)}>
          作業へ
        </Button>
      );
    }
    if (r.status === 'on_hold') {
      return (
        <Button size="small" onClick={() => onGoToWork(r.taskNo, r.transitionId)}>
          再開
        </Button>
      );
    }
    if (r.status === 'not_started') {
      const accessible = canAccessTransition(r, rows);
      if (!accessible) {
        return (
          <Tooltip title="前の順序のトランジションを先に完了してください">
            <Button size="small" disabled>
              開始
            </Button>
          </Tooltip>
        );
      }
      return (
        <Button
          size="small"
          onClick={() => {
            if (onStartWork) {
              onStartWork(r.taskNo, r.transitionId, r.methodId);
            } else {
              onGoToWork(r.taskNo, r.transitionId);
            }
          }}
        >
          開始
        </Button>
      );
    }
    return <Text type="secondary">—</Text>;
  };

  // ── ステータスタグ ───────────────────────────────────
  const renderStatus = (v: ProgressRow['status']) => {
    const cfg = STATUS_CONFIG[v] ?? { label: v, color: 'default', icon: null };
    return (
      <Flex align="center" gap={4} justify="center" wrap="wrap">
        {cfg.icon}
        <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
      </Flex>
    );
  };

  // ── テーブル列定義 ───────────────────────────────────
  const columns: ColumnsType<ProgressRow> = [
    {
      title: 'メソッド名', dataIndex: 'methodId', width: 160, ellipsis: { showTitle: false },
      render: (_: string, record: ProgressRow) => {
        const displayName = record.methodName || record.methodId;
        return <Tooltip title={displayName}><Text style={{ fontSize: 12 }}>{displayName}</Text></Tooltip>;
      },
    },
    {
      title: 'タスクNo', dataIndex: 'taskNo', width: 80, align: 'center',
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: 'トランジション名', dataIndex: 'transitionId', width: 180, ellipsis: { showTitle: false },
      render: (_: string, record: ProgressRow) => {
        const displayName = record.transitionName || record.transitionId;
        const hasPrereqs = (record.prerequisiteTransitionIds?.length ?? 0) > 0;
        return (
          <Flex align="center" gap={4}>
            <Tooltip title={displayName}>
              <Text style={{ fontSize: 12 }}>{displayName}</Text>
            </Tooltip>
            {hasPrereqs && (
              <Tooltip title={`前提トランジション: ${record.prerequisiteTransitionIds?.join(', ')} が全て完了してから開始できます`}>
                <LockOutlined style={{ color: '#faad14', fontSize: 12 }} />
              </Tooltip>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      width: 160,
      align: 'center',
      render: renderStatus,
    },
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

  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* サマリーカード */}
      <SummaryCard rows={rows} />

      {/* フィルタバー */}
      <FilterBar
        rows={rows}
        filterTaskNo={filterTaskNo}
        filterStatus={filterStatus}
        filteredCount={filteredRows.length}
        onTaskNoChange={setFilterTaskNo}
        onStatusChange={setFilterStatus}
      />

      {/* テーブル本体 */}
      <Table<ProgressRow>
        dataSource={filteredRows}
        columns={columns}
        rowKey="rowKey"
        size="small"
        pagination={false}
        bordered
        scroll={{ y: 'calc(100vh - 480px)' }}
        locale={{ emptyText: 'データがありません' }}
      />
    </Flex>
  );
}
