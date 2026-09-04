'use client';

/**
 * OverallEvaluationTab.tsx
 * 「全体評価」タブのコンテンツ
 *
 * - ヘッダー: プロジェクト名 + 全体評価ステータスバッジ
 * - 定量評価統計パネル: experiment_uncertainty_judge の集計（総数・良好・不良・各率）
 * - 階層別サマリー（下位評価の集計）
 * - 要注意項目（良好以外の評価一覧）
 * - プロジェクト全体評価の決定フォーム
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Space,
  Typography,
  Flex,
  Button,
  Tag,
  Spin,
  Card,
  Slider,
  Input,
  Table,
  App,
  Row,
  Col,
  Statistic,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import {
  getByProject,
  createOverallEvaluation,
  getSubEvaluationsByProject,
} from '@/services/projectOverallEvaluationApiService';
import { getUncertaintyJudgeSummary } from '@/services/experimentInstructionApiService';
import type {
  ProjectOverallEvaluation,
  CreateProjectOverallEvaluationInput,
  SubEvaluationRow,
  OverallEvaluationTabProps,
} from '@/types/projectOverallEvaluation';
import type { UncertaintyJudgeSummaryResponse } from '@/types/experimentInstruction';
import type { AttentionItem } from '@/types/aggregationRule';
import EvaluationSummaryBar from './subcomponents/EvaluationSummaryBar';
import AttentionItemList from './subcomponents/AttentionItemList';
import { useOverallEvaluation } from '@/hooks/project/useOverallEvaluation';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

/** デジタル評価の選択肢 */
const DIGITAL_VALUES = ['良好', '要確認', '不良'] as const;

/** デジタル評価値と翻訳キーのマップ */
const DIGITAL_LABEL_KEY: Record<typeof DIGITAL_VALUES[number], string> = {
  '良好':   'overallEvaluation.digitalGood',
  '要確認': 'overallEvaluation.digitalCaution',
  '不良':   'overallEvaluation.digitalBad',
};

/** 全体評価バッジの色マップ */
const BADGE_COLOR: Record<string, string> = {
  '良好':   'success',
  '要確認': 'warning',
  '不良':   'error',
};

// ─────────────────────────────────────────────────────────────
// ヘルパー関数
// ─────────────────────────────────────────────────────────────

/** AttentionItem から「対象」ラベルを生成 */
function buildTargetLabel(item: AttentionItem): string {
  const parts: string[] = [];
  if (item.methodId)          parts.push(item.methodId);
  if (item.taskNo   != null)  parts.push(`#${item.taskNo}`);
  if (item.transitionId)      parts.push(item.transitionId);
  return parts.join(' / ') || '—';
}

// ─────────────────────────────────────────────────────────────
// サブコンポーネント: 定量評価統計パネル
// ─────────────────────────────────────────────────────────────

interface JudgeSummaryPanelProps {
  summary:  UncertaintyJudgeSummaryResponse | null;
  loading:  boolean;
  t: (key: string) => string;
}

const JudgeSummaryPanel: React.FC<JudgeSummaryPanelProps> = ({ summary, loading, t }) => {
  const { token } = theme.useToken();

  if (loading) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          padding: '16px',
        }}
      >
        <Spin size="small" />
      </Flex>
    );
  }

  const total    = summary?.total    ?? 0;
  const good     = summary?.good     ?? 0;
  const bad      = summary?.bad      ?? 0;
  const goodRate = summary?.goodRate ?? 0;
  const badRate  = summary?.badRate  ?? 0;

  return (
    <Row
      gutter={[0, 0]}
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        overflow: 'hidden',
      }}
    >
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
              {t('overallEvaluation.judgePanelTotal')}
            </Text>
          }
          value={total}
          suffix={<Text style={{ fontSize: 12 }}>件</Text>}
          styles={{ content: { fontSize: 22, fontWeight: 700, color: token.colorText } }}
        />
      </Col>
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
            {t('overallEvaluation.judgePanelGood')}
          </Text>
        </Flex>
        <Flex align="baseline" gap={8}>
          <Text style={{ fontSize: 22, fontWeight: 700, color: token.colorSuccess }}>{good}</Text>
          <Text style={{ fontSize: 12, color: token.colorSuccessText }}>件</Text>
          <Text style={{ fontSize: 14, fontWeight: 600, color: token.colorSuccess }}>{goodRate.toFixed(1)}%</Text>
        </Flex>
      </Col>
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
            {t('overallEvaluation.judgePanelBad')}
          </Text>
        </Flex>
        <Flex align="baseline" gap={8}>
          <Text style={{ fontSize: 22, fontWeight: 700, color: token.colorError }}>{bad}</Text>
          <Text style={{ fontSize: 12, color: token.colorErrorText }}>件</Text>
          <Text style={{ fontSize: 14, fontWeight: 600, color: token.colorError }}>{badRate.toFixed(1)}%</Text>
        </Flex>
      </Col>
    </Row>
  );
};

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────

const OverallEvaluationTab: React.FC<OverallEvaluationTabProps> = ({
  projectId,
  projectName,
  isEditable = true,
  isProjectCompleted = false,
  isCheckoutLocked = false,
  maimlHasErrors = false,
}) => {
  // ── Hooks 使用順序 useState → useEffect → useCallback → カスタムフック ──

  // 最新の全体評価レコード
  const [latestEval, setLatestEval]     = useState<ProjectOverallEvaluation | null>(null);
  const [evalLoading, setEvalLoading]   = useState(false);

  // 下位評価件数（サブテキスト用）
  const [subEvalCount, setSubEvalCount] = useState<number>(0);

  // 定量評価集計
  const [judgeSummary, setJudgeSummary] = useState<UncertaintyJudgeSummaryResponse | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);

  // フォームの状態
  const [digitalValue, setDigitalValue] = useState<'良好' | '要確認' | '不良' | null>(null);
  const [score, setScore]               = useState<number>(0);
  const [analog, setAnalog]             = useState<string>('');
  const [submitting, setSubmitting]     = useState(false);

  // カスタムフック
  const { t } = useLanguage();
  const { message } = App.useApp();

  // 階層別サマリー・要注意項目（動的算出）
  const {
    summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useOverallEvaluation(projectId);

  /** 最新の全体評価・下位評価件数を取得 */
  const fetchEvalData = useCallback(() => {
    if (!projectId) return;
    setEvalLoading(true);
    Promise.all([
      getByProject(projectId).catch(() => [] as ProjectOverallEvaluation[]),
      getSubEvaluationsByProject(projectId).catch(() => [] as SubEvaluationRow[]),
    ]).then(([overallList, subList]) => {
      setLatestEval(overallList.length > 0 ? overallList[0] : null);
      setSubEvalCount(subList.length);
    }).finally(() => setEvalLoading(false));
  }, [projectId]);

  /** 定量評価集計を取得 */
  const fetchJudgeSummary = useCallback(() => {
    if (!projectId) return;
    setJudgeLoading(true);
    getUncertaintyJudgeSummary(projectId)
      .then((data) => setJudgeSummary(data))
      .catch(() => setJudgeSummary(null))
      .finally(() => setJudgeLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchEvalData();
    fetchJudgeSummary();
  }, [fetchEvalData, fetchJudgeSummary]);

  /** 全体評価を登録する */
  const handleRegister = useCallback(async () => {
    if (!digitalValue) {
      message.warning(t('overallEvaluation.warningSelectDigital'));
      return;
    }
    setSubmitting(true);
    try {
      const input: CreateProjectOverallEvaluationInput = {
        projectId,
        overallDigital: digitalValue,
        overallScore:   score > 0 ? score : undefined,
        overallAnalog:  analog.trim() || undefined,
      };
      await createOverallEvaluation(input);
      message.success(t('overallEvaluation.successRegistered'));
      fetchEvalData();
      refetchSummary();
      setDigitalValue(null);
      setScore(0);
      setAnalog('');
    } catch {
      message.error(t('overallEvaluation.errorRegistered'));
    } finally {
      setSubmitting(false);
    }
  }, [projectId, digitalValue, score, analog, fetchEvalData, refetchSummary, message, t]);

  // 要注意項目テーブルのカラム定義（翻訳キーを使用）
  const attentionColumns: ColumnsType<AttentionItem> = [
    {
      title: t('overallEvaluation.columnEvalUnit'),
      key: 'evaluationUnit',
      width: 140,
      render: (_: unknown, item: AttentionItem) => (
        <Text style={{ fontSize: 12 }}>{item.evaluationUnit}</Text>
      ),
    },
    {
      title: t('overallEvaluation.columnTarget'),
      key: 'target',
      width: 200,
      render: (_: unknown, item: AttentionItem) => (
        <Text style={{ fontSize: 12 }}>{buildTargetLabel(item)}</Text>
      ),
    },
    {
      title: t('overallEvaluation.columnEvalValue'),
      key: 'evaluationValue',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, item: AttentionItem) => (
        <Tag
          color={item.severity === 'bad' ? 'error' : 'warning'}
          style={{ fontSize: 11 }}
        >
          {item.evaluationValue}
        </Tag>
      ),
    },
    {
      title: t('overallEvaluation.columnComment'),
      key: 'comment',
      render: (_: unknown, item: AttentionItem) =>
        item.comment
          ? <Text style={{ fontSize: 12 }}>{item.comment}</Text>
          : <Text type="secondary">—</Text>,
    },
  ];

  const isDisabled     = !isEditable || isProjectCompleted || isCheckoutLocked || maimlHasErrors;
  const attentionCount = summary?.attentionItems?.length ?? 0;

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%', padding: '8px 0' }}>

      {/* ── ヘッダー ── */}
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={8}>
        <Flex vertical gap={2}>
          <Title level={4} style={{ margin: 0 }}>
            {projectName}{t('overallEvaluation.titleSuffix')}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {evalLoading ? (
              <Spin size="small" />
            ) : (
              <>
                {t('overallEvaluation.subTextRegistered').replace('{count}', String(subEvalCount))}
                {attentionCount > 0 && (
                  <> / {t('overallEvaluation.subTextAttention').replace('{count}', String(attentionCount))}</>
                )}
              </>
            )}
          </Text>
        </Flex>

        {/* 現在の全体評価バッジ */}
        {evalLoading ? (
          <Spin size="small" />
        ) : latestEval?.overall_digital ? (
          <Tag
            color={BADGE_COLOR[latestEval.overall_digital] ?? 'default'}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            {t('overallEvaluation.statusLabel')} {latestEval.overall_digital}
          </Tag>
        ) : (
          <Tag color="orange" style={{ fontSize: 13, padding: '4px 10px' }}>
            {t('overallEvaluation.statusUndecided')}
          </Tag>
        )}
      </Flex>

      {/* ── 定量評価統計パネル ── */}
      <JudgeSummaryPanel
        summary={judgeSummary}
        loading={judgeLoading}
        t={t}
      />

      {/* ── 階層別サマリーカード ── */}
      <Card
        size="small"
        title={
          <Text style={{ fontSize: 13, fontWeight: 600 }}>
            {t('overallEvaluation.sectionSummary')}
          </Text>
        }
        extra={
          summaryLoading
            ? <Spin size="small" />
            : <Button size="small" type="link" onClick={refetchSummary}>{t('overallEvaluation.btnRefetch')}</Button>
        }
      >
        <EvaluationSummaryBar summaries={summary?.levels ?? []} />
      </Card>

      {/* ── 要注意項目カード ── */}
      <Card
        size="small"
        title={
          <Flex vertical gap={0}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              {t('overallEvaluation.sectionAttention')}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
              {t('overallEvaluation.sectionAttentionSub')}
            </Text>
          </Flex>
        }
      >
        {summaryLoading ? (
          <Flex justify="center" style={{ padding: 16 }}>
            <Spin size="small" />
          </Flex>
        ) : attentionCount > 0 ? (
          <Table<AttentionItem>
            dataSource={summary!.attentionItems}
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
          <AttentionItemList items={[]} />
        )}
      </Card>

      {/* ── プロジェクト全体評価の決定カード ── */}
      <Card
        size="small"
        title={
          <Flex vertical gap={0}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              {t('overallEvaluation.sectionDecision')}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
              {t('overallEvaluation.sectionDecisionSub')}
            </Text>
          </Flex>
        }
        style={{ border: '1.5px solid #1677ff', borderRadius: 8 }}
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>

          {/* デジタル評価 ── 評価値 */}
          <Flex vertical gap={6}>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              {t('overallEvaluation.labelDigital')}
            </Text>
            <Flex gap={8}>
              {DIGITAL_VALUES.map((val) => (
                <Button
                  key={val}
                  type={digitalValue === val ? 'primary' : 'default'}
                  style={{ flex: 1 }}
                  disabled={isDisabled}
                  onClick={() => setDigitalValue(val)}
                >
                  {t(DIGITAL_LABEL_KEY[val])}
                </Button>
              ))}
            </Flex>
          </Flex>

          {/* デジタル評価 ── 数値スコア（任意） */}
          <Flex vertical gap={6}>
            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: 12, fontWeight: 500 }}>
                {t('overallEvaluation.labelScore')}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
                {score}
              </Text>
            </Flex>
            <Slider
              min={0}
              max={100}
              value={score}
              onChange={(v) => setScore(v)}
              disabled={isDisabled}
            />
          </Flex>

          {/* アナログ評価 ── 感情評価（文章） */}
          <Flex vertical gap={6}>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              {t('overallEvaluation.labelAnalog')}
            </Text>
            <TextArea
              rows={4}
              placeholder={t('overallEvaluation.analogPlaceholder')}
              value={analog}
              onChange={(e) => setAnalog(e.target.value)}
              maxLength={1000}
              disabled={isDisabled}
            />
          </Flex>

          {/* 登録ボタン */}
          <Flex justify="flex-end">
            <Button
              type="primary"
              loading={submitting}
              disabled={isDisabled || !digitalValue}
              onClick={handleRegister}
            >
              {t('overallEvaluation.btnRegister')}
            </Button>
          </Flex>

        </Space>
      </Card>

    </Space>
  );
};

export default OverallEvaluationTab;

