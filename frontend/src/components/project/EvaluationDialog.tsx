'use client';

/**
 * EvaluationDialog.tsx
 * 定性評価ダイアログ（1タブ構成）
 *
 * タブ: 評価登録確認（評価結果一覧 + 「評価を入力」ボタン）
 * ボタン押下 → InputModal（評価入力フォーム）が開く
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Select,
  Table,
  Input,
  Space,
  Typography,
  Flex,
  Button,
  Tag,
  Collapse,
  Empty,
  Spin,
  Radio,
  App,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getSubEvaluationsByProject,
  saveSubEvaluations,
} from '@/services/projectOverallEvaluationApiService';
import type {
  SubEvaluationRow as EvaluationRecord,
  SubEvaluationInput,
  SubEvaluationScope,
} from '@/types/projectOverallEvaluation';
import type { UncertaintyCriteriaForSelector } from './ApprovalWizardDialog';

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
export interface EvaluationDialogProps {
  open: boolean;
  projectId: string;
  /** 利用可能なメソッド一覧 */
  allMethods: Array<{ id: string; name: string }>;
  /** レビュー待ちタスク一覧 */
  reviewWaitingTasks: Array<{ methodId: string; methodName: string; taskNumber: number }>;
  /** 不確かさ基準リスト */
  criteriaList: UncertaintyCriteriaForSelector[];
  onCancel: () => void;
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

// ─────────────────────────────────────────────────────────────
// TODO:[MOCK] バックエンド実装時に削除 — 評価結果はAPIから取得する
// ─────────────────────────────────────────────────────────────
const MOCK_EVALUATION_RECORDS: EvaluationRecord[] = [
  {
    evaluation_id: 'mock-d-001', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'METHOD', evaluation_unit: 'METHOD',
    method_id: 'method_001', task_no: null, transition_id: null,
    overall_digital: '良好', overall_analog: '温度管理が適切に実施されている',
    evaluation_value: '良好', comment: '温度管理が適切に実施されている',
    evaluated_by: 'user-001', evaluated_at: '2026-07-15T08:30:00.000Z',
    create_user_id: 'user-001', create_at: '2026-07-15T08:30:00.000Z',
  },
  {
    evaluation_id: 'mock-d-002', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'METHOD', evaluation_unit: 'METHOD',
    method_id: 'method_002', task_no: null, transition_id: null,
    overall_digital: '要確認', overall_analog: '若干の変動あり。再評価推奨',
    evaluation_value: '要確認', comment: '若干の変動あり。再評価推奨',
    evaluated_by: 'user-001', evaluated_at: '2026-07-15T09:00:00.000Z',
    create_user_id: 'user-001', create_at: '2026-07-15T09:00:00.000Z',
  },
  {
    evaluation_id: 'mock-d-003', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'TASK', evaluation_unit: 'TASK',
    method_id: 'method_001', task_no: 1, transition_id: null,
    overall_digital: '良好', overall_analog: null,
    evaluation_value: '良好', comment: null,
    evaluated_by: 'user-002', evaluated_at: '2026-07-15T09:15:00.000Z',
    create_user_id: 'user-002', create_at: '2026-07-15T09:15:00.000Z',
  },
  {
    evaluation_id: 'mock-d-004', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'TASK', evaluation_unit: 'TASK',
    method_id: 'method_001', task_no: 2, transition_id: null,
    overall_digital: '不良', overall_analog: '測定値に誤差が見られる。要調査',
    evaluation_value: '不良', comment: '測定値に誤差が見られる。要調査',
    evaluated_by: 'user-002', evaluated_at: '2026-07-15T09:30:00.000Z',
    create_user_id: 'user-002', create_at: '2026-07-15T09:30:00.000Z',
  },
  {
    evaluation_id: 'mock-d-005', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'TRANSITION_METHOD', evaluation_unit: 'TRANSITION_METHOD',
    method_id: 'method_001', task_no: null, transition_id: 'T001_加熱処理',
    overall_digital: '良好', overall_analog: null,
    evaluation_value: '良好', comment: null,
    evaluated_by: 'user-001', evaluated_at: '2026-07-15T10:00:00.000Z',
    create_user_id: 'user-001', create_at: '2026-07-15T10:00:00.000Z',
  },
  {
    evaluation_id: 'mock-d-006', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'TRANSITION_TASK', evaluation_unit: 'TRANSITION_TASK',
    method_id: 'method_001', task_no: 1, transition_id: 'T002_冷却処理',
    overall_digital: '良好', overall_analog: null,
    evaluation_value: '良好', comment: null,
    evaluated_by: 'user-001', evaluated_at: '2026-07-15T10:30:00.000Z',
    create_user_id: 'user-001', create_at: '2026-07-15T10:30:00.000Z',
  },
  {
    evaluation_id: 'mock-d-007', organization_id: 'org-001', project_id: 'proj-001',
    evaluation_scope: 'TRANSITION_TASK', evaluation_unit: 'TRANSITION_TASK',
    method_id: 'method_001', task_no: 2, transition_id: 'T003_引張試験',
    overall_digital: '要確認', overall_analog: '引張速度に若干のばらつきあり',
    evaluation_value: '要確認', comment: '引張速度に若干のばらつきあり',
    evaluated_by: 'user-002', evaluated_at: '2026-07-15T11:00:00.000Z',
    create_user_id: 'user-002', create_at: '2026-07-15T11:00:00.000Z',
  },
];

const EVALUATION_UNIT_INPUT_VALUES: SubEvaluationScope[] = [
  'METHOD',
  'TASK',
  'TRANSITION_METHOD',
  'TRANSITION_TASK',
];

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

function buildEvalRows(
  unit: SubEvaluationScope,
  allMethods: Array<{ id: string; name: string }>,
  reviewWaitingTasks: Array<{ methodId: string; methodName: string; taskNumber: number }>,
  selectedMethodForTr: string | null,
  selectedTaskNoForTr: number | null
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
          rows.push({
            rowKey: key,
            label: `#${t.taskNumber} (${t.methodId})`,
            methodId: t.methodId,
            taskNo: t.taskNumber,
            evaluationValue: undefined,
            comment: '',
          });
        }
      }
      return rows;
    }

    case 'TRANSITION_METHOD':
      if (!selectedMethodForTr) return [];
      // [MOCK] MAIML パース統合後は実データ（API）から取得予定
      return MOCK_TRANSITION_NAMES.map((trName) => ({
        rowKey:          `tr__${selectedMethodForTr}__${trName}`,
        label:           trName,
        methodId:        selectedMethodForTr,
        transitionId:    trName,
        evaluationValue: undefined,
        comment:         '',
      }));

    case 'TRANSITION_TASK':
      // メソッド AND タスクNo の両方が揃ってからトランジション一覧を返す
      if (!selectedMethodForTr || selectedTaskNoForTr === null) return [];
      // [MOCK] MAIML パース統合後は実データ（API）から取得予定
      return MOCK_TRANSITION_NAMES.map((trName) => ({
        rowKey:          `tr__${selectedMethodForTr}__${selectedTaskNoForTr}__${trName}`,
        label:           trName,
        methodId:        selectedMethodForTr,
        taskNo:          selectedTaskNoForTr,
        transitionId:    trName,
        evaluationValue: undefined,
        comment:         '',
      }));

    default:
      return [];
  }
}

/** 評価レコードの評価値を色付きTagで表示するヘルパー */
function EvalValueTag({
  value,
  criteria,
  notEvaluatedLabel,
}: {
  value: string | null | undefined;
  criteria: UncertaintyCriteriaForSelector | null;
  notEvaluatedLabel: string;
}) {
  if (!value) {
    return <Text type="secondary" italic style={{ fontSize: 12 }}>─ {notEvaluatedLabel}</Text>;
  }
  const opt = criteria?.intuitionOptions.find((o) => o.value === value);
  const color = opt?.displayColor ?? undefined;
  return (
    <Tag
      style={{
        fontSize: 11,
        background: color ?? undefined,
        borderColor: color ? 'transparent' : undefined,
        color: color ? '#fff' : undefined,
      }}
    >
      {value}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────────
// InputModal: 評価入力モーダル（ResultPanel 内から開く）
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
  open,
  projectId,
  allMethods,
  reviewWaitingTasks,
  criteriaList,
  onSaved,
  onClose,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const [evalUnit, setEvalUnit]               = useState<SubEvaluationScope>('METHOD');
  const [selectedCriteriaKey, setSelectedCriteriaKey] = useState<string | null>(null);
  const [selectedMethodForTr, setSelectedMethodForTr] = useState<string | null>(null);
  const [selectedTaskNoForTr, setSelectedTaskNoForTr] = useState<number | null>(null);
  const [evalRows, setEvalRows]               = useState<EvalRow[]>([]);
  const [submitting, setSubmitting]           = useState(false);

  const selectedCriteria = useMemo(
    () => criteriaList.find((c) => c.uncertaintyKey === selectedCriteriaKey) ?? null,
    [criteriaList, selectedCriteriaKey]
  );

  /** 評価単位変更時: メソッド・タスクNoをリセット */
  const handleEvalUnitChange = (unit: SubEvaluationScope) => {
    setEvalUnit(unit);
    setSelectedMethodForTr(null);
    setSelectedTaskNoForTr(null);
  };

  /** メソッド変更時: タスクNoをリセット */
  const handleMethodChange = (methodId: string | null) => {
    setSelectedMethodForTr(methodId);
    setSelectedTaskNoForTr(null);
  };

  /** transition_task 用: 選択メソッドに紐づくタスクNo一覧 */
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

  // 評価単位・メソッド・タスクNo 変更時に行を再構築
  useEffect(() => {
    const rows = buildEvalRows(evalUnit, allMethods, reviewWaitingTasks, selectedMethodForTr, selectedTaskNoForTr);
    setEvalRows(rows);
  }, [evalUnit, allMethods, reviewWaitingTasks, selectedMethodForTr, selectedTaskNoForTr]);

  /** モーダルを閉じるときに状態をリセット */
  const handleClose = () => {
    setEvalUnit('METHOD');
    setSelectedCriteriaKey(null);
    setSelectedMethodForTr(null);
    setSelectedTaskNoForTr(null);
    onClose();
  };

  const updateEvalRow = (rowKey: string, field: 'evaluationValue' | 'comment', value: string) => {
    setEvalRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = async () => {
    if (!selectedCriteria) {
      message.warning(t('evaluation.messages.selectCriteriaFirst'));
      return;
    }
    const evaluations: SubEvaluationInput[] = evalRows
      .filter((r) => r.evaluationValue)
      .map((r) => ({
        evaluationScope:  evalUnit as SubEvaluationScope,
        methodId:        r.methodId,
        taskNo:          r.taskNo,
        transitionId:    r.transitionId,
        evaluationValue: r.evaluationValue as '良好' | '要確認' | '不良',
        comment:         r.comment || undefined,
      }));

    if (evaluations.length === 0) {
      message.warning(t('evaluation.messages.noEvalValue'));
      return;
    }

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

  /** テーブルカラム定義 */
  const evalColumns: ColumnsType<EvalRow> = useMemo(() => {
    const labelTitle =
      evalUnit === 'METHOD' ? t('evaluation.columns.methodName')
      : evalUnit === 'TASK' ? t('evaluation.columns.taskLabel')
      : t('evaluation.columns.transitionLabel');

    return [
      {
        title: labelTitle,
        dataIndex: 'label',
        width: 200,
        render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
      },
      {
        title: t('evaluation.columns.qualEvaluation'),
        width: 180,
        render: (_: unknown, row: EvalRow) => (
          <Select
            allowClear
            placeholder={t('evaluation.placeholders.notEvaluated')}
            style={{ width: 160 }}
            size="small"
            value={row.evaluationValue}
            onChange={(v) => updateEvalRow(row.rowKey, 'evaluationValue', v ?? '')}
            options={
              selectedCriteria?.intuitionOptions.map((opt) => ({
                label: (
                  <span>
                    {opt.displayColor && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: opt.displayColor,
                          marginRight: 6,
                        }}
                      />
                    )}
                    {opt.label}
                  </span>
                ),
                value: opt.value,
              })) ?? []
            }
            disabled={!selectedCriteria}
          />
        ),
      },
      {
        title: t('evaluation.columns.comment'),
        render: (_: unknown, row: EvalRow) => (
          <Input
            size="small"
            placeholder={t('evaluation.placeholders.comment')}
            value={row.comment}
            onChange={(e) => updateEvalRow(row.rowKey, 'comment', e.target.value)}
            maxLength={200}
          />
        ),
      },
    ];
  }, [evalUnit, selectedCriteria, t]);

  return (
    <Modal
      title={t('evaluation.inputModal.title')}
      open={open}
      onCancel={handleClose}
      width={760}
      destroyOnClose
      footer={
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 11 }}>
            {t('evaluation.inputModal.footerNote')}
          </Text>
          <Space>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={!selectedCriteria}
              onClick={handleSave}
            >
              {t('evaluation.buttons.saveEvaluation')}
            </Button>
          </Space>
        </Flex>
      }
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {/* 評価単位 */}
        <Flex align="center" gap={8} wrap="wrap">
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.evalUnit')}</Text>
          <Radio.Group
            value={evalUnit}
            onChange={(e) => handleEvalUnitChange(e.target.value as SubEvaluationScope)}
            size="small"
          >
            {EVALUATION_UNIT_INPUT_VALUES.map((val) => (
              <Radio key={val} value={val}>
                {t(`evaluation.unit.${val === 'TRANSITION_METHOD' ? 'transitionMethod' : val === 'TRANSITION_TASK' ? 'transitionTask' : val.toLowerCase()}`)}
              </Radio>
            ))}
          </Radio.Group>
        </Flex>

        {/* トランジション系のメソッド選択（＋タスク別の場合はタスクNoを右隣に表示） */}
        {(evalUnit === 'TRANSITION_METHOD' || evalUnit === 'TRANSITION_TASK') && (
          <Flex align="center" gap={8} wrap="wrap">
            <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectMethod')}</Text>
            <Select
              style={{ width: 200 }}
              size="small"
              placeholder={t('evaluation.placeholders.selectMethod')}
              value={selectedMethodForTr}
              onChange={(v) => handleMethodChange(v ?? null)}
              options={allMethods.map((m) => ({ label: m.name || m.id, value: m.id }))}
            />
            {evalUnit === 'TRANSITION_TASK' && (
              <>
                <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectTaskNo')}</Text>
                <Select
                  style={{ width: 140 }}
                  size="small"
                  placeholder={t('evaluation.placeholders.selectTaskNo')}
                  value={selectedTaskNoForTr}
                  onChange={(v) => setSelectedTaskNoForTr(v ?? null)}
                  options={taskNoOptions}
                  disabled={!selectedMethodForTr}
                />
              </>
            )}
          </Flex>
        )}

        {/* 不確かさ基準 */}
        <Flex align="center" gap={8}>
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.criteria')}</Text>
          <Select
            style={{ width: 260 }}
            size="small"
            allowClear
            placeholder={t('evaluation.placeholders.selectCriteria')}
            value={selectedCriteriaKey}
            onChange={(v) => setSelectedCriteriaKey(v ?? null)}
            options={criteriaList
              .filter((c) => c.evaluationMethod === 2)
              .map((c) => ({
                label: `${c.uncertaintyKeyLabel} (V${c.version})`,
                value: c.uncertaintyKey,
              }))}
          />
          {selectedCriteria && <Tag color="green" style={{ fontSize: 11 }}>{t('evaluation.tagQualitative')}</Tag>}
        </Flex>

        {/* 評価テーブル */}
        <Table<EvalRow>
          dataSource={evalRows}
          columns={evalColumns}
          rowKey="rowKey"
          size="small"
          pagination={false}
          bordered
          scroll={{ y: 220 }}
          locale={{ emptyText: t('evaluation.empty.noTarget') }}
        />
      </Space>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// ResultPanel: 評価登録確認パネル（「評価を入力」ボタン付き）
// ─────────────────────────────────────────────────────────────

interface ResultPanelProps {
  projectId: string;
  criteriaList: UncertaintyCriteriaForSelector[];
  allMethods: Array<{ id: string; name: string }>;
  reviewWaitingTasks: Array<{ methodId: string; methodName: string; taskNumber: number }>;
  /** 外部からリフレッシュをトリガーするためのキー */
  refreshKey?: number;
}

/**
 * [MOCK] 不確かさキー → 表示名マッピング
 * criteriaList に該当キーが存在しない場合のフォールバック
 * API 実装完了後は削除予定
 */
const MOCK_CRITERIA_LABEL_MAP: Record<string, string> = {
  UC_TEMP_STABILITY: '温度安定性基準',
  UC_PRECISION:      '精度評価基準',
};

/** 評価単位フィルタ（結果確認タブ用、「すべて」付き） */
type ResultUnitFilter = 'all' | SubEvaluationScope;

const ResultPanel: React.FC<ResultPanelProps> = ({
  projectId,
  criteriaList,
  allMethods,
  reviewWaitingTasks,
  refreshKey,
}) => {
  const [records, setRecords]         = useState<EvaluationRecord[]>(MOCK_EVALUATION_RECORDS);
  const [loading, setLoading]         = useState(false);
  const [filterKey, setFilterKey]     = useState<string | null>(null);
  const [unitFilter, setUnitFilter]   = useState<ResultUnitFilter>('all');
  const [filterMethodId, setFilterMethodId] = useState<string | null>(null);
  const [filterTaskNo, setFilterTaskNo]     = useState<number | null>(null);

  // 「評価を入力」モーダルの開閉
  const [inputModalOpen, setInputModalOpen] = useState(false);

  const fetchRecords = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getSubEvaluationsByProject(projectId)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, refreshKey]);

  /** 評価単位変更時: メソッド・タスクNoフィルタをリセット */
  const handleUnitFilterChange = (unit: ResultUnitFilter) => {
    setUnitFilter(unit);
    setFilterMethodId(null);
    setFilterTaskNo(null);
  };

  /** メソッドフィルタ変更時: タスクNoフィルタをリセット */
  const handleFilterMethodChange = (methodId: string | null) => {
    setFilterMethodId(methodId);
    setFilterTaskNo(null);
  };

  /** transition 系レコードに含まれるメソッドID一覧（プルダウン用） */
  const transitionMethodOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const r of records) {
      if ((r.evaluation_unit === 'TRANSITION_METHOD' || r.evaluation_unit === 'TRANSITION_TASK')
        && r.method_id && !seen.has(r.method_id)) {
        seen.add(r.method_id);
        opts.push({ label: r.method_id, value: r.method_id });
      }
    }
    return opts;
  }, [records]);

  /** 選択メソッドに紐づくタスクNo一覧（transition_task 用） */
  const transitionTaskNoOptions = useMemo(() => {
    if (!filterMethodId) return [];
    const seen = new Set<number>();
    const opts: { label: string; value: number }[] = [];
    for (const r of records) {
      if (r.evaluation_unit === 'TRANSITION_TASK' && r.method_id === filterMethodId
        && r.task_no !== null && !seen.has(r.task_no)) {
        seen.add(r.task_no);
        opts.push({ label: `#${r.task_no}`, value: r.task_no });
      }
    }
    return opts.sort((a, b) => a.value - b.value);
  }, [records, filterMethodId]);

  /** フィルタ後レコード（評価単位 + 不確かさキー + メソッドID + タスクNoを適用） */
  const filtered = useMemo(() => {
    let result = records;
    if (unitFilter !== 'all') {
      result = result.filter((r) => r.evaluation_unit === unitFilter);
    }
    if (filterKey) {
      result = result.filter((r) => r.evaluation_scope === filterKey);
    }
    if (filterMethodId && (unitFilter === 'TRANSITION_METHOD' || unitFilter === 'TRANSITION_TASK')) {
      result = result.filter((r) => r.method_id === filterMethodId);
    }
    if (filterTaskNo !== null && unitFilter === 'TRANSITION_TASK') {
      result = result.filter((r) => r.task_no === filterTaskNo);
    }
    return result;
  }, [records, unitFilter, filterKey, filterMethodId, filterTaskNo]);

  /** 評価単位ごとにグループ化 */
  const grouped = useMemo(() => {
    const map: Partial<Record<SubEvaluationScope, EvaluationRecord[]>> = {};
    for (const r of filtered) {
      const unit = r.evaluation_unit as SubEvaluationScope;
      if (!map[unit]) map[unit] = [];
      map[unit]!.push(r);
    }
    return map;
  }, [filtered]);

  /** 全ユニークな不確かさキー（絞り込み用） */
  const usedKeys = useMemo(() => [...new Set(records.map((r) => r.evaluation_scope))], [records]);

  const getCriteria = useCallback(
    (key: string) => criteriaList.find((c) => c.uncertaintyKey === key) ?? null,
    [criteriaList]
  );

  const { t } = useLanguage();

  if (loading) {
    return (
      <Flex justify="center" style={{ padding: 40 }}>
        <Spin tip={t('evaluation.loading')} />
      </Flex>
    );
  }

  return (
    <>
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {/* 「評価を入力」ボタン（一覧上部） */}
        <Flex justify="flex-end">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => setInputModalOpen(true)}
          >
            {t('evaluation.buttons.inputEvaluation')}
          </Button>
        </Flex>

        {/* 評価単位ラジオ */}
        <Flex align="center" gap={8} wrap="wrap">
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('evaluation.labels.evalUnit')}</Text>
          <Radio.Group
            value={unitFilter}
            onChange={(e) => handleUnitFilterChange(e.target.value as ResultUnitFilter)}
            size="small"
          >
            {(['all', 'METHOD', 'TASK', 'TRANSITION_METHOD', 'TRANSITION_TASK'] as ResultUnitFilter[]).map((val) => (
              <Radio key={val} value={val}>
                {val === 'all'
                  ? t('evaluation.unitFilter.all')
                  : t(`evaluation.unitFilter.${val === 'TRANSITION_METHOD' ? 'transitionMethod' : val === 'TRANSITION_TASK' ? 'transitionTask' : val.toLowerCase()}`)}
              </Radio>
            ))}
          </Radio.Group>
        </Flex>

        {/* トランジション系: メソッド選択（＋タスク別の場合はタスクNoも表示） */}
        {(unitFilter === 'TRANSITION_METHOD' || unitFilter === 'TRANSITION_TASK') && (
          <Flex align="center" gap={8} wrap="wrap">
            <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectMethod')}</Text>
            <Select
              allowClear
              size="small"
              placeholder={t('evaluation.placeholders.showAll')}
              style={{ width: 200 }}
              value={filterMethodId}
              onChange={(v) => handleFilterMethodChange(v ?? null)}
              options={transitionMethodOptions}
            />
            {unitFilter === 'TRANSITION_TASK' && (
              <>
                <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.selectTaskNo')}</Text>
                <Select
                  allowClear
                  size="small"
                  placeholder={t('evaluation.placeholders.showAll')}
                  style={{ width: 140 }}
                  value={filterTaskNo}
                  onChange={(v) => setFilterTaskNo(v ?? null)}
                  options={transitionTaskNoOptions}
                  disabled={!filterMethodId}
                />
              </>
            )}
          </Flex>
        )}

        {/* 不確かさ基準 絞り込み */}
        <Flex align="center" gap={8}>
          <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{t('evaluation.labels.criteria')}</Text>
          <Select
            allowClear
            size="small"
            placeholder={t('evaluation.placeholders.showAll')}
            style={{ width: 240 }}
            value={filterKey}
            onChange={(v) => setFilterKey(v ?? null)}
            options={usedKeys.map((k) => {
              const c = getCriteria(k);
              return { label: c?.uncertaintyKeyLabel ?? MOCK_CRITERIA_LABEL_MAP[k] ?? k, value: k };
            })}
          />
        </Flex>

        {/* 評価結果なし */}
        {records.length === 0 && (
          <Empty description={t('evaluation.empty.noResult')} style={{ marginTop: 24 }} />
        )}

        {/* 評価単位ごとに Collapse 表示 */}
        {(Object.keys(grouped) as SubEvaluationScope[]).map((unit) => {
          const rows = grouped[unit] ?? [];
          return (
            <Collapse
              key={unit}
              size="small"
              defaultActiveKey={[unit]}
              items={[{
                key: unit,
                label: (
                  <Text strong style={{ fontSize: 12 }}>
                    {t(`evaluation.unitLabel.${unit === 'TRANSITION_METHOD' ? 'transitionMethod' : unit === 'TRANSITION_TASK' ? 'transitionTask' : unit.toLowerCase()}`)}（{rows.length}{t('common.countUnit')}）
                  </Text>
                ),
                children: (
                  <Table<EvaluationRecord>
                    dataSource={rows}
                    rowKey={(r) => `${r.evaluation_unit}__${r.method_id ?? ''}__${r.task_no ?? ''}__${r.transition_id ?? ''}__${r.evaluation_scope}`}
                    size="small"
                    pagination={false}
                    bordered={false}
                    columns={[
                      {
                        title: t('evaluation.columns.target'),
                        width: 200,
                        render: (_: unknown, r: EvaluationRecord) => {
                          if (unit === 'METHOD')  return <Text style={{ fontSize: 12 }}>{r.method_id ?? '—'}</Text>;
                          if (unit === 'TASK')    return <Text style={{ fontSize: 12 }}>{r.method_id ? `#${r.task_no} (${r.method_id})` : `#${r.task_no}`}</Text>;
                          if (unit === 'TRANSITION_METHOD') {
                            return (
                              <Text style={{ fontSize: 12 }}>
                                {r.transition_id ?? '—'}
                                {r.method_id && (
                                  <Text type="secondary" style={{ fontSize: 11 }}> ({r.method_id})</Text>
                                )}
                              </Text>
                            );
                          }
                          // transition_task
                          return (
                            <Text style={{ fontSize: 12 }}>
                              {r.transition_id ?? '—'}
                              {r.method_id && (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {` (${r.method_id} / #${r.task_no})`}
                                </Text>
                              )}
                            </Text>
                          );
                        },
                      },
                      {
                        title: t('evaluation.columns.criteriaName'),
                        width: 180,
                        render: (_: unknown, r: EvaluationRecord) => (
                          <Text style={{ fontSize: 12 }}>{r.evaluation_scope}</Text>
                        ),
                      },
                      {
                        title: t('evaluation.columns.evaluationValue'),
                        width: 120,
                        render: (_: unknown, r: EvaluationRecord) => (
                          <EvalValueTag
                            value={r.evaluation_value}
                            criteria={null}
                            notEvaluatedLabel={t('evaluation.placeholders.notEvaluated')}
                          />
                        ),
                      },
                      {
                        title: t('evaluation.columns.comment'),
                        render: (_: unknown, r: EvaluationRecord) =>
                          r.comment
                            ? <Text style={{ fontSize: 12 }}>{r.comment}</Text>
                            : <Text type="secondary">—</Text>,
                      },
                      {
                        title: t('evaluation.columns.evaluatedAt'),
                        width: 140,
                        render: (_: unknown, r: EvaluationRecord) => {
                          if (!r.evaluated_at) return <Text type="secondary">—</Text>;
                          const d = new Date(r.evaluated_at);
                          return (
                            <Text style={{ fontSize: 11 }}>
                              {`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
                            </Text>
                          );
                        },
                      },
                    ]}
                  />
                ),
              }]}
            />
          );
        })}
      </Space>

      {/* 評価入力モーダル */}
      <InputModal
        open={inputModalOpen}
        projectId={projectId}
        allMethods={allMethods}
        reviewWaitingTasks={reviewWaitingTasks}
        criteriaList={criteriaList}
        onSaved={() => {
          setInputModalOpen(false);
          fetchRecords();
        }}
        onClose={() => setInputModalOpen(false)}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────

const EvaluationDialog: React.FC<EvaluationDialogProps> = ({
  open,
  projectId,
  allMethods,
  reviewWaitingTasks,
  criteriaList,
  onCancel,
}) => {
  const { t } = useLanguage();
  // 保存後に ResultPanel をリフレッシュするためのキー
  const [refreshKey, setRefreshKey] = useState(0);

  // 開いた時にリフレッシュ
  useEffect(() => {
    if (open) {
      setRefreshKey((k) => k + 1);
    }
  }, [open]);

  return (
    <Modal
      title={t('evaluation.title')}
      open={open}
      onCancel={onCancel}
      width={900}
      destroyOnClose
      footer={
        <Flex justify="flex-end">
          <Button onClick={onCancel}>{t('common.close')}</Button>
        </Flex>
      }
    >
      <Tabs
        items={[
          {
            key: 'result',
            label: t('evaluation.tabLabel'),
            children: (
              <ResultPanel
                key={refreshKey}
                projectId={projectId}
                criteriaList={criteriaList}
                allMethods={allMethods}
                reviewWaitingTasks={reviewWaitingTasks}
                refreshKey={refreshKey}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default EvaluationDialog;
