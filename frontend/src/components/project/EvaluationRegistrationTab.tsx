'use client';

/**
 * EvaluationRegistrationTab.tsx
 * 「評価登録確認」タブのコンテンツ
 *
 * - 評価結果一覧（固定ヘッダー付き単一テーブル）
 * - 一覧上部左の「✏️ 評価を入力」ボタン → InputModal（評価入力フォーム）
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  Table,
  Input,
  Space,
  Typography,
  Flex,
  Button,
  Tag,
  Empty,
  Spin,
  Radio,
  Modal,
  App,
  Card,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getSubEvaluationsByProject,
  saveSubEvaluations,
} from '@/services/projectOverallEvaluationApiService';
import type {
  SubEvaluationRow as EvaluationRecord,
  SubEvaluationInput,
} from '@/types/projectOverallEvaluation';
import { getProjectMethods, getExperimentInstructions } from '@/services/experimentInstructionApiService';
import {
  SUB_EVAL_VALUE_OPTIONS,
  SUB_EVAL_VALUE_COLOR,
} from '@/types/projectOverallEvaluation';
import { SubEvaluationScopeValues } from '@/constants/aggregationRule';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

/** 評価テーブルの行データ（入力用） */
interface EvalRow {
  rowKey: string;
  label: string;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  evaluationValue: string | undefined;
  comment: string;
}

/** コンポーネント Props */
export interface EvaluationRegistrationTabProps {
projectId: string;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性にする */
  isProjectCompleted?: boolean;
  /** チェックアウト中フラグ。true の場合は変更系ボタンを非活性にする */
  isCheckoutLocked?: boolean;
  /** MAIMLバリデーションエラーがある場合 true。true の場合は変更系ボタンを非活性にする */
  maimlHasErrors?: boolean;
}

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

type ResultUnitFilter = string;

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

function buildEvalRows(
  unit: string,
  allMethods: Array<{ id: string; name: string }>,
  reviewWaitingTasks: Array<{ methodId: string; methodName: string; taskNumber: number }>,
  selectedMethodForTr: string | null,
  selectedTaskNoForTr: number | null,
  projectLabel: string,
): EvalRow[] {
  switch (unit) {
    case 'METHOD':
      return allMethods.map((m) => ({
        rowKey: `method__${m.id}`,
        label: m.name || m.id,
        methodId: m.id,
        evaluationValue: undefined,
        comment: '',
      }));
    case 'TASK': {
      const seen = new Set<string>();
      const rows: EvalRow[] = [];
      for (const t of reviewWaitingTasks) {
        const key = `${t.methodId}__${t.taskNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({ rowKey: key, label: `#${t.taskNumber} (${t.methodId})`, methodId: t.methodId, taskNo: t.taskNumber, evaluationValue: undefined, comment: '' });
        }
      }
      return rows;
    }
    case SubEvaluationScopeValues.TRANSITION_METHOD:
      if (!selectedMethodForTr) return [];
      return [];
    case SubEvaluationScopeValues.TRANSITION_TASK:
      if (!selectedMethodForTr || selectedTaskNoForTr === null) return [];
      return [];
    default:
      return [];
  }
}

/** 評価値を色付き Tag で表示 */
function EvalValueTag({
  value,
}: {
  value: string | null | undefined;
}) {
  const { t } = useLanguage();
  if (!value) return <Text type="secondary" italic style={{ fontSize: 12 }}>{t('evaluation.placeholders.notEvaluated')}</Text>;
  const color = SUB_EVAL_VALUE_COLOR[value] ?? 'default';
  return (
    <Tag color={color} style={{ fontSize: 11 }}>
      {value}
    </Tag>
  );
}

/** 評価日時を整形して表示 */
function formatEvaluatedAt(value: string | null | undefined): React.ReactNode {
  if (!value) return <Text type="secondary">—</Text>;
  const d = new Date(value);
  return (
    <Text style={{ fontSize: 11 }}>
      {`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────
// InputModal: 評価入力モーダル
// ─────────────────────────────────────────────────────────────

interface InputModalProps {
  open: boolean;
  projectId: string;
  allMethods: Array<{ id: string; name: string }>;
  reviewWaitingTasks: Array<{ methodId: string; methodName: string; taskNumber: number }>;
  onSaved: () => void;
  onClose: () => void;
}

const InputModal: React.FC<InputModalProps> = ({
  open, projectId, allMethods, reviewWaitingTasks, onSaved, onClose,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const EVALUATION_UNIT_OPTIONS_INPUT: Array<{ label: string; value: string }> = [
    { label: t('evaluation.unitLabel.method'),            value: SubEvaluationScopeValues.METHOD            },
    { label: t('evaluation.unitLabel.task'),              value: SubEvaluationScopeValues.TASK              },
    { label: t('evaluation.unitLabel.transitionMethod'),  value: SubEvaluationScopeValues.TRANSITION_METHOD },
    { label: t('evaluation.unitLabel.transitionTask'),    value: SubEvaluationScopeValues.TRANSITION_TASK   },
  ];

  const [evalUnit, setEvalUnit]                         = useState<string>(SubEvaluationScopeValues.METHOD);
  const [selectedMethodForTr, setSelectedMethodForTr]   = useState<string | null>(null);
  const [selectedTaskNoForTr, setSelectedTaskNoForTr]   = useState<number | null>(null);
  const [evalRows, setEvalRows]                         = useState<EvalRow[]>([]);
  const [submitting, setSubmitting]                     = useState(false);

  const handleEvalUnitChange = (unit: string) => {
    setEvalUnit(unit);
    setSelectedMethodForTr(null);
    setSelectedTaskNoForTr(null);
  };

  const handleMethodChange = (methodId: string | null) => {
    setSelectedMethodForTr(methodId);
    setSelectedTaskNoForTr(null);
  };

  const taskNoOptions = useMemo(() => {
    if (!selectedMethodForTr) return [];
    const seen = new Set<number>();
    const opts: { label: string; value: number }[] = [];
    for (const t of reviewWaitingTasks) {
      if (t.methodId === selectedMethodForTr && !seen.has(t.taskNumber)) {
        seen.add(t.taskNumber);
        opts.push({ label: `#${t.taskNumber}`, value: t.taskNumber });
      }
    }
    return opts.sort((a, b) => a.value - b.value);
  }, [selectedMethodForTr, reviewWaitingTasks]);

  useEffect(() => {
    setEvalRows(buildEvalRows(evalUnit, allMethods, reviewWaitingTasks, selectedMethodForTr, selectedTaskNoForTr, t('evaluation.unitLabel.project')));
  }, [evalUnit, allMethods, reviewWaitingTasks, selectedMethodForTr, selectedTaskNoForTr, t]);

  const handleClose = () => {
    setEvalUnit('METHOD');
    setSelectedMethodForTr(null);
    setSelectedTaskNoForTr(null);
    onClose();
  };

  const updateEvalRow = (rowKey: string, field: 'evaluationValue' | 'comment', value: string) => {
    setEvalRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    const evaluations: SubEvaluationInput[] = evalRows
      .filter((r) => r.evaluationValue)
      .map((r) => ({
        evaluationScope:  evalUnit,
        methodId:        r.methodId,
        taskNo:          r.taskNo,
        transitionId:    r.transitionId,
        evaluationValue: r.evaluationValue,
        comment:         r.comment || undefined,
      }));
    if (evaluations.length === 0) { message.warning(t('evaluation.messages.noEvalValue')); return; }

    setSubmitting(true);
    try {
      const saveRequest = { evaluations };
      await saveSubEvaluations(projectId, saveRequest);
      message.success(t('evaluation.messages.saveSuccess', { count: String(evaluations.length) }));
      handleClose();
      onSaved();
    } catch (err) {
      console.error('[InputModal] save error:', err);
      message.error(t('evaluation.messages.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const evalColumns: ColumnsType<EvalRow> = useMemo(() => {
    const labelTitle =
      evalUnit === 'METHOD' ? t('evaluation.columns.methodName')
      : evalUnit === 'TASK' ? t('evaluation.columns.taskLabel')
      : t('evaluation.columns.transitionLabel');
    return [
      {
        title: labelTitle, dataIndex: 'label', width: 200,
        render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
      },
      {
        title: t('evaluation.columns.qualEvaluation'), width: 180,
        render: (_: unknown, row: EvalRow) => (
          <Select
            allowClear placeholder={t('evaluation.placeholders.notEvaluated')} style={{ width: 160 }} size="small"
            value={row.evaluationValue}
            onChange={(v) => updateEvalRow(row.rowKey, 'evaluationValue', v ?? '')}
            options={SUB_EVAL_VALUE_OPTIONS}
          />
        ),
      },
      {
        title: t('evaluation.columns.comment'),
        render: (_: unknown, row: EvalRow) => (
          <Input size="small" placeholder={t('evaluation.placeholders.comment')} value={row.comment}
            onChange={(e) => updateEvalRow(row.rowKey, 'comment', e.target.value)} maxLength={200} />
        ),
      },
    ];
  }, [evalUnit]);

  return (
    <Modal
      title={t('evaluation.inputModal.title')}
      open={open}
      onCancel={handleClose}
      width={760}
      destroyOnHidden
      footer={
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 11 }}>{t('evaluation.inputModal.footerNote')}</Text>
          <Space>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="primary" loading={submitting} onClick={handleSave}>{t('evaluation.buttons.saveEvaluation')}</Button>
          </Space>
        </Flex>
      }
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {/* 評価単位 */}
        <Flex align="center" gap={8} wrap="wrap">
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.evalUnit')}</Text>
          <Radio.Group value={evalUnit} onChange={(e) => handleEvalUnitChange(e.target.value)} size="small">
            {EVALUATION_UNIT_OPTIONS_INPUT.map((opt) => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        </Flex>

        {/* トランジション系: メソッド選択 */}
        {(evalUnit === SubEvaluationScopeValues.TRANSITION_METHOD || evalUnit === SubEvaluationScopeValues.TRANSITION_TASK) && (
          <Flex align="center" gap={8} wrap="wrap">
            <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectMethod')}</Text>
            <Select style={{ width: 200 }} size="small" placeholder={t('evaluation.placeholders.selectMethod')}
              value={selectedMethodForTr}
              onChange={(v) => handleMethodChange(v ?? null)}
              options={allMethods.map((m) => ({ label: m.name || m.id, value: m.id }))} />
            {evalUnit === SubEvaluationScopeValues.TRANSITION_TASK && (
              <>
                <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectTaskNo')}</Text>
                <Select style={{ width: 140 }} size="small" placeholder={t('evaluation.placeholders.selectTaskNo')}
                  value={selectedTaskNoForTr}
                  onChange={(v) => setSelectedTaskNoForTr(v ?? null)}
                  options={taskNoOptions}
                  disabled={!selectedMethodForTr} />
              </>
            )}
          </Flex>
        )}

        {/* 評価テーブル */}
        <Table<EvalRow>
          dataSource={evalRows} columns={evalColumns} rowKey="rowKey"
          size="small" pagination={false} bordered scroll={{ y: 220 }}
          locale={{ emptyText: t('evaluation.empty.noTarget') }} />
      </Space>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────

const EvaluationRegistrationTab: React.FC<EvaluationRegistrationTabProps> = ({
  projectId,
  isEditable = true,
  isProjectCompleted = false,
  isCheckoutLocked = false,
  maimlHasErrors = false,
}) => {
  const { t } = useLanguage();

  const UNIT_LABEL: Record<string, string> = {
    project:           t('evaluation.unitLabel.project'),
    method:            t('evaluation.unitLabel.method'),
    task:              t('evaluation.unitLabel.task'),
    transition_method: t('evaluation.unitLabel.transitionMethod'),
    transition_task:   t('evaluation.unitLabel.transitionTask'),
    [SubEvaluationScopeValues.METHOD]:            t('evaluation.unitLabel.method'),
    [SubEvaluationScopeValues.TASK]:              t('evaluation.unitLabel.task'),
    [SubEvaluationScopeValues.TRANSITION_METHOD]: t('evaluation.unitLabel.transitionMethod'),
    [SubEvaluationScopeValues.TRANSITION_TASK]:   t('evaluation.unitLabel.transitionTask'),
  };

  const RESULT_UNIT_OPTIONS: Array<{ label: string; value: string }> = [
    { label: t('evaluation.unitLabel.all'),               value: 'all'                                     },
    { label: t('evaluation.unitLabel.method'),            value: SubEvaluationScopeValues.METHOD            },
    { label: t('evaluation.unitLabel.task'),              value: SubEvaluationScopeValues.TASK              },
    { label: t('evaluation.unitLabel.transitionMethod'),  value: SubEvaluationScopeValues.TRANSITION_METHOD },
    { label: t('evaluation.unitLabel.transitionTask'),    value: SubEvaluationScopeValues.TRANSITION_TASK   },
  ];

  const [allMethods, setAllMethods]         = useState<Array<{ id: string; name: string }>>([]);
  const [reviewWaitingTasks, setReviewWaitingTasks] = useState<Array<{ methodId: string; methodName: string; taskNumber: number }>>([]);
  const [records, setRecords]               = useState<EvaluationRecord[]>([]);
  const [loading, setLoading]               = useState(false);
  const [unitFilter, setUnitFilter]         = useState<ResultUnitFilter>('all');
  const [filterMethodId, setFilterMethodId] = useState<string | null>(null);
  const [filterTaskNo, setFilterTaskNo]     = useState<number | null>(null);
  const [inputModalOpen, setInputModalOpen] = useState(false);

  const fetchRecords = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getSubEvaluationsByProject(projectId)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // メソッド・レビュー待ちタスクを取得
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      getProjectMethods(projectId).catch(() => []),
      getExperimentInstructions(projectId).catch(() => []),
    ]).then(([methodData, instData]) => {
      setAllMethods(methodData.map((m) => ({ id: m.id, name: m.name ?? m.id })));
      // レビュー待ちタスク（status '04'）を抽出
      const seen = new Set<string>();
      const waiting: Array<{ methodId: string; methodName: string; taskNumber: number }> = [];
      instData.forEach((method) => {
        method.tasks.forEach((task) => {
          const status = String(task.taskStatus ?? '00').padStart(2, '0');
          if (status !== '04') return;
          const key = `${method.methodId}__${task.taskNo}`;
          if (seen.has(key)) return;
          seen.add(key);
          waiting.push({ methodId: method.methodId, methodName: method.methodId, taskNumber: task.taskNo });
        });
      });
      setReviewWaitingTasks(waiting);
    }).catch(console.error);
  }, [projectId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleUnitFilterChange = (unit: ResultUnitFilter) => {
    setUnitFilter(unit);
    setFilterMethodId(null);
    setFilterTaskNo(null);
  };

  const handleFilterMethodChange = (methodId: string | null) => {
    setFilterMethodId(methodId);
    setFilterTaskNo(null);
  };

  // トランジション系フィルタ用のメソッド選択肢（一覧データから抽出）
  const transitionMethodOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const r of records) {
      if ((r.evaluation_unit === SubEvaluationScopeValues.TRANSITION_METHOD || r.evaluation_unit === SubEvaluationScopeValues.TRANSITION_TASK) && r.method_id && !seen.has(r.method_id)) {
        seen.add(r.method_id);
        opts.push({ label: r.method_id, value: r.method_id });
      }
    }
    return opts;
  }, [records]);

  const transitionTaskNoOptions = useMemo(() => {
    if (!filterMethodId) return [];
    const seen = new Set<number>();
    const opts: { label: string; value: number }[] = [];
    for (const r of records) {
      if (r.evaluation_unit === SubEvaluationScopeValues.TRANSITION_TASK && r.method_id === filterMethodId && r.task_no !== null && !seen.has(r.task_no)) {
        seen.add(r.task_no);
        opts.push({ label: `#${r.task_no}`, value: r.task_no });
      }
    }
    return opts.sort((a, b) => a.value - b.value);
  }, [records, filterMethodId]);

  // フィルタ済みデータ
  const filtered = useMemo(() => {
    let result = records;
    if (unitFilter !== 'all') result = result.filter((r) => r.evaluation_unit === unitFilter);
    if (filterMethodId && (unitFilter === SubEvaluationScopeValues.TRANSITION_METHOD || unitFilter === SubEvaluationScopeValues.TRANSITION_TASK))
      result = result.filter((r) => r.method_id === filterMethodId);
    if (filterTaskNo !== null && unitFilter === SubEvaluationScopeValues.TRANSITION_TASK)
      result = result.filter((r) => r.task_no === filterTaskNo);
    return result;
  }, [records, unitFilter, filterMethodId, filterTaskNo]);


  // ─── 一覧テーブルの列定義（固定ヘッダー付き単一テーブル）
  const resultColumns: ColumnsType<EvaluationRecord> = useMemo(() => [
    {
      title: t('evaluation.columns.evalUnit'),
      key: 'evaluation_unit',
      width: 200,
      render: (_: unknown, r: EvaluationRecord) => (
        <Text style={{ fontSize: 12 }}>{UNIT_LABEL[r.evaluation_unit] ?? r.evaluation_unit}</Text>
      ),
    },
    {
      title: t('evaluation.columns.target'),
      key: 'target',
      width: 250,
      render: (_: unknown, r: EvaluationRecord) => {
        const unit = r.evaluation_unit;
        if (unit === SubEvaluationScopeValues.METHOD)
          return <Text style={{ fontSize: 12 }}>{r.method_id ?? '—'}</Text>;
        if (unit === SubEvaluationScopeValues.TASK)
          return <Text style={{ fontSize: 12 }}>{r.method_id ? `#${r.task_no} (${r.method_id})` : `#${r.task_no}`}</Text>;
        if (unit === SubEvaluationScopeValues.TRANSITION_METHOD)
          return (
            <Text style={{ fontSize: 12 }}>
              {r.transition_id ?? '—'}
              {r.method_id && <Text type="secondary" style={{ fontSize: 11 }}> ({r.method_id})</Text>}
            </Text>
          );
        // transition_task
        return (
          <Text style={{ fontSize: 12 }}>
            {r.transition_id ?? '—'}
            {r.method_id && <Text type="secondary" style={{ fontSize: 11 }}>{` (${r.method_id} / #${r.task_no})`}</Text>}
          </Text>
        );
      },
    },
    {
      title: t('evaluation.columns.evalValue'),
      key: 'evaluation_value',
      width: 150,
      align: 'center' as const,
      render: (_: unknown, r: EvaluationRecord) => (
        <EvalValueTag
          value={r.evaluation_value}
        />
      ),
    },
    {
      title: t('evaluation.columns.comment'),
      key: 'comment',
      width: 350,
      render: (_: unknown, r: EvaluationRecord) =>
        r.comment ? <Text style={{ fontSize: 12 }}>{r.comment}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: t('evaluation.columns.evaluatedAt'),
      key: 'evaluated_at',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, r: EvaluationRecord) => formatEvaluatedAt(r.evaluated_at),
    },
  ], []);

  if (loading) {
    return (
      <Flex justify="center" style={{ padding: 40 }}>
        <Spin tip={t('evaluation.loading')}>
          <div style={{ minHeight: 40 }} />
        </Spin>
      </Flex>
    );
  }

  return (
    <>
      <Space orientation="vertical" size={8} style={{ width: '100%' }}>

        {/* ── 階層別サマリーセクション（全体評価タブに移動済み・コメントアウト中） ── */}
        {/* <Card
          size="small"
          title={<Text style={{ fontSize: 13, fontWeight: 600 }}>📊 階層別サマリー</Text>}
          extra={
            summaryLoading
              ? <Spin size="small" />
              : <Button size="small" type="link" onClick={refetchSummary}>再取得</Button>
          }
          style={{ marginBottom: 4 }}
        >
          <EvaluationSummaryBar summaries={summary?.levels ?? []} />
        </Card> */}

        {/* ── 要注意項目セクション（全体評価タブに移動済み・コメントアウト中） ── */}
        {/* {summary && summary.attentionItems.length > 0 && (
          <Card
            size="small"
            title={<Text style={{ fontSize: 13, fontWeight: 600 }}>⚠️ 要注意項目</Text>}
            style={{ marginBottom: 4 }}
          >
            <AttentionItemList items={summary.attentionItems} />
          </Card>
        )} */}

        {/* <Divider style={{ margin: '4px 0' }} /> */}

        {/* ① 「評価を入力」ボタン（左端） */}
        <Flex justify="flex-start">
          <Button type="primary" icon={<EditOutlined />} size="small" disabled={!isEditable || isProjectCompleted || isCheckoutLocked || maimlHasErrors} onClick={() => setInputModalOpen(true)}>
            {t('evaluation.buttons.inputEvaluation')}
          </Button>
        </Flex>

        {/* ② 評価単位 + ④ 可変メソッド/タスクNo + ③ 不確かさ基準（1行） */}
        <Flex align="center" gap={16} wrap="wrap">
          {/* 評価単位 */}
          <Flex align="center" gap={6}>
            <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.evalUnit')}</Text>
            <Select
              size="small"
              style={{ width: 220 }}
              value={unitFilter}
              onChange={handleUnitFilterChange}
              options={RESULT_UNIT_OPTIONS}
            />
          </Flex>

          {/* メソッド選択（トランジション系のみ可変表示） */}
          {(unitFilter === SubEvaluationScopeValues.TRANSITION_METHOD || unitFilter === SubEvaluationScopeValues.TRANSITION_TASK) && (
            <Flex align="center" gap={6}>
              <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectMethod')}</Text>
              <Select
                allowClear size="small" placeholder={t('evaluation.placeholders.showAll')} style={{ width: 180 }}
                value={filterMethodId}
                onChange={(v) => handleFilterMethodChange(v ?? null)}
                options={transitionMethodOptions}
              />
            </Flex>
          )}

          {/* タスクNo選択（transition_taskのみ可変表示） */}
          {unitFilter === SubEvaluationScopeValues.TRANSITION_TASK && (
            <Flex align="center" gap={6}>
              <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.taskNo')}</Text>
              <Select
                allowClear size="small" placeholder={t('evaluation.placeholders.showAll')} style={{ width: 120 }}
                value={filterTaskNo}
                onChange={(v) => setFilterTaskNo(v ?? null)}
                options={transitionTaskNoOptions}
                disabled={!filterMethodId}
              />
            </Flex>
          )}

        </Flex>

        {/* ⑤ 評価結果なし */}
        {records.length === 0 && (
          <Empty description={t('evaluation.empty.noResults')} style={{ marginTop: 24 }} />
        )}

        {/* ⑤ 固定ヘッダー付き単一テーブル */}
        {records.length > 0 && (
          <>
            <style>{`
              .evaluation-result-table .ant-table-thead > tr > th {
                text-align: center !important;
              }
            `}</style>
            <div className="evaluation-result-table">
              <Table<EvaluationRecord>
                dataSource={filtered}
                rowKey={(r) => `${r.evaluation_unit}__${r.method_id ?? ''}__${r.task_no ?? ''}__${r.transition_id ?? ''}__${r.evaluation_scope}`}
                columns={resultColumns}
                size="small"
                pagination={false}
                bordered
                scroll={{ y: 'calc(100vh - 420px)' }}
                locale={{ emptyText: t('evaluation.empty.noMatchingResults') }}
              />
            </div>
          </>
        )}
      </Space>

      {/* 評価入力モーダル */}
      <InputModal
        open={inputModalOpen}
        projectId={projectId}
        allMethods={allMethods}
        reviewWaitingTasks={reviewWaitingTasks}
        onSaved={() => { setInputModalOpen(false); fetchRecords(); }}
        onClose={() => setInputModalOpen(false)}
      />
    </>
  );
};

export default EvaluationRegistrationTab;
