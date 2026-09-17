'use client';

/**
 * 全体進捗タブ（パターンA固定）
 *
 * 全タスク × トランジション の行テーブルを表示する。
 * Mat/Cond/Res を独立3列（横1行バー + 数値）+ サマリーカード。
 * タスクNo / ステータス / メソッド名 / トランジション名 でフィルタリング可能。
 * 「作業へ」ボタンで作業記録タブに遷移、「詳細確認」ボタンで作業記録タブを読取専用で表示。
 * 「開始」ボタンで未着手トランジションの作業を開始する（固定順序チェックあり）。
 * 作業中のトランジションが存在する場合は確認ダイアログを経由してステータスを切り替える。
 *
 * フェーズA: ExperimentWorkerMenu から渡された progressRows を表示する（APIデータ接続はフェーズBで実施）。
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Progress,
  Select,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  MinusCircleOutlined,
  PartitionOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ProgressRow, ProgressOverviewTabProps } from '@/types/progress';
import type { Transition } from '@/types/experimentWorker';
import type { ProgressStatus } from '@/types/experimentWorker';
import TransitionFlowDiagram from './TransitionFlowDiagram';
import { useLanguage } from '@/contexts/LanguageContext';


export type { ProgressRow };

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ビジネスロジック
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ステータス設定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_CONFIG: Record<ProgressRow['status'], { color: string; icon: React.ReactNode }> = {
  not_started: { color: 'default',    icon: <MinusCircleOutlined       style={{ color: '#bfbfbf' }} /> },
  preparing:   { color: 'processing', icon: <SyncOutlined              style={{ color: '#1677ff' }} /> },
  ready:       { color: 'cyan',       icon: <CheckSquareOutlined       style={{ color: '#13c2c2' }} /> },
  in_progress: { color: 'processing', icon: null },
  on_hold:     { color: 'warning',    icon: <PauseCircleOutlined       style={{ color: '#faad14' }} /> },
  completed:   { color: 'success',    icon: <CheckCircleOutlined       style={{ color: '#52c41a' }} /> },
  issue:       { color: 'error',      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// サマリーカード
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SummaryCard: React.FC<{ rows: ProgressRow[] }> = ({ rows }) => {
  const { t } = useLanguage();
  const stats = useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce<Record<ProgressRow['status'], number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, { not_started: 0, preparing: 0, ready: 0, in_progress: 0, on_hold: 0, completed: 0, issue: 0 });
    const completedPct = total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);
    const taskNos = [...new Set(rows.map((r) => r.taskNo))];
    const completedTasks = taskNos.filter((no) =>
      rows.filter((r) => r.taskNo === no).every((r) => r.status === 'completed')
    ).length;
    const issueCount = rows.reduce((sum, r) => sum + (r.issueCount ?? 0), 0);
    return { total, byStatus, completedPct, taskCount: taskNos.length, completedTasks, issueCount };
  }, [rows]);

  return (
    <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: '12px 16px' } }}>
      <Flex align="center" gap={16} wrap="wrap">
        <div style={{ flex: '0 0 220px' }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: 14 }}>{t('progressOverview.summary.overallProgress')}</Text>
            <Text strong style={{ fontSize: 16, color: stats.completedPct === 100 ? '#52c41a' : '#1677ff' }}>
              {stats.completedPct}%
            </Text>
          </Flex>
          <Progress percent={stats.completedPct} showInfo={false} strokeColor={stats.completedPct === 100 ? '#52c41a' : '#1677ff'} size="small" />
          <Text type="secondary" style={{ fontSize: 14 }}>{t('progressOverview.summary.taskCompleted', { completed: String(stats.completedTasks), total: String(stats.taskCount) })}</Text>
        </div>
        <div style={{ width: 1, height: 48, background: '#f0f0f0', flexShrink: 0 }} />
        <Flex gap={16} wrap="wrap">
          <Statistic title={<Text type="secondary" style={{ fontSize: 14 }}>{t('progressOverview.summary.notStarted')}</Text>}   value={stats.byStatus.not_started} suffix={t('progressOverview.summary.itemSuffix')} styles={{ content: { fontSize: 18, color: '#595959' } }} />
          <Statistic title={<Text type="secondary" style={{ fontSize: 14 }}>{t('progressOverview.summary.inProgress')}</Text>}   value={stats.byStatus.in_progress} suffix={t('progressOverview.summary.itemSuffix')} styles={{ content: { fontSize: 18, color: '#1677ff' } }} />
          <Statistic title={<Text type="secondary" style={{ fontSize: 14 }}>{t('progressOverview.summary.completed')}</Text>}     value={stats.byStatus.completed}   suffix={t('progressOverview.summary.itemSuffix')} styles={{ content: { fontSize: 18, color: '#52c41a' } }} />
          {stats.byStatus.issue > 0 && (
            <Statistic title={<Text type="secondary" style={{ fontSize: 14 }}>{t('progressOverview.summary.issue')}</Text>} value={stats.byStatus.issue} suffix={t('progressOverview.summary.itemSuffix')} styles={{ content: { fontSize: 18, color: '#ff4d4f' } }} />
          )}
        </Flex>
        {stats.issueCount > 0 && (
          <>
            <div style={{ width: 1, height: 48, background: '#f0f0f0', flexShrink: 0 }} />
            <Statistic title={<Text type="secondary" style={{ fontSize: 14, color: '#ff4d4f' }}>{t('progressOverview.summary.issueReport')}</Text>} value={stats.issueCount} suffix={t('progressOverview.summary.itemSuffix')} styles={{ content: { fontSize: 18, color: '#ff4d4f' } }} prefix={<ExclamationCircleOutlined />} />
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
  filterMethodId: string | null;
  filterTransitionId: string | null;
  filteredCount: number;
  onTaskNoChange: (v: number | null) => void;
  onStatusChange: (v: ProgressRow['status'] | null) => void;
  onMethodIdChange: (v: string | null) => void;
  onTransitionIdChange: (v: string | null) => void;
}> = ({
  rows,
  filterTaskNo,
  filterStatus,
  filterMethodId,
  filterTransitionId,
  filteredCount,
  onTaskNoChange,
  onStatusChange,
  onMethodIdChange,
  onTransitionIdChange,
}) => {
  const { t } = useLanguage();
  const taskNos = useMemo(() => [...new Set(rows.map((r) => r.taskNo))].sort((a, b) => a - b), [rows]);

  /** メソッド選択肢（methodId → methodName の重複排除） */
  const methodOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      if (!seen.has(r.methodId)) {
        seen.set(r.methodId, r.methodName || r.methodId);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  /**
   * トランジション選択肢
   * メソッドが選択されている場合はそのメソッドに属するもののみ絞り込む
   */
  const transitionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      if (filterMethodId !== null && r.methodId !== filterMethodId) continue;
      if (!seen.has(r.transitionId)) {
        seen.set(r.transitionId, r.transitionName || r.transitionId);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [rows, filterMethodId]);

  const statusOptions = useMemo(() => [
    { label: t('progressOverview.status.not_started'), value: 'not_started' },
    { label: t('progressOverview.status.in_progress'), value: 'in_progress' },
    { label: t('progressOverview.status.on_hold'),     value: 'on_hold'     },
    { label: t('progressOverview.status.completed'),   value: 'completed'   },
    { label: t('progressOverview.status.issue'),       value: 'issue'       },
  ], [t]);

  return (
    <Flex gap={8} align="center" style={{ padding: '4px 0 10px' }} wrap="wrap">
      <Text type="secondary" style={{ fontSize: 14 }}>{t('progressOverview.filter.label')}</Text>
      {/* テーブル列順: メソッド名 → タスクNo → トランジション名 → ステータス */}
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        size="small"
        placeholder={t('progressOverview.filter.methodName')}
        style={{ minWidth: 140 }}
        value={filterMethodId}
        onChange={(v) => {
          onMethodIdChange(v ?? null);
          // メソッドが変わったらトランジション選択もリセット
          onTransitionIdChange(null);
        }}
        options={methodOptions}
      />
      <Select
        allowClear
        size="small"
        placeholder={t('progressOverview.filter.taskNo')}
        style={{ width: 100 }}
        value={filterTaskNo}
        onChange={(v) => onTaskNoChange(v ?? null)}
        options={taskNos.map((n) => ({ label: `#${n}`, value: n }))}
      />
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        size="small"
        placeholder={t('progressOverview.filter.transitionName')}
        style={{ minWidth: 160 }}
        value={filterTransitionId}
        onChange={(v) => onTransitionIdChange(v ?? null)}
        options={transitionOptions}
      />
      <Select
        allowClear
        size="small"
        placeholder={t('progressOverview.filter.status')}
        style={{ width: 120 }}
        value={filterStatus}
        onChange={(v) => onStatusChange((v as ProgressRow['status']) ?? null)}
        options={statusOptions}
      />
      <Text type="secondary" style={{ fontSize: 14 }}>{filteredCount}/{rows.length} {t('progressOverview.filter.countSuffix')}</Text>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メインコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ProgressOverviewTab({
  rows,
  onGoToWork,
  isProjectRecordable = true,
}: ProgressOverviewTabProps) {
  const { t } = useLanguage();
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProgressRow['status'] | null>(null);
  const [filterMethodId, setFilterMethodId] = useState<string | null>(null);
  const [filterTransitionId, setFilterTransitionId] = useState<string | null>(null);

  // ── フロー図モード用ステート ──────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list');
  /** タブキー形式: `${methodId}__${taskNo}` */
  const [flowTabKey, setFlowTabKey] = useState<string | null>(null);

  // ── フロー図タブ候補: rows から (methodId, taskNo) のユニーク組み合わせを抽出 ──
  const flowTabItems = useMemo(() => {
    const seen = new Map<string, { methodId: string; taskNo: number; methodName: string }>();
    for (const r of rows) {
      const key = `${r.methodId}__${r.taskNo}`;
      if (!seen.has(key)) {
        seen.set(key, {
          methodId: r.methodId,
          taskNo: r.taskNo,
          methodName: r.methodName ?? r.methodId,
        });
      }
    }
    return [...seen.values()].sort((a, b) => {
      if (a.methodId !== b.methodId) return a.methodId.localeCompare(b.methodId);
      return a.taskNo - b.taskNo;
    });
  }, [rows]);

  // ── フロー図モード切り替え・rows変化時に先頭タブを自動選択 ──
  useEffect(() => {
    if (viewMode === 'flow' && flowTabItems.length > 0) {
      const firstKey = `${flowTabItems[0].methodId}__${flowTabItems[0].taskNo}`;
      // 現在のキーが有効なら維持、無効なら先頭にリセット
      const isValid = flowTabKey !== null && flowTabItems.some(
        (item) => `${item.methodId}__${item.taskNo}` === flowTabKey
      );
      if (!isValid) setFlowTabKey(firstKey);
    }
  }, [viewMode, flowTabItems, flowTabKey]);

  // ── ProgressRow → Transition 変換アダプター ──────────────
  const progressRowToTransition = useCallback((r: ProgressRow): Transition => {
    const matTotal  = r.materialTotal  ?? 0;
    const condTotal = r.conditionTotal ?? 0;
    const resTotal  = r.resultTotal    ?? 0;
    const matRec    = r.materialRecorded  ?? 0;
    const condRec   = r.conditionRecorded ?? 0;
    const resRec    = r.resultRecorded    ?? 0;
    const totalItems = matTotal + condTotal + resTotal;
    const totalDone  = matRec  + condRec  + resRec;

    // 進捗率の決定（優先順位）:
    // 1. completed ステータスは必ず 100%（バックエンドの normalizeProgress と整合）
    // 2. バックエンドから progressRate が渡されている場合はその値を使用
    // 3. MCR 件数から算出（テンプレート定義がある場合のフォールバック）
    let progressRate: number;
    if (r.status === 'completed') {
      progressRate = 100;
    } else if (r.progressRate !== undefined) {
      progressRate = r.progressRate;
    } else {
      progressRate = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
    }

    return {
      transitionId: r.transitionId,
      transitionName: r.transitionName ?? r.transitionId,
      status: r.status as ProgressStatus,
      progressRate,
      inputMaterialsCount:   matRec,
      totalMaterialsCount:   matTotal,
      inputIngredientsCount: condRec,
      totalIngredientsCount: condTotal,
      inputResultsCount:     resRec,
      totalResultsCount:     resTotal,
      prerequisiteTransitionIds: r.prerequisiteTransitionIds ?? [],
      // workOrder は設定しない（BFS レイアウトが prerequisiteTransitionIds を使うため）
    };
  }, []);

  // ── 選択中タブに対応する Transition[] ────────────────────
  const flowTransitions = useMemo((): Transition[] => {
    if (!flowTabKey) return [];
    const [methodId, taskNoStr] = flowTabKey.split('__');
    const taskNo = Number(taskNoStr);
    return rows
      .filter((r) => r.methodId === methodId && r.taskNo === taskNo)
      .map(progressRowToTransition);
  }, [flowTabKey, rows, progressRowToTransition]);

  // ── フロー図モードのメソッド名表示用 ─────────────────────
  const flowMethodName = useMemo(() => {
    if (!flowTabKey) return undefined;
    const [methodId, taskNoStr] = flowTabKey.split('__');
    const taskNo = Number(taskNoStr);
    const found = flowTabItems.find((i) => i.methodId === methodId && i.taskNo === taskNo);
    return found ? `${found.methodName} / #${found.taskNo}` : undefined;
  }, [flowTabKey, flowTabItems]);

  // ── 画面幅検知（xl: 1200px以上で3列独立表示） ───────────
  const screens = Grid.useBreakpoint();
  const isWide = !!screens.xl;

  const filteredRows = useMemo(
    () => rows.filter((r) => {
      if (filterTaskNo       !== null && r.taskNo       !== filterTaskNo)       return false;
      if (filterStatus       !== null && r.status       !== filterStatus)       return false;
      if (filterMethodId     !== null && r.methodId     !== filterMethodId)     return false;
      if (filterTransitionId !== null && r.transitionId !== filterTransitionId) return false;
      return true;
    }),
    [rows, filterTaskNo, filterStatus, filterMethodId, filterTransitionId]
  );
  
  // ── 操作列 ─────────────────────────────────────────
  // not_started のみ disabled（バックエンドが前提トランジション完了時に自動で
  // PREPARING に変えるため、フロント側での前提チェックは不要）。
  // isProjectRecordable=false の場合もすべて非活性（プロジェクトが記録操作不可状態）。
  // フロー図モードの TransitionFlowNode.tsx と同一判定ロジックで統一する。
  const renderAction = (_: unknown, r: ProgressRow) => (
    <Button
      size="small"
      disabled={!isProjectRecordable || r.status === 'not_started'}
      onClick={() => onGoToWork(r.taskNo, r.transitionId)}
    >
      {t('experimentWork.table.record')}
    </Button>
  );

  // ── ステータスタグ ───────────────────────────────────
  const renderStatus = (v: ProgressRow['status']) => {
    const cfg = STATUS_CONFIG[v] ?? { color: 'default', icon: null };
    return (
      <Flex align="center" gap={4} justify="center" wrap="wrap">
        {cfg.icon}
        <Tag color={cfg.color} style={{ margin: 0 }}>{t(`progressOverview.status.${v}`, undefined) || v}</Tag>
      </Flex>
    );
  };

  // ── テーブル列定義 ───────────────────────────────────

  /** 共通ベース列（メソッド名 / タスクNo / トランジション名 / ステータス） */
  const baseColumns: ColumnsType<ProgressRow> = [
    {
      title: t('progressOverview.column.methodName'), dataIndex: 'methodId', width: 160, ellipsis: { showTitle: false },
      render: (_: string, record: ProgressRow) => {
        const displayName = record.methodName || record.methodId;
        return <Tooltip title={displayName}><Text style={{ fontSize: 14 }}>{displayName}</Text></Tooltip>;
      },
    },
    {
      title: t('progressOverview.column.taskNo'), dataIndex: 'taskNo', width: 80, align: 'center',
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: t('progressOverview.column.transitionName'), dataIndex: 'transitionId', width: 180, ellipsis: { showTitle: false },
      render: (_: string, record: ProgressRow) => {
        const displayName = record.transitionName || record.transitionId;
        const hasPrereqs = (record.prerequisiteTransitionIds?.length ?? 0) > 0;
        return (
          <Flex align="center" gap={4}>
            <Tooltip title={displayName}>
              <Text style={{ fontSize: 14 }}>{displayName}</Text>
            </Tooltip>
            {hasPrereqs && (
              <Tooltip title={t('experimentWork.table.prerequisiteLockTooltip', { ids: record.prerequisiteTransitionIds?.join(', ') ?? '' })}>
                <LockOutlined style={{ color: '#faad14', fontSize: 12 }} />
              </Tooltip>
            )}
          </Flex>
        );
      },
    },
    {
      title: t('progressOverview.column.status'),
      dataIndex: 'status',
      width: 160,
      align: 'center',
      render: renderStatus,
    },
  ];

  /**
   * 進捗列（幅広: 1200px以上）
   * Material / Condition / Result を独立3列で表示（Progressバー + rec/tot 数値）
   * 合計 390px
   */
  const wideProgressColumns: ColumnsType<ProgressRow> = [
    {
      title: 'Material', width: 130, align: 'center',
      render: (_: unknown, r: ProgressRow) => {
        const rec = r.materialRecorded ?? 0, tot = r.materialTotal ?? 0;
        return tot === 0 ? <Text type="secondary">—</Text> : (
          <Flex align="center" gap={4}>
            <Progress percent={Math.round((rec / tot) * 100)} size="small" strokeColor="#1677ff" showInfo={false} style={{ flex: 1, margin: 0 }} />
            <Text style={{ fontSize: 12, minWidth: 28 }}>{rec}/{tot}</Text>
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
            <Text style={{ fontSize: 12, minWidth: 28 }}>{rec}/{tot}</Text>
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
            <Text style={{ fontSize: 12, minWidth: 28 }}>{rec}/{tot}</Text>
          </Flex>
        );
      },
    },
  ];

  /**
   * 進捗列（狭幅: 1200px未満）
   * Material / Condition / Result を1列に統合してテキストのみ表示
   * 150px
   */
  const narrowProgressColumn: ColumnsType<ProgressRow> = [
    {
      title: t('progressOverview.column.progress'), width: 150, align: 'center',
      render: (_: unknown, r: ProgressRow) => {
        const items: React.ReactNode[] = [];
        const mTot = r.materialTotal  ?? 0;
        const cTot = r.conditionTotal ?? 0;
        const rTot = r.resultTotal    ?? 0;
        if (mTot > 0) items.push(
          <Text key="m" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#1677ff', fontWeight: 600 }}>M</span>
            {' '}{r.materialRecorded ?? 0}/{mTot}
          </Text>
        );
        if (cTot > 0) items.push(
          <Text key="c" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#52c41a', fontWeight: 600 }}>C</span>
            {' '}{r.conditionRecorded ?? 0}/{cTot}
          </Text>
        );
        if (rTot > 0) items.push(
          <Text key="r" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#fa8c16', fontWeight: 600 }}>R</span>
            {' '}{r.resultRecorded ?? 0}/{rTot}
          </Text>
        );
        if (items.length === 0) return <Text type="secondary">—</Text>;
        return <Flex align="center" justify="center" gap={8} wrap="wrap">{items}</Flex>;
      },
    },
  ];

  /** 末尾共通列（問題 / 操作） */
  const tailColumns: ColumnsType<ProgressRow> = [
    {
      title: t('progressOverview.column.issue'), dataIndex: 'issueCount', width: 60, align: 'center',
      render: (v: number | undefined) => (v ?? 0) > 0 ? <Badge count={v} size="small" style={{ backgroundColor: '#ff4d4f' }} /> : <Text type="secondary">—</Text>,
    },
    { title: t('progressOverview.column.action'), width: 100, align: 'center', render: renderAction },
  ];

  /** 画面幅に応じて列を切り替え（isWide: 1200px以上） */
  const columns: ColumnsType<ProgressRow> = [
    ...baseColumns,
    ...(isWide ? wideProgressColumns : narrowProgressColumn),
    ...tailColumns,
  ];

  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* サマリーカード */}
      <SummaryCard rows={rows} />

      {/* フィルタバー + 切り替えボタン（リストモード時のみ表示） */}
      {viewMode === 'list' && (
        <Flex align="center" gap={8}>
          <div style={{ flex: 1 }}>
            <FilterBar
              rows={rows}
              filterTaskNo={filterTaskNo}
              filterStatus={filterStatus}
              filterMethodId={filterMethodId}
              filterTransitionId={filterTransitionId}
              filteredCount={filteredRows.length}
              onTaskNoChange={setFilterTaskNo}
              onStatusChange={setFilterStatus}
              onMethodIdChange={setFilterMethodId}
              onTransitionIdChange={setFilterTransitionId}
            />
          </div>
          <Button
            data-testid="switch-to-flow-button"
            icon={<PartitionOutlined />}
            onClick={() => setViewMode('flow')}
            style={{ flexShrink: 0, marginBottom: 10 }}
          >
            {t('progressOverview.viewMode.flow')}
          </Button>
        </Flex>
      )}

      {/* フロー図モード */}
      {viewMode === 'flow' && (
        <Flex vertical style={{ flex: 1, minHeight: 0 }}>
          {/* 切り替えボタン行 */}
          <Flex justify="flex-end" style={{ marginBottom: 8 }}>
            <Button
              data-testid="switch-to-list-button"
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode('list')}
            >
              {t('progressOverview.viewMode.list')}
            </Button>
          </Flex>

          {flowTabItems.length === 0 ? (
            <Flex align="center" justify="center" style={{ flex: 1 }}>
              <Typography.Text type="secondary">{t('progressOverview.empty')}</Typography.Text>
            </Flex>
          ) : (
            <Tabs
              activeKey={flowTabKey ?? undefined}
              onChange={(key) => setFlowTabKey(key)}
              size="small"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              tabBarStyle={{ marginBottom: 8, flexShrink: 0 }}
              items={flowTabItems.map((item) => ({
                key: `${item.methodId}__${item.taskNo}`,
                label: `${item.methodName} / #${item.taskNo}`,
                children: (
                  <TransitionFlowDiagram
                    transitions={flowTransitions}
                    onRecordClick={(t) => onGoToWork(item.taskNo, t.transitionId)}
                    onIssueClick={() => {}}
                    isProjectRecordable={isProjectRecordable}
                    methodName={flowMethodName}
                  />
                ),
              }))}
            />
          )}
        </Flex>
      )}

      {/* テーブル本体（リストモード時のみ表示） */}
      {viewMode === 'list' && (
        <Table<ProgressRow>
          dataSource={filteredRows}
          columns={columns}
          rowKey="rowKey"
          size="small"
          pagination={false}
          bordered
          scroll={{ y: 'calc(100vh - 480px)' }}
          locale={{ emptyText: t('progressOverview.empty') }}
        />
      )}
    </Flex>
  );
}
