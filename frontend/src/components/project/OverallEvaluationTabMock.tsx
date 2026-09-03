'use client';

/**
 * OverallEvaluationTabMock.tsx
 *
 * 【モック専用】全体評価タブ レイアウト修正案の確認用コンポーネント
 *
 * - ダミーデータ（ハードコード）で新レイアウトを視覚確認するためのファイル
 * - Phase 1 確認完了後に本体 OverallEvaluationTab.tsx へ取り込む
 * - 確認URL: /mock/overall-evaluation
 *
 * @see docs/tasks/20260828_0000_全体評価タブレイアウト修正/PLAN.md
 */

import React, { useState } from 'react';
import {
  Space,
  Typography,
  Flex,
  Button,
  Tag,
  Card,
  Slider,
  Input,
  Table,
  theme,
  Divider,
  Row,
  Col,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const DIGITAL_VALUES = ['良好', '要確認', '不良'] as const;

const BADGE_COLOR: Record<string, string> = {
  '良好':   'success',
  '要確認': 'warning',
  '不良':   'error',
};

const STATUS_COLOR: Record<string, string> = {
  '良好':   '#52c41a',
  '要確認': '#faad14',
  '不良':   '#ff4d4f',
};

const STATUS_TAG_COLOR: Record<string, string> = {
  '良好':   'success',
  '要確認': 'warning',
  '不良':   'error',
};

const LEVEL_LABEL: Record<string, string> = {
  method:     'メソッド別',
  task:       'タスク別',
  transition: 'トランジション別',
};

// ─────────────────────────────────────────────────────────────
// ダミーデータ
// ─────────────────────────────────────────────────────────────

/** 定量評価（experiment_uncertainty_judge）集計ダミー */
const MOCK_JUDGE_SUMMARY = {
  total:    28,
  good:     12,
  bad:      16,
  goodRate: 42.9,
  badRate:  57.1,
};

/** 全体評価の現在ステータスダミー */
const MOCK_OVERALL_STATUS: '良好' | '要確認' | '不良' | null = '要確認';

/** 下位評価件数ダミー */
const MOCK_SUB_EVAL_COUNT = 7;

/** 階層別サマリーダミー */
const MOCK_LEVEL_SUMMARIES = [
  {
    level: 'method',
    total: 2, good: 1, caution: 1, bad: 0, missing: 0,
    statusRepresentative: '要確認', scoreAverage: 75,
  },
  {
    level: 'task',
    total: 2, good: 1, caution: 0, bad: 1, missing: 0,
    statusRepresentative: '不良', scoreAverage: 50,
  },
  {
    level: 'transition',
    total: 3, good: 2, caution: 1, bad: 0, missing: 0,
    statusRepresentative: '要確認', scoreAverage: 83,
  },
];

/** 要注意項目ダミー */
const MOCK_ATTENTION_ITEMS = [
  {
    evaluationUnit: 'TASK',
    methodId: 'method_A',
    taskNo: 2,
    transitionId: null as string | null,
    evaluationValue: '不良',
    comment: '測定系に異常あり。再調査が必要。',
    severity: 'bad',
  },
  {
    evaluationUnit: 'METHOD',
    methodId: 'method_B',
    taskNo: null as number | null,
    transitionId: null as string | null,
    evaluationValue: '要確認',
    comment: '基準値ぎりぎり。次バッチで要注視。',
    severity: 'caution',
  },
];

type AttentionRow = typeof MOCK_ATTENTION_ITEMS[0];

// ─────────────────────────────────────────────────────────────
// ヘルパー関数
// ─────────────────────────────────────────────────────────────

function buildTargetLabel(item: AttentionRow): string {
  const parts: string[] = [];
  if (item.methodId)        parts.push(item.methodId);
  if (item.taskNo != null)  parts.push(`#${item.taskNo}`);
  if (item.transitionId)    parts.push(item.transitionId);
  return parts.join(' / ') || '—';
}

// ─────────────────────────────────────────────────────────────
// サブコンポーネント: 定量評価統計パネル（新規追加部分）
// ─────────────────────────────────────────────────────────────

interface JudgeSummaryPanelProps {
  total:    number;
  good:     number;
  bad:      number;
  goodRate: number;
  badRate:  number;
}

const JudgeSummaryPanel: React.FC<JudgeSummaryPanelProps> = ({
  total, good, bad, goodRate, badRate,
}) => {
  const { token } = theme.useToken();

  return (
    <Row
      gutter={[0, 0]}
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        overflow: 'hidden',
      }}
    >
      {/* 総数 */}
      <Col
        flex="none"
        style={{
          padding: '12px 20px',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          minWidth: 130,
        }}
      >
        <Statistic
          title={
            <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
              定量評価
            </Text>
          }
          value={total}
          suffix={<Text style={{ fontSize: 12 }}>件</Text>}
          valueStyle={{ fontSize: 22, fontWeight: 700, color: token.colorText }}
        />
      </Col>

      {/* 良好 */}
      <Col
        flex="1"
        style={{
          padding: '12px 20px',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: token.colorSuccessBg,
        }}
      >
        <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
          <CheckCircleFilled style={{ color: token.colorSuccess, fontSize: 14 }} />
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 500 }}>
            良好
          </Text>
        </Flex>
        <Flex align="baseline" gap={8}>
          <Text style={{ fontSize: 22, fontWeight: 700, color: token.colorSuccess }}>
            {good}
          </Text>
          <Text style={{ fontSize: 12, color: token.colorSuccessText }}>件</Text>
          <Text style={{ fontSize: 14, fontWeight: 600, color: token.colorSuccess }}>
            {goodRate.toFixed(1)}%
          </Text>
        </Flex>
      </Col>

      {/* 不良 */}
      <Col
        flex="1"
        style={{
          padding: '12px 20px',
          backgroundColor: token.colorErrorBg,
        }}
      >
        <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
          <CloseCircleFilled style={{ color: token.colorError, fontSize: 14 }} />
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 500 }}>
            不良
          </Text>
        </Flex>
        <Flex align="baseline" gap={8}>
          <Text style={{ fontSize: 22, fontWeight: 700, color: token.colorError }}>
            {bad}
          </Text>
          <Text style={{ fontSize: 12, color: token.colorErrorText }}>件</Text>
          <Text style={{ fontSize: 14, fontWeight: 600, color: token.colorError }}>
            {badRate.toFixed(1)}%
          </Text>
        </Flex>
      </Col>
    </Row>
  );
};

// ─────────────────────────────────────────────────────────────
// サブコンポーネント: 階層別サマリーバー（モック内インライン版）
// ─────────────────────────────────────────────────────────────

const MockSummaryBar: React.FC = () => {
  if (MOCK_LEVEL_SUMMARIES.length === 0) {
    return <Text type="secondary" style={{ fontSize: 12 }}>評価データがありません</Text>;
  }

  return (
    <Flex vertical gap={8}>
      {MOCK_LEVEL_SUMMARIES.map((s) => {
        const evaluated = s.good + s.caution + s.bad;
        const total     = s.total;
        const goodPct    = total > 0 ? (s.good    / total) * 100 : 0;
        const cautionPct = total > 0 ? (s.caution / total) * 100 : 0;
        const badPct     = total > 0 ? (s.bad     / total) * 100 : 0;
        const missingPct = total > 0 ? (s.missing / total) * 100 : 0;

        return (
          <Flex key={s.level} align="center" gap={8} style={{ minHeight: 28 }}>
            <Text style={{ width: 120, flexShrink: 0, fontSize: 12, fontWeight: 500 }}>
              {LEVEL_LABEL[s.level]}:
            </Text>
            <div
              style={{
                display: 'flex',
                width: 200,
                height: 16,
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid #d9d9d9',
                flexShrink: 0,
              }}
            >
              {goodPct    > 0 && <div style={{ width: `${goodPct}%`,    backgroundColor: STATUS_COLOR['良好']   }} />}
              {cautionPct > 0 && <div style={{ width: `${cautionPct}%`, backgroundColor: STATUS_COLOR['要確認'] }} />}
              {badPct     > 0 && <div style={{ width: `${badPct}%`,     backgroundColor: STATUS_COLOR['不良']   }} />}
              {missingPct > 0 && <div style={{ width: `${missingPct}%`, backgroundColor: '#d9d9d9'             }} />}
            </div>
            <Text style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
              良好{s.good} 要確認{s.caution} 不良{s.bad}
              {s.missing > 0 && ` 未評価${s.missing}`}
              {` (N=${total})`}
            </Text>
            {s.statusRepresentative && (
              <Tag color={STATUS_TAG_COLOR[s.statusRepresentative] ?? 'default'} style={{ fontSize: 11 }}>
                {s.statusRepresentative}
              </Tag>
            )}
            {s.scoreAverage !== null && (
              <Text style={{ fontSize: 11, color: '#666' }}>スコア: {s.scoreAverage}</Text>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({evaluated}/{total}件評価済)
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
};

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────

const OverallEvaluationTabMock: React.FC = () => {
  const { token } = theme.useToken();

  const [digitalValue, setDigitalValue] = useState<typeof DIGITAL_VALUES[number] | null>(null);
  const [score, setScore]               = useState<number>(0);
  const [analog, setAnalog]             = useState<string>('');

  // 要注意項目テーブルカラム
  const attentionColumns: ColumnsType<AttentionRow> = [
    {
      title: '評価単位',
      key: 'evaluationUnit',
      width: 140,
      render: (_: unknown, item: AttentionRow) => (
        <Text style={{ fontSize: 12 }}>{item.evaluationUnit}</Text>
      ),
    },
    {
      title: '対象',
      key: 'target',
      width: 200,
      render: (_: unknown, item: AttentionRow) => (
        <Text style={{ fontSize: 12 }}>{buildTargetLabel(item)}</Text>
      ),
    },
    {
      title: '評価値',
      key: 'evaluationValue',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, item: AttentionRow) => (
        <Tag color={item.severity === 'bad' ? 'error' : 'warning'} style={{ fontSize: 11 }}>
          {item.evaluationValue}
        </Tag>
      ),
    },
    {
      title: 'コメント',
      key: 'comment',
      render: (_: unknown, item: AttentionRow) =>
        item.comment
          ? <Text style={{ fontSize: 12 }}>{item.comment}</Text>
          : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%', padding: '8px 0' }}>

      {/* ── ヘッダー ── */}
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={8}>
        <Flex vertical gap={2}>
          <Title level={4} style={{ margin: 0 }}>
            サンプルプロジェクト プロジェクト全体評価
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            登録済み評価 {MOCK_SUB_EVAL_COUNT}件
            {MOCK_ATTENTION_ITEMS.length > 0 && (
              <> / うち要対応 {MOCK_ATTENTION_ITEMS.length}件</>
            )}
          </Text>
        </Flex>

        {/* 現在の全体評価バッジ（project_overall_evaluations の登録値） */}
        {MOCK_OVERALL_STATUS ? (
          <Tag
            color={BADGE_COLOR[MOCK_OVERALL_STATUS] ?? 'default'}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            全体評価 {MOCK_OVERALL_STATUS}
          </Tag>
        ) : (
          <Tag color="orange" style={{ fontSize: 13, padding: '4px 10px' }}>
            全体評価 未決定
          </Tag>
        )}
      </Flex>

      {/* ── 定量評価統計パネル（新規追加） ── */}
      <JudgeSummaryPanel
        total={MOCK_JUDGE_SUMMARY.total}
        good={MOCK_JUDGE_SUMMARY.good}
        bad={MOCK_JUDGE_SUMMARY.bad}
        goodRate={MOCK_JUDGE_SUMMARY.goodRate}
        badRate={MOCK_JUDGE_SUMMARY.badRate}
      />

      {/* ── 階層別サマリーカード ── */}
      <Card
        size="small"
        title={
          <Text style={{ fontSize: 13, fontWeight: 600 }}>
            階層別サマリー（下位評価の集計）
          </Text>
        }
        extra={<Button size="small" type="link">再取得</Button>}
      >
        <MockSummaryBar />
      </Card>

      {/* ── 要注意項目カード ── */}
      <Card
        size="small"
        title={
          <Flex vertical gap={0}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              要注意項目（判断材料）
            </Text>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
              良好以外の評価を、コメント付きで抽出
            </Text>
          </Flex>
        }
      >
        {MOCK_ATTENTION_ITEMS.length > 0 ? (
          <Table
            dataSource={MOCK_ATTENTION_ITEMS}
            columns={attentionColumns}
            rowKey={(item, idx) =>
              `${item.evaluationUnit}_${item.methodId ?? ''}_${item.taskNo ?? ''}_${item.transitionId ?? ''}_${idx}`
            }
            size="small"
            pagination={false}
            bordered
            style={{ marginTop: 4 }}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>要注意項目なし</Text>
        )}
      </Card>

      {/* ── プロジェクト全体評価の決定カード ── */}
      <Card
        size="small"
        title={
          <Flex vertical gap={0}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              プロジェクト全体評価の決定
            </Text>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
              上記の階層別サマリーと要注意項目を踏まえて、MaiML全体の評価を決定する
            </Text>
          </Flex>
        }
        style={{ border: `1.5px solid ${token.colorPrimary}`, borderRadius: token.borderRadius }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Flex vertical gap={6}>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>デジタル評価 ー 評価値</Text>
            <Flex gap={8}>
              {DIGITAL_VALUES.map((val) => (
                <Button
                  key={val}
                  type={digitalValue === val ? 'primary' : 'default'}
                  style={{ flex: 1 }}
                  onClick={() => setDigitalValue(val)}
                >
                  {val}
                </Button>
              ))}
            </Flex>
          </Flex>
          <Flex vertical gap={6}>
            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: 12, fontWeight: 500 }}>デジタル評価 ー 数値スコア（任意）</Text>
              <Text style={{ fontSize: 14, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{score}</Text>
            </Flex>
            <Slider min={0} max={100} value={score} onChange={(v) => setScore(v)} />
          </Flex>
          <Flex vertical gap={6}>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>アナログ評価 ー 感情評価（文章）</Text>
            <TextArea
              rows={4}
              placeholder="全体所感を文章で記入"
              value={analog}
              onChange={(e) => setAnalog(e.target.value)}
              maxLength={1000}
            />
          </Flex>
          <Flex justify="flex-end">
            <Button
              type="primary"
              disabled={!digitalValue}
            >
              全体評価を登録
            </Button>
          </Flex>
        </Space>
      </Card>

      {/* ── モック用注記 ── */}
      <Divider style={{ margin: '4px 0' }} />
      <Card
        size="small"
        style={{ backgroundColor: token.colorWarningBg, border: `1px solid ${token.colorWarning}` }}
      >
        <Flex vertical gap={4}>
          <Flex align="center" gap={6}>
            <WarningFilled style={{ color: token.colorWarning }} />
            <Text style={{ fontWeight: 600, fontSize: 12 }}>【モック】確認用ダミーデータ</Text>
          </Flex>
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            定量評価パネル: 総数 {MOCK_JUDGE_SUMMARY.total}件 / 良好 {MOCK_JUDGE_SUMMARY.good}件 ({MOCK_JUDGE_SUMMARY.goodRate}%) / 不良 {MOCK_JUDGE_SUMMARY.bad}件 ({MOCK_JUDGE_SUMMARY.badRate}%)
          </Text>
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            全体評価ステータス: {MOCK_OVERALL_STATUS ?? '未決定'} / 下位評価件数: {MOCK_SUB_EVAL_COUNT}件
          </Text>
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            ラベル名・レイアウト確認後、Phase 2 以降で API 接続・本実装を行います。
          </Text>
        </Flex>
      </Card>

    </Space>
  );
};

export default OverallEvaluationTabMock;

