'use client';

/**
 * 作業記録パネル
 *
 * PlanB / PropertyCard / WorkHeader / InstructionCollapse による実験作業記録パネル。
 * API データを使用してテンプレート・プロパティを表示・保存する。
 *
 * 【実績値入力フロー】
 * 実績値入力 →「保存して次へ」→ 次テンプレート実績値入力 or 次トランジション
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Flex,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { BorderOutlined, CaretRightOutlined, CommentOutlined, DeleteOutlined, EditOutlined, FileSearchOutlined, PlusOutlined, RightOutlined, SaveOutlined, SearchOutlined, StepForwardOutlined, WarningOutlined } from '@ant-design/icons';
import ExperimentCommentDialog from './ExperimentCommentDialog';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import InsertionEditorCompact from '@/components/common/InsertionEditorCompact';
import ContentGridEditor from '@/components/common/ContentGridEditor';
import dayjs from 'dayjs';
import { getProjectMaiml, saveTransitionComment, getTransitionStateRecords } from '@/services/projectApiService';
import { getPlanDialogData, getExperimentPlans } from '@/services/experimentPlanApiService';
import type { RefOption } from '@/types/experimentPlanDialog';
import { getTemplateData, saveBatchExperimentData } from '@/services/experimentDataApiService';
import { fetchUncertaintyCriteriaForSelector } from '@/services/uncertaintyCriteriaApiService';
import type { Insertion } from '@/types/maiml-unified';
import type { FileData } from '@/types/editor';
import type { TemplateDataItem, ExperimentDataRecord } from '@/types/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProgressRow } from '@/types/progress';
import type { Instruction, ProjectStatus, Transition } from '@/types/experimentWorker';
import { INSTRUCTION_KEY_LABELS } from '@/types/instructionRegistration';
import { ProjectStatus as ProjectStatusConst, TaskStatus as TaskStatusConst } from '@/constants/codeMaster';
import { correctRecord } from '@/services/experimentInstructionApiService';
import { isNumericXsiType, isIntegerXsiType } from '@/utils/xsiTypeValidator';

const { Sider, Content } = Layout;

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 不確かさ基準（API から取得した定量評価・有効なものを選択肢として生成）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 「値の追加」ボタンで追加された不確かさ評価行の型
 */
interface AddedUncertaintyValue {
  /** 行を一意に識別するID */
  id: string;
  /** 選択された不確かさ基準の key（空文字は未選択） */
  uncertaintyKey: string;
  /** 入力された値 */
  value: string;
}

/**
 * PropertyCard が親に通知する不確かさ入力値の型
 */
interface UncertaintyValueEntry {
  /** プロパティKey */
  propKey: string;
  /** 不確かさ基準Key */
  uncertaintyKey: string;
  /** 入力値 */
  value: string;
}

/**
 * 「値の追加」ボタンで使用する不確かさ基準の選択肢。
 * WorkRecordPanel の useEffect で API から取得した内容を反映する。
 * モジュールスコープで管理し PropertyCard から参照する。
 */
let uncertaintyOptionsCache: { value: string; label: string }[] = [];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type TransitionStatus = 'not_started' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

/**
 * トランジションステータスごとに、状態プルダウンで選択可能な「次の状態」を定義する。
 * 現在のステータス自身は常に表示（選択中）するため、ここには含めない。
 *
 * 仕様:
 *   2: 準備状態    → ready, running が遷移先として表示
 *   3: 準備完了状態 → running のみ表示
 *   4: 動作状態    → paused, completed, error が表示
 *   5: 休止状態    → running のみ表示
 *   6: 終状態      → 遷移先なし（現在値のみ）
 *   7: 異常終了状態 → 遷移先なし（現在値のみ）
 *   1: 初期状態    → 全表示（要件未定義のため現状維持）
 */
const ALLOWED_NEXT_STATUSES: Record<TransitionStatus, TransitionStatus[]> = {
  not_started: ['preparing', 'ready', 'running', 'paused', 'completed', 'error'],
  preparing:   ['ready', 'running'],
  ready:       ['running'],
  running:     ['paused', 'completed', 'error'],
  paused:      ['running'],
  completed:   [],
  error:       [],
};

/**
 * プロパティに紐づく1件の定量評価情報（許容値・説明の表示用）。
 * Phase 3 でバックエンドが toleranceValues[] を返すようになったら
 * convertRawProperty でマッピングする。
 */
interface QuantitativeUncertaintyInfo {
  /** 不確かさ基準Key */
  uncertaintyKey: string;
  /** 不確かさ基準名（表示ラベル用） */
  uncertaintyName?: string;
  /** 許容値（toleranceValue 相当） */
  toleranceValue?: string | number;
  /** 説明（uncertaintyNote 相当） */
  description?: string;
  /**
   * 作業者が入力した定量評価記録値（experiment_uncertainty_judge.recorded_value）。
   * getTemplateData API 経由で付与される。未保存の場合は null/undefined。
   */
  recordedValue?: number | null;
}

interface WorkProperty {
  key: string;
  label: string;
  xsiType: 'FloatValue' | 'IntegerValue' | 'StringValue';
  unit: string;
  expected: number | string | null;
  /**
   * 不確かさ基準名（1件・後方互換用）。
   * quantitativeUncertainties が未設定の場合にのみ使用する。
   */
  uncertaintyName?: string;
  /**
   * 不確かさ値（1件・後方互換用）。
   * quantitativeUncertainties が未設定の場合にのみ使用する。
   */
  uncertaintyValue?: number | string;
  /**
   * 不確かさ説明（1件・後方互換用）。
   * quantitativeUncertainties が未設定の場合にのみ使用する。
   */
  uncertaintyDescription?: string;
  /**
   * 複数の定量評価情報（許容値・説明）。
   * 設定されている場合は後方互換フィールドより優先して各入力行と対応付けて表示する。
   * Phase 3 でバックエンドが toleranceValues[] を返したら convertRawProperty でここに入れる。
   */
  quantitativeUncertainties?: QuantitativeUncertaintyInfo[];
  /** 定性評価の初期値。未指定時は null（未選択） */
  defaultConfidence?: string;
  /** 定性評価のボタン選択肢。未指定時は ['確か', '曖昧', '不確か'] */
  confidenceOptions?: string[];
  /**
   * 定性評価のボタン選択肢（色情報付き）。
   * バックエンドの intuition_selector.display_color を反映。
   * 設定時は confidenceOptions より優先してボタン色に使用する。
   */
  confidenceOptionsWithColor?: Array<{ value: string; color: string }>;
  /** MAIMLの uncertainty[].description（実験管理者が設定した定性評価説明） */
  description?: string;
  /** template_data.property_set の uncertainty[].description（実験作業者が入力した定性評価理由） */
  qualitativeReason?: string;
}

/** Insertion スロット（テンプレートに紐づくファイル添付欄） */
interface WorkInsertionSlot {
  id: string;
  label?: string;
}

interface WorkTemplate {
  id: string;
  name: string;
  category: 'Conditions' | 'Materials' | 'Results';
  properties: WorkProperty[];
  /** このテンプレートで収集するInsertionスロット一覧。存在する場合のみ表示 */
  insertions?: WorkInsertionSlot[];
}

interface WorkTransition {
  id: string;
  order: number;
  /**
   * 前提となるトランジションIDの配列。
   * これらが全て completed になるまでこのトランジションは開始不可。
   * 空配列の場合は依存なし（いつでも開始可能）。
   *
   * @example [] // 依存なし
   * @example ['TR_A', 'TR_B'] // TR_A と TR_B 両方完了後のみ開始可能
   */
  prerequisiteTransitionIds: string[];
  methodId: string;
  templates: WorkTemplate[];
}

interface WorkMethod {
  id: string;
  order: number;
}

/** actuals に格納できる値の型（通常プロパティ値 or Insertionオブジェクト or DataGrid） */
type ActualValue = number | string | null | Insertion | number[][];

interface TaskTransitionState {
  transitionId: string;
  status: TransitionStatus;
  actuals: Record<string, ActualValue>;
  /** ユーザーが「+ Insertion追加」で追加したカスタムInsertionのID一覧 */
  customInsertionIds: string[];
  /** ユーザーが「+ Content追加」で追加したカスタムContentのID一覧 */
  customContentIds: string[];
  /** ユーザーが「+ プロパティを追加」で追加したカスタムPropertyのID一覧 */
  customPropertyIds: string[];
}

export interface WorkTask {
  taskNo: number;
  transitions: TaskTransitionState[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// STATUS_CONFIG はコンポーネント内で t() を使うため削除し、useMemo で再生成する
const STATUS_COLORS: Record<TransitionStatus, string> = {
  not_started: 'default',
  preparing:   'warning',
  ready:       'cyan',
  running:     'processing',
  paused:      'gold',
  completed:   'success',
  error:       'error',
};

const CATEGORY_COLOR: Record<string, string> = {
  Conditions: 'blue',
  Materials:  'green',
  Results:    'purple',
};

const XSI_SHORT: Record<string, string> = {
  FloatValue: 'Float', IntegerValue: 'Int', StringValue: 'Str',
};

const XSI_COLOR: Record<string, string> = {
  FloatValue: 'geekblue', IntegerValue: 'purple', StringValue: 'cyan',
};

function calcDiff(expected: number | string | null, actual: number | string | null): React.ReactNode {
  if (typeof expected !== 'number' || typeof actual !== 'number') return null;
  const diff = actual - expected;
  const s = parseFloat(diff.toFixed(4)).toString();
  if (diff === 0) return <Text type="secondary" style={{ fontSize: 11 }}>±0</Text>;
  if (diff > 0) return <Text style={{ color: '#cf1322', fontSize: 11 }}>+{s}</Text>;
  return <Text style={{ color: '#096dd9', fontSize: 11 }}>{s}</Text>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロパティカード
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PropertyCardProps {
  prop: WorkProperty;
  actual: number | string | null;
  readOnly: boolean;
  onChange: (key: string, value: number | string | null) => void;
  /** 不確かさ入力値が変化したときに親へ通知するコールバック（省略可） */
  onUncertaintyValuesChange?: (entries: UncertaintyValueEntry[]) => void;
  /**
   * 定性評価（confidence）が変化したときに親へ通知するコールバック（省略可）。
   * value: 選択された評価値（null の場合は選択解除）
   */
  onConfidenceChange?: (propKey: string, value: string | null) => void;
  /**
   * 定性評価理由が変化したときに親へ通知するコールバック（省略可）。
   * value: 入力された理由テキスト（空文字の場合は null）
   */
  onQualitativeReasonChange?: (propKey: string, value: string | null) => void;
  /**
   * 直近の保存で得られた不確かさ判定結果（省略可）。
   * uncertaintyKey をキーとした判定結果マップ。
   * 保存後にバッジ表示するために使用する。
   */
  lastJudgeResultMap?: Record<string, '良好' | '不良'>;
  /**
   * 定量評価（addedValues）の初期値（省略可）。
   * テンプレート切替後に uncertaintyValuesRef から復元した値を渡すことで
   * PropertyCard 再マウント時も入力値を保持できる。
   */
  initialUncertaintyValues?: UncertaintyValueEntry[];
}

const CONFIDENCE_STYLE: Record<string, { background: string; borderColor: string; color: string }> = {
  '確か':  { background: '#d9f7be', borderColor: '#b7eb8f', color: '#389e0d' },
  '曖昧':  { background: '#fff7e6', borderColor: '#ffd591', color: '#d46b08' },
  '不確か': { background: '#fff1f0', borderColor: '#ffa39e', color: '#cf1322' },
  'OK':    { background: '#d9f7be', borderColor: '#b7eb8f', color: '#389e0d' },
  'NG':    { background: '#fff1f0', borderColor: '#ffa39e', color: '#cf1322' },
};

/** CONFIDENCE_STYLE に定義がないラベル用のデフォルトスタイル */
const CONFIDENCE_STYLE_DEFAULT = { background: '#f0f0f0', borderColor: '#d9d9d9', color: '#595959' };

const getConfidenceStyle = (level: string) =>
  CONFIDENCE_STYLE[level] ?? CONFIDENCE_STYLE_DEFAULT;

const PropertyCard: React.FC<PropertyCardProps> = ({
  prop, actual, readOnly, onChange, onUncertaintyValuesChange, onConfidenceChange, onQualitativeReasonChange, lastJudgeResultMap,
  initialUncertaintyValues,
}) => {
  const { t } = useLanguage();
  const DEFAULT_CONFIDENCE_OPTIONS: string[] = [
    t('workRecord.confidenceCertain'),
    t('workRecord.confidenceAmbiguous'),
    t('workRecord.confidenceUncertain'),
  ];
  const confidenceOptions = prop.confidenceOptions ?? DEFAULT_CONFIDENCE_OPTIONS;
  /**
   * 色情報付き選択肢（intuition_selector.display_color 由来）。
   * 存在する場合はボタンスタイルの決定に優先使用し、ない場合は CONFIDENCE_STYLE にフォールバック。
   */
  const confidenceOptionsWithColor = prop.confidenceOptionsWithColor;
  const [confidence, setConfidence] = useState<string | null>(prop.defaultConfidence ?? null);
  /** 定性評価理由の入力値（保存済みの値を初期値として設定） */
  const [qualitativeReason, setQualitativeReason] = useState<string>(prop.qualitativeReason ?? '');
  /**
   * 定量評価入力行。
   * quantitativeUncertainties が設定されている場合は件数分の行を初期生成し
   * uncertaintyKey をプリセットする。それ以外は空行1件。
   * initialUncertaintyValues が渡された場合は uncertaintyKey に対応する value を復元する。
   */
  const [addedValues, setAddedValues] = useState<AddedUncertaintyValue[]>(() => {
    if (prop.quantitativeUncertainties && prop.quantitativeUncertainties.length > 0) {
      return prop.quantitativeUncertainties.map((qu) => {
        // initialUncertaintyValues から対応するエントリの value を復元（テンプレート切替後の保持）
        const savedEntry = initialUncertaintyValues?.find(
          (e) => e.uncertaintyKey === qu.uncertaintyKey
        );
        // 次に DB から復元した recordedValue を使用（getTemplateData API 経由で付与）
        const dbValue = qu.recordedValue != null ? String(qu.recordedValue) : '';
        return {
          id: qu.uncertaintyKey,
          uncertaintyKey: qu.uncertaintyKey,
          value: savedEntry?.value ?? dbValue,
        };
      });
    }
    return [{ id: 'initial', uncertaintyKey: '', value: '' }];
  });

  /** addedValues の uncertaintyKey に対応する QuantitativeUncertaintyInfo を返す */
  const getQuantitativeInfo = (key: string): QuantitativeUncertaintyInfo | undefined =>
    prop.quantitativeUncertainties?.find((qu) => qu.uncertaintyKey === key);

  /** 集約判定結果: 全件「良好」→「良好」、1件でも「不良」→「不良」 */
  const aggregatedJudgeResult: '良好' | '不良' | null = (() => {
    const keys = addedValues.map((av) => av.uncertaintyKey).filter(Boolean);
    if (keys.length === 0) return null;
    const results = keys.map((k) => lastJudgeResultMap?.[k]).filter((r): r is '良好' | '不良' => !!r);
    if (results.length === 0) return null;
    return results.some((r) => r === '不良') ? '不良' : '良好';
  })();


  /** 行を追加する */
  const handleAddValue = () => {
    setAddedValues((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, uncertaintyKey: '', value: '' },
    ]);
  };

  /** 行の不確かさ基準を更新する */
  const handleUncertaintyKeyChange = (id: string, newKey: string) => {
    setAddedValues((prev) => {
      const next = prev.map((av) => (av.id === id ? { ...av, uncertaintyKey: newKey } : av));
      onUncertaintyValuesChange?.(next.filter((av) => av.uncertaintyKey && av.value).map((av) => ({
        propKey: prop.key, uncertaintyKey: av.uncertaintyKey, value: av.value,
      })));
      return next;
    });
  };

  /** 行の値を更新する */
  const handleValueChange = (id: string, newValue: string) => {
    setAddedValues((prev) => {
      const next = prev.map((av) => (av.id === id ? { ...av, value: newValue } : av));
      onUncertaintyValuesChange?.(next.filter((av) => av.uncertaintyKey && av.value).map((av) => ({
        propKey: prop.key, uncertaintyKey: av.uncertaintyKey, value: av.value,
      })));
      return next;
    });
  };

  /** 行を削除する */
  const handleRemoveValue = (id: string) => {
    setAddedValues((prev) => prev.filter((av) => av.id !== id));
  };

  return (
  <Card
    size="small"
    style={{
      borderRadius: 6,
      border: '1px solid #d9d9d9',
      background: readOnly ? '#fafafa' : '#ffffff',
    }}
  >
    {/* プロパティ情報（最上部）*/}
    <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
      <Text strong style={{ fontSize: 13 }}>{prop.label}</Text>
      <Tag color={XSI_COLOR[prop.xsiType] ?? 'default'} style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}>
        {XSI_SHORT[prop.xsiType] ?? prop.xsiType}
      </Tag>
      <Text type="secondary" style={{ fontSize: 11 }}>({prop.key})</Text>
      {/* 選択中の定性評価を表示（未選択時は非表示） */}
      {confidence !== null && (
        <Tag
          style={{
            // confidenceOptionsWithColor（intuition_selector.display_color 由来）がある場合は優先使用する
            ...(confidenceOptionsWithColor?.find((c) => c.value === confidence)
              ? {
                  background: '#fff',
                  borderColor: confidenceOptionsWithColor.find((c) => c.value === confidence)!.color,
                  color: confidenceOptionsWithColor.find((c) => c.value === confidence)!.color,
                }
              : getConfidenceStyle(confidence)
            ),
            fontSize: 11,
            margin: 0,
            lineHeight: '18px',
            fontWeight: 'bold',
          }}
        >
          {confidence}
        </Tag>
      )}
      {/* 集約判定結果バッジ（保存後に表示） */}
      {aggregatedJudgeResult !== null && (
        <Tag
          color={aggregatedJudgeResult === '良好' ? 'success' : 'error'}
          style={{ fontSize: 11, margin: 0, lineHeight: '18px', fontWeight: 'bold' }}
        >
          {aggregatedJudgeResult}
        </Tag>
      )}
    </Flex>

      {/* データ表示 / 入力エリア */}
      <Flex vertical gap={6}>
        {/* 想定値 */}
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.expectedValue')}</Text>
          <div style={{ padding: '6px 10px', background: '#e6f7ff', border: '1px solid #bae7ff', borderRadius: 4 }}>
            {prop.expected !== null ? (
              <Text style={{ fontSize: 14 }}>
                {prop.expected}
                {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{prop.unit}</Text>}
              </Text>
            ) : (
              <Text type="secondary" italic style={{ fontSize: 13 }}>{t('workRecord.notSet')}</Text>
            )}
          </div>
        </div>

      {/* 実績値 */}
      <div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.actualValue')}</Text>
        <div style={{ padding: '0', background: '#ffffff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
          {readOnly ? (
            <div style={{ padding: '6px 10px' }}>
              {actual !== null ? (
                <Flex align="center" gap={8}>
                  <Text style={{ fontSize: 14 }}>
                    {actual}
                    {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{prop.unit}</Text>}
                  </Text>
                  {calcDiff(prop.expected, actual)}
                </Flex>
              ) : (
                <Text type="secondary" italic style={{ fontSize: 13 }}>{t('workRecord.notRecorded')}</Text>
              )}
            </div>
          ) : (
            <Flex align="center" style={{ width: '100%' }}>
              {prop.xsiType === 'StringValue' ? (
                <Input
                  variant="borderless"
                  style={{ flex: 1 }}
                  styles={{ input: { paddingLeft: 0 } }}
                  value={(actual as string) ?? ''}
                  placeholder={t('workRecord.inputPlaceholder')}
                  onChange={(e) => onChange(prop.key, e.target.value || null)}
                />
              ) : (
                <InputNumber
                  variant="borderless"
                  style={{ flex: 1 }}
                  styles={{ input: { paddingLeft: 0 } }}
                  value={(actual as number) ?? undefined}
                  placeholder={t('workRecord.inputPlaceholder')}
                  onChange={(v) => onChange(prop.key, v ?? null)}
                />
              )}
              {prop.unit && (
                <Text type="secondary" style={{ fontSize: 12, paddingRight: 6, flexShrink: 0 }}>{prop.unit}</Text>
              )}
            </Flex>
          )}
        </div>
      </div>

      {/* 確信度ボタン（実績値の下） */}
      {!readOnly && (
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.qualitativeEval')}</Text>
          <Flex gap={4}>
            {confidenceOptions.map((level) => {
              // confidenceOptionsWithColor（intuition_selector.display_color 由来）がある場合はその色を優先使用する
              const colorEntry = confidenceOptionsWithColor?.find((c) => c.value === level);
              const style = colorEntry
                ? { background: '#fff', borderColor: colorEntry.color, color: colorEntry.color }
                : getConfidenceStyle(level);
              return (
                <Button
                  key={level}
                  size="small"
                  onClick={() => {
                    const newVal = confidence === level ? null : level;
                    setConfidence(newVal);
                    onConfidenceChange?.(prop.key, newVal);
                  }}
                  style={{
                    ...style,
                    fontSize: 11,
                    width: 56,
                    fontWeight: confidence === level ? 'bold' : 'normal',
                    outline: confidence === level ? `2px solid ${style.borderColor}` : undefined,
                  }}
                >
                  {level}
                </Button>
              );
            })}
          </Flex>

          {/* 定性評価説明（常時表示、値がない場合は空欄） */}
          <div style={{ marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.qualitativeEvalDesc')}</Text>
            <div style={{ padding: '6px 10px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}>
              <Text style={{ fontSize: 12 }}>{prop.description ?? ''}</Text>
            </div>
          </div>

          {/* 定性評価理由 (入力のみ、API未実装) */}
          <div style={{ marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.qualitativeEvalReason')}</Text>
            <Input
              value={qualitativeReason}
              placeholder={t('workRecord.qualitativeEvalReasonPlaceholder')}
              onChange={(e) => {
                const val = e.target.value;
                setQualitativeReason(val);
                onQualitativeReasonChange?.(prop.key, val || null);
              }}
            />
          </div>
        </div>
      )}

      {/* 定量評価（入力時のみ）: 許容値・説明を各入力行にセット表示 */}
      {!readOnly && (
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
            {t('workRecord.quantitativeEval')}
          </Text>
          <Flex vertical gap={8}>
            {addedValues.map((av) => {
              const qInfo = getQuantitativeInfo(av.uncertaintyKey);
              return (
                <div key={av.id} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 4, padding: '6px 8px' }}>
                  {/* 対応する許容値・説明（quantitativeUncertainties がある行のみ） */}
                  {qInfo && (
                    <div style={{ marginBottom: 6 }}>
                      <Flex align="baseline" gap={6} style={{ marginBottom: 2 }}>
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                          {qInfo.uncertaintyName ?? t('workRecord.uncertaintyValue')}
                        </Text>
                        {qInfo.toleranceValue !== undefined && (
                          <Text style={{ fontSize: 12, fontWeight: 500 }}>
                            {qInfo.toleranceValue}
                            {prop.unit && <Text type="secondary" style={{ fontSize: 11, marginLeft: 3 }}>{prop.unit}</Text>}
                          </Text>
                        )}
                      </Flex>
                      {qInfo.description && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{qInfo.description}</Text>
                      )}
                      <Divider style={{ margin: '4px 0' }} />
                    </div>
                  )}
                  {/* 入力行 */}
                  <Flex gap={4} align="center">
                    <Select
                      size="small"
                      style={{ flex: 6, minWidth: 0 }}
                      placeholder={t('workRecord.quantitativeEvalPlaceholder')}
                      value={av.uncertaintyKey || undefined}
                      onChange={(val) => handleUncertaintyKeyChange(av.id, val)}
                      options={uncertaintyOptionsCache}
                    />
                    <Input
                      size="small"
                      style={{ flex: 4, minWidth: 0 }}
                      placeholder={t('workRecord.valuePlaceholder')}
                      value={av.value}
                      onChange={(e) => handleValueChange(av.id, e.target.value)}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveValue(av.id)}
                      disabled={addedValues.length === 1}
                    />
                  </Flex>
                </div>
              );
            })}
          </Flex>
          <Button
            size="small"
            icon={<PlusOutlined />}
            style={{ marginTop: 8, background: '#1d4e63', color: '#fff', borderColor: '#1d4e63', fontSize: 11 }}
            onClick={handleAddValue}
          >
            {t('workRecord.addValue')}
          </Button>
        </div>
      )}

    </Flex>

  </Card>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロパティカード一覧（共通部品）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PropertyListProps {
  template: WorkTemplate | null;
  templateCount: number;
  templateIdx: number;
  taskTransition: TaskTransitionState | undefined;
  isReadOnly: boolean;
  displayKey: { taskNo: number; transitionId: string } | null;
  /** スキップ可能かどうか（スキップボタンの有効/無効制御） */
  canSkip?: boolean;
  /** 「次へ」（トランジション完了）ボタンの活性フラグ（最後のテンプレートのみ適用） */
  canGoNext?: boolean;
  onActualChange: (taskNo: number, transitionId: string, propKey: string, value: ActualValue) => void;
  onSave: (taskNo: number, transitionId: string) => void;
  onSaveAndNext: (taskNo: number, transitionId: string) => void;
  onSkip: (taskNo: number, transitionId: string) => void;
  onTemplateIdxChange: (idx: number) => void;
  /** コメントボタンクリック時のコールバック */
  onCommentClick: () => void;
  /** S3アップロード先パス（InsertionEditorCompact に渡す） */
  uploadTargetPath?: string;
  /** カスタムInsertion追加ボタン押下時 */
  onInsertionAdd?: (taskNo: number, transitionId: string) => void;
  /** カスタムInsertionスロット削除ボタン押下時 */
  onInsertionRemove?: (taskNo: number, transitionId: string, insertionId: string) => void;
  /** カスタムContent追加ボタン押下時 */
  onContentAdd?: (taskNo: number, transitionId: string) => void;
  /** カスタムContentスロット削除ボタン押下時 */
  onContentRemove?: (taskNo: number, transitionId: string, contentId: string) => void;
  /** カスタムProperty追加ボタン押下時 */
  onPropertyAdd?: (taskNo: number, transitionId: string) => void;
  /** カスタムPropertyカード削除ボタン押下時 */
  onPropertyRemove?: (taskNo: number, transitionId: string, propertyId: string) => void;
  /** ペトリネットビューアを開くコールバック */
  onOpenViewer?: () => void;
  /** ペトリネットビューアローディング中フラグ */
  viewerLoading?: boolean;
  /**
   * 各 InsertionEditorCompact の uploadPendingFile が準備できたときに呼び出されるコールバック。
   * key は Insertion スロットを識別する文字列（固定 insertion の場合は 'fixed_{idx}'、カスタムは insertion.id）。
   * 保存時に全スロットのアップロードを実行するために使用する。
   */
  onInsertionUploadReady?: (key: string, fn: () => Promise<void>) => void;
  /**
   * 不確かさ入力値が変化したときに親へ通知するコールバック。
   * キー: `${placeId}__${propKey}`、値: 入力済みエントリ配列
   */
  onUncertaintyValuesChange?: (placeId: string, entries: UncertaintyValueEntry[]) => void;
  /**
   * 定性評価（confidence）が変化したときに親へ通知するコールバック。
   * placeId: テンプレートが紐づく Place ID
   * propKey: プロパティキー
   * value: 選択された評価値（null の場合は選択解除）
   */
  onConfidenceChange?: (placeId: string, propKey: string, value: string | null) => void;
  /**
   * 直近の保存で得られた不確かさ判定結果マップ。
   * uncertaintyKey をキーとした判定結果（'良好' | '不良'）。
   */
  /**
   * 定性評価理由変化コールバック
   */
  onQualitativeReasonChange?: (placeId: string, propKey: string, value: string | null) => void;
  lastJudgeResultMap?: Record<string, '良好' | '不良'>;
  /**
   * テンプレート切替後に confidence / qualitativeReason を復元するためのコールバック。
   * placeId（templateId）と propKey を渡すと confidenceValuesRef の現在値を返す。
   */
  onGetInitialConfidence?: (placeId: string, propKey: string) => { confidence: string | null; qualitativeReason: string | undefined };
  /**
   * テンプレート切替後に定量評価入力値（addedValues）を復元するためのコールバック。
   * placeId（templateId）と propKey を渡すと uncertaintyValuesRef の現在値を返す。
   */
  onGetInitialUncertaintyValues?: (placeId: string, propKey: string) => UncertaintyValueEntry[];
}

/** Insertion のデフォルト値 */
const DEFAULT_INSERTION: Insertion = { uri: '', hash: { method: '', value: '' }, format: '' };

const PropertyList: React.FC<PropertyListProps> = ({
  template,
  templateCount,
  templateIdx,
  taskTransition,
  isReadOnly,
  displayKey,
  onActualChange,
  uploadTargetPath,
  onInsertionAdd,
  onInsertionRemove,
  onContentAdd,
  onContentRemove,
  onPropertyAdd,
  onPropertyRemove,
  onOpenViewer,
  viewerLoading,
  onInsertionUploadReady,
  onUncertaintyValuesChange,
  onConfidenceChange,
  onQualitativeReasonChange,
  lastJudgeResultMap,
  onGetInitialConfidence,
  onGetInitialUncertaintyValues,
}) => {
  const { t } = useLanguage();

  if (!template) {
    return (
      <Flex justify="center" align="center" style={{ height: 200 }}>
        <Text type="secondary">{t('workRecord.noActiveTransition')}</Text>
      </Flex>
    );
  }

  return (
    <>
      <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
        <Tag color={CATEGORY_COLOR[template.category]}>{template.category}</Tag>
        <Text strong style={{ fontSize: 13 }}>{template.name}</Text>
        {templateCount > 1 && (
          <Text type="secondary" style={{ fontSize: 11 }}>{templateIdx + 1}/{templateCount}</Text>
        )}
      </Flex>

      <Row gutter={[8, 8]}>
        {template.properties.map((prop) => {
          // テンプレート切替後も入力値を保持するため、Ref の現在値で prop を補完する
          const initialConf = onGetInitialConfidence?.(template.id, prop.key);
          const enrichedProp: WorkProperty = {
            ...prop,
            defaultConfidence: initialConf?.confidence ?? prop.defaultConfidence,
            qualitativeReason: initialConf?.qualitativeReason ?? prop.qualitativeReason,
          };
          const initialUncValues = onGetInitialUncertaintyValues?.(template.id, prop.key) ?? [];
          return (
          <Col span={8} key={prop.key}>
            <PropertyCard
              prop={enrichedProp}
              actual={(() => {
                const v = taskTransition?.actuals[prop.key] ?? null;
                // Insertionオブジェクトはプロパティ値として使わない
                return (v !== null && typeof v === 'object') ? null : (v as number | string | null);
              })()}
              readOnly={isReadOnly}
              onChange={(key, value) => {
                if (displayKey) onActualChange(displayKey.taskNo, displayKey.transitionId, key, value);
              }}
              onUncertaintyValuesChange={(entries) => {
                onUncertaintyValuesChange?.(template.id, entries);
              }}
              onConfidenceChange={(propKey, value) => {
                onConfidenceChange?.(template.id, propKey, value);
              }}
              onQualitativeReasonChange={(propKey, value) => {
                onQualitativeReasonChange?.(template.id, propKey, value);
              }}
              lastJudgeResultMap={lastJudgeResultMap}
              initialUncertaintyValues={initialUncValues}
            />
          </Col>
          );
        })}
        {/* ── カスタムPropertyカード（ユーザーが追加したもの・同グリッドに混在） ── */}
        {taskTransition?.customPropertyIds?.map((pid) => {
          const actualValue = taskTransition.actuals[`property_custom_${pid}`] ?? null;
          const customProp: WorkProperty = {
            key: `custom_${pid}`,
            label: t('workRecord.customPropertyLabel'),
            xsiType: 'StringValue',
            unit: '',
            expected: null,
          };
          return (
            <Col span={8} key={pid}>
              <div
                style={{
                  border: '1px dashed #87e8de',
                  borderRadius: 4,
                  background: '#e6fffb',
                  position: 'relative',
                }}
              >
                {!isReadOnly && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      if (displayKey) onPropertyRemove?.(displayKey.taskNo, displayKey.transitionId, pid);
                    }}
                    style={{ position: 'absolute', top: 2, right: 2, padding: '0 4px', height: 20, zIndex: 1 }}
                  />
                )}
                <PropertyCard
                  prop={customProp}
                  actual={typeof actualValue === 'string' || actualValue === null ? actualValue : null}
                  readOnly={isReadOnly}
                  onChange={(key, value) => {
                    if (displayKey) onActualChange(displayKey.taskNo, displayKey.transitionId, `property_custom_${pid}`, value);
                  }}
                />
              </div>
            </Col>
          );
        })}
      </Row>

      {/* 追加ボタン群（DataRecordDialog 準拠） */}
      {!isReadOnly && (
        <Flex gap={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => {
              if (displayKey) onPropertyAdd?.(displayKey.taskNo, displayKey.transitionId);
            }}>
            {t('workRecord.addProperty')}
          </Button>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              if (displayKey) onContentAdd?.(displayKey.taskNo, displayKey.transitionId);
            }}
          >
            {t('workRecord.addContent')}
          </Button>
          {/* カスタムInsertion追加ボタン */}
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              if (displayKey) onInsertionAdd?.(displayKey.taskNo, displayKey.transitionId);
            }}
          >
            {t('insertionEditor.addButton')}
          </Button>
        </Flex>
      )}

      {/* ── 固定Insertionスロット（template.insertions 由来） ── */}
      {template.insertions && template.insertions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {template.insertions.map((slot) => {
            const actualsValue = taskTransition?.actuals[`insertion_${slot.id}`];
            const insertionValue: Insertion =
              actualsValue !== null && actualsValue !== undefined && typeof actualsValue === 'object'
                ? (actualsValue as Insertion)
                : DEFAULT_INSERTION;
            return (
              <div
                key={slot.id}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  background: '#fafafa',
                }}
              >
                {slot.label && (
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    {slot.label}
                  </Text>
                )}
                <InsertionEditorCompact
                  value={insertionValue}
                  onChange={(v) => {
                    if (displayKey) {
                      onActualChange(displayKey.taskNo, displayKey.transitionId, `insertion_${slot.id}`, v);
                    }
                  }}
                  readOnly={isReadOnly}
                  uploadTargetPath={uploadTargetPath}
                  onUploadPendingFileReady={(fn) => onInsertionUploadReady?.(`fixed_${slot.id}`, fn)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── カスタムInsertionスロット（ユーザーが追加したもの） ── */}
      {taskTransition?.customInsertionIds && taskTransition.customInsertionIds.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {taskTransition.customInsertionIds.map((cid) => {
            const actualsValue = taskTransition.actuals[`insertion_custom_${cid}`];
            const insertionValue: Insertion =
              actualsValue !== null && actualsValue !== undefined && typeof actualsValue === 'object'
                ? (actualsValue as Insertion)
                : DEFAULT_INSERTION;
            return (
              <div
                key={cid}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  border: '1px dashed #91caff',
                  borderRadius: 4,
                  background: '#e6f4ff',
                  position: 'relative',
                }}
              >
                <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#1677ff' }}>{t('insertionEditor.customLabel')}</Text>
                  {!isReadOnly && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        if (displayKey) onInsertionRemove?.(displayKey.taskNo, displayKey.transitionId, cid);
                      }}
                      style={{ padding: '0 4px', height: 20 }}
                    />
                  )}
                </Flex>
                <InsertionEditorCompact
                  value={insertionValue}
                  onChange={(v) => {
                    if (displayKey) {
                      onActualChange(displayKey.taskNo, displayKey.transitionId, `insertion_custom_${cid}`, v);
                    }
                  }}
                  readOnly={isReadOnly}
                  uploadTargetPath={uploadTargetPath}
                  onUploadPendingFileReady={(fn) => onInsertionUploadReady?.(`custom_${cid}`, fn)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── カスタムContentスロット（ユーザーが追加したもの） ── */}
      {taskTransition?.customContentIds && taskTransition.customContentIds.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {taskTransition.customContentIds.map((cid) => {
            const gridValue = taskTransition.actuals[`content_custom_${cid}`];
            const dataValue: number[][] =
              Array.isArray(gridValue) ? (gridValue as number[][]) : [[]];
            return (
              <div
                key={cid}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  border: '1px dashed #b37feb',
                  borderRadius: 4,
                  background: '#f9f0ff',
                  position: 'relative',
                }}
              >
                <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#722ed1' }}>カスタム Content</Text>
                  {!isReadOnly && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        if (displayKey) onContentRemove?.(displayKey.taskNo, displayKey.transitionId, cid);
                      }}
                      style={{ padding: '0 4px', height: 20 }}
                    />
                  )}
                </Flex>
                <ContentGridEditor
                  value={dataValue}
                  onChange={(v) => {
                    if (displayKey) {
                      onActualChange(displayKey.taskNo, displayKey.transitionId, `content_custom_${cid}`, v);
                    }
                  }}
                  readOnly={isReadOnly}
                />
              </div>
            );
          })}
        </div>
      )}
      {/* ペトリネットビューアボタン（readOnly に関わらず常に表示） */}
      <Flex justify="flex-end" style={{ marginTop: isReadOnly ? 12 : 4, paddingBottom: 8 }}>
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          onClick={onOpenViewer}
          disabled={!onOpenViewer}
          loading={viewerLoading}
        >
          {t('workRecord.petriNetViewer')}
        </Button>
      </Flex>
    </>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 作業ヘッダー（共通）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WorkHeaderProps {
  displayKey: { taskNo: number; transitionId: string } | null;
  taskTransition: TaskTransitionState | undefined;
  transition: WorkTransition | null;
  method: WorkMethod | undefined;
  isReadOnly: boolean;
  activeEntry: { taskNo: number; transitionId: string } | null;
  onClearViewing: () => void;
  /** 開始ボタン押下コールバック */
  onStart?: () => void;
  /** 終了ボタン押下コールバック */
  onEnd?: () => void;
  /** 異常終了ボタン押下コールバック */
  onForceEnd?: () => void;
  /** 状態記録ボタン押下コールバック */
  onStateRecord?: () => void;
  /** 状態プルダウン変更コールバック */
  onStatusChange?: (transitionId: string, status: TransitionStatus) => void;
  /** 作業指示ボタン押下コールバック */
  onInstructionClick?: () => void;
  /** Insertion アップロード準備完了コールバック */
  onInsertionUploadReady?: (key: string, fn: () => Promise<void>) => void;
  /** プロジェクトステータス（訂正ボタン表示制御） */
  projectStatus?: number;
  /** タスクステータス（訂正ボタン表示制御） */
  taskStatus?: number;
  /** 訂正モード中かどうか */
  isCorrectionMode?: boolean;
  /** 訂正モード開始コールバック */
  onEnterCorrectionMode?: () => void;
  /** 訂正モードキャンセルコールバック */
  onCancelCorrectionMode?: () => void;
  /** 訂正保存中フラグ */
  correctionLoading?: boolean;
  /** 訂正保存コールバック */
  onSaveCorrection?: () => void;
  /** 開始ボタンの非活性フラグ */
  startDisabled?: boolean;
  /** 終了ボタンの非活性フラグ */
  endDisabled?: boolean;
  /** 異常終了ボタンの非活性フラグ */
  forceEndDisabled?: boolean;
  /**
   * 異常終了ステータス（status === 'issue'）フラグ。
   * true のとき訂正ボタンを表示せず完全閲覧専用にする。
   */
  isErrorStatus?: boolean;
}

const WorkHeader: React.FC<WorkHeaderProps> = ({
  displayKey,
  taskTransition,
  transition,
  method,
  isReadOnly,
  activeEntry,
  onClearViewing,
  onStart,
  onEnd,
  onForceEnd,
  onStateRecord,
  onStatusChange,
  projectStatus,
  taskStatus,
  isCorrectionMode = false,
  onEnterCorrectionMode,
  onCancelCorrectionMode,
  correctionLoading = false,
  onSaveCorrection,
  startDisabled = false,
  endDisabled = false,
  forceEndDisabled = false,
  isErrorStatus = false,
}) => {
  const { t } = useLanguage();

  /** 状態プルダウンの全選択肢 */
  const allStatusOptions = [
    { value: 'not_started' as TransitionStatus, label: t('progressStatus.notStarted') },
    { value: 'preparing'   as TransitionStatus, label: t('progressStatus.preparing')  },
    { value: 'ready'       as TransitionStatus, label: t('progressStatus.ready')      },
    { value: 'running'     as TransitionStatus, label: t('progressStatus.running')    },
    { value: 'paused'      as TransitionStatus, label: t('progressStatus.paused')     },
    { value: 'completed'   as TransitionStatus, label: t('progressStatus.completed')  },
    { value: 'error'       as TransitionStatus, label: t('progressStatus.error')      },
  ];

  /**
   * 状態プルダウンの表示選択肢。
   * 現在のステータス自身 + ALLOWED_NEXT_STATUSES に定義された遷移先のみ表示する。
   * taskTransition が未確定の場合は全選択肢を表示する。
   */
  const currentStatus = taskTransition?.status;
  const allowedNextStatuses = currentStatus != null ? (ALLOWED_NEXT_STATUSES[currentStatus] ?? []) : [];
  const statusSelectOptions = allStatusOptions.filter((opt) => {
    return opt.value === currentStatus || allowedNextStatuses.includes(opt.value);
  });

  if (!displayKey || !taskTransition || !transition) {
    if (activeEntry === null) {
      return (
        <Alert type="success" showIcon message={t('workRecord.allTransitionsCompleted')} style={{ marginBottom: 8 }} />
      );
    }
    return null;
  }
  return (
    <div
      style={{
        marginBottom: 8,
        background: '#f6ffed',
        border: '1px solid #b7eb8f',
        borderRadius: 6,
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {/* 左側: 状態プルダウン + タスク情報 */}
      <Flex align="center" gap={8} wrap="wrap">
        {/* 状態プルダウン */}
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{t('workRecord.statusLabel')}</Text>
          <Select
            size="small"
            style={{ minWidth: 100 }}
            value={taskTransition.status}
            options={statusSelectOptions}
            onChange={(value: TransitionStatus) => {
              if (displayKey) onStatusChange?.(displayKey.transitionId, value);
            }}
          />
        </Flex>
        <Divider orientation="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('workRecord.taskNo')}</Text>
          <Text strong style={{ fontSize: 13 }}>#{displayKey.taskNo}</Text>
        </Flex>
        <Divider orientation="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('workRecord.method')}</Text>
          <Tooltip title={method?.id ?? ''}>
            <Text code style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {method?.id ?? '—'}
            </Text>
          </Tooltip>
        </Flex>
        <Divider orientation="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('workRecord.transition')}</Text>
          <Tooltip title={transition.id}>
            <Text code style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {transition.id}
            </Text>
          </Tooltip>
        </Flex>
      </Flex>

      {/* 右側: 操作ボタン群 */}
      <Flex align="center" gap={8}>
        <Button
          size="small"
          type="default"
          icon={<CaretRightOutlined />}
          disabled={startDisabled}
          style={startDisabled ? undefined : { color: '#1677ff', borderColor: '#1677ff' }}
          onClick={onStart}
        >
          {t('workRecord.startButton')}
        </Button>
        <Button
          size="small"
          type="default"
          icon={<BorderOutlined />}
          disabled={endDisabled}
          style={endDisabled ? undefined : { color: '#52c41a', borderColor: '#52c41a' }}
          onClick={onEnd}
        >
          {t('workRecord.endButton')}
        </Button>
        <Divider orientation="vertical" style={{ margin: '0 4px' }} />
        <Button
          size="small"
          type="default"
          icon={<WarningOutlined />}
          disabled={forceEndDisabled}
          style={forceEndDisabled ? undefined : { color: '#ff4d4f', borderColor: '#ff4d4f' }}
          onClick={onForceEnd}
        >
          {t('workRecord.forceEndButton')}
        </Button>
        <Button
          size="small"
          type="default"
          icon={<EditOutlined />}
          onClick={onStateRecord}
        >
          {t('workRecord.stateRecordButton')}
        </Button>
      </Flex>

      {isReadOnly && (() => {
        // 異常終了（status === 'issue'）の場合は訂正不可・完全閲覧専用
        if (isErrorStatus) {
          return (
            <Alert
              type="error" showIcon
              message={t('workRecord.errorTransitionReadonly')}
              style={{ marginTop: 4, fontSize: 12, width: '100%' }}
              action={<Button size="small" onClick={onClearViewing}>{t('workRecord.backToWork')}</Button>}
            />
          );
        }
        // 訂正可能かどうかを判定
        // 条件①: プロジェクトステータスが訂正可能（1=実行待ち/2=実行中/6=差し戻し）
        const isProjectCorrectable =
          projectStatus === ProjectStatusConst.TASK_PENDING ||
          projectStatus === ProjectStatusConst.TASK_IN_PROGRESS ||
          projectStatus === ProjectStatusConst.REVIEW_REJECTED;
        // 条件②: タスクステータスが訂正可能（0=待ち/1=実行中/5=NG）
        const isTaskCorrectable =
          taskStatus === TaskStatusConst.PENDING ||
          taskStatus === TaskStatusConst.IN_PROGRESS ||
          taskStatus === TaskStatusConst.REVIEW_NG;
        const isCorrectable = isProjectCorrectable && isTaskCorrectable;

        if (isCorrectionMode) {
          // 訂正モード中: 「訂正保存」「キャンセル」ボタン表示
          return (
            <Alert
              type="warning" showIcon
              title={t('workRecord.correctionModeAlert')}
              style={{ marginTop: 4, fontSize: 12, width: '100%' }}
              action={
                <Space size={4}>
                  <Button
                    size="small"
                    type="primary"
                    loading={correctionLoading}
                    onClick={onSaveCorrection}
                  >
                    {t('workRecord.saveCorrectionButton')}
                  </Button>
                  <Button
                    size="small"
                    disabled={correctionLoading}
                    onClick={onCancelCorrectionMode}
                  >
                    {t('workRecord.cancelCorrectionButton')}
                  </Button>
                </Space>
              }
            />
          );
        }
        if (isCorrectable) {
          // 訂正可能: 「訂正」ボタンと「作業に戻る」ボタンを表示
          return (
            <Alert
              type="info" showIcon
              title={t('workRecord.completedTransitionReadonly')}
              style={{ marginTop: 4, fontSize: 12, width: '100%' }}
              action={
                <Space size={4}>
                  <Button size="small" type="primary" onClick={onEnterCorrectionMode}>
                    {t('workRecord.startCorrectionButton')}
                  </Button>
                  <Button size="small" onClick={onClearViewing}>{t('workRecord.backToWork')}</Button>
                </Space>
              }
            />
          );
        }
        // 訂正不可: 「作業に戻る」のみ
        return (
          <Alert
            type="info" showIcon
            title={t('workRecord.completedTransitionReadonly')}
            style={{ marginTop: 4, fontSize: 12, width: '100%' }}
            action={<Button size="small" onClick={onClearViewing}>{t('workRecord.backToWork')}</Button>}
          />
        );
      })()}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロジェクト指示（折りたたみ）共通部品
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface InstructionCollapseProps {
  instructions: Instruction[];
  /** 指示確認ボタン押下コールバック */
  onConfirmInstruction?: () => void;
  /**
   * 初期表示時に展開しておくかどうか。
   * true = 展開（準備状態など指示確認が必要なタイミング）
   * false = 折りたたみ（動作状態以降）
   * デフォルト: false
   */
  defaultOpen?: boolean;

  /** 指示確認ボタンの非活性フラグ */
  confirmInstructionDisabled?: boolean;
}

const InstructionCollapse: React.FC<InstructionCollapseProps> = ({ instructions, onConfirmInstruction, defaultOpen = false, confirmInstructionDisabled = false }) => {

  const { t } = useLanguage();
  const [activeKeys, setActiveKeys] = useState<string[]>(defaultOpen ? ['instructions'] : []);

  // defaultOpen が変化したとき（トランジション切り替え）に開閉状態をリセット
  useEffect(() => {
    setActiveKeys(defaultOpen ? ['instructions'] : []);
  }, [defaultOpen]);

  /** instruction_key から表示名を解決する（未設定は「通常指示」相当にフォールバック） */
  const resolveLabel = (instructionKey: string | undefined): string => {
    const fallbackKey = 'Alchemia:SupervisorDirectiveContent';
    const key = instructionKey || fallbackKey;
    return INSTRUCTION_KEY_LABELS[key as keyof typeof INSTRUCTION_KEY_LABELS] ?? INSTRUCTION_KEY_LABELS[fallbackKey];
  };

  return (
    <Collapse
      size="small"
      activeKey={activeKeys}
      onChange={(keys) => setActiveKeys(typeof keys === 'string' ? [keys] : keys)}
      style={{ marginBottom: 8, background: '#fffbe6', borderColor: '#ffe58f' }}
      items={[
        {
          key: 'instructions',
          label: (
            <Flex align="center" gap={8}>
              <WarningOutlined style={{ color: '#faad14' }} />
              <Text strong style={{ fontSize: 13 }}>{t('workRecord.projectInstructions')}</Text>
              <Badge count={instructions.length} size="small" color="#faad14" />
            </Flex>
          ),
          children: (
            <>
              {instructions.length === 0 ? (
                <Text type="secondary" italic style={{ fontSize: 13 }}>
                  {t('workRecord.noInstructions')}
                </Text>
              ) : (
                <>
                  <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 8, maxHeight: 240, overflowY: 'auto' }}>
                    {instructions.map((inst) => (
                      <li key={inst.instructionId} style={{ fontSize: 13, color: '#595959', marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 13 }}>{resolveLabel(inst.instructionKey)}：</Text>
                        {inst.content}
                      </li>
                    ))}
                  </ul>
                  <Flex justify="flex-end">
                    <Button
                      size="small"
                      type="primary"
                      disabled={confirmInstructionDisabled}
                      style={confirmInstructionDisabled ? undefined : { background: '#52c41a', borderColor: '#52c41a' }}
                      onClick={(e) => { e.stopPropagation(); onConfirmInstruction?.(); }}
                    >
                      {t('workRecord.confirmInstruction')}
                    </Button>
                  </Flex>
                </>
              )}
            </>
          ),
        },
      ]}
    />
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 内部用Props（PlanB 共通）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// スキップロジック
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 対象トランジションにアクセス可能かどうかを判定する（WorkRecordPanel 内部用）。
 * prerequisiteTransitionIds が空の場合は常にアクセス可能。
 * prerequisiteTransitionIds が設定されている場合、それら全てが completed のときのみアクセス可能。
 */
function canAccessTransitionInTask(
  target: WorkTransition,
  taskTransitions: TaskTransitionState[]
): boolean {
  const prereqs = target.prerequisiteTransitionIds;

  // 前提なし → いつでもアクセス可能
  if (!prereqs || prereqs.length === 0) return true;

  // 全ての前提トランジションが completed であるか確認
  return prereqs.every((prereqId) => {
    const state = taskTransitions.find((s) => s.transitionId === prereqId);
    return state?.status === 'completed';
  });
}

/**
 * 現在のトランジションをスキップした後の次の実行可能なトランジションを検索する。
 * tasks の transitions を順番に走査し、スキップ済み・完了済み・前提未達のものを飛ばす。
 * availableTransitions が渡された場合はその順序を使用し、なければ task.transitions の順序を使用する。
 */
function findNextAvailableTransition(
  taskNo: number,
  currentTransitionId: string,
  skippedIds: string[],
  tasks: WorkTask[],
  availableTransitions?: WorkTransition[]
): { taskNo: number; transitionId: string } | null {
  const task = tasks.find((t) => t.taskNo === taskNo);
  if (!task) return null;

  // 順序付きトランジションIDリスト（availableTransitions があればその order ソート順を優先）
  const orderedIds: string[] = availableTransitions && availableTransitions.length > 0
    ? [...availableTransitions].sort((a, b) => a.order - b.order).map((tr) => tr.id)
    : task.transitions.map((tt) => tt.transitionId);

  const currentIdx = orderedIds.indexOf(currentTransitionId);

  // 後ろから順に探す
  for (let i = currentIdx + 1; i < orderedIds.length; i++) {
    const tid = orderedIds[i];
    const tt = task.transitions.find((s) => s.transitionId === tid);
    if (!tt) continue;
    if (tt.status === 'completed' || tt.status === 'error') continue;
    if (skippedIds.includes(tid)) continue;
    const transition = availableTransitions?.find((tr) => tr.id === tid);
    if (transition && !canAccessTransitionInTask(transition, task.transitions)) continue;
    return { taskNo, transitionId: tid };
  }

  // 前から循環検索
  for (let i = 0; i < currentIdx; i++) {
    const tid = orderedIds[i];
    const tt = task.transitions.find((s) => s.transitionId === tid);
    if (!tt) continue;
    if (tt.status === 'completed' || tt.status === 'error') continue;
    if (skippedIds.includes(tid)) continue;
    const transition = availableTransitions?.find((tr) => tr.id === tid);
    if (transition && !canAccessTransitionInTask(transition, task.transitions)) continue;
    return { taskNo, transitionId: tid };
  }

  return null;
}

interface PlanProps {
  tasks: WorkTask[];
  activeTaskNo: number;
  viewingKey: { taskNo: number; transitionId: string } | null;
  skippedTransitionIds: string[];
  instructions: Instruction[];
  onActualChange: (taskNo: number, transitionId: string, propKey: string, value: ActualValue) => void;
  onSave: (taskNo: number, transitionId: string) => void;
  onSaveAndNext: (taskNo: number, transitionId: string) => void;
  onClearViewing: () => void;
  /** スキップボタン押下時: 現在のトランジションをスキップして次へ */
  onSkip: (taskNo: number, transitionId: string) => void;
  /** コメントボタンクリック時のコールバック */
  onCommentClick: () => void;
  /** カスタムInsertion追加 */
  onInsertionAdd?: (taskNo: number, transitionId: string) => void;
  /** カスタムInsertion削除 */
  onInsertionRemove?: (taskNo: number, transitionId: string, insertionId: string) => void;
  /** カスタムContent追加 */
  onContentAdd?: (taskNo: number, transitionId: string) => void;
  /** カスタムContent削除 */
  onContentRemove?: (taskNo: number, transitionId: string, contentId: string) => void;
  /** カスタムProperty追加 */
  onPropertyAdd?: (taskNo: number, transitionId: string) => void;
  /** カスタムProperty削除 */
  onPropertyRemove?: (taskNo: number, transitionId: string, propertyId: string) => void;
  /** ファイルアップロード先パス（指定時にファイル選択・DnDでアップロード確認ダイアログを表示） */
  uploadTargetPath?: string;
  /** ペトリネットビューアを開くコールバック */
  onOpenViewer?: () => void;
  /** ペトリネットビューアローディング中フラグ */
  viewerLoading?: boolean;
  /** API から取得した進捗行（activeEntry 計算に使用） */
  progressRows?: ProgressRow[];
  /**
   * API から構築したトランジション定義。
   * progressRows と API から構築する。
   * projectId / methodId / progressRows が揃っていない場合は空配列のまま。
   */
  apiTransitions?: WorkTransition[];
  /** Creator プルダウンの選択肢（MAIMLのdocument.creatorsから取得） */
  creatorRefOptions: RefOption[];
  /** Instrument プルダウンの選択肢（MAIMLのdocument.instrumentsから取得） */
  instrumentRefOptions: RefOption[];
  /** Creator の選択値 */
  selectedCreatorRef: string | null;
  /** Instrument の選択値 */
  selectedInstrumentRef: string | null;
  /** Creator 選択変更コールバック */
  onCreatorRefChange: (value: string | null) => void;
  /** Instrument 選択変更コールバック */
  onInstrumentRefChange: (value: string | null) => void;
  /** プロジェクト指示「確認」ボタン押下コールバック */
  onConfirmInstruction?: () => void;
  /**
   * 「開始」ボタン押下コールバック（準備完了→動作状態）
   * displayKey の taskNo / transitionId を引数として受け取る。
   */
  onStart?: (taskNo: number, transitionId: string) => void;
  /**
   * 「終了」ボタン押下コールバック（動作状態→終状態）
   * displayKey の taskNo / transitionId を引数として受け取る。
   */
  onEnd?: (taskNo: number, transitionId: string) => void;
  /** 「異常終了」ボタン押下コールバック（任意→異常終了状態） */
  onForceEnd?: () => void;
  /** 状態記録ボタン押下コールバック */
  onStateRecord?: () => void;
  /** 状態プルダウン変更コールバック（transitionId, TransitionStatus文字列） */
  onStatusChange?: (transitionId: string, status: TransitionStatus) => void;
  /** Insertion アップロード準備完了コールバック */
  onInsertionUploadReady?: (key: string, fn: () => Promise<void>) => void;
  /**
   * 終了/異常終了ボタン押下後に画面をロックするキー。
   * progressRows が更新されて activeEntry が変わっても、
   * このキーが設定されている間は displayKey がこのキーに固定される。
   * 「次へ」ボタン押下後に WorkRecordPanel 本体でクリアされる。
   */
  pendingEndKey?: { taskNo: number; transitionId: string } | null;
  /** pendingEndKey を設定するコールバック（PlanB → WorkRecordPanel 本体に通知） */
  onSetPendingEndKey?: (key: { taskNo: number; transitionId: string }) => void;
  /**
   * 不確かさ入力値変化コールバック（placeId, entries を受け取る）。
   * handleSave 時に uncertaintyValues として saveBatchExperimentData に渡すために使用する。
   */
  onUncertaintyValuesChange?: (placeId: string, entries: UncertaintyValueEntry[]) => void;
  /**
   * 定性評価（confidence）変化コールバック（placeId, propKey, value を受け取る）。
   * handleSave 時に qualitativeValues として saveBatchExperimentData に渡すために使用する。
   */
  onConfidenceChange?: (placeId: string, propKey: string, value: string | null) => void;
  /**
   * 定性評価理由変化コールバック（placeId, propKey, value を受け取る）。
   * handleSave 時に confidenceValues の description フィールドを更新するために使用する。
   */
  onQualitativeReasonChange?: (placeId: string, propKey: string, value: string | null) => void;
  /**
   * 直近の保存で得られた不確かさ判定結果マップ（uncertaintyKey → '良好' | '不良'）。
   * PropertyCard 内のバッジ表示に使用する。
   */
  lastJudgeResultMap?: Record<string, '良好' | '不良'>;
  /** プロジェクトステータス（訂正ボタン表示制御） */
  projectStatus?: number;
  /** 訂正モード中かどうか */
  isCorrectionMode?: boolean;
  /** 訂正モード開始コールバック */
  onEnterCorrectionMode?: () => void;
  /** 訂正モードキャンセルコールバック */
  onCancelCorrectionMode?: () => void;
  /** 訂正保存中フラグ */
  correctionLoading?: boolean;
  /** 訂正保存コールバック */
  onSaveCorrection?: () => void;
  /**
   * 現在アクティブなトランジションのキー（本体で計算して渡す）。
   * PlanB 内での二重計算を避けるために Props で受け取る。
   */
  activeEntry: { taskNo: number; transitionId: string } | null;
  /**
   * 現在表示中トランジションのキー（本体で計算して渡す）。
   * viewingKey ?? pendingEndKey ?? activeEntry の優先順で決定される。
   */
  displayKey: { taskNo: number; transitionId: string } | null;
  /**
   * データ入力エリアの読み取り専用フラグ（本体で計算して渡す）。
   * isRecorded === true && (isErrorStatus || !isCorrectionMode) で決定される。
   */
  isReadOnly: boolean;
  /**
   * 異常終了ステータス（status === 'issue'）フラグ（本体で計算して渡す）。
   * true のとき訂正不可（完全閲覧専用）。
   */
  isErrorStatus: boolean;
  /**
   * テンプレート切替後に confidence / qualitativeReason を復元するためのコールバック。
   * WorkRecordPanel 本体から confidenceValuesRef の現在値を返す。
   */
  onGetInitialConfidence?: (placeId: string, propKey: string) => { confidence: string | null; qualitativeReason: string | undefined };
  /**
   * テンプレート切替後に定量評価入力値（addedValues）を復元するためのコールバック。
   * WorkRecordPanel 本体から uncertaintyValuesRef の現在値を返す。
   */
  onGetInitialUncertaintyValues?: (placeId: string, propKey: string) => UncertaintyValueEntry[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案B: DataRecordDialog準拠の左Sider + 右Contentレイアウト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PlanB: React.FC<PlanProps> = ({
  tasks, skippedTransitionIds, instructions, onActualChange, onSave, onSaveAndNext, onClearViewing, onSkip, onCommentClick, onInsertionAdd, onInsertionRemove, onContentAdd, onContentRemove, onPropertyAdd, onPropertyRemove, uploadTargetPath, onOpenViewer, viewerLoading,
  creatorRefOptions, instrumentRefOptions, selectedCreatorRef, selectedInstrumentRef, onCreatorRefChange, onInstrumentRefChange,
  onInsertionUploadReady,
  progressRows, apiTransitions, onConfirmInstruction, onStateRecord, onStart, onEnd, onForceEnd, onStatusChange,
  onSetPendingEndKey,
  onUncertaintyValuesChange,
  onConfidenceChange,
  onQualitativeReasonChange,
  lastJudgeResultMap,
  projectStatus,
  isCorrectionMode = false,
  onEnterCorrectionMode,
  onCancelCorrectionMode,
  correctionLoading = false,
  onSaveCorrection,
  // 本体で計算して渡す（二重計算解消）
  activeEntry,
  displayKey,
  isReadOnly,
  isErrorStatus,
  onGetInitialConfidence,
  onGetInitialUncertaintyValues,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | undefined>(undefined);

  /**
   * 使用するトランジション定義リスト。
   * apiTransitions が 1件以上あれば API データを使用し、なければ空配列。
   */
  const effectiveTransitions = (apiTransitions && apiTransitions.length > 0) ? apiTransitions : [];

  // displayKey・isReadOnly・activeEntry・isErrorStatus は Props から受け取る（本体で一元計算）

  const displayTask = displayKey ? tasks.find((t) => t.taskNo === displayKey.taskNo) : null;
  const displayTT = displayTask?.transitions.find((tt) => tt.transitionId === displayKey?.transitionId);
  // effectiveTransitions からテンプレートを解決する
  const displayTransition = displayKey ? effectiveTransitions.find((t) => t.id === displayKey.transitionId) : null;
  // methodId を displayTransition から取得し、フォールバックとして props の methodId を使用
  const displayMethod = displayTransition
    ? { id: displayTransition.methodId, order: 1 }
    : null;
  const visibleTemplates = displayTransition?.templates ?? [];

  // 自動選択: トランジションが切り替わったら先頭テンプレートを選択
  const firstTemplateId = visibleTemplates[0]?.id ?? null;
  const resolvedSelectedId = selectedTemplateId && visibleTemplates.some((t) => t.id === selectedTemplateId)
    ? selectedTemplateId
    : firstTemplateId;
  const activeTemplate = visibleTemplates.find((t) => t.id === resolvedSelectedId) ?? null;
  const safeIdx = visibleTemplates.findIndex((t) => t.id === resolvedSelectedId);

  // ── progressRows からリアルタイムにステータスを取得し、displayTT の status をオーバーライドする ──
  // これにより buildTransitions の非同期完了を待たず、reloadProgressRows 完了直後に
  // 状態プルダウンが即座に更新される。（ボタン活性制御と同じデータソースを使用）
  const progressRowStatus = displayKey
    ? progressRows?.find((r) => r.taskNo === displayKey.taskNo && r.transitionId === displayKey.transitionId)?.status
    : undefined;
  // ProgressRow.status → TransitionStatus 変換
  const toTransitionStatusFromRow = (s: typeof progressRowStatus): TransitionStatus | undefined => {
    if (!s) return undefined;
    if (s === 'in_progress') return 'running';
    if (s === 'on_hold')     return 'paused';
    if (s === 'issue')       return 'error';
    return s as TransitionStatus;
  };
  const realtimeStatus = toTransitionStatusFromRow(progressRowStatus);
  const displayTTWithCurrentStatus: typeof displayTT = displayTT && realtimeStatus
    ? { ...displayTT, status: realtimeStatus }
    : displayTT;

  // フィルタ後テンプレート
  const filteredTemplates = useMemo(() => {
    return visibleTemplates.filter((tpl) => {
      const matchName = !templateSearchText || tpl.name.toLowerCase().includes(templateSearchText.toLowerCase());
      const matchCat = !selectedTemplateCategory || tpl.category === selectedTemplateCategory;
      return matchName && matchCat;
    });
  }, [visibleTemplates, templateSearchText, selectedTemplateCategory]);

  /** カテゴリ別グループ化テンプレート（左Siderのグループ表示用） */
  const categorizedTemplates = useMemo(() => {
    const order: ('Materials' | 'Conditions' | 'Results')[] = ['Materials', 'Conditions', 'Results'];
    return order
      .map((cat) => ({
        category: cat,
        templates: filteredTemplates.filter((t) => t.category === cat),
      }))
      .filter((g) => g.templates.length > 0);
  }, [filteredTemplates]);

  /**
   * displayKey に対応する progressRow のステータスを取得する。
   * このステータスに基づいて各ボタンの活性/非活性を決定する。
   *
   * 制御条件:
   * - 'preparing'（準備状態）   : 指示確認=活性, 開始=非活性, 終了=非活性, 異常終了=非活性
   * - 'ready'（準備完了状態）   : 指示確認=非活性, 開始=活性, 終了=非活性, 異常終了=非活性
   * - 'in_progress'（動作状態） : 指示確認=非活性, 開始=非活性, 終了=活性, 異常終了=活性
   * - 'on_hold'（休止状態）      : 指示確認=非活性, 開始=活性, 終了=非活性, 異常終了=非活性
   * - 'completed'/'issue'/その他 : 全て非活性
   */
  const currentProgressRow = progressRows?.find(
    (r) => displayKey !== null && r.taskNo === displayKey.taskNo && r.transitionId === displayKey.transitionId
  );
  const currentStatus = currentProgressRow?.status;

  const confirmInstructionDisabled = currentStatus !== 'preparing';
  const startDisabled = !(currentStatus === 'ready' || currentStatus === 'on_hold');
  const endDisabled = currentStatus !== 'in_progress';
  const forceEndDisabled = currentStatus !== 'in_progress';

  return (
    <Flex vertical style={{ height: '100%' }}>
      <InstructionCollapse
        instructions={instructions}
        onConfirmInstruction={onConfirmInstruction}
        defaultOpen={(() => {
          // 現在のアクティブトランジションのステータスが preparing / ready（準備状態）の場合は開いておく
          if (!activeEntry || !progressRows) return false;
          const currentRow = progressRows.find(
            (r) => r.taskNo === activeEntry.taskNo && r.transitionId === activeEntry.transitionId
          );
          return currentRow?.status === 'preparing' || currentRow?.status === 'ready';
        })()}
        confirmInstructionDisabled={confirmInstructionDisabled}
      />
      <WorkHeader
        displayKey={displayKey} taskTransition={displayTTWithCurrentStatus} transition={displayTransition ?? null}
        method={displayMethod ?? undefined} isReadOnly={isReadOnly} activeEntry={activeEntry} onClearViewing={onClearViewing}
        onStart={displayKey ? () => onStart?.(displayKey.taskNo, displayKey.transitionId) : undefined}
        onEnd={displayKey ? () => { onSetPendingEndKey?.(displayKey); onEnd?.(displayKey.taskNo, displayKey.transitionId); } : undefined}
        onForceEnd={displayKey ? () => { onSetPendingEndKey?.(displayKey); onForceEnd?.(); } : undefined}
        onStatusChange={onStatusChange}
        onStateRecord={onStateRecord}
        projectStatus={projectStatus}
        taskStatus={progressRows?.find((r) => displayKey !== null && r.taskNo === displayKey.taskNo && r.transitionId === displayKey.transitionId)?.taskStatus}
        isCorrectionMode={isCorrectionMode}
        onEnterCorrectionMode={onEnterCorrectionMode}
        onCancelCorrectionMode={onCancelCorrectionMode}
        correctionLoading={correctionLoading}
        onSaveCorrection={onSaveCorrection}
        isErrorStatus={isErrorStatus}
        startDisabled={startDisabled}
        endDisabled={endDisabled}
        forceEndDisabled={forceEndDisabled}
      />

      {/* Creator / Instrument 選択エリア（WorkHeader の直後・テンプレート入力の前） */}
      {displayKey && (
        <Card
          size="small"
          style={{ marginBottom: 8, background: '#fafafa' }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            {/* 左側: Creator / Instrument */}
            <Flex gap={16} wrap="wrap" align="center">
              <Flex align="center" gap={8}>
                <Text style={{ fontSize: 12, whiteSpace: 'nowrap', minWidth: 72, fontWeight: 500 }}>
                  {t('workRecord.creatorLabel')}
                </Text>
                <Select
                  style={{ width: 240 }}
                  size="small"
                  placeholder={t('workRecord.creatorPlaceholder')}
                  value={selectedCreatorRef ?? undefined}
                  options={creatorRefOptions}
                  onChange={(v: string | undefined) => onCreatorRefChange(v ?? null)}
                  allowClear
                  disabled={isReadOnly}
                />
              </Flex>
              <Flex align="center" gap={8}>
                <Text style={{ fontSize: 12, whiteSpace: 'nowrap', minWidth: 72, fontWeight: 500 }}>
                  {t('workRecord.instrumentLabel')}
                </Text>
                <Select
                  style={{ width: 240 }}
                  size="small"
                  placeholder={t('workRecord.instrumentPlaceholder')}
                  value={selectedInstrumentRef ?? undefined}
                  options={instrumentRefOptions}
                  onChange={(v: string | undefined) => onInstrumentRefChange(v ?? null)}
                  allowClear
                  disabled={isReadOnly}
                />
              </Flex>
            </Flex>

            {/* 右側: 保存 / 次へ / コメント / スキップ（編集時のみ表示） */}
            {!isReadOnly && (() => {
              const nextBtnLabel = t('workRecord.transitionCompleteNext');
              // スキップボタン活性条件:
              // 1. 次に移動可能なトランジションが存在する
              // 2. 現在のトランジションが動作状態（in_progress）でない
              //    動作状態: 非活性 / 休止・準備・準備完了状態: 活性
              const hasNextTransition = findNextAvailableTransition(displayKey.taskNo, displayKey.transitionId, skippedTransitionIds, tasks) !== null;
              const currentProgressRow = progressRows?.find(
                (r) => r.taskNo === displayKey.taskNo && r.transitionId === displayKey.transitionId
              );
              const isInProgress = currentProgressRow?.status === 'in_progress';
              const canSkipFlag = hasNextTransition && !isInProgress;

              // 「次へ」ボタン活性条件:
              // 1. 現在のトランジションが終状態（completed）である
              // 2. 記録保存済み（isRecorded === true）
              // 3. 次のトランジションが存在する
              const isCompleted = currentProgressRow?.status === 'completed';
              const isRecordedFlag = currentProgressRow?.isRecorded === true;
              const canGoNext = hasNextTransition && isCompleted && isRecordedFlag;
              const nextTooltipTitle = !isCompleted
                ? t('workRecord.nextTooltipNotCompleted')
                : !isRecordedFlag
                  ? t('workRecord.nextTooltipNotRecorded')
                  : !hasNextTransition
                    ? t('workRecord.nextTooltipNoNext')
                    : undefined;

              const handleSaveAndNextInner = () => {
                const nextTemplateIdx = safeIdx + 1;
                if (nextTemplateIdx < visibleTemplates.length) {
                  setSelectedTemplateId(visibleTemplates[nextTemplateIdx]?.id ?? null);
                } else {
                  onSaveAndNext(displayKey.taskNo, displayKey.transitionId);
                }
              };
              return (
                <Flex gap={8} align="center">
                  <Button
                    size="small"
                    icon={<SaveOutlined />}
                    style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' }}
                    onClick={() => onSave(displayKey.taskNo, displayKey.transitionId)}
                  >
                    {t('workRecord.saveButton')}
                  </Button>
                  <Tooltip title={nextTooltipTitle}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<RightOutlined />}
                      disabled={!canGoNext}
                      onClick={handleSaveAndNextInner}
                    >
                      {nextBtnLabel}
                    </Button>
                  </Tooltip>
                  <Divider orientation="vertical" style={{ margin: '0 12px' }} />
                  <Button
                    size="small"
                    icon={<CommentOutlined />}
                    onClick={onCommentClick}
                  >
                    {t('workRecord.commentButton')}
                  </Button>
                  <Tooltip title={canSkipFlag ? t('workRecord.skipTooltipAvailable') : t('workRecord.skipTooltipUnavailable')}>
                    <Button
                      size="small"
                      icon={<StepForwardOutlined />}
                      disabled={!canSkipFlag}
                      onClick={() => onSkip(displayKey.taskNo, displayKey.transitionId)}
                      style={{ marginLeft: 8 }}
                    >
                      {t('workRecord.skipButton')}
                    </Button>
                  </Tooltip>
                </Flex>
              );
            })()}
          </Flex>
        </Card>
      )}

      {/* DataRecordDialog準拠: Layout + Sider + Content */}
      <Layout style={{ flex: 1, overflow: 'hidden', background: token.colorBgLayout }}>
        {/* 左Sider: テンプレート一覧（DataRecordDialog準拠） */}
        <Sider
          width={280}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorder}`,
            padding: token.paddingSM,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* タイトル + 件数 */}
          <div style={{ marginBottom: token.marginSM }}>
            <Space>
              <Text strong>{t('workRecord.templateLabel')}</Text>
              <Tag color="blue">{filteredTemplates.length}{t('workRecord.templateCountSuffix')}</Tag>
            </Space>
          </div>

          {/* 検索・カテゴリフィルタ */}
          <Space orientation="vertical" style={{ width: '100%', marginBottom: token.marginMD }} size="small">
            <Input
              placeholder={t('workRecord.templateSearchPlaceholder')}
              prefix={<SearchOutlined />}
              value={templateSearchText}
              onChange={(e) => setTemplateSearchText(e.target.value)}
              allowClear
            />
            <Select
              placeholder={t('workRecord.templateKind')}
              value={selectedTemplateCategory}
              onChange={setSelectedTemplateCategory}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: 'Materials',   value: 'Materials'   },
                { label: 'Conditions',  value: 'Conditions'  },
                { label: 'Results',     value: 'Results'     },
              ]}
            />
          </Space>

          {/* テンプレートリスト（カテゴリ別グループ表示） */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {categorizedTemplates.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('workRecord.noActiveTransition')}
              </Text>
            ) : (
              categorizedTemplates.map((group) => (
                <div key={group.category} style={{ marginBottom: 12 }}>
                  {/* カテゴリヘッダー */}
                  <Text
                    strong
                    style={{
                      fontSize: 12,
                      color: '#595959',
                      display: 'block',
                      marginBottom: 4,
                      paddingLeft: 2,
                    }}
                  >
                    {group.category}
                  </Text>

                  {/* テンプレートカード一覧 */}
                  {group.templates.map((tpl) => {
                    const isSelected = tpl.id === resolvedSelectedId;
                    const isOutput = tpl.category === 'Results';
                    const ioLabel = isOutput ? 'OUT' : 'IN';
                    const ioColor = isOutput ? 'green' : 'blue';
                    const propertyCount = tpl.properties.length;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        style={{
                          cursor: 'pointer',
                          padding: '6px 8px',
                          marginBottom: 4,
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? '#1677ff' : '#e8e8e8'}`,
                          background: isSelected ? '#e6f4ff' : '#ffffff',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        {/* テンプレート名 + 件数 */}
                        <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
                          <Text
                            strong
                            style={{
                              fontSize: 13,
                              color: isSelected ? '#1677ff' : 'inherit',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {tpl.name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                            ({propertyCount}{t('workRecord.itemsSuffix')})
                          </Text>
                        </Flex>
                        {/* カテゴリTag + IN/OUTTag */}
                        <Space size={4}>
                          <Tag
                            color={CATEGORY_COLOR[tpl.category]}
                            style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}
                          >
                            {tpl.category}
                          </Tag>
                          <Tag
                            color={ioColor}
                            style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}
                          >
                            {ioLabel}
                          </Tag>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </Sider>

        {/* 右Content: データ記録 */}
        <Content
          style={{
            background: token.colorBgLayout,
            padding: token.paddingMD,
            overflow: 'auto',
          }}
        >
          <PropertyList
            template={activeTemplate}
            templateCount={visibleTemplates.length}
            templateIdx={safeIdx}
            taskTransition={displayTTWithCurrentStatus}
            isReadOnly={isReadOnly}
            displayKey={displayKey}
            canSkip={!isReadOnly && displayKey !== null && findNextAvailableTransition(displayKey.taskNo, displayKey.transitionId, skippedTransitionIds, tasks) !== null}
            onActualChange={onActualChange}
            onSave={onSave}
            onSaveAndNext={onSaveAndNext}
            onSkip={onSkip}
            onTemplateIdxChange={(idx) => setSelectedTemplateId(visibleTemplates[idx]?.id ?? null)}
            onCommentClick={onCommentClick}
            onInsertionAdd={onInsertionAdd}
            onInsertionRemove={onInsertionRemove}
            onContentAdd={onContentAdd}
            onContentRemove={onContentRemove}
            onPropertyAdd={onPropertyAdd}
            onPropertyRemove={onPropertyRemove}
            uploadTargetPath={uploadTargetPath}
            onOpenViewer={onOpenViewer}
            viewerLoading={viewerLoading}
            onInsertionUploadReady={onInsertionUploadReady}
            onUncertaintyValuesChange={onUncertaintyValuesChange}
            onConfidenceChange={onConfidenceChange}
            onQualitativeReasonChange={onQualitativeReasonChange}
            lastJudgeResultMap={lastJudgeResultMap}
            onGetInitialConfidence={onGetInitialConfidence}
            onGetInitialUncertaintyValues={onGetInitialUncertaintyValues}
          />
        </Content>
      </Layout>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WorkRecordPanel（エクスポート）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WorkRecordPanel Props & 変換ユーティリティ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WorkRecordPanelProps {
  projectName?: string;
  projectId?: string;
  methodId?: string;
  progressRows?: ProgressRow[];
  projectStatus?: number;
  useDeemedProgress?: boolean;
  initialTaskNo?: number;
  initialTransitionId?: string;
  /** 作業指示一覧（全件）。WorkRecordPanel 内部で現在のトランジションに応じてフィルタリングする */
  allWorkerInstructions?: Instruction[];
  /** プロジェクト指示「確認」ボタン押下コールバック */
  onConfirmInstruction?: () => void;
  /**
   * プロジェクトが属する組織グループCD（任意）。
   * 不確かさ基準新規作成ダイアログのKey属性設定プルダウンのスコープ絞り込みに使用する。
   */
  organizationGroupCd?: string | null;
  /**
   * 「開始」ボタン押下コールバック（準備完了→動作状態）
   * displayKey の taskNo / transitionId を受け取る。
   */
  onStart?: (taskNo: number, transitionId: string) => void;
  /**
   * 「終了」ボタン押下コールバック（動作状態→終状態）
   * displayKey の taskNo / transitionId を受け取る。
   */
  onEnd?: (taskNo: number, transitionId: string) => void;
  /** 「異常終了」ボタン押下コールバック（任意→異常終了状態） */
  onForceEnd?: () => void;
  /**
   * 状態プルダウン変更コールバック（transitionId, TransitionStatus 文字列）
   * ExperimentWorkerMenu 側で updateTransitionStatus API を呼び出す。
   */
  onStatusChange?: (transitionId: string, status: TransitionStatus) => void;
  /**
   * 実験データ保存成功後コールバック（任意）。
   * ExperimentWorkerMenu 側でプロジェクト一覧再取得などの後処理を行う際に使用する。
   */
  onSave?: () => void;
}

/** API の xsiType 文字列を WorkProperty の xsiType に変換する */
function resolveXsiType(xsiType: string | undefined): WorkProperty['xsiType'] {
  if (!xsiType) return 'StringValue';
  // リスト型（例: "intListType"）は基底の Simple型（例: "intType"）に正規化してから判定する
  const base = xsiType.replace(/ListType$/i, 'Type');
  if (isIntegerXsiType(base)) return 'IntegerValue';
  if (isNumericXsiType(base)) return 'FloatValue';
  return 'StringValue';
}

/**
 * API レスポンスの1プロパティ行を WorkProperty に変換する。
 * Phase 3-B 対応: toleranceValues[] → quantitativeUncertainties[] マッピング追加。
 */
function convertRawProperty(
  p: Record<string, unknown>
): WorkProperty {
  let confidenceOptions: string[] | undefined;
  let confidenceOptionsWithColor: Array<{ value: string; color: string }> | undefined;
  let defaultConfidence: string | undefined;
  // バックエンドが返す qualitativeOptions（intuition_selector 由来）を直接利用する
  // displayColor（intuition_selector.display_color）も含めてボタン色に反映する
  const rawQualitativeOptions = p.qualitativeOptions as
    | Array<{ displayOrder: number; selectorValue: string; displayColor?: string }>
    | null
    | undefined;
  if (rawQualitativeOptions && rawQualitativeOptions.length > 0) {
    const sortedOptions = [...rawQualitativeOptions].sort((a, b) => a.displayOrder - b.displayOrder);
    confidenceOptions = sortedOptions.map((opt) => opt.selectorValue);
    // displayColor が存在する選択肢がある場合のみ confidenceOptionsWithColor を設定する
    const hasColor = sortedOptions.some((opt) => opt.displayColor && opt.displayColor.startsWith('#'));
    if (hasColor) {
      confidenceOptionsWithColor = sortedOptions.map((opt) => {
        const colorValue = {
          value: opt.selectorValue,
          color: (opt.displayColor && opt.displayColor.startsWith('#')) ? opt.displayColor : '#888888',
        };
        return colorValue;
      });
    }
  }
  // 保存済みの定性評価値を初期選択状態にする
  const qualitativeEval = (p.qualitativeEval as string | null | undefined) ?? undefined;
  if (qualitativeEval) {
    defaultConfidence = qualitativeEval;
  }
  // toleranceValues[] → quantitativeUncertainties[] マッピング（Phase 3-B）
  const rawToleranceValues = p.toleranceValues as
    | Array<{
        uncertaintyKey: string;
        toleranceValue: string | null;
        uncertaintyNote: string | null;
        uncertaintyName: string | null;
        recordedValue?: number | null;
      }>
    | null
    | undefined;
  const quantitativeUncertainties: QuantitativeUncertaintyInfo[] | undefined =
    rawToleranceValues && rawToleranceValues.length > 0
      ? rawToleranceValues.map((tv) => ({
          uncertaintyKey:  tv.uncertaintyKey,
          uncertaintyName: tv.uncertaintyName ?? undefined,
          toleranceValue:  tv.toleranceValue ?? undefined,
          description:     tv.uncertaintyNote ?? undefined,
          recordedValue:   tv.recordedValue ?? null,
        }))
      : undefined;
  return {
    key: String(p.key ?? ''),
    label: String(p.key ?? ''),
    xsiType: resolveXsiType(p.xsiType as string | undefined),
    unit: String(p.units ?? ''),
    expected: ((p.plannedValue) as number | string | null | undefined) ?? null,
    uncertaintyName:        (p.uncertaintyName as string | undefined) ?? undefined,
    uncertaintyValue:       (p.toleranceValue as string | number | undefined) ?? undefined,
    uncertaintyDescription: (p.uncertaintyNote as string | undefined) ?? undefined,
    quantitativeUncertainties,
    defaultConfidence,
    confidenceOptions,
    confidenceOptionsWithColor,
    description:        (p.qualitativeNote as string | null | undefined) ?? undefined,
    qualitativeReason:  (p.qualitativeReason as string | null | undefined) ?? undefined,
  };
}


/**
 * progressRows から現在の作業対象タスクNo を決定する。
 * in_progress のトランジションを持つ最初のタスクを優先し、
 * なければ not_started のトランジションを持つ最初のタスクを返す。
 * progressRows が空または未指定の場合はフォールバック値を返す。
 */
function resolveActiveTaskNo(progressRows: ProgressRow[] | undefined, fallback: number): number {
  if (!progressRows || progressRows.length === 0) return fallback;

  // in_progress/ready/preparing のタスクを優先
  const inProgressRow = progressRows.find((r) => r.status === 'in_progress' || r.status === 'ready' || r.status === 'preparing');
  if (inProgressRow) return inProgressRow.taskNo;

  // not_started のタスクを次に選ぶ
  const notStartedRow = progressRows.find((r) => r.status === 'not_started');
  if (notStartedRow) return notStartedRow.taskNo;

  // 全完了済みの場合は最初のタスクNo
  return progressRows[0].taskNo;
}

export default function WorkRecordPanel({
  projectName,
  projectId,
  methodId,
  progressRows,
  projectStatus,
  initialTaskNo,
  initialTransitionId,
  allWorkerInstructions,
  onConfirmInstruction,
  onStart,
  onEnd,
  onForceEnd,
  onStatusChange,
  onSave,
}: WorkRecordPanelProps = {}) {
  // progressRows がある場合は resolveActiveTaskNo で自動決定される。フォールバック値 2 は未使用の保険値
  const ASSIGNED_TASK_NO = resolveActiveTaskNo(progressRows, 2);
  const { message, modal } = App.useApp();
  const [tasks, setTasks] = useState<WorkTask[]>([]);

  /**
   * getTemplateData の生レスポンス（TemplateDataItem[]）を保持する Ref。
   * taskNo__transitionId をキーとして保存し、保存時に placeId / data 構造を参照する。
   */
  const rawTemplateItemsRef = React.useRef<Map<string, TemplateDataItem[]>>(new Map());

  /**
   * 不確かさ入力値を保持する Ref。
   * キー: `${placeId}__${propKey}`  値: UncertaintyValueEntry[]
   * PropertyCard の addedValues 変化時に onUncertaintyValuesChange コールバック経由で更新され、
   * handleSave / handleSaveAndNext 時に saveBatchExperimentData へ渡す uncertaintyValues を構築する。
   */
  const uncertaintyValuesRef = React.useRef<Map<string, UncertaintyValueEntry[]>>(new Map());

  /**
   * 定性評価値を保持する Ref。
   * キー: `${templateId}__${propKey}`  値: { templateId, propKey, value }
   * PropertyCard の confidence ボタン選択時に onConfidenceChange コールバック経由で更新され、
   * handleSave / handleSaveAndNext 時に saveBatchExperimentData へ渡す qualitativeValues を構築する。
   */
  const confidenceValuesRef = React.useRef<Map<string, { templateId: string; propKey: string; value: string; description?: string | null }>>(new Map());

  /**
   * 直近の保存で得られた不確かさ判定結果マップ。
   * 保存後に setState するとレンダリングが発生するため Ref で管理し、
   * planProps 経由で PlanB → PropertyList → PropertyCard に渡す。
   */
  const [lastJudgeResultMap, setLastJudgeResultMap] = React.useState<Record<string, '良好' | '不良'>>({});

  /**
   * API から取得したトランジション定義（テンプレート・プロパティ情報）。
   * progressRows と API から構築する。
   * projectId / methodId / progressRows が揃っていない場合は空配列のまま。
   */
  const [apiTransitions, setApiTransitions] = useState<WorkTransition[]>([]);

  // ── API データから WorkTransition[] を構築する useEffect ──
  useEffect(() => {
    if (!projectId || !methodId || !progressRows || progressRows.length === 0) {
      setApiTransitions([]);
      return;
    }
    let cancelled = false;

    const buildTransitions = async () => {
      try {
        // tasks も progressRows に合わせて再構築（TaskTransitionState を同期）
        // 各 taskNo × transitionId の実績値と定義を getTemplateData API から取得する
        const uniqueTaskNos = Array.from(new Set(progressRows.map((r) => r.taskNo)));

        // taskNo × transitionId ごとの actuals と templates を並列取得
        // template_data は想定値・不確かさ・定性評価選択肢を含む JOIN 済みデータを返すため
        // getExperimentPlans / fetchUncertaintyCriteriaForSelector は不要
        const actualsMap = new Map<string, Record<string, ActualValue>>();
        // transitionId → WorkTemplate[] のマップ（代表タスク=ASSIGNED_TASK_NO のデータを優先して使用）
        const templatesMap = new Map<string, WorkTemplate[]>();

        const fetchActualsPromises = progressRows.map(async (row) => {
          const mapKey = `${row.taskNo}__${row.transitionId}`;
          try {
            const templateDataRes = await getTemplateData(
              projectId,
              methodId,
              row.taskNo,
              row.transitionId
            );
            if (cancelled) return;

            // ── テンプレート定義（プロパティカード）を構築 ──
            // getTemplateData が返す templates[].data.properties には
            // 想定値・不確かさ・定性評価選択肢がすべて含まれているため、
            // convertRawProperty() で直接 WorkProperty に変換できる
            const shouldOverwriteTemplates =
              !templatesMap.has(row.transitionId) || row.taskNo === ASSIGNED_TASK_NO;
            if (shouldOverwriteTemplates) {
              const builtTemplates: WorkTemplate[] = templateDataRes.data.templates
                .map((item, _tplIdx) => {
                  const rawProps = Array.isArray(item.data.properties)
                    ? (item.data.properties as Record<string, unknown>[])
                    : [];
                  const properties: WorkProperty[] = rawProps.map((prop) =>
                    convertRawProperty(prop)
                  );
                  const rawCategory = String(item.data.category ?? item.data.templateType ?? 'Conditions');
                  // バックエンドは小文字（'material'/'condition'/'result'）、
                  // 既存フォールバックは先頭大文字（'Materials'/'Conditions'/'Results'）の両形式が混在するため
                  // 両方に対応した正規化マッピングを行う
                  const normalizedCategory = rawCategory.toLowerCase();
                  const category: WorkTemplate['category'] =
                    (normalizedCategory === 'result'   || rawCategory === 'Results')  ? 'Results' :
                    (normalizedCategory === 'material' || rawCategory === 'Materials') ? 'Materials' : 'Conditions';
                  return {
                    id: String(item.placeId || `tpl-${row.transitionId}-${_tplIdx}`),
                    name: String(item.data.templateName ?? item.data.template_name ?? item.data.templateId ?? row.transitionId),
                    category,
                    properties,
                  };
                })
                .filter((tpl) => tpl.properties.length > 0);

              // テンプレートが1つも構築できなかった場合は最小テンプレートを生成
              if (builtTemplates.length === 0) {
                const matchedRow = progressRows.find((r) => r.transitionId === row.transitionId);
                builtTemplates.push({
                  id: `tpl-${row.transitionId}`,
                  name: matchedRow
                    ? `Transition ${matchedRow.taskNo}-${row.transitionId}`
                    : row.transitionId,
                  category: 'Conditions',
                  properties: [],
                });
              }
              templatesMap.set(row.transitionId, builtTemplates);
            }

            // ── 実績値を取得 ──
            const actualsFromApi: Record<string, ActualValue> = {};
            for (const item of templateDataRes.data.templates) {
              if (item.recordedBy !== null) {
                // DB実績あり: DB の値を実績として取り込む
                for (const [key, property] of Object.entries(item.data['properties'] as Record<string, unknown>)) {
                  // フォールバック形式のメタキーは除外
                  if (key === 'templateId' || key === 'templateType' || key === 'properties') continue;
                  actualsFromApi[(property as any).key] = (property as any).value;
                }
              }
            }
            // DB未記録のプロパティ: 同ループで組み立てた builtTemplates の WorkProperty.expected を初期値として使う。
            // 想定値は convertRawProperty() でフロントエンド側にすでに解決済みのため、
            // バックエンドへの追加取得は不要。
            const builtForThisTransition = templatesMap.get(row.transitionId) ?? [];
            for (const tpl of builtForThisTransition) {
              for (const wp of tpl.properties) {
                // DB実績で取得済みのキーは上書きしない
                if (actualsFromApi[wp.key] != null) continue;
                if (wp.expected != null) {
                  actualsFromApi[wp.key] = wp.expected;
                }
              }
            }
            actualsMap.set(mapKey, actualsFromApi);
            // ── 生データを ref に保存（保存時の placeId/data 構造参照用） ──
            rawTemplateItemsRef.current.set(mapKey, templateDataRes.data.templates);
          } catch {
            // 取得失敗時は空のまま（画面クラッシュを防ぐ）
            actualsMap.set(mapKey, {});
          }
        });
        await Promise.all(fetchActualsPromises);
        if (cancelled) return;

        // templatesMap から builtTransitions を構築して apiTransitions に反映
        const uniqueTransitionIds = Array.from(new Set(progressRows.map((r) => r.transitionId)));
        const builtTransitions: WorkTransition[] = uniqueTransitionIds.map((transitionId, idx) => ({
          id: transitionId,
          order: idx + 1,
          prerequisiteTransitionIds: [],
          methodId,
          templates: templatesMap.get(transitionId) ?? [],
        }));

        // uncertaintyValuesRef を DB の recordedValue で初期化する
        // ユーザーが操作しなくても handleSave 時に既存記録値が uncertaintyValues として送信されるようにする
        // 既にユーザーが操作して値が入っている場合（uncertaintyValuesRef.current.has）は上書きしない
        for (const [, builtTemplates] of templatesMap.entries()) {
          for (const tpl of builtTemplates) {
            const refKey = tpl.id;
            if (uncertaintyValuesRef.current.has(refKey)) continue;
            const entries: UncertaintyValueEntry[] = tpl.properties.flatMap((wp) =>
              (wp.quantitativeUncertainties ?? [])
                .filter((qu) => qu.recordedValue != null)
                .map((qu) => ({
                  propKey: wp.key,
                  uncertaintyKey: qu.uncertaintyKey,
                  value: String(qu.recordedValue),
                }))
            );
            if (entries.length > 0) {
              uncertaintyValuesRef.current.set(refKey, entries);
            }
          }
        }

        setApiTransitions(builtTransitions);

        setTasks((prev) => {
          const next: WorkTask[] = uniqueTaskNos.map((taskNo) => {
            const taskRows = progressRows.filter((r) => r.taskNo === taskNo);
            const transitions: TaskTransitionState[] = taskRows.map((row) => {
              const apiStatus: TransitionStatus = (() => {
                switch (row.status) {
                  case 'preparing':   return 'preparing';
                  case 'ready':       return 'ready';
                  case 'in_progress': return 'running';
                  case 'on_hold':     return 'paused';
                  case 'completed':   return 'completed';
                  case 'issue':       return 'error';
                  case 'not_started': return 'not_started';
                  default: return 'not_started';
                }
              })();
              // 既存の actuals（ユーザー入力済み）があれば優先し、
              // なければ API から取得した実績値を使用する
              const mapKey = `${row.taskNo}__${row.transitionId}`;
              const apiActuals = actualsMap.get(mapKey) ?? {};
              return {
                transitionId: row.transitionId,
                // API から取得した最新ステータスを常に反映する（状態プルダウン更新のため）
                status: apiStatus,
                actuals: apiActuals,
                customInsertionIds: [],
                customContentIds: [],
                customPropertyIds: [],
              };
            });
            return { taskNo, transitions };
          });
          return next;
        });
        setIsCorrectionMode(false);
      } catch (err) {
        console.error('[WorkRecordPanel] buildTransitions error:', err);
      }
    };

    buildTransitions();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, methodId, progressRows]);
  // initialTaskNo/initialTransitionId が両方指定されている場合は、初期表示でそのトランジションを表示する
  const [viewingKey, setViewingKey] = useState<{ taskNo: number; transitionId: string } | null>(
    initialTaskNo !== undefined && initialTransitionId !== undefined
      ? { taskNo: initialTaskNo, transitionId: initialTransitionId }
      : null
  );

  /** 訂正モード（isReadOnly 時に編集可能にするフラグ） */
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const [correctionLoading, setCorrectionLoading] = useState(false);

  // viewingKey が変化したら訂正モードをリセット
  useEffect(() => {
    setIsCorrectionMode(false);
  }, [viewingKey]);
  // 進捗確認タブの「記録」ボタン押下で initialTaskNo/initialTransitionId が変化した際に
  // viewingKey を更新して、押下した行のトランジション情報を実験記録タブで表示する
  useEffect(() => {
    if (initialTaskNo !== undefined && initialTransitionId !== undefined) {
      setViewingKey({ taskNo: initialTaskNo, transitionId: initialTransitionId });
    }
  }, [initialTaskNo, initialTransitionId]);

  /**
   * 終了/異常終了ボタン押下後に画面をロックするキー。
   * progressRows が更新されて activeEntry が変わっても、このキーが設定されている間は
   * PlanB の displayKey がこのキーに固定され、自動遷移を防ぐ。
   * 「次へ」ボタン押下（handleSaveAndNext 完了）後にクリアされる。
   */
  const [pendingEndKey, setPendingEndKey] = useState<{ taskNo: number; transitionId: string } | null>(null);

  /**
   * プロパティカード未保存フラグ。
   * handleActualChange が呼ばれると true になり、handleSave 完了後または
   * pendingEndKey/viewingKey が変わった際に false にリセットされる。
   * 「次へ」押下時に true であれば未保存警告ダイアログを表示する。
   */
  const [isDirty, setIsDirty] = useState(false);

  // pendingEndKey または viewingKey が変わったら isDirty をリセット
  useEffect(() => {
    setIsDirty(false);
  }, [pendingEndKey, viewingKey]);

  // ── 不確かさ基準選択肢を API から取得して uncertaintyOptionsCache に格納 ──
  useEffect(() => {
    let cancelled = false;
    const fetchCriteria = async () => {
      try {
        const result = await fetchUncertaintyCriteriaForSelector();
        if (cancelled) return;
        uncertaintyOptionsCache = result.map((c) => ({
          value: c.key,
          label: c.name,
        }));
      } catch (err) {
        console.error('[WorkRecordPanel] uncertainty criteria fetch error:', err);
      }
    };
    fetchCriteria();
    return () => { cancelled = true; };
  }, []);

  // ── Creator / Instrument 選択肢・選択値 ──
  const [creatorRefOptions, setCreatorRefOptions] = useState<RefOption[]>([]);
  const [instrumentRefOptions, setInstrumentRefOptions] = useState<RefOption[]>([]);
  const [selectedCreatorRef, setSelectedCreatorRef] = useState<string | null>(null);
  const [selectedInstrumentRef, setSelectedInstrumentRef] = useState<string | null>(null);

  // ── ペトリネットビューア ──
  const [viewerDialogs, setViewerDialogs] = useState<{
    id: string;
    file: FileData;
    fileContent: string | null;
    zIndex: number;
  }[]>([]);
  const [petriNetViewerLoading, setPetriNetViewerLoading] = useState(false);

  const handleActualChange = useCallback(
    (taskNo: number, transitionId: string, propKey: string, value: ActualValue) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, actuals: { ...tt.actuals, [propKey]: value } };
            }),
          };
        })
      );
      // プロパティ値が変更されたら未保存フラグを立てる
      setIsDirty(true);
    },
    []
  );

  const { t } = useLanguage();

  /** 各 InsertionEditorCompact の uploadPendingFile を一元管理する Map */
  const uploadFnMapRef = React.useRef<Map<string, () => Promise<void>>>(new Map());

  /** 全 pending Insertion ファイルをアップロードする（保存前に呼び出す） */
  const uploadAllPendingInsertions = useCallback(async () => {
    for (const fn of uploadFnMapRef.current.values()) {
      await fn();
    }
  }, []);

  /** Insertion の uploadPendingFile 登録コールバック */
  const handleInsertionUploadReady = useCallback((key: string, fn: () => Promise<void>) => {
    uploadFnMapRef.current.set(key, fn);
  }, []);

  // ── ペトリネットビューアハンドラ ──
  const handleOpenPetriNetViewer = useCallback(async () => {
    if (!projectId) return;
    setPetriNetViewerLoading(true);
    try {
      const result = await getProjectMaiml(projectId);
      if (!result.success || !result.data?.maimlContent) {
        modal.error({ title: t('experimentInstruction.fetchError') });
        return;
      }
      const { maimlContent, projectName: resolvedName, lastModified } = result.data;
      const file: FileData = {
        id: projectId,
        name: `${resolvedName}.maiml`,
        path: `projects/${resolvedName}/${resolvedName}.maiml`,
        size: maimlContent.length,
        lastModified: lastModified || new Date().toISOString(),
        type: 'maiml',
      };
      setViewerDialogs((prev) => [
        ...prev,
        { id: `viewer_${Date.now()}`, file, fileContent: maimlContent, zIndex: 1000 + prev.length },
      ]);
    } catch (err) {
      console.error('[WorkRecordPanel] handleOpenPetriNetViewer error:', err);
      modal.error({ title: t('experimentInstruction.fetchError') });
    } finally {
      setPetriNetViewerLoading(false);
    }
  }, [projectId, t]);

  const handleCloseViewer = useCallback((id: string) => {
    setViewerDialogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleFocusViewer = useCallback((id: string) => {
    setViewerDialogs((prev) => {
      const maxZ = Math.max(...prev.map((d) => d.zIndex), 999);
      return prev.map((d) => (d.id === id ? { ...d, zIndex: maxZ + 1 } : d));
    });
  }, []);

  // ── Creator / Instrument 選択肢・初期値の API 取得 ──
  // projectId と methodId が揃ったタイミングで選択肢と初期値を取得する。
  // 選択肢: getPlanDialogData（MAIMLのdocument.creators/instruments から生成）
  // 初期値: getExperimentPlans（ExperimentPlanDialogで保存済みの __task__.creatorRefs[0] 等）
  useEffect(() => {
    if (!projectId || !methodId) return;
    let cancelled = false;

    const fetchRefData = async () => {
      try {
        // 選択肢取得
        const planDialogData = await getPlanDialogData(projectId, methodId);
        if (cancelled) return;
        setCreatorRefOptions(planDialogData.creatorRefs ?? []);
        setInstrumentRefOptions(planDialogData.instrumentRefs ?? []);

        // 初期値取得
        const plansResult = await getExperimentPlans(projectId, methodId);
        if (cancelled) return;
        if (plansResult?.plans && plansResult.plans.length > 0) {
          // ASSIGNED_TASK_NO のタスク、なければ先頭タスクの __task__ を参照
          const targetPlan =
            plansResult.plans.find((p) => p.taskNo === ASSIGNED_TASK_NO) ??
            plansResult.plans[0];
          if (targetPlan?.plannedValues) {
            for (const transValues of Object.values(targetPlan.plannedValues)) {
              const rawTask = (transValues as Record<string, unknown>)?.['__task__'];
              if (rawTask && typeof rawTask === 'object' && !Array.isArray(rawTask)) {
                const taskMeta = rawTask as Record<string, unknown>;
                if (Array.isArray(taskMeta.creatorRefs) && taskMeta.creatorRefs.length > 0) {
                  setSelectedCreatorRef(taskMeta.creatorRefs[0] as string);
                }
                if (Array.isArray(taskMeta.instrumentRefs) && taskMeta.instrumentRefs.length > 0) {
                  setSelectedInstrumentRef(taskMeta.instrumentRefs[0] as string);
                }
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('[WorkRecordPanel] Creator/Instrument fetch error:', err);
      }
    };

    fetchRefData();
    return () => { cancelled = true; };
  }, [projectId, methodId]);

  /**
   * 訂正保存処理
   * viewingKey のトランジションに対して correctRecord API を呼び出す。
   * actuals の現在の入力値を rawTemplateItemsRef のプロパティ構造に反映して送信。
   */
  const handleSaveCorrection = useCallback(async () => {
    if (!viewingKey || !projectId || !methodId) return;
    const { taskNo, transitionId } = viewingKey;
    const mapKey = `${taskNo}__${transitionId}`;
    const rawItems = rawTemplateItemsRef.current.get(mapKey) ?? [];
    if (rawItems.length === 0) {
      message.warning('訂正対象のデータが見つかりません');
      return;
    }

    const task = tasks.find((t) => t.taskNo === taskNo);
    const taskTransition = task?.transitions.find((tt) => tt.transitionId === transitionId);

    // ── 定性評価の必須バリデーション ──
    // rawTemplateItemsRef の該当トランジションのプロパティに qualitativeOptions が
    // 1件でも存在する場合、confidenceValuesRef にエントリが1件もなければエラーにする
    const hasQualitativeProps = rawItems.some((item) => {
      const props = (item.data?.properties ?? []) as Array<Record<string, unknown>>;
      return props.some((p) => {
        const opts = p.qualitativeOptions as Array<unknown> | null | undefined;
        return Array.isArray(opts) && opts.length > 0;
      });
    });
    if (hasQualitativeProps && confidenceValuesRef.current.size === 0) {
      message.error(t('workRecord.correctionQualitativeRequired'));
      return;
    }

    setCorrectionLoading(true);
    try {
      const records = rawItems.map((item) => {
        const baseData: Record<string, unknown> = item.data ? JSON.parse(JSON.stringify(item.data)) : {};
        // actuals の値で対応するプロパティを上書き
        if (taskTransition?.actuals && Array.isArray(baseData.properties)) {
          (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
            if (p.isCustomProperty === true) return;
            const propKey = String(p.key ?? '');
            if (propKey in taskTransition.actuals) {
              p.value = taskTransition.actuals[propKey] ?? null;
            }
          });
        }
        return {
          placeId: item.placeId,
          data: {
            templateId: item.templateId,
            templateType: item.templateType,
            properties: Array.isArray(baseData.properties) ? baseData.properties : [],
          },
        };
      });
      const requestBody = { records };
      await correctRecord(projectId, methodId, taskNo, requestBody);
      message.success(t('workRecord.correctionSaved'));
      setIsCorrectionMode(false);
    } catch (err) {
      console.error('[WorkRecordPanel] handleSaveCorrection error:', err);
      message.error(t('workRecord.correctionError'));
    } finally {
      setCorrectionLoading(false);
    }
  }, [viewingKey, projectId, methodId, tasks, message, t]);

  const handleSave = useCallback(async (taskNo: number, transitionId: string) => {
    try {
      await uploadAllPendingInsertions();
    } catch {
      message.error(t('insertionEditor.uploadFailed'));
      return;
    }

    // API 呼び出しに必要なパラメータが揃っていない場合はモック成功表示のみ
    if (!projectId || !methodId) {
      modal.success({ title: t('workRecord.saveSuccess'), content: t('workRecord.saveContent') });
      setIsDirty(false);
      return;
    }

    const mapKey = `${taskNo}__${transitionId}`;
    const rawItems = rawTemplateItemsRef.current.get(mapKey) ?? [];
    const task = tasks.find((t) => t.taskNo === taskNo);
    const taskTransition = task?.transitions.find((tt) => tt.transitionId === transitionId);

    if (rawItems.length === 0) {
      // 生データなし: 成功メッセージのみ
      modal.success({ title: t('workRecord.saveSuccess'), content: t('workRecord.saveContent') });
      setIsDirty(false);
      onSave?.();
      return;
    }

    try {
      const records: ExperimentDataRecord[] = rawItems.map((item) => {
        const baseData: Record<string, unknown> = item.data ? JSON.parse(JSON.stringify(item.data)) : {};
        // actuals の値で対応するプロパティを上書きする
        if (taskTransition?.actuals) {
          if (Array.isArray(baseData.properties)) {
            (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
              if (p.isCustomProperty === true) return;
              const propKey = String(p.key ?? '');
              if (propKey in taskTransition.actuals) {
                p.value = taskTransition.actuals[propKey] ?? null;
              }
            });
          }
        }
        // 定性評価選択値・定性評価理由を対応する uncertainty[].value / description に書き込む
        // ※ 定量評価（toleranceValues に含まれるキー）には書き込まない
        if (Array.isArray(baseData.properties)) {
          (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
            if (p.isCustomProperty === true) return;
            const propKey = String(p.key ?? '');
            const confidenceEntry = confidenceValuesRef.current.get(`${item.templateId}__${propKey}`);
            // 定量評価キーのセットを構築（toleranceValues に含まれるキー = 定量）
            const quantitativeKeys = new Set(
              (p['toleranceValues'] as Array<{ uncertaintyKey: string }> | null)
                ?.map((tv) => tv.uncertaintyKey) ?? []
            );
            if (Array.isArray(p.uncertainty) && p.uncertainty.length > 0) {
              (p.uncertainty as Array<Record<string, unknown>>).forEach((unc) => {
                const ucKey = unc['key'] as string | undefined;
                // 定量評価キーはスキップ（定性評価のキーのみ書き込む）
                if (!ucKey || quantitativeKeys.has(ucKey)) return;
                // 定性評価選択値を書き込む
                if (confidenceEntry?.value) {
                  unc.value = confidenceEntry.value;
                }
                // 定性評価理由を書き込む
                if (confidenceEntry?.description) {
                  unc.description = confidenceEntry.description;
                }
              });
            }
            // フラットフィールドも同期して上書きする
            // （rawTemplateItemsRef は保存後に更新されないため、古い値が残らないよう明示的に更新）
            if (confidenceEntry?.value) {
              p['qualitativeEval'] = confidenceEntry.value;
            }
            if (confidenceEntry?.description != null) {
              p['qualitativeReason'] = confidenceEntry.description;
            } else if (confidenceEntry !== undefined) {
              // エントリは存在するが description が null/undefined の場合はクリア
              p['qualitativeReason'] = null;
            }
          });
        }
        return {
          placeId: item.placeId,
          templateType: item.templateType,
          templateId: item.templateId,
          data: baseData,
        };
      });

      // uncertaintyValues: Ref から構築（uncertaintyKey・value が揃っているもののみ送信）
      const uncertaintyValues = Array.from(uncertaintyValuesRef.current.entries()).flatMap(
        ([key, entries]) => {
          const templateId = key.split('__')[0];
          return entries
            .filter((e) => e.uncertaintyKey && e.value && !isNaN(Number(e.value)))
            .map((e) => ({
              propertyKey:    e.propKey,
              templateId,
              uncertaintyKey: e.uncertaintyKey,
              value:          Number(e.value),
            }));
        }
      );

      // qualitativeValues: confidenceValuesRef から構築（value 空文字の理由のみエントリは除外）
      const qualitativeValues = Array.from(confidenceValuesRef.current.values()).filter((qv) => qv.value !== '');

      const res = await saveBatchExperimentData(projectId, methodId, taskNo, {
        records,
        transitionId,
        ...(uncertaintyValues.length > 0 ? { uncertaintyValues } : {}),
        ...(qualitativeValues.length > 0 ? { qualitativeValues } : {}),
      });
      // 判定結果をバッジ表示用 state に反映
      if (res.data.judgeResults && res.data.judgeResults.length > 0) {
        const newMap: Record<string, '良好' | '不良'> = {};
        for (const jr of res.data.judgeResults) {
          newMap[jr.uncertaintyKey] = jr.judgeResult;
        }
        setLastJudgeResultMap(newMap);
      }
      modal.success({ title: t('workRecord.saveSuccess'), content: t('workRecord.saveContent') });
      // 保存成功後に未保存フラグをリセット
      setIsDirty(false);
      // 保存成功後: apiTransitions の WorkProperty を confidenceValuesRef の現在値で更新する
      // これにより PropertyCard が再マウントされた際も定性評価選択・定性評価理由が保持される
      setApiTransitions((prevTransitions) =>
        prevTransitions.map((transition) => ({
          ...transition,
          templates: transition.templates.map((template) => ({
            ...template,
            properties: template.properties.map((prop) => {
              const refKey = `${template.id}__${prop.key}`;
              const entry = confidenceValuesRef.current.get(refKey);
              if (!entry) return prop;
              return {
                ...prop,
                ...(entry.value !== '' ? { defaultConfidence: entry.value } : {}),
                ...(entry.description != null ? { qualitativeReason: entry.description } : {}),
              };
            }),
          })),
        }))
      );
      onSave?.();
    } catch (err) {
      console.error('[WorkRecordPanel] handleSave error:', err);
      message.error(t('workRecord.saveContent'));
    }
  }, [projectId, methodId, tasks, t, uploadAllPendingInsertions, setApiTransitions, onSave]);

  // ─── スキップ state ────────────────────────────────────────
  const [skippedTransitionIds, setSkippedTransitionIds] = useState<string[]>([]);

  const handleSaveAndNext = useCallback(
    (taskNo: number, transitionId: string) => {
      // 「次へ」の責務は次のトランジションへの移動のみ。
      // 保存は「保存」ボタン、ステータス変更は WorkHeader「終了」ボタンが担う。
      // canGoNext 条件（completed && isRecorded && hasNextTransition）が満たされた場合のみ呼ばれる。
      void taskNo;
      void transitionId;
      setViewingKey(null);
      setPendingEndKey(null);
      setIsDirty(false);
    },
    [setIsDirty]
  );

  const handleSkip = useCallback(
    (taskNo: number, transitionId: string) => {
      // スキップリストに追加
      setSkippedTransitionIds((prev) =>
        prev.includes(transitionId) ? prev : [...prev, transitionId]
      );

      // 次の実行可能なトランジションを検索
      const next = findNextAvailableTransition(
        taskNo,
        transitionId,
        [...skippedTransitionIds, transitionId], // 今追加したものも含めて検索
        tasks
      );

      if (next) {
        // 次のトランジションが見つかったら viewingKey をリセット（activeEntry で自動選択）
        setViewingKey(null);
        modal.info({
          title: t('workRecord.skipDone'),
          content: (
            <span>
              {t('workRecord.nextWork')}: <Text code style={{ fontSize: 11 }}>{next.transitionId}</Text>
            </span>
          ),
        });
      } else {
        // スキップできる次のトランジションなし → 進捗確認タブへの誘導メッセージ
        setViewingKey(null);
        modal.warning({
          title: t('workRecord.skipNoTarget'),
          content: t('workRecord.skipNoTargetContent'),
        });
      }
    },
    [skippedTransitionIds, tasks]
  );

  // ─── カスタムInsertion追加/削除 ───────────────────────────
  const handleInsertionAdd = useCallback(
    (taskNo: number, transitionId: string) => {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, customInsertionIds: [...tt.customInsertionIds, newId] };
            }),
          };
        })
      );
    },
    []
  );

  const handleInsertionRemove = useCallback(
    (taskNo: number, transitionId: string, insertionId: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              const nextActuals = { ...tt.actuals };
              delete nextActuals[`insertion_custom_${insertionId}`];
              return {
                ...tt,
                customInsertionIds: tt.customInsertionIds.filter((id) => id !== insertionId),
                actuals: nextActuals,
              };
            }),
          };
        })
      );
    },
    []
  );

  // ─── カスタムContent追加/削除 ────────────────────────────
  const handleContentAdd = useCallback(
    (taskNo: number, transitionId: string) => {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, customContentIds: [...tt.customContentIds, newId] };
            }),
          };
        })
      );
    },
    []
  );

  const handleContentRemove = useCallback(
    (taskNo: number, transitionId: string, contentId: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              const nextActuals = { ...tt.actuals };
              delete nextActuals[`content_custom_${contentId}`];
              return {
                ...tt,
                customContentIds: tt.customContentIds.filter((id) => id !== contentId),
                actuals: nextActuals,
              };
            }),
          };
        })
      );
    },
    []
  );

  // ─── カスタムProperty追加/削除 ───────────────────────────
  const handlePropertyAdd = useCallback(
    (taskNo: number, transitionId: string) => {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, customPropertyIds: [...tt.customPropertyIds, newId] };
            }),
          };
        })
      );
    },
    []
  );

  const handlePropertyRemove = useCallback(
    (taskNo: number, transitionId: string, propertyId: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              const nextActuals = { ...tt.actuals };
              delete nextActuals[`property_custom_${propertyId}`];
              return {
                ...tt,
                customPropertyIds: tt.customPropertyIds.filter((id) => id !== propertyId),
                actuals: nextActuals,
              };
            }),
          };
        })
      );
    },
    []
  );

  // ─── 状態記録ダイアログ用 state ──────────────────────────
  const [stateRecordDialogOpen, setStateRecordDialogOpen] = useState(false);
  const [stateRecordLoading, setStateRecordLoading] = useState(false);

  /** 固定行の状態遷移時刻（各状態ごとに DatePicker 値を管理） */
  const [srPreparingTime,  setSrPreparingTime]  = useState<string>('');
  const [srReadyTime,      setSrReadyTime]       = useState<string>('');
  const [srRunningTime,    setSrRunningTime]     = useState<string>('');
  const [srCompletedTime,  setSrCompletedTime]   = useState<string>('');
  const [srErrorTime,      setSrErrorTime]       = useState<string>('');

  interface PauseEntry {
    id: string;
    /** 休止状態の状態遷移時刻 */
    pauseTime: string;
    /** 再開（動作状態）の状態遷移時刻 */
    resumeTime: string;
  }
  const [srPauseEntries, setSrPauseEntries] = useState<PauseEntry[]>([]);

  const handleStateRecordClose = useCallback(() => {
    setStateRecordDialogOpen(false);
    setSrPreparingTime('');
    setSrReadyTime('');
    setSrRunningTime('');
    setSrCompletedTime('');
    setSrErrorTime('');
    setSrPauseEntries([]);
  }, []);

  const handleStateRecordSave = useCallback(() => {
    // ── バリデーション ──────────────────────────────────────
    // ⑦ completedTime と errorTime の同時入力チェック
    if (srCompletedTime && srErrorTime) {
      message.error(t('workRecord.srValidationCompletedAndError'));
      return;
    }

    // ① 準備状態 < 準備完了状態
    if (srPreparingTime && srReadyTime && !dayjs(srPreparingTime).isBefore(dayjs(srReadyTime))) {
      message.error(t('workRecord.srValidationPrepVsReady'));
      return;
    }

    // ② 準備完了状態 < 動作状態
    if (srReadyTime && srRunningTime && !dayjs(srReadyTime).isBefore(dayjs(srRunningTime))) {
      message.error(t('workRecord.srValidationReadyVsRunning'));
      return;
    }

    // ③④⑤ 休止・再開ペアの順序チェック
    // lastResumeTime: 「動作状態」または「最後の動作再開」の時刻（比較の基準点）
    let lastResumeTime: string = srRunningTime;
    for (const pe of srPauseEntries) {
      // ③ 前の動作状態（or 再開）< 休止状態
      if (lastResumeTime && pe.pauseTime && !dayjs(lastResumeTime).isBefore(dayjs(pe.pauseTime))) {
        message.error(t('workRecord.srValidationRunningVsPause'));
        return;
      }
      // ④ 休止状態 < 動作再開
      if (pe.pauseTime && pe.resumeTime && !dayjs(pe.pauseTime).isBefore(dayjs(pe.resumeTime))) {
        message.error(t('workRecord.srValidationPauseVsResume'));
        return;
      }
      // ⑤ 連続する休止ペア間（resumeTime が次の pauseTime より前）は次ループの③で自動チェック
      if (pe.resumeTime) lastResumeTime = pe.resumeTime;
    }

    // ⑥-a 動作状態（最後の再開を含む）< 終状態
    if (lastResumeTime && srCompletedTime && !dayjs(lastResumeTime).isBefore(dayjs(srCompletedTime))) {
      message.error(t('workRecord.srValidationRunningVsCompleted'));
      return;
    }

    // ⑥-b 動作状態（最後の再開を含む）< 異常終了状態
    if (lastResumeTime && srErrorTime && !dayjs(lastResumeTime).isBefore(dayjs(srErrorTime))) {
      message.error(t('workRecord.srValidationRunningVsError'));
      return;
    }
    // ─────────────────────────────────────────────────────────

    const saveData = {
      preparingTime: srPreparingTime,
      readyTime: srReadyTime,
      runningTime: srRunningTime,
      pauseEntries: srPauseEntries,
      completedTime: srCompletedTime,
      errorTime: srErrorTime,
    };
    console.info('[WorkRecordPanel] 状態記録保存（モック）:', saveData);
    modal.success({ title: t('workRecord.stateRecordSaved') });
    // 保存時はダイアログを閉じるのみ（state はリセットしない）
    // キャンセル時（handleStateRecordClose）のみ state をリセットする
    setStateRecordDialogOpen(false);
  }, [srPreparingTime, srReadyTime, srRunningTime, srPauseEntries, srCompletedTime, srErrorTime, t]);

  // ─── コメントダイアログ用 state ───────────────────────────
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  // コメント保存ハンドラ
  // commentTarget は後続の useMemo で宣言されるため、
  // ここでは projectId / methodId のみを依存に取り、
  // commentTarget は呼び出し時に引数として渡す方式にする。
  const handleSaveComment = useCallback(async (
    comment: string,
    taskNo: number,
    transitionId: string
  ) => {
    if (!projectId || !methodId) {
      console.warn('[WorkRecordPanel] コメント保存: projectId / methodId が未設定');
      return;
    }
    const commentRequest = {
      taskNo,
      comment,
    };
    try {
      await saveTransitionComment(
        projectId,
        methodId,
        transitionId,
        commentRequest
      );
      modal.success({ title: t('workRecord.commentSaved'), content: comment });
    } catch {
      message.error(t('workRecord.commentSaveError'));
    }
  }, [projectId, methodId, t]);
  // コメントダイアログに渡す displayKey（現在表示中のキー）
  // progressRows (API データ) から in_progress / started なトランジションを優先使用する。
  // モック ORDERED_TRANSITION_IDS との不一致により常に null になっていた問題を修正。
  const activeEntry = useMemo(() => {
    // progressRows がある場合: API の実トランジションIDを使用
    if (progressRows && progressRows.length > 0) {
      // まず ASSIGNED_TASK_NO のタスクで in_progress/ready/preparing を探す
      const activeRow = progressRows.find(
        (r) => r.taskNo === ASSIGNED_TASK_NO && (r.status === 'in_progress' || r.status === 'ready' || r.status === 'preparing')
      ) ?? progressRows.find(
        // 見つからない場合はタスクNoに関わらず最初の作業中トランジションを使用
        (r) => r.status === 'in_progress' || r.status === 'ready' || r.status === 'preparing'
      );
      if (activeRow) {
        return { taskNo: activeRow.taskNo, transitionId: activeRow.transitionId };
      }
      // 全て完了済みの場合は null（「全トランジション完了」Alert を表示）
      return { taskNo: progressRows[0].taskNo, transitionId: progressRows[0].transitionId };
    }
    // progressRows が空の場合: task.transitions の順序でフォールバック
    const task = tasks.find((t) => t.taskNo === ASSIGNED_TASK_NO);
    if (!task) return null;
    for (const tt of task.transitions) {
      if (tt.status !== 'completed' && tt.status !== 'error') return { taskNo: ASSIGNED_TASK_NO, transitionId: tt.transitionId };
    }
    return null;
  }, [progressRows, tasks, ASSIGNED_TASK_NO]);

  // displayKey の優先順位:
  // 1. viewingKey（別タブから遷移してきた指定トランジション）
  // 2. pendingEndKey（終了/異常終了ボタン押下後のロック）
  // 3. activeEntry（通常の作業中トランジション）
  const displayKey = viewingKey ?? pendingEndKey ?? activeEntry;

  // displayKey に対応する progressRow を取得（isReadOnly・isErrorStatus・ボタン活性制御に使用）
  const displayKeyRow = progressRows?.find(
    (r) => displayKey !== null && r.taskNo === displayKey.taskNo && r.transitionId === displayKey.transitionId
  );
  const isErrorStatus = displayKeyRow?.status === 'issue';

  // データ入力エリアの読み取り専用フラグ
  // - isRecorded === true（記録済み）かつ訂正モードでない場合: 読み取り専用
  // - isRecorded === true かつ status === 'issue'（異常終了）: 訂正モードでも読み取り専用
  const isReadOnly = displayKeyRow?.isRecorded === true && (isErrorStatus || !isCorrectionMode);

  const planProps: PlanProps = {
    tasks,
    activeTaskNo: ASSIGNED_TASK_NO,
    viewingKey,
    skippedTransitionIds,
    instructions: (() => {
      if (!allWorkerInstructions || allWorkerInstructions.length === 0) return [];

      // 現在表示中のトランジション情報を特定する
      // viewingKey（閲覧中）または progressRows から activeEntry を解決する
      const activeEntry = viewingKey ?? (() => {
        const activeRow =
          progressRows?.find((r) => r.taskNo === ASSIGNED_TASK_NO && (r.status === 'in_progress' || r.status === 'ready' || r.status === 'preparing')) ??
          progressRows?.find((r) => r.status === 'in_progress' || r.status === 'ready' || r.status === 'preparing');
        if (!activeRow) return null;
        return { taskNo: activeRow.taskNo, transitionId: activeRow.transitionId };
      })();

      // アクティブなトランジションに対応する methodId / taskNo / transitionId を特定
      const activeMethodId = methodId;
      const activeTaskNo = activeEntry?.taskNo ?? null;
      const activeTransitionId = activeEntry?.transitionId ?? null;

      return allWorkerInstructions.filter((inst) => {
        // 全体指示（methodId も transitionId も未設定）
        if (!inst.methodId && !inst.transitionId) return true;

        // メソッド指示（methodId 一致・transitionId なし・taskId なし）
        if (inst.methodId && !inst.transitionId && !inst.taskId && activeMethodId) {
          return inst.methodId === activeMethodId;
        }

        // タスク指示（methodId 一致・taskId あり）
        if (inst.methodId && inst.taskId && activeMethodId && activeTaskNo !== null) {
          return inst.methodId === activeMethodId && inst.taskId.endsWith(`-${activeTaskNo}`);
        }

        // トランジション指示（transitionId 一致）
        if (inst.transitionId && activeTransitionId) {
          return inst.transitionId === activeTransitionId;
        }

        return false;
      });
    })(),
    onActualChange: handleActualChange,
    onSave: handleSave,
    onSaveAndNext: handleSaveAndNext,
    onClearViewing: () => setViewingKey(null),
    onSkip: handleSkip,
    onCommentClick: () => setCommentDialogOpen(true),
    onInsertionAdd: handleInsertionAdd,
    onInsertionRemove: handleInsertionRemove,
    onContentAdd: handleContentAdd,
    onContentRemove: handleContentRemove,
    onPropertyAdd: handlePropertyAdd,
    onPropertyRemove: handlePropertyRemove,
    uploadTargetPath: projectName ? `projects/${projectName}/attachments` : undefined,
    onOpenViewer: projectId ? handleOpenPetriNetViewer : undefined,
    viewerLoading: petriNetViewerLoading,
    progressRows,
    apiTransitions,
    creatorRefOptions,
    instrumentRefOptions,
    selectedCreatorRef,
    selectedInstrumentRef,
    onCreatorRefChange: setSelectedCreatorRef,
    onInstrumentRefChange: setSelectedInstrumentRef,
    onInsertionUploadReady: handleInsertionUploadReady,
    onConfirmInstruction,
    onStart,
    onEnd,
    onForceEnd,
    onStatusChange,
    pendingEndKey,
    onSetPendingEndKey: (key) => setPendingEndKey(key),
    onStateRecord: async () => {
      // 表示中トランジション（displayKey 優先）のIDを取得
      const targetEntry = displayKey;
      if (!projectId || !methodId || !targetEntry) {
        setStateRecordDialogOpen(true);
        return;
      }
      setStateRecordLoading(true);
      try {
        const records = await getTransitionStateRecords(
          projectId,
          methodId,
          targetEntry.transitionId
        );
        // 取得した遷移時刻を各 state に反映
        // null の場合は既存 state を維持（前回保存した入力値を上書きしない）
        if (records.preparingTime !== null) setSrPreparingTime(records.preparingTime);
        if (records.readyTime !== null) setSrReadyTime(records.readyTime);
        if (records.runningTime !== null) setSrRunningTime(records.runningTime);
        if (records.completedTime !== null) setSrCompletedTime(records.completedTime);
        if (records.errorTime !== null) setSrErrorTime(records.errorTime);
        // pauseEntries は API から取得できた分のみ反映（空配列の場合は既存 state を維持）
        if (records.pauseEntries.length > 0) {
          setSrPauseEntries(
            records.pauseEntries.map((pe) => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              pauseTime: pe.pauseTime ?? '',
              resumeTime: pe.resumeTime ?? '',
            }))
          );
        }
      } catch {
        message.error(t('workRecord.stateRecordLoadError'));
        // エラー時は空欄のままダイアログを開く
      } finally {
        setStateRecordLoading(false);
      }
      setStateRecordDialogOpen(true);
    },
    onUncertaintyValuesChange: (placeId: string, entries: UncertaintyValueEntry[]) => {
      // PropertyCard の addedValues が変化するたびに Ref を更新する
      // キーは placeId（template.id）。entries が空の場合はキーを削除
      if (entries.length === 0) {
        uncertaintyValuesRef.current.delete(placeId);
      } else {
        uncertaintyValuesRef.current.set(placeId, entries);
      }
    },
    onConfidenceChange: (templateId: string, propKey: string, value: string | null) => {
      // PropertyCard の confidence 選択が変化するたびに Ref を更新する
      // キーは `${templateId}__${propKey}`
      const key = `${templateId}__${propKey}`;
      if (value === null) {
        confidenceValuesRef.current.delete(key);
      } else {
        const existing = confidenceValuesRef.current.get(key);
        confidenceValuesRef.current.set(key, { templateId, propKey, value, description: existing?.description ?? null });
      }
    },
    onQualitativeReasonChange: (templateId: string, propKey: string, value: string | null) => {
      const key = `${templateId}__${propKey}`;
      const existing = confidenceValuesRef.current.get(key);
      if (existing) {
        confidenceValuesRef.current.set(key, { ...existing, description: value ?? null });
      } else if (value !== null) {
        confidenceValuesRef.current.set(key, { templateId, propKey, value: '', description: value });
      }
    },
    lastJudgeResultMap,
    projectStatus,
    isCorrectionMode,
    onEnterCorrectionMode: () => setIsCorrectionMode(true),
    onCancelCorrectionMode: () => setIsCorrectionMode(false),
    correctionLoading,
    onSaveCorrection: handleSaveCorrection,
    // 本体で一元計算して渡す（PlanB 内の二重計算を解消）
    activeEntry,
    displayKey,
    isReadOnly,
    isErrorStatus,
    // テンプレート切替後も入力値を保持するためのコールバック
    // PropertyCard 再マウント時に confidenceValuesRef / uncertaintyValuesRef から初期値を復元する
    onGetInitialConfidence: (placeId: string, propKey: string) => {
      const key = `${placeId}__${propKey}`;
      const entry = confidenceValuesRef.current.get(key);
      return {
        confidence: entry?.value ?? null,
        qualitativeReason: entry?.description ?? undefined,
      };
    },
    onGetInitialUncertaintyValues: (placeId: string, propKey: string): UncertaintyValueEntry[] => {
      const key = `${placeId}__${propKey}`;
      return uncertaintyValuesRef.current.get(key) ?? [];
    },
  };

  const commentTarget = viewingKey ?? activeEntry;

  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <PlanB {...planProps} />

      {/* 状態記録ダイアログ */}
      <Modal
        open={stateRecordDialogOpen}
        title={t('workRecord.stateRecordDialogTitle')}
        onCancel={handleStateRecordClose}
        onOk={handleStateRecordSave}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={stateRecordLoading}
        width={520}
      >
        <Flex vertical gap={0} style={{ marginTop: 8 }}>
          {/* ── 固定行: 準備状態 ── */}
          <Row align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={8}>
              <Tag color="cyan" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                {t('workRecord.srStatusPreparing')}
              </Tag>
            </Col>
            <Col span={16}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                {t('workRecord.srTransitionTime')}
              </Text>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder={t('workRecord.srTransitionTime')}
                value={srPreparingTime ? dayjs(srPreparingTime) : undefined}
                onChange={(_, ds) => setSrPreparingTime(typeof ds === 'string' ? ds : '')}
              />
            </Col>
          </Row>

          {/* ── 固定行: 準備完了状態 ── */}
          <Row align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={8}>
              <Tag color="blue" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                {t('workRecord.srStatusReady')}
              </Tag>
            </Col>
            <Col span={16}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                {t('workRecord.srTransitionTime')}
              </Text>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder={t('workRecord.srTransitionTime')}
                value={srReadyTime ? dayjs(srReadyTime) : undefined}
                onChange={(_, ds) => setSrReadyTime(typeof ds === 'string' ? ds : '')}
              />
            </Col>
          </Row>

          {/* ── 固定行: 動作状態（+ 休止状態記録追加ボタン付き） ── */}
          <Row align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={8}>
              <Tag color="processing" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                {t('workRecord.srStatusRunning')}
              </Tag>
            </Col>
            <Col span={16}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                {t('workRecord.srTransitionTime')}
              </Text>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder={t('workRecord.srTransitionTime')}
                value={srRunningTime ? dayjs(srRunningTime) : undefined}
                onChange={(_, ds) => setSrRunningTime(typeof ds === 'string' ? ds : '')}
              />
              {/* 休止状態記録追加ボタン */}
              <Button
                size="small"
                icon={<PlusOutlined />}
                style={{ marginTop: 6 }}
                onClick={() => {
                  const newEntry: PauseEntry = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    pauseTime: '',
                    resumeTime: '',
                  };
                  setSrPauseEntries((prev) => [...prev, newEntry]);
                }}
              >
                {t('workRecord.srAddPause')}
              </Button>
            </Col>
          </Row>

          {/* ── 動的ペア（休止状態 + 動作状態） ── */}
          {srPauseEntries.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: '2px solid #1677ff',
                borderRadius: 6,
                margin: '8px 0',
                padding: '0 8px',
              }}
            >
              {/* 休止状態行 */}
              <Row align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col span={8}>
                  <Tag color="gold" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                    {t('workRecord.srStatusPaused')}
                  </Tag>
                </Col>
                <Col span={16}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                    {t('workRecord.srTransitionTime')}
                  </Text>
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder={t('workRecord.srTransitionTime')}
                    value={entry.pauseTime ? dayjs(entry.pauseTime) : undefined}
                    onChange={(_, ds) =>
                      setSrPauseEntries((prev) =>
                        prev.map((pe) => pe.id === entry.id ? { ...pe, pauseTime: typeof ds === 'string' ? ds : '' } : pe)
                      )
                    }
                  />
                </Col>
              </Row>

              {/* 再開（動作状態）行 + 削除ボタン */}
              <Row align="middle" style={{ padding: '8px 0' }}>
                <Col span={8}>
                  <Tag color="processing" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                    {t('workRecord.srStatusRunning')}
                  </Tag>
                </Col>
                <Col span={16}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                    {t('workRecord.srTransitionTime')}
                  </Text>
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder={t('workRecord.srTransitionTime')}
                    value={entry.resumeTime ? dayjs(entry.resumeTime) : undefined}
                    onChange={(_, ds) =>
                      setSrPauseEntries((prev) =>
                        prev.map((pe) => pe.id === entry.id ? { ...pe, resumeTime: typeof ds === 'string' ? ds : '' } : pe)
                      )
                    }
                  />
                  {/* 追加ボタン + 削除ボタン */}
                  <Flex gap={8} style={{ marginTop: 6 }}>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const newEntry: PauseEntry = {
                          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                          pauseTime: '',
                          resumeTime: '',
                        };
                        setSrPauseEntries((prev) => [...prev, newEntry]);
                      }}
                    >
                      {t('workRecord.srAddPause')}
                    </Button>
                    <Button
                      size="small"
                      danger
                      style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
                      onClick={() => setSrPauseEntries((prev) => prev.filter((e) => e.id !== entry.id))}
                    >
                      {t('workRecord.srRemovePause')}
                    </Button>
                  </Flex>
                </Col>
              </Row>
            </div>
          ))}

          {/* ── 固定行: 終状態 ── */}
          <Row align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={8}>
              <Tag color="success" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                {t('workRecord.srStatusCompleted')}
              </Tag>
            </Col>
            <Col span={16}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                {t('workRecord.srTransitionTime')}
              </Text>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder={t('workRecord.srTransitionTime')}
                value={srCompletedTime ? dayjs(srCompletedTime) : undefined}
                onChange={(_, ds) => setSrCompletedTime(typeof ds === 'string' ? ds : '')}
              />
            </Col>
          </Row>

          {/* ── 固定行: 異常終了状態 ── */}
          <Row align="middle" style={{ padding: '8px 0' }}>
            <Col span={8}>
              <Tag color="error" style={{ fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                {t('workRecord.srStatusError')}
              </Tag>
            </Col>
            <Col span={16}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                {t('workRecord.srTransitionTime')}
              </Text>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder={t('workRecord.srTransitionTime')}
                value={srErrorTime ? dayjs(srErrorTime) : undefined}
                onChange={(_, ds) => setSrErrorTime(typeof ds === 'string' ? ds : '')}
              />
            </Col>
          </Row>
        </Flex>
      </Modal>

      {/* コメントダイアログ */}
      {commentDialogOpen && commentTarget && (
        <ExperimentCommentDialog
          open={commentDialogOpen}
          taskNo={commentTarget.taskNo}
          transitionId={commentTarget.transitionId}
          onClose={() => setCommentDialogOpen(false)}
          onSave={(comment) => handleSaveComment(comment, commentTarget.taskNo, commentTarget.transitionId)}
        />
      )}

      {/* ── ペトリネットビューア（ViewRendererDialog / フローティング） ── */}
      {viewerDialogs.map((dialog) => (
        <ViewRendererDialog
          key={dialog.id}
          id={dialog.id}
          contentType="file"
          file={dialog.file}
          fileContent={dialog.fileContent}
          zIndex={dialog.zIndex}
          onClose={handleCloseViewer}
          onFocus={handleFocusViewer}
        />
      ))}
    </div>
  );
}
