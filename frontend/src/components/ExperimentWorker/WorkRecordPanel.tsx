'use client';

/**
 * 作業記録パネル（案A / 案B レイアウト）
 *
 * モック ExperimentWorkerScreenMock.tsx の PlanA / PlanB / PropertyCard /
 * WorkHeader / InstructionCollapse を実画面用コンポーネントとして移植。
 *
 * フェーズA: モックデータのまま動作確認。
 * フェーズB: props 経由で実 API データに差し替え。
 *
 * 【実績値入力フロー】
 * 実績値入力 →「保存して次へ」→ 次テンプレート実績値入力 or 次トランジション
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Flex,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import { CommentOutlined, DeleteOutlined, FastForwardOutlined, FileSearchOutlined, PlusOutlined, RightOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import ExperimentCommentDialog from './ExperimentCommentDialog';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import InsertionEditorCompact from '@/components/common/InsertionEditorCompact';
import ContentGridEditor from '@/components/common/ContentGridEditor';
import { getProjectMaiml } from '@/services/projectApiService';
import { getPlanDialogData, getExperimentPlans } from '@/services/experimentPlanApiService';
import type { Insertion } from '@/types/maiml-unified';
import type { FileData } from '@/types/editor';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProgressRow } from '@/types/progress';

const { Sider, Content } = Layout;

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 不確かさ基準（モックデータから定量評価・有効なものを選択肢として生成）
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
 * 「値の追加」ボタンで使用する不確かさ基準の選択肢。
 * フェーズB: API経由で取得した実データに差し替え予定。
 */
const UNCERTAINTY_OPTIONS: { value: string; label: string }[] = [];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type TransitionStatus = 'not_started' | 'in_progress' | 'completed' | 'error';
type ConfidenceLevel = '確か' | '曖昧' | '不確か';

interface MockProperty {
  key: string;
  label: string;
  xsiType: 'FloatValue' | 'IntegerValue' | 'StringValue';
  unit: string;
  expected: number | string | null;
  /** 不確かさ基準名（例: '測定不確かさ（k=2）'）。未指定時は「不確かさ値」を表示 */
  uncertaintyName?: string;
  /** 不確かさ値（モック）。未指定時は「—」を表示 */
  uncertaintyValue?: number | string;
  /** 不確かさ説明（モック）。未指定時は「—」を表示 */
  uncertaintyDescription?: string;
  /** 定性評価の初期値（モック）。未指定時は「確か」 */
  defaultConfidence?: string;
  /** 定性評価のボタン選択肢（モック）。未指定時は ['確か', '曖昧', '不確か'] */
  confidenceOptions?: string[];
}

/** Insertion スロット（テンプレートに紐づくファイル添付欄） */
interface MockInsertionSlot {
  id: string;
  label?: string;
}

interface MockTemplate {
  id: string;
  name: string;
  category: 'Conditions' | 'Materials' | 'Results';
  properties: MockProperty[];
  /** このテンプレートで収集するInsertionスロット一覧。存在する場合のみ表示 */
  insertions?: MockInsertionSlot[];
}

interface MockTransition {
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
  templates: MockTemplate[];
}

interface MockMethod {
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
}

export interface MockTask {
  taskNo: number;
  transitions: TaskTransitionState[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// モックデータ（フェーズA）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_PROJECT_INSTRUCTIONS = [
  '安全装備（手袋・ゴーグル）を着用して作業すること',
  '温度変化は慎重に観察し、異常があれば即座に報告すること',
  '記録は正確かつタイムリーに入力すること',
  '廃液は適切に分別して廃棄すること',
];

// ─────────────────────────────────────────────────────────────
// モックデータ構成:
//   同一 MAIML を複数タスクで繰り返す構造のため、
//   全タスクが同じメソッド・同じトランジション構成を持つ。
//
//   TR_A / TR_B / TR_C: isOrderFixed=false（順序自由・並列実行可能）
//   TR_D:               isOrderFixed=true （A・B・C 全完了後のみ開始可能）
//
//   スキップシナリオ例:
//     TR_A が難しくて一旦スキップ → TR_B・TR_C を先に完了
//     → 後で TR_A に戻って完了 → TR_A/B/C 全完了で TR_D が開始可能に
// ─────────────────────────────────────────────────────────────

const PROJECT_NAME = 'SampleSynthesis';
const METHOD_ID    = `method_${PROJECT_NAME}_a1b2c3d4`;

// TR_A: 混合条件（並列・順序自由）
export const TR_A_ID = 'transition-1781057805603';
// TR_B: 加熱条件（並列・順序自由）
export const TR_B_ID = 'transition-1781057812047';
// TR_C: 分離操作（並列・順序自由）
export const TR_C_ID = 'transition-1781057819834';
// TR_D: 最終評価（固定順序: A・B・C 全完了後のみ開始可能）
export const TR_D_ID = 'transition-1781057826501';

export const MOCK_METHODS: MockMethod[] = [
  { id: METHOD_ID, order: 1 },
];

export const MOCK_TRANSITIONS: MockTransition[] = [
  // ─── TR_A: 混合条件（前提なし・順序自由）────────────────────
  {
    id: TR_A_ID,
    order: 1,
    prerequisiteTransitionIds: [],
    methodId: METHOD_ID,
    templates: [
      {
        id: 'tpl-cond-mixing',
        name: 'Condition-Mixing',
        category: 'Conditions',
        properties: [
          { key: 'ns1:Temperature',   label: '温度',     xsiType: 'FloatValue',   unit: '℃',  expected: 25.0,  uncertaintyName: '許容誤差値',   uncertaintyValue: 0.5,  uncertaintyDescription: '0.5℃のズレまで許容する', defaultConfidence: '確か'   },
          { key: 'ns1:Pressure',      label: '圧力',     xsiType: 'FloatValue',   unit: 'atm', expected: 1.013, uncertaintyName: '拡張不確かさ',  uncertaintyValue: 0.001, uncertaintyDescription: '0.001 atmまで許容',      defaultConfidence: 'OK', confidenceOptions: ['OK', 'NG'] },
          { key: 'ns1:StirringSpeed', label: '撹拌速度', xsiType: 'IntegerValue', unit: 'rpm', expected: 300,   uncertaintyName: '許容範囲速度',  uncertaintyValue: 10,   uncertaintyDescription: '10 rpm の変動を許容',   defaultConfidence: '不確か' },
        ],
      },
      {
        id: 'tpl-mat-reagent',
        name: 'Material-Reagent',
        category: 'Materials',
        properties: [
          { key: 'ns1:ReagentName', label: '試薬名', xsiType: 'StringValue', unit: '', expected: 'NaCl' },
          { key: 'ns1:Amount',      label: '量',     xsiType: 'FloatValue',  unit: 'g', expected: 5.0   },
        ],
        /** Insertionスロットのサンプル（動作確認用） */
        insertions: [
          { id: 'reagent-sds', label: '試薬安全データシート（SDS）' },
          { id: 'reagent-coa', label: '試薬品質証明書（CoA）' },
        ],
      },
    ],
  },
  // ─── TR_B: 加熱条件（前提なし・順序自由）────────────────────
  {
    id: TR_B_ID,
    order: 2,
    prerequisiteTransitionIds: [],
    methodId: METHOD_ID,
    templates: [
      {
        id: 'tpl-cond-heating',
        name: 'Condition-Heating',
        category: 'Conditions',
        properties: [
          { key: 'ns1:Temperature', label: '温度',     xsiType: 'FloatValue',   unit: '℃',  expected: 80.0 },
          { key: 'ns1:HeatingTime', label: '加熱時間', xsiType: 'IntegerValue', unit: 'min', expected: 30   },
        ],
      },
    ],
  },
  // ─── TR_C: 分離操作（前提なし・順序自由）────────────────────
  {
    id: TR_C_ID,
    order: 3,
    prerequisiteTransitionIds: [],
    methodId: METHOD_ID,
    templates: [
      {
        id: 'tpl-cond-centri',
        name: 'Condition-Centrifuge',
        category: 'Conditions',
        properties: [
          { key: 'ns1:RotationSpeed', label: '回転速度', xsiType: 'IntegerValue', unit: 'rpm', expected: 3000 },
          { key: 'ns1:Duration',      label: '処理時間', xsiType: 'IntegerValue', unit: 'min', expected: 10   },
        ],
      },
      {
        id: 'tpl-mat-solvent',
        name: 'Material-Solvent',
        category: 'Materials',
        properties: [
          { key: 'ns1:SolventName', label: '溶媒名', xsiType: 'StringValue', unit: '', expected: 'EtOH' },
        ],
      },
    ],
  },
  // ─── TR_D: 最終評価（A・B・C 全完了後のみ開始可能）──────────
  {
    id: TR_D_ID,
    order: 4,
    prerequisiteTransitionIds: [TR_A_ID, TR_B_ID, TR_C_ID],
    methodId: METHOD_ID,
    templates: [
      {
        id: 'tpl-result-yield',
        name: 'Result-Yield',
        category: 'Results',
        properties: [
          { key: 'ns1:Yield',  label: '収率', xsiType: 'FloatValue', unit: '%', expected: 90.0 },
          { key: 'ns1:Purity', label: '純度', xsiType: 'FloatValue', unit: '%', expected: 99.5 },
        ],
      },
    ],
  },
];

const ORDERED_TRANSITION_IDS: string[] = MOCK_METHODS
  .slice()
  .sort((a, b) => a.order - b.order)
  .flatMap((m) =>
    MOCK_TRANSITIONS.filter((t) => t.methodId === m.id)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.id)
  );

export const INITIAL_TASKS: MockTask[] = [
  // ─── タスク1: 全完了済み ────────────────────────────────────
  {
    taskNo: 1,
    transitions: [
      {
        transitionId: TR_A_ID,
        status: 'completed',
        actuals: {
          'ns1:Temperature': 24.8, 'ns1:Pressure': 1.02, 'ns1:StirringSpeed': 295,
          'ns1:ReagentName': 'NaCl', 'ns1:Amount': 5.1,
        },
        customInsertionIds: [],
        customContentIds: [],
      },
      {
        transitionId: TR_B_ID,
        status: 'completed',
        actuals: { 'ns1:Temperature': 79.5, 'ns1:HeatingTime': 31 },
        customInsertionIds: [],
        customContentIds: [],
      },
      {
        transitionId: TR_C_ID,
        status: 'completed',
        actuals: { 'ns1:RotationSpeed': 3000, 'ns1:Duration': 10, 'ns1:SolventName': 'EtOH' },
        customInsertionIds: [],
        customContentIds: [],
      },
      {
        transitionId: TR_D_ID,
        status: 'completed',
        actuals: { 'ns1:Yield': 88.5, 'ns1:Purity': 99.1 },
        customInsertionIds: [],
        customContentIds: [],
      },
    ],
  },
  // ─── タスク2: TR_B 完了、TR_A 作業中（スキップシナリオ想定）────
  //   TR_B を先に完了させ、TR_A は後回し中。
  //   TR_C は未着手。TR_D は A・B・C 全完了待ち。
  {
    taskNo: 2,
    transitions: [
      {
        transitionId: TR_A_ID,
        status: 'in_progress',
        actuals: { 'ns1:Temperature': 25.3, 'ns1:Pressure': null, 'ns1:StirringSpeed': null, 'ns1:ReagentName': null, 'ns1:Amount': null },
        customInsertionIds: [],
        customContentIds: [],
      },
      {
        transitionId: TR_B_ID,
        status: 'completed',
        actuals: { 'ns1:Temperature': 80.2, 'ns1:HeatingTime': 30 },
        customInsertionIds: [],
        customContentIds: [],
      },
      { transitionId: TR_C_ID, status: 'not_started', actuals: {}, customInsertionIds: [], customContentIds: [] },
      { transitionId: TR_D_ID, status: 'not_started', actuals: {}, customInsertionIds: [], customContentIds: [] },
    ],
  },
  // ─── タスク3: 未着手 ────────────────────────────────────────
  {
    taskNo: 3,
    transitions: [
      { transitionId: TR_A_ID, status: 'not_started', actuals: {}, customInsertionIds: [], customContentIds: [] },
      { transitionId: TR_B_ID, status: 'not_started', actuals: {}, customInsertionIds: [], customContentIds: [] },
      { transitionId: TR_C_ID, status: 'not_started', actuals: {}, customInsertionIds: [], customContentIds: [] },
      { transitionId: TR_D_ID, status: 'not_started', actuals: {}, customInsertionIds: [], customContentIds: [] },
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// STATUS_CONFIG はコンポーネント内で t() を使うため削除し、useMemo で再生成する
const STATUS_COLORS: Record<TransitionStatus, string> = {
  not_started: 'default',
  in_progress: 'processing',
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
  prop: MockProperty;
  actual: number | string | null;
  readOnly: boolean;
  onChange: (key: string, value: number | string | null) => void;
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
  prop, actual, readOnly, onChange,
}) => {
  const { t } = useLanguage();
  const DEFAULT_CONFIDENCE_OPTIONS: string[] = [
    t('workRecord.confidenceCertain'),
    t('workRecord.confidenceAmbiguous'),
    t('workRecord.confidenceUncertain'),
  ];
  const confidenceOptions = prop.confidenceOptions ?? DEFAULT_CONFIDENCE_OPTIONS;
  const [confidence, setConfidence] = useState<string | null>(null);
  /** ＋値の追加ボタンで追加された不確かさ評価行 */
  const [addedValues, setAddedValues] = useState<AddedUncertaintyValue[]>([]);

  /** 行を追加する */
  const handleAddValue = () => {
    setAddedValues((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, uncertaintyKey: '', value: '' },
    ]);
  };

  /** 行の不確かさ基準を更新する */
  const handleUncertaintyKeyChange = (id: string, newKey: string) => {
    setAddedValues((prev) =>
      prev.map((av) => (av.id === id ? { ...av, uncertaintyKey: newKey } : av))
    );
  };

  /** 行の値を更新する */
  const handleValueChange = (id: string, newValue: string) => {
    setAddedValues((prev) =>
      prev.map((av) => (av.id === id ? { ...av, value: newValue } : av))
    );
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
            ...getConfidenceStyle(confidence),
            fontSize: 11,
            margin: 0,
            lineHeight: '18px',
            fontWeight: 'bold',
          }}
        >
          {confidence}
        </Tag>
      )}
    </Flex>

      {/* データ表示 / 入力エリア（縦並び: 想定値+不確かさ値 → 不確かさ説明 → 実績値） */}
      <Flex vertical gap={6}>
        {/* 想定値（左）+ 不確かさ値（右）: 2分割 */}
        <Row gutter={8}>
          <Col span={12}>
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
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{prop.uncertaintyName ?? t('workRecord.uncertaintyValue')}</Text>
            <div style={{ padding: '6px 10px', background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4 }}>
              {prop.uncertaintyValue !== undefined ? (
                <Text style={{ fontSize: 14 }}>
                  {prop.uncertaintyValue}
                  {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{prop.unit}</Text>}
                </Text>
              ) : (
                <Text type="secondary" italic style={{ fontSize: 13 }}>—</Text>
              )}
            </div>
          </Col>
        </Row>

        {/* 不確かさ説明（全幅） */}
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.uncertaintyDesc')}</Text>
          <div style={{ padding: '6px 10px', background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, minHeight: 34 }}>
            {prop.uncertaintyDescription !== undefined ? (
              <Text style={{ fontSize: 13 }}>{prop.uncertaintyDescription}</Text>
            ) : (
              <Text type="secondary" italic style={{ fontSize: 13 }}>—</Text>
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
              const style = getConfidenceStyle(level);
              return (
                <Button
                  key={level}
                  size="small"
                  onClick={() => setConfidence(confidence === level ? null : level)}
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
        </div>
      )}

      {/* ＋ 値の追加ボタン & 追加された不確かさ評価行 */}
      {!readOnly && (
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('workRecord.quantitativeEval')}</Text>
          {/* 追加済み行 */}
          {addedValues.map((av) => (
            <Row key={av.id} gutter={4} align="middle" style={{ marginBottom: 4 }}>
              <Col span={12}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('workRecord.quantitativeEvalPlaceholder')}
                  value={av.uncertaintyKey || undefined}
                  options={UNCERTAINTY_OPTIONS}
                  onChange={(val) => handleUncertaintyKeyChange(av.id, val)}
                  allowClear
                />
              </Col>
              <Col span={11}>
                <Input
                  style={{ width: '100%' }}
                  placeholder={t('workRecord.valuePlaceholder')}
                  value={av.value}
                  onChange={(e) => handleValueChange(av.id, e.target.value)}
                />
              </Col>
              <Col span={1} style={{ textAlign: 'center' }}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveValue(av.id)}
                  style={{ padding: 0 }}
                />
              </Col>
            </Row>
          ))}

          {/* ＋ 値の追加ボタン */}
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddValue}
            style={{ background: '#1d4e63', borderColor: '#1d4e63' }}
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
  template: MockTemplate | null;
  templateCount: number;
  templateIdx: number;
  taskTransition: TaskTransitionState | undefined;
  isReadOnly: boolean;
  displayKey: { taskNo: number; transitionId: string } | null;
  /** スキップ可能かどうか（スキップボタンの有効/無効制御） */
  canSkip?: boolean;
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
  canSkip = false,
  onActualChange,
  onSave,
  onSaveAndNext,
  onSkip,
  onTemplateIdxChange,
  onCommentClick,
  uploadTargetPath,
  onInsertionAdd,
  onInsertionRemove,
  onContentAdd,
  onContentRemove,
  onOpenViewer,
  viewerLoading,
  onInsertionUploadReady,
}) => {
  const { t } = useLanguage();

  if (!template) {
    return (
      <Flex justify="center" align="center" style={{ height: 200 }}>
        <Text type="secondary">{t('workRecord.noActiveTransition')}</Text>
      </Flex>
    );
  }

  /** 「保存して次へ」: 次テンプレートへ進むか、トランジションを完了する */
  const handleSaveAndNext = () => {
    if (!displayKey) return;
    const nextTemplateIdx = templateIdx + 1;
    if (nextTemplateIdx < templateCount) {
      onTemplateIdxChange(nextTemplateIdx);
    } else {
      onSaveAndNext(displayKey.taskNo, displayKey.transitionId);
    }
  };

  const isLastTemplate = templateIdx === templateCount - 1;
  const nextLabel = isLastTemplate
    ? t('workRecord.transitionCompleteNext')
    : t('workRecord.nextTemplate', { current: String(templateIdx + 2), total: String(templateCount) });

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
        {template.properties.map((prop) => (
          <Col span={8} key={prop.key}>
            <PropertyCard
              prop={prop}
              actual={(() => {
                const v = taskTransition?.actuals[prop.key] ?? null;
                // Insertionオブジェクトはプロパティ値として使わない
                return (v !== null && typeof v === 'object') ? null : (v as number | string | null);
              })()}
              readOnly={isReadOnly}
              onChange={(key, value) => {
                if (displayKey) onActualChange(displayKey.taskNo, displayKey.transitionId, key, value);
              }}
            />
          </Col>
        ))}
      </Row>

      {/* 追加ボタン群（DataRecordDialog 準拠） */}
      {!isReadOnly && (
        <Flex gap={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => {}}>
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

      {/* 保存ボタン */}
      {!isReadOnly && displayKey && (
        <Flex justify="flex-end" gap={8} style={{ marginTop: 12, paddingBottom: 8 }}>
          {/* コメントボタン（保存ボタンの左側） */}
          <Button
            icon={<CommentOutlined />}
            onClick={onCommentClick}
          >
            {t('workRecord.commentButton')}
          </Button>
          <Button onClick={() => onSave(displayKey.taskNo, displayKey.transitionId)}>
            {t('workRecord.saveButton')}
          </Button>
          {/* スキップボタン: 他に実行可能なトランジションがある場合のみ有効 */}
          <Tooltip title={canSkip ? t('workRecord.skipTooltipAvailable') : t('workRecord.skipTooltipUnavailable')}>
            <Button
              icon={<FastForwardOutlined />}
              disabled={!canSkip}
              onClick={() => onSkip(displayKey.taskNo, displayKey.transitionId)}
            >
              {t('workRecord.skipButton')}
            </Button>
          </Tooltip>
          <Button
            type="primary"
            icon={<RightOutlined />}
            onClick={handleSaveAndNext}
          >
            {nextLabel}
          </Button>
        </Flex>
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
  transition: MockTransition | null;
  method: MockMethod | undefined;
  isReadOnly: boolean;
  activeEntry: { taskNo: number; transitionId: string } | null;
  onClearViewing: () => void;
}

const WorkHeader: React.FC<WorkHeaderProps> = ({
  displayKey,
  taskTransition,
  transition,
  method,
  isReadOnly,
  activeEntry,
  onClearViewing,
}) => {
  const { t } = useLanguage();

  const STATUS_CONFIG: Record<TransitionStatus, { label: string; color: string }> = {
    not_started: { label: t('workRecord.statusNotStarted'), color: STATUS_COLORS.not_started },
    in_progress: { label: t('workRecord.statusInProgress'), color: STATUS_COLORS.in_progress },
    completed:   { label: t('workRecord.statusCompleted'),  color: STATUS_COLORS.completed   },
    error:       { label: t('workRecord.statusError'),      color: STATUS_COLORS.error       },
  };

  if (!displayKey || !taskTransition || !transition) {
    if (activeEntry === null) {
      return (
        <Alert type="success" showIcon message={t('workRecord.allTransitionsCompleted')} style={{ marginBottom: 8 }} />
      );
    }
    return null;
  }
  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        background: isReadOnly ? '#f5f5f5' : '#f6ffed',
        borderColor: isReadOnly ? '#d9d9d9' : '#b7eb8f',
      }}
    >
      <Flex align="center" gap={10} wrap="wrap">
        <Flex align="center" gap={6}>
          <Tag color={STATUS_CONFIG[taskTransition.status].color} style={{ margin: 0 }}>
            {STATUS_CONFIG[taskTransition.status].label}
          </Tag>
        </Flex>
        <Divider type="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('workRecord.taskNo')}</Text>
          <Text strong style={{ fontSize: 13 }}>#{displayKey.taskNo}</Text>
        </Flex>
        <Divider type="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('workRecord.method')}</Text>
          <Tooltip title={method?.id ?? ''}>
            <Text code style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {method?.id ?? '—'}
            </Text>
          </Tooltip>
        </Flex>
        <Divider type="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('workRecord.transition')}</Text>
          <Tooltip title={transition.id}>
            <Text code style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {transition.id}
            </Text>
          </Tooltip>
        </Flex>
      </Flex>
      {isReadOnly && (
        <Alert
          type="info" showIcon
          message={t('workRecord.completedTransitionReadonly')}
          style={{ marginTop: 8, fontSize: 12 }}
          action={<Button size="small" onClick={onClearViewing}>{t('workRecord.backToWork')}</Button>}
        />
      )}
    </Card>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロジェクト指示（折りたたみ）共通部品
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface InstructionCollapseProps {
  instructions: string[];
}

const InstructionCollapse: React.FC<InstructionCollapseProps> = ({ instructions }) => {
  const { t } = useLanguage();
  if (instructions.length === 0) return null;
  return (
    <Collapse
      size="small"
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
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {instructions.map((inst, i) => (
                <li key={i} style={{ fontSize: 13, color: '#595959', marginBottom: 4 }}>{inst}</li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 内部用Props（PlanA / PlanB 共通）
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
  target: MockTransition,
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
 * 1. 現在より後ろのインデックスから探す
 * 2. 見つからなければ先頭から現在の前まで循環検索する
 */
function findNextAvailableTransition(
  taskNo: number,
  currentTransitionId: string,
  skippedIds: string[],
  tasks: MockTask[]
): { taskNo: number; transitionId: string } | null {
  const task = tasks.find((t) => t.taskNo === taskNo);
  if (!task) return null;

  const currentIdx = ORDERED_TRANSITION_IDS.indexOf(currentTransitionId);

  // 後ろから順に探す
  for (let i = currentIdx + 1; i < ORDERED_TRANSITION_IDS.length; i++) {
    const tid = ORDERED_TRANSITION_IDS[i];
    const tt = task.transitions.find((s) => s.transitionId === tid);
    if (!tt) continue;
    if (tt.status === 'completed' || tt.status === 'error') continue;
    if (skippedIds.includes(tid)) continue;
    const transition = MOCK_TRANSITIONS.find((t) => t.id === tid);
    if (transition && !canAccessTransitionInTask(transition, task.transitions)) continue;
    return { taskNo, transitionId: tid };
  }

  // 前から循環検索
  for (let i = 0; i < currentIdx; i++) {
    const tid = ORDERED_TRANSITION_IDS[i];
    const tt = task.transitions.find((s) => s.transitionId === tid);
    if (!tt) continue;
    if (tt.status === 'completed' || tt.status === 'error') continue;
    if (skippedIds.includes(tid)) continue;
    const transition = MOCK_TRANSITIONS.find((t) => t.id === tid);
    if (transition && !canAccessTransitionInTask(transition, task.transitions)) continue;
    return { taskNo, transitionId: tid };
  }

  return null;
}

interface PlanProps {
  tasks: MockTask[];
  activeTaskNo: number;
  viewingKey: { taskNo: number; transitionId: string } | null;
  skippedTransitionIds: string[];
  instructions: string[];
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
  /** ファイルアップロード先パス（指定時にファイル選択・DnDでアップロード確認ダイアログを表示） */
  uploadTargetPath?: string;
  /** ペトリネットビューアを開くコールバック */
  onOpenViewer?: () => void;
  /** ペトリネットビューアローディング中フラグ */
  viewerLoading?: boolean;
  /** Creator プルダウンの選択肢（MAIMLのdocument.creatorsから取得） */
  creatorRefOptions: string[];
  /** Instrument プルダウンの選択肢（MAIMLのdocument.instrumentsから取得） */
  instrumentRefOptions: string[];
  /** Creator の選択値 */
  selectedCreatorRef: string | null;
  /** Instrument の選択値 */
  selectedInstrumentRef: string | null;
  /** Creator 選択変更コールバック */
  onCreatorRefChange: (value: string | null) => void;
  /** Instrument 選択変更コールバック */
  onInstrumentRefChange: (value: string | null) => void;
  /** 各 InsertionEditorCompact の uploadPendingFile 登録コールバック */
  onInsertionUploadReady?: (key: string, fn: () => Promise<void>) => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案A: テンプレート選択がボタン形式（左ペインなし）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PlanA: React.FC<PlanProps> = ({
  tasks, activeTaskNo, viewingKey, skippedTransitionIds, instructions, onActualChange, onSave, onSaveAndNext, onClearViewing, onSkip, onCommentClick, onInsertionAdd, onInsertionRemove,
}) => {
  const [templateIdx, setTemplateIdx] = useState(0);

  const activeEntry = useMemo((): { taskNo: number; transitionId: string } | null => {
    const task = tasks.find((t) => t.taskNo === activeTaskNo);
    if (!task) return null;
    for (const tid of ORDERED_TRANSITION_IDS) {
      const tt = task.transitions.find((x) => x.transitionId === tid);
      if (tt && tt.status !== 'completed' && tt.status !== 'error') return { taskNo: activeTaskNo, transitionId: tid };
    }
    return null;
  }, [tasks, activeTaskNo]);

  const displayKey = viewingKey ?? activeEntry;
  const isReadOnly = viewingKey !== null;
  const displayTask = displayKey ? tasks.find((t) => t.taskNo === displayKey.taskNo) : null;
  const displayTT = displayTask?.transitions.find((tt) => tt.transitionId === displayKey?.transitionId);
  const displayTransition = displayKey ? MOCK_TRANSITIONS.find((t) => t.id === displayKey.transitionId) : null;
  const displayMethod = displayTransition ? MOCK_METHODS.find((m) => m.id === displayTransition.methodId) : null;
  const visibleTemplates = displayTransition?.templates ?? [];
  const safeIdx = Math.min(templateIdx, Math.max(0, visibleTemplates.length - 1));
  const activeTemplate = visibleTemplates[safeIdx] ?? null;

  return (
    <Flex vertical style={{ height: '100%' }}>
      <InstructionCollapse instructions={instructions} />
      <WorkHeader
        displayKey={displayKey} taskTransition={displayTT} transition={displayTransition ?? null}
        method={displayMethod ?? undefined} isReadOnly={isReadOnly} activeEntry={activeEntry} onClearViewing={onClearViewing}
      />

      {/* テンプレート選択ボタン（複数の場合のみ） */}
      {visibleTemplates.length > 1 && (
        <Flex gap={4} style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          {visibleTemplates.map((tpl, idx) => (
            <Button
              key={tpl.id}
              size="small"
              type={idx === safeIdx ? 'primary' : 'default'}
              onClick={() => setTemplateIdx(idx)}
            >
              <Tag color={CATEGORY_COLOR[tpl.category]} style={{ margin: 0, fontSize: 10 }}>
                {tpl.category.slice(0, 4)}
              </Tag>
              {tpl.name}
            </Button>
          ))}
        </Flex>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        <PropertyList
          template={activeTemplate}
          templateCount={visibleTemplates.length}
          templateIdx={safeIdx}
          taskTransition={displayTT}
          isReadOnly={isReadOnly}
          displayKey={displayKey}
          canSkip={!isReadOnly && displayKey !== null && findNextAvailableTransition(displayKey.taskNo, displayKey.transitionId, skippedTransitionIds, tasks) !== null}
          onActualChange={onActualChange}
          onSave={onSave}
          onSaveAndNext={onSaveAndNext}
          onSkip={onSkip}
          onTemplateIdxChange={setTemplateIdx}
          onCommentClick={onCommentClick}
          onInsertionAdd={onInsertionAdd}
          onInsertionRemove={onInsertionRemove}
        />
      </div>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案B: DataRecordDialog準拠の左Sider + 右Contentレイアウト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PlanB: React.FC<PlanProps> = ({
  tasks, activeTaskNo, viewingKey, skippedTransitionIds, instructions, onActualChange, onSave, onSaveAndNext, onClearViewing, onSkip, onCommentClick, onInsertionAdd, onInsertionRemove, onContentAdd, onContentRemove, uploadTargetPath, onOpenViewer, viewerLoading,
  creatorRefOptions, instrumentRefOptions, selectedCreatorRef, selectedInstrumentRef, onCreatorRefChange, onInstrumentRefChange,
  onInsertionUploadReady,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | undefined>(undefined);

  const activeEntry = useMemo((): { taskNo: number; transitionId: string } | null => {
    const task = tasks.find((t) => t.taskNo === activeTaskNo);
    if (!task) return null;
    for (const tid of ORDERED_TRANSITION_IDS) {
      const tt = task.transitions.find((x) => x.transitionId === tid);
      if (tt && tt.status !== 'completed' && tt.status !== 'error') return { taskNo: activeTaskNo, transitionId: tid };
    }
    return null;
  }, [tasks, activeTaskNo]);

  const displayKey = viewingKey ?? activeEntry;
  const isReadOnly = viewingKey !== null;
  const displayTask = displayKey ? tasks.find((t) => t.taskNo === displayKey.taskNo) : null;
  const displayTT = displayTask?.transitions.find((tt) => tt.transitionId === displayKey?.transitionId);
  const displayTransition = displayKey ? MOCK_TRANSITIONS.find((t) => t.id === displayKey.transitionId) : null;
  const displayMethod = displayTransition ? MOCK_METHODS.find((m) => m.id === displayTransition.methodId) : null;
  const visibleTemplates = displayTransition?.templates ?? [];

  // 自動選択: トランジションが切り替わったら先頭テンプレートを選択
  const firstTemplateId = visibleTemplates[0]?.id ?? null;
  const resolvedSelectedId = selectedTemplateId && visibleTemplates.some((t) => t.id === selectedTemplateId)
    ? selectedTemplateId
    : firstTemplateId;
  const activeTemplate = visibleTemplates.find((t) => t.id === resolvedSelectedId) ?? null;
  const safeIdx = visibleTemplates.findIndex((t) => t.id === resolvedSelectedId);

  // フィルタ後テンプレート
  const filteredTemplates = useMemo(() => {
    return visibleTemplates.filter((tpl) => {
      const matchName = !templateSearchText || tpl.name.toLowerCase().includes(templateSearchText.toLowerCase());
      const matchCat = !selectedTemplateCategory || tpl.category === selectedTemplateCategory;
      return matchName && matchCat;
    });
  }, [visibleTemplates, templateSearchText, selectedTemplateCategory]);

  return (
    <Flex vertical style={{ height: '100%' }}>
      <InstructionCollapse instructions={instructions} />
      <WorkHeader
        displayKey={displayKey} taskTransition={displayTT} transition={displayTransition ?? null}
        method={displayMethod ?? undefined} isReadOnly={isReadOnly} activeEntry={activeEntry} onClearViewing={onClearViewing}
      />

      {/* Creator / Instrument 選択エリア（WorkHeader の直後・テンプレート入力の前） */}
      {displayKey && (
        <Card
          size="small"
          style={{ marginBottom: 8, background: '#fafafa' }}
        >
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
                options={creatorRefOptions.map((v) => ({ label: v, value: v }))}
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
                options={instrumentRefOptions.map((v) => ({ label: v, value: v }))}
                onChange={(v: string | undefined) => onInstrumentRefChange(v ?? null)}
                allowClear
                disabled={isReadOnly}
              />
            </Flex>
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

          {/* テンプレートテーブル（DataRecordDialog準拠） */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Spin spinning={false}>
              <Table
                size="small"
                dataSource={filteredTemplates}
                rowKey="id"
                onRow={(record) => ({
                  onClick: () => setSelectedTemplateId(record.id),
                  style: { cursor: 'pointer' },
                })}
                rowClassName={(record) =>
                  record.id === resolvedSelectedId ? 'ant-table-row-selected' : ''
                }
                scroll={{ y: 400 }}
                pagination={false}
                showHeader={false}
                columns={[
                  {
                    title: 'Template',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string, record: MockTemplate) => {
                      const isOutput = record.category === 'Results';
                      const ioLabel = isOutput ? 'OUT' : 'IN';
                      const ioColor = isOutput ? 'green' : 'blue';
                      const propertyCount = record.properties.length;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>{name}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>({propertyCount}{t('workRecord.itemsSuffix')})</Text>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Space size="small">
                              <Tag color={CATEGORY_COLOR[record.category]} style={{ fontSize: 11, margin: 0 }}>
                                {record.category}
                              </Tag>
                              <Tag color={ioColor} style={{ fontSize: 11, margin: 0 }}>
                                {ioLabel}
                              </Tag>
                            </Space>
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </Spin>
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
            taskTransition={displayTT}
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
            uploadTargetPath={uploadTargetPath}
            onOpenViewer={onOpenViewer}
            viewerLoading={viewerLoading}
            onInsertionUploadReady={onInsertionUploadReady}
          />
        </Content>
      </Layout>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WorkRecordPanel（エクスポート）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WorkRecordPanelProps {
  /** 選択中のプロジェクト名（S3アップロードパスの組み立てに使用） */
  projectName?: string;
  /** 選択中のプロジェクトID（ペトリネットビューアのMAIML取得に使用） */
  projectId?: string;
  /** 選択中のメソッドID（Creator/Instrument選択肢・初期値の取得に使用） */
  methodId?: string;
  /**
   * 全体進捗タブから渡される進捗行データ。
   * 渡された場合は in_progress → not_started の順で最初に見つかったタスクNo を
   * 作業対象タスクNo として使用する（モック ASSIGNED_TASK_NO の代替）。
   */
  progressRows?: ProgressRow[];
  /** プロジェクトステータス（数値コード）。渡されても現フェーズでは未使用 */
  projectStatus?: number;
  /** みなし進捗フラグ。渡されても現フェーズでは未使用 */
  useDeemedProgress?: boolean;
  /**
   * 「作業へ」ボタン等で特定タスク+トランジションへジャンプするためのキー。
   * ExperimentWorkerMenu が渡す際に使用。
   */
  initialTaskNo?: number;
  initialTransitionId?: string;
  /** プロジェクト指示文字列の配列（APIから取得済みのもの）。未指定時はモックを使用 */
  projectInstructions?: string[];
}

/**
 * progressRows から現在の作業対象タスクNo を決定する。
 * in_progress のトランジションを持つ最初のタスクを優先し、
 * なければ not_started のトランジションを持つ最初のタスクを返す。
 * progressRows が空または未指定の場合はフォールバック値を返す。
 */
function resolveActiveTaskNo(progressRows: ProgressRow[] | undefined, fallback: number): number {
  if (!progressRows || progressRows.length === 0) return fallback;

  // in_progress のタスクを優先
  const inProgressRow = progressRows.find((r) => r.status === 'in_progress');
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
  initialTaskNo,
  initialTransitionId,
  projectInstructions,
}: WorkRecordPanelProps = {}) {
  // フォールバック値 2 はモック INITIAL_TASKS のタスク2（in_progress）に対応
  const ASSIGNED_TASK_NO = resolveActiveTaskNo(progressRows, 2);
  const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);
  // initialTaskNo/initialTransitionId が両方指定されている場合は、初期表示でそのトランジションを表示する
  const [viewingKey, setViewingKey] = useState<{ taskNo: number; transitionId: string } | null>(
    initialTaskNo !== undefined && initialTransitionId !== undefined
      ? { taskNo: initialTaskNo, transitionId: initialTransitionId }
      : null
  );

  // ── Creator / Instrument 選択肢・選択値 ──
  const [creatorRefOptions, setCreatorRefOptions] = useState<string[]>([]);
  const [instrumentRefOptions, setInstrumentRefOptions] = useState<string[]>([]);
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
        Modal.error({ title: t('experimentInstruction.fetchError') });
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
      Modal.error({ title: t('experimentInstruction.fetchError') });
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

  const handleSave = useCallback(async (_taskNo: number, _transitionId: string) => {
    try {
      await uploadAllPendingInsertions();
    } catch {
      message.error(t('insertionEditor.uploadFailed'));
      return;
    }
    Modal.success({ title: t('workRecord.saveSuccess'), content: t('workRecord.saveContent') });
  }, [t, uploadAllPendingInsertions]);

  const handleSaveAndNext = useCallback(
    async (taskNo: number, transitionId: string) => {
      try {
        await uploadAllPendingInsertions();
      } catch {
        message.error(t('insertionEditor.uploadFailed'));
        return;
      }
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, status: 'completed' };
            }),
          };
        })
      );
      setViewingKey(null);

      const task = tasks.find((t) => t.taskNo === taskNo);
      if (!task) return;
      const idx = ORDERED_TRANSITION_IDS.indexOf(transitionId);
      const nextId = ORDERED_TRANSITION_IDS[idx + 1];
      const nextTt = nextId ? task.transitions.find((x) => x.transitionId === nextId) : null;

      if (nextTt) {
        Modal.success({
          title: t('workRecord.transitionComplete'),
          content: <span>{t('workRecord.nextWork')}: <Text code style={{ fontSize: 11 }}>{nextId}</Text></span>,
        });
      } else {
        Modal.success({ title: t('workRecord.taskComplete'), content: t('workRecord.allTransitionsDone') });
      }
    },
    [tasks, t, uploadAllPendingInsertions]
  );

  // ─── スキップ state ────────────────────────────────────────
  const [skippedTransitionIds, setSkippedTransitionIds] = useState<string[]>([]);

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
        Modal.info({
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
        Modal.warning({
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

  // ─── コメントダイアログ用 state ───────────────────────────
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  // コメント保存ハンドラ（モック: 現フェーズはUIのみ、バックエンド保存は別フェーズ）
  const handleSaveComment = useCallback((comment: string) => {
    console.info('[WorkRecordPanel] コメント保存（モック）:', comment);
    Modal.success({ title: t('workRecord.commentSaved'), content: comment });
  }, []);

  const planProps: PlanProps = {
    tasks,
    activeTaskNo: ASSIGNED_TASK_NO,
    viewingKey,
    skippedTransitionIds,
    instructions: projectInstructions ?? MOCK_PROJECT_INSTRUCTIONS,
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
    uploadTargetPath: projectName ? `projects/${projectName}/attachments` : undefined,
    onOpenViewer: projectId ? handleOpenPetriNetViewer : undefined,
    viewerLoading: petriNetViewerLoading,
    creatorRefOptions,
    instrumentRefOptions,
    selectedCreatorRef,
    selectedInstrumentRef,
    onCreatorRefChange: setSelectedCreatorRef,
    onInstrumentRefChange: setSelectedInstrumentRef,
    onInsertionUploadReady: handleInsertionUploadReady,
  };

  // コメントダイアログに渡す displayKey（現在表示中のキー）
  const activeTaskEntry = (() => {
    const task = tasks.find((t) => t.taskNo === ASSIGNED_TASK_NO);
    if (!task) return null;
    for (const tid of ORDERED_TRANSITION_IDS) {
      const tt = task.transitions.find((x) => x.transitionId === tid);
      if (tt && tt.status !== 'completed' && tt.status !== 'error') return { taskNo: ASSIGNED_TASK_NO, transitionId: tid };
    }
    return null;
  })();
  const commentTarget = viewingKey ?? activeTaskEntry;

  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <PlanB {...planProps} />

      {/* コメントダイアログ */}
      {commentDialogOpen && commentTarget && (
        <ExperimentCommentDialog
          open={commentDialogOpen}
          taskNo={commentTarget.taskNo}
          transitionId={commentTarget.transitionId}
          onClose={() => setCommentDialogOpen(false)}
          onSave={handleSaveComment}
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
