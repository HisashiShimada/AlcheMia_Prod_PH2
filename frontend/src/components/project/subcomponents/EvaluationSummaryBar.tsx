'use client';

/**
 * EvaluationSummaryBar.tsx
 *
 * 階層別サマリーの度数分布バーを描画するコンポーネント
 *
 * @remarks
 * LevelSummary を受け取り、N で正規化した良好・要確認・不良の比率バーを表示する。
 */

import React from 'react';
import { Typography, Flex, Tag, Tooltip } from 'antd';
import type { LevelSummary, EvaluationSummaryBarProps } from '@/types/aggregationRule';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<LevelSummary['level'], string> = {
  method:     'メソッド別',
  task:       'タスク別',
  transition: 'トランジション別',
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

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────────────────────

const EvaluationSummaryBar: React.FC<EvaluationSummaryBarProps> = ({ summaries }) => {
  if (summaries.length === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        評価データがありません
      </Text>
    );
  }

  return (
    <Flex vertical gap={8}>
      {summaries.map((s) => {
        const evaluated = s.good + s.caution + s.bad;
        const total = s.total;

        // バー比率（N で正規化）
        const goodPct    = total > 0 ? (s.good    / total) * 100 : 0;
        const cautionPct = total > 0 ? (s.caution / total) * 100 : 0;
        const badPct     = total > 0 ? (s.bad     / total) * 100 : 0;
        const missingPct = total > 0 ? (s.missing / total) * 100 : 0;

        return (
          <Flex key={s.level} align="center" gap={8} style={{ minHeight: 28 }}>
            {/* 階層ラベル */}
            <Text style={{ width: 120, flexShrink: 0, fontSize: 12, fontWeight: 500 }}>
              {LEVEL_LABEL[s.level]}:
            </Text>

            {/* 度数分布バー */}
            <Tooltip
              title={`良好:${s.good} / 要確認:${s.caution} / 不良:${s.bad} / 未評価:${s.missing} (N=${total})`}
            >
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
                {goodPct > 0 && (
                  <div style={{ width: `${goodPct}%`, backgroundColor: STATUS_COLOR['良好'] }} />
                )}
                {cautionPct > 0 && (
                  <div style={{ width: `${cautionPct}%`, backgroundColor: STATUS_COLOR['要確認'] }} />
                )}
                {badPct > 0 && (
                  <div style={{ width: `${badPct}%`, backgroundColor: STATUS_COLOR['不良'] }} />
                )}
                {missingPct > 0 && (
                  <div style={{ width: `${missingPct}%`, backgroundColor: '#d9d9d9' }} />
                )}
              </div>
            </Tooltip>

            {/* 件数表示 */}
            <Text style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
              良好{s.good} 要確認{s.caution} 不良{s.bad}
              {s.missing > 0 && ` 未評価${s.missing}`}
              {` (N=${total})`}
            </Text>

            {/* 代表ステータス */}
            {s.statusRepresentative && (
              <Tag color={STATUS_TAG_COLOR[s.statusRepresentative] ?? 'default'} style={{ fontSize: 11 }}>
                {s.statusRepresentative}
              </Tag>
            )}

            {/* スコア */}
            {s.scoreAverage !== null && (
              <Text style={{ fontSize: 11, color: '#666' }}>
                スコア: {s.scoreAverage}
              </Text>
            )}

            {/* 評価件数 / 総数 */}
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({evaluated}/{total}件評価済)
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
};

export default EvaluationSummaryBar;
