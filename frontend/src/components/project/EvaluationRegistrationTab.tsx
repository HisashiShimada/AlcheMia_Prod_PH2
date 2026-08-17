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
  Divider,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getEvaluationsByProject,
  saveEvaluations,
} from '@/services/experimentEvaluationApiService';
import type {
  EvaluationUnit,
  EvaluationInput,
  ExperimentEvaluationRow as EvaluationRecord,
} from '@/services/experimentEvaluationApiService';
import type { UncertaintyCriteriaForSelector } from './ApprovalWizardDialog';
import { fetchUncertaintyCriteriaForSelector } from '@/services/uncertaintyCriteriaApiService';
import { getProjectMethods, getExperimentInstructions } from '@/services/experimentInstructionApiService';
import EvaluationSummaryBar from './subcomponents/EvaluationSummaryBar';
import AttentionItemList from './subcomponents/AttentionItemList';
import { useOverallEvaluation } from '@/hooks/project/useOverallEvaluation';

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
}

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

// TODO:[MOCK] バックエンド実装時に削除 — MAIML パース統合後はAPIからトランジション名を取得する
/**
 * トランジション名の一覧（モック）
 * MAIML パース統合後は実データ（API）へ置換予定
 */
const MOCK_TRANSITION_NAMES: string[] = [
  'T001_加熱処理',
  'T002_冷却処理',
  'T003_引張試験',
  'T004_硬さ試験',
  'T005_伸び測定',
  'T006_熱分析',
  'T007_破壊試験',
  'T008_熱膨張',
];

/**
 * [MOCK] 評価結果一覧初期データ
 * API 実装完了後は削除予定
 */
const MOCK_EVALUATION_RECORDS: EvaluationRecord[] = [
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'method', method_id: 'method_001', task_no: null, transition_id: null,
    name_space_id: 'ns-001', uncertainty_key: 'UC_TEMP_STABILITY', uc_version: 1,
    evaluation_value: '良好', comment: '温度管理が適切に実施されている',
    uncertainty_xml: null, evaluated_by: 'user-001', evaluated_at: '2026-07-15T08:30:00.000Z', display_color: '#52c41a',
  },
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'method', method_id: 'method_002', task_no: null, transition_id: null,
    name_space_id: 'ns-001', uncertainty_key: 'UC_TEMP_STABILITY', uc_version: 1,
    evaluation_value: '要確認', comment: '若干の変動あり。再評価推奨',
    uncertainty_xml: null, evaluated_by: 'user-001', evaluated_at: '2026-07-15T09:00:00.000Z', display_color: '#faad14',
  },
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'task', method_id: 'method_001', task_no: 1, transition_id: null,
    name_space_id: 'ns-002', uncertainty_key: 'UC_PRECISION', uc_version: 1,
    evaluation_value: '良好', comment: null,
    uncertainty_xml: null, evaluated_by: 'user-002', evaluated_at: '2026-07-15T09:15:00.000Z', display_color: '#52c41a',
  },
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'task', method_id: 'method_001', task_no: 2, transition_id: null,
    name_space_id: 'ns-002', uncertainty_key: 'UC_PRECISION', uc_version: 1,
    evaluation_value: '不良', comment: '測定値に誤差が見られる。要調査',
    uncertainty_xml: null, evaluated_by: 'user-002', evaluated_at: '2026-07-15T09:30:00.000Z', display_color: '#ff4d4f',
  },
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'transition_method', method_id: 'method_001', task_no: null, transition_id: 'T001_加熱処理',
    name_space_id: 'ns-001', uncertainty_key: 'UC_TEMP_STABILITY', uc_version: 1,
    evaluation_value: '良好', comment: null,
    uncertainty_xml: null, evaluated_by: 'user-001', evaluated_at: '2026-07-15T10:00:00.000Z', display_color: '#52c41a',
  },
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'transition_task', method_id: 'method_001', task_no: 1, transition_id: 'T002_冷却処理',
    name_space_id: 'ns-001', uncertainty_key: 'UC_TEMP_STABILITY', uc_version: 1,
    evaluation_value: '良好', comment: null,
    uncertainty_xml: null, evaluated_by: 'user-001', evaluated_at: '2026-07-15T10:30:00.000Z', display_color: '#52c41a',
  },
  {
    organization_id: 'org-001', project_id: 'proj-001',
    evaluation_unit: 'transition_task', method_id: 'method_001', task_no: 2, transition_id: 'T003_引張試験',
    name_space_id: 'ns-002', uncertainty_key: 'UC_PRECISION', uc_version: 1,
    evaluation_value: '要確認', comment: '引張速度に若干のばらつきあり',
    uncertainty_xml: null, evaluated_by: 'user-002', evaluated_at: '2026-07-15T11:00:00.000Z', display_color: '#faad14',
  },
];

type ResultUnitFilter = 'all' | EvaluationUnit;

/** [MOCK] 不確かさキー → 表示名フォールバック */
const MOCK_CRITERIA_LABEL_MAP: Record<string, string> = {
  UC_TEMP_STABILITY: '温度安定性基準',
  UC_PRECISION:      '精度評価基準',
};

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

function buildEvalRows(
  unit: EvaluationUnit,
  allMethods: Array<{ id: string; name: string }>,
  reviewWaitingTasks: Array<{ methodId: string; methodName: string; taskNumber: number }>,
  selectedMethodForTr: string | null,
  selectedTaskNoForTr: number | null,
  projectLabel: string,
): EvalRow[] {
  switch (unit) {
    case 'project':
      return [{ rowKey: 'project', label: projectLabel, evaluationValue: undefined, comment: '' }];
    case 'method':
      return allMethods.map((m) => ({
        rowKey: `method__${m.id}`,
        label: m.name || m.id,
        methodId: m.id,
        evaluationValue: undefined,
        comment: '',
      }));
    case 'task': {
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
    case 'transition_method':
      if (!selectedMethodForTr) return [];
      return MOCK_TRANSITION_NAMES.map((trName) => ({
        rowKey: `tr__${selectedMethodForTr}__${trName}`,
        label: trName,
        methodId: selectedMethodForTr,
        transitionId: trName,
        evaluationValue: undefined,
        comment: '',
      }));
    case 'transition_task':
      if (!selectedMethodForTr || selectedTaskNoForTr === null) return [];
      return MOCK_TRANSITION_NAMES.map((trName) => ({
        rowKey: `tr__${selectedMethodForTr}__${selectedTaskNoForTr}__${trName}`,
        label: trName,
        methodId: selectedMethodForTr,
        taskNo: selectedTaskNoForTr,
        transitionId: trName,
        evaluationValue: undefined,
        comment: '',
      }));
    default:
      return [];
  }
}

/** 評価値を色付き Tag で表示 */
function EvalValueTag({
  value,
  criteria,
  displayColor,
}: {
  value: string | null | undefined;
  criteria: UncertaintyCriteriaForSelector | null;
  displayColor?: string | null;
}) {
  const { t } = useLanguage();
  if (!value) return <Text type="secondary" italic style={{ fontSize: 12 }}>{t('evaluation.placeholders.notEvaluated')}</Text>;
  // displayColor（レコード直接値）を優先し、なければ criteria から検索
  const opt = criteria?.intuitionOptions.find((o) => o.value === value);
  const color = displayColor ?? opt?.displayColor ?? undefined;
  return (
    <Tag
      style={{
        fontSize: 11,
        background: color ?? undefined,
        borderColor: color ? 'transparent' : undefined,
        color: color ? '#fff' : undefined,
        fontWeight: color ? 600 : undefined,
      }}
    >
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
  criteriaList: UncertaintyCriteriaForSelector[];
  onSaved: () => void;
  onClose: () => void;
}

const InputModal: React.FC<InputModalProps> = ({
  open, projectId, allMethods, reviewWaitingTasks, criteriaList, onSaved, onClose,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const EVALUATION_UNIT_OPTIONS_INPUT: Array<{ label: string; value: EvaluationUnit }> = [
    { label: t('evaluation.unitLabel.method'),            value: 'method'           },
    { label: t('evaluation.unitLabel.task'),              value: 'task'             },
    { label: t('evaluation.unitLabel.transitionMethod'),  value: 'transition_method' },
    { label: t('evaluation.unitLabel.transitionTask'),    value: 'transition_task'  },
  ];

  const [evalUnit, setEvalUnit]                         = useState<EvaluationUnit>('method');
  const [selectedCriteriaKey, setSelectedCriteriaKey]   = useState<string | null>(null);
  const [selectedMethodForTr, setSelectedMethodForTr]   = useState<string | null>(null);
  const [selectedTaskNoForTr, setSelectedTaskNoForTr]   = useState<number | null>(null);
  const [evalRows, setEvalRows]                         = useState<EvalRow[]>([]);
  const [submitting, setSubmitting]                     = useState(false);

  const selectedCriteria = useMemo(
    () => criteriaList.find((c) => c.uncertaintyKey === selectedCriteriaKey) ?? null,
    [criteriaList, selectedCriteriaKey],
  );

  const handleEvalUnitChange = (unit: EvaluationUnit) => {
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
    setEvalUnit('method');
    setSelectedCriteriaKey(null);
    setSelectedMethodForTr(null);
    setSelectedTaskNoForTr(null);
    onClose();
  };

  const updateEvalRow = (rowKey: string, field: 'evaluationValue' | 'comment', value: string) => {
    setEvalRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    if (!selectedCriteria) { message.warning(t('evaluation.messages.selectCriteriaFirst')); return; }
    const evaluations: EvaluationInput[] = evalRows
      .filter((r) => r.evaluationValue)
      .map((r) => ({
        evaluationUnit:  evalUnit,
        methodId:        r.methodId,
        taskNo:          r.taskNo,
        transitionId:    r.transitionId,
        nameSpaceId:     selectedCriteria.nameSpaceId,
        uncertaintyKey:  selectedCriteria.uncertaintyKey,
        ucVersion:       selectedCriteria.version,
        evaluationValue: r.evaluationValue!,
        comment:         r.comment || undefined,
      }));
    if (evaluations.length === 0) { message.warning(t('evaluation.messages.noEvalValue')); return; }

    setSubmitting(true);
    try {
      await saveEvaluations({ projectId, evaluations });
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
      evalUnit === 'project' ? t('evaluation.columns.projectName')
      : evalUnit === 'method' ? t('evaluation.columns.methodName')
      : evalUnit === 'task' ? t('evaluation.columns.taskLabel')
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
            options={selectedCriteria?.intuitionOptions.map((opt) => ({
              label: (
                <span>
                  {opt.displayColor && (
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: opt.displayColor, marginRight: 6 }} />
                  )}
                  {opt.label}
                </span>
              ),
              value: opt.value,
            })) ?? []}
            disabled={!selectedCriteria}
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
  }, [evalUnit, selectedCriteria]);

  return (
    <Modal
      title={t('evaluation.inputModal.title')}
      open={open}
      onCancel={handleClose}
      width={760}
      destroyOnClose
      footer={
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 11 }}>{t('evaluation.inputModal.footerNote')}</Text>
          <Space>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="primary" loading={submitting} disabled={!selectedCriteria} onClick={handleSave}>{t('evaluation.buttons.saveEvaluation')}</Button>
          </Space>
        </Flex>
      }
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* 評価単位 */}
        <Flex align="center" gap={8} wrap="wrap">
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.evalUnit')}</Text>
          <Radio.Group value={evalUnit} onChange={(e) => handleEvalUnitChange(e.target.value as EvaluationUnit)} size="small">
            {EVALUATION_UNIT_OPTIONS_INPUT.map((opt) => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        </Flex>

        {/* トランジション系: メソッド選択 */}
        {(evalUnit === 'transition_method' || evalUnit === 'transition_task') && (
          <Flex align="center" gap={8} wrap="wrap">
            <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectMethod')}</Text>
            <Select style={{ width: 200 }} size="small" placeholder={t('evaluation.placeholders.selectMethod')}
              value={selectedMethodForTr}
              onChange={(v) => handleMethodChange(v ?? null)}
              options={allMethods.map((m) => ({ label: m.name || m.id, value: m.id }))} />
            {evalUnit === 'transition_task' && (
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

        {/* 不確かさ基準 */}
        <Flex align="center" gap={8}>
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.criteria')}</Text>
          <Select style={{ width: 260 }} size="small" allowClear placeholder={t('evaluation.placeholders.selectCriteria')}
            value={selectedCriteriaKey}
            onChange={(v) => setSelectedCriteriaKey(v ?? null)}
            options={criteriaList.filter((c) => c.evaluationMethod === 2).map((c) => ({
              label: `${c.uncertaintyKeyLabel} (V${c.version})`, value: c.uncertaintyKey,
            }))} />
          {selectedCriteria && <Tag color="green" style={{ fontSize: 11 }}>{t('evaluation.tagQualitative')}</Tag>}
        </Flex>

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
}) => {
  const { t } = useLanguage();

  // 階層別サマリー・要注意項目（動的算出）
  const { summary, isLoading: summaryLoading, refetch: refetchSummary } = useOverallEvaluation(projectId);

  const UNIT_LABEL: Record<EvaluationUnit, string> = {
    project:           t('evaluation.unitLabel.project'),
    method:            t('evaluation.unitLabel.method'),
    task:              t('evaluation.unitLabel.task'),
    transition_method: t('evaluation.unitLabel.transitionMethod'),
    transition_task:   t('evaluation.unitLabel.transitionTask'),
  };

  const RESULT_UNIT_OPTIONS: Array<{ label: string; value: ResultUnitFilter }> = [
    { label: t('evaluation.unitLabel.all'),               value: 'all'              },
    { label: t('evaluation.unitLabel.method'),            value: 'method'           },
    { label: t('evaluation.unitLabel.task'),              value: 'task'             },
    { label: t('evaluation.unitLabel.transitionMethod'),  value: 'transition_method' },
    { label: t('evaluation.unitLabel.transitionTask'),    value: 'transition_task'  },
  ];

  const [criteriaList, setCriteriaList]     = useState<UncertaintyCriteriaForSelector[]>([]);
  const [allMethods, setAllMethods]         = useState<Array<{ id: string; name: string }>>([]);
  const [reviewWaitingTasks, setReviewWaitingTasks] = useState<Array<{ methodId: string; methodName: string; taskNumber: number }>>([]);
  const [records, setRecords]               = useState<EvaluationRecord[]>(MOCK_EVALUATION_RECORDS);
  const [loading, setLoading]               = useState(false);
  const [filterKey, setFilterKey]           = useState<string | null>(null);
  const [unitFilter, setUnitFilter]         = useState<ResultUnitFilter>('all');
  const [filterMethodId, setFilterMethodId] = useState<string | null>(null);
  const [filterTaskNo, setFilterTaskNo]     = useState<number | null>(null);
  const [inputModalOpen, setInputModalOpen] = useState(false);

  const fetchRecords = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getEvaluationsByProject(projectId)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // 不確かさ基準・メソッド・レビュー待ちタスクを取得
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetchUncertaintyCriteriaForSelector().catch(() => []),
      getProjectMethods(projectId).catch(() => []),
      getExperimentInstructions(projectId).catch(() => []),
    ]).then(([criteriaData, methodData, instData]) => {
      setCriteriaList(
        criteriaData.map((c) => ({
          uncertaintyKey:      c.key,
          nameSpaceId:         c.scopeLabel,
          version:             1,
          uncertaintyKeyLabel: c.name || c.key,
          evaluationMethod:    c.evalType === 'quantitative' ? 1 : 2,
          intuitionOptions:    c.qualitativeOptions.map((opt) => ({
            value:        opt.selectorValue,
            label:        opt.selectorValue,
            displayColor: opt.displayColor ?? null,
            sortOrder:    opt.displayOrder,
          })),
        }))
      );
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
      if ((r.evaluation_unit === 'transition_method' || r.evaluation_unit === 'transition_task') && r.method_id && !seen.has(r.method_id)) {
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
      if (r.evaluation_unit === 'transition_task' && r.method_id === filterMethodId && r.task_no !== null && !seen.has(r.task_no)) {
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
    if (filterKey)            result = result.filter((r) => r.uncertainty_key === filterKey);
    if (filterMethodId && (unitFilter === 'transition_method' || unitFilter === 'transition_task'))
      result = result.filter((r) => r.method_id === filterMethodId);
    if (filterTaskNo !== null && unitFilter === 'transition_task')
      result = result.filter((r) => r.task_no === filterTaskNo);
    return result;
  }, [records, unitFilter, filterKey, filterMethodId, filterTaskNo]);

  const usedKeys = useMemo(() => [...new Set(records.map((r) => r.uncertainty_key))], [records]);

  const getCriteria = useCallback(
    (key: string) => criteriaList.find((c) => c.uncertaintyKey === key) ?? null,
    [criteriaList],
  );

  // ─── 一覧テーブルの列定義（固定ヘッダー付き単一テーブル）
  const resultColumns: ColumnsType<EvaluationRecord> = useMemo(() => [
    {
      title: t('evaluation.columns.evalUnit'),
      key: 'evaluation_unit',
      width: 200,
      render: (_: unknown, r: EvaluationRecord) => (
        <Text style={{ fontSize: 12 }}>{UNIT_LABEL[r.evaluation_unit as EvaluationUnit] ?? r.evaluation_unit}</Text>
      ),
    },
    {
      title: t('evaluation.columns.target'),
      key: 'target',
      width: 250,
      render: (_: unknown, r: EvaluationRecord) => {
        const unit = r.evaluation_unit as EvaluationUnit;
        if (unit === 'project')
          return <Text style={{ fontSize: 12 }}>{t('evaluation.unitLabel.project')}</Text>;
        if (unit === 'method')
          return <Text style={{ fontSize: 12 }}>{r.method_id ?? '—'}</Text>;
        if (unit === 'task')
          return <Text style={{ fontSize: 12 }}>{r.method_id ? `#${r.task_no} (${r.method_id})` : `#${r.task_no}`}</Text>;
        if (unit === 'transition_method')
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
      title: t('evaluation.columns.criteriaName'),
      key: 'uncertainty_key',
      width: 280,
      render: (_: unknown, r: EvaluationRecord) => {
        const c = getCriteria(r.uncertainty_key);
        return <Text style={{ fontSize: 12 }}>{c?.uncertaintyKeyLabel ?? MOCK_CRITERIA_LABEL_MAP[r.uncertainty_key] ?? r.uncertainty_key}</Text>;
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
          criteria={getCriteria(r.uncertainty_key)}
          displayColor={r.display_color}
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
  ], [getCriteria]);

  if (loading) {
    return (
      <Flex justify="center" style={{ padding: 40 }}>
        <Spin tip={t('evaluation.loading')} />
      </Flex>
    );
  }

  return (
    <>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>

        {/* ── 階層別サマリーセクション（新規追加） ── */}
        <Card
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
        </Card>

        {/* ── 要注意項目セクション（新規追加） ── */}
        {summary && summary.attentionItems.length > 0 && (
          <Card
            size="small"
            title={<Text style={{ fontSize: 13, fontWeight: 600 }}>⚠️ 要注意項目</Text>}
            style={{ marginBottom: 4 }}
          >
            <AttentionItemList items={summary.attentionItems} />
          </Card>
        )}

        <Divider style={{ margin: '4px 0' }} />

        {/* ① 「評価を入力」ボタン（左端） */}
        <Flex justify="flex-start">
          <Button type="primary" icon={<EditOutlined />} size="small" disabled={!isEditable || isProjectCompleted || isCheckoutLocked} onClick={() => setInputModalOpen(true)}>
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
          {(unitFilter === 'transition_method' || unitFilter === 'transition_task') && (
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
          {unitFilter === 'transition_task' && (
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

          {/* 不確かさ基準 */}
          <Flex align="center" gap={6}>
            <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.criteria')}</Text>
            <Select
              allowClear
              size="small"
              placeholder={t('evaluation.placeholders.showAll')}
              style={{ width: 220 }}
              value={filterKey}
              onChange={(v) => setFilterKey(v ?? null)}
              options={usedKeys.map((k) => {
                const c = getCriteria(k);
                return { label: c?.uncertaintyKeyLabel ?? MOCK_CRITERIA_LABEL_MAP[k] ?? k, value: k };
              })}
            />
          </Flex>
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
                rowKey={(r) => `${r.evaluation_unit}__${r.method_id ?? ''}__${r.task_no ?? ''}__${r.transition_id ?? ''}__${r.uncertainty_key}`}
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
        criteriaList={criteriaList}
        onSaved={() => { setInputModalOpen(false); fetchRecords(); refetchSummary(); }}
        onClose={() => setInputModalOpen(false)}
      />
    </>
  );
};

export default EvaluationRegistrationTab;
